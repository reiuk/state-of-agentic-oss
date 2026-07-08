// Load + decode the core payload (columnar, whitelisted — see site/build.py).
export async function loadCore() {
  const [core, meta] = await Promise.all([
    fetch('data/core.json').then(r => r.json()),
    fetch('data/meta.json').then(r => r.json()),
  ]);
  const n = core.n;
  const [x0, y0, x1, y1] = core.bbox;
  const xs = new Float32Array(n), ys = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    xs[i] = x0 + (core.x[i] / 65535) * (x1 - x0);
    ys[i] = y0 + (core.y[i] / 65535) * (y1 - y0);
  }
  const groups = core.groups.map((g, gi) => ({ ...g, idx: gi, rgb: hex2rgb(g.color) }));
  const D = {
    n, meta, xs, ys,
    bbox: core.bbox,
    name: core.name, owner: core.owner,
    stars: core.stars, created: core.created, commit: core.commit,
    files: core.files,
    lang: core.lang, lic: core.lic, eff: core.eff, lay: core.lay,
    pos: core.pos, liv: core.liv, grp: core.grp, clu: core.clu, pcl: core.pcl,
    vocab: core.vocab, groups, clusters: core.clusters, problems: core.problems,
    epochMs: Date.UTC(2015, 0, 1),
  };
  return D;
}

const chunkCache = new Map();
export async function loadDetail(D, i) {
  const c = Math.floor(i / D.meta.chunk);
  if (!chunkCache.has(c)) {
    chunkCache.set(c, fetch(`data/detail/${String(c).padStart(2, '0')}.json`).then(r => r.json()));
  }
  const chunk = await chunkCache.get(c);
  const o = i - chunk.start;
  return { cap: chunk.cap[o], prob: chunk.prob[o], nbr: chunk.nbr[o],
           priv: chunk.priv ? chunk.priv[o] : null };
}

export function hex2rgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
export function fmt(v) { return (v || 0).toLocaleString('en-US'); }
export function dayToDate(D, d) {
  if (!d) return '—';
  return new Date(D.epochMs + d * 86400000).toISOString().slice(0, 10);
}
export function ghUrl(D, i) {
  return `https://github.com/${D.owner[i]}/${D.name[i]}`;
}
