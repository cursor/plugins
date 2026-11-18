#!/usr/bin/env python3
"""Protected per-repo `.sop/gates.json` registry lock verifier and runner."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

_SDIR = str(Path(__file__).resolve().parent)
if _SDIR not in sys.path:
    sys.path.insert(0, _SDIR)

import sop_common as SC


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def validate_gates_schema(repo_name: str, data: object) -> List[str]:
    errors: List[str] = []
    if not isinstance(data, dict):
        return [f"{repo_name}: .sop/gates.json must be a JSON object"]

    if data.get("version") != 1:
        errors.append(f"{repo_name}: version must be 1, got {data.get('version')!r}")
    if data.get("repo") != repo_name:
        errors.append(f"{repo_name}: repo must equal {repo_name!r}, got {data.get('repo')!r}")

    for list_key, non_empty, optional in [
        ("high_risk_globs", True, False),
        ("ops_globs", False, False),
        ("enforcer_files", False, True),
        ("protected_dirs", False, True),
        ("project_invariants", False, True),
    ]:
        val = data.get(list_key)
        if optional and val is None:
            continue
        if not isinstance(val, list) or not all(isinstance(x, str) and x.strip() for x in val):
            errors.append(f"{repo_name}: {list_key} must be a list of non-empty strings")
        elif non_empty and len(val) == 0:
            errors.append(f"{repo_name}: {list_key} must be non-empty")

    gates = data.get("gates")
    if not isinstance(gates, list) or len(gates) == 0:
        errors.append(f"{repo_name}: gates must be a non-empty list")
        return errors

    seen_ids = set()
    for idx, g in enumerate(gates):
        if not isinstance(g, dict):
            errors.append(f"{repo_name}: gates[{idx}] must be an object")
            continue
        gid = g.get("id")
        if not isinstance(gid, str) or not gid.strip():
            errors.append(f"{repo_name}: gates[{idx}].id must be a non-empty string")
        elif gid in seen_ids:
            errors.append(f"{repo_name}: duplicate gate id {gid!r}")
        else:
            seen_ids.add(gid)
        if not isinstance(g.get("description"), str) or not g["description"].strip():
            errors.append(f"{repo_name}: gates[{idx}].description must be a non-empty string")
        if not isinstance(g.get("command"), str) or not g["command"].strip():
            errors.append(f"{repo_name}: gates[{idx}].command must be a non-empty string")
        if not isinstance(g.get("fast"), bool):
            errors.append(f"{repo_name}: gates[{idx}].fast must be boolean")
        if not isinstance(g.get("blocking"), bool):
            errors.append(f"{repo_name}: gates[{idx}].blocking must be boolean")

    return errors


def load_repo_gates(repo_name: str, repo_root: Path) -> Tuple[Path, Dict[str, object]]:
    gates_path = repo_root / ".sop" / "gates.json"
    if not gates_path.is_file():
        raise FileNotFoundError(f"{repo_name}: missing {gates_path}")
    data = json.loads(gates_path.read_text(encoding="utf-8"))
    errs = validate_gates_schema(repo_name, data)
    if errs:
        raise ValueError("; ".join(errs))
    return gates_path, data


def update_lock(repos: Dict[str, Path], lock_file: Path) -> Dict[str, object]:
    entries: Dict[str, Dict[str, object]] = {}
    for name, root in sorted(repos.items()):
        gates_path, schema = load_repo_gates(name, root)
        os.chmod(gates_path, 0o444)
        enforcer_hashes: Dict[str, str] = {}
        for rel in schema.get("enforcer_files") or []:
            fpath = root / rel
            if not fpath.is_file():
                raise FileNotFoundError(f"{name}: declared enforcer_file not found: {fpath}")
            enforcer_hashes[rel] = sha256_file(fpath)
        entries[name] = {
            "path": str(gates_path.resolve()),
            "sha256": sha256_file(gates_path),
            "mode": oct(stat.S_IMODE(gates_path.stat().st_mode)),
            "enforcer_files": enforcer_hashes,
        }

    payload = {
        "schema_version": 1,
        "repos": entries,
    }
    lock_file.parent.mkdir(parents=True, exist_ok=True)
    lock_file.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return payload


def verify_lock(repos: Dict[str, Path], lock_file: Path) -> List[str]:
    errors: List[str] = []
    if not lock_file.is_file():
        return [f"Missing gates lock file: {lock_file}"]

    lock_data = json.loads(lock_file.read_text(encoding="utf-8"))
    locked_repos = lock_data.get("repos")
    if not isinstance(locked_repos, dict):
        return [f"Invalid lock file structure in {lock_file}"]

    for name, root in sorted(repos.items()):
        try:
            gates_path, schema = load_repo_gates(name, root)
        except (FileNotFoundError, ValueError, json.JSONDecodeError) as err:
            errors.append(str(err))
            continue

        mode = stat.S_IMODE(gates_path.stat().st_mode)
        if mode & 0o222:
            errors.append(f"{name}: {gates_path} has write bits set ({oct(mode)}); expected chmod 0444")

        locked = locked_repos.get(name)
        if not isinstance(locked, dict) or "sha256" not in locked:
            errors.append(f"{name}: missing entry in {lock_file}")
            continue

        actual_sha = sha256_file(gates_path)
        if actual_sha != locked["sha256"]:
            errors.append(f"{name}: SHA-256 mismatch for {gates_path} (got {actual_sha}, locked {locked['sha256']})")

        locked_enforcers = locked.get("enforcer_files") or {}
        declared_enforcers = schema.get("enforcer_files") or []
        if set(locked_enforcers.keys()) != set(declared_enforcers):
            errors.append(f"{name}: enforcer_files list differs from lock")
        for rel in declared_enforcers:
            fpath = root / rel
            if not fpath.is_file():
                errors.append(f"{name}: missing locked enforcer file {fpath}")
                continue
            fsha = sha256_file(fpath)
            if fsha != locked_enforcers.get(rel):
                errors.append(f"{name}: enforcer file modified ({rel}: got {fsha}, locked {locked_enforcers.get(rel)})")

    for locked_name in sorted(locked_repos.keys()):
        if locked_name not in repos:
            errors.append(
                f"{locked_name}: locked repository missing from verification set (.sop/gates.json deleted or omitted)"
            )

    return errors


def snapshot_protected_dirs(
    repo_root: Path,
    protected_dirs: Sequence[str],
) -> Dict[str, Optional[Tuple[int, int]]]:
    snap: Dict[str, Optional[Tuple[int, int]]] = {}
    for dname in protected_dirs:
        p = repo_root / dname
        if p.exists():
            st = p.lstat()
            snap[dname] = (st.st_dev, st.st_ino)
        else:
            snap[dname] = None
    return snap


def check_protected_dirs_unchanged(
    before: Dict[str, Optional[Tuple[int, int]]],
    after: Dict[str, Optional[Tuple[int, int]]],
) -> List[str]:
    problems: List[str] = []
    for dname, b_stat in before.items():
        a_stat = after.get(dname)
        if b_stat is not None and a_stat is None:
            problems.append(f"M-cache-inode-guard: {dname}/ was deleted during gate execution")
        elif b_stat is not None and a_stat != b_stat:
            problems.append(f"M-cache-inode-guard: {dname}/ inode changed during gate execution ({b_stat} -> {a_stat})")
    return problems


def _protected_dirs_for_schema(repo_name: str, repo_root: Path, schema: Dict[str, object]) -> List[str]:
    explicit = schema.get("protected_dirs")
    if isinstance(explicit, list):
        return [str(x) for x in explicit if str(x).strip()]
    if (repo_root / "ios").is_dir() or (repo_root / "android").is_dir() or repo_name == "aiyou-mobile":
        return ["ios", "android", "ios/Pods", "ios/build", "android/.gradle", "android/app/build"]
    return []


def run_gates(
    repos: Dict[str, Path],
    target: str,
    lock_file: Path,
    fast_only: bool,
) -> Tuple[int, Dict[str, object]]:
    lock_errors = verify_lock(repos, lock_file)
    if lock_errors:
        return 1, {"status": "LOCK_FAILED", "errors": lock_errors}

    selected = sorted(repos.keys()) if target == "all" else [target]
    receipts: Dict[str, object] = {}
    overall_ok = True

    for name in selected:
        if name not in repos:
            return 2, {"status": "ERROR", "errors": [f"Unknown repo: {name}"]}
        root = repos[name]
        _, schema = load_repo_gates(name, root)
        pdirs = _protected_dirs_for_schema(name, root, schema)
        native_before = snapshot_protected_dirs(root, pdirs) if pdirs else None

        gate_results = []
        for gate in schema["gates"]:
            if fast_only and not gate["fast"]:
                continue
            proc = subprocess.run(
                ["bash", "-lc", gate["command"]],
                cwd=str(root),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            ok = proc.returncode == 0
            if not ok and gate["blocking"]:
                overall_ok = False
            tail = "\n".join(proc.stdout.splitlines()[-25:])
            gate_results.append(
                {
                    "id": gate["id"],
                    "blocking": gate["blocking"],
                    "fast": gate["fast"],
                    "returncode": proc.returncode,
                    "ok": ok,
                    "output_tail": tail,
                }
            )
            if not ok and gate["blocking"]:
                break

        guard_errors: List[str] = []
        if native_before is not None:
            native_after = snapshot_protected_dirs(root, pdirs)
            guard_errors = check_protected_dirs_unchanged(native_before, native_after)
            if guard_errors:
                overall_ok = False

        receipts[name] = {
            "gates": gate_results,
            "native_guard_errors": guard_errors,
        }

    return (0 if overall_ok else 1), {
        "status": "PASS" if overall_ok else "FAIL",
        "fast_only": fast_only,
        "repos": receipts,
    }


def _parse_repo_args(raw_items: Sequence[str], sop_root: Path) -> Dict[str, Path]:
    if not raw_items:
        ws = SC.load_workspace(sop_root)
        repos: Dict[str, Path] = dict(ws["repos"])  # type: ignore[arg-type]
        return {k: v for k, v in repos.items() if (v / ".sop" / "gates.json").is_file()}
    out: Dict[str, Path] = {}
    for item in raw_items:
        if "=" in item:
            name, path_str = item.split("=", 1)
            out[name.strip()] = Path(path_str).expanduser().resolve()
        else:
            p = Path(item).expanduser().resolve()
            out[p.name] = p
    return out


def run_self_test() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="gates-registry-self-test-"))
    try:
        sample_repo = tmp / "sample-app"
        (sample_repo / ".sop").mkdir(parents=True)
        (sample_repo / "ios" / "Pods").mkdir(parents=True)
        (sample_repo / "android" / ".gradle").mkdir(parents=True)
        (sample_repo / "test").mkdir(parents=True)
        enforcer = sample_repo / "test" / "gate.test.ts"
        enforcer.write_text("expect(1).toBe(1);\n", encoding="utf-8")
        gates_path = sample_repo / ".sop" / "gates.json"
        pdirs = ["ios", "android", "ios/Pods", "android/.gradle"]
        gates_path.write_text(
            json.dumps(
                {
                    "version": 1,
                    "repo": "sample-app",
                    "high_risk_globs": ["app.json"],
                    "ops_globs": ["scripts/release-*.sh"],
                    "enforcer_files": ["test/gate.test.ts"],
                    "protected_dirs": pdirs,
                    "project_invariants": ["Never mutate ios/ caches during test"],
                    "gates": [
                        {
                            "id": "G-ok",
                            "description": "passing check",
                            "command": "true",
                            "fast": True,
                            "blocking": True,
                        }
                    ],
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        lock_file = tmp / ".sop" / "gates-lock.json"
        repos = {"sample-app": sample_repo}

        update_lock(repos, lock_file)
        assert verify_lock(repos, lock_file) == []

        enforcer.write_text("expect(1).toBe(2);\n", encoding="utf-8")
        errs_enf = verify_lock(repos, lock_file)
        assert any("enforcer file modified" in e for e in errs_enf), f"expected enforcer error, got {errs_enf}"
        enforcer.write_text("expect(1).toBe(1);\n", encoding="utf-8")

        os.chmod(gates_path, 0o644)
        errs_mode = verify_lock(repos, lock_file)
        assert any("write bits set" in e for e in errs_mode), f"expected write bits error, got {errs_mode}"

        gates_path.write_text(gates_path.read_text(encoding="utf-8") + "\n", encoding="utf-8")
        os.chmod(gates_path, 0o444)
        errs_sha = verify_lock(repos, lock_file)
        assert any("SHA-256 mismatch" in e for e in errs_sha), f"expected SHA mismatch error, got {errs_sha}"

        errs_omitted = verify_lock({}, lock_file)
        assert any("locked repository missing from verification set" in e for e in errs_omitted)

        before = snapshot_protected_dirs(sample_repo, pdirs)
        shutil.rmtree(sample_repo / "ios" / "Pods")
        pods_errs = check_protected_dirs_unchanged(before, snapshot_protected_dirs(sample_repo, pdirs))
        assert any("ios/Pods/ was deleted" in e for e in pods_errs)
        shutil.rmtree(sample_repo / "android")
        del_errs = check_protected_dirs_unchanged(before, snapshot_protected_dirs(sample_repo, pdirs))
        assert any("android/ was deleted" in e for e in del_errs)
    finally:
        for p in tmp.rglob("*"):
            try:
                if p.is_file():
                    os.chmod(p, 0o644)
            except OSError:
                pass
        shutil.rmtree(tmp, ignore_errors=True)

    print("ALL verify-gates-registry.py SELF-TESTS PASSED")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify & run locked .sop/gates.json registries.")
    parser.add_argument("--sop-root", help="SOP root directory (auto-discovered when omitted)")
    parser.add_argument("--repo", action="append", default=[], help="Target repo (<path> or <name>=<path>)")
    parser.add_argument("--update-lock", action="store_true", help="Chmod 0444 .sop/gates.json and update lock file")
    parser.add_argument("--verify", action="store_true", help="Verify schemas, read-only permissions, and SHA-256 lock")
    parser.add_argument("--run", help="Run gates for named repo or 'all'")
    parser.add_argument("--fast", action="store_true", help="Run only gates with fast=true")
    parser.add_argument("--lock-file", help="Lock file path (auto-discovered when omitted)")
    parser.add_argument("--self-test", action="store_true", help="Run internal self-tests and exit")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()

    sop_root = SC.find_sop_root(explicit_root=Path(args.sop_root) if args.sop_root else None)
    ws = SC.load_workspace(sop_root)
    repos = _parse_repo_args(args.repo, sop_root)
    lock_file = Path(args.lock_file).expanduser().resolve() if args.lock_file else Path(ws["lock_file"])  # type: ignore[arg-type]

    if args.update_lock:
        payload = update_lock(repos, lock_file)
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return 0

    if args.verify:
        errs = verify_lock(repos, lock_file)
        if errs:
            for e in errs:
                print(f"FAIL: {e}", file=sys.stderr)
            return 1
        print(f"PASS: all {len(repos)} .sop/gates.json registries verified against {lock_file}")
        return 0

    if args.run:
        code, summary = run_gates(repos, args.run, lock_file, args.fast)
        print(json.dumps(summary, indent=2, ensure_ascii=False))
        return code

    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
