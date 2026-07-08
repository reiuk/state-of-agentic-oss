# Findings memo — "The State of Agentic AI Open Source, July 2026"

> **Public-release note.** This memo is reproduced from the internal survey
> repository. The per-repo corpus files it references (`corpus.jsonl`,
> `cards.jsonl`, `clusters.jsonl`), the local embedding matrices, and two
> cited internal audit reports are not part of this public repository — the
> released dataset is the site payload in `data/`, and the committed
> `paper/computed.json` / `paper/computed-emb.json` are the query outputs the
> site's figures are QA-diffed against. Two redactions vs the internal text,
> both in service of §G's own rulings: the five ≥10k★ slop repos are cited by
> star count only, and one internal field name is elided.

Phase-1 deliverable, 2026-07-04. Every number here was recomputed from
`corpus.jsonl` + `cards.jsonl` + `clusters.jsonl` by `paper/queries.py`
(results snapshot: `paper/computed.json`; claim→query mapping: `paper/queries.md`).
§I (F23–F32, added 2026-07-05) additionally uses `paper/queries_emb.py` →
`computed-emb.json` for the embedding-dependent F30.
Star counts are the 2026-07-01 snapshot. Nothing below quotes a prose count
from an earlier report.

**One discrepancy vs the mission brief:** the brief says "~84% single-source
provenance"; recomputation gives **75.2%** of repos with exactly one distinct
provenance entry. The publication will state 75.2%.

Calibration facts used below (from the blind spot-check,
`archive/enrich/reports/cards-verification.md` — sample-based, not
recomputable from the corpus): slop boundary 85% agreement, errors
one-directional (over-calling slop on real code under deceptive READMEs,
~40% of sampled slop is real code); `human-built`↔`cleaned-ai` exact
agreement 67%, so those two are merged or error-barred everywhere in public
copy.

---

## A. The census: who is writing this software

### F1. The AI-authorship flip — the headline finding
Of non-slop repos **created in 2023, 5.5%** show the marks of AI-assisted
construction (`cleaned-ai`). **2024: 13.6%. 2025: 42.3%. 2026: 66.9%.**
Across the whole corpus it is a dead heat: 9,542 cleaned-ai vs 9,243
human-built. → *Why care:* this is a measured, code-grounded census of the
transition everyone hand-waves about: by 2026, two-thirds of new open-source
agentic software is visibly built *with* the agents it is built *for*.
Caveat carried in-page: the boundary is soft (~7% cross-model noise, and the
classifier keys partly on agent-config markers), so we present it as a
one-directional trend with an explicit error bar, and never split
human-built/cleaned-ai in any other cut.

### F2. Prestige still belongs to humans (or: stars lag the flip)
Human-built share climbs monotonically with stars: **24.1%** at 0–1★ →
**53.0%** at 50–199★ → **81.0%** at 10k+★. Mirror image: cleaned-ai falls
55.4% → 18.6%. → *Why care:* the software people actually depend on is still
overwhelmingly human-led; the AI-built wave is *young and unstarred*. Both
readings are honest — AI-built repos haven't had time to earn stars, and
star-earning infra is still human-made — and the page says so.
*(Within-cohort mechanism: F26.)*

### F3. The territory is one year old
**73.0%** of the 20,393 repos were created in the 12 months before the
snapshot (14,890 since 2025-07-01); **89.6%** since 2024-01-01. Created-year
histogram: 1,048 (2023) → 1,346 (2024) → 4,586 (2025) → 12,333 (2026 H1
alone). → *Why care:* the reader is not looking at an established field with
a long tail of history; they are looking at a land rush photographed
mid-sprint. (Caveat: our gather deliberately included recency sweeps, so the
histogram is partly lens — but category-defining repos barely existed
pre-2023 regardless.)

