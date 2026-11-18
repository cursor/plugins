#!/usr/bin/env python3
"""Deterministic 0-Token gate runner, static preflight, risk-tier classifier, and signed receipt issuer."""

from __future__ import annotations

import argparse
import ast
import hashlib
import importlib.util
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import tokenize
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

_SDIR = str(Path(__file__).resolve().parent)
if _SDIR not in sys.path:
    sys.path.insert(0, _SDIR)

import sop_common as SC

_VGR_SPEC = importlib.util.spec_from_file_location("vgr", SC.SCRIPT_DIR / "verify-gates-registry.py")
assert _VGR_SPEC and _VGR_SPEC.loader
VGR = importlib.util.module_from_spec(_VGR_SPEC)
_VGR_SPEC.loader.exec_module(VGR)

DF = None
if SC.DIFF_FLAGS_PY.is_file():
    _df_spec = importlib.util.spec_from_file_location("diff_flags", SC.DIFF_FLAGS_PY)
    if _df_spec and _df_spec.loader:
        DF = importlib.util.module_from_spec(_df_spec)
        _df_spec.loader.exec_module(DF)

CODE_EXT = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".go", ".rs", ".java", ".kt", ".kts",
    ".swift", ".m", ".mm", ".c", ".cc", ".cpp", ".h", ".hpp", ".rb", ".php", ".sh", ".bash",
    ".sql", ".vue", ".svelte", ".dart", ".cs", ".scala", ".lua",
}
TEST_PATH_RE = re.compile(
    r"(^|/)(?:tests?|__tests__|spec)/|(\.|_)(?:test|spec)\.[^/]+$|(^|/)test_[^/]+\.py$|_test\.(?:go|py)$"
)
CWD_IN_BRIEF_RE = re.compile(r"\bcwd=(\S+)")
FENCED_SHELL_RE = re.compile(r"^```(?:bash|sh|shell|zsh)\b[^\n]*\n(.*?)^```\s*$", re.MULTILINE | re.DOTALL)
SUBSHELL_VAR_RE = re.compile(
    r"(?<!\\)\$(?:\{([A-Za-z_][A-Za-z0-9_]*)(?:(:[-=?+])[^}]*)?\}|([A-Za-z_][A-Za-z0-9_]*))"
)
STANDARD_SHELL_VARS = {
    "HOME", "PATH", "USER", "LOGNAME", "PWD", "OLDPWD", "SHELL", "TERM", "TMPDIR",
    "LANG", "LC_ALL", "HC_TERMINAL_ID", "IFS", "RANDOM", "SECONDS", "LINENO",
    "OSTYPE", "HOSTNAME", "SHLVL", "UID", "EUID", "PPID", "PIPESTATUS", "FUNCNAME",
    "BASH_SOURCE", "CI", "NODE_ENV",
}

DEFAULT_OPS_COMMAND_RE = re.compile(
    r"\b(?:scripts/deploy[^/\s]*\.sh|scripts/rollback[^/\s]*\.sh|"
    r"eas\s+(?:build|update|submit)|pm2\s+|psql\b|redis-cli\b|systemctl\b|kubectl\s+(?:apply|delete|rollout))\b"
)

TS_IGNORE_RE = re.compile(r"@ts-ignore\b")
SUPPRESSION_COMMENT_RE = re.compile(
    r"^(?:eslint-disable(?:-next-line|-line)?\b(?P<es_tail>.*)|"
    r"@ts-expect-error\b(?P<ts_tail>.*)|"
    r"type:\s*ignore\b(?:\s*\[[^\]]+\])?(?P<py_tail>.*)|"
    r"biome-ignore\b(?P<bi_tail>.*))"
)
EXCUSE_COMMENT_RE = re.compile(
    r"(?i)\b(?:hack|workaround|for now|temporary|temp fix)\b|临时|先这样|暂时|绕一下"
)
DRIFT_TOKEN_RE = re.compile(r"(?:\b\d+\.\d+\.\d+\b|/api/[A-Za-z0-9_./-]+|\b[A-Z][A-Z0-9_]{3,}\b)")
DOMAIN_WORD_RE = re.compile(r"(?:quota|cost|price|amount|balance|credit|points|limit)", re.I)

_SHFMT_BIN = shutil.which("shfmt") or next(
    (p for p in ("/opt/homebrew/bin/shfmt", "/usr/local/bin/shfmt") if os.path.isfile(p) and os.access(p, os.X_OK)),
    None,
)
_PM2_BARE_SUBCMD_RE = re.compile(r"(?<![./\w-])pm2\s+(?:reload|restart|start|stop|delete|gracefulReload)\b")
_RM_MOBILE_TARGET_RE = re.compile(r"^(?:[^\s;|&]*/)?(?:ios|android)(?:/(?:Pods|\.gradle|build))?/?$")
_PS_CMDLINE_ARGS_RE = re.compile(
    r"(?:^|\s)(?:\baux[A-Za-z]*\b|-[A-Za-z]*e[A-Za-z]*f\b|-[A-Za-z]*o\s*(?:[A-Za-z_=%]+,)*(?:args|command|cmd)(?:=|\b))"
)
_PM2_MUTATE_SUBCMDS = {"reload", "restart", "start", "stop", "delete", "gracefulReload"}
_SSH_ARG_OPTS = "BbcDEeFIiJLlmOopQRSWw"
_SUDO_ARG_OPTS = "CDghpRrTtUu"
_READ_ARG_OPTS = "dinNptu"
_NPX_ARG_OPTS = "pc"
_SHFMT_META_KEYS = frozenset(
    ("Pos", "End", "Position", "ValuePos", "ValueEnd", "Left", "Right", "OpPos", "Dollar", "Hash", "Semicolon", "Comments")
)
_ISOLATED_SHELL_SCOPE_TYPES = frozenset(("Subshell", "CmdSubst", "ProcSubst", "FuncDecl"))


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
    return res.stdout.strip() if res.returncode == 0 else "__ERR__"


def _read_raw_text(path: Path) -> str:
    return path.read_bytes().decode("utf-8", errors="ignore")


