# The porting record

Current upstream baseline: pstack 0.15.15, `cursor/plugins@ccb5507cec1546dc88135c1139c811e6c59115ba`.
See the [65-file sync checklist](UPSTREAM-0.15.15.md) for this update. Earlier sections
record the original port and its subsequent fixes.

Every change made to upstream pstack, and why. Kept so the port can be re-derived when upstream
moves, and so a reader can tell a portability fix from a rewrite of Lauren Tan's judgment.

The rule throughout: **change how a decision is executed, never what it decides.** Where that rule
had to bend, it is called out below.

## 1. Model slugs, to classes

Upstream names four slugs: `claude-fable-5-1-thinking-max`, `grok-4.6-fast-xhigh`,
`gpt-5.6-sol-max`, `claude-opus-5-thinking-xhigh`. A slug is the least portable thing in the
plugin. It is wrong on every other host and stale on its own within weeks.

Replaced with three classes plus a pool: `deep`, `fast`, `balanced`, `panel`, and the always-valid
`inherit`. `runtime/roles.md` maps every role to a class, and each host resolves classes to what it
actually offers.

A comma-separated run of two or more slugs was a *diversity panel*, not a menu, so those became
`the panel pool` rather than four separate class names. 8 panels and 38 single slugs rewritten.

## 2. Delegation arguments, to a spec

`subagent_type`, `model`, `readonly`, `run_in_background`, `environment` became `role`, `count`,
`stance`, `access`, `tools`, `isolation`, `output`, `parallel`, `detached`. `runtime/delegation.md`
binds the spec to each host.

**One upstream instruction was deliberately not preserved.** Several skills say to run investigators
in write mode while telling them not to write, because Cursor's readonly mode strips MCP access.
That is a workaround for one host's defect, and porting it would hand every other host a
write-capable agent for a read-only job. The port says `access: read` and means it, and notes the
Cursor caveat in `delegation.md`.

## 3. Config file

`~/.cursor/rules/pstack-models.mdc` with `alwaysApply: true` became `.pstack/models.md` plus
`.pstack/host.json`. Project-local, host-neutral, inspectable.

## 4. `/setup-pstack`, rewritten

Upstream detects models and writes a Cursor rule. The port detects the **host**, probes the five
capabilities, computes the delegation tier, resolves classes to real models, writes both config
files, and installs the mode shim. This is the one skill rewritten end to end rather than
transformed, because its entire job was Cursor-specific.

Its central rule is unchanged and is now load-bearing in a second way: never record a capability
you have not seen work. A capability wrongly recorded present fails mid-playbook. Recorded absent,
it merely degrades.

## 5. Sticky mode

`/poteto-mode` is a Cursor *mode*, sticky across turns. No other host has the primitive, and
without a replacement the ported router fires once and evaporates. `runtime/sticky-mode.md` gives
three mechanisms in descending fidelity: a marked block in the host's always-on instructions file
plus `.pstack/mode.md` state, a per-turn reminder hook, or explicit re-invocation.

## 6. Frontmatter

| key | fate |
|---|---|
| `disable-model-invocation` | dropped, intent moved into the description ("Invoke explicitly") |
| `mode`, `reminder` | dropped, replaced by the mode shim |
| `icon`, `color` | dropped, cosmetic |
| `is_background` | dropped from definitions, expressed at the call site as `detached` |
| `paths` | **kept and upgraded** on Copilot, where it becomes a real `applyTo` |

51 frontmatter keys removed across 47 skills. Every emitted block is re-serialized per host and
validated: all 251 parse as YAML.

## 7. Host-specific dependencies

- **`cursor-team-kit`** (`deslop`, `control-cli`, `control-ui`) is not available elsewhere. Mapped
  to the bundled `unslop` skill and to `create-verification-skill`, which generates a project-local
  equivalent. 11 references. The generated skill is named by surface, `control-ui` or `control-cli`
  (`control-<surface>` for anything else), because those are the names the playbooks look up. It
  used to be `verify-<app>`, which no playbook could find. `maintain-verification-skill` renames a
  legacy `verify-*` skill.
- **Cursor built-ins** (`create-skill`, the built-in `babysit`) became "your host's skill-authoring
  guidance" and "any similarly-named host built-in".
- **Bugbot** became "the automated reviewer", which covers Bugbot, Copilot code review, and
  `/code-review` equally. `references/bugbot-triage.md` renamed accordingly. 28 references.
- **Transcript paths** (`~/.cursor/projects/<slug>/agent-transcripts/...`) became "the host's
  session store", with the workspace-boundary warning preserved, since reading another workspace's
  private chats is a real hazard on every host.
- **Cursor cloud agents** became isolated delegates.
- **`make-bot-ui`** genuinely depends on Cursor's webhook automations. It ships in the Cursor build
  only, flagged in the manifest rather than silently broken elsewhere.

## 8. One content contradiction resolved

