---
name: setup-benny
description: Configure Benny and prepare its triage and repro automations. Use when installing Benny or changing its Slack, tracker, repository, routing, control, model, or budget settings.
---

# Set up Benny

Benny ships as a dormant automation pack inside pstack. The plugin manifest exposes only pstack's normal skill root; this file and the two operational files are not slash skills.

The human enters setup by pointing your agent at the pack's `FOR_AGENTS.md`. The bootstrap flow copies the whole pack into the target repository, then reads this file directly at `.pstack/automations/benny/skills/setup-benny/SKILL.md`.

Benny needs external configuration and two live automations. On Cursor they are native Automations. On every other host they are a CI or cron runner that starts the agent headlessly, or manual runs an operator starts when no runner is available (section 7).

Do not create or update an automation until the user explicitly asks. Never put a secret value in plugin files, prompts, or committed configuration.

## 1. Copy the pack and enable shared pstack skills

Do this before asking for Benny configuration and before creating any automation.

Ask which repository will run the automations. The source pack is the directory containing `FOR_AGENTS.md`. The destination is `<target-repository>/.pstack/automations/benny/`.

Merge the entire source pack into the destination:

1. Create the destination when it is absent.
2. Copy every source file to the same relative path.
3. Preserve destination-only files. Never delete unrelated files during install or refresh.
4. Keep user-owned configuration, feature maps, and routing maps outside the destination. Never overwrite them.
5. When an existing source-managed file differs, inspect the diff and merge without discarding local edits. If ownership is ambiguous, stop and ask before replacing it.
6. Verify that the destination contains `FOR_AGENTS.md`, this setup file, both operational files, their references, and the templates.

If this file is already being read from the target destination, treat the copy as complete and run the same verification before continuing.

Install pstack into the target repository so benny's skills can reach the shared pstack skills
they depend on. From a checkout of this port:

```bash
./install.sh --target <target-repository>
```

The installer detects the host, writes the matching build, and merges into any existing instructions
file rather than replacing it. If your host also has a plugin-enablement file (Cursor's
`.cursor/settings.json`, for example), add pstack there too: preserve every unrelated setting and every other
plugin entry, change only pstack's own `enabled` value, keep comments and valid JSONC syntax where
the file uses JSONC, and validate the file after editing it.

Reload the target project or start a fresh agent rooted there. Verify that these shared pstack skills resolve from project scope:

- `how`
- `why`
- `tdd`
- `unslop`
- `principle-separate-before-serializing-shared-state`
- `principle-minimize-reader-load`
- `principle-guard-the-context-window`
- `principle-sequence-verifiable-units`
- `principle-fix-root-causes`
- `principle-prove-it-works`

Do not count a skill loaded from the current session or a user-scoped plugin. The check must show that a fresh agent in the target repository receives pstack through project settings.

If project-scoped plugin installation is unavailable or any shared dependency does not resolve, stop and explain the failure.

The Benny files are read directly from `.pstack/automations/benny/`. Do not add that directory to a plugin manifest or expect its `SKILL.md` files to appear in the slash-skill list.

Tell the user that the pstack files the installer wrote (plus `.cursor/settings.json` on Cursor), `.pstack/automations/benny/`, and any referenced secret-free configuration must be committed before either automation is enabled. Do not commit them unless the user asks.

Once this check passes, live automation prompts may read the committed operational files by their stable repository-relative paths. They must not embed a plugin cache path or copy the file contents.

## 2. Adapt the configuration

Open these copied examples:

- `../../templates/configuration.example.yaml`
- `../reproduce-and-fix-issues/references/feature-map.example.md`

Create user-owned copies outside `.pstack/automations/benny/`. These are configuration files, not pack files. Example locations:

- Project config, such as `.pstack/benny/configuration.yaml`
- Project feature map, such as `.pstack/benny/feature-map.md`
- Project routing map, such as `.pstack/benny/routing.md`
- User config, such as `~/.config/benny/configuration.yaml`
- User feature map, such as `~/.config/benny/feature-map.md`

Fill one feature-map section for every user-facing feature the automation may reproduce. Keep it at the user point of view. Do not freeze implementation details or current code paths in the map.

Do not edit the copied examples. Pack refreshes may update source-managed files after conflict review, but they must never touch the user-owned copies.

