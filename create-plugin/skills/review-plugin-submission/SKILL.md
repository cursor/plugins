---
name: review-plugin-submission
description: Audit a Cursor plugin for marketplace readiness. Use when validating manifests, component metadata, discovery paths, and submission quality before publishing.
---

# Review plugin submission

## Trigger

A plugin is implemented and needs a final quality check before submission or release.

## Workflow

1. Verify manifest validity:
   - `.cursor-plugin/plugin.json` exists
   - `name` is valid lowercase kebab-case
   - metadata fields are coherent (`description`, `version`, `author`, `license`)
2. Verify component discoverability:
   - Skills in `skills/*/SKILL.md`
   - Rules in `rules/` as `.mdc` or markdown variants
   - Agents in `agents/` markdown files
   - Commands in `commands/` markdown or text files
   - Hooks in `hooks/hooks.json`
   - MCP config in `mcp.json` (or `mcpServers` override)
3. Verify component metadata:
   - Skills include `name` and `description` frontmatter
   - Rules include valid frontmatter and clear guidance
   - Agents and commands include `name` and `description`
4. Verify repository integration:
   - For marketplace repos, plugin entry exists in `.cursor-plugin/marketplace.json`
   - `source` resolves to plugin directory and names are unique
   - `node scripts/validate-plugins.mjs` passes after installing `ajv` and `ajv-formats`
5. Verify documentation quality:
   - `README.md` states purpose, installation, and component coverage
   - optional logo path is valid and repository-hosted

## Checklist

- Manifest exists and parses as valid JSON
- All declared paths exist and are relative
- No broken file references
- No missing frontmatter on skills/rules/agents/commands
- Plugin scope is clear and focused
- Marketplace registration complete (if multi-plugin repo)

## Output

- Pass/fail report by section
- Prioritized fix list
- Final submission recommendation
