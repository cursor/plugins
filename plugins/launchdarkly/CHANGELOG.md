# Changelog

All notable changes to the LaunchDarkly Cursor Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-08

### Added

- **Plugin manifest** (`.cursor/plugin.json`) with full metadata and component references.
- **LaunchDarkly SDK rules** (`rules/launchdarkly-sdk.mdc`) — singleton client initialization, typed variation methods (`boolVariation`, `stringVariation`, `numberVariation`, `jsonVariation`), mandatory default values, context construction with stable keys, multi-context targeting, graceful client shutdown, initialization error handling, kebab-case flag key naming convention, avoiding flag dependencies and nesting, stale flag cleanup, offline/test mode with `TestData`, React SDK provider and hooks patterns, and SDK debugging.
- **Feature flag patterns rules** (`rules/launchdarkly-patterns.mdc`) — kill switches for critical features, progressive percentage-based rollouts with phased plans, targeting rules for beta users and segments, flag-driven trunk-based development, avoiding complex logic in flag evaluations, flag prerequisites, temporary vs. permanent flag classification, flag-based A/B testing and experimentation with `client.track()`, flag evaluation events for analytics with `variationDetail()`, feature flag lifecycle management, configuration flags for runtime settings, and server-side vs. client-side flag considerations.
- **Feature Flags Agent** (`agents/launchdarkly-flags-agent.md`) — AI strategist for flag strategy design, progressive rollout planning, targeting rules and segments, experimentation and A/B testing, stale flag cleanup, and SDK integration guidance across server-side and client-side applications.
- **Setup LaunchDarkly skill** (`skills/setup-launchdarkly/SKILL.md`) — end-to-end integration guide: SDK installation (server-side, client-side, Next.js), environment variable configuration, singleton client initialization with error handling, context factory for users, organizations, and anonymous contexts, Express/Fastify endpoint usage, React `LDProvider` setup, graceful shutdown handlers, `TestData` testing configuration, Next.js SSR integration with bootstrap hydration, and verification checklist.
- **Create Feature Flag skill** (`skills/create-feature-flag/SKILL.md`) — complete flag lifecycle: planning questionnaire, dashboard creation, CLI and REST API creation, server-side and client-side implementation, targeting rules configuration, progressive rollout execution with monitoring criteria and rollback procedures, multivariate flags for experiments, JSON configuration flags, testing flagged code paths, and post-rollout cleanup (archive, code removal, dead code elimination).
- **Pre-commit hooks** (`hooks/hooks.json`) — SDK key and API token leak detection, and variation call default value linting.
- **MCP server configuration** (`mcp.json`) — LaunchDarkly MCP server with tools for listing, creating, toggling, searching, and archiving flags, managing targeting rules, evaluating flags, listing segments and environments, and viewing audit logs.
- **Flag cleanup script** (`scripts/flag-cleanup.sh`) — multi-mode hygiene utility: `--check-secrets` for credential scanning, `--check-defaults` for missing default value warnings, `--find-stale` for flag reference discovery, and `--list-flags` for codebase flag inventory with text and JSON output.
- Project documentation: `README.md`, `CHANGELOG.md`, `LICENSE`.