### F4. A low-star world — the famous repos are the shoreline, not the landmass
Median stars: **16**. **45.4%** of repos have fewer than 10 stars. The top 1%
(203 repos) hold **35.3%** of all 47.9M stars; 1,173 repos (5.8%) clear 10k.
→ *Why care:* every market map you've seen draws the top 1%. The remaining
~20k repos are where category formation actually happens (see F13–F15), and
nobody has mapped them before.

### F5. A quarter of the territory ships no license
**24.6%** (5,016 repos) have no detectable license; 63.7% are permissive
(MIT alone: 8,877). → *Why care:* for practitioners, a quarter of this
ecosystem is legally unusable as dependencies — an under-reported friction in
"just grab an agent tool off GitHub." *(Authorship signature: F25.)*

## B. The anatomy of slop

### F6. Slop is 7.9% of the territory and it has a taxonomy
1,608 repos gate as slop; clustered on their own stratum they form **63
genres** (+461 unclustered). The five biggest: **MCP-server vaporware (149)**,
rebranded closed-binary product shells (59), RAG tutorial coursework dumps
(51), agent-skill prompt files (36), static landing-page dumps (34).
The genres group into five families we can chart: *vaporware & grandiosity*
(orchestration-framework vaporware, "agent-OS kernel fantasies"), *coursework
& tutorial dumps*, *download-lure/scam* (zip-droppers, fake Claude-plugin
lures), *SEO & content farms* (persona prompt-pack farms, paywalled-dataset
ads), and *automation exhaust* (timestamped computer-use cache dumps —
24 repos from a single account). → *Why care:* "AI slop on GitHub" is
usually an anecdote. Here it's a measured phenomenon with genres, sizes, and
a fraud sub-taxonomy.

### F7. Slop is brand-new, starless, and still "active"
**93.3%** of slop was created 2025 or later; median stars **0**; 67.9% sit at
0–1 stars. Slop rate by creation year climbs 3.1% (2023) → 9.4% (2026) — the
slop wave rides the authorship wave. And 65.7% of slop repos are still
*active* (pushed recently): the machine keeps committing. → *Why care:* slop
isn't old abandoned junk; it's the current output of the same tools building
the real stuff.

### F8. The deceptive bump at 50–199 stars
Slop rate falls monotonically with stars — 20.6% (0–1★) → 7.1% → 2.8% →
**4.6% (50–199★)** → 1.0% → 0.9% → 0.4% — except one band. The 50–199★ bump
is the zone where deceptive presentation buys real stars. Flag texture
agrees: 232 cards carry download-lure/zip flags (102 slop, **130 non-slop**),
140 malware/scam-pattern flags, 54 committed-credential flags. → *Why care:*
a reproducible, quantified signature of README-fraud economics — and the
non-slop lure count shows deception wraps *real* code too.

### F9. Slop is triage, not truth — and the page must say so
Blind spot-check: 85% agreement on the slop boundary, and all disagreements
ran one way — the pipeline over-calls slop on real code under deceptive or
grandiose READMEs (~40% of the sampled slop stratum). Genre labels also make
clear that much slop is *sociological*, not fraudulent (coursework, study
logs, name-squats). → *Why care:* honesty requirement (hard rule), and it's
interesting in its own right: the boundary between "fake project" and "real project
presented fraudulently" is where the ecosystem's incentives show.

### F10. Star counts can be gamed at six-figure scale
Five slop-gated repos exceed 10k stars; the largest, a "self-styled AI-only
maintained coding-agent harness rebrand," holds **194,477 stars** with a stub
source file — corpus notes already flag suspected star inflation. 39 corpus
notes + 7 card flags mark suspected inflation overall. → *Why care:* stars
are the industry's default quality signal, and this is direct evidence of
its failure mode at the very top of the range. **Naming decision → operator
(see §Fairness).**

## C. The shape of the territory

