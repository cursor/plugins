"""Per-host pstack profiles: validation and host switching.

`.pstack/host.json` and `.pstack/models.md` describe one host's session, and they are
the active profile for the host the receipt names. Switching hosts saves that pair
under `.pstack/hosts/<host>/` and restores the new host's saved pair, so a project
opened by Claude Code and later by Codex keeps each host's configuration instead of
one host reading the other's.
"""
from __future__ import annotations

import json
import re
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

from .hosts import ALIASES, HOSTS

PROFILE_FILES = ("host.json", "models.md")
CAPABILITIES = ("DELEGATE", "PARALLEL", "MODEL_CHOICE", "BACKGROUND", "ASK", "TODO",
                "MCP", "TRANSCRIPTS", "TRIGGER", "CHANNEL")
SOURCES = ("observed", "default")
CLASSES = {"deep", "fast", "balanced", "inherit", "inherit-parent", "auto"}
ROLES = {"feature", "refactoring", "bug-fix", "perf-issue", "hillclimb", "judgment-and-prose",
         "hardest-tasks", "how-explorer", "how-explainer", "why-investigators", "why-synthesizer",
         "reflect-tooling", "reflect-judgment", "arena-runners", "arena-cross-judge",
         "swarm-workers", "architect-runners", "interrogate-reviewers", "comment-sicko"}
# The list length is the fan-out width, so one entry collapses the panel to one delegate.
PANEL_FLOOR = {"arena-runners": 2, "architect-runners": 2, "interrogate-reviewers": 2}
VENDORS = {
    "anthropic": re.compile(r"^(opus|sonnet|haiku|fable)\b|^claude-", re.I),
    "openai": re.compile(r"^(gpt|o\d|codex)", re.I),
    "another vendor's": re.compile(r"^(grok|gemini|llama|mistral|deepseek|qwen)", re.I),
}
# Hosts that address one vendor's models. Tier 3 needs different model families.
HOST_VENDOR = {"claude": "anthropic", "codex": "openai"}


@dataclass
class Report:
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    # Models a session addressed, from host.json `available_models`. None: no list recorded.
    available: Optional[set] = None
    # Concrete model -> every place it is configured, reported once by report_models().
    unverified: dict = field(default_factory=dict)


def host_key(name) -> Optional[str]:
    if not isinstance(name, str):
        return None
    key = ALIASES.get(name, name)
    return key if key in HOSTS else None


def tier_from(values: dict) -> int:
    d, p = values.get("DELEGATE") is True, values.get("PARALLEL") is True
    m = values.get("MODEL_CHOICE") is True
    return 3 if d and p and m else 2 if d and p else 1 if d else 0


def check_model(host: str, model: str, where: str, rep: Report) -> None:
    name = model.split()[0] if model.split() else model
    if name in CLASSES:
        return
    own = HOST_VENDOR.get(host)
    vendor = next((v for v, rx in VENDORS.items() if rx.search(name)), None)
    if own and vendor and vendor != own:
        rep.errors.append(f"{where}: `{model}` is {'an' if vendor[0] in 'aeiou' else 'a'} {vendor} model, "
                          f"which {HOSTS[host].label} cannot address")
    elif host == "generic":
        rep.warnings.append(f"{where}: `{model}` is a model name. On an unknown host every class "
                            "resolves to inherit until a model has been addressed")
    elif rep.available is None or name not in rep.available:
        rep.unverified.setdefault(model, []).append(where)


def _places(wheres: List[str]) -> str:
    """`a:21`, `a:23`, `b models.panel` -> `a:21, 23; b models.panel`."""
    groups: dict = {}
    for w in wheres:
        path, sep, line = w.rpartition(":")
        key, item = (path, line) if sep and line.isdigit() else (w, None)
        groups.setdefault(key, [])
        if item and item not in groups[key]:
            groups[key].append(item)
    return "; ".join(f"{k}:{', '.join(v)}" if v else k for k, v in groups.items())


