#!/usr/bin/env python3
"""Run record and completion check for a pstack playbook run.

    run-record.py init --route PLAYBOOK --task "<request>" [--phases A,B,C] [--host HOST --session-id ID]
    run-record.py workspace --path WORKTREE
    run-record.py baseline --harness PATH... --command CMD --output FILE [--commit REV]
    run-record.py evidence --kind repro|verify|review|artifact --result pass|fail|inconclusive
                           --output FILE [--command CMD] [--harness current|original]
                           [--phase NAME] [--tool-id ID]
    run-record.py phase NAME (--start | --done | --skip REASON | --fail REASON | --block REASON)
                            [--note TEXT] [--agent ID] [--from NAME --reason TEXT]
                            [--evidence SEQ...] [--tool-id ID]
    run-record.py delegate --job JOB [--status launched|returned|failed|timeout|cancelled|dropped]
                           [--role ROLE --model MODEL] [--budget MINUTES] [--reason TEXT]
                           [--result TEXT] [--phase NAME] [--agent-id ID] [--tool-id ID]
    run-record.py finding add --id ID --source SRC --severity blocker|act|consider --summary TEXT
    run-record.py finding resolve --id ID --status fixed|dismissed --reason TEXT
    run-record.py ground add --skill how|why --scope PATH... --output FILE
    run-record.py ground check --scope PATH...
    run-record.py pause --next "<first action on resume>" [--reason TEXT]
    run-record.py resume
    run-record.py reroute --route PLAYBOOK --reason TEXT
    run-record.py check [--through PHASE]
    run-record.py status
    run-record.py tasks [--json]

Every command after init takes --run ID. Pass it always: the `current` pointer is shared.

The record lives at .pstack/runs/<id>.json in the repository's main checkout, so
removing a worktree never removes it. The run fingerprints its workspace: the
checkout where init ran, or the worktree `workspace` moved it to before any
evidence. `--run` finds the record from any worktree of the repository, and
commands that record refuse to run from a checkout other than the workspace. Every entry is
stamped with a fingerprint of the working tree when it was recorded, so evidence
taken before a later edit reads as stale. The fingerprint leaves out .pstack, and
an output is recorded only from .pstack or outside the workspace, so no output
counts as code and no source can pass as an output. Every output's hash stays
checked, a superseded baseline's included. `check` proves evidence is missing or
stale. It cannot prove evidence is true.

A run still in its first phase can `reroute` to a playbook its contract names in
`reroute_to`. Its record then closes into the new run, and `check` reports the
new run as well as this run's own receipts and findings.

A delegate job gets at most two attempts: the first, and one retry. The record
refuses a third, so recovery ends in a returned result, a drop with a reason, or
an honest incomplete run.

Exit codes: 0 complete or reusable, 1 incomplete, 2 usage or environment error.
"""
import argparse
from contextlib import contextmanager, nullcontext, redirect_stdout
from datetime import datetime, timezone
from functools import lru_cache
import hashlib
import io
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path, PurePosixPath

ROUTES = {
    "bug-fix": {
        "phases": ["reproduce", "root-cause", "plan", "implement", "cleanup",
                   "review", "verify", "commits", "open-pr"],
        "baseline": True,
        "order": [("reproduce", "root-cause"), ("reproduce", "implement"),
                  ("plan", "implement"), ("implement", "cleanup"), ("cleanup", "review")],
    },
}
ACTIONABLE = {"blocker", "act"}
# Hosts that tell a command which session ran it. A run record that stores the id links to that
# session exactly in `pstack serve`; without one the link is inferred from time and folder.
SESSION_ENV = {"claude": "CLAUDE_CODE_SESSION_ID"}
MAX_ATTEMPTS = 2
ENDS_ATTEMPT = {"returned", "failed", "timeout", "cancelled"}
FAILED = {"failed", "timeout", "cancelled"}
ROUTE_CATALOG = None


class Fail(Exception):
    pass


def git(root, *args, env=None, input=None):
    try:
        r = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True, env=env, input=input)
    except FileNotFoundError:
        raise Fail("git is not installed or not on PATH")
    if r.returncode:
        raise Fail(f"git {' '.join(args)}: {r.stderr.strip() or 'failed'}")
    return r.stdout.strip()


def toplevel():
    try:
        return Path(git(Path.cwd(), "rev-parse", "--show-toplevel"))
    except Fail:
        cwd = Path.cwd().resolve()
        return next((p for p in (cwd, *cwd.parents) if (p / ".pstack").is_dir()), cwd)


def directory_fingerprint(path):
    """Content identity without Git. Never follows symlinks or reads pstack's own records."""
    digest = hashlib.sha256()

    def visit(p, relative):
        info = p.lstat()
        digest.update(relative.encode("utf-8", "surrogateescape") + b"\0")
        if stat.S_ISLNK(info.st_mode):
            digest.update(b"link\0" + os.fsencode(os.readlink(p)))
        elif stat.S_ISDIR(info.st_mode):
            digest.update(b"directory\0")
            for child in sorted(p.iterdir(), key=lambda c: c.name):
                if child.name not in {".pstack", ".git"}:
                    visit(child, relative + "/" + child.name)
        elif stat.S_ISREG(info.st_mode):
            digest.update(b"file\0" + str(info.st_mode & 0o111).encode() + b"\0")
            with p.open("rb") as f:
                for chunk in iter(lambda: f.read(1024 * 1024), b""):
                    digest.update(chunk)
        else:
            raise Fail(f"cannot fingerprint special workspace file: {p}")
        digest.update(b"\0")

    try:
        visit(path, ".")
    except FileNotFoundError:
        if path.exists():
            raise Fail("workspace changed while recording; retry the command")
        return "absent"
    except OSError as e:
        raise Fail(f"cannot fingerprint workspace: {e}")
    return "fs:" + digest.hexdigest()


def fingerprint(root):
    return fingerprints(root)[0]