`/interrogate` said "the adversarial signal comes from model diversity, not assigned personas".
True on Cursor. On a single-model host it makes the skill self-defeating, since the host note
directly above it says to use stances. The line now says diversity where the host offers it,
stances where it does not, and that the two are not equally strong evidence.

This is the one place the port changes what a skill *says* rather than how it runs. It was
necessary: leaving it would have told the agent to distrust the only mechanism available to it.

## 9. Added

- `runtime/` — six files, hand-authored. The portability layer.
- `pstack-worker` and `pstack-reviewer` — replacing `poteto-agent` with a write and a read persona,
  so `access: read` binds to a real read-only agent on hosts that scope tools per agent.
- The panel stance set — six adversarial stances that manufacture diversity below Tier 3.
- The honesty rule — any skill that fanned out reports the tier it actually ran at.

## 10. The automation pack and the guide

Upstream ships two things that are not slash skills, and the first version of this port dropped
both. An independent coverage diff caught it.

**`automations/benny`** (12 files, 3 skills) triages Slack issue reports and reproduces confirmed
bugs. It assumes a Cursor automation: a hosted runner that starts an agent from an event. That is
now two capabilities, `TRIGGER` and `CHANNEL`, documented in `runtime/automations.md` with the
per-host trigger (cron or CI invoking the agent headlessly) and the rules that apply when no human
is watching the turn: fail closed, stay in the thread, draft PRs only, secrets outside the pack.
Without a runner the pack degrades to manually invoked skills, which loses the automation and none
of the rigor.

`setup-benny` sets up every one of those paths, not only Cursor's. On Cursor it is still the
built-in `/automate` and the Automations editor. Elsewhere it is a CI or cron job that runs the
agent headlessly with the trigger JSON on stdin, the Copilot coding agent started by issue
assignment, or manual runs where the operator pastes the thread and posts the replies the run hands
back. The triage and repro skills name the four ways a run starts. A run with no Slack access of its
own writes nothing to Slack or the tracker.

**`docs/guide/`** (11 markdown files) is the user guide. Ported with all 65 cross-links rewritten to
each host's skill layout, including the case where a path-scoped skill compiles to a Copilot
instructions file rather than a prompt file.

## 11. Defects found by the independent audit

The first version passed its own verifier. A separate adversarial pass found eight more.

| # | severity | defect |
|---|---|---|
| 1 | critical | Re-running `install.sh` overwrote `.pstack/mode.md`, resetting a user who had turned pstack mode on. Silent data loss on an upgrade. Now preserved, along with `host.json`. |
| 2 | major | `verify.mjs` treated dead links as warnings and exited 0, so a skill pointing at a missing playbook would ship. Now a failure. |
| 3 | major | Pass 1 of the normalizer rewrote `core/runtime/` itself, corrupting the very file that defines the question primitive into "Upstream calls the host's a structured question". The layer that must name hosts verbatim was being de-vendored. Pass 1 now excludes `runtime/`. |
| 4 | major | Eleven sentences left ungrammatical by the bulk substitutions, including "About to a structured question on a which-approach fork" in the router itself, "skeptical the automated reviewer triage", and "the watcher's the automated reviewer pass count". All fixed, and eight patterns are now regression-gated. |
| 5 | major | `automations/benny` (12 files) and `docs/guide/` (17 files) were never ported. See section 10. |
| 6 | minor | `worktree-audit.sh` hardcoded `~/.cursor/projects/...` for its transcript scan, so the LAST_CHAT column was silently always empty off Cursor. Now probes each host's store and honors `PSTACK_TRANSCRIPTS`. |
| 7 | minor | Host detection silently picked the first match when a repo carried markers for several hosts, and preferred user-level config over project markers. Now prefers project markers and reports ambiguity. |
| 8 | minor | No `.gitignore`. Added. |

The non-markdown files were the blind spot behind #6: `normalize-core.py` only processed `.md` and
`.tsv`, so the 20 shipped scripts were copied verbatim with whatever coupling they carried. The
other 42 hits in those scripts are false positives (GraphQL `endCursor`, a package name, and
GitHub-side detection of the Bugbot reviewer account, which is correct from any host).

## Re-deriving against a newer upstream

An independent audit proved the earlier version of this recipe did not work: it regenerated every
bug the port had already fixed, because those fixes were hand edits that no script replayed. Every
hand edit is now either encoded in `build/port/normalize-pass4.py` or protected by making its file
port-owned, and the recipe is tested.

