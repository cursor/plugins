"""Intentionally process-local deduplication for the portable evaluation fixture."""
import threading

_claimed = set()
_sent = []
_lock = threading.Lock()


def send_welcome_email(customer):
    _sent.append(customer)


def handle_event(event):
    if event.get("type") not in {"purchase.completed", "purchase.paid"}:
        return
    key = (event["customer"], event["purchase_id"])
    with _lock:
        if key in _claimed:
            return
        _claimed.add(key)
    try:
        send_welcome_email(event["customer"])
    except Exception:
        with _lock:
            _claimed.discard(key)
        raise


def emails_sent():
    return list(_sent)


def reset():
    _claimed.clear()
    _sent.clear()
