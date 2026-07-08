// Interactive furniture inside story panels (beyond the region index and the
// authorship scrubber): resident chips, newborn-category chips, pickable
// charts that light their datum on the map, the fragmentation ladder, the
// named-agent table, stat tiles, map-recolor legends. All emphasis-only —
// the camera always belongs to the step (operator rule).
import { fmt } from './data.js';
import { esc, hashHue } from './mapview.js';
import { renderTiles, renderBars, renderHBars, renderPairBars } from './chart.js';
import { PULSE } from './states.js';
import { HARNESS, VERT, LOWSTAR, CATS, XLENS, AGENTS, GRAVITY, AGE, MCP,
         SLOP, PROBLEMS, AFTERLIFE, MORTALITY, LANG, STARSHARE, BUMP,
         NEARDUP, DRIVEBY } from './figures.js';

// the star bands used by the low-star and deceptive-bump charts
const BANDS = [[0, 1], [2, 9], [10, 49], [50, 199], [200, 999],
               [1000, 9999], [10000, Infinity]];

export function findRepo(D, owner, name) {
  const ow = owner.toLowerCase(), nm = name.toLowerCase();
  for (let i = 0; i < D.n; i++) {
    if (D.owner[i].toLowerCase() === ow && D.name[i].toLowerCase() === nm) return i;
  }
  return -1;
}

// shared pattern for pickable steps: a mutable ref (read by states.js), a
// default predicate, live re-apply while the step is active, reset on leave
function picker(map, story, stateKey, refObj, defaultFn, onReset) {
  refObj.fn = defaultFn;
  const active = () => story.getActiveState() === stateKey &&
    document.body.dataset.mode === 'story';
  const set = fn => {
    refObj.fn = fn || defaultFn;
    // fn may be null (mortality: recolor only, no fade) — mirror states.js
    if (active()) map.apply({ emphasis: i => (refObj.fn ? refObj.fn(i) : true) });
  };
  story.onStepChange(() => { refObj.fn = defaultFn; if (onReset) onReset(); });
  return set;
}

// step 03 — creation-year bars light that cohort on the map
export function initAge(D, map, story, refs, yearOf) {
  const DAY_2025_07 = Math.round((Date.UTC(2025, 6, 1) - D.epochMs) / 86400000);
  const note = document.getElementById('ageNote');
  const DEFAULT_NOTE = note.textContent;
  const defFn = i => D.created[i] >= DAY_2025_07;
  let ctl;
  const set = picker(map, story, 'age', refs.age, defFn, () => {
    ctl.clearPick(); note.textContent = DEFAULT_NOTE;
  });
  ctl = renderBars(document.getElementById('fig-age'), {
    labels: AGE.years.map(y => String(y).slice(2)),
    values: AGE.counts, allAccent: true,
    ariaLabel: `Bar chart of repositories by creation year, 2015 to 2026. Growth explodes from ${AGE.counts.at(-4).toLocaleString()} in 2023 to ${AGE.counts.at(-1).toLocaleString()} in the first half of 2026. Click a bar to light that cohort on the map.`,
    capHtml: `Repositories in the corpus by creation year (2026 = first half). ${AGE.last12pct}% arrived in the last twelve months. <span class="mono">queries.md → created_histogram</span>.`,
    tipFn: i => `created 20${String(AGE.years[i]).slice(2)} · <b>${AGE.counts[i].toLocaleString()}</b> repos`,
    onPick: k => {
      if (k === null) { set(null); note.textContent = DEFAULT_NOTE; return; }
      const y = AGE.years[k];
      set(i => yearOf[i] === y);
      note.textContent = `Lit on the map: the ${AGE.counts[k].toLocaleString()} repositories created in ${y}.`;
    },
  });
}

