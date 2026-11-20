#!/usr/bin/env python3
"""check-brief.py — validate a dispatch brief before a session is started with it.

Checks:
  1. "Human's words" holds verbatim `>` quotes from intent.md.
  2. "Required reading": absolute existing paths, including intent.md and continuity files.
  3. "Unverified leads": `Leads: none` or `path[:line]` pointers <= MAX_LEAD_WORDS words.
  4. Holds from record.md appear on `- Gates ahead of you`.
  5. `- Session:` and `- On finish:` are valid, and no template placeholders remain.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

_SDIR = str(Path(__file__).resolve().parent)
if _SDIR not in sys.path:
    sys.path.insert(0, _SDIR)

import sop_common as SC

COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
H2 = re.compile(r"^## +(.*\S)\s*$")
BACKTICKED = re.compile(r"`([^`\n]+)`")
PLACEHOLDER = re.compile(r"<[^<>\n]+>")
POINTER = re.compile(r"`[^`\n]*(?:/|\.\w+|:\d+)[^`\n]*`")
LIST_ITEM = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s")
SECTIONS = ("human's words", "required reading", "unverified leads", "out of scope")
LINE_SUFFIX = re.compile(r":\d+(?:-\d+)?$")
SLOT = re.compile(r"\bslot=([A-Za-z_]+)")
KNOWN_SLOTS = ("writer", "reviewer", "helper", "scout", "monitor")
SESSION = re.compile(r"^- *Session:\s*(.*\S)?\s*$", re.MULTILINE)
STE_WORD = re.compile(r"[\u3400-\u9fff]|[A-Za-z0-9][A-Za-z0-9_.:/\-]*")

_BASE = Path(__file__).resolve().parents[1]
TEMPLATE = next(
    (p for p in (_BASE / "assets" / "templates" / "dispatch-brief.md", _BASE / "templates" / "dispatch-brief.md") if p.is_file()),
    _BASE / "assets" / "templates" / "dispatch-brief.md",
)
NUMBERED = re.compile(r"^(handoff|review|disposition)(?:-(\d+))?\.md$")
TREE_LINE = re.compile(r"^- *Tree:\s*`?(tree=[0-9a-f]{12})`?\s*$", re.MULTILINE)
CWD = re.compile(r"\bcwd=(\S+)")
WS = re.compile(r"\s+")
MAX_LEAD_WORDS = 30
HOLD_START = re.compile(r"^\s*[-*]\s*(HOLD|RELEASE)\b")
HOLD_LINE = re.compile(r"^\s*[-*]\s*HOLD\s+(H-\d+)\s*\|\s*scope:\s*(\S.*?)\s*\|\s*release:\s*(\S.*?)\s*\|\s*source:\s*(\S.*?)\s*$")
RELEASE_LINE = re.compile(r"^\s*[-*]\s*RELEASE\s+(H-\d+)\s*\|\s*source:\s*(\S.*?)\s*$")
GATES = re.compile(r"^- *Gates ahead of you[^:]*:(.*)$", re.MULTILINE)


def squash(text: str) -> str:
    return WS.sub("", text)


def strip_comments(text: str) -> str:
    """Drop HTML comments, but never inside a `>` quote — those are the human's."""
    guard = "\x00COMMENT\x00"
    kept = "\n".join(line.replace("<!--", guard) if line.lstrip().startswith(">") else line for line in text.splitlines())
    return COMMENT.sub("", kept).replace(guard, "<!--")


def template_tokens() -> tuple[set[str], set[str]]:
    tokens: set[str] = set()
    bare: set[str] = set()
    try:
        text = COMMENT.sub("", TEMPLATE.read_text(encoding="utf-8"))
    except OSError:
        return tokens, bare
    for pre, tok, post in re.findall(r"([^\s`]?)(<[^<>\n]+>)([^\s`]?)", text):
        if re.search(r"[\s|:,]", tok):
            tokens.add(tok)
        elif pre or post:
            tokens.add(pre + tok + post)
        else:
            bare.add(tok)
    return tokens, bare


def sections(text: str) -> tuple[dict[str, str], list[str]]:
    out: dict[str, list[str]] = {}
    headings: list[str] = []
    current = ""
    for line in text.splitlines():
        m = H2.match(line)
        if m:
            current = m.group(1).lower().replace("\u2019", "'")
            headings.append(current)
            out.setdefault(current, [])
        elif current:
            out[current].append(line)
    return {k: "\n".join(v) for k, v in out.items()}, headings


def stray_lines(body: str, allowed: re.Pattern[str] | None = None) -> list[str]:
    out, in_item = [], False
    for line in body.splitlines():
        if not line.strip():
            in_item = False
        elif LIST_ITEM.match(line):
            in_item = True
        elif allowed and allowed.match(line):
            in_item = False
        elif not (in_item and line[:1].isspace()):
            out.append(line.strip())
    return out