def fingerprints(root):
    """Two ids of the working tree as it stands, .pstack excluded: (tree, content).

    With Git, tracked and untracked files count and files Git ignores do not; without Git every
    file counts and the two ids are the same. In `tree` a nested repository counts as its HEAD
    commit while clean and by its own fingerprint once edited, so a clean tree matches the commit
    that records it; the baseline check compares that. In `content` a nested repository always
    counts by its working-copy content, so committing inside it changes nothing; freshness
    compares that. A tracked symlink counts by its link text, not its target. A stored id is
    compared as a string with the id written now and never read back as an object, so `git gc`
    pruning an old fingerprint tree changes no result."""
    if not (root / ".git").exists():
        files = directory_fingerprint(root)
        return files, files
    # GIT_WORK_TREE pins the files to this directory, whatever the repository's core.worktree says.
    base = {**os.environ, "GIT_WORK_TREE": str(root)}
    with tempfile.TemporaryDirectory() as d:
        index = Path(d) / "index"
        real = root / git(root, "rev-parse", "--git-path", "index", env=base)
        if real.is_file():
            # copy2 keeps the index mtime, which git's racy-clean check compares file mtimes against.
            # A fresh mtime would let a same-size edit in the same second hash as unchanged.
            shutil.copy2(real, index)
        env = {**base, "GIT_INDEX_FILE": str(index)}
        # Assume-unchanged and skip-worktree bits make add trust the index over the file, hiding an
        # edit or a deletion, so clear them. In a sparse checkout a skip-worktree path absent from
        # disk lies outside the cone rather than deleted, and stays as the index has it.
        # update-index applies one flag option per call, so each bit gets its own.
        flagged = [(e[0], e[2:]) for e in git(root, "ls-files", "-v", "-z", env=env).split("\0")
                   if e and (e[0].islower() or e[0] == "S")]
        sparse = any(t in "Ss" for t, _ in flagged) and sparse_checkout(root)
        for flag, paths in (("--no-assume-unchanged", [p for t, p in flagged if t.islower()]),
                            ("--no-skip-worktree", [p for t, p in flagged if t in "Ss"
                                                    and not (sparse and not os.path.lexists(root / p))])):
            if paths:
                git(root, "update-index", flag, "-z", "--stdin", env=env, input="\0".join(paths) + "\0")
        # Another worktree of this repository nested inside this one (an agent's
        # `.claude/worktrees/x`) is a separate checkout, not part of this one. Only a live one: files
        # later written at a stale entry's path, or another repository reusing it, belong here.
        others = [r for r in (relpath(root, w) for w in live_worktrees(root)) if r != "." and not outside(r)]
        add = ["add", "-A", *sparse_add(), "--", ".", ":(exclude).pstack", *[f":(exclude,literal){r}" for r in others]]
        # Each nested repository's content id, indexed in its place for the content tree.
        swaps = []
        try:
            git(root, *add, env=env)
        except Fail:
            # An embedded repository with no commit cannot be indexed. Leave each one out and index
            # its content as one blob in its place, so an edit inside it still changes the id.
            nested = [p[:-1] for p in git(root, "ls-files", "-z", "-o", "--exclude-standard", env=base).split("\0")
                      if p.endswith("/") and (root / p / ".git").exists() and p[:-1] not in others]
            if not nested:
                raise
            git(root, *add, *[f":(exclude,literal){p}" for p in nested], env=env)
            for p in nested:
                inner, content = fingerprints(root / p)
                blob = git(root, "hash-object", "-w", "--stdin", input=inner, env=base)
                git(root, "update-index", "--add", "--cacheinfo", f"100644,{blob},{p}", env=env)
                swaps.append((p, content))
        # Add indexes a nested repository or submodule as its HEAD commit alone. While its tree
        # differs from that HEAD, index its own fingerprint in its place, so edits inside it count.
        # A clean one keeps the gitlink, so the tree still matches a commit that records it. Add
        # does not descend into a gitlink whose repository is gone (its .git removed, a submodule
        # deinitialised and then written into), so such a directory counts by what it holds.
        for e in git(root, "ls-files", "-s", "-z", env=env).split("\0"):
            if not e.startswith("160000 "):
                continue
            sub = e.split("\t", 1)[1]
            path = root / sub
            if (path / ".git").exists():
                inner, content = fingerprints(path)
                swaps.append((sub, content))
                if inner == head_tree(path):
                    continue
            elif path.is_dir() and any(path.iterdir()):
                inner = directory_fingerprint(path)
            else:
                continue
            blob = git(root, "hash-object", "-w", "--stdin", input=inner, env=base)
            git(root, "update-index", "--cacheinfo", f"100644,{blob},{sub}", env=env)
        tree = git(root, "write-tree", env=env)
        for p, content in swaps:
            blob = git(root, "hash-object", "-w", "--stdin", input=content, env=base)
            git(root, "update-index", "--cacheinfo", f"100644,{blob},{p}", env=env)
        return tree, git(root, "write-tree", env=env) if swaps else tree


def current_as(e, tree, content):
    """Whether an entry still describes the workspace: by content where it was stamped with a
    content id, by the commit-shaped id otherwise."""
    return e["content"] == content if "content" in e else e["tree"] == tree


@lru_cache(maxsize=None)
def git_version():
    try:
        out = subprocess.run(["git", "--version"], capture_output=True, text=True).stdout
    except OSError:
        return (0, 0)
    m = re.search(r"(\d+)\.(\d+)", out)
    return (int(m[1]), int(m[2])) if m else (0, 0)


def sparse_add():
    """`add --sparse`, from Git 2.34, also indexes paths outside a sparse-checkout cone."""
    return ("--sparse",) if git_version() >= (2, 34) else ()


def sparse_checkout(root):
    try:
        return git(root, "config", "--bool", "core.sparseCheckout") == "true"
    except Fail:
        return False


def head_tree(repo):
    try:
        return git(repo, "rev-parse", "--verify", "-q", "HEAD^{tree}")
    except Fail:
        return None


def baselines(rec):
    """Every baseline the run recorded, superseded ones first. Their output hashes stay checked."""
    return [b for b in [*rec.get("baselines", []), rec["baseline"]] if b]


def checked_output(root, rec, p):
    """The absolute path of an output to record. Outputs live under .pstack or outside the
    workspace: a file anywhere else in the tree could be source that recording would hide. The
    directories are compared as files, not as path strings, so another spelling of the root (a
    bind mount, a case-insensitive name) is still the root."""
    path = Path(p).resolve()
    for parent in (path, *path.parents):
        if same_file(parent, root / ".pstack"):
            return str(path)
        if same_file(parent, root):
            raise Fail(f"{relpath(root, path)} is inside the working tree, where an output cannot be told from "
                       f"source. Save it under .pstack/runs/{rec['run']}/ or outside the working tree.")
    return str(path)


def same_file(a, b):
    try:
        return os.path.samefile(a, b)
    except OSError:
        return False


def object_at(root, tree, path):
    if tree.startswith("fs:"):
        target = root / path
        if not target.resolve().is_relative_to(root.resolve()) and not target.is_symlink():
            raise Fail(f"scope is outside the workspace: {path}")
        return directory_fingerprint(target)
    try:
        return git(root, "rev-parse", "--verify", "-q", f"{tree}:{'' if path == '.' else path}")
    except Fail:
        pass
    # A path inside a nested repository is not in the tree, but the repository is, as a gitlink or
    # as the blob of its fingerprint. The nearest such parent stands for the path, so any change in
    # that repository counts. A path under an ordinary directory is simply absent.
    for parent in PurePosixPath(path).parents:
        if str(parent) == ".":
            break
        entry = git(root, "ls-tree", "-z", tree, "--", str(parent)).rstrip("\0")
        if entry:
            _, kind, oid = entry.split("\t", 1)[0].split()
            return oid if kind in {"commit", "blob"} else "absent"
    return "absent"


def relpath(root, p):
    try:
        return Path(os.path.relpath(Path(p).resolve(), root)).as_posix()
    except ValueError:
        # Windows raises for a path on another drive, which is outside the workspace.
        return "../" + Path(p).resolve().as_posix()


def outside(rel):
    return rel == ".." or rel.startswith("../")


def digest(p):
    p = Path(p)
    if not p.is_file():
        raise Fail(f"output file not found: {p}")
    try:
        return hashlib.sha256(p.read_bytes()).hexdigest()
    except OSError as e:
        raise Fail(f"cannot read output file {p}: {e.strerror or e}")


RECORD_KEYS = {"run": str, "route": str, "task": str, "seq": int, "phases_required": list, "phases": list,
               "evidence": list, "delegates": list, "findings": list, "grounding": list}
BASELINE_KEYS = {"commit": str, "commit_tree": str, "harness": dict, "output": str, "sha256": str, "tree": str}
# The fields each list entry must carry for the commands to read it.
ENTRY_KEYS = {"evidence": {"kind": str, "result": str, "output": str, "sha256": str, "seq": int, "tree": str},
              "grounding": {"skill": str, "scope": dict, "output": str, "sha256": str, "seq": int, "tree": str},
              "phases": {"name": str, "status": str, "seq": int},
              "delegates": {"job": str, "seq": int},
              "findings": {"id": str, "status": str, "severity": str, "source": str, "summary": str},
              "pauses": {"next": str, "seq": int, "tree": str},
              "baselines": BASELINE_KEYS}


def shape_problems(rec):
    """The parts of a loaded record the commands would misread. Checks shape, not truth."""
    def fits(value, keys):
        return isinstance(value, dict) and all(isinstance(value.get(k), t) for k, t in keys.items())

    if not isinstance(rec, dict):
        return ["the file holds no JSON object"]
    bad = [k for k, t in RECORD_KEYS.items() if not isinstance(rec.get(k), t)]
    for k, keys in ENTRY_KEYS.items():
        items = rec.get(k, [])
        if not isinstance(items, list) or not all(fits(e, keys) for e in items):
            bad.append(k)
    if rec.get("baseline") is not None and not fits(rec["baseline"], BASELINE_KEYS):
        bad.append("baseline")
    if rec.get("rerouted") is not None and not fits(rec["rerouted"], {"run": str, "route": str}):
        bad.append("rerouted")
    if rec.get("workspace") is not None and not fits(rec["workspace"], {"path": str}):
        bad.append("workspace")
    graph = rec.get("graph")
    if graph is not None and not (isinstance(graph, dict) and all(
            isinstance(graph.get(k, []), list) and all(fits(n, {"id": str}) for n in graph.get(k, []))
            for k in ("phases", "steps"))):
        bad.append("graph")
    return list(dict.fromkeys(bad))


