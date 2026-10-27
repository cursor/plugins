# Connecting FrameOS, app by app

Reference for the frameos-setup skill. Every app connects to the same server:

- URL: `https://frameos.studio/mcp`
- Transport: Streamable HTTP (some apps call it "HTTP" or "streamable-http")
- Sign-in: OAuth in the user's browser, requesting the `frameos:mcp` access scope
- Server name used below: `frameos` (in Claude Code the plugin's copy is `plugin:frameos:frameos`)

The proof in every app is the same: ask "What is my FrameOS credit balance?" and the agent should answer with the workspace name and credits from `whoami`. Menu names come from each app's documentation and can move between versions; if a label differs, look in the app's MCP, Connectors or Plugins settings.

## Claude Code (terminal and the Desktop Code tab)

- Install the plugin (skills plus server):
  `claude plugin marketplace add theSatvik/frameos-plugins`
  `claude plugin install frameos@frameos`
  Inside a session the same steps are `/plugin marketplace add theSatvik/frameos-plugins` and `/plugin install frameos@frameos`.
- Server only, without the plugin: `claude mcp add --transport http frameos https://frameos.studio/mcp` (the server name is then `frameos`).
- Is it connected: `claude mcp list` shows each server's state; "Failed to connect" means the service could not be reached. In a session, `/mcp` lists the servers.
- Sign in or re-authenticate: `/mcp`, select `plugin:frameos:frameos`, choose to authenticate. `claude mcp login` does not see plugin connections, so sign in from `/mcp`.
- Sign out: `claude mcp logout plugin:frameos:frameos`. For a 403 permission error, sign out this way and then sign in again.
- Notes: non-interactive runs (`claude -p`, the SDK) cannot sign in, so sign in once interactively first. If FrameOS was also added as a claude.ai connector with the same URL, Claude Code uses its own server and hides the connector. Start a new session if the tools do not appear after installing.

## Claude.ai web, Claude Desktop, Cowork

- Option A, plugin: Customize > Plugins > Add > Add marketplace, enter `theSatvik/frameos-plugins`, install FrameOS, then open the plugin's Connectors tab and connect the FrameOS server.
- Option B, connector only: Customize > Connectors > Add custom connector, URL `https://frameos.studio/mcp`, sign in when asked. The Free plan allows one custom connector.
- Team and Enterprise: an Owner adds it under Organization settings > Connectors > Add > Custom > Web; then each member clicks Connect.
- Is it connected: the connector shows as connected in Customize > Connectors; then ask for the credit balance.
- Re-authenticate: Customize > Connectors > FrameOS > Connect. Sign-in settings cannot be edited after adding: for a 403 permission error, remove the connector and add it again.
- Notes: chat apps usually cannot send local video files to FrameOS; use public links, or upload in the web app at https://frameos.studio/dashboard. Uploading a skill on its own (Customize > Skills) needs code execution turned on.

## Codex (CLI and app)

- Install the plugin:
  `codex plugin marketplace add theSatvik/frameos-plugins`
  `codex plugin add frameos@frameos`
  In the TUI, `/plugins` opens the plugin browser. Plugin skills and tools load in a new session.
- Server only: `codex mcp add frameos --url https://frameos.studio/mcp`.
- Is it connected: `codex mcp list` (or `codex mcp get frameos --json`, which shows the URL and sign-in state); `/mcp` inside the TUI.
- Sign in or re-authenticate: `codex mcp login frameos`. For a 403 permission error: `codex mcp login frameos --scopes frameos:mcp`.
- Sign out: `codex mcp logout frameos`.
- Notes: a server named `frameos` in the user's own config hides the plugin's server of the same name. If `codex mcp get frameos --json` shows a URL other than `https://frameos.studio/mcp`, ask the user whether that entry is still needed before anything is removed (`codex mcp remove frameos` deletes it).

## ChatGPT (web)

- Install: once FrameOS is listed in the ChatGPT Plugin Directory, open https://chatgpt.com/plugins, search for FrameOS, add it and sign in. Until then, set it up in developer mode as below.
- Requirements: developer mode, available on Pro, Plus, Business, Enterprise and Education accounts on the web; a workspace admin can block it.
- Set up: Settings > Security and login > turn on Developer mode. Open ChatGPT Plugins at https://chatgpt.com/plugins, click "+", name it FrameOS, enter the MCP server URL `https://frameos.studio/mcp`, choose OAuth, and save. It appears under Drafts.
- Use it: in a chat, open the "+" menu > Developer mode, and select FrameOS.
- Is it connected: ask for the credit balance. After FrameOS updates its tools, use Refresh on the app's details page.
- Re-authenticate: open FrameOS under ChatGPT Plugins and sign in again from its details page; if that fails, remove it and add it again.
- Notes: ChatGPT asks for confirmation before tools that change things; that is expected.

## Cursor

- Install: from the Cursor Marketplace (Customize, find FrameOS, Install) once it is listed. Or one-click:
  `cursor://anysphere.cursor-deeplink/mcp/install?name=frameos&config=eyJ0eXBlIjoiaHR0cCIsInVybCI6Imh0dHBzOi8vZnJhbWVvcy5zdHVkaW8vbWNwIiwiYXV0aCI6eyJDTElFTlRfSUQiOiJ4ZFhxb25rd1ltMlh6TTFaIiwic2NvcGVzIjpbImZyYW1lb3M6bWNwIiwib2ZmbGluZV9hY2Nlc3MiXX19`
  Or add to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project):
  `{"mcpServers": {"frameos": {"url": "https://frameos.studio/mcp"}}}`
  Local plugin: clone the repo into `~/.cursor/plugins/local/frameos/` and reload Cursor.
