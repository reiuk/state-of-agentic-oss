#!/usr/bin/env python3
"""Recompute the embedding-dependent numbers used in the publication (memo
finding F30, the redundancy census). Run from the repo root with the project
venv (needs numpy):  .venv/bin/python paper/queries_emb.py
Writes paper/computed-emb.json and prints a readable digest.

Split out of paper/queries.py deliberately: queries.py stays stdlib-only and
runs anywhere the three JSONL files exist, while this harness additionally
needs the LOCAL, gitignored embedding matrices (data/embeddings/*.npy,
Qwen3-Embedding-0.6B, 1024-dim, L2-normalized — see embed-meta.json for
sha256 digests). Deterministic: the random-pair baseline uses a fixed seed.

Method notes (they gate every claim downstream):
- All capability sentences were written by one model under one rubric, so
  cosine similarity has an elevated floor. The near-duplicate threshold
  T=0.95 was chosen against the random-pair baseline (it clears the observed
  p99.99 = 0.914) and eyeball-checked on sampled pairs (below ~0.94 pairs
  share a genre but differ in real scope; at >=0.95 they describe the same
  capability). The threshold-sensitivity table is emitted so any reader can
  see how claims move with T.
- Union-find components below T=0.95 chain transitively through the dense
  generic "coding-agent CLI" region (giant component: 1,406 repos at T=0.93
  vs 40 at T=0.95) — island claims are only made at T=0.95.
"""
import json
import statistics
from collections import Counter, defaultdict

import numpy as np

T = 0.95
BASELINE_N = 200_000
SEED = 0
CHUNK = 2000


def load_jsonl(path):
    out = {}
    with open(path) as f:
        for line in f:  # \n-split only (corpus contains U+2028)
            line = line.strip()
            if line:
                d = json.loads(line)
                out[d["id"]] = d
    return out


corpus = load_jsonl("corpus.jsonl")
cards = load_jsonl("cards.jsonl")
clusters = load_jsonl("clusters.jsonl")
lab_cap = json.load(open("data/cluster-p2/labels-capability.json"))

E = np.load("data/embeddings/embeddings-capability.npy")
ids = json.load(open("data/embeddings/ids-capability.json"))
n = E.shape[0]
assert n == len(ids) == sum(1 for c in cards.values() if c["effort_class"] != "slop")

OUT = {"rows": n, "T": T}


def pct(a, b):
    return round(100.0 * a / b, 2) if b else None


def pairwise_stats(M, thresholds):
    """Chunked full pairwise pass: per-row max sim, neighbor counts at T, edges at each threshold."""
    m = M.shape[0]
    mx = np.zeros(m, dtype=np.float32)
    counts_T = np.zeros(m, dtype=np.int32)
    edges = {t: [] for t in thresholds}
    for s in range(0, m, CHUNK):
        S = M[s:s + CHUNK] @ M.T
        for k in range(S.shape[0]):
            S[k, s + k] = -1.0  # mask self
        mx[s:s + CHUNK] = S.max(axis=1)
        counts_T[s:s + CHUNK] = (S >= T).sum(axis=1)
        for t in thresholds:
            r, c = np.where(S >= t)
            for rr, cc in zip(r.tolist(), c.tolist()):
                a, b = s + rr, cc
                if a < b:
                    edges[t].append((a, b))
    return mx, counts_T, edges


# ------------------------------------------------------------- baseline
rng = np.random.default_rng(SEED)
a = rng.integers(0, n, BASELINE_N)
b = rng.integers(0, n, BASELINE_N)
mask = a != b
sims = (E[a[mask]] * E[b[mask]]).sum(axis=1)
OUT["baseline_random_pairs"] = {
    "n": int(mask.sum()), "seed": SEED,
    "median": round(float(np.median(sims)), 3),
    "p90": round(float(np.percentile(sims, 90)), 3),
    "p95": round(float(np.percentile(sims, 95)), 3),
    "p99": round(float(np.percentile(sims, 99)), 3),
    "p99_9": round(float(np.percentile(sims, 99.9)), 3),
    "p99_99": round(float(np.percentile(sims, 99.99)), 3),
}
ONE_OF_A_KIND_T = float(np.percentile(sims, 90))

# ------------------------------------------------------------- capability pass
THRESHOLDS = [0.90, 0.92, 0.93, 0.94, 0.95, 0.96, 0.97]
mx, counts_T, edges_by_t = pairwise_stats(E, THRESHOLDS)

OUT["max_sim_percentiles"] = {p: round(float(np.percentile(mx, q)), 3)
                              for p, q in [("p1", 1), ("p50", 50), ("p90", 90), ("p99", 99)]}
OUT["threshold_sensitivity_pct_with_neighbor"] = {
    str(t): pct(int((mx >= t).sum()), n) for t in THRESHOLDS}

near = [ids[i] for i in range(n) if mx[i] >= T]
rest = [ids[i] for i in range(n) if mx[i] < T]
edges = edges_by_t[T]
cross_owner = sum(1 for x, y in edges
                  if corpus[ids[x]]["owner"].lower() != corpus[ids[y]]["owner"].lower())
