"""Opt-in fixed foreground verifier and cooperative PStack verdict-record gate."""
import argparse
import fcntl
import hashlib
import os
from pathlib import Path
import re
import signal
import subprocess
import tempfile
import time

from osb import Client, Refused, config, encoded, object_file, require


def private_directory(path, create=True):
    require(path.is_absolute() and not path.is_symlink(), "absolute-private-directory-required")
    if create:
        path.mkdir(mode=0o700, parents=True, exist_ok=True)
    else:
        require(path.is_dir(), "orch-store-missing")
    info = path.stat()
    require(path.is_dir() and info.st_uid == os.getuid() and info.st_mode & 0o077 == 0, "private-owned-directory-required")
    return path.resolve(strict=True)


def save(path, value):
    data = encoded(value) + "\n"
    require(len(data.encode()) <= 65536, "run-record-too-large")
    descriptor, temporary = tempfile.mkstemp(prefix=".pending-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w") as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
        directory = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def git(worktree, *args):
    return subprocess.check_output(["git", "-C", str(worktree), *args], text=True, timeout=5).strip()


def revision(worktree, cfg, spec):
    require(git(worktree, "rev-parse", "HEAD") == spec["head_oid"], "worktree-head-moved")
    require(git(worktree, "rev-parse", "--verify", spec["base"]) == spec["base_oid"], "local-base-moved")
    require(git(worktree, "branch", "--show-current") == spec["branch"], "worktree-branch-mismatch")
    require(not git(worktree, "status", "--porcelain", "--untracked-files=all"), "worktree-not-clean")
    match = re.fullmatch(r"(?:https://github\.com/|git@github\.com:)([a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+?)(?:\.git)?", git(worktree, "remote", "get-url", "origin"))
    require(match is not None and match[1].lower() == cfg["repo"], "origin-repository-mismatch")


def argv(value):
    require(isinstance(value, list) and value and all(isinstance(v, str) and v for v in value)
            and Path(value[0]).is_absolute(), "operator-fixed-command-required")
    require(Path(value[0]).is_file() and os.access(value[0], os.X_OK), "operator-command-unavailable")
    return value


