import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[2]
COMPANION = ROOT / 'tools/portable/assets/skills/poteto-mode/scripts/check-portable-plan.mjs'
RULE = ('Tests alone are not sufficient verification. A PR is verified only when its unit, '
        'live, and perf boxes are all checked.')


class PortablePlanTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='portable plan with spaces ')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.skills = self.root / 'installed snapshot/skills'
        shutil.copytree(ROOT / 'pstack/skills', self.skills)
        self.script = self.skills / 'poteto-mode/scripts/check-portable-plan.mjs'
        shutil.copyfile(COMPANION, self.script)
        self.upstream = self.script.with_name('check-plan.mjs')
        self.plan = self.root / 'plans with spaces/my plan.md'
        self.plan.parent.mkdir()
        self.cwd = self.root / 'unrelated consumer repo'
        self.cwd.mkdir()
        self.contract = {
            'version': 1,
            'skillsRoot': '../installed snapshot/skills',
            'executionPlaybook': 'poteto-mode/playbooks/autopilot-stack.md',
            'readAt': ['start', 'every-audit'],
            'auditEveryMinutes': 60,
            'wakeMechanism': 'exposed session wait tool',
            'wakeEvidence': 'receipts/session-tools.txt#wait-schema',
            'availableLifetime': 'active-session',
            'requiredLifetime': 'active-session',
            'stopWhen': 'All PR evidence is reviewed or the operator says hold.',
            'checkpoint': 'receipts/program-checkpoint.md',
        }
        self.env = {key: value for key, value in os.environ.items() if key != 'NODE_OPTIONS'}

    def plan_text(self, contract=None):
        contract = self.contract if contract is None else contract
        lanes = '\n'.join(
            f'- [ ] Lane {i}. Drive the real CLI case {i}. Save `lane-{i}.png`. Pass when the expected exit code appears.'
            for i in range(1, 11))
        return f'''# Verify the portable CLI

One PR improves the CLI and keeps its evidence reviewable.

## How to read this

One box is one unit of work and names the evidence.
Check a box only when its evidence exists.
Use `playbooks/autopilot-stack.md` for execution.
{RULE}

## Program checklist

### Arm the program

Read the installed snapshot at start and at every audit.
Use the declared wake mechanism only after the operator's go.
Post a status message only for a tracked change.

```portable-runtime
{json.dumps(contract, indent=2)}
```

### Spawn owners

- [ ] Spawn one owner at the verified PR head.

### PR mechanics

- [ ] Follow opening-a-pr and preserve the operator's requested draft status.

### Verdict and merge

- [ ] Audit every receipt and hold the review gate before merge.

### Boot recipe

- [ ] Run the CLI at the exact PR head in an isolated worktree.

## Improve the CLI (PR 1)

**Depends on.** None.

**Files.**

- [ ] Edit `src/cli.js`.

**Build.**

- [ ] Add the portable plan command.

**You see.**

- [ ] The CLI prints the structural verdict and runtime gaps.

**Verify, unit.** {RULE}

- [ ] Run `python3 -m unittest test_plan` and save the output.

**Verify, live.** {RULE} Ten lanes on `inherit-parent` at the PR head.

{lanes}

**Verify, perf.** {RULE}

- [ ] Metric. Measure elapsed CLI time at trunk and head.
- [ ] Probe. Interleave the same input on trunk and head.
- [ ] Baseline. Record the trunk value first.
- [ ] Rule. Fail if the head exceeds 100 ms for added work or the comparable trunk by 10 percent.

**Review gate.** The operator reviews before merge.

- [ ] Save screenshot receipts and a video, then wait for operator review.

**Merge.**

- [ ] Wait for the operator to land the reviewed stack.

## Close the program

- [ ] Every box has its evidence.

## Appendix A. Prototype evidence

Record the actual prototype branch, SHA, receipts, and remaining unproven claims before execution.
'''

    def invoke(self, text=None, script=None, args=None, code=0):
        if text is not None:
            self.plan.write_text(text)
        result = subprocess.run(['node', str(script or self.script), *(args if args is not None else [str(self.plan)])],
                                cwd=self.cwd, env=self.env, text=True, capture_output=True, timeout=15)
        self.assertEqual(result.returncode, code, result.stdout + result.stderr)
        return result

    def test_honest_portable_plan_preserves_upstream_result_and_snapshot(self):
        raw = self.plan_text()
        self.assertNotIn('git show origin/main:', raw)
        self.assertNotIn('/loop 1h', raw)
        original = self.invoke(raw, script=self.upstream, code=1)
        self.assertIn('1 PR sections, 2 problems', original.stdout)
        self.assertEqual([line.split(': ', 1)[1] for line in original.stderr.splitlines()], [
            'Program checklist lacks "git show origin/main:"', 'Program checklist lacks "/loop 1h"'])
        portable = self.invoke(code=0)
        self.assertIn('1 PR sections, 2 problems', portable.stdout)
        self.assertEqual(portable.stdout.count('Compatibility substitution.'), 2)
        self.assertIn('Portable STRUCTURE PASS', portable.stdout)
        self.assertIn('Runtime assertions UNVERIFIED', portable.stdout)
        self.assertNotIn('Runtime BLOCKED', portable.stdout)
        self.assertEqual(portable.stderr, '')
        self.assertEqual(self.plan.read_text(), raw)
        for resource in ['poteto-mode/playbooks/autopilot-stack.md', 'swarm/SKILL.md',
                         'poteto-mode/playbooks/opening-a-pr.md']:
            digest = hashlib.sha256((self.skills / resource).read_bytes()).hexdigest()
            self.assertIn(f'Installed snapshot SHA256 "{resource}" {digest}', portable.stdout)

    def test_reviewed_checker_keeps_example_fences_out_of_plan_structure(self):
        examples = [
            '   ```markdown\n## Example only\n   ```\n',
            '````markdown\n```markdown\n## Example only\n```\n````\n',
            '~~~markdown `info`\n## Example only\n ~~~\n',
            '````markdown\n~~~\n## Example only\n````\n',
        ]
        for example in examples:
            with self.subTest(example=example):
                result = self.invoke(self.plan_text() + '\n' + example)
                self.assertIn('Portable STRUCTURE PASS', result.stdout)
                self.assertIn('1 PR sections, 2 problems', result.stdout)
        result = self.invoke(self.plan_text() + '\n```markdown\n## Example only\n```  \n## Example only\n', code=1)
        self.assertIn('after Close the program is not an appendix', result.stderr)
        self.assertIn('Portable STRUCTURE FAIL', result.stdout)

    def test_every_substantive_gate_remains_upstream_authority(self):
        base = self.plan_text()
        mutations = [
            ('missing lane 10', base.replace(next(line for line in base.splitlines() if line.startswith('- [ ] Lane 10.')) + '\n', ''), 'expected 1 to 10'),
            ('duplicate lane 10', base.replace('- [ ] Lane 9.', '- [ ] Lane 10.'), 'expected 1 to 10'),
            ('screenshot', base.replace('Save `lane-10.png`.', ''), 'lane 10 names no screenshot'),
            ('pass predicate', base.replace('Pass when the expected exit code appears.', 'Expected exit code appears.', 1), 'has no pass predicate'),
            ('perf item', base.replace('- [ ] Probe. Interleave the same input on trunk and head.\n', ''), 'perf boxes'),
            ('review gate', base.replace('- [ ] Save screenshot receipts and a video, then wait for operator review.\n', ''), 'Review gate has no box'),
            ('unit box', base.replace('- [ ] Run `python3 -m unittest test_plan` and save the output.\n', ''), 'Verify, unit. has no box'),
            ('rule', base.replace(f'**Verify, live.** {RULE}', '**Verify, live.** Verify later.'), 'does not open with the rule'),
            ('missing evidence appendix', base.replace('## Appendix A. Prototype evidence', '## Appendix A. Notes'), 'Prototype evidence'),
            ('sub-block', base.replace('**Files.**', '**Sources.**'), 'sub-blocks are'),
            ('program heading', base.replace('### Spawn owners', '### Dispatch'), 'Spawn owners'),
            ('status marker', base.replace('status message', 'update'), 'status message'),
        ]
        for name, changed, diagnostic in mutations:
            with self.subTest(name=name):
                original = self.invoke(changed, script=self.upstream, code=1)
                actual = self.invoke(code=1)
                self.assertIn('Portable STRUCTURE FAIL', actual.stdout)
                self.assertIn(diagnostic, actual.stderr)
                expected = [line for line in original.stderr.splitlines()
                            if not line.endswith(('Program checklist lacks "git show origin/main:"',
                                                  'Program checklist lacks "/loop 1h"'))]
                self.assertEqual(actual.stderr.splitlines(), expected)

    @unittest.skipIf(os.name == 'nt', 'Skills CLI symlink fixture requires POSIX symlinks')
    def test_skills_only_symlink_alias_keeps_resources_in_same_bundle(self):
        aliases = self.root / '.claude/skills'
        aliases.mkdir(parents=True)
        for skill in self.skills.iterdir():
            (aliases / skill.name).symlink_to(skill, target_is_directory=True)
        self.contract['skillsRoot'] = str(aliases)
        script = aliases / 'poteto-mode/scripts/check-portable-plan.mjs'
        result = self.invoke(self.plan_text(), script=script)
        self.assertIn('Portable STRUCTURE PASS', result.stdout)
        self.assertIn('Runtime assertions UNVERIFIED', result.stdout)
        foreign = self.root / 'different bundle/swarm'
        foreign.mkdir(parents=True)
        (foreign / 'SKILL.md').write_text('A different installed skill.\n')
        (aliases / 'swarm').unlink()
        (aliases / 'swarm').symlink_to(foreign, target_is_directory=True)
        rejected = self.invoke(script=script, code=1)
        self.assertIn('same installed snapshot', rejected.stderr)
        self.assertIn('Portable STRUCTURE FAIL', rejected.stdout)

    def test_legacy_markers_never_bypass_contract(self):
        base = self.plan_text().replace('### Arm the program', '### Arm the program\n\n`git show origin/main:` and `/loop 1h`.')
        valid = self.invoke(base)
        self.assertIn('1 PR sections, 0 problems', valid.stdout)
        self.assertNotIn('Compatibility substitution.', valid.stdout)
        for invalid in [base.replace('```portable-runtime', '```json'),
                        base.replace('"auditEveryMinutes": 60', '"auditEveryMinutes": 120')]:
            with self.subTest(invalid=invalid):
                self.invoke(invalid, script=self.upstream)
                result = self.invoke(code=1)
                self.assertIn('Portable contract FAIL', result.stderr)
                self.assertIn('Portable STRUCTURE FAIL', result.stdout)

    def test_contract_syntax_duplicates_and_unknown_fields_fail(self):
        base = self.plan_text()
        block = f'```portable-runtime\n{json.dumps(self.contract, indent=2)}\n```'
        mutations = [
            base.replace(block, ''),
            base.replace(block, block + '\n\n' + block),
            base.replace('"version": 1,', '"version": 1, "version": 1,'),
            base.replace('"version": 1,', '"version": 1, "\\u0076ersion": 1,'),
            base.replace('"version": 1,', '"version": 1, "command": "echo nope",'),
            base.replace('"version": 1,', '"version": 1,, '),
            base.replace(block, '```portable-runtime\n' + json.dumps(self.contract)),
            base.replace(block, '```portable-runtime\n[]\n```'),
        ]
        for text in mutations:
            with self.subTest(text=text):
                result = self.invoke(text, code=1)
                self.assertIn('Portable contract FAIL', result.stderr)
                self.assertNotIn('Portable STRUCTURE PASS', result.stdout)
                self.assertNotIn('Compatibility substitution.', result.stdout)

    def test_contract_examples_and_wrong_locations_cannot_substitute_markers(self):
        base = self.plan_text()
        block = f'```portable-runtime\n{json.dumps(self.contract, indent=2)}\n```'
        examples = [
            base.replace(block, '') + '\n' + block,
            base.replace(block, f'~~~markdown\n{block}\n~~~'),
            base.replace(block, f'````markdown\n{block}\n````'),
            base.replace(block, '') + '\n## Program checklist\n### Arm the program\n' + block,
        ]
        for text in examples:
            with self.subTest(text=text):
                result = self.invoke(text, code=1)
                self.assertIn('Portable contract FAIL', result.stderr)
                self.assertNotIn('Portable STRUCTURE PASS', result.stdout)
                self.assertNotIn('Compatibility substitution.', result.stdout)
        nested_example = f'\n~~~markdown\n{block}\n~~~\n'
        result = self.invoke(base + nested_example)
        self.assertIn('Portable STRUCTURE PASS', result.stdout)

    def test_contract_values_and_contradictions_fail(self):
        mutations = [
            {'version': 2}, {'executionPlaybook': '../outside.md'},
            {'readAt': ['start']}, {'readAt': ['every-audit', 'start']},
            {'auditEveryMinutes': '60'}, {'auditEveryMinutes': 0},
            {'requiredLifetime': 'forever'}, {'availableLifetime': 'maybe'},
            {'wakeMechanism': None}, {'wakeEvidence': ''},
            {'wakeMechanism': None, 'availableLifetime': 'unavailable'},
            {'availableLifetime': 'unavailable'}, {'stopWhen': ' '}, {'checkpoint': ''},
        ]
        for changes in mutations:
            with self.subTest(changes=changes):
                result = self.invoke(self.plan_text(self.contract | changes), code=1)
                self.assertIn('Portable contract FAIL', result.stderr)

    def test_missing_wake_and_insufficient_lifetime_are_blocked(self):
        for changes in [
            {'wakeMechanism': None, 'wakeEvidence': None, 'availableLifetime': 'unavailable'},
            {'requiredLifetime': 'persistent'},
        ]:
            with self.subTest(changes=changes):
                result = self.invoke(self.plan_text(self.contract | changes), code=1)
                self.assertIn('Portable STRUCTURE PASS', result.stdout)
                self.assertIn('Runtime BLOCKED', result.stdout)
                self.assertIn('Runtime assertions UNVERIFIED', result.stdout)
                self.assertEqual(result.stderr, '')
        persistent = self.contract | {'availableLifetime': 'persistent', 'requiredLifetime': 'persistent'}
        result = self.invoke(self.plan_text(persistent))
        self.assertIn('Runtime assertions UNVERIFIED', result.stdout)
        self.assertNotIn('Runtime BLOCKED', result.stdout)

    def test_missing_evidence_remains_explicit_and_commands_are_inert(self):
        marker = self.cwd / 'SHOULD_NOT_EXIST'
        contract = self.contract | {
            'wakeMechanism': f'$(touch "{marker}"); echo "not a key: value"',
            'wakeEvidence': None,
            'checkpoint': f'touch "{marker}"',
        }
        result = self.invoke(self.plan_text(contract))
        self.assertIn('Portable STRUCTURE PASS', result.stdout)
        self.assertIn('Wake evidence MISSING', result.stdout)
        self.assertIn('Runtime assertions UNVERIFIED', result.stdout)
        self.assertFalse(marker.exists())

    def test_required_installed_resources_and_root_are_checked(self):
        for resource in ['poteto-mode/playbooks/autopilot-stack.md', 'swarm/SKILL.md',
                         'poteto-mode/playbooks/opening-a-pr.md']:
            with self.subTest(resource=resource):
                target = self.skills / resource
                data = target.read_bytes()
                target.unlink()
                result = self.invoke(self.plan_text(), code=1)
                self.assertIn('Portable contract FAIL', result.stderr)
                target.write_bytes(data)
        for root in ['../missing', str(self.cwd), '$(pwd)']:
            result = self.invoke(self.plan_text(self.contract | {'skillsRoot': root}), code=1)
            self.assertIn('Portable contract FAIL', result.stderr)
        outside = self.root / 'outside.md'
        outside.write_text('external resource')
        resource = self.skills / 'swarm/SKILL.md'
        resource.unlink()
        resource.symlink_to(outside)
        result = self.invoke(self.plan_text(), code=1)
        self.assertIn('file in the same installed snapshot', result.stderr)

    def test_snapshot_digest_changes_with_actual_installed_bytes(self):
        resource = self.skills / 'swarm/SKILL.md'
        resource.write_text('Locally modified installed snapshot.\n')
        result = self.invoke(self.plan_text(self.contract | {'skillsRoot': str(self.skills)}))
        self.assertIn('Installed snapshot SHA256 "swarm/SKILL.md" '
                      '17bd9beee8f1ec4bfcf00079c07bece9153a001eb00d55b0439291ac60157992', result.stdout)

    def test_source_drift_fails_before_unreviewed_checker_execution(self):
        self.upstream.write_text('throw new Error("UNREVIEWED_CODE_EXECUTED");\n')
        result = self.invoke(self.plan_text(), code=2)
        self.assertIn('source drift', result.stderr)
        self.assertNotIn('UNREVIEWED_CODE_EXECUTED', result.stderr)
        self.assertNotIn('Portable STRUCTURE PASS', result.stdout)

    def test_child_errors_signals_and_output_drift_fail_closed(self):
        original_companion = self.script.read_text()
        old_digest = hashlib.sha256(self.upstream.read_bytes()).hexdigest()
        stubs = [
            'process.exit(2);',
            'process.kill(process.pid, "SIGTERM");',
            'console.log("0 PR sections, 1 problems");',
            'console.log("0 PR sections, 0 problems"); console.error("unexpected diagnostic"); process.exit(1);',
            'console.log("0 PR sections, 1 problems"); console.error("unexpected diagnostic"); process.exit(1);',
            'console.log("0 PR sections, 0 problems"); process.exit(1);',
            'console.log("unexpected stdout"); console.log("0 PR sections, 0 problems");',
            '''console.log("0 PR sections, 2 problems");
for (let i = 0; i < 2; i++) console.error(process.argv[2] + ':12: Program checklist lacks "/loop 1h"');
process.exit(1);''',
        ]
        for stub in stubs:
            with self.subTest(stub=stub):
                self.upstream.write_text(stub)
                digest = hashlib.sha256(stub.encode()).hexdigest()
                self.script.write_text(original_companion.replace(old_digest, digest))
                result = self.invoke(self.plan_text(), code=2)
                self.assertIn('Portable checker ERROR', result.stderr)
                self.assertNotIn('Portable STRUCTURE PASS', result.stdout)

    def test_plan_change_during_upstream_check_cannot_mix_contracts(self):
        hook = self.root / 'rewrite plan.cjs'
        hook.write_text("""const fs = require('node:fs');
if (process.argv[1].endsWith('/check-plan.mjs')) {
    const plan = process.argv[2];
    fs.writeFileSync(plan, fs.readFileSync(plan, 'utf8').replace('"auditEveryMinutes": 60', '"auditEveryMinutes": 120'));
}
""")
        self.env['NODE_OPTIONS'] = '--require ' + json.dumps(str(hook))
        result = self.invoke(self.plan_text(), code=2)
        self.assertIn('plan changed during the upstream check', result.stderr)
        self.assertNotIn('Portable STRUCTURE PASS', result.stdout)
        del self.env['NODE_OPTIONS']
        result = self.invoke(code=1)
        self.assertIn('auditEveryMinutes must be 60', result.stderr)

    def test_cli_usage_and_missing_plan_fail(self):
        result = self.invoke(args=[], code=2)
        self.assertIn('Usage:', result.stderr)
        result = self.invoke(args=[str(self.root / 'absent.md')], code=2)
        self.assertIn('Portable checker ERROR', result.stderr)


if __name__ == '__main__':
    unittest.main()
