# Changelog

All notable changes to the Twilio plugin for Cursor will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-08

### Added

- **Plugin manifest** (`.cursor/plugin.json`) with full metadata and configuration paths.
- **Rules**:
  - `twilio-integration.mdc` — Best practices for Twilio SDK usage, credential management via environment variables, E.164 phone number formatting, Lookup API validation, Messaging Services for scale, error handling with Twilio error codes, rate limiting with exponential backoff, delivery status callbacks, TwiML builders for voice/messaging, and environment variable validation.
  - `twilio-webhooks.mdc` — Best practices for webhook request signature validation using `twilio.webhook()` middleware, TwiML responses, 15-second response timeout, status callbacks for message delivery and call progress, idempotent webhook processing, ngrok for local development, and Next.js webhook handlers.
- **Agent**:
  - `twilio-communications-agent.md` — AI agent for guiding developers through Twilio product selection (SMS, Voice, WhatsApp, Verify, SendGrid), Messaging Service configuration, A2P 10DLC compliance, IVR design patterns, cost optimization, and multi-channel communications architecture.
- **Skills**:
  - `setup-sms/SKILL.md` — Step-by-step guide for implementing SMS messaging with Twilio, including SDK setup, sending/receiving messages, Messaging Services, delivery tracking, error handling with retry logic, and local testing with ngrok.
  - `setup-verify/SKILL.md` — Step-by-step guide for implementing phone verification with Twilio Verify, including service creation, send/check API endpoints, frontend verification flow, multi-channel fallback, and error handling.
- **Hooks**:
  - Pre-commit hook to detect and block Twilio Auth Tokens and API Key Secrets from being committed.
- **Scripts**:
  - `check-twilio-credentials.sh` — Shell script for scanning staged files for Twilio credentials.
- **MCP Server**:
  - `mcp.json` — Configuration for the Twilio MCP server for direct API interaction from Cursor.
- **Documentation**:
  - `README.md` — Plugin overview, structure, setup instructions, and resources.
  - `CHANGELOG.md` — This changelog.
  - `LICENSE` — MIT license.