Prefer committed, secret-free files in the target repository when a fresh automation checkout must read them. Otherwise paraphrase the required values into the live prompt. Reference a repository file only after confirming that it is committed on the branch the automation checks out: the built-in `automate` skill confirms this on Cursor. Elsewhere, fetch, then check `git ls-tree -r --name-only origin/<default-branch> -- <path>`; the local index does not show what the automation checks out.

Use stable repository-relative paths for committed pack and configuration files. Never reference the plugin source directory or a plugin cache path from a live automation.

## 3. Fill the required choices

Ask for or confirm:

- Source Slack channel ID
- Optional operations or status channel ID
- Repository URL and default branch
- Triage identity or Slack user ID
- Issue tracker type, team, project, labels, and intake status
- Tracker adapter skill or MCP actions
- Optional routing map path
- Required control skill name
- Required user-facing feature-map path
- Status emoji strings
- Pull request URL format
- Polling and effort budgets
- Model slug for triage, repro, code work, and media review

Use only model slugs shown as available in the model picker or supported model list of the host that runs the automation. Do not guess a slug and do not carry over a private default.

The source channel, triage identity, repository, tracker adapter, control skill, and feature map must be explicit. Fail setup if any required value stays ambiguous.

Use pstack's `unslop` skill on the final automation names, descriptions, and prompt shims before saving them.

## 4. Check integration capabilities

The triage automation needs:

- Read access to the configured source Slack channel and its threads
- Thread-reply access in that channel
- Attachment metadata and file download access when reports include media
- Search, read, create, and update access through the configured issue-tracker adapter

The repro automation needs:

- Read access to the source thread
- Thread-reply access in the source channel
- Optional post and edit access in the configured operations channel
- Repository read and history access
- A pull request action that can open a draft pull request
- The configured control-adapter skill

On Cursor, prefer its configured Slack actions for reads and posts. The optional `BENNY_SLACK_BOT_TOKEN` may fill a narrow gap such as editing one operations status message or downloading an attachment. Store the value in a secret manager or environment, not in YAML.

Only Cursor has host Slack actions today. A runner on any other host gets Slack access from a Slack MCP server or `BENNY_SLACK_BOT_TOKEN` in the runner's secret store, scoped to reading and replying in the source channel and posting in the operations channel. A run with neither has no channel access and uses the manual handoff in section 7.

Do not use undocumented integration endpoints.

## 5. Prepare the routing map

If the user wants reroutes or owner pings:

1. Copy `../triage-issue-reports/references/routing.example.md` outside `.pstack/automations/benny/`.
2. Replace every placeholder with public or organization-local values.
3. Keep owner pings off by default.
4. Allow a ping only for a configured feature owner or a confirmed likely regression author.

If no routing map is configured, triage may classify a report but must not guess a destination or owner.

## 6. Verify the control adapter

Read `../reproduce-and-fix-issues/references/control-adapter.md` and the user's completed feature map.

Confirm that the named skill can:

- Bring up the target app
- Navigate every mapped feature through the real UI
- Exercise mapped states through declared adapter actions
- Inspect state without forcing the result
- Capture screenshots
- Start and stop a recording
- Clean up its processes and temporary data

If any capability is missing, leave the repro automation disabled. It must fail closed rather than claim a reproduction it did not perform.

## 7. Prepare the live automations

Ask whether this is first-time creation or configuration of existing automations.

Read `../../FOR_AGENTS.md` from the copied pack as the primary user-intent source for either path. Use it to understand the two triggers, tools, instructions, outcomes, and shared rules.

Pick the path by what the host provides, per pstack's `automations.md` runtime note:

- **Cursor.** The host has the built-in `automate` skill and an Automations editor. Follow the two Cursor subsections below.
- **CI or cron runner.** Claude Code, Codex, and any other host without a runner of its own. Follow "Runner setup".
- **Copilot.** The host's own runner is the coding agent, started by issue assignment. A scheduled or event-driven GitHub Actions workflow opens one issue per report, with the filled prompt template and the trigger JSON in its body, and assigns it to the coding agent. That sandbox has no Slack access, so Slack reads and posts follow "Manual runs": the thread goes into the issue body, and the operator posts the handed-back reply. Event source, credentials, and review follow "Runner setup".
- **Manual runs.** No runner is available or approved. Follow "Manual runs".

The operational files, markers, and fail-closed rules are the same on every path. Only how a run starts and who does the Slack reads and posts change.

