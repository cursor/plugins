#!/usr/bin/env python3
"""Build the team map from the team spec and the skills it names.

Fills the data block in team-map.canvas.tsx, the canvas, and renders team-map-document.md, the Markdown
document used when canvases aren't available. Both templates hold the layout; this script only reads the
spec, checks it, and writes the data in. Python 3 standard library only.

    python3 build_team_map.py --spec /workspace/team-builder-stack/team-spec.md --skills DIR \\
        --canvas team-map.canvas.tsx --document team-map.md

--skills       a folder of the person's library skills, one SKILL.md each (or one .md each)
--proposal     marks the map as a proposal, with this one-line summary, before the person says yes
--current      the current spec, when the proposal changes it: the map marks what's added, changed and removed
--current-skills  the current skills folder, when the proposal changes skills too (defaults to --skills)
--json         also writes the data as JSON
--check        checks the spec fields and the skill library, writes nothing, and exits non-zero
               with a plain list of what is missing, per bot and skill

It exits with an error when the spec can't be read or doesn't hold together, and prints a warning for
anything to fix later, such as a skill the spec names that isn't in the library yet. With --check it
does not build the map. A fact the map cannot find in a labeled field is marked inferred. It is not filled in.
"""

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
# Slugs of the skills this plugin ships. A skill is a plugin skill when its slug
# is in this set. scripts/check-team-builder-stack.mjs requires the set to match
# the skill folders. Do not decide from the folder this file happens to sit in:
# a copy in someone's skill library would otherwise treat every library skill as
# a plugin skill and skip its steps.
PLUGIN_SKILL_SLUGS = frozenset({
    "apply-a-plugin-update",
    "build-a-bot",
    "build-my-team",
    "check-my-bots",
    "clean-up-memory",
    "coach-my-bots",
    "delegate-work",
    "explain-how-it-works",
    "inform-manager-bot",
    "inform-team-builder",
    "plan-the-work",
    "retire-a-bot",
    "run-review-panel",
    "run-the-weekly-bot-review",
    "save-what-we-learned",
    "set-my-writing-voice",
    "set-up-team-builder",
    "team-builder-operating-guide",
    "triage-work",
    "verify-work",
    "write-a-workflow-skill",
})
CANVAS_TEMPLATE = HERE / "team-map.canvas.tsx"
DOCUMENT_TEMPLATE = HERE / "team-map-document.md"
DATA_START = "/* TEAM_MAP_DATA_START */"
DATA_END = "/* TEAM_MAP_DATA_END */"

SECTIONS = ["Updated", "Your role", "Your team", "Your workflows", "Systems of record", "Records and logs"]
LISTS = {"Handoffs", "Backlog"}
FIVE_STEPS = ["Load", "Do the work", "Verify", "Record", "Hand off"]
STEP_LABELS = ["Does", "Pulls from", "Uses", "Produces", "Hands to", "Needs your review"]
FIELD_LINE = re.compile(
    r"^(Does|Pulls from|Uses|Produces|Hands to|Needs your review):\s*(.*)$"
)
TYPE_LABEL = {"builder": "Builder", "manager": "Manager", "owner": "Owner", "specialist": "Specialist"}
TEMPLATE_LOCATION = re.compile(r"in the skill|connector|grok bot (document|canvas)|canvas id|document id|https?://", re.I)
DESCRIPTION_LIMIT = 120
HANDOFF_ENDS = {"you": "You", "every bot": "Every bot"}
SCHEDULE_RE = re.compile(
    r"\b\d{1,2}:\d{2}\b"
    r"|\b\d+\s*(?:a\.m\.|p\.m\.|am|pm)\b"
    r"|\b(?:\d+|one|two|three|four|five|ten|fifteen|thirty|forty-five)\s+(?:minutes?|hours?)\s+before\b"
    r"|\bevery\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekday)\b"
    r"|\bevery\s+\d+\s+(?:minutes?|hours?|days?|weeks?)\b"
    r"|\b(?:daily|weekly|hourly)\s+at\b",
    re.I,
)
CHANNEL_RE = re.compile(r"(?:^|\s)#([A-Za-z][A-Za-z0-9_-]{1,})")
UUID_RE = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
    re.I,
)
TICKET_RE = re.compile(r"\b[A-Z][A-Z0-9]{1,9}-\d{2,}\b")
REPO_RE = re.compile(r"\b([A-Za-z0-9][A-Za-z0-9_.-]{1,})/([A-Za-z0-9][A-Za-z0-9_.-]{1,})\b")
PATH_WORDS = {
    "skills", "references", "assets", "scripts", "dist", "team-builder-stack",
    "checklists", "guide", "routines", "team-builder", "team-map",
}
REPO_WORDS = {
    "yes", "no", "and", "or", "the", "a", "an", "to", "of", "in", "on", "for",
    "with", "from", "by", "as", "at", "it", "is",
}
STANDARD_PREFIXES = {"ISO", "IEC", "NIST", "SOC", "PCI", "IEEE", "ANSI", "CMMC", "OWASP", "CIS"}
TYPE_PREFIX = {
    "workflow skill": "Use when ",
    "utility skill": "Called by ",
    "standard skill": "Follow whenever ",
}

warnings = []


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def is_slot(text):
    return not text or bool(re.search(r"<[^>]+>", text))


def value(text):
    return "" if is_slot(text) else text.strip()


# ---------- reading ----------

def read_spec(path):
    """The spec's sections: each one's own fields, its `### <name>` entries, and its one-line lists."""
    text = Path(path).read_text(encoding="utf-8")
    spec, section, entry = {}, None, None
    for line in text.splitlines():
        h2 = re.match(r"^## (.+?)\s*$", line)
        h3 = re.match(r"^### (.+?)\s*$", line)
        item = re.match(r"^- (.*)$", line)
        if h2:
            section = spec.setdefault(h2.group(1), {"fields": {}, "entries": [], "lists": {}})
            entry = None
        elif h3 and section is not None:
            name = h3.group(1)
            if name in LISTS:
                entry = section["lists"].setdefault(name, [])
            else:
                entry = {"name": name, "blank": is_slot(name), "fields": {}}
                section["entries"].append(entry)
        elif item and section is not None:
            if isinstance(entry, list):
                if not is_slot(item.group(1)):
                    entry.append(item.group(1).strip())
                continue
            kv = re.match(r"^([^:]+):\s*(.*)$", item.group(1))
            if kv:
                (entry["fields"] if entry else section["fields"])[kv.group(1).strip()] = kv.group(2).strip()
    missing = [s for s in SECTIONS if s not in spec]
    if missing:
        sys.exit(f"{path}: the team spec has no {', '.join(missing)} section; start from the blank team spec")
    return spec


def frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    meta = {}
    for line in (m.group(1).splitlines() if m else []):
        kv = re.match(r"^([\w-]+):\s*(.*)$", line)
        if kv:
            meta[kv.group(1)] = kv.group(2).strip().strip('"')
    return meta, text[m.end():] if m else text


