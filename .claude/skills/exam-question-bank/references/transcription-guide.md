# Transcription and solution guide

How to turn one exam PDF into `data/questions/<examId>.json`. The goal is a bank a student can trust: the
question reads exactly as it did on the exam, and every solution is correct and honestly labeled.

## Contents
1. Reading the source
2. What becomes a question
3. Writing the text (TeX and HTML)
4. Classifying
5. Solutions
6. Notes and issues

## 1. Reading the source

- Render each page to an image and read the image. PDF text layers are often wrong for math (missing
  superscripts, scrambled fractions) and sometimes contain a different version than the one printed. When
  the text layer and the page disagree, the page wins; record the disagreement in `issues`.
- Scans (no text layer) must be read from the image anyway. Student-annotated scans: transcribe only the
  printed question, never the student's handwriting as if it were the solution.
- Several versions of one exam that differ only in the order of answers: transcribe one version (usually
  version 1) and write in `issues` that the other is identical apart from the order. Never create two
  copies, and never show a "version" label in the app.
- Identical files (same MD5, rescans of the same blank form): one transcription, note the duplicates in
  `issues`.
- Moodle/LMS exports: drop filler options such as "I don't know" or "No answer given" and say so in `notes`.
- A solution file may belong to a different version whose **question order** (not only answer order) differs
  from the form you transcribe. Match questions by content, write the mapping into `issues` ("פתרון שאלה 3 בקובץ
  הפתרון = שאלה 5 בטופס"), and double-check each multiple-choice answer letter after the mapping — this is the
  most error-prone step.

## 2. What becomes a question

- Each independent sub-part (סעיף) is its own question, numbered with Hebrew letters (`3א`, `3ב`; nested
  `3א1`). If the form labels parts differently — (i)/(ii), a/b, 1./2. — still use Hebrew letters in order
  ((i) → א, (ii) → ב) so numbering is uniform across the bank and sorts correctly, and mention the original
  labels in `issues`. That lets
  sub-parts on different topics be classified separately. If a sub-part depends on an earlier one, keep it
  separate but add a note such as "הסעיף מתבסס על סעיף א׳", or keep the parts together in one question when
  they are inseparable. When several sub-parts share a stem ("נתונה הפונקציה …"), repeat the stem in each
  sub-part's `text`: every card must make sense on its own, since sub-parts appear separately in the app.
- A sub-part left alone after its sibling was excluded keeps its original number (`5ב` with no `5א`);
  a neutral note "סעיף א׳ של השאלה אינו כלול במאגר" is fine, but don't name the excluded theorem if it
  hints at the method.
- **Leave out pure definition and theorem-statement questions** — parts whose whole task is "הגדירו…",
  "נסחו את משפט…", "רשמו את ההגדרה…", "רשמו את המשפט היסודי", or "רשמו הסבר מתמטי לאי־קיום גבול". They test
  recall, not problem solving, and the bank is meant for practicing exam problems.
- **Keep mixed questions**: "רשמו את הגדרת הרציפות ובדקו האם f רציפה", "נסחו את משפט לגרנז׳ והשתמשו בו
  להוכחת…", "הוכיחו… וצטטו את המשפטים שעליהם אתם מסתמכים". The real work there is solving.
- Questions that repeat word for word across exams are transcribed in each exam as usual; they are merged
  later by `scripts/find_duplicates.py`.

## 3. Writing the text (TeX and HTML)

- Inline math `\(…\)`, display math `\[…\]`. Never `$`. In JSON every backslash is doubled: `"\\(x^2\\)"`.
- Write `<` and `>` inside math as `\lt` and `\gt`; a bare `<` breaks the HTML.
- Hand-escaping backslashes in JSON is error-prone. Writing each exam through a small Python script with raw
  strings (`r"\(x^2\)"`) and `json.dump(..., ensure_ascii=False, indent=1)` avoids most mistakes.
- No Hebrew inside math. Put the words outside: `\(x\gt0\) לכל` — not `\(x\gt0 \text{ לכל}\)`.
- Formatting: `<b>` for emphasis that was bold on the form ("<b>אין להשתמש בכלל לופיטל</b>"), `<br>` for
  line breaks inside a question. No other tags beyond the allowed list in data-format.md.
- Figures: crop the figure (not the whole page) to `data/img/<question id>.png` and set `image`.
- Keep the original wording, including mistakes; explain typos in `notes` ("בטופס מופיע sun — שגיאת הקלדה של sin").
- Multiple choice: options in the original order; `correct` is the 0-based index. If more than one option is
  correct, omit `correct` and put the correct letters in `solution.answer`. If the form says "ייתכן שיותר
  מתשובה אחת נכונה", that sentence belongs in the question text as printed — not in `notes` — and when exactly
  one option turns out correct, set `correct` as usual. Never add a note only to the multi-answer questions:
  that alone tells the student which ones they are.

## 4. Classifying

- Classify by the mathematical skill the question tests, not by the chapter it appeared after. A limit solved
  by L'Hôpital belongs under L'Hôpital; a limit as a Riemann sum belongs with definite integrals.
- One `topic`/`sub` per question, taken exactly from `taxonomy.json`. If nothing fits, extend the taxonomy
  (in syllabus order) rather than forcing a poor fit, and tell the user.
- A classification that isn't obvious deserves a short note: "סיווג: גבול של סדרה כסכום רימן."

## 5. Solutions

- **Official** (`"official": true`): taken from the course staff's solution file. Adapt the order of
  questions and answers if the solution file uses a different version than the one transcribed. Still check
  it: if the official solution contains an error, correct it and add a last step starting "הערה:" that
  describes what the original said (verify numerically or with sympy when in doubt). Not in `notes` — that
  would show solution details before the student opens the solution.
- **Unofficial** (`"official": false`): written by you when there is no staff solution. Solve carefully and
  verify — compute limits, integrals and derivatives symbolically or numerically (sympy) before writing them
  down. A wrong solution does more harm than no solution; if you cannot solve something reliably, leave
  `"solution": null`.
- If the staff file only marks the correct letter, the solution stays official and the steps are written
  by you; say so in `issues`.
- **Steps are short lines.** The app reveals the solution one step at a time — the student clicks "הצג שורה
  נוספת" to see the next line — so each step should be one idea that the student could try to continue from:
  "תחום: \(x\ne-2\)", then "אסימפטוטות: …", then "\(f'(x)=…\)". Typically 2–6 steps. Don't number them (the app
  doesn't show numbers) and don't pack a whole solution into one step.
- `answer`: the final result in one line ("\(L=\frac{1}{3}\)", "תשובה ה.", "האינטגרל מתכנס עבור \(\alpha\gt2\)").
- Ill-posed or ambiguous questions ("מה ניתן להסיק בוודאות"): choose the most defensible reading, say which
  in a final "הערה:" step, and tell the user so the course staff can confirm. Only a question-level
  ambiguity that doesn't hint at the answer goes in `notes`.

## 6. Notes and issues

- `notes` (per question) is shown to students **under the question, before the solution is opened**. So it
  may only talk about the question: typos in the form, ambiguities, "ייתכן שיותר מתשובה אחת נכונה", omitted LMS
  options. Anything that hints at the answer — correct letters, values, remarks about the official solution —
  belongs inside the solution (a final "הערה:" step or `answer`). Classification remarks ("סיווג: …") are fine
  as long as they don't reveal the method's result. Keep notes short and in the language of the app.
- `issues` (per exam) is for the maintainers: duplicate files, version differences, damaged solution files,
  text-layer problems. Students never see it.
