# Audacity Group Inc

Cursor plugin that connects agents to [Audacity Group Inc](https://www.audacityme.com) through a [Model Context Protocol](https://modelcontextprotocol.io/) server.

Post to click, click to lead, lead to deal, deal to revenue. Audacity Group Inc connects real-time marketing signals to revenue in Salesforce. Its Jetfly attribution agent traces a social post through its tracked link to a Salesforce Opportunity and credits revenue to every campaign that influenced it, single-touch and multi-touch side by side.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Audacity Group Inc**.
3. Click **Install**.

Or run `/add-plugin audacity-group-inc` in chat.

## MCP

```json
{
  "mcpServers": {
    "audacity-group-inc": {
      "type": "http",
      "url": "https://github.com/Audacity-Group-Inc/.github/blob/main/README.md"
    }
  }
}
```

## Before you connect

You need a Salesforce org with the Audacity Group Inc managed package installed, and the Jetfly integration user assigned its least-privilege permission set.

## How it's controlled

- Each agent runs as its own Salesforce Integration User with a least-privilege permission set.
- Jetfly reads Lead, Campaign, Campaign Member, Contact, Opportunity, and Account, and can create and edit Leads only.
- Every agent action is logged under the agent's own user in the standard audit trail.
- A person approves record changes and qualifies every lead to SQL.

## Docs

- Audacity Group Inc: https://www.audacityme.com
- Overview: https://github.com/Audacity-Group-Inc/.github/blob/main/README.md

Logo is the `Audacity-Group-Inc` GitHub organization avatar. The submitted Canva brand-kit link and www.audacityme.com could not be fetched when this plugin was added.

## License

MIT
