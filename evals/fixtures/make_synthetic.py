#!/usr/bin/env python3
"""Regenerate the synthetic Claude stream-json transcripts used by test_harness.py.

Event shapes follow claude-trivial.stream.jsonl (a real `claude -p --output-format stream-json
--verbose` call on Claude Code 2.1.238) for system/init, assistant and result events. The user
tool_result shape and the Agent tool's input keys come from a real Claude Code session transcript
of the previous bug-fix run, which uses the same message.content structure.
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SID = "00000000-0000-4000-8000-000000000001"
CWD = "/tmp/pstack-eval-synthetic/work"
RR = "python3 .claude/skills/poteto-mode/scripts/run-record.py"


class T:
    def __init__(self):
        self.events, self.n, self.sec = [], 0, 0

    def ts(self):
        self.sec += 7
        return f"2026-09-10T12:{self.sec // 60:02d}:{self.sec % 60:02d}.000Z"

    def uid(self):
        self.n += 1
        return f"00000000-0000-4000-8000-{self.n:012d}"

    def init(self):
        self.events.append({"type": "system", "subtype": "init", "cwd": CWD, "session_id": SID,
                            "tools": ["Agent", "Bash", "Edit", "Read", "Skill", "Write"], "mcp_servers": [],
                            "model": "claude-opus-5[1m]", "permissionMode": "bypassPermissions",
                            "slash_commands": ["poteto-mode"], "apiKeySource": "none",
                            "claude_code_version": "2.1.238", "output_style": "default",
                            "agents": ["pstack-worker", "pstack-reviewer", "comment-sicko"], "skills": [],
                            "plugins": [], "uuid": self.uid()})

    def call(self, name, inp, result, is_error=False, parent=None):
        tid = f"toolu_{self.uid()[-12:]}"
        self.events.append({"type": "assistant", "message": {
            "model": "claude-opus-5", "id": f"msg_{self.uid()[-12:]}", "type": "message", "role": "assistant",
            "content": [{"type": "tool_use", "id": tid, "name": name, "input": inp}],
            "stop_reason": None, "stop_sequence": None,
            "usage": {"input_tokens": 3, "cache_creation_input_tokens": 400, "cache_read_input_tokens": 30000,
                      "output_tokens": 120, "service_tier": "standard"}},
            "parent_tool_use_id": parent, "session_id": SID, "uuid": self.uid(), "timestamp": self.ts(),
            "request_id": f"req_{self.uid()[-12:]}"})
        self.events.append({"type": "user", "message": {"role": "user", "content": [
            {"tool_use_id": tid, "type": "tool_result", "content": result, "is_error": is_error}]},
            "parent_tool_use_id": parent, "session_id": SID, "uuid": self.uid(), "timestamp": self.ts()})
        return tid

    def text(self, text):
        self.events.append({"type": "assistant", "message": {
            "model": "claude-opus-5", "id": f"msg_{self.uid()[-12:]}", "type": "message", "role": "assistant",
            "content": [{"type": "text", "text": text}], "stop_reason": None,
            "usage": {"input_tokens": 2, "output_tokens": 50}},
            "parent_tool_use_id": None, "session_id": SID, "uuid": self.uid(), "timestamp": self.ts()})

    def result(self, cost, turns, spawned):
        self.events.append({"type": "result", "subtype": "success", "is_error": False, "duration_ms": 1500000,
                            "duration_api_ms": 900000, "num_turns": turns, "stop_reason": "end_turn",
                            "session_id": SID, "total_cost_usd": cost,
                            "usage": {"input_tokens": 120, "cache_creation_input_tokens": 90000,
                                      "cache_read_input_tokens": 2400000, "output_tokens": 45000},
                            "modelUsage": {"claude-opus-5[1m]": {"inputTokens": 120, "outputTokens": 45000,
                                                                 "cacheReadInputTokens": 2400000,
                                                                 "cacheCreationInputTokens": 90000, "costUSD": cost}},
                            "permission_denials": [], "terminal_reason": "completed",
                            "subagent_stats": {"spawned": spawned}, "result": "done", "uuid": self.uid()})

    def write(self, name):
        (HERE / name).write_text("".join(json.dumps(e) + "\n" for e in self.events))


def conforming():
    t = T()
    t.init()
    t.call("Bash", {"command": "cat .pstack/host.json 2>/dev/null; cat .pstack/mode.md", "description": "Read pstack host config"},
           "active: true")
    t.call("Read", {"file_path": f"{CWD}/.claude/skills/poteto-mode/playbooks/bug-fix.md"}, "### Bug fix ...")
    t.call("Bash", {"command": f'{RR} init --route bug-fix --task "restart re-welcomes"'},
           "run 20260910T120000-bug-fix started.")
    t.call("Write", {"file_path": f"{CWD}/tests/test_webhook.py", "content": "def test_restart(): ..."},
           "File created successfully")
    t.call("Bash", {"command": "python3 run_tests.py 2>&1 | tee /tmp/repro.txt"},
           "Exit code 1\n  FAIL  test_restart_does_not_rewelcome: got ['ada@example.com', 'ada@example.com']\n\nFAILED: 1 failing",
           is_error=True)
    t.call("Bash", {"command": 'git add tests/test_webhook.py && git commit -m "test(webhook): cover restart"'},
           "[main 1111111] test(webhook): cover restart")
    t.call("Bash", {"command": f'RR="{RR}"; $RR baseline --harness tests/test_webhook.py --command "python3 run_tests.py" '
                               f'--output /tmp/repro.txt && $RR evidence --kind repro --result fail --output /tmp/repro.txt '
                               f'&& $RR phase reproduce --done'},
           "baseline 1111111, harness frozen\nrepro fail recorded\nphase reproduce: done")
    t.call("Agent", {"subagent_type": "pstack-reviewer", "description": "how: webhook claim", "model": "sonnet",
                     "run_in_background": True, "prompt": "Explain how the claim in src/webhook.py works. Do not modify files."},
           "Async agent launched successfully. agentId: a1")
    t.call("Agent", {"subagent_type": "pstack-reviewer", "description": "why: regression history", "model": "sonnet",
                     "run_in_background": True, "prompt": "Reconstruct the regression history of the dedupe."},
           "Async agent launched successfully. agentId: a2")
    t.call("Bash", {"command": f'{RR} phase root-cause --done && {RR} phase plan --skip "fix confined to one module"'},
           "phase root-cause: done\nphase plan: skip")
    impl = t.call("Agent", {"subagent_type": "pstack-worker", "description": "implement durable claim", "model": "opus",
                            "run_in_background": False, "isolation": "worktree",
                            "prompt": "Implement the durable claim in src/webhook.py. Failing check: python3 run_tests.py."},
                  "Implemented the durable claim; run_tests.py passes.")
    # Delegate tool calls follow their spawn, as stream-json carries them with parent_tool_use_id set.
    t.call("Read", {"file_path": f"{CWD}/src/webhook.py"}, "...", parent=impl)
    t.call("Edit", {"file_path": f"{CWD}/src/webhook.py", "old_string": "_claimed", "new_string": "_ledger"},
           "The file has been updated", parent=impl)
    t.call("Bash", {"command": "python3 run_tests.py"}, "  PASS  test_restart\n\nOK: 0 failing", parent=impl)
    t.call("Bash", {"command": f"{RR} delegate --role worker --model opus --job implement && {RR} phase implement --done"},
           "delegate implement on opus recorded\nphase implement: done")
    t.call("Read", {"file_path": f"{CWD}/.claude/skills/no-comments/SKILL.md"}, "# no-comments ...")
    t.call("Agent", {"subagent_type": "comment-sicko", "description": "comment audit on the fix", "model": "sonnet",
                     "run_in_background": False, "prompt": "Audit comments in src/webhook.py."}, "No slop found.")
    t.call("Bash", {"command": f"{RR} phase cleanup --done"}, "phase cleanup: done")
    t.call("Read", {"file_path": f"{CWD}/.claude/skills/interrogate/SKILL.md"}, "# interrogate ...")
    t.call("Agent", {"subagent_type": "pstack-reviewer", "description": "interrogate: operator reviewer", "model": "opus",
                     "run_in_background": False, "prompt": "What does a crash between every pair of lines do to a delivery?"},
           "Verdict: ship.")
    t.call("Bash", {"command": f"{RR} evidence --kind review --result pass --output /tmp/review.txt && {RR} phase review --done"},
           "review pass recorded\nphase review: done")
    t.call("Bash", {"command": "python3 run_tests.py > /tmp/verify.txt 2>&1; cat /tmp/verify.txt"},
           "  PASS  test_restart\n\nOK: 0 failing")
    t.call("Bash", {"command": f"{RR} evidence --kind verify --result pass --output /tmp/verify.txt && {RR} phase verify --done"},
           "verify pass recorded\nphase verify: done")
    t.call("Bash", {"command": 'git add src/webhook.py && git commit -m "fix(webhook): keep the welcome ledger on disk"'},
           "[main 2222222] fix(webhook): keep the welcome ledger on disk")
    t.call("Bash", {"command": f"{RR} phase commits --done && {RR} check --through commits"},
           "phase commits: done\ncomplete through commits: run 20260910T120000-bug-fix has current evidence for every required phase")
    t.text("Fixed. Audit block: ...")
    t.result(cost=18.25, turns=40, spawned=5)
    t.write("claude-conforming.stream.jsonl")


def violating():
    t = T()
    t.init()
    t.call("Bash", {"command": "cat src/webhook.py"}, "...")
    t.call("Bash", {"command": "cat > src/webhook.py <<'EOF'\nimport sqlite3\n_db = 'welcome.db'\nEOF"}, "")
    t.call("Write", {"file_path": f"{CWD}/tests/test_webhook.py", "content": "def test_restart(): ..."},
           "File created successfully")
    t.call("Bash", {"command": "python3 run_tests.py"}, "  PASS  test_restart\n\nOK: 0 failing")
    t.call("Bash", {"command": 'git add -A && git commit -m "fix webhook and add tests"'}, "[main 3333333] fix webhook and add tests")
    t.call("Edit", {"file_path": f"{CWD}/src/webhook.py", "old_string": "welcome.db", "new_string": "state.db"},
           "The file has been updated")
    t.text("Done.")
    t.result(cost=2.10, turns=8, spawned=0)
    t.write("claude-violating.stream.jsonl")


if __name__ == "__main__":
    conforming()
    violating()
    print("wrote claude-conforming.stream.jsonl and claude-violating.stream.jsonl")