### Cursor: first-time creation

Create one automation at a time.

For each automation:

1. Read the matching copied prompt template as secondary internal source material.
2. Turn `FOR_AGENTS.md`, the finished Benny configuration, and the template intent into a complete natural-language request.
3. Tell the live prompt to read and follow its exact committed operational file under `.pstack/automations/benny/`.
4. Use the stable repository-relative path, not a plugin source or cache path. Do not copy the operational file contents into the live prompt.
5. Read and follow the built-in `automate` skill.
6. Let `automate` discover Slack channels, the repository, and connected integrations.
7. Let `automate` confirm that the copied pack and any referenced configuration files are committed in the same repository where the automation will run.
8. Let `automate` show its draft table, obtain approval, ask readiness, and open the Automations editor.
9. Finish the editor handoff for this automation before starting the next one.

Give `automate` this complete triage intent, filled from configuration:

- Name `benny-triage`.
- Read and follow `.pstack/automations/benny/skills/triage-issue-reports/SKILL.md` for every run.
- Trigger on each new top-level report in the configured source Slack channel.
- Read the triggering thread and reply only inside it.
- Use the configured issue-tracker integration.
- Classify, inspect evidence, trace cause, dedupe, and create only clear new bugs.
- End one thread-only verdict with the configured `[benny:bug]`, `[benny:performance]`, or `[benny:other]` marker and optional tracker URL.
- Never post a source-channel root message.

After the triage editor handoff is complete, give `automate` this complete repro and fix intent:

- Name `benny-reproduce`.
- Read and follow `.pstack/automations/benny/skills/reproduce-and-fix-issues/SKILL.md` for every run.
- Trigger on the same new top-level reports in the configured source Slack channel.
- Use the configured repository and default branch.
- Read the source thread and reply only inside it.
- Include pull request creation and the configured tracker, control-adapter, and feature-map requirements. Paraphrase mapped user paths and states unless `automate` confirms an eligible committed file in the same repository.
- Wait for a trusted triage marker before acting.
- Reproduce the exact symptom twice through the mapped real UI and capture evidence.
- Verify an existing fix without authoring over it.
- Attempt an optional bounded fix only after confirmed repro, then open a draft pull request when proof and checks pass.
- Never post a source-channel root message.

Do not duplicate `automate`'s Slack, repository, integration, completeness, authentication, draft-review, approval, readiness, or editor-handoff work.

### Cursor: existing automations

The built-in `automate` skill is creation-only. Do not use it to search for, inspect, or update existing automations.

Finish configuration, routing, control-adapter, and feature-map validation. Then give the user this concise editor checklist.

For the existing triage automation, update:

- Name and description
- Direct instruction to read `.pstack/automations/benny/skills/triage-issue-reports/SKILL.md`
- New top-level Slack report trigger and source channel
- Slack thread read and reply capabilities
- Issue-tracker integration
- Paraphrased triage instructions, thread-only rule, and Benny verdict markers

For the existing repro automation, update:

- Name and description
- Direct instruction to read `.pstack/automations/benny/skills/reproduce-and-fix-issues/SKILL.md`
- Matching Slack trigger and source channel
- Repository and default branch
- Slack thread read and reply capabilities
- Pull request action
- Tracker, control-adapter, and feature-map requirements
- Paraphrased marker wait, evidence, verification, and bounded-fix instructions

Ask the user to update each existing automation directly in its Automations editor. Do not create replacements or duplicates.

### Runner setup

The durable pattern is a CI workflow or cron job that runs the agent headlessly with the filled prompt template as the prompt and the trigger JSON on stdin: `claude -p` or `codex exec`. Prepare one job per automation. Write nothing until the user explicitly asks.

