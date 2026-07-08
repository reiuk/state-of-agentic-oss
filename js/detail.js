// Repository detail panel — whitelisted fields only. Slop rows show the genre
// label + the triage caveat (operator-approved wording, memo §G4).
import { loadDetail, fmt, dayToDate, ghUrl } from './data.js';
import { esc } from './mapview.js';

export function initDetail(D, map) {
  const panel = document.getElementById('detail');
  const body = document.getElementById('detailBody');
  document.getElementById('detailClose').addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  function close() {
    panel.classList.remove('on');
    panel.hidden = true;
    map.select(-1);
  }

  async function open(i) {
    map.select(i);
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('on'));
    const g = D.groups[D.grp[i]];
    const cl = D.clusters[D.clu[i]];
    const isSlop = D.vocab.effort[D.eff[i]] === 'slop';
    const effLabel = { 'human-built': 'human-built', 'cleaned-ai': 'AI-assisted', slop: 'slop stratum' }[D.vocab.effort[D.eff[i]]];

    body.innerHTML = `
      <h2>${esc(D.name[i])}</h2>
      <p class="owner">${esc(D.owner[i])}</p>
      <p class="lede" id="dLede">…</p>
      ${isSlop ? `<p class="triage">Gated to the slop stratum by automated triage —
        a strong "probably not worth reading" signal that errs toward over-calling
        real code behind deceptive READMEs. Genre: <b>${esc(cl.label)}</b>.</p>` : ''}
      <div class="statrow">
        <span>★ <b>${fmt(D.stars[i])}</b></span>
        <span>${esc(D.vocab.langs[D.lang[i]])}</span>
        <span>${esc(D.vocab.licenses[D.lic[i]])}</span>
        <span><b>${fmt(D.files[i])}</b> files</span>
        <span>created <b>${dayToDate(D, D.created[i])}</b></span>
        <span>pushed <b>${dayToDate(D, D.commit[i])}</b></span>
      </div>
      <div class="tags">
        <span class="tag"><span class="dot" style="background:${g.color}"></span>${esc(g.id === 'unclustered' ? 'unclustered' : g.label)}</span>
        ${cl.id !== 'noise' && cl.label !== g.label ? `<span class="tag">${esc(cl.label)}</span>` : ''}
        ${isSlop ? '' : `<span class="tag">${esc(effLabel)}</span>`}
        ${!isSlop && D.vocab.posture[D.pos[i]] ? `<span class="tag">${esc(D.vocab.posture[D.pos[i]])}</span>` : ''}
        <span class="tag">${esc(D.vocab.liveness[D.liv[i]])}</span>
      </div>
      <div id="dProb"></div>
      <div id="dPriv"></div>
      <div id="dNbrs"></div>
      <a class="gh" href="${ghUrl(D, i)}" target="_blank" rel="noopener">Open on GitHub ↗</a>`;

    const det = await loadDetail(D, i);
    const lede = document.getElementById('dLede');
    if (isSlop) { lede.remove(); }
    else lede.textContent = det.cap || '';
    if (!isSlop && det.prob) {
      document.getElementById('dProb').innerHTML =
        `<h4>The problem it exists to solve</h4><p class="lede">${esc(det.prob)}</p>`;
    }
    if (det.nbr && det.nbr.length) {
      document.getElementById('dNbrs').innerHTML = `<h4>Nearest neighbors</h4>
        <div class="nbrs">${det.nbr.map(j =>
          `<button class="nbr" data-i="${j}"><span>${esc(D.name[j])}</span>
           <span class="st">★${fmt(D.stars[j])} · ${esc(D.owner[j])}</span></button>`).join('')}</div>`;
      body.querySelectorAll('.nbr').forEach(b =>
        b.addEventListener('click', () => open(+b.dataset.i)));
    }
  }

  return { open, close };
}
