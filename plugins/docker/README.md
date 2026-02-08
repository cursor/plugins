# Docker Cursor Plugin

A comprehensive Cursor plugin for Docker development — helping you write better Dockerfiles, Docker Compose files, and follow container best practices.

## Features

| Feature | Description |
|---------|-------------|
| **Dockerfile Rules** | Best practices for multi-stage builds, layer optimization, security, and more |
| **Compose Rules** | Guidelines for volumes, networks, healthchecks, and service configuration |
| **Optimization Agent** | AI agent specialized in Docker image optimization and security hardening |
| **Dockerfile Skill** | Language-specific Dockerfile templates (Node.js, Python, Go, Java, Rust) |
| **Compose Skill** | Complete development environment setup with hot-reload and databases |
| **Pre-commit Hooks** | Automated Dockerfile linting and Compose validation |
| **MCP Integration** | Docker operations directly from Cursor via MCP server |

## Project Structure

```
plugins/docker/
├── .cursor/
│   └── plugin.json          # Plugin manifest
├── agents/
│   └── docker-optimization-agent.md  # Optimization AI agent
├── rules/
│   ├── dockerfile-best-practices.mdc # Dockerfile rules
│   └── docker-compose.mdc            # Compose rules
├── skills/
│   ├── create-dockerfile/
│   │   └── SKILL.md          # Dockerfile creation skill
│   └── setup-docker-compose/
│       └── SKILL.md          # Compose setup skill
├── hooks/
│   └── hooks.json            # Pre-commit hook definitions
├── scripts/
│   └── lint-dockerfile.sh    # Hadolint wrapper script
├── extensions/               # Extension directory (reserved)
├── mcp.json                  # MCP server configuration
├── README.md                 # This file
├── CHANGELOG.md              # Version history
└── LICENSE                   # MIT License
```

## Rules

### Dockerfile Best Practices (`rules/dockerfile-best-practices.mdc`)

Automatically applied when editing `Dockerfile*`, `*.dockerfile`, or `.dockerignore` files:

- Use multi-stage builds to minimize final image size
- Pin base image versions with digests for reproducibility
- Run containers as non-root users
- Minimize layers and order instructions by change frequency
- Use `.dockerignore` to reduce build context
- Prefer `COPY` over `ADD`
- Define `HEALTHCHECK` instructions
- Clean up package manager caches in the same layer

### Docker Compose Best Practices (`rules/docker-compose.mdc`)

Automatically applied when editing `docker-compose*.yml`, `compose*.yml`, and related files:

- Use named volumes for data persistence
- Define networks explicitly with proper isolation
- Set resource limits (CPU, memory)
- Configure healthchecks and dependency conditions
- Use environment files for secrets
- Pin image versions
- Use profiles for optional services

## Agent

### Docker Optimization Agent

An AI agent that helps with:

- **Image optimization**: Reduce image sizes, choose appropriate base images
- **Build performance**: Layer caching strategies, BuildKit features
- **Security hardening**: Non-root users, vulnerability scanning, secrets management

## Skills

### Create Dockerfile

Generates production-ready Dockerfiles with:

- Language-specific templates (Node.js, Python, Go, Java, Rust)
- Multi-stage builds
- Security hardening
- Proper `.dockerignore` configuration

### Setup Docker Compose

Creates complete development environments with:

- Hot-reload configuration
- Database services (PostgreSQL, Redis)
- Network isolation
- Health checks and dependency management
- Optional monitoring (Prometheus, Grafana)
- Production override files

## Hooks

Pre-commit hooks that run automatically:

| Hook | Description |
|------|-------------|
| `lint-dockerfile` | Runs Hadolint on modified Dockerfiles |
| `validate-compose` | Validates Docker Compose file syntax |
| `check-dockerignore` | Warns if `.dockerignore` is missing |
| `scan-dockerfile-secrets` | Checks for hardcoded secrets |

## MCP Server

The plugin integrates with the Docker MCP server for direct container operations:

- List, inspect, start, and stop containers
- Build and manage images
- Docker Compose lifecycle management
- Execute commands inside running containers

## Scripts

### `scripts/lint-dockerfile.sh`

A wrapper script for Hadolint that:

- Auto-detects Hadolint installation (native or Docker)
- Finds and lints all Dockerfiles in the project
- Provides colored output with pass/fail status
- Supports custom Hadolint versions via `HADOLINT_VERSION` env var

```bash
# Lint all Dockerfiles
./scripts/lint-dockerfile.sh

# Lint specific files
./scripts/lint-dockerfile.sh Dockerfile Dockerfile.prod
```

## Installation

This plugin is automatically activated when working in a project that uses Docker. The rules are applied based on file glob patterns.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- [Hadolint](https://github.com/hadolint/hadolint) (optional, for linting hooks)

## License

MIT License — see [LICENSE](./LICENSE) for details.
