#!/usr/bin/env python3
"""Score one eval run: parse the host transcript, inspect git history, run the hidden oracle.

    python3 evals/analyze.py RUN_DIR [--no-oracle] [--tree DIR] [--no-harness-replay]

Reads RUN_DIR/run.json and RUN_DIR/transcript.jsonl (plus host-session/ subagent transcripts when
run.py found them) and writes RUN_DIR/result.json and RUN_DIR/summary.md.
Every phase-order finding carries the transcript or git evidence it rests on.
"""
import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

EVALS = Path(__file__).resolve().parent
AGENT_TOOLS = {"Agent", "Task"}
EDIT_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
READ_ONLY_AGENTS = {"pstack-reviewer", "Explore", "Plan", "comment-sicko", "claude-code-guide"}
PSTACK_DOC = re.compile(r"(?:^|/)(?:skills|playbooks|pstack-runtime|runtime|personas)/[\w.\-/]*\.md$")
PSTACK_PATH_IN_TEXT = re.compile(r"[\w.~/$\-{}]*(?:skills|playbooks|pstack-runtime)/[\w.$\-/{}]*\.md")
# Executions only: `cat run_tests.py` prints the runner's "FAIL" strings without running anything.
TEST_RUN = re.compile(r"\bpython3?\s+(?:-\S+\s+)*(?:\S*/)?(?:run_tests|test_\w+|\w*_test|verify\w*|repro\w*)\.py"
                      r"|\bpython3?\s+-m\s+(?:pytest|unittest)|(?:^|[\s;&|(])pytest\b|\bmake\s+test\b")
GIT_COMMIT = re.compile(r"\bgit\b(?:\s+-\S+(?:\s+\S+)?)*\s+commit\b")
IMPORTISH = re.compile(r"\b(ImportError|ModuleNotFoundError|AttributeError|NameError|SyntaxError)\b")


# ---------------------------------------------------------------- transcript parsing

