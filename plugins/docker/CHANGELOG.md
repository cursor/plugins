# Changelog

All notable changes to the Docker plugin for Cursor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-08

### Added

- **Plugin manifest** (`.cursor/plugin.json`) with full metadata and file references.
- **Dockerfile best practices rule** (`rules/dockerfile.mdc`) covering multi-stage builds, layer optimization, security, health checks, base image pinning, and `.dockerignore`.
- **Docker Compose best practices rule** (`rules/docker-compose.mdc`) covering named volumes, resource limits, health checks, `depends_on` conditions, environment management, networking, and profiles.
- **Docker Optimization Agent** (`agents/docker-optimization-agent.md`) for analyzing and improving Docker setups — image size reduction, build speed, security hardening, and runtime performance.
- **Containerize App skill** (`skills/containerize-app/SKILL.md`) with production-ready Dockerfile templates for Node.js, Next.js, Python, Go, Java (Spring Boot), and Rust.
- **Setup Docker Compose skill** (`skills/setup-docker-compose/SKILL.md`) for generating multi-service development environments with databases, caches, message queues, and dev tools.
- **Lint hooks** (`hooks/hooks.json`) for pre-commit Dockerfile linting, Compose validation, `.dockerignore` verification, and `:latest` tag detection.
- **Docker lint script** (`scripts/docker-lint.sh`) providing hadolint integration, basic Dockerfile checks, Compose validation, and vulnerability scanning.
- **MCP server configuration** (`mcp.json`) for the Docker MCP server.
- **README** with full documentation of all plugin features.
- **MIT License** (Cursor, 2026).
