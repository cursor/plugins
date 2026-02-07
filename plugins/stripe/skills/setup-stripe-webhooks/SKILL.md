# Setting Up Stripe Webhooks

## When to Use

Use this skill when:
- The user needs to handle Stripe events in their application
- The user is setting up webhook endpoints for Stripe
- The user asks about listening for payment events, subscription changes, or invoice updates
- The user wants to sync Stripe state with their database
- The user needs to test webhooks locally

## Overview

Stripe webhooks notify your application when events occur in your Stripe account — such as successful payments, failed charges, subscription changes, and more. Webhooks are essential for any Stripe integration because client-side redirects alone are unreliable for confirming payment status.

## Prerequisites

- A Stripe account
- `STRIPE_SECRET_KEY` environment variable set
- `STRIPE_WEBHOOK_SECRET` environment variable set
- Stripe CLI installed (for local testing)

## Instructions

### Step 1: Create the Webhook Endpoint

#### Express.js

```typescript
import express from 'express';
import Stripe from 'stripe';

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// IMPORTANT: Use express.raw() for the webhook route — not express.json()
// The raw body is required for signature verification
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Respond immediately to acknowledge receipt
    res.status(200).json({ received: true });

    // Process the event asynchronously
    try {
      await handleStripeEvent(event);
    } catch (err) {
      console.error(`Error processing webhook event ${event.id}:`, err);
    }
  }
);
```

#### Next.js App Router

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error(`Error processing event ${event.id}:`, err);
    // Still return 200 to prevent Stripe from retrying
    // unless you want Stripe to retry this specific event
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

#### Fastify

```typescript
import Fastify from 'fastify';
import Stripe from 'stripe';

const app = Fastify();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Register raw body parsing for the webhook route
app.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  (_req, body, done) => done(null, body)
);

app.post('/api/webhooks/stripe', async (request, reply) => {
  const sig = request.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      request.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    reply.status(400).send({ error: err.message });
    return;
  }

  reply.status(200).send({ received: true });
  await handleStripeEvent(event);
});
```

### Step 2: Verify Webhook Signatures

Signature verification is **mandatory** for security. Here's the verification pattern:

```typescript
function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err: any) {
    if (err.type === 'StripeSignatureVerificationError') {
      throw new Error(
        'Invalid webhook signature. Check that STRIPE_WEBHOOK_SECRET is correct.'
      );
    }
    throw err;
  }
}
```

### Step 3: Handle Events Idempotently

Stripe may deliver the same event multiple times. Always check for duplicates:

```typescript
async function handleStripeEvent(event: Stripe.Event) {
  // Deduplicate: check if we've already processed this event
  const alreadyProcessed = await db.processedWebhookEvent.findUnique({
    where: { eventId: event.id },
  });

  if (alreadyProcessed) {
    console.log(`Skipping already-processed event: ${event.id}`);
    return;
  }

  // Log the event for debugging
  console.log(`Processing Stripe event: ${event.type} (${event.id})`);

  // Route to the appropriate handler
  switch (event.type) {
    // --- Checkout ---
    case 'checkout.session.completed':
      await onCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session
      );
      break;

    case 'checkout.session.expired':
      await onCheckoutSessionExpired(
        event.data.object as Stripe.Checkout.Session
      );
      break;

    // --- Payment Intents ---
    case 'payment_intent.succeeded':
      await onPaymentIntentSucceeded(
        event.data.object as Stripe.PaymentIntent
      );
      break;

    case 'payment_intent.payment_failed':
      await onPaymentIntentFailed(
        event.data.object as Stripe.PaymentIntent
      );
      break;

    // --- Invoices ---
    case 'invoice.paid':
      await onInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.finalized':
      await onInvoiceFinalized(event.data.object as Stripe.Invoice);
      break;

    // --- Subscriptions ---
    case 'customer.subscription.created':
      await onSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.updated':
      await onSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.trial_will_end':
      await onTrialWillEnd(event.data.object as Stripe.Subscription);
      break;

    // --- Disputes ---
    case 'charge.dispute.created':
      await onDisputeCreated(event.data.object as Stripe.Dispute);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Mark event as processed
  await db.processedWebhookEvent.create({
    data: {
      eventId: event.id,
      type: event.type,
      processedAt: new Date(),
    },
  });
}
```

### Step 4: Implement Event Handlers