def current_dirty_hashes(
    repo_root: Path,
    repo_name: Optional[str] = None,
    workspace: Optional[Dict[str, object]] = None,
) -> Dict[str, str]:
    paths: set[str] = set()
    p1 = subprocess.run(
        ["git", "-C", str(repo_root), "diff", "--name-only", "-z", "HEAD"],
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
    if p1.returncode == 0:
        for x in p1.stdout.decode("utf-8", errors="replace").split("\0"):
            if x and not SC.is_ignored_control_plane_path(repo_root, x, repo_name, workspace):
                paths.add(x)
    p2 = subprocess.run(
        ["git", "-C", str(repo_root), "ls-files", "-z", "--others", "--exclude-standard"],
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
    if p2.returncode == 0:
        for x in p2.stdout.decode("utf-8", errors="replace").split("\0"):
            if x and not SC.is_ignored_control_plane_path(repo_root, x, repo_name, workspace):
                paths.add(x)
    return {p: hash_worktree_file(repo_root, p) for p in sorted(paths)}


def task_changed_files_for_repo(
    repo_root: Path,
    baseline_path: Optional[Path],
    explicit_base: Optional[str],
    ev_dir: Optional[Path] = None,
    repo_name: Optional[str] = None,
    workspace: Optional[Dict[str, object]] = None,
) -> Tuple[List[str], str, List[str], Dict[str, Path], Dict[str, object]]:
    dirty_now = current_dirty_hashes(repo_root, repo_name, workspace)
    untracked_res = subprocess.run(
        ["git", "-C", str(repo_root), "ls-files", "-z", "--others", "--exclude-standard"],
        capture_output=True,
        stdin=subprocess.DEVNULL,
    )
    untracked = (
        [
            x
            for x in untracked_res.stdout.decode("utf-8", errors="replace").split("\0")
            if x and not SC.is_ignored_control_plane_path(repo_root, x, repo_name, workspace)
        ]
        if untracked_res.returncode == 0
        else []
    )

    if baseline_path and baseline_path.is_file():
        bdata = json.loads(baseline_path.read_text(encoding="utf-8"))
        b_head = str(bdata.get("head") or "HEAD")
        b_dirty = dict(bdata.get("dirty_files") or {})
        b_snaps_raw = dict(bdata.get("dirty_snapshots") or {})
        b_sha = hashlib.sha256(baseline_path.read_bytes()).hexdigest()
        b_meta: Dict[str, object] = {
            "present": True,
            "path": str(baseline_path.resolve()),
            "head": b_head,
            "sha256": b_sha,
            "captured_at_utc": bdata.get("captured_at_utc"),
        }

        snap_paths: Dict[str, Path] = {}
        if ev_dir is not None:
            for rel, rel_snap in b_snaps_raw.items():
                sp = (ev_dir / rel_snap).resolve()
                if sp.is_file():
                    snap_paths[rel] = sp

        eff_base = b_head if (b_head and b_head != "n/a") else "HEAD"
        if explicit_base:
            if b_head and b_head != "n/a":
                chk = subprocess.run(
                    ["git", "-C", str(repo_root), "merge-base", "--is-ancestor", explicit_base, b_head],
                    capture_output=True,
                    text=True,
                    stdin=subprocess.DEVNULL,
                )
                if chk.returncode != 0:
                    raise ValueError(
                        f"Refusing --base {explicit_base!r} for {repo_root.name}: must equal or predate baseline head {b_head[:12]}"
                    )
            eff_base = explicit_base

        cur_head = SC.git_out(repo_root, "rev-parse", "HEAD").strip()
        changed: set[str] = set()
        if eff_base != cur_head:
            for p in _split_git_diff_lines(SC.git_out(repo_root, "diff", "--name-only", eff_base, "HEAD")):
                if p and not SC.is_ignored_control_plane_path(repo_root, p, repo_name, workspace):
                    changed.add(p)

        for p in set(dirty_now.keys()) | set(b_dirty.keys()):
            if SC.is_ignored_control_plane_path(repo_root, p, repo_name, workspace):
                continue
            if dirty_now.get(p) != b_dirty.get(p):
                changed.add(p)

        if eff_base != b_head and b_head != "n/a":
            for p in _split_git_diff_lines(SC.git_out(repo_root, "diff", "--name-only", eff_base)):
                if p and not SC.is_ignored_control_plane_path(repo_root, p, repo_name, workspace):
                    changed.add(p)

        return sorted(changed), eff_base, untracked, snap_paths, b_meta

    diff_base = explicit_base or "HEAD"
    tracked = [
        x
        for x in _split_git_diff_lines(SC.git_out(repo_root, "diff", "--name-only", diff_base))
        if x and not SC.is_ignored_control_plane_path(repo_root, x, repo_name, workspace)
    ]
    b_meta_missing: Dict[str, object] = {
        "present": False,
        "path": str(baseline_path) if baseline_path else None,
        "head": None,
        "sha256": None,
        "captured_at_utc": None,
    }
    return sorted(set(tracked) | set(untracked)), diff_base, untracked, {}, b_meta_missing


def brief_referenced_repos(task_dir: Path, repo_map: Dict[str, Path]) -> List[str]:
    names: set[str] = set()
    by_resolved = {p.resolve(): k for k, p in repo_map.items()}
    for bf in task_dir.glob("brief-*.md"):
        for m in CWD_IN_BRIEF_RE.finditer(bf.read_text(encoding="utf-8", errors="ignore")):
            p = Path(m.group(1)).resolve()
            if p in by_resolved:
                names.add(by_resolved[p])
            elif p.name in repo_map:
                names.add(p.name)
    ev_dir = task_dir / "evidence"
    if ev_dir.is_dir():
        for bf in ev_dir.glob("baseline-*.json"):
            rname = bf.stem.removeprefix("baseline-")
            if rname in repo_map:
                names.add(rname)
    return sorted(names)


def extract_shell_blocks_from_markdown(md_path: Path) -> List[Tuple[int, str]]:
    text = md_path.read_text(encoding="utf-8", errors="ignore")
    blocks: List[Tuple[int, str]] = []
    for m in FENCED_SHELL_RE.finditer(text):
        header_line = text[: m.start()].count("\n") + 1
        blocks.append((header_line + 1, m.group(1)))
    return blocks


def is_var_bound_inside_subshell(var: str, body: str) -> bool:
    patterns = (
        rf"(?:^|[;\n|&{{(])\s*(?:export\s+|local\s+|declare(?:\s+-[A-Za-z]+)*\s+|readonly\s+)?{re.escape(var)}\s*=",
        rf"\bfor\s+{re.escape(var)}\s+in\b",
        rf"\bread\b[^\n;]*\b{re.escape(var)}\b",
    )
    return any(re.search(pat, body, re.MULTILINE) for pat in patterns)


def _parse_shfmt_json(script: str) -> Tuple[Optional[Dict[str, object]], str]:
    if not _SHFMT_BIN:
        raise RuntimeError("shfmt binary is required for check_shell_block; install via `brew install shfmt`")
    payload = script.encode("utf-8")
    last_err = ""
    for dialect in ("bash", "posix"):
        res = subprocess.run(
            [_SHFMT_BIN, "-ln", dialect, "-tojson"],
            input=payload,
            capture_output=True,
            stdin=None,
        )
        if res.returncode == 0:
            try:
                parsed = json.loads(res.stdout.decode("utf-8"))
                return (parsed if isinstance(parsed, dict) else None), ""
            except ValueError as err:
                last_err = str(err)
        else:
            last_err = res.stderr.decode("utf-8", errors="replace").strip()
    return None, last_err


def _collect_shfmt_comments(tree: Dict[str, object]) -> Dict[int, List[str]]:
    by_line: Dict[int, List[str]] = {}
    stack: List[object] = [tree]
    while stack:
        cur = stack.pop()
        if isinstance(cur, list):
            stack.extend(cur)
        elif isinstance(cur, dict):
            h = cur.get("Hash")
            t = cur.get("Text")
            if isinstance(h, dict) and isinstance(t, str) and isinstance(h.get("Line"), int):
                by_line.setdefault(int(h["Line"]), []).append("#" + t)
            stack.extend(cur.values())
    return by_line


def _ast_has_marker(comments_by_line: Dict[int, List[str]], start_ln: int, end_ln: int, marker: str) -> bool:
    return any(
        marker in text
        for ln in range(start_ln, end_ln + 1)
        for text in comments_by_line.get(ln, ())
    )


def _unescape_shfmt_lit(raw: str, in_dq: bool) -> str:
    out: List[str] = []
    i = 0
    n = len(raw)
    while i < n:
        ch = raw[i]
        if ch == "\\" and i + 1 < n:
            nxt = raw[i + 1]
            if nxt == "\n":
                i += 2
                continue
            if not in_dq or nxt in ('"', "\\", "$", "`"):
                out.append(nxt)
                i += 2
                continue
        out.append(ch)
        i += 1
    return "".join(out)


def _render_shfmt_word(word_node: object, cmdsub_placeholder: str = "__CMDSUB__") -> str:
    if not isinstance(word_node, dict):
        return ""
    parts = word_node.get("Parts")
    if not isinstance(parts, list):
        return ""

    def render_parts(items: Sequence[object], in_dq: bool) -> str:
        buf: List[str] = []
        for part in items:
            if not isinstance(part, dict):
                continue
            ptype = part.get("Type")
            if ptype == "Lit":
                buf.append(_unescape_shfmt_lit(str(part.get("Value") or ""), in_dq))
            elif ptype == "SglQuoted":
                buf.append(str(part.get("Value") or ""))
            elif ptype == "DblQuoted":
                inner = part.get("Parts")
                if isinstance(inner, list):
                    buf.append(render_parts(inner, True))
            elif ptype in ("CmdSubst", "ProcSubst"):
                buf.append(cmdsub_placeholder)
            elif ptype in ("ParamExp", "ArithmExp", "ExtGlob"):
                buf.append("__EXP__")
        return "".join(buf)

    return render_parts(parts, False)


def _short_opt_consumes_next(flag: str, arg_chars: str) -> bool:
    if not flag.startswith("-") or flag.startswith("--") or len(flag) < 2:
        return False
    for idx, ch in enumerate(flag[1:]):
        if ch in arg_chars:
            return idx + 2 == len(flag)
    return False


def _unwrap_cmd_words(
    pairs: List[Tuple[str, Dict[str, object]]],
) -> Tuple[List[Tuple[str, Dict[str, object]]], set[str]]:
    inline_env: set[str] = set()
    i = 0
    n = len(pairs)
    while i < n:
        cmd = pairs[i][0]
        bcmd = os.path.basename(cmd) if "/" in cmd else cmd
        if cmd == "command":
            j = i + 1
            while j < n:
                w = pairs[j][0]
                if w == "--":
                    j += 1
                    break
                if not w.startswith("-") or w == "-":
                    break
                if not w.startswith("--") and ("v" in w[1:] or "V" in w[1:]):
                    return [], inline_env
                j += 1
            i = j
            continue
        if bcmd in ("nohup", "time"):
            j = i + 1
            while j < n:
                w = pairs[j][0]
                if w == "--":
                    j += 1
                    break
                if not w.startswith("-") or w == "-":
                    break
                j += 1
            i = j
            continue
        if cmd == "exec":
            j = i + 1
            while j < n:
                w = pairs[j][0]
                if w == "--":
                    j += 1
                    break
                if not w.startswith("-") or w == "-":
                    break
                j += 2 if (_short_opt_consumes_next(w, "a") and j + 1 < n) else 1
            i = j
            continue
        if bcmd == "sudo":
            j = i + 1
            while j < n:
                w = pairs[j][0]
                if w == "--":
                    j += 1
                    break
                if not w.startswith("-") or w == "-":
                    break
                if w in ("--chdir", "--close-from", "--group", "--host", "--prompt", "--role", "--type", "--other-user", "--user") and j + 1 < n:
                    j += 2
                elif _short_opt_consumes_next(w, _SUDO_ARG_OPTS) and j + 1 < n:
                    j += 2
                else:
                    j += 1
            i = j
            continue
        if bcmd == "nice":
            j = i + 1
            while j < n:
                w = pairs[j][0]
                if w == "--":
                    j += 1
                    break
                if not w.startswith("-") or w == "-":
                    break
                j += 2 if (w in ("-n", "--adjustment") and j + 1 < n) else 1
            i = j
            continue
        if bcmd == "env":
            j = i + 1
            end_opts = False
            while j < n:
                w = pairs[j][0]
                if not end_opts and w == "--":
                    end_opts = True
                    j += 1
                    continue
                if not end_opts and w.startswith("-") and w != "-":
                    if w in ("--unset", "--chdir", "--split-string") and j + 1 < n:
                        j += 2
                    elif _short_opt_consumes_next(w, "uCS") and j + 1 < n:
                        j += 2
                    else:
                        j += 1
                    continue
                eq_m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=", w)
                if eq_m:
                    inline_env.add(eq_m.group(1))
                    j += 1
                    continue
                break
            i = j
            continue
        break
    return pairs[i:], inline_env


def _strip_npx_prefix(pairs: List[Tuple[str, Dict[str, object]]]) -> List[Tuple[str, Dict[str, object]]]:
    if not pairs or os.path.basename(pairs[0][0]) != "npx":
        return pairs
    j = 1
    n = len(pairs)
    while j < n:
        w = pairs[j][0]
        if w == "--":
            j += 1
            break
        if not w.startswith("-") or w == "-":
            break
        if w in ("--package", "--shell", "--loglevel", "--call") and j + 1 < n:
            j += 2
        elif _short_opt_consumes_next(w, _NPX_ARG_OPTS) and j + 1 < n:
            j += 2
        else:
            j += 1
    return pairs[j:]


def _node_min_offset(val: object) -> int:
    if isinstance(val, dict):
        pos = val.get("Pos")
        if isinstance(pos, dict) and isinstance(pos.get("Offset"), int):
            return int(pos["Offset"])
    elif isinstance(val, list) and val:
        return min(_node_min_offset(item) for item in val)
    return 10**12


def _iter_ordered_ast_children(node: Dict[str, object]) -> List[object]:
    children = [v for k, v in node.items() if k not in _SHFMT_META_KEYS and isinstance(v, (dict, list))]
    children.sort(key=_node_min_offset)
    return children


def _call_pair_list(arg_nodes: Sequence[object]) -> List[Tuple[str, Dict[str, object]]]:
    return [(_render_shfmt_word(w), w) for w in arg_nodes if isinstance(w, dict)]


def _extract_assign_names(assign_nodes: object) -> set[str]:
    names: set[str] = set()
    if not isinstance(assign_nodes, list):
        return names
    for item in assign_nodes:
        if isinstance(item, dict):
            nm = item.get("Name")
            if isinstance(nm, dict) and isinstance(nm.get("Value"), str):
                names.add(str(nm["Value"]))
    return names


def _update_exported_from_decl(node: Dict[str, object], exported: set[str]) -> None:
    variant = ((node.get("Variant") or {}) if isinstance(node.get("Variant"), dict) else {}).get("Value")
    if variant not in ("export", "declare", "typeset"):
        return
    args = node.get("Args")
    if not isinstance(args, list):
        return
    has_unexport = False
    has_fn = False
    has_x = False
    names: List[str] = []
    for arg in args:
        if not isinstance(arg, dict):
            continue
        name_node = arg.get("Name")
        val_node = arg.get("Value")
        if isinstance(name_node, dict) and isinstance(name_node.get("Value"), str):
            names.append(str(name_node["Value"]))
        elif isinstance(val_node, dict):
            opt = _render_shfmt_word(val_node)
            if opt.startswith("-") and not opt.startswith("--"):
                if "n" in opt[1:]:
                    has_unexport = True
                if "f" in opt[1:]:
                    has_fn = True
                if "x" in opt[1:]:
                    has_x = True
            elif opt.startswith("+") and "x" in opt[1:]:
                has_unexport = True
    if has_fn:
        return
    if has_unexport:
        exported.difference_update(names)
        return
    if variant == "export" or (variant in ("declare", "typeset") and has_x):
        exported.update(names)


def _update_allexport(words: Sequence[str], current: bool) -> bool:
    if not words or words[0] != "set":
        return current
    i = 1
    n = len(words)
    while i < n:
        w = words[i]
        if w == "--":
            break
        if w == "-o" and i + 1 < n:
            if words[i + 1] == "allexport":
                current = True
            i += 2
            continue
        if w == "+o" and i + 1 < n:
            if words[i + 1] == "allexport":
                current = False
            i += 2
            continue
        if w.startswith("-") and len(w) > 1 and not w.startswith("--") and "a" in w[1:]:
            current = True
        elif w.startswith("+") and len(w) > 1 and not w.startswith("++") and "a" in w[1:]:
            current = False
        i += 1
    return current


def _rm_removes_protected_native(args: Sequence[str], extra_targets: Sequence[str] = ()) -> bool:
    recursive = False
    after_dashdash = False
    targets: List[str] = []
    for w in args:
        if not after_dashdash and w == "--":
            after_dashdash = True
            continue
        if not after_dashdash and w.startswith("--"):
            if w == "--recursive":
                recursive = True
            continue
        if not after_dashdash and w.startswith("-") and len(w) > 1:
            if "r" in w[1:] or "R" in w[1:]:
                recursive = True
            continue
        targets.append(w)
    if not recursive:
        return False
    extra_norm = {t.strip().rstrip("/") for t in extra_targets if t.strip()}
    for t in targets:
        if _RM_MOBILE_TARGET_RE.match(t) or t.strip().rstrip("/") in extra_norm:
            return True
    return False


def _extract_ssh_remote_cmd(cmd_words: Sequence[str]) -> str:
    i = 1
    n = len(cmd_words)
    end_opts = False
    while i < n:
        w = cmd_words[i]
        if not end_opts and w == "--":
            end_opts = True
            i += 1
            continue
        if not end_opts and w.startswith("-") and len(w) > 1:
            i += 2 if (_short_opt_consumes_next(w, _SSH_ARG_OPTS) and i + 1 < n) else 1
            continue
        i += 1
        break
    return " ".join(cmd_words[i:]).strip() if i < n else ""


def _remote_cmd_uses_bare_pm2(remote_cmd: str) -> bool:
    if not remote_cmd:
        return False
    remote_tree, _ = _parse_shfmt_json(remote_cmd)
    if remote_tree is None:
        return bool(_PM2_BARE_SUBCMD_RE.search(remote_cmd))
    stack: List[object] = [remote_tree]
    while stack:
        cur = stack.pop()
        if isinstance(cur, list):
            stack.extend(cur)
            continue
        if not isinstance(cur, dict):
            continue
        if cur.get("Type") == "CallExpr" and isinstance(cur.get("Args"), list):
            unwrapped, _ = _unwrap_cmd_words(_call_pair_list(cur["Args"]))
            npx_pairs = _strip_npx_prefix(unwrapped)
            words = [w for w, _ in npx_pairs]
            if words[:1] == ["pm2"] and len(words) >= 2 and words[1] in _PM2_MUTATE_SUBCMDS:
                return True
        for child in cur.values():
            if isinstance(child, (dict, list)):
                stack.append(child)
    return False


def _find_subshell_c_word(pairs: Sequence[Tuple[str, Dict[str, object]]]) -> Optional[Dict[str, object]]:
    i = 1
    n = len(pairs)
    saw_c = False
    while i < n:
        w, node = pairs[i]
        if w == "--":
            i += 1
            break
        if w in ("-o", "+o", "--init-file", "--rcfile") and i + 1 < n:
            i += 2
            continue
        if w.startswith("--"):
            i += 1
            continue
        if (w.startswith("-") or w.startswith("+")) and len(w) > 1:
            if w.startswith("-") and "c" in w[1:]:
                saw_c = True
            i += 2 if (_short_opt_consumes_next(w, "o") and i + 1 < n) else 1
            continue
        return node if saw_c else None
    if saw_c and i < n:
        return pairs[i][1]
    return None


def _bound_vars_in_subshell(body: str) -> Optional[set[str]]:
    tree, _ = _parse_shfmt_json(body)
    if tree is None:
        return None
    bound: set[str] = set()
    stack: List[object] = [tree]
    while stack:
        cur = stack.pop()
        if isinstance(cur, list):
            stack.extend(cur)
            continue
        if not isinstance(cur, dict):
            continue
        ntype = cur.get("Type")
        if ntype == "CallExpr":
            bound.update(_extract_assign_names(cur.get("Assigns")))
            if isinstance(cur.get("Args"), list):
                unwrapped, _ = _unwrap_cmd_words(_call_pair_list(cur["Args"]))
                words = [w for w, _ in unwrapped]
                if words and os.path.basename(words[0]) == "read":
                    j = 1
                    end_opts = False
                    while j < len(words):
                        rw = words[j]
                        if not end_opts and rw == "--":
                            end_opts = True
                            j += 1
                            continue
                        if not end_opts and rw.startswith("-") and len(rw) > 1:
                            j += 2 if (_short_opt_consumes_next(rw, _READ_ARG_OPTS) and j + 1 < len(words)) else 1
                            continue
                        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", rw):
                            bound.add(rw)
                        j += 1
        elif ntype == "DeclClause" and isinstance(cur.get("Args"), list):
            is_fn = any(
                isinstance(a, dict)
                and isinstance(a.get("Value"), dict)
                and _render_shfmt_word(a["Value"]).startswith("-")
                and "f" in _render_shfmt_word(a["Value"])[1:]
                for a in cur["Args"]
            )
            if not is_fn:
                bound.update(_extract_assign_names(cur["Args"]))
        elif ntype == "WordIter":
            nm = cur.get("Name")
            if isinstance(nm, dict) and isinstance(nm.get("Value"), str):
                bound.add(str(nm["Value"]))
        for k, v in cur.items():
            if k not in _SHFMT_META_KEYS and isinstance(v, (dict, list)):
                stack.append(v)
    return bound


def _check_subshell_word_var_leak(
    source_label: str,
    cmd_line: int,
    cmd_word: Dict[str, object],
    inline_env: set[str],
    exported_vars: set[str],
    findings: List[Dict[str, object]],
) -> None:
    parts = cmd_word.get("Parts")
    if not isinstance(parts, list):
        return
    sq_bodies = [
        str(p.get("Value") or "")
        for p in parts
        if isinstance(p, dict) and p.get("Type") == "SglQuoted" and not p.get("Dollar")
    ]
    if not sq_bodies:
        return
    combined_sq = "\n".join(sq_bodies)
    ast_bound = _bound_vars_in_subshell(combined_sq)
    checked_vars: set[str] = set()
    for body in sq_bodies:
        for vm in SUBSHELL_VAR_RE.finditer(body):
            if vm.group(2) in (":-", "-"):
                continue
            vname = vm.group(1) or vm.group(3)
            if not vname or vname in STANDARD_SHELL_VARS or vname in checked_vars:
                continue
            checked_vars.add(vname)
            is_bound = vname in ast_bound if ast_bound is not None else is_var_bound_inside_subshell(vname, combined_sq)
            if vname not in inline_env and vname not in exported_vars and not is_bound:
                findings.append(
                    {
                        "rule": "O-subshell-single-quote-var",
                        "file": source_label,
                        "line": cmd_line,
                        "message": f"Unexported variable `${vname}` referenced inside single-quoted `bash -c '...'` subshell",
                    }
                )


def check_shell_block(
    source_label: str,
    base_line: int,
    script: str,
    is_ci_script_file: bool = False,
    protected_dirs: Sequence[str] = (),
    is_mobile_repo: bool = False,
    ops_re: re.Pattern[str] = DEFAULT_OPS_COMMAND_RE,
) -> Tuple[List[Dict[str, object]], bool]:
    findings: List[Dict[str, object]] = []
    has_ops = bool(ops_re.search(script))

    proc = subprocess.run(
        ["bash", "-n"],
        input=script.encode("utf-8"),
        capture_output=True,
        stdin=None,
    )
    bash_ok = proc.returncode == 0
    if not bash_ok:
        err_text = (proc.stderr or proc.stdout).decode("utf-8", errors="replace").strip()
        findings.append(
            {
                "rule": "O-shell-syntax",
                "file": source_label,
                "line": base_line,
                "message": f"bash -n syntax error: {err_text[:200]}",
            }
        )

    tree, shfmt_err = _parse_shfmt_json(script)
    if tree is None:
        if bash_ok:
            findings.append(
                {
                    "rule": "O-shell-syntax",
                    "file": source_label,
                    "line": base_line,
                    "message": f"shfmt AST parse error (use `( (` to disambiguate nested subshells from arithmetic `((`): {shfmt_err[:200]}",
                }
            )
        return findings, has_ops

    mentions_ci_scripts = is_ci_script_file or bool(re.search(r"\b(?:ci_post_clone|ios/ci_scripts)\b", script))
    is_release_script = "/scripts/release-" in source_label or source_label.startswith("scripts/release-")
    comments_by_line = _collect_shfmt_comments(tree)
    exported_vars: set[str] = set()
    allexport = [False]
    seen: set[Tuple[str, int, str]] = set()

    def emit(rule: str, abs_ln: int, msg: str) -> None:
        key = (rule, abs_ln, msg)
        if key not in seen:
            seen.add(key)
            findings.append({"rule": rule, "file": source_label, "line": abs_ln, "message": msg})

    def inspect_call(node: Dict[str, object]) -> None:
        assign_names = _extract_assign_names(node.get("Assigns"))
        arg_nodes = node.get("Args")
        if not isinstance(arg_nodes, list) or not arg_nodes:
            if allexport[0]:
                exported_vars.update(assign_names)
            return

        raw_pairs = _call_pair_list(arg_nodes)
        if not raw_pairs:
            return
        raw_words = [w for w, _ in raw_pairs]
        allexport[0] = _update_allexport(raw_words, allexport[0])

        cmd_pairs, wrapper_env = _unwrap_cmd_words(raw_pairs)
        if not cmd_pairs:
            return
        cmd_words = [w for w, _ in cmd_pairs]
        npx_pairs = _strip_npx_prefix(cmd_pairs)
        npx_words = [w for w, _ in npx_pairs]

        pos = node.get("Pos") if isinstance(node.get("Pos"), dict) else {}
        end = node.get("End") if isinstance(node.get("End"), dict) else {}
        start_ln = int(pos.get("Line") or 1)
        end_ln = max(start_ln, int(end.get("Line") or start_ln))
        abs_ln = base_line + start_ln - 1
        inline_env = assign_names | wrapper_env

        if npx_words and npx_words[0] == "eas":
            sub = npx_words[1:]
            if sub[:1] == ["env:list"] and "--non-interactive" in sub:
                emit("O-eas-env-flag", abs_ln, "`eas env:list` does not accept `--non-interactive`; omit it or verify CLI flags")
            if sub[:1] == ["build"] and any(x == "--json" or x.startswith("--json=") for x in sub):
                if not any(x == "--no-wait" or x.startswith("--no-wait=") for x in sub) and not _ast_has_marker(
                    comments_by_line, start_ln, end_ln, "# sop-allow-wait"
                ):
                    emit("O-eas-build-nowait", abs_ln, "`eas build ... --json` without `--no-wait` hangs agent shells")

        if npx_words and npx_words[0] == "expo" and npx_words[1:2] == ["prebuild"]:
            sub = npx_words[1:]
            if mentions_ci_scripts:
                emit("O-ci-scripts-prebuild", abs_ln, "Do not run `expo prebuild` inside `ios/ci_scripts`")
            if any(x == "--clean" or x.startswith("--clean=") for x in sub):
                emit("O-mobile-clean-ban", abs_ln, "Forbidden mobile native clean/cache wipe (`--clean`, `rm -rf ios|android`, or `--no-build-cache`)")
            elif (
                not mentions_ci_scripts
                and not is_release_script
                and not _ast_has_marker(comments_by_line, start_ln, end_ln, "# sop-allow-clean-prebuild")
                and "--no-clean" not in sub
            ):
                emit("O-mobile-clean-ban", abs_ln, "`expo prebuild` without `--no-clean` may overwrite `ios/`/`android/`")

        bcmd = os.path.basename(cmd_words[0])
        if bcmd == "rm" and _rm_removes_protected_native(cmd_words[1:], protected_dirs):
            emit("O-mobile-clean-ban", abs_ln, "Forbidden native cache/dir wipe (`--clean`, `rm -rf ios|android`, or `--no-build-cache`)")

        if bcmd not in ("echo", "printf", "log", "warn", "die"):
            if any(x == "--no-build-cache" or x.startswith("--no-build-cache=") for x in cmd_words[1:]):
                emit("O-mobile-clean-ban", abs_ln, "Forbidden native clean/cache wipe (`--no-build-cache`)")

        if is_mobile_repo and not _ast_has_marker(comments_by_line, start_ln, end_ln, "# sop-allow-ps"):
            if bcmd == "pgrep" or (bcmd == "ps" and _PS_CMDLINE_ARGS_RE.search(" " + " ".join(cmd_words[1:]))):
                emit("O-mobile-ps-ban", abs_ln, "Forbidden `pgrep` / full-cmdline `ps`; use `npx expo command:ps --active --json` or `ps -o pid=,ppid=`")

        if has_ops and npx_words:
            if npx_words[0] == "pm2" and len(npx_words) >= 2 and npx_words[1] in _PM2_MUTATE_SUBCMDS:
                emit("O-prod-bare-pm2", abs_ln, "Bare `pm2` mutation in prod ops is unsafe; use `./node_modules/.bin/pm2` or release-local pm2 path")
            elif bcmd == "ssh" and _remote_cmd_uses_bare_pm2(_extract_ssh_remote_cmd(cmd_words)):
                emit("O-prod-bare-pm2", abs_ln, "Bare `pm2` over ssh in prod ops is unsafe; use `./node_modules/.bin/pm2` or release-local pm2 path")

        if npx_words and os.path.basename(npx_words[0]) in ("bash", "sh", "zsh"):
            cmd_word = _find_subshell_c_word(npx_pairs)
            if cmd_word is not None:
                _check_subshell_word_var_leak(source_label, abs_ln, cmd_word, inline_env, exported_vars, findings)

    def walk_node(node: object) -> None:
        if isinstance(node, list):
            for item in node:
                walk_node(item)
            return
        if not isinstance(node, dict):
            return
        ntype = node.get("Type")
        isolated = ntype in _ISOLATED_SHELL_SCOPE_TYPES
        if isolated:
            saved_exported = set(exported_vars)
            saved_allexport = allexport[0]
        if ntype == "CallExpr":
            inspect_call(node)
        elif ntype == "DeclClause":
            _update_exported_from_decl(node, exported_vars)
        for child in _iter_ordered_ast_children(node):
            walk_node(child)
        if isolated:
            exported_vars.clear()
            exported_vars.update(saved_exported)
            allexport[0] = saved_allexport

    walk_node(tree)
    return findings, has_ops


def run_shell_cli_preflight(
    task_dir: Path,
    extra_ops_plan: Optional[Path],
    changed_by_repo: Dict[str, List[str]],
    repo_map: Dict[str, Path],
    schemas_by_repo: Dict[str, Dict[str, object]],
    workspace: Dict[str, object],
) -> Tuple[List[Dict[str, object]], bool]:
    findings: List[Dict[str, object]] = []
    has_ops_commands = False
    raw_ops = workspace.get("ops_commands_regex")
    ops_re = re.compile(str(raw_ops)) if raw_ops else DEFAULT_OPS_COMMAND_RE

    md_targets: List[Path] = sorted(task_dir.glob("plan*.md"))
    if extra_ops_plan:
        rp = extra_ops_plan.resolve()
        if not rp.is_file():
            findings.append({"rule": "O-ops-plan-missing", "file": str(rp), "line": 1, "message": f"--ops-plan not found: {rp}"})
            return findings, True
        if rp not in md_targets:
            md_targets.append(rp)

    any_protected: List[str] = []
    any_mobile = False
    for rname, schema in schemas_by_repo.items():
        rroot = repo_map[rname]
        pdirs = schema.get("protected_dirs") or []
        if isinstance(pdirs, list):
            any_protected.extend(str(x) for x in pdirs)
        if (rroot / "ios").is_dir() or (rroot / "android").is_dir() or (rroot / "app.json").is_file():
            any_mobile = True

    for md in md_targets:
        for line_no, script in extract_shell_blocks_from_markdown(md):
            blk_findings, blk_ops = check_shell_block(
                str(md),
                line_no,
                script,
                is_ci_script_file=False,
                protected_dirs=any_protected,
                is_mobile_repo=any_mobile,
                ops_re=ops_re,
            )
            findings.extend(blk_findings)
            if blk_ops:
                has_ops_commands = True
        if extra_ops_plan and md == extra_ops_plan.resolve():
            has_ops_commands = True

    for rname, files in changed_by_repo.items():
        root = repo_map[rname]
        schema = schemas_by_repo.get(rname) or {}
        pdirs = [str(x) for x in (schema.get("protected_dirs") or [])] if isinstance(schema.get("protected_dirs"), list) else []
        is_mob = (root / "ios").is_dir() or (root / "android").is_dir() or (root / "app.json").is_file()
        for rel in files:
            p = root / rel
            if not p.is_file():
                continue
            if p.suffix in (".sh", ".bash"):
                is_ci = rel.replace("\\", "/").startswith("ios/ci_scripts/")
                blk_findings, blk_ops = check_shell_block(
                    f"{rname}/{rel}",
                    1,
                    p.read_text(encoding="utf-8", errors="ignore"),
                    is_ci_script_file=is_ci,
                    protected_dirs=pdirs,
                    is_mobile_repo=is_mob,
                    ops_re=ops_re,
                )
                findings.extend(blk_findings)
                if blk_ops:
                    has_ops_commands = True

    return findings, has_ops_commands


def find_dead_python_imports(py_path: Path, display_path: str) -> List[Dict[str, object]]:
    if py_path.name == "__init__.py":
        return []
    text = py_path.read_text(encoding="utf-8", errors="ignore")
    try:
        tree = ast.parse(text, filename=display_path)
    except SyntaxError:
        return []

    imported: List[Tuple[str, int]] = []
    import_nodes: set[int] = set()
    exported_all: set[str] = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Assign):
            if any(isinstance(t, ast.Name) and t.id == "__all__" for t in node.targets):
                if isinstance(node.value, (ast.List, ast.Tuple, ast.Set)):
                    for elt in node.value.elts:
                        if isinstance(elt, ast.Constant) and isinstance(elt.value, str):
                            exported_all.add(elt.value)

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            import_nodes.add(id(node))
            for alias in node.names:
                local = alias.asname or alias.name.split(".")[0]
                if local not in ("_",) and local not in exported_all:
                    imported.append((local, node.lineno))
        elif isinstance(node, ast.ImportFrom):
            if node.module == "__future__":
                continue
            import_nodes.add(id(node))
            for alias in node.names:
                if alias.name == "*":
                    continue
                local = alias.asname or alias.name
                if local not in ("_",) and local not in exported_all:
                    imported.append((local, node.lineno))

    used: set[str] = set()
    for node in ast.walk(tree):
        if id(node) in import_nodes:
            continue
        if isinstance(node, ast.Name):
            used.add(node.id)
        elif isinstance(node, ast.Constant) and isinstance(node.value, str):
            for tok in re.findall(r"\b[A-Za-z_][A-Za-z0-9_]*\b", node.value):
                used.add(tok)

    findings: List[Dict[str, object]] = []
    for name, lineno in imported:
        if name not in used:
            findings.append(
                {
                    "rule": "A-dead-import",
                    "file": display_path,
                    "line": lineno,
                    "message": f"Unused Python import `{name}`",
                }
            )
    return findings


def strip_ts_comments_preserving_strings(src: str) -> str:
    out: List[str] = []
    i = 0
    n = len(src)
    while i < n:
        ch = src[i]
        if ch in ("'", '"', "`"):
            quote = ch
            out.append(ch)
            i += 1
            while i < n:
                c = src[i]
                out.append(c)
                if c == "\\" and i + 1 < n:
                    out.append(src[i + 1])
                    i += 2
                    continue
                if c == quote:
                    i += 1
                    break
                i += 1
        elif ch == "/" and i + 1 < n and src[i + 1] == "/":
            while i < n and src[i] != "\n":
                i += 1
        elif ch == "/" and i + 1 < n and src[i + 1] == "*":
            end = src.find("*/", i + 2)
            block = src[i:] if end < 0 else src[i : end + 2]
            out.append("\n" * block.count("\n"))
            i = n if end < 0 else end + 2
        else:
            out.append(ch)
            i += 1
    return "".join(out)


def find_dead_ts_imports(ts_path: Path, display_path: str) -> List[Dict[str, object]]:
    if display_path.endswith(".d.ts"):
        return []
    raw = ts_path.read_text(encoding="utf-8", errors="ignore")
    clean = strip_ts_comments_preserving_strings(raw)

    import_stmt_re = re.compile(
        r"(?m)^\s*import\s+(?:type\s+)?(?P<clause>[^;'\"]+?)\s+from\s+['\"][^'\"]+['\"]\s*;?"
    )
    imported: List[Tuple[str, int]] = []
    spans: List[Tuple[int, int]] = []

    for m in import_stmt_re.finditer(clean):
        clause = m.group("clause").strip()
        lineno = clean[: m.start()].count("\n") + 1
        spans.append((m.start(), m.end()))

        brace_m = re.search(r"\{(.*?)\}", clause, re.DOTALL)
        head = clause[: brace_m.start()].strip().rstrip(",") if brace_m else clause

        if head:
            ns_m = re.match(r"^\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$", head)
            if ns_m:
                imported.append((ns_m.group(1), lineno))
            elif re.match(r"^[A-Za-z_$][A-Za-z0-9_$]*$", head):
                if not (ts_path.suffix == ".tsx" and head == "React"):
                    imported.append((head, lineno))

        if brace_m:
            for part in brace_m.group(1).split(","):
                tok = re.sub(r"^\s*type\s+", "", part.strip()).strip()
                if not tok:
                    continue
                as_m = re.match(r"^(?:[A-Za-z_$][A-Za-z0-9_$]*)\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$", tok)
                local = as_m.group(1) if as_m else tok
                if re.match(r"^[A-Za-z_$][A-Za-z0-9_$]*$", local):
                    imported.append((local, lineno))

    if not imported:
        return []

    pieces: List[str] = []
    pos = 0
    for s, e in spans:
        pieces.append(clean[pos:s])
        pos = e
    pieces.append(clean[pos:])
    body_without_imports = "".join(pieces)

    findings: List[Dict[str, object]] = []
    for name, lineno in imported:
        if not re.search(rf"\b{re.escape(name)}\b", body_without_imports):
            findings.append(
                {
                    "rule": "A-dead-import",
                    "file": display_path,
                    "line": lineno,
                    "message": f"Unused TS/JS import `{name}`",
                }
            )
    return findings


def _split_git_diff_lines(text: str) -> List[str]:
    if not text:
        return []
    lines = text.split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    return lines


def diff_for_repo_subset(
    repo_root: Path,
    diff_base: str,
    files: List[str],
    snap_paths: Dict[str, Path],
    context_lines: int = 0,
) -> str:
    if not files:
        return ""
    chunks: List[str] = []
    regular: List[str] = []
    for rel in files:
        if rel in snap_paths and (repo_root / rel).is_file():
            snap_file = snap_paths[rel]
            live_file = repo_root / rel
            res = subprocess.run(
                ["git", "diff", "--no-index", "--no-color", f"-U{context_lines}", "--", str(snap_file), str(live_file)],
                capture_output=True,
                stdin=subprocess.DEVNULL,
            )
            if res.returncode in (0, 1) and res.stdout:
                normalized_lines: List[str] = []
                for ln in _split_git_diff_lines(res.stdout.decode("utf-8", errors="replace")):
                    if ln.startswith("diff --git "):
                        normalized_lines.append(f"diff --git a/{rel} b/{rel}")
                    elif ln.startswith("--- "):
                        normalized_lines.append(f"--- a/{rel}")
                    elif ln.startswith("+++ "):
                        normalized_lines.append(f"+++ b/{rel}")
                    else:
                        normalized_lines.append(ln)
                chunks.append("\n".join(normalized_lines))
        else:
            regular.append(rel)

    if regular:
        reg_diff = SC.git_out(repo_root, "diff", "--no-color", f"-U{context_lines}", diff_base, "--", *regular)
        if reg_diff:
            chunks.append("\n".join(_split_git_diff_lines(reg_diff)))

    return ("\n".join(chunks) + "\n") if chunks else ""


def _py_line_map(source: str) -> List[int]:
    mapping = [0, 1]
    phys = 1
    i = 0
    n = len(source)
    while i < n:
        ch = source[i]
        if ch == "\r":
            if i + 1 < n and source[i + 1] == "\n":
                phys += 1
                i += 2
            else:
                i += 1
            mapping.append(phys)
        elif ch == "\n":
            phys += 1
            i += 1
            mapping.append(phys)
        else:
            i += 1
    return mapping


def _scan_py_source(source: str) -> Dict[str, object]:
    line_map = _py_line_map(source)

    def to_phys(cln: Optional[int]) -> int:
        if not cln or cln < 1:
            return 1
        return line_map[cln] if cln < len(line_map) else line_map[-1]

    try:
        compile(source, "<sop>", "exec")
        tree = ast.parse(source)
    except (SyntaxError, ValueError) as exc:
        return {
            "syntax_error": {
                "line": to_phys(getattr(exc, "lineno", None)),
                "message": str(getattr(exc, "msg", None) or str(exc) or "SyntaxError"),
            }
        }

    silent_catch_lines: set[int] = set()
    domain_zero_lines: set[int] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler) and len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
            for ln in range(to_phys(node.lineno), to_phys(node.end_lineno or node.lineno) + 1):
                silent_catch_lines.add(ln)
        elif isinstance(node, ast.BoolOp) and isinstance(node.op, ast.Or) and len(node.values) >= 2:
            last_val = node.values[-1]
            if isinstance(last_val, ast.Constant) and type(last_val.value) is int and last_val.value == 0:
                matched = False
                for prev in node.values[:-1]:
                    ident = prev.id if isinstance(prev, ast.Name) else (prev.attr if isinstance(prev, ast.Attribute) else "")
                    if ident and DOMAIN_WORD_RE.search(ident):
                        matched = True
                        break
                if matched:
                    for ln in range(to_phys(node.lineno), to_phys(node.end_lineno or node.lineno) + 1):
                        domain_zero_lines.add(ln)

    comments_by_line: Dict[str, List[Tuple[str, bool]]] = {}
    try:
        tokens = tokenize.generate_tokens(io.StringIO(source, newline=None).readline)
        for tok in tokens:
            if tok.type == tokenize.COMMENT:
                body = tok.string.lstrip("#").strip()
                comments_by_line.setdefault(str(to_phys(tok.start[0])), []).append((body, False))
    except (tokenize.TokenError, IndentationError) as exc:
        msg = exc.args[0] if exc.args else str(exc)
        pos = exc.args[1] if len(exc.args) > 1 and isinstance(exc.args[1], tuple) else (1, 0)
        return {"syntax_error": {"line": to_phys(pos[0]), "message": str(msg)}}

    return {
        "comments_by_line": comments_by_line,
        "as_any_lines": [],
        "early_falsy_lines": [],
        "silent_catch_lines": sorted(silent_catch_lines),
        "domain_zero_lines": sorted(domain_zero_lines),
    }


