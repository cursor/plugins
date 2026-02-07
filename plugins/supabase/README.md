# Supabase Plugin for Cursor

A comprehensive Cursor plugin for building with [Supabase](https://supabase.com) — the open-source Firebase alternative providing a Postgres database, authentication, instant APIs, edge functions, realtime subscriptions, and storage.

## Features

This plugin provides intelligent assistance for Supabase development:

- **Rules** — Automatic best-practice enforcement for Supabase client usage and database migrations
- **Agent** — AI-powered schema design agent for Postgres databases, RLS policies, and query optimization
- **Skills** — Step-by-step guides for common Supabase tasks (auth setup, migrations)
- **Hooks** — Automated type generation and SQL linting on file save
- **MCP Server** — Direct integration with Supabase services via the Model Context Protocol

## Contents

```
plugins/supabase/
├── .cursor/
│   └── plugin.json              # Plugin manifest
├── agents/
│   └── supabase-schema-agent.md # Database schema design agent
├── rules/
│   ├── supabase-client.mdc      # Client-side best practices
│   └── supabase-migrations.mdc  # Migration best practices
├── skills/
│   ├── setup-supabase-auth/
│   │   └── SKILL.md             # Auth setup walkthrough
│   └── create-migration/
│       └── SKILL.md             # Migration creation walkthrough
├── hooks/
│   └── hooks.json               # File-save hooks for automation
├── scripts/
│   └── generate-types.sh        # TypeScript type generation script
├── extensions/                   # Plugin extensions (reserved)
├── mcp.json                     # MCP server configuration
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Getting Started

### Prerequisites

- [Cursor](https://cursor.com) editor
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)
- A Supabase project (local or hosted)

### Installation

This plugin is automatically loaded when present in your workspace's `plugins/` directory.

### MCP Server Setup

To enable the Supabase MCP server for direct database interaction:

1. Generate an access token at [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Set the `SUPABASE_ACCESS_TOKEN` environment variable in your Cursor settings or shell profile
3. The MCP server will start automatically when Cursor detects the `mcp.json` configuration

### Type Generation

Generate TypeScript types from your database schema:

```bash
# From local database
./plugins/supabase/scripts/generate-types.sh

# From remote database
./plugins/supabase/scripts/generate-types.sh remote
```

Types are generated to `src/types/supabase.ts` by default. Override with the `SUPABASE_TYPES_OUTPUT` environment variable.

## Rules

### `supabase-client.mdc`

Enforced on `*.ts`, `*.tsx`, `*.js`, `*.jsx` files. Key rules:

- Use typed clients with generated Database types
- Use `createServerClient` for server-side, `createBrowserClient` for client-side
- Always check `{ data, error }` from every query
- Use `.single()` for single-row queries
- Use `.select()` to limit returned columns
- Never expose the service role key on the client
- Handle auth state changes and clean up subscriptions
- Use connection pooling in serverless environments

### `supabase-migrations.mdc`

Enforced on `supabase/migrations/**/*.sql` and `*.sql` files. Key rules:

- Always use migration files, never manual changes
- Enable RLS on every new table
- Create indexes on foreign key columns
- Use proper column types (`TIMESTAMPTZ`, `UUID`, `TEXT`, `JSONB`)
- Write reversible migrations
- Add comments to tables and columns

## Agent

### Schema Design Agent

The `supabase-schema-agent` helps with:

- Designing normalized Postgres schemas
- Writing Row Level Security policies
- Creating and optimizing indexes
- Designing table relationships
- Writing database migrations
- Optimizing slow queries with EXPLAIN ANALYZE
- Creating Postgres functions and triggers

## Skills

### Setup Supabase Auth

Complete guide for implementing authentication:

- Email/password, OAuth providers, magic links
- Server and browser client configuration
- Middleware for token refresh
- Auth state management
- RLS policies for user data

### Create Migration

Step-by-step migration workflow:

- Creating migration files with Supabase CLI
- Writing SQL with RLS, indexes, and constraints
- Applying locally and to remote
- Schema drift detection
- TypeScript type regeneration

## License

MIT — see [LICENSE](./LICENSE) for details.
