"""Opt-in PStack client; no authority, launcher, forge effect or cached grant.

Only the reviewed coord.project.v2 capability mapping is implemented. The
authority is supplied by the operator; no backend is downloaded or installed.
"""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

CONTRACT = "pstack.osb.client.v1"
MAPPING = "osb-firstmate.coord.project.v2"
MUTATIONS = {"enroll", "session", "submit", "claim", "renew", "release", "publish-head"}
READS = {"check", "scope-status", "scope-inspect"}


class Refused(Exception):
    pass


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def require(condition, reason):
    if not condition:
        raise Refused(reason)


def object_file(path, limit=65536):
    require(path.stat().st_size <= limit, "file-too-large")
    value = json.loads(path.read_text())
    require(isinstance(value, dict), "object-required")
    return value


def config(path):
    value = object_file(path)
    require(value.get("contract") == CONTRACT and value.get("enabled") is True, "extension-not-enabled")
    require(value.get("mapping") == MAPPING, "unsupported-capability-mapping")
    require(value.get("forge_host") == "github.com" and re.fullmatch(r"[1-9][0-9]*", str(value.get("forge_repo_id", ""))), "immutable-repo-required")
    for key in ("scope_id", "authority_id", "home_id", "repo", "journal"):
        require(isinstance(value.get(key), str) and bool(value[key]), "missing-config-field")
    require(re.fullmatch(r"[a-z0-9_.-]+/[a-z0-9_.-]+", value["repo"]), "canonical-repo-required")
    require(type(value.get("membership_epoch")) is int and value["membership_epoch"] > 0, "membership-epoch-required")
    route = value.get("route")
    require(isinstance(route, list) and route and all(isinstance(v, str) and v for v in route), "fixed-route-required")
    require(Path(route[0]).is_absolute(), "absolute-route-executable-required")
    require(Path(value["journal"]).is_absolute(), "absolute-private-journal-required")
    return value