def _scan_js_fallback_item(source: str, wanted_lines: Sequence[int]) -> Dict[str, object]:
    comments_by_line: Dict[str, List[Tuple[str, bool]]] = {}
    wanted = set(wanted_lines)
    for ln, raw in enumerate(source.splitlines(), start=1):
        if ln not in wanted:
            continue
        s = raw.strip()
        if s.startswith("//"):
            comments_by_line[str(ln)] = [(s[2:].strip(), False)]
        elif s.startswith("/*") and s.endswith("*/"):
            comments_by_line[str(ln)] = [(s[2:-2].strip(), False)]
    return {
        "comments_by_line": comments_by_line,
        "as_any_lines": [],
        "early_falsy_lines": [],
        "silent_catch_lines": [],
        "domain_zero_lines": [],
    }


def _scan_js_ts_batch(repo_root: Path, files: Sequence[Dict[str, object]]) -> Dict[str, Dict[str, object]]:
    if not files:
        return {}
    node_bin = shutil.which("node")
    if node_bin and SC.AST_PARSER_JS.is_file():
        res = subprocess.run(
            [node_bin, str(SC.AST_PARSER_JS)],
            input=json.dumps({"repo_root": str(repo_root), "files": list(files)}),
            capture_output=True,
            text=True,
        )
        if res.returncode == 0:
            data = json.loads(res.stdout or "{}")
            if isinstance(data, dict) and not data.get("__parser_unavailable__"):
                return data
    return {
        str(item["rel"]): _scan_js_fallback_item(str(item.get("source") or ""), item.get("lines") or [])  # type: ignore[arg-type]
        for item in files
    }


