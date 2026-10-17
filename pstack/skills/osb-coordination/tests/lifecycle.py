"""Real-authority local lifecycle fixtures with a MOCK publisher, not PStack proof.

Execute only on a separately authorized Linux executor with supplied owner pin.
"""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time
import unittest

import acceptance

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts/run_local_verifier.py"
COMMANDS = ROOT / "tests/local_commands.py"


@unittest.skipUnless(os.environ.get("OSB_TEST_OWNER_SOURCE") and os.environ.get("OSB_TEST_OWNER_COMMIT"),
                     "notexecuted: separately approved source/commit required")
class Lifecycle(unittest.TestCase):
    def setUp(self):
        self.endpoint = acceptance.EndpointAcceptance("test_lost_ack_retry_and_revocation")
        self.addCleanup(self.endpoint.doCleanups)
        self.endpoint.setUp()
        self.directory = self.endpoint.directory
        self.worktree = self.directory / "worktree"
        self.worktree.mkdir()
        self.git("init", "-b", "main")
        self.git("remote", "add", "origin", "https://github.com/fixture/repo.git")
        (self.worktree / "src").mkdir()
        (self.worktree / "src/shared.py").write_text("first\n")
        self.git("add", "src/shared.py")
        self.git("-c", "core.hooksPath=/dev/null", "commit", "-m", "synthetic base")
        base = self.git("rev-parse", "HEAD")
        self.git("checkout", "-b", "fixture/alice")
        (self.worktree / "src/shared.py").write_text("second\n")
        self.git("add", "src/shared.py")
        self.git("-c", "core.hooksPath=/dev/null", "commit", "-m", "synthetic head")
        head = self.git("rev-parse", "HEAD")
        self.marker, self.effects = self.directory / "worker.json", self.directory / "effects.jsonl"
        self.cfg_path = self.endpoint.configs["alice"]
        self.cfg = json.loads(self.cfg_path.read_text())
        self.cfg.update(local_verifier_enabled=True, generation=self.endpoint.sessions["alice"],
            local_verifier=[sys.executable, str(COMMANDS), "worker", str(self.marker), "success"],
            orch_route=[sys.executable, str(COMMANDS), "publisher", str(self.effects), "success"],
            success_verdict="unit-test-verified", worker_timeout_seconds=10,
            run_directory=str(self.directory / "runs"), orch_store=str(self.directory / "store"))
        self.initialize_mock_store()
        self.spec = {"attempt": "synthetic-check-1", "unit": "unit-alice", "pr": 42,
            "worktree": str(self.worktree), "branch": "fixture/alice", "base": "refs/heads/main",
            "base_oid": base, "head_oid": head, "resources": [{"type": "file", "name": "src/shared.py"}]}
        self.spec_path = self.directory / "spec.json"

    def git(self, *args):
        environment = {**os.environ, "GIT_AUTHOR_NAME": "Synthetic Fixture", "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
                       "GIT_COMMITTER_NAME": "Synthetic Fixture", "GIT_COMMITTER_EMAIL": "fixture@example.invalid"}
        return subprocess.check_output(["git", "-C", str(self.worktree), *args], text=True, env=environment, timeout=10).strip()

    def initialize_mock_store(self):
        store = Path(self.cfg["orch_store"])
        store.mkdir(mode=0o700, exist_ok=True)
        (store / "mock-initialized.json").write_text("synthetic-initialized\n")

    def launch(self, fault=None):
        self.cfg_path.write_text(json.dumps(self.cfg))
        self.spec_path.write_text(json.dumps(self.spec))
        command = [sys.executable, str(RUNNER)] if fault is None else [sys.executable, str(ROOT / "tests/acquisition_fault.py"), fault]
        process = subprocess.Popen([*command, "--config", str(self.cfg_path), "--spec", str(self.spec_path)],
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(self.cleanup_process, process)
        return process

    def cleanup_process(self, process):
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=20)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)

    def result(self, process, expected_code):
        stdout, stderr = process.communicate(timeout=45)
        self.assertEqual(process.returncode, expected_code, stderr + stdout)
        return json.loads(stdout)

    def wait_for_worker(self, process):
        deadline = time.monotonic() + 15
        while not self.marker.exists():
            self.assertIsNone(process.poll(), "runner exited before worker")
            self.assertLess(time.monotonic(), deadline, "worker never launched")
            time.sleep(0.05)

    def test_success_records_exact_head_and_refuses_repeat(self):
        receipt = self.result(self.launch(), 0)
        self.assertEqual((receipt["outcome"], receipt["effect"], receipt["release"]), ("pass", "confirmed", "confirmed"))
        args = json.loads(self.effects.read_text().strip())
        self.assertEqual(args[2:7], ["ledger", "record", "42", self.spec["head_oid"], "unit-test-verified"])
        evidence = json.loads(Path(args[-1]).read_text())
        self.assertEqual(evidence["revision"]["base_oid"], self.spec["base_oid"])
        self.assertEqual(evidence["command_exit"], 0)
        self.assertEqual(self.result(self.launch(), 1)["reason"], "prior-launch-requires-explicit-reconciliation")
        self.assertEqual(len(self.effects.read_text().splitlines()), 1)
        claims = self.endpoint.call("alice", "scope-inspect", {})["claims"]
        self.assertTrue(claims)
        self.assertFalse(any(row["state"] == "active" for row in claims))

    def test_conflict_and_unavailable_route_launch_nothing(self):
        self.endpoint.submit("bob")
        self.endpoint.claim("bob")
        self.assertEqual(self.result(self.launch(), 1)["reason"], "claim-refused")
        self.assertFalse(self.marker.exists())
        self.assertFalse(self.effects.exists())
        self.spec["attempt"] = "synthetic-unavailable"
        self.cfg["route"] = ["/nonexistent/authority"]
        self.cfg["journal"] = str(self.directory / "unavailable-journal")
        self.assertEqual(self.result(self.launch(), 1)["outcome"], "setupfailed")
        self.assertFalse(self.marker.exists())
        self.assertFalse(self.effects.exists())

    def test_cancel_quiesces_worker_before_release(self):
        self.cfg["local_verifier"][-1] = "wait"
        process = self.launch()
        self.wait_for_worker(process)
        worker_pid = json.loads(self.marker.read_text())["pid"]
        process.send_signal(signal.SIGTERM)
        receipt = self.result(process, 1)
        self.assertEqual((receipt["outcome"], receipt["effect"], receipt["release"]), ("cancelled", "not-started", "confirmed"))
        self.assertFalse(self.effects.exists())
        with self.assertRaises(ProcessLookupError):
            os.kill(worker_pid, 0)

    def test_revoked_generation_blocks_verdict(self):
        self.cfg["local_verifier"][-1] = "wait"
        process = self.launch()
        self.wait_for_worker(process)
        self.endpoint.sessions["alice"] = self.endpoint.call("alice", "session", {})["generation"]
        self.marker.with_suffix(".continue").write_text("finish\n")
        receipt = self.result(process, 1)
        self.assertEqual(receipt["outcome"], "behaviorfailure")
        self.assertEqual(receipt["effect"], "not-started")
        self.assertNotEqual(receipt["release"], "confirmed")
        self.assertFalse(self.effects.exists())

    def test_unknown_publication_is_not_retried(self):
        self.cfg["orch_route"][-1] = "unknown"
        receipt = self.result(self.launch(), 1)
        self.assertEqual((receipt["outcome"], receipt["effect"], receipt["release"]), ("behaviorfailure", "unknown", "confirmed"))
        self.assertEqual(len(self.effects.read_text().splitlines()), 1)
        self.assertEqual(self.result(self.launch(), 1)["reason"], "prior-launch-requires-explicit-reconciliation")
        self.assertEqual(len(self.effects.read_text().splitlines()), 1)

    def test_lost_claim_ack_resumes_same_acquisition_once(self):
        self.cfg["route"] = [sys.executable, str(ROOT / "tests/drop_reply.py"), str(self.directory / "drop-once"), self.endpoint.endpoint, self.endpoint.db, "alice"]
        self.cfg["journal"] = str(self.directory / "relay-journal")
        first = self.result(self.launch(), 1)
        self.assertEqual(first["outcome"], "setupfailed")
        self.assertEqual(first["release"], "no-known-claim-identical-acquisition-replay-or-reconcile")
        self.assertFalse(self.marker.exists())
        states = list(Path(self.cfg["run_directory"]).glob("*/state.json"))
        self.assertEqual(len(states), 1)
        self.assertEqual(json.loads(states[0].read_text())["phase"], "acquiring")
        receipt = self.result(self.launch(), 0)
        self.assertEqual(receipt["effect"], "confirmed")
        self.assertEqual(len(self.effects.read_text().splitlines()), 1)

    def test_missing_empty_and_invalid_store_fail_before_acquisition_then_same_attempt_succeeds(self):
        executable = self.cfg["local_verifier"][0]
        self.cfg["local_verifier"][0] = "/nonexistent/operator-verifier"
        self.assertEqual(self.result(self.launch(), 1)["reason"], "operator-command-unavailable")
        self.assertFalse(self.marker.exists())
        self.assertFalse(self.effects.exists())
        self.assertFalse(any(Path(self.cfg["run_directory"]).glob("*/state.json")))
        self.assertEqual(self.endpoint.call("alice", "scope-inspect", {})["claims"], [])
        self.cfg["local_verifier"][0] = executable
        for name, contents in (("missing", None), ("empty", ""), ("invalid", "malformed\n")):
            with self.subTest(store=name):
                self.cfg["orch_store"] = str(self.directory / ("store-" + name))
                store = Path(self.cfg["orch_store"])
                if contents is not None:
                    store.mkdir(mode=0o700)
                    if contents:
                        (store / "mock-initialized.json").write_text(contents)
                receipt = self.result(self.launch(), 1)
                self.assertEqual(receipt["outcome"], "setupfailed")
                self.assertEqual(receipt["reason"], "orch-store-missing" if contents is None else "orch-store-preflight-refused")
                if contents is None:
                    self.assertFalse(store.exists())
                self.assertFalse(self.marker.exists())
                self.assertFalse(self.effects.exists())
                self.assertFalse(any(Path(self.cfg["run_directory"]).glob("*/state.json")))
                self.assertEqual(self.endpoint.call("alice", "scope-inspect", {})["claims"], [])
        # The same attempt can now pass: no journaled dispatch binding was committed.
        self.initialize_mock_store()
        self.assertEqual(self.result(self.launch(), 0)["effect"], "confirmed")
        self.assertEqual(len(self.effects.read_text().splitlines()), 1)

    def test_bound_signals_and_write_failure_release_without_launch(self):
        for fault in ("before-bound-signal", "after-bound-signal", "bound-write-error"):
            with self.subTest(fault=fault):
                self.spec["attempt"] = "synthetic-" + fault
                receipt = self.result(self.launch(fault=fault), 1)
                self.assertEqual(receipt["outcome"], "setupfailed" if fault == "bound-write-error" else "cancelled")
                self.assertEqual(receipt["effect"], "not-started")
                self.assertEqual(receipt["release"], "confirmed")
                self.assertFalse(self.marker.exists())
                self.assertFalse(self.effects.exists())
                claims = self.endpoint.call("alice", "scope-inspect", {})["claims"]
                self.assertFalse(any(row["state"] == "active" for row in claims))
                self.assertEqual(self.result(self.launch(), 1)["reason"], "prior-launch-requires-explicit-reconciliation")
        self.spec["attempt"] = "synthetic-after-cleanup"
        self.assertEqual(self.result(self.launch(), 0)["effect"], "confirmed")

    def test_timeout_quiesces_without_verdict(self):
        self.cfg["local_verifier"][-1] = "wait"
        self.cfg["worker_timeout_seconds"] = 1
        receipt = self.result(self.launch(), 1)
        self.assertEqual((receipt["outcome"], receipt["reason"], receipt["effect"], receipt["release"]),
                         ("behaviorfailure", "verifier-timeout", "not-started", "confirmed"))
        self.assertFalse(self.effects.exists())

    def test_heartbeat_uses_real_authority_before_completion(self):
        self.cfg["local_verifier"][-1] = "wait"
        self.cfg["worker_timeout_seconds"] = 45
        process = self.launch()
        self.wait_for_worker(process)
        deadline = time.monotonic() + 40
        journal = Path(self.cfg["journal"])
        while True:
            entries = [json.loads(path.read_text()) for path in journal.glob("*.json")]
            renewals = [entry for entry in entries if entry.get("operation") == "renew" and entry.get("receipt", {}).get("ok") is True]
            if renewals:
                break
            self.assertIsNone(process.poll(), "runner exited before heartbeat")
            self.assertLess(time.monotonic(), deadline, "no acknowledged heartbeat")
            time.sleep(0.1)
        self.marker.with_suffix(".continue").write_text("finish\n")
        self.assertEqual(self.result(process, 0)["effect"], "confirmed")


if __name__ == "__main__":
    if not os.environ.get("OSB_TEST_OWNER_SOURCE") or not os.environ.get("OSB_TEST_OWNER_COMMIT"):
        print("notexecuted: approved source and commit required", file=sys.stderr)
        raise SystemExit(2)
    unittest.main(verbosity=2)