def load_record(p):
    """A run record read from disk, or Fail naming what is wrong with it."""
    try:
        rec = json.loads(Path(p).read_text())
    except (OSError, ValueError) as e:
        raise Fail(f"run record {p} is not valid JSON or cannot be read ({e}); restore it or start a new run")
    bad = shape_problems(rec)
    if bad:
        raise Fail(f"{p} is not a run record (missing or malformed: {', '.join(bad)}); restore it or start a new run")
    rec.setdefault("baseline", None)
    rec.setdefault("pauses", [])
    return rec


def now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def runs_dir(root, create=True):
    d = root / ".pstack" / "runs"
    if create:
        try:
            d.mkdir(parents=True, exist_ok=True)
            if not (d / ".gitignore").exists():
                (d / ".gitignore").write_text("*\n")
        except OSError as e:
            raise Fail(f"cannot write run records under {d}: {e.strerror or e}")
        # A directory made read-only after it was created raises nothing above, so ask.
        if not os.access(d, os.W_OK | os.X_OK):
            raise Fail(f"cannot write run records under {d}: Permission denied")
    return d


def record_path(root, run):
    if not run:
        cur = runs_dir(root, create=False) / "current"
        if not cur.is_file():
            raise Fail("no run recorded here. Start one with: run-record.py init --route <playbook> --task <request>")
        run = cur.read_text().strip()
    # A run started in one worktree is reachable from every worktree of the same repository.
    for d in record_dirs(root):
        p = d / f"{run}.json"
        if p.is_file():
            return p
    raise Fail(f"no run named {run}")


def record_dirs(root):
    """Every directory that can hold this repository's run records, nearest first: this checkout's,
    the record home's, then each worktree's, where records made before they moved to the main
    checkout still sit. `pstack serve` lists runs from these directories."""
    entries = worktree_entries(root)
    homes = [root, record_home(root, entries), *live_worktrees(root, entries)]
    return list(dict.fromkeys(h / ".pstack" / "runs" for h in homes))


def git_common_dir(root):
    try:
        out = Path(git(root, "rev-parse", "--git-common-dir"))
    except Fail:
        return None
    return (out if out.is_absolute() else root / out).resolve()


def linked_worktree(root):
    """Whether root is a linked worktree rather than the main checkout of its git directory."""
    try:
        return Path(git(root, "rev-parse", "--absolute-git-dir")).resolve() != git_common_dir(root)
    except Fail:
        return False


def live_worktrees(root, entries=None):
    """Linked worktrees that still belong to this repository: listed, not prunable, and with a .git
    file that points back into this repository's git directory. A stale entry's path, deleted or
    reused by another repository, is none of them."""
    entries = worktree_entries(root) if entries is None else entries
    common = git_common_dir(root)
    live = []
    for e in entries:
        dotgit = e["path"] / ".git"
        if e["bare"] or e["prunable"] or not dotgit.is_file():
            continue
        try:
            text = dotgit.read_text().strip()
        except OSError:
            continue
        if not text.startswith("gitdir:"):
            continue
        admin = Path(text[len("gitdir:"):].strip())
        admin = (admin if admin.is_absolute() else e["path"] / admin).resolve()
        if common is None or admin.parent.parent == common:
            live.append(e["path"])
    return live


def worktree_entries(root):
    """This repository's checkouts as `git worktree list` reports them, the main one first:
    each with its path, and whether it is bare or prunable (its directory gone)."""
    z = git_version() >= (2, 36)
    try:
        out = git(root, "worktree", "list", "--porcelain", *(["-z"] if z else []))
    except Fail:
        return []
    entries = []
    for f in out.split("\0") if z else out.splitlines():
        if f.startswith("worktree "):
            entries.append({"path": Path(f[len("worktree "):]), "bare": False, "prunable": False})
        elif entries and f == "bare":
            entries[-1]["bare"] = True
        elif entries and f.startswith("prunable"):
            entries[-1]["prunable"] = True
    return entries


def worktrees(root):
    return [e["path"] for e in worktree_entries(root)]


def record_home(root, entries=None):
    """Where a new run's record lives: the repository's main checkout (for a bare repository, its
    git directory), which `git worktree remove` never deletes. A submodule, which lists its git
    directory first rather than a checkout, and a directory without Git keep records in root."""
    entries = worktree_entries(root) if entries is None else entries
    if not entries:
        return root
    first = entries[0]
    return first["path"] if first["bare"] or (first["path"] / ".git").exists() else root


def workspace_info(path, home):
    """How a record names its workspace. A linked worktree also gets its git admin directory, whose
    gitdir file follows `git worktree move`."""
    info = {"path": str(path), "kind": "git" if (path / ".git").exists() else "directory", "home": str(home)}
    if (path / ".git").is_file():
        try:
            info["admin"] = git(path, "rev-parse", "--absolute-git-dir")
        except Fail:
            pass
    return info


class WorkspaceGone(Fail):
    pass


def workspace(rec, store):
    """The checkout this run fingerprints: where init ran, or where `workspace` moved it. A record
    from before workspaces were recorded, or whose checkout moved as a whole, uses the checkout
    that holds it. A worktree removed since raises WorkspaceGone."""
    ws = rec.get("workspace") or {}
    path = ws.get("path")
    if not path:
        return store
    if Path(path).is_dir() and (ws.get("kind") != "git" or (Path(path) / ".git").exists()):
        return Path(path)
    # A linked worktree moved with `git worktree move`: its admin directory names the new place.
    gitdir = Path(ws.get("admin") or os.devnull) / "gitdir"
    if gitdir.is_file():
        # With worktree.useRelativePaths the file holds a path relative to the admin directory.
        dotgit = Path(gitdir.read_text().strip())
        moved = (dotgit if dotgit.is_absolute() else (gitdir.parent / dotgit).resolve()).parent
        if moved.is_dir():
            return moved
    # The checkout that holds the record moved as a whole, such as a renamed project directory.
    if path == ws.get("home", None if ws.get("moved") else path):
        return store
    raise WorkspaceGone(f"run {rec['run']} works in {path}, which was removed")


def save(p, rec):
    tmp = p.with_suffix(".tmp")
    try:
        tmp.write_text(json.dumps(rec, indent=2) + "\n")
        tmp.replace(p)
    except OSError as e:
        raise Fail(f"cannot write run records under {p.parent}: {e.strerror or e}")


@contextmanager
def record_lock(root):
    try:
        handle = (runs_dir(root) / ".lock").open("a+b")
    except OSError as e:
        raise Fail(f"cannot write run records under {runs_dir(root, create=False)}: {e.strerror or e}")
    with handle as lock:
        if os.name == "nt":
            import msvcrt
            lock.write(b"\0")
            lock.flush()
            lock.seek(0)
            msvcrt.locking(lock.fileno(), msvcrt.LK_LOCK, 1)
        else:
            import fcntl
            fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            yield
        finally:
            if os.name == "nt":
                lock.seek(0)
                msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(lock, fcntl.LOCK_UN)


def stamp(rec, root, **entry):
    rec["seq"] += 1
    tree, content = fingerprints(workspace(rec, root))
    return {**entry, "seq": rec["seq"], "at": now(), "t": time.time(), "tree": tree, "content": content}


def jobs(rec):
    """Each delegate job's entries, attempts used, and whether an attempt is still open."""
    out = {}
    for d in rec["delegates"]:
        j = out.setdefault(d["job"], {"entries": [], "attempts": 0, "open": None})
        status = d.get("status", "returned")
        if status == "launched":
            j["attempts"] += 1
            j["open"] = d
        elif status in ENDS_ATTEMPT:
            if j["open"] is None:
                j["attempts"] += 1
            j["open"] = None
        elif status == "dropped":
            j["open"] = None
        j["entries"].append(d)
    return out


def route_catalog():
    if ROUTE_CATALOG is not None:
        return ROUTE_CATALOG
    try:
        return json.loads(Path(__file__).with_name("routes.json").read_text())
    except (OSError, ValueError) as e:
        raise Fail(f"cannot load playbook contracts from routes.json: {e}")


def route_phases(route):
    """Phases for a route: the checked ones in ROUTES, else the playbook's steps from routes.json."""
    if route in ROUTES:
        return ROUTES[route]["phases"]
    return [p["id"] for p in route_catalog().get(route, {}).get("phases", [])]


