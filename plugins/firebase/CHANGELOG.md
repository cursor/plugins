# Changelog

All notable changes to the Firebase Cursor Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-08

### Added

- Firestore best practices rule (`rules/firestore.mdc`) covering data modeling, batch writes, transactions, indexes, pagination, timestamps, converters, offline persistence, and cost optimization.
- Firebase security rules guide (`rules/firebase-security-rules.mdc`) covering authentication, data validation, custom claims, RBAC, helper functions, Storage rules, and emulator testing.
- Firebase Architect Agent (`agents/firebase-architect-agent.md`) for schema design, Cloud Functions architecture, security rules, authentication strategy, cost optimization, and scaling guidance.
- Setup Firebase skill (`skills/setup-firebase/SKILL.md`) with CLI installation, project initialization, emulator configuration, SDK setup, and deployment steps.
- Design Firestore Schema skill (`skills/design-firestore-schema/SKILL.md`) with data modeling patterns, denormalization, security rules, composite indexes, and typed data access layer.
- Hooks configuration (`hooks/hooks.json`) for validating security rules on save, linting Cloud Functions, running rule tests on commit, and deploying on deploy events.
- MCP server configuration (`mcp.json`) for Firebase integration.
- Deployment script (`scripts/deploy-firebase.sh`) with target selection and prerequisite validation.
- Plugin manifest (`.cursor/plugin.json`).
- README, CHANGELOG, and MIT LICENSE.
