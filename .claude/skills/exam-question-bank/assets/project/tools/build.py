#!/usr/bin/env python3
"""Build index.html from app/template.html, data/course.json and data/ (questions, exam catalog, taxonomy, images)."""
import base64, html, json, mimetypes, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")


def load_course():
    """Course details shared by the app and the booklet."""
    c = json.load(open(os.path.join(DATA, "course.json"), encoding="utf-8"))
    c.setdefault("unit", "")
    c.setdefault("logo", "")
    c.setdefault("bookletTitle", "חוברת מבחני ובחני עבר בקורס")
    c["orgLine"] = " · ".join(x for x in (c["institution"], c["unit"]) if x)
    return c


def logo_data_uri(course):
    if not course["logo"]:
        return ""
    path = os.path.join(ROOT, course["logo"])
    mime = mimetypes.guess_type(path)[0] or "image/png"
    with open(path, "rb") as fh:
        return f"data:{mime};base64," + base64.b64encode(fh.read()).decode()


def brand_html(course):
    esc = html.escape
    logo = logo_data_uri(course)
    mark = (f'<img src="{logo}" alt="{esc(course["institution"])}" width="240" height="60">' if logo
            else f'<div class="org">{esc(course["institution"])}</div>')
    unit = f'<div class="unit">{esc(course["unit"])}</div>' if course["unit"] else ""
    return f'<div class="brand">\n    {mark}\n    {unit}\n  </div>'


def main():
    course = load_course()
    exams, questions, images = [], [], {}
    qdir = os.path.join(DATA, "questions")
    for f in sorted(os.listdir(qdir)):
        if not f.endswith(".json"):
            continue
        ex = json.load(open(os.path.join(qdir, f), encoding="utf-8"))
        qs = ex.pop("questions")
        exams.append({k: ex.get(k) for k in ("examId", "year", "yearNum", "semester", "moed", "version", "date")})
        for q in qs:
            q["examId"] = ex["examId"]
            if q.get("image"):
                with open(os.path.join(DATA, "img", q["image"]), "rb") as fh:
                    images[q["image"]] = "data:image/png;base64," + base64.b64encode(fh.read()).decode()
            questions.append(q)

    taxonomy = json.load(open(os.path.join(DATA, "taxonomy.json"), encoding="utf-8"))
    used = {(q["topic"], q["sub"]) for q in questions}
    for t in taxonomy["topics"]:
        t["subs"] = [s for s in t["subs"] if (t["name"], s) in used]
    taxonomy["topics"] = [t for t in taxonomy["topics"] if t["subs"]]

    payload = json.dumps({
        "taxonomy": taxonomy,
        "exams": exams, "questions": questions, "images": images,
    }, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

    out = open(os.path.join(ROOT, "app", "template.html"), encoding="utf-8").read()
    for key, val in (("{{BRAND}}", brand_html(course)),
                     ("{{COURSE_NAME}}", html.escape(course["courseName"])),
                     ("{{COURSE_NUMBER}}", html.escape(course["courseNumber"])),
                     ("{{ORG_LINE}}", html.escape(course["orgLine"])),
                     ("{{BOOKLET_TITLE}}", html.escape(course["bookletTitle"]))):
        out = out.replace(key, val)
    out = out.replace("/*__DATA__*/", payload)
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(out)
    print(f"index.html: {len(exams)} exams, {len(questions)} questions, {len(images)} images, {len(out.encode())/1e6:.2f} MB")


if __name__ == "__main__":
    main()
