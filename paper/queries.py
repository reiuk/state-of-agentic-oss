#!/usr/bin/env python3
"""Recompute every number used in the publication (findings memo, story steps,
charts). Run from the repo root:  python paper/queries.py
Writes paper/computed.json and prints a readable digest.

Sources: corpus.jsonl (frozen metadata), cards.jsonl (code-grounded cards),
clusters.jsonl (Phase-2 map), groups.json, data/cluster-p2/labels-*.json.
No mutation of any data artifact. Deterministic — no randomness, no dates
taken from the wall clock (reference date is the corpus star-snapshot,
2026-07-01).

Section keys below match the claim→query mapping in paper/queries.md.
"""
import json
import re
import statistics
from collections import Counter, defaultdict
from datetime import date

REF = "2026-07-01"  # corpus star/metadata snapshot date

def load_jsonl(path):
    out = {}
    with open(path) as f:
        for line in f:  # note: iterate \n-split lines only (corpus contains U+2028)
            line = line.strip()
            if line:
                d = json.loads(line)
                out[d["id"]] = d
    return out

corpus = load_jsonl("corpus.jsonl")
cards = load_jsonl("cards.jsonl")
clusters = load_jsonl("clusters.jsonl")
groups_json = json.load(open("groups.json"))
lab_cap = json.load(open("data/cluster-p2/labels-capability.json"))
lab_prob = json.load(open("data/cluster-p2/labels-problem.json"))
lab_slop = json.load(open("data/cluster-p2/labels-slop.json"))

ids = list(corpus)
assert set(ids) == set(cards) == set(clusters)
R = {i: {**corpus[i], **{("card_" + k): v for k, v in cards[i].items()},
         **{("cl_" + k): v for k, v in clusters[i].items()}} for i in ids}
rows = list(R.values())
nonslop = [r for r in rows if r["card_effort_class"] != "slop"]
slop = [r for r in rows if r["card_effort_class"] == "slop"]

OUT = {}

def pct(a, b):
    return round(100.0 * a / b, 1) if b else None

# ---------------------------------------------------------------- 1. totals
OUT["totals"] = {
    "corpus": len(rows),
    "effort": dict(Counter(r["card_effort_class"] for r in rows)),
    "slop_pct": pct(len(slop), len(rows)),
    "nonslop": len(nonslop),
    "confidence": dict(Counter(r["card_confidence"] for r in rows)),
    "fetch_status": dict(Counter(r["card_fetch_status"] for r in rows)),
    "posture": dict(Counter(r.get("card_posture") for r in nonslop)),
    "layer": dict(Counter(r.get("card_layer") for r in nonslop)),
    "liveness": dict(Counter(r["liveness"] for r in rows)),
}

# ---------------------------------------------------------------- 2. star bands x effort
BANDS = [(0, 1, "0–1"), (2, 9, "2–9"), (10, 49, "10–49"), (50, 199, "50–199"),
         (200, 999, "200–999"), (1000, 9999, "1k–9.9k"), (10000, 10**9, "10k+")]
def band(s):
    for lo, hi, name in BANDS:
        if lo <= s <= hi:
            return name
eff_band = defaultdict(Counter)
for r in rows:
    eff_band[band(r["stars"])][r["card_effort_class"]] += 1
OUT["effort_by_star_band"] = [
    {"band": name, "n": sum(eff_band[name].values()),
     "slop_pct": pct(eff_band[name]["slop"], sum(eff_band[name].values())),
     "human_pct": pct(eff_band[name]["human-built"], sum(eff_band[name].values())),
     "cleaned_pct": pct(eff_band[name]["cleaned-ai"], sum(eff_band[name].values()))}
    for _, _, name in BANDS]

# ---------------------------------------------------------------- 3. effort x created-year
def year(r):
    c = r.get("created") or ""
    return c[:4] if c else None
yr_eff = defaultdict(Counter)
for r in rows:
    y = year(r)
    if y:
        yr_eff[y][r["card_effort_class"]] += 1
OUT["effort_by_created_year"] = {
    y: {"n": sum(c.values()), "slop_pct": pct(c["slop"], sum(c.values())),
        "cleaned_ai_pct_of_nonslop": pct(c["cleaned-ai"], c["cleaned-ai"] + c["human-built"])}
    for y, c in sorted(yr_eff.items()) if sum(c.values()) >= 20}

# ---------------------------------------------------------------- 4. slop anatomy
# Naming ruling (memo section G): slop repos/owners are reported as patterns with
# counts, never as handles. Redaction happens HERE, at emit time, so a regenerated
# computed.json can never re-leak what a hand-edit once removed.
slop_genres = Counter(r["cl_cluster_id"] for r in slop)
slop_ids = {r["id"] for r in slop}
slop_ge10k = sorted([(r["id"], r["stars"]) for r in slop if r["stars"] >= 10000],
                    key=lambda t: -t[1])
