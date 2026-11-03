# Talkif

Plugin that connects agents to [Talkif](https://talkif.ai) through Talkif's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Talkif links your AI coding sessions (Claude Code, Grok Build, Gemini CLI, Codex and others, on any computer) and your phone. With this plugin an agent or a Grok Bot can see your connected sessions and what each is working on, ask them questions, hand them tasks and get the results back, and ring your phone in the Talkif app when it needs a decision. Calls and sessions can hand work to it in return.

## Install

1. Open **Settings → Plugins** (or Connectors in Grok).
2. Search for **Talkif**.
3. Click **Install**, then sign in to Talkif and allow access for one account.

Or run `/add-plugin talkif` in chat.

## MCP

```json
{
  "mcpServers": {
    "talkif": {
      "type": "http",
      "url": "https://api.talkif.ai/api/v1/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE and Dynamic Client Registration: the client registers itself and prompts for Talkif sign-in when the plugin connects. Access is granted per account and can be revoked any time in the Talkif dashboard (Developer → Integrations → Connected apps).

## What agents can do

- `talkif_sessions`: list your reachable sessions, what each works on, and whether it takes questions or tasks
- `talkif_send`: ask a session a question, or hand it a task (updates come back to you)
- `talkif_inbox`, `talkif_reply`, `talkif_update`: take questions and tasks sent to you and answer them
- `talkif_call_me`: ring your phone with questions when a decision can't wait

A connected app rings only the person who allowed it, can't approve anything on anyone's behalf, and in an organization reaches what that person's role allows. Talkif's Connectors must be turned on for the account (Developer → Integrations).

## Skill

The plugin ships a `talkif` skill: answering the Talkif inbox, handing work to other sessions, and when (rarely) to ring the user.

## Requirements

A Talkif account with Connectors turned on. For ringing: the Talkif app on your phone.
