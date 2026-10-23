# Playwright

Cursor plugin that connects agents to a real browser through Microsoft's [Playwright MCP](https://github.com/microsoft/playwright-mcp) server.

Navigate pages, click and fill elements, take accessibility snapshots and screenshots, and run end-to-end checks from chat.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Playwright**.
3. Click **Install**.

Or run `/add-plugin playwright` in chat.

## Requirements

This is a **local stdio** MCP server. Cursor launches it with `npx -y @playwright/mcp@0.0.83`, so the machine running Cursor needs **Node.js** installed and on `PATH`. The `-y` flag skips `npx`'s install confirmation so the first launch cannot hang waiting for interactive input over stdio.

The first run downloads Playwright's browser binaries. That can take a minute and needs network access; later runs reuse the cached browsers.

## MCP

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.83"]
    }
  }
}
```

No credentials are required. The server runs locally and drives a browser on the same machine.

## Docs

- Playwright MCP: https://github.com/microsoft/playwright-mcp
- Playwright: https://playwright.dev

Logo is Microsoft's official Playwright mark from the Playwright website, placed on a white tile with padding so it reads well in the Cursor UI:
https://github.com/microsoft/playwright.dev/blob/main/static/img/playwright-logo.svg

## License

MIT
