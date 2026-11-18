#!/usr/bin/env python3
"""herdr-agent — run and watch SOP agents in herdr-core (`hc`) terminals.

herdr-core keeps every agent in a persistent terminal and knows its status from
the agent's own OSC 7501 reports (idle, working, done, blocked, error). This
script is the only place the skill talks to `hc`; `herdr-app` (the window) is
optional and used by `show` alone.

Identity. Every subcommand names an agent by `--task-dir <abs>` and `--slot`.
The terminal carries the labels sop.dir / sop.task / sop.slot and is always
addressed by the address hc returned, never by name: hc names are unique only
among live terminals and across the whole core, so two tasks' `writer-r1`
would collide and a finished one would shadow nothing.

Subcommands:
  run       Start the agent and wait until it settles — the wait command of
            `await.sh arm` (refused outside an arm unless --unmonitored)
  start     Start the agent and return at once (always needs --unmonitored:
            nothing records its completion)
  resume    Send the next round of the same issue to the slot's live session
            and wait until that turn settles — the wait command of an arm,
            like `run` (refused outside an arm unless --unmonitored)
  wait      Wait for a running agent to settle (a continued wait for a new arm)
  status    One agent's live state as JSON; exit 0 iff the terminal is live
  dashboard Every terminal of the task: state, status, turn, monitoring
            (UNMONITORED = working, or reporting no status, with no arm)
  read      Screen plus history (falls back to the log snapshot)
  capture   The visible screen only
  send      Paste text and press Enter, or press named keys with --keys (needs
            a live arm watching the slot, or --unmonitored)
  show      Show the agent in the herdr-app window (peek, or a pane with --place)
  close     Save a log snapshot, end the program, remove the terminal (refuses
            a quota-limited agent unless --force; with --idle, closes only
            terminals whose agent is idle or finished)

When `run` / `wait` settle (the baseline is the turn count at launch, or at the
start of `wait`; hc raises `turn` each time the status leaves `working`):
  rc=<exit code>  the program exited (128+signal when a signal killed it)
  rc=0            turn-end: the turn advanced and the status is done/idle
  rc=9            blocked: the agent needs a person (read the screen, then
                  arm a continued wait and `send --force` the answer)
  rc=10           error: the agent reported an error
  rc=12           lost: the program was replaced (hc keep-recovery shell)
  rc=124          timeout (--timeout-s, or the arm's deadline)
  rc=1            control-plane failure, or the terminal no longer exists
A boot-time `idle` does not settle: the turn has not advanced. A CLI that never
reports a status settles only when it exits.

The last stdout line is `SETTLE outcome=<…> rc=<n> address=<…> status=<…>
turn=<n> log=<path>`; inside an arm it lands in <task-dir>/waits/<slot>.out.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import signal
import subprocess
import sys
import time

RC_BLOCKED = 9
RC_ERROR = 10
RC_LOST = 12
RC_TIMEOUT = 124
SNAPSHOT_LINES = 2000

# await.sh's runner exports these to its wait command; their presence is how
# run/start know a sentinel will record the agent's completion. hc starts
# programs with the login session's environment, not the caller's, so the agent
# never inherits them and cannot pass the check for its own children.
ARM_ENV = ("SOP_AWAIT_SLOT", "SOP_AWAIT_DIR")
# Roles whose next round goes to the live session (SKILL.md §4).
REUSED_ROLES = ("writer", "reviewer")

ANSI = re.compile(r"\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)")


class HcError(RuntimeError):
    def __init__(self, kind: str, message: str, hint: str = "", code: int = 1):
        super().__init__(f"hc {kind}: {message}" + (f" ({hint})" if hint else ""))
        self.kind, self.code = kind, code


# ---------------------------------------------------------------- hc

def hc_bin() -> str:
    path = shutil.which("hc")
    if not path:
        raise RuntimeError("hc (herdr-core) is not on PATH; install herdr-core or use a native dispatch")
    return path


def hc_raw(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run([hc_bin(), *args], capture_output=True, text=True, stdin=subprocess.DEVNULL)


def hc_json(command: str, *args: str) -> dict:
    """Run one hc command with --json; raise HcError on hc's own error object.
    --json goes right after the subcommand: after a `--` it would become one
    of the agent's own arguments (live pilot 2026-11-11: claude exited 1 on it)."""
    res = hc_raw(command, "--json", *args)
    if res.returncode != 0:
        try:
            err = json.loads(res.stderr.strip().splitlines()[-1])["error"]
            raise HcError(err.get("kind", "error"), err.get("message", ""), err.get("hint", ""), res.returncode)
        except (ValueError, KeyError, IndexError):
            raise HcError("failed", (res.stderr or res.stdout).strip()[:300], code=res.returncode) from None
    try:
        return json.loads(res.stdout) if res.stdout.strip() else {}
    except ValueError:
        raise HcError("bad_output", res.stdout.strip()[:200]) from None


