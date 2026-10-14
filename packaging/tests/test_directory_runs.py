"""A plain directory can record progress without weakening evidence freshness checks."""
import json
import os
import subprocess
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "core/skills/poteto-mode/scripts/run-record.py"


def rr(root, *args, code=0):
    result = subprocess.run([sys.executable, str(SCRIPT), *args], cwd=root,
                            capture_output=True, text=True, timeout=15)
    assert result.returncode == code, result.stdout + result.stderr
    return result.stdout + result.stderr


def test_investigation_progress_and_completion_without_git(tmp_path):
    rr(tmp_path, "init", "--route", "investigation", "--task", "Explain the architecture",
       "--host", "codex", "--session-id", "directory-session")
    rr(tmp_path, "phase", "step-1", "--start", "--agent", "explainer")
    rr(tmp_path, "phase", "step-1", "--done")
    rr(tmp_path, "phase", "step-2", "--start", "--from", "step-1", "--reason", "Explanation returned")
    rr(tmp_path, "phase", "step-2", "--done")
    rr(tmp_path, "phase", "step-3", "--start")
    output = tmp_path / ".pstack/explanation.md"
    output.write_text("Architecture explanation with source references\n")
    rr(tmp_path, "evidence", "--kind", "artifact", "--result", "pass", "--phase", "step-3", "--output", str(output))
    for phase in ("step-3", "step-4"):
        rr(tmp_path, "phase", phase, "--done")
    assert "complete" in rr(tmp_path, "check")
    data = json.loads(next((tmp_path / ".pstack/runs").glob("*.json")).read_text())
    assert data["workspace"]["kind"] == "directory"
    assert data["session"] == {"host": "codex", "id": "directory-session"}
    assert data["transitions"][0]["reason"] == "Explanation returned"
    assert all(p["tree"].startswith("fs:") for p in data["phases"])
    assert not (tmp_path / ".git").exists()
    sub = tmp_path / "notes"
    sub.mkdir()
    assert "route investigation" in rr(sub, "status")


def test_directory_evidence_detects_same_size_edits_and_ignores_its_own_records(tmp_path):
    source = tmp_path / "app.py"
    source.write_text("value = 1\n")
    rr(tmp_path, "init", "--route", "custom", "--phases", "verify", "--task", "Check value")
    output = tmp_path / ".pstack/test.txt"
    output.write_text("pass")
    rr(tmp_path, "evidence", "--kind", "verify", "--result", "pass", "--output", str(output))
    rr(tmp_path, "phase", "verify", "--done")
    rr(tmp_path, "check")
    (tmp_path / ".pstack/other-note").write_text("does not affect code evidence")
    rr(tmp_path, "check")
    original = source.stat()
    source.write_text("value = 2\n")
    os.utime(source, ns=(original.st_atime_ns, original.st_mtime_ns))
    assert "verify: stale" in rr(tmp_path, "check", code=1)


def test_directory_grounding_detects_changed_scope_and_handles_symlink_loops(tmp_path):
    (tmp_path / "app.py").write_text("a = 1\n")
    (tmp_path / "loop").symlink_to(tmp_path, target_is_directory=True)
    rr(tmp_path, "init", "--route", "investigation", "--task", "Explain the code")
    output = tmp_path / ".pstack/explanation.txt"
    output.write_text("Explained a")
    rr(tmp_path, "ground", "add", "--skill", "how", "--scope", "app.py", "--output", str(output))
    assert "reusable" in rr(tmp_path, "ground", "check", "--scope", "app.py")
    (tmp_path / "app.py").write_text("a = 2\n")
    assert "changed since" in rr(tmp_path, "ground", "check", "--scope", "app.py", code=1)


def test_directory_bug_fix_does_not_claim_a_committed_baseline(tmp_path):
    rr(tmp_path, "init", "--route", "bug-fix", "--task", "Fix it")
    output = tmp_path / ".pstack/repro.txt"
    output.write_text("failed")
    assert "requires Git" in rr(tmp_path, "baseline", "--harness", "test.py", "--command", "test",
                                "--output", str(output), code=2)
    assert "baseline: none recorded" in rr(tmp_path, "check", code=1)
