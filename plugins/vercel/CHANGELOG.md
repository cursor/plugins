# Changelog

All notable changes to the Vercel plugin for Cursor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-07

### Added

- **Plugin manifest** (`.cursor/plugin.json`) — plugin metadata, entry points, and configuration
- **Rules**
  - `vercel-functions.mdc` — best practices for Vercel serverless and edge functions, including runtime selection, timeouts, cold start mitigation, streaming, CORS, environment variables, error handling, and Vercel storage integration
  - `vercel-config.mdc` — configuration best practices for `vercel.json` and `next.config.*`, covering rewrites, redirects, security headers, build settings, framework presets, function regions, cron jobs, and deployment protection
- **Agent**
  - `vercel-deployment-agent.md` — deployment optimization agent for diagnosing build failures, optimizing performance, configuring preview/production deployments, and managing domains
- **Skills**
  - `deploy-to-vercel/SKILL.md` — step-by-step guide for deploying projects to Vercel from CLI setup through production deployment with custom domains and CI/CD
  - `setup-edge-functions/SKILL.md` — comprehensive guide for creating Edge Functions, including runtime comparison, middleware, streaming, authentication, Edge Config, and troubleshooting
- **Hooks** (`hooks/hooks.json`) — automated build validation on pre-commit/pre-push and type checking on API route file changes
- **MCP Server** (`mcp.json`) — Vercel MCP server configuration for managing deployments, environment variables, domains, and project settings
- **Deploy Script** (`scripts/deploy.sh`) — production-ready deployment script with framework detection, preflight checks, TypeScript validation, health checks, and CI/CD support
- **Documentation** — `README.md` with full plugin overview, directory structure, and usage guide
- **License** — MIT license (Cursor, 2026)
