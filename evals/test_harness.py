#!/usr/bin/env python3
"""Tests for the eval harness itself. No model calls.

    python3 evals/test_harness.py

Needs git and, for the pstack-arm dry run, the pstack CLI. The baseline fixture is bundled.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import traceback
from pathlib import Path

EVALS = Path(__file__).resolve().parent
FIX = EVALS / "fixtures"
TASK = EVALS / "tasks" / "webhook-portable.json"
sys.path.insert(0, str(EVALS))
import analyze  # noqa: E402
import compare  # noqa: E402

FIXTURE_SNAPSHOT = EVALS / json.loads(TASK.read_text())["fixture"]["snapshot"]
TMP = Path(tempfile.mkdtemp(prefix="evals-test-"))


class Skip(Exception):
    pass


def parsed(name):
    events, bad = analyze.read_jsonl(FIX / name)
    assert bad == 0, f"{name}: {bad} non-JSON lines"
    p = analyze.parse_claude(events)
    analyze.enrich(p, p["meta"]["init"]["cwd"])
    return p


def by_id(findings):
    return {f["id"]: f for f in findings}


def test_real_trivial_transcript_parses():
    """The recorded real call: init, rate_limit_event, one assistant text, result."""
    events, bad = analyze.read_jsonl(FIX / "claude-trivial.stream.jsonl")
    assert bad == 0
    assert [e["type"] for e in events] == ["system", "rate_limit_event", "assistant", "result"], [e["type"] for e in events]
    p = analyze.parse_claude(events)
    assert p["meta"]["init"]["claude_code_version"] == "2.1.238"
    assert p["meta"]["init"]["session_id"]
    r = p["meta"]["result"]
    assert r["subtype"] == "success" and r["total_cost_usd"] > 0 and r["usage"]["output_tokens"] > 0
    assert p["steps"] == [] and p["texts"][-1]["text"].strip() == "ok"


def test_transcript_parsing_pairs_calls_and_results():
    p = parsed("claude-conforming.stream.jsonl")
    names = [s["name"] for s in p["steps"]]
    assert names[:3] == ["Bash", "Read", "Bash"], names[:3]
    assert all(s["result"] is not None for s in p["steps"]), "every tool_use must pair with its tool_result"
    failing = [s for s in p["steps"] if s["test_run"] == "fail"]
    assert len(failing) == 1 and failing[0]["is_error"] is True
    reads = [r["path"] for r in analyze.pstack_reads(p)]
    assert reads == [".claude/skills/poteto-mode/playbooks/bug-fix.md", ".claude/skills/no-comments/SKILL.md",
                     ".claude/skills/interrogate/SKILL.md"], reads
    rr = analyze.run_record_info(p)
    subs = [c["subcommand"] for c in rr["commands"]]
    assert subs[:4] == ["init", "baseline", "evidence", "phase"], subs
    assert rr["final_check"]["exit"] == 0 and "complete through commits" in rr["final_check"]["output"]
    delegate_steps = [s for s in p["steps"] if s["actor"].startswith("delegate:")]
    assert [s["name"] for s in delegate_steps] == ["Read", "Edit", "Bash"]


def test_bash_write_inference():
    w = analyze.bash_writes
    assert w("cat > src/webhook.py <<'EOF'\nx = 1 > 0\nEOF") == ["src/webhook.py"]
    assert w("python3 run_tests.py 2>&1 | tee /tmp/out.txt") == ["/tmp/out.txt"]
    assert w("echo hi >/dev/null 2>&1") == []
    assert w("sed -i 's/a/b/' src/webhook.py") == ["src/webhook.py"]
    assert w('p = pathlib.Path("src/webhook.py"); s = p.read_text(); p.write_text(s)') == ["src/webhook.py"]
    assert w("cd /tmp/scratch && cat > repro.py <<'EOF'\nx\nEOF") == ["/tmp/scratch/repro.py"]
    assert analyze.classify(analyze.rel("/tmp/scratch/repro.py", "/w")) == "other"
    assert analyze.classify(analyze.rel("/w/.claude/worktrees/agent-1/src/webhook.py", "/w")) == "code"
    assert analyze.classify("$SP/repro.py") == "other"
    run = lambda c: bool(analyze.TEST_RUN.search(c))
    assert run("python3 run_tests.py") and run("python3 -m pytest -q") and run("cd x && pytest tests")
    assert not run("cat run_tests.py tests/test_webhook.py") and not run("grep -n x verify_durability.py")
    assert "skills/why/SKILL.md" in analyze.expand_loops("for s in how why; do cat .claude/skills/$s/SKILL.md; done")
    assert analyze.classify("src/webhook.py") == "code" and analyze.classify("tests/test_webhook.py") == "test"
    assert analyze.classify("verify_durability.py") == "test" and analyze.classify(".pstack/runs/x.json") == "pstack"


def test_delegate_extraction():
    p = parsed("claude-conforming.stream.jsonl")
    ds = analyze.delegates(p)
    assert [d["subagent_type"] for d in ds] == ["pstack-reviewer", "pstack-reviewer", "pstack-worker",
                                                "comment-sicko", "pstack-reviewer"], ds
    impl = ds[2]
    assert impl["model"] == "opus" and impl["isolation"] == "worktree" and impl["run_in_background"] is False
    assert impl["description"] == "implement durable claim"
    assert ds[0]["run_in_background"] is True and ds[0]["isolation"] is None
    assert parsed("claude-violating.stream.jsonl") and analyze.delegates(parsed("claude-violating.stream.jsonl")) == []


def test_phase_order_conforming():
    po = analyze.phase_order(parsed("claude-conforming.stream.jsonl"), None)
    f = by_id(po["findings"])
    for k in ("repro_before_fix", "implementation_delegated", "no_comments_before_review", "verify_after_last_change"):
        assert f[k]["status"] == "pass", (k, f[k])
        assert f[k]["evidence"] and all(isinstance(e, str) for e in f[k]["evidence"])
    assert f["test_commit_before_fix_commit"]["status"] == "unknown"
    assert any("#" in e for e in f["repro_before_fix"]["evidence"]), "evidence must cite transcript steps"


def test_phase_order_violating():
    po = analyze.phase_order(parsed("claude-violating.stream.jsonl"), None)
    f = by_id(po["findings"])
    for k in ("repro_before_fix", "implementation_delegated", "no_comments_before_review", "verify_after_last_change"):
        assert f[k]["status"] == "fail", (k, f[k])
    assert any("parent edited code" in e and "src/webhook.py" in e for e in f["implementation_delegated"]["evidence"])
    assert any("no test/harness edit before it" in e for e in f["repro_before_fix"]["evidence"])
    assert any("last code/test change" in e and "Edit" in e for e in f["verify_after_last_change"]["evidence"])


def git(repo, *a):
    return subprocess.run(["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@t", *a],
                          check=True, capture_output=True, text=True).stdout.strip()


def make_repo(name, commits):
    repo = TMP / name
    repo.mkdir()
    git(repo, "init", "-q")
    (repo / "README.md").write_text("x\n")
    git(repo, "add", "-A")
    git(repo, "commit", "-qm", "base")
    base = git(repo, "rev-parse", "HEAD")
    for msg, files in commits:
        for f in files:
            (repo / f).parent.mkdir(parents=True, exist_ok=True)
            (repo / f).write_text(msg + "\n")
        git(repo, "add", "-A")
        git(repo, "commit", "-qm", msg)
    return repo, base


def test_git_history_order():
    good, base = make_repo("good", [("test: failing restart", ["tests/test_webhook.py"]),
                                    ("fix: durable ledger", ["src/webhook.py"])])
    info = analyze.git_history(good, base, {"path": str(good), "ref": "HEAD"}, {}, replay=False)
    assert analyze.history_finding(info)["status"] == "pass"
    bad, base = make_repo("bad", [("fix and tests", ["tests/test_webhook.py", "src/webhook.py"])])
    info = analyze.git_history(bad, base, {"path": str(bad), "ref": "HEAD"}, {}, replay=False)
    f = analyze.history_finding(info)
    assert f["status"] == "fail" and any("no test-only commit" in e for e in f["evidence"]), f


def test_analyze_and_compare_end_to_end():
    run = TMP / "run-synthetic"
    run.mkdir()
    shutil.copy(FIX / "claude-conforming.stream.jsonl", run / "transcript.jsonl")
    (run / "run.json").write_text(json.dumps({"task": "webhook-durable-idempotence", "task_file": str(TASK),
                                              "host": "claude", "arm": "pstack", "status": "completed",
                                              "wall_clock_seconds": 1500.0, "exit_code": 0,
                                              "transcript_format": "claude-stream-json"}))
    assert analyze.main([str(run), "--no-oracle"]) == 0
    r = json.loads((run / "result.json").read_text())
    assert r["cost_usd"] == 18.25 and r["tokens"]["output_tokens"] == 45000
    assert len(r["delegates"]) == 5 and r["phase_order"]["passed"] == 4
    assert (run / "summary.md").read_text().startswith("# Eval run: webhook-durable-idempotence / claude / pstack")
    skipped = TMP / "run-skipped"
    skipped.mkdir()
    (skipped / "status.json").write_text(json.dumps({"status": "skipped", "reason": "skipped: codex CLI not installed",
                                                     "host": "codex", "arm": "baseline", "task": "webhook-durable-idempotence"}))
    rows = [compare.row(compare.load(p)) for p in (run, skipped)]
    assert rows[0][:5] == ["pstack", "claude", "webhook-durable-idempotence", "skipped", "4/5"], rows[0]
    assert rows[0][6:8] == ["25.0 min", "$18.25"] and rows[1][-1] == "skipped: codex CLI not installed"


def export_fixture(dest):
    shutil.copytree(FIXTURE_SNAPSHOT, dest, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    return dest


def oracle(tree, out):
    r = subprocess.run([sys.executable, str(EVALS / "oracle" / "webhook" / "oracle.py"), "--tree", str(tree),
                        "--slow-send", "3", "--recovery-window", "60", "--json", str(out)],
                       capture_output=True, text=True, timeout=900)
    return r, json.loads(Path(out).read_text())


def test_oracle_fails_every_check_on_portable_baseline():
    tree = export_fixture(TMP / "portable-baseline")
    r, data = oracle(tree, TMP / "oracle-f13.json")
    print(r.stdout)
    assert r.returncode == 1, r.stdout + r.stderr
    assert data["total"] == 10 and data["passed"] == 0, [(c["name"], c["status"]) for c in data["checks"]]


def test_oracle_passes_reference_fix():
    tree = export_fixture(TMP / "reference")
    shutil.copy(EVALS / "oracle" / "webhook" / "reference" / "webhook.py", tree / "src" / "webhook.py")
    r, data = oracle(tree, TMP / "oracle-ref.json")
    print(r.stdout)
    assert r.returncode == 0 and data["passed"] == data["total"] == 10, r.stdout + r.stderr


def run_py(*args, env=None):
    return subprocess.run([sys.executable, str(EVALS / "run.py"), "--task", str(TASK), *args],
                          capture_output=True, text=True, env=env, timeout=300)


def test_run_missing_cli_is_skipped():
    out = TMP / "skip-claude"
    r = run_py("--host", "claude", "--arm", "baseline", "--out", str(out), "--cli-bin", str(TMP / "no-such-claude"))
    assert r.returncode == 0 and r.stdout.strip() == "skipped: claude CLI not installed", (r.returncode, r.stdout, r.stderr)
    st = json.loads((out / "status.json").read_text())
    assert st["status"] == "skipped" and st["reason"] == "skipped: claude CLI not installed"
    empty = TMP / "empty-bin"
    empty.mkdir()
    env = {**os.environ, "PATH": str(empty)}
    r = run_py("--host", "codex", "--arm", "pstack", "--out", str(TMP / "skip-codex"), env=env)
    assert r.returncode == 0 and r.stdout.strip() == "skipped: codex CLI not installed", (r.stdout, r.stderr)
    r = run_py("--host", "copilot", "--arm", "pstack", "--out", str(TMP / "skip-copilot"), env=env)
    assert r.returncode == 0 and r.stdout.strip() == "skipped: copilot CLI not installed", (r.stdout, r.stderr)


def fake_cli():
    p = TMP / "fake-claude"
    if not p.exists():
        p.write_text("#!/bin/sh\necho fake 0.0\n")
        p.chmod(0o755)
    return p


def test_run_requires_explicit_permission():
    r = run_py("--host", "claude", "--arm", "baseline", "--out", str(TMP / "noperm"), "--cli-bin", str(fake_cli()))
    assert r.returncode == 2 and "--permission is required" in r.stderr, r.stderr
    r = run_py("--host", "claude", "--arm", "baseline", "--out", str(TMP / "badperm"), "--cli-bin", str(fake_cli()),
               "--permission", "yolo")
    assert r.returncode == 2 and "not valid for claude" in r.stderr, r.stderr


def test_run_dry_run_prepares_both_arms():
    files_before = {str(p.relative_to(FIXTURE_SNAPSHOT)): p.read_bytes() for p in FIXTURE_SNAPSHOT.rglob("*") if p.is_file()}
    roots = TMP / "workdirs"
    roots.mkdir()
    out = TMP / "dry-baseline"
    r = run_py("--host", "claude", "--arm", "baseline", "--out", str(out), "--cli-bin", str(fake_cli()),
               "--permission", "acceptEdits", "--dry-run", "--workdir-root", str(roots))
    assert r.returncode == 0, r.stderr
    meta = json.loads((out / "run.json").read_text())
    work = Path(meta["workdir"])
    assert meta["command"][1:3] == ["-p", meta["prompt"]] and not meta["prompt"].startswith("/")
    assert meta["command"][3:8] == ["--output-format", "stream-json", "--verbose", "--permission-mode", "acceptEdits"]
    assert not (work / ".claude").exists() and not (work / "CLAUDE.md").exists() and not (work / ".pstack").exists()
    assert (work / "src" / "webhook.py").is_file()
    assert git(work, "log", "-1", "--format=%s") == "eval: portable baseline"
    assert git(work, "remote") == "", "the clone must have no remote"
    assert meta["base_commit"] == git(work, "rev-parse", "HEAD")
    if not shutil.which("pstack"):
        raise Skip("pstack CLI not installed; baseline dry run checked, pstack arm not")
    out = TMP / "dry-pstack"
    r = run_py("--host", "claude", "--arm", "pstack", "--out", str(out), "--cli-bin", str(fake_cli()),
               "--permission", "bypassPermissions", "--dry-run", "--workdir-root", str(roots))
    assert r.returncode == 0, r.stderr
    meta = json.loads((out / "run.json").read_text())
    work = Path(meta["workdir"])
    assert meta["prompt"].startswith("/poteto-mode _claimed is process memory")
    assert (work / ".claude" / "skills" / "poteto-mode" / "playbooks" / "bug-fix.md").is_file()
    assert "active: true" in (work / ".pstack" / "mode.md").read_text()
    assert git(work, "log", "-1", "--format=%s") == "eval: install pstack"
    assert git(work, "status", "--porcelain") == ""
    files_after = {str(p.relative_to(FIXTURE_SNAPSHOT)): p.read_bytes() for p in FIXTURE_SNAPSHOT.rglob("*") if p.is_file()}
    assert files_before == files_after, "the fixture snapshot must not change"


TESTS = [v for k, v in list(globals().items()) if k.startswith("test_") and callable(v)]


def main():
    failed = skipped = 0
    for t in TESTS:
        try:
            t()
            print(f"  PASS  {t.__name__}")
        except Skip as e:
            skipped += 1
            print(f"  SKIP  {t.__name__}: {e}")
        except Exception:
            failed += 1
            print(f"  FAIL  {t.__name__}\n" + "".join("        " + l for l in traceback.format_exc().splitlines(True)))
    shutil.rmtree(TMP, ignore_errors=True)
    print(f"\n{'FAILED' if failed else 'OK'}: {len(TESTS)} tests, {failed} failing, {skipped} skipped")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
