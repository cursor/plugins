"""Lifecycle tests. Each asserts a property the bash installer did not hold."""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DATA = SRC / "pstack_cli" / "data"

pytestmark = pytest.mark.skipif(not DATA.is_dir(), reason="run build/package.py first")


def run(*args, cwd=None):
    return subprocess.run([sys.executable, "-m", "pstack_cli", *args],
                          cwd=cwd, capture_output=True, text=True,
                          env={"PYTHONPATH": str(SRC), "PATH": "/usr/bin:/bin", "HOME": "/tmp"})


@pytest.fixture
def project(tmp_path):
    (tmp_path / ".claude").mkdir()
    (tmp_path / "CLAUDE.md").write_text("# Mine\nkeep me\n")
    return tmp_path


def receipt(p):
    return json.loads((p / ".pstack" / "receipt.json").read_text())


def test_init_writes_and_records(project):
    r = run("init", "--target", str(project), "--host", "claude")
    assert r.returncode == 0, r.stderr
    assert (project / ".claude" / "skills" / "poteto-mode" / "SKILL.md").is_file()
    assert len(receipt(project)["files"]) > 100


def test_memory_file_is_appended_not_overwritten(project):
    run("init", "--target", str(project), "--host", "claude")
    text = (project / "CLAUDE.md").read_text()
    assert "keep me" in text
    assert text.count("pstack:mode:start") == 1


def test_reinstall_is_idempotent(project):
    run("init", "--target", str(project), "--host", "claude")
    run("init", "--target", str(project), "--host", "claude")
    assert (project / "CLAUDE.md").read_text().count("pstack:mode:start") == 1


def test_reinstall_keeps_mode_state(project):
    run("init", "--target", str(project), "--host", "claude")
    mode = project / ".pstack" / "mode.md"
    mode.write_text(mode.read_text().replace("active: false", "active: true"))
    run("init", "--target", str(project), "--host", "claude")
    assert "active: true" in mode.read_text()


def test_preexisting_file_is_backed_up(project):
    skill = project / ".claude" / "skills" / "how" / "SKILL.md"
    skill.parent.mkdir(parents=True)
    skill.write_text("MINE")
    run("init", "--target", str(project), "--host", "claude")
    backups = list((project / ".pstack").glob("backup-*/.claude/skills/how/SKILL.md"))
    assert backups and backups[0].read_text() == "MINE"


def test_update_keeps_files_you_edited(project):
    run("init", "--target", str(project), "--host", "claude")
    skill = project / ".claude" / "skills" / "how" / "SKILL.md"
    skill.write_text(skill.read_text() + "\nMY EDIT\n")
    out = run("update", "--target", str(project))
    assert "MY EDIT" in skill.read_text()
    assert "you edited" in out.stdout


def test_update_force_overwrites(project):
    run("init", "--target", str(project), "--host", "claude")
    skill = project / ".claude" / "skills" / "how" / "SKILL.md"
    skill.write_text(skill.read_text() + "\nMY EDIT\n")
    run("update", "--target", str(project), "--force")
    assert "MY EDIT" not in skill.read_text()
    backups = list((project / ".pstack").glob("backup-*/.claude/skills/how/SKILL.md"))
    assert backups and "MY EDIT" in backups[0].read_text(), "--force replaced an edit without a copy"


def test_init_backs_up_an_edited_file_before_replacing_it(project):
    """init over an install replaced edited files, even in shared dirs like docs/, with no copy."""
    run("init", "--target", str(project), "--host", "claude")
    doc = next(k for k in receipt(project)["files"] if k.startswith("docs/") and k.endswith(".md"))
    (project / doc).write_text((project / doc).read_text() + "\nMY EDIT\n")
    out = run("init", "--target", str(project), "--host", "claude").stdout
    backups = list((project / ".pstack").glob(f"backup-*/{doc}"))
    assert backups and "MY EDIT" in backups[0].read_text(), out
    assert "file(s) of yours" in out


def test_uninstall_removes_ours_and_keeps_yours(project):
    run("init", "--target", str(project), "--host", "claude")
    edited = project / ".claude" / "skills" / "why" / "SKILL.md"
    edited.write_text(edited.read_text() + "\nKEEP\n")
    clean = project / ".claude" / "skills" / "how" / "SKILL.md"
    run("uninstall", "--target", str(project), "--yes")
    assert edited.is_file() and "KEEP" in edited.read_text()
    assert not clean.is_file()
    assert "keep me" in (project / "CLAUDE.md").read_text()


def test_uninstall_without_receipt_fails_safely(tmp_path):
    out = run("uninstall", "--target", str(tmp_path), "--yes")
    assert out.returncode == 1
    assert "no receipt" in out.stdout


def test_status_reports_drift(project):
    run("init", "--target", str(project), "--host", "claude")
    skill = project / ".claude" / "skills" / "how" / "SKILL.md"
    skill.write_text("changed")
    out = run("status", "--target", str(project))
    assert "1 modified by you" in out.stdout


def test_doctor_flags_missing_files(project):
    run("init", "--target", str(project), "--host", "claude")
    shutil.rmtree(project / ".claude" / "skills" / "how")
    out = run("doctor", "--target", str(project))
    assert out.returncode == 1
    assert "deleted" in out.stdout


def test_dry_run_changes_nothing(project):
    run("init", "--target", str(project), "--host", "claude", "--dry-run")
    assert not (project / ".pstack").exists()


@pytest.mark.parametrize("host", ["claude", "codex", "copilot", "cursor", "generic"])
def test_every_host_installs(tmp_path, host):
    d = tmp_path / host
    d.mkdir()
    r = run("init", "--target", str(d), "--host", host)
    assert r.returncode == 0, r.stderr
    assert len(receipt(d)["files"]) > 100


def test_unknown_host_is_rejected(tmp_path):
    out = run("init", "--target", str(tmp_path), "--host", "nope")
    assert out.returncode != 0


def test_store_is_deduplicated_and_intact():
    """Identical files across hosts are stored once, and every index entry resolves."""
    from pstack_cli.store import Build, available
    seen, total = set(), 0
    for host in available():
        b = Build.load(host)
        for rel in b.paths():
            total += 1
            seen.add(b.sha(rel))
            assert b.blob(rel).is_file(), f"{host}:{rel} points at a missing blob"
    assert len(seen) < total, "store is not deduplicating"


def test_installed_bytes_match_the_store(project):
    import hashlib
    run("init", "--target", str(project), "--host", "claude")
    r = receipt(project)
    for rel, sha in r["files"].items():
        got = hashlib.sha256((project / rel).read_bytes()).hexdigest()
        assert got == sha, f"{rel} does not match its recorded hash"