// step 05 — the star-band pairs light that band's repos (default: the
// sub-10-star interior the prose is about)
export function initLowstar(D, map, story, refs) {
  const defFn = i => D.stars[i] < 10;
  const note = document.getElementById('lowstarNote');
  const DEFAULT_NOTE = note.textContent;
  let ctl;
  const set = picker(map, story, 'lowstar', refs.lowstar, defFn, () => {
    ctl.clearPick(); note.textContent = DEFAULT_NOTE;
  });
  ctl = renderPairBars(document.getElementById('fig-starshare'), {
    labels: STARSHARE.bands, a: STARSHARE.repoPct, b: STARSHARE.starsPct,
    aLabel: 'share of repos', bLabel: 'share of stars',
    ariaLabel: `Paired bar chart of star bands: the 0 to 1 star band holds 26 percent of repositories and essentially zero percent of stars, while the 10,000-plus band holds 5.8 percent of repositories and 77.7 percent of all stars. Click a band to light its repos on the map.`,
    capHtml: `Where the repos are vs where the stars are. The 10k+ band (${STARSHARE.counts.at(-1).toLocaleString()} repos) holds ${STARSHARE.starsPct.at(-1)}% of all 47.9M stars. <span class="mono">queries.md → stars.by_band</span>.`,
    tipFn: i => `${STARSHARE.bands[i]}★ · <b>${STARSHARE.repoPct[i]}%</b> of repos · <b>${STARSHARE.starsPct[i]}%</b> of stars<br><span style="color:var(--dim2)">${STARSHARE.counts[i].toLocaleString()} repositories</span>`,
    onPick: k => {
      if (k === null) { set(null); note.textContent = DEFAULT_NOTE; return; }
      const [lo, hi] = BANDS[k];
      set(i => D.stars[i] >= lo && D.stars[i] <= hi);
      note.textContent = `Lit on the map: the ${STARSHARE.counts[k].toLocaleString()} repositories in the ${STARSHARE.bands[k]}★ band.`;
    },
  });
}

// step 11 — the deceptive bump: bands stay grey with the 50–199 accent (the
// chart's whole point), but every band is clickable to see its slop
export function initBump(D, map, story, refs) {
  const SLOP_G = D.groups.findIndex(g => g.id === 'SLOP');
  const inBand = k => { const [lo, hi] = BANDS[k]; return i => D.grp[i] === SLOP_G && D.stars[i] >= lo && D.stars[i] <= hi; };
  const defFn = inBand(3);   // the 50–199 deception band
  const note = document.getElementById('bumpNote');
  const DEFAULT_NOTE = note.textContent;
  let ctl;
  const set = picker(map, story, 'bump', refs.bump, defFn, () => {
    ctl.clearPick(); note.textContent = DEFAULT_NOTE;
  });
  ctl = renderBars(document.getElementById('fig-bump'), {
    labels: BUMP.bands, values: BUMP.slopPct, accentIdx: BUMP.accentIdx, unit: '%', yMax: 22,
    ariaLabel: `Bar chart of slop rate by star band: 20.6% at 0 to 1 stars, falling to 2.8% at 10 to 49, then rising to 4.6% in the 50 to 199 band before falling to 0.4% above 10,000 stars. Click a band to light its slop on the map.`,
    capHtml: `Slop rate by star band: monotone-decreasing except the highlighted 50–199★ bump. Flag texture: ${BUMP.lureFlags} download-lure flags, ${BUMP.malwareFlags} malware/scam-pattern, ${BUMP.secretFlags} committed-credential. <span class="mono">queries.md → effort_by_star_band</span>.`,
    tipFn: i => `${BUMP.bands[i]}★ · <b>${BUMP.slopPct[i]}%</b> slop`,
    onPick: k => {
      if (k === null) { set(null); note.textContent = DEFAULT_NOTE; return; }
      set(inBand(k));
      note.textContent = `Lit on the map: slop repositories in the ${BUMP.bands[k]}★ band (${BUMP.slopPct[k]}% of the band).`;
    },
  });
}

// step 13 — vertical-agent sub-categories: the micro-clusters inside G20,
// biggest first; hover isolates, click pins (default = the whole region)
export function initVert(D, map, story, refs) {
  const G20 = D.groups.findIndex(g => g.id === 'G20');
  const defFn = i => D.grp[i] === G20;
  const note = document.getElementById('vertNote');
  const DEFAULT_NOTE = note.textContent;
  let rows = [];
  const set = picker(map, story, 'vert', refs.vert, defFn, () => {
    pinned = null;
    rows.forEach(r => r.classList.remove('on'));
    note.textContent = DEFAULT_NOTE;
  });
  const counts = new Map();
  for (let i = 0; i < D.n; i++) {
    if (D.grp[i] === G20 && D.clusters[D.clu[i]].id !== 'noise') {
      counts.set(D.clu[i], (counts.get(D.clu[i]) || 0) + 1);
    }
  }
  let pinned = null;
  const restore = () => {
    if (pinned === null) { set(null); note.textContent = DEFAULT_NOTE; return; }
    const { ci, n } = pinned;
    set(i => D.clu[i] === ci);
    note.textContent = `Lit on the map: ${D.clusters[ci].label.toLowerCase()} (${fmt(n)} repositories).`;
  };
  const wrap = document.getElementById('vertSubs');
  const color = D.groups[G20].color;
  rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([ci, n]) => {
    const el = document.createElement('button');
    el.className = 'region';
    el.title = D.clusters[ci].label;
    el.innerHTML = `<span class="sw" style="background:${color}"></span>` +
      `<span class="lbl">${esc(D.clusters[ci].label)}</span><span class="ct">${fmt(n)}</span>`;
    el.addEventListener('mouseenter', () => set(i => D.clu[i] === ci));
    el.addEventListener('focus', () => set(i => D.clu[i] === ci));
    el.addEventListener('mouseleave', restore);
    el.addEventListener('blur', restore);
    el.addEventListener('click', () => {
      pinned = pinned && pinned.ci === ci ? null : { ci, n };
      rows.forEach(r => r.classList.toggle('on', r === el && pinned !== null));
      restore();
    });
    wrap.appendChild(el);
    return el;
  });
}

