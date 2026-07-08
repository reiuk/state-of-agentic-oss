// Hand-rolled SVG charts per the dataviz method: single-series line + wash,
// error band, hairline solid grid, selective direct labels, crosshair+tooltip,
// table-view twin. No chart library.
//
// The authorship chart is a TIMELINE SCRUBBER: drag the dot (or anywhere on
// the plot) to a cohort year and the map lights the AI-assisted repos created
// through that year (wired via onScrub). Keyboard: the handle is a slider
// (arrow keys). Returns { getYear, setYear }.
import { AUTHORSHIP } from './figures.js';

const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

export function renderAuthorshipChart(fig, { onScrub } = {}) {
  const { years, pct, n, band } = AUTHORSHIP;
  const W = 392, H = 236, M = { t: 14, r: 52, b: 26, l: 30 };
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const X = i => M.l + (i / (years.length - 1)) * pw;
  const Y = v => M.t + ph - (v / 100) * ph;
  const seg = (a, b) => pct.slice(a, b + 1).map((v, k) =>
    `${k ? 'L' : 'M'}${X(a + k).toFixed(1)},${Y(v).toFixed(1)}`).join('');

  fig.innerHTML = '';
  const svg = el('svg', {
    viewBox: `0 0 ${W} ${H}`, role: 'img',
    'aria-label': `Interactive timeline: share of real (non-slop) repositories classified as AI-assisted builds, by the year the repository was created. ${years[0]}: ${pct[0]} percent, rising to ${years.at(-1)}: ${pct.at(-1)} percent. A shaded band shows roughly ${band} percentage points of classification uncertainty. Drag the handle (or use arrow keys) to pick a year; the map highlights AI-assisted repositories created through that year.`,
  });
  fig.appendChild(svg);

  // grid: hairline, solid, recessive — y at 0/25/50/75
  for (const gv of [0, 25, 50, 75]) {
    el('line', { x1: M.l, x2: W - M.r, y1: Y(gv), y2: Y(gv), class: 'grid' }, svg);
    el('text', { x: M.l - 6, y: Y(gv) + 3.5, 'text-anchor': 'end', class: 'tick' }, svg)
      .textContent = gv;
  }
  // x ticks: every year
  years.forEach((yr, i) => {
    el('text', { x: X(i), y: H - 8, 'text-anchor': 'middle', class: 'tick' }, svg)
      .textContent = i === 0 ? yr : `'${String(yr).slice(2)}`;
  });

  // error band (±band pp, clamped to [0,100])
  const hi = pct.map((v, i) => [X(i), Y(Math.min(100, v + band))]);
  const lo = pct.map((v, i) => [X(i), Y(Math.max(0, v - band))]).reverse();
  el('path', {
    d: hi.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('') +
       lo.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('') + 'Z',
    class: 'dband',
  }, svg);
  // area wash to baseline
  el('path', { d: `${seg(0, years.length - 1)}L${X(years.length - 1)},${Y(0)}L${X(0)},${Y(0)}Z`,
    class: 'darea' }, svg);
  // the line, split at the scrub position: past solid, future faint
  const lineFuture = el('path', { d: '', class: 'dline dline-future' }, svg);
  const linePast = el('path', { d: seg(0, years.length - 1), class: 'dline' }, svg);

  // scrubber: guide + handle + moving label
  const guide = el('line', { y1: M.t, y2: M.t + ph, class: 'scrub-guide' }, svg);
  const handle = el('circle', { r: 6, class: 'ddot handle', tabindex: 0, role: 'slider',
    'aria-valuemin': years[0], 'aria-valuemax': years.at(-1),
    'aria-label': 'Cohort year — the map lights AI-assisted repos created through this year' }, svg);
  const label = el('text', { class: 'dlabel' }, svg);

  let yearIdx = years.length - 1;
  function setYearIdx(k, fire = true) {
    k = Math.max(0, Math.min(years.length - 1, k));
    const changed = k !== yearIdx;
    yearIdx = k;
    const hx = X(k), hy = Y(pct[k]);
    guide.setAttribute('x1', hx); guide.setAttribute('x2', hx);
    handle.setAttribute('cx', hx); handle.setAttribute('cy', hy);
    handle.setAttribute('aria-valuenow', years[k]);
    handle.setAttribute('aria-valuetext', `${years[k]}: ${pct[k]} percent AI-assisted`);
    linePast.setAttribute('d', seg(0, k));
    lineFuture.setAttribute('d', k < years.length - 1 ? seg(k, years.length - 1) : '');
    // label rides the handle; flips side near the right edge
    const flip = hx > W - M.r - 74;
    label.setAttribute('x', flip ? hx - 10 : hx + 10);
    label.setAttribute('text-anchor', flip ? 'end' : 'start');
    label.setAttribute('y', Math.max(M.t + 10, hy - 10));
    label.textContent = `${years[k]} · ${pct[k]}%`;
    if (fire && changed && onScrub) onScrub(years[k]);
  }

  const snap = clientX => {
    const r = svg.getBoundingClientRect();
    const fx = (clientX - r.left) / r.width * W;
    return Math.round((fx - M.l) / pw * (years.length - 1));
  };

  // hover crosshair + tooltip (kept alongside the scrubber)
  const xh = el('line', { y1: M.t, y2: M.t + ph, class: 'xh', visibility: 'hidden' }, svg);
  let tip = document.querySelector('.chart-tip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'chart-tip'; document.body.appendChild(tip); }
  const showTip = (ev, i) => {
    tip.style.display = 'block';
    tip.innerHTML = `${years[i]} cohort · <b>${pct[i]}%</b> AI-assisted<br>` +
      `<span style="color:var(--dim2)">${n[i].toLocaleString()} repos created</span>`;
    tip.style.left = Math.min(innerWidth - 190, ev.clientX + 14) + 'px';
    tip.style.top = (ev.clientY - 44) + 'px';
  };

  const hit = el('rect', { x: M.l - 8, y: M.t, width: pw + 16, height: ph + 14,
    fill: 'transparent', class: 'hitarea' }, svg);
  let dragging = false;
  const down = ev => {
    dragging = true;
    (ev.target.setPointerCapture ? ev.target : hit).setPointerCapture(ev.pointerId);
    setYearIdx(snap(ev.clientX));
    showTip(ev, yearIdx);
    ev.preventDefault();
  };
  const move = ev => {
    const i = snap(ev.clientX);
    if (dragging) { setYearIdx(i); showTip(ev, yearIdx); return; }
    const k = Math.max(0, Math.min(years.length - 1, i));
    xh.setAttribute('x1', X(k)); xh.setAttribute('x2', X(k));
    xh.setAttribute('visibility', 'visible');
    showTip(ev, k);
  };
  const up = () => { dragging = false; };
  for (const t of [hit, handle]) {
    t.addEventListener('pointerdown', down);
    t.addEventListener('pointermove', move);
    t.addEventListener('pointerup', up);
    t.addEventListener('pointercancel', up);
  }
  hit.addEventListener('pointerleave', () => {
    if (dragging) return;
    xh.setAttribute('visibility', 'hidden');
    tip.style.display = 'none';
  });
  handle.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { setYearIdx(yearIdx - 1); ev.preventDefault(); }
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { setYearIdx(yearIdx + 1); ev.preventDefault(); }
    if (ev.key === 'Home') { setYearIdx(0); ev.preventDefault(); }
    if (ev.key === 'End') { setYearIdx(years.length - 1); ev.preventDefault(); }
  });

  setYearIdx(years.length - 1, false);

  // caption + table twin
  const cap = document.createElement('figcaption');
  cap.innerHTML = `<b style="color:var(--dim)">Drag the dot across the timeline</b> — the map lights the AI-assisted repos created up to each year. Band: ±${band}pp classification noise on the human&#8596;AI-assisted boundary. Source: 20,393 code-grounded reads; <span class="mono">queries.md → effort_by_created_year</span>.`;
  fig.appendChild(cap);
  const det = document.createElement('details');
  det.innerHTML = `<summary>Data table</summary><table><tr><th>cohort</th>${years.map(y => `<th>${y}</th>`).join('')}</tr><tr><th>AI-assisted %</th>${pct.map(v => `<td>${v}</td>`).join('')}</tr><tr><th>repos created</th>${n.map(v => `<td>${v.toLocaleString()}</td>`).join('')}</tr></table>`;
  fig.appendChild(det);

  return {
    getYear: () => years[yearIdx],
    setYear: (y, fire = true) => setYearIdx(years.indexOf(y) >= 0 ? years.indexOf(y) : years.length - 1, fire),
  };
}