def _classify_added_comment(
    comment_body: str,
    has_ts_ignore: bool,
    is_single_line: bool = True,
) -> Optional[Tuple[str, str]]:
    if has_ts_ignore:
        return None
    if comment_body.startswith("!"):
        return None
    if comment_body.startswith(("@vitest-environment", "@jest-environment", "@jsxImportSource", "<reference ")):
        return None
    if comment_body.startswith(("prettier-ignore", "sop-")):
        return None
    if is_single_line and (comment_body.startswith("@process-local:") or "每进程" in comment_body) and len(comment_body) <= 140:
        return None
    if (
        is_single_line
        and comment_body.startswith(("@external-constraint:", "@contract:", "SPDX-License-Identifier:", "Copyright "))
        and len(comment_body) <= 160
    ):
        return None
    if not is_single_line and comment_body.startswith(("SPDX-License-Identifier:", "Copyright ")):
        return None

    sup_m = SUPPRESSION_COMMENT_RE.match(comment_body) if is_single_line else None
    if sup_m:
        if sup_m.group("es_tail") is not None:
            tail = sup_m.group("es_tail")
            rm = re.search(r"(?:^|\s)(?:--|:\s)\s*(.+)$", tail)
        elif sup_m.group("bi_tail") is not None:
            tail = sup_m.group("bi_tail")
            rm = re.match(r"^\s*[A-Za-z0-9_/*.-]+(?:\s*:\s*|\s+--\s*)(.+)$", tail)
        else:
            tail = (sup_m.group("ts_tail") if sup_m.group("ts_tail") is not None else sup_m.group("py_tail")) or ""
            rm = re.match(r"^\s*(?:--|:)\s*(.+)$", tail)
        reason = rm.group(1).strip() if rm else ""
        if len(re.sub(r"\s+", "", reason)) >= 6:
            return None
        return (
            "A-unreasoned-suppression",
            "Lint/type suppression requires an inline reason (`-- <reason>` or `: <reason>` with >= 6 non-space chars)",
        )

    if EXCUSE_COMMENT_RE.search(comment_body):
        return (
            "A-excuse-comment",
            "Excuse/workaround comment forbidden in production code; fix root cause or record an issue",
        )
    return (
        "A-no-slop-comments",
        "Generated narration/banner/commented-out code comment blocked; make names/types self-explanatory "
        "(allowed only: compiler pragmas, sop-*, @process-local:, reasoned suppressions, or single-line @external-constraint: / @contract:)",
    )


