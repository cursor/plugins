# Prisma Cursor Plugin

A comprehensive Cursor plugin for [Prisma ORM](https://www.prisma.io/) that helps developers design database schemas, write efficient queries, manage migrations, and optimize performance.

## Features

- **Schema Design Rules** — Best practices for Prisma schema files, including model naming, relations, indexes, and database mapping.
- **Client Usage Rules** — Guidelines for using Prisma Client effectively with singleton patterns, error handling, pagination, and batch operations.
- **Schema Design Agent** — An AI agent specialized in database schema design, migration planning, query optimization, and N+1 detection.
- **Setup Skill** — Step-by-step guide for adding Prisma to a new or existing project.
- **Query Optimization Skill** — Techniques for detecting and resolving common performance issues.
- **Auto-generation Hooks** — Automatically regenerate the Prisma Client and format the schema when files change.
- **MCP Server Integration** — Database introspection and schema management via MCP.
- **Helper Script** — A CLI script for common Prisma operations (migrate, seed, reset, etc.).

## Structure

```
plugins/prisma/
├── .cursor/
│   └── plugin.json          # Plugin manifest
├── agents/
│   └── prisma-schema-agent.md  # Schema design AI agent
├── rules/
│   ├── prisma-schema.mdc    # Schema best practices
│   └── prisma-client.mdc    # Client usage best practices
├── skills/
│   ├── setup-prisma/
│   │   └── SKILL.md         # Project setup guide
│   └── optimize-prisma-queries/
│       └── SKILL.md         # Query optimization guide
├── hooks/
│   └── hooks.json           # File-change hooks
├── scripts/
│   └── prisma-setup.sh      # Setup and migration helper
├── extensions/              # Reserved for extensions
├── mcp.json                 # MCP server configuration
├── README.md                # This file
├── CHANGELOG.md             # Version history
└── LICENSE                  # MIT License
```

## Usage

### Rules

Rules are automatically applied when editing matching files:

- **`prisma-schema.mdc`** — Activates when editing `.prisma` files. Provides guidance on model naming, relations, indexes, and native types.
- **`prisma-client.mdc`** — Activates when editing `.ts` or `.js` files. Covers singleton patterns, error handling, transactions, and pagination.

### Agent

The **Prisma Schema Agent** can be invoked to help with:

- Designing new database schemas from requirements
- Adding relations, indexes, and constraints
- Planning multi-step migrations for breaking changes
- Detecting and fixing N+1 query patterns
- Optimizing queries with `EXPLAIN ANALYZE`
- Configuring connection pooling for serverless deployments

### Skills

- **Setup Prisma** — Follow the step-by-step guide to add Prisma to your project, from installation through seeding.
- **Optimize Prisma Queries** — Learn techniques for identifying and resolving query performance issues.

### Hooks

When Prisma schema files are modified, the plugin automatically:

1. Runs `npx prisma generate` to regenerate the client
2. Runs `npx prisma format` to format the schema

### Helper Script

```bash
# Make the script executable
chmod +x plugins/prisma/scripts/prisma-setup.sh

# Initialize Prisma with PostgreSQL
./scripts/prisma-setup.sh init postgresql

# Create a migration
./scripts/prisma-setup.sh migrate add_users_table

# Deploy to production
./scripts/prisma-setup.sh deploy

# Seed the database
./scripts/prisma-setup.sh seed

# Open Prisma Studio
./scripts/prisma-setup.sh studio
```

## Requirements

- Node.js v18 or later
- Prisma CLI (`npm install prisma --save-dev`)
- A supported database (PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, CockroachDB)

## License

MIT — see [LICENSE](./LICENSE) for details.