```typescript
async function onCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('checkout.session.completed: missing userId in metadata');
    return;
  }

  if (session.mode === 'subscription') {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    await db.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        stripeCurrentPeriodEnd: new Date(
          subscription.current_period_end * 1000
        ),
        subscriptionStatus: subscription.status,
      },
    });

    console.log(`Subscription activated for user ${userId}`);
  } else if (session.mode === 'payment') {
    await fulfillOneTimePayment(userId, session);
    console.log(`One-time payment fulfilled for user ${userId}`);
  }
}

async function onInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await db.user.update({
    where: { stripeSubscriptionId: subscriptionId },
    data: {
      subscriptionStatus: subscription.status,
      stripeCurrentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ),
    },
  });

  console.log(`Invoice paid for subscription ${subscriptionId}`);
}

async function onInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user and send notification
  const user = await db.user.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (user) {
    await sendEmail(user.email, {
      template: 'payment-failed',
      data: {
        invoiceUrl: invoice.hosted_invoice_url,
        amountDue: (invoice.amount_due / 100).toFixed(2),
        currency: invoice.currency.toUpperCase(),
      },
    });
  }

  console.log(`Payment failed for customer ${customerId}`);
}

async function onSubscriptionUpdated(subscription: Stripe.Subscription) {
  await db.user.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      subscriptionStatus: subscription.status,
      stripePriceId: subscription.items.data[0].price.id,
      stripeCurrentPeriodEnd: new Date(
        subscription.current_period_end * 1000
      ),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(
    `Subscription ${subscription.id} updated to status: ${subscription.status}`
  );
}

async function onSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db.user.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
    },
  });

  console.log(`Subscription ${subscription.id} canceled`);
}

async function onTrialWillEnd(subscription: Stripe.Subscription) {
  // Send a reminder email 3 days before trial ends
  const user = await db.user.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (user) {
    await sendEmail(user.email, {
      template: 'trial-ending',
      data: {
        trialEnd: new Date(subscription.trial_end! * 1000).toLocaleDateString(),
        planName: subscription.items.data[0].price.nickname || 'your plan',
      },
    });
  }
}
```

### Step 5: Test Webhooks Locally with the Stripe CLI

```bash
# 1. Install the Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Linux
curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
sudo apt update && sudo apt install stripe

# 2. Log in to Stripe
stripe login

# 3. Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# The CLI will print a webhook signing secret (whsec_...).
# Set this as your STRIPE_WEBHOOK_SECRET environment variable.

# 4. Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger payment_intent.succeeded

# 5. View recent events
stripe events list --limit 10

# 6. Resend a specific event
stripe events resend evt_xxxxxxxxxxxxx
```

### Step 6: Register the Webhook in Production

1. Go to the [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Enter your endpoint URL (e.g., `https://yourapp.com/api/webhooks/stripe`)
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.dispute.created`
5. Copy the signing secret and set it as `STRIPE_WEBHOOK_SECRET` in your production environment

## Common Pitfalls

1. **Parsed body instead of raw body**: Signature verification requires the raw request body. Make sure your framework isn't parsing it before your handler.
2. **Missing idempotency**: Always deduplicate events by `event.id`.
3. **Slow response**: Return 200 immediately and process asynchronously. Stripe times out after ~20 seconds.
4. **Missing events**: Subscribe to all relevant events — don't just handle `checkout.session.completed`.
5. **Hardcoded webhook secret**: Use environment variables and different secrets for test vs. production.
6. **No logging**: Always log webhook events for debugging. Include event ID, type, and relevant object IDs.

## Database Schema (Prisma Example)

```prisma
model ProcessedWebhookEvent {
  id          String   @id @default(cuid())
  eventId     String   @unique // Stripe event ID (evt_xxx)
  type        String   // Event type (e.g., checkout.session.completed)
  processedAt DateTime @default(now())

  @@index([eventId])
}

model User {
  id                      String    @id @default(cuid())
  email                   String    @unique
  stripeCustomerId        String?   @unique
  stripeSubscriptionId    String?   @unique
  stripePriceId           String?
  stripeCurrentPeriodEnd  DateTime?
  subscriptionStatus      String?   // active, past_due, canceled, etc.
  cancelAtPeriodEnd       Boolean   @default(false)
}
```

## Checklist

- [ ] Webhook endpoint created with raw body parsing
- [ ] Signature verification implemented with `stripe.webhooks.constructEvent()`
- [ ] All critical events handled (checkout, invoice, subscription)
- [ ] Idempotent event processing with deduplication
- [ ] Immediate 200 response with async processing
- [ ] Event logging for debugging
- [ ] Stripe CLI set up for local testing
- [ ] Webhook registered in Stripe Dashboard for production
- [ ] `STRIPE_WEBHOOK_SECRET` configured in all environments
- [ ] Database schema includes webhook event tracking
