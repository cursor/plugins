import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

HOOK = Path(__file__).resolve().parents[1] / "hooks" / "stop-hook.sh"

class StopHookTest(unittest.TestCase):
    def run_hook(self, status="completed", prompt="Build the feature.", iteration=1, maximum=5):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / ".cursor/ralph/scratchpad.md"
            state.parent.mkdir(parents=True)
            initial = f'---\niteration: {iteration}\nmax_iterations: {maximum}\ncompletion_promise: null\n---\n\n{prompt}\n'
            state.write_text(initial)
            result = subprocess.run(["bash", str(HOOK)], input=json.dumps({"status": status, "loop_count": 0}), text=True, capture_output=True, env={**os.environ, "CURSOR_PROJECT_DIR": directory})
            self.assertEqual(result.returncode, 0, result.stderr)
            return result.stdout, state.read_text() if state.exists() else None, initial

    def test_aborted_and_error_do_not_restart_or_mutate_loop(self):
        for status in ("aborted", "error"):
            with self.subTest(status=status):
                output, state, initial = self.run_hook(status)
                self.assertEqual(output, "")
                self.assertEqual(state, initial)

    def test_completed_turn_continues(self):
        output, state, _ = self.run_hook()
        self.assertIn("Build the feature.", json.loads(output)["followup_message"])
        self.assertIn("iteration: 2\n", state)

    def test_completed_turn_still_honors_limit(self):
        output, state, _ = self.run_hook(iteration=5)
        self.assertEqual(output, "")
        self.assertIsNone(state)

if __name__ == "__main__":
    unittest.main()