def labeled_fields(text):
    found = {}
    for line in text.splitlines():
        match = FIELD_LINE.match(line.strip())
        if match:
            found[match.group(1)] = match.group(2).strip()
    return found


def none_without_reason(value):
    return bool(re.fullmatch(r"none[.!]?", value.strip(), re.I))


def needs_review(value):
    """A review value that starts with none is not a review point."""
    text = (value or "").strip()
    return bool(text) and not re.match(r"none\b", text, re.I)


def states_wait(value):
    return bool(re.search(r"\bwait", value or "", re.I))


PLACEHOLDER_PHRASES = (
    "follow this step as written",
    "the outcome this step names",
    "this step does not open a system of record",
    "this step does not call a connector",
    "this step does not pause for a decision",
)


def _blank(match):
    return " " * len(match.group(0))


def earlier_yes_mentions(text):
    """A mention of a yes that already happened is not this step asking."""
    out = text
    for pattern in (
        r"\bafter the yes\b",
        r"\bthe yes in step \d+\b",
        r"\bnot a new yes\b",
        r"\bnot a yes\b",
        r"\balready covers\b",
        r"\balready covered\b",
        r"\b(?:does|whether)\b(?:.{0,180}?)\bwait for a yes\b",
    ):
        out = re.sub(pattern, _blank, out, flags=re.I)
    return out


def previous_words(text, start, count=2):
    words = re.findall(r"[A-Za-z']+", text[:start])
    return [word.lower() for word in words[-count:]]


def prose_asks(text):
    """True when this step asks the person. A mention of an earlier yes does not count."""
    masked = earlier_yes_mentions(text)
    for match in re.finditer(r"\b(ask|asks|confirm|confirms|approval)\b", masked, re.I):
        before = masked[max(0, match.start() - 24):match.start()]
        if re.search(r"(?i)(don't|do not|never|without)\s*$", before):
            continue
        after = masked[match.end():match.end() + 16]
        if re.match(r"\s+for it\b", after, re.I):
            continue
        words = previous_words(masked, match.start())
        if words and words[-1] in {"the", "a", "an", "direct"}:
            continue
        if words[-2:] in (["if", "they"], ["if", "you"]):
            continue
        return True
    if re.search(r"(?i)\b(after a yes|on a yes|for a yes|a yes|the yes|your yes)\b", masked):
        return True
    if re.search(r"(?i)\bwait for their ok\b", masked):
        return True
    if re.search(r"(?i)\bsign-off\b|\bsign off\b|\bcheck with the person\b|\buntil they agree\b", masked):
        return True
    return okay_is_asking(masked)


def okay_is_asking(text):
    """'okay' asks, except in phrases like 'it is okay to'."""
    for match in re.finditer(r"\bokay\b", text, re.I):
        before = text[max(0, match.start() - 16):match.start()]
        after = text[match.end():match.end() + 4]
        if re.search(r"(?i)\b(?:is|be|seems|looks)\s+$", before):
            continue
        if re.search(r"(?i)(?:it|that)'s\s+$", before):
            continue
        if re.match(r"\s+to\b", after, re.I):
            continue
        return True
    return False


def bot_directed_ask(text, match):
    """An ask aimed at another bot, such as 'ask it' or 'ask Team Builder'."""
    if match.group(1).lower() not in {"ask", "asks"}:
        return False
    after = text[match.end():match.end() + 48]
    return bool(re.match(
        r"(?i)\s+(?:it|the bot|that bot|another bot|the other bot|team builder)\b",
        after,
    ))


def asks_only_another_bot(prose):
    """True when every ask in the step is a message to another bot."""
    masked = earlier_yes_mentions(prose or "")
    saw_bot_ask = False
    for match in re.finditer(r"\b(ask|asks|confirm|confirms|approval)\b", masked, re.I):
        before = masked[max(0, match.start() - 24):match.start()]
        if re.search(r"(?i)(don't|do not|never|without)\s*$", before):
            continue
        after = masked[match.end():match.end() + 16]
        if re.match(r"\s+for it\b", after, re.I):
            continue
        words = previous_words(masked, match.start())
        if words and words[-1] in {"the", "a", "an", "direct"}:
            continue
        if words[-2:] in (["if", "they"], ["if", "you"]):
            continue
        if bot_directed_ask(masked, match):
            saw_bot_ask = True
            continue
        return False
    if re.search(r"(?i)\b(after a yes|on a yes|for a yes|a yes|the yes|your yes)\b", masked):
        return False
    if re.search(r"(?i)\bwait for their ok\b|\bsign-off\b|\bsign off\b|\bcheck with the person\b|\buntil they agree\b", masked):
        return False
    if okay_is_asking(masked):
        return False
    return saw_bot_ask


EARLIER_YES_RE = re.compile(
    r"(?i)\b("
    r"earlier yes|after the yes|after a yes|the yes in step \d+|"
    r"already covers|already covered|already happened"
    r")\b"
)
NOT_A_YES_RE = re.compile(r"(?i)\b(not a new yes|not a yes)\b")
STEP_NUMBER_RE = re.compile(r"(?i)\bstep\s+(\d+)\b")


def review_excuses_ask(value, reviews_by_number, step_number=None, prose=""):
    """A none-reason excuses an ask only in two cases.

    A cited yes has to name an earlier step that exists, and that step's own
    Needs your review is not none. 'not a yes' excuses the step only when every
    ask in it is a message to another bot.
    """
    text = value or ""
    if EARLIER_YES_RE.search(text):
        numbers = [int(number) for number in STEP_NUMBER_RE.findall(text)]
        if not numbers:
            return False
        for number in numbers:
            if step_number is not None and number >= step_number:
                return False
            other = (reviews_by_number or {}).get(number)
            if other is None or not other.strip():
                return False
            if re.match(r"none\b", other.strip(), re.I):
                return False
        return True
    if NOT_A_YES_RE.search(text):
        return asks_only_another_bot(prose)
    return False


FILE_OR_DOC_RE = re.compile(
    r"(?i)\b(?:team spec|specs?|files?|docs?|documents?|guides?|templates?|skills?|readme|checklists?|notes)\b"
    r"|\.[A-Za-z0-9]{1,5}\b"
)


def look_up_calls_connector(text):
    """A lookup in an app calls a connector. A lookup in a file or a doc does not."""
    patterns = (
        r"\blook(?:\s+\w+){1,6}\s+up in\s+([^.]+)",
        r"\blook up(?:\s+\w+){1,6}\s+in\s+([^.]+)",
    )
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.I):
            before = text[max(0, match.start() - 24):match.start()]
            if re.search(r"(?i)(don't|do not|never|without)\s*$", before):
                continue
            if FILE_OR_DOC_RE.search(match.group(1)):
                continue
            return True
    return False