def test_mode_on_off_round_trip(project):
    run("init", "--target", str(project), "--host", "claude")
    mode = project / ".pstack" / "mode.md"
    assert "active: false" in mode.read_text()
    run("on", "--target", str(project))
    assert "active: true" in mode.read_text()
    run("off", "--target", str(project))
    assert "active: false" in mode.read_text()


def test_mode_survives_update(project):
    run("init", "--target", str(project), "--host", "claude")
    run("on", "--target", str(project))
    run("update", "--target", str(project), "--force")
    assert "active: true" in (project / ".pstack" / "mode.md").read_text()


def test_on_without_install_is_an_error(tmp_path):
    out = run("on", "--target", str(tmp_path))
    assert out.returncode == 1 and "not installed" in out.stdout


def test_on_restores_a_deleted_mode_block(project):
    run("init", "--target", str(project), "--host", "claude")
    mem = project / "CLAUDE.md"
    text = mem.read_text()
    start, end = text.index("<!-- pstack:mode:start -->"), text.index("<!-- pstack:mode:end -->")
    mem.write_text(text[:start] + text[end + len("<!-- pstack:mode:end -->"):])
    out = run("on", "--target", str(project))
    assert "restored the mode block in CLAUDE.md" in out.stdout, out.stdout
    text = mem.read_text()
    assert "keep me" in text and text.count("pstack:mode:start") == 1
    assert ".claude/skills/pstack-runtime/host-binding.md" in text
    run("on", "--target", str(project))
    assert mem.read_text() == text, "a second `pstack on` must not add another block"


def test_merge_keeps_your_line_endings_and_whitespace(project):
    mem = project / "CLAUDE.md"
    mem.write_bytes(b"# Mine\r\nkeep me\r\n")
    run("init", "--target", str(project), "--host", "claude")
    data = mem.read_bytes()
    assert data.startswith(b"# Mine\r\nkeep me\r\n") and b"\n" not in data.replace(b"\r\n", b"")

    mine = b"# Mine\r\nkeep me  \r\ntrailing   \r\n\r\n\r\n"
    mem.write_bytes(mine)
    run("on", "--target", str(project))
    data = mem.read_bytes()
    assert data.startswith(mine), data[:80]
    assert b"\n" not in data.replace(b"\r\n", b""), "a bare LF crept into a CRLF file"
    assert data.count(b"pstack:mode:start") == 1


def test_on_keeps_bytes_that_are_not_utf8(project):
    run("init", "--target", str(project), "--host", "claude")
    mem = project / "CLAUDE.md"
    mem.write_bytes(b"# Caf\xe9\n")
    r = run("on", "--target", str(project))
    assert r.returncode == 0 and "Traceback" not in r.stderr, r.stderr
    assert mem.read_bytes().startswith(b"# Caf\xe9\n") and b"pstack:mode:end" in mem.read_bytes()


def test_on_that_cannot_write_the_block_leaves_the_mode_off(project):
    run("init", "--target", str(project), "--host", "claude")
    (project / "CLAUDE.md").unlink()
    (project / "CLAUDE.md").mkdir()
    r = run("on", "--target", str(project))
    assert r.returncode == 1 and "Traceback" not in r.stderr, r.stderr
    assert "active: false" in (project / ".pstack" / "mode.md").read_text()


def test_on_repairs_a_half_deleted_block(project):
    run("init", "--target", str(project), "--host", "claude")
    mem = project / "CLAUDE.md"
    mem.write_text(mem.read_text().replace("<!-- pstack:mode:end -->", ""))
    assert "half deleted" in run("doctor", "--target", str(project)).stdout
    out = run("on", "--target", str(project)).stdout
    assert "repaired the mode block in CLAUDE.md" in out, out
    text = mem.read_text()
    assert text.count("pstack:mode:start") == 1 and text.count("pstack:mode:end") == 1
    assert text.index("pstack:mode:start") < text.index("pstack:mode:end")
    assert text.count("If `.pstack/mode.md` exists") == 1 and "keep me" in text


def test_update_removes_files_the_build_no_longer_ships(project):
    import hashlib
    run("init", "--target", str(project), "--host", "claude")
    r = receipt(project)
    for name, body in (("dropped", b"old skill\n"), ("dropped-edited", b"old\n")):
        f = project / ".claude" / "skills" / name / "SKILL.md"
        f.parent.mkdir(parents=True)
        f.write_bytes(body)
        r["files"][f".claude/skills/{name}/SKILL.md"] = hashlib.sha256(body).hexdigest()
    (project / ".pstack" / "receipt.json").write_text(json.dumps(r))
    edited = project / ".claude/skills/dropped-edited/SKILL.md"
    edited.write_text("old\nMINE\n")

    dry = run("update", "--target", str(project), "--dry-run").stdout
    assert "would remove 1 file(s) this build no longer ships" in dry, dry
    assert (project / ".claude/skills/dropped/SKILL.md").is_file()

    out = run("update", "--target", str(project)).stdout
    assert "removed 1 file(s) this build no longer ships" in out, out
    assert not (project / ".claude/skills/dropped").exists()
    assert "kept    1 file(s) this build no longer ships that you had edited" in out
    assert edited.read_text() == "old\nMINE\n"
    again = run("update", "--target", str(project)).stdout
    assert "that you had edited" not in again, "a kept edit is reported once"


def run_home(home, *args):
    return subprocess.run([sys.executable, "-m", "pstack_cli", *args], capture_output=True, text=True,
                          env={"PYTHONPATH": str(SRC), "PATH": "/usr/bin:/bin", "HOME": str(home)})


def test_user_install_retires_another_hosts_install_in_the_other_root(tmp_path):
    """A user-level Cursor install lives in ~/.cursor and every other host's in ~, so neither saw the other."""
    home = tmp_path / "home"
    home.mkdir()
    assert run_home(home, "init", "--user", "--host", "claude").returncode == 0
    edited = home / ".claude/skills/how/SKILL.md"
    edited.write_text(edited.read_text() + "\nMY EDIT\n")

    dry = run_home(home, "init", "--user", "--host", "cursor", "--dry-run").stdout
    assert f"would remove" in dry and (home / ".claude/skills/poteto-mode/SKILL.md").is_file(), dry

    out = run_home(home, "init", "--user", "--host", "cursor")
    assert out.returncode == 0, out.stderr
    assert f"the claude install in {home} left" in out.stdout, out.stdout
    assert not (home / ".claude/skills/poteto-mode").exists()
    assert "MY EDIT" in edited.read_text()
    assert (home / ".cursor/skills/poteto-mode/SKILL.md").is_file()
    again = run_home(home, "init", "--user", "--host", "cursor").stdout
    assert "that you had edited" not in again, again

    back = run_home(home, "init", "--user", "--host", "claude")
    assert back.returncode == 0, back.stderr
    assert not (home / ".cursor/skills/poteto-mode").exists(), back.stdout
    assert not (home / ".cursor/.pstack/receipt.json").exists(), "an emptied install keeps no receipt"
    assert receipt(home)["host"] == "claude"