def read_jsonl(path):
    events, bad = [], 0
    try:
        with open(path, errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    events.append(json.loads(line))
                except ValueError:
                    bad += 1
    except OSError:
        pass
    return events, bad


def result_text(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(c.get("text", "") for c in content if isinstance(c, dict))
    return ""


def parse_claude(events, actor_of=None, default_actor="parent"):
    """Claude Code stream-json (or a session/subagent JSONL, which shares message.content shapes).

    Returns {"meta", "steps", "texts"} where steps are tool calls in stream order.
    """
    meta = {"init": None, "result": None, "slash_expansion": [], "cwd": None}
    steps, by_id, texts = [], {}, []
    for seq, d in enumerate(events):
        t = d.get("type")
        # Session JSONL files have no init event but stamp cwd on every entry.
        if meta["cwd"] is None and isinstance(d.get("cwd"), str):
            meta["cwd"] = d["cwd"]
        if t == "system" and d.get("subtype") == "init":
            meta["init"] = {k: d.get(k) for k in ("session_id", "model", "cwd", "permissionMode", "claude_code_version")}
        elif t == "result":
            meta["result"] = d
        msg = d.get("message") if isinstance(d.get("message"), dict) else None
        if not msg:
            continue
        parent = d.get("parent_tool_use_id")
        actor = (actor_of(parent) if actor_of and parent else None) or (f"delegate:{parent}" if parent else default_actor)
        content = msg.get("content")
        if t == "user" and isinstance(content, (str, list)):
            text = content if isinstance(content, str) else result_text([c for c in content if c.get("type") == "text"])
            if "<command-name>" in text or "Base directory for this skill:" in text:
                m = re.search(r"Base directory for this skill:\s*(\S+)", text)
                name = re.search(r"<command-name>/?([\w\-:]+)</command-name>", text)
                skill = name.group(1) if name else (m.group(1).rstrip("/").rsplit("/", 1)[-1] if m else None)
                if skill and skill not in [e["skill"] for e in meta["slash_expansion"]]:
                    meta["slash_expansion"].append({"seq": seq, "skill": skill, "base": m.group(1) if m else None})
        if not isinstance(content, list):
            continue
        for c in content:
            if not isinstance(c, dict):
                continue
            if c.get("type") == "tool_use":
                s = {"idx": len(steps), "seq": seq, "ts": d.get("timestamp"), "actor": actor,
                     "id": c.get("id"), "name": c.get("name"), "input": c.get("input") or {},
                     "result": None, "is_error": None}
                steps.append(s)
                by_id[c.get("id")] = s
            elif c.get("type") == "tool_result":
                s = by_id.get(c.get("tool_use_id"))
                if s is not None:
                    s["result"] = result_text(c.get("content"))
                    s["is_error"] = bool(c.get("is_error"))
            elif c.get("type") == "text" and t == "assistant":
                texts.append({"seq": seq, "actor": actor, "text": c.get("text", "")})
    return {"meta": meta, "steps": steps, "texts": texts}


def parse_codex(events):
    """UNVERIFIED shapes from the Codex non-interactive docs: item.* events carrying typed items."""
    steps, texts, usage = [], [], {}
    for seq, d in enumerate(events):
        if d.get("type") == "turn.completed" and isinstance(d.get("usage"), dict):
            for k, v in d["usage"].items():
                if isinstance(v, (int, float)):
                    usage[k] = usage.get(k, 0) + v
        if d.get("type") != "item.completed" or not isinstance(d.get("item"), dict):
            continue
        it = d["item"]
        kind = it.get("type") or it.get("item_type")
        if kind == "command_execution":
            steps.append({"idx": len(steps), "seq": seq, "ts": None, "actor": "parent", "id": it.get("id"),
                          "name": "Bash", "input": {"command": it.get("command", "")},
                          "result": it.get("aggregated_output", ""),
                          "is_error": it.get("exit_code") not in (0, None)})
        elif kind == "file_change":
            for ch in it.get("changes", []) or []:
                steps.append({"idx": len(steps), "seq": seq, "ts": None, "actor": "parent", "id": it.get("id"),
                              "name": "Edit", "input": {"file_path": ch.get("path", "")}, "result": "", "is_error": False})
        elif kind in ("agent_message", "assistant_message"):
            texts.append({"seq": seq, "actor": "parent", "text": it.get("text", "")})
        elif kind:
            steps.append({"idx": len(steps), "seq": seq, "ts": None, "actor": "parent", "id": it.get("id"),
                          "name": kind, "input": {k: v for k, v in it.items() if k not in ("id", "type")},
                          "result": "", "is_error": False})
    return {"meta": {"init": None, "result": None, "slash_expansion": [], "codex_usage": usage},
            "steps": steps, "texts": texts}


def merge_subagents(parsed, session_dir):
    """Fold Claude Code's per-delegate transcripts (host-session/<sid>/subagents) into the step list."""
    sub = None
    if session_dir and session_dir.is_dir():
        found = list(session_dir.glob("*/subagents"))
        sub = found[0] if found else None
    if not sub:
        return 0
    agent_ids = {s["id"]: s for s in parsed["steps"] if s["name"] in AGENT_TOOLS}
    added = 0
    for meta_file in sorted(sub.glob("*.meta.json")):
        try:
            m = json.loads(meta_file.read_text())
        except ValueError:
            continue
        spawn = agent_ids.get(m.get("toolUseId"))
        label = f"delegate:{m.get('agentType')}:{m.get('description')}"
        events, _ = read_jsonl(meta_file.with_name(meta_file.name.replace(".meta.json", ".jsonl")))
        p = parse_claude(events, default_actor=label)
        for s in p["steps"]:
            s["actor"] = label
            s["cwd"] = p["meta"].get("cwd")
            s["spawn_idx"] = spawn["idx"] if spawn else None
            parsed["steps"].append(s)
            added += 1
    parsed["steps"].sort(key=lambda s: (s.get("ts") or "", s["seq"]) if all(x.get("ts") for x in parsed["steps"]) else (0, 0))
    for i, s in enumerate(parsed["steps"]):
        s["idx"] = i
    return added


# ---------------------------------------------------------------- classification

def rel(path, cwd):
    p = str(path).strip().strip("'\"")
    if cwd and p.startswith(cwd.rstrip("/") + "/"):
        p = p[len(cwd.rstrip("/")) + 1:]
    p = p[2:] if p.startswith("./") else p
    # A delegate isolated in a Claude Code worktree edits the same project paths under this prefix.
    return re.sub(r"^\.claude/worktrees/[^/]+/", "", p)


def classify(path):
    """code | test | pstack | other, for a path relative to the project root."""
    p = path
    if p.startswith(("/", "~")) or "$" in p:
        return "other"
    if p.startswith((".pstack/", ".claude/", ".agents/", ".github/", ".codex/")):
        return "pstack"
    name = p.rsplit("/", 1)[-1]
    if p.startswith("tests/") or re.match(r"(test_.*|.*_test)\.py$", name) or \
            re.match(r"(verify|repro|harness)\w*\.(py|sh)$", name) or name == "run_tests.py":
        return "test"
    if p.startswith("src/"):
        return "code"
    return "other"


def segments(cmd):
    return [s.strip() for s in re.split(r"&&|\|\||;|\n", cmd) if s.strip()]


def bash_writes(cmd):
    """Paths a shell command plausibly writes. Inferred from its text, never from its effect."""
    out = []
    body = re.sub(r"<<-?\s*['\"]?(\w+)['\"]?\n.*?\n\1\b", "", cmd, flags=re.S)
    for m in re.finditer(r"(?<![0-9&<>])>{1,2}\s*(['\"]?)([^\s'\";&|<>()]+)\1", body):
        if not m.group(2).startswith(("/dev/", "&")):
            out.append(m.group(2))
    for m in re.finditer(r"\btee\s+(?:-a\s+)?([^\s;&|<>]+)", body):
        out.append(m.group(1))
    for seg in segments(body):
        toks = seg.split()
        if toks[:1] == ["sed"] and any(t.startswith("-i") for t in toks[1:]) and len(toks) > 2:
            out.append(toks[-1])
        if toks[:1] in (["cp"], ["mv"]) and len(toks) >= 3:
            out.append(toks[-1])
    for m in re.finditer(r"open\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"][wa]", cmd):
        out.append(m.group(1))
    for m in re.finditer(r"Path\(\s*['\"]([^'\"]+)['\"]\s*\)\.write_(?:text|bytes)", cmd):
        out.append(m.group(1))
    for var, path in re.findall(r"\b(\w+)\s*=\s*(?:pathlib\.)?Path\(\s*['\"]([^'\"]+)['\"]\s*\)", cmd):
        if re.search(r"\b" + re.escape(var) + r"\.write_(?:text|bytes)\(", cmd):
            out.append(path)
    for m in re.finditer(r"^\+\+\+ b/(\S+)", cmd, flags=re.M):
        out.append(m.group(1))
    # Relative paths after a leading `cd` resolve against that directory, not the project root.
    cd = re.match(r"\s*cd\s+(['\"]?)([^\s;&|'\"]+)\1", cmd)
    if cd and cd.group(2) not in (".", "./"):
        out = [p if p.startswith(("/", "~", "$")) else f"{cd.group(2).rstrip('/')}/{p}" for p in out]
    return out


def expand_loops(cmd):
    """Expand `for v in a b c; do ... $v ...` so paths built from the loop variable resolve."""
    m = re.search(r"\bfor\s+(\w+)\s+in\s+([^;\n]+?)\s*;\s*do\b(.*?)\bdone\b", cmd, flags=re.S)
    if not m:
        return cmd
    var, values, body = m.group(1), m.group(2).split(), m.group(3)
    if any(ch in " ".join(values) for ch in "$*`("):
        return cmd
    expanded = "\n".join(re.sub(r"\$\{?" + var + r"\}?", v, body) for v in values)
    return cmd[:m.start()] + expanded + cmd[m.end():]


def rr_commands(cmd):
    """Each run-record.py invocation in a shell command, as (subcommand, text)."""
    found = []
    aliases = set(re.findall(r"\b(\w+)=['\"]?(?:python3?\s+)?\S*run-record\.py", cmd))
    for seg in segments(cmd):
        m = re.search(r"run-record\.py\s+(?:--run\s+\S+\s+)?(\w[\w-]*)(.*)", seg)
        if m and not re.match(r"^\w+=['\"]?(?:python3?\s+)?\S*run-record\.py['\"]?$", seg):
            found.append((m.group(1), seg))
            continue
        for a in aliases:
            m = re.search(r"\$\{?" + a + r"\}?\s+(?:--run\s+\S+\s+)?(\w[\w-]*)(.*)", seg)
            if m:
                found.append((m.group(1), seg))
    return found


def outcome_of(text, is_error):
    """pass | fail | unknown for a test-run's output."""
    t = text or ""
    code = re.search(r"Exit code (\d+)", t)
    if re.search(r"\bFAIL(ED)?\b|\b[1-9]\d* (failing|failed)\b|AssertionError|Traceback", t) or \
            (code and code.group(1) != "0") or is_error:
        return "fail"
    if re.search(r"\bOK\b|\bPASS(ED)?\b|\b\d+ passed\b|\b0 failing\b|\ball .*pass", t, flags=re.I):
        return "pass"
    return "unknown"


def summarize(step):
    i, n = step["input"], step["name"]
    if n == "Bash":
        return i.get("command", "").replace("\n", " ⏎ ")[:200]
    if n in EDIT_TOOLS or n == "Read":
        return i.get("file_path") or i.get("notebook_path") or ""
    if n in AGENT_TOOLS:
        return f"{i.get('subagent_type', '?')}: {i.get('description', '')}"
    if n == "Skill":
        return i.get("skill") or i.get("command") or json.dumps(i)[:120]
    return json.dumps(i)[:160]


def enrich(parsed, default_cwd):
    """Tag every step with what it reads, writes, runs and records."""
    for s in parsed["steps"]:
        s.update(writes=[], pstack_reads=[], test_run=None, commit=False, rr=[])
        n, i = s["name"], s["input"]
        cwd = s.get("cwd") or default_cwd
        if n in EDIT_TOOLS:
            s["writes"].append(rel(i.get("file_path") or i.get("notebook_path") or "", cwd))
        elif n == "Read":
            p = rel(i.get("file_path", ""), cwd)
            if PSTACK_DOC.search(p):
                s["pstack_reads"].append({"path": p, "via": "Read",
                                          "partial": bool(i.get("offset") or i.get("limit"))})
        elif n == "Skill":
            name = i.get("skill") or i.get("command") or ""
            s["pstack_reads"].append({"path": f"{name} (Skill tool)", "via": "Skill", "partial": False})
        elif n == "Bash":
            cmd = i.get("command", "")
            s["writes"] = [rel(p, cwd) for p in bash_writes(cmd)]
            s["rr"] = rr_commands(cmd)
            partial = bool(re.search(r"\bsed\s+-n|\bhead\b|\btail\b", cmd))
            for m in PSTACK_PATH_IN_TEXT.finditer(expand_loops(cmd)):
                p = rel(m.group(0), cwd)
                if p not in [r["path"] for r in s["pstack_reads"]] and not re.search(r">\s*" + re.escape(m.group(0)), cmd):
                    s["pstack_reads"].append({"path": p, "via": "Bash", "partial": partial,
                                              "unresolved": "$" in p})
            stripped = " ".join(seg for seg in segments(cmd) if "run-record" not in seg and not seg.startswith("git "))
            if TEST_RUN.search(stripped):
                s["test_run"] = outcome_of(s.get("result"), s.get("is_error"))
            s["commit"] = any(GIT_COMMIT.search(seg) for seg in segments(cmd))
        s["kinds"] = sorted({classify(w) for w in s["writes"]} - {"other", "pstack"})


# ---------------------------------------------------------------- extraction

def delegates(parsed):
    out = []
    for s in parsed["steps"]:
        if s["name"] not in AGENT_TOOLS:
            continue
        i = s["input"]
        out.append({"idx": s["idx"], "actor": s["actor"], "subagent_type": i.get("subagent_type"),
                    "model": i.get("model"), "description": i.get("description"),
                    "run_in_background": i.get("run_in_background"), "isolation": i.get("isolation"),
                    "prompt_chars": len(i.get("prompt", "")), "prompt_head": i.get("prompt", "")[:200],
                    "result_head": (s.get("result") or "")[:200], "is_error": s.get("is_error")})
    return out


def run_record_info(parsed):
    cmds = []
    for s in parsed["steps"]:
        for sub, text in s.get("rr", []):
            cmds.append({"idx": s["idx"], "actor": s["actor"], "subcommand": sub, "command": text[:300],
                         "output_head": (s.get("result") or "")[:400], "is_error": s.get("is_error")})
    checks = [c for c in cmds if c["subcommand"] == "check"]
    final = None
    if checks:
        c = checks[-1]
        m = re.search(r"Exit code (\d+)", c["output_head"])
        out = c["output_head"]
        code = int(m.group(1)) if m else (1 if c["is_error"] or re.search(r"^INCOMPLETE", out, re.M) else
                                          0 if re.search(r"^complete\b", out, re.M) else None)
        final = {"idx": c["idx"], "command": c["command"], "exit": code, "output": c["output_head"]}
    return {"commands": cmds, "final_check": final}


def pstack_reads(parsed):
    out = []
    for s in parsed["steps"]:
        for r in s["pstack_reads"]:
            out.append({"idx": s["idx"], "actor": s["actor"], **r})
    for e in parsed["meta"].get("slash_expansion", []):
        out.insert(0, {"idx": -1, "actor": "parent", "path": f"{e['skill']}/SKILL.md (slash-command expansion)",
                       "via": "prompt", "partial": False})
    return out


# ---------------------------------------------------------------- phase order

def ev(s, extra=""):
    return f"#{s['idx']} [{s['actor']}] {s['name']}: {summarize(s)}{(' -> ' + extra) if extra else ''}"


def is_no_comments(s):
    i = s["input"]
    return any("no-comments" in r["path"] for r in s["pstack_reads"]) or \
        (s["name"] in AGENT_TOOLS and (i.get("subagent_type") == "comment-sicko" or
                                       re.search(r"comment", i.get("description", "") or "", re.I)))


def is_review(s):
    i = s["input"]
    if any("interrogate/" in r["path"] for r in s["pstack_reads"]) or \
            any(sub == "evidence" and "--kind review" in t for sub, t in s.get("rr", [])):
        return True
    # Description only: "pstack-reviewer" is the read-only persona for how/why too, not a review.
    return s["name"] in AGENT_TOOLS and i.get("subagent_type") != "comment-sicko" and \
        bool(re.search(r"review|interrogat|operator", i.get("description") or "", re.I))


def implement_delegate(s):
    i = s["input"]
    return s["name"] in AGENT_TOOLS and i.get("subagent_type") not in READ_ONLY_AGENTS and \
        bool(re.search(r"implement|\bfix\b|apply|write the (fix|code)|build", (i.get("description") or "") + " " + (i.get("prompt") or "")[:2000], re.I))


def finding(fid, title, status, evidence):
    return {"id": fid, "title": title, "status": status, "evidence": evidence}


def phase_order(parsed, git_info):
    steps = parsed["steps"]
    code_edits = [s for s in steps if "code" in s["kinds"]]
    parent_code = [s for s in code_edits if s["actor"] == "parent"]
    test_edits = [s for s in steps if "test" in s["kinds"]]
    runs = [s for s in steps if s["test_run"]]
    commits = [s for s in steps if s["commit"] and not s.get("is_error")]
    agents = [s for s in steps if s["name"] in AGENT_TOOLS]
    visible_delegate_steps = any(s["actor"].startswith("delegate") for s in steps)
    out = []

    # 1. Reproduce: failing check written, run failing, committed, all before the first fix edit.
    first_fix = code_edits[0] if code_edits else None
    cut = first_fix["idx"] if first_fix else None
    if first_fix is None:
        out.append(finding("repro_before_fix", "failing check committed before any fix edit", "unknown",
                           ["no edit to src/ is visible in the transcript"
                            + ("" if visible_delegate_steps else "; delegate tool calls are not in this transcript")]))
    else:
        before = lambda xs: [s for s in xs if s["idx"] < cut]
        t, fails, cm = before(test_edits), [s for s in before(runs) if s["test_run"] == "fail"], before(commits)
        real_fails = [s for s in fails if not (IMPORTISH.search(s.get("result") or "") and not re.search(r"assert", s.get("result") or "", re.I))]
        evidence = [f"first fix edit: {ev(first_fix)}"]
        evidence += [f"test/harness edit: {ev(s)}" for s in t[:3]] or ["no test/harness edit before it"]
        evidence += [f"failing run: {ev(s, 'fail')}" for s in fails[:3]] or ["no failing test run before it"]
        if fails and not real_fails:
            evidence.append("every failing run before the fix failed with an import/attribute-style error, not an assertion")
        evidence += [f"commit: {ev(s)}" for s in cm[:3]] or ["no git commit before it"]
        ok = bool(t and real_fails and cm and max(s["idx"] for s in real_fails) >= min(s["idx"] for s in t)
                  and max(s["idx"] for s in cm) > min(s["idx"] for s in real_fails))
        out.append(finding("repro_before_fix", "failing check committed before any fix edit", "pass" if ok else "fail", evidence))

    # 2. Implementation delegated.
    impl = [s for s in agents if implement_delegate(s)]
    evidence = [f"implementation delegate: {ev(s)}" for s in impl] or ["no write-capable delegate with an implementation brief"]
    evidence += [f"parent edited code: {ev(s)}" for s in parent_code[:5]] or ["parent made no src/ edit visible in the transcript"]
    status = "pass" if impl and not parent_code else "fail"
    out.append(finding("implementation_delegated", "implementation delegated, parent did not write the fix", status, evidence))

    # 3. no-comments before review.
    nc = [s for s in steps if is_no_comments(s)]
    rv = [s for s in steps if is_review(s)]
    evidence = [f"no-comments: {ev(s)}" for s in nc[:3]] or ["no no-comments read, skill call or comment-audit delegate"]
    evidence += [f"review: {ev(s)}" for s in rv[:3]] or ["no review found (no interrogate read, review delegate or rr evidence --kind review)"]
    after_fix = lambda xs: [s for s in xs if cut is None or s["idx"] > cut]
    review = next(iter(after_fix(rv)), None)
    if review is None:
        status = "fail"
        if rv:
            evidence.append("no review after the first fix edit")
    else:
        status = "pass" if any(s["idx"] < review["idx"] for s in after_fix(nc)) else "fail"
    out.append(finding("no_comments_before_review", "no-comments ran on the fix before review", status, evidence))

    # 4. Verification after the last code change.
    changes = [s for s in steps if s["kinds"]]
    last = changes[-1] if changes else None
    after = [s for s in steps if (last is None or s["idx"] > last["idx"]) and
             (s["test_run"] == "pass" or any(sub == "evidence" and "--kind verify" in t and "--result pass" in t
                                            for sub, t in s.get("rr", [])))]
    evidence = [f"last code/test change: {ev(last)}" if last else "no code or test change visible"]
    evidence += [f"verification after it: {ev(s, s['test_run'] or 'rr verify pass')}" for s in after[:3]] or \
        ["no passing test run or rr verify-pass after it"]
    late_writers = [s for s in agents if s["input"].get("subagent_type") not in READ_ONLY_AGENTS and
                    last is not None and s["idx"] > last["idx"]]
    if late_writers and not visible_delegate_steps:
        evidence.append(f"caveat: {len(late_writers)} write-capable delegate(s) spawned after that change; their edits are not in this transcript")
    status = "unknown" if last is None else ("pass" if after and not (late_writers and not visible_delegate_steps and after[-1]["idx"] < late_writers[-1]["idx"]) else "fail")
    out.append(finding("verify_after_last_change", "verification ran after the last code change", status, evidence))

    # 5. Git history: failing-test commit before the fix commit.
    if git_info is None or git_info.get("error"):
        out.append(finding("test_commit_before_fix_commit", "failing-test commit precedes the fix commit in history",
                           "unknown", [f"git history unavailable: {git_info.get('error') if git_info else 'no repository'}"]))
    else:
        out.append(history_finding(git_info))

    passed = sum(f["status"] == "pass" for f in out)
    return {"expected": "bug-fix", "findings": out, "passed": passed, "total": len(out)}


def history_finding(git_info):
    cs = git_info.get("commits", [])
    evidence = [f"{c['sha'][:8]} {c['subject']!r} tests={c['touches_tests']} src={c['touches_src']}" for c in cs] or \
        [f"no commits after base {git_info.get('base', '?')[:8]} on the judged ref"]
    first_src = next((i for i, c in enumerate(cs) if c["touches_src"]), None)
    first_test_only = next((i for i, c in enumerate(cs) if c["touches_tests"] and not c["touches_src"]), None)
    if first_src is None:
        status = "fail"
        evidence.append("no commit touches src/: the fix was not committed")
    elif first_test_only is None or first_test_only > first_src:
        status = "fail"
        evidence.append("no test-only commit lands before the first commit touching src/")
    else:
        status = "pass"
    replay = git_info.get("harness_replay")
    if replay:
        for k, v in replay.items():
            evidence.append(f"harness replay at {k} ({v.get('commit', '')[:8]}): exit {v.get('exit')} {v.get('tail', '')!r}")
        tc = replay.get("test_commit")
        if status == "pass" and tc and tc.get("exit") == 0:
            status = "fail"
            evidence.append("the test-only commit's harness passes on its own tree: it does not reproduce the bug")
    return finding("test_commit_before_fix_commit", "failing-test commit precedes the fix commit in history", status, evidence)


# ---------------------------------------------------------------- git and the judged tree

def git(repo, *args, check=True):
    r = subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)
    if check and r.returncode:
        raise RuntimeError(f"git {' '.join(args)}: {r.stderr.strip()}")
    return r.stdout.strip()


def commit_files(repo, sha):
    return [f for f in git(repo, "diff-tree", "--no-commit-id", "--name-only", "-r", "--root", sha).splitlines() if f]


def pick_tree(repo, base):
    """The tree the agent's fix lives in: the main worktree if it changed src/, else the most recent
    changed worktree, else the newest ref whose commits touch src/, else the main worktree."""
    wts, cur = [], {}
    for line in git(repo, "worktree", "list", "--porcelain").splitlines() + [""]:
        if not line:
            if cur:
                wts.append(cur)
            cur = {}
        else:
            k, _, v = line.partition(" ")
            cur[k] = v
    changed = []
    for w in wts:
        path = Path(w["worktree"])
        if path.is_dir() and subprocess.run(["git", "-C", str(path), "diff", "--quiet", base, "--", "src"]).returncode:
            changed.append(path)
    main = Path(wts[0]["worktree"]) if wts else Path(repo)
    if main in changed:
        return {"path": str(main), "ref": "HEAD", "why": "main worktree differs from base under src/"}
    if changed:
        newest = max(changed, key=lambda p: max((f.stat().st_mtime for f in (p / "src").rglob("*") if f.is_file()), default=0))
        return {"path": str(newest), "ref": git(newest, "rev-parse", "HEAD"), "why": "a linked worktree differs from base under src/"}
    refs = git(repo, "for-each-ref", "--sort=-committerdate", "--format=%(refname)", "refs/heads").splitlines()
    for ref in refs:
        shas = git(repo, "rev-list", f"{base}..{ref}").splitlines()
        if any(f.startswith("src/") for s in shas for f in commit_files(repo, s)):
            return {"ref": ref, "path": None, "why": f"{ref} has commits touching src/ and no worktree changed it"}
    return {"path": str(main), "ref": "HEAD", "why": "nothing changed src/; judging the unchanged main worktree"}


def export_ref(repo, ref, dest):
    dest.mkdir(parents=True, exist_ok=True)
    a = subprocess.Popen(["git", "-C", str(repo), "archive", ref], stdout=subprocess.PIPE)
    subprocess.run(["tar", "-x", "-C", str(dest)], stdin=a.stdout, check=True)
    a.wait()
    return dest


def replay_harness(repo, sha, cmd, timeout):
    with tempfile.TemporaryDirectory(prefix="harness-replay-") as d:
        tree = export_ref(repo, sha, Path(d) / "tree")
        home = Path(d) / "home"
        home.mkdir()
        env = {"PATH": os.environ.get("PATH", ""), "HOME": str(home), "TMPDIR": d, "PYTHONDONTWRITEBYTECODE": "1"}
        if not (tree / cmd[-1]).exists():
            return {"commit": sha, "exit": None, "tail": f"{cmd[-1]} not present"}
        try:
            r = subprocess.run(cmd, cwd=tree, env=env, capture_output=True, text=True, timeout=timeout)
            tail = (r.stdout + r.stderr).strip().splitlines()[-1:] or [""]
            return {"commit": sha, "exit": r.returncode, "tail": tail[0][:200]}
        except subprocess.TimeoutExpired:
            return {"commit": sha, "exit": None, "tail": f"timed out after {timeout}s"}


def git_history(repo, base, judged, task, replay=True):
    info = {"base": base, "judged": judged}
    ref = judged.get("ref") or "HEAD"
    if judged.get("path") and ref == "HEAD":
        repo_for_log = judged["path"]
    else:
        repo_for_log = repo
    shas = git(repo_for_log, "rev-list", "--reverse", "--topo-order", f"{base}..{ref}").splitlines()
    commits = []
    for s in shas:
        files = commit_files(repo, s)
        commits.append({"sha": s, "subject": git(repo, "log", "-1", "--format=%s", s), "files": files,
                        "touches_src": any(classify(f) == "code" for f in files),
                        "touches_tests": any(classify(f) == "test" for f in files)})
    info["commits"] = commits
    info["all_new_commits"] = len(git(repo, "rev-list", "--all", f"^{base}").splitlines())
    hr = task.get("harness_replay")
    if replay and hr:
        t = next((c for c in commits if c["touches_tests"] and not c["touches_src"]), None)
        f = next((c for c in commits if c["touches_src"]), None)
        info["harness_replay"] = {}
        if t:
            info["harness_replay"]["test_commit"] = replay_harness(repo, t["sha"], hr["command"], hr.get("time_budget_seconds", 180))
        if f:
            info["harness_replay"]["fix_commit"] = replay_harness(repo, f["sha"], hr["command"], hr.get("time_budget_seconds", 180))
    return info


# ---------------------------------------------------------------- oracle

def run_oracle(task, tree, out):
    o = task.get("oracle")
    if not o:
        return {"skipped": "task has no oracle"}
    sub = lambda s: s.replace("{evals}", str(EVALS)).replace("{tree}", str(tree)).replace("{out}", str(out))
    cmd = [sub(c) for c in o["command"]]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=o.get("time_budget_seconds", 900))
    except subprocess.TimeoutExpired:
        return {"error": f"oracle exceeded {o.get('time_budget_seconds')}s", "command": cmd}
    (Path(out) / "oracle.txt").write_text(r.stdout + r.stderr)
    res_path = Path(sub(o.get("result_json", "{out}/oracle.json")))
    if not res_path.is_file():
        return {"error": "oracle wrote no result", "exit": r.returncode, "output_tail": (r.stdout + r.stderr)[-800:],
                "command": cmd}
    data = json.loads(res_path.read_text())
    return {"command": cmd, "exit": r.returncode, "tree": str(tree), "passed": data["passed"], "total": data["total"],
            "checks": [{"name": c["name"], "status": c["status"], "detail": c["detail"], "seconds": c["seconds"]}
                       for c in data["checks"]]}