def prose_calls_connector(text):
    if look_up_calls_connector(text):
        return True
    if re.search(r"(?i)\bread it with the\s+\S+\s+connector\b", text):
        return True
    if re.search(r"(?i)\bone read-only lookup\b", text):
        return True
    for match in re.finditer(r"\b(try|tries|call|calls)\b(?:\s+\w+){0,8}\s+connectors?\b", text, re.I):
        before = text[max(0, match.start() - 24):match.start()]
        if re.search(r"(?i)(don't|do not|never|without)\s*$", before):
            continue
        return True
    return False


def use_is_known(use, known):
    """A Uses value matches a system when it names it, or when it is none or the template's own wording."""
    low = (use or "").strip().lower()
    if not low or low.startswith("none") or "<" in low:
        return True
    generic = {"the connector", "a connector", "connector", "its connector", "the connectors", "connectors"}
    if low in generic:
        return True
    return any(name and name in low for name in known)


def shown_fact(value, inferred):
    """A labeled fact is shown as written. A missing one is inferred, never filled in."""
    if not inferred:
        return value
    if value:
        return f"Inferred: {value}"
    return "Inferred"


def parse_step_text(text):
    """Read the labeled lines. Old prose is kept only as an inferred reading, never as a filled field."""
    labeled = labeled_fields(text)
    review = re.search(r"\*\*Needs your review:\*\*\s*([^.]*)", text)
    uses = re.search(r"\bUses ([^.]+)\.", text)
    template = re.search(r"\bFollows (?:the )?([^.]+? template)\b", text)
    prose = re.sub(r"\*\*Needs your review:\*\*.*$", "", text)
    prose = re.sub(r"\bUses [^.]+\.", "", prose)
    prose = re.sub(r"\bFollows (?:the )?[^.]+? template\.?", "", prose)
    prose = "\n".join(line for line in prose.splitlines() if not FIELD_LINE.match(line.strip()))
    prose = re.sub(r"\s+", " ", prose).strip()
    inferred = []

    def take(label, key, legacy):
        if label in labeled and labeled[label].strip() and not none_without_reason(labeled[label]):
            return labeled[label].strip()
        inferred.append(key)
        return legacy or ""

    uses_value = take("Uses", "uses", uses.group(1).strip() if uses else "")
    if uses_value.lower().startswith("none"):
        uses_list = []
    else:
        uses_list = [part.strip() for part in re.split(r",\s*|\s+and\s+", uses_value) if part.strip()] if uses_value else []
    review_value = take(
        "Needs your review",
        "review",
        (review.group(1).strip()[:1].upper() + review.group(1).strip()[1:]) if review else "",
    )
    return {
        "does": take("Does", "does", prose),
        "pullsFrom": take("Pulls from", "pullsFrom", ""),
        "uses": uses_list,
        "usesText": uses_value,
        "produces": take("Produces", "produces", ""),
        "handsTo": take("Hands to", "handsTo", ""),
        "template": template.group(1).strip() if template else "",
        "review": review_value,
        "inferred": inferred,
    }


def skill_type(body):
    match = re.search(r"^\*\*Type:\*\*\s*(.+?)\.?\s*$", body, re.M)
    return match.group(1).strip().rstrip(".") if match else ""


def read_skill(path, steps_too=True):
    meta, body = frontmatter(Path(path).read_text(encoding="utf-8"))
    title = re.search(r"^# (.+)$", body, re.M)
    skill = {
        "id": meta.get("name") or Path(path).parent.name,
        "name": title.group(1).strip() if title else meta.get("name", ""),
        "description": meta.get("description", ""),
        "type": skill_type(body),
        "load": "", "verify": "", "record": "", "handOff": "", "steps": [],
        "phases": [],
    }
    steps = re.search(r"^## Steps\n(.*?)(?=^## |\Z)", body, re.M | re.S) if steps_too else None
    top, current, nested = [], None, None
    for line in (steps.group(1).splitlines() if steps else []):
        top_step = re.match(r"^(\d+)\. \*\*(.+?)\.\*\*\s*(.*)$", line)
        nested_step = re.match(r"^\s+\d+\. \*\*(.+?)\.\*\*\s*(.*)$", line)
        if top_step:
            current = {"title": top_step.group(2), "lines": []}
            if top_step.group(3).strip():
                current["lines"].append(top_step.group(3).strip())
            top.append(current)
            nested = None
        elif nested_step and current is not None:
            nested = {"name": nested_step.group(1).strip(), "lines": []}
            if nested_step.group(2).strip():
                nested["lines"].append(nested_step.group(2).strip())
            current.setdefault("nested", []).append(nested)
        elif line.strip() and current is not None:
            target = nested if nested is not None else current
            target["lines"].append(line.strip())
    titles = [step["title"] for step in top]
    if steps and titles != FIVE_STEPS:
        warnings.append(f"skill {skill['id']}: its steps are {', '.join(titles) or 'missing'}, not the five workflow steps")
    for step in top:
        text = "\n".join(step["lines"])
        parsed = parse_step_text(text)
        step["parsed"] = parsed
        key = {"Load": "load", "Verify": "verify", "Record": "record", "Hand off": "handOff"}.get(step["title"])
        if key:
            skill[key] = parsed["does"] or text
        for item in step.get("nested", []):
            skill["steps"].append(dict(name=item["name"], **parse_step_text("\n".join(item["lines"]))))
    skill["phases"] = [
        {"title": step["title"], "lines": step["lines"], "parsed": step.get("parsed", {})}
        for step in top
    ]
    if re.search(r"^## Template\s*$", body, re.M):
        skill["templateInSkill"] = True
    return skill


def library(folder):
    found = {}
    if folder:
        for f in sorted(Path(folder).rglob("*.md")):
            meta, _ = frontmatter(f.read_text(encoding="utf-8"))
            if meta.get("name"):
                found[meta["name"]] = f
    return found


def plugin_skill_file(sid, lib):
    """Where to read a plugin skill's name, once the slug list says it is one.

    The sibling path is only a place to read the file when this copy still sits
    in the plugin. It is not how a skill is classified.
    """
    sibling = HERE.parents[2] / sid / "SKILL.md"
    if sibling.is_file():
        return sibling
    return lib.get(sid)