def get(address: str) -> dict | None:
    """One terminal's facts, or None when it no longer exists."""
    try:
        return hc_json("get", address)
    except HcError as err:
        if err.kind == "not_found":
            return None
        raise


# ---------------------------------------------------------------- identity

def task_dir_of(args) -> Path:
    return Path(args.task_dir).resolve()


def labels_for(task_dir: Path, slot: str | None = None) -> list[str]:
    out = [f"sop.dir={task_dir}"]
    if slot:
        out.append(f"sop.slot={slot}")
    return out


def label_args(labels: list[str]) -> list[str]:
    return [tok for kv in labels for tok in ("--label", kv)]


def terminals_of(task_dir: Path, slot: str | None = None) -> list[dict]:
    """Full facts of every terminal (finished too) carrying the task's labels."""
    listed = hc_json("ls", "--all", *label_args(labels_for(task_dir, slot))).get("terminals", [])
    return [info for info in (get(t["address"]) for t in listed) if info]


def resolve(task_dir: Path, slot: str) -> dict | None:
    """The slot's terminal: the live one, else the most recently created."""
    found = terminals_of(task_dir, slot)
    live = [t for t in found if t.get("state") == "live"]
    pool = live or found
    return max(pool, key=lambda t: t.get("created_ms") or 0) if pool else None


def require(task_dir: Path, slot: str) -> dict:
    info = resolve(task_dir, slot)
    if not info:
        raise RuntimeError(f"no hc terminal for slot '{slot}' of {task_dir} (see `dashboard --task-dir {task_dir}`)")
    return info


def display_name(slot: str) -> str:
    """hc names: 1-32 of a-z 0-9 - _ ., starting alphanumeric, not shaped like an id (t7)."""
    name = re.sub(r"[^a-z0-9._-]", "-", slot.lower()).lstrip("-._")[:32] or "agent"
    return f"sop-{name}"[:32] if re.fullmatch(r"t[0-9a-z]{1,3}", name) else name


def fallback_name(slot: str, task_dir: Path) -> str:
    digest = hashlib.sha1(str(task_dir).encode()).hexdigest()[:5]
    return f"{display_name(slot)[:26]}-{digest}"


def default_log(task_dir: Path, slot: str) -> Path:
    return task_dir / "logs" / f"{slot}.log"


def log_path(args) -> Path:
    return Path(args.log).resolve() if getattr(args, "log", None) else default_log(task_dir_of(args), args.slot)


# ---------------------------------------------------------------- arm guards

def inside_arm() -> bool:
    return all(os.environ.get(k) for k in ARM_ENV)


def require_arm(args, action: str) -> None:
    """Refuse a dispatch no await.sh arm watches (live 2026-11-10: writers were
    started with no arm and their completion was reported to nobody)."""
    if getattr(args, "unmonitored", False):
        print(f"NOTE: {action} --unmonitored: no await.sh arm watches slot '{args.slot}'.", file=sys.stderr)
        return
    if inside_arm():
        return
    raise RuntimeError(
        f"refused: `{action}` outside await.sh arm dispatches an agent whose completion nobody watches. "
        "Dispatch with one `await.sh arm ... -- python3 herdr-agent.py run ...` "
        "(check-dispatch.py --brief <brief> --print-arm prints it). "
        "For a manual run nobody needs to watch, add --unmonitored."
    )


def pid_gone(pid: int) -> bool:
    """True only when the process does not exist; EPERM (a sandboxed caller) is alive."""
    try:
        os.kill(pid, 0)
        return False
    except ProcessLookupError:
        return True
    except PermissionError:
        return False
    except OSError:
        return True