def route_graph(route, phases):
    graph = route_catalog().get(route, {})
    if [p["id"] for p in graph.get("phases", [])] == phases:
        return graph
    return {"version": 1, "title": route.replace("-", " ").capitalize(),
            "phases": [{"id": p, "label": p, "step": i} for i, p in enumerate(phases, 1)],
            "edges": [{"from": a, "to": b, "kind": "next"} for a, b in zip(phases, phases[1:])],
            "contract": {"version": 1, "order": list(zip(phases, phases[1:])),
                         "gates": {p: {"evidence": p if p in {"verify", "review"} else "artifact",
                                       "fresh": p in {"verify", "review"}, "skip": False} for p in phases}}}


def completion_contract(rec):
    graph = route_catalog().get(rec["route"])
    if graph is not None:
        expected = [p["id"] for p in graph["phases"]]
        if rec["phases_required"] != expected:
            raise Fail(f"{rec['route']}: required phases differ from the built-in playbook, because its phases "
                       f"changed after this record started (now {', '.join(expected)}). Start a new run")
    else:
        graph = route_graph(rec["route"], rec["phases_required"])
    if not graph.get("contract"):
        raise Fail(f"{rec['route']}: no completion contract installed; update the project workflow files")
    return graph["contract"]


def cmd_init(a, root, home):
    if route_catalog().get(a.route, {}).get("contract", {}).get("run") is False:
        raise Fail(f"{a.route} starts no run of its own; it records on the task's run. Close the current phase, "
                   "then: run-record.py --run <task-run-id> pause --next \"<first action on resume>\"")
    if a.phases and a.route in route_catalog():
        raise Fail("--phases cannot replace a built-in playbook; use a bespoke route such as figure-it-out")
    phases = a.phases.split(",") if a.phases else route_phases(a.route)
    if not phases:
        raise Fail(f"no phases known for route {a.route}. Name a playbook (its file name without .md), "
                   "or pass --phases a,b,c for a bespoke run.")
    if len(set(phases)) != len(phases) or any(not p.strip() or p != p.strip() for p in phases):
        raise Fail("phase ids must be nonempty, distinct, and have no surrounding whitespace")
    session = next(({"host": h, "id": os.environ[v]} for h, v in SESSION_ENV.items() if os.environ.get(v)), None)
    if bool(a.host) != bool(a.session_id):
        raise Fail("--host and --session-id must be supplied together")
    if a.host:
        session = {"host": a.host, "id": a.session_id}
    new_run(home, a.run or run_id(a.route), a.route, a.task, session, phases, where=workspace_info(root, home))


def run_id(route):
    return f"{time.strftime('%Y%m%dT%H%M%S', time.gmtime())}-{route}-{uuid.uuid4().hex[:8]}"


def new_run(root, run, route, task, session, phases, current=True, where=None):
    d = runs_dir(root)
    where = dict(where or workspace_info(root, root))
    p = d / f"{run}.json"
    # An id names one run across every checkout, since --run finds a record in any of them.
    if p.exists() or any((runs / f"{run}.json").exists() for runs in record_dirs(root)):
        raise Fail(f"run {run} already exists")
    rec = {"run": run, "route": route, "task": task, "created": now(), "seq": 0,
           "session": session, "schema_version": 2, "graph": route_graph(route, phases),
           "workspace": where,
           "transitions": [],
           "phases_required": phases, "baseline": None, "evidence": [], "phases": [],
           "delegates": [], "findings": [], "grounding": [], "pauses": []}
    save(p, rec)
    if current:
        # The pointer is set where the record lives and where the work happens.
        for runs in {d, runs_dir(Path(where["path"]))}:
            (runs / "current").write_text(run + "\n")
    print(f"run {run} started. Record: {p}")
    print(f"Checklist and requirements: run-record.py --run {run} tasks --json")
    return run


def cmd_baseline(a, root, rec):
    ws = workspace(rec, root)
    if not (ws / ".git").exists():
        raise Fail("a committed bug-fix baseline requires Git. Phase progress and evidence can still be recorded in this directory.")
    commit = git(ws, "rev-parse", "--verify", f"{a.commit}^{{commit}}")
    harness = {}
    for h in a.harness:
        r = relpath(ws, h)
        oid = object_at(ws, commit, r)
        if oid == "absent":
            raise Fail(f"{r} is not committed at {commit[:12]}. Commit the failing check alone, then record the baseline.")
        harness[r] = oid
    output = checked_output(ws, rec, a.output)
    mark = stamp(rec, root, commit=commit, commit_tree=git(ws, "rev-parse", f"{commit}^{{tree}}"),
                 harness=harness, command=a.command, output=output, sha256=digest(output))
    if rec["baseline"]:
        rec.setdefault("baselines", []).append(rec["baseline"])
    rec["baseline"] = mark
    print(f"baseline {commit[:12]}, harness frozen: {', '.join(harness)}")


def cmd_evidence(a, root, rec):
    context = phase_context(rec, a.phase) if a.phase else {}
    output = checked_output(workspace(rec, root), rec, a.output)
    rec["evidence"].append(stamp(rec, root, kind=a.kind, result=a.result, harness=a.harness,
                                 command=a.command, output=output,
                                 sha256=digest(output), tool_ids=a.tool_id, **context))
    print(f"{a.kind} {a.result} recorded (seq {rec['seq']})")


def phase_nodes(rec):
    graph = rec.get("graph") or route_graph(rec["route"], rec["phases_required"])
    return {p["id"]: p for p in graph.get("phases", []) + graph.get("steps", [])}


def latest_phase(rec, name):
    return next((m for m in reversed(rec["phases"]) if m["name"] == name), None)


def phase_context(rec, name):
    m = latest_phase(rec, name)
    if not m or m.get("status") not in {"started", "blocked"}:
        raise Fail(f"phase {name}: start an attempt before attaching activity")
    return {"phase": name, "instance": m.get("instance"), "agent": m.get("agent", "main")}


def cmd_phase(a, root, rec):
    nodes = phase_nodes(rec)
    if a.name not in nodes:
        raise Fail(f"{a.name} is not a phase of {rec['route']}: {', '.join(rec['phases_required'])}")
    status = next((s for s, v in (("started", a.start), ("failed", a.fail is not None),
                                 ("blocked", a.block is not None), ("skip", a.skip is not None)) if v), "done")
    note = (a.skip if a.skip is not None else a.fail if a.fail is not None else
            a.block if a.block is not None else a.note or "").strip()
    if status in {"skip", "failed", "blocked"} and not note:
        raise Fail(f"a {status} phase needs a reason")
    gate = completion_contract(rec)["gates"].get(a.name, {})
    if status == "skip" and gate.get("skip") is False:
        raise Fail(f"phase {a.name}: mandatory requirement cannot be skipped; record a failure or block instead")
    if status == "skip" and gate.get("skip_with") and (latest_phase(rec, gate["skip_with"]) or {}).get("status") != "skip":
        raise Fail(f"phase {a.name}: skippable only after {gate['skip_with']} was skipped")
    if status == "skip" and not skip_reason_ok(gate, note):
        raise Fail(f"phase {a.name}: a skip needs a reason starting with: {', '.join(gate['skip_reasons'])}")
    if open_pause(rec):
        raise Fail("this run is paused. Resume it before recording phases")
    parent = nodes[a.name].get("parent")
    pm = latest_phase(rec, parent) if parent else None
    if parent and (not pm or pm["status"] != "started"):
        raise Fail(f"start parent phase {parent} before recording {a.name}")
    last = latest_phase(rec, a.name)
    same_parent = not parent or last and last.get("parent_instance") == pm.get("instance")
    opened = bool(last and same_parent and last["status"] in {"started", "blocked"})
    if status == "started" and opened and last["status"] == "started":
        raise Fail(f"phase {a.name} already has an open attempt")
    if status in {"failed", "blocked"} and not opened:
        raise Fail(f"phase {a.name}: start an attempt first")
    if status != "started":
        for n, node in nodes.items():
            child = latest_phase(rec, n)
            if node.get("parent") == a.name and child and last and child.get("parent_instance") == last.get("instance"):
                if child["status"] in {"started", "blocked"} or status == "done" and child["status"] == "failed":
                    raise Fail(f"phase {n} is {child['status']}. Resolve it before closing {a.name}")
    if a.source and status != "started":
        raise Fail("--from is only valid with --start")
    sources = [(name, latest_phase(rec, name)) for name in dict.fromkeys(a.source)]
    for name, source in sources:
        if not source or not (source["status"] in {"done", "skip", "failed"} or name == parent and source["status"] == "started"):
            raise Fail("--from must name a phase with a recorded outcome, or the active parent")
    if a.source and not a.reason.strip():
        raise Fail("a transition needs --reason")
    evidence = set(a.evidence or [])
    if evidence - {e["seq"] for e in rec["evidence"]}:
        raise Fail("--evidence must reference recorded evidence sequence numbers")
    attempt = (last.get("attempt", 1) if last else 0) + (0 if opened else 1)
    instance = f"{a.name}@{attempt}"
    agent = a.agent or (last.get("agent") if opened else None) or "main"
    rec.setdefault("graph", route_graph(rec["route"], rec["phases_required"]))
    rec["schema_version"] = 2
    mark = stamp(rec, root, name=a.name, status=status, note=note, attempt=attempt, instance=instance,
                 agent=agent, parent=parent, parent_instance=pm.get("instance") if pm else None,
                 evidence=sorted(evidence), tool_ids=a.tool_id)
    rec["phases"].append(mark)
    for name, source in sources:
        rec.setdefault("transitions", []).append({"seq": mark["seq"], "at": mark["at"],
            "from": name, "to": a.name, "from_instance": source.get("instance"),
            "to_instance": instance, "reason": a.reason.strip(), "evidence": sorted(evidence), "agent": agent})
    print(f"phase {a.name}: {status}{f' ({note})' if note else ''}")