def lead_items(body: str) -> list[str]:
    items: list[list[str]] = []
    in_item = False
    for line in body.splitlines():
        if LIST_ITEM.match(line):
            items.append([line])
            in_item = True
        elif in_item and line.strip() and line[:1].isspace():
            items[-1].append(line)
        else:
            in_item = False
    return [" ".join(i) for i in items]


def find(secs: dict[str, str], prefix: str) -> str | None:
    return next((body for head, body in secs.items() if head.startswith(prefix)), None)


def intent_haystack(intent: str) -> str:
    quoted = [line for line in strip_comments(intent).splitlines() if line.lstrip().startswith(">")]
    return squash("\n".join(re.sub(r"^\s*>\s?", "", line) for line in quoted))


def open_holds(record: str, haystack: str) -> tuple[list[str], dict[str, str]]:
    problems: list[str] = []
    held: dict[str, str] = {}
    released: list[str] = []
    for line in record.splitlines():
        if not HOLD_START.match(line):
            continue
        hold, release = HOLD_LINE.match(line), RELEASE_LINE.match(line)
        if not (hold or release):
            problems.append(
                f"record.md: {line.strip()[:70]!r} is not '- HOLD H-n | scope: … | release: … | source: …' "
                "or '- RELEASE H-n | source: …'"
            )
            continue
        hid, source = (hold.group(1), hold.group(4)) if hold else (release.group(1), release.group(2))
        if squash(source) not in haystack:
            problems.append(
                f"record.md: {hid} source is not verbatim in intent.md: {source[:50]!r}"
            )
        if hold:
            held[hid] = hold.group(2)
        else:
            released.append(hid)
    for hid in released:
        if hid not in held:
            problems.append(f"record.md: RELEASE {hid} has no HOLD {hid}")
        held.pop(hid, None)
    return problems, held


def numbered(task_dir: Path, kind: str) -> list[Path]:
    found = []
    for p in task_dir.iterdir():
        m = NUMBERED.match(p.name)
        if m and m.group(1) == kind:
            found.append((int(m.group(2) or 0), p))
    return [p.resolve() for _, p in sorted(found)]


