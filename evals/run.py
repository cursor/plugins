#!/usr/bin/env python3
"""Run one eval arm: a fresh clone of the task's fixture, optionally with pstack, driven by a host CLI headless.

    python3 evals/run.py --task evals/tasks/webhook-durable-idempotence.json \\
        --host claude --arm pstack --permission bypassPermissions --out runs/claude-pstack-1

Writes into --out: run.json (metadata and the exact command), transcript.jsonl (the host's
machine-readable stream), stderr.log, setup.log, final-tree/ (the working tree at exit),
repo.bundle (every ref), host-session/ (Claude Code's per-session files, when found),
then result.json and summary.md via analyze.py unless --no-analyze.
A host whose CLI is missing is reported as `skipped: <host> CLI not installed` and exits 0.
"""
import argparse
import json
import os
import shlex
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path

EVALS = Path(__file__).resolve().parent
GIT_ID = ["-c", "user.name=pstack-eval", "-c", "user.email=pstack-eval@localhost"]


class Adapter:
    name = binary = invoke = ""
    verified = False
    transcript_format = ""
    permissions = ()

    def permission_flags(self, permission):
        raise NotImplementedError

    def command(self, binary, prompt, workdir, permission, model, out, extra):
        raise NotImplementedError


class Claude(Adapter):
    """Verified against Claude Code 2.1.238 (`claude --help` and one real stream-json call)."""
    name, binary, invoke = "claude", "claude", "/"
    verified = True
    transcript_format = "claude-stream-json"
    permissions = ("acceptEdits", "auto", "bypassPermissions", "dontAsk", "default", "manual", "plan")

    def permission_flags(self, permission):
        return ["--permission-mode", permission]

    def command(self, binary, prompt, workdir, permission, model, out, extra):
        cmd = [binary, "-p", prompt, "--output-format", "stream-json", "--verbose"]
        cmd += self.permission_flags(permission)
        if model:
            cmd += ["--model", model]
        return cmd + extra


class Codex(Adapter):
    """UNVERIFIED: codex is not installed on the machine this was written on.

    Flags follow the Codex non-interactive docs (`codex exec --json -C DIR --sandbox MODE PROMPT`);
    nothing here has been run.
    """
    name, binary, invoke = "codex", "codex", "$"
    verified = False
    transcript_format = "codex-exec-json"
    permissions = ("read-only", "workspace-write", "danger-full-access")

    def permission_flags(self, permission):
        return ["--sandbox", permission]

    def command(self, binary, prompt, workdir, permission, model, out, extra):
        cmd = [binary, "exec", "--json", "-C", str(workdir)] + self.permission_flags(permission)
        if model:
            cmd += ["--model", model]
        return cmd + extra + [prompt]


class Copilot(Adapter):
    """UNVERIFIED: the GitHub Copilot CLI is not installed on the machine this was written on.

    Uses programmatic mode (`copilot -p PROMPT`) with explicit tool approval and a log dir.
    Its stdout format was not confirmed, so analyze.py does not parse it.
    """
    name, binary, invoke = "copilot", "copilot", "/"
    verified = False
    transcript_format = "copilot-unparsed"
    permissions = ("allow-all-tools",)

    def permission_flags(self, permission):
        if permission.startswith("allow-tool:"):
            return ["--allow-tool", permission.split(":", 1)[1]]
        return ["--" + permission]

    def command(self, binary, prompt, workdir, permission, model, out, extra):
        cmd = [binary, "-p", prompt] + self.permission_flags(permission)
        cmd += ["--log-dir", str(Path(out) / "copilot-logs"), "--log-level", "all"]
        if model:
            cmd += ["--model", model]
        return cmd + extra


ADAPTERS = {a.name: a for a in (Claude(), Codex(), Copilot())}


def sh(cmd, cwd=None, log=None, check=True, env=None):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, env=env)
    if log is not None:
        log.write(f"$ {shlex.join(str(c) for c in cmd)}\n{r.stdout}{r.stderr}\n")
    if check and r.returncode:
        raise SystemExit(f"run.py: command failed ({r.returncode}): {shlex.join(str(c) for c in cmd)}\n{r.stderr}")
    return r.stdout.strip()


def strip_pstack(work, log):
    """Remove a pstack install committed in the fixture, so the baseline is a plain agent and the
    pstack arm gets the build under test rather than a stale committed one."""
    receipt = work / ".pstack" / "receipt.json"
    if not receipt.is_file():
        return False
    r = json.loads(receipt.read_text())
    paths = list(r.get("files", {})) + list(r.get("merged", {})) + [".pstack"]
    tracked = [p for p in paths if sh(["git", "ls-files", "--", p], cwd=work)]
    if tracked:
        sh(["git", "rm", "-r", "-q", "--ignore-unmatch", "--"] + tracked, cwd=work, log=log)
    for p in paths:
        q = work / p
        if q.is_dir():
            shutil.rmtree(q, ignore_errors=True)
        elif q.exists():
            q.unlink()
    for d in sorted({(work / p).parent for p in paths}, key=lambda d: -len(d.parts)):
        while d != work and d.is_dir() and not any(d.iterdir()):
            d.rmdir()
            d = d.parent
    sh(["git", *GIT_ID, "commit", "-q", "-m", "eval: strip committed pstack install"], cwd=work, log=log)
    return True


