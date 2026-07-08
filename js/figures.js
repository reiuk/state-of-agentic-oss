// Chart + stat data for story steps. Every value here is copied from
// paper/computed.json (regenerate: python3 paper/queries.py) — see
// paper/queries.md for the claim→query mapping. Final QA diffs these
// literals against a fresh computed.json. Nothing on the page cites a number
// that is not in this file or computed at runtime from the payload.

export const TOTALS = { corpus: 20393, nonslop: 18785, groups: 25, slop: 1608 };

// F1 — AI-assisted share of non-slop repos, by creation-year cohort.
// computed.json → effort_by_created_year[year].cleaned_ai_pct_of_nonslop
export const AUTHORSHIP = {
  years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
  pct: [5.2, 6.8, 6.4, 5.5, 13.6, 42.3, 66.9],
  n: [156, 167, 272, 1048, 1346, 4586, 12333], // cohort sizes (all classes)
  band: 7, // ±pp — human-built↔AI-assisted cross-model noise (memo §H)
};

// F3 — created-year histogram. computed.json → created_histogram + extras.
export const AGE = {
  years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
  counts: [35, 59, 72, 113, 138, 156, 167, 272, 1048, 1346, 4586, 12333],
  last12: 14890, last12pct: 73.0, since2024pct: 89.6,
};

// F4 — star concentration. computed.json → stars.
export const LOWSTAR = {
  median: 16, lt10pct: 45.4, top1pctShare: 35.3, totalStars: 47866674, ge10k: 1173,
};

// F4 — share of repos vs share of stars, by star band. computed.json → stars.by_band.
export const STARSHARE = {
  bands: ['0–1', '2–9', '10–49', '50–199', '200–999', '1k–9.9k', '10k+'],
  repoPct: [26.0, 19.3, 14.9, 11.0, 10.2, 12.8, 5.8],
  starsPct: [0.0, 0.0, 0.2, 0.5, 2.1, 19.5, 77.7],
  counts: [5308, 3944, 3033, 2240, 2082, 2613, 1173],
};

// F13 — the harness explosion. computed.json → groups.G01, language.g01_mix, micro.
export const HARNESS = {
  n: 1250, medianStars: 6, rustGoPct: 76.1, ge10k: 31,
  micro: [['Rust runtimes & CLIs', 503], ['Go runtimes & TUI frameworks', 403],
          ['DIY terminal coding-agent CLIs', 142]],
};

// F21 — language share by creation cohort (% of repos with a language).
// computed.json → language.share_by_created_year. 2022+ (earlier cohorts <300 repos).
// Palette validated (dataviz six checks, dark surface #0a0c12):
// #5588c9,#2fa898,#a98a28,#c96a72 — worst adjacent CVD ΔE 35.8, all ≥3:1.
export const LANG = {
  years: [2022, 2023, 2024, 2025, 2026],
  series: [
    { key: 'Python', color: '#5588c9', pct: [40.3, 50.3, 48.4, 38.3, 31.3] },
    { key: 'TypeScript', color: '#2fa898', pct: [9.5, 13.1, 14.8, 17.4, 17.8] },
    { key: 'Go', color: '#a98a28', pct: [12.9, 8.2, 9.9, 14.8, 14.7] },
    { key: 'Rust', color: '#c96a72', pct: [9.9, 8.7, 8.1, 12.5, 16.1] },
  ],
  cohortN: [263, 986, 1286, 4384, 11553],
};

// F12 — the MCP economy. computed.json → mcp.
export const MCP = {
  quarters: ['24Q4', '25Q1', '25Q2', '25Q3', '25Q4', '26Q1', '26Q2'],
  counts: [51, 169, 273, 181, 168, 598, 828],
  servers: 2364, sharePct: 12.6, medianStars: 9, p0: 685, g09DormPct: 17.7,
};

// F6/F7 — the slop stratum. computed.json → slop. ids = slop micro-cluster
// ids (s##) so the genre bars can light their members on the map.
export const SLOP = {
  n: 1608, genres: 63, activePct: 65.7, created2025Pct: 93.3, medianStars: 0,
  top: [['MCP-server vaporware', 149, 's1'], ['Rebranded product shells', 59, 's38'],
        ['RAG tutorial coursework dumps', 51, 's17'], ['Agent-skill prompt files', 36, 's26'],
        ['Static landing-page dumps', 34, 's10'], ['Orchestration vaporware', 32, 's58'],
        ['Zip-dropper scam repos', 30, 's13'], ['Tutorial multi-agent wrappers', 28, 's62']],
};

