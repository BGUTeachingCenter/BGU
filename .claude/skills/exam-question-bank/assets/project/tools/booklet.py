#!/usr/bin/env python3
"""Build booklet.pdf: every quiz, then every exam, in original question order, then all solutions.

Needs Playwright with Chromium (pip install playwright && python3 -m playwright install chromium)
and tools/node_modules (for the local MathJax copy).
"""
import base64, datetime, html, json, os, re, sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(ROOT, "booklet.pdf")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import load_course, logo_data_uri  # noqa: E402

COURSE = load_course()
TITLE = COURSE["bookletTitle"]
LETTERS = "אבגדהוזחטי"
MOED_RANK = {"בוחן": 1, "א": 2, "ב": 3, "ג": 4, "מיוחד": 5, "מבחן לדוגמה": 0}


def exam_label(ex):
    parts = [ex["year"], f"סמסטר {ex['semester']}׳"]
    m = ex["moed"]
    parts.append({"בוחן": "בוחן", "מיוחד": "מועד מיוחד", "מבחן לדוגמה": "מבחן לדוגמה"}.get(m, f"מועד {m}׳"))
    return " · ".join(parts)


def num_key(n):
    return [int(x) if x.isdigit() else x for x in re.split(r"(\d+)", n)]


def load():
    exams, by_exam = {}, {}
    qdir = os.path.join(DATA, "questions")
    for f in sorted(os.listdir(qdir)):
        if f.endswith(".json"):
            ex = json.load(open(os.path.join(qdir, f), encoding="utf-8"))
            exams[ex["examId"]] = ex
            by_exam[ex["examId"]] = []
    # Each exam lists its own questions plus merged duplicates that also appeared in it (alsoIn).
    for ex in exams.values():
        for q in ex["questions"]:
            by_exam[ex["examId"]].append((q["number"], q.get("points"), q))
            for ref in q.get("alsoIn", []):
                by_exam[ref["examId"]].append((ref["number"], ref.get("points"), q))
    for items in by_exam.values():
        items.sort(key=lambda t: num_key(t[0]))
    rank = lambda e: e["yearNum"] * 100 + (50 if e["semester"] == "ב" else 0) + MOED_RANK.get(e["moed"], 0)
    order = sorted(exams.values(), key=rank, reverse=True)
    return order, by_exam


def image_tag(q):
    if not q.get("image"):
        return ""
    with open(os.path.join(DATA, "img", q["image"]), "rb") as fh:
        src = "data:image/png;base64," + base64.b64encode(fh.read()).decode()
    return f'<img src="{src}" alt="">'


def question_html(number, points, q):
    pts = f" ({points} נק׳)" if points else ""
    out = [f'<section class="q"><h3>שאלה {html.escape(number)}{pts}</h3><div class="text">{q["text"]}</div>', image_tag(q)]
    if q["type"] == "mc":
        out.append('<ol class="options">' + "".join(
            f'<li><span class="letter">{LETTERS[i]}.</span><span>{o}</span></li>' for i, o in enumerate(q["options"])) + "</ol>")
    out.append("</section>")
    return "".join(out)


def solution_html(number, q):
    s = q.get("solution")
    out = [f'<section class="q sol"><h3>שאלה {html.escape(number)}']
    if s:
        cls, txt = (("official", "פתרון רשמי") if s["official"] else ("official", "נבדק על ידי צוות הקורס")
                    if s.get("reviewed") else ("unofficial", "פתרון שלא נבדק על ידי צוות הקורס"))
        out.append(f' <span class="badge {cls}">{txt}</span>')
    out.append("</h3>")
    if not s:
        out.append('<p class="none">אין פתרון לשאלה זו.</p></section>')
        return "".join(out)
    if q["type"] == "mc" and isinstance(q.get("correct"), int):
        out.append(f'<p class="correct">התשובה הנכונה: {LETTERS[q["correct"]]}.</p>')
    out.append('<div class="steps">' + "".join(f"<p>{st}</p>" for st in s["steps"]) + "</div>")
    if s.get("answer"):
        out.append(f'<div class="answer"><b>תשובה:</b> {s["answer"]}</div>')
    out.append("</section>")
    return "".join(out)