def prepare(task, arm, host, root, pstack_bin, log):
    fx = task["fixture"]
    work = root / "work"
    if "snapshot" in fx:
        snapshot = EVALS / fx["snapshot"]
        shutil.copytree(snapshot, work, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        sh(["git", "init", "-q", "-b", "main"], cwd=work, log=log)
        sh(["git", "add", "."], cwd=work, log=log)
        sh(["git", *GIT_ID, "commit", "-qm", "eval: portable baseline"], cwd=work, log=log)
    else:
        repo = Path(os.path.expanduser(fx["repo"]))
        sh(["git", "clone", "-q", "--no-hardlinks", "--no-checkout", str(repo), str(work)], log=log)
        sh(["git", "checkout", "-q", "-B", "main", fx["commit"]], cwd=work, log=log)
        sh(["git", "remote", "remove", "origin"], cwd=work, log=log)
    sh(["git", "config", "user.name", "pstack-eval"], cwd=work)
    sh(["git", "config", "user.email", "pstack-eval@localhost"], cwd=work)
    stripped = strip_pstack(work, log) if fx.get("strip_committed_pstack", True) else False
    pstack_version = None
    if arm == "pstack":
        if not shutil.which(pstack_bin):
            raise SystemExit(f"run.py: pstack CLI '{pstack_bin}' not found; the pstack arm needs it")
        pstack_version = sh([pstack_bin, "--version"], log=log)
        sh([pstack_bin, "init", "--host", host, "--target", str(work)], log=log)
        sh([pstack_bin, "on", "--target", str(work)], log=log)
        sh(["git", "add", "-A"], cwd=work, log=log)
        sh(["git", *GIT_ID, "commit", "-q", "-m", "eval: install pstack"], cwd=work, log=log)
    base = sh(["git", "rev-parse", "HEAD"], cwd=work)
    return work, base, stripped, pstack_version


def run_host(cmd, work, out, timeout):
    t0 = time.monotonic()
    started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with open(out / "transcript.jsonl", "wb") as so, open(out / "stderr.log", "wb") as se:
        p = subprocess.Popen(cmd, cwd=work, stdout=so, stderr=se, stdin=subprocess.DEVNULL,
                             start_new_session=True)
        timed_out = False
        try:
            rc = p.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            timed_out = True
            os.killpg(p.pid, signal.SIGTERM)
            try:
                rc = p.wait(timeout=15)
            except subprocess.TimeoutExpired:
                os.killpg(p.pid, signal.SIGKILL)
                rc = p.wait()
    return {"started": started, "ended": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "wall_clock_seconds": round(time.monotonic() - t0, 1), "exit_code": rc, "timed_out": timed_out}


def session_id(transcript):
    try:
        with open(transcript) as f:
            for line in f:
                try:
                    d = json.loads(line)
                except ValueError:
                    continue
                if d.get("session_id"):
                    return d["session_id"]
    except OSError:
        pass
    return None


def capture(work, out, host):
    shutil.copytree(work, out / "final-tree", ignore=shutil.ignore_patterns(".git"), symlinks=True,
                    dirs_exist_ok=True)
    sh(["git", "bundle", "create", str(out / "repo.bundle"), "--all"], cwd=work, check=False)
    if host == "claude":
        sid = session_id(out / "transcript.jsonl")
        projects = Path(os.path.expanduser("~/.claude/projects"))
        if sid and projects.is_dir():
            for j in projects.glob(f"*/{sid}.jsonl"):
                dest = out / "host-session"
                dest.mkdir(exist_ok=True)
                shutil.copy2(j, dest / j.name)
                if (j.parent / sid).is_dir():
                    shutil.copytree(j.parent / sid, dest / sid, dirs_exist_ok=True)


def parse(argv):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0],
                                 formatter_class=argparse.RawDescriptionHelpFormatter,
                                 epilog="Permission values: " + "; ".join(
                                     f"{k}: {', '.join(a.permissions)}" + (" (or allow-tool:<spec>)" if k == "copilot" else "")
                                     for k, a in ADAPTERS.items()) + ". Nothing defaults to bypassing permissions.")
    ap.add_argument("--task", required=True, help="task JSON under evals/tasks/")
    ap.add_argument("--host", required=True, choices=sorted(ADAPTERS))
    ap.add_argument("--arm", required=True, choices=["pstack", "baseline"])
    ap.add_argument("--out", required=True, help="output directory (created; must be empty)")
    ap.add_argument("--permission", help="how the unattended host may act; required (see below)")
    ap.add_argument("--timeout", type=float, help="wall-clock seconds (default: the task's time_budget_seconds)")
    ap.add_argument("--model", help="host model override")
    ap.add_argument("--host-arg", action="append", default=[], help="extra argument passed to the host CLI (repeatable)")
    ap.add_argument("--cli-bin", help="path to the host CLI (default: found on PATH)")
    ap.add_argument("--pstack-bin", default="pstack", help="pstack CLI for the pstack arm")
    ap.add_argument("--workdir-root", help="parent for the temp clone (default: system temp)")
    ap.add_argument("--dry-run", action="store_true", help="prepare the clone and print the command; call no model")
    ap.add_argument("--no-analyze", action="store_true", help="skip analyze.py after the run")
    ap.add_argument("--cleanup", action="store_true", help="delete the temp clone after capture")
    return ap, ap.parse_args(argv)