def flag_value(tokens: list[str], flag: str) -> str | None:
    for i, tok in enumerate(tokens[:-1]):
        if tok == flag:
            return tokens[i + 1]
    return None


def watching_arm(task_dir: Path, slot: str) -> str | None:
    """Name of a live, unsettled arm in <task-dir>/waits whose wait command
    targets this slot; None if there is none."""
    waits = task_dir / "waits"
    for armed in sorted(waits.glob("*.armed")):
        kv: dict[str, str] = {}
        try:
            for line in armed.read_text().splitlines():
                k, sep, v = line.partition("=")
                if sep:
                    kv.setdefault(k, v)
            cmd = shlex.split(kv.get("cmd", ""))
        except (OSError, ValueError):
            continue
        if flag_value(cmd, "--slot") != slot:
            continue
        arm_slot = armed.name[:-len(".armed")]
        if (waits / f"{arm_slot}.settled").exists():
            continue
        pid = kv.get("pid", "")
        if pid.isdigit() and not pid_gone(int(pid)):
            return arm_slot
    return None


# ---------------------------------------------------------------- launch

def role_of(slot: str) -> str | None:
    for role in REUSED_ROLES:
        if slot.startswith(role):
            return role
    return None


def family_of(slot: str) -> str:
    """The slot without a round suffix: writer-r2 -> writer, writer-a-r3 ->
    writer-a, reviewer2 -> reviewer. Domain slots (writer-server, writer-client)
    stay distinct, so parallel writers never block each other."""
    return re.sub(r"-?r?\d+$", "", slot)


def live_same_role(task_dir: Path, slot: str) -> dict | None:
    """A live terminal of this task whose slot has the same role (writer/reviewer):
    the session the next round of the same issue must go to."""
    if not role_of(slot):
        return None
    for info in terminals_of(task_dir):
        other = (info.get("labels") or {}).get("sop.slot") or ""
        if info.get("state") == "live" and family_of(other) == family_of(slot) and not (
                info.get("pid") and pid_gone(info["pid"])):
            return info
    return None


def launch(args) -> dict:
    """Start the agent in a new hc terminal; return hc's facts about it."""
    cmd = args.cmd
    if not cmd:
        raise RuntimeError("a command to run is required after '--'")
    task_dir, slot = task_dir_of(args), args.slot
    # Agents habitually re-dispatch with `run` and a new slot label, which
    # rebuilds the whole context. The live session of the role is reused unless
    # a recorded reason says why it cannot be.
    if not getattr(args, "fresh_reason", None):
        live = live_same_role(task_dir, slot)
        if live and not (args.force and live["labels"]["sop.slot"] == slot):
            other = live["labels"]["sop.slot"]
            raise RuntimeError(
                f"refused: slot '{other}' ({live['address']}) is a live session of the same slot family '{family_of(slot)}' for {task_dir}. "
                f"The next round of the same issue goes to it — replace `run ... -- <agent> ...` with: "
                f"python3 {Path(__file__).resolve()} resume --task-dir {task_dir} --slot {other} "
                f"-- \"Read <brief> and follow it.\"  (brief: `Session: reused`; arm --slot {other}-r<n>). "
                "Only for SKILL.md §4 exceptions add --fresh-reason \"<why>\" (and close the old session).")

    cwd = Path(args.cwd).resolve() if args.cwd else Path.cwd()
    if not cwd.is_dir():
        raise RuntimeError(f"--cwd {cwd} is not a directory")

    for old in terminals_of(task_dir, slot):
        if old.get("state") == "live":
            if not args.force:
                raise RuntimeError(
                    f"slot '{slot}' already has a live terminal {old['address']} for {task_dir}. "
                    "The next round of the same issue goes to this session with `resume`; "
                    "--force ends that terminal and replaces it with a fresh one.")
            snapshot(old["address"], default_log(task_dir, slot), "replaced by --force")
            hc_json("kill", old["address"])
        hc_raw("rm", old["address"], "--json")

    labels = labels_for(task_dir, slot) + [f"sop.task={task_dir.name}", *(args.label or [])]
    # --no-notify: the sentinel is the one completion signal; hc typing notes
    # into the orchestrator would be a second one. --outlive-parent: the agent
    # must survive an orchestrator session that ends; re-running the arm
    # re-establishes the watch. No --keep: a lost program must read as a
    # failure, not as a live shell.
    base = ["run", "--bg", "--no-notify", "--outlive-parent", "--cwd", str(cwd), *label_args(labels)]
    try:
        started = hc_json(*base, "--name", display_name(slot), "--", *cmd)
    except HcError as err:
        if err.kind != "name_taken":
            raise
        started = hc_json(*base, "--name", fallback_name(slot, task_dir), "--", *cmd)
    info = get(started["address"]) or started
    print(f"LAUNCHED address={info['address']} name={info.get('name')} slot={slot} "
          f"pid={info.get('pid')} parent={info.get('parent')} cwd={cwd}", flush=True)
    return info