```bash
git clone --depth 1 https://github.com/cursor/plugins.git

# Files the port rewrote. Copy upstream AROUND them, never over them. The list is `port_owned`
# in build/port/upstream.json. All four normalizers, check-upstream.py and pass 4's marker
# assertions read the same list, so it cannot drift between them.
PORT_OWNED=$(python3 -c "import json; print(' '.join('core/' + f for f in json.load(open('build/port/upstream.json'))['port_owned']))")
mkdir -p /tmp/keep && for f in $PORT_OWNED; do mkdir -p /tmp/keep/$(dirname $f); cp $f /tmp/keep/$f; done

# Copy ONTO core/, never delete core/ first: core/runtime/ and the two pstack agents
# have no upstream counterpart and would be lost.
cp -r plugins/pstack/skills/. core/skills/ && cp -r plugins/pstack/agents/. core/agents/
cp -r plugins/pstack/automations/. core/automations/ && cp -r plugins/pstack/docs/guide/. core/docs/guide/
mv core/skills/poteto-mode/playbooks/* core/playbooks/ && rmdir core/skills/poteto-mode/playbooks
rm -f core/skills/poteto-mode/references/bugbot-triage.md

# Restore AFTER the playbook move: the move would otherwise clobber a port-owned playbook.
for f in $PORT_OWNED; do cp /tmp/keep/$f $f; done

python3 build/port/normalize-core.py && python3 build/port/normalize-pass2.py \
  && python3 build/port/normalize-pass3.py && python3 build/port/normalize-pass4.py
python3 build/gen-manifest.py && node build/build.mjs && node build/verify.mjs
```

`normalize-pass4.py` replays every fix that was once a manual edit, asserts that the port-owned
files are still present and still carry their rewrite, and deletes `poteto-agent.md` (which the
upstream copy resurrects). It iterates to a fixpoint, because some of its rules produce the text
other rules match, and it refuses to apply an additive rule whose replacement contains its own
anchor. All four normalizers are idempotent: running them again over their own output changes
nothing. There is no CI; the recipe test below checks it.

**When a hand edit lands in a file upstream also ships, protect it the same day.** The recipe copies
upstream over every file that is not port-owned, so an unprotected edit is gone on the next
re-derivation. Either encode it as a pass 4 rule, when it is a sentence or two, or make the file
port-owned:

1. Add it under `port_owned` in `build/port/upstream.json` with the sha256 of the upstream blob at the
   recorded commit: `git -C plugins show <commit>:<upstream path> | sha256sum`, from a full clone
   (the shallow one above lacks the commit). `check-upstream.py`
   compares against that hash, so a later upstream change to the file becomes a conflict to merge
   by hand rather than a silent loss.
2. Add a marker for it to `PORT_MARKERS` in `normalize-pass4.py`: a phrase upstream never had.
   Pass 4 refuses to run when a port-owned file has no marker, or its marker is gone.

The test is the recipe itself. Run it in a scratch copy against the recorded commit, then
`diff -r` the result against `core/`. It must print nothing. On 2026-09-11 it printed 26 files:
that day's fixes, plus 2026-09-10 edits to `feature`, `orchestrate`, `multi-phase-plan`,
`interrogate` and architect's runner prompt that no rule replayed. Pass 4 would also have written
the merge-granting guard back into `babysit` and `autopilot-stack`. All 26 are port-owned now,
39 files in all. The guard goes only into the two playbooks that merge.

## What the verifier caught

Written before the port was declared done, per pstack's own `prove-it-works`. It found:

1. `applyTo: **/*.ts` — unquoted YAML globs parse as an alias and fail. Every Copilot instructions
   file was silently broken.
2. Copilot's flat `<name>.prompt.md` layout broke 10 relative links that assumed sibling skill
   directories.
3. Descriptions containing quotes were double-escaped through re-serialization.
4. `/setup-pstack` hardcoded a list of every host's instructions file, including Cursor's, into
   every host's build.

All four are now regression-checked by `build/verify.mjs`.

## Verifier coverage

Every check in `build/verify.mjs` is fault-injection tested. Injecting each of these into `dist/`
makes the build fail:

- a dead relative link or backticked reference
- an unquoted YAML glob (`applyTo: **/*.ts`)
- a vendor leak (`subagent_type:`) in a non-Cursor build
- malformed or unterminated frontmatter
- a deleted required file
- mangled prose: doubled articles, possessive-plus-article collisions, a phrase-substitution
  dropped into a verb slot

The normalizers are separately tested for idempotence, both on already-normalized `core/` and as
`f(f(x)) == f(x)` against a fresh upstream checkout, because `docs/PORTING.md` documents a
re-derivation recipe that runs them again.

## 12. What six independent reviewers found

The port passed its own verifier. Six independent reviewers were then given adversarial mandates
(completeness, prose integrity, platform conformance, abstraction design, toolchain, security).
Every one of them found real defects. The verifier passing had meant less than it appeared to.

**The pattern behind most of them: symptom checks, not fidelity checks.** Grepping for `cursor` and
finding nothing proved the string was gone, not that its replacement was correct. `check-yaml.py`
passed `description: ">-"` because it is valid YAML, not because it carried the real description.
Every gate tested that the old thing was absent; none tested that the new thing was right.

### Content corruption