def parse_handoff(line, by_name):
    """by_name maps a bot's name, lowercased, to its id. You and Every bot are ends too."""
    match = re.match(r"^(.+?) to (.+?):\s*(.*)$", line.strip())
    if not match:
        return {"error": f"Handoffs: \"{line}\" isn't in the shape <from> to <to>: <what passes>. How: <how>. Waits: <whether it waits>."}
    rest = match.group(3).strip()
    waits, how = "", ""
    waits_match = re.search(r"\s+Waits:\s*(.*)$", rest)
    if waits_match:
        waits = waits_match.group(1).strip().rstrip(".")
        rest = rest[:waits_match.start()].strip()
    how_match = re.search(r"\s+How:\s*(.*)$", rest)
    if how_match:
        how = how_match.group(1).strip().rstrip(".")
        rest = rest[:how_match.start()].strip()
    ends, names = [], []
    for end in (match.group(1).strip(), match.group(2).strip()):
        if end.lower() in by_name:
            ends.append(by_name[end.lower()])
            names.append(end)
        elif end.lower() in HANDOFF_ENDS:
            ends.append(HANDOFF_ENDS[end.lower()])
            names.append(HANDOFF_ENDS[end.lower()])
        else:
            return {"error": f"Handoffs: \"{end}\" isn't a block under Your team, You, or Every bot"}
    return {"handoff": {
        "from": ends[0], "to": ends[1],
        "fromName": names[0], "toName": names[1],
        "what": rest.strip().rstrip("."), "how": how, "waits": waits,
        "waitsInferred": not waits,
    }}


# ---------- the map's data ----------

def body_of(spec, skills_dir):
    team = spec["Your team"]
    work = spec["Your workflows"]
    role = spec["Your role"]["fields"]
    info = spec["Updated"]["fields"]
    lib = library(skills_dir)

    bots = []
    for e in team["entries"]:
        f = e["fields"]
        name = e["name"].replace("<", "").replace(">", "") if e["blank"] else e["name"]
        connectors = value(f.get("Connectors", ""))
        bots.append({
            "id": slug(name), "name": name, "blank": e["blank"],
            "type": value(f.get("Type", "")).lower(),
            "blueprint": value(f.get("Blueprint", "")).lower() in ("yes", "true"),
            "modelBot": value(f.get("Model bot", "")),
            "botTemplate": value(f.get("Bot template", "")),
            "skills": [slug(s) for s in re.split(r",\s*", value(f.get("Skills", ""))) if s.strip()],
            "connectors": connectors,
            "connectorsInferred": not connectors,
            "systems": [] if not connectors or connectors.lower().startswith("none") else [
                part.strip() for part in re.split(r",\s*", connectors) if part.strip()
            ],
        })
    for b in bots:
        if b["type"] and b["type"] not in TYPE_LABEL:
            sys.exit(f"Your team: {b['name']} has type {b['type']}. Type is manager, owner, specialist, or builder.")
    by_name = {b["name"].lower(): b["id"] for b in bots}
    verifier = value(team["fields"].get("Who verifies", ""))
    if verifier:
        v = next((b for b in bots if b["name"].lower() == verifier.lower()), None)
        if not v:
            sys.exit(f"Your team: Who verifies names {verifier}, which isn't a block under Your team")
        if v["type"] not in ("specialist", "manager"):
            sys.exit(f"Your team: Who verifies must be a specialist or manager bot, and {verifier} is {v['type'] or 'not typed yet'}")

    workflows = {}
    for e in work["entries"]:
        if e["blank"]:
            continue
        f = e["fields"]
        sid = slug(value(f.get("Skill", "")) or e["name"])
        runs_on = value(f.get("Runs on", ""))
        template = value(f.get("Template", ""))
        if runs_on and runs_on.lower() not in by_name:
            sys.exit(f"Your workflows: {e['name']} runs on {runs_on}, which isn't a block under Your team")
        if template and not TEMPLATE_LOCATION.search(template):
            sys.exit(f"Your workflows: {e['name']}'s template must be a location, such as \"in the skill\", a Grok Bot document or canvas id, or a link and its connector, never its content")
        workflows[sid] = {"template": template, "owner": value(f.get("Template owner", "")), "runsOn": runs_on}
        if runs_on:
            owner = next(b for b in bots if b["id"] == by_name[runs_on.lower()])
            if sid not in owner["skills"]:
                owner["skills"].append(sid)

    ids = []
    for b in bots:
        for s in b["skills"]:
            if s not in ids:
                ids.append(s)
    skills = []
    for sid in ids:
        if sid in PLUGIN_SKILL_SLUGS:
            plugin = plugin_skill_file(sid, lib)
            if plugin:
                s = read_skill(plugin, steps_too=False)
            else:
                s = {"id": sid, "name": sid, "description": "", "type": "", "phases": [], "load": "", "verify": "", "record": "", "handOff": "", "steps": []}
            s.update(source="plugin", steps=[], load="", verify="", record="", handOff="")
        elif sid in lib:
            s = read_skill(lib[sid])
            s["source"] = "library"
        else:
            warnings.append(f"skill {sid}: the spec names it, but it isn't in the skill library yet")
            s = {"id": sid, "name": sid, "description": "", "type": "", "phases": [], "source": "not found", "load": "", "verify": "", "record": "", "handOff": "", "steps": []}
        w = workflows.get(sid, {})
        in_skill = s.pop("templateInSkill", False)
        s["templateLocation"] = w.get("template") or ("In the skill" if in_skill else "")
        s["templateOwner"] = w.get("owner", "")
        skills.append(s)

    systems = []
    for e in spec["Systems of record"]["entries"]:
        f = e["fields"]
        how = f.get("How to read", "")
        systems.append({
            "name": e["name"].replace("<", "").replace(">", "") if e["blank"] else e["name"],
            "blank": e["blank"],
            "connector": value(f.get("Connector", "")), "holds": value(f.get("Holds", "")),
            "uniqueId": value(f.get("Unique ID", "")), "recordFor": value(f.get("System of record for", "")),
            "howToRead": value(how) if "How to read" in f else "",
            "howToReadInferred": False,
        })
    known = {s["name"].lower() for s in systems} | {s["connector"].lower() for s in systems if s["connector"]}
    for b in bots:
        for sid in b["skills"]:
            s = next(x for x in skills if x["id"] == sid)
            for st in s["steps"]:
                for u in st["uses"]:
                    if "uses" in st.get("inferred", []) or use_is_known(u, known):
                        continue
                    if not b["connectorsInferred"]:
                        warnings.append(f"skill {sid}, step {st['name']}: uses {u}, which isn't under Systems of record")

    handoffs = []
    for line in team["lists"].get("Handoffs", []):
        parsed = parse_handoff(line, by_name)
        if parsed.get("error"):
            sys.exit(parsed["error"])
        handoffs.append(parsed["handoff"])

    routines = []
    if "Routines" in spec:
        for e in spec["Routines"]["entries"]:
            if e["blank"]:
                continue
            f = e["fields"]
            schedule = value(f.get("Schedule", "") or f.get("Trigger", ""))
            routines.append({
                "name": e["name"],
                "schedule": schedule,
                "scheduleInferred": not schedule,
                "skill": value(f.get("Skill", "")),
                "skillInferred": not value(f.get("Skill", "")),
                "prompt": value(f.get("Prompt", "")),
                "promptInferred": not value(f.get("Prompt", "")),
                "relayedBy": value(f.get("Relayed by", "")),
                "relayedByInferred": False,
                "runsPerWeek": value(f.get("Runs per week", "")),
            })

    return {
        "spec": {"version": value(info.get("Version", "")), "date": value(info.get("Date", "")), "changeLog": value(info.get("Change log", ""))},
        "role": {"role": value(role.get("Role", "")), "outcomes": value(role.get("Business outcomes and KPIs", "")),
                 "unit": value(role.get("Unit of work", "")), "howMany": value(role.get("How many you carry", "")),
                 "timeZone": value(role.get("Home time zone", ""))},
        "voiceSkill": value(work["fields"].get("Writing voice skill", "")),
        "verifier": by_name.get(verifier.lower(), "") if verifier else "",
        "bots": bots, "skills": skills, "handoffs": handoffs, "systems": systems,
        "routines": routines,
    }


