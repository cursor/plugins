# takeoff.bid

Cursor plugin that connects agents to [takeoff.bid](https://takeoff.bid) construction takeoffs through the takeoff.bid MCP companion.

Check the connection, load plan PDFs into a new project, check sheet scales and saved quantities, trace plan linework, and prepare takeoff and estimating changes. Changes are staged for your review in the takeoff.bid app, where you can apply them and Undo. The plugin doesn't submit bids or write to other software.

## Before you connect

- macOS with the takeoff.bid app installed ([Mac App Store](https://apps.apple.com/us/app/construction-takeoff/id6751007895?mt=12)).
- The separately installed takeoff.bid MCP companion. In takeoff.bid, open **3D Model → AI tools**, export the AI setup, and follow its instructions. The launcher expects the executable at `~/.local/bin/takeoff-mcp` and exits with an error on other platforms or when it's missing.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **takeoff.bid**.
3. Click **Install**, then reload Cursor.

Or run `/add-plugin takeoff.bid` in chat.

Disable any older local plugin that registers the same companion so tools aren't duplicated.

## MCP

```json
{
  "mcpServers": {
    "takeoff.bid": {
      "command": "/bin/sh",
      "args": [
        "-c",
        "#!/bin/sh\nset -eu\nif [ \"$(uname -s)\" != Darwin ]; then\n  echo 'takeoff.bid requires a local macOS session with the takeoff.bid companion installed.' >&2\n  exit 69\nfi\ncompanion=\"$HOME/.local/bin/takeoff-mcp\"\nif [ ! -x \"$companion\" ]; then\n  echo 'takeoff.bid companion is missing. In takeoff.bid open 3D Model > AI tools, export AI setup, and follow its installation instructions. Expected ~/.local/bin/takeoff-mcp.' >&2\n  exit 69\nfi\nexport TAKEOFF_MCP_ENABLE_LEGACY_WRITES=0\nexec \"$companion\"\n"
      ],
      "env": {
        "TAKEOFF_MCP_ENABLE_LEGACY_WRITES": "0"
      }
    }
  }
}
```

The server runs locally over stdio. The launcher only starts the installed companion and keeps legacy direct writes disabled. It doesn't download code or make network requests. See [PRIVACY.md](PRIVACY.md).

## Try it

- "Check my takeoff.bid connection without changing anything."
- "Find Cedar Ridge Demo and list its sheets."

A sample project is available at [app.takeoff.bid/demo](https://app.takeoff.bid/demo).

## Contents

- `mcp.json`: local launcher for the takeoff.bid companion.
- `skills/takeoff-workflow`: guidance for plan import, scale review, quantity reads, gas-line tracing, and the takeoff-to-estimate loop.
- `companion-requirements.json`: tool inventory the publisher uses for release checks.

The installed companion is the source of truth for tool names and schemas.

## Docs

- Website: https://takeoff.bid
- Source: https://github.com/masonearl/construction-takeoff-plugins
- Documentation: https://www.masonearl.com/pages/documentation.html#construction-takeoff
- Contact: hi@masonearl.com

Logo is the icon published in the plugin's source repository (`packages/cursor/assets/icon.png`).

## License

MIT for the plugin files. The takeoff.bid app and companion are separately licensed. See [NOTICE](NOTICE).
