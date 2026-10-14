"""check-plan.mjs, the multi-phase plan checker.

It passed the playbook's raw skeleton, every placeholder unfilled, with no problems. Its first fix
then flagged legitimate plans for angle brackets that were never the skeleton's placeholders.
"""
import re
import shutil
import subprocess
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
SCRIPT = REPO / "core" / "skills" / "poteto-mode" / "scripts" / "check-plan.mjs"
PLAYBOOK = REPO / "core" / "playbooks" / "multi-phase-plan.md"
FILLED = Path(__file__).parent / "fixtures" / "check_plan" / "filled-plan.md"
LOOP_VARS = re.compile(r"<(?:pr-id|n|slug|base-branch|head-branch|head SHA)>")

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="needs node")


def check(path, script=SCRIPT):
    return subprocess.run(["node", str(script), str(path)], capture_output=True, text=True)


def skeleton():
    return PLAYBOOK.read_text().replace("\r\n", "\n").split("````markdown\n", 1)[1].split("\n````", 1)[0]


def lone_script(tmp_path, playbook_bytes):
    """The script with a playbook of our choosing beside it, in the installed layout."""
    (tmp_path / "scripts").mkdir()
    (tmp_path / "playbooks").mkdir()
    shutil.copy(SCRIPT, tmp_path / "scripts/check-plan.mjs")
    (tmp_path / "playbooks/multi-phase-plan.md").write_bytes(playbook_bytes)
    return tmp_path / "scripts/check-plan.mjs"


def write(tmp_path, lines, newline="\n"):
    plan = tmp_path / "plan.md"
    plan.write_bytes(newline.join(lines).encode())
    return plan


def mutate(anchor, fn):
    lines = FILLED.read_text().split("\n")
    i = next(i for i, l in enumerate(lines) if l.startswith(anchor))
    lines[i] = fn(lines[i])
    return lines, i


def test_every_skeleton_line_with_a_placeholder_is_reported(tmp_path):
    lines = skeleton().split("\n")
    expected, loop = set(), False
    for n, line in enumerate(lines, 1):
        if re.match(r"#{2,3} ", line):
            loop = ", for every " in line
        # A template block keeps its loop variables in code.
        if loop:
            line = re.sub(r"`[^`]*`", lambda m: LOOP_VARS.sub("", m.group(0)), line)
        if re.search(r"<[^<>]+>", line):
            expected.add(n)
    r = check(write(tmp_path, lines + [""]))
    assert r.returncode == 1, r.stdout + r.stderr
    got = {int(n) for n in re.findall(r"plan\.md:(\d+): unfilled placeholder", r.stderr)}
    assert got == expected, f"missed {sorted(expected - got)}, extra {sorted(got - expected)}"
    for slot in ("<Program>", "<PR id>", "<path>", "<slug>", "<command>", "<execution playbook>", "<predicate>"):
        assert slot in r.stderr, slot


@pytest.mark.parametrize("newline", ["\n", "\r\n"])
def test_filled_plan_passes(tmp_path, newline):
    r = check(write(tmp_path, FILLED.read_text().split("\n"), newline))
    assert r.returncode == 0, r.stdout + r.stderr
    assert "1 PR sections, 0 problems" in r.stdout


def test_old_audit_cadence_is_rejected(tmp_path):
    lines, _ = mutate("- [ ] On the operator's go, schedule", lambda l: l.replace("hourly audit", "30-minute audit"))
    r = check(write(tmp_path, lines))
    assert r.returncode == 1
    assert 'Program checklist lacks "hourly audit"' in r.stderr


@pytest.mark.parametrize("model", ["grok-4.7-xhigh-fast", "gpt-6-sol"])
def test_live_lanes_accept_the_resolved_worker_model(tmp_path, model):
    lines, _ = mutate("**Verify, live.**", lambda l: l.replace("`gpt-6-sol`", f"`{model}`"))
    r = check(write(tmp_path, lines))
    assert r.returncode == 0, r.stdout + r.stderr


@pytest.mark.parametrize("lanes", [
    "Ten lanes on `<swarm workers model>` at the PR head",
    "Ten lanes on the `fast` class at the PR head",
])
def test_live_lanes_require_a_filled_worker_model(tmp_path, lanes):
    lines, _ = mutate("**Verify, live.**", lambda l: l.replace("Ten lanes on `gpt-6-sol` at the PR head", lanes))
    r = check(write(tmp_path, lines))
    assert r.returncode == 1
    assert "with the model filled in" in r.stderr