1. **Event source.** Slack does not start a CI job on its own. Either schedule a job that lists new top-level messages in the source channel since its last run and starts one run per report, or forward the Slack event to the runner through a webhook or a repository dispatch. The payload is the template's trigger JSON with the real `source_channel_id`, `message_ts`, and `thread_ts`. A scheduled job keeps a cursor, and triage's own dedupe skips a report that already has a verdict.
2. **Prompt.** Fill `../../templates/triage-automation-prompt.md` and `../../templates/reproduce-automation-prompt.md` from the finished configuration. They are host-neutral, and the live prompt still points at the committed operational file instead of copying it.
3. **Checkout.** Check out the target repository at the configured default branch, where the pack and every referenced configuration file are committed.
4. **Credentials.** Give the job the Slack access from section 4, the tracker adapter's credentials, and, for repro only, a token that can push a non-default branch and open a draft pull request, and nothing more: no merge and no push to the default branch. Where the token cannot be scoped by branch, enforce the default-branch ban with branch protection. All of them come from the runner's secret store, never from YAML or the workflow file. If the job cannot get Slack access, use Manual runs instead.
5. **Repro.** Start it from the same reports. It waits for the trusted marker within the verdict budget, or a scheduled job starts it on a later tick for a thread that already carries one; the operational file checks the marker either way. A UI repro needs a display, the app build, and screen recording on the runner, which usually means a self-hosted runner. If the runner cannot provide every capability from section 6, keep repro off the runner and run it manually on a machine that can.
6. **Review.** Show the user each workflow or crontab entry. Commit it only when asked, and leave its event or schedule trigger off until section 8 passes. A manually dispatched run with a harmless payload is the test.

For an existing runner automation, update its workflow or crontab entry in place. Do not add a second job for the same automation.

### Manual runs

An operator starts each run on demand and does the Slack reads and posts the run cannot do. This is the fallback on every host, the degradation pstack's `automations.md` describes.

1. **Start.** The operator pastes the trigger JSON, the source permalink, the root message and current replies with each author's Slack user ID, and the attachments as files or readable links, fetched just before the run. The paste is the run's thread read.
2. **Triage hands back its writes.** A run that cannot read the thread itself cannot preflight the source parent, so it writes nothing to Slack or the tracker. It returns the verdict reply with its marker, and, when step 8 of the triage file would create an issue or step 7 would update one, the ready-to-file issue body or recurrence note. The operator files the issue, adds `tracker=<URL>` to the marker line, and posts the reply in the source thread, never at the root. If the reply cannot be posted, the operator closes the issue.
3. **Marker trust still holds.** Set `slack.triage_identity_user_id` to the account the operator posts verdicts from, and post nothing else carrying a marker from it. The repro run is started after the verdict is posted, with the thread pasted again, verdict and author ID included.
4. **Repro splits at the rejection window.** The first run reproduces and hands back the source reply, the evidence paths, and the media reviewer's answer. The fix phase is a second run whose paste carries that confirmed-repro reply as posted, older than the rejection window with no valid rejection after it, plus the evidence paths and the media answer. The repro file's manual-handoff paragraph says where that run resumes. A run with repository access may open the draft pull request itself, since that is not a Slack write.
5. **No follow-up window.** A follow-up is a new run with the new replies pasted.

### Creation boundary

Never call a direct automation backend service or backend automation tool. Never use a browser URL that carries draft fields. Never build or open a Cursor protocol deep link. For new Cursor automations, the only finish path is the built-in `automate` skill's reviewed Automations editor handoff. For a runner, it is a workflow or crontab entry the user reviewed and asked you to commit.

Do not enable either automation until the thread-safety test passes after the editor save or the runner commit.

## 8. Test thread safety

Use a test channel or a harmless test report.

Before testing, confirm that the pstack files the installer wrote to the target repository (plus `.cursor/settings.json` on Cursor), `.pstack/automations/benny/`, and every referenced secret-free configuration file are committed on the branch used by the automation checkout. On the Cursor, runner, and Copilot paths, also confirm that both live prompts point at their exact committed operational files. If any check fails, stop. Tell the user that the automation cannot be enabled yet.

Verify:

1. Triage stores the root `thread_ts` and posts exactly one verdict as a reply.
2. The verdict contains one configured marker.
3. Repro accepts the marker only from the configured triage identity.
4. Repro keeps the same immutable source coordinates.
5. No source-channel root message appears.
6. A delegated worker cannot use any Slack write action.
7. Missing coordinates, a deleted parent, or a failed preflight produces no post and no tracker issue.

On a runner, send the harmless report through a manually dispatched run. On Copilot, send it through an assigned issue carrying a harmless payload. For manual runs and Copilot, checks 1 and 5 become: the run posted nothing and wrote nothing to the tracker, it handed back exactly one reply with one marker, and the operator posted that reply under the root. Check 6 stands unchanged.

On the Cursor, runner, and Copilot paths, enable normal traffic only after all seven checks pass. For manual runs, take real reports only after the same seven pass.
