# Charta — Chart Generator

Generate presentation-ready charts directly from Cursor. Waterfall, Mekko/Marimekko, bridge, bar, grouped bar, stacked bar, scatter, line, area, combo, funnel, gantt, heatmap, and bubble charts — all as SVG or PNG.

## What it does

The Charta MCP server exposes two tools:

- **`generate_chart`** — Generate a chart from your data. Returns SVG (or PNG if you ask). No setup, no libraries — just describe the chart and pass the data.
- **`save_chart`** — Save a previously generated chart to disk.

## Example

```
Generate a waterfall chart showing Q1 revenue bridge:
Starting: 100, New Business: +45, Churn: -12, Expansion: +23, Ending: 156
```

Cursor calls `generate_chart` and returns a publication-quality SVG you can drop straight into a slide deck or doc.

## Install

This plugin auto-configures the MCP server. No additional steps required.

Manual config (if needed):

```json
{
  "mcpServers": {
    "charta": {
      "command": "npx",
      "args": ["-y", "@charta/mcp"]
    }
  }
}
```

## Links

- Website: [getcharta.ai](https://getcharta.ai)
- Docs: [getcharta.ai/developers](https://getcharta.ai/developers)
- npm: [@charta/mcp](https://www.npmjs.com/package/@charta/mcp)
- GitHub: [mortenator/charta-mcp](https://github.com/mortenator/charta-mcp)