def scan_added_lines_for_workarounds(
    repo_name: str,
    repo_root: Path,
    changed_files: List[str],
    diff_base: str,
    untracked_set: set[str],
    snap_paths: Optional[Dict[str, Path]] = None,
    excuse_leads_out: Optional[List[Dict[str, object]]] = None,
) -> Tuple[List[Dict[str, object]], List[Dict[str, object]]]:
    signals: List[Dict[str, object]] = []
    blocking: List[Dict[str, object]] = []
    snaps = snap_paths or {}

    def inspect_line(rel: str, lineno: int, line_text: str, ast_info: Dict[str, object]) -> None:
        s = line_text.strip()
        if not s:
            return
        comments_map = ast_info.get("comments_by_line") or {}
        as_any_lines = set(ast_info.get("as_any_lines") or [])
        early_falsy_lines = set(ast_info.get("early_falsy_lines") or [])
        silent_catch_lines = set(ast_info.get("silent_catch_lines") or [])
        domain_zero_lines = set(ast_info.get("domain_zero_lines") or [])
        line_comments = comments_map.get(str(lineno), [])

        has_ts_ignore = False
        has_comment_supp = False
        for comment_body, is_multiline in line_comments:
            line_ts_ignore = bool(TS_IGNORE_RE.search(comment_body))
            if line_ts_ignore:
                has_ts_ignore = True
            if re.search(r"@ts-expect-error\b|type:\s*ignore\b", comment_body):
                has_comment_supp = True
            if (
                excuse_leads_out is not None
                and comment_body
                and not comment_body.startswith("sop-allow-")
                and EXCUSE_COMMENT_RE.search(comment_body)
            ):
                excuse_leads_out.append(
                    {"rule": "A-excuse-comment", "file": f"{repo_name}/{rel}", "line": lineno, "comment": comment_body[:120]}
                )
            comment_err = _classify_added_comment(comment_body, line_ts_ignore, is_single_line=not is_multiline)
            if comment_err is not None:
                rule_id, msg = comment_err
                blocking.append({"rule": rule_id, "file": f"{repo_name}/{rel}", "line": lineno, "message": msg})
        if has_ts_ignore:
            item = {
                "rule": "A-ts-ignore",
                "kind": "ts_ignore",
                "file": f"{repo_name}/{rel}",
                "line": lineno,
                "snippet": s[:120],
                "message": "`@ts-ignore` suppresses type errors in non-test source",
            }
            blocking.append(item)
            signals.append(item)
        else:
            if has_comment_supp or lineno in as_any_lines:
                signals.append({"kind": "type_suppression", "file": f"{repo_name}/{rel}", "line": lineno, "snippet": s[:120]})
        if lineno in early_falsy_lines:
            signals.append({"kind": "early_falsy_return", "file": f"{repo_name}/{rel}", "line": lineno, "snippet": s[:120]})
        if lineno in silent_catch_lines:
            signals.append({"kind": "silent_catch", "file": f"{repo_name}/{rel}", "line": lineno, "snippet": s[:120]})
        if lineno in domain_zero_lines:
            signals.append({"kind": "domain_zero_coalesce", "file": f"{repo_name}/{rel}", "line": lineno, "snippet": s[:120]})

    code_non_test = [
        p
        for p in changed_files
        if Path(p).suffix in {".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}
        and not TEST_PATH_RE.search(p)
        and (repo_root / p).is_file()
    ]
    if not code_non_test:
        return signals, blocking

    additions_by_rel: Dict[str, List[Tuple[int, str]]] = {}
    fresh_untracked = [rel for rel in code_non_test if rel in untracked_set and rel not in snaps]
    for rel in fresh_untracked:
        src_raw = _read_raw_text(repo_root / rel)
        additions_by_rel[rel] = list(enumerate(_split_git_diff_lines(src_raw), start=1))

    diff_subset = [rel for rel in code_non_test if rel not in set(fresh_untracked)]
    if diff_subset:
        diff = diff_for_repo_subset(repo_root, diff_base, diff_subset, snaps, context_lines=0)
        cur_path: Optional[str] = None
        lineno = 0
        for raw in _split_git_diff_lines(diff):
            if raw.startswith("+++ b/"):
                cur_path = raw[6:]
                continue
            hm = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)", raw)
            if hm:
                lineno = int(hm.group(1))
                continue
            if cur_path is None or raw.startswith("---"):
                continue
            if raw.startswith("+"):
                additions_by_rel.setdefault(cur_path, []).append((lineno, raw[1:]))
                lineno += 1

    ast_by_rel: Dict[str, Dict[str, object]] = {}
    js_batch_req: List[Dict[str, object]] = []
    for rel, lines in additions_by_rel.items():
        if not lines:
            continue
        target = repo_root / rel
        src_txt = _read_raw_text(target) if target.is_file() else ""
        if Path(rel).suffix == ".py":
            ast_by_rel[rel] = _scan_py_source(src_txt)
        else:
            js_batch_req.append({"rel": rel, "source": src_txt, "lines": sorted({ln for ln, _ in lines})})
    if js_batch_req:
        ast_by_rel.update(_scan_js_ts_batch(repo_root, js_batch_req))

    for rel, lines in additions_by_rel.items():
        if not lines:
            continue
        ast_info = ast_by_rel.get(rel, {})
        syntax_err = ast_info.get("syntax_error")
        if isinstance(syntax_err, dict):
            rule_id = "A-py-syntax" if Path(rel).suffix == ".py" else "A-js-syntax"
            blocking.append(
                {
                    "rule": rule_id,
                    "file": f"{repo_name}/{rel}",
                    "line": int(syntax_err.get("line") or 1),
                    "message": f"Syntax error ({syntax_err.get('message', 'parse error')}); fix syntax before running SOP gate",
                }
            )
            continue
        for ln, text in lines:
            inspect_line(rel, ln, text, ast_info)

    return signals, blocking