def compare(now, before):
    """Marks what the proposal adds, changes and removes, and returns how many of each."""
    counts = {"added": 0, "changed": 0, "removed": 0}

    def mark(items, old_items, key, fields, label, nested=None):
        old = {key(x): x for x in old_items}
        new_keys = {key(x) for x in items}
        for x in items:
            o = old.get(key(x))
            if o is None:
                x["change"] = "added"
                counts["added"] += 1
                continue
            was = [f"{name}: {fmt(o[f])}" for f, name in fields if o[f] != x[f]]
            if nested:
                nested(x, o)
            if was or any(c.get("change") for c in x.get("steps", [])):
                x["change"], x["was"] = "changed", was
                counts["changed"] += 1
        for o in old_items:
            if key(o) not in new_keys:
                items.append(dict(o, change="removed"))
                counts["removed"] += 1

    def fmt(v):
        return ", ".join(v) if isinstance(v, list) else ("yes" if v is True else "no" if v is False else (v or "empty"))

    def steps(x, o):
        old = {s["name"]: s for s in o["steps"]}
        for s in x["steps"]:
            p = old.get(s["name"])
            if p is None:
                s["change"] = "added"
            else:
                was = [f"{n}: {fmt(p[f])}" for f, n in (
                    ("does", "Does"), ("pullsFrom", "Pulls from"), ("uses", "Uses"),
                    ("produces", "Produces"), ("handsTo", "Hands to"), ("template", "Template"),
                    ("review", "Your review"),
                ) if p.get(f) != s.get(f)]
                if was:
                    s["change"], s["was"] = "changed", was
        names = {s["name"] for s in x["steps"]}
        x["steps"] += [dict(s, change="removed") for s in o["steps"] if s["name"] not in names]

    if now["verifier"] != before["verifier"]:
        names = {b["id"]: b["name"] for b in before["bots"]}
        now["verifierWas"] = names.get(before["verifier"], "") or "empty"
        counts["changed"] += 1
    # Group by from/to, then match each route on its own. An exact route stays
    # put, and a leftover pair is an edit, so one route is a change rather than
    # a removal plus an addition. Two routes between the same bots stay distinct.
    def mark_handoffs(items, old_items):
        fields = (("what", "What passes"), ("how", "How"), ("waits", "Waits"))

        def grouped(rows):
            out = {}
            for h in rows:
                out.setdefault((h["from"], h["to"]), []).append(h)
            return out

        new_groups = grouped(items)
        old_groups = grouped(old_items)
        for pair in old_groups:
            new_groups.setdefault(pair, [])
        for pair, new_rows in new_groups.items():
            pool = list(old_groups.get(pair, []))
            pending = []
            for h in new_rows:
                exact = next((o for o in pool if o["what"] == h["what"] and o["how"] == h["how"] and o.get("waits") == h.get("waits")), None)
                if exact is not None:
                    pool.remove(exact)
                else:
                    pending.append(h)

            # Among unpaired old routes: highest what-similarity (an exact what
            # is 1.0), then the same how, then list order. The closest pair is
            # taken first, and each old route pairs once.
            def rank(h, o, oi, pi):
                return (
                    -difflib.SequenceMatcher(None, h["what"], o["what"]).ratio(),
                    0 if o["how"] == h["how"] else 1,
                    oi,
                    pi,
                )

            paired = []
            while pending and pool:
                pi, oi = min(
                    ((pi, oi) for pi in range(len(pending)) for oi in range(len(pool))),
                    key=lambda pos: rank(pending[pos[0]], pool[pos[1]], pos[1], pos[0]),
                )
                paired.append((pending.pop(pi), pool.pop(oi)))
            still = pending
            pending = still
            for h, o in paired:
                was = [f"{name}: {fmt(o[f])}" for f, name in fields if o[f] != h[f]]
                if was:
                    h["change"], h["was"] = "changed", was
                    counts["changed"] += 1
            for h in pending:
                h["change"] = "added"
                counts["added"] += 1
            for o in pool:
                items.append(dict(o, change="removed"))
                counts["removed"] += 1

    mark(now["bots"], before["bots"], lambda b: b["id"], (("type", "Type"), ("blueprint", "Blueprint"), ("modelBot", "Model bot"), ("botTemplate", "Bot template"), ("skills", "Skills"), ("connectors", "Connectors")), "bot")
    mark(now["skills"], before["skills"], lambda s: s["id"], (("description", "Description"), ("templateLocation", "Template"), ("templateOwner", "Template owner")), "skill", steps)
    mark_handoffs(now["handoffs"], before["handoffs"])
    mark(now["systems"], before["systems"], lambda s: s["name"], (("connector", "Connector"), ("holds", "Holds"), ("uniqueId", "Unique ID"), ("recordFor", "System of record for"), ("howToRead", "How to read")), "system")
    return counts


# ---------- writing ----------

def canvas_data(data):
    """Drop runsPerWeek from the canvas payload.

    The value stays on each routine for --json and the document line. The canvas
    file's routine type has no field for it, and that file stays unchanged.
    """
    copied = json.loads(json.dumps(data))
    for key in ("now", "before"):
        body = copied.get(key)
        if not isinstance(body, dict):
            continue
        for routine in body.get("routines") or []:
            routine.pop("runsPerWeek", None)
    return copied


def canvas(data):
    template = CANVAS_TEMPLATE.read_text(encoding="utf-8")
    start, end = template.index(DATA_START), template.index(DATA_END)
    payload = json.dumps(canvas_data(data), ensure_ascii=False, indent=2)
    return template[:start + len(DATA_START)] + " " + payload + " " + template[end:]