### F11. *(withdrawn 2026-07-05)*
Withdrawn: the noise-rescue overlay (`docs/map/noise-rescue.md`) showed this
finding's evidence inverted. The unclustered bin's famous residents were
founder-scatter cases with homes (AutoGPT→G25, langchain→G02,
claude-code→G01, dify→G25, ollama group-rescued to G21 by the calibrated
vote); 291 of the 293 ≥10k★ noise repos were reclassified, and the genuine
generalist residual (1,615 repos) has single-digit median stars. The bin's
numbers (5,411 / 28.8% / 85.7% core+adjacent) remain true of the frozen map
but no longer support the "famous generalist core" reading. A replacement
finding (founder-scatter: the copies define the genre; the originals don't
fit it) is deferred.

### F12. The MCP economy: one in eight real repos is an MCP server
**2,364** non-slop repos have posture `mcp-server` (**12.6%**). Creation
wave: 51 (2024Q4) → 169 → 273 → 181 → 168 → 598 (2026Q1) → **828 (2026Q2)** —
about nine new servers a day last quarter, still accelerating. "MCP" appears
in 27.4% of all cards. The wave has an underbelly: MCP-server vaporware is
the #1 slop genre (149), and the MCP group carries one of the highest
dormancy rates among real groups (17.7%) — servers are abandoned nearly as
fast as they're minted (median MCP server: 9 stars). → *Why care:* a
protocol released in Nov 2024 restructured an OSS ecosystem in 18 months.

### F13. The harness explosion: 1,250 coding-agent runtimes, median 6 stars
G01 (coding-agent harnesses & runtimes) is the largest real group. Its
language mix: **Rust 524 + Go 427 = 76.1%**. Micro-clusters inside it:
"Rust agent runtimes & CLIs" (503), "Go agent runtimes & TUI frameworks"
(403), "DIY terminal coding-agent CLIs" (142). Median stars: **6**. → *Why
care:* the terminal coding agent is 2026's "everyone writes their own static
site generator" — a rite-of-passage artifact. The problem lens (F19) shows
*why* people build yet another one: vendor unlock, privacy, cost, learning —
the same artifact for opposite reasons.

### F14. Categories being born, timestamped
Six regions have no analogue in 2024-era taxonomies, and their median
creation dates cluster in **Feb–Mar 2026**: code-graph indexing & search
(281 repos, 12 ≥10k★, median created 2026-02-25), security scanners &
pentest agents (311, 12 ≥10k★), skills/spec-driven dev & context engineering
(G04: 612 repos, 85% active, **75.3% AI-built** — the most AI-built group on
the map), agent-aware VCS & worktree parallelism (G07: 131, 84% active),
agent payments/identity/discovery (G22: 138; payment-rails micro-cluster
106), self-evolving agents (evolutionary code/prompt optimizers: 27, incl.
an 89k★ flagship). → *Why care:* you can watch taxonomy form in real time —
the map catches categories at the moment they condense out of noise.

### F15. The stack is aging in layers — and dying in layers
Median creation date orders the groups into geological strata: model
substrate 2025-04 → deploy/cloud infra 2025-07 → eval & benchmarks 2025-08 →
assets/media 2025-11 → MCP ecosystem 2025-12 → harness-adjacent tooling
(session management, worktrees, skills, observability) Feb–Mar 2026.
Dormancy tracks age: model substrate 26.1% dormant/archived, eval 23.7%,
MCP 17.7% — vs session tooling 1.2%, observability 1.7%, skills 2.6%.
→ *Why care:* the frontier of new building keeps moving *up-stack toward the
agent harness*; last year's frontier (eval, model infra) is already the
graveyard layer.
*(The same drift measured from inside the code: F29.)*

### F16. The long tail is verticalizing, invisibly and AI-built
G20 (vertical & domain agents — trading, health, education, travel, legal):
610 repos, median **3 stars**, **70.8% AI-built**. → *Why care:* the
"agents for X" wave that VCs predict is already here — but it's thousands of
near-invisible, AI-generated attempts, not funded companies. Composition
insight unavailable at the top of the star range.

## D. The problem lens: what the ecosystem believes is broken

