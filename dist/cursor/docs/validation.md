---
title: Validation and runtime acceptance
description: Static checks, runtime discovery, and authorized execution checklist.
---

## What checks establish

`npm run check` validates root/native manifests, single-plugin marketplace,
skill metadata, links, root-only layout, generated-output drift, config parsing,
precedence/idempotence, exact model selection, fallback, panel metadata,
capability differences, model-agent setup, and recorded statechart behavior.

The checks do not call paid models or write to external services.
Fixture catalogs represent synthetic model IDs and known capabilities, not
live entitlements. They exercise simple how workflow selection, bounded GPT/Claude
preflight, an unavailable model, unsupported optional/required capabilities, and
repeated setup without configuration loss.

## Runtime status

Executed locally with Node 22.18.0, temporary Bun 1.4.4, and Claude Code 2.1.2:

| Check | Result |
|-------|--------|
| `npm run validate` | Root/native manifests, all removed-plugin paths, and 540 Markdown files/links pass |
| Generator `--check` | No byte/mode drift; fixture test also proves first-run determinism and non-writing drift rejection |
| `npm test` | 28 configuration/portability tests pass |
| `npm run test:statechart` | 267 pass, 67 live-TLC tests skipped because `TLA2TOOLS` is not configured |
| Bun watcher/plan tests | 61 pass, no live forge writes |
| Watcher strict TypeScript check | Pass |
| Claude root plugin, root marketplace, and native distribution validation | All pass without warnings |

On macOS, the retained symlink-launcher fixture cannot resolve a relative link
from the `/var` alias to a checkout outside it. Its unchanged test source passes
using the physical temporary directory. The full check passed with:

```bash
TMPDIR="$(node -p 'require("node:fs").realpathSync(require("node:os").tmpdir())')" npm run check
```

No helper runtime behavior was changed to hide that platform issue. Generated
statechart report fixtures were restored verbatim from history and remain
output snapshots, not frontmatter-bearing plugin documentation.

Bun was initially absent. After that missing-runner failure, a temporary runner
and the helper's frozen declared dependencies were restored in this writable
checkout:

```bash
cd skills/poteto-mode/scripts
npm exec --yes --package=bun -- bun install --frozen-lockfile
npm exec --yes --package=bun -- bun test watch-pr check-plan.test.ts
npm exec --yes --package=bun -- bun run typecheck
```

Claude validation commands:

```bash
claude plugin validate .claude-plugin/plugin.json
claude plugin validate .claude-plugin/marketplace.json
claude plugin validate dist/claude-code
```

Claude 2.1.2 is older than the current documented Agent features. Copilot CLI
and Cursor executables were absent. No persistent client installation,
Local/Copilot desktop component discovery, or model execution was performed.
Live TLC execution also remains unverified. No client is runtime-verified merely
because its manifest passed, and synthetic GPT/Claude IDs do not establish
entitlement, actual model choice, or effective reader permissions.

Git history and the original MIT license remain intact. No commits, pushes,
PRs, paid model calls, or external service writes were performed.

## Acceptance in a trusted client

After installation and with authorization for any model usage:

1. Check plugin, skill, and agent discovery in a fresh session.
2. Run setup twice using a config with an unrelated field; verify that field
   survives and the second run reports no changes.
3. Ask how the config loader works. Expect a direct cited explanation, no fan-out,
   no edits, and correct bundled/user/project/override precedence.
4. Configure two entitled GPT/Claude IDs with known family metadata. Resolve review,
   inspect the effective restricted tools/models, and run a bounded independent
   review. Verify actual execution metadata before claiming diversity.
5. Request an unavailable exact model with `fallback: stop`. Expect a blocker,
   not an unannounced inherited model.
6. Disable/uninstall an optional UI-control integration. A core project-test
   workflow still runs; a requested integration-specific deliverable stops
   rather than returning success with placeholders.
7. Check native Cursor and Claude distributions as well as direct-root loading.

Keep exact commands, results, versions, and any unknown model identities in the
report. Verify read-only permission enforcement separately from prompt behavior.