// step 09 — MCP quarter bars light that quarter's servers
export function initMcp(D, map, story, refs) {
  const MCP_POS = D.vocab.posture.indexOf('mcp-server');
  const EFF_SLOP = D.vocab.effort.indexOf('slop');
  const isMcp = i => D.pos[i] === MCP_POS && D.eff[i] !== EFF_SLOP;
  const note = document.getElementById('mcpNote');
  const DEFAULT_NOTE = note.textContent;
  const dayOf = (y, m) => Math.round((Date.UTC(y, m, 1) - D.epochMs) / 86400000);
  const qRange = q => {   // '25Q3' -> [startDay, endDay)
    const y = 2000 + +q.slice(0, 2), qn = +q[3], m = (qn - 1) * 3;
    return [dayOf(y, m), qn === 4 ? dayOf(y + 1, 0) : dayOf(y, m + 3)];
  };
  let ctl;
  const set = picker(map, story, 'mcp', refs.mcp, isMcp, () => {
    ctl.clearPick(); note.textContent = DEFAULT_NOTE;
  });
  ctl = renderBars(document.getElementById('fig-mcp'), {
    labels: MCP.quarters, values: MCP.counts, allAccent: true,
    ariaLabel: `Bar chart of MCP servers created per quarter, from 51 in late 2024 to 828 in the second quarter of 2026. Click a bar to light that quarter's servers on the map.`,
    capHtml: `MCP servers created per quarter (snapshot cuts off 2026-07-01). Median MCP server: ${MCP.medianStars} stars. <span class="mono">queries.md → mcp</span>.`,
    tipFn: i => `${MCP.quarters[i]} · <b>${MCP.counts[i].toLocaleString()}</b> MCP servers created`,
    onPick: k => {
      if (k === null) { set(null); note.textContent = DEFAULT_NOTE; return; }
      const [d0, d1] = qRange(MCP.quarters[k]);
      set(i => isMcp(i) && D.created[i] >= d0 && D.created[i] < d1);
      note.textContent = `Lit on the map: the ${MCP.counts[k].toLocaleString()} MCP servers created in ${MCP.quarters[k]}.`;
    },
  });
}

// step 10 — slop genre bars isolate one genre of the violet fringe
export function initSlop(D, map, story, refs) {
  const SLOP_G = D.groups.findIndex(g => g.id === 'SLOP');
  const cluIdx = id => D.clusters.findIndex(c => c.id === id);
  const defFn = i => D.grp[i] === SLOP_G;
  const note = document.getElementById('slopNote');
  const DEFAULT_NOTE = note.textContent;
  let ctl;
  const set = picker(map, story, 'slop', refs.slop, defFn, () => {
    ctl.clearPick(); note.textContent = DEFAULT_NOTE;
  });
  ctl = renderHBars(document.getElementById('fig-slop'), {
    rows: SLOP.top, allAccent: true, headLabel: 'genre',
    ariaLabel: `Horizontal bars of the largest slop genres: MCP-server vaporware ${SLOP.top[0][1]}, rebranded product shells ${SLOP.top[1][1]}, RAG tutorial coursework dumps ${SLOP.top[2][1]}, and five more. Click a bar to isolate that genre on the map.`,
    capHtml: `The 8 largest of 63 slop genres (${SLOP.n.toLocaleString()} repos; ${SLOP.created2025Pct}% created 2025+, ${SLOP.activePct}% still pushing commits). <span class="mono">queries.md → slop.genres_top15</span>.`,
    onPick: k => {
      if (k === null) { set(null); note.textContent = DEFAULT_NOTE; return; }
      const [label, n, id] = SLOP.top[k];
      const ci = cluIdx(id);
      set(i => D.clu[i] === ci);
      note.textContent = `Lit on the map: ${label.toLowerCase()} (${n} repositories).`;
    },
  });
}