// F8/F10 — the deceptive bump. computed.json → effort_by_star_band, flags.
export const BUMP = {
  bands: ['0–1', '2–9', '10–49', '50–199', '200–999', '1k–9.9k', '10k+'],
  slopPct: [20.6, 7.1, 2.8, 4.6, 1.0, 0.9, 0.4],
  accentIdx: 3,
  lureFlags: 232, malwareFlags: 140, secretFlags: 54, topSlopStars: 194477,
};

// F14 — categories being born. computed.json → micro, groups.
// kind: 'clu' matches cluster id, 'grp' matches group id (resolved at runtime).
export const CATS = [
  { kind: 'clu', id: 'c154', label: 'Code-graph indexing & search', n: 281, born: 'Feb 2026' },
  { kind: 'clu', id: 'c61', label: 'Security scanners & pentest agents', n: 311, born: 'Mar 2026' },
  { kind: 'grp', id: 'G07', label: 'Agent-aware VCS & worktrees', n: 131, born: 'Feb 2026' },
  { kind: 'grp', id: 'G22', label: 'Agent payments & identity', n: 138, born: 'Mar 2026' },
  { kind: 'grp', id: 'G04', label: 'Skills & context engineering', n: 612, born: 'Mar 2026' },
];

// F16 — the vertical wave. computed.json → groups.G20.
export const VERT = { n: 610, medianStars: 3, aiPct: 70.8, ge10k: 22 };

// F17 — top problem clusters. computed.json → problem.top20 (top 8).
// ids = problem-lens cluster ids so the bars can light their members.
export const PROBLEMS = {
  top: [['Agents lose all memory between sessions', 790, 'p111'],
        ['MCP server building & discovery burden', 685, 'p0'],
        ['Running models on own hardware is hard', 644, 'p45'],
        ['AI coding skips specs and quality gates', 407, 'p112'],
        ['Image/video production is slow, expert-bound', 339, 'p7'],
        ['Agents rediscover codebases via wasteful grep', 324, 'p94'],
        ['Production agent infra rebuilt per project', 302, 'p95'],
        ['Parallel agent runs collide without isolation', 288, 'p115']],
  noisePct: 32.2, nClusters: 120,
};

// F18 — one problem, many shapes. computed.json → xlens.problem_side, all 8
// measured problems ordered most-scattered → most-converged. frag = mechanism
// fragmentation (1 − Σshare²-ish, see queries.md); n80 = capability clusters
// needed to cover 80% of the problem's repos.
export const XLENS = {
  rows: [
    { id: 'p87', label: 'Closed SaaS is agent-unready', n: 182, frag: 0.88, n80: 26 },
    { id: 'p95', label: 'Production agent infrastructure', n: 302, frag: 0.85, n80: 16 },
    { id: 'p104', label: 'Personas handcrafted repeatedly', n: 162, frag: 0.83, n80: 11 },
    { id: 'p101', label: 'Vendor-locked chat frontends', n: 119, frag: 0.78, n80: 15 },
    { id: 'p115', label: 'Parallel-run isolation', n: 288, frag: 0.77, n80: 8 },
    { id: 'p112', label: 'AI code skips quality gates', n: 407, frag: 0.61, n80: 16 },
    { id: 'p0', label: 'MCP server burden', n: 685, frag: 0.55, n80: 6 },
    { id: 'p111', label: 'Agent memory', n: 790, frag: 0.47, n80: 12 },
  ],
  scatteredId: 'p95', convergedId: 'p111',
};

// F20 — software's afterlife. computed.json → problem.postdeploy + self_eval.
// The self-eval row is the union of three problem clusters (p40+p43+p44=195).
export const AFTERLIFE = {
  rows: [['Automated penetration testing', 254, ['p84']],
         ['Incident triage & root-cause', 75, ['p83']],
         ['Production LLM-app observability', 65, ['p90']],
         ['Agents querying prod telemetry', 55, ['p82']],
         ['AI-answer-engine SEO', 28, ['p65']],
         ['Evaluating the agents themselves', 195, ['p40', 'p43', 'p44']]],
  postdeployIds: ['p84', 'p83', 'p90', 'p82', 'p65'],
  total: 477, selfEval: 195,
};

