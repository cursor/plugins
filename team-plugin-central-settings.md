# Team-managed plugin settings for Cursor Marketplace plugins

This document summarizes a review of the plugins currently surfaced by the Cursor Marketplace page and proposes the sets of configuration that should be managed centrally when a team enables plugins.

Review date: 2026-03-24

## Scope reviewed

The marketplace page currently exposes 72 plugin records. At a high level, the catalog is dominated by:

- 58 plugins with skills
- 55 plugins with MCP servers
- 24 plugins with rules
- 17 plugins with commands
- 8 plugins with hooks

Curated marketplace categories represented on the page:

- Productivity: 18
- Data & Analytics: 17
- Infrastructure: 15
- Agent Orchestration: 9
- Payments: 3
- Featured: 4

This matters because most team governance needs to focus on MCP access, skill/rule behavior, secrets, and write-capable actions rather than just install/uninstall.

## Bottom line

When setting up plugins for a team, the central admin surface should not be "one giant per-plugin blob." It should be a stable set of shared configuration groups that can be applied consistently across plugins:

1. Distribution and lifecycle
2. Identity, authentication, and secrets
3. Authorization and write controls
4. Resource and workspace targeting
5. Data governance and compliance
6. MCP runtime and network policy
7. Rule, skill, agent, command, and hook policy
8. Automation and workflow defaults
9. Observability, audit, and incident handling
10. Cost, rate limits, and quota controls
11. Versioning and change management
12. Per-category plugin presets

Those are the settings sets that should be centrally managed. Individual developers can still choose local preferences inside the safe boundary the team defines.

## Recommended central settings model

### 1) Distribution and lifecycle

These settings apply to every plugin, regardless of vendor.

Manage centrally:

- Whether the plugin is allowed at all
- Required vs optional installation
- Which distribution groups get the plugin
- User-level vs project-level install expectation
- Approved plugin version or update channel
- Rollout stage: pilot, default-on, restricted, deprecated
- Allowed platforms: desktop only, cloud agents, both
- Review owner for the plugin
- Revalidation cadence after plugin updates

Why this is central:

- Cursor team marketplaces already support required vs optional plugins and group-based distribution.
- Teams need a consistent way to roll out plugins gradually and avoid every engineer self-selecting privileged integrations.

### 2) Identity, authentication, and secrets

This is the most common central settings area for MCP-backed plugins.

Manage centrally:

- Auth method: OAuth, API key, service account, hosted MCP auth, local credential
- Credential ownership model: user credential vs shared team credential vs environment credential
- Secret source: 1Password, vault, cloud secret manager, env var injection
- Required secret names and mapping into MCP env vars
- Rotation policy and expiry handling
- Whether personal tokens are allowed
- Whether break-glass credentials exist
- IdP/SCIM group mapping for access entitlement
- Region- or tenant-specific auth endpoints

Why this is central:

- Slack, Linear, GitLab, Datadog, AWS, Stripe, Postman, PagerDuty, PlanetScale, Box, Notion, and similar plugins are only useful after authenticated binding to a real workspace/account.
- Teams need one approved secret path instead of every plugin inventing its own token story.

### 3) Authorization and write controls

Many plugins are not just read-only. They can create issues, send messages, deploy services, change incidents, or modify billing-related resources.

Manage centrally:

- Read-only vs read-write mode
- Whether destructive actions are allowed
- Whether production actions are allowed
- Allowed action classes, for example:
  - read/search only
  - comment/update only
  - create resources
  - deploy/publish
  - delete/destructive
- Approval requirements for sensitive actions
- Dry-run requirement for mutating workflows
- Human confirmation requirements before send/post/deploy/merge
- Repo or environment gates for automations

Why this is central:

- Slack can send messages
- GitLab and Atlassian can mutate tickets or merge-request state
- Render, AWS, Cloudflare, and Vercel can change infrastructure
- PagerDuty can affect incident operations
- Stripe, Circle, Phantom Connect, and eToro operate in financially sensitive domains

If a team only centralizes one policy beyond installation, it should be this one.

### 4) Resource and workspace targeting

Most plugins need a default target boundary so the agent knows which org, team, project, workspace, account, or environment it should act against.