### F17. Memory is the #1 believed problem
Clustering the *problem* field independently gives 120 problem clusters. The
largest: **"agents lose all memory between sessions" (790 repos)** — bigger
than MCP-integration burden (685) and running-models-locally (644). Then:
AI coding skips specs/quality gates (407), agents rediscover codebases via
wasteful grep (324), production agent infra rebuilt per project (302),
parallel agent runs collide (288). → *Why care:* a bottom-up answer
to "what does the ecosystem think is wrong with agents?" — statelessness,
integration burden, and trust in generated code, in that order.
*(Cluster ages — the second axis on this chart: F28.)*

### F18. One problem, twenty shapes: the mechanism space is still speciating
Cross-lens fragmentation: "production agent infrastructure rebuilt per
project" (302 repos) scatters at **frag 0.85 across 16+ capability
clusters** — a Rust runtime, a k8s operator, a fleet platform, a framework;
no dominant mechanism. Same for agent-ready business SaaS (frag 0.88, 26
mechanism homes) and parallel-run isolation (frag 0.77: worktrees, tmux,
containers, fleets). Conversely, memory converges (frag 0.47, one dominant
mechanism family). → *Why care:* this is a *futures* signal — where frag is
high, the winning shape hasn't been found yet; where it's low, consolidation
has begun. Computable only because the corpus carries two independent
lenses.

### F19. The vendor-economics subeconomy: 626 repos route around model pricing
Problem clusters about paying for / routing around model access sum to 626
repos: "Claude Code locked to Anthropic backends" (**257 repos** — a problem
cluster about one product's pricing policy), coding-agent vendor lock (84),
quota fragmentation (89), multi-provider management (196). Meanwhile "Claude
Code" is named in **18.1% of all cards** (3,694) — vs Codex 2,085, Cursor
992, Copilot 499. → *Why care:* a single proprietary harness became
load-bearing infrastructure for open source, and a measurable cottage
industry exists purely to unlock, meter, and multiplex it. This is the
story's sharpest "2026 in one number." *(Trajectory: F27; the
solution-side mirror of the lock-in problem: F32.)*

### F20. Software's afterlife: the post-deploy zone
Five problem clusters — pentest automation (254), incident triage/RCA (75),
production LLM-app observability (65), agents querying prod telemetry (55),
AI-answer-engine SEO (28) — total **477 repos** building for what happens
*after* software ships. Adjacent: agent self-evaluation (benchmarks don't
reflect reality: 113 + 55 + 27 = 195). → *Why care:* the ecosystem's own
problem statements say the agent story doesn't end at deploy; operating,
securing, and evaluating the shipped thing is a first-class frontier.
(Public framing is exactly this; no internal vocabulary.)

## E. Dynamics

### F21. Rust and Go are eating the agent stack
Language share within creation cohorts: Python **50.3% (2023) → 31.3%
(2026)**; Rust **8.7% → 16.1%**; Go **8.2% → 14.7%**; TypeScript steady
~13→18%. In the harness group, Rust+Go = 76.1% (F13). → *Why care:*
single-binary distribution and performance won the harness layer; the
"Python is the language of AI" prior is now only true of the model layer.
Also a plausible AI-effect: rewriting in a systems language got cheap.

### F22. Mortality: younger cohorts should be less dormant — since 2023 they aren't
Dormant+archived by creation cohort: 2021: 30.5%, 2022: 25.7%, **2023:
43.3%**, 2024: 35.7%, 2025: 26.2% (2026 excluded: the dormancy measure
requires months of inactivity, which a repo created this year cannot yet
have). A younger repo has had less time to die, so dormancy should fall
with every cohort. Instead every cohort born since 2023 — the year AI
coding arrived — sits at or above 2022's lifetime rate; 2025 already
matches it at a quarter of the age. → *Why care:* the generated-code era's
cohorts go quiet faster than repos two years their senior; the story's
memento mori. (Chart must state the 2026 exclusion honestly.)
*(Decomposed 2026-07-05: F23 — the inversion is compositional, and human-built
2025 is actually the lowest-mortality cohort on record. See also F24.)*

