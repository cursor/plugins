#!/usr/bin/env python3
"""Hidden behavioral checks for the webhook durable-idempotence task.

    python3 oracle.py --tree DIR [--only a,b] [--json FILE] [--recovery-window SEC]

Every check deploys a copy of DIR into a fresh sandbox (its own HOME, TMPDIR, XDG dirs and
working directory, a clean environment) and drives real worker processes (worker.py) the way a
payment provider drives a webhook: at-least-once, retrying any delivery that raised or got no
response, never retrying one that returned. Sends are observed through `webhook.send_welcome_email`,
the seam the project's own tests patch. Checks judge outcomes only: how many welcome emails went
out, and whether any delivery was acknowledged while the email it owed was never sent.
Exit 0 only when every check passes.
"""
import argparse
import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

HERE = Path(__file__).resolve().parent
WORKER = HERE / "worker.py"
COPY_IGNORE = shutil.ignore_patterns(".git", "__pycache__", "*.pyc", ".pstack", ".claude", ".agents",
                                     ".codex", ".github", ".cursor", "docs", "automations", "assets",
                                     "node_modules")
BACKOFF = [0.5, 1, 2, 4, 8, 15, 30]


def ev(kind, customer, purchase):
    return {"type": kind, "customer": customer, "purchase_id": purchase}


class CheckError(Exception):
    """The check could not observe the behavior (not a pass)."""