class Client:
    def __init__(self, cfg):
        self.cfg = cfg
        self.root = Path(cfg["journal"])
        self.root.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.binding = hashlib.sha256(encoded({k: cfg[k] for k in (
            "mapping", "route", "scope_id", "authority_id", "membership_epoch", "home_id", "repo", "forge_host", "forge_repo_id")}).encode()).hexdigest()
        with (self.root / ".lock").open("a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as error:
                raise Refused("journal-busy-retry-same-request") from error
            identity = self.root / ".identity"
            if identity.exists():
                require(object_file(identity).get("binding") == self.binding, "journal-binding-conflict")
            else:
                require(not any(path.name != ".lock" for path in self.root.iterdir()), "unbound-nonempty-journal")
                self.save(identity, {"binding": self.binding})

    def transport(self, operation, payload):
        envelope = {"protocol": "coord.project.v1", "operation": operation, "payload": payload}
        data = encoded(envelope)
        require(len(data.encode()) <= 65536, "request-too-large")
        try:
            result = subprocess.run(self.cfg["route"], input=data, text=True, capture_output=True,
                                    timeout=8, check=False)
            require(result.returncode == 0, "authority-refused-or-unavailable")
            require(len(result.stdout.encode()) <= 131072, "authority-receipt-too-large")
            receipt = json.loads(result.stdout)
            require(isinstance(receipt, dict) and type(receipt.get("ok")) is bool, "invalid-authority-receipt")
            return receipt
        except (OSError, subprocess.TimeoutExpired, json.JSONDecodeError) as error:
            raise Refused("authority-unavailable-or-invalid") from error

    def discover(self):
        result = self.transport("authority-info", {})
        require(result.get("ok") is True and result.get("protocol") == "coord.project.v1"
                and type(result.get("schema_version")) is int and result["schema_version"] == 10
                and result.get("capability_profile") == "firstmate.scoped.v2"
                and result.get("authority_id") == self.cfg["authority_id"], "authority-profile-or-identity-mismatch")

    def contextual(self, payload):
        require(isinstance(payload, dict), "payload-object-required")
        require(not any(k in ("principal", "actor", "caller") or k.startswith("_") for k in payload), "transport-owned-identity-or-evidence")
        context = {k: self.cfg[k] for k in ("scope_id", "authority_id", "membership_epoch", "home_id", "repo", "forge_host", "forge_repo_id")}
        require(all(k not in payload or payload[k] == v for k, v in context.items()), "configured-scope-mismatch")
        return {**context, **payload}

    def save(self, path, value):
        data = encoded(value) + "\n"
        require(len(data.encode()) <= 262144, "journal-entry-too-large")
        descriptor, temporary = tempfile.mkstemp(prefix=".pending-", dir=self.root)
        try:
            with os.fdopen(descriptor, "w") as output:
                output.write(data)
                output.flush()
                os.fsync(output.fileno())
            os.replace(temporary, path)
            directory = os.open(self.root, os.O_RDONLY)
            try:
                os.fsync(directory)
            finally:
                os.close(directory)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)

    def request(self, operation, payload):
        require(operation in MUTATIONS | READS, "unsupported-operation")
        payload = self.contextual(payload)
        self.discover()
        if operation in READS:
            return self.transport(operation, payload)
        request_id = payload.get("request_id")
        require(isinstance(request_id, str) and 1 <= len(request_id) <= 128, "stable-request-id-required")
        key = hashlib.sha256(request_id.encode()).hexdigest()
        path = self.root / (key + ".json")
        entry = {"binding": self.binding, "operation": operation, "payload": payload}
        with (self.root / ".lock").open("a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as error:
                raise Refused("journal-busy-retry-same-request") from error
            if path.exists():
                previous = object_file(path, limit=262144)
                require(all(previous.get(k) == v for k, v in entry.items()), "journal-idempotency-or-binding-conflict")
            else:
                self.save(path, entry)
            # Always contact authority again: cached receipts never bypass revocation.
            receipt = self.transport(operation, payload)
            self.save(path, {**entry, "receipt": receipt})
            return receipt

    def checkpoint(self, request):
        """Cooperative pre-effect check only; no atomic external effect fence."""
        payload = request["payload"]
        expected = request["expected_revision"]
        require(isinstance(expected, dict) and set(expected) == {"base_oid", "head_oid"}, "exact-revision-required")
        require(all(isinstance(v, str) and re.fullmatch(r"[0-9a-f]{40}", v) for v in expected.values()), "full-oid-required")
        self.discover()
        bound = self.contextual(payload)
        # Base is bound by this home's immutable successful submit, not a live forge read.
        submissions = [object_file(path, limit=262144) for path in self.root.glob("*.json")]
        submissions = [entry for entry in submissions if entry.get("binding") == self.binding
            and entry.get("operation") == "submit" and entry.get("receipt", {}).get("ok") is True
            and entry["payload"].get("intent_id") == bound.get("intent_id")]
        require(len(submissions) == 1 and submissions[0]["payload"].get("base_oid") == expected["base_oid"], "submitted-base-mismatch-or-missing")
        inspect = self.transport("scope-inspect", {**bound, "limit": 1})
        require(inspect.get("ok") is True, "scope-inspection-refused")
        claims = [row for row in inspect.get("claims", []) if row.get("claim_id") == bound.get("claim_id")
                  and row.get("intent_id") == bound.get("intent_id") and row.get("home_id") == self.cfg["home_id"]
                  and row.get("generation") == bound.get("generation") and row.get("fence") == bound.get("fence")
                  and row.get("state") == "active"]
        require(len(claims) == 1, "claim-intent-binding-mismatch")
        live = self.transport("check", bound)
        require(live.get("ok") is True and live.get("claim_id") == bound.get("claim_id")
                and live.get("fence") == bound.get("fence") and live.get("head_oid") == expected["head_oid"], "stale-claim-or-head")
        return {"ok": True, "checkpoint": "cooperative-pre-effect", "revision": expected,
                "claim_id": bound["claim_id"], "fence": bound["fence"], "external_effect_executed": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--request", required=True, type=Path)
    args = parser.parse_args()
    try:
        request = object_file(args.request)
        require(request.get("contract") == CONTRACT, "client-contract-required")
        client = Client(config(args.config))
        receipt = client.checkpoint(request) if request.get("operation") == "checkpoint" else client.request(request["operation"], request["payload"])
        print(encoded({"contract": CONTRACT, "receipt": receipt}))
        return 0 if receipt.get("ok") is True else 1
    except (Refused, OSError, ValueError, KeyError, TypeError) as error:
        # No raw remote stdout/stderr or request bodies in error output.
        reason = str(error) if isinstance(error, Refused) else "invalid-config-request-or-journal"
        print(encoded({"contract": CONTRACT, "receipt": {"ok": False, "reason": reason}}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
