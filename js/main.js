import { loadCore } from './data.js';
import { createMap, tooltipHtml } from './mapview.js';
import { initStory } from './story.js';
import { initDetail } from './detail.js';
import { initExplore } from './explore.js';
import { renderAuthorshipChart, renderLines } from './chart.js';
import { initRegions } from './regions.js';
import { initCats, initXlens, initTiles, findRepo,
         initAge, initMcp, initSlop, initProblems, initAfterlife, initAgents,
         initGravity, initMortality, initLangLegend, initLowstar, initBump,
         initVert, initNeardup, initDriveby } from './steps.js';
import { LANG } from './figures.js';

const D = await loadCore();
const params = new URLSearchParams(location.search);
const BARE = params.has('bare');   // bake mode: bare map only (hero-bg screenshot)

const tooltip = document.getElementById('tooltip');
let detail;

// explore mode appends the active color/filter dimensions to the hover card
const tip = { extra: null };

const map = createMap(D, {
  onClick: i => detail && detail.open(i),
  onHoverInfo: (i, info) => {
    if (i === null || BARE) { tooltip.style.display = 'none'; return; }
    tooltip.innerHTML = tooltipHtml(D, i) + (tip.extra ? tip.extra(i) : '');
    tooltip.style.display = 'block';
    tooltip.style.left = Math.min(innerWidth - 310, info.x + 16) + 'px';
    tooltip.style.top = Math.min(innerHeight - 90, info.y + 16) + 'px';
  },
});

// deck only reports hover while the pointer is over the canvas — sliding off
// onto a side panel leaves the last tooltip stranded. Any pointer position
// whose target isn't the canvas hides it.
const mapCanvas = document.getElementById('map');
addEventListener('pointermove', e => {
  if (e.target !== mapCanvas && tooltip.style.display === 'block') {
    tooltip.style.display = 'none';
  }
}, { passive: true });
document.documentElement.addEventListener('mouseleave', () => {
  tooltip.style.display = 'none';
});