// step 14 — problem bars + the browse-all-120 list (shared pick state)
export function initProblems(D, map, story, refs) {
  const pclIdx = id => D.problems.findIndex(p => p.id === id);
  const NOISE = pclIdx('noise');
  const defFn = i => D.pcl[i] >= 0 && D.pcl[i] !== NOISE;
  const note = document.getElementById('probNote');
  const DEFAULT_NOTE = note.textContent;
  let ctl, rows = [];
  const clearList = () => rows.forEach(r => r.el.classList.remove('on'));
  const set = picker(map, story, 'problems', refs.problems, defFn, () => {
    ctl.clearPick(); clearList(); pinnedFn = null; note.textContent = DEFAULT_NOTE;
  });
  let pinnedFn = null;   // the sticky pick (bar or list row); hover overrides
  const commit = (fn, text) => {
    pinnedFn = fn;
    set(fn);
    note.textContent = fn ? text : DEFAULT_NOTE;
  };
  ctl = renderHBars(document.getElementById('fig-problems'), {
    rows: PROBLEMS.top, allAccent: true, headLabel: 'problem',
    ariaLabel: `Horizontal bars of the largest problem clusters: agents lose all memory between sessions, 790 repos; MCP server building and discovery burden, 685; running models on own hardware, 644; and five more. Click a bar to isolate that problem on the map.`,
    capHtml: `The 8 largest of ${PROBLEMS.nClusters} problem clusters (independent clustering of each repo's stated “why”). <span class="mono">queries.md → problem.top20</span>.`,
    onPick: k => {
      clearList();
      if (k === null) { commit(null); return; }
      const [label, n, id] = PROBLEMS.top[k];
      const pi = pclIdx(id);
      commit(i => D.pcl[i] === pi,
        `Lit on the map: “${label}” (${n.toLocaleString()} repositories).`);
    },
  });

  // the browse list: every problem cluster, biggest first, map-hue swatches
  const counts = new Map();
  for (let i = 0; i < D.n; i++) {
    if (D.pcl[i] >= 0 && D.pcl[i] !== NOISE) {
      counts.set(D.pcl[i], (counts.get(D.pcl[i]) || 0) + 1);
    }
  }
  const list = document.getElementById('probList');
  rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([pi, n]) => {
    const p = D.problems[pi];
    const el = document.createElement('button');
    el.className = 'region';
    el.title = p.label;
    el.innerHTML = `<span class="sw" style="background:rgb(${hashHue(p.id).join(',')})"></span>` +
      `<span class="lbl">${esc(p.label)}</span><span class="ct">${fmt(n)}</span>`;
    const hoverFn = i => D.pcl[i] === pi;
    el.addEventListener('mouseenter', () => set(hoverFn));
    el.addEventListener('focus', () => set(hoverFn));
    el.addEventListener('mouseleave', () => set(pinnedFn));
    el.addEventListener('blur', () => set(pinnedFn));
    el.addEventListener('click', () => {
      ctl.clearPick();
      const on = !el.classList.contains('on');
      clearList();
      el.classList.toggle('on', on);
      commit(on ? hoverFn : null,
        `Lit on the map: “${p.label}” (${fmt(n)} repositories).`);
    });
    list.appendChild(el);
    return { el, pi };
  });
}

// step 15 — the fragmentation ladder: every measured problem, most-scattered
// first; click one to light it colored by which mechanism region each repo
// landed in. Mutates refs.xlens.{fn,color}.
export function initXlens(D, map, story, refs) {
  const wrap = document.getElementById('xlensRows');
  const note = document.getElementById('xlensNote');
  const pclIdx = id => D.problems.findIndex(p => p.id === id);
  const GREY = [86, 96, 112];
  const mode = r => {
    const pi = pclIdx(r.id);
    return {
      pred: i => D.pcl[i] === pi,
      color: i => (D.pcl[i] === pi ? hashHue(D.clusters[D.clu[i]].id) : GREY),
      note: `Lit on the map: the ${r.n} “${r.label}” repos, colored by mechanism region; ` +
        `${r.n80} regions cover 80% of them (fragmentation ${r.frag}).`,
    };
  };
  const DEF = XLENS.rows.findIndex(r => r.id === XLENS.scatteredId);
  let cur = DEF;
  const applyMode = () => {
    const m = mode(XLENS.rows[cur]);
    refs.xlens.fn = m.pred;
    refs.xlens.color = m.color;
    note.textContent = m.note;
    rows.forEach((b, j) => b.classList.toggle('on', j === cur));
    if (story.getActiveState() === 'xlens' && document.body.dataset.mode === 'story') {
      map.apply({ emphasis: i => refs.xlens.fn(i), colorBy: i => refs.xlens.color(i) });
    }
  };
  const fmax = Math.max(...XLENS.rows.map(r => r.frag));
  const rows = XLENS.rows.map((r, j) => {
    const b = document.createElement('button');
    b.className = 'fragrow';
    b.innerHTML = `<span class="lbl">${esc(r.label)}</span>` +
      `<span class="fbar"><i style="width:${Math.round(r.frag / fmax * 100)}%"></i></span>` +
      `<span class="fv mono">${r.frag.toFixed(2)}</span>` +
      `<span class="fn mono">${fmt(r.n)}</span>`;
    b.title = `${r.label}: ${r.n} repos, ${r.n80} mechanism regions cover 80%`;
    b.addEventListener('click', () => { cur = j; applyMode(); });
    wrap.appendChild(b);
    return b;
  });
  const head = document.createElement('div');
  head.className = 'fraghead mono';
  head.innerHTML = `<span class="lbl">problem</span><span class="fbar">fragmentation</span>` +
    `<span class="fv">frag</span><span class="fn">repos</span>`;
  wrap.prepend(head);
  story.onStepChange(() => { if (cur !== DEF) { cur = DEF; applyMode(); } });
  applyMode();
}

