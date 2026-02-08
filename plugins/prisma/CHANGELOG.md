# Changelog

All notable changes to the Prisma Cursor Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-07

### Added

- Initial release of the Prisma Cursor Plugin.
- `prisma-schema.mdc` rule for Prisma schema best practices (model naming, relations, indexes, native types, cascade rules, enums, timestamps).
- `prisma-client.mdc` rule for Prisma Client best practices (singleton pattern, select/include, transactions, error handling, pagination, batch operations).
- Prisma Schema Design Agent for schema design, migration planning, query optimization, and N+1 detection.
- Setup Prisma skill with step-by-step installation, schema creation, migration, seeding, and client generation workflow.
- Optimize Prisma Queries skill covering N+1 detection, query batching, raw queries, indexing strategies, and connection pooling.
- File-change hooks for auto-generating Prisma Client and formatting schema on save.
- MCP server configuration for Prisma database introspection and schema management.
- Helper shell script for common Prisma operations (init, migrate, deploy, reset, seed, studio, generate, validate, status, format).