// ---------------------------------------------------------------- shared bits
function chartTip() {
  let tip = document.querySelector('.chart-tip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'chart-tip'; document.body.appendChild(tip); }
  return tip;
}
function caption(fig, html) {
  const cap = document.createElement('figcaption');
  cap.innerHTML = html;
  fig.appendChild(cap);
}
function tableTwin(fig, head, rows) {
  const det = document.createElement('details');
  det.innerHTML = `<summary>Data table</summary><div class="twrap"><table>` +
    `<tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>` +
    rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') + `</table></div>`;
  fig.appendChild(det);
}
const niceMax = v => { const p = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / p) * p; };

// ---------------------------------------------------------------- column bars
// Single series (nominal or time buckets): one hue for every bar; the datum the
// prose is about wears the accent (accentIdx). ≤24px bars, 4px rounded data-end,
// square baseline, hover tooltip, table twin.
// onPick(i|null): bars become clickable pins (click again to unpin). Returns
// { clearPick } so the step can reset the visual when the reader moves on.
// allAccent: single-series charts wear the accent on EVERY bar (operator
// rule: one color unless the chart is specifically contrasting something).
export function renderBars(fig, { labels, values, accentIdx = -1, unit = '',
    ariaLabel, capHtml, tipFn, tickEvery = 1, yMax, onPick, allAccent }) {
  const W = 392, H = 190, M = { t: 12, r: 8, b: 24, l: 34 };
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const vmax = yMax || niceMax(Math.max(...values));
  const bw = Math.min(24, (pw / labels.length) - 2);
  const X = i => M.l + (i + 0.5) * (pw / labels.length) - bw / 2;
  const Y = v => M.t + ph - (v / vmax) * ph;

  fig.innerHTML = '';
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': ariaLabel });
  fig.appendChild(svg);
  for (const gv of [0, vmax / 2, vmax]) {
    el('line', { x1: M.l, x2: W - M.r, y1: Y(gv), y2: Y(gv), class: 'grid' }, svg);
    el('text', { x: M.l - 5, y: Y(gv) + 3.5, 'text-anchor': 'end', class: 'tick' }, svg)
      .textContent = gv >= 1000 ? (gv / 1000) + 'k' : Math.round(gv * 10) / 10;
  }
  const tip = chartTip();
  const bars = [];
  let picked = -1;
  const setPicked = k => {
    picked = k;
    bars.forEach((b, j) => b.classList.toggle('picked', j === picked));
  };
  labels.forEach((lb, i) => {
    const y = Y(values[i]), hgt = M.t + ph - y;
    const bar = el('path', {
      d: hgt < 3 ? `M${X(i)},${M.t + ph}h${bw}v-${Math.max(hgt, 1.2)}h-${bw}Z`
        : `M${X(i)},${M.t + ph}v-${hgt - 4}q0,-4 4,-4h${bw - 8}q4,0 4,4v${hgt - 4}Z`,
      class: (allAccent || i === accentIdx ? 'bar accent' : 'bar') + (onPick ? ' pickable' : ''),
    }, svg);
    bars.push(bar);
    bar.addEventListener('pointermove', ev => {
      tip.style.display = 'block';
      tip.innerHTML = (tipFn ? tipFn(i) : `${lb} · <b>${values[i].toLocaleString()}${unit}</b>`) +
        (onPick ? `<br><span style="color:var(--dim2)">${picked === i ? 'click to release' : 'click to light on the map'}</span>` : '');
      tip.style.left = Math.min(innerWidth - 190, ev.clientX + 14) + 'px';
      tip.style.top = (ev.clientY - 40) + 'px';
    });
    bar.addEventListener('pointerleave', () => { tip.style.display = 'none'; });
    if (onPick) {
      bar.addEventListener('click', () => {
        setPicked(picked === i ? -1 : i);
        onPick(picked >= 0 ? picked : null);
      });
    }
    if (i % tickEvery === 0) {
      el('text', { x: X(i) + bw / 2, y: H - 7, 'text-anchor': 'middle', class: 'tick' }, svg)
        .textContent = lb;
    }
  });
  if (capHtml) caption(fig, capHtml);
  tableTwin(fig, labels, [values.map(v => v.toLocaleString() + unit)]);
  return { clearPick: () => setPicked(-1) };
}

