#!/usr/bin/env python3
"""Shared path, workspace, policy, tree-stamp, and invariant discovery helpers."""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
TEMPLATES_DIR = SKILL_DIR / "assets" / "templates"
PSTACK_ROOT = SCRIPT_DIR.parents[2]
TREE_STAMP_SH = SCRIPT_DIR / "tree-stamp.sh"
CHECK_BRIEF_PY = SCRIPT_DIR / "check-brief.py"
DIFF_FLAGS_PY = SCRIPT_DIR / "diff-flags.py"
AST_PARSER_JS = SCRIPT_DIR / "parse-js-ts-ast.mjs"

DEFAULT_CONTROL_PLANE_HIGH_RISK_GLOBS = (
    "scripts/**",
    "sop-policy.json",
    ".sop/gates.json",
    ".sop/gates-lock.json",
    ".sop/workspace.json",
    ".sop/policy.json",
    "AGENTS.md",
    "WORKFLOW.md",
)

TRANSIENT_IGNORED_SEGMENTS = ("__pycache__",)
TRANSIENT_IGNORED_SUFFIXES = (".pyc", ".pyo")


def normalize_rel_path(raw: str) -> str:
    norm = raw.replace("\\", "/")
    while norm.startswith("./"):
        norm = norm[2:]
    return norm.lstrip("/")


def utc_now_iso() -> str:
    import datetime

    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def resolve_runner_script(explicit: Optional[Path] = None) -> Path:
    if explicit is not None:
        return explicit.expanduser().resolve()
    candidates = [
        PSTACK_ROOT / "docs" / "harness" / "run-external-agent.mjs",
        Path.home() / ".gemini" / "config" / "plugins" / "pstack" / "docs" / "harness" / "run-external-agent.mjs",
    ]
    for cand in candidates:
        if cand.is_file():
            return cand.resolve()
    return candidates[0].resolve()


def resolve_herdr_scripts_dir() -> Optional[Path]:
    if (SCRIPT_DIR / "await.sh").is_file() and (SCRIPT_DIR / "herdr-agent.py").is_file():
        return SCRIPT_DIR.resolve()
    return None


