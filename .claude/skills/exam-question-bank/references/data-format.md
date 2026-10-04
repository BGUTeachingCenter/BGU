# Data format

All content lives in `data/`. `tools/validate.py` enforces everything below; run it after every batch of edits.

## data/course.json

```json
{
 "institution": "אוניברסיטת בן־גוריון בנגב",
 "unit": "היחידה להוראת קורסי יסוד",
 "courseName": "חדו״א 1 להנדסה",
 "courseNumber": "214.1.9711",
 "logo": "app/logo.svg",
 "bookletTitle": "חוברת מבחני ובחני עבר בקורס"
}
```

`unit` and `logo` may be empty strings. Without a logo, the institution name is shown as text. Use the full
official course number (e.g. `214.1.9711`, not `9711`).

## data/taxonomy.json

```json
{ "topics": [ { "name": "סדרות", "subs": ["הגדרת הגבול (ε, N)", "חישוב גבולות של סדרות"] } ] }
```

Topics and subs appear in the app in this order, so list them in syllabus order. Every question's `topic`
and `sub` must match an entry exactly. Subs with no questions are hidden automatically.

## data/exams.json (catalog)

One entry per exam or quiz, built while inventorying the PDFs:

```json
{ "examId": "2021-s2-m1", "year": "תשפ״א", "yearNum": 2021, "semester": "ב", "moed": "א",
  "files": ["2021B MA.pdf", "2021B MA sol.pdf"], "catalogNote": "free text: anything odd about the files" }
```

- `examId`: `<yearNum>-s<1|2>-<m1|m2|m3|quiz|sample>`. `m1/m2/m3` follow the order of the sittings (a special
  sitting usually takes the next free `mN`). Two quizzes in one semester: `quiz` and `quiz2`. Add `-v2` etc.
  only if two genuinely different exams share a slot.
- `yearNum`: the Gregorian year in which the academic year ends (תשפ״א = 2020/21 → 2021). `year` is the
  Hebrew year with gershayim (״).
- `moed`: one of `א`, `ב`, `ג`, `מיוחד`, `בוחן` (quiz), `מבחן לדוגמה` (sample exam).

## data/questions/<examId>.json

```json
{
 "examId": "2021-s2-m1", "year": "תשפ״א", "yearNum": 2021, "semester": "ב", "moed": "א",
 "date": "2021-07-01",
 "sourceFiles": ["2021B MA.pdf"],
 "solutionSource": "official",
 "issues": ["anything the reader of the data should know about this exam"],
 "questions": [ ... ]
}
```

- `sourceFiles`: paths relative to `exams/`; validate checks that they exist when `exams/` is present.
- `solutionSource`: `official` (staff solution file for the whole exam), `partial`, or `none`.
- `version`: optional and only kept internally; the app never shows it.

### Question

```json
{
 "id": "2021-s2-m1-q2a",
 "number": "2א",
 "points": 12,
 "type": "mc",
 "text": "HTML with TeX: \\(f(x)=x^2\\) inline, \\[\\int_0^1 f\\] display",
 "options": ["\\(0\\)", "\\(1\\)", "לא קיים"],
 "correct": 1,
 "topic": "גבולות ורציפות של פונקציות",
 "sub": "חישוב גבולות של פונקציות",
 "image": "2021-s2-m1-q2a.png",
 "notes": "short note shown under the question (e.g. a typo in the original form)",
 "solution": {
  "official": true,
  "steps": ["one short line", "the next line", "..."],
  "answer": "the final answer, one line"
 },
 "alsoIn": [{ "examId": "2019-s1-m2", "number": "4", "points": 10 }]
}
```

- `id` = `<examId>-q<number in Latin form>`: `2א` → `q2a`, `1א2` → `q1a2`, `7` → `q7`.
- `number`: question number from the form, sub-parts always as Hebrew letters (`1`, `2א`, `3ב2`), even when
  the form prints (i)/(ii) or a/b.
- `type`: `mc` (multiple choice: `options` required, `correct` is a 0-based index, up to 10 options) or `open`.
- `solution.reviewed`: optional, the date (`YYYY-MM-DD`) on which course staff checked an unofficial solution;
  the app and booklet then label it "נבדק על ידי צוות הקורס" instead of "פתרון שלא נבדק על ידי צוות הקורס".
- `hint`: optional; shown by a "קבלת רמז" button before the solution. One or two sentences pointing to the
  idea (tool, auxiliary function, case split, what to examine) — never specific points, values or the answer.
  Only where the question has a real trick or a non-obvious first step.
  For prove-or-disprove and yes/no questions the hint must not reveal which way the answer goes.
- `notes`: shown to students before the solution opens — never put anything there that hints at the answer.
- `points`, `image`, `notes`, `alsoIn`: optional. `solution`: an object, or `null` when there is none yet.
- Allowed HTML in text and steps: `b i br ul ol li p table tr td th sub sup span`. Nothing else.
- `alsoIn` is written by `scripts/find_duplicates.py --apply`; don't hand-edit it unless merging manually.