def cmd_delegate(a, root, rec):
    context = phase_context(rec, a.phase) if a.phase else {}
    job = jobs(rec).get(a.job, {"entries": [], "attempts": 0, "open": None})
    last = job["entries"][-1] if job["entries"] else {}
    role, model = a.role or last.get("role"), a.model or last.get("model")
    starts = a.status == "launched" or (a.status in ENDS_ATTEMPT and job["open"] is None)
    if a.status in ("launched", "returned") and not (role and model):
        raise Fail("--role and --model are required the first time a job is recorded")
    if a.status in FAILED | {"dropped"} and not a.reason:
        raise Fail(f"a {a.status} delegate needs --reason")
    if a.status == "launched" and job["open"] is not None:
        raise Fail(f"job {a.job} already has an attempt running. Record its outcome first.")
    if starts and job["attempts"] >= MAX_ATTEMPTS:
        raise Fail(f"job {a.job} has used its {MAX_ATTEMPTS} attempts. Record it dropped with a reason, "
                   "run the step inline and say so, or stop and report the step incomplete.")
    rec["delegates"].append(stamp(rec, root, job=a.job, status=a.status, role=role, model=model,
                                  budget=a.budget, reason=a.reason or "", result=a.result or "",
                                  agent_id=a.agent_id, tool_ids=a.tool_id, **context))
    attempt = job["attempts"] + (1 if starts else 0)
    print(f"delegate {a.job}: {a.status} (attempt {attempt} of {MAX_ATTEMPTS})")


def cmd_finding(a, root, rec):
    found = next((f for f in rec["findings"] if f["id"] == a.id), None)
    if a.action == "add":
        if found:
            raise Fail(f"finding {a.id} already exists")
        rec["findings"].append(stamp(rec, root, id=a.id, source=a.source, severity=a.severity,
                                     summary=a.summary, status="open", reason=""))
        print(f"finding {a.id} open")
        return
    if not found:
        raise Fail(f"no finding {a.id}")
    found.update(status=a.status, reason=a.reason, resolved=stamp(rec, root))
    print(f"finding {a.id} {a.status}")


def covers(scope, path):
    return scope == "." or path == scope or path.startswith(scope + "/")


def cmd_ground(a, root, rec):
    ws = workspace(rec, root)
    paths = [relpath(ws, p) for p in a.scope]
    refused = [p for p in paths if outside(p) or p.split("/")[0] in {".git", ".pstack"}]
    if refused:
        raise Fail(f"scope is outside the workspace, or in .git or .pstack: {', '.join(refused)}")
    tree = fingerprint(ws)
    if a.action == "add":
        output = checked_output(ws, rec, a.output)
        rec["seq"] += 1
        rec["grounding"].append({"skill": a.skill, "scope": {p: object_at(ws, tree, p) for p in paths},
                                 "output": output, "sha256": digest(output),
                                 "seq": rec["seq"], "at": now(), "tree": tree})
        print(f"{a.skill} grounding recorded for {', '.join(paths)}")
        return 0
    ok = True
    for p in paths:
        verdict = f"{p}: uncovered, no grounding recorded for it"
        for g in reversed(rec["grounding"]):
            scope = next((s for s in g["scope"] if covers(s, p)), None)
            if scope is None:
                continue
            if object_at(ws, tree, scope) == g["scope"][scope]:
                verdict = f"{p}: reusable, {g['skill']} {g['output']} (unchanged since seq {g['seq']})"
                break
            verdict = f"{p}: changed since {g['skill']} grounding seq {g['seq']}, rerun for this path"
        ok &= verdict.split(": ", 1)[1].startswith("reusable")
        print(verdict)
    return 0 if ok else 1


def open_pause(rec):
    p = rec.get("pauses", [])
    return p[-1] if p and not p[-1].get("resumed") else None


def cmd_pause(a, root, rec):
    if open_pause(rec):
        raise Fail("this run is already paused. Resume it first.")
    running = [j for j, v in jobs(rec).items() if v["open"] is not None]
    marks = {}
    for m in rec["phases"]:
        marks[m["name"]] = m["status"]
    reached = [n for n in rec["phases_required"] if n in marks]
    rec.setdefault("pauses", []).append(stamp(rec, root, next=a.next, reason=a.reason or "",
                                              open_delegates=running, phases_reached=reached,
                                              resumed=None))
    print(f"paused. Resume point: {a.next}")
    if running:
        print(f"  still open: {', '.join(running)}. Cancel them and record each outcome.")


def cmd_resume(a, root, rec):
    p = open_pause(rec)
    if not p:
        raise Fail("this run is not paused")
    print(f"resume point (paused {p['at']}): {p['next']}")
    if p["reason"]:
        print(f"  why it stopped: {p['reason']}")
    print(f"  phases recorded then: {', '.join(p['phases_reached']) or 'none'}")
    if p["open_delegates"]:
        print(f"  delegates open then: {', '.join(p['open_delegates'])}. Record their outcomes before relaunching.")
    if not current_as(p, *fingerprints(workspace(rec, root))):
        print("  the working tree changed since the pause. Recheck any evidence you rely on.")
    p["resumed"] = stamp(rec, root)


def cmd_reroute(a, root, rec):
    """Close a run still in its first phase into a new run of a playbook its contract names."""
    reason = a.reason.strip()
    if not reason:
        raise Fail("a reroute needs a reason")
    allowed = completion_contract(rec).get("reroute_to", [])
    if a.route not in allowed:
        raise Fail(f"{rec['route']} reroutes only to: {', '.join(allowed) or 'no other playbook'}")
    if open_pause(rec):
        raise Fail("this run is paused. Resume it before rerouting")
    running = [j for j, v in jobs(rec).items() if v["open"] is not None]
    if running:
        raise Fail(f"record the outcome of open delegates first: {', '.join(running)}")
    failed = [j for j, v in jobs(rec).items() if v["entries"][-1].get("status", "returned") in FAILED]
    if failed:
        raise Fail(f"retry or drop failed delegates first: {', '.join(failed)}")
    findings = [f["id"] for f in rec["findings"] if f["status"] == "open" and f["severity"] in ACTIONABLE]
    if findings:
        raise Fail(f"resolve open findings first: {', '.join(findings)}")
    first = rec["phases_required"][0]
    later = sorted({m["name"] for m in rec["phases"] if m["name"] != first})
    if later:
        raise Fail(f"reroute is for a run still in its first phase ({first}); already recorded: {', '.join(later)}")
    m = latest_phase(rec, first)
    if m and m["status"] in {"failed", "blocked"}:
        raise Fail(f"phase {first} is {m['status']}. Report that; a stuck run does not reroute")
    pointers = [runs / "current" for runs in {runs_dir(root), runs_dir(workspace(rec, root), create=False)}]
    moving = [c for c in pointers if c.is_file() and c.read_text().strip() == rec["run"]]
    # Stamp before writing anything, write the new record, save this one, and only then move the
    # pointers, so a failure part way leaves no rerouted record without its target. The new run
    # keeps this run's workspace as recorded, a move included.
    run = run_id(a.route)
    mark = stamp(rec, root, run=run, route=a.route, reason=reason)
    new_run(root, run, a.route, rec["task"], rec.get("session"), route_phases(a.route), current=False,
            where=rec.get("workspace"))
    rec["rerouted"] = mark
    try:
        save(record_path(root, rec["run"]), rec)
    except Fail:
        # Only this record links to the new run, so a failed save must not leave it behind.
        try:
            (runs_dir(root, create=False) / f"{run}.json").unlink(missing_ok=True)
        except OSError:
            pass
        raise
    for c in moving:
        c.write_text(run + "\n")
    print(f"run {rec['run']} rerouted to {a.route}. Continue with --run {run}")


