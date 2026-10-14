"""Completion contracts using synthetic receipts, not simulated model executions."""
import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "core/skills/poteto-mode/scripts/run-record.py"
spec = importlib.util.spec_from_file_location("contract_recorder", SCRIPT)
recorder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recorder)
CATALOG = json.loads(SCRIPT.with_name("routes.json").read_text())


@pytest.fixture
def run(tmp_path, monkeypatch, capsys):
    monkeypatch.chdir(tmp_path)

    def invoke(*args, code=0):
        actual = recorder.main(list(args))
        captured = capsys.readouterr()
        output = captured.out + captured.err
        assert actual == code, output
        return output

    return invoke


def receipt(run, root, phase, kind, result="pass"):
    output = root / ".pstack" / f"{phase}-{kind}-{result}.txt"
    output.write_text(f"Synthetic {kind} receipt: {result}\n")
    run("evidence", "--kind", kind, "--result", result, "--phase", phase, "--output", str(output))
    return output


def finish_phase(run, root, route, phase):
    run("phase", phase, "--start")
    gate = CATALOG[route]["contract"]["gates"].get(phase, {})
    if gate.get("delegate"):
        run("delegate", "--job", phase, "--phase", phase, "--role", "pstack-worker", "--model", "inherit")
    if gate.get("evidence"):
        receipt(run, root, phase, gate["evidence"])
    run("phase", phase, "--done")


# A route whose contract says `run: false` (Pause safely) records on the task's run, never its own.
RUN_ROUTES = sorted(r for r in CATALOG if CATALOG[r]["contract"].get("run", True))
RUNLESS = sorted(set(CATALOG) - set(RUN_ROUTES))


@pytest.mark.parametrize("route", RUN_ROUTES)
def test_bundled_route_cannot_complete_without_evidence(run, route):
    run("init", "--route", route, "--task", "No work performed")
    for phase in CATALOG[route]["phases"]:
        run("phase", phase["id"], "--done")
    assert "INCOMPLETE" in run("check", code=1)


@pytest.mark.parametrize("route", RUNLESS)
def test_a_runless_route_starts_no_run(run, tmp_path, route):
    run("init", "--route", route, "--task", "pause here", code=2)
    assert not list((tmp_path / ".pstack" / "runs").glob("*.json"))


def test_pause_safely_is_runless():
    assert RUNLESS == ["pause-safely"], RUNLESS


@pytest.mark.parametrize("route", sorted(set(RUN_ROUTES) - {"bug-fix"}))
def test_bundled_contract_accepts_required_phase_receipts(run, tmp_path, route):
    run("init", "--route", route, "--task", "Exercise the recorded requirements")
    for phase in CATALOG[route]["phases"]:
        finish_phase(run, tmp_path, route, phase["id"])
    assert "satisfies its recorded completion requirements" in run("check")


def test_builtin_contract_cannot_be_replaced_or_narrowed_in_an_old_record(run, tmp_path):
    assert "cannot replace a built-in" in run("init", "--route", "bug-fix", "--phases", "plan", "--task", "t", code=2)
    run("init", "--route", "bug-fix", "--task", "t")
    path = next((tmp_path / ".pstack/runs").glob("*.json"))
    rec = json.loads(path.read_text())
    rec["phases_required"] = ["plan"]
    path.write_text(json.dumps(rec))
    assert "required phases differ" in run("check", code=1)


@pytest.mark.parametrize("route,phase", [("feature", "step-4"), ("feature", "step-5"), ("bug-fix", "verify")])
def test_mandatory_phase_skip_is_rejected(run, route, phase):
    run("init", "--route", route, "--task", "t")
    assert "mandatory requirement cannot be skipped" in run("phase", phase, "--skip", "No time", code=2)


def test_legacy_skipped_verification_still_blocks_completion(run, tmp_path):
    run("init", "--route", "bug-fix", "--task", "t")
    run("phase", "verify", "--done")
    path = next((tmp_path / ".pstack/runs").glob("*.json"))
    rec = json.loads(path.read_text())
    rec["phases"][-1].update(status="skip", note="Old recorder allowed this")
    path.write_text(json.dumps(rec))
    output = run("check", code=1)
    assert "mandatory requirement cannot be skipped" in output
    assert "verify: no verification recorded" in output


def test_feature_reverse_order_is_incomplete_despite_all_receipts(run, tmp_path):
    run("init", "--route", "feature", "--task", "t")
    for phase in reversed(CATALOG["feature"]["phases"]):
        finish_phase(run, tmp_path, "feature", phase["id"])
    assert "marked done before" in run("check", code=1)


def test_failed_review_requires_a_later_passing_review_and_detects_staleness(run, tmp_path):
    source = tmp_path / "app.py"
    source.write_text("value = 1\n")
    run("init", "--route", "custom", "--phases", "review", "--task", "t")
    run("phase", "review", "--start")
    receipt(run, tmp_path, "review", "review", "fail")
    run("phase", "review", "--done")
    assert "unresolved fail review verdict" in run("check", code=1)
    run("phase", "review", "--start")
    receipt(run, tmp_path, "review", "review")
    run("phase", "review", "--done")
    run("check")
    source.write_text("value = 2\n")
    assert "stale review evidence" in run("check", code=1)