// step 16 — afterlife bars: five post-deploy clusters + the self-eval union
export function initAfterlife(D, map, story, refs) {
  const pclIdx = id => D.problems.findIndex(p => p.id === id);
  const setOf = ids => new Set(ids.map(pclIdx));
  const POST = setOf(AFTERLIFE.postdeployIds);
  const defFn = i => POST.has(D.pcl[i]);
  const note = document.getElementById('afterNote');
  const DEFAULT_NOTE = note.textContent;
  let ctl;
  const set = picker(map, story, 'afterlife', refs.afterlife, defFn, () => {
    ctl.clearPick(); note.textContent = DEFAULT_NOTE;
  });
  ctl = renderHBars(document.getElementById('fig-afterlife'), {
    rows: AFTERLIFE.rows, allAccent: true, headLabel: 'problem',
    ariaLabel: `Horizontal bars of post-deploy problem clusters: automated penetration testing 254 repos, incident triage 75, production LLM-app observability 65, agents querying production telemetry 55, AI-answer-engine SEO 28, plus 195 evaluating the agents themselves. Click a bar to isolate one.`,
    capHtml: `The five post-deploy problem clusters (${AFTERLIFE.total} repos), plus the ${AFTERLIFE.selfEval} evaluating the agents themselves (union of three clusters). <span class="mono">queries.md → problem.postdeploy + self_eval</span>.`,
    onPick: k => {
      if (k === null) { set(null); note.textContent = DEFAULT_NOTE; return; }
      const [label, n, ids] = AFTERLIFE.rows[k];
      const s = setOf(ids);
      set(i => s.has(D.pcl[i]));
      note.textContent = `Lit on the map: “${label}” (${n} repositories).`;
    },
  });
}

// step 17 — the named-agent table: hover isolates, click pins; default is the
// union of every mention set (sets arrive async from data/sets.json)
export function initAgents(D, map, story, refs) {
  const t = document.getElementById('agentsTable');
  const note = document.getElementById('agentsNote');
  const DEFAULT_NOTE = note.textContent;
  const setFor = key => (refs.sets && refs.sets.get(key)) || new Set();
  const union = i => AGENTS.mentions.some(([, , key]) => setFor(key).has(i));
  let pinned = null;
  const set = picker(map, story, 'agents', refs.agents, union, () => {
    pinned = null;
    trs.forEach(tr => tr.classList.remove('on'));
    note.textContent = DEFAULT_NOTE;
  });
  const restore = () => {
    if (pinned === null) { set(null); note.textContent = DEFAULT_NOTE; return; }
    const [name, n, key] = AGENTS.mentions[pinned];
    set(i => setFor(key).has(i));
    note.textContent = `Lit on the map: the ${n.toLocaleString()} repositories naming ${name}.`;
  };
  t.innerHTML = `<tr><th>named in repo descriptions</th><th>repos</th></tr>` +
    AGENTS.mentions.map(([k, v], i) =>
      `<tr class="pickrow${i === 0 ? ' accentrow' : ''}" tabindex="0" data-k="${i}">` +
      `<td>${esc(k)}</td><td class="mono">${fmt(v)}</td></tr>`).join('');
  const trs = [...t.querySelectorAll('.pickrow')];
  trs.forEach((tr, k) => {
    const [, , key] = AGENTS.mentions[k];
    tr.addEventListener('mouseenter', () => set(i => setFor(key).has(i)));
    tr.addEventListener('focus', () => set(i => setFor(key).has(i)));
    tr.addEventListener('mouseleave', restore);
    tr.addEventListener('blur', restore);
    tr.addEventListener('click', () => {
      pinned = pinned === k ? null : k;
      trs.forEach((r, j) => r.classList.toggle('on', j === pinned));
      restore();
    });
    tr.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); tr.click(); }
    });
  });
}

