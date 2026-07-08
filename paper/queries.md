# queries.md — every published number → the query that produced it

Regenerate everything: `python3 paper/queries.py` (from repo root; stdlib only,
deterministic, reads `corpus.jsonl` + `cards.jsonl` + `clusters.jsonl` +
`groups.json` + `data/cluster-p2/labels-*.json`, writes `paper/computed.json`).
Section keys below are top-level keys in `computed.json`; the matching code
block in `queries.py` carries the same comment header.

| Finding / figure | computed.json key | Query (plain words) |
|---|---|---|
| F1 authorship flip by cohort | `effort_by_created_year` | join cards×corpus on id; per `created[:4]` year, cleaned-ai ÷ (cleaned-ai + human-built), plus slop share of whole cohort |
| F2 effort × star band (+ chart) | `effort_by_star_band` | bands 0–1 / 2–9 / 10–49 / 50–199 / 200–999 / 1k–9.9k / 10k+ on corpus `stars`; per-band effort_class shares |
| F3 territory age (+ histogram chart) | `created_histogram`, `extras.created_last_12mo*` | count by created year; count `created ≥ 2025-07-01` (12mo before the 2026-07-01 snapshot) |
| F4 star concentration | `stars` | median; % `<10`; top-1%-of-repos star share; count ≥10k |
| F4 repo-share vs star-share (+ paired chart) | `stars.by_band` | same star bands as F2; per band: repo count, % of repos, % of total stars |
| F5 licenses | `license` | corpus `license` counter; permissive set = MIT/Apache-2.0/BSD*/ISC/0BSD/CC0/Unlicense/Zlib/MPL-2.0 (licenses live in the appendix-level data only — the license story step was cut) |
| F6 slop census + genres (+ genre chart) | `slop.n`, `slop.n_clusters`, `slop.genres_top15`, `slop.noise` | slop = `effort_class=slop`; genre = `cluster_id` (s\*) in clusters.jsonl; labels from `labels-slop.json`; genre *families* are editorial groupings of the 63 labels (listed in memo F6) |
| F7 slop age/stars/liveness | `slop.*` | created ≥2025 share; stars ≤1 share; median stars; liveness counter |
| F8 deceptive bump | `effort_by_star_band[].slop_pct` | slop% per star band; bump = 50–199 vs 10–49 |
| F8 flag texture | `flags.patterns_*` | regex over `card.flag` (patterns in `PAT` dict in queries.py: lure/deceptive/secrets/rebrand/malware/star/dupe); counts split slop vs non-slop |
| F9 triage-not-truth | — (not recomputable) | blind spot-check, `archive/enrich/reports/cards-verification.md` (85% boundary agreement, one-directional; ~40% of sampled slop = real code) |
| F10 star inflation | `slop.ge10k_ids`, `extras.slop_ge10k_notes`, `flags.corpus_notes_star_inflation` | slop rows with stars ≥10,000: star counts published, names and per-repo notes redacted at emit time (naming ruling, memo §G); count corpus `notes` containing "star-inflation" |
| F11 *(withdrawn 2026-07-05 — see `docs/map/noise-rescue.md`)* | `noise_bin` | query kept for provenance: rows with `cl_group == "unclustered"`: n, % of non-slop, ≥10k count, core+adjacent share, top-10 by stars. The finding built on it was withdrawn (famous residents were founder-scatter, not generalists) |
| F12 MCP economy (+ quarter chart) | `mcp` | posture=mcp-server rows: count, share of non-slop, created-by-quarter, median stars, dormant%; G09 size; p0 size |
| F12/F19 mention gravity | `mentions` | case-insensitive regex over card `capability`+`problem`+`slop_note` per repo (claude.code, \bmcp\b, copilot, cursor, codex, …) |
| F13 harness explosion | `groups.G01`, `language.g01_mix`, `micro.c141/c2/c109` | G01 stats; language counter within G01; micro-cluster sizes |
| F14 emergent categories | `micro.c154/c61/c36/c80`, `groups.G04/G07/G22` | per-cluster n, ≥10k, median created, top repos |
| F15 stack ages in layers (+ chart) | `groups.*.median_created`, `groups.*.dormant_arch_pct`, `dormancy_by_group_top/bottom` | per-group median `created`; dormant+archived share (groups with n≥100) |
| F16 verticals | `groups.G20` | G20 stats (n, median stars, cleaned-ai share) |
| F17 top problems (+ chart) | `problem.top20`, `problem.noise_pct` | non-slop rows per `problem_cluster_id`; labels from `labels-problem.json` |
| F18 cross-lens fragmentation | `xlens` | per problem cluster: distribution over capability `cluster_id` (noise excluded); frag = 1 − top-partner share; n80 = partners covering 80%; mirrored for capability→problem |
| F19 vendor economics | `problem.vendor_econ` (sum 626), `mentions.claude_code` | sizes of p117+p93+p32+p42; mention counts |
| F20 post-deploy zone | `problem.postdeploy` (total 477), `problem.self_eval` (195) | sizes of p84+p83+p90+p82+p65; p40+p43+p44 |
| F21 language shift (+ chart) | `language.share_by_created_year`, `language.top12` | per cohort year, share of repos-with-language per tracked language |
| F22 mortality (+ chart) | `liveness_by_created_year` | per cohort, dormant+archived share; 2026 excluded from the chart — the dormancy measure requires months of inactivity, which a repo created this year cannot yet have |
| Methodology: provenance | `extras.single_source_provenance_pct` | repos whose provenance set has exactly 1 distinct entry → **75.2%** (supersedes the brief's ~84%) |
| Methodology: totals | `totals` | full counters: effort, confidence, fetch_status, posture, layer, liveness |
| Hero numbers (20,393 / 25 groups / 178+120+63 clusters) | `totals.corpus`, `groups`, `problem.n_clusters`, `slop.n_clusters` | structural counts recomputed from clusters.jsonl |

## Second-pass rows — memo §I (F23–F32), added 2026-07-05

Same harness (`paper/queries.py` → `computed.json`) except F30, which needs
the local gitignored embeddings: `.venv/bin/python paper/queries_emb.py` →
`paper/computed-emb.json` (numpy; deterministic, seeded baseline; sha256 of
the input matrices in `data/embeddings/embed-meta.json`).

| Finding / figure | computed key | Query (plain words) |
|---|---|---|
| F23 mortality crossover + decomposition | `mortality_decomposition` | per created-year × effort_class: n, dormant+archived %; counterfactual = 2022's class mix × 2025's per-class rates vs actual 2025 |
| F24 drive-by repos | `drive_by` | life = last_commit − created; ≤7-day share by class (cohorts created before 2025-10 only) and by cohort; median life of dormant+archived by cohort (right-censored — labeled); 2026 drive-bys still tagged active |
| F25 license-by-authorship | `license_by_effort` | license="none" rate per effort_class, overall + within 2024/2025/2026 cohorts |
| F26 within-cohort prestige gaps | `within_cohort_gaps` | median stars_per_month per class within 2025/2026 cohorts; established+mature+flagship share per class, 2025 cohort |
| F27 vendor orientation by cohort | `vendor_by_cohort` | word-boundary regex over card capability+problem+notable_approach per repo, non-slop, cohorts pre-2023→2026 (2026 folds in snapshot-day rows) |
| F28 problem-cluster ages | `problem_age` | per problem cluster (n≥30): share created ≥2026-01-01 + median created, vs 59.5% baseline |
| F29 gap/layer drift | `gap_layer_drift` | card gap[] and layer shares per creation cohort (pre-2023, then yearly), non-slop |
| F30 redundancy census | `computed-emb.json` (all keys) | chunked pairwise cosine on capability embeddings; T=0.95 calibrated vs seeded random-pair baseline (p99.99=0.914); union-find islands at T only (chaining below it); class/group rates; one-of-a-kind tail < baseline p90; problem-lens repeat |
| F31 owners & factories | `owners` | owner = corpus owner lowercased; tier stats (median stars, zero-star %); ex-top-20 robustness; burst = ≥5 repos in a 30-day window (largest per owner), mix incl/excl the two mega-accounts (derived as the top-2 slop owners, not named); purity + slop-plus-500★ owners among ≥3-repo owners |
| F32 name gravity + idea commons | `naming`, `idea_commons` | substring/regex over corpus `name`; regex families over notable_approach text (repo counts), coverage share, cohort shares for the three tracked families |
| F10 companion: explicit star-suspicion flags | `flags.star_suspect_examples` | card flag text questioning the star count (broadened regex); count only — the per-repo list is redacted at emit time |

Story-step map states (filters/highlight sets) are declarative configs in the
site source; each references one of the keys above for its on-screen numbers.
Charts are rendered from `computed.json` — no number is typed by hand into
site copy. Final QA re-runs `queries.py` and diffs `computed.json` against the
numbers baked into the build.