def test_feature_evidence_is_bound_to_phase_attempt_and_current_tree(run, tmp_path):
    source = tmp_path / "app.py"
    source.write_text("value = 1\n")
    run("init", "--route", "feature", "--task", "t")
    for phase in CATALOG["feature"]["phases"]:
        finish_phase(run, tmp_path, "feature", phase["id"])
    run("check")
    run("phase", "step-5", "--start")
    run("phase", "step-5", "--done")
    assert "no verify evidence for this phase attempt" in run("check", code=1)
    run("phase", "step-5", "--start")
    receipt(run, tmp_path, "step-5", "verify")
    run("phase", "step-5", "--done")
    run("check")
    source.write_text("value = 2\n")
    assert "step-5: stale verify evidence" in run("check", code=1)


def test_tasks_preserve_full_steps_and_follow_recorded_progress(run):
    run("init", "--route", "feature", "--task", "t")
    tasks = json.loads(run("tasks", "--json"))["tasks"]
    assert len(tasks) == 8 and all(t["status"] == "pending" for t in tasks)
    source = (ROOT / "core/playbooks/feature.md").read_text()
    expected = source[source.index("3. "):source.index("4. ")].rstrip()
    assert tasks[2]["text"] == expected
    assert tasks[4]["requirements"]["step-5"]["evidence"] == "verify"
    run("phase", "step-1", "--start")
    assert json.loads(run("tasks", "--json"))["tasks"][0]["status"] == "in_progress"
    run("phase", "step-1", "--done")
    run("phase", "step-2", "--skip", "No design boundary")
    tasks = json.loads(run("tasks", "--json"))["tasks"]
    assert tasks[0]["status"] == "done" and tasks[1]["status"] == "skipped"
    assert tasks[1]["notes"] == {"step-2": "No design boundary"}


def test_pr_tracking_uses_exported_named_phases(run):
    run("init", "--route", "opening-a-pr", "--task", "t")
    first = json.loads(run("tasks", "--json"))["tasks"][0]
    assert first["phases"] == ["worktree"]
    run("phase", first["phases"][0], "--start")


def test_bespoke_routes_need_output_and_unique_phase_ids(run):
    run("init", "--route", "figure-it-out", "--phases", "survey,survey", "--task", "t", code=2)
    run("init", "--route", "figure-it-out", "--phases", "survey", "--task", "t")
    run("phase", "survey", "--done")
    assert "no artifact evidence" in run("check", code=1)


def test_model_name_validation_discloses_unverified_availability():
    from pstack_cli.profile import Report, check_model, report_models
    report = Report()
    check_model("codex", "gpt-imaginary-audit-only", "fixture", report)
    report_models(report)
    assert not report.errors
    assert any("availability" in w and "unverified" in w for w in report.warnings)


def _profile(tmp_path, host_json, models_md):
    base = tmp_path / ".pstack"
    base.mkdir()
    (base / "host.json").write_text(json.dumps(host_json))
    (base / "models.md").write_text(models_md)
    return tmp_path


HOST = {"host": "codex", "tier": 2,
        "capabilities": {"DELEGATE": {"value": True, "source": "observed"},
                         "PARALLEL": {"value": True, "source": "observed"},
                         "MODEL_CHOICE": {"value": "partial", "source": "observed"}},
        "models": {"deep": "gpt-a", "fast": "gpt-b", "panel": ["gpt-a", "gpt-c"]}}
MODELS = "arena-runners: gpt-a, gpt-c\ninterrogate-reviewers: gpt-a, gpt-c\n"


def test_a_model_is_reported_once_however_often_it_is_configured(tmp_path):
    from pstack_cli.profile import check_profile
    report = check_profile(_profile(tmp_path, HOST, MODELS), "codex")
    about_a = [w for w in report.warnings if "`gpt-a`" in w]
    assert len(about_a) == 1, report.warnings
    assert "models.deep" in about_a[0] and "models.panel" in about_a[0]
    assert ".pstack/models.md:1, 2" in about_a[0]


def test_models_a_session_addressed_are_not_flagged(tmp_path):
    from pstack_cli.profile import check_profile
    host = {**HOST, "available_models": ["inherit", "gpt-a", "gpt-b", "gpt-c"]}
    report = check_profile(_profile(tmp_path, host, MODELS), "codex")
    assert not report.errors
    assert not [w for w in report.warnings if "gpt-" in w], report.warnings


def test_a_configured_model_the_session_did_not_address_is_named(tmp_path):
    from pstack_cli.profile import check_profile
    host = {**HOST, "available_models": ["gpt-a", "gpt-b"]}
    report = check_profile(_profile(tmp_path, host, MODELS), "codex")
    flagged = [w for w in report.warnings if "gpt-" in w]
    assert len(flagged) == 1 and "`gpt-c`" in flagged[0] and "available_models" in flagged[0], flagged


def test_available_models_must_be_a_list_of_names(tmp_path):
    from pstack_cli.profile import check_profile
    report = check_profile(_profile(tmp_path, {**HOST, "available_models": "gpt-a"}, MODELS), "codex")
    assert any("available_models must be a list" in e for e in report.errors)
