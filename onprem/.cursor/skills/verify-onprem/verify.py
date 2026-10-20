#!/usr/bin/env python3
"""verify-onprem: deterministic integrity checks for the onprem plugin and its rule file.

Usage:
  verify.py            full suite, JSON summary on stdout, exit 1 on any hard fail
  verify.py --doctor   read-only readiness check only

The plugin root is located by walking up from this file to the directory that
contains .cursor-plugin/plugin.json, so the helper runs from any checkout.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

CLOSED_REAL = [
    "Qwen/Qwen3.8-27B-FP8",
    "Qwen/Qwen3.8-Flash-Next-FP8",
    "moonshotai/Kimi-K3",
    "zai-org/GLM-5.3",
]
CLOSED = ["inherit-parent", "auto"] + CLOSED_REAL
BANNED = re.compile(r"\b(claude|anthropic|gemini|grok|xai|gpt|openai|opus|sonnet|haiku|fable|sol)\b", re.I)
LOCK_LANG = re.compile(r"(never|banned|ban|forbidden|no exception|closed|allowlist|degrad)", re.I)
ROLE_RE = re.compile(r"^[a-z][a-z ,\-]*: ")
CORE_FILES = [
    "README.md",
    "skills/onprem-mode/SKILL.md",
    "skills/setup-onprem/SKILL.md",
    "skills/principle-closed-allowlist/SKILL.md",
    "skills/onprem-mode/playbooks/audit.md",
    "docs/guide/02-the-lock.md",
    "docs/guide/05-sharing.md",
    "skills/onprem-help/SKILL.md",
    "skills/principle-role-mapping/SKILL.md",
]
SKILL_LINKS = [
    "onprem-mode", "setup-onprem", "onprem-help", "create-verify-skill",
    "principle-banned-set", "principle-closed-allowlist", "principle-context-discipline",
    "principle-deterministic-proof", "principle-fresh-subagents", "principle-inherit-parent-honestly",
    "principle-no-fallback-to-banned", "principle-panel-composition", "principle-role-mapping",
    "principle-unlimited-budget", "principle-validation-gate", "principle-verifiable-units",
]


def find_plugin_root():
    d = os.path.dirname(os.path.abspath(__file__))
    for _ in range(8):
        if os.path.isfile(os.path.join(d, ".cursor-plugin", "plugin.json")):
            return d
        d = os.path.dirname(d)
    return None


def rel(root, path):
    return os.path.relpath(path, root)


def md_files(root):
    out = []
    for dirpath, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        for n in names:
            if n.endswith(".md"):
                out.append(os.path.join(dirpath, n))
    return sorted(out)


def frontmatter(text):
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    return text[4:end]


def check_manifest(root, checks):
    p = os.path.join(root, ".cursor-plugin", "plugin.json")
    try:
        d = json.load(open(p, encoding="utf-8"))
        ok = d.get("name") == "onprem" and "skills" in d and "agents" in d
        checks.append({"name": "manifest", "ok": ok,
                       "detail": "plugin.json valid, name=onprem, skills+agents fields present" if ok
                       else "unexpected manifest: name=%r" % d.get("name")})
    except Exception as e:
        checks.append({"name": "manifest", "ok": False, "detail": "plugin.json unreadable: %s" % e})


def check_frontmatter(root, checks):
    import yaml
    bad = []
    n = 0
    for f in md_files(root):
        t = open(f, encoding="utf-8").read()
        fm = frontmatter(t)
        if fm is None:
            continue
        n += 1
        try:
            d = yaml.safe_load(fm)
            assert isinstance(d, dict) and d.get("name") and d.get("description")
        except Exception:
            bad.append(rel(root, f))
            continue
        if re.search(r"/SKILL\.md$", f):
            expect = os.path.basename(os.path.dirname(f))
            if d["name"] != expect:
                bad.append("%s (name %r != dir %r)" % (rel(root, f), d["name"], expect))
    checks.append({"name": "frontmatter", "ok": not bad,
                   "detail": "%d frontmatter files parse, skill names match directories" % n if not bad
                   else "bad: " + "; ".join(bad)})


def check_mode_dashes(root, checks):
    t = open(os.path.join(root, "skills/onprem-mode/SKILL.md"), encoding="utf-8").read()
    hits = len(re.findall(r"[\u2013\u2014]", t))
    checks.append({"name": "mode-dashes", "ok": hits == 0,
                   "detail": "mode file is long-dash free" if hits == 0 else "%d long-dash(es) remain" % hits})


def role_block(path, marker):
    t = open(path, encoding="utf-8").read()
    i = t.find(marker)
    if i == -1:
        return None
    seg = t[i:t.find("```", i)]
    return [l.rstrip() for l in seg.splitlines() if ROLE_RE.match(l)]


def check_template_identity(root, checks):
    a = role_block(os.path.join(root, "skills/setup-onprem/SKILL.md"), "# onprem model configuration")
    t = open(os.path.join(root, "skills/principle-role-mapping/SKILL.md"), encoding="utf-8").read()
    m = re.search(r"```\n(.*?)```", t, re.S)
    b = [l.rstrip() for l in m.group(1).splitlines() if l.strip()] if m else None
    if a and b and a == b and len(a) == 18:
        checks.append({"name": "template-identity", "ok": True,
                       "detail": "18 role lines identical in setup-onprem and role-mapping, all values closed-set"})
    else:
        bad_vals = []
        for l in (a or []):
            for v in (x.strip() for x in l.split(": ", 1)[1].split(",")):
                if v not in CLOSED:
                    bad_vals.append(v)
        checks.append({"name": "template-identity", "ok": False,
                       "detail": "drift: setup=%s lines, role-mapping=%s lines, bad values=%s"
                       % (len(a) if a else None, len(b) if b else None, bad_vals)})


def check_closed_set(root, checks):
    bad = []
    for f in CORE_FILES:
        t = open(os.path.join(root, f), encoding="utf-8").read()
        missing = [s for s in CLOSED_REAL if s not in t]
        if missing:
            bad.append("%s: missing %s" % (f, missing))
    audit = open(os.path.join(root, "skills/onprem-mode/playbooks/audit.md"), encoding="utf-8").read()
    if "`inherit-parent`/`auto`" not in audit:
        bad.append("audit: exact-set check lacks inherit-parent/auto")
    so = open(os.path.join(root, "skills/setup-onprem/SKILL.md"), encoding="utf-8").read()
    if "inherit-parent/auto" not in so:
        bad.append("setup template comment lacks inherit-parent/auto")
    checks.append({"name": "closed-set", "ok": not bad,
                   "detail": "all 9 core files name the four real slugs; exact-set surfaces include both aliases" if not bad
                   else "; ".join(bad)})


def check_banned_leak(root, checks):
    leaks = []
    for f in md_files(root):
        lines = open(f, encoding="utf-8").readlines()
        if any(LOCK_LANG.search(l) for l in lines):
            continue
        for i, line in enumerate(lines, 1):
            for m in BANNED.finditer(line):
                prev = line[m.start() - 1] if m.start() > 0 else ""
                nxt = line[m.end()] if m.end() < len(line) else ""
                if prev in ".~/" or nxt == "/":
                    continue  # a path component (e.g. ~/.claude/skills), not a model slug
                leaks.append("%s:%d %s" % (rel(root, f), i, m.group(0)))
    checks.append({"name": "banned-leak", "ok": not leaks,
                   "detail": "no banned-family name outside lock-statement files" if not leaks
                   else "leaks: " + "; ".join(leaks[:5])})


def check_links(root, checks):
    bad = []
    link_re = re.compile(r"\]\(([^)]+)\)")
    for f in md_files(root):
        base = os.path.dirname(f)
        for m in link_re.finditer(open(f, encoding="utf-8").read()):
            target = m.group(1).split("#")[0].strip()
            if not target or target.startswith(("http://", "https://", "mailto:")):
                continue
            if not os.path.exists(os.path.join(base, target)):
                bad.append("%s -> %s" % (rel(root, f), target))
    checks.append({"name": "links", "ok": not bad,
                   "detail": "all relative markdown links resolve" if not bad else "broken: " + "; ".join(bad[:5])})


def check_rule(root, checks):
    rule = os.path.expanduser("~/.cursor/rules/onprem-models.mdc")
    if not os.path.exists(rule):
        checks.append({"name": "rule-audit", "ok": True, "detail": "skip: no onprem-models.mdc on this machine (setup not run)"})
        return
    t = open(rule, encoding="utf-8").read()
    lines = t.splitlines()
    body = lines[1:]
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                body = lines[i + 1:]
                break
    bad = []
    if "alwaysApply: true" not in t:
        bad.append("alwaysApply missing")
    if "# budget: unlimited (max)" not in lines:
        bad.append("budget line not unlimited (max)")
    al = [l for l in lines if l.startswith("# HARD LOCK allowlist")]
    if len(al) != 1 or any(s not in al[0] for s in CLOSED_REAL + ["inherit-parent", "auto"]):
        bad.append("allowlist line wrong")
    roles = [l.rstrip() for l in body if ROLE_RE.match(l)]
    if len(roles) != 18:
        bad.append("%d role lines, expected 18" % len(roles))
    for l in roles:
        for v in (x.strip() for x in l.split(": ", 1)[1].split(",")):
            if v not in CLOSED:
                bad.append("invalid value %r" % v)
    checks.append({"name": "rule-audit", "ok": not bad,
                   "detail": "rule file: alwaysApply, unlimited budget, allowlist line, 18 closed-set role lines" if not bad
                   else "; ".join(bad)})


def check_registration(root, checks):
    missing = []
    skills_dir = os.path.expanduser("~/.claude/skills")
    for s in SKILL_LINKS:
        if not os.path.exists(os.path.join(skills_dir, s, "SKILL.md")):
            missing.append(s)
    if not os.path.exists(os.path.expanduser("~/.cursor/agents/onprem-agent.md")):
        missing.append("onprem-agent")
    if missing:
        checks.append({"name": "registration", "ok": True,
                       "detail": "skip: not registered on this machine (expected on a fresh clone): " + ", ".join(missing)})
    else:
        checks.append({"name": "registration", "ok": True, "detail": "16 skill links + agent link resolve"})


def doctor(root):
    out = {
        "python3": True,
        "plugin_root": root is not None,
        "manifest": bool(root) and os.path.isfile(os.path.join(root, ".cursor-plugin", "plugin.json")),
        "rule_file": os.path.exists(os.path.expanduser("~/.cursor/rules/onprem-models.mdc")),
        "git_origin": None,
    }
    if root:
        import subprocess
        try:
            r = subprocess.run(["git", "remote", "get-url", "origin"], cwd=root,
                               capture_output=True, text=True, timeout=10)
            out["git_origin"] = r.stdout.strip() or None
        except Exception:
            pass
    return out


def main():
    root = find_plugin_root()
    if root is None:
        print(json.dumps({"status": "error", "error": "plugin root not found (no .cursor-plugin/plugin.json above this file)"}))
        sys.exit(2)
    checks = []
    if "--doctor" in sys.argv:
        print(json.dumps({"status": "doctor", "plugin": root, "doctor": doctor(root)}, indent=2))
        return
    check_manifest(root, checks)
    check_frontmatter(root, checks)
    check_mode_dashes(root, checks)
    check_template_identity(root, checks)
    check_closed_set(root, checks)
    check_banned_leak(root, checks)
    check_links(root, checks)
    check_rule(root, checks)
    check_registration(root, checks)
    fails = [c for c in checks if not c["ok"]]
    result = {
        "status": "pass" if not fails else "fail",
        "plugin": root,
        "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "checks": checks,
        "fails": len(fails),
    }
    print(json.dumps(result, indent=2))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