def group_exists(process):
    if process is None:
        return False
    try:
        os.killpg(process.pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def stop(process):
    if process is None:
        return True
    for sig in (signal.SIGTERM, signal.SIGKILL):
        if group_exists(process):
            try:
                os.killpg(process.pid, sig)
            except ProcessLookupError:
                pass
            except PermissionError:
                return False
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            continue
        deadline = time.monotonic() + 5
        while group_exists(process) and time.monotonic() < deadline:
            time.sleep(0.05)
        if not group_exists(process):
            return True
    return not group_exists(process)


def run(cfg_path, spec_path):
    cfg, spec = config(cfg_path), object_file(spec_path)
    require(cfg.get("local_verifier_enabled") is True, "local-verifier-not-enabled")
    worker, orch = argv(cfg.get("local_verifier")), argv(cfg.get("orch_route"))
    require(cfg.get("success_verdict") in ("unit-test-verified", "type-check-only", "live-ui-verified"), "operator-success-verdict-required")
    require(type(cfg.get("worker_timeout_seconds")) is int and 1 <= cfg["worker_timeout_seconds"] <= 240, "bounded-worker-timeout-required")
    require(type(cfg.get("generation")) is int and cfg["generation"] > 0, "pre-enrolled-session-generation-required")
    require(type(spec.get("pr")) is int and spec["pr"] > 0, "pr-required")
    for field in ("unit", "attempt", "branch"):
        require(isinstance(spec.get(field), str) and re.fullmatch(r"[a-zA-Z0-9_./-]{1,80}", spec[field]), "explicit-unit-attempt-branch-required")
    require(isinstance(spec.get("base"), str) and spec["base"].startswith("refs/") and re.fullmatch(r"[a-zA-Z0-9_./-]+", spec["base"]), "full-local-base-ref-required")
    expected = {"base_oid": spec.get("base_oid"), "head_oid": spec.get("head_oid")}
    require(all(isinstance(v, str) and re.fullmatch(r"[0-9a-f]{40}", v) for v in expected.values()), "full-revisions-required")
    require(isinstance(spec.get("resources"), list) and bool(spec["resources"]), "explicit-resources-required")
    require(Path(spec["worktree"]).is_absolute(), "absolute-worktree-required")
    worktree = Path(spec["worktree"]).resolve(strict=True)
    root_path, store_path = Path(cfg["run_directory"]), Path(cfg["orch_store"])
    require(root_path.is_absolute() and store_path.is_absolute(), "absolute-run-directory-and-store-required")
    require(not root_path.resolve().is_relative_to(worktree) and not store_path.resolve().is_relative_to(worktree), "state-outside-worktree-required")
    store_root = private_directory(store_path, create=False)
    state_root = private_directory(root_path)
    revision(worktree, cfg, spec)
    run_dir = private_directory(state_root / hashlib.sha256(spec["attempt"].encode()).hexdigest())
    require(not run_dir.is_relative_to(store_root) and not store_root.is_relative_to(run_dir), "run-and-store-must-be-separate")
    state_path = run_dir / "state.json"
    binding = hashlib.sha256(encoded({"cfg": cfg, "spec": spec}).encode()).hexdigest()
    descriptor = os.open(run_dir / ".lock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, "a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise Refused("attempt-already-running") from error
        state = object_file(state_path) if state_path.exists() else {"binding": binding, "phase": "acquiring"}
        require(state.get("binding") == binding, "attempt-binding-changed")
        require(state.get("phase") == "acquiring", "prior-launch-requires-explicit-reconciliation")
        # Native read validates initialization/format without copying the store schema.
        preflight = subprocess.run([*orch, "--store", str(store_root), "ledger", "summary"],
            cwd=worktree, capture_output=True, timeout=15, check=False)
        require(preflight.returncode == 0, "orch-store-preflight-refused")

        def record(phase, **extra):
            state.update(phase=phase, **extra)
            save(state_path, state)

        client = Client(cfg)
        prefix = "local-" + hashlib.sha256(encoded({"home_binding": client.binding, "attempt": spec["attempt"]}).encode()).hexdigest()[:40]
        generation = cfg["generation"]
        intent = {"request_id": prefix + "-submit", "intent_id": prefix, "generation": generation,
                  "base": spec["base"], "base_oid": spec["base_oid"], "branch": spec["branch"],
                  "task_id": spec["unit"], "goal": "PStack local verifier", "resources": spec["resources"]}
        capsule = None
        capsule_path, evidence_path = run_dir / "claim.json", run_dir / "evidence.json"
        child = publisher = None
        outcome, reason, effect, release = "behaviorfailure", "unspecified", "not-started", "pending"
        handlers = {}
        cancelled = False

        def cancel(_signum, _frame):
            nonlocal cancelled
            cancelled = True

        def cancellation_point():
            if cancelled:
                raise KeyboardInterrupt

        try:
            for sig in (signal.SIGINT, signal.SIGTERM):
                handlers[sig] = signal.signal(sig, cancel)
            record("acquiring")
            cancellation_point()
            require(client.request("submit", intent).get("ok") is True, "intent-refused")
            cancellation_point()
            grant = client.request("claim", {"request_id": prefix + "-claim", "intent_id": prefix,
                                             "generation": generation, "version": 1, "ttl_seconds": 900})
            require(grant.get("ok") is True, "claim-refused")
            capsule = {"intent_id": prefix, "generation": generation, "claim_id": grant["claim_id"], "fence": grant["fence"]}
            record("bound", capsule=capsule)
            cancellation_point()
            require(client.request("check", capsule).get("ok") is True, "historical-claim-not-live")
            cancellation_point()
            require(client.request("publish-head", {**capsule, "request_id": prefix + "-head",
                "head_oid": expected["head_oid"], "expected_previous_oid": None}).get("ok") is True, "publish-head-refused")
            save(capsule_path, {"contract": "pstack.osb.client.v1", "claim": capsule,
                "scope_id": cfg["scope_id"], "authority_id": cfg["authority_id"], "home_id": cfg["home_id"], "repo": cfg["repo"], "revision": expected})
            environment = {**os.environ, "PSTACK_OSB_CLAIM_FILE": str(capsule_path), "PSTACK_OSB_UNIT": spec["unit"]}
            revision(worktree, cfg, spec)
            require(client.checkpoint({"payload": capsule, "expected_revision": expected}).get("ok") is True, "launch-checkpoint-refused")
            cancellation_point()
            record("starting")
            with (run_dir / "stdout.txt").open("xb") as stdout, (run_dir / "stderr.txt").open("xb") as stderr:
                child = subprocess.Popen(worker, cwd=worktree, env=environment, stdout=stdout, stderr=stderr, start_new_session=True)
                cancellation_point()
                record("running", worker_pid=child.pid)
                deadline, next_renew, pulse = time.monotonic() + cfg["worker_timeout_seconds"], time.monotonic() + 30, 0
                while child.poll() is None:
                    cancellation_point()
                    require(time.monotonic() < deadline, "verifier-timeout")
                    require(all((run_dir / name).stat().st_size <= 1048576 for name in ("stdout.txt", "stderr.txt")), "verifier-output-too-large")
                    if time.monotonic() >= next_renew:
                        pulse += 1
                        require(client.request("renew", {**capsule, "request_id": prefix + "-renew-" + str(pulse), "ttl_seconds": 900}).get("ok") is True, "heartbeat-refused")
                        cancellation_point()
                        next_renew = time.monotonic() + 30
                    try:
                        child.wait(timeout=0.25)
                    except subprocess.TimeoutExpired:
                        pass
            require(child.returncode == 0, "verifier-command-failed")
            cancellation_point()
            require(not group_exists(child), "verifier-descendants-still-running")
            evidence = {"unit": spec["unit"], "attempt": spec["attempt"], "revision": expected,
                        "command_exit": child.returncode, "claim": capsule, "mode": "shared", "verdict": cfg["success_verdict"]}
            for name in ("stdout.txt", "stderr.txt"):
                path = run_dir / name
                require(path.stat().st_size <= 1048576, "verifier-output-too-large")
                evidence[name + "_sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
            save(evidence_path, evidence)
            revision(worktree, cfg, spec)
            require(client.checkpoint({"payload": capsule, "expected_revision": expected}).get("ok") is True, "publication-checkpoint-refused")
            cancellation_point()
            record("publishing", effect="unknown")
            effect = "unknown"
            with (run_dir / "orch-stdout.txt").open("xb") as stdout, (run_dir / "orch-stderr.txt").open("xb") as stderr:
                publisher = subprocess.Popen([*orch, "--store", str(store_root), "ledger", "record", str(spec["pr"]),
                    expected["head_oid"], cfg["success_verdict"], "--evidence", str(evidence_path)],
                    cwd=worktree, env=environment, stdout=stdout, stderr=stderr, start_new_session=True)
                cancellation_point()
                record("publishing", publisher_pid=publisher.pid)
                require(publisher.wait(timeout=15) == 0, "verdict-record-failed-or-unknown")
                cancellation_point()
            require(not group_exists(publisher), "publisher-descendants-still-running")
            effect, outcome, reason = "confirmed", "pass", "verified-and-recorded"
        except KeyboardInterrupt:
            outcome, reason = "cancelled", "signal"
        except (Refused, OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            reason = str(error) if isinstance(error, Refused) else "worker-or-publication-failed"
            if child is None:
                outcome = "setupfailed"
            if cancelled:
                outcome, reason = "cancelled", "signal-during-acquisition-or-service"
        finally:
            for sig in handlers:
                signal.signal(sig, signal.SIG_IGN)
            try:
                worker_quiet, publisher_quiet = stop(child), stop(publisher)
                if capsule is None:
                    release = "no-known-claim-identical-acquisition-replay-or-reconcile"
                elif worker_quiet and publisher_quiet:
                    try:
                        receipt = client.request("release", {**capsule, "request_id": prefix + "-release"})
                        release = "confirmed" if receipt.get("ok") is True else "refused-or-stale"
                    except (Refused, OSError, ValueError):
                        release = "pending-or-stale"
                else:
                    release = "owned-process-group-not-quiescent"
                if outcome == "pass" and release != "confirmed":
                    outcome, reason = "behaviorfailure", "release-unconfirmed"
                record("terminal" if capsule is not None else "acquiring",
                       outcome=outcome, reason=reason, effect=effect, release=release)
            finally:
                for sig, handler in handlers.items():
                    signal.signal(sig, handler)
        return {"ok": outcome == "pass" and release == "confirmed", "outcome": outcome,
                "reason": reason, "effect": effect, "release": release, "run_directory": str(run_dir)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--spec", required=True, type=Path)
    args = parser.parse_args()
    try:
        result = run(args.config, args.spec)
    except KeyboardInterrupt:
        result = {"ok": False, "outcome": "cancelled", "reason": "inspect-durable-phase-before-replay-or-reconcile"}
    except (Refused, OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        result = {"ok": False, "outcome": "setupfailed", "reason": str(error) if isinstance(error, Refused) else "invalid-or-unavailable-setup"}
    print(encoded(result))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
