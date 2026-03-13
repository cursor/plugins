# Gmail

Use-case specific plugin for daily Gmail inbox triage with optional Calendar follow-up scheduling.

## Installation

```bash
/add-plugin gmail
```

## What this plugin includes

- A focused triage skill: `daily-inbox-triage`
- A dedicated operator agent: `inbox-operations-lead`
- Scoped MCP server config for Gmail + Calendar: `gws mcp -s gmail,calendar -w -e`

## Setup

1. Install Google Workspace CLI:
   ```bash
   npm install -g @googleworkspace/cli
   ```
2. Authenticate:
   ```bash
   gws auth setup
   ```
3. Ensure `gws` is on your `PATH`.

Optional: add upstream API-specific skills:

```bash
npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-gmail
npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-calendar
```

## Typical flow

1. Ask the agent to run inbox triage for a specific window.
2. Review proposed label/archive decisions.
3. Confirm follow-up event creation for high-priority threads.
4. Receive a triage summary and unresolved items list.

## License

MIT