def git_out(repo: Path, *args: str) -> str:
    res = subprocess.run(
        ["git", "-C", str(repo), *args],
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
    if res.returncode != 0:
        err = res.stderr.decode("utf-8", errors="replace").strip()
        raise RuntimeError(f"git {' '.join(args)} failed in {repo}: {err}")
    return res.stdout.decode("utf-8", errors="replace")


def is_git_work_tree(cwd: Path) -> bool:
    if not cwd.exists():
        return False
    res = subprocess.run(
        ["git", "-C", str(cwd), "rev-parse", "--is-inside-work-tree"],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,
    )
    return res.returncode == 0 and res.stdout.strip() == "true"


def git_top_level(cwd: Path) -> Optional[Path]:
    if not is_git_work_tree(cwd):
        return None
    return Path(git_out(cwd, "rev-parse", "--show-toplevel").strip()).resolve()


def find_sop_root(
    explicit_root: Optional[Path] = None,
    task_dir: Optional[Path] = None,
    cwd: Optional[Path] = None,
) -> Path:
    if explicit_root is not None:
        return explicit_root.expanduser().resolve()
    env_root = os.environ.get("SOP_ROOT", "").strip()
    if env_root:
        return Path(env_root).expanduser().resolve()

    if task_dir is not None:
        td = task_dir.expanduser().resolve()
        if td.parent.name == "tasks":
            if td.parent.parent.name == ".sop":
                return td.parent.parent.parent.resolve()
            return td.parent.parent.resolve()

    probe_start = (cwd or Path.cwd()).expanduser().resolve()
    for anc in (probe_start, *probe_start.parents):
        if (anc / ".sop" / "workspace.json").is_file():
            return anc
        if (anc / "sop-policy.json").is_file() and (anc / "tasks").is_dir():
            return anc
        if (anc / ".sop" / "gates.json").is_file():
            return anc

    top = git_top_level(probe_start)
    return top if top is not None else probe_start


def load_workspace(
    sop_root: Path,
    repo_map_overrides: Optional[Dict[str, Path]] = None,
) -> Dict[str, object]:
    root = sop_root.expanduser().resolve()
    ws_file = root / ".sop" / "workspace.json"
    repos: Dict[str, Path] = {}
    control_plane_repo: Optional[str] = None
    ignored_by_repo: Dict[str, Tuple[str, ...]] = {}
    high_risk_by_repo: Dict[str, Tuple[str, ...]] = {}
    invariants: List[str] = []
    ops_commands_regex: Optional[str] = None

    if ws_file.is_file():
        data = json.loads(ws_file.read_text(encoding="utf-8"))
        raw_repos = data.get("repos") or {}
        for rname, raw_path in raw_repos.items():
            rp = Path(str(raw_path)).expanduser()
            repos[str(rname)] = (root / rp).resolve() if not rp.is_absolute() else rp.resolve()
        cp = data.get("control_plane_repo")
        control_plane_repo = str(cp) if cp else None
        tasks_rel = str(data.get("tasks_dir") or "tasks")
        metrics_rel = str(data.get("metrics_dir") or "metrics")
        lock_rel = str(data.get("lock_file") or f"{metrics_rel}/gates-lock.json")
        tasks_dir = (root / tasks_rel).resolve()
        metrics_dir = (root / metrics_rel).resolve()
        lock_file = (root / lock_rel).resolve()
        if control_plane_repo and control_plane_repo in repos:
            ign = tuple(str(x) for x in (data.get("ignored_prefixes") or [f"{tasks_rel.rstrip('/')}/", f"{metrics_rel.rstrip('/')}/"]))
            hr = tuple(str(x) for x in (data.get("control_plane_high_risk_globs") or DEFAULT_CONTROL_PLANE_HIGH_RISK_GLOBS))
            ignored_by_repo[control_plane_repo] = ign
            high_risk_by_repo[control_plane_repo] = hr
        invariants = [str(x) for x in (data.get("project_invariants") or []) if str(x).strip()]
        if data.get("ops_commands_regex"):
            ops_commands_regex = str(data["ops_commands_regex"])
    else:
        top = git_top_level(root) or root
        repos = {top.name: top}
        has_root_tasks = (root / "tasks").is_dir() or (root / "sop-policy.json").is_file()
        if has_root_tasks:
            tasks_dir = (root / "tasks").resolve()
            metrics_dir = (root / "metrics").resolve()
            lock_file = (
                (root / ".sop" / "gates-lock.json").resolve()
                if (root / ".sop" / "gates-lock.json").is_file()
                else (metrics_dir / "gates-lock.json").resolve()
            )
            ignored_by_repo[top.name] = ("tasks/", "metrics/")
        else:
            tasks_dir = (root / ".sop" / "tasks").resolve()
            metrics_dir = (root / ".sop" / "metrics").resolve()
            lock_file = (root / ".sop" / "gates-lock.json").resolve()
            ignored_by_repo[top.name] = (".sop/tasks/", ".sop/metrics/")

    if repo_map_overrides:
        repos = {k: v.expanduser().resolve() for k, v in repo_map_overrides.items()}
        for k in repos:
            if k not in ignored_by_repo:
                ignored_by_repo[k] = (".sop/tasks/", ".sop/metrics/")

    return {
        "sop_root": root,
        "repos": repos,
        "control_plane_repo": control_plane_repo,
        "tasks_dir": tasks_dir,
        "metrics_dir": metrics_dir,
        "lock_file": lock_file,
        "ignored_by_repo": ignored_by_repo,
        "high_risk_by_repo": high_risk_by_repo,
        "project_invariants": invariants,
        "ops_commands_regex": ops_commands_regex,
    }


def resolve_task_dir(raw: str, sop_root: Path) -> Path:
    p = Path(raw).expanduser()
    if "/" not in raw and not p.is_absolute():
        ws = load_workspace(sop_root)
        return (Path(ws["tasks_dir"]) / raw).resolve()  # type: ignore[arg-type]
    return p.resolve()


def _parse_pstack_agent_rules() -> Optional[Dict[str, object]]:
    candidates = [
        PSTACK_ROOT / "rules" / "AGENTS.md",
        Path.home() / ".gemini" / "config" / "plugins" / "pstack" / "rules" / "AGENTS.md",
    ]
    for cand in candidates:
        if not cand.is_file():
            continue
        lines = cand.read_text(encoding="utf-8", errors="ignore").splitlines()
        specs: List[str] = []
        for ln in lines:
            s = ln.strip()
            if s.startswith(("interrogate reviewers:", "arena cross-judge pool:")):
                rhs = s.split(":", 1)[1]
                for part in rhs.split(","):
                    tok = part.strip()
                    if tok.startswith("cli:"):
                        specs.append(tok)
                if specs:
                    break
        if specs:
            first = specs[0].split(":")
            cli = first[1] if len(first) > 1 else "claude"
            model = first[2] if len(first) > 2 else ""
            effort = first[3] if len(first) > 3 else ""
            slot_models: Dict[str, Dict[str, str]] = {}
            slot_effort: Dict[str, Dict[str, str]] = {}
            if model:
                slot_models[cli] = {"reviewer": model}
            if effort:
                slot_effort[cli] = {"reviewer": effort}
            return {
                "slot_agents": {"writer": "agy", "reviewer": cli, "scout": cli},
                "slot_models": slot_models,
                "slot_effort": slot_effort,
                "slot_preflight": {},
            }
    return None


def resolve_policy(
    explicit_policy: Optional[Path] = None,
    sop_root: Optional[Path] = None,
    cwd: Optional[Path] = None,
) -> Tuple[Optional[Path], Dict[str, object]]:
    env_p = os.environ.get("SOP_POLICY_FILE", "").strip()
    candidates: List[Optional[Path]] = [
        explicit_policy.expanduser().resolve() if explicit_policy else None,
        Path(env_p).expanduser().resolve() if env_p else None,
        (sop_root / "sop-policy.json") if sop_root else None,
        (sop_root / ".sop" / "policy.json") if sop_root else None,
        (cwd / ".sop" / "policy.json") if cwd else None,
        Path.cwd() / "sop-policy.json",
        Path.home() / ".agents" / "sop-policy.json",
    ]
    for cand in candidates:
        if cand and cand.is_file():
            return cand.resolve(), json.loads(cand.read_text(encoding="utf-8"))
    parsed_rules = _parse_pstack_agent_rules()
    if parsed_rules is not None:
        return None, parsed_rules
    return None, {
        "slot_agents": {"writer": "agy", "reviewer": "claude", "scout": "claude"},
        "slot_models": {},
        "slot_effort": {},
        "slot_preflight": {},
    }


def is_ignored_control_plane_path(
    repo_root: Path,
    rel_path: str,
    repo_name: Optional[str] = None,
    workspace: Optional[Dict[str, object]] = None,
) -> bool:
    norm = normalize_rel_path(rel_path)
    if (
        norm.startswith("__pycache__/")
        or "/__pycache__/" in norm
        or norm.endswith(TRANSIENT_IGNORED_SUFFIXES)
    ):
        return True
    if norm in (".sop/gates.json", ".sop/gates-lock.json", ".sop/workspace.json", ".sop/policy.json", "metrics/gates-lock.json"):
        return False
    prefixes: Tuple[str, ...] = (".sop/tasks/", ".sop/metrics/")
    if workspace:
        ign_map: Dict[str, Tuple[str, ...]] = workspace.get("ignored_by_repo") or {}  # type: ignore[assignment]
        rkey = repo_name or repo_root.name
        if rkey in ign_map:
            prefixes = tuple(set(prefixes) | set(ign_map[rkey]))
    return norm.startswith(prefixes)


def tree_stamp_raw(repo_root: Path) -> str:
    if TREE_STAMP_SH.is_file():
        res = subprocess.run(
            ["bash", str(TREE_STAMP_SH), str(repo_root)],
            capture_output=True,
            text=True,
            stdin=subprocess.DEVNULL,
        )
        if res.returncode == 0 and res.stdout.strip().startswith("tree="):
            return res.stdout.strip()
        raise RuntimeError(
            f"tree-stamp.sh failed for {repo_root}: {res.stderr.strip() or res.stdout.strip()}"
        )
    return tree_stamp_filtered(repo_root, ignored_prefixes=())


def tree_stamp_filtered(repo_root: Path, ignored_prefixes: Tuple[str, ...]) -> str:
    resolved = repo_root.resolve()
    res = subprocess.run(
        ["git", "-C", str(resolved), "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
    if res.returncode != 0:
        raise RuntimeError(f"git ls-files failed for {resolved}")
    raw_paths: List[str] = []
    for p in res.stdout.decode("utf-8", errors="replace").split("\0"):
        if not p:
            continue
        norm = normalize_rel_path(p)
        if norm.startswith("__pycache__/") or "/__pycache__/" in norm or norm.endswith(TRANSIENT_IGNORED_SUFFIXES):
            continue
        if norm not in (".sop/gates.json", ".sop/gates-lock.json", ".sop/workspace.json", ".sop/policy.json", "metrics/gates-lock.json"):
            if norm.startswith(ignored_prefixes):
                continue
        raw_paths.append(p)
    raw_paths = sorted(set(raw_paths))
    records: List[str] = []
    reg_files: List[str] = []
    for rel in raw_paths:
        full = resolved / rel
        if full.is_symlink():
            records.append(f"link {os.readlink(full)} {rel}")
        elif full.is_file():
            reg_files.append(rel)
    if reg_files:
        ho = subprocess.run(
            ["git", "-C", str(resolved), "hash-object", "--no-filters", "--stdin-paths"],
            input="\n".join(reg_files) + "\n",
            capture_output=True,
            text=True,
            cwd=str(resolved),
        )
        if ho.returncode != 0:
            raise RuntimeError(f"git hash-object failed for {resolved}: {ho.stderr.strip()}")
        for hval, rel in zip(ho.stdout.splitlines(), reg_files):
            records.append(f"{hval} {rel}")
    records.sort()
    digest = hashlib.sha256("\n".join(records).encode("utf-8")).hexdigest()[:12]
    return f"tree={digest}"


def tree_stamp_for_repo(
    repo_root: Path,
    repo_name: Optional[str] = None,
    workspace: Optional[Dict[str, object]] = None,
) -> str:
    resolved = repo_root.resolve()
    prefixes: Tuple[str, ...] = (".sop/tasks/", ".sop/metrics/")
    if workspace:
        ign_map: Dict[str, Tuple[str, ...]] = workspace.get("ignored_by_repo") or {}  # type: ignore[assignment]
        rkey = repo_name or resolved.name
        if rkey in ign_map:
            prefixes = tuple(set(prefixes) | set(ign_map[rkey]))
    if (resolved / ".sop").is_dir() or (workspace and (repo_name or resolved.name) == workspace.get("control_plane_repo")):
        return tree_stamp_filtered(resolved, prefixes)
    return tree_stamp_raw(resolved)


def collect_project_invariants(
    repo_roots: Dict[str, Path],
    workspace: Optional[Dict[str, object]] = None,
) -> List[str]:
    out: List[str] = []
    seen: set[str] = set()
    if workspace:
        for inv in workspace.get("project_invariants") or []:  # type: ignore[union-attr]
            s = str(inv).strip()
            if s and s not in seen:
                seen.add(s)
                out.append(s)
    for rname, rpath in sorted(repo_roots.items()):
        gfile = rpath / ".sop" / "gates.json"
        if not gfile.is_file():
            continue
        try:
            data = json.loads(gfile.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for inv in data.get("project_invariants") or []:
            s = str(inv).strip()
            if s and s not in seen:
                seen.add(s)
                out.append(f"[{rname}] {s}" if len(repo_roots) > 1 and not s.startswith("[") else s)
    return out


def glob_to_regex(pattern: str) -> re.Pattern[str]:
    pat = normalize_rel_path(pattern.strip())
    i = 0
    out = ["^"]
    n = len(pat)
    while i < n:
        if pat.startswith("**/", i):
            out.append("(?:.+/)?")
            i += 3
        elif pat.startswith("/**", i):
            out.append("(?:/.*)?")
            i += 3
        elif pat.startswith("**", i):
            out.append(".*")
            i += 2
        elif pat[i] == "*":
            out.append("[^/]*")
            i += 1
        elif pat[i] == "?":
            out.append("[^/]")
            i += 1
        else:
            out.append(re.escape(pat[i]))
            i += 1
    out.append("$")
    return re.compile("".join(out))


def glob_match(rel_path: str, pattern: str) -> bool:
    norm = normalize_rel_path(rel_path)
    return bool(glob_to_regex(pattern).match(norm))