// ---------------------------------------------------------------- h-bars
// Horizontal bars for long nominal labels (slop genres, problems, afterlife,
// vendor economy). Labels sit ABOVE their bars at full column width — the old
// left-gutter layout overflowed the panel into the progress rail on long
// labels. rows: [label, value] or [label, value, swatchColor].
// onPick as in renderBars; the whole row (label + bar) is the hit target.
export function renderHBars(fig, { rows, unit = '', ariaLabel, capHtml,
    accentIdx = -1, onPick, headLabel = '', headValue = 'repos', tipFn, allAccent }) {
  const W = 392, rowH = 33, M = { t: 2, r: 8, b: 2, l: 0 };
  const H = M.t + rows.length * rowH + M.b;
  const pw = W - M.l - M.r - 48;   // right gutter for the count
  const vmax = Math.max(...rows.map(r => r[1]));
  fig.innerHTML = '';
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': ariaLabel });
  fig.appendChild(svg);
  const tip = chartTip();
  const groups = [];
  let picked = -1;
  const setPicked = k => {
    picked = k;
    groups.forEach((g, j) => g.classList.toggle('picked', j === picked));
  };
  rows.forEach(([lb, v], i) => {
    const y = M.t + i * rowH;
    const w = Math.max(2, (v / vmax) * pw);
    const g = el('g', { class: 'hrow' + (onPick ? ' pickable' : '') +
      (allAccent || i === accentIdx ? ' accent' : '') }, svg);
    groups.push(g);
    el('text', { x: M.l, y: y + 10, class: 'hlab' }, g).textContent = lb;
    el('path', {
      d: `M${M.l},${y + 15}h${Math.max(w - 4, 1)}q4,0 4,4v2q0,4 -4,4h-${Math.max(w - 4, 1)}Z`,
      class: allAccent || i === accentIdx ? 'bar accent' : 'bar',
    }, g);
    el('text', { x: M.l + w + 7, y: y + 23, class: 'tick' }, g)
      .textContent = v.toLocaleString() + unit;
    const hit = el('rect', { x: M.l, y, width: W - M.r, height: rowH - 4,
      fill: 'transparent' }, g);
    hit.addEventListener('pointermove', ev => {
      tip.style.display = 'block';
      tip.innerHTML = (tipFn ? tipFn(i) : `${lb} · <b>${v.toLocaleString()}${unit}</b>`) +
        (onPick ? `<br><span style="color:var(--dim2)">${picked === i ? 'click to release' : 'click to light on the map'}</span>` : '');
      tip.style.left = Math.min(innerWidth - 220, ev.clientX + 14) + 'px';
      tip.style.top = (ev.clientY - 40) + 'px';
    });
    hit.addEventListener('pointerleave', () => { tip.style.display = 'none'; });
    if (onPick) {
      hit.addEventListener('click', () => {
        setPicked(picked === i ? -1 : i);
        onPick(picked >= 0 ? picked : null);
      });
    }
  });
  if (capHtml) caption(fig, capHtml);
  tableTwin(fig, [headLabel, headValue],
    rows.map(r => [r[0], r[1].toLocaleString() + unit]));
  return { clearPick: () => setPicked(-1) };
}

