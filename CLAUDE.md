# cursor-plugins (fork)

Fork of `cursor/plugins`: a multi-plugin marketplace repository. Each plugin is a
standalone directory at the repo root with its own `.cursor-plugin/plugin.json`
manifest. `origin` is the fork (`praxstack/cursor-plugins`); `upstream`
(`cursor/plugins`) is read-only for day-to-day work.

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## Agent skills

### Issue tracker

GitHub issues on the fork (`praxstack/cursor-plugins`) via the `gh` CLI; `upstream` is never written to without explicit human instruction. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: root `CONTEXT.md` + `docs/adr/` (created lazily). See `docs/agents/domain.md`.

## Validation gates

- `node scripts/validate-plugins.mjs` — full marketplace manifest/schema validation (requires `ajv`; see root `package.json`).
- `node scripts/check-pstack-portability.mjs` — pstack portability contract gate (see `pstack/PORTABILITY.md`).
- `node scripts/check-pstack-references.mjs` — pstack skill reference-resolution gate (PORTABILITY gate 3).

PRs touching any plugin must pass all three before merge. CI (`.github/workflows/validate-plugins.yml`) runs all three on every PR touching plugins or pstack.