// step 18 — the vendor economy: four lock-in/routing problem clusters
export function initGravity(D, map, story, refs) {
  const pclIdx = id => D.problems.findIndex(p => p.id === id);
  const ALL = new Set(GRAVITY.vendor.map(([, , id]) => pclIdx(id)));
  const defFn = i => ALL.has(D.pcl[i]);
  const note = document.getElementById('gravityNote');
  const DEFAULT_NOTE = note.textContent;
  let ctl;
  const set = picker(map, story, 'gravity', refs.gravity, defFn, () => {
    ctl.clearPick(); note.textContent = DEFAULT_NOTE;
  });
  ctl = renderHBars(document.getElementById('fig-vendor'), {
    rows: GRAVITY.vendor, allAccent: true, headLabel: 'problem cluster',
    ariaLabel: `Horizontal bars of the vendor-economy problem clusters: Claude Code locked to Anthropic backends 257 repos, multi-provider LLM usage unmanageable 196, AI coding quotas fragmented and opaque 89, coding-agent CLIs lock users to one vendor 84. Click a bar to isolate one.`,
    capHtml: `The four lock-in/routing problem clusters: ${GRAVITY.vendorEconTotal} repos undoing vendor lock-in in the agent stack. <span class="mono">queries.md → problem.vendor_econ</span>.`,
    onPick: k => {
      if (k === null) { set(null); note.textContent = DEFAULT_NOTE; return; }
      const [label, n, id] = GRAVITY.vendor[k];
      const pi = pclIdx(id);
      set(i => D.pcl[i] === pi);
      note.textContent = `Lit on the map: “${label}” (${n} repositories).`;
    },
  });
}

// step 19 — the redundancy census: chips flip between the duplicated set and
// the one-of-a-kind tail; region bars isolate where the copying concentrates.
// Both sets arrive async from data/sets.json (indices only), so every
// predicate reads refs.sets live.
export function initNeardup(D, map, story, refs) {
  const setFor = key => (refs.sets && refs.sets.get(key)) || new Set();
  const note = document.getElementById('dupNote');
  const DEFAULT_NOTE = note.textContent;
  const glabel = id => (D.groups.find(g => g.id === id) || { label: id }).label;
  let mode = 'near_dup', pickedGrp = null, ctl;
  const active = () => story.getActiveState() === 'neardup' &&
    document.body.dataset.mode === 'story';
  const count = fn => { let c = 0; for (let i = 0; i < D.n; i++) if (fn(i)) c++; return c; };
  const apply = () => {
    const key = mode, gi = pickedGrp;
    refs.neardup.fn = gi === null ? i => setFor(key).has(i)
      : i => setFor(key).has(i) && D.grp[i] === gi;
    if (gi !== null) {
      const g = D.groups[gi];
      note.textContent = `Lit on the map: the ${fmt(count(refs.neardup.fn))} duplicated repos inside ${g.label.toLowerCase()}.`;
    } else {
      note.textContent = key === 'near_dup' ? DEFAULT_NOTE :
        `Lit on the map: the ${NEARDUP.soloN} one-of-a-kind repositories, with no meaningful neighbor anywhere.`;
    }
    if (active()) map.apply({ emphasis: i => refs.neardup.fn(i) });
  };
  refs.neardup.fn = i => setFor('near_dup').has(i);
  const chipWrap = document.getElementById('dupChips');
  const chips = [
    ['near_dup', `have a near-duplicate · ${NEARDUP.n}`],
    ['one_of_a_kind', `one-of-a-kind · ${NEARDUP.soloN}`],
  ].map(([key, label], k) => {
    const b = document.createElement('button');
    b.className = 'chip' + (k === 0 ? ' on' : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      mode = key; pickedGrp = null; ctl.clearPick();
      chips.forEach((c, j) => c.classList.toggle('on', chips[j] === b));
      apply();
    });
    chipWrap.appendChild(b);
    return b;
  });
  ctl = renderHBars(document.getElementById('fig-neardup'), {
    rows: NEARDUP.regions.map(([pct, gid]) => [glabel(gid), pct, gid]),
    unit: '%', allAccent: true, headLabel: 'region', headValue: 'duplicated',
    ariaLabel: `Horizontal bars of near-duplicate rate by map region: tutorials and catalogs ${NEARDUP.regions[0][0]} percent, LLM gateways ${NEARDUP.regions[1][0]}, worktree tooling ${NEARDUP.regions[2][0]}, down to agent frameworks 0.3 and payments 0. Click a bar to light that region's duplicated repos.`,
    capHtml: `Share of each region's repos with a true near-duplicate: the five most-copied and three least-copied regions (of those ≥100 repos). Similarity threshold 0.95, calibrated against a random-pair baseline; at 0.94 the corpus rate would read ${NEARDUP.sensitivity[1][1]}%, at 0.96 ${NEARDUP.sensitivity[3][1]}%; claims are made at 0.95 only. <span class="mono">queries_emb.py → near_dup</span>.`,
    tipFn: i => `${glabel(NEARDUP.regions[i][1])} · <b>${NEARDUP.regions[i][0]}%</b> duplicated`,
    onPick: k => {
      if (k !== null) {
        mode = 'near_dup';
        chips.forEach((c, j) => c.classList.toggle('on', j === 0));
        pickedGrp = D.groups.findIndex(g => g.id === NEARDUP.regions[k][1]);
      } else pickedGrp = null;
      apply();
    },
  });
  story.onStepChange(() => {
    mode = 'near_dup'; pickedGrp = null; ctl.clearPick();
    chips.forEach((c, j) => c.classList.toggle('on', j === 0));
    refs.neardup.fn = i => setFor('near_dup').has(i);
    note.textContent = DEFAULT_NOTE;
  });
}

