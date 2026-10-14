import json

import pytest

from pstack_cli.observe.model import SessionState, event, tool_result_fields
from pstack_cli.observe.readers.claude import ClaudeReader
from pstack_cli.observe.readers.codex import CodexReader
from pstack_cli.observe.readers.copilot import CopilotReader
from pstack_cli.observe.readers.vscode_copilot import VSCodeCopilotReader


def append(path, *records):
    with path.open("a") as f:
        for record in records:
            f.write(json.dumps(record) + "\n")


def test_claude_incremental_partial_prompt_and_tool_result(tmp_path):
    path = tmp_path / ".claude/projects/p/session.jsonl"
    path.parent.mkdir(parents=True)
    append(path,
           {"type": "user", "timestamp": "2026-01-01T00:00:00Z", "message": {"content": [{"type": "text", "text": "hello"}]}},
           {"type": "assistant", "timestamp": "2026-01-01T00:00:01Z", "message": {"content": [{"type": "tool_use", "id": "t", "name": "Bash", "input": {"command": "echo hi"}}], "stop_reason": "tool_use"}},
           {"type": "user", "timestamp": "2026-01-01T00:00:02Z", "message": {"content": [{"type": "tool_result", "tool_use_id": "t", "content": "ok"}]}})
    ref = ClaudeReader(tmp_path).discover()[0]
    reader = ClaudeReader(tmp_path)
    events, cursor = reader.read(ref, None)
    assert [e["kind"] for e in events] == ["session_start", "prompt", "tool_start", "tool_end"]
    assert reader.read(ref, cursor)[0] == []
    with path.open("ab") as f:
        f.write(b'{"type":"user","timestamp":"2026-01-01T00:00:03Z"')
    assert reader.read(ref, cursor)[0] == []
    with path.open("ab") as f:
        f.write(b',"message":{"content":"next"}}\n')
    assert any(e["kind"] == "prompt" and e["text"] == "next" for e in reader.read(ref, cursor)[0])


def test_codex_malformed_and_metadata(tmp_path):
    path = tmp_path / ".codex/sessions/2026/01/01/rollout-2026-uuid.jsonl"
    path.parent.mkdir(parents=True)
    append(path, {"type": "session_meta", "payload": {"id": "uuid", "cwd": "/work", "git": {"branch": "main"}}},
           {"type": "turn_context", "payload": {"model": "gpt-test"}},
           {"type": "response_item", "timestamp": "2026-01-01T00:00:01Z", "payload": {"type": "message", "role": "user", "content": [{"type": "input_text", "text": "go"}]}})
    with path.open("a") as f:
        f.write("not json\n")
    reader = CodexReader(tmp_path)
    events, _ = reader.read(reader.discover()[0], None)
    assert any(e["kind"] == "notice" for e in events)
    start = next(e for e in events if e["kind"] == "session_start")
    assert start["cwd"] == "/work"
    assert next(e for e in events if e["kind"] == "session_start")["model"] == "gpt-test"
    assert reader.read(reader.discover()[0], _)[0] == []


def test_copilot_tool_error_and_prompt(tmp_path):
    path = tmp_path / ".copilot/session-state/s/events.jsonl"
    path.parent.mkdir(parents=True)
    append(path, {"type": "session.start", "timestamp": "2026-01-01T00:00:00Z", "data": {"context": {"cwd": "/w"}}},
           {"type": "user.message", "timestamp": "2026-01-01T00:00:01Z", "data": {"content": "prompt"}},
           {"type": "tool.execution_start", "timestamp": "2026-01-01T00:00:02Z", "data": {"toolCallId": "x", "toolName": "shell", "arguments": {"command": "false"}}},
           {"type": "tool.execution_complete", "timestamp": "2026-01-01T00:00:03Z", "data": {"toolCallId": "x", "success": False, "error": {"message": "failed"}}})
    copilot = CopilotReader(tmp_path)
    events, cursor = copilot.read(copilot.discover()[0], None)
    assert any(e["kind"] == "prompt" for e in events)
    assert next(e for e in events if e["kind"] == "tool_end")["ok"] is False
    assert copilot.read(copilot.discover()[0], cursor)[0] == []


