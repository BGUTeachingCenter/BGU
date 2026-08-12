#!/usr/bin/env python3
"""Site sanity checks for the BGU teaching-center site.

Checks every *.html file in the repo:
  1. The file parses as HTML (catches truncated/corrupted files).
  2. Every internal link/asset (href/src pointing to a local path)
     resolves to an existing file in the repo.

External links (http/https), mailto:, tel:, anchors (#...) and
absolute paths (/...) are skipped -- the site is served under a
sub-path on GitHub Pages, so absolute paths are reported too.

Exit code 0 = all good, 1 = problems found.
"""
import re
import sys
import urllib.parse
from html.parser import HTMLParser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SKIP_SCHEMES = ("http://", "https://", "mailto:", "tel:", "data:", "javascript:", "//")
# Template placeholders like YOUR_GAMMA_EMBED_URL -- not real links.
PLACEHOLDER_RE = re.compile(r"^[A-Z0-9_]+$")


class RefCollector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ("href", "src") and value:
                self.refs.append(value)


def check_file(html_path: Path):
    problems = []
    try:
        text = html_path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return [f"cannot read file: {exc}"]

    parser = RefCollector()
    try:
        parser.feed(text)
    except Exception as exc:  # html.parser is lenient; failure = truly broken
        return [f"HTML does not parse: {exc}"]

    for ref in parser.refs:
        ref = ref.strip()
        if not ref or ref.startswith("#") or ref.lower().startswith(SKIP_SCHEMES):
            continue
        if PLACEHOLDER_RE.match(ref):
            continue
        if ref.startswith("/"):
            problems.append(f"absolute path (breaks under GitHub Pages sub-path): {ref}")
            continue
        # strip query string and fragment, decode %20 etc.
        target = urllib.parse.unquote(ref.split("#", 1)[0].split("?", 1)[0])
        if not target:
            continue
        resolved = (html_path.parent / target).resolve()
        if REPO_ROOT not in resolved.parents and resolved != REPO_ROOT:
            problems.append(f"link escapes repo: {ref}")
            continue
        if not resolved.exists():
            problems.append(f"broken link: {ref}")
    return problems


def main():
    html_files = sorted(p for p in REPO_ROOT.rglob("*.html") if ".git" not in p.parts)
    total_problems = 0
    for path in html_files:
        problems = check_file(path)
        if problems:
            rel = path.relative_to(REPO_ROOT)
            print(f"\n{rel}:")
            for p in problems:
                print(f"  - {p}")
            total_problems += len(problems)

    print(f"\nChecked {len(html_files)} HTML files, {total_problems} problem(s).")
    return 1 if total_problems else 0


if __name__ == "__main__":
    sys.exit(main())