// step 21 — drive-by repos: entire observed life ≤ 7 days, computed from the
// payload's created/commit columns (no extra data). Bars pick a cohort.
export function initDriveby(D, map, story, refs, yearOf) {
  const CUTOFF = Math.round((Date.UTC(2025, 9, 1) - D.epochMs) / 86400000);
  const judged = i => (D.commit[i] - D.created[i]) <= 7 && D.created[i] < CUTOFF;
  const note = document.getElementById('drivebyNote');
  let n = 0;
  for (let i = 0; i < D.n; i++) if (judged(i)) n++;
  note.textContent = `Lit on the map: the ${fmt(n)} repositories (created before Oct 2025) whose entire observed life fits inside one week. Click a bar to light a single cohort.`;
  const DEFAULT_NOTE = note.textContent;
  let ctl;
  const set = picker(map, story, 'driveby', refs.driveby, judged, () => {
    ctl.clearPick(); note.textContent = DEFAULT_NOTE;
  });
  ctl = renderBars(document.getElementById('fig-driveby'), {
    labels: DRIVEBY.years.map(String), values: DRIVEBY.pct,
    allAccent: true, unit: '%', yMax: 20,
    ariaLabel: `Bar chart of drive-by share by creation cohort: 1.8 percent of 2021 and 2022, 5 percent of 2023, 7.1 of 2024, 15.7 of 2025. Click a bar to light that cohort's drive-by repos on the map.`,
    capHtml: `Repos whose entire observed life (last commit − creation) fits inside 7 days, by creation cohort. Cohorts after Sep 2025 aren't judged; they could still wake up. <span class="mono">queries.md → drive_by</span>.`,
    tipFn: i => `class of ${DRIVEBY.years[i]} · <b>${DRIVEBY.pct[i]}%</b> drive-by`,
    onPick: k => {
      if (k === null) { set(null); note.textContent = DEFAULT_NOTE; return; }
      const y = DRIVEBY.years[k];
      set(i => judged(i) && yearOf[i] === y);
      note.textContent = `Lit on the map: the class of ${y}'s drive-by repos (${DRIVEBY.pct[k]}% of the cohort).`;
    },
  });
  renderTiles(document.getElementById('tiles-driveby'), [
    { v: DRIVEBY.humanPct.toFixed(1) + '%', l: 'of human-built repos' },
    { v: DRIVEBY.aiPct.toFixed(1) + '%', l: 'of AI-assisted builds' },
    { v: DRIVEBY.slopPct.toFixed(1) + '%', l: 'of the slop stratum' },
  ]);
}