def render(template, context):
    """A small Mustache: {{name}}, {{a.b}}, {{.}}, and {{#list}}...{{/list}} or {{^list}}...{{/list}} sections."""
    template = re.sub(r"^[ \t]*(\{\{[#^/][^}]+\}\})[ \t]*\n", r"\1", template, flags=re.M)

    def lookup(name, stack):
        if name == ".":
            return stack[-1]
        for ctx in reversed(stack):
            cur, ok = ctx, True
            for part in name.split("."):
                if isinstance(cur, dict) and part in cur:
                    cur = cur[part]
                else:
                    ok = False
                    break
            if ok:
                return cur
        return ""

    def run(text, stack):
        out, i = [], 0
        for m in re.finditer(r"\{\{([#^])\s*([\w.]+)\s*\}\}", text):
            if m.start() < i:
                continue
            out.append(text[i:m.start()])
            name, depth, j = m.group(2), 1, m.end()
            for t in re.finditer(r"\{\{([#^/])\s*" + re.escape(name) + r"\s*\}\}", text[m.end():]):
                depth += -1 if t.group(1) == "/" else 1
                if depth == 0:
                    inner, j = text[m.end():m.end() + t.start()], m.end() + t.end()
                    break
            val = lookup(name, stack)
            if m.group(1) == "^":
                out.append(run(inner, stack) if not val else "")
            elif isinstance(val, list):
                out.extend(run(inner, stack + [v]) for v in val)
            elif val:
                out.append(run(inner, stack + [val] if isinstance(val, dict) else stack))
            i = j
        out.append(text[i:])
        return re.sub(r"\{\{\s*([\w.]+)\s*\}\}", lambda v: str(lookup(v.group(1), stack)), "".join(out))

    return re.sub(r"\n{3,}", "\n\n", run(template, [context])).strip() + "\n"


def document_view(data):
    body = data["now"]
    proposal = data["proposal"]
    changes = bool(proposal and data["before"])
    names = {b["id"]: b["name"] for b in body["bots"]}

    def filled(v, slot):
        return v if v else f"to fill in: {slot}"

    def mark(x):
        return f" ({x['change']})" if changes and x.get("change") else ""

    def name(x):
        return f"~~{x['name']}~~" if changes and x.get("change") == "removed" else x["name"]

    def was(x):
        return x.get("was", []) if changes and x.get("change") == "changed" else []

    skills = {s["id"]: s for s in body["skills"]}
    bot_views = []
    for b in body["bots"]:
        own = [skills[s] for s in b["skills"] if s in skills]
        bot_views.append({
            "name": name(b), "mark": mark(b), "was": was(b), "blank": b["blank"],
            "typeLabel": TYPE_LABEL.get(b["type"], "Type to fill in"), "blueprint": b["blueprint"],
            "showTemplate": b["blueprint"],
            "modelBot": filled(b["modelBot"], "the first bot of this kind that works"),
            "botTemplate": filled(b["botTemplate"], "the link the model bot exported"),
            "skillsLine": ", ".join(s["name"] for s in own) or "to fill in",
            "systemsLine": b["connectors"] if b.get("connectors") else "Inferred",
            "runs": not (b["blank"] or b["blueprint"] or b["type"] == "owner"),
        })
    library_skills = []
    for s in body["skills"]:
        if s["source"] != "library" or not s["steps"]:
            continue
        library_skills.append({
            "name": name(s), "mark": mark(s), "was": was(s), "description": s["description"],
            "templateLocation": filled(s["templateLocation"], "in the skill, a Grok Bot document or canvas id, or a link and its connector"),
            "templateOwner": s["templateOwner"],
            "reviewsLine": ", ".join(st["name"] for st in s["steps"] if needs_review(st["review"])) or "no step",
            "load": s["load"], "verify": s["verify"], "record": s["record"], "handOff": s["handOff"],
            "steps": [{
                "n": i + 1, "name": name(st), "mark": mark(st), "was": was(st),
                "does": shown_fact(st["does"], "does" in st.get("inferred", [])),
                "pullsFrom": shown_fact(st.get("pullsFrom", ""), "pullsFrom" in st.get("inferred", [])),
                "usesLine": shown_fact(st.get("usesText") or ", ".join(st["uses"]), "uses" in st.get("inferred", [])),
                "produces": shown_fact(st.get("produces", ""), "produces" in st.get("inferred", [])),
                "handsTo": shown_fact(st.get("handsTo", ""), "handsTo" in st.get("inferred", [])),
                "template": st.get("template") or "",
                "review": shown_fact(st["review"], "review" in st.get("inferred", [])),
            } for i, st in enumerate(s["steps"])],
        })
    spec = body["spec"]
    return {
        "proposal": {"title": ("Proposed change" if data["before"] else "Proposed team"), "summary": proposal["summary"]} if proposal else None,
        "specLine": "".join([f", version {spec['version']}" if spec["version"] else "", f", {spec['date']}" if spec["date"] else ""]),
        "role": {k: filled(v, slot) for (k, v), slot in zip(body["role"].items(), ["your role", "what you drive, and how it's measured", "what you manage", "how many", "your home time zone"])},
        "verifier": names.get(body["verifier"], "") or "to fill in: the specialist or manager bot that checks work when a bot can't start a fresh checker",
        "verifierWas": body.get("verifierWas", "") if changes else "",
        "runs": [b for b in bot_views if b["runs"]],
        "units": [b for b in bot_views if not b["runs"]],
        "bots": [b for b in bot_views if not b["blank"]],
        "handoffs": [{"line": (
            f"{names.get(h['from'], h['from'])} to {names.get(h['to'], h['to'])}: {h['what']}"
            + (f" ({h['how']})" if h["how"] else "")
            + f". Waits: {shown_fact(h.get('waits', ''), h.get('waitsInferred'))}"
        ), "mark": mark(h), "was": was(h)} for h in body["handoffs"]],
        "systems": [{"name": name(s), "mark": mark(s), "was": was(s), "connector": filled(s["connector"], "its connector"),
                     "uniqueId": filled(s["uniqueId"], "what finds one unit"), "recordFor": filled(s["recordFor"], "the facts it settles"),
                     "howToRead": s.get("howToRead") or ""} for s in body["systems"]],
        "routines": [routine_line(r) for r in body.get("routines", [])],
        "librarySkills": library_skills,
        "sharedSkillsLine": ", ".join(s["name"] for s in body["skills"] if s["source"] == "library" and not s["steps"]),
        "pluginSkillsLine": ", ".join(s["name"] for s in body["skills"] if s["source"] == "plugin"),
        "missingSkillsLine": ", ".join(s["id"] for s in body["skills"] if s["source"] == "not found"),
    }


def dotted(text):
    text = (text or "").strip()
    if not text:
        return ""
    return text if text[-1] in ".!?" else text + "."


def routine_line(routine):
    parts = [
        f"**{routine['name']}.**",
        f"Schedule: {dotted(shown_fact(routine['schedule'], routine['scheduleInferred']))}",
        f"Skill: {dotted(shown_fact(routine['skill'], routine['skillInferred']))}",
        f"Prompt: {dotted(shown_fact(routine['prompt'], routine['promptInferred']))}",
    ]
    runs = (routine.get("runsPerWeek") or "").strip()
    if runs:
        parts.insert(2, f"Runs per week: {dotted(runs)}")
    if routine.get("relayedBy"):
        parts.append(f"Relayed by: {dotted(routine['relayedBy'])}")
    return {"line": " ".join(parts)}