def scan_comment_drift(
    repo_name: str,
    repo_root: Path,
    changed_files: List[str],
    diff_base: str,
    untracked_set: set[str],
    snap_paths: Optional[Dict[str, Path]] = None,
) -> List[Dict[str, object]]:
    leads: List[Dict[str, object]] = []
    snaps = snap_paths or {}
    diff_targets = [p for p in changed_files if (p not in untracked_set or p in snaps) and (repo_root / p).is_file()]
    if not diff_targets:
        return leads

    diff = diff_for_repo_subset(repo_root, diff_base, diff_targets, snaps, context_lines=4)
    cur_path: Optional[str] = None
    removed_lines: List[str] = []
    added_lines: List[str] = []
    context_comments: List[Tuple[int, str]] = []
    cur_new_line = 1

    def flush_hunk() -> None:
        if not cur_path or not removed_lines or not context_comments:
            return
        removed_tokens = set(DRIFT_TOKEN_RE.findall("\n".join(removed_lines)))
        added_tokens = set(DRIFT_TOKEN_RE.findall("\n".join(added_lines)))
        stale_tokens = removed_tokens - added_tokens
        if not stale_tokens:
            return
        for cln, ctext in context_comments:
            for tok in sorted(stale_tokens):
                if tok in ctext:
                    leads.append({"file": f"{repo_name}/{cur_path}", "line": cln, "token": tok, "comment": ctext.strip()[:120]})

    for raw in _split_git_diff_lines(diff):
        if raw.startswith("+++ b/"):
            flush_hunk()
            cur_path = raw[6:]
            removed_lines, added_lines, context_comments = [], [], []
            continue
        hm = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)", raw)
        if hm:
            flush_hunk()
            cur_new_line = int(hm.group(1))
            removed_lines, added_lines, context_comments = [], [], []
            continue
        if cur_path is None or raw.startswith("---"):
            continue
        if raw.startswith("-"):
            removed_lines.append(raw[1:])
        elif raw.startswith("+"):
            added_lines.append(raw[1:])
            cur_new_line += 1
        elif raw.startswith(" "):
            ctx = raw[1:]
            stripped = ctx.lstrip()
            if stripped.startswith(("//", "#", "/*", "*")) or "<!--" in stripped:
                context_comments.append((cur_new_line, ctx))
            cur_new_line += 1

    flush_hunk()
    return leads


_DF_DEPS_RE = re.compile(
    r"(^|/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|"
    r"requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|uv\.lock|Pipfile(\.lock)?|"
    r"go\.(mod|sum)|Cargo\.(toml|lock)|Gemfile(\.lock)?|Podfile(\.lock)?|"
    r"build\.gradle(\.kts)?|[^/]+\.csproj)$"
)
_DF_CI_RE = re.compile(
    r"(^|/)(\.github/|\.gitlab-ci\.yml$|\.circleci/|Jenkinsfile$|Dockerfile[^/]*$|"
    r"docker-compose[^/]*\.ya?ml$|compose[^/]*\.ya?ml$|Makefile$|eas\.json$)"
)
_DF_SKIP_RE = re.compile(
    r"\b(?:it|test|describe)\.(?:skip|todo)\s*\(|\bx(?:it|describe|test)\s*\(|@pytest\.mark\.(?:skip|xfail)"
    r"|\bpytest\.skip\s*\(|@unittest\.skip|\bt\.Skip(?:Now|f)?\s*\(|#\[ignore\]|@Disabled\b|@Ignore\b"
)
_DF_ASSERT_RE = re.compile(r"\bexpect\s*\(|\bassert\w*\b|\bt\.(?:Error|Fatal)f?\s*\(|\brequire\.\w+\s*\(|\bshould\.")
_DF_VISUAL_EXT = {".css", ".scss", ".sass", ".less", ".styl", ".html", ".htm", ".vue", ".svelte"}


def _scan_diff_flags_lf(
    repo_root: Path,
    diff_base: str,
    task_files: List[str],
    diff_targets: List[str],
    fresh_untracked: List[str],
    snaps: Dict[str, Path],
) -> Tuple[List[str], List[str]]:
    deps_re = getattr(DF, "DEPS", None) or _DF_DEPS_RE
    ci_re = getattr(DF, "CI", None) or _DF_CI_RE
    test_re = getattr(DF, "TEST_PATH", None) or TEST_PATH_RE
    skip_re = getattr(DF, "SKIP", None) or _DF_SKIP_RE
    assert_re = getattr(DF, "ASSERT", None) or _DF_ASSERT_RE
    visual_ext = set(getattr(DF, "VISUAL_EXT", None) or _DF_VISUAL_EXT)

    task_set = set(task_files)
    deleted = {
        p
        for p in _split_git_diff_lines(SC.git_out(repo_root, "diff", "--name-only", "--diff-filter=D", diff_base))
        if p in task_set
    }
    flags: List[str] = []
    for p in sorted(task_set):
        if deps_re.search(p):
            flags.append(f"- `{p}` — dependency manifest or lockfile changed")
        elif ci_re.search(p):
            flags.append(f"- `{p}` — CI/build file changed")
    for p in sorted(deleted):
        if test_re.search(p):
            flags.append(f"- `{p}` — test file deleted")

    tracked_tests = [p for p in diff_targets if test_re.search(p) and p not in deleted]
    if tracked_tests:
        tdiff = diff_for_repo_subset(repo_root, diff_base, tracked_tests, snaps, context_lines=0)
        cur_path: Optional[str] = None
        line_no = 0
        asserts: Dict[str, int] = {}
        for raw in _split_git_diff_lines(tdiff):
            if raw.startswith("+++ "):
                cur_path = raw[6:] if raw.startswith("+++ b/") else None
                continue
            hm = re.match(r"^@@ -\d+(?:,\d+)? \+(\d+)", raw)
            if hm:
                line_no = int(hm.group(1))
                continue
            if cur_path is None or raw.startswith("---"):
                continue
            if raw.startswith("+"):
                body = raw[1:]
                sm = skip_re.search(body)
                if sm:
                    flags.append(f"- `{cur_path}:{line_no}` — skip marker added: {sm.group(0).strip()}")
                if assert_re.search(body):
                    asserts[cur_path] = asserts.get(cur_path, 0) + 1
                line_no += 1
            elif raw.startswith("-") and assert_re.search(raw[1:]):
                asserts[cur_path] = asserts.get(cur_path, 0) - 1
        for p, net in sorted(asserts.items()):
            if net < 0:
                flags.append(f"- `{p}` — {-net} more assertion lines removed than added")

    for p in sorted(fresh_untracked):
        fp = repo_root / p
        if test_re.search(p) and fp.is_file() and skip_re.search(_read_raw_text(fp)):
            flags.append(f"- `{p}` — new test file contains a skip marker")

    visual = [
        f"- `{p}` — visual: style/template changed; Before/After captures required"
        for p in sorted(task_set)
        if Path(p).suffix in visual_ext and p not in deleted
    ]
    return flags, visual


def run_diff_flags_stats(
    repo_root: Path,
    diff_base: str,
    task_files: List[str],
    untracked_set: set[str],
    snap_paths: Optional[Dict[str, Path]] = None,
) -> Dict[str, object]:
    snaps = snap_paths or {}
    lines_changed = 0
    fresh_untracked = [p for p in task_files if p in untracked_set and p not in snaps]
    diff_targets = [p for p in task_files if p not in set(fresh_untracked)]
    if diff_targets:
        udiff = diff_for_repo_subset(repo_root, diff_base, diff_targets, snaps, context_lines=0)
        for ln in _split_git_diff_lines(udiff):
            if ln.startswith(("+++ ", "--- ", "diff --git ", "@@ ")):
                continue
            if ln.startswith(("+", "-")):
                lines_changed += 1
    for rel in fresh_untracked:
        fp = repo_root / rel
        if fp.is_file():
            lines_changed += len(_split_git_diff_lines(_read_raw_text(fp)))

    flags, visual = _scan_diff_flags_lf(repo_root, diff_base, task_files, diff_targets, fresh_untracked, snaps)
    summary = f"DIFF task_files={len(task_files)} lines={lines_changed} base={diff_base}"
    if not task_files and DF is not None:
        df_summary, _, _ = DF.scan(repo_root, diff_base)
        summary = df_summary
    return {
        "summary": summary,
        "flags": flags,
        "visual": visual,
        "code_files": sum(1 for p in task_files if Path(p).suffix in CODE_EXT),
        "lines_changed": lines_changed,
    }


def build_repo_patch(
    repo_root: Path,
    diff_base: str,
    task_files: List[str],
    untracked_set: set[str],
    snap_paths: Optional[Dict[str, Path]] = None,
) -> str:
    snaps = snap_paths or {}
    parts: List[str] = []
    fresh_untracked = [p for p in task_files if p in untracked_set and p not in snaps]
    diff_targets = [p for p in task_files if p not in set(fresh_untracked)]
    if diff_targets:
        diff_txt = diff_for_repo_subset(repo_root, diff_base, diff_targets, snaps, context_lines=3)
        if diff_txt:
            parts.append(diff_txt.rstrip("\n"))
    for rel in sorted(fresh_untracked):
        fp = repo_root / rel
        if not fp.is_file():
            continue
        raw = fp.read_bytes()
        if b"\x00" in raw[:4096]:
            parts.append(f"diff --git a/{rel} b/{rel}\nnew file mode 100644\nBinary file {rel} added")
            continue
        text_lines = _split_git_diff_lines(raw.decode("utf-8", errors="replace"))
        body = "\n".join(f"+{ln}" for ln in text_lines)
        parts.append(
            f"diff --git a/{rel} b/{rel}\nnew file mode 100644\n--- /dev/null\n+++ b/{rel}\n"
            f"@@ -0,0 +1,{len(text_lines)} @@\n{body}"
        )
    return ("\n".join(parts) + "\n") if parts else ""


