"""References are observations, not phase evidence; file access stays within known scope."""
import dataclasses
import json
from pathlib import Path
from pstack_cli.observe import trace
from test_observe_server import http_hub, get


def event(seq, kind, **kw):
    return {"seq": seq, "ts": "2026-09-10T14:00:00Z", "agent": "main", "kind": kind, **kw}


def test_nested_instruction_paths_do_not_claim_phase_execution(tmp_path):
    events = [event(1, "tool_start", id="read", tool="exec_command", input={"cmd": "cat .agents/skills/poteto-mode/playbooks/investigation.md .agents/skills/principle-boundary-discipline/SKILL.md"}), event(2, "tool_end", id="read", ok=False, summary="No such file")]
    result = trace.build(events, [], str(tmp_path), [])
    refs = {(r["kind"], r["name"]): r for r in result["references"]}
    assert ("playbook", "investigation") in refs and ("skill", "poteto-mode") in refs
    assert ("principle", "principle-boundary-discipline") in refs
    assert refs[("playbook", "investigation")]["accesses"][0]["ok"] is False
    assert result["coverage"]["phase_tracking"] == "unrecorded"
    assert not any("state" in ref for ref in refs.values())
    assert trace.build([event(1, "message", text="Read skills/how/SKILL.md")], [], str(tmp_path), [])["references"] == []


def test_artifacts_are_referenced_files_within_workspace(tmp_path):
    project = tmp_path / "project"
    project.mkdir()
    (project / "result.md").write_text("# Result\n")
    (tmp_path / "secret.md").write_text("outside")
    (project / "escape.md").symlink_to(tmp_path / "secret.md")
    result = trace.build([event(1, "message", text="[result](result.md:1) [escape](escape.md) [outside](../secret.md) [web](https://example.com/file.md)")], [], str(project), [])
    assert [a["relative"] for a in result["artifacts"]] == ["result.md"]
    assert result["artifacts"][0]["previewable"] is True


def test_manual_run_title_and_recording_gaps(tmp_path):
    note = tmp_path / ".pstack/runs/discovery.md"
    note.parent.mkdir(parents=True)
    note.write_text("# Architecture discovery\n")
    result = trace.build([event(1, "tool_start", id="note", tool="exec_command", input={"cmd": "cat .pstack/runs/discovery.md"}), event(2, "tool_end", id="note", ok=False, summary="not a git repository"), event(3, "message", text="shortened…")], [], str(tmp_path), [], total=4000)
    assert result["title"] == "Architecture discovery"
    assert {d["code"] for d in result["diagnostics"]} == {"no-phases", "recording-git", "shortened-text", "history-window"}


def test_original_source_paging_is_limited_to_known_paths(http_hub, tmp_path):
    hub, port = http_hub
    source = tmp_path / "original.jsonl"
    source.write_text("x" * 70000 + "unshortened output")
    session = hub.sessions["claude:h"]
    session.ref = dataclasses.replace(session.ref, paths=(str(source),))
    code, _, body = get(port, "/api/sessions/claude%3Ah/sources/0")
    page = json.loads(body)
    assert code == 200 and page["next"] == 65536 and page["more"] is True
    page = json.loads(get(port, "/api/sessions/claude%3Ah/sources/0?offset=65536")[2])
    assert page["text"].endswith("unshortened output") and page["more"] is False
    for suffix in ("sources/1", "sources/-1", "sources/0?offset=-1", "sources/../../etc/passwd"):
        assert get(port, "/api/sessions/claude%3Ah/" + suffix)[0] == 404
    payload = json.loads(get(port, "/api/sessions/claude%3Ah/trace")[2])
    assert payload["sources"][0]["name"] == "original.jsonl"


def test_artifact_endpoint_rechecks_scope_and_serves_html_as_text(http_hub, tmp_path):
    hub, port = http_hub
    session = hub.sessions["claude:h"]
    artifact = Path(session.cwd) / "result.html"
    artifact.write_text("<script>bad()</script>")
    session.events.append(event(3, "message", text="[result](result.html)"))
    session.seq = 3
    payload = hub.session_payload(session.key)
    item = payload["trace"]["artifacts"][0]
    url = "/api/sessions/claude%3Ah/artifacts/" + item["id"]
    code, ctype, body = get(port, url)
    assert code == 200 and ctype.startswith("text/plain") and body == b"<script>bad()</script>"
    outside = tmp_path.parent / (tmp_path.name + "-outside.md")
    outside.write_text("outside")
    artifact.unlink()
    artifact.symlink_to(outside)
    try:
        assert get(port, url)[0] == 404
    finally:
        outside.unlink()


def test_execution_workspace_in_browser(http_hub, tmp_path):
    import subprocess
    import pytest
    from test_observe_ui import browser_bin, node_bin, TESTS
    from test_observe_server import ts
    chrome, node = browser_bin(), node_bin()
    if not chrome or not node:
        pytest.skip("headless browser or Node unavailable")
    hub, port = http_hub
    session = hub.sessions["claude:h"]
    root = Path(session.cwd)
    (root / "diagram.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="blue"/></svg>')
    source = root / "session.jsonl"
    source.write_text("x" * 65536 + "original unshortened tail")
    events = []
    def add(t, kind, **kw):
        events.append({"ts": ts(hub.clock.t + t), "agent": "main", "kind": kind, **kw})
    add(2, "tool_start", id="read", tool="Bash", input={"command": "cat .agents/skills/poteto-mode/playbooks/investigation.md .agents/skills/how/SKILL.md"})
    add(3, "tool_end", id="read", ok=True, summary="instruction content")
    add(5, "agent_start", agent_id="how-agent", parent="main", model="test-model", description="Explain mechanism")
    add(6, "agent_start", agent_id="why-agent", parent="main", model="test-model", description="Investigate history")
    add(7, "tool_start", agent="how-agent", id="how-tool", tool="Bash", summary="inspect mechanism", input={"command": "inspect mechanism"})
    add(8, "message", agent="how-agent", text="Mechanism confirmed")
    add(9, "tool_end", agent="how-agent", id="how-tool", ok=False, summary="failure visible only after return")
    add(10, "agent_end", agent_id="how-agent", ok=True)
    add(11, "message", agent="why-agent", text="History confirmed")
    add(12, "agent_end", agent_id="why-agent", ok=True)
    add(13, "message", text="Both explanations returned. Comparing evidence.")
    add(14, "agent_start", agent_id="synthesis-agent", parent="main", model="test-model", description="Synthesize explanations")
    add(18, "agent_end", agent_id="synthesis-agent", ok=True)
    add(20, "message", text="Review the [diagram](diagram.svg).")
    add(21, "turn_end", reason="task_complete")
    session.reader.add("h", str(root), events, hub.clock.t + 21)
    hub.clock.t += 22
    hub.tick()
    session.ref = dataclasses.replace(session.ref, paths=(str(source),))
    result = subprocess.run([node, str(TESTS / "observe_execution_browser.js"), chrome,
        f"http://127.0.0.1:{port}", str(tmp_path / "browser"), str(tmp_path / "execution.png")],
        capture_output=True, text=True, timeout=240)
    assert result.returncode == 0, result.stdout + result.stderr
    assert json.loads(result.stdout)["playbooks"] == 23
