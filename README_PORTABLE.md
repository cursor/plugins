# pstack for Claude Code and Codex

This is a fork of [cursor/plugins](https://github.com/cursor/plugins), maintained for the pstack and Thermos skills. Upstream's playbooks and principles are shared by both runtimes. The original [pstack README](pstack/README.md) remains the Cursor guide; the instructions here apply to this fork.

For Thermos installation and review commands, see [Thermos for Claude Code and Codex](docs/thermos-portable.md).

For an optional Claude-only bug-fix evidence pipeline, see [pstack Mods](docs/pstack-mods.md). It runs only after explicit opt-in and leaves the existing portable workflows unchanged.

## Install

### Skills CLI (Claude Code and Codex)

```sh
npx skills add yxhta/pstack/portable/pstack --skill '*' --agent claude-code codex
```

This installs the shared skill bundle for both agents in the current project. Add `--global` for a personal installation. Install all pstack skills together: the entry points share the runtime adaptation and other resources under poteto-mode. The bundle includes the adaptation and agent reference prompts, but it does not register plugin agent types or plugin namespaces. Use `/poteto-mode` on Claude Code and `$poteto-mode` on Codex; the adaptation describes the general-purpose agent fallback.

```sh
npx skills update
```

Upstream synchronization updates this fork through PRs. After merging a sync PR, update the installed skills separately with the command above.

If this fork was installed before the portable package split, reinstall it once from the explicit portable path. Old lock entries point to `pstack/skills/`, which now contains untouched Cursor source. Updating those entries can install Cursor instructions or fail to match normalized names such as `poteto-mode` and `make-bot-ui`.

For an existing global installation:

```sh
npx skills add yxhta/pstack/portable/pstack --skill '*' --agent claude-code codex --global --yes
```

Include any other agents that already use this bundle. For a project installation, omit `--global`. Reinstallation refreshes the skill contents and records `portable/pstack/skills/<name>/SKILL.md` as the update path. Subsequent `npx skills update` calls use that path.

### Native plugins

Claude Code:

```text
/plugin marketplace add yxhta/pstack
/plugin install pstack@yxhta-pstack
```

Codex CLI:

```sh
codex plugin marketplace add yxhta/pstack
codex plugin add pstack@yxhta-pstack
```

Start with `/pstack:poteto-mode` on Claude Code. On Codex, select the installed `pstack:poteto-mode` skill or ask to use poteto-mode. Run setup-pstack to configure roles. Missing roles inherit the session model; multi-model diversity needs models that your runtime actually exposes. Native plugins supply startup context when their hook is enabled and trusted.

For a skills-only installation, clone this repository and keep it in place, then link each directory under `portable/pstack/skills/` into your runtime's user skill directory. Install all skill directories together so the shared runtime adaptation and other relative references stay reachable. Existing skill names such as `swarm` and `architect` may collide: inspect existing installations before replacing them.

Read [runtime adaptation](tools/portable/assets/skills/poteto-mode/references/runtime-adaptation.md) for the tool mappings, paths, and limitations. Cursor-only `make-bot-ui`, Benny automations, cloud workers, and transcript parsers are not ported. Deslop is bundled at the same upstream pin. Other optional cursor-team-kit dependencies are not included. Installation and structural validation do not establish that every workflow runs correctly; check a real task in each runtime.

## Runtime parity and limits

The adapter preserves upstream review roles, participant counts, fresh-agent policy, and completion gates. The shared bundle intentionally removes `disable-model-invocation` from workflow skills so poteto-mode can route to them. The poteto-help and ketchup entry points retain upstream's explicit-only invocation, including matching Codex policies. This changes discovery and invocation availability; it does not grant permission for side effects. Capacity limits queue participants in waves. If the host cannot provide an independent reviewer or isolated context, that gate remains unverified. A self-review or a missing transcript does not count as passing evidence.

Portable Comment Sicko is read-only. Its parent applies accepted, scoped comment deletions and checks the resulting diff before completing no-comments. A findings-only report does not complete the edit workflow.

For worktree discovery, use `python3 <skills-root>/poteto-mode/scripts/portable-worktree-audit.py --repo <repo> --base <verified-ref>`. The script returns local Git evidence as JSON without fetching, reading chats, or deleting anything. Every worktree's usage remains unknown until independently checked. Clean or merged worktrees are not automatically safe to remove.

For portable multi-phase plans, run `node <skills-root>/poteto-mode/scripts/check-portable-plan.mjs <plan.md>`. Add the runtime contract described in the adaptation under the program's Arm the program section. The companion preserves upstream structural gates and reports actual runtime assertions separately as unverified or blocked.

The [parity report](docs/parity-report.md) separates source preservation, executable checks, and host-dependent behavior. Read the runtime adaptation before using bundled scripts. Their presence does not establish installed dependencies, scheduler persistence, or authorization for external actions.

## Upstream updates

The **Sync pstack upstream** GitHub Actions workflow checks daily and can be run manually. It merges upstream main into a dedicated branch, records the upstream SHA, regenerates the portable package, validates it, and opens a draft PR. It never merges into main automatically. The complete repository history is retained because this is a GitHub fork. The PR body separates raw pstack paths from other changed paths, which include generated output, fork tooling, and other upstream plugins.

Enable GitHub Actions in this fork and allow Actions to create pull requests under **Settings → Actions → General**. Scheduled workflows may be disabled by GitHub after prolonged inactivity; run or re-enable the workflow when needed. If Actions is not allowed to create PRs, supply a suitably scoped repository secret `UPSTREAM_SYNC_TOKEN`; do not commit credentials. A PR opened with the default GITHUB_TOKEN does not trigger other PR workflows, so the sync job runs validation itself.

The sync script requires a clean dedicated checkout at the latest `origin` default branch. Only one sync PR is kept open. If an open sync PR blocks a newer upstream revision, the job fails and names both the branch and pending SHA. Review and merge or close that PR before retrying. An already-current fork succeeds even if an old sync PR remains open. A merge conflict or validation failure fails the workflow with logs instead of overwriting the local adaptation. Retries use an unused branch suffix when a closed PR or interrupted run left a branch behind; they never force-push that branch. Resolve the conflicting upstream change on a branch and run the checks below. New upstream skills receive the same adaptation automatically.

```sh
python3 tools/portable/prepare.py
python3 tools/portable/validate.py
python3 -m unittest discover -s tools/portable -p 'test_*.py'
git diff --check
claude plugin validate ./portable/pstack
```

The raw `pstack/` tree and root `README.md` match `tools/portable/upstream.json` byte for byte, including executable modes. Do not edit these source paths. The generator copies the complete upstream package to `portable/pstack/`, adds runtime mappings, and normalizes skill names there. It copies agents, licenses, scripts, and references. It rejects input symlinks and overlay collisions instead of overwriting unfamiliar upstream files.

Edit fork-owned inputs under `tools/portable/assets/` and rerun `python3 tools/portable/prepare.py`. Never edit `portable/pstack/` by hand. The generated package is committed intentionally so every installation works without a build. `python3 tools/portable/prepare.py --check` detects missing, stale, modified, or mode-changed output. Root marketplaces point to this single package. Source files remain unpatched when upstream changes a skill header.

Native plugin versions include the upstream pin and a digest of the package contents and executable modes. Adapter-only changes receive a new version without a manual bump. Template version fields are excluded from the digest.

Git whitespace checks apply to fork-owned inputs. `.gitattributes` exempts the upstream source paths and generated package so upstream whitespace remains intact. Source integrity and generation checks cover those paths.

Use `$sync-pstack-upstream` on Codex or `/sync-pstack-upstream` on Claude Code to review and integrate upstream changes from a source checkout. A native Claude plugin exposes `/pstack:sync-pstack-upstream`. The skill reads the recorded pin and full upstream diff, reviews changed runtime assumptions, regenerates, verifies, and prepares a PR. It does not merge automatically. Consumer installation updates still use `npx skills update`.

Mechanical merge conflicts in raw `pstack/` are avoided by keeping it pristine. Conflicts in root marketplaces or fork-owned automation can still occur. Semantic changes to upstream workflows still require review and actual execution on the affected runtime. Automated sync PRs report this review gap rather than claiming complete runtime compatibility.

## Native runtime support

Native plugin installation includes a read-only SessionStart hook. Claude Code discovers `hooks/hooks.json`; Codex uses the explicitly registered `hooks/codex-hooks.json`. Claude also receives fresh native poteto-agent and read-only comment-sicko wrappers with low, medium, high, xhigh and max effort variants. Each variant inherits the model. Support for the requested effort still depends on the chosen model.

The runtime adaptation has separate Claude and Codex dispatch contracts. They consume confirmed session models, preserve the upstream role labels and panel counts, and disclose unsupported model or effort choices. Native wrapper Markdown links use the host-substituted `${CLAUDE_PLUGIN_ROOT}` so required reading resolves from the installed plugin root. Skills-only installations use general-purpose agents with the required reading in their brief. They do not register hooks or native agents.

The startup hook reads only the `session hook` directive in the runtime model sheet. Add `session hook: off` to `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/pstack-models.md` or `${CODEX_HOME:-$HOME/.codex}/pstack-models.md` to disable it. Missing sheets leave startup context enabled. Unreadable sheets or conflicting directives suppress context and print a warning. No setting is written automatically.

Codex hooks require review and trust through `/hooks`. Installing or enabling the plugin does not grant that trust. Changed hook definitions require another review. SessionStart supplies parent context only; delegated agents still receive explicit reading instructions.

Deslop is generated directly from `cursor-team-kit/skills/deslop/SKILL.md` at the recorded upstream pin. Both the standalone skill and the poteto-mode reference use the same source. `DESLOP_SOURCE.md` and `LICENSE-CURSOR-TEAM-KIT` carry its provenance and MIT license in the native package and inside both skill folders, so skills-only copies retain them. All upstream pstack skill bodies and playbooks remain unchanged.
