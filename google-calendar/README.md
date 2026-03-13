# Google Calendar

Use-case specific plugin for preparing meeting briefs from Calendar events, related Gmail threads, and Drive docs.

## Installation

```bash
/add-plugin google-calendar
```

## What this plugin includes

- A meeting-prep skill: `prepare-meeting-brief`
- A dedicated briefing agent: `meeting-briefing-pilot`
- Scoped MCP server config for Calendar + Drive + Gmail: `gws mcp -s calendar,drive,gmail -w -e`

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

Optional upstream skills:

```bash
npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-calendar
npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-drive
npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-gmail
```

## Typical flow

1. Select a meeting window and target calendar.
2. Build briefs for meetings that match selection criteria.
3. Review unresolved questions and prep actions.
4. Optionally save briefs to Drive.

## License

MIT
