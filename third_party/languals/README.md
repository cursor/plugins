# Languals

Cursor plugin that connects agents to [Languals](https://languals.fr), a language tutor, through Languals' hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Estimate CEFR levels, correct sentences with explained mistakes, translate expressions, and practice with flashcards and pronunciation.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Languals**.
3. Click **Install**.

Or run `/add-plugin languals` in chat.

## MCP

```json
{
  "mcpServers": {
    "languals": {
      "type": "http",
      "url": "https://languals.fr/mcp"
    }
  }
}
```

Public tools need no account or API key. Account tools use OAuth 2.1 (PKCE, dynamic client registration): Cursor prompts for Languals sign-in when you first call one. Create an account at https://languals.fr/register or sign in with Google, then click **Autoriser**.

## What agents can do

| Access | Capabilities |
| --- | --- |
| No account | List the languages taught, estimate the CEFR level (A1–C2) of a text, correct sentences with each mistake explained in the learner's language, translate expressions with usage notes |
| Languals account | Practice conversations with the tutor, end-of-session notes, progress and due flashcards, flashcard reviews, natural-voice pronunciation |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Level estimates are indicative.
- Account tools run under the Languals account of the user who authorizes the connection.

## Docs

- Languals: https://languals.fr
- Server URL: https://languals.fr/mcp
- Source: https://github.com/assoujojo82-coder/languals-mcp

The logo is referenced by its submitted URL (`https://languals.fr/languals-logo.png`). languals.fr blocked automated requests when this plugin was added, and no official Languals icon was found elsewhere, so no local image file is committed yet.

## License

MIT