class Sandbox:
    def __init__(self, tree, name, extra_env, keep):
        self.tree, self.keep = Path(tree), keep
        self.root = Path(tempfile.mkdtemp(prefix=f"oracle-{name}-"))
        self.home, self.tmp, self.cwd, self.obs = (self.root / d for d in ("home", "tmp", "run", "obs"))
        for d in (self.home, self.tmp, self.cwd, self.obs):
            d.mkdir()
        self.releases = []
        self.release = self.deploy("release-1")
        self.sends = self.obs / "sends.jsonl"
        self.env = {
            "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
            "LANG": os.environ.get("LANG", "C.UTF-8"),
            "HOME": str(self.home),
            "TMPDIR": str(self.tmp),
            "XDG_STATE_HOME": str(self.home / ".local" / "state"),
            "XDG_DATA_HOME": str(self.home / ".local" / "share"),
            "XDG_CACHE_HOME": str(self.home / ".cache"),
            "XDG_CONFIG_HOME": str(self.home / ".config"),
            "PYTHONDONTWRITEBYTECODE": "1",
            **extra_env,
        }
        self.log = []

    def deploy(self, name):
        dest = self.root / name
        shutil.copytree(self.tree, dest, ignore=COPY_IGNORE, symlinks=True)
        self.releases.append(dest)
        return dest

    def roots(self):
        return [p for p in self.releases if p.exists()] + [self.home, self.tmp, self.cwd]

    def snapshot(self):
        snap = {}
        for root in self.roots():
            for d, _, files in os.walk(root):
                for f in files:
                    p = os.path.join(d, f)
                    st = os.stat(p)
                    snap[p] = [st.st_mtime_ns, st.st_size]
        path = self.obs / "snapshot.json"
        path.write_text(json.dumps(snap))
        return path

    def _cmd(self, events, send="ok", release=None, go=None, clock=0.0, snapshot=None):
        cmd = [sys.executable, str(WORKER), "--release", str(release or self.release),
               "--sends", str(self.sends), "--events", json.dumps(events), "--send", send,
               "--roots", os.pathsep.join(str(r) for r in self.roots())]
        if go:
            cmd += ["--go", str(go)]
        if clock:
            cmd += ["--clock-offset", str(clock)]
        if snapshot:
            cmd += ["--snapshot", str(snapshot)]
        return cmd

    def spawn(self, events, **kw):
        return subprocess.Popen(self._cmd(events, **kw), cwd=self.cwd, env=self.env,
                                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    def collect(self, proc, events, timeout, label):
        try:
            out, err = proc.communicate(timeout=timeout)
            hung = False
        except subprocess.TimeoutExpired:
            proc.kill()
            out, err = proc.communicate()
            hung = True
        lines = [json.loads(l) for l in out.splitlines() if l.startswith("{")]
        for i, e in enumerate(events):
            if i >= len(lines):
                lines.append({"i": i, "type": e.get("type"), "purchase": e.get("purchase_id"),
                              "outcome": "hung" if hung else "no response", "rc": proc.returncode})
        for l in lines:
            if l.get("seam_bypassed"):
                raise CheckError("the handler sent through something other than webhook.send_welcome_email, "
                                 "the seam the project's tests patch, so the oracle cannot count sends")
        if err.strip() and proc.returncode not in (0, 137):
            lines[-1]["stderr_tail"] = err.strip().splitlines()[-3:]
        self.log.append({"worker": label, "rc": proc.returncode, "deliveries": lines})
        return lines

    def run(self, events, label, timeout=60, **kw):
        return self.collect(self.spawn(events, **kw), events, timeout, label)

    def count(self, customer=None):
        if not self.sends.exists():
            return 0
        rows = [json.loads(l) for l in self.sends.read_text().splitlines() if l.strip()]
        return sum(1 for r in rows if customer is None or r["customer"] == customer)

    def cleanup(self):
        for d, dirs, files in os.walk(self.root):
            for name in dirs + files:
                p = os.path.join(d, name)
                try:
                    if not os.path.islink(p):
                        os.chmod(p, os.stat(p).st_mode | stat.S_IWUSR | stat.S_IRUSR | stat.S_IXUSR * os.path.isdir(p))
                except OSError:
                    pass
        os.chmod(self.root, 0o700)
        if not self.keep:
            shutil.rmtree(self.root, ignore_errors=True)


def provider_retry(sb, pending, customer, deadline, label, *, silent_guard, max_sends=1, clock=0.0):
    """Retry each pending delivery in a fresh worker, with backoff, until every one is acked.

    Returns "acked", "silent" (a delivery returned while no email had gone out and no live worker
    was sending: the provider stops retrying and the email is lost), "duplicate", or "timeout".
    """
    pending = list(pending)
    attempt = 0
    while pending:
        for e in list(pending):
            line = sb.run([e], f"{label} retry {attempt}", clock=clock)[0]
            if sb.count(customer) > max_sends:
                return "duplicate"
            if line["outcome"] == "ack":
                if silent_guard and sb.count(customer) == 0:
                    return "silent"
                pending.remove(e)
        if not pending:
            return "acked"
        if time.monotonic() > deadline:
            return "timeout"
        time.sleep(min(BACKOFF[min(attempt, len(BACKOFF) - 1)], max(0.0, deadline - time.monotonic())))
        attempt += 1
    return "acked"


def outcome_message(result, customer_sends, window):
    return {
        "silent": f"a delivery returned normally with {customer_sends} emails sent and no live sender: "
                  "the provider stops retrying and the welcome email is never sent",
        "duplicate": f"{customer_sends} welcome emails for one purchase",
        "timeout": f"no email within {window:.0f}s and the provider is still being refused; "
                   "pass --recovery-window if the fix documents a longer takeover",
    }[result]


class Ctx:
    def __init__(self, args):
        self.args = args
        self.takeover = None


def check_restart(sb, ctx):
    """Restart: a new process on the same deployment must not re-welcome a welcomed purchase."""
    cust, p1, p2 = "ada@example.com", f"P1-{uuid.uuid4().hex[:8]}", f"P2-{uuid.uuid4().hex[:8]}"
    a = sb.run([ev("purchase.completed", cust, p1)], "first process")
    if a[0]["outcome"] != "ack" or sb.count(cust) != 1:
        return False, f"first delivery: {a[0]['outcome']}, {sb.count(cust)} emails (expected ack, 1)"
    b = sb.run([ev("purchase.completed", cust, p1), ev("purchase.paid", cust, p1),
                ev("refund.issued", cust, p1), ev("purchase.completed", cust, p2)], "after restart")
    bad = [l for l in b if l["outcome"] != "ack"]
    n = sb.count(cust)
    if n != 2 or bad:
        return False, (f"after restart: {n} emails for one customer with two purchases (expected 2: one per "
                       f"purchase); unacked deliveries: {[(l['type'], l['outcome']) for l in bad]}")
    return True, "one email per purchase across a restart; repeat purchase still welcomed; refund sent nothing"


def check_workers(sb, ctx):
    """Eight workers race both events of one purchase: exactly one email."""
    cust, p = "grace@example.com", f"P-{uuid.uuid4().hex[:8]}"
    go = sb.obs / "go"
    events = [ev("purchase.completed", cust, p), ev("purchase.paid", cust, p)]
    procs = [sb.spawn(events, send="slow:0.3", go=go) for _ in range(8)]
    time.sleep(1.0)
    go.touch()
    unacked = []
    for i, pr in enumerate(procs):
        for e, l in zip(events, sb.collect(pr, events, 60, f"worker {i}")):
            if l["outcome"] != "ack":
                unacked.append(e)
    n = sb.count(cust)
    if n > 1:
        return False, f"{n} emails for one purchase delivered to 8 concurrent workers"
    res = provider_retry(sb, unacked, cust, time.monotonic() + 60, "race", silent_guard=True)
    if res != "acked":
        return False, outcome_message(res, sb.count(cust), 60)
    if sb.count(cust) != 1:
        return False, f"{sb.count(cust)} emails after every delivery was acked (expected 1)"
    return True, f"1 email; {len(unacked)} deliveries were refused while in progress and acked on retry"


def check_crash(sb, ctx):
    """O1: a worker killed after claiming, before the provider accepts the send, must not lose the email."""
    cust, p = "linus@example.com", f"P-{uuid.uuid4().hex[:8]}"
    t0 = time.monotonic()
    a = sb.run([ev("purchase.completed", cust, p)], "killed mid-send", send="crash")
    if a[0].get("rc") != 137:
        return False, f"the worker was not killed in send (outcome {a[0]['outcome']}); the handler never called the send"
    window = ctx.args.recovery_window
    res = provider_retry(sb, [ev("purchase.completed", cust, p), ev("purchase.paid", cust, p)], cust,
                         t0 + window, "after crash", silent_guard=True)
    if res != "acked":
        return False, outcome_message(res, sb.count(cust), window)
    ctx.takeover = time.monotonic() - t0
    again = sb.run([ev("purchase.completed", cust, p), ev("purchase.paid", cust, p)], "redelivery after recovery")
    n = sb.count(cust)
    if n != 1 or any(l["outcome"] != "ack" for l in again):
        return False, f"after recovery, a redelivery in a new process gave {n} emails (expected 1) and outcomes {[l['outcome'] for l in again]}"
    return True, f"email sent once {ctx.takeover:.1f}s after the crash; no delivery was acked before it went out"


def check_slow_send(sb, ctx):
    """O3: a live worker's slow send is not duplicated by redeliveries arriving during it."""
    cust, p = "barbara@example.com", f"P-{uuid.uuid4().hex[:8]}"
    slow = ctx.args.slow_send
    a_events = [ev("purchase.completed", cust, p)]
    a = sb.spawn(a_events, send=f"slow:{slow}")
    time.sleep(1.0)
    res = provider_retry(sb, [ev("purchase.paid", cust, p), ev("purchase.completed", cust, p)], cust,
                         time.monotonic() + slow + 60, "during slow send", silent_guard=False)
    a_line = sb.collect(a, a_events, slow + 60, "slow sender")[0]
    if res == "duplicate" or sb.count(cust) > 1:
        return False, f"{sb.count(cust)} emails: a redelivery sent while the first worker's {slow:.0f}s send was in flight"
    if res != "acked":
        return False, outcome_message(res, sb.count(cust), slow + 60)
    if a_line["outcome"] != "ack":
        return False, f"the slow sender's own delivery ended {a_line['outcome']} after its send succeeded"
    again = sb.run([ev("purchase.paid", cust, p)], "redelivery after slow send")
    if sb.count(cust) != 1 or again[0]["outcome"] != "ack":
        return False, f"{sb.count(cust)} emails after a final redelivery ({again[0]['outcome']})"
    return True, f"1 email across a {slow:.0f}s send with redeliveries arriving during it"


def check_clock_step(sb, ctx):
    """O3: a wall-clock step of one hour on the host does not hand a live send to a second worker."""
    cust, p = "margaret@example.com", f"P-{uuid.uuid4().hex[:8]}"
    a_events = [ev("purchase.completed", cust, p)]
    a = sb.spawn(a_events, send="slow:5")
    time.sleep(1.0)
    res = provider_retry(sb, [ev("purchase.paid", cust, p)], cust, time.monotonic() + 65,
                         "stepped clock", silent_guard=False, clock=3600.0)
    a_line = sb.collect(a, a_events, 65, "sender before the step")[0]
    if res == "duplicate" or sb.count(cust) > 1:
        return False, f"{sb.count(cust)} emails: a worker whose clock read one hour later sent while the first send was in flight"
    if res != "acked" or a_line["outcome"] != "ack":
        return False, f"deliveries did not all ack (retry: {res}, first sender: {a_line['outcome']})"
    if sb.count(cust) != 1:
        return False, f"{sb.count(cust)} emails (expected 1)"
    return True, "1 email with the redelivering worker's clock stepped +3600s"


def settle_seconds(ctx):
    return ctx.takeover + 3 if ctx.takeover is not None else ctx.args.recovery_window


def check_mark_outage(sb, ctx):
    """O4: storage failing for 2s right after a successful send must not lead to a second email."""
    cust, p = "frances@example.com", f"P-{uuid.uuid4().hex[:8]}"
    snap = sb.snapshot()
    a = sb.run([ev("purchase.completed", cust, p)], "storage fails after send", send="outage:2", snapshot=snap)
    injected = bool(a[0].get("store_files"))
    note = "" if injected else " (no store file was found under the sandbox, so no storage fault reached the fix)"
    if sb.count(cust) != 1:
        return False, f"{sb.count(cust)} emails from the first delivery (expected 1){note}"
    pending = [ev("purchase.paid", cust, p)] + ([] if a[0]["outcome"] == "ack" else [ev("purchase.completed", cust, p)])
    time.sleep(2.5)
    res = provider_retry(sb, pending, cust, time.monotonic() + ctx.args.recovery_window, "after outage",
                         silent_guard=False)
    if res != "acked":
        return False, outcome_message(res, sb.count(cust), ctx.args.recovery_window) + note
    settle = settle_seconds(ctx)
    time.sleep(settle)
    again = sb.run([ev("purchase.completed", cust, p), ev("purchase.paid", cust, p)], "redelivery after settle")
    n = sb.count(cust)
    if n != 1 or any(l["outcome"] != "ack" for l in again):
        return False, f"{n} emails after a redelivery {settle:.0f}s later (expected 1, all acked){note}"
    if not injected:
        raise CheckError("no store file was found under the sandbox (HOME, TMPDIR, working dir, release dir), "
                         "so the storage fault could not be injected")
    return True, f"1 email; the first delivery {a[0]['outcome']}ed through the outage; a redelivery {settle:.0f}s later sent nothing"


def check_release_outage(sb, ctx):
    """O4: a failed send whose release also fails must not be acked, and the retry must still send."""
    cust, p = "edsger@example.com", f"P-{uuid.uuid4().hex[:8]}"
    snap = sb.snapshot()
    a = sb.run([ev("purchase.completed", cust, p)], "send fails during outage", send="fail-outage:2", snapshot=snap)
    injected = bool(a[0].get("store_files"))
    if a[0]["outcome"] == "ack":
        return False, "the provider's send failed and the delivery was still acked: the email is never sent"
    chain = a[0].get("error_chain", [])
    time.sleep(2.5)
    t0 = time.monotonic()
    res = provider_retry(sb, [ev("purchase.completed", cust, p), ev("purchase.paid", cust, p)], cust,
                         t0 + ctx.args.recovery_window, "after failed send", silent_guard=True)
    if res != "acked":
        return False, outcome_message(res, sb.count(cust), ctx.args.recovery_window)
    again = sb.run([ev("purchase.paid", cust, p)], "redelivery after recovery")
    if sb.count(cust) != 1 or again[0]["outcome"] != "ack":
        return False, f"{sb.count(cust)} emails after a redelivery in a new process (expected 1)"
    if not injected:
        raise CheckError("no store file was found under the sandbox, so the storage fault could not be injected")
    provider_first = bool(chain) and chain[0] == "ProviderError"
    return True, (f"1 email after the retry; the failed delivery raised {chain[0] if chain else '?'}"
                  f"{'' if provider_first else ' (not the provider error; informational)'}")


def check_failed_send(sb, ctx):
    """A failed send is retried by another worker, and the purchase is then welcomed exactly once."""
    cust, p = "donald@example.com", f"P-{uuid.uuid4().hex[:8]}"
    a = sb.run([ev("purchase.completed", cust, p)], "send fails", send="fail")
    if a[0]["outcome"] == "ack":
        return False, "the send failed and the delivery was acked anyway: the email is never sent"
    res = provider_retry(sb, [ev("purchase.completed", cust, p)], cust,
                         time.monotonic() + ctx.args.recovery_window, "other worker", silent_guard=True)
    if res != "acked":
        return False, outcome_message(res, sb.count(cust), ctx.args.recovery_window)
    again = sb.run([ev("purchase.paid", cust, p)], "third worker")
    if sb.count(cust) != 1 or again[0]["outcome"] != "ack":
        return False, f"{sb.count(cust)} emails once a third worker got the other event (expected 1)"
    return True, "failed send raised; another worker sent it; a third worker sent nothing"


def check_redeploy(sb, ctx):
    """O5: deploying a new release directory keeps the ledger."""
    cust, p = "katherine@example.com", f"P-{uuid.uuid4().hex[:8]}"
    a = sb.run([ev("purchase.completed", cust, p)], "release-1")
    if a[0]["outcome"] != "ack" or sb.count(cust) != 1:
        return False, f"release-1: {a[0]['outcome']}, {sb.count(cust)} emails"
    old = sb.release
    sb.release = sb.deploy("release-2")
    shutil.rmtree(old)
    b = sb.run([ev("purchase.completed", cust, p), ev("purchase.paid", cust, p)], "release-2")
    n = sb.count(cust)
    if n != 1 or any(l["outcome"] != "ack" for l in b):
        return False, f"after deploying a new release directory: {n} emails (expected 1), outcomes {[l['outcome'] for l in b]}"
    return True, "1 email across a release-directory swap"


def check_read_only_install(sb, ctx):
    """O5: the code directory is read-only (a packaged install); deliveries still work and dedupe."""
    cust, p = "barbara.l@example.com", f"P-{uuid.uuid4().hex[:8]}"
    for d, dirs, files in os.walk(sb.release):
        for name in files + dirs:
            q = os.path.join(d, name)
            os.chmod(q, os.stat(q).st_mode & ~0o222)
    os.chmod(sb.release, os.stat(sb.release).st_mode & ~0o222)
    a = sb.run([ev("purchase.completed", cust, p)], "read-only install")
    if a[0]["outcome"] != "ack" or sb.count(cust) != 1:
        return False, f"read-only install: first delivery {a[0]['outcome']} ({a[0].get('error', '')}), {sb.count(cust)} emails"
    b = sb.run([ev("purchase.paid", cust, p)], "second process, read-only install")
    if b[0]["outcome"] != "ack" or sb.count(cust) != 1:
        return False, f"read-only install: {sb.count(cust)} emails after a second process (expected 1), {b[0]['outcome']}"
    return True, "works and dedupes with the code directory read-only"


CHECKS = [
    ("restart", check_restart,
     "Idempotence survives a restart: a purchase welcomed by one process is not welcomed again by a new "
     "process; it stays per purchase (a second purchase by the same customer is welcomed) and an unrelated "
     "event sends nothing.",
     "the claim is process memory, so the new process sends again (3 emails, expected 2)."),
    ("workers", check_workers,
     "Idempotence holds across workers: 8 processes receiving both events of one purchase at once send "
     "exactly one email, and every delivery is eventually acked.",
     "each process has its own claim set, so each of the 8 sends (8 emails)."),
    ("crash_recovery", check_crash,
     "O1: a worker killed between claiming a purchase and the provider accepting the send does not lose the "
     "email. Provider retries (fresh processes, backoff) end with exactly one email within the recovery "
     "window, no retry is acked while nothing was sent, and a later redelivery sends nothing.",
     "the retry sends (memory died with the worker), but the next redelivery in a new process sends a "
     "second email, which is the reported restart bug."),
    ("slow_send", check_slow_send,
     "O3: while one live worker is inside a slow send (default 20s), redeliveries of the same purchase to "
     "other workers do not send a second email, and all of them are acked once it completes.",
     "the other worker has no view of the first worker's claim and sends a second email."),
    ("clock_step", check_clock_step,
     "O3: a worker whose Python wall clock reads one hour ahead (a host clock step) does not take over a "
     "live send and duplicate it.",
     "the second worker cannot see the first worker's claim at all and sends a second email."),
    ("mark_sent_outage", check_mark_outage,
     "O4: the fix's storage turning unwritable for 2s right after the provider accepted the email does not "
     "cause a second email, not on the provider's retries and not on a redelivery after the takeover time "
     "measured by crash_recovery (or the recovery window). Errors when the store cannot be located.",
     "there is no store to fault (reported as such) and a redelivery in a new process sends a second email."),
    ("release_outage", check_release_outage,
     "O4: a send the provider refuses while the fix's storage is also unwritable is not acked, the "
     "provider's retry after storage returns sends exactly once, and a later redelivery sends nothing.",
     "the retry sends, then a redelivery in a new process sends a second email."),
    ("failed_send_retry", check_failed_send,
     "A failed send raises (the provider retries), another worker then sends it, and a third worker "
     "receiving the other event sends nothing. Guards the release-on-failure behavior a durable claim "
     "must keep.",
     "the third worker has an empty claim set and sends a second email."),
    ("redeploy", check_redeploy,
     "O5: the ledger is not stored beside the code: after a new release directory replaces the old one, "
     "a redelivery sends nothing.",
     "the new release is a new process with no memory of the purchase and sends again."),
    ("read_only_install", check_read_only_install,
     "O5: with the code directory read-only, deliveries are acked and a second process still dedupes.",
     "the second process sends a second email."),
]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--tree", help="the project tree to judge (the agent's final tree)")
    ap.add_argument("--only", help="comma-separated check names")
    ap.add_argument("--json", help="write results here")
    ap.add_argument("--list", action="store_true", help="print each check and what it proves")
    ap.add_argument("--recovery-window", type=float, default=360.0,
                    help="seconds the provider keeps retrying after a crash or failure (default 360)")
    ap.add_argument("--slow-send", type=float, default=20.0, help="duration of the slow send in slow_send")
    ap.add_argument("--env", action="append", default=[], metavar="KEY=VALUE",
                    help="extra environment for workers, e.g. a store path the fix requires")
    ap.add_argument("--keep", action="store_true", help="keep sandboxes for inspection")
    args = ap.parse_args(argv)

    if args.list:
        for name, _, proves, f13 in CHECKS:
            print(f"{name}\n  proves: {proves}\n  on f13dd84: {f13}\n")
        return 0
    if not args.tree:
        ap.error("--tree is required")
    tree = Path(args.tree).resolve()
    if not (tree / "src" / "webhook.py").is_file():
        print(f"ERROR: {tree}/src/webhook.py not found")
        return 2
    extra = dict(kv.split("=", 1) for kv in args.env)
    wanted = set(args.only.split(",")) if args.only else None
    ctx = Ctx(args)
    results = []
    for name, fn, proves, _ in CHECKS:
        if wanted and name not in wanted:
            continue
        sb = Sandbox(tree, name, extra, args.keep)
        t0 = time.monotonic()
        try:
            ok, detail = fn(sb, ctx)
            status = "pass" if ok else "fail"
        except CheckError as e:
            status, detail = "error", str(e)
        except Exception as e:  # noqa: BLE001 - a harness bug must not read as the fix's pass
            status, detail = "error", f"oracle exception: {type(e).__name__}: {e}"
        finally:
            sb.cleanup()
        secs = round(time.monotonic() - t0, 1)
        results.append({"name": name, "status": status, "detail": detail, "proves": proves,
                        "seconds": secs, "workers": sb.log, "sandbox": str(sb.root) if args.keep else None})
        print(f"{status.upper():5} {name:<18} {secs:6.1f}s  {detail}", flush=True)
    passed = sum(r["status"] == "pass" for r in results)
    print(f"\n{passed}/{len(results)} checks passed")
    if args.json:
        Path(args.json).write_text(json.dumps({"tree": str(tree), "passed": passed, "total": len(results),
                                               "checks": results}, indent=2) + "\n")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