OUT["near_dup"] = {
    "n": len(near), "pct": pct(len(near), n),
    "median_stars": statistics.median(corpus[i]["stars"] for i in near),
    "rest_median_stars": statistics.median(corpus[i]["stars"] for i in rest),
    "edges": len(edges), "cross_owner_edges": cross_owner,
    "cross_owner_pct": pct(cross_owner, len(edges)),
    "max_multiplicity": int(counts_T.max()),
}

# rates by effort class and by group (n>=100)
by_class = defaultdict(lambda: [0, 0])
by_group = defaultdict(lambda: [0, 0])
for i in range(n):
    rid = ids[i]
    cl = cards[rid]["effort_class"]
    g = clusters[rid]["group"]
    hit = int(mx[i] >= T)
    by_class[cl][0] += hit; by_class[cl][1] += 1
    by_group[g][0] += hit; by_group[g][1] += 1
OUT["near_dup_rate_by_class"] = {cl: pct(v[0], v[1]) for cl, v in by_class.items()}
grates = sorted(((pct(v[0], v[1]), g, v[1]) for g, v in by_group.items() if v[1] >= 100),
                reverse=True)
OUT["near_dup_rate_by_group_top5"] = grates[:5]
OUT["near_dup_rate_by_group_bottom5"] = grates[-5:]

# ------------------------------------------------------------- components / islands
parent = list(range(n))
def find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x
def union(x, y):
    rx, ry = find(x), find(y)
    if rx != ry:
        parent[rx] = ry

giant = {}
for t in [0.93, 0.94, 0.95, 0.96]:
    parent = list(range(n))
    for x, y in edges_by_t[t]:
        union(x, y)
    comp = Counter(find(i) for i in range(n))
    sizes = sorted((s for s in comp.values() if s > 1), reverse=True)
    giant[str(t)] = {"giant_component": sizes[0] if sizes else 0,
                     "components_gt1": len(sizes)}
OUT["giant_component_by_T"] = giant

# islands at T (parent state is from the last loop iteration t=0.96 — redo at T)
parent = list(range(n))
for x, y in edges_by_t[T]:
    union(x, y)
members = defaultdict(list)
for i in range(n):
    r = find(i)
    members[r].append(i)
islands = sorted((m for m in members.values() if len(m) >= 3), key=len, reverse=True)
def island_entry(m):
    rids = [ids[i] for i in m]
    stars = [corpus[i]["stars"] for i in rids]
    labs = Counter(lab_cap.get(clusters[i]["cluster_id"], {}).get("label", "noise")
                   for i in rids)
    top = sorted(zip(rids, stars), key=lambda t: -t[1])[:3]
    return {"size": len(m), "stars_total": sum(stars),
            "stars_median": statistics.median(stars),
            "owners": len({corpus[i]["owner"].lower() for i in rids}),
            "label_majority": labs.most_common(1)[0][0], "top": top}
OUT["islands_top12"] = [island_entry(m) for m in islands[:12]]
OUT["islands_ge3"] = {"n": len(islands),
                      "all_cross_owner": all(island_entry(m)["owners"] >= 3 for m in islands)}

# ------------------------------------------------------------- one-of-a-kind tail
solo = [ids[i] for i in range(n) if mx[i] < ONE_OF_A_KIND_T]
OUT["one_of_a_kind"] = {
    "threshold_baseline_p90": round(ONE_OF_A_KIND_T, 3),
    "n": len(solo), "pct": pct(len(solo), n),
    "median_stars": statistics.median(corpus[i]["stars"] for i in solo),
    "class_mix": dict(Counter(cards[i]["effort_class"] for i in solo)),
    "top_by_stars": sorted(((i, corpus[i]["stars"]) for i in solo), key=lambda t: -t[1])[:8],
}

# id sidecar for the site build: which repos have a true near-duplicate and
# which are one-of-a-kind (ids only — both derive from public descriptions).
# site/build.py maps these to point indices in data/sets.json.
json.dump({"T": T, "one_of_a_kind_T": round(ONE_OF_A_KIND_T, 3),
           "near_dup_ids": sorted(near), "one_of_a_kind_ids": sorted(solo)},
          open("paper/emb-sets.json", "w"), indent=0)

# ------------------------------------------------------------- problem lens
EP = np.load("data/embeddings/embeddings-problem.npy")
idsp = json.load(open("data/embeddings/ids-problem.json"))
assert idsp == ids
mxp = np.zeros(n, dtype=np.float32)
for s in range(0, n, CHUNK):
    S = EP[s:s + CHUNK] @ EP.T
    for k in range(S.shape[0]):
        S[k, s + k] = -1.0
    mxp[s:s + CHUNK] = S.max(axis=1)
OUT["problem_lens"] = {
    "near_dup_pct_at_T": pct(int((mxp >= T).sum()), n),
    "ratio_vs_capability": round(float((mxp >= T).mean() / (mx >= T).mean()), 2),
}

json.dump(OUT, open("paper/computed-emb.json", "w"), indent=1, default=str)
print(json.dumps(OUT, indent=1, default=str))
