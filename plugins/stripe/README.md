# Stripe Plugin for Cursor

A comprehensive Cursor plugin for integrating Stripe's payment processing APIs. Provides rules, agents, skills, hooks, and MCP server configuration to help developers build payment flows, subscriptions, webhooks, and billing systems with Stripe.

## Features

- **Rules** — Enforced best practices for Stripe integration and webhook handling
- **Agent** — AI-powered assistant for implementing payments, subscriptions, and billing
- **Skills** — Step-by-step guides for setting up Checkout and webhooks
- **Hooks** — Pre-commit hook to prevent committing live Stripe keys
- **MCP Server** — Direct Stripe API interaction from within Cursor

## Plugin Structure

```
plugins/stripe/
├── .cursor/
│   └── plugin.json          # Plugin manifest
├── agents/
│   └── stripe-integration-agent.md  # Stripe integration agent
├── extensions/               # Reserved for future extensions
├── hooks/
│   └── hooks.json            # Hook definitions
├── rules/
│   ├── stripe-integration.mdc  # Integration best practices
│   └── stripe-webhooks.mdc     # Webhook best practices
├── scripts/
│   └── check-stripe-keys.sh    # Live key detection script
├── skills/
│   ├── setup-stripe-checkout/
│   │   └── SKILL.md            # Stripe Checkout setup guide
│   └── setup-stripe-webhooks/
│       └── SKILL.md            # Webhook endpoint setup guide
├── mcp.json                  # MCP server configuration
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## Getting Started

### Prerequisites

- A [Stripe account](https://dashboard.stripe.com/register) (test mode is fine)
- Node.js 18+
- The [Stripe CLI](https://stripe.com/docs/stripe-cli) (for local webhook testing)

### Environment Variables

Add the following to your project's `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Using the MCP Server

The plugin includes configuration for the Stripe MCP server, which allows Cursor to interact with Stripe APIs directly. Make sure your `STRIPE_SECRET_KEY` environment variable is set.

### Rules

The plugin enforces best practices automatically:

- **stripe-integration** — Applied to all `.ts`, `.js`, `.tsx`, `.jsx` files. Covers SDK usage, error handling, idempotency, PCI compliance, and more.
- **stripe-webhooks** — Applied to webhook and Stripe-related files. Covers signature verification, event handling, and retry logic.

### Agent

Ask the Stripe Integration Agent for help with:

- Setting up payments (one-time or recurring)
- Choosing between Checkout, Elements, and custom flows
- Implementing subscription billing, trials, and metered usage
- Handling webhooks and event processing
- Managing customers, invoices, and the billing portal

### Skills

Follow the step-by-step skills to set up:

1. **Stripe Checkout** — Add a hosted payment page with support for one-time and subscription payments
2. **Stripe Webhooks** — Create a webhook endpoint with signature verification, idempotent processing, and local testing

### Pre-Commit Hook

The pre-commit hook scans staged files for live Stripe keys (`sk_live_*`, `rk_live_*`, `whsec_*`) and blocks the commit if any are found. Test keys are allowed.

To set up the hook:

```bash
chmod +x plugins/stripe/scripts/check-stripe-keys.sh
```

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Testing](https://stripe.com/docs/testing)

## License

MIT License — see [LICENSE](./LICENSE) for details.
