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
   - MCP config in `mcp.json` (or `mcpServers` override in `plugin.json`)
   - If `.mcp.json` also exists (common in dual Cursor + Claude Code repos), verify MCP filename precedence (see below)
3. Verify component metadata:
   - Skills include `name` and `description` frontmatter
   - Rules include valid frontmatter and clear guidance
   - Agents and commands include `name` and `description`
4. Verify repository integration:
   - For marketplace repos, plugin entry exists in `.cursor-plugin/marketplace.json`
   - `source` resolves to plugin directory and names are unique
5. Verify documentation quality:
   - `README.md` states purpose, installation, and component coverage
   - optional logo path is valid and repository-hosted

## MCP filename precedence

Cursor plugins auto-discover MCP servers from `mcp.json` at the plugin root. The dotfile `.mcp.json` is Claude Code's default — not Cursor's.

When both `mcp.json` and `.mcp.json` exist, Cursor loads `mcp.json`. To override this, set `mcpServers` in `plugin.json` to an explicit path (e.g. `"mcpServers": "./.mcp.json"`).

**Dual Cursor + Claude Code repos.** Shipping both filenames is the natural layout when one repository is published as a plugin for both clients. If the two files contain different server configs (e.g. hosted HTTP for Cursor, local stdio for Claude Code), a Marketplace clone can start the wrong server when precedence is not pinned. Authors should either:

- Keep a single shared file and point both clients at it, or
- Pin `mcpServers` in `.cursor-plugin/plugin.json` to the intended file so Cursor never falls back to `.mcp.json`.

## Checklist

- Manifest exists and parses as valid JSON
- All declared paths exist and are relative
- No broken file references
- No missing frontmatter on skills/rules/agents/commands
- Plugin scope is clear and focused
- Marketplace registration complete (if multi-plugin repo)
- If both `mcp.json` and `.mcp.json` exist, either the payloads are identical or `mcpServers` is pinned in `plugin.json`

## Output

- Pass/fail report by section
- Prioritized fix list
- Final submission recommendation