## F. What surprised me (flagged as required)

1. **The 194k-star slop repo (F10).** I expected star inflation in the
   hundreds; six figures on a stub was the single most startling row.
2. **How clean the authorship-flip curve is (F1)** — 5.5 → 13.6 → 42.3 →
   66.9 is textbook logistic adoption, computed from an orthogonal signal
   (tree/CI/config forensics), not self-report.
3. **MCP dormancy (F12):** the youngest big wave already has one of the
   highest abandonment rates — mint-and-abandon is the protocol economy's
   native metabolism.
4. **A problem cluster that is literally one company's pricing policy
   (F19):** 257 repos whose stated reason to exist is "Claude Code is locked
   to Anthropic backends."
5. **Skills/context-engineering is the most AI-built region on the map
   (75.3%, F14)** — agents writing the instructions for agents.
6. **The memory problem (F17)** outweighs the MCP problem despite MCP having
   3× the press.

## G. Naming & fairness calls — RULED 2026-07-04

**Operator approved recommendations 1–6 as written** (no naming of slop
repos/owners in prose; "AI-assisted" as the public label; genre-level slop
labels per repo; methodology line on prompt corpora; neutral vendor
reporting). Also ruled: `neighbors` added to the payload whitelist; 3D cut
from the public build; licenses/verticals/post-deploy included in the story
spine.

The public payload is whitelist-only (no `flag`, no `slop_note`, no
`effort_evidence`, no gap tags, no `notes`, no other internal fields), so per-repo
derogatory *text* is already excluded at the data level. Remaining calls are
about **prose and labels**:

1. **Naming the five ≥10k★ slop repos in narrative prose** (star counts
   194,477 / 23,932 / 20,154 / 12,039 / 10,129 — names redacted here per this
   very ruling). My recommendation:
   name **none** in prose; describe the 194k case anonymously ("a coding-agent
   'rebrand' with 194k stars and a stub source file"). The repos remain
   findable on the map (their group/genre labels are data), but the editorial
   voice doesn't indict named projects. Alternative: name with hedged
   language; higher legal/fairness exposure, marginal reader value.
2. **Naming slop-heavy owners** (two accounts with 24 slop repos each — one
   a computer-use pipeline dumping timestamped cache repos, one a prolific
   vaporware-framework author). Recommendation: report the *pattern with
   counts*, not the handles.
3. **Public label for `cleaned-ai`.** Recommendation: **"AI-assisted"** in
   all public UI/prose (accurate, non-pejorative); keep the merged
   human+AI-assisted stratum as the default view per the ~7%-noise rule, with
   the split available behind an explicit "boundary is soft" note.
4. **Public label for `slop` on individual repos.** Aggregate narrative
   keeps the word "slop" (it's the honest term of art, and the stratum is a
   headline finding). Per-repo detail panel says `stratum: slop
   (automated triage — errs toward over-calling; see methodology)` and shows
   the *genre* label (e.g. "RAG tutorial coursework dumps") rather than any
   per-repo judgment text. Genre labels are cluster-level, which softens the
   defamation surface while staying honest.
5. **The jailbreak-prompts repo** (20k★, gated slop because it's a prompt
   corpus, not engineered software): worth an explicit line in methodology —
   "slop" here means *no substantive engineered artifact*, which sweeps in
   famous prompt collections; it is not an accusation of fraud. The genre
   labels distinguish scams from coursework from prompt dumps.
6. **Claude Code / Anthropic salience (F19).** The data makes one vendor
   central. Recommendation: report neutrally, with the mention-counts table
   for all vendors, and note the corpus was gathered from an
   agentic-ecosystem vantage (the lens follows the ecosystem's own gravity,
   but say so).

## H. Methodology facts the page must state (once, early, honestly)

- 20,393 repos, 7 gather runs (curated lists, searches, ecosystem sweeps,
  network hops, recency passes) through an interest-shaped lens: coding
  agents, agent infra, tools agents wield, deploy automation, model infra.
  A census of a chosen territory, not of all AI OSS. **75.2%** of repos have
  single-source provenance (recomputed; brief said ~84%).
- Classification is code-grounded: README (≤6k chars) + full tree + 1–2
  source files per repo, read and carded by a frontier model; structure
  validated 1:1; model provenance verified.
- Known error bars, stated in-page: slop boundary 85% (one-directional,
  rescues are real-code-under-deceptive-README); human↔AI-assisted split
  ~67% exact (merged by default); star counts are a 2026-07-01 snapshot with
  a minority of suspected-inflated outliers (39 flagged); map coordinates are
  UMAP projections (distortion inherent; neighbor lists computed in full
  embedding space).
- Every number regenerable: `paper/queries.py` → `paper/computed.json`.

---

## I. Second-pass findings — added 2026-07-05

A four-angle second mining pass over the same frozen data (survival ×
authorship, owner sociology, embedding redundancy, time-sliced card text);
every number below was independently recomputed before adoption. F23–F29 and
F31–F32 recompute via `paper/queries.py` (keys in `queries.md` §Second-pass);
F30 via `paper/queries_emb.py` → `computed-emb.json` (needs the local
embeddings). The effort-class caveat from the header applies throughout:
human-built↔cleaned-ai is soft (~7% noise), so authorship splits are
presented as directional with error bars, and only where the gap is far
larger than the noise.

### F23. The mortality crossover: same-age AI-built repos now die faster — and F22 is composition
Within the 2025 cohort (the first with robust n on both sides), cleaned-ai
dormant+archived = **26.5%** (n=1,794) vs human-built **20.0%** (n=2,449) —
same age, opposite fates. 2023–24 showed the reverse on tiny early-adopter
samples (n=56/176); treat those as curation artifacts. F22's cohort
inversion then decomposes into arithmetic: hold 2025 at 2022's class mix
(91.9% human-built) with 2025's own per-class rates and the cohort's overall
rate is **21.4%**, vs the actual **26.2%** — the inversion is the population
shifting toward a class that goes quiet faster, not builders getting worse.
Human-built 2025 is in fact the lowest-mortality cohort on record. → *Why
care:* F22 gets its mechanism, and it's the sharper story: the flip (F1) and
the memento mori (F22) are the same phenomenon. Caveat: soft boundary — but
the classifier's marker bias (dormant repos are less likely to carry
agent-config files) runs *against* this finding, so the true gap is if
anything larger.

### F24. Drive-by repos: one in seven AI-built repos lives ≤7 days — and the liveness field can't see it yet
Observed life = `last_commit` − `created`. Among repos with ≥9 months of
runway (created before 2025-10): total life ≤7 days for **5.6%** of
human-built, **14.7%** of cleaned-ai (2.6×), **55.4%** of slop. By cohort
the drive-by share explodes: 1.8% (2021) → 1.8 → 5.0 → 7.1 → **15.7%**
(2025). Median observed life of already-dead repos: 782 days (2021 cohort)
→ 132 (2024) → **7** (2025) — right-censored (fast deaths surface first;
the class split above is the censoring-safe statement). The kicker:
**76.4%** of 2026's 4,024 drive-by repos are still tagged *active* — a
young repo's last commit is always recent — so drive-by share is a leading
mortality indicator months ahead of `liveness`. → *Why care:* the growth
histogram (F3) contains a growing sliver of ballistic repos — published
once, never touched again — and no dashboard metric currently catches them.