| defect | scale |
|---|---|
| `normalize-pass3.py`'s `\bcursor\b` rule fired inside dotted paths, rewriting `.cursor/...` into `.your agent/...`, a directory name containing a space | **132 occurrences**, every host including Cursor's own build; `setup-benny/SKILL.md` carried 6 correct and 6 corrupted references to the same directory |
| Pass 1 rewrote `core/runtime/` itself. `delegation.md`'s illustrative "here is the vocabulary that does not port" quote was run through the substitution it exists to demonstrate; `roles.md` was left citing itself | 2 of the 7 hand-authored runtime files |
| `splitFm()` could not parse YAML block scalars, so a folded `description: >-` became the literal indicator and its text was discarded | `make-bot-ui` shipped with no usable description |
| A `create-skill` reference survived into the guide and six skills, sending the agent to a Cursor built-in that exists nowhere else | 6 files |
| 4 more sentences left ungrammatical by the `Bugbot` substitution, including in the router's own trigger list | 4 files |
| `/deslop` still instructed 5 times, including a guide line asserting a code/prose split between it and `/unslop` that does not exist in this port | 3 files |

### Verifier and toolchain

| defect | consequence |
|---|---|
| `make verify` chained `A && B \|\| C`, so a real `check-yaml.py` failure fell through to `echo` and exited **0**, printing the false reason "pyyaml absent" | any YAML-only defect shipped silently, and the tool misreported its own coverage |
| The link checker required `[..](..)` or a `./`-prefixed backtick path. The commonest style in these skills is a bare `` `playbooks/prototype.md` `` | deleting a playbook referenced 3 times passed verification. Coverage went from 54 links to ~260 per host once fixed |
| Dead links were warnings, exit 0 | a skill pointing at a missing playbook shipped |
| The re-derivation recipe regenerated 50 failures and silently resurrected `poteto-agent.md` | the documented upgrade path produced a broken tree |
| No CI | every invariant depended on developer discipline |

### Platform drift

Copilot's `mode:` key is superseded by `agent:`, and `.chatmode.md` by `.github/agents/*.agent.md`.
All 45 prompt files and 3 chatmodes targeted the retired schema. The port now emits the current
format only, and `verify.mjs` fails the build if either retired surface reappears.

Cursor has a confirmed open bug where `disable-model-invocation: true` on **plugin-delivered**
skills hides them from the `/` palette entirely. That affects 25 skills in the Cursor build. It is
a platform bug this port cannot fix; it is recorded here so a Cursor user knows to install the
skills repo-locally rather than as a plugin if they hit it.

### Abstraction gaps

- `capabilityNote()` tested only `DELEGATE`, `PARALLEL` and `MODEL_CHOICE`, so `TRANSCRIPTS` could
  never fire a warning. It now covers all ten capabilities and **throws on an undeclared one**, so a
  capability that exists only in the manifest cannot silently do nothing.
- Four skills that genuinely need delegation were unflagged and got no host note anywhere:
  `recall`, `automate-me`, `maintain-verification-skill`, `show-me-your-work`, plus `teach`.
- `no-comments` had no Tier 0 procedure at all. Its delegate is a fixed persona, not a stance panel,
  so the generic "substitute stances" fallback was a non-sequitur. It now has an explicit
  single-agent path.
- `interrogate`'s reviewer table resolved Reviewer A and Reviewer D to the same class, deleting a
  quarter of the diversity by construction even at Tier 3.
- `reflect` reproduced the exact readonly/MCP defect `delegation.md` was written to ban.
- Codex's tier had three different answers in three files. `setup-pstack`'s probe mechanically
  derived Tier 3 for Claude Code, contradicting every other file; `MODEL_CHOICE` is now a tri-state
  where `"partial"` counts as absent for tier purposes.
- The `generic` target shipped runtime files that never mentioned it.
- `swarm` used a delegate field (`cloud_base_branch`) the spec never defined.

### Safety

Three findings were inherited from upstream rather than introduced here. All three are now fixed as
**deliberate divergences**, recorded so a reader can tell them from the port's mechanical work:

1. `worktree-cleanup` classified untracked files as `scratch`, "safe to drop", and removed them with
   `git worktree remove --force`. Never-committed work exists nowhere else. Any worktree with
   untracked content now requires an explicit human yes.
2. `autopilot-full` and `shipping` grant unattended merge authority and never restated the
   irreversible-action guard, while the audit tick for a long run re-reads only the playbook. Both
   now carry the guard inline, including the case where a merge triggers a deploy. `babysit` and
   `autopilot-stack` carried the same guard until 2026-09-11, and it told them to "merge unattended
   as this playbook intends" though neither lands anything. Babysit ends at merge-ready and hands
   landing to Shipping. Autopilot-stack leaves the merge to the operator. Their guards now withhold
   merging outright.