def report_models(rep: Report) -> None:
    """One warning per unverified model, naming every place it is configured."""
    for model, wheres in rep.unverified.items():
        at = _places(wheres)
        if rep.available is None:
            rep.warnings.append(f"`{model}` ({at}): availability is unverified. doctor checks configuration, not "
                                "the host's model catalog; setup-pstack records the models a session addressed "
                                "in host.json `available_models`")
        else:
            rep.warnings.append(f"`{model}` ({at}) is not in host.json `available_models`, the models this "
                                "session addressed. Rerun setup-pstack, or replace it with a listed model")
    rep.unverified.clear()


def check_host_json(path: Path, host: str, rep: Report, where: str = ".pstack/host.json") -> None:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        rep.errors.append(f"{where} is not valid JSON ({e})")
        return
    if not isinstance(raw, dict):
        rep.errors.append(f"{where} must be a JSON object")
        return

    declared = raw.get("host")
    key = host_key(declared)
    label = HOSTS[host].label
    if declared == "unknown":
        if host != "generic":
            rep.errors.append(f"{where} records an unknown host, but this install is for {label}")
    elif key is None:
        rep.errors.append(f"{where} names host {declared!r}, which pstack does not know")
    elif key != host:
        rep.errors.append(f"{where} was written by a {HOSTS[key].label} session, but this install is "
                          f"for {label}. Switch with `pstack update --host {key}`, or rerun setup-pstack "
                          f"in a {label} session")

    caps = raw.get("capabilities")
    if not isinstance(caps, dict):
        rep.errors.append(f"{where} has no capabilities object")
        caps = {}
    values, sources, unmarked = {}, {}, []
    for name, entry in caps.items():
        if name not in CAPABILITIES:
            rep.errors.append(f"{where}: unknown capability {name!r}")
            continue
        if isinstance(entry, dict):
            value, source = entry.get("value"), entry.get("source")
            if source not in SOURCES:
                rep.errors.append(f"{where}: capability {name} has source {source!r}, "
                                  "expected observed or default")
            sources[name] = source
        else:
            value = entry
            unmarked.append(name)
        valid = value in (True, False, "partial") if name == "MODEL_CHOICE" else isinstance(value, bool)
        if not valid:
            rep.errors.append(f"{where}: capability {name} has invalid value {value!r}")
            continue
        values[name] = value
    if unmarked:
        rep.warnings.append(f"{where} does not say which capabilities were observed and which are "
                            f"defaults ({', '.join(unmarked)}). Rerun setup-pstack")
    if values.get("MODEL_CHOICE") is True and host in HOST_VENDOR:
        rep.errors.append(f"{where}: MODEL_CHOICE is true, but {label} addresses one vendor's "
                          'models. Record "partial"')

    tier = raw.get("tier")
    want = tier_from(values)
    if isinstance(tier, bool) or not isinstance(tier, int) or not 0 <= tier <= 3:
        rep.errors.append(f"{where}: tier must be a number from 0 to 3, got {tier!r}")
    elif tier != want:
        rep.errors.append(f"{where}: tier {tier} does not follow from the capabilities, which give Tier {want}")
    elif tier > 0:
        guessed = [c for c in ("DELEGATE", "PARALLEL", "MODEL_CHOICE")
                   if sources.get(c) == "default" and values.get(c) is not False]
        if guessed:
            rep.warnings.append(f"{where}: tier {tier} rests on capabilities taken from defaults, "
                                f"not observed in a session: {', '.join(guessed)}")

    available = raw.get("available_models")
    if available is not None:
        if isinstance(available, list) and all(isinstance(m, str) for m in available):
            rep.available = {m.split()[0] for m in available if m.split()}
        else:
            rep.errors.append(f"{where}: available_models must be a list of model names")

    models = raw.get("models", {})
    if not isinstance(models, dict):
        rep.errors.append(f"{where}: models must be an object of class -> model")
        return
    for cls, value in models.items():
        for m in value if isinstance(value, list) else [value]:
            if not isinstance(m, str):
                rep.errors.append(f"{where}: models.{cls} has a non-text entry {m!r}")
            else:
                check_model(host, m, f"{where} models.{cls}", rep)