def check(brief: str, intent: str, intent_path: Path) -> list[str]:
    problems: list[str] = []
    brief = strip_comments(brief)
    secs, headings = sections(brief)
    head = brief.split("\n## ", 1)[0]

    words = find(secs, "human's words")
    word_lines = (words or "").splitlines()
    quotes = [re.sub(r"^\s*>\s?", "", line) for line in word_lines if line.lstrip().startswith(">")]
    quotes = [q for q in quotes if q.strip()]
    for stray in (line for line in word_lines if line.strip() and not line.lstrip().startswith(">")):
        problems.append(f"unquoted line under '## Human's words': {stray.strip()[:60]!r}")
    if not quotes:
        problems.append("no `>` quote under '## Human's words'")
    haystack = intent_haystack(intent)
    for q in quotes:
        if squash(q) not in haystack:
            problems.append(f"quote is not verbatim in intent.md: {q.strip()[:60]!r}")

    for heading in (h for h in secs if not h.startswith(SECTIONS)):
        problems.append(f"unexpected section '## {heading}'")
    for prefix in SECTIONS:
        twins = [h for h in headings if h.startswith(prefix)]
        if len(twins) > 1:
            problems.append(f"{len(twins)} sections start with '## {prefix}'")

    reading = find(secs, "required reading")
    listed: list[Path] = []
    if reading is None:
        problems.append("missing '## Required reading' section")
    else:
        for stray in stray_lines(reading):
            problems.append(f"prose under '## Required reading': {stray[:60]!r}")
        for item in (line for line in reading.splitlines() if LIST_ITEM.match(line)):
            first = BACKTICKED.search(item)
            if not first:
                problems.append(f"required reading item has no backticked path: {item.strip()[:60]!r}")
                continue
            raw = first.group(1)
            p = Path(LINE_SUFFIX.sub("", raw))
            if not p.is_absolute():
                problems.append(f"required reading {raw!r} is not an absolute path")
            elif not p.exists():
                problems.append(f"required reading {raw!r} does not exist")
            else:
                listed.append(p.resolve())
        if intent_path.resolve() not in listed:
            problems.append(f"intent.md ({intent_path}) is not in the required reading")

        slot = (SLOT.search(head) or [None, ""])[1]
        if not slot.startswith(KNOWN_SLOTS):
            problems.append(f"'- Dispatch:' line has no recognisable slot= (got {slot!r})")
        task_dir = intent_path.resolve().parent
        wanted = ["review"] if slot.startswith("reviewer") else ["handoff", "review"]
        for kind in wanted:
            *older, latest = numbered(task_dir, kind) or [None]
            if latest is not None and latest not in listed:
                problems.append(f"{latest.name} exists but is not in the required reading")
            for stale in (o for o in older if o in listed):
                problems.append(f"{stale.name} is superseded by {latest.name}")
        if slot.startswith("reviewer"):
            for h in (h for h in numbered(task_dir, "handoff") if h in listed):
                problems.append(f"reviewer brief lists {h.name}")
            reviews = numbered(task_dir, "review")
            for d in numbered(task_dir, "disposition"):
                answers_newest = bool(reviews) and d.name == reviews[-1].name.replace("review", "disposition")
                if answers_newest and d not in listed:
                    problems.append(f"{d.name} answers {reviews[-1].name} but is not in required reading")
                if not answers_newest and d in listed:
                    problems.append(f"{d.name} does not answer the newest review")
            tree = TREE_LINE.search(head)
            cwd = CWD.search(head)
            if not tree:
                problems.append("reviewer brief has no '- Tree: tree=<hash>' line")
            elif cwd:
                cwd_path = Path(cwd.group(1)).expanduser().resolve()
                eff_root = SC.find_sop_root(task_dir=task_dir, cwd=cwd_path)
                ws = SC.load_workspace(eff_root)
                live = SC.tree_stamp_for_repo(cwd_path, workspace=ws) if SC.is_git_work_tree(cwd_path) else ""
                if live != tree.group(1):
                    problems.append(f"Tree says {tree.group(1)} but {cwd.group(1)} is now {live or 'not a git work tree'}")

    leads = find(secs, "unverified leads")
    if leads is None:
        problems.append("missing '## Unverified leads' section")
    else:
        none = re.search(r"^Leads:\s*none\s*$", leads, re.MULTILINE | re.IGNORECASE)
        for stray in stray_lines(leads, re.compile(r"^Leads:\s*none\s*$", re.IGNORECASE)):
            problems.append(f"prose under '## Unverified leads': {stray[:60]!r}")
        bullets = [line for line in leads.splitlines() if LIST_ITEM.match(line)]
        if not none and not bullets:
            problems.append("'## Unverified leads' has neither bullets nor 'Leads: none'")
        for b in bullets:
            if not POINTER.search(b):
                problems.append(f"lead without a `path:line` pointer: {b.strip()[:60]!r}")
        for item in lead_items(leads):
            pointer = POINTER.search(item)
            n = len(STE_WORD.findall(item[pointer.end() :] if pointer else item))
            if n > MAX_LEAD_WORDS:
                problems.append(f"lead observation is {n} words > {MAX_LEAD_WORDS}: {item.strip()[:50]!r}")

    record = intent_path.resolve().parent / "record.md"
    if record.is_file():
        hold_problems, held = open_holds(record.read_text(encoding="utf-8"), haystack)
        problems += hold_problems
        gates = squash((GATES.search(head) or [None, ""])[1])
        for hid, scope in held.items():
            if not re.search(rf"{hid}(?!\d)", gates) or squash(scope) not in gates:
                problems.append(f"open hold {hid} ({scope[:40]}) is not on '- Gates ahead of you'")

    m = SESSION.search(head)
    session = ((m.group(1) or "") if m else "").replace("`", "")
    if not re.match(r"(fresh\b|reused\b)", session):
        problems.append("'- Session:' must be `reused` or `fresh [reason=<why>]`")
    elif re.match(r"fresh\s*$", session) and intent_path is not None:
        own_slot = (SLOT.search(head) or [None, ""])[1]
        kinds = ("review",) if own_slot.startswith("reviewer") else ("review", "handoff")
        later = [k for k in kinds if numbered(intent_path.resolve().parent, k)]
        if later:
            problems.append(f"'- Session: fresh' on a later round ({' and '.join(later)} exist) requires reason=<why> or reused")

    if not re.search(r"^- *On finish:(.*\b(stand by|exit)\b|\s*n/a \(native\b)", head, re.MULTILINE | re.IGNORECASE):
        problems.append("missing valid '- On finish:' line")

    outside_quotes = brief if words is None else brief.replace(words, "")
    tokens, bare = template_tokens()
    title = next((line for line in brief.splitlines() if line.startswith("# ")), "")
    left = sorted({t for t in tokens if t in outside_quotes} | {t for t in bare if t in title})
    if left:
        problems.append(f"template placeholders still present: {', '.join(left[:4])}")
    return problems


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("brief")
    ap.add_argument("--intent", required=True, help="<task-dir>/intent.md")
    try:
        args = ap.parse_args()
    except SystemExit as exc:
        return 64 if exc.code else 0
    try:
        brief = Path(args.brief).read_text(encoding="utf-8")
        intent_path = Path(args.intent)
        intent = intent_path.read_text(encoding="utf-8")
    except OSError as exc:
        print(f"usage error: {exc}", file=sys.stderr)
        return 64

    problems = check(brief, intent, intent_path)
    if problems:
        print("BRIEF_REFUSED " + args.brief)
        for p in problems:
            print(f"  - {p}")
        return 1
    print("BRIEF_OK " + args.brief)
    return 0


if __name__ == "__main__":
    sys.exit(main())