3. The benny pack ingests hostile third-party input unattended and had no prompt-injection guard,
   though the same repo's internal transcript reviewers do. Both benny skills now carry an
   Untrusted input section. This one is arguably a port-caused exposure: on Cursor benny runs in a
   hosted automation, here it runs in cron or CI.

### Installer

`tar -xf` overwrites by default. `merge_memory()` protected `CLAUDE.md`, proving the risk was known,
while every skill went unprotected: a `--user` install could silently destroy a hand-written
`~/.claude/skills/how/SKILL.md`. The installer now backs up any pre-existing file it would replace,
skips the generically-named `docs/` and `automations/` trees on a `--user` install, and reports when
a second host's install rewrites the shared guide.

### Two defects the reviewers did not find

Both were introduced *while fixing* their findings, and were caught by gates added in the same pass.

1. A bulk table edit dropped a column separator, leaving `host-profile.md`'s capability table with
   5-column rows under a 6-column header. `verify.mjs` now checks table shape, and immediately found
   a second malformed table in `capabilities.md` that had been wrong since it was written.
2. An additive `normalize-pass4` rule whose replacement contained its own anchor re-fired on every
   iteration of the fixpoint loop and duplicated its block 13 times. `verify.mjs` now fails on a
   repeated paragraph, and pass 4 refuses self-matching additive rules.

## 13. What four per-vendor documentation specialists found

The reviews in §11 and §12 audited the port against itself. They never asked whether the *adapters
were built from each vendor's documentation in the first place*. They were not: I wrote them from
memory plus light research, then checked conformance afterwards. Four specialists then derived an
implementation reference per product from official docs, before looking at any code.

**Every one of the port's host-capability assumptions was wrong.**

| host | the port claimed | the docs say |
|---|---|---|
| Codex | no nested-agent primitive; fan-out needs `codex exec`; "reasoning effort only"; **Tier 1** | native subagents, on by default, with `agents.max_concurrent_threads_per_session`; per-spawn `model` override; **Tier 2** with no setup |
| Claude Code | `paths` and `disable-model-invocation` do not port; `model` takes tier aliases only | both are natively supported; an agent *file* takes full model IDs, only the *call site* is alias-only |
| Copilot | no delegation, no parallelism, no model choice, no background; **Tier 0** | custom agents plus subagents, concurrent, cross-vendor `model:`, and an unattended coding agent. **Tier 3** — the only host besides Cursor that reaches a genuinely cross-vendor panel |
| Cursor | round-trip was faithful | `paths` was stripped by a ternary with two identical branches; `readonly` was never emitted, so the read-only delegate was unenforced |

### The Copilot rebuild

Copilot was not merely mis-tiered. **Prompt files are deprecated and "aren't loaded by Agent Host
at all"**; the documented replacement is Agent Skills, the same `SKILL.md` shape the other hosts
use. The port was emitting 45 files onto a surface that a current client does not read.

