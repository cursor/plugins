---
name: setup-benny
description: Configure Benny and prepare its triage and repro automations. Use when installing Benny or changing its Slack, tracker, repository, routing, control, model, or budget settings.
disable-model-invocation: true
---

# Set up Benny

Benny ships as an automation pack inside pstack. Installing pstack makes this skill and the two operational skills name-addressable.

Benny needs external configuration and two live Cursor automations. The plugin manifest cannot package those automations.

Do not create or update an automation until the user explicitly asks. Never put a secret value in plugin files, prompts, or committed configuration.

## 1. Install pstack in the target repository

Do this before asking for Benny configuration and before invoking the built-in `/automate` skill.

Ask which repository will run the automations. Add pstack to that repository's `.cursor/settings.json`. If the file or `.cursor` directory does not exist, create it.

Merge this entry into the existing JSON or JSONC:

```json
{
	"plugins": {
		"pstack": { "enabled": true }
	}
}
```

Preserve every unrelated top-level setting and every other plugin entry. If `plugins.pstack` already exists, change only its `enabled` value. Preserve comments and valid JSONC syntax when the file uses JSONC. Validate the file after editing it.

Reload the target project or start a fresh agent rooted there. Verify that these skills resolve from project scope:

- `setup-benny`
- `triage-issue-reports`
- `reproduce-and-fix-issues`
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

If project-scoped plugin installation is unavailable or any required skill does not resolve, stop and explain the failure. Do not copy the Benny skills or a hand-picked dependency set into the repository. The operational skills depend on the wider pstack plugin.

Tell the user that `.cursor/settings.json` must be committed before either automation is enabled. Do not commit it unless the user asks.

Once this check passes, live automation prompts may invoke the project-scoped skills by name. They must not embed an absolute plugin installation path or copy plugin file contents.

## 2. Adapt the configuration

Open these installed examples:

- `../../templates/configuration.example.yaml`
- `../reproduce-and-fix-issues/references/feature-map.example.md`

Create user-owned copies outside the plugin. These are configuration files, not replacement skills. Example locations:

- Project config, such as `<project-config-dir>/benny/configuration.yaml`
- Project feature map, such as `<project-config-dir>/benny/feature-map.md`
- User config, such as `~/.config/benny/configuration.yaml`
- User feature map, such as `~/.config/benny/feature-map.md`

Fill one feature-map section for every user-facing feature the automation may reproduce. Keep it at the user point of view. Do not freeze implementation details or current code paths in the map.

Do not edit the installed examples. Plugin updates may replace them.

Prefer committed, secret-free files in the target repository when a fresh automation checkout must read them. Otherwise paraphrase the required values into the live prompt. Reference a repository file only after the built-in `/automate` skill confirms that the file is committed in the repository where the automation runs.

Never use an absolute path inside the installed plugin. The live prompt may name a verified project-scoped skill, but it cannot rely on a plugin cache path.

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

Use only model slugs shown as available in the user's Cursor model picker or supported model list. Do not guess a slug and do not carry over a private default.

The source channel, triage identity, repository, tracker adapter, control skill, and feature map must be explicit. Fail setup if any required value stays ambiguous.

Use the bundled `unslop` skill on the final automation names, descriptions, and prompt shims before saving them.

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

Prefer configured Cursor Slack actions for reads and posts. The optional `BENNY_SLACK_BOT_TOKEN` may fill a narrow gap such as editing one operations status message or downloading an attachment. Store the value in a secret manager or environment, not in YAML.

Do not use undocumented integration endpoints.

## 5. Prepare the routing map

If the user wants reroutes or owner pings:

1. Copy `../triage-issue-reports/references/routing.example.md` outside the plugin.
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

Read `../../FOR_AGENTS.md` as the primary user-intent source for either path. Use it to understand the two triggers, tools, instructions, outcomes, and shared rules. Do not put its installed plugin path or content into a live automation field.

### First-time creation

Create one automation at a time.

For each automation:

1. Read the matching bundled prompt template as secondary internal source material.
2. Turn `FOR_AGENTS.md`, the finished Benny configuration, and the template intent into a complete natural-language request.
3. Tell the live prompt to invoke its verified project-scoped operational skill by name.
4. Do not put an installed plugin path or template excerpt into an automation field. A repo file may be referenced only when the built-in `automate` skill confirms that the automation runs in that same repo and the file is committed there.
5. Read and follow the built-in `automate` skill.
6. Let `automate` discover Slack channels, the repository, and connected integrations.
7. Let `automate` run its completeness and authentication gates.
8. Let `automate` show its draft table, obtain approval, ask readiness, and open the Automations editor.
9. Finish the editor handoff for this automation before starting the next one.

Give `automate` this complete triage intent, filled from configuration:

- Name `benny-triage`.
- Invoke `triage-issue-reports` by name from the target repository's project-scoped pstack install.
- Trigger on each new top-level report in the configured source Slack channel.
- Read the triggering thread and reply only inside it.
- Use the configured issue-tracker integration.
- Classify, inspect evidence, trace cause, dedupe, and create only clear new bugs.
- End one thread-only verdict with the configured `[benny:bug]`, `[benny:performance]`, or `[benny:other]` marker and optional tracker URL.
- Never post a source-channel root message.

After the triage editor handoff is complete, give `automate` this complete repro and fix intent:

- Name `benny-reproduce`.
- Invoke `reproduce-and-fix-issues` by name from the target repository's project-scoped pstack install.
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

### Existing automations

The built-in `automate` skill is creation-only. Do not use it to search for, inspect, or update existing automations.

Finish configuration, routing, control-adapter, and feature-map validation. Then give the user this concise editor checklist.

For the existing triage automation, update:

- Name and description
- New top-level Slack report trigger and source channel
- Slack thread read and reply capabilities
- Issue-tracker integration
- Paraphrased triage instructions, thread-only rule, and Benny verdict markers

For the existing repro automation, update:

- Name and description
- Matching Slack trigger and source channel
- Repository and default branch
- Slack thread read and reply capabilities
- Pull request action
- Tracker, control-adapter, and feature-map requirements
- Paraphrased marker wait, evidence, verification, and bounded-fix instructions

Ask the user to update each existing automation directly in its Automations editor. Do not create replacements or duplicates.

### Creation boundary

Never call a direct automation backend service or backend automation tool. Never use a browser URL that carries draft fields. Never build or open a Cursor protocol deep link. For new automations, the only finish path is the built-in `automate` skill's reviewed Automations editor handoff.

Do not enable either automation until the thread-safety test passes after the editor save.

## 8. Test thread safety

Use a test channel or a harmless test report.

Before testing, confirm that the target repository's `.cursor/settings.json` change is committed on the branch used by the automation checkout. If it is not committed, stop. Tell the user that the automation cannot be enabled yet.

Verify:

1. Triage stores the root `thread_ts` and posts exactly one verdict as a reply.
2. The verdict contains one configured marker.
3. Repro accepts the marker only from the configured triage identity.
4. Repro keeps the same immutable source coordinates.
5. No source-channel root message appears.
6. A delegated worker cannot use any Slack write action.
7. Missing coordinates, a deleted parent, or a failed preflight produces no post and no tracker issue.

Enable normal traffic only after all seven checks pass.
