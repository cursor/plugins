# Nooks

Cursor plugin that connects agents to [Nooks](https://www.nooks.ai) through Nooks' official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Search accounts, prospects, calls, and coaching transcripts; build and edit sequences and their steps; enroll prospects; create, complete, and skip tasks; and draft or send one-off emails in the connected Nooks Workspace.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Nooks**.
3. Click **Install**, then complete the Nooks sign-in prompt.

Or run `/add-plugin nooks` in chat.

## MCP

```json
{
  "mcpServers": {
    "nooks": {
      "type": "http",
      "url": "https://mcp.nooks.in/mcp"
    }
  }
}
```

Auth is OAuth against Nooks (`https://oauth.nooks.in`). Cursor supplies the Nooks OAuth client, so there is no client ID or secret to configure. Each user signs in with their own Nooks account, picks the Nooks Workspace to connect if they belong to more than one, and approves the requested scopes. Tool calls run with that user's Nooks permissions.

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
- Access tokens last up to an hour. To cut off access, disconnect Nooks in Cursor.

## Docs

- Nooks: https://www.nooks.ai/
- Nooks MCP tool list, scopes, and FAQ: https://support.nooks.ai/articles/1983758998-how-to-integrate-nooks-with-claude
- Server URL: https://mcp.nooks.in/mcp

Logo is Nooks' 2026 logo from https://beta.nooks.in/nooks-logo-2026.png.

## License

MIT