// ---------------------------------------------------------------- paired bars
// Two measures of the same nominal axis on ONE scale (both %): share of repos
// vs share of stars per star band. Grouped columns, legend always present.
// onPick(i|null): a whole band (both bars) is the pick target.
export function renderPairBars(fig, { labels, a, b, aLabel, bLabel, unit = '%',
    ariaLabel, capHtml, tipFn, onPick }) {
  const W = 392, H = 190, M = { t: 12, r: 8, b: 24, l: 34 };
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const vmax = niceMax(Math.max(...a, ...b));
  const slot = pw / labels.length;
  const bw = Math.min(14, (slot - 10) / 2);
  const Y = v => M.t + ph - (v / vmax) * ph;
  fig.innerHTML = '';
  const leg = document.createElement('div');
  leg.className = 'leg';
  leg.innerHTML = `<span><span class="sw" style="background:#556070"></span>${aLabel}</span>` +
    `<span><span class="sw" style="background:var(--accent)"></span>${bLabel}</span>`;
  fig.appendChild(leg);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': ariaLabel });
  fig.appendChild(svg);
  for (const gv of [0, vmax / 2, vmax]) {
    el('line', { x1: M.l, x2: W - M.r, y1: Y(gv), y2: Y(gv), class: 'grid' }, svg);
    el('text', { x: M.l - 5, y: Y(gv) + 3.5, 'text-anchor': 'end', class: 'tick' }, svg)
      .textContent = gv;
  }
  const tip = chartTip();
  const slots = [];
  let picked = -1;
  const setPicked = k => {
    picked = k;
    slots.forEach((g, j) => g.classList.toggle('picked', j === picked));
  };
  labels.forEach((lb, i) => {
    const cx = M.l + (i + 0.5) * slot;
    const g = el('g', { class: 'pslot' + (onPick ? ' pickable' : '') }, svg);
    slots.push(g);
    for (const [vals, cls, dx] of [[a, 'bar', -bw - 1], [b, 'bar accent', 1]]) {
      const y = Y(vals[i]), hgt = M.t + ph - y;
      el('path', {
        d: hgt < 3 ? `M${cx + dx},${M.t + ph}h${bw}v-${Math.max(hgt, 1.2)}h-${bw}Z`
          : `M${cx + dx},${M.t + ph}v-${hgt - 3}q0,-3 3,-3h${bw - 6}q3,0 3,3v${hgt - 3}Z`,
        class: cls,
      }, g);
    }
    el('text', { x: cx, y: H - 7, 'text-anchor': 'middle', class: 'tick' }, g)
      .textContent = lb;
    const hit = el('rect', { x: cx - slot / 2, y: M.t, width: slot, height: ph + 14,
      fill: 'transparent' }, g);
    hit.addEventListener('pointermove', ev => {
      tip.style.display = 'block';
      tip.innerHTML = (tipFn ? tipFn(i) :
        `${lb} · ${aLabel} <b>${a[i]}${unit}</b> · ${bLabel} <b>${b[i]}${unit}</b>`) +
        (onPick ? `<br><span style="color:var(--dim2)">${picked === i ? 'click to release' : 'click to light on the map'}</span>` : '');
      tip.style.left = Math.min(innerWidth - 230, ev.clientX + 14) + 'px';
      tip.style.top = (ev.clientY - 40) + 'px';
    });
    hit.addEventListener('pointerleave', () => { tip.style.display = 'none'; });
    if (onPick) {
      hit.addEventListener('click', () => {
        setPicked(picked === i ? -1 : i);
        onPick(picked >= 0 ? picked : null);
      });
    }
  });
  if (capHtml) caption(fig, capHtml);
  tableTwin(fig, ['band', ...labels],
    [[aLabel, ...a.map(v => v + unit)], [bLabel, ...b.map(v => v + unit)]]);
  return { clearPick: () => setPicked(-1) };
}