Manage centrally:

- Organization/workspace ID
- Team/project defaults
- Allowed repositories or services
- Environment defaults: dev, staging, prod
- Region/site selection
- Account/subscription/tenant selection
- Dataset/index/database defaults
- Namespace, folder, board, or collection scoping
- Resource allowlists and denylists

Examples:

- Slack: workspace, channels, allowed posting targets
- Linear/Jira/Atlassian: workspace, team, project, workflow states
- Datadog/Sentry/Grafana: org, services, environments, saved dashboards
- AWS/Cloudflare/Vercel/Render: account, project, environment, region
- Databricks/Snowflake/ClickHouse/Supabase/Prisma/Postgres/Cosmos DB: account, database, catalog, schema, branch
- Box/Notion/Miro/Figma/Webflow/Wix: workspace/site/folder/board/file scope

### 5) Data governance and compliance

A large portion of the marketplace touches internal knowledge, production telemetry, customer data, support queues, code, financial records, or incident data.

Manage centrally:

- Data classification allowed for the plugin
- Whether PII, PHI, finance, or customer-content access is allowed
- Redaction requirements before tool invocation
- Whether prompts/results may include raw production data
- Log retention and transcript retention requirements
- Allowed data export behavior
- Region/data residency constraints
- External sharing restrictions
- Audit event retention requirements

Why this is central:

- Glean, Slack, Box, Notion, Plain, PostHog, Pendo, Amplitude, Datadog, Snowflake, and similar plugins often surface sensitive content.
- Team policy should determine safe data handling once, not plugin by plugin.

### 6) MCP runtime and network policy

Because 55 marketplace plugins include MCP servers, this deserves its own first-class settings group.

Manage centrally:

- Whether the MCP server is enabled
- Hosted MCP vs local command-based MCP preference
- Approved command, args, and env templates for local MCPs
- Allowed outbound hosts/domains
- Network egress restrictions
- Proxy configuration
- Startup timeout and request timeout
- Retry policy
- Concurrency limit
- Whether the MCP is available in cloud agents, local IDE only, or both
- Health-check and failure-handling behavior

Why this is central:

- Even when two plugins solve similar problems, the operational risk often sits in the MCP runtime and network path, not the prompt text.
- This is especially important for infrastructure, database, and enterprise SaaS plugins.

### 7) Rule, skill, agent, command, and hook policy

Marketplace plugins are not only connectors; they also change agent behavior through skills, rules, commands, and hooks.

Manage centrally:

- Which plugin components are enabled:
  - MCP servers
  - skills
  - rules
  - commands
  - agents
  - hooks
- For rules:
  - Always / Agent decides / Manual mode
  - File globs or scope
  - Conflict precedence with existing team rules
- For skills:
  - Available to all users or only certain groups
  - Auto-discoverable vs manual-only invocation
- For commands:
  - Who may run them
  - Which repos/projects they apply to
- For hooks:
  - Whether hooks are allowed at all
  - Which hook events are permitted
  - Which shell commands/scripts are approved

Why this is central:

- Skills and rules are the dominant non-MCP components in the marketplace.
- Hooks are comparatively rare but high impact because they can run scripts automatically.

### 8) Automation and workflow defaults

Some plugins are most valuable when used inside recurring workflows rather than ad hoc chat.

Manage centrally:

- Which workflows are approved
- Schedule or event triggers
- Default prompt templates
- Escalation destinations
- Notification channels
- Retry and backoff behavior
- Safety checks before external actions
- Required linked context, for example repo, incident, ticket, environment
- Whether automations may open PRs, post comments, or page humans

Examples:

- Datadog + PagerDuty incident investigation
- Slack + bug triage workflows
- GitLab/Atlassian/Linear issue management
- Render/Vercel/AWS deploy helpers
- Postman/API validation workflows

### 9) Observability, audit, and incident handling

Teams will want a consistent trail for who enabled a plugin, what it accessed, and which mutations it made.

Manage centrally:

- Audit logging required or optional
- Log sink destination
- Request/response redaction policy
- Change attribution model: human identity vs shared bot identity
- Alerting on failed auth, denied actions, or high-risk mutations
- Incident response owner if a plugin misbehaves
- Break-glass disable switch