# ---------------------------------------------------------------- watch

def status_word(info: dict) -> str | None:
    status = info.get("status")
    return status.get("state") if isinstance(status, dict) else status


def classify(info: dict | None, baseline_turn: int, pid: int | None) -> tuple[str, int] | None:
    """(outcome, rc) when the terminal has settled, None while it has not."""
    if info is None:
        return "gone", 1
    if info.get("state") == "finished":
        code, sig = info.get("exit_code"), info.get("signal")
        if code is not None:
            return "exit", int(code)
        return "exit", 128 + int(sig) if sig else 1
    # hc keep-recovery puts a shell in a lost program's place: the terminal
    # stays live with its status cleared and the turn advanced, which would
    # otherwise read as a finished turn. During hc's grace delay the old pid is
    # still reported, so the process itself is checked too.
    if pid and ((info.get("pid") and info["pid"] != pid) or pid_gone(pid)):
        return "lost", RC_LOST
    word = status_word(info)
    if word == "working" or (info.get("turn") or 0) <= baseline_turn:
        return None
    if word == "blocked":
        return "blocked", RC_BLOCKED
    if word == "error":
        return "error", RC_ERROR
    return "turn-end", 0


def snapshot(address: str, log: Path, note: str) -> None:
    """Save the terminal's screen and history: hc keeps no log file, and the
    history goes with `hc rm`."""
    try:
        res = hc_raw("read", address, "--lines", str(SNAPSHOT_LINES))
        if res.returncode != 0:
            return
        log.parent.mkdir(parents=True, exist_ok=True)
        stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        log.write_text(f"# hc read {address} --lines {SNAPSHOT_LINES} at {stamp} ({note})\n{res.stdout}")
    except (OSError, RuntimeError):
        pass


def artifact_stamp(path: Path | None) -> int | None:
    """Latest mtime_ns of an artifact file or non-hidden files under an artifact dir."""
    if path is None or not path.exists():
        return None
    if path.is_dir():
        stamps = [p.stat().st_mtime_ns for p in path.rglob("*") if p.is_file() and not p.name.startswith(".")]
        return max(stamps) if stamps else None
    return path.stat().st_mtime_ns


def artifact_fresh(path: Path | None, baseline: int | None) -> bool:
    if path is None:
        return True
    cur = artifact_stamp(path)
    return cur is not None and (baseline is None or cur > baseline)