# ---------------------------------------------------------------- assembly

def analyze(run_dir, oracle=True, tree=None, replay=True):
    run_dir = Path(run_dir)
    meta = json.loads((run_dir / "run.json").read_text()) if (run_dir / "run.json").is_file() else {}
    task = json.loads(Path(meta["task_file"]).read_text()) if meta.get("task_file") and Path(meta["task_file"]).is_file() else {}
    fmt = meta.get("transcript_format", "claude-stream-json")
    events, bad = read_jsonl(run_dir / "transcript.jsonl")
    notes = []
    if fmt == "codex-exec-json":
        parsed = parse_codex(events)
        notes.append("codex transcript parsed with unverified event shapes")
    elif fmt == "copilot-unparsed":
        parsed = {"meta": {"init": None, "result": None, "slash_expansion": []}, "steps": [], "texts": []}
        notes.append("copilot transcript format is unverified and was not parsed; see transcript.jsonl and copilot-logs/")
    else:
        parsed = parse_claude(events)
        added = merge_subagents(parsed, run_dir / "host-session")
        if added:
            notes.append(f"{added} delegate tool calls merged from host-session subagent transcripts")
    if bad:
        notes.append(f"{bad} transcript lines were not JSON")
    cwd = (parsed["meta"].get("init") or {}).get("cwd") or parsed["meta"].get("cwd") or meta.get("workdir")
    enrich(parsed, cwd)

    res = parsed["meta"].get("result") or {}
    usage = res.get("usage") or parsed["meta"].get("codex_usage") or {}
    tokens = {k: usage.get(k) for k in ("input_tokens", "output_tokens", "cache_creation_input_tokens",
                                        "cache_read_input_tokens", "cached_input_tokens", "reasoning_output_tokens")
              if usage.get(k) is not None}
    by_model = {m: {k: v.get(k) for k in ("inputTokens", "outputTokens", "cacheReadInputTokens",
                                          "cacheCreationInputTokens", "costUSD")}
                for m, v in (res.get("modelUsage") or {}).items()}

    repo = Path(meta["workdir"]) if meta.get("workdir") and Path(meta["workdir"], ".git").exists() else None
    tmp_clone = None
    if repo is None and (run_dir / "repo.bundle").is_file():
        tmp_clone = Path(tempfile.mkdtemp(prefix="analyze-bundle-"))
        subprocess.run(["git", "clone", "-q", str(run_dir / "repo.bundle"), str(tmp_clone / "r")], capture_output=True)
        repo = tmp_clone / "r" if (tmp_clone / "r" / ".git").exists() else None
        notes.append("workdir gone; git history read from repo.bundle, oracle runs on final-tree/")
    git_info, judged_tree = None, None
    if repo and meta.get("base_commit"):
        try:
            judged = pick_tree(repo, meta["base_commit"]) if tmp_clone is None else {"path": None, "ref": "HEAD", "why": "bundle"}
            git_info = git_history(repo, meta["base_commit"], judged, task, replay=replay)
            if judged.get("path"):
                judged_tree = Path(judged["path"])
            elif tmp_clone is None:
                judged_tree = export_ref(repo, judged["ref"], Path(tempfile.mkdtemp(prefix="judged-")) / "tree")
        except (RuntimeError, OSError, subprocess.CalledProcessError) as e:
            git_info = {"error": str(e)}
    elif meta:
        git_info = {"error": "no workdir or bundle"}
    if tree:
        judged_tree = Path(tree)
    elif judged_tree is None and (run_dir / "final-tree").is_dir():
        judged_tree = run_dir / "final-tree"

    if not oracle:
        oracle_res = {"skipped": "--no-oracle"}
    elif judged_tree is None:
        oracle_res = {"skipped": "no final tree to judge"}
    else:
        oracle_res = run_oracle(task, judged_tree, run_dir)
    if tmp_clone:
        shutil.rmtree(tmp_clone, ignore_errors=True)

    steps = parsed["steps"]
    counts = {}
    for s in steps:
        counts[s["name"]] = counts.get(s["name"], 0) + 1
    wall = meta.get("wall_clock_seconds")
    if wall is None and res.get("duration_ms") is not None:
        wall = round(res["duration_ms"] / 1000, 1)
    result = {
        "task": meta.get("task"), "host": meta.get("host"), "arm": meta.get("arm"),
        "status": meta.get("status"), "exit_code": meta.get("exit_code"), "timed_out": meta.get("timed_out"),
        "adapter_verified": meta.get("adapter_verified"),
        "wall_clock_seconds": wall, "host_duration_ms": res.get("duration_ms"),
        "cost_usd": res.get("total_cost_usd"), "tokens": tokens, "tokens_by_model": by_model,
        "num_turns": res.get("num_turns"), "host_result": {k: res.get(k) for k in ("subtype", "is_error", "stop_reason", "terminal_reason")} if res else None,
        "subagent_stats": res.get("subagent_stats"), "permission_denials": len(res.get("permission_denials") or []),
        "session": parsed["meta"].get("init"),
        "tool_call_counts": counts,
        "tool_calls": [{"idx": s["idx"], "actor": s["actor"], "name": s["name"], "summary": summarize(s),
                        "is_error": s.get("is_error"), "ts": s.get("ts"), "writes": s["writes"],
                        "test_run": s["test_run"], "commit": s["commit"]} for s in steps],
        "pstack_reads": pstack_reads(parsed),
        "delegates": delegates(parsed),
        "run_record": run_record_info(parsed),
        "git": git_info,
        "oracle": oracle_res,
        "phase_order": phase_order(parsed, git_info),
        "final_message": (parsed["texts"][-1]["text"] if parsed["texts"] else res.get("result", ""))[:4000],
        "notes": notes,
    }
    rec = find_run_record(judged_tree, repo)
    if rec:
        result["run_record"].update(rec)
    return result