Why this is central:

- A plugin that can page PagerDuty, send Slack messages, create Stripe resources, or touch infrastructure should be observable like any other privileged automation.

### 10) Cost, rate limits, and quota controls

Some plugins call billed APIs or operate against metered systems.

Manage centrally:

- API budget owner
- Per-user or per-team quota
- Concurrency limit
- Rate-limit backoff defaults
- Whether expensive operations are allowed automatically
- High-cost capability allowlists, for example:
  - large analytics queries
  - web crawling
  - browser automation
  - production deploys
  - code scans across many repos

Examples:

- Tavily, Firecrawl, Parallel, Browserbase, Browserstack, Datadog, Snowflake, Postman, Stripe, and cloud/infrastructure plugins all have meaningful cost or quota exposure.

### 11) Versioning and change management

Plugin behavior can change even when the core team does nothing, because vendors update plugin contents and MCP behavior.

Manage centrally:

- Approved version or commit pin
- Auto-update vs manual promotion
- Changelog review requirement
- Security review requirement for major changes
- Rollback procedure
- Owner sign-off for new scopes or write actions

Why this is central:

- Skills, rules, hooks, and MCP definitions are all behavior-changing artifacts. Teams need a promotion path similar to internal tooling.

### 12) Per-category plugin presets

Beyond the universal settings, teams should centralize a small set of category-specific presets.

#### Productivity and collaboration plugins

Examples reviewed:

- Slack
- Linear
- Atlassian
- GitLab
- Box
- Notion
- Monday.com
- Figma
- Miro
- Webflow
- Wix
- Sanity
- LaunchDarkly
- tldraw

Central settings to standardize:

- Workspace/team/project mapping
- Read vs write permissions
- Allowed posting/commenting destinations
- Allowed issue/project state transitions
- Publishing permissions
- Content visibility and document scope
- Human-approval requirement for outbound communication

#### Infrastructure and operations plugins

Examples reviewed:

- AWS
- Cloudflare
- Vercel
- Render
- Datadog
- PagerDuty
- Sentry
- JFrog
- PlanetScale
- Neon Postgres
- Convex
- Clerk
- Browserstack

Central settings to standardize:

- Account/project/environment bindings
- Production-change restrictions
- Deploy approval gates
- Incident-write permissions
- Allowed services and regions
- Environment separation rules
- On-call and alerting destinations

#### Data and analytics plugins

Examples reviewed:

- Amplitude
- Pendo
- PostHog
- Databricks
- Snowflake
- ClickHouse
- Azure Cosmos DB
- Supabase
- Prisma
- Postman
- Braintrust
- Hex
- Hugging Face
- Omni

Central settings to standardize:

- Data source selection
- Catalog/schema/database scope
- Query safety mode
- Allowed writeback operations
- Data sensitivity tier
- Maximum query breadth/cost
- Saved workspace/project defaults

#### Security, secrets, and code scanning plugins

Examples reviewed:

- 1Password
- Snyk
- Semgrep
- Endor Labs
- Cisco ThousandEyes

Central settings to standardize:

- Credential source of truth
- Scan scope
- Remediation authority
- False-positive handling
- Network visibility scope
- Secret access approval rules

#### Payments and financial plugins

Examples reviewed:

- Stripe
- Circle
- Phantom Connect
- eToro

Central settings to standardize:

- Sandbox vs production default
- Allowed transaction classes
- Mutating-action approvals
- Wallet/account/workspace binding
- Audit retention
- Financial-data handling policy

#### Agent orchestration and runtime plugins

Examples reviewed:

- Runlayer
- Firetiger
- Compound Engineering
- Context7
- Parallel
- Superpowers
- Browserbase Browse
- Create Plugin
- Continual Learning
- Cursor Team Kit

Central settings to standardize:

- Which orchestration features are enabled
- Whether third-party agents may run automatically
- Tooling and shell restrictions
- Transcript retention
- Hook allowance
- Safety policy inheritance from the base team setup

## What should be centrally managed vs locally adjustable

### Central

- Plugin allow/deny
- Required vs optional
- Group assignment
- Auth method and secret source
- Workspace/account/project/environment targets
- Read/write/destructive permissions
- Allowed component types
- Hook allowance
- Production access
- Compliance classification
- Audit requirements
- Version/update policy
- Budgets and quotas