if (BARE) {
  document.body.classList.add('bare');
  map.apply({ camera: 'wide', labels: false, dim: 1, instant: true });
} else {
  detail = initDetail(D, map);

  // ---- mutable refs read by states.js (owned by the interaction modules)
  const yearOf = new Int16Array(D.n);
  for (let i = 0; i < D.n; i++) {
    yearOf[i] = new Date(D.epochMs + D.created[i] * 86400000).getUTCFullYear();
  }
  let scrubYear = 2026;
  const T = () => true;
  const refs = {
    authorship: i => D.eff[i] === 1 && yearOf[i] <= scrubYear,
    territory: { fn: T },            // set by initRegions
    age: { fn: T },                  // set by initAge
    lowstar: { fn: T },              // set by initLowstar
    bump: { fn: T },                 // set by initBump
    vert: { fn: T },                 // set by initVert
    cats: { fn: T },                 // set by initCats
    mcp: { fn: T },                  // set by initMcp
    slop: { fn: T },                 // set by initSlop
    problems: { fn: T },             // set by initProblems
    xlens: { fn: T, color: () => [86, 96, 112] }, // set by initXlens
    afterlife: { fn: T },            // set by initAfterlife
    agents: { fn: () => false },     // set by initAgents (sets load async)
    gravity: { fn: T },              // set by initGravity
    neardup: { fn: () => false },    // set by initNeardup (sets load async)
    mortality: { fn: null },         // set by initMortality (null = no fade)
    driveby: { fn: T },              // set by initDriveby
    sets: null,                      // filled from data/sets.json
  };

  // ---- authorship scrubber (chart drives the map note + emphasis)
  const mapnote = document.getElementById('mapnote');
  let story;
  const chartCtl = renderAuthorshipChart(document.getElementById('fig-authorship'), {
    onScrub: y => {
      scrubYear = y;
      mapnote.textContent = y >= 2026
        ? 'Lit on the map: every repository our read classified as an AI-assisted build.'
        : `Lit on the map: AI-assisted repos that existed by the end of ${y}.`;
      if (story && story.getActiveState() === 'authorship' &&
          document.body.dataset.mode === 'story') {
        map.apply({ emphasis: refs.authorship });
      }
    },
  });

  story = initStory(D, map, refs);
  const explore = initExplore(D, map, story, tip);
  initRegions(D, map, story, refs);
  initCats(D, map, story, refs);
  initXlens(D, map, story, refs);
  initAge(D, map, story, refs, yearOf);
  initLowstar(D, map, story, refs);
  initBump(D, map, story, refs);
  initVert(D, map, story, refs);
  initMcp(D, map, story, refs);
  initSlop(D, map, story, refs);
  initProblems(D, map, story, refs);
  initAfterlife(D, map, story, refs);
  initAgents(D, map, story, refs);
  initGravity(D, map, story, refs);
  initNeardup(D, map, story, refs);
  initMortality(D, map, story, refs, yearOf);
  initDriveby(D, map, story, refs, yearOf);
  initLangLegend();
  initTiles();
  renderCharts();
  map.fadeIn();

  // highlight sets (named-agent mentions, redundancy census) — indices only.
  // Reapply only in story mode: a ?mode=explore entry would otherwise get its
  // colors/filters clobbered by the active story state when the fetch lands.
  fetch('data/sets.json').then(r => r.json()).then(s => {
    refs.sets = new Map(Object.entries(s).map(([k, v]) => [k, new Set(v)]));
    if (document.body.dataset.mode === 'story') story.reapply();
  }).catch(() => {});

  // masthead / in-page methodology links
  const toAppendix = () => document.getElementById('appendix')
    .scrollIntoView({ behavior: 'smooth', block: 'start' });
  for (const id of ['methodBtn', 'toAppendix', 'codaMethod']) {
    const b = document.getElementById(id);
    if (b) b.addEventListener('click', () => {
      if (document.body.dataset.mode === 'explore') explore.setMode('story');
      requestAnimationFrame(toAppendix);
    });
  }

  // re-frame the ACTIVE story state on resize (debounced); explore keeps the
  // user's camera untouched
  let rsT;
  addEventListener('resize', () => {
    clearTimeout(rsT);
    rsT = setTimeout(() => {
      if (document.body.dataset.mode === 'story') story.reapply();
    }, 150);
  });

  // QA hooks: ?step=N (&noscroll=1), ?appendix=1, ?mode=explore, ?detail=o/n, ?year=YYYY
  if (params.get('mode') === 'explore') explore.setMode('explore');
  else if (params.get('step')) story.jumpTo(+params.get('step'), params.has('noscroll'));
  else if (params.has('appendix')) {   // headless can't scroll: isolate the appendix
    document.querySelectorAll('.step').forEach(s => { s.style.display = 'none'; });
    document.getElementById('masthead').classList.add('docked');
  }
  if (params.get('year')) chartCtl.setYear(+params.get('year'));
  if (params.get('detail')) {
    const [ow, nm] = params.get('detail').split('/');
    const i = findRepo(D, ow, nm);
    if (i >= 0) {
      if (params.get('mode') !== 'explore') explore.setMode('explore');
      detail.open(i);
    }
  }
}

// charts with no map interaction (the interactive ones live in steps.js)
function renderCharts() {
  renderLines(document.getElementById('fig-lang'), {
    xs: LANG.years, series: LANG.series, cohortN: LANG.cohortN, yMax: 60,
    ariaLabel: `Line chart of language share by creation-year cohort, 2022 to 2026. Python falls from 50 percent (2023) to 31 percent (2026); Rust rises from 9 to 16 percent; Go from 8 to 15; TypeScript steady near 18.`,
    capHtml: `Share of each cohort's repos (with a detected language). Cohorts before 2022 are under 300 repos and noisy. <span class="mono">queries.md → language.share_by_created_year</span>.`,
  });
}
