# AGENTS.md

## Cursor Cloud specific instructions

This is a **content/configuration monorepo** of Cursor IDE plugins. There is no backend, database, or build step. Each top-level directory is a standalone plugin with its own `.cursor-plugin/plugin.json` manifest.

### Validation (the main "build/test/lint" step)

```bash
npm install --no-save ajv ajv-formats
node scripts/validate-plugins.mjs
```

This validates all plugin manifests (JSON) against schemas in `schemas/`. It is the only CI check (see `.github/workflows/validate-plugins.yml`). Node.js >= 20 is required.

### Hooks testing

- **continual-learning** stop hook requires **Bun**: `echo '{"conversation_id":"x","status":"completed","loop_count":0}' | bun run continual-learning/hooks/continual-learning-stop.ts`
- **ralph-loop** hooks require **bash** and **jq** (both pre-installed). The stop hook expects a state file at `.cursor/ralph/scratchpad.md`; without it, it exits cleanly.

### Caveats

- There is no `package.json` in the repo. Dependencies (`ajv`, `ajv-formats`) are installed ephemerally with `npm install --no-save`. The resulting `node_modules/` is gitignored.
- No lockfile exists; `npm install --no-save` always fetches the latest compatible versions, matching CI behavior.
