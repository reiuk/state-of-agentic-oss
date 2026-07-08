// Declarative map state per story step. Built once with the payload in hand;
// dynamic steps (authorship scrub, year/quarter/genre/problem picks, chips)
// read mutable refs owned by their interaction modules — emphasis only, camera
// stays the step's (the operator rule: interactions never fight the framing).
import { hashHue } from './mapview.js';
import { LANG } from './figures.js';

export const BIAS = 280;  // half the story column width

// mortality recolor: live points go cool slate (group hues include embers —
// keeping them would camouflage the dead), dead ones burn ember. Exported for
// the in-step pulse legend (steps.js).
export const PULSE = {
  active: [88, 102, 126], slowing: [128, 118, 96],
  dormant: [214, 116, 82], archived: [178, 85, 99],
};

export function buildStates(D, map, refs) {
  const CAM = { pad: 1.28, bias: BIAS };
  const grpIdx = id => D.groups.findIndex(g => g.id === id);
  const pclIdx = id => D.problems.findIndex(p => p.id === id);

  const G01 = grpIdx('G01'), G20 = grpIdx('G20');
  const PCL_NOISE = pclIdx('noise');

  // language recolor: the 4 tracked languages wear their validated chart hues
  const langRgb = new Map(LANG.series.map(s => [D.vocab.langs.indexOf(s.key),
    [parseInt(s.color.slice(1, 3), 16), parseInt(s.color.slice(3, 5), 16), parseInt(s.color.slice(5, 7), 16)]]));
  const GREY = [86, 96, 112];
  const langColor = i => langRgb.get(D.lang[i]) || GREY;

  // problem-lens recolor: stable hue per problem cluster, grey for noise/slop
  const pclRgb = D.problems.map(p => (p.id === 'noise' ? GREY : hashHue(p.id)));
  const problemColor = i => (D.pcl[i] >= 0 ? pclRgb[D.pcl[i]] : GREY);

  const LIV_D = D.vocab.liveness.indexOf('dormant');
  const LIV_A = D.vocab.liveness.indexOf('archived');
  const LIV_S = D.vocab.liveness.indexOf('slowing');
  const livenessColor = i =>
    D.liv[i] === LIV_A ? PULSE.archived : D.liv[i] === LIV_D ? PULSE.dormant :
    D.liv[i] === LIV_S ? PULSE.slowing : PULSE.active;

  const BASE = { emphasis: null, colorBy: null, labels: false, dim: 1, camera: CAM };
  const S = (o) => ({ ...BASE, ...o });

  return {
    hero:      S({}),
    territory: S({ labels: true, emphasis: i => refs.territory.fn(i) }),
    method:    S({}),                       // nothing highlighted → nothing dimmed
    age:       S({ emphasis: i => refs.age.fn(i) }),
    authorship:S({ camera: { pad: 1.2, bias: BIAS }, dim: 0.9,
                   emphasis: i => refs.authorship(i) }),
    lowstar:   S({ emphasis: i => refs.lowstar.fn(i) }),
    harness:   S({ emphasis: i => D.grp[i] === G01,
                   camera: () => map.fitSubset(i => D.grp[i] === G01, 1.5, BIAS) }),
    langs:     S({ colorBy: langColor, emphasis: i => langRgb.has(D.lang[i]) }),
    mcp:       S({ emphasis: i => refs.mcp.fn(i) }),
    slop:      S({ emphasis: i => refs.slop.fn(i) }),
    bump:      S({ emphasis: i => refs.bump.fn(i) }),
    cats:      S({ emphasis: i => refs.cats.fn(i) }),
    vert:      S({ emphasis: i => refs.vert.fn(i),
                   camera: () => map.fitSubset(i => D.grp[i] === G20, 1.5, BIAS) }),
    problems:  S({ colorBy: problemColor, emphasis: i => refs.problems.fn(i) }),
    xlens:     S({ emphasis: i => refs.xlens.fn(i), colorBy: i => refs.xlens.color(i) }),
    afterlife: S({ emphasis: i => refs.afterlife.fn(i) }),
    agents:    S({ emphasis: i => refs.agents.fn(i) }),
    gravity:   S({ emphasis: i => refs.gravity.fn(i) }),
    neardup:   S({ emphasis: i => refs.neardup.fn(i) }),
    mortality: S({ colorBy: livenessColor,
                   emphasis: i => (refs.mortality.fn ? refs.mortality.fn(i) : true) }),
    driveby:   S({ emphasis: i => refs.driveby.fn(i) }),
    coda:      S({ labels: true }),
  };
}