def test_user_install_switches_host(tmp_path):
    """`--user` skipped the receipt, so a switch left the old host's files and profile behind."""
    home = tmp_path / "home"
    home.mkdir()

    def user(host):
        return run_home(home, "init", "--user", "--host", host)

    assert user("claude").returncode == 0
    out = user("codex")
    assert out.returncode == 0, out.stderr
    assert receipt(home)["host"] == "codex"
    assert not (home / ".claude/skills/poteto-mode").exists(), out.stdout
    assert (home / ".agents/skills/poteto-mode/SKILL.md").is_file()


def test_on_recreates_a_deleted_instructions_file(project):
    run("init", "--target", str(project), "--host", "claude")
    (project / "CLAUDE.md").unlink()
    out = run("on", "--target", str(project))
    assert "created CLAUDE.md" in out.stdout, out.stdout
    assert (project / "CLAUDE.md").read_text().count("pstack:mode:start") == 1


def test_every_subcommand_runs_without_crashing(project):
    """`pstack hosts` shipped a NameError because no test ever invoked it.

    Enumerate the parser's own subcommands and exercise each one, so adding a
    command without a test cannot pass again.
    """
    import argparse
    from pstack_cli.cli import main as _main  # noqa: F401
    from pstack_cli import cli as climod

    parser_cmds = set()
    ap = argparse.ArgumentParser()
    # rebuild the parser the same way main() does, then read its choices
    import contextlib, io
    with contextlib.redirect_stdout(io.StringIO()), contextlib.suppress(SystemExit):
        climod.main(["--help"])
    for action in (a for a in _build_parser()._actions if a.choices):
        parser_cmds |= set(action.choices)

    run("init", "--target", str(project), "--host", "claude")
    needs_arg = {"show": ["bug-fix"], "uninstall": ["--yes"]}
    for cmd in sorted(parser_cmds):
        args = [cmd, "--target", str(project)] if cmd not in ("hosts", "list") else [cmd]
        args += needs_arg.get(cmd, [])
        r = run(*args)
        assert "Traceback" not in r.stderr, f"`pstack {cmd}` crashed:\n{r.stderr}"
        assert r.returncode in (0, 1), f"`pstack {cmd}` exited {r.returncode}:\n{r.stderr}"
        if cmd == "uninstall":
            run("init", "--target", str(project), "--host", "claude")


def _build_parser():
    """Reconstruct the CLI parser to enumerate its subcommands."""
    import argparse
    from pstack_cli import cli as c
    ap = argparse.ArgumentParser(prog="pstack")
    sub = ap.add_subparsers(dest="cmd")
    for name in ("init", "status", "update", "uninstall", "on", "off",
                 "doctor", "hosts", "list", "show"):
        sub.add_parser(name)
    return ap


def test_update_detects_new_content_not_just_a_new_version(project, tmp_path, monkeypatch):
    """`update` said 'already up to date (1.0.0)' while carrying different content.

    The package version cannot answer that question: two wheels can share a version
    and ship different pstack builds. The receipt records a content id instead.
    """
    run("init", "--target", str(project), "--host", "claude")
    r = receipt(project)
    assert r["content"], "receipt must record which build it installed"
    assert len(r["content"]) == 12

    out = run("update", "--target", str(project))
    assert r["content"] in out.stdout, "update must name the build it is up to date with"
    assert "reinstall the" in out.stdout, "update must say how to get newer content"


def test_status_shows_the_content_id(project):
    run("init", "--target", str(project), "--host", "claude")
    out = run("status", "--target", str(project))
    assert "content" in out.stdout


START, END = "<!-- pstack:mode:start -->", "<!-- pstack:mode:end -->"
BODY = "If `.pstack/mode.md` exists"


def shipped(host):
    sys.path.insert(0, str(SRC))
    from pstack_cli.store import Build
    return {k for k in Build.load(host).paths() if k not in ("INSTALL.md", "CLAUDE.md")}


@pytest.mark.parametrize("purge", [False, True])
def test_uninstall_puts_back_the_file_pstack_replaced(tmp_path, purge):
    how = tmp_path / ".claude/skills/how/SKILL.md"
    how.parent.mkdir(parents=True)
    how.write_text("MY OWN HOW SKILL\n")
    run("init", "--target", str(tmp_path), "--host", "claude")
    assert "MY OWN" not in how.read_text()
    out = run("uninstall", "--target", str(tmp_path), "--yes", *(["--purge"] if purge else [])).stdout
    assert how.read_text() == "MY OWN HOW SKILL\n", out
    assert "restored 1 file(s)" in out
    assert not list(tmp_path.glob(".pstack/backup-*")), "a backup that went back is not kept twice"


def test_purge_keeps_a_backup_it_cannot_put_back(tmp_path):
    how = tmp_path / ".claude/skills/how/SKILL.md"
    how.parent.mkdir(parents=True)
    how.write_text("MINE\n")
    run("init", "--target", str(tmp_path), "--host", "claude")
    how.write_text(how.read_text() + "\nEDIT\n")
    out = run("uninstall", "--target", str(tmp_path), "--yes", "--purge").stdout
    assert "EDIT" in how.read_text()
    kept = list(tmp_path.glob(".pstack/backup-*/.claude/skills/how/SKILL.md"))
    assert kept and kept[0].read_text() == "MINE\n", out
    assert "backed-up file(s)" in out
    assert not (tmp_path / ".pstack/receipt.json").exists() and not (tmp_path / ".pstack/mode.md").exists()


def test_backups_never_overwrite_each_other(tmp_path):
    sys.path.insert(0, str(SRC))
    from pstack_cli.installer import backup
    from pstack_cli.receipt import Receipt
    f, r = tmp_path / "a.md", Receipt()
    for text in ("ONE\n", "TWO\n"):
        if f.exists():
            f.chmod(0o644)
        f.write_text(text)
        f.chmod(0o444)
        backup(tmp_path, r, ["a.md"])
    assert len(set(r.backups)) == 2, r.backups
    assert sorted((tmp_path / d / "a.md").read_text() for d in r.backups) == ["ONE\n", "TWO\n"]


