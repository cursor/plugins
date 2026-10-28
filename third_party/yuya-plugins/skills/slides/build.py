# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Turn a slides deck into a YESUnits unit for course.

    uv run build.py unit <deck.html> --id ID --out DIR

The deck stays an ordinary deck made from template.html (publish it on its own as before). The unit keeps
the deck's own <style>, the .deck element and the deck's own <script>s; the runtime blocks marked
data-slides are replaced by this skill's runtime.js / runtime.css.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import shutil
import sys
from html.parser import HTMLParser
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


class DeckFinder(HTMLParser):
    """Byte offsets of the first element with class "deck" (start of its start tag, end of its end tag)."""

    def __init__(self, text: str):
        super().__init__(convert_charrefs=False)
        self.lines = [0]
        for line in text.splitlines(keepends=True):
            self.lines.append(self.lines[-1] + len(line))
        self.depth = 0
        self.start = self.end = None
        self.tag = None

    def here(self) -> int:
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        if self.end is not None or tag in VOID:
            return
        if self.start is None:
            classes = (dict(attrs).get("class") or "").split()
            if "deck" in classes:
                self.start, self.tag, self.depth = self.here(), tag, 1
            return
        if tag == self.tag:
            self.depth += 1

    def handle_endtag(self, tag):
        if self.start is None or self.end is not None or tag != self.tag:
            return
        self.depth -= 1
        if self.depth == 0:
            self.end = self.here() + len(f"</{tag}>")


def make_unit(src: Path, uid: str, out: Path) -> dict:
    text = src.read_text()
    finder = DeckFinder(text)
    finder.feed(text)
    if finder.start is None or finder.end is None:
        die(f"{src}: no element with class=\"deck\"")
    deck = text[finder.start:finder.end]
    styles = [m.group(0) for m in re.finditer(r"<style(?![^>]*data-slides)[^>]*>.*?</style>", text, re.S)]
    scripts = [m.group(0) for m in re.finditer(r"<script(?![^>]*data-slides)[^>]*>.*?</script>", text, re.S)]
    for st in styles:
        if re.search(r":root\b", st):
            print(f"warn: {uid}: the deck's <style> sets :root — in a course that changes the whole page; scope it to .deck")
    title_m = re.search(r"<title>(.*?)</title>", text, re.S)
    title = html.unescape(title_m.group(1).strip()) if title_m else uid
    # outline: section slides (or every slide of a short deck), linked by slide number
    slides = re.findall(r'<section\b[^>]*class="[^"]*\bslide\b([^"]*)"[^>]*>(.*?)</section>', deck, re.S)
    outline = []
    for i, (cls, body) in enumerate(slides, 1):
        if "section" in cls.split() or len(slides) <= 6:
            h = re.search(r"<h[12][^>]*>(.*?)</h[12]>", body, re.S)
            if h:
                outline.append({"rest": str(i), "title": html.unescape(re.sub(r"<[^>]+>", "", h.group(1))).strip()})
    out.mkdir(parents=True, exist_ok=True)
    (out / "unit.html").write_text(
        f'<div class="su-unit" data-unit="{html.escape(uid)}" data-kind="slides" hidden>\n'
        + "\n".join(styles) + "\n" + deck + "\n" + "\n".join(scripts) + "\n</div>\n")
    for f in ("runtime.js", "runtime.css"):
        shutil.copy(SKILL_DIR / f, out / f)
    unit = {"id": uid, "kind": "slides", "title": title, "slides": len(slides), "outline": outline, "data": {"title": title}}
    (out / "unit.json").write_text(json.dumps(unit, ensure_ascii=False))
    print(f"{uid}: {len(slides)} slides")
    return unit


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["unit"])
    ap.add_argument("src", type=Path)
    ap.add_argument("--id", required=True)
    ap.add_argument("--out", type=Path, required=True)
    a = ap.parse_args()
    make_unit(a.src.resolve(), a.id, a.out.resolve())


if __name__ == "__main__":
    main()
