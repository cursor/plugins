# Changelog

All notable changes to the Cloudflare plugin for Cursor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-07

### Added

- **Plugin manifest** (`.cursor/plugin.json`) — plugin metadata, entry points, and configuration
- **Rules**
  - `cloudflare-workers.mdc` — best practices for Cloudflare Workers including Web Standard APIs, error handling, storage selection (KV, D1, R2, Durable Objects, Queues), CPU time limits, `waitUntil()`, CORS, environment bindings, and module Worker syntax
  - `cloudflare-config.mdc` — configuration best practices for `wrangler.toml` and `wrangler.jsonc`, covering compatibility date, bindings (KV, R2, D1, Durable Objects, Queues), routes, environments, cron triggers, secrets management, Smart Placement, and observability
- **Agent**
  - `cloudflare-worker-agent.md` — Worker development agent for creating, debugging, and optimizing Cloudflare Workers, with guidance on architecture patterns and storage selection
- **Skills**
  - `create-worker/SKILL.md` — step-by-step guide for creating a new Cloudflare Worker from project setup through deployment with bindings, local development, testing, custom domains, and CI/CD
  - `setup-d1-database/SKILL.md` — comprehensive guide for setting up a D1 database with migrations, schema design, parameterized queries, batch transactions, seeding, and production deployment
- **Hooks** (`hooks/hooks.json`) — automated build validation on pre-commit/pre-push, wrangler.toml change detection, and TypeScript type checking on source file changes
- **MCP Server** (`mcp.json`) — Cloudflare MCP server configuration for managing Workers, KV namespaces, R2 buckets, D1 databases, and Pages projects
- **Deploy Script** (`scripts/deploy-worker.sh`) — production-ready deployment script with TypeScript validation, D1 migration support, environment selection, health checks, live log tailing, and CI/CD compatibility
- **Documentation** — `README.md` with full plugin overview, directory structure, and usage guide
- **License** — MIT license (Cursor, 2026)