def cmd_workspace(a, root, rec):
    """Move a run into the worktree its work happens in, before any evidence ties it to a tree."""
    target = Path(a.path).resolve()
    ws = rec.get("workspace") or {}
    if rec["evidence"] or baselines(rec) or rec["grounding"]:
        raise Fail("this run already holds evidence taken in its workspace, and a move would compare it "
                   "with another checkout. Start a new run in the worktree instead")
    running = [j for j, v in jobs(rec).items() if v["open"] is not None]
    if running:
        raise Fail(f"a delegate attempt is open ({', '.join(running)}). A delegate in its own worktree records "
                   "nothing and does not move the run: it returns its output paths to the parent")
    origin = ws.get("origin") or ws.get("path")
    if ws.get("moved") and not (origin and same_file(target, origin)):
        raise Fail(f"this run already moved to {ws.get('path')}. It moves only back to where init ran "
                   f"({origin}); start a new run for work elsewhere")
    if not any(same_file(target, t) for t in worktrees(root)):
        raise Fail(f"{target} is not a worktree of this repository (see: git worktree list)")
    rec["workspace"] = {**workspace_info(target, ws.get("home") or root), "origin": origin or str(target),
                        "moved": True}
    (runs_dir(target) / "current").write_text(rec["run"] + "\n")
    print(f"run {rec['run']} now works in {target}. Record from there with --run {rec['run']}")


def phase_activity(rec, name, entries):
    mark = latest_phase(rec, name) or {}
    starts = [m["seq"] for m in rec["phases"] if m["name"] == name and m["status"] == "started"
              and m.get("instance") == mark.get("instance")]
    return [e for e in entries
            if (e.get("phase") == name or e["seq"] in mark.get("evidence", [])
                or name in {"verify", "review", "implement"} and not e.get("phase"))
            and (not e.get("instance") or e["instance"] == mark.get("instance"))
            and (not starts or e["seq"] > starts[0])]


def skip_reason_ok(gate, note):
    """A gate that lists skip reasons takes a skip only when the reason's first word is one of them,
    in any case, with surrounding punctuation ignored."""
    tokens = gate.get("skip_reasons")
    word = re.match(r"\W*([\w-]+)", note)
    return not tokens or bool(word) and word.group(1).lower() in {t.lower() for t in tokens}


def gate_problems(rec, required, contract, fresh):
    out = []
    for name, gate in contract["gates"].items():
        if name not in required:
            continue
        mark = latest_phase(rec, name)
        if not mark:
            continue
        if mark["status"] == "skip":
            if not gate.get("skip", False):
                out.append(f"phase {name}: mandatory requirement cannot be skipped.")
            elif gate.get("skip_with") and (latest_phase(rec, gate["skip_with"]) or {}).get("status") != "skip":
                out.append(f"phase {name}: skipped, but {gate['skip_with']} was not. Do this phase.")
            elif not skip_reason_ok(gate, mark.get("note") or ""):
                out.append(f"phase {name}: skipped for a reason its gate does not accept. "
                           f"A skip here starts with: {', '.join(gate['skip_reasons'])}.")
            continue
        if mark["status"] != "done":
            continue
        for step in gate.get("steps", []):
            child = latest_phase(rec, step)
            if not child or child.get("parent_instance") != mark.get("instance") or child["status"] != "done":
                out.append(f"{name}: {step} is not done in this attempt. Record it before closing {name}.")
        kind = gate.get("evidence")
        if kind and not (kind == "verify" and name == "verify"):
            evidence = [e for e in phase_activity(rec, name, rec["evidence"]) if e["kind"] == kind]
            if not evidence:
                out.append(f"{name}: no {kind} evidence for this phase attempt. Record evidence --kind {kind} --phase {name}.")
            elif evidence[-1]["result"] != "pass":
                out.append(f"{name}: latest {kind} evidence is {evidence[-1]['result']}.")
            elif gate.get("fresh") and not fresh(evidence[-1]):
                out.append(f"{name}: stale {kind} evidence. Rerun on the current artifact.")
        if gate.get("delegate"):
            delegates = phase_activity(rec, name, rec["delegates"])
            current_jobs = jobs(rec)
            returned = any(d.get("status", "returned") == "returned"
                           and current_jobs[d["job"]]["entries"][-1]["seq"] == d["seq"]
                           and (name != "implement" or d["job"] == "implement") for d in delegates)
            if not returned and not (gate.get("parent_note") and parent_owned(mark.get("note") or "")):
                out.append((f"{name}: no returned implementation delegate recorded." if name == "implement" else
                            f"{name}: no returned delegate recorded for this phase attempt.")
                           + (' Where delegation is unavailable, close it with --note "parent: <the limitation>".'
                              if gate.get("parent_note") else ""))
    reviews = {}
    for e in rec["evidence"]:
        if e["kind"] == "review":
            reviews[e.get("phase") or "review"] = e
    nodes = phase_nodes(rec)
    for name, e in reviews.items():
        # A verdict on a phase outside the checked scope waits for that scope. A verdict with no
        # phase of this route cannot be scoped, so it always counts.
        if name in nodes and (nodes[name].get("parent") or name) not in required:
            continue
        # Skipping clears a verdict only on a gate whose review is conditional. Any phase without a
        # gate can be skipped, and that must not erase a failed review recorded on it.
        mark = latest_phase(rec, name)
        conditional = contract["gates"].get(name, {}).get("skip") is True
        if conditional and mark and mark["status"] == "skip" and mark["seq"] > e["seq"]:
            continue
        if e["result"] != "pass":
            out.append(f"{name}: unresolved {e['result']} review verdict at seq {e['seq']}.")
    return out


def parent_owned(note):
    """A parent-owned step names the limitation that kept it from a delegate, in a few words at least."""
    prefix, _, why = note.partition(":")
    return prefix.strip().lower() == "parent" and len(why.split()) >= 3


def output_problems(rec):
    out = []
    for e in [*baselines(rec), *rec["evidence"], *rec["grounding"]]:
        if not Path(e["output"]).is_file():
            out.append(f"evidence file missing: {e['output']}")
            continue
        try:
            changed = digest(e["output"]) != e["sha256"]
        except Fail:
            out.append(f"evidence file unreadable: {e['output']}")
            continue
        if changed:
            out.append(f"evidence file changed after it was recorded: {e['output']}")
    return out


def delegate_problems(rec):
    out = []
    for name, j in jobs(rec).items():
        last = j["entries"][-1].get("status", "returned")
        if j["open"] is not None:
            o = j["open"]
            over = o.get("budget") and time.time() - o["t"] > o["budget"] * 60
            out.append(f"delegate {name}: attempt {j['attempts']} is still open"
                       + (f" and {int((time.time() - o['t']) / 60 - o['budget'])} min over its budget. Cancel it and record a timeout."
                          if over else ". Record its outcome."))
        elif last in FAILED:
            left = MAX_ATTEMPTS - j["attempts"]
            out.append(f"delegate {name}: ended {last}. " + (f"Retry it once with the failure named, or record it dropped."
                                                             if left > 0 else "Its retry is spent. Record it dropped, or report the step incomplete."))
    return out


def finding_problems(rec):
    return [f"finding {f['id']} ({f['severity']}, {f['source']}): open. {f['summary']}"
            for f in rec["findings"] if f["status"] == "open" and f["severity"] in ACTIONABLE]