BOOT = "- [ ] Add `toCsv`"
FALSE_POSITIVES = {
    "generic type in prose": ("Server-side zip", lambda l: l + " A Map<string, Row> held every row."),
    "generic type in code": (BOOT, lambda l: "- [ ] Add `toCsv(rows: Array<Row>): string` in `src/export/csv.ts`."),
    "html tags": ("Read docs/export.md.", lambda l: l + " Press <kbd>Ctrl</kbd> and E. See <details> in the doc."),
    "html image": ("Streaming beat", lambda l: l + ' <img src="docs/media/proto.png" width="400">'),
    "email": ("PR-1 risks", lambda l: l + " Ping <ops@example.com> on alerts."),
    "autolink": ("Read docs/export.md.", lambda l: l + " See <https://example.com/docs>."),
    "comparison": ("PR-1 risks", lambda l: l + " Here x<y and y>z both hold."),
    "cli usage": (BOOT, lambda l: "- [ ] Add the `app export <path>` subcommand in `src/export/csv.ts`."),
    "cli flag": (BOOT, lambda l: "- [ ] Add `--limit <n>` to `app export` in `src/export/csv.ts`."),
    "tilde fence": ("Server-side zip", lambda l: l + "\n\n~~~ts\nconst m: Map<string, number> = new Map();\n~~~"),
    "indented fence": (BOOT, lambda l: l + "\n\n  ```ts\n  const m: Map<string, number> = new Map();\n  ```"),
    "indented code block": ("Server-side zip", lambda l: l + "\n\n    x: y — z\n"),
}


@pytest.mark.parametrize("case", sorted(FALSE_POSITIVES))
def test_angle_brackets_that_are_not_placeholders_pass(tmp_path, case):
    lines, _ = mutate(*FALSE_POSITIVES[case])
    r = check(write(tmp_path, lines))
    assert r.returncode == 0, r.stdout + r.stderr


def test_a_loop_variable_outside_its_template_block_is_reported(tmp_path):
    assert "`git fetch origin <head-branch> && git checkout <head SHA>`" in FILLED.read_text()
    lines, i = mutate("- [ ] Root's clean verdict", lambda l: "- [ ] Root's clean verdict at `<head SHA>`.")
    r = check(write(tmp_path, lines))
    assert r.returncode == 1
    assert f"plan.md:{i + 1}: unfilled placeholder <head SHA>" in r.stderr, r.stderr


def test_one_unfilled_slot_is_reported_with_its_line(tmp_path):
    lines, i = mutate("- [ ] Edit `", lambda l: "- [ ] Edit `<path>`.")
    r = check(write(tmp_path, lines))
    assert r.returncode == 1
    assert f"plan.md:{i + 1}: unfilled placeholder <path>" in r.stderr, r.stderr


@pytest.mark.parametrize("anchor,add,flag", [
    (BOOT, "\n\n    Continued paragraph — with a long dash.", "long dash"),
    ("Server-side zip", "\n\n1. A step.\n\n    Its second paragraph: has a mid-sentence colon.", "mid-sentence colon"),
    (BOOT, "\n\n    - a nested item: with a colon", "mid-sentence colon"),
    # Four columns in after a paragraph: in a plan that is a nested item, and it gets checked.
    ("Server-side zip", "\n\n    - an indented item: with a colon", "mid-sentence colon"),
])
def test_prose_inside_a_list_item_is_checked(tmp_path, anchor, add, flag):
    lines, _ = mutate(anchor, lambda l: l + add)
    r = check(write(tmp_path, lines))
    assert r.returncode == 1 and flag in r.stderr, r.stdout + r.stderr


def test_code_inside_a_list_item_stays_code(tmp_path):
    lines, _ = mutate(BOOT, lambda l: l + "\n\n      x: y — z")
    r = check(write(tmp_path, lines))
    assert r.returncode == 0, r.stdout + r.stderr


def test_a_crlf_playbook_still_supplies_the_placeholders(tmp_path):
    crlf = PLAYBOOK.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
    r = check(write(tmp_path, skeleton().split("\n") + [""]), lone_script(tmp_path, crlf))
    assert r.returncode == 1 and "unfilled placeholder" in r.stderr, r.stdout + r.stderr


def test_a_playbook_without_a_skeleton_is_refused(tmp_path):
    r = check(FILLED, lone_script(tmp_path, b"### Multi-phase plan\n\nno skeleton here\n"))
    assert r.returncode == 2 and "no placeholders" in r.stderr, r.stdout + r.stderr


def test_without_its_playbook_the_script_refuses(tmp_path):
    lone = tmp_path / "scripts" / "check-plan.mjs"
    lone.parent.mkdir()
    shutil.copy(SCRIPT, lone)
    r = check(FILLED, lone)
    assert r.returncode == 2 and "multi-phase-plan.md" in r.stderr
