# Nooks

Cursor plugin that connects agents to [Nooks](https://www.nooks.ai) through Nooks' official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search accounts, prospects, calls, and coaching transcripts; build and edit sequences and their steps; enroll prospects; create, complete, and skip tasks; and draft or send one-off emails in the connected Nooks Workspace.

## Install

1. A Nooks admin creates an OAuth app and notes its credentials (see [Setup](#setup)).
2. Open **Cursor Settings → Plugins**, search for **Nooks**, and click **Install**.
3. Set **Nooks Client ID** and **Nooks Client Secret**, then complete the Nooks sign-in prompt.

Or run `/add-plugin nooks` in chat.

## MCP

```json
{
  "mcpServers": {
    "nooks": {
      "type": "http",
      "url": "https://mcp.nooks.in/mcp",
      "auth": {
        "CLIENT_ID": "${CLIENT_ID}",
        "CLIENT_SECRET": "${CLIENT_SECRET}"
      }
    }
  }
}
```

Nooks does not support dynamic client registration, so the connection is a confidential client: a Nooks admin registers one OAuth app and Cursor sends that app's client ID and secret (`client_secret_post`). Each user still signs in with their own Nooks account, and tool calls run with that user's Nooks permissions.

## Setup

### 1. Create the Nooks OAuth app

In Nooks, go to **Settings → All Settings → Developer → OAuth Apps** and create an app (for example "Cursor"):

1. Register the redirect URLs Cursor uses:

   | Surface | Redirect URL |
   | --- | --- |
   | Desktop | `http://localhost:8787/callback` |
   | Web and Cloud Agents | `https://www.cursor.com/agents/mcp/oauth/callback` |
   | Grok Bot | `https://www.cursor.com/bot/mcp/oauth/callback` |

2. Grant the app every available scope. Nooks recommends this for MCP apps because the agent may call any tool the signed-in user can; access is still enforced per user and per seat on every request.
3. Copy the **Client ID** and **Client Secret**.

Creating an OAuth app requires a Nooks Sequencing or AI Coaching seat, and only a Nooks Workspace admin can authorize the app the first time for a Workspace.

### 2. Enter the credentials in Cursor

In **Dashboard → Plugins → Configure**, set **Nooks Client ID** and **Nooks Client Secret** from that app. On a team marketplace an admin sets them once for everyone; each member still completes their own Nooks sign-in and picks the Workspace to connect.

## What agents can do

| Resource | Read | Write | Seat |
| --- | --- | --- | --- |
| Accounts | `listAccounts`, `getAccount` | `createAccountNote` | Any |
| Prospects | `listProspects`, `getProspect` | `syncProspects`, `createProspectNote` | Any (`syncProspects` is Sequencing only) |
| Sequences | `listSequences`, `getSequence` | `createSequence`, `updateSequence` | Sequencing |
| Sequence steps | `listSequenceSteps`, `getSequenceStep` | `createSequenceStep`, `updateSequenceStep`, `deleteSequenceStep`, `reorderSequenceSteps` | Sequencing |
| Enrollments | `listSequenceStates`, `getSequenceState` | `createSequenceState`, `finishSequenceState`, `deleteSequenceState` | Sequencing |
| Tasks | `listTasks`, `getTask` | `createTask`, `updateTask`, `completeTask`, `skipTask`, `deleteTask` | Sequencing |
| Calls | `listCalls`, `getCall`, `listCallDispositions`, `getCallDisposition` | — | Any |
| Emails | `listEmails`, `getEmail`, `getEmailTemplate`, `listMailboxes`, `getMailbox` | `createEmail` | Sequencing |
| Coaching | `searchCalls`, `getCallTranscript` | — | AI Coaching |
| Users & teams | `getMe`, `listUsers`, `getUser`, `listTeams`, `getTeam` | — | Any |

Nooks listed 46 tools at the time of writing, and the hosted server is the source of truth for tool names and schemas. The tools a user sees depend on their Nooks seats. Call `getMe` as a read-only smoke test after connecting; it returns the Nooks user and Workspace for the connection.

## Notes

- The Nooks MCP is available only to users with a Nooks Sequencing seat, a Nooks AI Coaching seat, or both.
- `createEmail` defaults to a draft for review in Nooks and only sends immediately when explicitly asked, through the user's connected mailbox.
- `searchCalls` and `getCallTranscript` only cover calls made by reps who hold an AI Coaching seat.
- The connector cannot place calls.
- One connection maps to one Nooks Workspace. To switch Workspaces, disconnect and sign in again.
- Access tokens last up to an hour. To cut off access completely, disconnect in Cursor and revoke the OAuth app in Nooks.

## Docs

- How to integrate Nooks with Claude (tool list, scopes, FAQ): https://support.nooks.ai/articles/1983758998-how-to-integrate-nooks-with-claude
- Setting up a Nooks OAuth app for MCP connectors: https://support.nooks.ai/articles/7188609428-setting-up-a-nooks-oauth-app-for-custom-claude-connectors
- Server URL: https://mcp.nooks.in/mcp

Logo is the Nooks mark from the nooks.ai favicon.

## License

MIT
