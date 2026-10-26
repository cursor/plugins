---
name: headless-connect-vscode
description: "Specific VS Code Hostinger MCP Server connection instructions for the Hostinger Headless flow."
---

## Goals

- Make Hostinger MCP tools and Skills available in VS Code (GitHub Copilot / agent mode).
- Don't provision hosting, create stores, install WordPress, or deploy by hand here — the skill does all of that. This entry stops at signed in and checking that Hostinger MCP and skills are reachable.

## Step 1 — Make the connector callable

The later stages drive the Hostinger connector. If its Hostinger tools already respond in this
session, use them and move on.

If they don't, register the Hostinger MCP server for VS Code. The local MCP runs as a **stdio**
process and the bootstrap already signed you in, so it reuses your cached sign-in automatically
(`~/.config/hostinger-mcp/credentials.json`, or `HOSTINGER_API_TOKEN`) — no tokens to handle. Add it to
`.vscode/mcp.json` (workspace) or your user `settings.json` under `mcp`:

```json
// .vscode/mcp.json
{
  "servers": {
    "hostinger": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@hostinger/mcp@latest"]
    }
  }
}
```

Or add it in one command: `code --add-mcp '{"name":"hostinger","command":"npx","args":["-y","@hostinger/mcp@latest"]}'`.
VS Code picks up the server and its tools become available immediately — no editor restart needed.
(Alternatively, the official Hostinger Connector extension installs the same server:
`code --install-extension hostinger-official.hostinger-connector`.)

If you can't reach the registered server from this run, drive `npx -y @hostinger/mcp@latest` directly
over stdio instead: spawn it and speak newline-delimited JSON-RPC 2.0 over its stdin/stdout
(`initialize` → `notifications/initialized` → `tools/call`). It exposes `search`, `execute`,
`multi-execute`; everything the stages need goes through `execute`, and a result is in
`reply.result.content[0].text`.

## Step 2 — Install the skills and hand off

Download the Hostinger skills locally so your agent reads the files directly with no further network
calls. The repo is **public**, so fetch just the skill folder over HTTPS — no git, no credentials (see
`connect/tools/claude-code.md` for the full tarball command):

```bash
# macOS/Linux — downloads only skills/headless from the public repo
curl -fsSL https://codeload.github.com/hostinger/api-mcp-server/tar.gz/refs/heads/main \
  | tar -xz --strip-components=2 'api-mcp-server-main/skills/headless'
```

Then open `headless/SKILL.md` and follow its steps. That skill owns the rest of the run.