def watch(address: str, baseline_turn: int, pid: int | None, args, log: Path) -> int:
    deadline = time.monotonic() + args.timeout_s if args.timeout_s and args.timeout_s > 0 else None
    artifact = Path(args.artifact).expanduser() if getattr(args, "artifact", None) else None
    idle_grace_s = getattr(args, "idle_grace_s", 30.0)
    art_baseline = artifact_stamp(artifact)

    def settle(outcome: str, rc: int, info: dict | None, *, missing_artifact: bool = False) -> int:
        snapshot(address, log, outcome)
        extra = ""
        if missing_artifact and artifact is not None:
            print(f"NOTE: turn ended without updating {artifact} — the agent may be waiting on a "
                  "background task/subagent. Check `herdr-agent.py read` first; if waiting on "
                  "background work, arm `herdr-agent.py wait` instead of `send`.", flush=True)
            extra = " artifact=missing"
        print(f"SETTLE outcome={outcome} rc={rc} address={address} "
              f"status={status_word(info or {})} turn={(info or {}).get('turn')} log={log}{extra}", flush=True)
        return rc

    # The arm's watchdog stops this process at its deadline; leave the snapshot.
    def on_term(_sig, _frame):
        sys.exit(settle("timeout", RC_TIMEOUT, None))
    signal.signal(signal.SIGTERM, on_term)

    grace_deadline: float | None = None
    grace_turn: int | None = None

    while True:
        info = get(address)
        verdict = classify(info, baseline_turn, pid)
        if verdict and verdict[0] == "lost":
            # A program that just exited is gone a moment before hc marks the
            # terminal finished; look again so an exit is not reported as a loss.
            time.sleep(1)
            info = get(address)
            verdict = classify(info, baseline_turn, pid)
        if verdict:
            if verdict[0] == "turn-end" and artifact is not None and not artifact_fresh(artifact, art_baseline):
                cur_turn = info.get("turn") or 0
                if idle_grace_s > 0:
                    if grace_deadline is None or (grace_turn is not None and cur_turn > grace_turn):
                        grace_turn = cur_turn
                        grace_deadline = time.monotonic() + idle_grace_s
                    if time.monotonic() < grace_deadline and (deadline is None or time.monotonic() < deadline):
                        time.sleep(args.poll_s)
                        continue
                return settle(*verdict, info, missing_artifact=True)
            return settle(*verdict, info)
        if grace_deadline is not None and info is not None and status_word(info) == "working":
            # The agent woke back up (e.g. a background task completed); reset
            # the baseline to the turn it paused on and keep watching.
            baseline_turn = max(baseline_turn, info.get("turn") or 0)
            grace_deadline = None
            grace_turn = None
        if deadline and time.monotonic() >= deadline:
            return settle("timeout", RC_TIMEOUT, info)
        time.sleep(args.poll_s)


def run_agent(args) -> int:
    require_arm(args, "run")
    if args.fresh_reason:
        print(f"FRESH slot={args.slot} reason={args.fresh_reason}", flush=True)
    info = launch(args)
    return watch(info["address"], info.get("turn") or 0, info.get("pid"), args, log_path(args))


def start_agent(args) -> int:
    """`start` returns once the terminal exists, so an arm whose wait command is
    `start` would settle rc=0 at once while the agent runs unwatched."""
    if not args.unmonitored:
        raise RuntimeError(
            "refused: `start` returns before the agent finishes, so nothing records its completion, "
            "even inside await.sh arm. Dispatch with one `await.sh arm ... -- python3 herdr-agent.py run ...` "
            "(check-dispatch.py --brief <brief> --print-arm prints it). "
            "For a manual run nobody needs to watch, add --unmonitored.")
    require_arm(args, "start")
    launch(args)
    return 0


def resume_agent(args) -> int:
    """Hand the next round of the same issue to the slot's live session: type
    the prompt into its terminal and watch until that turn settles. One command,
    so it is the wait command of an arm exactly like `run` — the session keeps
    the code it already read instead of a fresh one rebuilding it."""
    require_arm(args, "resume")
    task_dir, slot = task_dir_of(args), args.slot
    text = " ".join(args.text[1:] if args.text[:1] == ["--"] else args.text).strip()
    if not text:
        raise RuntimeError("a prompt is required after '--', e.g. \"Read <brief> and follow it.\"")
    info = resolve(task_dir, slot)
    if info is None or info.get("state") != "live" or (info.get("pid") and pid_gone(info["pid"])):
        raise RuntimeError(
            f"no live session for slot '{slot}' in {task_dir}: it cannot be resumed. "
            "Dispatch a fresh session with `run` (brief `Session: fresh reason=session-gone`).")
    word = status_word(info)
    if word == "working":
        raise RuntimeError(f"slot '{slot}' is still working on its last turn; wait for it to settle before resuming.")
    if word == "blocked" and not args.force:
        raise RuntimeError(f"slot '{slot}' is blocked on a dialog: read it first; --force types the prompt anyway.")
    baseline = info.get("turn") or 0
    hc_json("send", info["address"], text, *(["--force"] if args.force else []))
    print(f"RESUMED address={info['address']} slot={slot} since_turn={baseline} status={word}", flush=True)
    return watch(info["address"], baseline, info.get("pid"), args, log_path(args))


def wait_agent(args) -> int:
    info = require(task_dir_of(args), args.slot)
    baseline = args.since_turn if args.since_turn is not None else (info.get("turn") or 0)
    print(f"WAITING address={info['address']} slot={args.slot} since_turn={baseline} "
          f"status={status_word(info)}", flush=True)
    return watch(info["address"], baseline, info.get("pid"), args, log_path(args))


