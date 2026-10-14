#!/usr/bin/env python3
"""One webhook worker process, driven by oracle.py.

It imports the tree under test the way its tests do (`from src import webhook`), replaces
`webhook.send_welcome_email` (the seam the project's own tests patch) with a recording
provider, handles each delivery in order, and prints one JSON line per delivery.
A delivery that returns is an ack (HTTP 200); one that raises is an error the provider retries.
"""
import argparse
import json
import os
import sys
import threading
import time

_real_time = time.time
_real_time_ns = time.time_ns
_monotonic = time.monotonic


class ProviderError(ConnectionError):
    """The email provider refused the send."""


def parse():
    p = argparse.ArgumentParser()
    p.add_argument("--release", required=True)
    p.add_argument("--sends", required=True)
    p.add_argument("--events", required=True, help="JSON list of events")
    p.add_argument("--send", default="ok",
                   help="ok | crash | fail | slow:SEC | outage:SEC | fail-outage:SEC")
    p.add_argument("--go", help="wait for this file to exist before the first delivery")
    p.add_argument("--clock-offset", type=float, default=0.0)
    p.add_argument("--roots", default="", help="os.pathsep-separated dirs an outage makes read-only")
    p.add_argument("--snapshot", help="JSON {path: [mtime_ns, size]} of the roots at deploy")
    return p.parse_args()


def record_send(sends, customer):
    line = json.dumps({"pid": os.getpid(), "customer": customer, "t": _monotonic()}) + "\n"
    fd = os.open(sends, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o644)
    try:
        os.write(fd, line.encode())
        os.fsync(fd)
    finally:
        os.close(fd)


def walk(roots):
    for root in roots:
        for d, dirs, files in os.walk(root):
            yield d, True
            for f in files:
                yield os.path.join(d, f), False


def changed_since(snapshot_path, roots):
    with open(snapshot_path) as f:
        before = json.load(f)
    out = []
    for path, is_dir in walk(roots):
        if is_dir:
            continue
        try:
            st = os.stat(path)
        except OSError:
            continue
        if before.get(path) != [st.st_mtime_ns, st.st_size]:
            out.append(path)
    return out


class Outage:
    """Makes every file and directory under the roots unwritable, then restores them after `seconds`."""

    def __init__(self, roots, seconds):
        self.roots, self.seconds, self.modes = roots, seconds, {}
        self.thread = None

    def start(self):
        for path, _ in walk(self.roots):
            try:
                mode = os.stat(path).st_mode & 0o7777
                self.modes[path] = mode
                os.chmod(path, mode & ~0o222)
            except OSError:
                pass
        self.thread = threading.Thread(target=self._restore_later, daemon=True)
        self.thread.start()

    def _restore_later(self):
        time.sleep(self.seconds)
        self.restore()

    def restore(self):
        # Directories last in reverse so a parent is writable again before its children need it.
        for path, mode in sorted(self.modes.items(), key=lambda kv: -len(kv[0])):
            try:
                os.chmod(path, mode)
            except OSError:
                pass
        self.modes = {}

    def wait(self):
        if self.thread:
            self.thread.join()


def main():
    a = parse()
    if a.clock_offset:
        # Simulates a host wall-clock step for code that reads Python's clock.
        time.time = lambda: _real_time() + a.clock_offset
        time.time_ns = lambda: _real_time_ns() + int(a.clock_offset * 1e9)
    events = json.loads(a.events)
    roots = [r for r in a.roots.split(os.pathsep) if r]
    mode, _, arg = a.send.partition(":")
    outages = []
    store_files = []

    sys.path.insert(0, a.release)
    from src import webhook  # noqa: E402

    def send(customer):
        if mode == "crash":
            sys.stdout.flush()
            os._exit(137)
        if mode == "slow":
            time.sleep(float(arg))
        if mode in ("outage", "fail-outage"):
            if a.snapshot:
                store_files.extend(changed_since(a.snapshot, roots))
            o = Outage(roots, float(arg))
            outages.append(o)
            o.start()
            if mode == "fail-outage":
                raise ProviderError("provider refused the send")
            record_send(a.sends, customer)
            return
        if mode == "fail":
            raise ProviderError("provider refused the send")
        record_send(a.sends, customer)

    webhook.send_welcome_email = send

    if a.go:
        while not os.path.exists(a.go):
            time.sleep(0.005)

    try:
        for i, event in enumerate(events):
            t0 = _monotonic()
            line = {"i": i, "type": event.get("type"), "purchase": event.get("purchase_id"),
                    "pid": os.getpid()}
            try:
                webhook.handle_event(dict(event))
                line["outcome"] = "ack"
            except BaseException as e:  # noqa: BLE001 - every raise is a non-2xx to the provider
                chain, cur = [], e
                while cur is not None and len(chain) < 8:
                    chain.append(type(cur).__name__)
                    cur = cur.__cause__ or cur.__context__
                line.update(outcome="error", error=f"{type(e).__name__}: {e}"[:400], error_chain=chain)
            line["seconds"] = round(_monotonic() - t0, 3)
            try:
                line["seam_bypassed"] = bool(webhook.emails_sent())
            except Exception:  # noqa: BLE001
                line["seam_bypassed"] = False
            if store_files:
                line["store_files"] = sorted(set(store_files))
            print(json.dumps(line), flush=True)
    finally:
        for o in outages:
            o.wait()
            o.restore()


if __name__ == "__main__":
    main()
