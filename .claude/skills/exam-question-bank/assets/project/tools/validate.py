#!/usr/bin/env python3
"""Validate data/questions/*.json against the schema, the taxonomy and MathJax.

Usage: python3 tools/validate.py [examId ...]   (no args = all files)
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
tax = json.load(open(os.path.join(DATA, "taxonomy.json")))
SUBS = {t["name"]: set(t["subs"]) for t in tax["topics"]}
catalog = {e["examId"]: e for e in json.load(open(os.path.join(DATA, "exams.json")))}

EXAM_KEYS = {"examId", "year", "yearNum", "semester", "moed", "version", "date", "sourceFiles",
             "solutionSource", "issues", "questions"}
Q_KEYS = {"id", "number", "points", "type", "text", "options", "correct", "topic", "sub", "solution",
          "image", "notes", "alsoIn", "hint"}
SOL_KEYS = {"official", "steps", "answer", "reviewed"}
MOEDS = {"א", "ב", "ג", "מיוחד", "בוחן", "מבחן לדוגמה"}
SOL_SOURCES = {"official", "partial", "none"}


def check_file(path, errors, texitems, seen_ids):
    def err(msg):
        errors.append(f"{os.path.basename(path)}: {msg}")
    try:
        ex = json.load(open(path, encoding="utf-8"))
    except Exception as e:
        err(f"invalid JSON: {e}")
        return
    extra = set(ex) - EXAM_KEYS
    if extra: err(f"unknown exam keys {extra}")
    for k in ("examId", "year", "yearNum", "semester", "moed", "sourceFiles", "solutionSource", "questions"):
        if k not in ex: err(f"missing exam key {k}")
    eid = ex.get("examId", "")
    base = re.sub(r"-v\d+$|-sample$", "", eid)
    if eid not in catalog and base not in catalog and not eid.endswith("-sample"):
        err(f"examId {eid} is not in data/exams.json")
    if os.path.basename(path) != f"{eid}.json": err(f"file name must be {eid}.json")
    if ex.get("moed") not in MOEDS: err(f"moed must be one of {MOEDS}")
    if ex.get("semester") not in ("א", "ב"): err("semester must be א or ב")
    if ex.get("solutionSource") not in SOL_SOURCES: err(f"solutionSource must be one of {SOL_SOURCES}")
    for f in ex.get("sourceFiles", []):
        if os.path.isdir(os.path.join(ROOT, "exams")) and not os.path.exists(os.path.join(ROOT, "exams", f)): err(f"source file not found: {f}")
    qs = ex.get("questions", [])
    if not qs: err("no questions")
    for i, q in enumerate(qs):
        w = f"{eid} q[{i}] {q.get('id', '?')}"
        extra = set(q) - Q_KEYS
        if extra: errors.append(f"{w}: unknown keys {extra}")
        for k in ("id", "number", "type", "text", "topic", "sub", "solution"):
            if k not in q: errors.append(f"{w}: missing {k}")
        qid = q.get("id", "")
        if not qid.startswith(eid + "-"): errors.append(f"{w}: id must start with '{eid}-'")
        if qid in seen_ids: errors.append(f"{w}: duplicate id")
        seen_ids.add(qid)
        if q.get("topic") not in SUBS: errors.append(f"{w}: unknown topic {q.get('topic')!r}")
        elif q.get("sub") not in SUBS[q["topic"]]: errors.append(f"{w}: sub {q.get('sub')!r} not in topic {q['topic']!r}")
        if q.get("type") not in ("open", "mc"): errors.append(f"{w}: type must be open or mc")
        if q.get("type") == "mc":
            opts = q.get("options")
            if not isinstance(opts, list) or len(opts) < 2: errors.append(f"{w}: mc needs options list")
            c = q.get("correct")
            if c is not None and not (isinstance(c, int) and 0 <= c < len(opts or [])):
                errors.append(f"{w}: correct must be a 0-based index into options")
            for j, o in enumerate(opts or []): texitems.append({"where": f"{w} option {j}", "html": o})
        elif "options" in q or "correct" in q:
            errors.append(f"{w}: options/correct only for mc")
        if q.get("points") is not None and not isinstance(q["points"], (int, float)):
            errors.append(f"{w}: points must be a number")
        if q.get("image"):
            if not os.path.exists(os.path.join(DATA, "img", q["image"])): errors.append(f"{w}: image not found in data/img")
        for ref in q.get("alsoIn", []):
            if not isinstance(ref, dict) or set(ref) - {"examId", "number", "points"} or not ref.get("number"):
                errors.append(f"{w}: alsoIn entries must be {{examId, number, points?}}")
            elif not os.path.exists(os.path.join(DATA, "questions", f"{ref.get('examId')}.json")):
                errors.append(f"{w}: alsoIn examId {ref.get('examId')!r} has no questions file")
        texitems.append({"where": f"{w} text", "html": q.get("text", "")})
        if q.get("hint"): texitems.append({"where": f"{w} hint", "html": q["hint"]})
        s = q.get("solution")
        if s is not None:
            if not isinstance(s, dict): errors.append(f"{w}: solution must be object or null"); continue
            extra = set(s) - SOL_KEYS
            if extra: errors.append(f"{w}: unknown solution keys {extra}")
            if not isinstance(s.get("official"), bool): errors.append(f"{w}: solution.official must be true/false")
            if "reviewed" in s and not (isinstance(s["reviewed"], str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", s["reviewed"])):
                errors.append(f"{w}: solution.reviewed must be the review date, YYYY-MM-DD")
            if not isinstance(s.get("steps"), list) or not s["steps"]: errors.append(f"{w}: solution.steps must be a non-empty list")
            for j, st in enumerate(s.get("steps") or []): texitems.append({"where": f"{w} step {j}", "html": st})
            if s.get("answer"): texitems.append({"where": f"{w} answer", "html": s["answer"]})
        for tagcheck in [q.get("text", ""), q.get("hint", "")] + (s.get("steps", []) if isinstance(s, dict) else []):
            if re.search(r"<(?!/?(b|i|br|ul|ol|li|p|table|tr|td|th|sub|sup|span)\b)[a-z]", tagcheck or ""):
                errors.append(f"{w}: disallowed HTML tag")
                break


def main():
    qdir = os.path.join(DATA, "questions")
    ids = sys.argv[1:]
    files = [os.path.join(qdir, f"{i}.json") for i in ids] if ids else sorted(
        os.path.join(qdir, f) for f in os.listdir(qdir) if f.endswith(".json"))
    errors, texitems, seen = [], [], set()
    for f in files:
        if not os.path.exists(f): errors.append(f"missing file {f}"); continue
        check_file(f, errors, texitems, seen)
    r = subprocess.run(["node", os.path.join(ROOT, "tools", "texcheck.mjs")], input=json.dumps(texitems),
                       capture_output=True, text=True)
    errors += [l for l in r.stdout.splitlines() if l.strip()]
    if r.returncode not in (0, 1): errors.append("texcheck crashed: " + r.stderr[-500:])
    for e in errors: print("ERROR", e)
    print(f"{len(files)} file(s), {len(texitems)} text fields checked, {len(errors)} error(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