# ---------------------------------------------------------------- inspect

def describe(info: dict, task_dir: Path) -> dict:
    slot = (info.get("labels") or {}).get("sop.slot")
    live = info.get("state") == "live"
    arm = watching_arm(task_dir, slot) if slot else None
    status = info.get("status") if isinstance(info.get("status"), dict) else {}
    out = {
        "slot": slot,
        "address": info.get("address"),
        "name": info.get("name"),
        "state": info.get("state"),
        "status": status_word(info),
        "status_msg": status.get("msg"),
        "reports_status": bool(info.get("reported")),
        "turn": info.get("turn"),
        "pid": info.get("pid"),
        "exit_code": info.get("exit_code"),
        "signal": info.get("signal"),
        "parent": info.get("parent"),
        "cwd": (info.get("foreground") or {}).get("cwd") or info.get("cwd"),
        "running": live,
        "monitoring_armed": arm,
    }
    # An agent standing by after a settled turn needs no arm; one that is
    # working (or reports no status at all) with no arm is a missed watch.
    out["unmonitored"] = bool(live and not arm and (out["status"] == "working" or not out["reports_status"]))
    if out["unmonitored"]:
        out["warning"] = "running with no await.sh arm watching it: its completion is reported to nobody"
    return out


def status_agent(args) -> int:
    task_dir = task_dir_of(args)
    info = resolve(task_dir, args.slot)
    if not info:
        print(json.dumps({"slot": args.slot, "state": "absent", "running": False}, indent=2))
        return 1
    out = describe(info, task_dir)
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return 0 if out["running"] else 1


def dashboard(args) -> int:
    task_dir = task_dir_of(args)
    rows = [describe(t, task_dir) for t in sorted(terminals_of(task_dir), key=lambda t: t.get("created_ms") or 0)]
    if args.json:
        print(json.dumps({"task_dir": str(task_dir), "terminals": rows}, ensure_ascii=False, indent=2))
        return 0
    print(f"=== SOP herdr dashboard: {task_dir.name} ===")
    print(f"{'Slot':<20} {'Addr':<6} {'State':<9} {'Status':<8} {'Turn':<5} {'Monitored':<14} {'Exit':<5} Message")
    print("-" * 92)
    for r in rows:
        if r["monitoring_armed"]:
            mon = f"ARMED({r['monitoring_armed']})"[:14]
        else:
            mon = "UNMONITORED" if r["unmonitored"] else "-"
        exit_code = "-" if r["exit_code"] is None else r["exit_code"]
        print(f"{str(r['slot']):<20} {str(r['address']):<6} {str(r['state']):<9} {str(r['status'] or '-'):<8} "
              f"{str(r['turn']):<5} {mon:<14} {str(exit_code):<5} {(r['status_msg'] or '')[:30]}")
    print("=" * 92)
    print("Take over a terminal: hc attach <Addr> (ctrl+\\ detaches)")
    return 0


def read_agent(args) -> int:
    info = resolve(task_dir_of(args), args.slot)
    text = None
    if info:
        res = hc_raw("read", info["address"], "--lines", str(args.lines))
        if res.returncode == 0:
            text = res.stdout
    if text is None:
        log = log_path(args)
        if not log.is_file():
            print(f"no hc terminal and no log snapshot for slot '{args.slot}'", file=sys.stderr)
            return 1
        lines = log.read_text(errors="replace").splitlines()
        text = "\n".join(lines[-args.lines:] if args.lines > 0 else lines) + "\n"
    print(ANSI.sub("", text) if args.clean else text, end="")
    return 0


def capture_agent(args) -> int:
    info = require(task_dir_of(args), args.slot)
    res = hc_raw("read", info["address"], "--lines", "0")
    if res.returncode != 0:
        print(res.stderr.strip(), file=sys.stderr)
        return 1
    print(res.stdout, end="")
    return 0


# ---------------------------------------------------------------- act