def test_vscode_jsonl_and_liveness_metadata(tmp_path):
    path = tmp_path / ".config/Code/User/workspaceStorage/h/chatSessions/s.jsonl"
    path.parent.mkdir(parents=True)
    append(path, {"kind": 0, "v": {"sessionId": "s", "creationDate": 1767225600000, "requests": [{"requestId": "r", "timestamp": 1767225600000, "message": {"text": "ask"}, "response": [{"value": "answer"}], "modelId": "model-x", "modelState": {"value": 1, "completedAt": 1767225601000}}]}})
    reader = VSCodeCopilotReader(tmp_path)
    events, cursor = reader.read(reader.discover()[0], None)
    assert [e["kind"] for e in events] == ["session_start", "prompt", "message", "turn_end"]
    assert events[0]["model"] == "model-x"
    assert reader.read(reader.discover()[0], cursor)[0] == []
    state = SessionState("vscode-copilot:s", "vscode-copilot")
    for event in events:
        state.apply(event)
    assert state.summary(1767225602)["state"] == "waiting"


def test_liveness_background_and_clock():
    state = SessionState("codex:s", "codex")
    state.apply({"ts": "2026-01-01T00:00:00.000Z", "agent": "main", "kind": "session_start"})
    state.apply({"ts": "2026-01-01T00:00:01.000Z", "agent": "main", "kind": "agent_start", "agent_id": "child", "parent": "main", "background": True, "model": "child-model"})
    state.apply({"ts": "2026-01-01T00:00:01.000Z", "agent": "main", "kind": "tool_end", "id": "spawn", "ok": True})
    base = 1767225600
    assert state.agents(base + 2)[1]["state"] == "working"
    assert state.agents(base + 601)[1]["state"] == "stalled"
    state.apply({"ts": "2026-01-01T00:00:03.000Z", "agent": "child", "kind": "agent_end", "agent_id": "child", "ok": False})
    assert state.agents(base + 4)[1]["state"] == "failed"
    state.apply({"ts": "2026-01-01T00:00:04.000Z", "agent": "main", "kind": "turn_end", "reason": "done"})
    assert state.summary(base + 5)["state"] == "waiting"