@pytest.mark.skipif(os.geteuid() == 0, reason="root ignores permissions")
def test_a_failed_write_is_recorded_and_a_retry_completes(tmp_path):
    locked = tmp_path / ".claude/skills/how"
    locked.mkdir(parents=True)
    locked.chmod(0o555)
    r = run("init", "--target", str(tmp_path), "--host", "claude")
    locked.chmod(0o755)
    assert r.returncode == 1 and "Traceback" not in r.stderr and "could not write" in r.stdout, r.stdout + r.stderr
    assert receipt(tmp_path)["files"], "the files written before the failure are recorded"
    # With the record lost, files already identical on disk must still be recorded.
    (tmp_path / ".pstack/receipt.json").unlink()
    assert run("init", "--target", str(tmp_path), "--host", "claude").returncode == 0
    ship = shipped("claude")
    assert set(receipt(tmp_path)["files"]) == ship
    run("uninstall", "--target", str(tmp_path), "--yes")
    assert [k for k in ship if (tmp_path / k).exists()] == []


@pytest.mark.parametrize("bad", ['[]', '"x"', 'not json', '{"files": null}', '{"files": ["a"]}',
                                 '{"merged": null, "files": {}}', '{"reported": null, "files": {}, "host": "claude"}',
                                 '{"files": {"../outside.md": "0"}}', '{"backups": [".."]}', '{"backups": ["."]}',
                                 '{"backups": ["/tmp/elsewhere"]}', '{"backups": [".pstack/backup-1/../../outside"]}'])
def test_a_malformed_receipt_fails_cleanly(project, bad):
    run("init", "--target", str(project), "--host", "claude")
    (project / ".pstack/receipt.json").write_text(bad)
    for cmd in (["status"], ["update"], ["init", "--host", "codex"], ["doctor"], ["uninstall", "--yes"], ["on"]):
        r = run(*cmd, "--target", str(project))
        assert r.returncode == 1 and "Traceback" not in r.stderr, (cmd, r.stdout, r.stderr)
        assert "receipt.json" in r.stdout, (cmd, r.stdout)


def test_update_with_an_unknown_host_in_the_receipt_says_so(project):
    run("init", "--target", str(project), "--host", "claude")
    r = receipt(project)
    r["host"] = "nope"
    (project / ".pstack/receipt.json").write_text(json.dumps(r))
    out = run("update", "--target", str(project))
    assert out.returncode == 1 and "Traceback" not in out.stderr and "unknown host" in out.stdout


def test_uninstall_takes_its_block_and_on_then_refuses(project):
    run("init", "--target", str(project), "--host", "claude")
    run("uninstall", "--target", str(project), "--yes")
    assert (project / "CLAUDE.md").read_text() == "# Mine\nkeep me\n"
    r = run("on", "--target", str(project))
    assert r.returncode == 1 and "not installed" in r.stdout, r.stdout
    assert "points at" not in run("doctor", "--target", str(project)).stdout


def test_switch_uses_the_text_pstack_recorded_not_todays_build(tmp_path):
    """After a CLI upgrade, today's build no longer matches what an older build inserted."""
    run("init", "--target", str(tmp_path), "--host", "codex")
    mem = tmp_path / "AGENTS.md"
    older = mem.read_text().replace("## Non-negotiables", "## Rules")
    mem.write_text(older)
    r = receipt(tmp_path)
    r["inserted"]["AGENTS.md"] = [older]
    (tmp_path / ".pstack/receipt.json").write_text(json.dumps(r))
    out = run("init", "--target", str(tmp_path), "--host", "claude").stdout
    assert not mem.exists(), out


def test_switch_takes_the_block_from_a_section_you_edited(tmp_path):
    """An edit outside the block made the recorded text miss, and the CLI claimed the block was edited."""
    run("init", "--target", str(tmp_path), "--host", "codex")
    mem = tmp_path / "AGENTS.md"
    mem.write_text(mem.read_text().replace("## Non-negotiables", "## Rules"))
    out = run("init", "--target", str(tmp_path), "--host", "claude").stdout
    assert "removed pstack's text from AGENTS.md" in out and "was edited" not in out, out
    t = mem.read_text()
    assert "## Rules" in t and START not in t and END not in t, t


def test_an_edit_is_reported_again_after_the_file_ships_again(tmp_path):
    """Once pstack writes a file again, a later edit to it is news, and is reported."""
    run("init", "--target", str(tmp_path), "--host", "codex")
    how = tmp_path / ".agents/skills/how/SKILL.md"
    how.write_text(how.read_text() + "\nEDIT ONE\n")
    assert "that you had edited" in run("init", "--target", str(tmp_path), "--host", "claude").stdout
    run("init", "--target", str(tmp_path), "--host", "codex")
    assert receipt(tmp_path)["reported"] == [], "the rewritten file is still marked as reported"
    how.write_text(how.read_text() + "\nEDIT TWO\n")
    assert "that you had edited" in run("init", "--target", str(tmp_path), "--host", "claude").stdout


def test_update_reports_an_edited_file_the_build_dropped(project):
    run("init", "--target", str(project), "--host", "claude")
    (project / "old").mkdir()
    (project / "old/dropped.md").write_text("mine\n")
    r = receipt(project)
    r["files"]["old/dropped.md"] = "0" * 64
    (project / ".pstack/receipt.json").write_text(json.dumps(r))
    out = run("update", "--target", str(project)).stdout
    assert "that you had edited" in out and "Already up to date" not in out, out


