# voicehook

Talk with your agents. Cursor plugin that connects agents to [voicehook.ai](https://voicehook.ai/?utm_source=cursor-plugins&utm_medium=plugin-directory) through voicehook's remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Voice for your agent fleet: voicehook is a voice call in the browser, on your phone or your desktop. Your agent joins the call and keeps working while you talk to it. Delta, the voice in the call, answers from the status board, activity feed and FAQ the agent keeps up to date. Questions for you land on a Decision Board you answer with a tap or by voice. Agent-native: the agent drives the call through MCP tools, nothing to install.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **voicehook**.
3. Click **Install**.

Or run `/add-plugin voicehook` in chat.

Then ask the agent: "Start a voicehook call with me", and open the link it gives you in a normal browser (Chrome, Safari, Firefox). Or paste an invite link from a call page (`https://voicehook.ai/r/<room>?invite=<code>`) and the agent joins that call.

## MCP

```json
{
  "mcpServers": {
    "voicehook": {
      "type": "http",
      "url": "https://voicehook.ai/mcp"
    }
  }
}
```

No API key and no sign-in for the agent: the invite link is the permission, and `join` returns a short-lived session handle that ends with the call.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Calls | `create_call` opens a call room and returns the link for you; `join` joins a call from an invite link; `leave` |
| Conversation | `next` listens for what you say, `say` speaks through the voicebot |
| Status | `status` board, `activity` feed lines, `show` cards (text, code, link, image) on the call page |
| Decisions | `decide` puts a yes/no or A/B question on the Decision Board; the answer comes back in `next` |

The hosted runtime is the source of truth for tool names and schemas. Agent guide: https://voicehook.ai/agent/mcp/SKILL.md

## Before you connect

- The person in the call needs a browser with a microphone. A free daily allowance (about 10 minutes) needs no account; after that, calls use prepaid credit on voicehook.ai. The agent side pays nothing.
- One agent per call through MCP. Several agents or sessions on one machine in one call, with a shared board and decisions across sessions: the [voicehook-agent CLI](https://github.com/voicehook-ai/voicehook-agent).
- The full plugin with the `voicehook-join` skill (call rules for the agent) also ships as a Cursor plugin in [voicehook-ai/voicehook-agent](https://github.com/voicehook-ai/voicehook-agent) (`plugins/voicehook-join/.cursor-plugin/plugin.json`).

## Data and privacy

The plugin talks only to `https://voicehook.ai/mcp`. What the agent sends (spoken text, board, activity, cards, decisions) and the voices in the call are processed by voicehook.ai and its subprocessors (hosting in Germany, speech recognition, language model and speech output). voicehook does not store transcripts or call audio permanently; session data is deleted at most 5 minutes after a call ends. Details: https://voicehook.ai/privacy

## Docs

- Website: https://voicehook.ai/?utm_source=cursor-plugins&utm_medium=plugin-directory
- MCP guide: https://voicehook.ai/docs/mcp
- Source: https://github.com/voicehook-ai/voicehook-agent
- Support: support@voicehook.ai

Logo is voicehook's own mark, from the voicehook-join plugin.

## License

MIT