@pytest.mark.parametrize("reader_type,relative,initial,later", [
    (CodexReader, ".codex/sessions/2026/01/01/rollout-session.jsonl",
     [{"type": "session_meta", "timestamp": "2026-01-01T00:00:00Z", "payload": {"id": "session"}},
      {"type": "response_item", "timestamp": "2026-01-01T00:00:01Z", "payload": {
          "type": "message", "role": "user", "content": [{"type": "input_text", "text": "first"}]}}],
     {"type": "response_item", "timestamp": "2026-01-01T00:00:02Z", "payload": {
         "type": "message", "role": "user", "content": [{"type": "input_text", "text": "second"}]}}),
    (CopilotReader, ".copilot/session-state/session/events.jsonl",
     [{"type": "session.start", "timestamp": "2026-01-01T00:00:00Z", "data": {"context": {"cwd": "/work"}}},
      {"type": "user.message", "timestamp": "2026-01-01T00:00:01Z", "data": {"content": "first"}}],
     {"type": "user.message", "timestamp": "2026-01-01T00:00:02Z", "data": {"content": "second"}}),
    (VSCodeCopilotReader, ".config/Code/User/workspaceStorage/work/chatSessions/session.jsonl",
     [{"kind": 0, "v": {"sessionId": "session", "creationDate": 1767225600000, "requests": [
         {"requestId": "first", "timestamp": 1767225601000, "message": {"text": "first"}}]}}],
     {"kind": 2, "k": ["requests"], "v": [
         {"requestId": "second", "timestamp": 1767225602000, "message": {"text": "second"}}]}),
])
def test_readers_recover_after_malformed_and_partial_records(tmp_path, reader_type, relative, initial, later):
    path = tmp_path / relative
    path.parent.mkdir(parents=True)
    append(path, *initial)
    reader = reader_type(tmp_path)
    ref = reader.discover()[0]
    events, cursor = reader.read(ref, None)
    assert [e["text"] for e in events if e["kind"] == "prompt"] == ["first"]
    assert reader.read(ref, cursor)[0] == []
    encoded = json.dumps(later).encode()
    with path.open("ab") as f:
        f.write(b"not json\n" + encoded[:len(encoded) // 2])
    events, cursor = reader.read(ref, cursor)
    assert any(e["kind"] == "notice" and e["level"] == "warn" for e in events)
    assert not any(e["kind"] == "prompt" for e in events)
    with path.open("ab") as f:
        f.write(encoded[len(encoded) // 2:] + b"\n")
    events, cursor = reader.read(ref, cursor)
    assert [e["text"] for e in events if e["kind"] == "prompt"] == ["second"]
    assert reader.read(ref, cursor)[0] == []


@pytest.mark.parametrize("message,description", [("Reply ok", "Reply ok"), ("gAAAA" + "x" * 100 + "==", "probe")])
def test_codex_native_spawn_and_completion(tmp_path, message, description):
    path = tmp_path / ".codex/sessions/2026/01/01/rollout-session.jsonl"
    path.parent.mkdir(parents=True)
    append(path,
           {"type": "session_meta", "timestamp": "2026-01-01T00:00:00Z", "payload": {"id": "session"}},
           {"type": "response_item", "timestamp": "2026-01-01T00:00:01Z", "payload": {
               "type": "function_call", "name": "spawn_agent", "namespace": "collaboration", "call_id": "spawn",
               "arguments": json.dumps({"task_name": "probe", "model": "gpt-6-astra", "message": message})}},
           {"type": "response_item", "timestamp": "2026-01-01T00:00:02Z", "payload": {
               "type": "function_call_output", "call_id": "spawn", "output": '{"task_name":"/root/probe"}'}})
    reader = CodexReader(tmp_path)
    ref = reader.discover()[0]
    events, cursor = reader.read(ref, None)
    started = next(e for e in events if e["kind"] == "agent_start")
    assert (started["agent_id"], started["model"], started["background"]) == ("/root/probe", "gpt-6-astra", True)
    assert started["description"] == description
    if message.startswith("gAAAA"):
        assert message not in json.dumps(events)
        assert next(e for e in events if e["kind"] == "tool_start")["input"]["message"] == "[encrypted message]"
    state = SessionState("codex:session", "codex")
    for ev in events:
        state.apply(ev)
    assert state.agents(1767225603)[1]["state"] == "working"
    append(path, {"type": "event_msg", "timestamp": "2026-01-01T00:00:04Z", "payload": {
        "type": "item_completed", "item": {"type": "SubAgentActivity", "kind": "completed", "agent_path": "/root/probe"}}})
    events, cursor = reader.read(ref, cursor)
    assert [(e["agent_id"], e["ok"]) for e in events if e["kind"] == "agent_end"] == [("/root/probe", True)]
    for ev in events:
        state.apply(ev)
    assert state.agents(1767225605)[1]["state"] == "done"
    assert reader.read(ref, cursor)[0] == []


@pytest.mark.parametrize("reader_type,relative,record", [
    (ClaudeReader, ".claude/projects/work/session.jsonl", {
        "type": "user", "message": {"content": [{"type": "tool_result", "tool_use_id": "init", "content": "OUTPUT"}]}}),
    (CodexReader, ".codex/sessions/2026/01/01/rollout-session.jsonl", {
        "type": "response_item", "payload": {"type": "function_call_output", "call_id": "init", "output": "OUTPUT"}}),
    (CopilotReader, ".copilot/session-state/session/events.jsonl", {
        "type": "tool.execution_complete", "data": {"toolCallId": "init", "success": True, "result": {"content": "OUTPUT"}}}),
    (VSCodeCopilotReader, ".config/Code/User/workspaceStorage/work/chatSessions/session.jsonl", {
        "kind": 0, "v": {"sessionId": "session", "creationDate": 1767225600000, "requests": [{
            "requestId": "r", "timestamp": 1767225600000, "message": {"text": "start a run"}, "response": [{
                "kind": "toolInvocationSerialized", "toolCallId": "init", "toolId": "run_in_terminal", "isComplete": True,
                "pastTenseMessage": "Ran terminal", "resultDetails": {"output": "OUTPUT"}}]}]}}),
])
def test_all_readers_preserve_run_metadata_before_shortening_output(tmp_path, reader_type, relative, record):
    record_path = str(tmp_path / "another project/.pstack/runs/example.json")
    output = "first line\n" + "x" * 2100 + f"\nrun example started. Record: {record_path}\n"
    record = json.loads(json.dumps(record).replace('"OUTPUT"', json.dumps(output)))
    record["timestamp"] = "2026-01-01T00:00:00Z"
    path = tmp_path / relative
    path.parent.mkdir(parents=True)
    append(path, record)
    reader = reader_type(tmp_path)
    ref = reader.discover()[0]
    events, cursor = reader.read(ref, None)
    result = next(e for e in events if e["kind"] == "tool_end")
    assert result["pstack"] == {"run_ids": ["example"], "record_paths": [record_path], "truncated": False}
    assert len(result["summary"] or "") <= 2000
    assert reader.read(ref, cursor)[0] == []


def test_run_metadata_decodes_nested_output_and_reports_limits(tmp_path):
    path = str(tmp_path / "with spaces/.pstack/runs/example.json")
    output = json.dumps({"value": {"output": f"first\nrun example started. Record: {path}\n"}})
    fields = tool_result_fields(output, "display" * 1000)
    result = event("tool_end", "2026-01-01T00:00:00Z", "main", id="init", ok=True, **fields)
    assert len(result["summary"]) == 2000
    assert result["pstack"] == {"run_ids": ["example"], "record_paths": [path], "truncated": False}
    many = "\n".join(f"run r{i} started" for i in range(65))
    limited = tool_result_fields(many, "short")["pstack"]
    assert len(limited["run_ids"]) == 64 and limited["truncated"] is True
    oversized = tool_result_fields("run " + "x" * 129 + " started", "short")["pstack"]
    assert oversized == {"run_ids": [], "record_paths": [], "truncated": True}


def test_source_code_in_tool_output_does_not_claim_a_run():
    output = '    print("run example started. Record: /project/.pstack/runs/example.json")\n'
    assert tool_result_fields(output, "source code")["pstack"] == {
        "run_ids": [], "record_paths": [], "truncated": False}


def test_vscode_finds_sessions_on_macos_and_windows(tmp_path, monkeypatch):
    monkeypatch.delenv("APPDATA", raising=False)
    for i, root in enumerate(("Library/Application Support/Code/User", "AppData/Roaming/Code - Insiders/User")):
        home = tmp_path / str(i)
        path = home / root / "workspaceStorage/h/chatSessions/s.jsonl"
        path.parent.mkdir(parents=True)
        append(path, {"kind": 0, "v": {"sessionId": "s", "creationDate": 1767225600000, "requests": []}})
        reader = VSCodeCopilotReader(home)
        refs = reader.discover()
        assert len(refs) == 1, root
        assert reader.read(refs[0], None)[0][0]["kind"] == "session_start"


def test_vscode_uri_paths_on_windows():
    from pstack_cli.observe.readers.vscode_copilot import _uri_path
    assert _uri_path("file:///c%3A/Users/me/proj") == "c:/Users/me/proj"
    assert _uri_path("file:///C:/Users/me/proj") == "C:/Users/me/proj"
    assert _uri_path("file://server/share/proj") == "//server/share/proj"
    assert _uri_path("file:///home/me/proj") == "/home/me/proj"
