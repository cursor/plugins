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

It exits with an error when the spec can't be read or doesn't hold together, and prints a warning for
anything to fix later, such as a skill the spec names that isn't in the library yet.
"""

import argparse
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
    "build-a-bot",
    "build-my-team",
    "check-my-bots",
    "clean-up-memory",
    "coach-my-bots",
    "delegate-work",
    "explain-how-it-works",
    "inform-manager-bot",
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
TYPE_LABEL = {"builder": "Builder", "manager": "Manager", "owner": "Owner", "specialist": "Specialist"}
TEMPLATE_LOCATION = re.compile(r"in the skill|connector|grok bot (document|canvas)|canvas id|document id|https?://", re.I)

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


def parse_step_text(text):
    review = re.search(r"\*\*Needs your review:\*\*\s*([^.]*)", text)
    uses = re.search(r"\bUses ([^.]+)\.", text)
    template = re.search(r"\bFollows (?:the )?([^.]+? template)\b", text)
    does = re.sub(r"\*\*Needs your review:\*\*.*$", "", text)
    does = re.sub(r"\bUses [^.]+\.", "", does)
    does = re.sub(r"\bFollows (?:the )?[^.]+? template\.?", "", does)
    return {
        "does": re.sub(r"\s+", " ", does).strip(),
        "uses": [u.strip() for u in re.split(r",\s*|\s+and\s+", uses.group(1))] if uses else [],
        "template": template.group(1).strip() if template else "",
        "review": review.group(1).strip()[:1].upper() + review.group(1).strip()[1:] if review else "",
    }


def read_skill(path, steps_too=True):
    meta, body = frontmatter(Path(path).read_text(encoding="utf-8"))
    title = re.search(r"^# (.+)$", body, re.M)
    skill = {
        "id": meta.get("name") or Path(path).parent.name,
        "name": title.group(1).strip() if title else meta.get("name", ""),
        "description": meta.get("description", ""),
        "load": "", "verify": "", "record": "", "handOff": "", "steps": [],
    }
    steps = re.search(r"^## Steps\n(.*?)(?=^## |\Z)", body, re.M | re.S) if steps_too else None
    top, current = [], None
    for line in (steps.group(1).splitlines() if steps else []):
        t = re.match(r"^(\d+)\. \*\*(.+?)\.\*\*\s*(.*)$", line)
        n = re.match(r"^\s+\d+\. \*\*(.+?)\.\*\*\s*(.*)$", line)
        if t:
            current = {"title": t.group(2), "text": t.group(3).strip()}
            top.append(current)
        elif n and current is not None:
            skill["steps"].append(dict(name=n.group(1).strip(), **parse_step_text(n.group(2))))
    titles = [s["title"] for s in top]
    if steps and titles != FIVE_STEPS:
        warnings.append(f"skill {skill['id']}: its steps are {', '.join(titles) or 'missing'}, not the five workflow steps")
    for s in top:
        key = {"Load": "load", "Verify": "verify", "Record": "record", "Hand off": "handOff"}.get(s["title"])
        if key:
            skill[key] = s["text"]
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
        bots.append({
            "id": slug(name), "name": name, "blank": e["blank"],
            "type": value(f.get("Type", "")).lower(),
            "blueprint": value(f.get("Blueprint", "")).lower() in ("yes", "true"),
            "modelBot": value(f.get("Model bot", "")),
            "botTemplate": value(f.get("Bot template", "")),
            "skills": [slug(s) for s in re.split(r",\s*", value(f.get("Skills", ""))) if s.strip()],
            "systems": [],
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
                s = {"id": sid, "name": sid, "description": "", "load": "", "verify": "", "record": "", "handOff": "", "steps": []}
            s.update(source="plugin", steps=[], load="", verify="", record="", handOff="")
        elif sid in lib:
            s = read_skill(lib[sid])
            s["source"] = "library"
        else:
            warnings.append(f"skill {sid}: the spec names it, but it isn't in the skill library yet")
            s = {"id": sid, "name": sid, "description": "", "source": "not found", "load": "", "verify": "", "record": "", "handOff": "", "steps": []}
        w = workflows.get(sid, {})
        in_skill = s.pop("templateInSkill", False)
        s["templateLocation"] = w.get("template") or ("In the skill" if in_skill else "")
        s["templateOwner"] = w.get("owner", "")
        skills.append(s)

    systems = []
    for e in spec["Systems of record"]["entries"]:
        f = e["fields"]
        systems.append({
            "name": e["name"].replace("<", "").replace(">", "") if e["blank"] else e["name"],
            "blank": e["blank"],
            "connector": value(f.get("Connector", "")), "holds": value(f.get("Holds", "")),
            "uniqueId": value(f.get("Unique ID", "")), "recordFor": value(f.get("System of record for", "")),
        })
    known = {s["name"].lower() for s in systems} | {s["connector"].lower() for s in systems if s["connector"]}
    for b in bots:
        for sid in b["skills"]:
            s = next(x for x in skills if x["id"] == sid)
            for st in s["steps"]:
                for u in st["uses"]:
                    if u not in b["systems"]:
                        b["systems"].append(u)
                    if u.lower() not in known:
                        warnings.append(f"skill {sid}, step {st['name']}: uses {u}, which isn't under Systems of record")

    handoffs = []
    for line in team["lists"].get("Handoffs", []):
        m = re.match(r"^(.+?) to (.+?):\s*(.+?)(?:\s*How:\s*(.+?))?\.?$", line)
        if not m:
            sys.exit(f"Handoffs: \"{line}\" isn't in the shape <from bot> to <to bot>: <what passes>. How: <how>.")
        ends = []
        for end in (m.group(1), m.group(2)):
            if end.lower() in by_name:
                ends.append(by_name[end.lower()])
            elif end.lower() in ("you", "every bot"):
                ends.append(end)
            else:
                sys.exit(f"Handoffs: \"{end}\" isn't a block under Your team")
        handoffs.append({"from": ends[0], "to": ends[1], "what": m.group(3).strip().rstrip("."), "how": (m.group(4) or "").strip().rstrip(".")})

    return {
        "spec": {"version": value(info.get("Version", "")), "date": value(info.get("Date", "")), "changeLog": value(info.get("Change log", ""))},
        "role": {"role": value(role.get("Role", "")), "outcomes": value(role.get("Business outcomes and KPIs", "")),
                 "unit": value(role.get("Unit of work", "")), "howMany": value(role.get("How many you carry", "")),
                 "timeZone": value(role.get("Home time zone", ""))},
        "voiceSkill": value(work["fields"].get("Writing voice skill", "")),
        "verifier": by_name.get(verifier.lower(), "") if verifier else "",
        "bots": bots, "skills": skills, "handoffs": handoffs, "systems": systems,
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
                was = [f"{n}: {fmt(p[f])}" for f, n in (("does", "Does"), ("uses", "Uses"), ("template", "Template"), ("review", "Your review")) if p[f] != s[f]]
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
        fields = (("what", "What passes"), ("how", "How"))

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
                exact = next((o for o in pool if o["what"] == h["what"] and o["how"] == h["how"]), None)
                if exact is not None:
                    pool.remove(exact)
                else:
                    pending.append(h)

            def take(rows, field):
                still, pairs = [], []
                for h in rows:
                    match = next((o for o in pool if h[field] == o[field]), None)
                    if match is None:
                        still.append(h)
                    else:
                        pool.remove(match)
                        pairs.append((h, match))
                return still, pairs

            # Leftovers match on what passes, then how, then list order.
            pending, by_what = take(pending, "what")
            pending, by_how = take(pending, "how")
            by_order = list(zip(pending, pool))
            pending, pool = pending[len(by_order):], pool[len(by_order):]
            for h, o in by_what + by_how + by_order:
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

    mark(now["bots"], before["bots"], lambda b: b["id"], (("type", "Type"), ("blueprint", "Blueprint"), ("modelBot", "Model bot"), ("botTemplate", "Bot template"), ("skills", "Skills")), "bot")
    mark(now["skills"], before["skills"], lambda s: s["id"], (("description", "Description"), ("templateLocation", "Template"), ("templateOwner", "Template owner")), "skill", steps)
    mark_handoffs(now["handoffs"], before["handoffs"])
    mark(now["systems"], before["systems"], lambda s: s["name"], (("connector", "Connector"), ("holds", "Holds"), ("uniqueId", "Unique ID"), ("recordFor", "System of record for")), "system")
    return counts


# ---------- writing ----------

def canvas(data):
    template = CANVAS_TEMPLATE.read_text(encoding="utf-8")
    start, end = template.index(DATA_START), template.index(DATA_END)
    payload = json.dumps(data, ensure_ascii=False, indent=2)
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
            "systemsLine": ", ".join(b["systems"]) or "worked out from its skills once they're written",
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
            "reviewsLine": ", ".join(st["name"] for st in s["steps"] if st["review"]) or "no step",
            "load": s["load"], "verify": s["verify"], "record": s["record"], "handOff": s["handOff"],
            "steps": [{
                "n": i + 1, "name": name(st), "mark": mark(st), "was": was(st), "does": st["does"],
                "usesLine": ", ".join(st["uses"]) or "nothing new", "template": st["template"] or "none",
                "review": st["review"] or "runs on its own",
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
        "handoffs": [{"line": f"{names.get(h['from'], h['from'])} to {names.get(h['to'], h['to'])}: {h['what']}" + (f" ({h['how']})" if h["how"] else ""), "mark": mark(h), "was": was(h)} for h in body["handoffs"]],
        "systems": [{"name": name(s), "mark": mark(s), "was": was(s), "connector": filled(s["connector"], "its connector"),
                     "uniqueId": filled(s["uniqueId"], "what finds one unit"), "recordFor": filled(s["recordFor"], "the facts it settles")} for s in body["systems"]],
        "librarySkills": library_skills,
        "sharedSkillsLine": ", ".join(s["name"] for s in body["skills"] if s["source"] == "library" and not s["steps"]),
        "pluginSkillsLine": ", ".join(s["name"] for s in body["skills"] if s["source"] == "plugin"),
        "missingSkillsLine": ", ".join(s["id"] for s in body["skills"] if s["source"] == "not found"),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--spec", required=True)
    ap.add_argument("--skills")
    ap.add_argument("--proposal")
    ap.add_argument("--current")
    ap.add_argument("--current-skills")
    ap.add_argument("--canvas")
    ap.add_argument("--document")
    ap.add_argument("--json")
    args = ap.parse_args()
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
