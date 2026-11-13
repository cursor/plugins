"""Optional real-endpoint fixtures; no bundled service or fake proof of ownership.

Only execute in separately approved Linux, with explicit clean owner source pin.
No private source, GitHub or credentials are downloaded. Effects are local mocks.
"""
import json
import multiprocessing as mp
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[1]
CLIENT = ROOT / "scripts/osb.py"
BASE, HEAD = "a" * 40, "b" * 40


def invoke(config, request):
    request_path = config.parent / ("request-" + str(uuid.uuid4()) + ".json")
    request_path.write_text(json.dumps({"contract": "pstack.osb.client.v1", **request}))
    process = subprocess.run([sys.executable, str(CLIENT), "--config", str(config),
                              "--request", str(request_path)], capture_output=True, text=True, timeout=20)
    return process.returncode, json.loads(process.stdout)["receipt"]


def compete(config, request, barrier, queue):
    barrier.wait(10)
    queue.put(invoke(Path(config), request))


@unittest.skipUnless(os.environ.get("OSB_TEST_OWNER_SOURCE") and os.environ.get("OSB_TEST_OWNER_COMMIT"),
                     "notexecuted: separately approved source/commit required")
class EndpointAcceptance(unittest.TestCase):
    def setUp(self):
        self.source = Path(os.environ["OSB_TEST_OWNER_SOURCE"]).resolve(strict=True)
        head = subprocess.check_output(["git", "-C", str(self.source), "rev-parse", "HEAD"], text=True).strip()
        self.assertEqual(head, os.environ["OSB_TEST_OWNER_COMMIT"])
        self.assertEqual(subprocess.check_output(["git", "-C", str(self.source), "status", "--porcelain", "--untracked-files=all"], text=True), "")
        self.temp = tempfile.TemporaryDirectory(prefix="pstack-osb-acceptance-")
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.db = str(self.directory / "authority.sqlite3")
        self.endpoint = str(self.source / "bin/fm-coord-endpoint.py")
        core = str(self.source / "bin/fm-coord.sh")
        subprocess.run(["bash", core, "--db", self.db, "init"], capture_output=True, check=True, timeout=10)
        subprocess.run(["bash", core, "--db", self.db, "scope-create", json.dumps({
            "request_id": "scope", "scope_id": "synthetic", "team_id": "synthetic-team", "repo": "fixture/repo",
            "forge_host": "github.com", "forge_repo_id": "10001", "initial_primary": "alice"})],
            capture_output=True, check=True, timeout=10)
        self.authority = self.direct("alice", "authority-info", {})["authority_id"]
        context = {"scope_id": "synthetic", "authority_id": self.authority}
        self.direct("alice", "scope-invite", {**context, "membership_epoch": 1, "request_id": "invite",
                    "invitation_id": "bob-invite", "target_principal": "bob", "role": "writer"})
        self.direct("bob", "scope-join", {**context, "request_id": "join", "invitation_id": "bob-invite"})
        self.configs, self.sessions = {}, {}
        for actor in ("alice", "bob"):
            actor_dir = self.directory / actor
            actor_dir.mkdir()
            cfg = {"contract": "pstack.osb.client.v1", "enabled": True, "mapping": "osb-firstmate.coord.project.v2",
                   "route": [sys.executable, self.endpoint, self.db, actor], "journal": str(actor_dir / "journal"),
                   **context, "membership_epoch": 1, "home_id": "home-" + actor, "repo": "fixture/repo",
                   "forge_host": "github.com", "forge_repo_id": "10001"}
            path = actor_dir / "config.json"
            path.write_text(json.dumps(cfg))
            self.configs[actor] = path
            self.assertTrue(self.call(actor, "enroll", {"repos": ["fixture/repo"]})["ok"])
            self.sessions[actor] = self.call(actor, "session", {})["generation"]

    def direct(self, actor, operation, payload):
        process = subprocess.run([sys.executable, self.endpoint, self.db, actor],
            input=json.dumps({"protocol": "coord.project.v1", "operation": operation, "payload": payload}),
            capture_output=True, text=True, check=True, timeout=10)
        result = json.loads(process.stdout)
        self.assertTrue(result["ok"], result)
        return result

    def call(self, actor, operation, payload, expected_exit=0):
        payload = {"request_id": str(uuid.uuid4()), **payload}
        if actor in self.sessions:
            payload = {"generation": self.sessions[actor], **payload}
        code, receipt = invoke(self.configs[actor], {"operation": operation, "payload": payload})
        self.assertEqual(code, expected_exit, receipt)
        return receipt

    def submit(self, actor):
        return self.call(actor, "submit", {"intent_id": "intent-" + actor, "base": "refs/heads/main",
            "base_oid": BASE, "branch": "fixture/" + actor, "task_id": "unit-" + actor,
            "goal": "Synthetic coordinated unit", "resources": [{"type": "file", "name": "src/shared.py"}]})

    def claim(self, actor, expected_exit=0, request_id=None):
        return self.call(actor, "claim", {"intent_id": "intent-" + actor, "version": 1,
            "request_id": request_id or str(uuid.uuid4())}, expected_exit)

    def live(self, actor, claim):
        return {"intent_id": "intent-" + actor, "claim_id": claim["claim_id"], "fence": claim["fence"]}

    def test_two_independent_coordinators_contention_and_safe_release(self):
        for actor in ("alice", "bob"):
            self.assertTrue(self.submit(actor)["ok"])
        context = mp.get_context("spawn")
        barrier, queue = context.Barrier(2), context.Queue()
        actors = ("alice", "bob")
        workers = [context.Process(target=compete, args=(str(self.configs[actor]), {
            "operation": "claim", "payload": {"generation": self.sessions[actor], "intent_id": "intent-" + actor,
                "version": 1, "request_id": "race-" + actor}}, barrier, queue)) for actor in actors]
        try:
            for worker in workers:
                worker.start()
            results = [queue.get(timeout=30) for _ in actors]
            for worker in workers:
                worker.join(30)
                self.assertFalse(worker.is_alive())
                self.assertEqual(worker.exitcode, 0)
            self.assertEqual(sorted(code for code, _ in results), [0, 1])
            self.assertEqual([r.get("reason") for code, r in results if code], ["scope-conflict"])
            # Recover each historical race receipt; only the winner is successful.
            granted = {}
            for actor in actors:
                code, receipt = invoke(self.configs[actor], {"operation": "claim", "payload": {
                    "generation": self.sessions[actor], "intent_id": "intent-" + actor, "version": 1,
                    "request_id": "race-" + actor}})
                if code == 0:
                    granted[actor] = receipt
            self.assertEqual(len(granted), 1)
            winner, claim = next(iter(granted.items()))
            loser = "bob" if winner == "alice" else "alice"
            self.call(loser, "release", self.live(winner, claim), expected_exit=1)
            self.assertTrue(self.call(winner, "check", self.live(winner, claim))["ok"])
            self.assertTrue(self.call(winner, "release", self.live(winner, claim))["ok"])
            successor = self.claim(loser)
            self.assertGreater(successor["fence"], claim["fence"])
        finally:
            for worker in workers:
                if worker.is_alive():
                    worker.terminate()
                    worker.join(5)
            queue.close()

    def test_lost_ack_retry_and_revocation(self):
        self.submit("alice")
        path = self.configs["alice"]
        cfg = json.loads(path.read_text())
        cfg["route"] = [sys.executable, str(ROOT / "tests/drop_reply.py"), str(self.directory / "drop-once"), self.endpoint, self.db, "alice"]
        cfg["journal"] = str(self.directory / "relay-journal")
        path.write_text(json.dumps(cfg))
        first = self.claim("alice", expected_exit=1, request_id="lost-claim")
        self.assertEqual(first["reason"], "authority-refused-or-unavailable")
        grant = self.claim("alice", request_id="lost-claim")
        self.assertEqual(grant, self.claim("alice", request_id="lost-claim"))
        # A new session invalidates the former claim; replay remains historical.
        self.sessions["alice"] = self.call("alice", "session", {})["generation"]
        stale = self.call("alice", "check", self.live("alice", grant), expected_exit=1)
        self.assertFalse(stale["ok"])

    def test_revision_checkpoint_and_unavailable_authority_no_effect(self):
        self.submit("alice")
        grant = self.claim("alice")
        live = self.live("alice", grant)
        self.call("alice", "publish-head", {**live, "head_oid": HEAD, "expected_previous_oid": None})
        effects = self.directory / "mock-effects.jsonl"
        for base, head, code in (("c" * 40, HEAD, 1), (BASE, "c" * 40, 1), (BASE, HEAD, 0)):
            result, receipt = invoke(self.configs["alice"], {"operation": "checkpoint",
                "payload": {**live, "generation": self.sessions["alice"]}, "expected_revision": {"base_oid": base, "head_oid": head}})
            self.assertEqual(result, code, receipt)
            if result == 0:
                with effects.open("a") as output:
                    output.write(json.dumps(receipt) + "\n")
        self.assertEqual(len(effects.read_text().splitlines()), 1)
        cfg = json.loads(self.configs["alice"].read_text())
        cfg["route"] = ["/nonexistent/authority-route"]
        cfg["journal"] = str(self.directory / "unavailable-journal")
        self.configs["alice"].write_text(json.dumps(cfg))
        result, receipt = invoke(self.configs["alice"], {"operation": "checkpoint", "payload": live,
            "expected_revision": {"base_oid": BASE, "head_oid": HEAD}})
        self.assertEqual(result, 1, receipt)
        self.assertEqual(len(effects.read_text().splitlines()), 1)

    def test_large_accepted_request_retry(self):
        request = {"request_id": "large-submit", "intent_id": "intent-large", "base": "refs/heads/main",
            "base_oid": BASE, "branch": "fixture/large", "task_id": "unit-large", "goal": "Large synthetic request",
            "expected_artifacts": ["x" * 60000],
            "resources": [{"type": "file", "name": "src/" + str(index) + "x" * 40} for index in range(50)]}
        first = self.call("alice", "submit", request)
        self.assertTrue(first["ok"], first)
        self.assertEqual(first, self.call("alice", "submit", request))
        journal = Path(json.loads(self.configs["alice"].read_text())["journal"])
        self.assertTrue(any(path.stat().st_size > 65536 for path in journal.glob("*.json")))

    def test_oversized_native_envelope_does_not_poison_key(self):
        request = {"request_id": "oversized-submit", "intent_id": "intent-oversized", "base": "refs/heads/main",
            "base_oid": BASE, "branch": "fixture/oversized", "task_id": "unit-oversized", "goal": "Synthetic boundary",
            "generation": self.sessions["alice"], "expected_artifacts": [""],
            "resources": [{"type": "file", "name": "src/boundary.py"}]}
        envelope = {"contract": "pstack.osb.client.v1", "operation": "submit", "payload": request}
        request["expected_artifacts"] = ["x" * (65536 - len(json.dumps(envelope).encode()) - 16)]
        self.assertLessEqual(len(json.dumps(envelope).encode()), 65536)
        cfg = json.loads(self.configs["alice"].read_text())
        context = {key: cfg[key] for key in ("scope_id", "authority_id", "membership_epoch", "home_id", "repo", "forge_host", "forge_repo_id")}
        native = {"protocol": "coord.project.v1", "operation": "submit", "payload": {**context, **request}}
        self.assertGreater(len(json.dumps(native, sort_keys=True, separators=(",", ":")).encode()), 65536)
        journal = Path(cfg["journal"])
        before = sorted(path.name for path in journal.glob("*.json"))
        refused = self.call("alice", "submit", request, expected_exit=1)
        self.assertEqual(refused["reason"], "request-too-large")
        self.assertEqual(before, sorted(path.name for path in journal.glob("*.json")))
        # No request was dispatched or committed, so a corrected same key is valid.
        request["expected_artifacts"] = ["small"]
        accepted = self.call("alice", "submit", request)
        self.assertTrue(accepted["ok"], accepted)
        self.assertEqual(accepted, self.call("alice", "submit", request))
        self.assertEqual(len(self.call("alice", "scope-inspect", {})["intents"]), 1)


if __name__ == "__main__":
    if not os.environ.get("OSB_TEST_OWNER_SOURCE") or not os.environ.get("OSB_TEST_OWNER_COMMIT"):
        print("notexecuted: approved source and commit required", file=sys.stderr)
        raise SystemExit(2)
    unittest.main(verbosity=2)