def check_models_md(path: Path, host: str, rep: Report, where: str = ".pstack/models.md") -> None:
    seen = {}
    for n, line in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        text = line.strip()
        if not text or text.startswith("#"):
            continue
        at = f"{where}:{n}"
        if ":" not in text:
            rep.errors.append(f"{at}: expected `role: value`, got {text[:40]!r}")
            continue
        left, right = text.split(":", 1)
        roles = [r.strip() for r in left.split(",") if r.strip()]
        values = [v.strip() for v in right.split(",") if v.strip()]
        if not values:
            rep.errors.append(f"{at}: {left.strip()} has no value")
            continue
        for role in roles:
            if role in seen:
                rep.errors.append(f"{at}: {role} is already set on line {seen[role]}")
            seen[role] = n
            if role not in ROLES:
                rep.warnings.append(f"{at}: no pstack skill reads the role {role!r}")
            floor = PANEL_FLOOR.get(role)
            if floor and len(values) < floor:
                rep.warnings.append(f"{at}: {role} lists {len(values)} model; the list length is the "
                                    f"fan-out, so this panel has one delegate")
        for v in values:
            if v.startswith("<") and v.endswith(">"):
                rep.errors.append(f"{at}: {v} is a placeholder. Replace it with a real model, or delete the line")
            elif v == "panel":
                rep.errors.append(f"{at}: the bare word `panel` reads as one delegate. List the models")
            else:
                check_model(host, v, at, rep)


def check_profile(target: Path, host: str) -> Report:
    rep = Report()
    base = target / ".pstack"
    if (base / "host.json").is_file():
        check_host_json(base / "host.json", host, rep)
    if (base / "models.md").is_file():
        check_models_md(base / "models.md", host, rep)
    saved = base / "hosts"
    for d in sorted(p for p in saved.iterdir() if p.is_dir()) if saved.is_dir() else []:
        key = host_key(d.name)
        if key is None:
            rep.warnings.append(f".pstack/hosts/{d.name} is saved for a host pstack does not know")
            continue
        sub = Report()
        if (d / "host.json").is_file():
            check_host_json(d / "host.json", key, sub, f".pstack/hosts/{d.name}/host.json")
        if (d / "models.md").is_file():
            check_models_md(d / "models.md", key, sub, f".pstack/hosts/{d.name}/models.md")
        rep.warnings += [f"saved profile, not active: {e}" for e in sub.errors]
    report_models(rep)
    return rep


def summary(target: Path) -> Optional[str]:
    """One line on which capabilities were observed and which are defaults."""
    p = target / ".pstack" / "host.json"
    try:
        caps = json.loads(p.read_text(encoding="utf-8")).get("capabilities", {})
    except (OSError, ValueError, AttributeError):
        return None
    if not isinstance(caps, dict):
        return None
    marked = {n: e.get("source") for n, e in caps.items() if isinstance(e, dict)}
    if not marked:
        return "capabilities not marked observed or default (rerun setup-pstack)"
    seen = sorted(n for n, s in marked.items() if s == "observed")
    assumed = sorted(n for n, s in marked.items() if s == "default")
    return f"observed {', '.join(seen) or 'none'}; defaults {', '.join(assumed) or 'none'}"


def saved_hosts(target: Path) -> List[str]:
    d = target / ".pstack" / "hosts"
    return sorted(p.name for p in d.iterdir() if p.is_dir()) if d.is_dir() else []


def switch(target: Path, old: str, new: str) -> List[str]:
    """Save the active profile for the host that wrote it, and restore `new`'s saved profile."""
    if old == new:
        return []
    base = target / ".pstack"
    notes = []
    for name in PROFILE_FILES:
        active = base / name
        if active.is_file():
            owner = old
            if name == "host.json":
                try:
                    owner = host_key(json.loads(active.read_text(encoding="utf-8")).get("host")) or old
                except (ValueError, AttributeError):
                    pass
            dest = base / "hosts" / owner / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(active, dest)
            active.unlink()
            notes.append(f"saved    .pstack/{name} as .pstack/hosts/{owner}/{name}")
        stored = base / "hosts" / new / name
        if stored.is_file():
            shutil.copy2(stored, active)
            notes.append(f"restored .pstack/hosts/{new}/{name} as .pstack/{name}")
    return notes