def find_run_record(*roots):
    for r in roots:
        if not r:
            continue
        runs = Path(r) / ".pstack" / "runs"
        files = sorted(runs.glob("*.json")) if runs.is_dir() else []
        if not files:
            continue
        rec = json.loads(files[-1].read_text())
        out = {"record_file": str(files[-1]),
               "record_phases": [(p["name"], p["status"], p.get("note", "")) for p in rec.get("phases", [])],
               "record_delegates": rec.get("delegates", [])}
        script = next(Path(r).glob("*/skills/poteto-mode/scripts/run-record.py"), None)
        if script and (Path(r) / ".git").exists():
            p = subprocess.run([sys.executable, str(script), "check"], cwd=r, capture_output=True, text=True)
            out["rerun_check"] = {"exit": p.returncode, "output": (p.stdout + p.stderr)[-1500:]}
        return out
    return None


def markdown(r):
    L = [f"# Eval run: {r.get('task')} / {r.get('host')} / {r.get('arm')}", ""]
    L.append(f"- status: {r.get('status')} (exit {r.get('exit_code')}, timed out: {r.get('timed_out')})")
    if r.get("adapter_verified") is False:
        L.append("- adapter: UNVERIFIED")
    wall = r.get("wall_clock_seconds")
    L.append(f"- wall-clock: {wall / 60:.1f} min" if isinstance(wall, (int, float)) else "- wall-clock: unknown")
    L.append(f"- cost: ${r['cost_usd']:.2f}" if isinstance(r.get("cost_usd"), (int, float)) else "- cost: not in transcript")
    if r.get("tokens"):
        L.append("- tokens: " + ", ".join(f"{k} {v:,}" for k, v in r["tokens"].items()))
    for m, u in (r.get("tokens_by_model") or {}).items():
        L.append(f"  - {m}: in {u.get('inputTokens')}, out {u.get('outputTokens')}, cache read {u.get('cacheReadInputTokens')}, ${u.get('costUSD') or 0:.2f}")
    o = r.get("oracle") or {}
    L += ["", "## Oracle", ""]
    if "passed" in o:
        L.append(f"{o['passed']}/{o['total']} checks passed on `{o.get('tree')}`")
        L += [f"- {c['status'].upper()} `{c['name']}`: {c['detail']}" for c in o["checks"]]
    else:
        L.append(f"not run: {o.get('skipped') or o.get('error')}")
    po = r["phase_order"]
    L += ["", f"## Phase order against the {po['expected']} playbook: {po['passed']}/{po['total']}", ""]
    for f in po["findings"]:
        L.append(f"- **{f['status'].upper()}** {f['title']}")
        L += [f"  - {e}" for e in f["evidence"]]
    L += ["", f"## Delegates ({len(r['delegates'])})", ""]
    L += [f"- #{d['idx']} {d['subagent_type']} model={d['model']} bg={d['run_in_background']} isolation={d['isolation']}: {d['description']}"
          for d in r["delegates"]] or ["none"]
    L += ["", "## pstack files read, in order", ""]
    L += [f"- #{p['idx']} [{p['actor']}] {p['path']} via {p['via']}{' (partial)' if p.get('partial') else ''}"
          for p in r["pstack_reads"]] or ["none"]
    rr = r["run_record"]
    L += ["", f"## run-record ({len(rr['commands'])} commands)", ""]
    L += [f"- #{c['idx']} {c['subcommand']}: `{c['command'][:160]}`" for c in rr["commands"]] or ["none"]
    if rr.get("final_check"):
        L += ["", f"final `rr check` (#{rr['final_check']['idx']}): exit {rr['final_check']['exit']}", "",
              "```", rr["final_check"]["output"].strip(), "```"]
    if rr.get("rerun_check"):
        L += ["", f"`rr check` rerun by analyze: exit {rr['rerun_check']['exit']}", "", "```", rr["rerun_check"]["output"].strip(), "```"]
    g = r.get("git") or {}
    L += ["", "## Commits", ""]
    if g.get("error"):
        L.append(f"unavailable: {g['error']}")
    else:
        if g.get("judged"):
            L.append(f"judged tree: {g['judged'].get('path') or g['judged'].get('ref')} ({g['judged'].get('why')})")
        L += [f"- {c['sha'][:8]} {c['subject']} ({', '.join(c['files'][:6])})" for c in g.get("commits", [])] or ["none"]
    L += ["", "## Tool calls", "", "| # | actor | tool | summary |", "|---|---|---|---|"]
    L += [f"| {t['idx']} | {t['actor'][:30]} | {t['name']} | {t['summary'][:120].replace('|', '/')} |" for t in r["tool_calls"]]
    if r.get("notes"):
        L += ["", "## Notes", ""] + [f"- {n}" for n in r["notes"]]
    return "\n".join(L) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("run_dir")
    ap.add_argument("--no-oracle", action="store_true")
    ap.add_argument("--tree", help="judge this tree instead of the one picked from the run")
    ap.add_argument("--no-harness-replay", action="store_true")
    a = ap.parse_args(argv)
    r = analyze(a.run_dir, oracle=not a.no_oracle, tree=a.tree, replay=not a.no_harness_replay)
    out = Path(a.run_dir)
    (out / "result.json").write_text(json.dumps(r, indent=2, default=str) + "\n")
    (out / "summary.md").write_text(markdown(r))
    o = r["oracle"]
    print(f"oracle: {o['passed']}/{o['total']}" if "passed" in o else f"oracle: {o.get('skipped') or o.get('error')}")
    print(f"phase order: {r['phase_order']['passed']}/{r['phase_order']['total']}; delegates: {len(r['delegates'])}; "
          f"wrote {out / 'result.json'} and {out / 'summary.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