def send_agent(args) -> int:
    task_dir, slot = task_dir_of(args), args.slot
    # Typing into a terminal no arm watches is a dispatch nobody is told about
    # the end of (live: tasks/2026-11-10-home-and-chat-interactive-onboarding).
    if args.unmonitored:
        print(f"NOTE: send --unmonitored: no await.sh arm is checked for slot '{slot}'.", file=sys.stderr)
    elif not inside_arm() and not watching_arm(task_dir, slot):
        print(f"refused: no live await.sh arm in {task_dir / 'waits'} watches slot '{slot}'. "
              "A prompt typed there is a dispatch whose completion nobody watches: dispatch with a new arm "
              "(check-dispatch.py --print-arm), or arm a continued wait (herdr-agent.py wait) first; "
              "for input nobody needs to watch, add --unmonitored.", file=sys.stderr)
        return 1
    if not args.text:
        print("nothing to send", file=sys.stderr)
        return 1
    info = require(task_dir, slot)
    if args.keys:
        hc_json("keys", info["address"], *args.text)
    else:
        hc_json("send", info["address"], " ".join(args.text), *(["--force"] if args.force else []))
    print(f"Sent input to {info['address']} (slot {slot})")
    return 0


def show_agent(args) -> int:
    info = require(task_dir_of(args), args.slot)
    address = info["address"]
    app = shutil.which("herdr-app")
    if app:
        payload = {"terminal": address}
        command = "terminal.peek"
        if args.place:
            command = "terminal.keep"
            if args.place != "tab":
                payload["place"] = args.place
        res = subprocess.run([app, "do", command, json.dumps(payload)], capture_output=True, text=True)
        if res.returncode == 0:
            print(f"{command} {address}: {res.stdout.strip()}")
            return 0
        print(f"herdr-app {command} failed: {(res.stdout or res.stderr).strip()[:200]}", file=sys.stderr)
    print(f"No herdr-app window took it; attach from a terminal: hc attach {address} (ctrl+\\ detaches)")
    return 1


def quota_limited(text: str) -> bool:
    spec = importlib.util.spec_from_file_location(
        "check_quota_action", Path(__file__).resolve().with_name("check-quota-action.py"))
    if not spec or not spec.loader:
        return False
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return bool(mod.detect_rate_limit(text)[0])


def is_terminal_idle(info: dict) -> bool:
    """True if the terminal process has exited, or if it settled a turn and is standing by idle/done."""
    if info.get("state") == "finished":
        return True
    pid = info.get("pid")
    if pid and pid_gone(pid):
        return True
    word = status_word(info)
    turn = info.get("turn") or 0
    # A live agent whose turn settled (idle or done after launch turn)
    if word in ("idle", "done") and turn > 0:
        return True
    return False


def close_agent(args) -> int:
    task_dir = task_dir_of(args)
    targets = terminals_of(task_dir, args.slot)
    if not targets:
        print(f"no hc terminal to close for {task_dir}" + (f" slot '{args.slot}'" if args.slot else ""))
        return 0
    refused = 0
    for info in targets:
        address = info["address"]
        slot = (info.get("labels") or {}).get("sop.slot") or address
        if getattr(args, "idle", False) and not is_terminal_idle(info):
            print(f"Skipped {address} (slot {slot}): not idle (status={status_word(info) or '-'} state={info.get('state')}).")
            continue
        if info.get("state") == "live":
            # A rate- or quota-limited agent is never closed: its session is
            # the only thing that resumes the work when the window resets.
            screen = hc_raw("read", address, "--lines", "0").stdout
            if not args.force and quota_limited(screen):
                print(f"refused: {address} (slot {slot}) shows a rate/quota limit on its screen. Do not close it: "
                      "validate the action with check-quota-action.py (timer, or wait for claude). "
                      "--force closes it anyway.", file=sys.stderr)
                refused += 1
                continue
            snapshot(address, default_log(task_dir, slot), "before close")
            hc_json("kill", address)
        hc_raw("rm", address, "--json")
        print(f"Closed {address} (slot {slot}).")
    return 1 if refused else 0


