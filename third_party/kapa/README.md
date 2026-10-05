# Kapa

Cursor plugin that connects agents to [Kapa](https://www.kapa.ai/) through Kapa's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Kapa turns your company's knowledge into a knowledge base that AI agents can search. Set up, search, and improve your Kapa projects directly from Cursor, acting as the signed-in Kapa user.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Kapa**.
3. Click **Install** and complete the Kapa sign-in prompt in your browser.

Or run `/add-plugin kapa` in chat.

New to Kapa? Sign up at [kapa.ai](https://www.kapa.ai/) to start a 14-day free trial. Paid subscriptions are purchased on kapa.ai, outside the plugin.

## MCP

```json
{
  "mcpServers": {
    "kapa": {
      "type": "http",
      "url": "https://mcp.kapa.ai/mcp",
      "placement": "server"
    }
  }
}
```

The server authenticates with OAuth. Tool calls run with the signed-in user's Kapa project permissions; no tool takes a Kapa credential as an argument.

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `kapa-setup` | Set up a Kapa project and pick the right source type |
| `kapa-check` | Inspect source status and test retrieval quality |
| `kapa-gaps` | Review coverage gaps and top questions, and suggest content to close them |
| `kapa-setup-web-crawl` | Websites, documentation sites, and sitemaps |
| `kapa-setup-confluence` | Confluence spaces and pages |
| `kapa-setup-notion` | Notion pages and databases |
| `kapa-setup-google-drive` | Google Drive and shared drives |
| `kapa-setup-github-files` | Markdown and other files in a GitHub repository |
| `kapa-setup-github-issues` | GitHub issues |
| `kapa-setup-github-discussions` | GitHub Discussions |
| `kapa-setup-github-pull-requests` | GitHub pull requests |
| `kapa-setup-jira` | Jira Cloud issues |
| `kapa-setup-jira-service-management` | Jira Service Management requests |
| `kapa-setup-zendesk-helpcenter` | Zendesk Help Center articles |
| `kapa-setup-zendesk-tickets` | Zendesk support tickets |
| `kapa-setup-slack` | Slack channel threads |
| `kapa-setup-discord` | Discord channel threads |
| `kapa-setup-discourse` | Discourse forums |
| `kapa-setup-youtube` | YouTube video transcripts |
| `kapa-setup-openapi` | OpenAPI specifications |
| `kapa-setup-s3` | S3 and S3-compatible buckets |
| `kapa-setup-custom-qa` | Hand-written question and answer pairs |

## Example prompts

- "Help me connect a knowledge source to my Kapa project."
- "Search my Kapa knowledge base and include source links."
- "Show me common questions and coverage gaps in my Kapa project."

## Notes

- Starting a full crawl spends ingestion quota, so the agent confirms with you before calling `start_crawl`. Use a crawl preview first.
- The agent asks you for every credential a source needs and never invents one.
- Jira support covers Jira Cloud only, not Jira Server or Data Center.

## Docs

- Set up Kapa with an agent: https://docs.kapa.ai/getting-started/setup-with-an-agent
- Support: https://support.kapa.ai/
- Privacy policy: https://www.kapa.ai/content/privacy-policy
- Terms of service: https://www.kapa.ai/content/terms-of-service

## License

MIT