### F25. No-license is an authorship signature, not an age artifact (sharpens F5)
License = "none": human-built **15.5%**, cleaned-ai **26.7%**, slop
**64.0%**. The human/AI gap is stable *within* cohorts — 2025: 15.9 vs
25.2; 2026: 17.0 vs 27.6 (≈10pp both years) — so it is not "AI repos are
just younger." (2024, small cleaned-ai n, shows parity: the signature
emerges with the wave.) → *Why care:* F5's unusable quarter concentrates in
the AI-built wave; AI-assisted workflows systematically ship without
licenses, and nothing in the tooling nudges otherwise.

### F26. The prestige gap holds within-cohort (mechanism under F2)
Equally-young repos, 2025 cohort: median stars/month human-built **13.2**
vs cleaned-ai **4.7** (2.8×); 2026 cohort 3.6 vs 2.0 (young-repo clamp
caveat). Maturity ladder, 2025 cohort: established+mature+flagship reached
by **30.0%** of human-built vs **16.1%** of cleaned-ai. Medians only —
means in these fields are outlier-dominated. → *Why care:* F2's "stars lag
the flip" is not merely youth; same-age AI-built software earns attention
at roughly a third the rate.

### F27. Vendor orientation over time: consolidation toward the two agent-CLI vendors (trajectory behind F19)
Share of non-slop cards mentioning each vendor, by creation cohort:
claude/anthropic **5.5%** (pre-2023) → 17.8 (2025H1) → 32.9 (2025H2) →
**36.1%** (2026); codex 1.8 → **16.2%**; cursor flat at 5.6–6.9% since
2025; copilot never above 3.4%; deepseek+qwen 0.5 → 5.5%. → *Why care:*
F19's static 18.1% becomes a curve: the ecosystem's discourse is
consolidating hard around two vendors' agent CLIs, GitHub's own flagship
barely registers, and the Chinese-model presence is real but ~6%. Caveat
(in-page): cards read a repo's *current* state, so old cohorts partly
reflect what they evolved into — the direction, not the old-cohort point
estimates, is the claim.