### Local or team-within-team adjustable

- Personal notification preferences
- Manual skill invocation choices
- Optional plugin install decisions for optional plugins
- Personal saved views or dashboards, if policy allows
- Non-sensitive local convenience defaults

## Proposed admin-facing schema

This is the configuration shape a team marketplace setup flow should aim to collect:

```yaml
pluginPolicy:
  distribution:
    state: required | optional | blocked
    groups: []
    scope: project | user | both
    rolloutStage: pilot | default | restricted | deprecated
  auth:
    mode: oauth | apiKey | serviceAccount | hostedMcp
    credentialOwner: user | team | environment
    secretSource: 1password | vault | env | cloud-secret-manager
    allowPersonalTokens: false
  access:
    mode: readOnly | limitedWrite | fullWrite
    allowProduction: false
    destructiveActions: denied | approval | allowed
    approvalRequiredFor: [send_message, deploy, delete, financial_write]
  targets:
    org: ""
    workspace: ""
    project: ""
    environments: [dev, staging]
    allowlist: []
  governance:
    dataClassifications: [internal]
    allowSensitiveData: false
    redactResponses: true
    auditLogging: required
  runtime:
    enableMcp: true
    enableSkills: true
    enableRules: review
    enableCommands: false
    enableHooks: false
    cloudAgentSupport: allowed
    allowedHosts: []
  automation:
    approvedWorkflows: []
    dryRunByDefault: true
    notificationDestinations: []
  operations:
    owner: ""
    budgetOwner: ""
    updateChannel: pinned
    rollbackContact: ""
```

## Practical setup flow for a team plugin

If this were turned into a setup wizard, the admin flow should ask for settings in this order:

1. Who gets the plugin?
2. Is it required or optional?
3. How does it authenticate?
4. Which workspace/account/environment should it target?
5. Is it read-only, limited-write, or full-write?
6. Can it touch production or sensitive data?
7. Which plugin components are enabled?
8. Are hooks and commands allowed?
9. What audits, logs, and approvals are required?
10. How are updates promoted and rolled back?

That sequence matches the actual risk profile of the current marketplace better than asking users to configure vendor-specific fields first.

## Reviewed plugin inventory

Plugins visible in the marketplace page payload during this review:

- 1Password
- Amplitude
- Atlassian
- Azure Cosmos DB
- Box
- Braintrust
- Browserbase Browse
- Browserstack
- Circle
- Cisco ThousandEyes
- Clerk
- ClickHouse
- Cloudflare
- Compound Engineering
- Context7
- Continual Learning
- Convex
- Create Plugin
- Cursor Team Kit
- Databricks
- Datadog
- AWS
- elastic-docs
- Endor Labs
- eToro
- Figma
- Firecrawl
- Firetiger
- Browserbase Functions
- GitLab
- Glean
- Grafana Labs
- Hex
- Hugging Face
- JFrog
- Langfuse
- LaunchDarkly
- Linear
- Meta Reality Labs
- Miro
- Monday.com
- Neon Postgres
- Notion
- Omni
- PagerDuty
- Parallel
- Pendo
- Phantom Connect
- Plain
- PlanetScale
- PostHog
- Postman
- Prisma
- Redis
- Render
- Runlayer
- Sanity
- Semgrep
- Sentry
- Slack
- Snowflake
- Snyk
- Stripe
- Supabase
- Superpowers
- Svelte
- Tavily
- tldraw
- Vercel
- Webflow
- Wix
- Zapier

## Recommendation

For a team marketplace or team plugin setup flow, the central admin model should be based on reusable policy groups rather than per-plugin bespoke forms. The strongest default policy stack for the current marketplace is:

- group-based distribution
- centralized secrets and auth
- explicit read/write approval tiers
- fixed workspace/account/environment targeting
- MCP runtime controls
- component-level enablement for skills/rules/commands/hooks
- audit and update governance

That model covers the repeated needs across collaboration, infrastructure, analytics, security, payments, and orchestration plugins without forcing teams to rebuild the same policy logic for every new marketplace integration.
