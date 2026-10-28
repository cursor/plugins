# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Build a multiple-choice quiz: a standalone HTML page, or a YESUnits unit for a course.

    uv run build.py lint  <quiz.json>
    uv run build.py build <quiz.json>                   # -> <dir>/out/<name>.html
    uv run build.py unit  <quiz.json> --id ID --out DIR # unit bundle for course

quiz.json: {"title": "...", "questions": [{"q", "choices": [...], "answer": 0-based index, "why"}]}
"""

from __future__ import annotations

import argparse
import html
import json
import shutil
import sys
from collections import Counter
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SKILL_DIR.parents[1] / "scripts"))
from output import export


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def load(src: Path) -> dict:
    quiz = json.loads(src.read_text())
    qs = quiz.get("questions")
    if not qs:
        die(f"{src}: needs a non-empty 'questions' list")
    for n, q in enumerate(qs, 1):
        if not q.get("q") or len(q.get("choices", [])) < 2:
            die(f"{src} question {n}: needs q and at least 2 choices")
        if not isinstance(q.get("answer"), int) or not 0 <= q["answer"] < len(q["choices"]):
            die(f"{src} question {n}: answer must be a 0-based index into choices")
    return quiz


def lint(quiz: dict) -> list[str]:
    warns = []
    for n, q in enumerate(quiz["questions"], 1):
        if not q.get("why"):
            warns.append(f"question {n}: no 'why' — explain the right answer")
        if len(q["choices"]) < 3:
            warns.append(f"question {n}: only {len(q['choices'])} choices; 4 plausible ones test understanding better")
    positions = Counter(q["answer"] for q in quiz["questions"])
    if len(quiz["questions"]) >= 3 and len(positions) == 1:
        warns.append("every answer sits at the same position; vary it")
    return warns


def make_unit(src: Path, uid: str, out: Path) -> dict:
    quiz = load(src)
    out.mkdir(parents=True, exist_ok=True)
    (out / "unit.html").write_text(f'<div class="su-unit" data-unit="{html.escape(uid)}" data-kind="quiz" hidden></div>\n')
    for f in ("runtime.js", "runtime.css"):
        shutil.copy(SKILL_DIR / f, out / f)
    unit = {"id": uid, "kind": "quiz", "title": quiz.get("title", "確認テスト"), "outline": [],
            "questions": len(quiz["questions"]), "data": {"title": quiz.get("title"), "questions": quiz["questions"]}}
    (out / "unit.json").write_text(json.dumps(unit, ensure_ascii=False))
    for w in lint(quiz):
        print(f"warn: {uid}: {w}")
    return unit


def standalone_page(unit_dir: Path) -> str:
    unit = json.loads((unit_dir / "unit.json").read_text())
    data = json.dumps({"kind": unit["kind"], "data": unit["data"]}, ensure_ascii=False).replace("</", "<\\/")
    page = (SKILL_DIR / "page.html").read_text()
    for key, val in {
        "__TITLE__": html.escape(unit["title"]),
        "/*__CSS__*/": (unit_dir / "runtime.css").read_text(),
        "/*__JS__*/": (unit_dir / "runtime.js").read_text(),
        "<!--__UNIT__-->": (unit_dir / "unit.html").read_text().replace(" hidden>", ">", 1),
        "/*__DATA__*/null": data,
    }.items():
        if key not in page:
            die(f"page.html lost placeholder {key}")
        page = page.replace(key, val)
    return page


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["lint", "build", "unit"])
    ap.add_argument("src", type=Path)
    ap.add_argument("--id")
    ap.add_argument("--out", type=Path)
    ap.add_argument("--format", choices=["single", "bundle"], default="single")
    ap.add_argument("--max-bytes", type=int, help="Optional publishing-host HTML size limit")
    a = ap.parse_args()
    src = a.src.resolve()
    if a.cmd == "lint":
        for w in lint(load(src)):
            print(f"warn: {w}")
        print(f"{len(load(src)['questions'])} questions")
    elif a.cmd == "unit":
        if not (a.id and a.out):
            die("unit needs --id and --out")
        make_unit(src, a.id, a.out.resolve())
    else:
        out = src.parent / "out"
        unit_dir = out / f"{src.stem}-unit"
        make_unit(src, src.stem, unit_dir)
        page = out / f"{src.stem}.html"
        page.write_text(standalone_page(unit_dir))
        export(page, a.format, a.max_bytes)


if __name__ == "__main__":
    main()