// step 20 — mortality bars: click a cohort to light its dormant/archived
// repos (the map stays recolored by pulse throughout)
export function initMortality(D, map, story, refs, yearOf) {
  const LIV_D = D.vocab.liveness.indexOf('dormant');
  const LIV_A = D.vocab.liveness.indexOf('archived');
  const dead = i => D.liv[i] === LIV_D || D.liv[i] === LIV_A;
  const note = document.getElementById('mortNote');
  const DEFAULT_NOTE = note.textContent;
  let ctl;
  const set = picker(map, story, 'mortality', refs.mortality, null, () => {
    ctl.clearPick(); note.textContent = DEFAULT_NOTE;
  });
  ctl = renderBars(document.getElementById('fig-mortality'), {
    labels: MORTALITY.years.map(String), values: MORTALITY.dormPct,
    allAccent: true, unit: '%', yMax: 50,
    ariaLabel: `Bar chart of dormant or archived share by creation cohort: 30.5% of 2021, 25.7% of 2022, 43.3% of 2023 (the worst), 35.7% of 2024, 26.2% of 2025. The 2026 cohort is not plotted: the dormancy measure requires months of inactivity, which a repo created this year cannot yet have. Click a bar to light that cohort's dormant repos on the map.`,
    capHtml: `Dormant + archived share by creation cohort. 2026 is not plotted: calling a repo dormant requires months of inactivity, which the 2026 cohort by definition can't have yet. <span class="mono">queries.md → liveness_by_created_year</span>.`,
    tipFn: i => `class of ${MORTALITY.years[i]} · <b>${MORTALITY.dormPct[i]}%</b> dormant/archived`,
    onPick: k => {
      if (k === null) { set(null); note.textContent = DEFAULT_NOTE; return; }
      const y = MORTALITY.years[k];
      set(i => yearOf[i] === y && dead(i));
      note.textContent = `Lit on the map: the class of ${y}'s dormant & archived repos (${MORTALITY.dormPct[k]}% of the cohort).`;
    },
  });
  // pulse legend (colors from states.js so the dots match the map exactly)
  document.getElementById('pulseLegend').innerHTML =
    [['active', PULSE.active], ['slowing', PULSE.slowing],
     ['dormant', PULSE.dormant], ['archived', PULSE.archived]]
      .map(([l, c]) => `<span><span class="sw" style="background:rgb(${c.join(',')})"></span>${l}</span>`)
      .join('');
}

// step 08 — language legend (dots match the map recolor exactly)
export function initLangLegend() {
  document.getElementById('langLegend').innerHTML =
    LANG.series.map(s =>
      `<span><span class="sw" style="background:${s.color}"></span>${esc(s.key)}</span>`)
      .join('') +
    `<span><span class="sw" style="background:rgb(86,96,112)"></span>other</span>`;
}

// step 12 — newborn-category chips: default emphasis is the union; hover
// isolates one; click pins. Mutates refs.cats.fn (read by states.js).
export function initCats(D, map, story, refs) {
  const wrap = document.getElementById('cats');
  const grpIdx = id => D.groups.findIndex(g => g.id === id);
  const cluIdx = id => D.clusters.findIndex(c => c.id === id);
  const preds = CATS.map(c => {
    if (c.kind === 'grp') { const gi = grpIdx(c.id); return i => D.grp[i] === gi; }
    const ci = cluIdx(c.id); return i => D.clu[i] === ci;
  });
  const union = i => preds.some(p => p(i));
  refs.cats.fn = union;
  let pinned = null;
  const active = () => story.getActiveState() === 'cats' &&
    document.body.dataset.mode === 'story';
  const setPred = fn => { refs.cats.fn = fn; if (active()) map.apply({ emphasis: i => refs.cats.fn(i) }); };
  const restore = () => setPred(pinned === null ? union : preds[pinned]);

  const rows = CATS.map((c, k) => {
    const b = document.createElement('button');
    b.className = 'region';
    b.innerHTML = `<span class="sw" style="background:${c.kind === 'grp'
      ? D.groups[grpIdx(c.id)].color : `rgb(${hashHue(c.id).join(',')})`}"></span>` +
      `<span class="lbl">${esc(c.label)}</span>` +
      `<span class="ct">${fmt(c.n)} · ${esc(c.born)}</span>`;
    b.addEventListener('mouseenter', () => setPred(preds[k]));
    b.addEventListener('focus', () => setPred(preds[k]));
    b.addEventListener('mouseleave', restore);
    b.addEventListener('blur', restore);
    b.addEventListener('click', () => {
      pinned = pinned === k ? null : k;
      rows.forEach((r, j) => r.classList.toggle('on', j === pinned));
      restore();
    });
    wrap.appendChild(b);
    return b;
  });
  story.onStepChange(() => {
    if (pinned !== null) { pinned = null; rows.forEach(r => r.classList.remove('on')); refs.cats.fn = union; }
  });
}

// stat tiles for steps 5 / 7 / 13
export function initTiles() {
  renderTiles(document.getElementById('tiles-lowstar'), [
    { v: LOWSTAR.median, l: 'median stars' },
    { v: LOWSTAR.lt10pct + '%', l: 'under 10 stars' },
    { v: STARSHARE.starsPct.at(-1) + '%', l: 'of all stars in the 10k+ band' },
  ]);
  renderTiles(document.getElementById('tiles-harness'), [
    { v: fmt(HARNESS.n), l: 'coding-agent harnesses' },
    { v: HARNESS.medianStars, l: 'median stars' },
    { v: HARNESS.rustGoPct + '%', l: 'written in Rust or Go' },
  ]);
  renderTiles(document.getElementById('tiles-vert'), [
    { v: fmt(VERT.n), l: 'vertical & domain agents' },
    { v: VERT.medianStars, l: 'median stars' },
    { v: VERT.aiPct + '%', l: 'AI-assisted builds' },
  ]);
}
