# Docker Plugin for Cursor

A comprehensive Cursor plugin for Docker development — write better Dockerfiles, Compose files, and containerize applications following production-grade best practices.

## Features

- **Dockerfile Best Practices** — Automatic rules for multi-stage builds, layer optimization, security hardening, and image size reduction.
- **Docker Compose Best Practices** — Rules for named volumes, health checks, networking, resource limits, and service dependencies.
- **Docker Optimization Agent** — AI agent that analyzes your Docker setup and provides actionable optimization recommendations.
- **Containerize App Skill** — Generate production-ready Dockerfiles for Node.js, Python, Go, Java, and Rust applications.
- **Docker Compose Setup Skill** — Generate complete multi-service development environments with databases, caches, and queues.
- **Lint Hooks** — Pre-commit hooks for Dockerfile linting (hadolint), Compose validation, and `:latest` tag detection.
- **Docker MCP Server** — Manage containers, images, volumes, and networks directly from Cursor.

## Directory Structure

```
plugins/docker/
├── .cursor/
│   └── plugin.json          # Plugin manifest
├── agents/
│   └── docker-optimization-agent.md   # Optimization agent
├── extensions/               # Future extensions
├── hooks/
│   └── hooks.json           # Pre-commit lint hooks
├── rules/
│   ├── dockerfile.mdc       # Dockerfile best practices
│   └── docker-compose.mdc   # Compose best practices
├── scripts/
│   └── docker-lint.sh       # Lint and validation script
├── skills/
│   ├── containerize-app/
│   │   └── SKILL.md         # Containerize an application
│   └── setup-docker-compose/
│       └── SKILL.md         # Set up Docker Compose
├── mcp.json                 # MCP server configuration
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## Installation

This plugin is loaded automatically when placed in the `plugins/docker/` directory of a Cursor-enabled workspace.

## Rules

Rules are applied automatically when editing matching files:

| Rule               | Globs                                                 | Description                          |
|--------------------|-------------------------------------------------------|--------------------------------------|
| `dockerfile.mdc`   | `Dockerfile*`, `**/*.dockerfile`, `**/Dockerfile*`   | Dockerfile writing best practices    |
| `docker-compose.mdc` | `docker-compose*.yml`, `compose*.yml`, etc.        | Docker Compose best practices        |

## Agent

The **Docker Optimization Agent** (`agents/docker-optimization-agent.md`) specializes in:

- Reducing Docker image sizes (base image selection, multi-stage builds, layer cleanup)
- Improving build times (layer ordering, BuildKit cache mounts, CI/CD caching)
- Security hardening (non-root users, secret management, vulnerability scanning)
- Runtime performance (resource limits, signal handling, logging)

## Skills

### Containerize an Application

Generates a production-ready, multi-stage Dockerfile for your project.

**Supported languages:** Node.js, Python, Go, Java, Rust, Ruby, PHP

**What you get:**
- Multi-stage Dockerfile optimized for your language/framework
- `.dockerignore` file
- Health checks and security hardening
- Build cache optimization

### Set Up Docker Compose

Generates a complete Docker Compose configuration for multi-service environments.

**Supported services:** PostgreSQL, MySQL, MongoDB, Redis, RabbitMQ, Kafka, Elasticsearch, MinIO, NATS

**What you get:**
- `compose.yaml` with all required services
- `compose.override.yaml` for development
- `.env.example` template
- Health checks, named volumes, and proper networking

## Hooks

Pre-commit hooks run automatically to catch issues early:

| Hook                   | Event        | Description                                |
|------------------------|--------------|--------------------------------------------|
| `dockerfile-lint`      | pre-commit   | Lint Dockerfiles with hadolint             |
| `compose-validate`     | pre-commit   | Validate Compose file syntax               |
| `dockerignore-check`   | pre-commit   | Ensure .dockerignore exists                |
| `no-latest-tag`        | pre-commit   | Detect `:latest` tag usage                 |
| `security-scan`        | post-build   | Vulnerability scan (disabled by default)   |

## Scripts

The `scripts/docker-lint.sh` script provides the linting backend:

```bash
# Lint a Dockerfile
./scripts/docker-lint.sh lint-dockerfile Dockerfile

# Validate a Compose file
./scripts/docker-lint.sh lint-compose compose.yaml

# Check for .dockerignore
./scripts/docker-lint.sh check-dockerignore

# Check for :latest tags
./scripts/docker-lint.sh check-no-latest Dockerfile compose.yaml

# Run security scan on built images
./scripts/docker-lint.sh security-scan
```

## MCP Server

The plugin configures the [Docker MCP server](https://github.com/docker/docker-mcp) for direct container management from Cursor, providing tools to manage containers, images, volumes, and networks.

## License

MIT — see [LICENSE](./LICENSE).
