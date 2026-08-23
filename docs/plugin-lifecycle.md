# Plugin lifecycle

Install, disable, and uninstall are three different things. Mixing them up is the most common source of "why is this plugin still showing up?" confusion, so this page states what each one means and how to check a plugin's current state.

## Lifecycle

| Action | What it means |
|:-------|:--------------|
| **Install** | The plugin's artifacts — its skills, rules, agents, commands, and MCP server definitions — become available to Cursor. Install from **Customize** in the sidebar, or run `/add-plugin <name>` in chat. |
| **Disable** | The plugin stays installed, but Cursor's plugin-management state marks it as not active. Its components should not be used by the agent while it is disabled. |
| **Uninstall / remove** | The plugin is removed rather than merely turned off. Getting it back means installing it again. |

Disable is a state change, not a removal. Uninstall is a removal, not a state change.

## The plugin cache is not enable state

Cursor keeps downloaded plugin artifacts under a cache directory inside `~/.cursor/plugins/`. That cache answers "what has been downloaded", not "what is currently enabled".

So:

- A plugin's files being present in the cache does **not** mean the plugin is enabled.
- Deleting or moving cache directories is **not** a supported way to disable a plugin. Cursor manages that directory itself, and hand-editing it does not change the plugin's enabled state.

Use the plugin-management UI to disable a plugin, not the filesystem.

## Checking whether a plugin is enabled

The supported answer is Cursor's own plugin management:

- **Customize** in the sidebar, or **Cursor Settings → Plugins**, shows installed plugins and lets you toggle them.
- In the Cursor CLI, `/plugin` manages plugins and marketplaces.

Anything else — cache directories, internal state files — is an implementation detail. Those details can change between Cursor versions and are not a reliable basis for normal plugin management, so treat the UI as the source of truth.

## Troubleshooting

**A plugin's components still appear after you disable it.** Start a new agent session. A session that was already running may have loaded the plugin's components before you changed anything, so a fresh session is the simplest way to confirm what the current state actually is.

**A plugin you installed does not show up.** Check that it is enabled in **Customize** or **Cursor Settings → Plugins**, then start a new session and try again.

**A local plugin under development is not loading.** Local plugins live in `~/.cursor/plugins/local/<plugin-name>/`. Confirm the directory contains a valid `.cursor-plugin/plugin.json` — see [Repository structure](../README.md#repository-structure) for the expected layout, and the [create-plugin](../create-plugin/) plugin for scaffolding and pre-submission checks.

## Related docs

- [Cursor plugins documentation](https://cursor.com/docs/plugins)
- [Cursor CLI slash commands](https://cursor.com/docs/cli/reference/slash-commands)