// F19a — the named agents. computed.json → mentions; set keys land in
// data/sets.json (build.py mirrors the queries.py regexes).
export const AGENTS = {
  mentions: [['Claude Code', 3694, 'mentions_claude_code'],
             ['Codex', 2085, 'mentions_codex'],
             ['Gemini', 1115, 'mentions_gemini'],
             ['Cursor', 992, 'mentions_cursor'],
             ['Copilot', 499, 'mentions_copilot']],
  claudePct: 18.1,
};

// F19b — the vendor economy. computed.json → problem.vendor_econ.
export const GRAVITY = {
  vendor: [['Claude Code locked to Anthropic backends', 257, 'p117'],
           ['Multi-provider LLM usage is unmanageable', 196, 'p42'],
           ['AI coding quotas are fragmented & opaque', 89, 'p32'],
           ['Coding-agent CLIs lock users to one vendor', 84, 'p93']],
  vendorEconTotal: 626, lockCluster: 257,
};

// F22/F15 — mortality. computed.json → liveness_by_created_year, dormancy_by_group_*.
// 2026 cohort EXCLUDED from the chart (operator ruling): months old,
// statistically unable to have gone dormant yet — the caption says so.
export const MORTALITY = {
  years: [2021, 2022, 2023, 2024, 2025],
  dormPct: [30.5, 25.7, 43.3, 35.7, 26.2],
  regionsHigh: [['Model substrate', 26.1], ['Eval & benchmarks', 23.7], ['MCP ecosystem', 17.7]],
  regionsLow: [['Session tooling', 1.2], ['Observability', 1.7], ['Skills & context eng.', 2.6]],
};

// F23 — the mortality crossover (same-age class split + composition).
// computed.json → mortality_decomposition.
export const CROSSOVER = {
  human2025: 20.0, ai2025: 26.5, humanN: 2449, aiN: 1794,
  counterfactual: 21.3, actual: 26.2,
  slop2025: 68.8,   // dormant/archived share of slop created in 2025
};

// F24 — drive-by repos: entire observed life ≤ 7 days. computed.json →
// drive_by. Judged cohorts = created before 2025-10 (≥9 months of runway);
// the 2026 number is provisional by construction and stays in prose.
export const DRIVEBY = {
  years: [2021, 2022, 2023, 2024, 2025],
  pct: [1.8, 1.8, 5.0, 7.1, 15.7],
  humanPct: 5.58, aiPct: 14.67, slopPct: 55.43,
  deadMedian2021: 782, deadMedian2024: 132, deadMedian2025: 7,
  born2026: 4024, born2026ActivePct: 76.4,
};

// F30 — the redundancy census. computed-emb.json → near_dup / one_of_a_kind
// (regenerate: .venv/bin/python paper/queries_emb.py — needs the local
// embedding matrices). regions = [pct, groupId, groupN]; labels resolve at
// runtime from the payload's group table. Island claims at T=0.95 only —
// the sensitivity row ships with the chart (memo §I rule).
export const NEARDUP = {
  n: 549, pct: 2.92, medianStars: 122, restMedianStars: 21,
  crossOwnerPct: 98.04, islands: 52,
  soloN: 323, soloPct: 1.72, soloMedianStars: 12,
  regions: [[10.14, 'G23', 276], [8.87, 'G10', 417], [7.63, 'G07', 131],
            [7.14, 'G14', 546], [6.1, 'G25', 164],
            [0.69, 'G17', 291], [0.33, 'G02', 301], [0.0, 'G22', 138]],
  sensitivity: [['0.93', 12.91], ['0.94', 6.9], ['0.95', 2.92], ['0.96', 0.97]],
};

// §H — methodology. computed.json → extras, totals + cards-verification.md.
export const METHOD = {
  runs: 7, singleSourcePct: 75.2, snapshot: '2026-07-01',
  slopAgreementPct: 85, authorshipExactPct: 67, starInflationNotes: 39,
};
