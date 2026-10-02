# PostHog MCP

Cursor plugin that connects agents to [PostHog](https://posthog.com) through PostHog's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Query product and web analytics, run HogQL/SQL against your project, ship and roll out feature flags, create and analyze experiments, triage error tracking issues, and work with session replays, surveys, dashboards, logs, and CDP destinations from chat.

This is a URL-only connector to PostHog's hosted MCP server. PostHog also publishes its own richer plugin (`posthog`, with bundled skills, commands and hooks) in the marketplace; install one or the other, not both.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **PostHog MCP**.
3. Click **Install**, then complete the PostHog sign-in prompt.

Or run `/add-plugin posthog-mcp` in chat.

## MCP

```json
{
  "mcpServers": {
    "posthog": {
      "type": "http",
      "url": "https://mcp.posthog.com/mcp"
    }
  }
}
```

Auth is OAuth. Cursor prompts for PostHog sign-in when the plugin connects — there is no client ID or API key to configure. Each user signs in with their own PostHog account, and the PostHog authorization server routes the connection to the correct data region (US or EU) for that account.

## Before you connect

You need a PostHog account ([sign up](https://app.posthog.com/signup)). Connecting to the MCP server and calling its tools is free; standard PostHog usage and billing still apply to the data your queries consume. A few tools run LLMs internally (for example, survey response summarization and trace summarization) and may be billed as PostHog AI spend; those tools are only exposed when AI data processing is enabled in your organization settings. See the [FAQ](https://posthog.com/docs/model-context-protocol/faq) for details.

One connection signs in as one account with one active organization and project; `switch-organization` and `switch-project` change the active context.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Product analytics | `insight-query` runs trends, funnels, retention, paths, lifecycle, and stickiness queries, with `query-trends`, `query-funnel`, `query-retention`, `query-paths`, and their `-actors` variants for direct access; `insights-list`, `insight-get`, `insight-create`, and `insight-update` manage saved insights |
| SQL and data schema | `execute-sql` runs HogQL queries against the project; `read-data-schema` describes the events, properties, and warehouse tables available to query |
| Dashboards | `dashboards-get-all`, `dashboard-get`, `dashboard-create`, `dashboard-update`, and tile tools (`dashboard-create-tile`, `dashboard-reorder-tiles`) build and edit dashboards |
| Feature flags | `feature-flag-get-all`, `feature-flag-get-definition`, `create-feature-flag`, `update-feature-flag`, `feature-flag-enable` / `feature-flag-disable`, `feature-flag-set-release-condition-rollout`, `feature-flag-roll-out-to-everyone`, and `scheduled-changes-*` for timed rollouts |
| Experiments | `experiment-list`, `experiment-get`, `experiment-create`, `experiment-create-from-prompt`, `experiment-launch`, `experiment-pause`, `experiment-end`, `experiment-ship-variant`, and `experiment-results-get` |
| Error tracking | `query-error-tracking-issues-list`, `query-error-tracking-issue`, and `query-error-tracking-issue-events` read issues and stack traces; `error-tracking-issues-partial-update`, `error-tracking-issues-assign-partial-update`, `error-tracking-issues-merge-create`, and the assignment, grouping, severity, and suppression rule tools manage triage |
| Session replay | `query-session-recordings-list` and `session-recording-get` find and inspect recordings; playlist tools group them |
| Surveys | `surveys-get-all`, `survey-get`, `survey-create`, `survey-launch`, `survey-stop`, `survey-stats`, `surveys-responses-list`, and `surveys-summarize-responses-create` |
| Logs and tracing | `query-logs`, `logs-patterns`, `logs-anomalies-scan`, and `logs-alerts-*`; `query-apm-spans`, `apm-trace-get`, and the `apm-spans-*` aggregations for distributed traces |
| Web analytics | `query-web-overview`, `query-web-stats`, `query-web-vitals`, `web-analytics-weekly-digest`, and heatmap tools |
| Persons and cohorts | `persons-list`, `persons-retrieve`, `persons-property-set`, `cohorts-list`, `cohorts-create`, and `cohorts-add-persons-to-static-cohort-partial-update` |
| CDP and data warehouse | `cdp-functions-list`, `cdp-functions-create`, `cdp-function-templates-list`, and revision tools for destinations and transformations; `external-data-sources-list`, `data-warehouse-source-setup`, `view-create`, and `view-run` for warehouse sources and saved views |
| Workspace and docs | `organizations-get`, `projects-get`, `switch-organization`, `switch-project`, `docs-search`, and `generate-app-url` |

The server exposes 1,000+ tools across 70+ categories, including AI observability, alerts, annotations, billing, conversations, endpoints, notebooks, workflows, and more. See the [tools reference](https://posthog.com/docs/model-context-protocol/tools) for the full list. The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Many tools write to your project: they create, update, enable, and delete flags, experiments, insights, cohorts, surveys, and CDP functions, and `persons-bulk-delete` and `session-recording-bulk-delete` remove data. Review each write before letting the agent run it, and be mindful of prompt injection from untrusted content in query results.
- Writes go to the active project. Confirm which organization and project the connection is on before letting the agent change flags or experiments.
- Tool calls run against the PostHog API and share its per-team rate limits. The MCP server proxies to your PostHog instance and does not store your analytics data.
- Cursor registers every tool individually (PostHog's "tools mode"). Other clients may default to a single `exec` tool; the docs describe the `mode`, `readonly`, `features`, and `tools` query parameters for scoping a session.

## Docs

- MCP overview: https://posthog.com/docs/model-context-protocol
- Tools reference: https://posthog.com/docs/model-context-protocol/tools
- FAQ and advanced setup: https://posthog.com/docs/model-context-protocol/faq
- API reference: https://posthog.com/docs/api
- Server URL: https://mcp.posthog.com/mcp

Logo is PostHog's official mark.

## License

MIT
