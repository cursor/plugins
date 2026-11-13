"""Exercise the documented PTY snippet against local subprocesses only."""
import re
import subprocess
import sys
import unittest
from pathlib import Path


class PtyHarnessTest(unittest.TestCase):
    def run_harness(self, child, timeout=4):
        skill = Path(__file__).resolve().parents[1] / "SKILL.md"
        snippet = re.search(r"```python\n(.*?)\n```", skill.read_text(), re.S)[1]
        snippet = snippet.replace(
            '["<command>", "<arg>"]', repr([sys.executable, "-u", "-c", child])
        ).replace("<ready text>", "READY>").replace("<reply text>", "DONE_REPLY")
        snippet = snippet.replace("+ 30", "+ " + str(timeout))
        return subprocess.run(
            [sys.executable, "-c", snippet], capture_output=True, text=True,
            timeout=timeout + 5, check=True,
        ).stdout

    def test_echo_and_idle_do_not_complete_a_delayed_reply(self):
        output = self.run_harness('''
import sys, termios, time
assert termios.tcgetattr(0)[3] & termios.ECHO
print("ECHO_ENABLED READY>", flush=True)
assert input() == "help"
time.sleep(0.8)
print("working", flush=True)
time.sleep(0.5)
print("DONE_", end="", flush=True)
time.sleep(0.5)
print("REPLY", flush=True)
time.sleep(10)
''')
        self.assertIn("ECHO_ENABLED", output)
        self.assertIn("help", output)  # Default PTY echo really occurred.
        self.assertIn("working", output)
        self.assertIn("DONE_REPLY", output)

    def test_child_exit_retains_its_final_output(self):
        output = self.run_harness('''
print("READY>", flush=True)
assert input() == "help"
print("final output", flush=True)
''')
        self.assertIn("final output", output)

    def test_echo_without_a_reply_waits_for_deadline(self):
        import time
        started = time.monotonic()
        output = self.run_harness('''
import time
print("READY>", flush=True)
assert input() == "help"
time.sleep(10)
''', timeout=0.8)
        self.assertIn("help", output)
        self.assertNotIn("DONE_REPLY", output)
        self.assertGreaterEqual(time.monotonic() - started, 0.7)


if __name__ == "__main__":
    unittest.main()
