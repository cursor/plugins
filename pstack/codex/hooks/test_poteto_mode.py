#!/usr/bin/env python3
"""Black-box tests for the Poteto Mode lifecycle hook."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest


SCRIPT = Path(__file__).with_name("poteto_mode.py")


class PotetoModeHookTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        self.environment = {
            **os.environ,
            "PLUGIN_DATA": self.temporary_directory.name,
        }

    def run_hook(
        self,
        event: dict[str, object],
        *,
        environment: dict[str, str] | None = None,
    ) -> dict[str, object] | None:
        completed = subprocess.run(
            ["/usr/bin/python3", str(SCRIPT)],
            input=json.dumps(event),
            text=True,
            capture_output=True,
            check=False,
            env=environment if environment is not None else self.environment,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        return json.loads(completed.stdout) if completed.stdout else None

    def test_activation_persists_and_opt_out_clears(self) -> None:
        activation = self.run_hook(
            {
                "session_id": "thread-one",
                "hook_event_name": "UserPromptSubmit",
                "prompt": "Use $pstack:poteto-mode for this refactor.",
            }
        )
        self.assertEqual(
            activation["hookSpecificOutput"]["hookEventName"],
            "UserPromptSubmit",
        )

        restored = self.run_hook(
            {
                "session_id": "thread-one",
                "hook_event_name": "SessionStart",
                "source": "compact",
            }
        )
        self.assertEqual(
            restored["hookSpecificOutput"]["hookEventName"],
            "SessionStart",
        )

        cleared = self.run_hook(
            {
                "session_id": "thread-one",
                "hook_event_name": "UserPromptSubmit",
                "prompt": "Turn off poteto mode.",
            }
        )
        self.assertIsNone(cleared)
        self.assertIsNone(
            self.run_hook(
                {
                    "session_id": "thread-one",
                    "hook_event_name": "SessionStart",
                    "source": "resume",
                }
            )
        )

    def test_state_is_isolated_by_session(self) -> None:
        self.run_hook(
            {
                "session_id": "thread-one",
                "hook_event_name": "UserPromptSubmit",
                "prompt": "$pstack:poteto-mode",
            }
        )
        self.assertIsNone(
            self.run_hook(
                {
                    "session_id": "thread-two",
                    "hook_event_name": "SessionStart",
                    "source": "resume",
                }
            )
        )

    def test_unrelated_prompt_does_not_activate(self) -> None:
        self.assertIsNone(
            self.run_hook(
                {
                    "session_id": "thread-three",
                    "hook_event_name": "UserPromptSubmit",
                    "prompt": "Please fix this typo.",
                }
            )
        )

    def test_missing_plugin_data_or_session_fails_closed(self) -> None:
        environment = {**self.environment}
        environment.pop("PLUGIN_DATA")
        self.assertIsNone(
            self.run_hook(
                {
                    "session_id": "thread-four",
                    "hook_event_name": "UserPromptSubmit",
                    "prompt": "$pstack:poteto-mode",
                },
                environment=environment,
            )
        )
        self.assertIsNone(
            self.run_hook(
                {
                    "hook_event_name": "UserPromptSubmit",
                    "prompt": "$pstack:poteto-mode",
                }
            )
        )

    def test_corrupt_or_expired_state_is_ignored(self) -> None:
        state_directory = Path(self.temporary_directory.name) / "poteto-mode"
        state_directory.mkdir()
        session_id = "thread-five"
        state_path = state_directory / (
            hashlib.sha256(session_id.encode("utf-8")).hexdigest() + ".json"
        )
        state_path.write_text("not json\n", encoding="utf-8")
        self.assertIsNone(
            self.run_hook(
                {
                    "session_id": session_id,
                    "hook_event_name": "SessionStart",
                    "source": "resume",
                }
            )
        )

        state_path.write_text(
            json.dumps(
                {
                    "version": 1,
                    "active": True,
                    "updated_at": time.time() - 31 * 24 * 60 * 60,
                }
            ),
            encoding="utf-8",
        )
        self.assertIsNone(
            self.run_hook(
                {
                    "session_id": session_id,
                    "hook_event_name": "SessionStart",
                    "source": "resume",
                }
            )
        )


if __name__ == "__main__":
    unittest.main()