That one fact dissolved a whole class of problems. The flattening hack existed only because prompt
files are single files; skills keep their directory, so `references/`, `playbooks/` and `scripts/`
now sit inside the skill exactly as they do elsewhere. What remained was that Copilot loads a
supporting file **only through a Markdown link** ("If a file isn't referenced in the instructions,
it won't be loaded") — a bare backticked path is inert prose, and roughly 93% of the port's
cross-references were bare. Those are now converted at emit time, depth-aware, so a skill-root
reference cited from inside `playbooks/` resolves correctly.

Also fixed: `runCommands` is not a current tool id (it is `execute`), and an unknown id is
**silently ignored** — so the two write-capable delegates had quietly lost terminal execution, the
one capability they most needed.

### Capability now used that was not before

| host | added |
|---|---|
| Claude Code | `paths` glob scoping, `disable-model-invocation`, `allowed-tools` script pre-approval, `disallowedTools` enforcing the read-only delegate, `mcp__*` granted to it, plugin + marketplace manifest |
| Codex | native subagents as the primary path, 22 `agents/openai.yaml` sidecars enforcing explicit-only invocation, a worked `config.toml.example` |
| Copilot | Agent Skills instead of a deprecated surface, Markdown-link references, correct tool ids, `user-invocable: false` on delegates |
| Cursor | `paths` restored, `readonly: true`, `icon`/`color`, `.cursor/rules/pstack.mdc` (referenced by the port's own docs but never created), schema-correct `plugin.json` |

### Why this was missed

The conformance reviewer in §12 checked whether what I had built would load. It would. Nobody asked
whether it was the *right thing to build*, because the adapters were never derived from the docs to
begin with. A conformance check can only find defects in the thing in front of it; it cannot find
the surface you never used, or the capability you assumed away. That is the difference between
reviewing an implementation and specifying one.

## 14. The completeness round

Asked directly whether the port was 100% or partial, three more reviewers said **partial**, and they
were right.

### It was a partial port

Four of five hosts shipped 45 or 46 skills, not 47. `make-bot-ui` was excluded as "genuinely
Cursor-specific" — a claim this port's own architecture disproves, since the `TRIGGER` capability
exists precisely to express "start an agent run from an event". Only three things in it were
Cursor-bound (the routine API, the secret card, the `api2.cursor.sh` URL). The local server design,
the rule that the key never reaches the browser, the POST contract, Tailscale exposure and
untrusted-body handling are host-neutral. It now ships everywhere with a per-host trigger table and
degrades honestly where `TRIGGER` is absent. That also fixed a real violation: it shipped as
`name: Make Bot UI` in a `make-bot-ui/` directory, and both Copilot and Cursor require the name to
match the directory, with Copilot **silently failing to load** on a mismatch.

**All five hosts now ship 47 skills and 23 playbooks**, and `verify.mjs` fails the build if any host
is short.

### Defects introduced while fixing earlier defects

Several of this round's findings were mine, created in previous rounds:

| defect | cause |
|---|---|
| `install.sh` exited **silently** before writing the memory file and mode state whenever the guide contained no host-specific skill path — which is always true for Cursor | a `prev=$(grep … \| head -1)` I added for the two-host warning: `grep` exits non-zero on no match, and with `set -e` plus `pipefail` that killed the script |
| `.cursor/rules/pstack.mdc` was overwritten rather than merged | the `MEM` switch had no `cursor)` case, so it never reached `merge_memory` |
| `authoring-a-skill.md` step 1 told the reader to use the playbook they were already reading | a `create-skill` substitution rule that pointed the file at itself |
| the principle skills lost `disable-model-invocation` | a build condition that excluded exactly the category its own comment claimed to preserve |
| a ternary with two identical arms recurred | the same anti-pattern §13 records as having silently dropped `paths` |

### Mechanism defects the structural audits could not see

- **`environment: "cloud"` was mapped onto `isolation: dir`.** One is about which *machine* runs a
  delegate; the other about which *directory* it writes to. Orchestrate lost the instruction to run
  workers off-machine while keeping three sentences that still referred to cloud agents. The spec now
  carries a separate `location: local | remote`.
- **Config keys stopped matching.** `/setup-pstack` wrote `arena-runners`; the skills read
  `arena runners`. The lookup always missed. Worse, the template wrote the bare token `panel`, which
  by the skill's own rule ("the list length sets the fan-out") reads as **one** delegate — silently
  collapsing every four-way panel to a single opinion.
- **`check-plan.mjs` still gated on `grok-4.6-fast-xhigh`** while the playbook it validates had been
  de-vendored, so a correctly written plan failed the port's own tooling.
- **Six delegate specs said `role: see below` with nothing defined below.**
- **`how` and `why` had no procedure at all without delegation**, though the bug-fix playbook names
  them both, and the generic host has no delegation.
- **Playbooks were never capability-gated**, so `bug-fix.md` told a Tier 0 host to spawn parallel
  subagents with no warning.
- **The host-note remediation was one template** telling an agent to "substitute stances for model
  diversity" when the missing capability was a transcript store or a tool server. It is now written
  per capability.
- **`worktree-audit.sh` looked for the wrong transcript directory on Claude Code.** Claude Code keeps
  the leading separator in its project slug (`-home-user-repo`); the script stripped it. Verified
  against the real directory on this machine. Codex partitions sessions by date, not by workspace.
- **Codex's read-only delegate had no enforcement at all**, while the other three hosts had it. Codex
  supports a per-role `sandbox_mode`, now emitted in `config.toml.example` and checked by the build.

### Verifier holes closed

Round eleven constructed four broken builds that passed. All now fail:

- a playbook **gutted to zero bytes on every host** (the router copies these verbatim into the task
  list, and only one playbook's *existence* was checked, on one host)
- malformed frontmatter in a Cursor agent or Codex persona (only `.claude/agents` was validated)
- Codex's read-only guard removed
- Copilot's read-only delegate stripped of its tool whitelist

Also fixed: the normalizers now **refuse to run out of order** rather than silently producing text
like "the your agent host environment", and `normalize-pass2`'s `runtime/` exclusion was shallower
than pass 1's, which would have reopened §11.3 the moment anyone nested a file under `runtime/`.

## 15. The Copilot agent round

A Fable audit read Copilot's custom-agent and Agent-Skills documentation directly, rather than
relying on the earlier per-vendor pass, and found the port's worst functional defect.

**All three Copilot delegates could not read a file.** The canonical tool sets are `agent, browser,
edit, execute, read, search, web`. `read/readFile` belongs to **`read`**, and `search` only searches;
it does not read contents. None of the three agents listed `read`:

```
pstack-reviewer  ["search","web/fetch","read/terminalLastCommand"]
pstack-worker    ["edit","search","web/fetch","execute"]
comment-sicko    ["edit","search","web/fetch","execute"]
```

`pstack-reviewer`'s body promised "You may read any file". It could not. An unknown or absent tool
is **silently ignored**, so nothing surfaced it, and the defect was introduced by an earlier fix in
this same document: §13 swapped `runCommands` for `execute` on a specialist's finding without
checking what else the whitelist was missing.

**A delegate also could not reach the skills it was told to use.** Subagents cannot nest by default,
cannot use slash commands, and cannot auto-load a skill marked `disable-model-invocation: true`.
`pstack-worker` was instructed to "read the poteto-mode skill in full" with no route to it.

**The blanket manual-invoke flag was wrong for half the catalogue.** All 23 principle skills and
`unslop` carried `disable-model-invocation: true`, which stops the model loading them at all, while
their own descriptions read "Apply when…" and "Must always apply". The flag is now selective: 21
workflow and setup skills keep it, 25 auto-apply skills get `user-invocable: false` instead, and the
router carries neither.

Also fixed: no agent declared an explicit `name` (subagent selection is by exact, case-sensitive
name, and the two doc sources disagree on the filename-derived default); nothing carried the `agent`
tool or an `agents` allow-list, so delegation had no entry point, which a new `pstack.agent.md`
router now provides; links to `copilot-instructions.md` from inside a skill directory resolved to
`.github/skills/<x>/.github/…`; and the Tier 3 claim is now conditional, since the cloud agent does
not honor per-agent `model:` and delegates themselves run at Tier 0.

### On process

The fix was implemented by a second model working from the audit's exact literal values, then
re-verified here. That verification mattered: the implementer's own fault-injection covered the read
tool and the broken links, but not the two defects that are silent by construction — a missing agent
`name` and a missing router. Both passed a clean `make verify` until gates were added for them.

The lesson repeats §13's: **a fix applied on someone else's finding needs the same verification as
one you found yourself.** Swapping `runCommands` for `execute` without reading the tool table is how
three delegates lost the ability to read a file for an entire round.

## 16. On diverging from the author

An independent analyst reviewed this port against the upstream *repository* rather than against a
snapshot of it, which twelve prior rounds had not done. Its sharpest finding was not a bug. It was
that three of the port's changes altered what Lauren Tan decided, while being filed under headings
that made them look like porting work.

**The rule this port should have followed, and now does:** when the porter disagrees with the
author, surface the decision to the operator. Do not silently encode the porter's preference, and
never file a judgment change under "safety" or "host-specific dependencies".

### The three, and what each was

**`deslop` mapped to `unslop`.** Filed under host-specific dependencies. It was not. `/deslop`
targets code slop (`any` casts, defensive `try/catch` in trusted paths, needless nesting);
`/unslop` targets prose. Collapsing them deleted a pre-commit code gate that upstream puts in the
critical path, and left the instruction "run `/unslop`, then apply `/unslop`". **Fixed:** the gate
is restored as its own step, naming `cursor-team-kit` so a reader can go find the real skill, and
saying plainly that this port does not bundle it.

**The merge-is-a-deploy stop.** Filed under safety. It was new policy. Upstream's own rule already
says pause for deploys; it does not say a merge that triggers a pipeline is a deploy. She wrote
that rule *and* wrote `autopilot-full`, whose entire pitch is "i'm going to bed... i want everything
merged by morning". In any repository with merge-triggered CD, a hard stop makes that playbook
unable to do its one job. **Fixed:** the operator is asked once, at arm time, whether merging
deploys this repository. If yes, merges stop for a human. If no, the playbook merges unattended as
intended. The hazard is caught and the feature survives, and the judgment sits with the operator.
The question lives only in the two playbooks that merge, `autopilot-full` and `shipping`. Babysit
leaves it to Shipping.

**Untracked work in `worktree-cleanup`.** Upstream says `scratch:N` is "safe to drop". This port
requires an explicit yes, because never-committed files exist nowhere else. That is still the right
call, and it is a real reduction in unattended autonomy: "clean up worktrees" now stalls in an
unattended run. **Relabelled** from "fixing an upstream defect" to what it is, a deliberate trade of
autonomy for irreversibility. The audit script suggests `hold-untracked` for such a worktree, not
`safe`, so the lever and the playbook give the same advice.

The fourth divergence, the benny untrusted-input guard, the analyst assessed as correct and
correctly labelled, because the port genuinely moves that pack from a hosted Cursor automation to
cron or CI. A port-caused exposure is the porter's to fix.

### After the first full bug-fix run (2026-09-10)

Five independent reviewers audited one real `poteto-mode` bug-fix run end to end: its transcript,
every delegate call, its artifacts and its shipped code. The run followed every node of the flow,
yet took 39 minutes and shipped a fix that silently loses an email when a worker crashes mid-send.
The audit is in git history: `git show 30b9dfb:audits/2026-09-10-bugfix-run-736701de.md`. The changes below came out of it.

**Clarifications, not divergences.** These restate what the author already wrote, in places a run
reads at the moment it decides:
- architect Phase B produces sketches with `not implemented` bodies, not running code. That was
  always the phase's text and `runner-prompt.md`'s; the port now also says why.
- the arena judge sees the rubric and the candidates, and nothing else;
- every candidate is read end to end before the pick;
- routed skills are read in full;
- stances alone do not make candidates structurally distinct.

**Divergences.** Each changes what a run is required to do:
- **Bug-fix gates.** The Non-negotiables that always apply to a bug fix (interrogate on a
  synthesized or durability-changing fix, no-comments, technical-writing, unslop, the throughput
  checkpoint) are listed in the playbook and copied into the checklist. Upstream leaves them in a
  list of about fifteen triggers the run must cross-reference. The run skipped every one at the edge.
- **Frozen harness.** Bug-fix step 4 verifies against the repro as committed with the failing test.
  Upstream says "verify on the same surface" and does not name the harness. The audited run edited
  its harness in the fix commit, and one scenario passed only because of that edit.
- **Reply audit block.** The reply ends by stating who wrote the implementation, the tier, the
  degradations, and every step marked done or skipped. Upstream asks for delegation and does not ask
  for disclosure. The audited run wrote its fix itself, and nothing in its output said so.
- **`synthesis.md`.** Arena's synthesis note is a named file with required lines. Upstream describes
  the note and does not name it. The audited run produced none.
- **Orchestrating skills stay with the parent.** `how`, `why`, `architect`, `arena`, `interrogate`
  and `swarm` are run by the parent, never handed whole to a delegate. This corrects the port's own
  earlier "Reaching a routed skill" fix, which made the skills reachable and broke every one that
  delegates when it ran inside a delegate.
- **`architect-runners` defaults to three.** It compares sketches. Arena and interrogate stay at four.

### After the routing trace (2026-09-10)

The routing-trace audit (in git history: `git show 30b9dfb:audits/2026-09-10-poteto-routing-trace.md`) followed one bug-fix route through every file it
touches and found eight composition defects. Some are inherited from upstream. Others came from
this port's runtime layer and its appended gates. Each change below closes one of them, and
`build/check-routing.mjs` pins it in every built host.

**Divergences.** Each changes what a run is required to do:
- **One entry rule.** The runtime index said to read all seven runtime files before the first
  step. The router said to read one. The index now defers to the router, and the router's
  bootstrap applies sticky-mode Enter on an explicit invocation, so a direct `/poteto-mode`
  persists `active: true`.
- **Gates inside their steps.** The bug-fix gates were copied after step 6, although they run
  before fan-out, review and commit. Each is now a `Gate, before|when` line under the step it
  guards, and a step is not done while one is open.
- **Failing evidence first.** The failing check is captured and committed in step 1, before any
  fix. Step 5 only orders history. The frozen harness in step 4 now has a baseline to freeze.
- **Stale proof.** A code or harness change after verification, whether from review findings,
  no-comments or the Opening a PR slop pass, returns the run to step 4.
- **Review has a return path.** Interrogate still edits nothing. Bug fix sends each accepted
  Act-on finding to a fresh implementation delegate and reports a declined one as an open blocker.
- **Caller boundaries.** Architect called by an implementing playbook stops after Phase C, and the
  caller's delegate is Phase D. Architect's `architect-runners` overrides arena's `arena-runners`.
  Architect reuses unchanged grounding the caller already holds.
- **Leaves stay leaves.** The architect runner prompt no longer tells a runner to read the architect
  skill, and no longer claims every runner is on a different model. `pstack-worker` does one leaf
  job and does not re-run routing. A PR-opening subagent no longer runs interrogate, which it could
  not spawn.

The checker proves each instruction is present and in place. It does not prove a model follows it.
That needs a replayed run.

### Asking about facts only the human holds (2026-09-11)

Upstream sorts a question before asking it: runnable, answerable from the code, a product call, or
irreversible. A fact about the world outside the repo fits none of the four, so it fell through to
`never-block-on-the-human` ("ask only when you cannot infer intent") and runs inferred it. The
audited runs did exactly that: a payload shape asserted without evidence, a lease duration resting
on an unverified claim about provider retries, a one-host deployment assumed and disclosed only in a
commit message. **Divergence:** `interaction.md` adds a fifth bucket (ask, batched, early, each
question carrying its fallback assumption; proceed on the assumptions when unattended), poteto-mode
gains an intake check for a missing finish condition or preserved behavior, and the bug-fix audit
block lists every outside-world assumption as answered or assumed. `never-block-on-the-human` itself
is unchanged: reversible calls still proceed without asking.

### What made this findable

Nothing in the port compared it to upstream as a live repository. `docs/PORTING.md` recorded every
mechanical transformation in detail and, in doing so, made three judgment changes look like more of
the same. The reviewer that caught it was the first one pointed at the repo instead of the tree.

`build/port/check-upstream.py` now closes the mechanical half of that gap. The other half is a habit: a
change that alters what the author decided gets its own heading, in its own words, saying so.