def problems(root, rec, through=None, seen=frozenset()):
    moved = rec.get("rerouted")
    if moved:
        # The new run carries the phases, and --through names one of its phases. This run's own
        # receipts, delegates, and findings still count.
        out = output_problems(rec) + delegate_problems(rec) + finding_problems(rec)
        run, route, seen = moved.get("run"), moved.get("route"), seen | {rec["run"]}
        if run in seen:
            return out + [f"reroute cycle: run {run} leads back to run {rec['run']}"]
        try:
            target = load_record(record_path(root, run))
        except Fail as e:
            return out + [f"rerouted to {route} run {run}: cannot read that record ({e})"]
        return out + [f"rerouted to {route} run {run}: {p}" for p in problems(root, target, through, seen)]
    out = []
    try:
        ws = workspace(rec, root)
    except WorkspaceGone as e:
        return [f"{e}, so its evidence can no longer be re-fingerprinted and the run cannot be checked "
                "complete. Verify the merged result in a new run"] + output_problems(rec) + delegate_problems(rec) \
            + finding_problems(rec)
    tree, content = fingerprints(ws)

    def fresh(e):
        return current_as(e, tree, content)

    route = ROUTES.get(rec["route"], {})
    try:
        contract = completion_contract(rec)
    except Fail as e:
        return [str(e)]
    required = rec["phases_required"]
    if through:
        if through not in required:
            raise Fail(f"{through} is not a phase of {rec['route']}")
        required = required[: required.index(through) + 1]

    p = open_pause(rec)
    if p:
        out.append(f"paused at seq {p['seq']}: {p['next']}. Continue with: run-record.py resume")

    marks = {}
    for m in rec["phases"]:
        marks.setdefault(m["name"], []).append(m)
    for name in required:
        if name not in marks:
            out.append(f"phase {name}: not recorded. Mark it done, or skip it with a reason.")
        elif marks[name][-1]["status"] not in {"done", "skip"}:
            out.append(f"phase {name}: {marks[name][-1]['status']}. Finish this attempt before completion.")
    for name, node in phase_nodes(rec).items():
        parent = node.get("parent")
        pm, m = latest_phase(rec, parent), latest_phase(rec, name)
        if parent in required and m and pm and m.get("parent_instance") == pm.get("instance"):
            if m["status"] not in {"done", "skip"}:
                out.append(f"phase {name}: {m['status']}. Resolve this step before completion.")
    for first, then in contract.get("order", []):
        if then not in required or first not in required:
            continue
        # Judge the attempt that stands: redoing a phase after its predecessor clears an earlier
        # out-of-order done, as a new attempt replaces an old one everywhere else.
        done = next((m for m in reversed(marks.get(then, [])) if m["status"] == "done"), None)
        if not done:
            continue
        began = min((m["seq"] for m in marks[then] if done.get("instance") and m.get("instance") == done["instance"]),
                    default=done["seq"])
        if not any(m["seq"] < began and m["status"] in {"done", "skip"} for m in marks.get(first, [])):
            out.append(f"phase {then}: marked done before {first} was recorded.")

    out.extend(output_problems(rec))

    b = rec["baseline"]
    harness_changed = []
    if route.get("baseline") and "reproduce" in required:
        if not b:
            out.append("baseline: none recorded. Commit the failing check alone, then run: baseline --harness ...")
        else:
            repro = [e for e in rec["evidence"] if e["kind"] == "repro" and e["result"] == "fail"]
            if not repro:
                out.append("baseline: no failing repro recorded.")
            elif not any(e["tree"] == b["commit_tree"] for e in repro):
                out.append("baseline: the failing repro was recorded on code other than the baseline commit.")
            try:
                git(ws, "merge-base", "--is-ancestor", b["commit"], "HEAD")
            except Fail:
                out.append(f"baseline: commit {b['commit'][:12]} is not an ancestor of HEAD.")
            harness_changed = [p for p, oid in b["harness"].items() if object_at(ws, tree, p) != oid]

    if "verify" in required:
        ver = [e for e in phase_activity(rec, "verify", rec["evidence"]) if e["kind"] == "verify"]
        current = [e for e in ver if fresh(e)]
        if not ver:
            out.append("verify: no verification recorded.")
        elif not current:
            out.append(f"verify: stale. The code changed after the last verification (seq {ver[-1]['seq']}). Rerun it on the current code.")
        else:
            latest = {}
            for e in current:
                latest[e["harness"]] = e
            if not harness_changed:
                last = current[-1]
                if last["result"] != "pass":
                    out.append(f"verify: the latest verification on the current code is {last['result']}.")
            else:
                for h in ("current", "original"):
                    e = latest.get(h)
                    if e is None:
                        out.append(f"verify: the harness changed since the baseline ({', '.join(harness_changed)}). "
                                   f"Record a {h}-harness verification on the current code.")
                    elif e["result"] != "pass":
                        out.append(f"verify: the {h} harness gives {e['result']} on the current code.")

    out.extend(gate_problems(rec, required, contract, fresh))
    return out + delegate_problems(rec) + finding_problems(rec)


def cmd_check(a, root, rec):
    found = problems(root, rec, a.through)
    scope = f" through {a.through}" if a.through else ""
    if rec.get("rerouted"):
        print(f"rerouted to {rec['rerouted']['route']} run {rec['rerouted']['run']}: {rec['rerouted']['reason']}")
    if found:
        print(f"INCOMPLETE{scope}: {len(found)} problem(s) in run {rec['run']}")
        for p in found:
            print(f"  - {p}")
        return 1
    print(f"complete{scope}: run {rec['run']} satisfies its recorded completion requirements")
    return 0


def task_list(rec):
    graph = route_catalog().get(rec["route"]) or rec.get("graph") or route_graph(rec["route"], rec["phases_required"])
    contract = completion_contract(rec)
    checklist = graph.get("checklist") or [{"id": p["id"], "text": p.get("description", p["label"]),
                                           "phases": [p["id"]]} for p in graph["phases"]]
    tasks = []
    for item in checklist:
        marks = [latest_phase(rec, p) for p in item["phases"]]
        states = [m["status"] if m else "pending" for m in marks]
        status = ("skipped" if all(s == "skip" for s in states) else
                  "done" if all(s in {"done", "skip"} for s in states) else
                  "failed" if "failed" in states else "blocked" if "blocked" in states else
                  "in_progress" if any(s != "pending" for s in states) else "pending")
        tasks.append({**item, "status": status, "notes": {m["name"]: m["note"] for m in marks if m and m.get("note")},
                      "requirements": {p: contract["gates"][p] for p in item["phases"] if p in contract["gates"]}})
    return tasks


def cmd_tasks(a, root, rec):
    tasks = task_list(rec)
    moved = rec.get("rerouted")
    if a.json:
        print(json.dumps({"run": rec["run"], "route": rec["route"], "tasks": tasks,
                          **({"rerouted": {"run": moved["run"], "route": moved["route"]}} if moved else {})}, indent=2))
    else:
        if moved:
            print(f"rerouted to {moved['route']} run {moved['run']}. Work from: run-record.py --run {moved['run']} tasks")
        for task in tasks:
            mark = "x" if task["status"] in {"done", "skipped"} else " "
            print(f"- [{mark}] {task['text']}")
            print(f"  state: {task['status']}; phase ids: {', '.join(task['phases'])}")
            for name, note in task["notes"].items():
                print(f"  {name}: {note}")
    return 0


def cmd_status(a, root, rec):
    gone = None
    try:
        tree, content = fingerprints(workspace(rec, root))
    except WorkspaceGone as e:
        tree = content = None
        gone = e
    print(f"run {rec['run']}  route {rec['route']}\ntask: {rec['task']}")
    if gone:
        print(f"WORKSPACE REMOVED: {gone}. Its evidence can no longer be re-fingerprinted.")
    if rec.get("rerouted"):
        print(f"REROUTED to {rec['rerouted']['route']} run {rec['rerouted']['run']}: {rec['rerouted']['reason']}")
    p = open_pause(rec)
    if p:
        print(f"PAUSED: {p['next']}")
    last = {}
    for m in rec["phases"]:
        last[m["name"]] = m
    for name in rec["phases_required"]:
        m = last.get(name)
        print(f"  {name:<11} {m['status'] + (': ' + m['note'] if m['note'] else '') if m else '-'}")
    for e in rec["evidence"]:
        state = "current" if current_as(e, tree, content) else "stale"
        print(f"  evidence seq {e['seq']}: {e['kind']} {e['result']} ({e['harness']} harness, {state})")
    for name, j in jobs(rec).items():
        d = j["entries"][-1]
        print(f"  delegate {name}: {d.get('status', 'returned')} as {d.get('role')} on {d.get('model')}, "
              f"attempt {j['attempts']} of {MAX_ATTEMPTS}")
    for f in rec["findings"]:
        print(f"  finding {f['id']}: {f['severity']} {f['status']}")
    found = problems(root, rec)
    print(f"{len(found)} open problem(s). Run check for detail." if found else "complete")
    return 0