slop_owner_counts = Counter(r["owner"].lower() for r in slop).most_common(8)
OUT["slop"] = {
    "n": len(slop),
    "n_clusters": len([c for c in slop_genres if c != "noise"]),
    "noise": slop_genres.get("noise", 0),
    "genres_top15": [
        {"id": c, "n": n, "label": lab_slop[c]["label"]}
        for c, n in slop_genres.most_common(16) if c != "noise"][:15],
    "liveness": dict(Counter(r["liveness"] for r in slop)),
    "stars_ge50": sum(1 for r in slop if r["stars"] >= 50),
    "stars_ge1k": sum(1 for r in slop if r["stars"] >= 1000),
    "ge10k_ids": "[redacted — the %d >=10k-star slop-gated repos, star counts %s; per the"
                 " naming ruling (memo section G) individual repos are not named in"
                 " editorial artifacts]"
                 % (len(slop_ge10k), "/".join(str(s) for _, s in slop_ge10k)),
    "median_stars": statistics.median(r["stars"] for r in slop),
    "zero_or_one_star_pct": pct(sum(1 for r in slop if r["stars"] <= 1), len(slop)),
    "top_owners": "[redacted — the %d most-prolific slop-owner handles, repo counts %s;"
                  " per the naming ruling (memo section G) owners are not named in"
                  " editorial artifacts]"
                  % (len(slop_owner_counts), "/".join(str(n) for _, n in slop_owner_counts)),
    "created_2025_plus_pct": pct(sum(1 for r in slop if (year(r) or "0") >= "2025"), len(slop)),
}
# flag patterns over slop + everywhere (regex documented in queries.md)
PAT = {
    "lure_download_zip": r"lure|download|zip|installer",
    "deceptive_overclaim": r"decept|grandiose|oversell|overclaim|fabricat|fake|vaporware",
    "secrets_committed": r"secret|credential|api.?key|hardcod.*key|leak",
    "rebrand_fork": r"rebrand|repackag|rebadge|fork of|lifted|vendored copy",
    "malware_scam": r"malware|scam|phish|backdoor|c2\b",
    "star_suspect": r"star.{0,12}(inflat|farm|suspicious)|inflat.{0,8}star",
    "dupe": r"\bdupe|duplicate",
}
def flag_counts(rs):
    out = {}
    for k, p in PAT.items():
        rx = re.compile(p, re.I)
        out[k] = sum(1 for r in rs if r.get("card_flag") and rx.search(r["card_flag"]))
    return out
OUT["flags"] = {
    "total_set": sum(1 for r in rows if r.get("card_flag")),
    "patterns_all": flag_counts(rows),
    "patterns_slop": flag_counts(slop),
    "patterns_nonslop": flag_counts(nonslop),
    "corpus_notes_star_inflation": sum(1 for r in rows if "star-inflation" in (r.get("notes") or "")),
}

# ---------------------------------------------------------------- 5. groups (recomputed)
grp = defaultdict(list)
for r in rows:
    grp[r["cl_group"]].append(r)