def mask_fences(text):
    lines, fence = [], None
    for line in text.splitlines():
        match = re.match(r"^(```+|~~~+)", line)
        if match:
            mark = match.group(1)[0]
            fence = mark if fence is None else (None if fence == mark else fence)
            lines.append("")
        else:
            lines.append("" if fence else line)
    return "\n".join(lines)


def repo_name_at(text, match):
    start, end = match.start(), match.end()
    before = text[start - 1] if start else ""
    after = text[end] if end < len(text) else ""
    if before in "/." or after == "/":
        return False
    # A dotted suffix such as notes.md is a file path. A sentence period is not.
    if after == "." and end + 1 < len(text) and text[end + 1].isalpha():
        return False
    left, right = match.group(1), match.group(2)
    if left.lower() in PATH_WORDS or right.lower() in PATH_WORDS:
        return False
    if left.lower() in REPO_WORDS or right.lower() in REPO_WORDS:
        return False
    if "." in right and right.rsplit(".", 1)[-1] in {"md", "py", "json", "tsx", "txt", "mjs", "png"}:
        return False
    return True


def check_skill_text(path):
    """Library guidance for one skill file. Problems are plain lines, prefixed with the skill slug."""
    text = Path(path).read_text(encoding="utf-8")
    meta, body = frontmatter(text)
    skill_id = meta.get("name") or Path(path).parent.name
    problems = []

    def add(message):
        problems.append(f"skill {skill_id}: {message}")

    kind = skill_type(body)
    description = meta.get("description", "")
    prefix = TYPE_PREFIX.get(kind)
    if not prefix:
        add("type line is missing, so the description cannot be checked")
    else:
        if not description.startswith(prefix):
            add(f"description must start with {prefix!r}")
        if len(description) >= DESCRIPTION_LIMIT:
            add(f"description is {len(description)} characters, which must be under {DESCRIPTION_LIMIT}")
        if not description.endswith("."):
            add("description must end with a period")
        if re.search(r"[.!?]\s+[A-Z]", description):
            add("description must be one sentence")
        if "\u2014" in description or "\u2013" in description:
            add("description has an em dash or an en dash")
    visible = mask_fences(body)
    if "\u2014" in visible or "\u2013" in visible:
        add("body has an em dash or an en dash")
    for index, line in enumerate(visible.splitlines(), 1):
        if SCHEDULE_RE.search(line):
            add(f"line {index} has a schedule or a time. Put that in the routine, not in the skill")
        channel = CHANNEL_RE.search(line)
        if channel:
            add(f"line {index} names channel #{channel.group(1)}. Put that in the team spec")
        if UUID_RE.search(line) or ticket_ids(line):
            add(f"line {index} has a system id. Put that in the team spec")
        for repo in REPO_RE.finditer(line):
            if repo_name_at(line, repo):
                add(f"line {index} names repo {repo.group(0)}. Put that in the team spec")
    folder = Path(path).parent
    for helper in sorted(folder.rglob("*")):
        if not helper.is_file() or helper.name == "SKILL.md":
            continue
        if "__pycache__" in helper.parts or helper.suffix == ".pyc":
            continue
        rel = helper.relative_to(folder).as_posix()
        if rel not in text:
            add(f"helper file is not named by path: {rel}")
    return problems


def ticket_ids(line):
    found = []
    for match in TICKET_RE.finditer(line):
        token = match.group(0)
        if token.split("-", 1)[0] in STANDARD_PREFIXES:
            continue
        found.append(token)
    return found


def check_step_lines(prefix, lines, problems, reviews_by_number=None, step_number=None):
    found = labeled_fields("\n".join(lines))
    for label in STEP_LABELS:
        if label not in found:
            problems.append(f"{prefix}: {label} is missing")
        elif not found[label].strip():
            problems.append(f"{prefix}: {label} is blank")
        elif none_without_reason(found[label]):
            problems.append(f"{prefix}: {label} is none without a reason")
        elif label == "Hands to" and not states_wait(found[label]):
            problems.append(f"{prefix}: Hands to does not say whether it waits")
        for phrase in PLACEHOLDER_PHRASES:
            if phrase in found.get(label, "").lower():
                problems.append(f"{prefix}: {label} is a placeholder")
                break
    prose = "\n".join(line for line in lines if not FIELD_LINE.match(line.strip()))
    review = found.get("Needs your review", "")
    if prose_asks(prose) and re.match(r"none\b", review.strip(), re.I) and not review_excuses_ask(review, reviews_by_number or {}, step_number, prose):
        problems.append(f"{prefix}: the step asks or confirms, but Needs your review says no review")
    uses = found.get("Uses", "")
    if prose_calls_connector(prose) and re.match(r"none\b", uses.strip(), re.I):
        problems.append(f"{prefix}: the step tries or calls a connector, but Uses says none")


def step_title(line):
    bold = re.match(r"^\s*\d+\. \*\*(.+?)\.\*\*", line)
    if bold:
        return bold.group(1).strip()
    plain = re.match(r"^\s*\d+\.\s+(.+)$", line)
    words = re.sub(r"[*_`]+", "", plain.group(1)).split() if plain else []
    return " ".join(words[:6]) if words else "step"


def workflow_step_problems(path):
    """Step fields for every numbered step of a workflow skill."""
    text = Path(path).read_text(encoding="utf-8")
    meta, body = frontmatter(text)
    if skill_type(body) != "workflow skill":
        return []
    problems = []
    skill_id = meta.get("name") or Path(path).parent.name
    steps = re.search(r"^## Steps\n(.*?)(?=^## |\Z)", body, re.M | re.S)
    current, nested = None, None
    blocks = []
    for line in (steps.group(1).splitlines() if steps else []):
        top_step = re.match(r"^(\d+)\. (.*)$", line)
        nested_step = re.match(r"^(\s+)\d+\. (.*)$", line)
        if top_step:
            current = {"number": int(top_step.group(1)), "title": step_title(line), "lines": [line.strip()]}
            blocks.append(current)
            nested = None
        elif nested_step and current is not None:
            nested = {"name": step_title(line), "lines": [line.strip()]}
            current.setdefault("nested", []).append(nested)
        elif line.strip() and current is not None:
            (nested if nested is not None else current)["lines"].append(line.strip())
    if not blocks:
        warnings.append(f"skill {skill_id}: workflow skill has no numbered steps, so its step fields were not checked")
        return problems
    if [block["title"] for block in blocks] != FIVE_STEPS:
        warnings.append(f"skill {skill_id}: its steps are not the five workflow steps. Each numbered step is still checked for fields")
    seen = {}
    ordered = []
    reviews_by_number = {}
    for block in blocks:
        ordered.append((block["title"], block["lines"], block["number"]))
        reviews_by_number[block["number"]] = labeled_fields("\n".join(block["lines"])).get("Needs your review", "")
        for item in block.get("nested", []):
            ordered.append((item["name"], item["lines"], block["number"]))
    for title, lines, number in ordered:
        check_step_lines(f"skill {skill_id}, step {title}", lines, problems, reviews_by_number, number)
        signature = tuple(labeled_fields("\n".join(lines)).get(label, "") for label in STEP_LABELS)
        if all(signature):
            if signature in seen:
                problems.append(f"skill {skill_id}, step {title}: field block repeats {seen[signature]}")
            else:
                seen[signature] = title
    return problems


