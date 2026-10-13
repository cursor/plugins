---
name: verify-onprem
description: 'Drive the onprem plugin like its operator and prove its state with rerunnable checks. Use when asked to verify, audit, or health-check the onprem install (verify onprem, is my onprem lock intact, check the plugin after an edit, onprem doctor). Read-only; it never writes the plugin, the rule file, or the registration links.'
---

# Verify onprem

The onprem plugin is configuration, not a running app. Its user surface is the `/onprem-*` skills in Cursor, the generated rule file `~/.cursor/rules/onprem-models.mdc`, and the registration links that make the plugin visible. This skill drives that surface with a deterministic check suite and proves it with captured evidence, per the deterministic-proof principle: a check that passes is a proof, a self-report is a claim.

## Launch

There is no server to start. Launch means locating the checkout and the rule:

```bash
python3 .cursor/skills/verify-onprem/verify.py --doctor
```

Ready means the doctor JSON reports `plugin_root: true`, `manifest: true`, and (on a configured machine) `rule_file: true`. The helper self-locates the plugin root by walking up to `.cursor-plugin/plugin.json`, so it runs from any checkout of the repo. Teardown is a no-op: nothing is started.

## Doctor

One read-only check that answers "is this instance worth driving?":

- `plugin_root` and `manifest` false → not a checkout of onprem; stop and say so.
- `rule_file` false → `/setup-onprem` has not run on this machine; the suite will skip `rule-audit` and say so in its evidence. That is a valid state for a fresh clone.
- `git_origin` null → not a git checkout (a directory copy); fine for verification, wrong for a publish flow.

## Drive

Run the full suite:

```bash
python3 .cursor/skills/verify-onprem/verify.py
```

It prints a JSON summary and exits 0 on pass, 1 on any hard fail. The nine checks and what each proves:

| check | proves |
|---|---|
| `manifest` | plugin.json parses, is named `onprem`, declares skills and agents |
| `frontmatter` | every skill/agent frontmatter parses; skill `name` matches its directory |
| `mode-dashes` | the mode file obeys its own no-long-dash rule |
| `template-identity` | the 18 role lines are byte-identical between setup-onprem and role-mapping, all values in the closed set |
| `closed-set` | the four real slugs are named in all nine core files; the exact-set surfaces (audit, template comment) include both `inherit-parent` and `auto` |
| `banned-leak` | no banned-family name appears outside lock-statement files |
| `links` | every relative markdown link resolves |
| `rule-audit` | the rule file has `alwaysApply: true`, the `unlimited (max)` budget line, the full allowlist comment line, and 18 closed-set role lines |
| `registration` | the 16 skill links and the agent link resolve on this machine (skips cleanly on a fresh clone) |

For any failing check, quote the check name and its `detail` field, then open the named file and confirm the failure is real before acting. RoboDev-style review output and model self-reports are claims; this suite is the proof.

## Evidence

Capture the JSON and keep it. The named location is `~/.cursor/verify-onprem-evidence/`:

```bash
mkdir -p ~/.cursor/verify-onprem-evidence
python3 .cursor/skills/verify-onprem/verify.py > ~/.cursor/verify-onprem-evidence/verify-$(date -u +%Y%m%dT%H%M%SZ).json
echo "exit: $?"
```

A proof is the run's exit code 0 plus the JSON file on disk with `"status": "pass"` and every check `ok: true` (or an explicitly labeled `skip:` detail). Confirm the evidence file still exists after any cleanup; a cleanup that eats the proof fails this step.

## Cleanup

Read-only by construction: the suite writes nothing into the plugin, the rule file, or the registration links. The only artifact is the evidence file, which survives by design. There is nothing to kill; the doctor and suite start no processes.

## Helpers

- `verify.py` (this directory) is executable. Invocation: `python3 .cursor/skills/verify-onprem/verify.py [--doctor]`.
- No other helpers. If a check needs to grow, extend `verify.py`; do not add one-off scripts that drift from the suite.

## Maintenance

Re-run the suite after every edit to the plugin or the rule file, and after any `/setup-onprem` re-run. onprem ships no separate maintain-verification skill; this suite plus the `/onprem-mode` audit playbook (which audits the rule file against the lock, including session detection that this script cannot see) is the maintenance pass.
