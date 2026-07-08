// The one WebGL scene: deck.gl orthographic scatter over all points.
// Declarative view-states; story mode drives them, explore mode frees the camera.
import { fmt } from './data.js';

const { Deck, OrthographicView, ScatterplotLayer, TextLayer, LinearInterpolator } = deck;

const BASE_ALPHA = 205, FADE_ALPHA = 14;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createMap(D, { onClick, onHoverInfo }) {
  const n = D.n;
  const colors = new Uint8Array(n * 4);       // per-point RGBA (colorizer output)
  const radii = new Float32Array(n);
  for (let i = 0; i < n; i++) radii[i] = 1.35 + Math.log10(D.stars[i] + 1) * 1.05;

  const groupRgb = D.groups.map(g => g.rgb);

  const state = {
    emphasis: null,        // (i) => bool | null — non-matching points fade
    colorBy: null,         // (i) => [r,g,b] | null — null = group hue
    labels: false,
    dim: 1,                // scrim-driven global dim 0..1 (1 = fully visible)
    selected: -1,
    beacons: null,         // int[] | null — rippled points (tiny search results)
    rev: 0,
  };
  let beaconRaf = 0, beaconT0 = 0;

  function colorize() {
    for (let i = 0; i < n; i++) {
      const rgb = state.colorBy ? state.colorBy(i) : groupRgb[D.grp[i]];
      const a = state.emphasis && !state.emphasis(i) ? FADE_ALPHA : BASE_ALPHA;
      const o = i * 4;
      colors[o] = rgb[0]; colors[o + 1] = rgb[1]; colors[o + 2] = rgb[2]; colors[o + 3] = a;
    }
    state.rev++;
  }
  colorize();

  // perceived center = INK centroid (area-weighted by drawn radius²): point-
  // count medians and plain means both mis-center a cloud whose left half is
  // many small dots and right half fewer, larger ones
  let mx = 0, my = 0, wsum = 0;
  for (let i = 0; i < n; i++) {
    const w = radii[i] * radii[i];
    mx += D.xs[i] * w; my += D.ys[i] * w; wsum += w;
  }
  mx /= wsum; my /= wsum;

  function fitViewState(pad = 1.12, biasPx = 0) {
    const [x0, y0, x1, y1] = D.bbox;
    const h = innerHeight;
    // center on the mass, keep every point in frame (half-extents around mass)
    const hw = Math.max(x1 - mx, mx - x0), hh = Math.max(y1 - my, my - y0);
    // biasPx = half the prose-column width: fit the cloud into the space right
    // of the column and center it there (screen center + biasPx).
    const availW = Math.max(340, innerWidth - biasPx * 2);
    const zoom = Math.log2(Math.min(availW / (2 * hw * pad), h / (2 * hh * pad)));
    const cx = mx - biasPx / Math.pow(2, zoom);
    return { target: [cx, my, 0], zoom, minZoom: -3, maxZoom: 11 };
  }

  // controller is live in BOTH modes. Wheel-over-map ZOOMS (the column owns
  // page scroll) — except on the hero, where the whole screen should scroll.
  const FULL = { dragPan: true, doubleClickZoom: true, dragRotate: false,
                 scrollZoom: { speed: 0.01, smooth: true } };
  const CONTROLLERS = {
    hero: { ...FULL, scrollZoom: false },
    story: FULL,
    explore: FULL,
  };
  // stored viewState is always CLEAN (no transition props) — transitions ride
  // only in the setProps call, never in state, so an interrupted tween can
  // never wedge the controller.
  const clean = vs => ({ target: [vs.target[0], vs.target[1], 0], zoom: vs.zoom,
                         minZoom: -3, maxZoom: 11 });
  let viewState = clean(fitViewState(1.25));
  let mode = 'story';

  // the pts layer is memoized on state.rev: redraws that don't recolor (beacon
  // animation frames, selection changes) reuse the SAME instance, so deck
  // skips re-diffing it — a fresh instance per redraw can clobber a pending
  // fill-color update queued by the previous setProps in the same tick
  const DATA = { length: n };
  let ptsRev = -1, ptsLayer = null, labelLayer = null;
  function makePts() {
    return new ScatterplotLayer({
      id: 'pts',
      data: DATA,
      pickable: true,
      getPosition: (_, { index, target }) => {
        target[0] = D.xs[index]; target[1] = D.ys[index]; target[2] = 0;
        return target;
      },
      getRadius: (_, { index }) => radii[index],
      radiusUnits: 'pixels', radiusMinPixels: 1.1, radiusMaxPixels: 17,
      getFillColor: (_, { index }) =>
        colors.subarray(index * 4, index * 4 + 4),
      stroked: false,
      parameters: { depthTest: false },
      updateTriggers: { getFillColor: state.rev },
      transitions: REDUCED ? undefined : { getFillColor: 220, opacity: 300 },
      onHover: info => onHoverInfo(info.index >= 0 ? info.index : null, info),
      onClick: info => { if (info.index >= 0) onClick(info.index); },
    });
  }

  function layers() {
    if (ptsRev !== state.rev) { ptsLayer = makePts(); ptsRev = state.rev; }
    const ls = [ptsLayer];
    if (state.selected >= 0) {
      const i = state.selected;
      ls.push(new ScatterplotLayer({
        id: 'sel',
        data: [i],
        getPosition: idx => [D.xs[idx], D.ys[idx], 0],
        getRadius: idx => radii[idx] + 3,
        radiusUnits: 'pixels',
        stroked: true, filled: false,
        getLineColor: [255, 255, 255, 235], getLineWidth: 1.6,
        lineWidthUnits: 'pixels',
        parameters: { depthTest: false },
      }));
    }
    if (state.beacons) {
      // ripple: a search that lands on ≤3 dots is invisible at map scale, so
      // each hit radiates expanding rings until the query changes
      const ACC = [232, 161, 92];
      const phases = REDUCED ? [0.55]
        : [0, 0.5].map(off => (((performance.now() - beaconT0) / 1600) + off) % 1);
      phases.forEach((p, k) => {
        ls.push(new ScatterplotLayer({
          id: 'beacon' + k,
          data: state.beacons,
          getPosition: idx => [D.xs[idx], D.ys[idx], 0],
          getRadius: idx => radii[idx] + 4 + p * 26,
          radiusUnits: 'pixels',
          stroked: true, filled: false,
          getLineColor: [ACC[0], ACC[1], ACC[2], Math.round(230 * (1 - p))],
          getLineWidth: 1.8, lineWidthUnits: 'pixels',
          parameters: { depthTest: false },
          updateTriggers: { getRadius: p, getLineColor: p },
        }));
      });
    }
    if (state.labels) {
      // memoized: static content, and per-frame TextLayer rebuilds during the
      // beacon animation would regenerate the glyph attributes every tick
      labelLayer = labelLayer || new TextLayer({
        id: 'labels',
        data: D.groups.filter(g => g.cx !== null && g.id !== 'SLOP'),
        getPosition: g => [g.cx, g.cy, 0],
        getText: g => g.label.toUpperCase(),
        getSize: 11, sizeUnits: 'pixels',
        getColor: [232, 234, 240, 215],
        fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500,
        characterSet: 'auto',
        outlineWidth: 3, outlineColor: [8, 10, 16, 235],
        fontSettings: { sdf: true },
        getTextAnchor: 'middle', getAlignmentBaseline: 'center',
        pickable: false,
        parameters: { depthTest: false },
      });
      ls.push(labelLayer);
    }
    return ls;
  }

  const dk = new Deck({
    canvas: 'map',
    views: [new OrthographicView({ flipY: false })],
    viewState,
    controller: CONTROLLERS.hero,
    layers: layers(),
    getCursor: ({ isHovering, isDragging }) =>
      isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab',
    onViewStateChange: ({ viewState: vs, interactionState }) => {
      if (interactionState && interactionState.inTransition) return; // tween frames
      viewState = clean(vs);
      dk.setProps({ viewState });
    },
  });

  function redraw() { dk.setProps({ layers: layers() }); }

  // fit the camera to a point subset (region fly-tos); bias as in
  // fitViewState. Uses the 5th–95th percentile box, not min/max — region
  // membership has stragglers all over the map and a raw bbox parks the
  // camera on half the world. Falls back to the full fit if empty.
  function fitSubset(pred, pad = 1.3, biasPx = 0) {
    const sx = [], sy = [];
    for (let i = 0; i < n; i++) {
      if (pred(i)) { sx.push(D.xs[i]); sy.push(D.ys[i]); }
    }
    if (!sx.length) return fitViewState(1.25, biasPx);
    sx.sort((a, b) => a - b); sy.sort((a, b) => a - b);
    const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
    const x0 = q(sx, 0.05), x1 = q(sx, 0.95), y0 = q(sy, 0.05), y1 = q(sy, 0.95);
    const availW = Math.max(340, innerWidth - biasPx * 2);
    const zoom = Math.min(8, Math.log2(Math.min(
      availW / ((x1 - x0) * pad), innerHeight / ((y1 - y0) * pad))));
    const cx = (x0 + x1) / 2 - biasPx / Math.pow(2, zoom);
    return { target: [cx, (y0 + y1) / 2, 0], zoom, minZoom: -3, maxZoom: 11 };
  }

  const api = {
    /** apply a declarative state (story step) */
    apply({ camera, emphasis, colorBy, labels, dim, instant } = {}) {
      if (emphasis !== undefined) state.emphasis = emphasis;
      if (colorBy !== undefined) state.colorBy = colorBy;
      if (labels !== undefined) state.labels = labels;
      if (dim !== undefined) {
        state.dim = dim;
        // dense point clouds defeat per-point alpha (alphas stack), so global
        // dimming is a scrim over the canvas, not layer opacity
        document.getElementById('mapdim').style.opacity = String(1 - dim);
      }
      colorize();
      if (camera) {
        const target = camera === 'fit' ? fitViewState() :
                       camera === 'wide' ? fitViewState(1.25) :
                       typeof camera === 'function' ? camera() :
                       camera.pad !== undefined ? fitViewState(camera.pad, camera.bias || 0) :
                       camera;
        viewState = clean(target);
        dk.setProps({ viewState: {
          ...viewState,
          transitionDuration: (REDUCED || instant) ? 0 : 900,
          transitionInterpolator: new LinearInterpolator(['target', 'zoom']),
        } });
      }
      redraw();
    },
    setController(m) {
      mode = m;
      // re-assert a clean viewState so no pending tween wedges the controller
      dk.setProps({ controller: CONTROLLERS[m] || CONTROLLERS.story, viewState });
    },
    getMode: () => mode,
    select(i) { state.selected = i; redraw(); },
    /** ripple a handful of points (explore search with ≤3 hits); null clears */
    setBeacons(idx) {
      state.beacons = idx && idx.length ? idx : null;
      cancelAnimationFrame(beaconRaf);
      if (state.beacons && !REDUCED) {
        beaconT0 = performance.now();
        const tick = () => { redraw(); beaconRaf = requestAnimationFrame(tick); };
        beaconRaf = requestAnimationFrame(tick);
      } else redraw();
    },
    resetCamera() {
      viewState = clean(fitViewState());
      dk.setProps({ viewState: { ...viewState, transitionDuration: REDUCED ? 0 : 600,
                    transitionInterpolator: new LinearInterpolator(['target', 'zoom']) } });
    },
    /** static hero: map is simply there; one gentle scrim fade-in, no motion */
    fadeIn() {
      const dimEl = document.getElementById('mapdim');
      if (REDUCED) { dimEl.style.opacity = '0'; return; }
      dimEl.style.opacity = '1';
      requestAnimationFrame(() => requestAnimationFrame(() => { dimEl.style.opacity = '0'; }));
    },
    fitViewState,
    fitSubset,
    groupRgb,
  };
  // resize re-framing is owned by the caller (story.reapply knows the active
  // step's camera; a hardcoded fit here would clobber it — it did)
  return api;
}

export function tooltipHtml(D, i) {
  const g = D.groups[D.grp[i]];
  const cl = D.clusters[D.clu[i]];
  return `<div class="tn">${esc(D.name[i])}</div>` +
    `<div class="ts">${esc(D.owner[i])} · ★ ${fmt(D.stars[i])}</div>` +
    `<div class="tg"><span class="dot" style="background:${g.color}"></span>` +
    `${esc(g.id === 'unclustered' ? 'UNCLUSTERED' : g.label.toUpperCase())}` +
    `${cl && cl.id !== 'noise' && cl.label !== g.label ? ' · ' + esc(cl.label.toUpperCase()) : ''}</div>`;
}

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// stable desaturated hue from a cluster id string (problem-lens recolor)
export function hashHue(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return hsl2rgb((h % 360) / 360, 0.5, 0.62);
}
function hsl2rgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = nn => {
    const k = (nn + h * 12) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}