HEAD = """<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>%s</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=swap">
<style>
body { font-family: "Assistant", Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1b2433; margin: 0; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 10mm; }
.cover img { width: 95mm; }
.cover h1 { font-size: 30pt; margin: 0; line-height: 1.2; }
.cover .sub { font-size: 15pt; color: #2348a8; font-weight: 700; }
.cover .meta { font-size: 11pt; color: #5b6678; }
.page { break-before: page; }
h2.part { font-size: 22pt; color: #2348a8; border-bottom: 3px solid #2348a8; padding-bottom: 2mm; margin: 0 0 6mm; }
h2.exam { font-size: 15pt; margin: 0 0 4mm; padding-bottom: 1.5mm; border-bottom: 1px solid #d9dfe8; }
.exam-block + .exam-block { margin-top: 9mm; }
.mk { font-size: 1px; color: #fff; }
.q { break-inside: avoid; margin: 0 0 5mm; }
.q h3 { font-size: 11.5pt; margin: 0 0 1mm; }
.q .text p { margin: 0 0 0.4em; }
.q img { max-width: 120mm; display: block; margin: 2mm 0; }
.options { list-style: none; padding: 0; margin: 1mm 0 0; display: grid; gap: 0.5mm; }
.options li { display: flex; gap: 2mm; }
.letter { font-weight: 700; min-width: 5mm; }
.badge { font-size: 8.5pt; font-weight: 700; padding: 0.3mm 2mm; border-radius: 3mm; margin-inline-start: 2mm; }
.official { background: #eef6f0; color: #1e6b3a; }
.unofficial { background: #fbf3e2; color: #8a5a00; }
.steps p { margin: 0 0 1.2mm; }
.correct { font-weight: 700; margin: 0 0 1mm; }
.answer { background: #eef6f0; color: #1e6b3a; padding: 1.5mm 3mm; border-radius: 1.5mm; }
.none { color: #5b6678; margin: 0; }
.intro p { margin: 0 0 2mm; }
h3.toc-head { font-size: 13pt; margin: 5mm 0 1mm; }
table.toc { width: 100%%; border-collapse: collapse; font-size: 10.5pt; }
table.toc th { text-align: start; font-size: 9pt; color: #5b6678; font-weight: 600; border-bottom: 1px solid #d9dfe8; }
table.toc td { padding: 0.6mm 0; border-bottom: 1px dotted #d9dfe8; }
table.toc .n { width: 22mm; text-align: center; font-variant-numeric: tabular-nums; }
mjx-container { direction: ltr; }
mjx-container[display="true"] { margin: 1.5mm 0 !important; }
</style>
<script>
window.MathJax = { tex: { inlineMath: [["\\\\(", "\\\\)"]], displayMath: [["\\\\[", "\\\\]"]] },
  chtml: { matchFontHeight: false }, startup: { pageReady() { return MathJax.startup.defaultPageReady().then(() => { window.__typeset = true; }); } } };
</script>
<script src="%s"></script>
</head><body>""" % (TITLE, "file://" + os.path.join(ROOT, "tools", "node_modules", "mathjax-full", "es5", "tex-chtml-full.js"))


def front_html(quizzes, tests, n_q, pages):
    """Cover and table of contents. pages maps "x:<examId>"/"s:<examId>" to page numbers (None: placeholders)."""
    logo = logo_data_uri(COURSE)
    esc = html.escape
    mark = (f'<img src="{logo}" alt="{esc(COURSE["institution"])}">' if logo
            else f'<div class="sub">{esc(COURSE["institution"])}</div>')
    unit = f'<div class="sub">{esc(COURSE["unit"])}</div>' if COURSE["unit"] else ""
    today = datetime.date.today().strftime("%d.%m.%Y")
    pg = lambda key: pages[key] if pages else 999

    def toc(exs):
        rows = "".join(f"<tr><td>{exam_label(e)}</td><td class='n'>{pg('x:' + e['examId'])}</td>"
                       f"<td class='n'>{pg('s:' + e['examId'])}</td></tr>" for e in exs)
        return f"<table class='toc'><tr><th>בחינה</th><th class='n'>שאלות</th><th class='n'>פתרונות</th></tr>{rows}</table>"

    return HEAD + f"""
<div class="cover">
  {mark}
  {unit}
  <h1>{esc(TITLE)}</h1>
  <div class="sub">{esc(COURSE["courseName"])} · {esc(COURSE["courseNumber"])}</div>
  <div class="meta">{len(quizzes)} בחנים · {len(tests)} מבחנים · {n_q} שאלות<br>עודכן ב־{today}</div>
</div>
<div class="page intro">
  <h2 class="part">תוכן העניינים</h2>
  <p>החוברת מחולקת לשלושה חלקים: בחנים (עמ׳ {pg('part:q')}), מבחנים (עמ׳ {pg('part:e')}) ופתרונות (עמ׳ {pg('part:s')}). בכל חלק הבחינות מסודרות מהחדשה לישנה, והשאלות בכל בחינה מופיעות לפי הסדר המקורי שלהן.</p>
  <p>שאלות שבהן נדרש רק לנסח הגדרה או משפט הושמטו, ולכן במספור של חלק מהבחינות יש פערים.</p>
  <p>„פתרון רשמי” נלקח מקובצי הפתרון של צוות הקורס. „פתרון שלא נבדק על ידי צוות הקורס” נכתב בנפרד ועשוי להכיל טעויות.</p>
  <h3 class="toc-head">בחנים</h3>{toc(quizzes)}
  <h3 class="toc-head">מבחנים</h3>{toc(tests)}
</div></body></html>"""


def part_html(title, exs, by_exam, render, prefix):
    """A chunk of one part (title only on the first chunk). Each exam heading carries an invisible marker
    used to find its page in the PDF."""
    out = [HEAD, f'<h2 class="part">{title}</h2>' if title else ""]
    for i, e in enumerate(exs):
        # Questions: each exam starts on its own page. Solutions run on continuously within a chunk.
        brk = " page" if prefix == "x" and i else ""
        out.append(f'<div class="exam-block{brk}"><h2 class="exam">{exam_label(e)}'
                   f'<span class="mk">@@{prefix}:{e["examId"]}@@</span></h2>')
        out.extend(render(n, p, q) for n, p, q in by_exam[e["examId"]])
        out.append("</div>")
    out.append("</body></html>")
    return "".join(out)


