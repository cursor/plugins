#!/usr/bin/env python3
"""Initialize `.sop/gates.json`, optional `.sop/workspace.json`, and SHA-256 lock for any repo."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Sequence

_SDIR = str(Path(__file__).resolve().parent)
if _SDIR not in sys.path:
    sys.path.insert(0, _SDIR)

import sop_common as SC

_VGR_SPEC = importlib.util.spec_from_file_location("vgr_init", SC.SCRIPT_DIR / "verify-gates-registry.py")
assert _VGR_SPEC and _VGR_SPEC.loader
VGR = importlib.util.module_from_spec(_VGR_SPEC)
_VGR_SPEC.loader.exec_module(VGR)


def _detect_pkg_runner(repo_root: Path) -> str:
    if (repo_root / "pnpm-lock.yaml").is_file():
        return "pnpm"
    if (repo_root / "yarn.lock").is_file():
        return "yarn"
    if (repo_root / "bun.lockb").is_file() or (repo_root / "bun.lock").is_file():
        return "bun run"
    return "npm run"


def detect_repo_profile(repo_root: Path) -> Dict[str, object]:
    repo_root = repo_root.resolve()
    repo_name = repo_root.name
    high_risk_globs: List[str] = [".sop/**"]
    ops_globs: List[str] = [".github/workflows/**", "Dockerfile*", "scripts/deploy*"]
    enforcer_files: List[str] = []
    protected_dirs: List[str] = []
    gates: List[Dict[str, object]] = []
    invariants: List[str] = []

    pkg_file = repo_root / "package.json"
    if pkg_file.is_file():
        high_risk_globs.extend(["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "tsconfig*.json"])
        try:
            pkg = json.loads(pkg_file.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            pkg = {}
        scripts = pkg.get("scripts") if isinstance(pkg.get("scripts"), dict) else {}
        runner = _detect_pkg_runner(repo_root)
        for key, gid, desc, fast in [
            ("typecheck", "S-typecheck", "TypeScript type check", True),
            ("check", "S-check", "Project static check", True),
            ("lint", "S-lint", "Linter check", True),
            ("test", "S-test", "Automated test suite", False),
        ]:
            if key in scripts and isinstance(scripts[key], str) and scripts[key].strip():
                cmd = f"{runner} {key}" if key != "test" or runner != "npm run" else "npm test"
                gates.append(
                    {
                        "id": gid,
                        "description": desc,
                        "command": cmd,
                        "fast": fast,
                        "blocking": True,
                    }
                )
        for cand in ("eslint.config.js", "eslint.config.mjs", "tsconfig.json"):
            if (repo_root / cand).is_file():
                enforcer_files.append(cand)

        if (repo_root / "app.json").is_file() or (repo_root / "app.config.js").is_file() or (repo_root / "eas.json").is_file():
            for g in ("app.json", "app.config.js", "eas.json", "plugins/**", "scripts/release-*.sh"):
                if g not in high_risk_globs:
                    high_risk_globs.append(g)
            ops_globs.extend(["scripts/release-*.sh", "scripts/ota-release.sh", "ios/ci_scripts/**"])
            protected_dirs.extend(["ios", "android", "ios/Pods", "ios/build", "android/.gradle", "android/app/build"])
            invariants.append("Preserve ios/, android/, and native incremental build caches during testing.")

    if (repo_root / "pyproject.toml").is_file() or (repo_root / "requirements.txt").is_file():
        for g in ("pyproject.toml", "requirements*.txt"):
            if g not in high_risk_globs:
                high_risk_globs.append(g)
        if not gates:
            has_pytest = False
            if (repo_root / "pyproject.toml").is_file():
                py_txt = (repo_root / "pyproject.toml").read_text(encoding="utf-8", errors="ignore")
                has_pytest = "pytest" in py_txt
            if has_pytest or (repo_root / "tests").is_dir():
                cmd = "pytest -q" if has_pytest else "python3 -m unittest discover -q"
                gates.append(
                    {
                        "id": "PY-test",
                        "description": "Python test suite",
                        "command": cmd,
                        "fast": True,
                        "blocking": True,
                    }
                )

    if (repo_root / "go.mod").is_file():
        high_risk_globs.extend(["go.mod", "go.sum"])
        gates.extend(
            [
                {"id": "GO-vet", "description": "Go vet static check", "command": "go vet ./...", "fast": True, "blocking": True},
                {"id": "GO-test", "description": "Go test suite", "command": "go test ./...", "fast": False, "blocking": True},
            ]
        )

    if (repo_root / "Cargo.toml").is_file():
        high_risk_globs.extend(["Cargo.toml", "Cargo.lock"])
        gates.extend(
            [
                {"id": "RS-check", "description": "Cargo check", "command": "cargo check", "fast": True, "blocking": True},
                {"id": "RS-test", "description": "Cargo test suite", "command": "cargo test", "fast": False, "blocking": True},
            ]
        )

    if not gates and (repo_root / "Makefile").is_file():
        mk = (repo_root / "Makefile").read_text(encoding="utf-8", errors="ignore")
        if re_match_target(mk, "test"):
            gates.append({"id": "MK-test", "description": "Makefile test target", "command": "make test", "fast": True, "blocking": True})

    if not gates:
        gates.append(
            {
                "id": "G-placeholder",
                "description": "Replace with project typecheck/test command",
                "command": "git status --short >/dev/null",
                "fast": True,
                "blocking": True,
            }
        )

    payload: Dict[str, object] = {
        "version": 1,
        "repo": repo_name,
        "high_risk_globs": list(dict.fromkeys(high_risk_globs)),
        "ops_globs": list(dict.fromkeys(ops_globs)),
        "enforcer_files": list(dict.fromkeys(enforcer_files)),
        "gates": gates,
    }
    if protected_dirs:
        payload["protected_dirs"] = protected_dirs
    if invariants:
        payload["project_invariants"] = invariants
    return payload


def re_match_target(makefile_text: str, target: str) -> bool:
    for ln in makefile_text.splitlines():
        if ln.startswith(f"{target}:"):
            return True
    return False


def _ensure_gitignore_entries(root_dir: Path, entries: Sequence[str]) -> bool:
    gi = root_dir / ".gitignore"
    existing = gi.read_text(encoding="utf-8", errors="ignore").splitlines() if gi.is_file() else []
    missing = [e for e in entries if e not in existing]
    if not missing:
        return False
    content = "\n".join([*existing, *missing]).rstrip() + "\n"
    gi.write_text(content, encoding="utf-8")
    return True


def _parse_custom_gates(raw_items: Sequence[str]) -> List[Dict[str, object]]:
    out: List[Dict[str, object]] = []
    for raw in raw_items:
        parts = raw.split(":", 2)
        if len(parts) != 3:
            raise ValueError(f"Expected --gate <id>:<fast|full>:<command>, got {raw!r}")
        gid, mode, cmd = (p.strip() for p in parts)
        out.append(
            {
                "id": gid,
                "description": f"Custom gate {gid}",
                "command": cmd,
                "fast": mode.lower() == "fast",
                "blocking": True,
            }
        )
    return out


def init_sop(
    *,
    repos: Dict[str, Path],
    sop_root: Path,
    custom_gates: Optional[List[Dict[str, object]]] = None,
    invariants: Optional[List[str]] = None,
    force: bool = False,
    dry_run: bool = False,
    update_gitignore: bool = True,
) -> Dict[str, object]:
    sop_root = sop_root.expanduser().resolve()
    multi_repo = len(repos) > 1 or sop_root not in {p.resolve() for p in repos.values()}
    ws = SC.load_workspace(sop_root, repo_map_overrides=repos if len(repos) > 1 else None)
    lock_file = (
        (sop_root / "metrics" / "gates-lock.json").resolve()
        if multi_repo
        else (sop_root / ".sop" / "gates-lock.json").resolve()
    )
    if (sop_root / ".sop" / "workspace.json").is_file():
        lock_file = Path(ws["lock_file"])  # type: ignore[arg-type]

    planned_gates: Dict[str, Dict[str, object]] = {}
    for name, root in sorted(repos.items()):
        profile = detect_repo_profile(root)
        profile["repo"] = name
        if custom_gates:
            profile["gates"] = custom_gates
        if invariants:
            existing_inv = list(profile.get("project_invariants") or [])  # type: ignore[arg-type]
            profile["project_invariants"] = list(dict.fromkeys([*existing_inv, *invariants]))
        planned_gates[name] = profile

    workspace_payload: Optional[Dict[str, object]] = None
    if multi_repo:
        rel_repos: Dict[str, str] = {}
        for name, root in sorted(repos.items()):
            try:
                rel_repos[name] = str(root.resolve().relative_to(sop_root))
            except ValueError:
                rel_repos[name] = str(root.resolve())
        workspace_payload = {
            "schema_version": 1,
            "mode": "multi-repo",
            "repos": rel_repos,
            "tasks_dir": "tasks",
            "metrics_dir": "metrics",
            "lock_file": "metrics/gates-lock.json",
            "project_invariants": invariants or [],
        }

    if dry_run:
        return {
            "status": "DRY_RUN",
            "sop_root": str(sop_root),
            "lock_file": str(lock_file),
            "workspace": workspace_payload,
            "gates": planned_gates,
        }

    written_files: List[str] = []
    for name, root in sorted(repos.items()):
        gfile = root / ".sop" / "gates.json"
        if gfile.is_file() and not force:
            continue
        gfile.parent.mkdir(parents=True, exist_ok=True)
        if gfile.is_file():
            os.chmod(gfile, 0o644)
        gfile.write_text(json.dumps(planned_gates[name], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        written_files.append(str(gfile))

    if workspace_payload is not None:
        ws_path = sop_root / ".sop" / "workspace.json"
        if force or not ws_path.is_file():
            ws_path.parent.mkdir(parents=True, exist_ok=True)
            ws_path.write_text(json.dumps(workspace_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            written_files.append(str(ws_path))

    if update_gitignore and SC.is_git_work_tree(sop_root):
        entries = ["tasks/", "metrics/"] if multi_repo else [".sop/tasks/", ".sop/metrics/"]
        if _ensure_gitignore_entries(sop_root, entries):
            written_files.append(str(sop_root / ".gitignore"))

    lock_payload = VGR.update_lock(repos, lock_file)
    errs = VGR.verify_lock(repos, lock_file)
    if errs:
        raise RuntimeError("Lock verification failed after sop-init: " + "; ".join(errs))

    return {
        "status": "INITIALIZED",
        "sop_root": str(sop_root),
        "lock_file": str(lock_file),
        "written_files": written_files,
        "locked_repos": sorted(lock_payload["repos"].keys()),  # type: ignore[union-attr]
    }


def run_self_test() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="sop-init-self-test-"))
    try:
        node_repo = tmp / "web-app"
        node_repo.mkdir()
        (node_repo / "package.json").write_text(
            json.dumps({"name": "web-app", "scripts": {"typecheck": "tsc --noEmit", "test": "vitest run"}}),
            encoding="utf-8",
        )
        (node_repo / "tsconfig.json").write_text("{}\n", encoding="utf-8")
        res1 = init_sop(repos={"web-app": node_repo}, sop_root=node_repo, update_gitignore=False)
        assert res1["status"] == "INITIALIZED"
        assert (node_repo / ".sop" / "gates-lock.json").is_file()
        assert VGR.verify_lock({"web-app": node_repo}, node_repo / ".sop" / "gates-lock.json") == []

        py_repo = tmp / "py-svc"
        (py_repo / "tests").mkdir(parents=True)
        (py_repo / "pyproject.toml").write_text("[tool.pytest.ini_options]\n", encoding="utf-8")
        res2 = init_sop(repos={"py-svc": py_repo}, sop_root=py_repo, update_gitignore=False)
        py_gates = json.loads((py_repo / ".sop" / "gates.json").read_text(encoding="utf-8"))
        assert py_gates["gates"][0]["command"] == "pytest -q", py_gates
        assert VGR.verify_lock({"py-svc": py_repo}, py_repo / ".sop" / "gates-lock.json") == []

        ws_root = tmp / "workspace"
        ws_root.mkdir()
        res_ws = init_sop(
            repos={"web-app": node_repo, "py-svc": py_repo},
            sop_root=ws_root,
            invariants=["Always validate API schema at service boundary"],
            force=True,
            update_gitignore=False,
        )
        assert (ws_root / ".sop" / "workspace.json").is_file()
        assert (ws_root / "metrics" / "gates-lock.json").is_file()
        loaded_ws = SC.load_workspace(ws_root)
        assert set(loaded_ws["repos"].keys()) == {"web-app", "py-svc"}  # type: ignore[union-attr]
        assert VGR.verify_lock(loaded_ws["repos"], Path(loaded_ws["lock_file"])) == []  # type: ignore[arg-type]
        assert "Always validate API schema at service boundary" in SC.collect_project_invariants(loaded_ws["repos"], loaded_ws)  # type: ignore[arg-type]
        assert res2["locked_repos"] == ["py-svc"] and "web-app" in res_ws["locked_repos"]
    finally:
        for p in tmp.rglob("*"):
            try:
                if p.is_file():
                    os.chmod(p, 0o644)
            except OSError:
                pass
        shutil.rmtree(tmp, ignore_errors=True)

    print("ALL sop-init.py SELF-TESTS PASSED")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Initialize .sop/gates.json and lockfile for any project.")
    parser.add_argument("--sop-root", help="SOP root directory (defaults to git root or cwd)")
    parser.add_argument("--repo", action="append", default=[], help="Target repo (<path> or <name>=<path>)")
    parser.add_argument("--gate", action="append", default=[], help="Override gate (<id>:<fast|full>:<command>)")
    parser.add_argument("--invariant", action="append", default=[], help="Project invariant rule to include in briefs/audits")
    parser.add_argument("--force", action="store_true", help="Overwrite existing .sop/gates.json / workspace.json")
    parser.add_argument("--dry-run", action="store_true", help="Print planned configs without writing files")
    parser.add_argument("--no-gitignore", action="store_true", help="Do not update .gitignore")
    parser.add_argument("--self-test", action="store_true", help="Run internal self-tests and exit")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()

    sop_root = SC.find_sop_root(explicit_root=Path(args.sop_root) if args.sop_root else None)
    repos: Dict[str, Path] = {}
    if args.repo:
        for item in args.repo:
            if "=" in item:
                k, v = item.split("=", 1)
                repos[k.strip()] = Path(v).expanduser().resolve()
            else:
                p = Path(item).expanduser().resolve()
                repos[p.name] = p
    else:
        top = SC.git_top_level(sop_root) or sop_root
        repos[top.name] = top

    try:
        custom = _parse_custom_gates(args.gate) if args.gate else None
        out = init_sop(
            repos=repos,
            sop_root=sop_root,
            custom_gates=custom,
            invariants=args.invariant or None,
            force=args.force,
            dry_run=args.dry_run,
            update_gitignore=not args.no_gitignore,
        )
    except (ValueError, FileNotFoundError, RuntimeError) as err:
        print(f"ERROR: {err}", file=sys.stderr)
        return 2

    print(json.dumps(out, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