- Is it connected: Customize > MCPs shows frameos and its toggle; errors appear in the Output panel (Cmd+Shift+U or Ctrl+Shift+U) under "MCP Logs".
- Re-authenticate: Customize > MCPs > frameos and follow the sign-in prompt. To force a fresh sign-in or a 403 fix, remove the server there and add it again.

## Gemini CLI

- Install the extension (run in the shell, not inside an interactive session, then restart Gemini CLI):
  `gemini extensions install https://github.com/theSatvik/frameos-plugins`
- Server only: `gemini mcp add --transport http frameos https://frameos.studio/mcp`, then give the `frameos` entry in `.gemini/settings.json` the extension's sign-in block: `"oauth": {"enabled": true, "clientId": "0SMM8YEjdF4YxCa4", "redirectUri": "http://localhost:7777/oauth/callback", "scopes": ["frameos:mcp", "offline_access"]}`. Without that client ID, sign-in fails.
- Is it connected: `/mcp list`; FrameOS should show as Connected.
- Sign in or re-authenticate: `/mcp auth frameos` (plain `/mcp auth` lists servers that need sign-in). Tokens are stored in `~/.gemini/mcp-oauth-tokens.json`.
- Notes: sign-in needs a local browser; it does not work over SSH without browser forwarding. "Missing issuer parameter" or "Issuer mismatch" during sign-in is a FrameOS-side problem: report it to support@frameos.studio.

## VS Code and GitHub Copilot

- Copilot CLI plugin: `copilot plugin install theSatvik/frameos-plugins:agent-plugin`.
- VS Code plugin: Command Palette > "Chat: Install Plugin From Source", enter `https://github.com/theSatvik/frameos-plugins` (agent plugins must be enabled with the `chat.plugins.enabled` setting).
- Server only, VS Code: `code --add-mcp '{"name":"frameos","type":"http","url":"https://frameos.studio/mcp"}'`, or add `{"servers": {"frameos": {"type": "http", "url": "https://frameos.studio/mcp"}}}` to `.vscode/mcp.json`.
- Server, Copilot CLI (1.0.83 or newer): `copilot mcp add --transport http frameos https://frameos.studio/mcp`, or add `{"mcpServers": {"frameos": {"type": "http", "url": "https://frameos.studio/mcp"}}}` to `~/.copilot/mcp-config.json`, keeping any servers already there. The Copilot CLI signs in with its own published client document, which FrameOS has registered, so there is no client ID or port to set. A `tools` list is optional. Signing in through the plugin's own connection is not tested; if it fails, add this server and sign in through it.
- Is it connected: VS Code: Command Palette > MCP: List Servers > frameos (Show Output for logs). Copilot CLI: `/mcp list` or `copilot mcp list`.
- Re-authenticate: VS Code: MCP: List Servers > frameos > Restart, then complete the browser sign-in. Copilot CLI: `/mcp auth frameos`. A registration error usually means the Copilot CLI is older than 1.0.83; update it with `copilot update`.
- Notes: in Copilot Business and Enterprise, the "MCP servers in Copilot" policy is off until an admin enables it. Copilot's cloud agent and code review cannot use servers that sign in with OAuth, so FrameOS works only in VS Code and the Copilot CLI (the Copilot app is not verified).

## Perplexity

- Requirements: Pro, Max or Enterprise. On Enterprise an admin must allow members to add custom connectors.
- Set up: Account settings > Connectors > "+ Custom connector" > Remote. Name `FrameOS`, MCP Server URL `https://frameos.studio/mcp`, Authentication OAuth with Client ID `2zmQEDyKLc8bw01o` under Advanced (secret empty; without that client ID sign-in fails), Transport Streamable HTTP. Tick the acknowledgement, click Add, then click the FrameOS card to sign in.
- Is it connected: the FrameOS card shows as connected; then ask for the credit balance.
- Re-authenticate: click the FrameOS card and sign in again. To pick up new FrameOS tools, remove the connector and add it again.

## Devin and Windsurf (Windsurf is now Devin Desktop)

- Not available yet. The Devin CLI, Devin Desktop and the Devin web app can't sign in to FrameOS today, so don't try to add the server there.
- Tell the user FrameOS is coming soon to Devin, suggest another app they use (or the web app at https://frameos.studio/dashboard), and give support@frameos.studio so they can ask to be told when Devin works.
- Windsurf's old Cascade agent was removed from Devin Desktop on 8 Sep 2026 and couldn't sign in either.

## Any other MCP client

- Add a remote server named `frameos` with URL `https://frameos.studio/mcp`, transport Streamable HTTP, OAuth sign-in. If the client lets you set scopes, use `frameos:mcp`.
- Skills only, for agents that read SKILL.md folders: `npx skills add theSatvik/frameos-plugins`. The skills still need the server above to do anything.
- Prove it with the credit-balance question.