# Chromium fails to print large documents (printToPDF "Printing failed"), so the booklet is printed in
# chunks of a few exams, merged with pypdf, and given page numbers, a table of contents and bookmarks afterwards.
CHUNK = 10
def main():
    from pypdf import PdfReader, PdfWriter

    work = os.path.join(ROOT, "tools", ".booklet")
    os.makedirs(work, exist_ok=True)
    order, by_exam = load()
    quizzes = [e for e in order if e["moed"] == "בוחן"]
    tests = [e for e in order if e["moed"] != "בוחן"]
    n_q = sum(len(v) for v in by_exam.values())
    margin = {"top": "18mm", "bottom": "20mm", "left": "16mm", "right": "16mm"}

    with sync_playwright() as p:
        browser = p.chromium.launch()

        def render(name, doc, **kw):
            src, out = os.path.join(work, name + ".html"), os.path.join(work, name + ".pdf")
            open(src, "w", encoding="utf-8").write(doc)
            page = browser.new_page()
            page.goto("file://" + src)
            page.wait_for_function("window.__typeset === true", timeout=300000)
            page.evaluate("document.fonts.ready.then(() => true)")
            page.pdf(path=out, format="A4", print_background=True, margin=margin, **kw)
            page.close()
            return PdfReader(out)

        def render_part(name, title, exs, fn, prefix):
            return [render(f"{name}{i // CHUNK}", part_html(title if i == 0 else None, exs[i:i + CHUNK], by_exam, fn, prefix))
                    for i in range(0, len(exs), CHUNK)]

        parts = [render_part("quizzes", "חלק א׳: בחנים", quizzes, question_html, "x"),
                 render_part("exams", "חלק ב׳: מבחנים", tests, question_html, "x"),
                 render_part("solutions", "חלק ג׳: פתרונות", quizzes + tests, lambda n, pts, q: solution_html(n, q), "s")]
        n_front = len(render("front", front_html(quizzes, tests, n_q, None)).pages)

        # Locate every exam heading by its marker; page numbers are 1-based in the final booklet.
        pages, offset = {}, n_front
        for key, chunks in zip(("part:q", "part:e", "part:s"), parts):
            pages[key] = offset + 1
            for i, pg in enumerate(pg for c in chunks for pg in c.pages):
                for m in re.findall(r"@@([xs]:[\w-]+)@@", (pg.extract_text() or "").replace(" ", "")):
                    pages.setdefault(m, offset + i + 1)
            offset += sum(len(c.pages) for c in chunks)
        missing = [f"{k}:{e['examId']}" for e in order for k in "xs" if f"{k}:{e['examId']}" not in pages]
        if missing:
            raise SystemExit(f"exam markers not found in PDF: {missing}")
        front = render("front", front_html(quizzes, tests, n_q, pages))
        if len(front.pages) != n_front:
            raise SystemExit("table of contents changed length after filling in page numbers")

        total = offset
        footer = ('<div dir="rtl" style="font-family: Arial; font-size: 8pt; color: #5b6678; width: 100%; text-align: center;">'
                  f'{TITLE} · עמוד <span class="pageNumber"></span> מתוך <span class="totalPages"></span></div>')
        numbers = render("numbers", "<!doctype html><body>" + '<div style="height: 1cm; break-after: page"></div>' * total +
                         "<script>window.__typeset = true</script></body>",
                         display_header_footer=True, header_template="<span></span>", footer_template=footer)
        browser.close()

    w = PdfWriter()
    for r in [front] + [c for chunks in parts for c in chunks]:
        for pg in r.pages:
            w.add_page(pg)
    if len(numbers.pages) < total:
        raise SystemExit("page-number overlay is shorter than the booklet")
    for i in range(1, total):  # no number on the cover
        w.pages[i].merge_page(numbers.pages[i])
        w.pages[i].compress_content_streams()  # merge_page leaves the combined content uncompressed
    # Bookmarks: one per part, one per exam under it.
    for title, key, exs, k in (("בחנים", "part:q", quizzes, "x"), ("מבחנים", "part:e", tests, "x"),
                               ("פתרונות", "part:s", quizzes + tests, "s")):
        parent = w.add_outline_item(title, pages[key] - 1)
        for e in exs:
            w.add_outline_item(exam_label(e), pages[f"{k}:{e['examId']}"] - 1, parent=parent)
    w.compress_identical_objects(remove_duplicates=True, remove_unreferenced=True)
    w.add_metadata({"/Title": TITLE, "/Subject": f'{COURSE["courseName"]} {COURSE["courseNumber"]}, {COURSE["orgLine"]}'})
    w.page_mode = "/UseOutlines"
    with open(OUT, "wb") as fh:
        w.write(fh)
    print(f"booklet.pdf: {total} pages, {os.path.getsize(OUT) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
