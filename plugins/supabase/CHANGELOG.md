# Changelog

All notable changes to the Supabase Cursor plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-07

### Added

- **Plugin manifest** (`.cursor/plugin.json`) — plugin metadata, entry points, and configuration.
- **Rules**
  - `supabase-client.mdc` — best practices for Supabase client usage in TypeScript/JavaScript projects, including typed clients, RLS, auth state handling, error handling, realtime subscriptions, storage, and connection pooling.
  - `supabase-migrations.mdc` — best practices for database migrations, including RLS enforcement, proper indexes, foreign keys, reversible migrations, column types, comments, triggers, and multi-environment workflows.
- **Agents**
  - `supabase-schema-agent.md` — AI agent for Postgres schema design, RLS policy creation, index optimization, query optimization, migration writing, and relationship design.
- **Skills**
  - `setup-supabase-auth/SKILL.md` — step-by-step guide for setting up Supabase authentication with email/password, OAuth, magic links, middleware, auth state listeners, and RLS policies.
  - `create-migration/SKILL.md` — step-by-step guide for creating database migrations with the Supabase CLI, writing SQL, applying locally and remotely, and generating TypeScript types.
- **Hooks** (`hooks/hooks.json`) — file-save hooks for automatic TypeScript type generation, SQL linting, RLS enforcement warnings, and SQL formatting.
- **MCP Server** (`mcp.json`) — configuration for the Supabase MCP server enabling direct project management and database interaction.
- **Scripts** (`scripts/generate-types.sh`) — shell script for generating TypeScript types from local or remote Supabase databases.
- **Documentation** — README, CHANGELOG, and MIT LICENSE.
