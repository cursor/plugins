# Twilio Plugin for Cursor

A comprehensive Cursor plugin for integrating Twilio's communications APIs. Provides rules, agents, skills, hooks, and MCP server configuration to help developers build SMS messaging, voice applications, WhatsApp integrations, phone verification, and more with Twilio.

## Features

- **Rules** — Enforced best practices for Twilio SDK usage and webhook handling
- **Agent** — AI-powered assistant for designing messaging flows, voice apps, and verification systems
- **Skills** — Step-by-step guides for setting up SMS messaging and phone verification
- **Hooks** — Pre-commit hook to prevent committing Twilio credentials
- **MCP Server** — Direct Twilio API interaction from within Cursor

## Plugin Structure

```
plugins/twilio/
├── .cursor/
│   └── plugin.json                # Plugin manifest
├── agents/
│   └── twilio-communications-agent.md  # Communications agent
├── extensions/                    # Reserved for future extensions
├── hooks/
│   └── hooks.json                 # Hook definitions
├── rules/
│   ├── twilio-integration.mdc    # Integration best practices
│   └── twilio-webhooks.mdc       # Webhook best practices
├── scripts/
│   └── check-twilio-credentials.sh  # Credential detection script
├── skills/
│   ├── setup-sms/
│   │   └── SKILL.md               # SMS messaging setup guide
│   └── setup-verify/
│       └── SKILL.md               # Phone verification setup guide
├── mcp.json                       # MCP server configuration
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites

- A [Twilio account](https://www.twilio.com/try-twilio) (free trial works for testing)
- Node.js 18+
- A Twilio phone number with SMS/Voice capability
- [ngrok](https://ngrok.com/) for local webhook testing

### Environment Variables

Add the following to your project's `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15017122661
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Find your credentials at the [Twilio Console](https://console.twilio.com).

### Using the MCP Server

The plugin includes configuration for the Twilio MCP server, which allows Cursor to interact with Twilio APIs directly. Make sure your `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` environment variables are set.

### Rules

The plugin enforces best practices automatically:

- **twilio-integration** — Applied to all `.ts` and `.js` files. Covers credential management, E.164 phone formatting, error handling, rate limiting, TwiML builders, Messaging Services, and delivery callbacks.
- **twilio-webhooks** — Applied to webhook and Twilio-related files. Covers signature validation, TwiML responses, status callbacks, idempotent processing, and 15-second timeout compliance.

### Agent

Ask the Twilio Communications Agent for help with:

- Setting up SMS, MMS, and WhatsApp messaging
- Building IVR systems and voice applications
- Implementing phone verification with Twilio Verify
- Choosing between Twilio products (Messaging vs. Verify vs. Conversations)
- A2P 10DLC compliance for US messaging
- Optimizing messaging costs

### Skills

Follow the step-by-step skills to set up:

1. **SMS Messaging** — Send and receive SMS/MMS messages with Twilio Programmable Messaging, including Messaging Services, webhooks, and delivery tracking
2. **Phone Verification** — Implement OTP-based phone verification with Twilio Verify, including multi-channel fallback and fraud protection

### Pre-Commit Hook

The pre-commit hook scans staged files for Twilio Auth Tokens and API Key Secrets and blocks the commit if any are found. Account SIDs are allowed since they are not secret.

To set up the hook:

```bash
chmod +x plugins/twilio/scripts/check-twilio-credentials.sh
```

## Resources

- [Twilio Documentation](https://www.twilio.com/docs)
- [Twilio API Reference](https://www.twilio.com/docs/api)
- [Twilio Console](https://console.twilio.com)
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli/quickstart)
- [Twilio Helper Libraries](https://www.twilio.com/docs/libraries)
- [Twilio Code Exchange (Sample Apps)](https://www.twilio.com/code-exchange)

## License

MIT License — see [LICENSE](./LICENSE) for details.
