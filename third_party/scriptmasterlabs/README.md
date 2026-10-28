# Calibration Court

Cursor plugin that connects agents to ScriptMasterLabs' Calibration Court through its hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Score and calibrate agent predictions and verdicts against outcomes.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Calibration Court**.
3. Click **Install**.

Or run `/add-plugin scriptmasterlabs` in chat.

## MCP

```json
{
  "mcpServers": {
    "scriptmasterlabs": {
      "type": "http",
      "url": "https://calibration-court.onrender.com/mcp"
    }
  }
}
```

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- ScriptMasterLabs: https://scriptmasterlabs.com
- Server URL: https://calibration-court.onrender.com/mcp

Logo is ScriptMasterLabs' `apple-touch-icon.png` from the scriptmasterlabs.com source repository. scriptmasterlabs.com could not be reached when this plugin was added, so the file was not downloaded from the website.

## License

MIT
