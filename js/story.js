// Scroll engine: each .step owns a declarative map state (states.js); the
// active step is derived from scroll position and applied via mapview.apply().
import { fmt } from './data.js';
import { buildStates } from './states.js';

export function initStory(D, map, refs) {
  const STATES = buildStates(D, map, refs);

  const steps = [...document.querySelectorAll('.step')];
  const rail = document.getElementById('rail');
  steps.forEach((s, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `Go to story step ${i + 1}`);
    b.addEventListener('click', () => s.scrollIntoView({ behavior: 'smooth' }));
    rail.appendChild(b);
  });
  const notches = [...rail.children];

  let active = -1;
  const changeCbs = [];

  function applyActive(opts) {
    const i = Math.max(0, active);
    map.apply({ ...(STATES[steps[i].dataset.state] || STATES.territory), ...opts });
    if (map.getMode() !== 'explore') map.setController(wheelZoom ? 'story' : 'hero');
  }
  function activate(i) {
    if (i === active) return;
    active = i;
    notches.forEach((nb, j) => nb.classList.toggle('on', j === i));
    document.getElementById('story').classList.toggle('past-hero', i > 0);
    applyActive();
    changeCbs.forEach(cb => cb(i, steps[i].dataset.state));
  }

  // Active step is computed FROM scroll position — the last step whose top has
  // crossed 42% of the viewport. Deterministic in both directions: an
  // enter-event IntersectionObserver misses re-entries when a step never fully
  // exits (scroll to step 1 and back up → hero never un-intersected → no event
  // → title stayed hidden).
  function currentStep() {
    const line = innerHeight * 0.42;
    let idx = 0;
    steps.forEach((s, j) => {
      if (s.style.display !== 'none' && s.getBoundingClientRect().top <= line) idx = j;
    });
    return idx;
  }

  // wheel-over-map zooms only once the reader is fully past the divider —
  // flipping it mid-hero made the wheel toggle under the cursor
  let wheelZoom = false;
  const divider = document.querySelector('.divider');
  const masthead = document.getElementById('masthead');
  let ticking = false;
  function onScroll(force) {
    ticking = false;
    // in explore the story is display:none — rects are zero and scrollY is
    // clamped; reconciling from that state would clobber the explore camera
    if (document.body.dataset.mode === 'explore') return;
    // masthead slides down into existence once the title page is fully gone
    masthead.classList.toggle('docked', divider.getBoundingClientRect().top <= 0);
    const on = scrollY >= divider.offsetTop - 24;
    if (on !== wheelZoom || force) {
      wheelZoom = on;
      map.setController(on ? 'story' : 'hero');
    }
    const s = currentStep();
    if (s !== active) activate(s);
    else if (force) applyActive();
  }
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  // hero count ticker (respects reduced motion)
  const cEl = document.getElementById('heroCount');
  const N = D.n;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cEl.textContent = fmt(N);
  } else {
    const t0 = performance.now(), DUR = 2200;
    const tick = now => {
      const t = Math.min(1, (now - t0) / DUR);
      cEl.textContent = fmt(Math.round(N * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  return {
    getActive: () => active,
    getActiveState: () => (active >= 0 ? steps[active].dataset.state : null),
    onStepChange: cb => changeCbs.push(cb),
    reapply: applyActive,
    sync: () => onScroll(true),   // full reconcile from scroll position
    jumpTo: (i, noscroll) => {             // QA hook: apply state directly + instant scroll
      const s = steps[i];
      if (!s) return;
      activate(i);
      if (noscroll) {
        steps.forEach((st, j) => { if (j !== i) st.style.display = 'none'; });
        masthead.classList.toggle('docked', i > 0);
      } else s.scrollIntoView({ behavior: 'instant', block: 'start' });
    },
  };
}
