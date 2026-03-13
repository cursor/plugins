# Google Drive

Use-case specific plugin for publishing release assets from Google Drive and announcing delivery in Google Chat.

## Installation

```bash
/add-plugin google-drive
```

## What this plugin includes

- A release publishing skill: `publish-release-folder`
- A dedicated orchestration agent: `release-publisher-coordinator`
- Scoped MCP server config for Drive + Chat: `gws mcp -s drive,chat -w -e`

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
npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-drive
npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-chat
```

## Typical flow

1. Provide the release folder ID and release notes.
2. Specify sharing targets and approval for permission scope.
3. Publish and verify links.
4. Send a Chat release announcement.

## License

MIT