def check_library(folder):
    warnings.clear()
    problems = []
    if not folder:
        return ["skills folder is missing"]
    root = Path(folder)
    files = sorted(root.glob("*/SKILL.md"))
    if not files:
        files = sorted(path for path in root.rglob("SKILL.md"))
    if not files:
        return [f"{folder}: no SKILL.md files"]
    seen = set()
    for path in files:
        if path in seen:
            continue
        seen.add(path)
        problems.extend(check_skill_text(path))
        problems.extend(workflow_step_problems(path))
    return problems


def check_spec_fields(spec):
    problems = []
    team = spec.get("Your team")
    if not team:
        return ["spec: Your team is missing"]
    if "Plugin maintainer" not in team["fields"]:
        problems.append("spec: Plugin maintainer is missing")
    if "Plugin delivery" not in team["fields"]:
        problems.append("spec: Plugin delivery is missing")
    by_name = {}
    for entry in team["entries"]:
        if entry["blank"] or is_slot(entry["name"]):
            continue
        by_name[entry["name"].lower()] = slug(entry["name"])
        fields = entry["fields"]
        connectors = fields.get("Connectors")
        if connectors is None:
            problems.append(f"bot {entry['name']}: Connectors is missing")
        elif not connectors.strip():
            problems.append(f"bot {entry['name']}: Connectors is blank")
        elif none_without_reason(connectors):
            problems.append(f"bot {entry['name']}: Connectors is none without a reason")
        if entry["name"].lower() == "team builder" and "Plugin version applied" not in fields:
            problems.append("bot Team Builder: Plugin version applied is missing")
    for line in team["lists"].get("Handoffs", []):
        parsed = parse_handoff(line, by_name)
        if parsed.get("error"):
            problems.append(parsed["error"])
            continue
        handoff = parsed["handoff"]
        who = f"{handoff.get('fromName', handoff['from'])} to {handoff.get('toName', handoff['to'])}"
        if handoff["waitsInferred"]:
            problems.append(f"handoff {who}: Waits is missing")
        elif none_without_reason(handoff["waits"]):
            problems.append(f"handoff {who}: Waits is none without a reason")
    routines = spec.get("Routines")
    if routines is None:
        problems.append("spec: Routines is missing")
    else:
        for entry in routines["entries"]:
            if entry["blank"] or is_slot(entry["name"]):
                continue
            fields = entry["fields"]
            schedule = (fields.get("Schedule") or fields.get("Trigger") or "").strip()
            if not schedule:
                problems.append(f"routine {entry['name']}: schedule is missing")
            skill = fields.get("Skill", "").strip()
            if not skill:
                problems.append(f"routine {entry['name']}: Skill is missing")
            prompt = fields.get("Prompt", "").strip()
            if not prompt:
                problems.append(f"routine {entry['name']}: Prompt is missing")
            warn_runs_per_week(entry["name"], fields)
    systems = spec.get("Systems of record")
    if systems:
        for entry in systems["entries"]:
            if entry["blank"] or is_slot(entry["name"]):
                continue
            fields = entry["fields"]
            for key in ("Connector", "Holds", "Unique ID", "System of record for"):
                if not fields.get(key, "").strip():
                    problems.append(f"system {entry['name']}: {key} is missing")
            if "How to read" in fields:
                how = fields["How to read"].strip()
                if not how:
                    problems.append(f"system {entry['name']}: How to read is blank")
                elif none_without_reason(how):
                    problems.append(f"system {entry['name']}: How to read is none without a reason")
    return problems


RUNS_PER_WEEK_RE = re.compile(r"(?i)^(?:about\s+)?\d+\b")


def warn_runs_per_week(name, fields):
    """A missing or non-numeric count is a warning. It does not fail the check."""
    text = fields.get("Runs per week", "").strip()
    if not text:
        warnings.append(f"routine {name}: Runs per week is missing. Count it from the trigger")
        return
    if not RUNS_PER_WEEK_RE.match(text):
        warnings.append(
            f"routine {name}: Runs per week should start with a number, such as 5 or about 3"
        )


def run_check(spec_path, skills_dir):
    problems = []
    # Library check clears warnings, so it runs first and a spec warning still prints.
    if skills_dir:
        problems.extend(check_library(skills_dir))
    if spec_path:
        problems.extend(check_spec_fields(read_spec(spec_path)))
    if not spec_path and not skills_dir:
        problems.append("say what to check: --spec, --skills, or both")
    return problems


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--spec")
    ap.add_argument("--skills")
    ap.add_argument("--proposal")
    ap.add_argument("--current")
    ap.add_argument("--current-skills")
    ap.add_argument("--canvas")
    ap.add_argument("--document")
    ap.add_argument("--json")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    if args.check:
        problems = run_check(args.spec, args.skills)
        for warning in warnings:
            print(f"warning: {warning}", file=sys.stderr)
        if problems:
            for problem in problems:
                print(problem)
            sys.exit(1)
        print("Check passed.")
        return
    if not args.spec:
        sys.exit("say which spec to read: --spec")
    if not (args.canvas or args.document or args.json):
        sys.exit("say where to write the map: --canvas, --document, or both")

    now = body_of(read_spec(args.spec), args.skills)
    before = body_of(read_spec(args.current), args.current_skills or args.skills) if args.current else None
    summary = args.proposal
    if before:
        counts = compare(now, before)
        if not summary:
            parts = [f"{k} {v}" for k, v in (("adds", counts["added"]), ("changes", counts["changed"]), ("removes", counts["removed"])) if v]
            summary = f"This proposal {', '.join(parts)}." if parts else "This proposal changes nothing on the map."
    data = {"proposal": {"summary": summary, "against": before["spec"]["version"] if before else ""} if (summary or before) else None, "now": now, "before": before}

    if args.canvas:
        Path(args.canvas).write_text(canvas(data), encoding="utf-8")
    if args.document:
        Path(args.document).write_text(render(DOCUMENT_TEMPLATE.read_text(encoding="utf-8"), document_view(data)), encoding="utf-8")
    if args.json:
        Path(args.json).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for w in warnings:
        print(f"warning: {w}", file=sys.stderr)
    print(f"Team map built from spec {now['spec']['version'] or '(no version yet)'}: {len(now['bots'])} entries, {len(now['skills'])} skills, {len(now['handoffs'])} handoffs" + (", as a proposal" if data["proposal"] else ""))


if __name__ == "__main__":
    main()