def test_user_install_leaves_your_global_instructions_alone(tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    r = run_home(home, "init", "--user", "--host", "claude")
    assert r.returncode == 0 and not (home / "CLAUDE.md").exists(), r.stdout
    assert "the mode block is per project" in r.stdout


def test_switch_gives_back_your_whitespace_byte_for_byte(tmp_path):
    mem = tmp_path / "AGENTS.md"
    mem.write_bytes(b"mine   \n\n\n\n")
    run("init", "--target", str(tmp_path), "--host", "codex")
    mem.write_bytes(mem.read_bytes() + b"\n\n  after text\n")
    run("init", "--target", str(tmp_path), "--host", "claude")
    assert mem.read_bytes() == b"mine   \n\n\n\n\n\n  after text\n"


def test_switch_cleans_a_crlf_file_an_older_cli_wrote(tmp_path):
    mem = tmp_path / "AGENTS.md"
    mem.write_bytes(b"# Mine\r\n")
    run("init", "--target", str(tmp_path), "--host", "codex")
    r = receipt(tmp_path)
    r.pop("inserted")  # an older CLI recorded nothing it inserted
    (tmp_path / ".pstack/receipt.json").write_text(json.dumps(r))
    run("init", "--target", str(tmp_path), "--host", "claude")
    assert mem.read_bytes() == b"# Mine\r\n"


def test_switch_keeps_an_empty_file_you_had(tmp_path):
    mem = tmp_path / "AGENTS.md"
    mem.write_text("\n")
    run("init", "--target", str(tmp_path), "--host", "codex")
    run("init", "--target", str(tmp_path), "--host", "claude")
    assert mem.exists() and mem.read_text() == "\n", "pstack did not create it, so it stays"


def test_switch_removes_an_instructions_file_pstack_created(tmp_path):
    run("init", "--target", str(tmp_path), "--host", "codex")
    run("init", "--target", str(tmp_path), "--host", "claude")
    assert not (tmp_path / "AGENTS.md").exists()


def test_switch_leaves_files_behind_a_symlink(tmp_path):
    proj, shared = tmp_path / "p", tmp_path / "shared"
    proj.mkdir()
    shared.mkdir()
    (proj / ".agents").mkdir()
    (proj / ".agents/skills").symlink_to(shared)
    run("init", "--target", str(proj), "--host", "codex")
    count = sum(1 for p in shared.rglob("*") if p.is_file())
    out = run("init", "--target", str(proj), "--host", "claude").stdout
    assert "reached through a symlink" in out, out
    assert sum(1 for p in shared.rglob("*") if p.is_file()) == count


def test_doctor_flags_a_block_pointing_at_nothing(project):
    run("init", "--target", str(project), "--host", "claude")
    (project / "AGENTS.md").write_text(f"{START}\nread `.agents/skills/pstack-runtime/host-binding.md`\n{END}\n")
    out = run("doctor", "--target", str(project)).stdout
    assert "points at .agents/skills/pstack-runtime/host-binding.md" in out, out


def test_a_case_only_rename_does_not_delete_the_renamed_file(tmp_path):
    sys.path.insert(0, str(SRC))
    from pstack_cli.installer import retire
    from pstack_cli.receipt import Receipt, digest
    (tmp_path / "a").mkdir()
    old = tmp_path / "a/X.md"
    old.write_text("x\n")
    (tmp_path / "a/x.md").symlink_to("X.md")  # stands in for a case-insensitive disk: two names, one file
    Receipt(host="claude", files={"a/X.md": digest(old)}).save(tmp_path)
    res = retire(tmp_path, None, frozenset({"a/x.md"}))
    assert old.exists() and res["removed"] == []
    assert "a/X.md" not in Receipt.load(tmp_path).files


def test_on_repairs_duplicate_and_swapped_blocks(project):
    run("init", "--target", str(project), "--host", "claude")
    mem = project / "CLAUDE.md"
    text = mem.read_text()
    block = text[text.index(START):text.index(END) + len(END)]
    mem.write_text(text + "\n" + block + "\n")
    assert "more than one pstack block" in run("doctor", "--target", str(project)).stdout
    run("on", "--target", str(project))
    t = mem.read_text()
    assert t.count(START) == 1 and t.count(END) == 1 and t.count(BODY) == 1, t

    inner = block[len(START):-len(END)]
    mem.write_text(t.replace(block, END + inner + START))
    assert "repaired" in run("on", "--target", str(project)).stdout
    t = mem.read_text()
    assert t.count(START) == t.count(END) == 1 and t.index(START) < t.index(END), t
    assert t.count(BODY) == 1 and "keep me" in t, "the orphaned body was left behind"


def test_a_linked_instructions_file_gets_this_hosts_block(tmp_path):
    (tmp_path / "AGENTS.md").write_text("# Team rules\nbe nice\n")
    run("init", "--target", str(tmp_path), "--host", "codex")
    (tmp_path / "CLAUDE.md").symlink_to("AGENTS.md")
    out = run("init", "--target", str(tmp_path), "--host", "claude").stdout
    t = (tmp_path / "AGENTS.md").read_text()
    assert "be nice" in t and t.count(START) == 1, out
    assert ".claude/skills/pstack-runtime/host-binding.md" in t and ".agents/skills/pstack-runtime" not in t, t
    assert "was edited" not in out, "the shared file was treated as the old host's and misreported"
    assert (tmp_path / "CLAUDE.md").is_symlink()
    assert "points at" not in run("doctor", "--target", str(tmp_path)).stdout


def test_instructions_file_keeps_its_mode(project):
    mem = project / "CLAUDE.md"
    mem.chmod(0o640)
    run("init", "--target", str(project), "--host", "claude")
    assert mem.stat().st_mode & 0o777 == 0o640


def test_init_force_help_says_it_changes_nothing():
    assert "no effect" in run("init", "--help").stdout


def uninstall(target, *extra):
    return run("uninstall", "--target", str(target), "--yes", *extra)


def own_how(root, text="MINE\n"):
    how = root / ".claude/skills/how/SKILL.md"
    how.parent.mkdir(parents=True, exist_ok=True)
    how.write_text(text)
    return how


def test_settle_ignores_backup_entries_outside_pstack(tmp_path):
    sys.path.insert(0, str(SRC))
    from pstack_cli.installer import settle_backups
    from pstack_cli.receipt import Receipt
    victim = tmp_path / "victim" / "secret.txt"
    victim.parent.mkdir()
    victim.write_text("SECRET\n")
    proj = tmp_path / "proj"
    (proj / ".pstack").mkdir(parents=True)
    (proj / "src").mkdir()
    (proj / "src/main.py").write_text("print('mine')\n")
    stolen = tmp_path / "elsewhere" / "backup-1" / "stolen.md"
    stolen.parent.mkdir(parents=True)
    stolen.write_text("NOT YOURS\n")
    for bad in ("..", ".", str(tmp_path / "victim"), "../victim", "../elsewhere/backup-1"):
        assert settle_backups(proj, Receipt(backups=[bad])) == ([], []), bad
    assert victim.read_text() == "SECRET\n" and (proj / "src/main.py").exists()
    assert stolen.exists() and not (proj / "stolen.md").exists(), "a backup outside .pstack/ was moved in"


def test_update_survives_a_recorded_file_gone_in_another_case(project):
    run("init", "--target", str(project), "--host", "claude")
    r = receipt(project)
    r["files"]["usage.md"] = "0" * 64
    (project / ".pstack/receipt.json").write_text(json.dumps(r))
    for cmd in (["update"], ["update", "--dry-run"], ["init", "--host", "claude"]):
        out = run(*cmd, "--target", str(project))
        assert out.returncode == 0 and "Traceback" not in out.stderr, (cmd, out.stderr)


def test_a_case_twin_that_is_another_file_is_still_removed(tmp_path):
    sys.path.insert(0, str(SRC))
    from pstack_cli.installer import retire
    from pstack_cli.receipt import Receipt, digest
    (tmp_path / "a").mkdir()
    old, new = tmp_path / "a/X.md", tmp_path / "a/x.md"
    old.write_text("old\n")
    new.write_text("new\n")
    Receipt(host="claude", files={"a/X.md": digest(old)}).save(tmp_path)
    res = retire(tmp_path, None, frozenset({"a/x.md"}))
    assert res["removed"] == ["a/X.md"] and not old.exists() and new.exists()


def test_uninstall_survives_a_restore_that_cannot_land(tmp_path):
    own_how(tmp_path)
    run("init", "--target", str(tmp_path), "--host", "claude")
    shutil.rmtree(tmp_path / ".claude")
    (tmp_path / ".claude").write_text("a file now\n")
    r = uninstall(tmp_path)
    assert r.returncode == 0 and "Traceback" not in r.stderr, r.stderr
    assert "backed-up file(s)" in r.stdout and not (tmp_path / ".pstack/receipt.json").exists()


def test_switch_puts_back_the_file_pstack_replaced(tmp_path):
    how = own_how(tmp_path, "MY OWN\n")
    run("init", "--target", str(tmp_path), "--host", "claude")
    dry = run("init", "--target", str(tmp_path), "--host", "codex", "--dry-run").stdout
    assert "would restore 1 file(s)" in dry, dry
    out = run("init", "--target", str(tmp_path), "--host", "codex").stdout
    assert how.read_text() == "MY OWN\n" and "restored 1 file(s)" in out, out


def test_a_linked_instructions_file_is_cleaned_up_whole(tmp_path):
    run("init", "--target", str(tmp_path), "--host", "codex")
    (tmp_path / "CLAUDE.md").symlink_to("AGENTS.md")
    run("init", "--target", str(tmp_path), "--host", "claude")
    t = (tmp_path / "AGENTS.md").read_text()
    assert "`$poteto-mode`" not in t and "`/poteto-mode`" in t, "the old host's prose lingers"
    out = uninstall(tmp_path).stdout
    assert not (tmp_path / "AGENTS.md").exists(), out
    assert (tmp_path / "CLAUDE.md").is_symlink(), "pstack deleted your link instead of its own file"
    assert "was edited" not in out
    assert "backed-up" not in out, "a copy of nothing but pstack's own text was kept and reported"


def test_cursor_replaces_a_claude_block_it_reaches_through_a_link(tmp_path):
    (tmp_path / ".cursor/rules").mkdir(parents=True)
    run("init", "--target", str(tmp_path), "--host", "claude")
    os.symlink("../../CLAUDE.md", tmp_path / ".cursor/rules/pstack.mdc")
    run("init", "--target", str(tmp_path), "--host", "cursor")
    t = (tmp_path / "CLAUDE.md").read_text()
    assert "`skills/pstack-runtime/host-binding.md`" in t and "`.claude/skills/pstack-runtime" not in t, t


def test_an_instructions_file_linking_outside_is_left_alone(tmp_path):
    proj, outside = tmp_path / "p", tmp_path / "out"
    (proj / ".claude").mkdir(parents=True)
    (proj / "CLAUDE.md").symlink_to(outside / "sub" / "CLAUDE.md")
    r = run("init", "--target", str(proj), "--host", "claude")
    assert r.returncode == 0 and not outside.exists(), r.stdout + r.stderr
    assert "links outside this project" in r.stdout


def test_uninstall_finds_its_text_after_line_endings_change(tmp_path):
    mem = tmp_path / "AGENTS.md"
    mem.write_bytes(b"# mine\r\nrule\r\n")
    run("init", "--target", str(tmp_path), "--host", "codex")
    mem.write_bytes(mem.read_bytes().replace(b"\r\n", b"\n"))
    uninstall(tmp_path)
    assert mem.read_bytes() == b"# mine\nrule\n"


@pytest.mark.skipif(os.geteuid() == 0, reason="root ignores permissions")
def test_a_linked_instructions_file_in_a_read_only_folder_is_written_in_place(tmp_path):
    shared = tmp_path / "shared"
    shared.mkdir()
    (shared / "AGENTS.md").write_text("# team rules\n")
    (tmp_path / "AGENTS.md").symlink_to("shared/AGENTS.md")
    shared.chmod(0o555)
    try:
        r = run("init", "--target", str(tmp_path), "--host", "codex")
    finally:
        shared.chmod(0o755)
    assert r.returncode == 0 and "Traceback" not in r.stderr, r.stdout + r.stderr
    t = (shared / "AGENTS.md").read_text()
    assert t.startswith("# team rules\n") and START in t


def test_on_does_not_pile_up_backups(project):
    run("init", "--target", str(project), "--host", "claude")
    mem = project / "CLAUDE.md"
    t = mem.read_text()
    bare = t[:t.index(START)] + t[t.index(END) + len(END):]
    for _ in range(3):
        mem.write_text(bare)
        run("on", "--target", str(project))
    assert len(list(project.glob(".pstack/backup-*"))) == 2, "an unchanged file was backed up again"


def test_the_instructions_file_is_backed_up_and_the_copy_cleared(project):
    run("init", "--target", str(project), "--host", "claude")
    saved = list(project.glob(".pstack/backup-*/CLAUDE.md"))
    assert saved and saved[0].read_text() == "# Mine\nkeep me\n", "no copy before pstack edited it"
    uninstall(project)
    assert (project / "CLAUDE.md").read_text() == "# Mine\nkeep me\n"
    assert not list(project.glob(".pstack/backup-*")), "a copy identical to the file stayed behind"


def test_uninstall_does_not_replace_a_link_you_put_there(tmp_path):
    how = own_how(tmp_path)
    run("init", "--target", str(tmp_path), "--host", "claude")
    how.unlink()
    how.symlink_to(tmp_path / "nowhere.md")
    out = uninstall(tmp_path).stdout
    assert how.is_symlink() and "backed-up file(s)" in out, out


def test_uninstall_does_not_restore_through_a_linked_folder(tmp_path):
    own_how(tmp_path)
    run("init", "--target", str(tmp_path), "--host", "claude")
    outside = tmp_path / "outside"
    outside.mkdir()
    shutil.rmtree(tmp_path / ".claude/skills/how")
    (tmp_path / ".claude/skills/how").symlink_to(outside)
    uninstall(tmp_path)
    assert list(outside.iterdir()) == []


def test_put_back_refuses_a_path_behind_a_link(tmp_path):
    sys.path.insert(0, str(SRC))
    from pstack_cli.installer import put_back
    saved = tmp_path / ".pstack/backup-1/dir/f.md"
    saved.parent.mkdir(parents=True)
    saved.write_text("MINE\n")
    outside = tmp_path / "outside"
    outside.mkdir()
    (tmp_path / "dir").symlink_to(outside)
    assert put_back(tmp_path, [tmp_path / ".pstack/backup-1"], "dir/f.md") is False
    assert list(outside.iterdir()) == [] and saved.read_text() == "MINE\n"


def test_put_back_reports_a_restore_that_cannot_land(tmp_path):
    sys.path.insert(0, str(SRC))
    from pstack_cli.installer import put_back
    saved = tmp_path / ".pstack/backup-1/dir/f.md"
    saved.parent.mkdir(parents=True)
    saved.write_text("MINE\n")
    (tmp_path / "dir").write_text("a file where the folder was\n")
    assert put_back(tmp_path, [tmp_path / ".pstack/backup-1"], "dir/f.md") is False
    assert saved.read_text() == "MINE\n"


def test_uninstall_finds_backups_the_receipt_does_not_list(tmp_path):
    how = own_how(tmp_path)
    run("init", "--target", str(tmp_path), "--host", "claude")
    r = receipt(tmp_path)
    r["backups"] = []
    (tmp_path / ".pstack/receipt.json").write_text(json.dumps(r))
    uninstall(tmp_path)
    assert how.read_text() == "MINE\n"


def test_strip_leaves_an_instructions_file_outside_the_project(tmp_path):
    sys.path.insert(0, str(SRC))
    from pstack_cli.installer import strip_memory
    from pstack_cli.receipt import Receipt
    outside = tmp_path / "outside.md"
    outside.write_text("mine\nPSTACK\n")
    proj = tmp_path / "proj"
    proj.mkdir()
    (proj / "CLAUDE.md").symlink_to(outside)
    r = Receipt(host="claude", merged={"CLAUDE.md": "append"}, inserted={"CLAUDE.md": ["PSTACK\n"]})
    assert strip_memory(proj, r, "CLAUDE.md", "claude") is None
    assert outside.read_text() == "mine\nPSTACK\n"


def test_uninstall_restores_the_newest_backup_and_keeps_the_older(tmp_path):
    how = own_how(tmp_path, "ORIGINAL\n")
    run("init", "--target", str(tmp_path), "--host", "claude")
    how.write_text("EDIT\n")
    run("init", "--target", str(tmp_path), "--host", "claude")
    out = uninstall(tmp_path, "--purge").stdout
    assert how.read_text() == "EDIT\n", out
    kept = list(tmp_path.glob(".pstack/backup-*/.claude/skills/how/SKILL.md"))
    assert [k.read_text() for k in kept] == ["ORIGINAL\n"], out


def test_newer_insertions_are_taken_out_first(tmp_path):
    sys.path.insert(0, str(SRC))
    from pstack_cli.installer import strip_memory
    from pstack_cli.receipt import Receipt
    mem = tmp_path / "CLAUDE.md"
    mem.write_text("mine\n\nBLOCK\nEXTRA\n")
    r = Receipt(host="claude", merged={"CLAUDE.md": "append"},
                inserted={"CLAUDE.md": ["\nBLOCK\n", "\nBLOCK\nEXTRA\n"]})
    strip_memory(tmp_path, r, "CLAUDE.md", "claude")
    assert mem.read_text() == "mine\n"


def test_recreating_the_instructions_file_records_only_the_new_text(tmp_path):
    run("init", "--target", str(tmp_path), "--host", "claude")
    (tmp_path / "CLAUDE.md").unlink()
    run("on", "--target", str(tmp_path))
    assert len(receipt(tmp_path)["inserted"]["CLAUDE.md"]) == 1


def test_init_records_an_identical_file_its_receipt_missed(project):
    run("init", "--target", str(project), "--host", "claude")
    key = ".claude/skills/how/SKILL.md"
    r = receipt(project)
    del r["files"][key]
    (project / ".pstack/receipt.json").write_text(json.dumps(r))
    run("init", "--target", str(project), "--host", "claude")
    assert key in receipt(project)["files"]


def test_update_and_on_leave_a_user_root_alone(tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    assert run_home(home, "init", "--user", "--host", "codex").returncode == 0
    up = run_home(home, "update", "--target", str(home))
    assert up.returncode == 0, up.stderr
    assert not any((home / p).exists() for p in ("docs", "automations", "AGENTS.md")), up.stdout
    on = run_home(home, "on", "--target", str(home))
    assert on.returncode == 1 and "per project" in on.stdout, on.stdout
    doc = run_home(home, "doctor", "--target", str(home)).stdout
    assert "instructions file missing" not in doc and "looks like" not in doc, doc
    # A receipt from before scopes were recorded is still known by where it sits.
    r = receipt(home)
    r.pop("scope")
    (home / ".pstack/receipt.json").write_text(json.dumps(r))
    run_home(home, "update", "--target", str(home), "--force")
    assert not any((home / p).exists() for p in ("docs", "automations", "AGENTS.md"))


def test_doctor_on_a_cursor_user_root_does_not_guess_another_host(tmp_path):
    home = tmp_path / "home"
    (home / ".claude").mkdir(parents=True)
    assert run_home(home, "init", "--user", "--host", "cursor").returncode == 0
    doc = run_home(home, "doctor", "--target", str(home / ".cursor")).stdout
    assert "looks like" not in doc, doc


def test_purge_keeps_run_records_unless_asked(project):
    for extra, kept in (([], True), (["--delete-runs"], False)):
        run("init", "--target", str(project), "--host", "claude")
        runs = project / ".pstack/runs"
        runs.mkdir(parents=True, exist_ok=True)
        (runs / "r1.json").write_text("{}")
        out = uninstall(project, "--purge", *extra).stdout
        assert (runs / "r1.json").exists() is kept, out
        assert not (project / ".pstack/receipt.json").exists()
        assert ("run record" in out) is kept, out


def test_update_prints_only_what_changed(project):
    run("init", "--target", str(project), "--host", "claude")
    out = run("update", "--target", str(project)).stdout
    assert "Already up to date" in out, out
    assert not any(w in out for w in ("frontend", "restart", "mode.md")), out
    skill = project / ".claude/skills/how/SKILL.md"
    skill.write_text(skill.read_text() + "\nMY EDIT\n")
    out = run("update", "--target", str(project)).stdout
    assert "Already up to date" in out and "you edited" in out, out


def test_init_names_the_files_it_backed_up(tmp_path):
    own_how(tmp_path)
    out = run("init", "--target", str(tmp_path), "--host", "claude").stdout
    assert ".claude/skills/how/SKILL.md" in out and ".pstack/backup-" in out, out
    assert "backups    1 file(s)" in run("status", "--target", str(tmp_path)).stdout


def test_a_replaced_file_keeps_its_permissions(tmp_path):
    how = own_how(tmp_path)
    how.chmod(0o600)
    run("init", "--target", str(tmp_path), "--host", "claude")
    assert how.stat().st_mode & 0o777 == 0o600 and "MINE" not in how.read_text()


@pytest.mark.parametrize("host", ["claude", "codex", "copilot", "cursor", "generic"])
def test_installed_scripts_are_executable(tmp_path, host):
    sys.path.insert(0, str(SRC))
    from pstack_cli.store import Build
    execs = sorted(Build.load(host).exec_paths)
    assert any(p.endswith("worktree-audit.sh") for p in execs), "the store recorded no exec bit"
    run("init", "--target", str(tmp_path), "--host", host)
    for rel in execs:
        assert os.access(tmp_path / rel, os.X_OK), rel
    # An install from before the store kept exec bits gets them from update.
    script = tmp_path / next(p for p in execs if p.endswith("worktree-audit.sh"))
    script.chmod(0o644)
    run("update", "--target", str(tmp_path))
    assert os.access(script, os.X_OK), "update left an older install's script unexecutable"


def test_a_user_root_switch_leaves_your_global_instructions_alone(tmp_path):
    sys.path.insert(0, str(SRC))
    from pstack_cli.store import Build
    home = tmp_path / "home"
    home.mkdir()
    text = Build.load("codex").read("AGENTS.md").decode()
    mine = "# mine\n\n" + text[text.index(START):text.index(END) + len(END)] + "\n"  # pasted by hand
    (home / "AGENTS.md").write_text(mine)
    assert run_home(home, "init", "--user", "--host", "codex").returncode == 0
    assert run_home(home, "init", "--user", "--host", "claude").returncode == 0
    assert (home / "AGENTS.md").read_text() == mine


def test_a_user_install_leaves_project_docs_out_of_home(tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    out = run_home(home, "init", "--user", "--host", "claude").stdout
    assert not any((home / p).exists() for p in ("USAGE.md", "REFERENCE.md", ".claude-plugin")), out
    assert (home / ".claude/skills/poteto-mode/SKILL.md").is_file()


def test_off_and_status_agree_with_on_at_a_user_root(tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    run_home(home, "init", "--user", "--host", "claude")
    off = run_home(home, "off", "--target", str(home))
    assert off.returncode == 1 and "per project" in off.stdout, off.stdout
    status = run_home(home, "status", "--target", str(home)).stdout
    assert "per project" in status and "pstack on" not in status, status


def test_update_at_a_user_root_that_changes_files_leaves_instructions_alone(tmp_path):
    home = tmp_path / "home"
    home.mkdir()
    run_home(home, "init", "--user", "--host", "codex")
    (home / ".agents/skills/how/SKILL.md").unlink()
    out = run_home(home, "update", "--target", str(home)).stdout
    assert "updated 1 file(s)" in out, out
    assert not (home / "AGENTS.md").exists(), "update merged an instructions file into a home directory"


def test_update_keeps_the_user_scope_where_the_location_cannot_tell(tmp_path):
    root, elsewhere = tmp_path / "h1", tmp_path / "other"
    root.mkdir()
    elsewhere.mkdir()
    run_home(root, "init", "--user", "--host", "codex")
    (root / ".agents/skills/how/SKILL.md").unlink()
    run_home(elsewhere, "update", "--target", str(root))  # this HOME is not root, so only the receipt knows
    assert receipt(root)["scope"] == "user"
    assert not (root / "AGENTS.md").exists()


def test_init_names_every_file_it_saved(project):
    own_how(project)
    out = run("init", "--target", str(project), "--host", "claude").stdout
    assert "saved   2 file(s)" in out and "CLAUDE.md" in out and ".claude/skills/how/SKILL.md" in out, out
    assert "backups    2 file(s)" in run("status", "--target", str(project)).stdout


def test_a_repaired_block_in_a_file_pstack_created_leaves_nothing_behind(tmp_path):
    run("init", "--target", str(tmp_path), "--host", "codex")
    mem = tmp_path / "AGENTS.md"
    mem.write_text(mem.read_text().replace(END, ""))
    assert "repaired" in run("on", "--target", str(tmp_path)).stdout
    assert not list(tmp_path.glob(".pstack/backup-*")), "a copy of nothing but pstack's text was taken"
    out = uninstall(tmp_path).stdout
    assert not mem.exists() and "backed-up" not in out, out


def test_a_linked_switch_leaves_no_backup_to_compare(tmp_path):
    mem = tmp_path / "AGENTS.md"
    mem.write_text("# Team rules\nbe nice\n")
    run("init", "--target", str(tmp_path), "--host", "codex")
    (tmp_path / "CLAUDE.md").symlink_to("AGENTS.md")
    run("init", "--target", str(tmp_path), "--host", "claude")
    out = uninstall(tmp_path).stdout
    assert mem.read_text() == "# Team rules\nbe nice\n" and "backed-up" not in out, out


def test_ours_only_takes_newer_insertions_first(tmp_path):
    sys.path.insert(0, str(SRC))
    from pstack_cli.installer import ours_only
    from pstack_cli.receipt import Receipt
    (tmp_path / "CLAUDE.md").write_text("\nBLOCK\nEXTRA\n")
    r = Receipt(host="claude", inserted={"CLAUDE.md": ["\nBLOCK\n", "\nBLOCK\nEXTRA\n"]})
    assert ours_only(tmp_path, r, "CLAUDE.md")
