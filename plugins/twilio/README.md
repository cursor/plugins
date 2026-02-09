# Twilio Plugin

Cursor plugin for Twilio — SMS, Voice, WhatsApp, Verify, and communications APIs.

## Installation

```bash
agent install twilio
```

## Components

### Skills

| Skill | Description |
|:------|:------------|
| `setup-sms` | Send and receive SMS/MMS with webhook handlers and delivery tracking |
| `setup-verify` | Phone verification with Twilio Verify, multi-channel fallback, and error handling |

### MCP Server

Provides Twilio API access via `@anthropic/twilio-mcp-server`.

Requires `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` environment variables.

## License

MIT