def parser():
    p = argparse.ArgumentParser(prog="run-record.py", description=__doc__.split("\n\n")[0])
    p.add_argument("--run", help="run id, default the current run")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("init")
    s.add_argument("--route", required=True)
    s.add_argument("--task", required=True)
    s.add_argument("--phases", help="comma-separated phases, for a route with no built-in list")
    s.add_argument("--host", choices=["claude", "codex", "copilot", "vscode-copilot"])
    s.add_argument("--session-id", help="host session id; supply together with --host")

    s = sub.add_parser("baseline")
    s.add_argument("--harness", nargs="+", required=True)
    s.add_argument("--command", required=True)
    s.add_argument("--output", required=True)
    s.add_argument("--commit", default="HEAD")

    s = sub.add_parser("evidence")
    s.add_argument("--kind", choices=["repro", "verify", "review", "artifact"], required=True)
    s.add_argument("--result", choices=["pass", "fail", "inconclusive"], required=True)
    s.add_argument("--output", required=True)
    s.add_argument("--command", default="")
    s.add_argument("--harness", choices=["current", "original"], default="current")
    s.add_argument("--phase", help="phase whose active attempt produced this evidence")
    s.add_argument("--tool-id", action="append", default=[])

    s = sub.add_parser("phase")
    s.add_argument("name")
    g = s.add_mutually_exclusive_group(required=True)
    g.add_argument("--done", action="store_true")
    g.add_argument("--start", action="store_true")
    g.add_argument("--fail", metavar="REASON")
    g.add_argument("--block", metavar="REASON")
    g.add_argument("--skip", metavar="REASON")
    s.add_argument("--note", default="")
    s.add_argument("--agent", help="host agent id, default main or the current attempt's owner")
    s.add_argument("--from", dest="source", action="append", default=[], help="source phase; repeat for a parallel join")
    s.add_argument("--reason", default="")
    s.add_argument("--evidence", nargs="+", type=int)
    s.add_argument("--tool-id", action="append", default=[])

    s = sub.add_parser("delegate")
    s.add_argument("--job", required=True)
    s.add_argument("--status", default="returned",
                   choices=["launched", "returned", "failed", "timeout", "cancelled", "dropped"])
    s.add_argument("--role")
    s.add_argument("--model")
    s.add_argument("--budget", type=int, metavar="MINUTES")
    s.add_argument("--reason", default="")
    s.add_argument("--result", default="")
    s.add_argument("--phase")
    s.add_argument("--agent-id", help="host id of the delegated agent")
    s.add_argument("--tool-id", action="append", default=[])

    s = sub.add_parser("finding")
    fs = s.add_subparsers(dest="action", required=True)
    f = fs.add_parser("add")
    f.add_argument("--id", required=True)
    f.add_argument("--source", required=True)
    f.add_argument("--severity", choices=["blocker", "act", "consider"], required=True)
    f.add_argument("--summary", required=True)
    f = fs.add_parser("resolve")
    f.add_argument("--id", required=True)
    f.add_argument("--status", choices=["fixed", "dismissed"], required=True)
    f.add_argument("--reason", required=True)

    s = sub.add_parser("ground")
    gs = s.add_subparsers(dest="action", required=True)
    f = gs.add_parser("add")
    f.add_argument("--skill", choices=["how", "why"], required=True)
    f.add_argument("--scope", nargs="+", required=True)
    f.add_argument("--output", required=True)
    f = gs.add_parser("check")
    f.add_argument("--scope", nargs="+", required=True)

    s = sub.add_parser("pause")
    s.add_argument("--next", required=True, help="the first action on resume")
    s.add_argument("--reason", default="")
    sub.add_parser("resume")

    s = sub.add_parser("workspace", help="move a run into the worktree its work happens in, before any evidence")
    s.add_argument("--path", required=True)

    s = sub.add_parser("reroute", help="close a run still in its first phase into a new run of another playbook")
    s.add_argument("--route", required=True)
    s.add_argument("--reason", required=True)

    s = sub.add_parser("check")
    s.add_argument("--through", metavar="PHASE")
    sub.add_parser("status")
    s = sub.add_parser("tasks")
    s.add_argument("--json", action="store_true", help="export canonical checklist text, phase ids, states, and requirements")
    return p


COMMANDS = {"baseline": cmd_baseline, "evidence": cmd_evidence, "phase": cmd_phase,
            "delegate": cmd_delegate, "finding": cmd_finding, "ground": cmd_ground,
            "pause": cmd_pause, "resume": cmd_resume, "reroute": cmd_reroute, "workspace": cmd_workspace,
            "check": cmd_check, "status": cmd_status, "tasks": cmd_tasks}
READ_ONLY = {"check", "status", "tasks"}


def main(argv=None):
    # Standard output is written once the exit code is known, so a reader that stops early
    # (`check | head -1`) cannot turn a verdict into a crash.
    # A command that fails after printing (its record could not be saved) keeps that output back, so
    # nothing claims a change the record does not hold; the reason is on standard error.
    buffer = io.StringIO()
    code = 2
    try:
        with redirect_stdout(buffer):
            code = dispatch(argv)
    except SystemExit as e:
        code = e.code if isinstance(e.code, int) else (0 if e.code is None else 2)
        raise
    finally:
        if code != 2:
            emit(buffer.getvalue())
    return code


def emit(text):
    try:
        sys.stdout.write(text)
        sys.stdout.flush()
    except BrokenPipeError:
        try:
            os.dup2(os.open(os.devnull, os.O_WRONLY), sys.stdout.fileno())
        except (OSError, ValueError):
            pass


def dispatch(argv):
    a = parser().parse_args(argv)
    try:
        root = toplevel()
        if a.cmd == "init":
            entries = worktree_entries(root)
            home = record_home(root, entries)
            if entries and same_file(home, root) and linked_worktree(root):
                # The main checkout's directory is gone, so nothing outlives this worktree.
                print(f"note: the main checkout {entries[0]['path']} is gone. This run's record stays in {root} "
                      "instead, and goes if that worktree is removed.")
            try:
                runs_dir(home)
            except Fail as e:
                if same_file(home, root):
                    raise
                # A sandbox that lets this worktree be written but not the main checkout still gets
                # a run; its record then lives here and goes if the worktree is removed.
                print(f"note: {e}. This run's record stays in {root} instead, and goes if that worktree is removed.")
                home = root
            with record_lock(home):
                cmd_init(a, root, home)
            return 0
        readonly = a.cmd in READ_ONLY or a.cmd == "ground" and a.action == "check"
        # The record may live in another worktree of this repository; lock where it lives.
        p = record_path(root, a.run)
        store = p.parent.parent.parent
        with nullcontext() if readonly else record_lock(store):
            rec = load_record(p)
            if rec.get("rerouted") and not readonly:
                raise Fail(f"run {rec['run']} was rerouted. Record on run {rec['rerouted']['run']}")
            if not readonly and a.cmd != "workspace":
                ws = workspace(rec, store)
                if not same_file(ws, root):
                    raise Fail(f"run {rec['run']} works in {ws}, and this is {root}. A delegate working in its own "
                               "worktree records nothing: return your output paths to the parent. The parent "
                               f"records from {ws}, or, before any evidence, moves the run there with: "
                               f"run-record.py --run {rec['run']} workspace --path <worktree>")
            code = COMMANDS[a.cmd](a, store, rec)
            if not readonly:
                save(p, rec)
            return code or 0
    except Fail as e:
        print(f"run-record: {e}", file=sys.stderr)
        return 2
    except Exception as e:
        # Something no check above anticipated: a damaged record, or a directory it cannot read.
        print(f"run-record: unexpected {type(e).__name__}: {e}. The run record or its directory may be "
              "damaged or unreadable; check them, restore the record, or start a new run", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
