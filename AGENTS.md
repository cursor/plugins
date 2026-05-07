# AGENTS.md

## Cursor Cloud specific instructions

This is a **content-first multi-plugin monorepo** for the Cursor Plugins marketplace. Most plugins are pure Markdown/JSON with no executable code. The two components with executable code are:

### 1. Plugin validation (root level)
- **What**: JSON schema validation of all plugin manifests
- **Run**: `node scripts/validate-plugins.mjs` (from repo root)
- **Deps**: `npm install --no-save ajv ajv-formats` (installed at root, no committed `package.json`)
- **CI**: This is the main CI check (`.github/workflows/validate-plugins.yml`), triggered on changes to manifests or schemas

### 2. Orchestrate CLI (`orchestrate/skills/orchestrate/scripts/`)
- **Runtime**: Bun (ensure `~/.bun/bin` is on PATH)
- **Deps**: `bun install` in the scripts directory
- **Lint**: `bun run lint` (Biome 2.x)
- **Typecheck**: `bun run typecheck` (TypeScript 6.x)
- **Tests**: `bun test` (207 unit tests)
- **Format**: `bun run format`
- **Full check**: `bun run check` (format + typecheck)

### Gotchas
- There is no root `package.json`; the `ajv`/`ajv-formats` deps are installed ad-hoc with `--no-save` and land in a root `node_modules/`.
- The orchestrate CLI requires `CURSOR_API_KEY` to actually spawn agents; tests run without it (mocked).
- Slack integration (`SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`) is optional; tests emit `SLACK_BOT_TOKEN not set; Slack visibility disabled` — this is expected.
- No databases, Docker, or running services are needed for development.
