// The 25-region index inside the territory step: hover a row to light that
// region on the map, click to pin it — pinning also unfolds the region's
// micro-clusters (the 178 sub-clusters behind the 25 groups), each of which
// is hover/pinnable in turn. Never touches the camera — emphasis only, so it
// can't fight the story framing or a user pan. Pin clears when the reader
// moves to another step. Emphasis rides refs.territory.fn (read by states.js)
// so a resize re-apply keeps the pinned view.
import { fmt } from './data.js';
import { esc } from './mapview.js';

export function initRegions(D, map, story, refs) {
  const wrap = document.getElementById('regions');
  if (!wrap) return;
  const groups = D.groups.filter(g => g.id !== 'SLOP' && g.id !== 'unclustered');

  // micro-cluster membership per group, biggest first (from the payload —
  // every point carries (clu, grp); a cluster lives in exactly one group)
  const cluCount = new Map();   // cluIdx -> count
  const cluGroup = new Map();   // cluIdx -> grpIdx
  for (let i = 0; i < D.n; i++) {
    const c = D.clu[i];
    if (D.clusters[c].id === 'noise') continue;
    cluCount.set(c, (cluCount.get(c) || 0) + 1);
    cluGroup.set(c, D.grp[i]);
  }
  const subsOf = gi => [...cluCount.entries()]
    .filter(([c]) => cluGroup.get(c) === gi)
    .sort((a, b) => b[1] - a[1]);

  let pinned = null;        // group idx | null
  let pinnedClu = null;     // cluster idx | null (within the pinned group)
  let subWrap = null;       // the unfolded sub-cluster list element

  const predGrp = gi => (i => D.grp[i] === gi);
  const predClu = ci => (i => D.clu[i] === ci);
  const currentPred = () =>
    pinnedClu !== null ? predClu(pinnedClu) :
    pinned !== null ? predGrp(pinned) : (() => true);
  const apply = fn => {
    refs.territory.fn = fn;
    map.apply({ emphasis: i => refs.territory.fn(i) });
  };
  const restore = () => apply(currentPred());

  function fold() {
    if (subWrap) { subWrap.remove(); subWrap = null; }
    pinnedClu = null;
  }
  function unfold(g, afterRow) {
    fold();
    const subs = subsOf(g.idx);
    if (!subs.length) return;
    subWrap = document.createElement('div');
    subWrap.className = 'subregions';
    subWrap.setAttribute('aria-label', `Sub-clusters of ${g.label}`);
    for (const [ci, n] of subs) {
      const row = document.createElement('button');
      row.className = 'region sub';
      row.title = D.clusters[ci].label;
      row.innerHTML = `<span class="sw" style="background:${g.color}"></span>` +
        `<span class="lbl">${esc(D.clusters[ci].label)}</span><span class="ct">${fmt(n)}</span>`;
      row.addEventListener('mouseenter', () => apply(predClu(ci)));
      row.addEventListener('focus', () => apply(predClu(ci)));
      row.addEventListener('mouseleave', restore);
      row.addEventListener('blur', restore);
      row.addEventListener('click', () => {
        pinnedClu = pinnedClu === ci ? null : ci;
        subWrap.querySelectorAll('.region').forEach(r =>
          r.classList.toggle('on', r === row && pinnedClu !== null));
        restore();
      });
      subWrap.appendChild(row);
    }
    afterRow.after(subWrap);
  }

  const rows = groups.map(g => {
    const row = document.createElement('button');
    row.className = 'region';
    row.title = g.label;
    row.innerHTML = `<span class="sw" style="background:${g.color}"></span>` +
      `<span class="lbl">${esc(g.label)}</span><span class="ct">${fmt(g.count)}</span>`;
    row.addEventListener('mouseenter', () => apply(predGrp(g.idx)));
    row.addEventListener('focus', () => apply(predGrp(g.idx)));
    row.addEventListener('mouseleave', restore);
    row.addEventListener('blur', restore);
    row.addEventListener('click', () => {
      pinned = pinned === g.idx ? null : g.idx;
      rows.forEach((r, k) => r.classList.toggle('on', groups[k].idx === pinned));
      if (pinned !== null) unfold(g, row); else fold();
      restore();
    });
    wrap.appendChild(row);
    return row;
  });

  story.onStepChange(() => {
    if (pinned !== null || pinnedClu !== null) {
      pinned = null;
      fold();
      rows.forEach(r => r.classList.remove('on'));
      refs.territory.fn = () => true;
    }
  });

  // QA hook: ?region=G07 pins a region on load (deferred past the ?step jump,
  // which fires a step change that would clear the pin)
  const qa = new URLSearchParams(location.search).get('region');
  if (qa) {
    const k = groups.findIndex(g => g.id.toLowerCase() === qa.toLowerCase());
    if (k >= 0) setTimeout(() => rows[k].click(), 80);
  }
}
