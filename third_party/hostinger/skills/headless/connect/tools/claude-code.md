---
name: headless-connect-claude-code
description: "Specific Claude Code Hostinger MCP Server connection instructions for the Hostinger Headless flow."
---

## Goals

- Your goal is to make Hostinger MCP tools and Skills available in Claude Code. 
- Don't provision hosting, create stores, install WordPress, or deploy by hand here — the skill does all of that. This entry stops at signed in and checking that Hostinger MCP and skills are available.


## Step 1 — Make the MCP callable (no restart needed)

Stages 2–10 drive the Hostinger connector. If its tools are already in this session
(`mcp__hostinger__*`, or the scoped `mcp__hostinger-*__*`), use them and move on.

If they aren't, **don't register the server and restart** — Claude Code only loads MCP servers at
startup, but you don't need it to. The Hostinger MCP runs as a local **stdio** process and the
bootstrap already signed you in, so talk to it directly: spawn `npx -y @hostinger/mcp@latest` and
speak newline-delimited JSON-RPC 2.0 over its stdin/stdout (`initialize` →
`notifications/initialized` → `tools/call`). It reuses your cached sign-in automatically
(`~/.config/hostinger-mcp/credentials.json`, or `HOSTINGER_API_TOKEN`) — no tokens to handle. It
exposes `search`, `execute`, `multi-execute`; everything the stages need goes through `execute`, and
a result is in `reply.result.content[0].text`. Write the little client yourself (~20 lines), keep one
process alive for the whole run, and use it wherever a stage calls the connector.

## Step 2 — Install the skills and hand off

Download the Hostinger skills locally so your agent reads the files directly with no further network calls. The repo is **public**, so fetch just the skill folder over HTTPS — no git, no credentials:

```bash
# macOS/Linux — downloads only skills/headless from the public repo
curl -fsSL https://codeload.github.com/hostinger/api-mcp-server/tar.gz/refs/heads/main \
  | tar -xz --strip-components=2 'api-mcp-server-main/skills/headless'
```

```powershell
# Windows PowerShell
curl.exe -fsSL https://codeload.github.com/hostinger/api-mcp-server/tar.gz/refs/heads/main -o headless-skill.tar.gz
tar -xf headless-skill.tar.gz --strip-components=2 'api-mcp-server-main/skills/headless'
```

This leaves a local `headless/` folder with the full skill set. If the tarball is ever blocked, browse the public folder at `https://github.com/hostinger/api-mcp-server/tree/main/skills/headless` and save each file under a local `headless/` directory, preserving the paths.

Then open `headless/SKILL.md` and follow the steps on it. That skill owns the rest of the run — it resolves the operations sequence.

