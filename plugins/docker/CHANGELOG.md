# Changelog

All notable changes to the Docker Cursor plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-07

### Added

- Initial release of the Docker Cursor plugin.
- **Rules**: Dockerfile best practices (`rules/dockerfile-best-practices.mdc`).
- **Rules**: Docker Compose best practices (`rules/docker-compose.mdc`).
- **Agent**: Docker optimization agent for image size reduction, build performance, and security hardening.
- **Skill**: Create optimized Dockerfiles with language-specific templates (Node.js, Python, Go, Java, Rust).
- **Skill**: Set up Docker Compose environments with hot-reload, databases, caching, and monitoring.
- **Hooks**: Pre-commit hooks for Dockerfile linting (Hadolint) and Compose validation.
- **MCP Server**: Docker MCP server integration for container and image management.
- **Scripts**: Hadolint wrapper script for Dockerfile linting.