def group_stats(g):
    rs = grp[g]
    stars = [r["stars"] for r in rs]
    created = sorted(r["created"] for r in rs if r.get("created"))
    nons = [r for r in rs if r["card_effort_class"] != "slop"]
    return {
        "n": len(rs),
        "median_stars": statistics.median(stars),
        "ge10k": sum(1 for s in stars if s >= 10000),
        "active_pct": pct(sum(1 for r in rs if r["liveness"] == "active"), len(rs)),
        "dormant_arch_pct": pct(sum(1 for r in rs if r["liveness"] in ("dormant", "archived")), len(rs)),
        "cleaned_ai_pct_of_nonslop": pct(sum(1 for r in nons if r["card_effort_class"] == "cleaned-ai"), len(nons)) if nons else None,
        "median_created": created[len(created)//2] if created else None,
    }
glabels = {g["id"]: g["label"] for g in groups_json}
OUT["groups"] = {g: {"label": glabels.get(g, g), **group_stats(g)}
                 for g in sorted(grp, key=lambda g: -len(grp[g]))}

# noise bin
noise_rows = grp.get("unclustered", [])
OUT["noise_bin"] = {
    "n": len(noise_rows),
    "pct_of_nonslop": pct(sum(1 for r in noise_rows if r["card_effort_class"] != "slop"), len(nonslop)),
    "ge10k": sum(1 for r in noise_rows if r["stars"] >= 10000),
    "core_adjacent_pct": pct(sum(1 for r in noise_rows if r["relevance"] in ("core", "adjacent")), len(noise_rows)),
    "top_by_stars": sorted([(r["id"], r["stars"]) for r in noise_rows], key=lambda t: -t[1])[:10],
}

# ---------------------------------------------------------------- 6. micro-clusters of note
micro = defaultdict(list)
for r in rows:
    micro[r["cl_cluster_id"]].append(r)
NOTABLE = ["c154", "c36", "c61", "c80", "c141", "c2", "c103", "c42", "c166", "c155",
           "c90", "c109", "c119", "c172", "c41", "c46", "c84", "c165"]
OUT["micro"] = {}
for c in NOTABLE:
    rs = micro.get(c, [])
    if not rs:
        continue
    OUT["micro"][c] = {
        "label": lab_cap.get(c, {}).get("label"),
        "n": len(rs),
        "ge10k": sum(1 for r in rs if r["stars"] >= 10000),
        "median_stars": statistics.median(r["stars"] for r in rs),
        "median_created": sorted(r["created"] for r in rs if r.get("created"))[len(rs)//2],
        "top": sorted([(r["id"], r["stars"]) for r in rs], key=lambda t: -t[1])[:3],
    }

# ---------------------------------------------------------------- 7. problem lens
prob = defaultdict(list)
for r in nonslop:
    pc = r.get("cl_problem_cluster_id")
    if pc:
        prob[pc].append(r)
psizes = sorted(((p, len(rs)) for p, rs in prob.items() if p != "noise"),
                key=lambda t: -t[1])
OUT["problem"] = {
    "n_clusters": len(psizes),
    "noise": len(prob.get("noise", [])),
    "noise_pct": pct(len(prob.get("noise", [])), len(nonslop)),
    "top20": [{"id": p, "n": n, "label": lab_prob[p]["label"]} for p, n in psizes[:20]],
    "postdeploy": {p: {"n": len(prob.get(p, [])), "label": lab_prob[p]["label"]}
                   for p in ["p84", "p83", "p90", "p82", "p65"]},
    "postdeploy_total": sum(len(prob.get(p, [])) for p in ["p84", "p83", "p90", "p82", "p65"]),
    "self_eval": {p: {"n": len(prob.get(p, [])), "label": lab_prob[p]["label"]}
                  for p in ["p40", "p43", "p44"]},
    "vendor_econ": {p: {"n": len(prob.get(p, [])), "label": lab_prob[p]["label"]}
                    for p in ["p117", "p93", "p32", "p42"]},
}

# ---------------------------------------------------------------- 8. cross-lens fragmentation
def frag(members, key):
    """members: rows; key: field giving the partner cluster. Excl. noise partners."""
    c = Counter(r[key] for r in members if r[key] and r[key] != "noise")
    total = sum(c.values())
    if not total:
        return None
    top = c.most_common()
    fragv = round(1 - top[0][1] / total, 2)
    cum, n80 = 0, 0
    for _, n in top:
        cum += n; n80 += 1
        if cum >= 0.8 * total:
            break
    return {"n": len(members), "frag": fragv, "n80": n80,
            "top_partner": top[0][0], "top_share": pct(top[0][1], total)}
OUT["xlens"] = {"problem_side": {}, "capability_side": {}}
for p in ["p95", "p87", "p104", "p111", "p0", "p112", "p115", "p101"]:
    if p in prob:
        f = frag(prob[p], "cl_cluster_id")
        f["label"] = lab_prob[p]["label"]
        OUT["xlens"]["problem_side"][p] = f
for c in ["c141", "c2", "c105", "c139", "c109"]:
    if c in micro:
        f = frag(micro[c], "cl_problem_cluster_id")
        f["label"] = lab_cap[c]["label"]
        OUT["xlens"]["capability_side"][c] = f

# ---------------------------------------------------------------- 9. language dynamics
lang_all = Counter((r.get("language") or "none") for r in rows)
OUT["language"] = {"top12": lang_all.most_common(12)}
years = ["2021", "2022", "2023", "2024", "2025", "2026"]
TRACK = ["Python", "TypeScript", "JavaScript", "Go", "Rust", "Java", "C++", "HTML"]
by_year = {}
for y in years:
    rs = [r for r in rows if year(r) == y and r.get("language")]
    n = len(rs)
    c = Counter(r["language"] for r in rs)
    by_year[y] = {"n_with_lang": n, **{L: pct(c[L], n) for L in TRACK}}
OUT["language"]["share_by_created_year"] = by_year
# language mix inside the harness group G01
g01 = grp.get("G01", [])
OUT["language"]["g01_mix"] = Counter((r.get("language") or "none") for r in g01).most_common(8)

# ---------------------------------------------------------------- 10. liveness / mortality
live_year = {}
for y in years:
    rs = [r for r in rows if year(r) == y]
    if len(rs) < 20:
        continue
    live_year[y] = {
        "n": len(rs),
        "active_pct": pct(sum(1 for r in rs if r["liveness"] == "active"), len(rs)),
        "dormant_arch_pct": pct(sum(1 for r in rs if r["liveness"] in ("dormant", "archived")), len(rs)),
    }
OUT["liveness_by_created_year"] = live_year
dormant_groups = sorted(
    ((g, OUT["groups"][g]["dormant_arch_pct"], OUT["groups"][g]["n"]) for g in OUT["groups"]
     if g not in ("unclustered",) and OUT["groups"][g]["n"] >= 100),
    key=lambda t: -t[1])
OUT["dormancy_by_group_top"] = dormant_groups[:6]
OUT["dormancy_by_group_bottom"] = dormant_groups[-6:]

# ---------------------------------------------------------------- 11. MCP economy
mcp_rows = [r for r in nonslop if r.get("card_posture") == "mcp-server"]
def quarter(r):
    c = r.get("created") or ""
    return (c[:4] + "Q" + str((int(c[5:7]) - 1) // 3 + 1)) if len(c) >= 7 else None
q_mcp = Counter(quarter(r) for r in mcp_rows if quarter(r))
OUT["mcp"] = {
    "posture_mcp_server": len(mcp_rows),
    "share_of_nonslop_pct": pct(len(mcp_rows), len(nonslop)),
    "g09_n": len(grp.get("G09", [])),
    "p0_n": len(prob.get("p0", [])),
    "created_by_quarter": dict(sorted((q, n) for q, n in q_mcp.items() if q >= "2024Q1")),
    "median_stars": statistics.median(r["stars"] for r in mcp_rows),
}

# ---------------------------------------------------------------- 12. ecosystem gravity (text mentions)
def mentions(needles):
    rx = re.compile("|".join(needles), re.I)
    n = 0
    for r in rows:
        text = " ".join([r.get("card_capability") or "", r.get("card_problem") or "",
                         r.get("card_slop_note") or ""])
        if rx.search(text):
            n += 1
    return n
OUT["mentions"] = {
    "claude_code": mentions([r"claude.code"]),
    "claude_any": mentions([r"\bclaude\b"]),
    "mcp": mentions([r"\bmcp\b", r"model context protocol"]),
    "copilot": mentions([r"copilot"]),
    "cursor": mentions([r"\bcursor\b"]),
    "codex": mentions([r"\bcodex\b"]),
    "gemini": mentions([r"\bgemini\b"]),
    "openclaw": mentions([r"openclaw"]),
    "langchain_langgraph": mentions([r"langchain", r"langgraph"]),
    "deepseek": mentions([r"deepseek"]),
    "qwen": mentions([r"\bqwen\b"]),
}

# ---------------------------------------------------------------- 13. stars concentration & licenses
stars_sorted = sorted((r["stars"] for r in rows), reverse=True)
tot = sum(stars_sorted)
top1 = sum(stars_sorted[:len(rows)//100])
OUT["stars"] = {
    "total": tot,
    "median": statistics.median(stars_sorted),
    "lt10_pct": pct(sum(1 for s in stars_sorted if s < 10), len(rows)),
    "top1pct_share_pct": pct(top1, tot),
    "ge10k_count": sum(1 for s in stars_sorted if s >= 10000),
}
star_band = defaultdict(list)
for r in rows:
    star_band[band(r["stars"])].append(r["stars"])
OUT["stars"]["by_band"] = [
    {"band": name, "n": len(star_band[name]),
     "n_pct": pct(len(star_band[name]), len(rows)),
     "stars_pct": pct(sum(star_band[name]), tot)}
    for _, _, name in BANDS]
PERMISSIVE = {"MIT", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause", "ISC", "0BSD",
              "CC0-1.0", "Unlicense", "Zlib", "MPL-2.0"}
lic = Counter(r["license"] for r in rows)
OUT["license"] = {
    "none": lic["none"], "none_pct": pct(lic["none"], len(rows)),
    "permissive_pct": pct(sum(n for l, n in lic.items() if l in PERMISSIVE), len(rows)),
    "top6": lic.most_common(6),
}

# ---------------------------------------------------------------- 14. created-year histogram (gather-shaped!)
OUT["created_histogram"] = {y: n for y, n in sorted(Counter(
    year(r) for r in rows if year(r)).items()) if y >= "2015"}

# ---------------------------------------------------------------- 15. effort by posture & AI-share extremes
post_eff = defaultdict(Counter)
for r in nonslop:
    post_eff[r["card_posture"]][r["card_effort_class"]] += 1
OUT["cleaned_ai_by_posture"] = {
    p: pct(c["cleaned-ai"], sum(c.values())) for p, c in post_eff.items()}

# ---------------------------------------------------------------- 16. extras
last12 = sum(1 for r in rows if (r.get("created") or "") >= "2025-07-01")
prov_single = sum(1 for r in rows if len(set(r["provenance"])) == 1)
OUT["extras"] = {
    "single_source_provenance_pct": pct(prov_single, len(rows)),
    "created_last_12mo": last12,
    "created_last_12mo_pct": pct(last12, len(rows)),
    "created_since_2024_pct": pct(sum(1 for r in rows if (year(r) or "0") >= "2024"), len(rows)),
    "mcp_posture_dormant_arch_pct": pct(
        sum(1 for r in mcp_rows if r["liveness"] in ("dormant", "archived")), len(mcp_rows)),
    "top10_stars_overall": [
        ["[slop-gated repo — name redacted per the naming ruling (memo section G)]"
         if rid in slop_ids else rid, s]
        for rid, s in sorted(((r["id"], r["stars"]) for r in rows),
                             key=lambda t: -t[1])[:10]],
    "slop_ge10k_notes": "[redacted — per-repo triage notes for the %d >=10k-star"
                        " slop-gated repos; per-repo judgment text is not published"
                        " (memo section G)]" % len(slop_ge10k),
}

# ================================================================ second-pass
# Sections 17+ added 2026-07-05 for findings F23–F32 (memo section I).
# The embedding-dependent redundancy census (F30) lives in paper/queries_emb.py
# (needs the local, gitignored data/embeddings/*.npy) → paper/computed-emb.json.

def d_or_a(r):
    return r["liveness"] in ("dormant", "archived")

def dparse(s):
    return date(int(s[:4]), int(s[5:7]), int(s[8:10]))

def life_days(r):
    return (dparse(r["last_commit"]) - dparse(r["created"])).days

CLASSES = ["human-built", "cleaned-ai", "slop"]

# ---------------------------------------------------------------- 17. mortality decomposition (F23)
mort = {}
for y in ["2021", "2022", "2023", "2024", "2025"]:
    rs = [r for r in rows if year(r) == y]
    mort[y] = {}
    for cl in CLASSES:
        cs = [r for r in rs if r["card_effort_class"] == cl]
        if cs:
            mort[y][cl] = {"n": len(cs),
                           "dormant_arch_pct": pct(sum(map(d_or_a, cs)), len(cs))}
mix22 = {cl: mort["2022"][cl]["n"] / sum(v["n"] for v in mort["2022"].values())
         for cl in mort["2022"]}
cf25 = sum(mix22.get(cl, 0) * (mort["2025"].get(cl, {}).get("dormant_arch_pct") or 0)
           for cl in set(mix22) | set(mort["2025"]))
OUT["mortality_decomposition"] = {
    "per_cohort_class": mort,
    "mix_2022_pct": {k: round(100 * v, 1) for k, v in mix22.items()},
    "counterfactual_2025_at_2022_mix_pct": round(cf25, 1),
    "actual_2025_pct": OUT["liveness_by_created_year"]["2025"]["dormant_arch_pct"],
}

# ---------------------------------------------------------------- 18. drive-by repos (F24)
JUDGED_BEFORE = "2025-10-01"  # >= 9 months of runway before the snapshot
judged = [r for r in rows if (r.get("created") or "9999") < JUDGED_BEFORE]
db26 = [r for r in rows if (r.get("created") or "") >= "2026-01-01" and life_days(r) <= 7]
dead = defaultdict(list)
for r in rows:
    if d_or_a(r) and r.get("created"):
        dead[year(r)].append(life_days(r))
OUT["drive_by"] = {
    "definition": "entire observed life (last_commit - created) <= 7 days; "
                  "judged cohorts = created before " + JUDGED_BEFORE,
    "by_class": {cl: {"n": len(cs),
                      "drive_by_pct": round(100 * sum(1 for r in cs if life_days(r) <= 7) / len(cs), 2)}
                 for cl in CLASSES
                 for cs in [[r for r in judged if r["card_effort_class"] == cl]]},
    "by_cohort_pct": {y: pct(sum(1 for r in judged if year(r) == y and life_days(r) <= 7),
                             sum(1 for r in judged if year(r) == y))
                      for y in ["2021", "2022", "2023", "2024", "2025"]},
    "dead_median_life_days_by_cohort": {y: statistics.median(v)
                                        for y, v in sorted(dead.items()) if len(v) >= 20},
    "created_2026_drive_by": {"n": len(db26),
                              "still_tagged_active_pct": pct(
                                  sum(1 for r in db26 if r["liveness"] == "active"), len(db26))},
}

# ---------------------------------------------------------------- 19. license by authorship (F25)
def none_rate(rs):
    return pct(sum(1 for r in rs if r["license"] == "none"), len(rs))
OUT["license_by_effort"] = {
    "overall": {cl: none_rate([r for r in rows if r["card_effort_class"] == cl]) for cl in CLASSES},
    "within_cohort": {y: {cl: none_rate([r for r in rows if year(r) == y and r["card_effort_class"] == cl])
                          for cl in ["human-built", "cleaned-ai"]}
                      for y in ["2024", "2025", "2026"]},
    "none_rate_by_year": {y: none_rate([r for r in rows if year(r) == y])
                          for y in ["2021", "2022", "2023", "2024", "2025", "2026"]},
}

# ---------------------------------------------------------------- 20. within-cohort prestige gaps (F26)
OUT["within_cohort_gaps"] = {
    "stars_per_month_median": {y: {cl: statistics.median(
        r["stars_per_month"] for r in rows if year(r) == y and r["card_effort_class"] == cl)
        for cl in ["human-built", "cleaned-ai"]} for y in ["2025", "2026"]},
    "made_it_pct_2025": {cl: pct(
        sum(1 for r in rows if year(r) == "2025" and r["card_effort_class"] == cl
            and r["maturity"] in ("established", "mature", "flagship")),
        sum(1 for r in rows if year(r) == "2025" and r["card_effort_class"] == cl))
        for cl in ["human-built", "cleaned-ai"]},
}

# ---------------------------------------------------------------- 21. vendor orientation by cohort (F27)
def half_cohort(r):
    c = r.get("created") or ""
    if not c:
        return None
    y, m = int(c[:4]), int(c[5:7])
    if y < 2023:
        return "pre-2023"
    if y >= 2026:
        return "2026"  # includes the handful of snapshot-day (2026-07-01) rows
    return f"{y}H1" if m <= 6 else f"{y}H2"
COHORTS = ["pre-2023", "2023H1", "2023H2", "2024H1", "2024H2", "2025H1", "2025H2", "2026"]
VENDOR_PAT = {
    "claude_anthropic": r"\b(claude|anthropic)\b",
    "codex": r"\bcodex\b",
    "cursor": r"\bcursor\b",
    "copilot": r"\bcopilot\b",
    "gemini_google": r"\b(gemini|google)\b",
    "llama_ollama": r"\b(llama|ollama)\b",
    "cn_models": r"\b(deepseek|qwen)\b",
    "langchain": r"\blangchain\b",
}
VENDOR_RE = {k: re.compile(v, re.I) for k, v in VENDOR_PAT.items()}
ANY4 = re.compile(r"\b(claude|anthropic|codex|cursor|copilot)\b", re.I)
vco = {co: Counter() for co in COHORTS}
for r in nonslop:
    co = half_cohort(r)
    if not co:
        continue
    blob = " ".join([r.get("card_capability") or "", r.get("card_problem") or "",
                     " ".join(r.get("card_notable_approach") or [])])
    vco[co]["n"] += 1
    for k, rx in VENDOR_RE.items():
        if rx.search(blob):
            vco[co][k] += 1
    if ANY4.search(blob):
        vco[co]["any_of_4"] += 1
OUT["vendor_by_cohort"] = {
    co: {"n": c["n"], **{k: pct(c[k], c["n"]) for k in list(VENDOR_PAT) + ["any_of_4"]}}
    for co, c in vco.items() if c["n"]}

# ---------------------------------------------------------------- 22. problem-cluster ages (F28)
base_2026 = pct(sum(1 for r in nonslop if (r.get("created") or "") >= "2026-01-01"), len(nonslop))
page = {}
for p, rs in prob.items():
    if p == "noise" or len(rs) < 30:
        continue
    created = sorted(r["created"] for r in rs if r.get("created"))
    page[p] = {"label": lab_prob[p]["label"], "n": len(rs),
               "pct_2026": pct(sum(1 for c in created if c >= "2026-01-01"), len(created)),
               "median_created": created[len(created) // 2]}
ranked_new = sorted(page.items(), key=lambda kv: -kv[1]["pct_2026"])
OUT["problem_age"] = {
    "baseline_pct_2026": base_2026,
    "highlights": {p: page[p] for p in ["p111", "p115", "p58", "p112", "p0", "p45"] if p in page},
    "newest10_n_ge30": dict(ranked_new[:10]),
    "oldest10_n_ge30": dict(ranked_new[-10:]),
}

# ---------------------------------------------------------------- 23. gap/layer drift (F29)
def year_cohort(r):
    y = year(r)
    return None if not y else ("pre-2023" if y < "2023" else y)
gl = defaultdict(Counter)
for r in nonslop:
    co = year_cohort(r)
    if not co:
        continue
    gl[co]["n"] += 1
    for g in r.get("card_gap") or []:
        gl[co]["gap_" + g] += 1
    gl[co]["layer_" + (r.get("card_layer") or "?")] += 1
GAPS = ["none", "kernel", "orchestration", "composition", "deploy", "qa-fixloop", "architecture", "assets"]
LAYERS = ["platform", "tools-ai-wields", "underlying-ai", "deploy"]
OUT["gap_layer_drift"] = {
    co: {"n": c["n"],
         "gap_pct": {g: pct(c["gap_" + g], c["n"]) for g in GAPS},
         "layer_pct": {l: pct(c["layer_" + l], c["n"]) for l in LAYERS}}
    for co, c in sorted(gl.items())}

# ---------------------------------------------------------------- 24. owners & factories (F31)
owners_map = defaultdict(list)
for r in rows:
    owners_map[r["owner"].lower()].append(r)
def tier_name(n):
    return "1" if n == 1 else "2-4" if n < 5 else "5-9" if n < 10 else "10+"
tiers = defaultdict(list)
for o, rs in owners_map.items():
    tiers[tier_name(len(rs))].append((o, rs))
def tier_stats(pairs):
    rs = [r for _, rr in pairs for r in rr]
    stars = [r["stars"] for r in rs]
    return {"owners": len(pairs), "repos": len(rs),
            "median_stars": statistics.median(stars),
            "zero_star_pct": pct(sum(1 for s in stars if s == 0), len(stars)),
            "active_pct": pct(sum(1 for r in rs if r["liveness"] == "active"), len(rs))}
top20_owners = {o for o, _ in sorted(owners_map.items(), key=lambda kv: -len(kv[1]))[:20]}
# the two most-prolific slop accounts (memo F6/G2) — derived from the data, never
# named in code or output, per the naming ruling (memo section G)
KNOWN_MEGA = {o for o, _ in slop_owner_counts[:2]}
def burst_ids(rs, window=30, min_burst=5):
    """Largest window of <=`window` days holding >=`min_burst` creations; its member repos."""
    dated = sorted((dparse(r["created"]), r["id"]) for r in rs if r.get("created"))
    best = None
    for i in range(len(dated)):
        j = i
        while j + 1 < len(dated) and (dated[j + 1][0] - dated[i][0]).days <= window:
            j += 1
        if j - i + 1 >= min_burst and (best is None or j - i > best[1] - best[0]):
            best = (i, j)
    return [rid for _, rid in dated[best[0]:best[1] + 1]] if best else []
factory = {o: burst_ids(rs) for o, rs in owners_map.items() if len(rs) >= 5}
factory = {o: b for o, b in factory.items() if b}
def factory_stats(owner_filter):
    ids_ = [i for o, b in factory.items() if owner_filter(o) for i in b]
    c = Counter(R[i]["card_effort_class"] for i in ids_)
    return {"owners": sum(1 for o in factory if owner_filter(o)), "repos": len(ids_),
            "mix_pct": {cl: pct(c[cl], len(ids_)) for cl in CLASSES},
            "median_stars": statistics.median(R[i]["stars"] for i in ids_),
            "zero_star_pct": pct(sum(1 for i in ids_ if R[i]["stars"] == 0), len(ids_))}
purity = Counter()
jekyll = 0
for o, rs in owners_map.items():
    if len(rs) < 3:
        continue
    cls = {r["card_effort_class"] for r in rs}
    purity["mixed" if len(cls) > 1 else "pure-" + next(iter(cls))] += 1
    if any(r["card_effort_class"] == "slop" for r in rs) and \
       any(r["card_effort_class"] != "slop" and r["stars"] >= 500 for r in rs):
        jekyll += 1
ge3_total = sum(purity.values())
OUT["owners"] = {
    "n_owners": len(owners_map),
    "single_repo_owner_pct": pct(len(tiers["1"]), len(owners_map)),
    "single_repo_share_of_corpus_pct": pct(len(tiers["1"]), len(rows)),
    "thresholds": {f"ge{k}": {"owners": sum(1 for _, rs in owners_map.items() if len(rs) >= k),
                              "repos": sum(len(rs) for _, rs in owners_map.items() if len(rs) >= k)}
                   for k in [2, 3, 5, 10, 20]},
    "tiers": {t: tier_stats(tiers[t]) for t in ["1", "2-4", "5-9", "10+"]},
    "tiers_ex_top20_median_stars": {
        t: statistics.median(r["stars"] for o, rr in tiers[t] if o not in top20_owners for r in rr)
        for t in ["5-9", "10+"]},
    "factory": {"definition": ">=5 repos created inside a 30-day window (largest such burst per owner)",
                "all": factory_stats(lambda o: True),
                "ex_known_mega": factory_stats(lambda o: o not in KNOWN_MEGA)},
    "purity_ge3_pct": {k: pct(v, ge3_total) for k, v in purity.items()},
    "slop_plus_500star_owners": jekyll,
}

# ---------------------------------------------------------------- 25. name gravity (F32)
NAME_PAT = {
    "claude": r"claude", "claude_code": r"claude[-_.]?code|claudecode",
    "codex": r"codex", "copilot": r"copilot", "cursor": r"cursor",
    "gemini": r"gemini", "deepseek": r"deepseek", "qwen": r"qwen", "mcp": r"(^|[^a-z])mcp",
}
OUT["naming"] = {}
for k, p in NAME_PAT.items():
    rx = re.compile(p)
    hits = [r for r in rows if rx.search(r["name"].lower())]
    OUT["naming"][k] = {"repos": len(hits), "pct_corpus": pct(len(hits), len(rows)),
                        "owners": len({r["owner"].lower() for r in hits}),
                        "slop_pct": pct(sum(1 for r in hits if r["card_effort_class"] == "slop"), len(hits))}

# ---------------------------------------------------------------- 26. idea commons (F32)
IDEA_FAMILIES = {
    "mcp-tool-surface": r"mcp (?:server|tool|client)",
    "sandbox/isolation-tech": r"sandbox|firecracker|gvisor|\bwasm\b|bubblewrap|seccomp|cgroup|container(?:ized)?",
    "deterministic/replay": r"deterministic|replay",
    "checkpoint/snapshot/resume": r"checkpoint|snapshot|pause.?resume|resumable|resume(?:d|s)? (?:session|task|run)",
    "vector/embedding": r"vector|embedding",
    "worktree": r"worktree",
    "multi-cli-adapter/normalization": r"adapter layer|behind one interface|unified behind|normali[sz]ing|"
                                       r"agent client protocol|\bacp\b|multiple (?:coding-)?agent clis|"
                                       r"different (?:coding-)?agent clis",
    "self-heal/retry": r"self-heal|retry|self-correct|auto-repair|auto-fix",
    "diff/patch-based": r"\bdiff\b|patch-based|unified diff",
    "tree-sitter/AST": r"tree-sitter|\bast\b|abstract syntax tree",
    "knowledge-graph": r"knowledge graph|knowledge base",
    "state-machine": r"state machine|state-machine",
    "event-sourcing": r"event-sourc|event log|append-only log",
    "human-in-the-loop/approval": r"human-in-the-loop|approval gate|human approval|approval (?:step|flow|workflow)",
    "hybrid-retrieval(bm25+RRF)": r"bm25|reciprocal rank fusion|hybrid (?:search|retrieval)",
}
idea_hits = {}
na_havers = 0
for r in nonslop:
    na = " ".join(r.get("card_notable_approach") or []).lower()
    if na:
        na_havers += 1
    for k, p in IDEA_FAMILIES.items():
        if re.search(p, na):
            idea_hits.setdefault(k, []).append(r)
def fam_entry(k):
    rs = idea_hits.get(k, [])
    top = sorted(rs, key=lambda r: -r["stars"])[:3]
    return {"n": len(rs), "median_stars": statistics.median(r["stars"] for r in rs) if rs else None,
            "top": [(r["id"], r["stars"]) for r in top]}
OUT["idea_commons"] = {
    "cards_with_idea_pct": pct(na_havers, len(nonslop)),
    "families": {k: fam_entry(k) for k in
                 sorted(IDEA_FAMILIES, key=lambda k: -len(idea_hits.get(k, [])))},
    "cohort_share_pct": {k: {co: pct(sum(1 for r in idea_hits.get(k, []) if half_cohort(r) == co),
                                     vco[co]["n"]) for co in COHORTS}
                         for k in ["multi-cli-adapter/normalization", "deterministic/replay",
                                   "vector/embedding"]},
}

# flags addendum (F10 companion): explicit star-count-suspicion flags. Count only —
# a per-repo suspicion list is derogatory-adjacent and is not published (memo section G).
rx_star = re.compile(r"stars?\b.{0,60}(inflat|artifact|suspici|sanity|farm|fake)|inflat\w*.{0,12}stars?", re.I)
star_suspects = [r for r in rows if r.get("card_flag") and rx_star.search(r["card_flag"])]
OUT["flags"]["star_suspect_examples"] = (
    "[redacted — %d repos whose own card text questions their star count; per-repo"
    " suspicion lists are not published]" % len(star_suspects))

json.dump(OUT, open("paper/computed.json", "w"), indent=1, default=str)
print(json.dumps(OUT, indent=1, default=str))
