---
name: headless-connect-codex
description: "Specific Codex Hostinger MCP Server connection instructions for the Hostinger Headless flow."
---

## Goals

- Make Hostinger MCP tools and Skills available in Codex.
- Don't provision hosting, create stores, install WordPress, or deploy by hand here — the skill does all of that. This entry stops at signed in and checking that Hostinger MCP and skills are reachable.

## Step 1 — Make the connector callable (no restart needed)

The later stages drive the Hostinger connector. If its Hostinger tools already respond in this
session, use them and move on.

If they don't, **don't rely on registering the server and restarting** — Codex loads MCP servers when
it starts, and you can't restart it mid-run. The Hostinger MCP runs as a local **stdio** process and the
bootstrap already signed you in, so talk to it directly for this run: spawn `npx -y @hostinger/mcp@latest`
and speak newline-delimited JSON-RPC 2.0 over its stdin/stdout (`initialize` →
`notifications/initialized` → `tools/call`). It reuses your cached sign-in automatically
(`~/.config/hostinger-mcp/credentials.json`, or `HOSTINGER_API_TOKEN`) — no tokens to handle. It
exposes `search`, `execute`, `multi-execute`; everything the stages need goes through `execute`, and a
result is in `reply.result.content[0].text`. Write the little client yourself (~20 lines), keep one
process alive for the whole run, and use it wherever a stage calls the connector.

**To persist it for future Codex sessions** (optional), register the server with
`codex mcp add hostinger -- npx -y @hostinger/mcp@latest`, or add it to `~/.codex/config.toml`, then
restart Codex so it loads:

```toml
[mcp_servers.hostinger]
command = "npx"
args = ["-y", "@hostinger/mcp@latest"]
```

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
