"""Per-user server registrations and authenticated shutdown, independent of project cwd."""
from __future__ import annotations

import ipaddress
import json
import os
import secrets
import sys
import tempfile
import time
from http.client import HTTPConnection, HTTPException
from pathlib import Path


def registry_dir(home: Path = None) -> Path:
    cache = os.environ.get("XDG_CACHE_HOME") if home is None else None
    base = Path(cache) if cache and Path(cache).is_absolute() else (home or Path.home()) / ".cache"
    return base / "pstack" / "serve"


def register(host: str, port: int, home: Path = None):
    directory = registry_dir(home)
    directory.mkdir(parents=True, mode=0o700, exist_ok=True)
    directory.chmod(0o700)
    token = secrets.token_hex(32)
    record = {"host": host, "port": port, "pid": os.getpid(), "token": token}
    path = directory / f"{os.getpid()}-{token[:16]}.json"
    with tempfile.NamedTemporaryFile(mode="w", dir=directory, delete=False) as f:
        temporary = Path(f.name)
        try:
            json.dump(record, f)
            f.close()
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)
    return path, token


def stop_servers(port: int = None, home: Path = None) -> int:
    stopped = failed = 0
    for path in sorted(registry_dir(home).glob("*.json")):
        try:
            record = json.loads(path.read_text())
            host, target_port, token = record["host"], record["port"], record["token"]
            ipaddress.ip_address(host)
            if not isinstance(target_port, int) or not 1 <= target_port <= 65535:
                raise ValueError("invalid port")
            if not isinstance(token, str) or len(token) != 64 or any(c not in "0123456789abcdef" for c in token):
                raise ValueError("invalid token")
        except FileNotFoundError:
            continue
        except (OSError, ValueError, KeyError, TypeError):
            print(f"pstack serve: cannot read server registration {path}", file=sys.stderr)
            failed += 1
            continue
        if port is not None and port != target_port:
            continue
        connection = HTTPConnection(host, target_port, timeout=3)
        try:
            connection.request("POST", "/api/shutdown", body=b"",
                               headers={"Authorization": f"Bearer {token}"})
            response = connection.getresponse()
            if response.status != 200:
                raise RuntimeError(f"shutdown refused (HTTP {response.status})")
            deadline = time.monotonic() + 5
            while path.exists() and time.monotonic() < deadline:
                time.sleep(0.05)
            if path.exists():
                raise RuntimeError("server did not finish stopping within 5 seconds")
        except ConnectionRefusedError:
            path.unlink(missing_ok=True)
            continue
        except (OSError, HTTPException, RuntimeError) as e:
            print(f"pstack serve: could not stop port {target_port}: {e}", file=sys.stderr)
            failed += 1
            continue
        finally:
            connection.close()
        print(f"pstack serve: stopped port {target_port}")
        stopped += 1
    if not stopped and not failed:
        suffix = f" on port {port}" if port is not None else ""
        print(f"pstack serve: no running servers{suffix}")
    return 1 if failed else 0
