// Explore mode: free camera, color-by switcher, faceted filters, search
// (name/owner always; descriptions opt-in — lazy-loads the detail chunks).
// All emphasis/recolor only; the user owns the camera.
import { fmt } from './data.js';
import { esc, hashHue } from './mapview.js';
import { LANG } from './figures.js';

export function initExplore(D, map, story, tip) {
  const body = document.body;
  const ui = document.getElementById('exploreUi');
  const modeBtn = document.getElementById('modeBtn');
  const hud = document.getElementById('hud');

  // ---------------------------------------------------------------- colors
  const GREY = [86, 96, 112];
  const hex2 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const EFF_C = [hex2('#5588c9'), hex2('#2fa898'), hex2('#8e7aa8')];   // human / AI-assisted / slop
  const LIV_C = { active: [88, 102, 126], slowing: [128, 118, 96], dormant: [214, 116, 82], archived: [178, 85, 99] };
  const livIdx = Object.fromEntries(D.vocab.liveness.map((v, i) => [v, i]));
  const langRgb = new Map(LANG.series.map(s => [D.vocab.langs.indexOf(s.key), hex2(s.color)]));
  const pclRgb = D.problems.map(p => (p.id === 'noise' ? GREY : hashHue(p.id)));
  const cluRgb = D.clusters.map(c => (c.id === 'noise' ? GREY : hashHue(c.id)));
  const cluLabel = ci => {
    const c = D.clusters[ci];
    return c.id === 'noise' ? 'unclustered'
      : c.id.startsWith('s') ? 'slop · ' + c.label : c.label;
  };
  const EFF_LABEL = ['human-built', 'AI-assisted', 'slop'];

  // per-micro-cluster / per-problem counts (one pass; pcl<0 folds into noise=0)
  const cluN = new Int32Array(D.clusters.length);
  const pclN = new Int32Array(D.problems.length);
  for (let i = 0; i < D.n; i++) {
    cluN[D.clu[i]]++;
    pclN[D.pcl[i] < 0 ? 0 : D.pcl[i]]++;
  }

  // weight ramp: single blue hue, dim→bright by log-bucketed file count
  // (sequential; OKLCH-monotone, adjacent-step ΔE ≥ 16 — dataviz-validated)
  const FILES_LABELS = ['under 10 files', '10–99', '100–999', '1,000–9,999', '10,000+'];
  const FILES_C = ['#32445a', '#45658d', '#5988c4', '#79b4ff', '#b1e2ff'].map(hex2);
  const fbucket = i => { const f = D.files[i];
    return f < 10 ? 0 : f < 100 ? 1 : f < 1000 ? 2 : f < 10000 ? 3 : 4; };

  const COLOR_MODES = {
    region: { label: 'Region', fn: null },
    cluster: { label: 'Micro-cluster', fn: i => cluRgb[D.clu[i]] },
    construction: { label: 'Construction', fn: i => EFF_C[D.eff[i]] },
    pulse: { label: 'Pulse', fn: i => LIV_C[D.vocab.liveness[D.liv[i]]] },
    language: { label: 'Language', fn: i => langRgb.get(D.lang[i]) || GREY },
    problem: { label: 'Problem lens', fn: i => (D.pcl[i] >= 0 ? pclRgb[D.pcl[i]] : GREY) },
    weight: { label: 'Weight', fn: i => FILES_C[fbucket(i)] },
  };

  let colorMode = 'region';

  // ---------------------------------------------------------------- filters
  const F = { eff: new Set(), pos: new Set(), lay: new Set(), liv: new Set(),
              grp: new Set(), clu: new Set(), pcl: new Set(), lang: '' };
  let query = '';
  let deepText = null;      // lowercase capability+problem per point, when loaded
  let deepWanted = false;

  function predicate() {
    const q = query;
    const any = F.eff.size || F.pos.size || F.lay.size || F.liv.size ||
                F.grp.size || F.clu.size || F.pcl.size || F.lang !== '' || q;
    if (!any) return null;
    return i =>
      (!F.eff.size || F.eff.has(D.eff[i])) &&
      (!F.pos.size || F.pos.has(D.pos[i])) &&
      (!F.lay.size || F.lay.has(D.lay[i])) &&
      (!F.liv.size || F.liv.has(D.liv[i])) &&
      (!F.grp.size || F.grp.has(D.grp[i])) &&
      (!F.clu.size || F.clu.has(D.clu[i])) &&
      (!F.pcl.size || F.pcl.has(D.pcl[i] < 0 ? 0 : D.pcl[i])) &&
      (F.lang === '' || D.lang[i] === +F.lang) &&
      (!q || D.name[i].toLowerCase().includes(q) ||
             D.owner[i].toLowerCase().includes(q) ||
             (deepText && deepText[i].includes(q)));
  }

  // ---------------------------------------------------------------- legend
  const modesEl = document.getElementById('colorModes');
  const legend = document.getElementById('legend');
  function buildModes() {
    modesEl.innerHTML = '';
    for (const [k, m] of Object.entries(COLOR_MODES)) {
      const b = document.createElement('button');
      b.className = 'chip' + (colorMode === k ? ' on' : '');
      b.textContent = m.label;
      b.addEventListener('click', () => { colorMode = k; buildModes(); buildLegend(); sync(); });
      modesEl.appendChild(b);
    }
  }
  function legendRows() {
    const count = fn => { let c = 0; for (let i = 0; i < D.n; i++) if (fn(i)) c++; return c; };
    // every micro-cluster / problem cluster, biggest first, noise pinned last
    const fullList = (defs, ns, rgb, set, labelOf) => {
      const idx = defs.map((_, k) => k).filter(k => defs[k].id !== 'noise');
      idx.sort((a, b) => ns[b] - ns[a]);
      const noise = defs.findIndex(d => d.id === 'noise');
      if (noise >= 0) idx.push(noise);
      return idx.map(k => ({ color: `rgb(${rgb[k].join(',')})`,
                             label: labelOf(k), n: ns[k], set, val: k }));
    };
    switch (colorMode) {
      case 'region':
        return D.groups.map(g => ({
          color: g.color, label: g.id === 'unclustered' ? 'Unclustered' : g.label,
          n: g.count, set: F.grp, val: g.idx }));
      case 'cluster':
        return fullList(D.clusters, cluN, cluRgb, F.clu, cluLabel);
      case 'construction':
        return EFF_LABEL.map((l, e) => ({
          color: `rgb(${EFF_C[e].join(',')})`, label: l,
          n: count(i => D.eff[i] === e), set: F.eff, val: e }));
      case 'pulse':
        return D.vocab.liveness.map(l => ({
          color: LIV_C[l] ? `rgb(${LIV_C[l].join(',')})` : 'var(--dim)',
          label: l, n: count(i => D.liv[i] === livIdx[l]), set: F.liv, val: livIdx[l] }));
      case 'language':
        return [...LANG.series.map(s => {
          const li = D.vocab.langs.indexOf(s.key);
          return { color: s.color, label: s.key, n: count(i => D.lang[i] === li),
                   set: null, val: null };
        }), { color: `rgb(${GREY.join(',')})`, label: 'other / none',
              n: count(i => !langRgb.has(D.lang[i])), set: null, val: null }];
      case 'problem':
        return fullList(D.problems, pclN, pclRgb, F.pcl,
          k => (D.problems[k].id === 'noise' ? 'unclustered / slop' : D.problems[k].label));
      case 'weight':
        return FILES_LABELS.map((l, b) => ({
          color: `rgb(${FILES_C[b].join(',')})`, label: l,
          n: count(i => fbucket(i) === b), set: null, val: null }));
    }
  }
  function buildLegend() {
    legend.innerHTML = '';
    legend.classList.toggle('big', colorMode === 'cluster' || colorMode === 'problem');
    for (const r of legendRows()) {
      const row = document.createElement('div');
      row.className = 'row' + (r.set && r.set.size && !r.set.has(r.val) ? ' off' : '');
      row.innerHTML = `<span class="sw" style="background:${r.color}"></span>
        <span class="lbl">${esc(r.label)}</span><span class="ct">${fmt(r.n)}</span>`;
      if (r.set) row.addEventListener('click', () => {
        r.set.has(r.val) ? r.set.delete(r.val) : r.set.add(r.val);
        buildLegend(); syncChips(); sync();
      });
      legend.appendChild(row);
    }
  }

  // ---------------------------------------------------------------- filter chips
  const CHIP_GROUPS = [
    ['f-eff', EFF_LABEL, F.eff, l => EFF_LABEL.indexOf(l)],
    ['f-pos', D.vocab.posture.filter(Boolean), F.pos, l => D.vocab.posture.indexOf(l)],
    ['f-lay', D.vocab.layer.filter(Boolean), F.lay, l => D.vocab.layer.indexOf(l)],
    ['f-liv', D.vocab.liveness, F.liv, l => D.vocab.liveness.indexOf(l)],
  ];
  function buildChips() {
    for (const [id, labels, set, valOf] of CHIP_GROUPS) {
      const elm = document.getElementById(id);
      elm.innerHTML = '';
      for (const l of labels) {
        const c = document.createElement('button');
        c.className = 'chip tiny';
        c.textContent = l;
        c.dataset.v = valOf(l);
        c.addEventListener('click', () => {
          const v = +c.dataset.v;
          set.has(v) ? set.delete(v) : set.add(v);
          c.classList.toggle('on');
          buildLegend(); sync();
        });
        elm.appendChild(c);
      }
    }
    const lsel = document.getElementById('f-lang');
    D.vocab.langs.forEach((l, li) => {
      if (l === 'other') return;
      const n = D.lang.reduce((a, v) => a + (v === li), 0);
      if (!n) return;
      const o = document.createElement('option');
      o.value = li; o.textContent = `${l === '—' ? 'no language' : l} (${fmt(n)})`;
      lsel.appendChild(o);
    });
    lsel.addEventListener('change', () => { F.lang = lsel.value; sync(); });
  }
  function syncChips() {
    for (const [id, , set] of CHIP_GROUPS) {
      document.querySelectorAll(`#${id} .chip`).forEach(c =>
        c.classList.toggle('on', set.has(+c.dataset.v)));
    }
  }

  // ---------------------------------------------------------------- search
  const search = document.getElementById('search');
  search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); sync(); });
  const deepTog = document.getElementById('deepTog');
  deepTog.addEventListener('change', async () => {
    deepWanted = deepTog.checked;
    if (deepWanted && !deepText) {
      hud.textContent = 'loading descriptions…';
      const texts = new Array(D.n).fill('');
      const jobs = [];
      for (let c = 0; c < D.meta.n_chunks; c++) {
        jobs.push(fetch(`data/detail/${String(c).padStart(2, '0')}.json`).then(r => r.json())
          .then(ch => ch.cap.forEach((t, o) => {
            texts[ch.start + o] = (t + ' ' + (ch.prob[o] || '')).toLowerCase();
          })));
      }
      await Promise.all(jobs);
      deepText = texts;
    }
    sync();
  });

  // ---------------------------------------------------------------- sync
  function sync() {
    const pred = predicate();
    map.apply({ emphasis: pred, colorBy: COLOR_MODES[colorMode].fn });
    document.getElementById('filterHint').textContent =
      (F.eff.size + F.pos.size + F.lay.size + F.liv.size + F.grp.size +
       F.clu.size + F.pcl.size + (F.lang !== '' ? 1 : 0)) || '';
    if (!pred) { hud.textContent = `${fmt(D.n)} repos shown`; map.setBeacons(null); return; }
    let c = 0;
    const hits = [];
    for (let i = 0; i < D.n; i++) if (pred(i)) { c++; if (hits.length < 4) hits.push(i); }
    // ≤3 hits are invisible dots at map scale — ripple them
    map.setBeacons(c > 0 && c <= 3 ? hits : null);
    hud.textContent = `${fmt(c)} of ${fmt(D.n)} repos emphasized`;
  }

  document.getElementById('resetBtn').addEventListener('click', () => {
    for (const s of [F.eff, F.pos, F.lay, F.liv, F.grp, F.clu, F.pcl]) s.clear();
    F.lang = ''; query = '';
    search.value = ''; document.getElementById('f-lang').value = '';
    colorMode = 'region';
    buildModes(); buildLegend(); syncChips();
    map.resetCamera(); sync();
  });

  // ------------------------------------------------------------ hover extras
  // whatever dimension the user is coloring/filtering by, the hover card
  // shows that repo's value on it (with the matching dot color)
  function tipExtra(i) {
    const out = [], seen = new Set();
    const add = (dim, rgb, txt) => {
      if (seen.has(dim)) return;
      seen.add(dim);
      out.push(`<div class="tg"><span class="dot" style="background:rgb(${rgb.join(',')})"></span>${esc(txt)}</div>`);
    };
    const eff = () => add('eff', EFF_C[D.eff[i]], EFF_LABEL[D.eff[i]]);
    const liv = () => add('liv', LIV_C[D.vocab.liveness[D.liv[i]]] || GREY,
                          D.vocab.liveness[D.liv[i]]);
    const lang = () => add('lang', langRgb.get(D.lang[i]) || GREY,
                           D.vocab.langs[D.lang[i]] || 'no language');
    const prob = () => add('pcl', D.pcl[i] >= 0 ? pclRgb[D.pcl[i]] : GREY,
      D.pcl[i] > 0 ? D.problems[D.pcl[i]].label : 'unclustered / slop');
    const clu = () => add('clu', cluRgb[D.clu[i]], cluLabel(D.clu[i]));
    if (colorMode === 'construction') eff();
    else if (colorMode === 'pulse') liv();
    else if (colorMode === 'language') lang();
    else if (colorMode === 'problem') prob();
    else if (colorMode === 'cluster') clu();
    else if (colorMode === 'weight') {
      add('files', FILES_C[fbucket(i)], `${fmt(D.files[i])} files in tree`);
    }
    if (F.eff.size) eff();
    if (F.liv.size) liv();
    if (F.lang !== '') lang();
    if (F.pcl.size) prob();
    if (F.clu.size) clu();
    if (F.pos.size) add('pos', GREY, D.vocab.posture[D.pos[i]] || 'n/a');
    if (F.lay.size) add('lay', GREY, D.vocab.layer[D.lay[i]] || 'n/a');
    return out.join('');
  }

  // ---------------------------------------------------------------- mode
  let savedScroll = 0;
  function setMode(mode) {
    const explore = mode === 'explore';
    if (explore) savedScroll = scrollY;   // display:none clamps scroll to 0
    body.dataset.mode = mode;
    ui.hidden = !explore;
    modeBtn.textContent = explore ? 'Return to story' : 'Explore the map';
    modeBtn.setAttribute('aria-pressed', explore);
    if (explore) {
      tip.extra = tipExtra;
      map.setController('explore');
      map.apply({ labels: true, dim: 1, emphasis: predicate(),
                  colorBy: COLOR_MODES[colorMode].fn });
      sync();
    } else {
      tip.extra = null;
      map.setBeacons(null);
      map.apply({ emphasis: null, colorBy: null });
      requestAnimationFrame(() => {       // after #story is back in layout
        scrollTo(0, savedScroll);         // return to where the reader was
        story.sync();                     // reconcile step/title/wheel/camera
      });
    }
  }

  modeBtn.addEventListener('click', () => setMode(body.dataset.mode === 'explore' ? 'story' : 'explore'));
  document.getElementById('codaExplore').addEventListener('click', () => setMode('explore'));
  document.querySelectorAll('.explore-here').forEach(b =>
    b.addEventListener('click', () => setMode('explore')));

  // QA hook: ?color=<mode> preselects a color mode (pair with ?mode=explore)
  const cparam = new URLSearchParams(location.search).get('color');
  if (cparam && COLOR_MODES[cparam]) colorMode = cparam;

  buildModes(); buildLegend(); buildChips();
  return { setMode };
}
