# Changelog

All notable changes to the Stripe plugin for Cursor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-07

### Added

- **Plugin manifest** (`.cursor/plugin.json`) with full metadata and configuration paths.
- **Rules**:
  - `stripe-integration.mdc` — Best practices for Stripe SDK usage, error handling, idempotency keys, PCI compliance, expand parameters, retry logic, and environment variable naming.
  - `stripe-webhooks.mdc` — Best practices for webhook signature verification, idempotent event processing, async handling, critical event coverage, logging, and local testing with the Stripe CLI.
- **Agent**:
  - `stripe-integration-agent.md` — AI agent for guiding developers through payment flows, subscription billing, Checkout vs Elements, pricing models, coupons, trials, metered billing, invoicing, and the customer portal.
- **Skills**:
  - `setup-stripe-checkout/SKILL.md` — Step-by-step guide for implementing Stripe Checkout with one-time and subscription payments, including webhook handling and testing.
  - `setup-stripe-webhooks/SKILL.md` — Step-by-step guide for creating webhook endpoints with signature verification, idempotent processing, event handlers, and Stripe CLI testing.
- **Hooks**:
  - Pre-commit hook to detect and block live Stripe keys (`sk_live_*`, `rk_live_*`, `whsec_*`) from being committed.
- **Scripts**:
  - `check-stripe-keys.sh` — Shell script for scanning staged files for live Stripe keys.
- **MCP Server**:
  - `mcp.json` — Configuration for the Stripe MCP server (`@stripe/mcp`) for direct API interaction from Cursor.
- **Documentation**:
  - `README.md` — Plugin overview, structure, setup instructions, and resources.
  - `CHANGELOG.md` — This changelog.
  - `LICENSE` — MIT license.