def canonical_receipt_digest(payload_without_digest: Dict[str, object]) -> str:
    canonical = json.dumps(
        payload_without_digest,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def _package_json_runtime_deps_changed(
    repo_root: Path, diff_base: str, snap_paths: Dict[str, Path]
) -> bool:
    cur_file = repo_root / "package.json"
    if not cur_file.is_file():
        return True
    try:
        cur_deps = json.loads(cur_file.read_text(encoding="utf-8")).get("dependencies")
    except (OSError, json.JSONDecodeError):
        return True
    base_raw: Optional[str] = None
    snap = snap_paths.get("package.json")
    if snap and snap.is_file():
        base_raw = snap.read_text(encoding="utf-8", errors="ignore")
    else:
        proc = subprocess.run(
            ["git", "-C", str(repo_root), "show", f"{diff_base}:package.json"],
            capture_output=True,
            text=True,
            stdin=subprocess.DEVNULL,
        )
        if proc.returncode == 0:
            base_raw = proc.stdout
    if base_raw is None:
        return bool(cur_deps)
    try:
        base_deps = json.loads(base_raw).get("dependencies")
    except json.JSONDecodeError:
        return True
    return base_deps != cur_deps


def detect_runtime_verification(
    changed_by_repo: Dict[str, List[str]],
    repo_map: Dict[str, Path],
    diff_bases: Dict[str, str],
    snap_paths_by_repo: Dict[str, Dict[str, Path]],
    schemas_by_repo: Dict[str, Dict[str, object]],
) -> Dict[str, object]:
    targets_out: Dict[str, Dict[str, object]] = {}
    required_targets: List[str] = []

    for rname, changed in sorted(changed_by_repo.items()):
        schema = schemas_by_repo.get(rname) or {}
        rt_cfg = schema.get("runtime_verification")
        if not isinstance(rt_cfg, dict):
            continue
        for tname, rule in rt_cfg.items():
            if not isinstance(rule, dict):
                continue
            req_globs = [str(g) for g in (rule.get("required_globs") or [])]
            opt_globs = [str(g) for g in (rule.get("optional_globs") or [])]
            status_on_req = str(rule.get("status") or "REQUIRED")
            ignore_tests = bool(rule.get("ignore_test_paths", True))
            req_hits: List[str] = []
            opt_hits: List[str] = []
            for rel in changed:
                norm = SC.normalize_rel_path(rel)
                if ignore_tests and (TEST_PATH_RE.search(norm) or norm.startswith("test-components/")):
                    continue
                if norm == "package.json" and "package.json#dependencies" in req_globs:
                    if _package_json_runtime_deps_changed(
                        repo_map[rname], diff_bases.get(rname, "HEAD"), snap_paths_by_repo.get(rname, {})
                    ):
                        req_hits.append("package.json#dependencies")
                    continue
                if any(SC.glob_match(norm, pat) for pat in req_globs):
                    req_hits.append(norm)
                elif any(SC.glob_match(norm, pat) for pat in opt_globs):
                    opt_hits.append(norm)

            if req_hits:
                required_targets.append(str(tname))
                targets_out[str(tname)] = {"status": status_on_req, "triggers": sorted(set(req_hits))}
            elif opt_hits:
                targets_out[str(tname)] = {"status": "OPTIONAL", "triggers": sorted(set(opt_hits))}
            else:
                targets_out[str(tname)] = {"status": "NOT_REQUIRED", "triggers": []}

    return {
        "required": bool(required_targets),
        "required_targets": sorted(set(required_targets)),
        "targets": targets_out,
    }


def _locked_repo_names(lock_file: Path) -> set[str]:
    if not lock_file.is_file():
        return set()
    try:
        data = json.loads(lock_file.read_text(encoding="utf-8"))
        repos = data.get("repos")
        return set(repos.keys()) if isinstance(repos, dict) else set()
    except (OSError, json.JSONDecodeError):
        return set()


def assess_task_deterministically(
    *,
    task_dir: Path,
    repos_arg: str = "auto",
    repo_map_overrides: Optional[Dict[str, Path]] = None,
    base_overrides: Optional[Dict[str, str]] = None,
    ops_plan: Optional[Path] = None,
    lock_file: Optional[Path] = None,
    sop_root: Optional[Path] = None,
) -> Dict[str, object]:
    task_dir = task_dir.resolve()
    ev_dir = task_dir / "evidence"
    eff_root = SC.find_sop_root(explicit_root=sop_root, task_dir=task_dir)
    workspace = SC.load_workspace(eff_root, repo_map_overrides=repo_map_overrides)
    repo_map: Dict[str, Path] = {k: v.resolve() for k, v in workspace["repos"].items()}  # type: ignore[union-attr]
    eff_lock = (lock_file or Path(workspace["lock_file"])).expanduser().resolve()  # type: ignore[arg-type]
    cp_repo = workspace.get("control_plane_repo")

    locked_names = _locked_repo_names(eff_lock)
    registry_repos = {
        k: v
        for k, v in repo_map.items()
        if (v / ".sop" / "gates.json").is_file() or (k in locked_names and k != cp_repo)
    }
    lock_errors = VGR.verify_lock(registry_repos, eff_lock) if (registry_repos or locked_names) else []
    base_map = base_overrides or {}

    if repos_arg != "auto":
        requested = [r.strip() for r in repos_arg.split(",") if r.strip()]
        target_repos = sorted(set(requested) | set(brief_referenced_repos(task_dir, repo_map)))
    else:
        referenced = set(brief_referenced_repos(task_dir, repo_map))
        delta_repos = set()
        for rname, rpath in repo_map.items():
            if not rpath.is_dir():
                continue
            ch0, _, _, _, _ = task_changed_files_for_repo(
                rpath, ev_dir / f"baseline-{rname}.json", base_map.get(rname), ev_dir=ev_dir, repo_name=rname, workspace=workspace
            )
            if ch0:
                delta_repos.add(rname)
        target_repos = sorted(referenced | delta_repos)

    unknown = [r for r in target_repos if r not in repo_map]
    if unknown:
        raise ValueError(f"Unknown repo(s): {', '.join(unknown)}")

    changed_by_repo: Dict[str, List[str]] = {}
    diff_bases: Dict[str, str] = {}
    baselines: Dict[str, Dict[str, object]] = {}
    untracked_by_repo: Dict[str, set[str]] = {}
    snap_paths_by_repo: Dict[str, Dict[str, Path]] = {}
    diff_flags_by_repo: Dict[str, Dict[str, object]] = {}
    schemas_by_repo: Dict[str, Dict[str, object]] = {}

    for rname in target_repos:
        rroot = repo_map[rname]
        if (rroot / ".sop" / "gates.json").is_file():
            try:
                _, schemas_by_repo[rname] = VGR.load_repo_gates(rname, rroot)
            except (ValueError, FileNotFoundError, json.JSONDecodeError):
                schemas_by_repo[rname] = {}
        bfile = ev_dir / f"baseline-{rname}.json"
        ch, dbase, untracked, snaps, bmeta = task_changed_files_for_repo(
            rroot, bfile, base_map.get(rname), ev_dir=ev_dir, repo_name=rname, workspace=workspace
        )
        changed_by_repo[rname] = ch
        diff_bases[rname] = dbase
        baselines[rname] = bmeta
        untracked_by_repo[rname] = set(untracked)
        snap_paths_by_repo[rname] = snaps
        diff_flags_by_repo[rname] = (
            run_diff_flags_stats(rroot, dbase, ch, untracked_by_repo[rname], snap_paths=snaps)
            if ch
            else {"summary": "", "flags": [], "visual": [], "code_files": 0, "lines_changed": 0}
        )

    changed_repos = [r for r in target_repos if changed_by_repo.get(r)]

    static_errors: List[Dict[str, object]] = []
    workaround_signals: List[Dict[str, object]] = []
    excuse_comment_leads: List[Dict[str, object]] = []
    comment_drift_leads: List[Dict[str, object]] = []

    shell_findings, has_ops_commands = run_shell_cli_preflight(
        task_dir, ops_plan, changed_by_repo, repo_map, schemas_by_repo, workspace
    )
    static_errors.extend(shell_findings)

    for rname in changed_repos:
        rroot = repo_map[rname]
        files = changed_by_repo[rname]
        untracked_set = untracked_by_repo[rname]
        snaps = snap_paths_by_repo[rname]

        for rel in files:
            fpath = rroot / rel
            if not fpath.is_file():
                continue
            disp = f"{rname}/{rel}"
            if fpath.suffix == ".py":
                static_errors.extend(find_dead_python_imports(fpath, disp))
            elif fpath.suffix in {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}:
                static_errors.extend(find_dead_ts_imports(fpath, disp))

        ws_sigs, ws_block = scan_added_lines_for_workarounds(
            rname, rroot, files, diff_bases[rname], untracked_set, snap_paths=snaps, excuse_leads_out=excuse_comment_leads
        )
        workaround_signals.extend(ws_sigs)
        static_errors.extend(ws_block)
        comment_drift_leads.extend(
            scan_comment_drift(rname, rroot, files, diff_bases[rname], untracked_set, snap_paths=snaps)
        )

    tier_reasons: List[str] = []
    ops_hit = False
    high_risk_hit = False

    if ops_plan is not None:
        ops_hit = True
        tier_reasons.append(f"ops_plan specified ({ops_plan.name})")
    if has_ops_commands:
        ops_hit = True
        tier_reasons.append("shell commands target production/release/DB ops")

    cp_hr_map: Dict[str, Tuple[str, ...]] = workspace.get("high_risk_by_repo") or {}  # type: ignore[assignment]
    for rname in changed_repos:
        if rname in cp_hr_map:
            for rel in changed_by_repo[rname]:
                if any(SC.glob_match(rel, pat) for pat in cp_hr_map[rname]):
                    high_risk_hit = True
                    tier_reasons.append(f"{rname}/{rel} matches control-plane high_risk_globs")
        if rname not in registry_repos:
            continue
        if not (repo_map[rname] / ".sop" / "gates.json").is_file():
            high_risk_hit = True
            tier_reasons.append(f"{rname}/.sop/gates.json missing for locked repo")
            continue
        schema = schemas_by_repo.get(rname) or VGR.load_repo_gates(rname, repo_map[rname])[1]
        for rel in changed_by_repo[rname]:
            if any(SC.glob_match(rel, pat) for pat in schema.get("ops_globs") or []):
                ops_hit = True
                tier_reasons.append(f"{rname}/{rel} matches ops_globs")
            if any(SC.glob_match(rel, pat) for pat in schema.get("high_risk_globs") or []):
                high_risk_hit = True
                tier_reasons.append(f"{rname}/{rel} matches high_risk_globs")

    if len(changed_repos) > 1:
        high_risk_hit = True
        tier_reasons.append(f"multi-repo change ({', '.join(changed_repos)})")
    if workaround_signals:
        high_risk_hit = True
        tier_reasons.append(f"A-symptom-guard detected {len(workaround_signals)} workaround signal(s)")

    total_code_files = 0
    total_lines_changed = 0
    for rname in changed_repos:
        df = diff_flags_by_repo[rname]
        non_size_flags = [f for f in df["flags"] if " — size: " not in f]
        if non_size_flags:
            high_risk_hit = True
            tier_reasons.append(f"{rname}: diff-flags ({len(non_size_flags)} structural flag(s))")
        code_in_task = sum(1 for p in changed_by_repo[rname] if Path(p).suffix in CODE_EXT)
        total_code_files += code_in_task
        total_lines_changed += int(df["lines_changed"])

    if total_code_files > 6 or total_lines_changed > 250:
        high_risk_hit = True
        tier_reasons.append(f"change size (code_files={total_code_files}, lines={total_lines_changed})")

    if ops_hit:
        risk_tier = "T3_OPS_PROD"
    elif high_risk_hit:
        risk_tier = "T2_HIGH_RISK"
    elif not changed_repos:
        risk_tier = "T0_READONLY"
        tier_reasons.append("no task file modifications detected")
    else:
        risk_tier = "T1_STANDARD"
        tier_reasons.append("single-repo scoped change outside high_risk_globs/ops_globs")

    runtime_verification = detect_runtime_verification(
        changed_by_repo, repo_map, diff_bases, snap_paths_by_repo, schemas_by_repo
    )

    return {
        "sop_root": str(eff_root),
        "workspace": workspace,
        "lock_file": str(eff_lock),
        "repo_map": repo_map,
        "registry_repos": registry_repos,
        "lock_errors": lock_errors,
        "target_repos": target_repos,
        "changed_repos": changed_repos,
        "changed_by_repo": changed_by_repo,
        "diff_bases": diff_bases,
        "baselines": baselines,
        "untracked_by_repo": untracked_by_repo,
        "snap_paths_by_repo": snap_paths_by_repo,
        "static_errors": static_errors,
        "workaround_signals": workaround_signals,
        "excuse_comment_leads": excuse_comment_leads,
        "comment_drift_leads": comment_drift_leads,
        "runtime_verification": runtime_verification,
        "risk_tier": risk_tier,
        "tier_reasons": tier_reasons,
    }


def run_sop_gate(
    *,
    task_dir: Path,
    repos_arg: str = "auto",
    repo_map_overrides: Optional[Dict[str, Path]] = None,
    base_overrides: Optional[Dict[str, str]] = None,
    fast_mode: bool = True,
    ops_plan: Optional[Path] = None,
    lock_file: Optional[Path] = None,
    sop_root: Optional[Path] = None,
) -> Tuple[int, Dict[str, object]]:
    task_dir = task_dir.resolve()
    ev_dir = task_dir / "evidence"
    ev_dir.mkdir(parents=True, exist_ok=True)

    assessed = assess_task_deterministically(
        task_dir=task_dir,
        repos_arg=repos_arg,
        repo_map_overrides=repo_map_overrides,
        base_overrides=base_overrides,
        ops_plan=ops_plan,
        lock_file=lock_file,
        sop_root=sop_root,
    )
    workspace: Dict[str, object] = assessed["workspace"]  # type: ignore[assignment]
    eff_lock = Path(str(assessed["lock_file"])).resolve()
    repo_map: Dict[str, Path] = assessed["repo_map"]  # type: ignore[assignment]
    registry_repos: Dict[str, Path] = assessed["registry_repos"]  # type: ignore[assignment]
    lock_errors: List[str] = assessed["lock_errors"]  # type: ignore[assignment]
    target_repos: List[str] = assessed["target_repos"]  # type: ignore[assignment]
    changed_repos: List[str] = assessed["changed_repos"]  # type: ignore[assignment]
    changed_by_repo: Dict[str, List[str]] = assessed["changed_by_repo"]  # type: ignore[assignment]
    diff_bases: Dict[str, str] = assessed["diff_bases"]  # type: ignore[assignment]
    baselines: Dict[str, Dict[str, object]] = assessed["baselines"]  # type: ignore[assignment]
    untracked_by_repo: Dict[str, set[str]] = assessed["untracked_by_repo"]  # type: ignore[assignment]
    snap_paths_by_repo: Dict[str, Dict[str, Path]] = assessed["snap_paths_by_repo"]  # type: ignore[assignment]
    static_errors: List[Dict[str, object]] = assessed["static_errors"]  # type: ignore[assignment]
    workaround_signals: List[Dict[str, object]] = assessed["workaround_signals"]  # type: ignore[assignment]
    excuse_comment_leads: List[Dict[str, object]] = assessed["excuse_comment_leads"]  # type: ignore[assignment]
    comment_drift_leads: List[Dict[str, object]] = assessed["comment_drift_leads"]  # type: ignore[assignment]
    runtime_verification: Dict[str, object] = assessed["runtime_verification"]  # type: ignore[assignment]
    risk_tier = str(assessed["risk_tier"])
    tier_reasons: List[str] = assessed["tier_reasons"]  # type: ignore[assignment]

    gate_run_fast_only = fast_mode and (risk_tier == "T1_STANDARD")
    repo_gate_receipts: Dict[str, object] = {}
    gates_ok = len(lock_errors) == 0

    if gates_ok:
        for rname in changed_repos:
            if rname not in registry_repos:
                repo_gate_receipts[rname] = {"gates": [], "native_guard_errors": [], "skipped": "no .sop/gates.json"}
                continue
            gcode, gsum = VGR.run_gates(registry_repos, rname, eff_lock, gate_run_fast_only)
            repo_gate_receipts[rname] = gsum.get("repos", {}).get(rname, {})
            if gcode != 0:
                gates_ok = False

    repo_paths: Dict[str, str] = {}
    repo_trees: Dict[str, str] = {}
    for rname in sorted(repo_map.keys()):
        rpath = repo_map[rname].resolve()
        if not rpath.is_dir():
            continue
        repo_paths[rname] = str(rpath)
        repo_trees[rname] = SC.tree_stamp_for_repo(rpath, rname, workspace)
        if rname in changed_repos:
            patch_path = ev_dir / f"diff-{rname}.patch"
            patch_body = build_repo_patch(
                rpath,
                diff_bases[rname],
                changed_by_repo[rname],
                untracked_by_repo[rname],
                snap_paths=snap_paths_by_repo[rname],
            )
            patch_path.write_text(patch_body, encoding="utf-8")

    if len(repo_trees) == 1:
        combined_tree = next(iter(repo_trees.values()))
    elif len(repo_trees) > 1:
        joined = "\n".join(f"{k}={repo_trees[k]}" for k in sorted(repo_trees)).encode("utf-8")
        combined_tree = "tree=" + hashlib.sha256(joined).hexdigest()[:12]
    else:
        combined_tree = "tree=000000000000"

    overall_pass = gates_ok and len(static_errors) == 0

    payload: Dict[str, object] = {
        "schema_version": 2,
        "task_slug": task_dir.name,
        "sop_root": str(assessed["sop_root"]),
        "status": "PASS" if overall_pass else "FAIL",
        "risk_tier": risk_tier,
        "tier_reasons": tier_reasons,
        "fast_only_gates": gate_run_fast_only,
        "lock_file": str(eff_lock),
        "lock_errors": lock_errors,
        "repos_arg": repos_arg,
        "ops_plan": str(ops_plan.resolve()) if ops_plan else None,
        "target_repos": target_repos,
        "changed_repos": changed_repos,
        "changed_files": {k: changed_by_repo[k] for k in changed_repos},
        "diff_bases": diff_bases,
        "baselines": baselines,
        "repo_paths": repo_paths,
        "repo_trees": repo_trees,
        "combined_tree": combined_tree,
        "static_errors": static_errors,
        "workaround_signals": workaround_signals,
        "excuse_comment_leads": excuse_comment_leads,
        "comment_drift_leads": comment_drift_leads,
        "runtime_verification": runtime_verification,
        "repo_gates": repo_gate_receipts,
        "generated_at_utc": SC.utc_now_iso(),
    }
    payload["receipt_digest"] = canonical_receipt_digest(payload)

    tree_hex = combined_tree.removeprefix("tree=")
    receipt_path = ev_dir / f"gate-{tree_hex}.json"
    latest_path = ev_dir / "gate-latest.json"
    encoded = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    receipt_path.write_text(encoded, encoding="utf-8")
    latest_path.write_text(encoded, encoding="utf-8")

    return (0 if overall_pass else 1), payload


def _git_init_repo(repo: Path) -> None:
    repo.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "-C", str(repo), "init", "-q"], check=True)
    subprocess.run(["git", "-C", str(repo), "config", "user.email", "test@example.com"], check=True)
    subprocess.run(["git", "-C", str(repo), "config", "user.name", "Tester"], check=True)