// ---------------------------------------------------------------- multi-line
// ≤4 series, categorical palette validated in figures.js; legend always present,
// end direct-labels with collision nudging via leader offsets, crosshair tooltip.
export function renderLines(fig, { xs, series, cohortN, unit = '%', ariaLabel, capHtml, yMax }) {
  const W = 392, H = 216, M = { t: 12, r: 86, b: 24, l: 30 };
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const vmax = yMax || niceMax(Math.max(...series.flatMap(s => s.pct)));
  const X = i => M.l + (i / (xs.length - 1)) * pw;
  const Y = v => M.t + ph - (v / vmax) * ph;
  fig.innerHTML = '';
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': ariaLabel });
  fig.appendChild(svg);
  for (const gv of [0, vmax / 2, vmax]) {
    el('line', { x1: M.l, x2: W - M.r, y1: Y(gv), y2: Y(gv), class: 'grid' }, svg);
    el('text', { x: M.l - 5, y: Y(gv) + 3.5, 'text-anchor': 'end', class: 'tick' }, svg)
      .textContent = gv;
  }
  xs.forEach((x, i) => {
    el('text', { x: X(i), y: H - 7, 'text-anchor': 'middle', class: 'tick' }, svg)
      .textContent = i === 0 ? x : `'${String(x).slice(2)}`;
  });
  // end labels: sort by final value, nudge apart if closer than 12px
  const ends = series.map((s, k) => ({ k, y: Y(s.pct.at(-1)) })).sort((a, b) => a.y - b.y);
  for (let j = 1; j < ends.length; j++) {
    if (ends[j].y - ends[j - 1].y < 12) ends[j].y = ends[j - 1].y + 12;
  }
  const endY = {}; ends.forEach(e => { endY[e.k] = e.y; });
  series.forEach((s, k) => {
    el('path', { d: s.pct.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(''),
      class: 'sline', style: `stroke:${s.color}` }, svg);
    el('circle', { cx: X(xs.length - 1), cy: Y(s.pct.at(-1)), r: 3.5,
      style: `fill:${s.color}`, class: 'sdot' }, svg);
    if (endY[k] !== Y(s.pct.at(-1))) {  // leader line when nudged
      el('line', { x1: X(xs.length - 1) + 4, y1: Y(s.pct.at(-1)),
        x2: X(xs.length - 1) + 12, y2: endY[k], class: 'leader' }, svg);
    }
    const t = el('text', { x: X(xs.length - 1) + 14, y: endY[k] + 3.5, class: 'axlab' }, svg);
    t.innerHTML = `<tspan style="fill:${s.color}">●</tspan> ${s.key} ${s.pct.at(-1)}${unit}`;
  });
  // crosshair tooltip
  const xh = el('line', { y1: M.t, y2: M.t + ph, class: 'xh', visibility: 'hidden' }, svg);
  const tip = chartTip();
  const hit = el('rect', { x: M.l, y: M.t, width: pw, height: ph, fill: 'transparent' }, svg);
  hit.addEventListener('pointermove', ev => {
    const r = svg.getBoundingClientRect();
    const fx = (ev.clientX - r.left) / r.width * W;
    const i = Math.max(0, Math.min(xs.length - 1, Math.round((fx - M.l) / pw * (xs.length - 1))));
    xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i));
    xh.setAttribute('visibility', 'visible');
    tip.style.display = 'block';
    tip.innerHTML = `<b>${xs[i]}</b>${cohortN ? ` · ${cohortN[i].toLocaleString()} repos` : ''}<br>` +
      series.map(s => `<span style="color:${s.color}">●</span> ${s.key} <b>${s.pct[i]}${unit}</b>`).join('<br>');
    tip.style.left = Math.min(innerWidth - 200, ev.clientX + 14) + 'px';
    tip.style.top = (ev.clientY - 30 - series.length * 15) + 'px';
  });
  hit.addEventListener('pointerleave', () => {
    xh.setAttribute('visibility', 'hidden'); tip.style.display = 'none';
  });
  if (capHtml) caption(fig, capHtml);
  tableTwin(fig, ['series', ...xs], series.map(s => [s.key, ...s.pct.map(v => v + unit)]));
}

// ---------------------------------------------------------------- stat tiles
export function renderTiles(elm, tiles) {
  elm.innerHTML = tiles.map(t =>
    `<div class="tile"><span class="tv mono">${t.v}</span><span class="tl">${t.l}</span></div>`).join('');
}
