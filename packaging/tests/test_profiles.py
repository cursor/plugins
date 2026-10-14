"""Per-host profiles. Each case is a failure a portability probe reproduced (history: commit 30b9dfb, audits/portability-probes.py).

The probe showed doctor passing a malformed host.json and a Claude profile inside a
Codex install, and a host switch leaving Claude's profile active under Codex.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DATA = SRC / "pstack_cli" / "data"

pytestmark = pytest.mark.skipif(not DATA.is_dir(), reason="run build/package.py first")

CLAUDE_MODELS = "bug-fix: deep\narchitect-runners: opus, sonnet, opus\n"
CODEX_MODELS = "bug-fix: gpt-5\narchitect-runners: gpt-5, gpt-5-mini\n"


def run(*args):
    return subprocess.run([sys.executable, "-m", "pstack_cli", *args], capture_output=True, text=True,
                          env={"PYTHONPATH": str(SRC), "PATH": "/usr/bin:/bin", "HOME": "/tmp"})


def profile(host="claude", tier=2, **caps):
    base = {"DELEGATE": {"value": True, "source": "observed"},
            "PARALLEL": {"value": True, "source": "observed"},
            "MODEL_CHOICE": {"value": "partial", "source": "observed"},
            "ASK": {"value": True, "source": "default"}}
    base.update(caps)
    models = {"deep": "opus", "fast": "sonnet"} if host == "claude" else {"deep": "gpt-5", "fast": "gpt-5-mini"}
    return {"host": host, "detected": "2026-09-10", "capabilities": base, "tier": tier, "models": models}


def install(d, host):
    r = run("init", "--target", str(d), "--host", host)
    assert r.returncode == 0, r.stderr


def put(d, name, value):
    (d / ".pstack" / name).write_text(value if isinstance(value, str) else json.dumps(value))


def doctor(d):
    return run("doctor", "--target", str(d))


@pytest.fixture
def claude(tmp_path):
    d = tmp_path / "project"
    d.mkdir()
    install(d, "claude")
    put(d, "host.json", profile())
    put(d, "models.md", CLAUDE_MODELS)
    return d


def test_valid_profile_passes(claude):
    r = doctor(claude)
    assert r.returncode == 0, r.stdout


def test_malformed_host_json_fails(claude):
    put(claude, "host.json", "not json\n")
    r = doctor(claude)
    assert r.returncode == 1 and "not valid JSON" in r.stdout, r.stdout


def test_profile_from_another_host_fails(tmp_path):
    install(tmp_path, "codex")
    put(tmp_path, "host.json", profile("claude-code"))
    r = doctor(tmp_path)
    assert r.returncode == 1 and "written by a Claude Code session" in r.stdout, r.stdout


def test_foreign_model_fails(tmp_path):
    install(tmp_path, "codex")
    put(tmp_path, "host.json", profile("codex"))
    put(tmp_path, "models.md", "bug-fix: opus\n")
    r = doctor(tmp_path)
    assert r.returncode == 1 and "`opus` is an anthropic model" in r.stdout, r.stdout


def test_placeholder_and_bare_panel_fail(claude):
    put(claude, "models.md", "arena-runners: <model-a>, <model-b>\ninterrogate-reviewers: panel\n")
    r = doctor(claude)
    assert r.returncode == 1, r.stdout
    assert "placeholder" in r.stdout and "bare word `panel`" in r.stdout, r.stdout


def test_duplicate_role_fails(claude):
    put(claude, "models.md", "bug-fix: deep\nbug-fix: fast\n")
    r = doctor(claude)
    assert r.returncode == 1 and "already set on line 1" in r.stdout, r.stdout


def test_tier_must_follow_from_capabilities(claude):
    put(claude, "host.json", profile(tier=3))
    r = doctor(claude)
    assert r.returncode == 1 and "tier 3 does not follow" in r.stdout, r.stdout


def test_model_choice_true_on_a_single_vendor_host_fails(claude):
    put(claude, "host.json", profile(tier=3, MODEL_CHOICE={"value": True, "source": "observed"}))
    r = doctor(claude)
    assert r.returncode == 1 and "addresses one vendor's" in r.stdout, r.stdout


def test_unmarked_capabilities_warn_but_pass(claude):
    legacy = profile()
    legacy["capabilities"] = {"DELEGATE": True, "PARALLEL": True, "MODEL_CHOICE": "partial"}
    put(claude, "host.json", legacy)
    r = doctor(claude)
    assert r.returncode == 0, r.stdout
    assert "which capabilities were observed" in r.stdout, r.stdout


def test_tier_on_defaults_is_a_warning(claude):
    put(claude, "host.json", profile(DELEGATE={"value": True, "source": "default"}))
    r = doctor(claude)
    assert r.returncode == 0 and "rests on capabilities taken from defaults" in r.stdout, r.stdout


def test_claude_codex_claude_keeps_each_profile(claude):
    install(claude, "codex")
    assert not (claude / ".pstack" / "host.json").exists(), "Claude's profile stayed active under Codex"
    assert json.loads((claude / ".pstack/hosts/claude/host.json").read_text()) == profile()
    assert "setup-pstack has not run" in doctor(claude).stdout

    put(claude, "host.json", profile("codex"))
    put(claude, "models.md", CODEX_MODELS)
    assert doctor(claude).returncode == 0, doctor(claude).stdout

    install(claude, "claude")
    assert json.loads((claude / ".pstack/host.json").read_text()) == profile()
    assert (claude / ".pstack/models.md").read_text() == CLAUDE_MODELS
    assert (claude / ".pstack/hosts/codex/models.md").read_text() == CODEX_MODELS
    assert doctor(claude).returncode == 0, doctor(claude).stdout

    r = run("update", "--target", str(claude), "--host", "codex")
    assert r.returncode == 0, r.stderr
    assert (claude / ".pstack/models.md").read_text() == CODEX_MODELS


def test_switch_reports_the_profile_as_moved_not_kept(claude):
    out = run("init", "--target", str(claude), "--host", "codex").stdout
    assert "saved    .pstack/host.json as .pstack/hosts/claude/host.json" in out, out
    assert "kept    .pstack/mode.md" in out, out
    assert "host.json" not in out.split("kept    ", 1)[1].splitlines()[0], out


def test_switch_removes_the_old_install_but_not_your_files(tmp_path):
    install(tmp_path, "codex")
    edited = tmp_path / ".agents/skills/how/SKILL.md"
    edited.write_text(edited.read_text() + "\nMY EDIT\n")
    mine = tmp_path / ".agents/skills/mine/SKILL.md"
    mine.parent.mkdir(parents=True)
    mine.write_text("MINE")

    dry = run("init", "--target", str(tmp_path), "--host", "claude", "--dry-run").stdout
    assert "would remove" in dry and (tmp_path / ".agents/skills/poteto-mode/SKILL.md").is_file(), dry

    out = run("init", "--target", str(tmp_path), "--host", "claude").stdout
    assert "kept    1 file(s) the codex install left that you had edited" in out, out
    assert not (tmp_path / ".agents/skills/poteto-mode").exists()
    assert not (tmp_path / "AGENTS.md").exists(), "pstack created AGENTS.md unchanged, so it goes"
    assert "MY EDIT" in edited.read_text() and mine.read_text() == "MINE"
    files = json.loads((tmp_path / ".pstack/receipt.json").read_text())["files"]
    assert [k for k in files if k.startswith(".agents/")] == [".agents/skills/how/SKILL.md"]
    assert doctor(tmp_path).returncode in (0, 1) and "Traceback" not in doctor(tmp_path).stderr


def test_switching_back_never_loses_the_edit_kept_on_the_way_out(tmp_path):
    install(tmp_path, "codex")
    edited = tmp_path / ".agents/skills/how/SKILL.md"
    edited.write_text(edited.read_text() + "\nMY EDIT\n")
    install(tmp_path, "claude")
    out = run("init", "--target", str(tmp_path), "--host", "codex").stdout
    backups = list((tmp_path / ".pstack").glob("backup-*/.agents/skills/how/SKILL.md"))
    assert backups and "MY EDIT" in backups[0].read_text(), out

    d = tmp_path / "via-update"
    d.mkdir()
    install(d, "codex")
    edited = d / ".agents/skills/how/SKILL.md"
    edited.write_text(edited.read_text() + "\nMY EDIT\n")
    run("update", "--target", str(d), "--host", "claude")
    run("update", "--target", str(d), "--host", "codex")
    assert "MY EDIT" in edited.read_text(), "update without --force keeps an edit in place"


def test_a_kept_edit_is_reported_once_and_stays_protected(tmp_path):
    install(tmp_path, "codex")
    edited = tmp_path / ".agents/skills/how/SKILL.md"
    edited.write_text(edited.read_text() + "\nMY EDIT\n")
    first = run("init", "--target", str(tmp_path), "--host", "claude").stdout
    assert "that you had edited" in first, first
    for args in (("init", "--target", str(tmp_path), "--host", "claude"), ("update", "--target", str(tmp_path))):
        out = run(*args).stdout
        assert "that you had edited" not in out, out
    assert ".agents/skills/how/SKILL.md" in run("status", "--target", str(tmp_path)).stdout
    assert "MY EDIT" in edited.read_text()
    out = run("init", "--target", str(tmp_path), "--host", "codex").stdout
    backups = list((tmp_path / ".pstack").glob("backup-*/.agents/skills/how/SKILL.md"))
    assert backups and "MY EDIT" in backups[0].read_text(), out


def test_update_host_dry_run_previews_the_switch(tmp_path):
    install(tmp_path, "codex")
    put(tmp_path, "host.json", profile("codex"))
    before = {p: p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()}
    out = run("update", "--target", str(tmp_path), "--host", "claude", "--dry-run").stdout
    assert "would save the codex profile" in out and "would remove" in out, out
    assert before == {p: p.read_bytes() for p in tmp_path.rglob("*") if p.is_file()}


def test_update_host_switches_even_when_no_file_differs(tmp_path):
    install(tmp_path, "codex")
    rec = json.loads((tmp_path / ".pstack/receipt.json").read_text())
    rec["host"] = "claude"
    (tmp_path / ".pstack/receipt.json").write_text(json.dumps(rec))
    r = run("update", "--target", str(tmp_path), "--host", "codex")
    assert r.returncode == 0, r.stderr
    assert json.loads((tmp_path / ".pstack/receipt.json").read_text())["host"] == "codex", r.stdout


def test_switch_does_not_follow_a_symlinked_skill_dir(tmp_path):
    proj, shared = tmp_path / "p", tmp_path / "shared"
    proj.mkdir()
    shared.mkdir()
    (proj / ".agents").mkdir()
    (proj / ".agents/skills").symlink_to(shared)
    install(proj, "codex")
    count = sum(1 for p in shared.rglob("*") if p.is_file())
    r = run("init", "--target", str(proj), "--host", "claude")
    assert r.returncode == 0 and "Traceback" not in r.stderr, r.stderr
    assert "reached through a symlink" in r.stdout, r.stdout
    assert sum(1 for p in shared.rglob("*") if p.is_file()) == count, "deleted files outside the project"
    assert json.loads((proj / ".pstack/receipt.json").read_text())["host"] == "claude"


def test_switch_removes_pstacks_text_and_keeps_yours(tmp_path):
    (tmp_path / "AGENTS.md").write_text("# Mine\n")
    install(tmp_path, "codex")
    out = run("init", "--target", str(tmp_path), "--host", "claude").stdout
    assert "removed pstack's text from AGENTS.md, keeping yours" in out, out
    assert (tmp_path / "AGENTS.md").read_text() == "# Mine\n"

    d = tmp_path / "created"
    d.mkdir()
    install(d, "codex")
    (d / "AGENTS.md").write_text((d / "AGENTS.md").read_text() + "\nmy note\n")
    install(d, "claude")
    assert (d / "AGENTS.md").read_text() == "\nmy note\n", "your text comes back byte for byte"


@pytest.mark.skipif(os.geteuid() == 0, reason="root ignores permissions")
def test_a_failed_switch_keeps_the_old_profile(tmp_path):
    install(tmp_path, "codex")
    put(tmp_path, "host.json", profile("codex"))
    locked = tmp_path / ".claude/skills/how"
    locked.mkdir(parents=True)
    locked.chmod(0o555)
    r = run("init", "--target", str(tmp_path), "--host", "claude")
    locked.chmod(0o755)
    assert r.returncode == 1 and "Traceback" not in r.stderr, r.stdout + r.stderr
    assert (tmp_path / ".pstack/host.json").is_file(), "the profile moved before the files did"
    assert json.loads((tmp_path / ".pstack/receipt.json").read_text())["host"] == "codex"


def test_switch_keeps_an_edited_block_and_doctor_flags_it(tmp_path):
    (tmp_path / "AGENTS.md").write_text("# Mine\n")
    install(tmp_path, "codex")
    mem = tmp_path / "AGENTS.md"
    mem.write_text(mem.read_text().replace("A casual question is", "A casual question is still"))
    out = run("init", "--target", str(tmp_path), "--host", "claude").stdout
    assert "the pstack block in AGENTS.md was edited, so it stays" in out, out
    assert "points at .agents/skills/pstack-runtime/host-binding.md, which is not installed" in doctor(tmp_path).stdout


def test_mismatched_profile_is_saved_under_the_host_that_wrote_it(tmp_path):
    install(tmp_path, "codex")
    put(tmp_path, "host.json", profile("claude-code"))
    install(tmp_path, "claude")
    assert json.loads((tmp_path / ".pstack/host.json").read_text())["host"] == "claude-code"


def test_saved_profile_errors_do_not_fail_the_active_host(claude):
    install(claude, "codex")
    (claude / ".pstack/hosts/claude/models.md").write_text("bug-fix: <model-a>\n")
    put(claude, "host.json", profile("codex"))
    r = doctor(claude)
    assert r.returncode == 0 and "saved profile, not active" in r.stdout, r.stdout


def test_status_names_sources_and_saved_profiles(claude):
    install(claude, "codex")
    install(claude, "claude")
    out = run("status", "--target", str(claude)).stdout
    assert "observed DELEGATE, MODEL_CHOICE, PARALLEL; defaults ASK" in out, out
    assert "saved      profiles for claude" in out, out