### F28. Problems have ages: the #1 problem is brand-new, the #2 is plateauing (second axis for F17)
Baseline: 59.5% of non-slop repos are 2026-born. Memory (p111, 790 repos —
F17's #1) is **78.4% 2026-born**, median created 2026-03-19: the biggest
anxiety is also essentially new. MCP-integration burden (p0, 685) is
**49.1%** — *below* baseline, median 2025-12: plateauing. Local models
(p45, 644) 50.9%, with a genuine pre-2025 tail. Two large clusters barely
existed as articulated problems before 2025: parallel-run collisions
(p115, 288, **81.6%**) and skills packaging/distribution (p58, 271,
**80.8%**). → *Why care:* F17's size ranking hides life stage; adding the
age axis turns "what does the ecosystem think is broken" into "where is
its anxiety *heading*" — and the answer is memory, parallelism, and skill
distribution, not MCP.

### F29. The ecosystem is maturing up-stack in its own code (complements F15)
Card gap-tag drift by creation cohort: `none` (generic/wrapper, no
identified gap) **69.3% (pre-2023) → 30.8% (2026)**; `kernel` 3.6 →
**29.3%**; `orchestration` 3.9 → **24.4%** — near-monotonic across all
cohorts. Layer drift agrees: `underlying-ai` (model-wrapping) 30.3 → 8.6%
while `platform` (harness-shaped) 12.4 → **50.0%**. → *Why care:* F15 told
the up-stack story from group ages; this is the same story measured from
inside the code — the cleanest maturation curve in the corpus, and it says
the field's center of gravity is now the agent kernel/orchestration layer.

### F30. The redundancy census: duplication is popular, cross-owner, and authorship-blind
At cosine ≥0.95 on the capability embeddings (threshold calibrated against
a seeded random-pair baseline whose p99.99 is 0.914, and eyeball-checked:
pairs at the threshold describe the same capability), **549 repos (2.9%)**
have a true near-duplicate — and they median **122 stars vs 21** for
everything else. **450 of 459 duplicate edges (98.0%) connect different
owners**, and all 52 islands of size ≥3 span ≥3 owners: independent
reinvention, not re-uploads. Effort-class is a clean null (2.90% vs
2.94%). The islands are nameable: 40 parallel-worktree agent-runner UIs
(255k total stars), 18 SKILL.md managers, 15 provider-swap proxies, 14
voice-cloning models, a family of leaked-system-prompt archives.
Redundancy geography: tutorials 10.1%, LLM gateways 8.9%, worktree tooling
7.6% — vs payments 0.0%, agent frameworks 0.3%, eval 0.7%. The
one-of-a-kind tail (best match anywhere below the random-pair p90) is just
**323 repos (1.7%)**; and the problem lens converges *less* than the
capability lens (1.69% vs 2.92% at the same threshold) — people converge
on what to build more than on how they phrase the need. → *Why care:*
kills two comfortable priors at once — duplicates are neither the starless
AI-junk tail nor an AI-authorship phenomenon; popularity invites
convergent rebuilding. Method caveat (hard rule for the page): below
T=0.95 single-linkage chains the dense coding-CLI genre into a 1,406-repo
pseudo-blob — island claims are made at 0.95 only, and the sensitivity
table ships with the chart.

### F31. The sociology of production: serial builders are the strongest builders; "factories" aren't slop mills; slop is a mode
16,584 owners stand behind the 20,393 repos; 89.9% have exactly one repo
in-corpus (73.1% of the corpus — a different metric from the 75.2%
single-source provenance fact, don't conflate). Median stars by owner
tier: 1 repo → **8★**; 2–4 → **58★**; 5–9 → **199★**; 10+ → **418★**,
with zero-star share falling 21.8% → ~3–4%; excluding the top-20 accounts
the upper tiers still median 199★/296★. Burst production (≥5 repos inside
30 days: 38 owners, 306 repos) looks slop-heavy (14.4%) only until the two
known mega-accounts (F6/§G-2) are removed — the remaining 36 owners' burst
output is **3.0% slop (below the 7.9% baseline)**, median 21★: mostly
legitimate release waves (SDK companions, plugin families, org launches).
And slop is a *mode*, not a population: **57.9%** of ≥3-repo owners mix
effort classes, and **18 accounts** hold both a slop-gated repo and a
≥500★ real hit (one observed mechanism: a hit repo cloned into thin
language-port repos that gate as slop). → *Why care:* the "prolific
account = spam mill" prior runs exactly backwards, and slop-fighting aimed
at *accounts* rather than *repos* would misfire. Caveats: the gather
over-discovers famous owners' portfolios, so this is a claim about the
serial owners *in this territory*, not GitHub-wide; pattern-with-counts
only, no handles in prose (§G-2).

### F32. Name gravity and the idea commons
**579 repos (2.8% of the corpus) carry "claude" in the repo name**;
claude-code alone (213) out-names codex (109), copilot (81), and cursor
(35) combined — brand gravity measured at the naming layer, matching F27's
discourse curve. On the solution side: 73.1% of non-slop cards carry ≥1
real transferable idea (`notable_approach`), and the census of those ideas
is a time-capsule of 2026 engineering fashion — MCP tool-surfaces (1,085),
sandboxing/isolation (888), **deterministic/replay (701 — the rising
fashion, 0.8% → 5.1% cohort share)**, checkpoint/resume (537),
vector/embedding (500 — flat, merely tracking corpus growth), worktrees
(384), and **multi-CLI normalization (327)** — one control plane driving
Claude Code/Codex/Gemini interchangeably (ACP et al.), the tooling-side
mirror of F19's lock-in problem, rising to ~2.2% cohort share with
above-baseline stars (median 47★). → *Why care:* determinism and
vendor-normalization are 2026's ideas the way RAG was 2024's — and the
commons' answer to vendor lock-in is already 327 repos strong. (F10
companion, quietly useful: `flags.star_suspect_examples` lists the 13
cards whose flag text explicitly questions the repo's own star count —
topped by a 223,994-star badge artifact.)
