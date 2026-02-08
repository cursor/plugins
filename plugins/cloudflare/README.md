# Cloudflare Plugin for Cursor

A comprehensive Cursor plugin for building and deploying applications on the **Cloudflare Developer Platform**. Provides rules, agents, skills, and tooling for Workers, Pages, R2, KV, D1, Durable Objects, Queues, and edge computing.

## Features

- **Rules** — Contextual best-practice guidance for Cloudflare Workers and wrangler.toml configuration
- **Agent** — Worker development agent for creating, debugging, and optimizing Cloudflare Workers
- **Skills** — Step-by-step guides for creating Workers and setting up D1 databases
- **Hooks** — Automated build validation and type checking on file changes and pre-push
- **MCP Server** — Integration with the Cloudflare API for managing Workers, KV, R2, D1, and Pages
- **Deploy Script** — Production-ready deployment script with preflight checks, D1 migration support, and health checks

## Directory Structure

```
plugins/cloudflare/
├── .cursor/
│   └── plugin.json                # Plugin manifest
├── agents/
│   └── cloudflare-workers-agent.md # Worker development agent
├── rules/
│   ├── cloudflare-workers.mdc     # Workers best practices
│   ├── cloudflare-d1.mdc          # D1 database best practices
│   └── cloudflare-config.mdc      # wrangler.toml configuration rules
├── skills/
│   ├── create-worker/
│   │   └── SKILL.md               # Creating a new Worker
│   └── setup-d1-database/
│       └── SKILL.md               # Setting up D1 database
├── hooks/
│   └── hooks.json                 # Git & file-change hooks
├── scripts/
│   └── deploy-worker.sh           # Deployment script
├── extensions/                    # Reserved for future extensions
├── mcp.json                       # MCP server configuration
├── README.md                      # This file
├── CHANGELOG.md                   # Release history
└── LICENSE                        # MIT License
```

## Getting Started

### Prerequisites

- [Cursor](https://cursor.com/) editor
- [Node.js](https://nodejs.org/) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm i -g wrangler`)
- A [Cloudflare](https://dash.cloudflare.com/sign-up) account

### Installation

This plugin is included in the `service-plugin-generation` repository. To use it:

1. Clone the repository or copy the `plugins/cloudflare/` directory into your project
2. The plugin's rules will automatically activate when you edit matching files:
   - `src/**/*.ts`, `src/**/*.js`, `worker*.*`, `**/workers/**` → Workers best practices
   - `**/*.sql`, `**/migrations/**`, `**/*.ts` → D1 database best practices
   - `wrangler.toml`, `wrangler.jsonc` → configuration best practices
3. Access the Worker agent for interactive help with development and deployment

### Environment Variables

Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for MCP server and CI/CD integration:

```bash
# Local development
export CLOUDFLARE_API_TOKEN="your-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"

# CI/CD — set as secrets in your provider
# GitHub Actions: Settings → Secrets → CLOUDFLARE_API_TOKEN
```

## Rules

### cloudflare-workers.mdc

Activated when editing Worker source files. Covers:

- Web Standard APIs (fetch, Request, Response, Headers, URL, crypto)
- Error handling with proper Response objects
- Choosing the right storage: KV, D1, R2, Durable Objects, Queues
- CPU time limits and performance optimization
- Background tasks with `waitUntil()`
- CORS configuration
- Environment bindings and typed `Env` interface
- Module Worker syntax (ES modules)
- Cache API for edge caching
- HTMLRewriter for streaming HTML transformation

### cloudflare-d1.mdc

Activated when editing SQL files, migrations, and TypeScript sources. Covers:

- Parameterized queries with `.bind()` — never concatenate strings
- Batch operations with `db.batch()` for transactions and performance
- D1 error handling (constraint violations, missing records)
- Migration workflow with Wrangler (`create`, `apply --local`, `apply --remote`)
- Query optimization for the edge (LIMIT, SELECT specific columns, indexes)
- D1 consistency model (strong consistency, single-region writes, read replication)
- SQLite-compatible data types (TEXT keys, INTEGER booleans, datetime as TEXT)
- Prepared statements (`.first()`, `.all()`, `.run()`, `.raw()`)
- Pagination patterns (offset-based and cursor-based)

### cloudflare-config.mdc

Activated when editing `wrangler.toml` or `wrangler.jsonc`. Covers:

- Compatibility date and flags
- KV, R2, D1, Durable Object, and Queue bindings
- Routes and custom domains
- Environment-specific configuration (staging/production)
- Cron triggers
- Secrets management
- Smart Placement and observability
- Build configuration and static assets

## Agent

The **Cloudflare Worker Agent** helps with:

- Creating new Workers with proper project structure and TypeScript types
- Debugging Worker errors using `wrangler tail` and log analysis
- Optimizing performance (CPU time, caching, Smart Placement)
- Choosing between Workers, Pages Functions, and Durable Objects
- Configuring bindings for KV, R2, D1, Durable Objects, and Queues
- Setting up D1 databases with migrations and query patterns
- Implementing real-time features with Durable Objects and WebSockets

## Skills

### Create a Worker

Complete walkthrough for building a new Worker:

1. Install Wrangler CLI and authenticate
2. Scaffold a new project
3. Configure `wrangler.toml` with bindings
4. Write Worker code with typed environment
5. Local development with `wrangler dev`
6. Write tests with Vitest
7. Deploy and set up custom domains
8. CI/CD with GitHub Actions

### Set Up D1 Database

Guide for Cloudflare D1 (serverless SQLite):

1. Create a D1 database
2. Write and apply migrations
3. Design schemas with proper types and indexes
4. Query from Workers with parameterized statements
5. Use `.batch()` for transactions
6. Seed development data
7. Deploy migrations to production

## Deploy Script

The included `scripts/deploy-worker.sh` provides:

```bash
./scripts/deploy-worker.sh                          # Deploy to default environment
./scripts/deploy-worker.sh --env production          # Deploy to production
./scripts/deploy-worker.sh --env staging --migrate   # Deploy with D1 migrations
./scripts/deploy-worker.sh --dry-run                 # Validate build only
./scripts/deploy-worker.sh --tail                    # Stream logs after deploy
./scripts/deploy-worker.sh --help                    # Show all options
```

Features: TypeScript validation, D1 migration support, post-deploy health checks, live log tailing, CI/CD compatibility.

## License

MIT — see [LICENSE](./LICENSE) for details.
