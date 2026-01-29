# Stripe Integration Skill

A skill for performing common Stripe payment integration tasks.

## When to Use

Use this skill when the user asks to:
- Set up Stripe payments in their application
- Create customers, products, or subscriptions
- Process payments or refunds
- Generate payment links
- Troubleshoot Stripe integration issues

## Instructions

When this skill is activated:

1. **Verify Configuration** - Ensure STRIPE_SECRET_KEY is available
2. **Identify the Task** - Determine what Stripe operation is needed
3. **Execute via MCP** - Use the Stripe MCP tools to perform operations
4. **Confirm Results** - Report the outcome with relevant IDs
5. **Suggest Next Steps** - Recommend follow-up actions

## Common Workflows

### Quick Payment Setup

Create a complete payment flow:

1. Create a product: `stripe_create_product`
2. Create a price: `stripe_create_price`
3. Create a payment link: `stripe_create_payment_link`
4. Share the payment link with the user

### Customer Onboarding

Set up a new customer:

1. Create customer: `stripe_create_customer`
2. Optionally attach payment method
3. Return customer ID for future reference

### Subscription Setup

Create a subscription:

1. Ensure customer exists
2. Ensure product and recurring price exist
3. Create subscription: `stripe_create_subscription`
4. Handle initial payment if required

### Process Refund

Issue a refund:

1. Retrieve the payment intent or charge
2. Create refund: `stripe_create_refund`
3. Confirm refund status

## Available Stripe MCP Tools

- `stripe_create_customer` - Create a new customer
- `stripe_list_customers` - List existing customers
- `stripe_create_product` - Create a product
- `stripe_list_products` - List products
- `stripe_create_price` - Create a price for a product
- `stripe_list_prices` - List prices
- `stripe_create_payment_intent` - Create a payment intent
- `stripe_create_payment_link` - Generate a payment link
- `stripe_create_subscription` - Create a subscription
- `stripe_create_invoice` - Create an invoice
- `stripe_create_refund` - Process a refund
- `stripe_retrieve_balance` - Get account balance

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|:------|:------|:---------|
| `invalid_api_key` | Bad or missing API key | Check STRIPE_SECRET_KEY |
| `resource_missing` | Referenced ID doesn't exist | Verify the resource ID |
| `card_declined` | Payment method failed | Use test card or check card |
| `rate_limit` | Too many requests | Add delays between calls |

## Test Card Numbers

For testing payments:

| Card Number | Scenario |
|:------------|:---------|
| `4242424242424242` | Successful payment |
| `4000000000000002` | Card declined |
| `4000000000009995` | Insufficient funds |
| `4000000000000077` | Successful charge, refund fails |

Use any future expiry date and any 3-digit CVC.

## Notes

- Always confirm the environment (test vs live) before operations
- Test mode operations don't affect real money
- Keep customer and product IDs for reference in your application
- Webhook integration is recommended for production systems
