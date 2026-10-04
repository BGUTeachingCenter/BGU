#!/usr/bin/env python3
"""Create a new question-bank project from the skill's skeleton.

Usage:
  python3 init_project.py <target-dir> --institution "..." --course-name "..." --course-number "..."
                          [--unit "..."] [--logo path/to/logo.svg] [--booklet-title "..."]

Copies assets/project into <target-dir> (never overwrites an existing file), writes data/course.json
and an empty data/taxonomy.json, and puts the logo (if given) at app/logo.<ext>.
"""
import argparse, json, os, shutil, sys

SKELETON = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "project")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("target")
    ap.add_argument("--institution", required=True)
    ap.add_argument("--course-name", required=True)
    ap.add_argument("--course-number", required=True)
    ap.add_argument("--unit", default="")
    ap.add_argument("--logo", default="")
    ap.add_argument("--booklet-title", default="חוברת מבחני ובחני עבר בקורס")
    a = ap.parse_args()

    copied, skipped = 0, []
    for dirpath, _, files in os.walk(SKELETON):
        rel = os.path.relpath(dirpath, SKELETON)
        os.makedirs(os.path.join(a.target, rel), exist_ok=True)
        for f in files:
            dst = os.path.join(a.target, rel, f)
            if os.path.exists(dst):
                skipped.append(os.path.relpath(dst, a.target))
                continue
            shutil.copy2(os.path.join(dirpath, f), dst)
            copied += 1

    logo = ""
    if a.logo:
        ext = os.path.splitext(a.logo)[1].lower()
        logo = f"app/logo{ext}"
        shutil.copy2(a.logo, os.path.join(a.target, logo))

    def write_new(rel, obj):
        path = os.path.join(a.target, rel)
        if os.path.exists(path):
            skipped.append(rel)
            return
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(obj, fh, ensure_ascii=False, indent=1)
            fh.write("\n")

    write_new("data/course.json", {
        "institution": a.institution, "unit": a.unit, "courseName": a.course_name,
        "courseNumber": a.course_number, "logo": logo, "bookletTitle": a.booklet_title})
    write_new("data/taxonomy.json", {"topics": []})
    os.makedirs(os.path.join(a.target, "exams"), exist_ok=True)

    print(f"copied {copied} files into {a.target}")
    if skipped:
        print("kept existing (not overwritten): " + ", ".join(skipped))
    print("next: put the source PDFs in exams/, then `cd tools && npm install`")


if __name__ == "__main__":
    sys.exit(main())
