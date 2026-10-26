---
name: hostinger-headless-connect
description: "Connect step for the Hostinger Headless flow — verify Node, run the bootstrap (reach the Hostinger MCP server + OAuth sign-in), then route to the matching coding-tool skill under tools/ so MCP tools and skills are available before the build steps run. Triggers: connect to Hostinger, set up the Hostinger connector, start a headless build."
---

# Hostinger Headless Skill — connect

You are a coding agent, and this is a skill for you to execute. Follow the phases below in order.

This skill goal is to help you to connect to Hostinger via MCP. That can be done via Hostinger Connector or adding the MCP via MCP Server.

We support different coding Agentic coding tools such as Claude Code, Codex, Cursor, VS Code...and so on. 

Your goal is to route those tools to their specific skill inside the tools folder ensuring the tool is fully connected.


## Phase 0 — Node (the single one prerequisite)

The Hostinger MCP server requires Node ≥ 20. Check it:

```bash
node -v
```

If that errors (Node not installed) or prints a version below 20, install or upgrade Node and re-check — do not try to work around it:

- macOS: `brew install node` (or `nvm install 22 && nvm use 22`)
- Linux: `nvm install 22 && nvm use 22` (or your distro's Node 20+ package)
- Windows: `winget install OpenJS.NodeJS.LTS` (or download from nodejs.org)

## Phase 1 — Run the bootstrap (deterministic)

Download the bootstrap script, then run it. It verifies the MCP server and handles sign-in, emitting one JSON event per line on stdout. Run it as a background/streaming process and relay its events to the user.

The script is safe and inspectable: it only checks the MCP server via `npx` and drives the OAuth sign-in (a browser flow with a localhost callback) — no other network calls, no filesystem writes. Read it first if your sandbox flags externally-downloaded code.

```bash
# macOS/Linux:
curl -fsSL -O https://raw.githubusercontent.com/hostinger/api-mcp-server/main/skills/headless/connect/bootstrap.mjs
# Windows PowerShell:
iwr https://raw.githubusercontent.com/hostinger/api-mcp-server/main/skills/headless/connect/bootstrap.mjs -OutFile bootstrap.mjs

node bootstrap.mjs
```

### Relay these events

The script emits one JSON object per line:

| Event | What to do                                                                                                                                                                                                                           |
| --- |--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `mcp_ok` | MCP server reachable — continue.                                                                                                                                                                                                     |
| `logged_in` | Already authenticated (env token or a previous sign-in) — continue.                                                                                                                                                                  |
| `awaiting_user` (`verificationUri`) | A browser window should have opened on the user's machine. Show the URL in plain prose and wait for the user to finish signing in. The OAuth callback lands on a localhost port, so the sign-in must be completed on this same machine. |
| `success` | Bootstrap done — continue to Phase 2. |
| `mcp_unreachable` / `login_failed` (with `detail`) | Stop and show the user the `detail`. Do not improvise a parallel setup by hand. |

If the environment has a `HOSTINGER_API_TOKEN` set (for example CI), the bootstrap reports `logged_in` immediately — no browser needed.

### Sign in or out manually

The bootstrap runs the sign-in for you. To run it directly, or to switch accounts, use the MCP's own commands. `--login` opens the browser to the Hostinger sign-in page, waits for the localhost callback, stores the credentials and exits. `--logout` revokes the stored credentials, so the next sign-in opens the browser again.

```bash
# With a global install (npm install -g @hostinger/mcp):
hostinger-api-mcp --login
hostinger-api-mcp --logout

# Without a global install:
npx --yes --package=@hostinger/mcp@latest hostinger-api-mcp --login
npx --yes --package=@hostinger/mcp@latest hostinger-api-mcp --logout
```

Credentials live in `~/.config/hostinger-mcp/credentials.json` (macOS/Linux) or `%APPDATA%\hostinger-mcp\credentials.json` (Windows) and are shared by every Hostinger MCP binary. OAuth works only in stdio mode; `--http` needs `HOSTINGER_API_TOKEN`.

## Phase 2 - Route to the specific tool instructions

| Tool        | Route                           |
|-------------|---------------------------------|
| Claude Code | `connect/tools/claude-code.md`  |
| Codex       | `connect/tools/codex.md`        |
| Cursor      | `connect/tools/cursor.md`       |
| VS Code     | `connect/tools/vscode.md`       |
| Antigravity | `connect/tools/antigravity.md`  |
| Devin       | `connect/tools/devin.md`        |

If the user's tool isn't listed yet, connect it the generic way (register the Hostinger MCP server
for that tool, or drive `npx --yes --package=@hostinger/mcp@latest hostinger-api-mcp` over stdio) and continue.

## Phase 3 - Continue to Headless Hosting steps

After evrything is verified and you have access to the Hostinger MCP Server and the skills then you can go back to `headless/SKILL.md` and follow the steps section to start the process.


## Reference Sources

- https://mcpservers.org/servers/hostinger/api-mcp-server
- https://www.hostinger.com/connector
