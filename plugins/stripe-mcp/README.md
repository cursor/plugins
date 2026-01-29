# Stripe MCP Plugin

Stripe MCP integration for Cursor, enabling AI-powered payment workflows using the [Stripe Agent Toolkit](https://docs.stripe.com/mcp).

## Installation

```bash
agent install stripe-mcp
```

## Prerequisites

1. **Stripe Account** - Sign up at [stripe.com](https://stripe.com)
2. **API Key** - Get your secret key from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

## Configuration

Set your Stripe secret key as an environment variable:

```bash
export STRIPE_SECRET_KEY="sk_test_..."
```

Or add it to your `.env` file:

```
STRIPE_SECRET_KEY=sk_test_...
```

> **Security Note**: Use test mode keys (`sk_test_...`) during development. Never commit secret keys to version control.

## Available Tools

The Stripe MCP server provides tools for:

| Category | Tools |
|:---------|:------|
| **Customers** | Create, retrieve, update, list customers |
| **Products** | Create, retrieve, update products and prices |
| **Payments** | Create payment intents, confirm payments |
| **Subscriptions** | Create, update, cancel subscriptions |
| **Invoices** | Create, retrieve, finalize invoices |
| **Balance** | Retrieve account balance and transactions |
| **Refunds** | Create and retrieve refunds |
| **Payment Links** | Create payment links for quick checkout |

## Usage Examples

### Create a Customer

```
"Create a new Stripe customer with email user@example.com"
```

### Create a Product with Price

```
"Create a product called 'Pro Plan' with a monthly price of $29"
```

### Create a Subscription

```
"Subscribe customer cus_xxx to the Pro Plan"
```

### Create a Payment Link

```
"Create a payment link for the Pro Plan product"
```

## Tool Configuration

By default, all tools are enabled. You can restrict available tools by modifying `mcp.json`:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp", "--tools=customers,products,prices"],
      "env": {
        "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}"
      }
    }
  }
}
```

### Available Tool Groups

- `customers` - Customer management
- `products` - Product catalog
- `prices` - Pricing configuration
- `payment_intents` - Payment processing
- `subscriptions` - Recurring billing
- `invoices` - Invoice management
- `balance` - Account balance
- `refunds` - Refund processing
- `payment_links` - Payment link generation
- `all` - Enable all tools (default)

## Test Mode vs Live Mode

| Key Prefix | Mode | Use Case |
|:-----------|:-----|:---------|
| `sk_test_` | Test | Development and testing |
| `sk_live_` | Live | Production |

Always use test mode keys during development. Test mode provides:
- No real charges processed
- Test card numbers for simulation
- Separate test data environment

## Troubleshooting

### "Invalid API Key" Error

Ensure your `STRIPE_SECRET_KEY` environment variable is set correctly:

```bash
echo $STRIPE_SECRET_KEY
```

### "Permission Denied" Error

Verify your API key has the required permissions in the Stripe Dashboard.

### Rate Limiting

The Stripe API has rate limits. If you encounter rate limiting, reduce the frequency of requests.

## Resources

- [Stripe MCP Documentation](https://docs.stripe.com/mcp)
- [Stripe Agent Toolkit](https://github.com/stripe/agent-toolkit)
- [Stripe API Reference](https://docs.stripe.com/api)
- [Stripe Dashboard](https://dashboard.stripe.com)

## License

MIT
