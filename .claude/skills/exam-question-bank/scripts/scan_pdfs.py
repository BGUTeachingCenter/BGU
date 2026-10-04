#!/usr/bin/env python3
"""Inventory the source PDFs before cataloging them.

Usage: python3 scan_pdfs.py <exams-dir>

For every PDF: path, pages, whether it has a text layer (scans don't), MD5, and the first line of text.
Files with the same MD5 are reported as duplicates. Needs pypdf.
"""
import collections, hashlib, os, sys

from pypdf import PdfReader


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "exams"
    rows, by_md5 = [], collections.defaultdict(list)
    for dirpath, _, files in os.walk(root):
        for f in sorted(files):
            if not f.lower().endswith(".pdf"):
                continue
            path = os.path.join(dirpath, f)
            rel = os.path.relpath(path, root)
            md5 = hashlib.md5(open(path, "rb").read()).hexdigest()
            by_md5[md5].append(rel)
            try:
                r = PdfReader(path)
                text = "".join((p.extract_text() or "") for p in r.pages[:2]).strip()
                first = next((l.strip() for l in text.splitlines() if l.strip()), "")
                rows.append((rel, len(r.pages), "text" if len(text) > 50 else "SCAN", md5[:8], first[:70]))
            except Exception as e:
                rows.append((rel, "?", "ERROR", md5[:8], str(e)[:70]))
    for row in sorted(rows):
        print(" | ".join(str(x) for x in row))
    dups = [v for v in by_md5.values() if len(v) > 1]
    print(f"\n{len(rows)} PDFs, {sum(r[2] == 'SCAN' for r in rows)} without a text layer, {len(dups)} duplicate groups")
    for v in dups:
        print("  identical files: " + " = ".join(v))


if __name__ == "__main__":
    main()