def main(argv=None):
    ap, a = parse(argv)
    adapter = ADAPTERS[a.host]
    task_path = Path(a.task).resolve()
    task = json.loads(task_path.read_text())
    out = Path(a.out).resolve()
    out.mkdir(parents=True, exist_ok=True)
    if any(p.name != "status.json" for p in out.iterdir()):
        ap.error(f"--out {out} is not empty")

    binary = a.cli_bin or shutil.which(adapter.binary)
    if not binary or not (Path(binary).is_file() and os.access(binary, os.X_OK)):
        msg = f"skipped: {a.host} CLI not installed"
        (out / "status.json").write_text(json.dumps({"status": "skipped", "reason": msg, "host": a.host,
                                                     "arm": a.arm, "task": task["id"]}, indent=2) + "\n")
        print(msg)
        return 0

    if not a.permission:
        ap.error(f"--permission is required for {a.host}: one of {', '.join(adapter.permissions)}. "
                 "It decides what the unattended agent may do without asking; pick it deliberately.")
    if a.permission not in adapter.permissions and not (a.host == "copilot" and a.permission.startswith("allow-tool:")):
        ap.error(f"--permission {a.permission!r} is not valid for {a.host}: {', '.join(adapter.permissions)}")

    root = Path(tempfile.mkdtemp(prefix=f"pstack-eval-{task['id']}-{a.arm}-", dir=a.workdir_root))
    with open(out / "setup.log", "w") as log:
        work, base, stripped, pstack_version = prepare(task, a.arm, a.host, root, a.pstack_bin, log)
    prompt = task["prompt"]
    if a.arm == "pstack":
        prompt = f"{adapter.invoke}poteto-mode {prompt}"
    cmd = adapter.command(binary, prompt, work, a.permission, a.model, out, a.host_arg)
    host_version = sh([binary, "--version"], check=False) if binary else None
    meta = {
        "task": task["id"], "task_file": str(task_path), "host": a.host, "arm": a.arm,
        "adapter_verified": adapter.verified, "transcript_format": adapter.transcript_format,
        "host_cli": binary, "host_version": host_version, "pstack_version": pstack_version,
        "permission": a.permission, "model": a.model, "prompt": prompt,
        "command": [str(c) for c in cmd], "workdir": str(work), "base_commit": base,
        "fixture": task["fixture"], "stripped_committed_pstack": stripped,
        "timeout_seconds": a.timeout or task.get("time_budget_seconds"),
    }
    (out / "run.json").write_text(json.dumps(meta, indent=2) + "\n")
    if a.dry_run:
        meta["status"] = "dry-run"
        (out / "run.json").write_text(json.dumps(meta, indent=2) + "\n")
        print(f"dry-run: workdir {work}\n{shlex.join(meta['command'])}")
        return 0

    if not adapter.verified:
        print(f"warning: the {a.host} adapter is unverified; check its flags against `{adapter.binary} --help`",
              file=sys.stderr)
    print(f"running {a.host}/{a.arm} in {work} (timeout {meta['timeout_seconds']}s)", flush=True)
    meta.update(run_host(cmd, work, out, meta["timeout_seconds"]))
    meta["status"] = "timed-out" if meta["timed_out"] else ("completed" if meta["exit_code"] == 0 else "host-error")
    capture(work, out, a.host)
    (out / "run.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"{meta['status']}: {meta['wall_clock_seconds']}s, exit {meta['exit_code']}; transcript {out / 'transcript.jsonl'}")
    if a.cleanup:
        shutil.rmtree(root, ignore_errors=True)
    if not a.no_analyze:
        sys.path.insert(0, str(EVALS))
        import analyze
        analyze.main([str(out)])
    return 0


if __name__ == "__main__":
    sys.exit(main())
