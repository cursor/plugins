# PrivOS

Cursor plugin that connects agents to a [PrivOS](https://privos.ai) workspace through the official [`privos` CLI](https://github.com/PrivOS-AI/privos/blob/main/docs/cli/README.md) (`@privos_ai/privos` on npm), published by Roxane, Inc.

Read and post room messages, manage sandbox board projects and tasks, lists and items, files, agents, and rooms. Every write is a dry run until you confirm it.

## Install

1. Install the CLI (Node.js 20 or newer):

   ```bash
   npm install -g @privos_ai/privos
   privos --help
   ```

2. Set your PrivOS hub URL, user id, and personal access token in the environment the agent runs in.

   ```bash
   export PRIVOS_HUB_URL=https://your-privos-host
   export PRIVOS_HUB_USER_ID=your-user-id
   export PRIVOS_HUB_AUTH_TOKEN=your-personal-access-token
   ```

   For the sandbox board, also set `PRIVOS_SANDBOX_URL` and `PRIVOS_SANDBOX_API_KEY`.

3. Open **Cursor Settings → Plugins**, search for **PrivOS**, and install it. Or run `/add-plugin roxane-inc` in chat.

## MCP

This plugin ships no `mcp.json`. The PrivOS submission points at the `privos` CLI rather than a hosted MCP server, so the plugin ships the `privos` skill, which drives the CLI.

## Usage

Ask the agent things like:

- "List my PrivOS rooms"
- "Show messages and tasks in the General room"
- "Post 'Hello from Cursor' there"

Reads change nothing. Writes run as a dry run first. The agent shows you the request and sends it with `--confirm` only after you approve. The agent can see only what your PrivOS account can access.

## Docs

- CLI reference: https://github.com/PrivOS-AI/privos/blob/main/docs/cli/README.md
- Hub API: https://github.com/PrivOS-AI/privos/blob/main/docs/api/hub.md

Logo is the PrivOS brand mark, from [PrivOS-AI/privos-meeting-mcp-app](https://github.com/PrivOS-AI/privos-meeting-mcp-app).

## License

MIT