# ---------------------------------------------------------------- main

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="action", required=True)

    def add(name: str, help_text: str, slot_required: bool = True):
        p = sub.add_parser(name, help=help_text)
        p.add_argument("--task-dir", required=True, help="absolute task directory (holds waits/ and logs/)")
        p.add_argument("--slot", required=slot_required, default=None, help="slot name, e.g. writer-r1")
        return p

    def add_launch(p):
        p.add_argument("--cwd", default=None, help="working directory of the agent (default: current)")
        p.add_argument("--log", default=None, help="log snapshot path (default <task-dir>/logs/<slot>.log)")
        p.add_argument("--label", action="append", metavar="K=V",
                       help="extra hc label, e.g. herdr.space=<id> herdr.tab=<id> to place it in the window")
        p.add_argument("--force", action="store_true", help="end and replace a live terminal of the same slot")
        p.add_argument("--fresh-reason", default=None,
                       help="start a new session although a live one of the same role exists (SKILL.md §4 exception)")
        p.add_argument("cmd", nargs=argparse.REMAINDER, help="agent command after '--'")

    def add_watch(p):
        p.add_argument("--timeout-s", type=float, default=None, help="own deadline (the arm normally sets it)")
        p.add_argument("--poll-s", type=float, default=2.0, help="seconds between hc status checks")
        p.add_argument("--artifact", default=None,
                       help="expected deliverable path; on turn-end without it, wait --idle-grace-s for background tasks to wake the agent")
        p.add_argument("--idle-grace-s", type=float, default=30.0,
                       help="seconds to keep watching after turn-end if --artifact is not updated yet (default 30, 0 to disable)")

    p = add("run", "start the agent and wait until it settles (await.sh arm entry point)")
    add_launch(p); add_watch(p)
    p.add_argument("--unmonitored", action="store_true", help="allow outside await.sh arm (manual run)")

    p = add("start", "start the agent and return immediately")
    add_launch(p)
    p.add_argument("--unmonitored", action="store_true", help="required: nothing records this agent's completion")

    p = add("resume", "send the next round to the slot's live session and wait until it settles (arm entry point)")
    add_watch(p)
    p.add_argument("--log", default=None)
    p.add_argument("--force", action="store_true", help="type even if the agent is blocked")
    p.add_argument("--unmonitored", action="store_true", help="allow outside await.sh arm (manual run)")
    p.add_argument("text", nargs=argparse.REMAINDER, help="prompt after '--'")

    p = add("wait", "wait for a running agent to settle")
    add_watch(p)
    p.add_argument("--log", default=None)
    p.add_argument("--since-turn", type=int, default=None,
                   help="baseline turn (default: the turn now); 0 settles at once if the first turn already ended")

    add("status", "one agent's state as JSON")

    p = add("dashboard", "every terminal of the task", slot_required=False)
    p.add_argument("--json", action="store_true")

    p = add("read", "screen plus history, or the log snapshot")
    p.add_argument("--lines", type=int, default=100, help="lines of history above the screen")
    p.add_argument("--log", default=None)
    p.add_argument("--clean", action="store_true", help="strip ANSI escape sequences")

    add("capture", "the visible screen")

    p = add("send", "paste text and press Enter, or press keys")
    p.add_argument("--keys", action="store_true", help="text is key names for `hc keys` (enter, esc, up, ctrl+c)")
    p.add_argument("--force", action="store_true", help="type even if the agent is blocked (answers its dialog)")
    p.add_argument("--unmonitored", action="store_true", help="skip the watching-arm check")
    p.add_argument("text", nargs="*")

    p = add("show", "show the agent in the herdr-app window")
    p.add_argument("--place", choices=["tab", "right", "down"], help="give it a pane instead of a peek")

    p = add("close", "end and remove the slot's terminal (all of the task's without --slot)", slot_required=False)
    p.add_argument("--force", action="store_true", help="close even when the screen shows a rate/quota limit")
    p.add_argument("--idle", action="store_true", help="only close terminals whose agent is idle or finished (not working)")

    args = parser.parse_args()
    if getattr(args, "cmd", None) and args.cmd[0] == "--":
        args.cmd = args.cmd[1:]

    actions = {
        "run": run_agent, "start": start_agent, "resume": resume_agent, "wait": wait_agent, "status": status_agent,
        "dashboard": dashboard, "read": read_agent, "capture": capture_agent, "send": send_agent,
        "show": show_agent, "close": close_agent,
    }
    try:
        sys.exit(actions[args.action](args))
    except (RuntimeError, subprocess.CalledProcessError) as err:
        print(f"herdr-agent error: {err}", file=sys.stderr)
        sys.exit(getattr(err, "code", 1) if isinstance(err, HcError) and err.kind == "blocked" else 1)


if __name__ == "__main__":
    main()