def run_self_test() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="sop-gate-self-test-"))
    try:
        repo = tmp / "web-svc"
        _git_init_repo(repo)
        (repo / "src").mkdir()
        (repo / "src" / "routes.ts").write_text("export const ok = 1;\n", encoding="utf-8")
        (repo / "src" / "small.py").write_text("def f():\n    return 1\n", encoding="utf-8")
        (repo / ".sop").mkdir()
        (repo / ".sop" / "gates.json").write_text(
            json.dumps(
                {
                    "version": 1,
                    "repo": "web-svc",
                    "high_risk_globs": ["src/routes.ts"],
                    "ops_globs": ["scripts/deploy*.sh"],
                    "runtime_verification": {
                        "web_ui": {"required_globs": ["src/pages/**"], "status": "REQUIRED_WEB"}
                    },
                    "gates": [
                        {"id": "W-ok", "description": "fast gate", "command": "true", "fast": True, "blocking": True},
                        {"id": "W-full", "description": "full gate", "command": "true", "fast": False, "blocking": True},
                    ],
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        lock_file = repo / ".sop" / "gates-lock.json"
        VGR.update_lock({"web-svc": repo}, lock_file)
        subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
        subprocess.run(["git", "-C", str(repo), "commit", "-qm", "init"], check=True)

        t0 = repo / ".sop" / "tasks" / "t0"
        t0.mkdir(parents=True)
        code0, p0 = run_sop_gate(task_dir=t0, sop_root=repo)
        assert code0 == 0 and p0["risk_tier"] == "T0_READONLY", p0

        (repo / "src" / "small.py").write_text("def f():\n    return 2\n", encoding="utf-8")
        t1 = repo / ".sop" / "tasks" / "t1"
        t1.mkdir(parents=True)
        code1, p1 = run_sop_gate(task_dir=t1, sop_root=repo)
        assert code1 == 0 and p1["risk_tier"] == "T1_STANDARD" and p1["fast_only_gates"] is True, p1

        (repo / "src" / "small.py").write_text("def f():\n    # narration comment\n    return 2\n", encoding="utf-8")
        code_slop, p_slop = run_sop_gate(task_dir=t1, sop_root=repo)
        assert code_slop == 1 and any(e["rule"] == "A-no-slop-comments" for e in p_slop["static_errors"]), p_slop

        (repo / "src" / "small.py").write_text("import json\ndef f():\n    return 2\n", encoding="utf-8")
        code_dead, p_dead = run_sop_gate(task_dir=t1, sop_root=repo)
        assert code_dead == 1 and any(e["rule"] == "A-dead-import" for e in p_dead["static_errors"]), p_dead

        (repo / "src" / "small.py").write_text("def f():\n    return 2\n", encoding="utf-8")
        (repo / "src" / "routes.ts").write_text("export const ok = 2;\n", encoding="utf-8")
        code2, p2 = run_sop_gate(task_dir=t1, sop_root=repo)
        assert code2 == 0 and p2["risk_tier"] == "T2_HIGH_RISK" and p2["fast_only_gates"] is False, p2

        shutil.rmtree(t0)
        shutil.rmtree(t1)
        t3 = repo / ".sop" / "tasks" / "t3"
        t3.mkdir(parents=True)
        (t3 / "plan.md").write_text("```bash\nOUT=1\nbash -c 'echo $OUT'\n```\n", encoding="utf-8")
        code_sh, p_sh = run_sop_gate(task_dir=t3, sop_root=repo)
        assert code_sh == 1 and any(e["rule"] == "O-subshell-single-quote-var" for e in p_sh["static_errors"]), p_sh
    finally:
        for p in tmp.rglob("*"):
            try:
                if p.is_file():
                    os.chmod(p, 0o644)
            except OSError:
                pass
        shutil.rmtree(tmp, ignore_errors=True)

    print("ALL sop-gate.py SELF-TESTS PASSED")
    return 0


def parse_kv_overrides(items: Sequence[str], is_path: bool = False) -> Dict[str, object]:
    out: Dict[str, object] = {}
    for raw in items:
        if "=" not in raw:
            raise ValueError(f"Expected KEY=VALUE, got {raw!r}")
        k, v = raw.split("=", 1)
        out[k.strip()] = Path(v.strip()).expanduser().resolve() if is_path else v.strip()
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Deterministic Phase 3 0-Token gate & risk classifier.")
    parser.add_argument("--task-dir", help="Task slug or path")
    parser.add_argument("--sop-root", help="SOP root directory (auto-discovered when omitted)")
    parser.add_argument("--repos", default="auto", help="Comma-separated repo names or 'auto'")
    parser.add_argument("--repo-map", action="append", default=[], help="Override repo path (<name>=<abs_path>)")
    parser.add_argument("--base", action="append", default=[], help="Override diff base (<repo>=<git_ref>)")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--fast", action="store_true", help="Run fast gates for T1_STANDARD (default)")
    group.add_argument("--full", action="store_true", help="Run full gates regardless of tier")
    parser.add_argument("--ops-plan", help="Additional ops plan markdown file to check via O-shell-cli-preflight")
    parser.add_argument("--lock-file", help="Explicit gates-lock.json path")
    parser.add_argument("--json", action="store_true", help="Print full receipt JSON")
    parser.add_argument("--self-test", action="store_true", help="Run internal self-tests and exit")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()

    if not args.task_dir:
        parser.error("--task-dir is required unless --self-test is set")

    sop_root = SC.find_sop_root(
        explicit_root=Path(args.sop_root) if args.sop_root else None,
        task_dir=Path(args.task_dir) if ("/" in args.task_dir or Path(args.task_dir).is_absolute()) else None,
    )
    task_dir = SC.resolve_task_dir(args.task_dir, sop_root)

    try:
        repo_overrides = parse_kv_overrides(args.repo_map, is_path=True) if args.repo_map else None
        base_overrides = parse_kv_overrides(args.base, is_path=False) if args.base else None
        code, receipt = run_sop_gate(
            task_dir=task_dir,
            repos_arg=args.repos,
            repo_map_overrides=repo_overrides,  # type: ignore[arg-type]
            base_overrides=base_overrides,  # type: ignore[arg-type]
            fast_mode=not args.full,
            ops_plan=Path(args.ops_plan).expanduser().resolve() if args.ops_plan else None,
            lock_file=Path(args.lock_file).expanduser().resolve() if args.lock_file else None,
            sop_root=sop_root,
        )
    except (FileNotFoundError, ValueError, RuntimeError) as err:
        print(f"ERROR: {err}", file=sys.stderr)
        return 2

    if args.json:
        print(json.dumps(receipt, indent=2, ensure_ascii=False))
    else:
        print(
            f"GATE_{receipt['status']} tier={receipt['risk_tier']} "
            f"tree={receipt['combined_tree']} repos={','.join(receipt['changed_repos']) or 'none'}"
        )
        for err in receipt["lock_errors"]:
            print(f"  LOCK_ERROR: {err}", file=sys.stderr)
        for se in receipt["static_errors"]:
            print(f"  STATIC_FAIL [{se['rule']}] {se['file']}:{se['line']} — {se['message']}", file=sys.stderr)
        for ws in receipt["workaround_signals"]:
            print(f"  WORKAROUND_SIGNAL [{ws['kind']}] {ws['file']}:{ws['line']} — {ws['snippet']}")
        for ec in receipt.get("excuse_comment_leads") or []:
            print(f"  EXCUSE_COMMENT_LEAD [{ec['rule']}] {ec['file']}:{ec['line']} — {ec['comment']}")
        for dl in receipt["comment_drift_leads"]:
            print(f"  COMMENT_DRIFT_LEAD {dl['file']}:{dl['line']} token={dl['token']} — {dl['comment']}")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
