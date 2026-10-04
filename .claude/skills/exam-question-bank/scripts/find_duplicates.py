#!/usr/bin/env python3
"""Find questions that appear word for word in more than one exam, and optionally merge them.

Usage (from the project root):
  python3 find_duplicates.py           # report only
  python3 find_duplicates.py --apply   # merge

Two questions are identical when their text, options (in any order), topic and sub match after
whitespace is removed. Points and question numbers may differ (they belong to the exam, not the question).
Merging keeps one copy: the one with an official solution if exactly one has it, otherwise the one from
the newest exam. The others are removed and recorded on the kept copy as alsoIn [{examId, number, points}].
Before applying, check that no remaining part of a dropped question's exam refers to it ("using part a...").
"""
import collections, json, os, re, sys

QDIR = os.path.join("data", "questions")
MOED_RANK = {"בוחן": 1, "א": 2, "ב": 3, "ג": 4, "מיוחד": 5, "מבחן לדוגמה": 0}
norm = lambda s: re.sub(r"\s+", "", s or "")


def main():
    apply = "--apply" in sys.argv
    files, raw_nl = {}, {}
    for f in sorted(os.listdir(QDIR)):
        if f.endswith(".json"):
            raw = open(os.path.join(QDIR, f), encoding="utf-8").read()
            files[f[:-5]] = json.loads(raw)
            raw_nl[f[:-5]] = raw.endswith("\n")
    rank = lambda e: e["yearNum"] * 100 + (50 if e["semester"] == "ב" else 0) + MOED_RANK.get(e["moed"], 0)
    groups = collections.defaultdict(list)
    for ex in files.values():
        for q in ex["questions"]:
            key = (norm(q["text"]), tuple(sorted(norm(o) for o in q.get("options") or [])), q["topic"], q["sub"])
            groups[key].append((ex, q))
    dups = [g for g in groups.values() if len(g) > 1]
    print(f"{len(dups)} groups of identical questions")
    for g in dups:
        official = [(ex, q) for ex, q in g if q.get("solution") and q["solution"].get("official")]
        keep = official[0] if len(official) == 1 else max(g, key=lambda t: rank(t[0]))
        drop = [t for t in g if t is not keep]
        print(f"  keep {keep[1]['id']}  drop {', '.join(q['id'] for _, q in drop)}")
        if not apply:
            continue
        kq = keep[1]
        for ex, q in drop:
            ref = {"examId": ex["examId"], "number": q["number"]}
            if q.get("points") is not None:
                ref["points"] = q["points"]
            kq.setdefault("alsoIn", []).append(ref)
            ex["questions"] = [x for x in ex["questions"] if x["id"] != q["id"]]
            if not ex["questions"]:
                sys.exit(f"merging would leave {ex['examId']} with no questions; stopping")
    if apply and dups:
        for eid, ex in files.items():
            with open(os.path.join(QDIR, eid + ".json"), "w", encoding="utf-8") as fh:
                fh.write(json.dumps(ex, ensure_ascii=False, indent=1) + ("\n" if raw_nl[eid] else ""))
        print("merged; run tools/validate.py and tools/build.py")


if __name__ == "__main__":
    main()
