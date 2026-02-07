# Setting Up Stripe Checkout

## When to Use

Use this skill when:
- The user wants to add payment processing to their application
- The user wants to accept one-time payments or start subscriptions
- The user asks about integrating Stripe Checkout
- The user wants a hosted payment page with minimal frontend code
- The user needs to set up a pricing/checkout flow

## Overview

Stripe Checkout is a prebuilt, hosted payment page that handles the entire payment flow — including payment method collection, validation, 3D Secure authentication, and receipt emails. It supports one-time payments, subscriptions, and setup-only flows.

## Prerequisites

- A Stripe account (test mode is fine for development)
- `STRIPE_SECRET_KEY` environment variable set
- `STRIPE_PUBLISHABLE_KEY` environment variable set
- `STRIPE_WEBHOOK_SECRET` environment variable set
- Products and Prices created in the Stripe Dashboard

## Instructions

### Step 1: Install the Stripe SDK

```bash
npm install stripe
```

For the frontend (optional, for redirect):
```bash
npm install @stripe/stripe-js
```

### Step 2: Create Products and Prices

Create products and prices in the Stripe Dashboard or via the API:

```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Create a product
const product = await stripe.products.create({
  name: 'Pro Plan',
  description: 'Full access to all features',
});

// Create a recurring price (subscription)
const monthlyPrice = await stripe.prices.create({
  product: product.id,
  unit_amount: 2900, // $29.00
  currency: 'usd',
  recurring: { interval: 'month' },
});

// Create a one-time price
const onetimePrice = await stripe.prices.create({
  product: product.id,
  unit_amount: 29900, // $299.00
  currency: 'usd',
});
```

Save the price IDs (e.g., `price_xxx`) for use in Checkout Sessions.

### Step 3: Create a Checkout Session (Server-Side)

#### One-Time Payment

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCheckoutSession(userId: string, priceId: string) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/checkout/cancel`,
    metadata: {
      userId,
    },
    payment_intent_data: {
      metadata: { userId },
    },
  });

  return session;
}
```

#### Subscription Checkout

```typescript
export async function createSubscriptionCheckout(
  userId: string,
  customerId: string | undefined,
  priceId: string
) {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/pricing`,
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    tax_id_collection: { enabled: true },
    metadata: { userId },
  };

  // Attach existing customer if available
  if (customerId) {
    sessionParams.customer = customerId;
  } else {
    sessionParams.customer_creation = 'always';
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return session;
}
```

### Step 4: Create the API Endpoint

#### Express

```typescript
import express from 'express';
const app = express();

app.post('/api/checkout', express.json(), async (req, res) => {
  try {
    const { priceId, mode } = req.body;
    const userId = req.user.id; // from your auth middleware

    const session = await stripe.checkout.sessions.create({
      mode: mode || 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      metadata: { userId },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout session creation failed:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});
```

#### Next.js App Router

```typescript
// app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { priceId } = await req.json();
    const userId = /* get from auth session */;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: { userId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

### Step 5: Redirect to Checkout (Client-Side)

```typescript
// Using fetch + redirect
async function handleCheckout(priceId: string) {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId }),
  });

  const { url } = await response.json();
  window.location.href = url;
}

// Or using Stripe.js (for embedded checkout)
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

async function handleCheckout(sessionId: string) {
  const stripe = await stripePromise;
  await stripe!.redirectToCheckout({ sessionId });
}
```

### Step 6: Handle the Success Page

**Important:** Never rely solely on the success page redirect to fulfill orders. Always use webhooks for fulfillment.

```typescript
// app/checkout/success/page.tsx (Next.js example)
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function CheckoutSuccess({
  searchParams,
}: {
  searchParams: { session_id: string };
}) {
  const session = await stripe.checkout.sessions.retrieve(
    searchParams.session_id,
    { expand: ['customer', 'subscription'] }
  );

  return (
    <div>
      <h1>Payment Successful!</h1>
      <p>Thank you for your purchase.</p>
      <p>
        A confirmation email has been sent to{' '}
        {(session.customer as Stripe.Customer)?.email}.
      </p>
    </div>
  );
}
```

### Step 7: Set Up Webhook Handler

This is **critical** — always use webhooks to confirm payment and fulfill orders:

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      if (session.mode === 'subscription') {
        // Activate the user's subscription
        await activateSubscription(userId!, session);
      } else {
        // Fulfill one-time purchase
        await fulfillPurchase(userId!, session);
      }
      break;
    }

    case 'invoice.paid': {
      // Subscription renewed successfully
      const invoice = event.data.object as Stripe.Invoice;
      await recordPayment(invoice);
      break;
    }

    case 'invoice.payment_failed': {
      // Payment failed — notify customer
      const invoice = event.data.object as Stripe.Invoice;
      await handleFailedPayment(invoice);
      break;
    }

    case 'customer.subscription.deleted': {
      // Subscription canceled — revoke access
      const subscription = event.data.object as Stripe.Subscription;
      await revokeAccess(subscription);
      break;
    }
  }

  return new Response('OK', { status: 200 });
}
```

### Step 8: Test the Integration

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login to your Stripe account
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret (whsec_...) and set it as STRIPE_WEBHOOK_SECRET

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.paid
stripe trigger customer.subscription.deleted
```

### Environment Variables

Add these to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...          # Your default price ID
APP_URL=http://localhost:3000       # Your app's base URL
```

## Checklist

- [ ] Stripe SDK installed
- [ ] Products and Prices created in Stripe Dashboard
- [ ] Checkout Session creation endpoint implemented
- [ ] Client-side redirect to Checkout working
- [ ] Success and cancel pages created
- [ ] Webhook endpoint implemented with signature verification
- [ ] Key webhook events handled (checkout.session.completed, invoice.paid, etc.)
- [ ] Environment variables configured
- [ ] Tested with Stripe CLI webhook forwarding
- [ ] Idempotent event processing implemented
