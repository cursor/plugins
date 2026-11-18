#!/usr/bin/env python3
"""Deterministic task baseline capture, verbatim intent & HOLD tracker, and brief builder."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple

_SDIR = str(Path(__file__).resolve().parent)
if _SDIR not in sys.path:
    sys.path.insert(0, _SDIR)

import sop_common as SC

BASE_SLOTS = ("writer", "reviewer", "scout", "helper", "monitor")
NUMBERED_ARTIFACT = re.compile(r"^(handoff|review|disposition)(?:-(\d+))?\.md$")
BRIEF_ROUND_RE = re.compile(r"^brief-(\d+)(?:-[A-Za-z0-9_-]+)?\.md$")
HOLD_START = re.compile(r"^\s*[-*]\s*(HOLD|RELEASE)\b")
HOLD_LINE = re.compile(
    r"^\s*[-*]\s*HOLD\s+(H-\d+)\s*\|\s*scope:\s*(\S.*?)\s*\|\s*release:\s*(\S.*?)\s*\|\s*source:\s*(\S.*?)\s*$"
)
RELEASE_LINE = re.compile(
    r"^\s*[-*]\s*RELEASE\s+(H-\d+)\s*\|\s*source:\s*(\S.*?)\s*$"
)
POINTER_RE = re.compile(r"`[^`\n]*(?:/|\.\w+|:\d+)[^`\n]*`")
STE_WORD_RE = re.compile(r"[\u3400-\u9fff]|[A-Za-z0-9][A-Za-z0-9_.:/\-]*")
MAX_LEAD_WORDS = 30
WS_RE = re.compile(r"\s+")

TEMPLATE_ON_FINISH_HERDR = (
    "write your deliverable, then end your turn and stand by idle; do not exit your CLI. "
    "The arm that dispatched you settles when herdr sees your turn end. If your CLI reports "
    'no status to herdr, exit it instead: your last command is `hc send "$HC_TERMINAL_ID" /exit` '
    "(use your CLI's exit command)."
)

DEFAULT_DELIVERABLES = {
    "writer": "plan + gate packet (or phase implementation + handoff markdown)",
    "reviewer": "independent review markdown with VERDICT, TREE, and findings",
    "scout": "read-only evidence markdown",
    "helper": "scoped phase artifact + handoff markdown",
    "monitor": "status report",
}

UNIVERSAL_SCOPE_GUARDS = (
    "- No git commit, git push, production deploy, or production DB writes without explicit human approval.",
    "- Zero narration/banner/workaround comments or unreasoned lint/type suppressions (enforced by sop-gate A-no-slop-comments).",
)


def squash(text: str) -> str:
    return WS_RE.sub("", text)


def base_slot_of(slot: str) -> str:
    if slot in BASE_SLOTS:
        return slot
    for b in BASE_SLOTS:
        if slot.startswith(b + "-"):
            return b
    raise ValueError(f"Unknown slot {slot!r}; expected {BASE_SLOTS} or <slot>-<suffix>")


def resolve_cwd(raw: str, workspace: Dict[str, object]) -> Path:
    repos: Dict[str, Path] = workspace["repos"]  # type: ignore[assignment]
    if raw in repos:
        return repos[raw].resolve()
    p = Path(raw).expanduser()
    if not p.is_absolute():
        sop_root = Path(workspace["sop_root"])  # type: ignore[arg-type]
        for base in (sop_root, sop_root.parent):
            cand = (base / raw).resolve()
            if cand.exists():
                return cand
    return p.resolve()


def hash_worktree_file(repo_root: Path, rel_path: str) -> str:
    target = repo_root / rel_path
    if not target.exists() and not target.is_symlink():
        return "__DELETED__"
    if target.is_dir():
        return "__DIR__"
    res = subprocess.run(
        ["git", "-C", str(repo_root), "hash-object", "--no-filters", "--", str(target)],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    if res.returncode != 0:
        raise RuntimeError(f"git hash-object failed for {target}: {res.stderr.strip()}")
    return res.stdout.strip()


def collect_dirty_files(
    repo_root: Path,
    repo_name: Optional[str] = None,
    workspace: Optional[Dict[str, object]] = None,
) -> Dict[str, str]:
    dirty: set[str] = set()
    tracked_z = subprocess.run(
        ["git", "-C", str(repo_root), "diff", "--name-only", "-z", "HEAD"],
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
    if tracked_z.returncode == 0:
        for item in tracked_z.stdout.decode("utf-8", errors="replace").split("\0"):
            if item:
                dirty.add(item)
    untracked_z = subprocess.run(
        ["git", "-C", str(repo_root), "ls-files", "-z", "--others", "--exclude-standard"],
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
    if untracked_z.returncode == 0:
        for item in untracked_z.stdout.decode("utf-8", errors="replace").split("\0"):
            if item:
                dirty.add(item)

    filtered = {
        p for p in dirty if not SC.is_ignored_control_plane_path(repo_root, p, repo_name, workspace)
    }
    return {rel: hash_worktree_file(repo_root, rel) for rel in sorted(filtered)}


def save_dirty_snapshots(ev_dir: Path, repo_root: Path, dirty: Dict[str, str]) -> Dict[str, str]:
    snap_dir = ev_dir / "baseline-snapshots" / repo_root.name
    snap_dir.mkdir(parents=True, exist_ok=True)
    snap_rel_map: Dict[str, str] = {}
    for rel, blob_sha in dirty.items():
        src = repo_root / rel
        if not src.is_file() or blob_sha in ("__DELETED__", "__DIR__", "__ERR__"):
            continue
        try:
            raw = src.read_bytes()
        except OSError:
            continue
        if len(raw) > 512 * 1024 or b"\x00" in raw[:4096]:
            continue
        dst = snap_dir / f"{blob_sha}.snap"
        if not dst.exists():
            dst.write_bytes(raw)
        snap_rel_map[rel] = str(dst.relative_to(ev_dir))
    return snap_rel_map


def ensure_baseline(
    task_dir: Path,
    cwd: Path,
    reset: bool = False,
    workspace: Optional[Dict[str, object]] = None,
) -> Tuple[Dict[str, object], bool]:
    ev_dir = task_dir / "evidence"
    ev_dir.mkdir(parents=True, exist_ok=True)
    repo_root = SC.git_top_level(cwd) or cwd.resolve()
    repo_name = repo_root.name
    if workspace:
        for rname, rpath in (workspace.get("repos") or {}).items():  # type: ignore[union-attr]
            if Path(rpath).resolve() == repo_root.resolve():
                repo_name = str(rname)
                break
    bpath = ev_dir / f"baseline-{repo_name}.json"

    prior_work_exists = bool(
        numbered_artifacts(task_dir, "handoff") or numbered_artifacts(task_dir, "review")
    )
    if reset and prior_work_exists:
        raise ValueError(
            "Refusing --reset-baseline because handoff-*.md or review-*.md already exists in task directory"
        )
    if bpath.is_file() and not reset:
        return json.loads(bpath.read_text(encoding="utf-8")), False

    if prior_work_exists:
        raise ValueError(
            f"Refusing to capture new baseline-{repo_name}.json after handoff-*.md or review-*.md already exists"
        )

    if SC.is_git_work_tree(repo_root):
        head = SC.git_out(repo_root, "rev-parse", "HEAD").strip()
        branch = SC.git_out(repo_root, "rev-parse", "--abbrev-ref", "HEAD").strip()
        tree = SC.tree_stamp_for_repo(repo_root, repo_name, workspace)
        dirty = collect_dirty_files(repo_root, repo_name, workspace)
        snap_map = save_dirty_snapshots(ev_dir, repo_root, dirty)
    else:
        head = "n/a"
        branch = "n/a"
        tree = "n/a"
        dirty = {}
        snap_map = {}

    payload: Dict[str, object] = {
        "schema_version": 2,
        "repo": repo_name,
        "repo_path": str(repo_root),
        "head": head,
        "branch": branch,
        "tree": tree,
        "dirty_files": dirty,
        "dirty_snapshots": snap_map,
        "captured_at_utc": SC.utc_now_iso(),
    }
    bpath.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return payload, True


def append_intent(intent_path: Path, raw_text: str) -> None:
    lines = [ln.rstrip() for ln in raw_text.splitlines()]
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    if not any(ln.strip() for ln in lines):
        raise ValueError("Refusing to append empty --intent-text to intent.md")

    quoted = "\n".join(f"> {ln}" if ln.strip() else ">" for ln in lines)
    header = ""
    if not intent_path.is_file() or not intent_path.read_text(encoding="utf-8").strip():
        header = f"# Intent — {intent_path.parent.name}\n\n"
    else:
        existing = intent_path.read_text(encoding="utf-8")
        if not existing.endswith("\n\n"):
            header = "\n" if existing.endswith("\n") else "\n\n"

    block = f"{header}<!-- appended {SC.utc_now_iso()} -->\n{quoted}\n"
    with intent_path.open("a", encoding="utf-8") as fh:
        fh.write(block)


def extract_intent_quotes(intent_text: str) -> List[str]:
    clean = re.sub(r"<!--.*?-->", "", intent_text, flags=re.DOTALL)
    out: List[str] = []
    for line in clean.splitlines():
        if line.lstrip().startswith(">"):
            body = re.sub(r"^\s*>\s?", "", line).strip()
            if body:
                out.append(f"> {body}")
    return out


def intent_haystack(intent_text: str) -> str:
    quotes = extract_intent_quotes(intent_text)
    stripped = [re.sub(r"^\s*>\s?", "", q) for q in quotes]
    return squash("\n".join(stripped))


def parse_open_holds(record_path: Path, haystack: str) -> Tuple[Dict[str, str], List[str]]:
    held: Dict[str, str] = {}
    problems: List[str] = []
    if not record_path.is_file():
        return held, problems

    released: List[str] = []
    for line in record_path.read_text(encoding="utf-8").splitlines():
        if not HOLD_START.match(line):
            continue
        hm = HOLD_LINE.match(line)
        rm = RELEASE_LINE.match(line)
        if not (hm or rm):
            problems.append(f"Malformed HOLD/RELEASE line in record.md: {line.strip()[:80]!r}")
            continue
        hid, source = (hm.group(1), hm.group(4)) if hm else (rm.group(1), rm.group(2))
        if squash(source) not in haystack:
            problems.append(f"{hid} source is not verbatim in intent.md: {source[:60]!r}")
        if hm:
            held[hid] = hm.group(2)
        else:
            released.append(hid)

    for hid in released:
        if hid not in held:
            problems.append(f"RELEASE {hid} has no matching HOLD")
        held.pop(hid, None)
    return held, problems


def append_record_lines(record_path: Path, lines: List[str]) -> None:
    if not record_path.is_file() or not record_path.read_text(encoding="utf-8").strip():
        prefix = f"# Record — {record_path.parent.name}\n\n"
    else:
        cur = record_path.read_text(encoding="utf-8")
        prefix = "" if cur.endswith("\n") else "\n"
    with record_path.open("a", encoding="utf-8") as fh:
        fh.write(prefix + "\n".join(lines) + "\n")


def numbered_artifacts(task_dir: Path, kind: str) -> List[Path]:
    found: List[Tuple[int, Path]] = []
    if not task_dir.is_dir():
        return []
    for p in task_dir.iterdir():
        m = NUMBERED_ARTIFACT.match(p.name)
        if m and m.group(1) == kind:
            found.append((int(m.group(2) or 0), p.resolve()))
    return [p for _, p in sorted(found)]


def next_round_index(task_dir: Path) -> int:
    highest = 0
    for p in task_dir.iterdir():
        m = BRIEF_ROUND_RE.match(p.name)
        if m:
            highest = max(highest, int(m.group(1)))
    return highest + 1


def resolve_dispatch_policy(policy: Dict[str, object], base_slot: str) -> Tuple[str, str, str, List[Path]]:
    agents = policy.get("slot_agents") or {}
    agent = str(agents.get(base_slot) or "agy")

    models_by_agent = (policy.get("slot_models") or {}).get(agent) or {}
    model = str(models_by_agent.get(base_slot) or "default")

    effort_by_agent = (policy.get("slot_effort") or {}).get(agent) or {}
    effort = str(effort_by_agent.get(base_slot) or "default")

    preflight_tbl = policy.get("slot_preflight") or {}
    preflight_paths: List[Path] = []
    for key in (base_slot, f"{agent}:{base_slot}"):
        for raw in preflight_tbl.get(key) or []:
            p = Path(raw).expanduser().resolve()
            if not p.is_file():
                raise FileNotFoundError(f"Policy slot_preflight[{key!r}] missing file: {p}")
            if p not in preflight_paths:
                preflight_paths.append(p)

    return agent, model, effort, preflight_paths


def validate_lead(raw: str) -> str:
    item = raw.strip()
    if item.startswith("- "):
        item = item[2:].strip()
    pointer = POINTER_RE.search(item)
    if not pointer:
        raise ValueError(
            f"Lead must include a backticked file path/line pointer (`path:line`): {raw!r}"
        )
    obs = item[pointer.end() :].strip()
    words = STE_WORD_RE.findall(obs)
    if len(words) > MAX_LEAD_WORDS:
        raise ValueError(
            f"Lead observation has {len(words)} STE words > {MAX_LEAD_WORDS}: {raw!r}"
        )
    return f"- {item}"


def build_arm_command(
    task_dir: Path,
    slot: str,
    agent: str,
    model: str,
    effort: str,
    cwd: Path,
    brief_path: Path,
    artifact_path: Path,
    session_line: str,
    herdr_scripts_dir: Optional[Path],
    timeout_s: int = 1800,
) -> Optional[str]:
    if not herdr_scripts_dir:
        return None
    await_sh = herdr_scripts_dir / "await.sh"
    herdr_agent_py = herdr_scripts_dir / "herdr-agent.py"
    resume = session_line.startswith("reused")
    waits = task_dir / "waits"
    n = 1
    while any((waits / f"{slot}-r{n}{ext}").exists() for ext in (".armed", ".settled", ".out")):
        n += 1
    arm_slot = f"{slot}-r{n}"

    meta_parts = [f"agent={agent}", f"model={model}"]
    if effort != "default":
        meta_parts.append(f"effort={effort}")
    meta_parts.extend([f"cwd={cwd}", f'purpose="execute {slot}"'])
    if resume:
        meta_parts.append("session=reused")
    meta_str = " ".join(f"--meta {m}" for m in meta_parts)

    prompt = f'"Read {brief_path} and follow it."'
    if resume:
        return (
            f"{await_sh} arm --dir {task_dir} --slot {arm_slot} --timeout-s {timeout_s} \\\n"
            f"  {meta_str} \\\n"
            f"  --artifact {artifact_path} \\\n"
            f"  -- python3 {herdr_agent_py} resume --task-dir {task_dir} --slot {slot} \\\n"
            f"     -- {prompt}"
        )

    cmd = [agent]
    if agent == "claude":
        if model != "default":
            cmd.extend(["--model", model])
        if effort != "default":
            cmd.extend(["--effort", effort])
        cmd.append("--dangerously-skip-permissions")
    elif agent == "codex":
        cmd.extend(["--no-daemon", "--dangerously-bypass-approvals-and-sandbox"])
        if model != "default":
            cmd.extend(["-m", model])
    elif agent == "agy":
        cmd.append("--dangerously-skip-permissions")
        if model != "default":
            cmd.extend(["--model", model])
        cmd.append("-i")
    else:
        if model != "default":
            cmd.extend(["--model", model])
    cmd.append(prompt)

    return (
        f"{await_sh} arm --dir {task_dir} --slot {arm_slot} --timeout-s {timeout_s} \\\n"
        f"  {meta_str} \\\n"
        f"  --artifact {artifact_path} \\\n"
        f"  -- python3 {herdr_agent_py} run --task-dir {task_dir} --slot {slot} \\\n"
        f"     --cwd {cwd} \\\n"
        f"     -- {' '.join(cmd)}"
    )


def _discover_verify_skills(cwd: Path) -> List[Path]:
    found: List[Path] = []
    for base in (cwd / ".agents" / "skills", cwd / ".cursor" / "skills", cwd / ".claude" / "skills"):
        if not base.is_dir():
            continue
        for sdir in sorted(base.glob("verify-*")):
            md = (sdir / "SKILL.md").resolve()
            if md.is_file() and md not in found:
                found.append(md)
    return found


def open_and_build_brief(
    *,
    task_dir: Path,
    slot: str,
    cwd: Path,
    workspace: Dict[str, object],
    policy_file: Optional[Path] = None,
    intent_text: Optional[str] = None,
    round_num: Optional[int] = None,
    session_mode: str = "auto",
    fresh_reason: Optional[str] = None,
    tier: str = "reviewed change",
    deliverable: Optional[str] = None,
    leads: Optional[List[str]] = None,
    out_of_scope: Optional[List[str]] = None,
    holds: Optional[List[str]] = None,
    release_holds: Optional[List[str]] = None,
    reset_baseline: bool = False,
    native_dispatch: Optional[bool] = None,
    timeout_s: int = 1800,
    ensure_baseline_only: bool = False,
) -> Dict[str, object]:
    b_slot = base_slot_of(slot)
    task_dir = task_dir.resolve()
    cwd = cwd.resolve()
    task_dir.mkdir(parents=True, exist_ok=True)
    intent_path = task_dir / "intent.md"
    record_path = task_dir / "record.md"
    sop_root = Path(workspace["sop_root"])  # type: ignore[arg-type]

    if intent_text is not None:
        append_intent(intent_path, intent_text)
    if not intent_path.is_file():
        raise FileNotFoundError(
            f"Missing {intent_path}; provide --intent-text or --intent-file on task initialization"
        )

    intent_raw = intent_path.read_text(encoding="utf-8")
    quotes = extract_intent_quotes(intent_raw)
    if not quotes:
        raise ValueError(f"{intent_path} contains no '>' verbatim quotes")
    haystack = intent_haystack(intent_raw)

    new_record_lines: List[str] = []
    baseline, created_primary = ensure_baseline(task_dir, cwd, reset=reset_baseline, workspace=workspace)
    if created_primary:
        new_record_lines.append(
            f"- Baseline [{baseline['repo']}]: path={baseline['repo_path']} head={baseline['head']} "
            f"tree={baseline['tree']} pre_dirty={len(baseline['dirty_files'])}"
        )

    repos_map: Dict[str, Path] = dict(workspace["repos"])  # type: ignore[arg-type]
    for rname, rpath in sorted(repos_map.items()):
        rr = rpath.resolve()
        if rr == Path(str(baseline["repo_path"])).resolve() or not SC.is_git_work_tree(rr):
            continue
        b_sib = task_dir / "evidence" / f"baseline-{rname}.json"
        if not b_sib.is_file():
            sib, created_sib = ensure_baseline(task_dir, rr, reset=False, workspace=workspace)
            if created_sib:
                new_record_lines.append(
                    f"- Baseline [{sib['repo']}]: path={sib['repo_path']} head={sib['head']} "
                    f"tree={sib['tree']} pre_dirty={len(sib['dirty_files'])}"
                )

    for raw_hold in holds or []:
        line = f"- HOLD {raw_hold.strip()}" if not raw_hold.strip().startswith("- HOLD") else raw_hold.strip()
        if not HOLD_LINE.match(line):
            raise ValueError(
                f"Invalid --hold syntax: {raw_hold!r}; expected 'H-n | scope: ... | release: ... | source: <verbatim>'"
            )
        new_record_lines.append(line)

    for raw_rel in release_holds or []:
        line = (
            f"- RELEASE {raw_rel.strip()}"
            if not raw_rel.strip().startswith("- RELEASE")
            else raw_rel.strip()
        )
        if not RELEASE_LINE.match(line):
            raise ValueError(
                f"Invalid --release-hold syntax: {raw_rel!r}; expected 'H-n | source: <verbatim>'"
            )
        new_record_lines.append(line)

    if new_record_lines:
        append_record_lines(record_path, new_record_lines)

    open_holds, hold_problems = parse_open_holds(record_path, haystack)
    if hold_problems:
        raise ValueError("; ".join(hold_problems))

    if ensure_baseline_only:
        return {
            "status": "BASELINE_OK",
            "task_dir": str(task_dir),
            "intent_path": str(intent_path.resolve()),
            "record_path": str(record_path.resolve()),
            "baseline": baseline,
        }

    resolved_policy_path, policy = SC.resolve_policy(policy_file, sop_root=sop_root, cwd=cwd)
    agent, model, effort, preflight_paths = resolve_dispatch_policy(policy, b_slot)

    reviews = numbered_artifacts(task_dir, "review")
    handoffs = numbered_artifacts(task_dir, "handoff")

    if session_mode == "auto":
        if slot.startswith("reviewer"):
            session_val = (
                f"fresh reason={fresh_reason or 'independent_review_per_dispatch'}"
                if reviews
                else "fresh"
            )
        else:
            has_prior = bool(reviews or handoffs)
            if fresh_reason:
                session_val = f"fresh reason={fresh_reason}"
            elif has_prior:
                session_val = "reused"
            else:
                session_val = "fresh"
    elif session_mode == "fresh":
        session_val = f"fresh reason={fresh_reason}" if fresh_reason else "fresh"
    elif session_mode == "reused":
        session_val = "reused"
    else:
        raise ValueError(f"Unsupported session mode: {session_mode!r}")

    rnd = round_num if round_num is not None else next_round_index(task_dir)
    brief_path = (task_dir / f"brief-{rnd}-{slot}.md").resolve()

    gates_ahead = "sop-gate.py (0-Token gates) + sop-audit.py (cross-vendor review); no commit/push/deploy without human approval"
    for hid, scope in open_holds.items():
        gates_ahead += f"; HOLD {hid}: {scope}"

    head_val = str(baseline.get("head", "n/a"))
    baseline_range = head_val[:12] if head_val not in ("n/a", "") else "n/a"

    if slot.startswith("reviewer"):
        live_tree = SC.tree_stamp_for_repo(cwd, str(baseline.get("repo")), workspace) if SC.is_git_work_tree(cwd) else "n/a"
        tree_line_val = live_tree
    else:
        tree_line_val = "n/a"

    dispatch_fields = [f"slot={slot}", f"agent={agent}", f"model={model}"]
    if effort != "default":
        dispatch_fields.append(f"effort={effort}")
    dispatch_fields.extend([f"cwd={cwd}", f"source={'policy' if resolved_policy_path else 'pstack'}"])

    deliv = deliverable or DEFAULT_DELIVERABLES.get(b_slot, "deliverable artifact")
    if re.search(r"<[^<>\n]+>", deliv):
        raise ValueError(f"Deliverable must not contain angle-bracket placeholders: {deliv!r}")

    herdr_dir = SC.resolve_herdr_scripts_dir()
    is_native = (herdr_dir is None) if native_dispatch is None else native_dispatch
    on_finish_val = "n/a (native dispatch)" if is_native else TEMPLATE_ON_FINISH_HERDR

    reading: List[Path] = [intent_path.resolve()]
    for static_doc in (
        sop_root / "AGENTS.md",
        sop_root / "WORKFLOW.md",
        cwd / "AGENTS.md",
        cwd / "CLAUDE.md",
        task_dir / "plan.md",
        task_dir / "evidence" / "gate-latest.json",
    ):
        rp = static_doc.resolve()
        if rp.is_file() and rp not in reading:
            reading.append(rp)

    if b_slot in ("writer", "scout"):
        for skill_doc in _discover_verify_skills(cwd):
            if skill_doc not in reading:
                reading.append(skill_doc)

    if b_slot == "writer":
        for tpl in ("handoff.md", "gate-packet.md", "delivery-report.md"):
            tpl_doc = (SC.TEMPLATES_DIR / tpl).resolve()
            if tpl_doc.is_file() and tpl_doc not in reading:
                reading.append(tpl_doc)

    if slot.startswith("reviewer"):
        if reviews:
            newest_rev = reviews[-1]
            if newest_rev not in reading:
                reading.append(newest_rev)
            expected_disp = task_dir / newest_rev.name.replace("review", "disposition")
            if expected_disp.is_file() and expected_disp.resolve() not in reading:
                reading.append(expected_disp.resolve())
    else:
        if handoffs and handoffs[-1] not in reading:
            reading.append(handoffs[-1])
        if reviews and reviews[-1] not in reading:
            reading.append(reviews[-1])
        for p in preflight_paths:
            if p not in reading:
                reading.append(p)

    if b_slot in ("reviewer", "scout"):
        for p in preflight_paths:
            if p not in reading:
                reading.append(p)

    validated_leads = [validate_lead(x) for x in (leads or [])]
    leads_body = "\n".join(validated_leads) if validated_leads else "Leads: none"

    scope_items = list(UNIVERSAL_SCOPE_GUARDS)
    for inv in SC.collect_project_invariants(repos_map, workspace):
        if not slot.startswith("monitor"):
            scope_items.append(f"- Project invariant: {inv}")
    for extra in out_of_scope or []:
        text = extra.strip()
        if not text:
            continue
        scope_items.append(text if text.startswith("- ") else f"- {text}")

    brief_content = "\n".join(
        [
            f"# Dispatch brief — {task_dir.name} → {slot}",
            "",
            f"- Label: {task_dir.name} / round-{rnd}-{slot}",
            f"- Dispatch: `{' '.join(dispatch_fields)}`",
            f"- Session: {session_val}",
            f"- Tier: {tier}",
            f"- Deliverable: {deliv}",
            f"- Gates ahead of you (stop and hand back before each): {gates_ahead}",
            f"- Baseline / diff range: {baseline_range}",
            f"- Tree: {tree_line_val}",
            "- Problem research (external dispatch only): `n/a`",
            f"- On finish: {on_finish_val}",
            "",
            "## Human's words (verbatim from intent.md)",
            "",
            *quotes,
            "",
            "## Required reading, in order",
            "",
            *[f"{idx}. `{p}`" for idx, p in enumerate(reading, start=1)],
            "",
            "## Unverified leads",
            "",
            leads_body,
            "",
            "## Out of scope",
            "",
            *scope_items,
            "",
        ]
    )

    brief_path.write_text(brief_content, encoding="utf-8")

    if not SC.CHECK_BRIEF_PY.is_file():
        brief_path.unlink(missing_ok=True)
        raise FileNotFoundError(f"Mandatory brief validator missing: {SC.CHECK_BRIEF_PY}")
    chk = subprocess.run(
        ["python3", str(SC.CHECK_BRIEF_PY), "--intent", str(intent_path), str(brief_path)],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    if chk.returncode != 0:
        brief_path.unlink(missing_ok=True)
        raise ValueError(
            f"check-brief.py refused generated brief (exit {chk.returncode}):\n{chk.stdout}\n{chk.stderr}".strip()
        )

    if b_slot == "writer":
        expected_artifact = task_dir / f"handoff-{len(handoffs) + 1}.md"
    elif b_slot == "reviewer":
        expected_artifact = task_dir / f"review-{len(reviews) + 1}.md"
    else:
        expected_artifact = task_dir / f"{b_slot}-{rnd}.md"

    arm_cmd = (
        None
        if is_native
        else build_arm_command(
            task_dir=task_dir,
            slot=slot,
            agent=agent,
            model=model,
            effort=effort,
            cwd=cwd,
            brief_path=brief_path,
            artifact_path=expected_artifact.resolve(),
            session_line=session_val,
            herdr_scripts_dir=herdr_dir,
            timeout_s=timeout_s,
        )
    )

    rec_line = (
        f"- Dispatch round-{rnd}: slot={slot} agent={agent} model={model} "
        f"{'effort=' + effort + ' ' if effort != 'default' else ''}"
        f"cwd={cwd} source={'policy' if resolved_policy_path else 'pstack'} session={session_val.split()[0]} brief={brief_path.name}"
    )
    append_record_lines(record_path, [rec_line])

    return {
        "status": "BRIEF_OK",
        "task_dir": str(task_dir),
        "intent_path": str(intent_path.resolve()),
        "record_path": str(record_path.resolve()),
        "brief_path": str(brief_path),
        "slot": slot,
        "agent": agent,
        "model": model,
        "effort": effort,
        "cwd": str(cwd),
        "tree": tree_line_val,
        "session": session_val,
        "expected_artifact": str(expected_artifact.resolve()),
        "arm_command": arm_cmd,
    }


def run_self_test() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="sop-open-self-test-"))
    try:
        repo = tmp / "sample-repo"
        repo.mkdir(parents=True)
        subprocess.run(["git", "-C", str(repo), "init", "-q"], check=True)
        subprocess.run(["git", "-C", str(repo), "config", "user.email", "test@example.com"], check=True)
        subprocess.run(["git", "-C", str(repo), "config", "user.name", "Tester"], check=True)
        (repo / "src").mkdir()
        (repo / "src" / "app.ts").write_text("export const v = 1;\n", encoding="utf-8")
        (repo / "AGENTS.md").write_text("# Sample Repo AGENTS\n", encoding="utf-8")
        (repo / ".sop").mkdir()
        (repo / ".sop" / "gates.json").write_text(
            json.dumps(
                {
                    "version": 1,
                    "repo": "sample-repo",
                    "high_risk_globs": ["src/app.ts"],
                    "ops_globs": [],
                    "project_invariants": ["Always check sample invariant"],
                    "gates": [{"id": "G-1", "description": "ok", "command": "true", "fast": True, "blocking": True}],
                }
            ),
            encoding="utf-8",
        )
        (repo / ".agents" / "skills" / "verify-app").mkdir(parents=True)
        (repo / ".agents" / "skills" / "verify-app" / "SKILL.md").write_text("# Verify App\n", encoding="utf-8")
        subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
        subprocess.run(["git", "-C", str(repo), "commit", "-qm", "init"], check=True)
        (repo / "src" / "app.ts").write_text("export const v = 2;\n", encoding="utf-8")

        preflight_doc = tmp / "preflight.md"
        preflight_doc.write_text("# Preflight\n", encoding="utf-8")
        policy_path = tmp / "sop-policy.json"
        policy_path.write_text(
            json.dumps(
                {
                    "slot_agents": {"writer": "agy", "reviewer": "claude", "scout": "claude"},
                    "slot_models": {"claude": {"scout": "claude-sonnet-5-5"}},
                    "slot_effort": {"claude": {"scout": "high"}},
                    "slot_preflight": {"writer": [str(preflight_doc)]},
                }
            ),
            encoding="utf-8",
        )

        ws = SC.load_workspace(repo)
        task_dir = repo / ".sop" / "tasks" / "2026-11-17-open-selftest"
        res1 = open_and_build_brief(
            task_dir=task_dir,
            slot="writer",
            cwd=repo,
            workspace=ws,
            policy_file=policy_path,
            intent_text="Fix quota check null bug\nDo not deploy to prod",
            leads=[f"`{repo / 'src' / 'app.ts'}:1` — pre-existing value equals 2"],
            holds=["H-1 | scope: prod deploy | release: explicit approval | source: Do not deploy to prod"],
            native_dispatch=True,
        )
        assert res1["status"] == "BRIEF_OK"
        b1 = Path(res1["brief_path"]).read_text(encoding="utf-8")
        assert "HOLD H-1: prod deploy" in b1
        assert "Always check sample invariant" in b1
        assert ".agents/skills/verify-app/SKILL.md" in b1
        assert "templates/handoff.md" in b1
        assert "- On finish: n/a (native dispatch)" in b1
        assert SC.is_ignored_control_plane_path(repo, ".sop/tasks/demo/brief.md", "sample-repo", ws) is True
        assert SC.is_ignored_control_plane_path(repo, ".sop/gates.json", "sample-repo", ws) is False
        baseline = json.loads((task_dir / "evidence" / "baseline-sample-repo.json").read_text(encoding="utf-8"))
        assert "src/app.ts" in baseline["dirty_files"]
        assert "src/app.ts" in baseline["dirty_snapshots"]

        b_subdir, created_subdir = ensure_baseline(task_dir, repo / "src", reset=False, workspace=ws)
        assert not created_subdir and b_subdir["repo"] == "sample-repo"

        (task_dir / "handoff-1.md").write_text("# Handoff 1\n", encoding="utf-8")
        try:
            open_and_build_brief(
                task_dir=task_dir, slot="writer", cwd=repo, workspace=ws, policy_file=policy_path, reset_baseline=True
            )
        except ValueError:
            pass
        else:
            raise AssertionError("Expected ValueError for --reset-baseline after handoff-1.md")

        (task_dir / "handoff-2.md").write_text("# Handoff 2\n", encoding="utf-8")
        (task_dir / "review-1.md").write_text("VERDICT: NEEDS_CHANGES\n- B-1: broken\n", encoding="utf-8")
        (task_dir / "disposition-1.md").write_text("| B-1 | FIXED | ok | `src/app.ts:1` |\n", encoding="utf-8")

        res2 = open_and_build_brief(
            task_dir=task_dir,
            slot="reviewer",
            cwd=repo,
            workspace=ws,
            policy_file=policy_path,
            release_holds=["H-1 | source: Do not deploy to prod"],
            native_dispatch=True,
        )
        assert res2["status"] == "BRIEF_OK"
        b2 = Path(res2["brief_path"]).read_text(encoding="utf-8")
        assert "handoff-1.md" not in b2 and "handoff-2.md" not in b2
        assert ".agents/skills/verify-app/SKILL.md" not in b2
        assert "review-1.md" in b2 and "disposition-1.md" in b2
        assert "Session: fresh reason=independent_review_per_dispatch" in b2
        assert "HOLD H-1" not in b2

        res3 = open_and_build_brief(
            task_dir=task_dir,
            slot="writer",
            cwd=repo,
            workspace=ws,
            policy_file=policy_path,
            native_dispatch=True,
        )
        b3 = Path(res3["brief_path"]).read_text(encoding="utf-8")
        assert "Session: reused" in b3
        assert "handoff-2.md" in b3 and "handoff-1.md" not in b3

        try:
            validate_lead("`src/app.ts:1` — " + " ".join(["word"] * 35))
        except ValueError:
            pass
        else:
            raise AssertionError("Expected ValueError for >30 STE word lead")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    print("ALL sop-open.py SELF-TESTS PASSED")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Deterministic Phase 0-2 SOP task & brief opener.")
    parser.add_argument("--task-dir", help="Task slug or path")
    parser.add_argument("--sop-root", help="SOP root directory (auto-discovered when omitted)")
    parser.add_argument("--slot", help="Target slot (writer, reviewer, scout, helper, monitor, or <slot>-<suffix>)")
    parser.add_argument("--cwd", help="Target repository name or path")
    parser.add_argument("--intent-text", help="Verbatim human words to append to intent.md")
    parser.add_argument("--intent-file", help="Path to text file containing verbatim human words to append to intent.md")
    parser.add_argument("--round", type=int, help="Explicit brief round number")
    parser.add_argument("--session", choices=["auto", "fresh", "reused"], default="auto")
    parser.add_argument("--fresh-reason", help="Explicit reason when opening a fresh session after prior rounds")
    parser.add_argument("--tier", default="reviewed change", help="Brief Tier label (tiny | reviewed change | operational)")
    parser.add_argument("--deliverable", help="Expected deliverable description (no <...> placeholders)")
    parser.add_argument("--lead", action="append", default=[], help="Unverified lead (`path:line` — <=30 word observation)")
    parser.add_argument("--out-of-scope", action="append", default=[], help="Additional Out of scope bullet")
    parser.add_argument("--hold", action="append", default=[], help="H-n | scope: ... | release: ... | source: <verbatim>")
    parser.add_argument("--release-hold", action="append", default=[], help="H-n | source: <verbatim>")
    parser.add_argument("--policy-file", help="Explicit policy JSON path")
    parser.add_argument("--reset-baseline", action="store_true", help="Re-capture evidence/baseline-<repo>.json")
    parser.add_argument("--ensure-baseline", action="store_true", help="Only capture baseline and intent.md without building a brief")
    parser.add_argument("--native", action="store_true", help="Set On finish to n/a (native dispatch)")
    parser.add_argument("--timeout-s", type=int, default=1800, help="Timeout seconds for --print-arm")
    parser.add_argument("--print-arm", action="store_true", help="Print await.sh arm command to stdout")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON output")
    parser.add_argument("--self-test", action="store_true", help="Run internal self-tests and exit")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()

    if not args.task_dir or not args.cwd or (not args.ensure_baseline and not args.slot):
        parser.error("--task-dir, --cwd, and --slot (or --ensure-baseline) are required unless --self-test is set")

    sop_root = SC.find_sop_root(
        explicit_root=Path(args.sop_root) if args.sop_root else None,
        task_dir=Path(args.task_dir) if ("/" in args.task_dir or Path(args.task_dir).is_absolute()) else None,
        cwd=Path(args.cwd) if Path(args.cwd).exists() else None,
    )
    ws = SC.load_workspace(sop_root)
    intent_text = args.intent_text
    if args.intent_file:
        intent_text = Path(args.intent_file).read_text(encoding="utf-8")

    try:
        result = open_and_build_brief(
            task_dir=SC.resolve_task_dir(args.task_dir, sop_root),
            slot=args.slot or "writer",
            cwd=resolve_cwd(args.cwd, ws),
            workspace=ws,
            policy_file=Path(args.policy_file).expanduser().resolve() if args.policy_file else None,
            intent_text=intent_text,
            round_num=args.round,
            session_mode=args.session,
            fresh_reason=args.fresh_reason,
            tier=args.tier,
            deliverable=args.deliverable,
            leads=args.lead,
            out_of_scope=args.out_of_scope,
            holds=args.hold,
            release_holds=args.release_hold,
            reset_baseline=args.reset_baseline,
            native_dispatch=(False if args.print_arm else (True if args.native else None)),
            timeout_s=args.timeout_s,
            ensure_baseline_only=args.ensure_baseline,
        )
    except (FileNotFoundError, ValueError, RuntimeError) as err:
        print(f"ERROR: {err}")
        return 2

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    elif args.print_arm and result.get("arm_command"):
        print(result["arm_command"])
    elif result.get("status") == "BASELINE_OK":
        print(f"BASELINE_OK {result['task_dir']}")
    else:
        print(f"BRIEF_OK {result['brief_path']}")
        print(f"EXPECTED_ARTIFACT {result['expected_artifact']}")
        print(f"TREE {result['tree']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
