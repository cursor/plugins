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

    def test_iterations_preserve_prompt_metadata_and_markdown_rules(self):
        prompt = "Use this exact fixture:\niteration: 99\n---\niteration: 77\nKeep this."
        output, state, initial = self.run_hook(prompt=prompt)
        self.assertEqual(json.loads(output)["followup_message"].split("\n\n", 1)[1], "\n" + prompt)
        self.assertEqual(state, initial.replace("iteration: 1\n", "iteration: 2\n", 1))

    def test_body_iteration_line_is_not_rewritten(self):
        output, state, initial = self.run_hook(prompt="Fixture:\niteration: 99")
        self.assertEqual(state, initial.replace("iteration: 1\n", "iteration: 2\n", 1))

    def test_capture_reads_only_initial_frontmatter(self):
        with tempfile.TemporaryDirectory() as directory:
            state = Path(directory) / ".cursor/ralph/scratchpad.md"
            state.parent.mkdir(parents=True)
            state.write_text('---\niteration: 1\nmax_iterations: 5\ncompletion_promise: "DONE"\n---\nExample:\n---\ncompletion_promise: "OTHER"\n---\n')
            result = subprocess.run(["bash", str(HOOK.with_name("capture-response.sh"))], input=json.dumps({"text": "<promise>DONE</promise>"}), text=True, capture_output=True, env={**os.environ, "CURSOR_PROJECT_DIR": directory})
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(state.with_name("done").exists())

    def test_ordinary_prompt_continues(self):
        output, state, initial = self.run_hook()
        self.assertEqual(json.loads(output)["followup_message"].split("\n\n", 1)[1], "\nBuild the feature.")
        self.assertEqual(state, initial.replace("iteration: 1\n", "iteration: 2\n", 1))

if __name__ == "__main__":
    unittest.main()
