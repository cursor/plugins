"""Purchase webhook. Receives events from the payment provider.

Reference fix used only to prove the oracle is passable. It is never shown to an agent.
"""
import fcntl
import hashlib
import os
import pathlib
import shutil
import threading
import time
from typing import Dict, List, Set

# Paddle sends both purchase.completed and purchase.paid for one purchase.
_WELCOME_EVENTS = frozenset({"purchase.completed", "purchase.paid"})

_sent: List[str] = []
_inflight: Set[str] = set()
_inflight_lock = threading.Lock()


class WelcomeInProgress(RuntimeError):
    """Another worker is sending this purchase's welcome email. The provider should retry."""


def _state_dir() -> pathlib.Path:
    if os.environ.get("WEBHOOK_STATE_DIR"):
        return pathlib.Path(os.environ["WEBHOOK_STATE_DIR"])
    base = os.environ.get("XDG_STATE_HOME") or os.path.join(os.path.expanduser("~"), ".local", "state")
    return pathlib.Path(base) / "welcome-webhook"


def send_welcome_email(customer: str) -> None:
    _sent.append(customer)


def _mark_sent(path: pathlib.Path) -> None:
    # The email already went out, so giving up here invites a duplicate. Ride out a short outage.
    deadline, delay = time.monotonic() + 30, 0.05
    while True:
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT, 0o644)
            os.fsync(fd)
            os.close(fd)
            dfd = os.open(path.parent, os.O_RDONLY)
            os.fsync(dfd)
            os.close(dfd)
            return
        except OSError:
            if time.monotonic() > deadline:
                raise
            time.sleep(delay)
            delay = min(delay * 2, 1.0)


def handle_event(event: Dict) -> None:
    """Handle one webhook delivery. Delivery is at-least-once, so this must be idempotent.

    A purchase's claim is an flock on its lock file, so the kernel drops it when the claimant dies,
    and a sent marker records the welcome durably for every worker on this host.
    """
    if event.get("type") not in _WELCOME_EVENTS:
        return
    customer = event["customer"]
    key = hashlib.sha256(f"{customer}\0{event['purchase_id']}".encode()).hexdigest()
    state = _state_dir()
    sent = state / f"{key}.sent"
    if sent.exists():
        return
    with _inflight_lock:
        if key in _inflight:
            return
        _inflight.add(key)
    try:
        state.mkdir(parents=True, exist_ok=True)
        fd = os.open(state / f"{key}.lock", os.O_RDWR | os.O_CREAT, 0o644)
        try:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise WelcomeInProgress(f"welcome for {event['purchase_id']} is being sent") from None
            if sent.exists():
                return
            send_welcome_email(customer)
            _mark_sent(sent)
        finally:
            os.close(fd)
    finally:
        with _inflight_lock:
            _inflight.discard(key)


def emails_sent() -> List[str]:
    return list(_sent)


def reset() -> None:
    shutil.rmtree(_state_dir(), ignore_errors=True)
    _sent.clear()
