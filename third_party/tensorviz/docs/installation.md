# Cursor installation and maintenance

This entry packages the public
[tensorViz 0.3.61 preview](https://github.com/tensorviz-org/tensorviz-plugins/releases/tag/v0.3.61)
for Cursor. It requires macOS Apple Silicon and CPython 3.12 CPU capture. Local
installation, package validation, runtime checks, and marketplace approval are
separate results. This submission does not claim completed Cursor client
acceptance or an approved marketplace listing.

## Local evaluation

1. Copy this complete `third_party/tensorviz` directory to
   `~/.cursor/plugins/local/tensorviz`. The destination must directly contain
   `.cursor-plugin/plugin.json`, `mcp.json`, `runtime-lock.json`, `scripts/`,
   `skills/`, and `assets/`. Copy regular files rather than a symlink.
2. Restart Cursor or run **Developer: Reload Window**.
3. Open **Customize** and confirm the `model-workflow` skill and tensorViz MCP
   server. Your account or organization must allow local plugin imports. A
   marketplace installation of the same name takes precedence over a local copy.
4. Start a new Agent chat in your model project and use the prompt in the
   [README](../README.md). Complete the permission and environment prompts.

The MCP configuration uses `${CURSOR_PLUGIN_ROOT}/scripts/launch.sh`. Cursor
expands that variable to this plugin's installed directory. No Node.js command
or global Python executable is used to start the compiled host.

## Updates, removal, and troubleshooting

For marketplace installations, use Cursor's plugin management to update, disable,
or uninstall tensorViz. Start a new chat after an update; the runtime remains
pinned to this entry's version until its lock and integration are updated together.

For a local evaluation update, close tensorViz chats, move the old complete plugin
directory outside `~/.cursor/plugins/local`, and copy the new complete directory
into place. Reload Cursor and start a new chat. Restore the old complete directory
for rollback; do not combine files from different versions.

If download fails, check access to the URL in `runtime-lock.json` and reconnect.
The verified archive is cached under `~/Library/Caches/dev.tensorviz/runtime`.
A checksum error names the damaged archive: remove only that archive and
reconnect to download it again. Do not bypass checksum verification.

To remove a local evaluation, close its chats, remove only
`~/.cursor/plugins/local/tensorviz`, and reload Cursor. Removal preserves model
source, recipes, Python environments, cached runtimes, and saved permission.
Before removal, run the installed plugin's `scripts/launch.sh --revoke-permission`
if you want to revoke tensorViz permission. See [privacy](../PRIVACY.md).

## Provenance and review scope

The launcher, runtime lock, workflow skill, logo, support, and terms were copied
from public tag `v0.3.61`, commit
`d01630d9e9d6e453b1ef6f7786b7dd77b2601bed` of
[`tensorviz-org/tensorviz-plugins`](https://github.com/tensorviz-org/tensorviz-plugins/tree/v0.3.61/cursor/plugins/tensorviz).
Their hashes were checked against that release's `PUBLICATION.json`. The MIT
license is copied from the distribution repository. The privacy document changes
only its installation link to this guide.

The Cursor manifest uses this marketplace's supported author fields, adds display
and discovery metadata, and keeps the release version and component paths. This
entry also adds the catalog registration, README, changelog, and this guide. It
does not include the other clients' manifests or a compiled runtime archive.

Local submission checks on 3 November 2026 passed the repository's
`node scripts/validate-plugins.mjs` validator, launcher shell syntax, catalog and
manifest consistency, documentation links, and copied-file hash checks. An
isolated macOS Apple Silicon profile launched the configured MCP command from a
path containing spaces, downloaded the runtime without GitHub credentials, and
verified its 35,773,473-byte archive against the pinned SHA-256 digest. MCP
initialization reported tensorViz 0.3.61 and discovery returned 27 tools, including
`open_graph`, `open_graph_view`, `find_computation`, `query_computation`, and
`analyze_computation_change`. All three computation queries returned `NO_MODEL`
for an unopened model without creating user state. No model ran and no tensorViz
permission was granted. These checks did not run the Cursor application.

For client acceptance, verify skill/tool discovery, a small CPU model capture,
measured shapes, visible graph display, refresh after an edit, and an update with
retained setup. A manifest check or a direct MCP connection alone cannot establish
those Cursor behaviors.

References: [Cursor plugin format and MCP paths](https://cursor.com/docs/reference/plugins),
[local plugin imports](https://cursor.com/docs/plugins#test-plugins-locally).
