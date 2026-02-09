# Setting Up SMS Messaging with Twilio

## When to Use

Use this skill when:
- The user wants to send SMS or MMS messages from their application
- The user is setting up Twilio Programmable Messaging
- The user asks about sending text message notifications, alerts, or reminders
- The user needs to receive and reply to incoming SMS messages
- The user wants to set up a Messaging Service for production SMS

## Overview

Twilio Programmable Messaging lets you send and receive SMS and MMS messages globally. For production workloads, Twilio recommends using Messaging Services, which provide number pooling, sticky sender, compliance features, and higher throughput than sending from a single number.

## Prerequisites

- A [Twilio account](https://www.twilio.com/try-twilio) (free trial works for testing)
- A Twilio phone number with SMS capability
- `TWILIO_ACCOUNT_SID` environment variable set
- `TWILIO_AUTH_TOKEN` environment variable set
- `TWILIO_PHONE_NUMBER` environment variable set (E.164 format)
- For production: a Messaging Service SID (`TWILIO_MESSAGING_SERVICE_SID`)

## Instructions

### Step 1: Install the Twilio SDK

```bash
npm install twilio
```

### Step 2: Initialize the Twilio Client

```typescript
// lib/twilio.ts
import twilio from 'twilio';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  throw new Error(
    'Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN environment variables. ' +
    'Get your credentials at https://console.twilio.com'
  );
}

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default client;
```

### Step 3: Send an SMS Message

#### Simple SMS (Development)

```typescript
import client from './lib/twilio';

async function sendSMS(to: string, body: string) {
  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER!, // Your Twilio number in E.164 format
    to, // Recipient number in E.164 format, e.g. '+14155551234'
  });

  console.log(`Message sent: SID=${message.sid}, Status=${message.status}`);
  return message;
}

// Usage
await sendSMS('+14155551234', 'Your order #1234 has shipped!');
```

#### Production SMS with Messaging Service

```typescript
import client from './lib/twilio';

async function sendSMS(to: string, body: string, statusCallbackUrl?: string) {
  const message = await client.messages.create({
    body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!,
    to,
    statusCallback: statusCallbackUrl || `${process.env.APP_URL}/api/webhooks/twilio/message-status`,
  });

  console.log(`Message sent: SID=${message.sid}, Status=${message.status}`);
  return message;
}

// Usage
await sendSMS('+14155551234', 'Your appointment is confirmed for tomorrow at 2pm.');
```

#### Send MMS (with Media)

```typescript
async function sendMMS(to: string, body: string, mediaUrls: string[]) {
  const message = await client.messages.create({
    body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!,
    to,
    mediaUrl: mediaUrls, // Array of publicly accessible media URLs
  });

  console.log(`MMS sent: SID=${message.sid}`);
  return message;
}

// Usage
await sendMMS(
  '+14155551234',
  'Here is your receipt.',
  ['https://yourapp.com/receipts/1234.pdf']
);
```

### Step 4: Handle Incoming SMS (Webhook)

#### Express.js

```typescript
import express from 'express';
import twilio from 'twilio';

const app = express();

app.post(
  '/api/webhooks/twilio/sms',
  express.urlencoded({ extended: false }),
  twilio.webhook({ authToken: process.env.TWILIO_AUTH_TOKEN }),
  (req, res) => {
    const { From, Body, MessageSid, NumMedia } = req.body;

    console.log(`Incoming SMS from ${From}: ${Body} (SID: ${MessageSid})`);

    // Build a TwiML response
    const response = new twilio.twiml.MessagingResponse();

    // Simple auto-reply based on message content
    const lowerBody = Body?.toLowerCase() || '';

    if (lowerBody.includes('help')) {
      response.message(
        'Available commands:\n' +
        'HELP — Show this menu\n' +
        'STATUS — Check your order status\n' +
        'STOP — Unsubscribe from messages'
      );
    } else if (lowerBody.includes('status')) {
      response.message('Your order #1234 is out for delivery. Expected arrival: 3pm today.');
    } else {
      response.message('Thanks for your message! Reply HELP for available commands.');
    }

    res.type('text/xml').send(response.toString());
  }
);
```

#### Next.js App Router

```typescript
// app/api/webhooks/twilio/sms/route.ts
import twilio from 'twilio';
import { validateRequest } from 'twilio';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const params = Object.fromEntries(new URLSearchParams(body));

  // Validate webhook signature
  const signature = headersList.get('x-twilio-signature') || '';
  const url = `${process.env.APP_URL}/api/webhooks/twilio/sms`;

  if (!validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url, params)) {
    return new Response('Forbidden', { status: 403 });
  }

  const { From, Body, MessageSid } = params;
  console.log(`Incoming SMS from ${From}: ${Body} (SID: ${MessageSid})`);

  const response = new twilio.twiml.MessagingResponse();
  response.message('Message received! We\'ll get back to you shortly.');

  return new Response(response.toString(), {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  });
}
```

### Step 5: Handle Delivery Status Callbacks

```typescript
// Track message delivery status
app.post(
  '/api/webhooks/twilio/message-status',
  express.urlencoded({ extended: false }),
  twilio.webhook({ authToken: process.env.TWILIO_AUTH_TOKEN }),
  async (req, res) => {
    const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = req.body;

    console.log(`Status update for ${MessageSid}: ${MessageStatus}`);

    // Update your database
    await db.message.update({
      where: { twilioSid: MessageSid },
      data: {
        status: MessageStatus,
        errorCode: ErrorCode || null,
        errorMessage: ErrorMessage || null,
        updatedAt: new Date(),
      },
    });

    // Handle failures
    if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
      console.error(`Message ${MessageSid} to ${To} failed: ${ErrorCode} — ${ErrorMessage}`);

      // Optionally: retry via a different channel (email, push notification, etc.)
      if (ErrorCode === '30003' || ErrorCode === '30005') {
        await notifyViaAlternateChannel(To, MessageSid);
      }
    }

    res.sendStatus(200);
  }
);
```

### Step 6: Add Error Handling and Retry Logic

```typescript
import client from './lib/twilio';

async function sendSMSWithRetry(
  to: string,
  body: string,
  maxRetries = 3
): Promise<{ sid: string; status: string }> {
  // Validate phone number format
  if (!to.match(/^\+[1-9]\d{1,14}$/)) {
    throw new Error(`Invalid phone number format: ${to}. Use E.164 format (e.g., +14155551234).`);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const message = await client.messages.create({
        body,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!,
        to,
        statusCallback: `${process.env.APP_URL}/api/webhooks/twilio/message-status`,
      });

      return { sid: message.sid, status: message.status };
    } catch (err: any) {
      console.error(`SMS send attempt ${attempt + 1} failed:`, err.code, err.message);

      // Don't retry on non-retryable errors
      const nonRetryable = [21211, 21608, 21610, 21614, 21612];
      if (nonRetryable.includes(err.code)) {
        throw err;
      }

      // Retry on rate limits or server errors
      if (attempt < maxRetries && (err.code === 20429 || err.status >= 500)) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw err;
    }
  }

  throw new Error('Max retries exceeded');
}
```

### Step 7: Set Up a Messaging Service (Production)

1. Go to the [Twilio Console → Messaging → Services](https://console.twilio.com/us1/develop/sms/services)
2. Click **Create Messaging Service**
3. Give it a name (e.g., "My App Notifications")
4. Add your Twilio phone number(s) to the service's sender pool
5. Configure the incoming message webhook URL (e.g., `https://yourapp.com/api/webhooks/twilio/sms`)
6. Copy the Messaging Service SID and set it as `TWILIO_MESSAGING_SERVICE_SID`
7. For US traffic: complete A2P 10DLC brand and campaign registration

### Step 8: Test Locally with ngrok

```bash
# 1. Start your development server
npm run dev

# 2. In another terminal, start ngrok
ngrok http 3000

# 3. Copy the ngrok URL (e.g., https://abc123.ngrok.io)

# 4. Configure the webhook URL in the Twilio Console:
#    Go to Phone Numbers → Manage → Active Numbers → Your Number
#    Set the "A MESSAGE COMES IN" webhook to:
#    https://abc123.ngrok.io/api/webhooks/twilio/sms

# 5. Send a text message to your Twilio number to test

# 6. Test sending outbound messages from your app
curl -X POST http://localhost:3000/api/send-sms \
  -H "Content-Type: application/json" \
  -d '{"to": "+14155551234", "body": "Hello from my app!"}'
```

### Environment Variables

Add these to your `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15017122661
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_URL=http://localhost:3000
```

## Common Pitfalls

1. **Wrong phone number format**: Always use E.164 format (`+14155551234`). Local formats like `(415) 555-1234` will fail.
2. **Trial account limitations**: Trial accounts can only send to verified phone numbers. Upgrade your account for production.
3. **Missing A2P 10DLC registration**: US carriers require A2P 10DLC registration. Unregistered traffic may be filtered or blocked.
4. **No webhook signature validation**: Always validate `X-Twilio-Signature` on incoming webhooks to prevent spoofed requests.
5. **Slow webhook responses**: Twilio expects a response within 15 seconds. Process heavy tasks asynchronously.
6. **Not handling opt-outs**: Always honor STOP/UNSUBSCRIBE requests. Twilio Messaging Services handle this automatically.
7. **Hardcoded credentials**: Never commit Account SID or Auth Token to source control.

## Checklist

- [ ] Twilio SDK installed (`npm install twilio`)
- [ ] Twilio client initialized with environment variables
- [ ] Outbound SMS sending implemented
- [ ] Incoming SMS webhook handler with signature validation
- [ ] Delivery status callback endpoint
- [ ] Error handling with Twilio error codes
- [ ] Retry logic for transient failures
- [ ] Messaging Service configured (production)
- [ ] A2P 10DLC registration completed (US traffic)
- [ ] Webhook tested locally with ngrok
- [ ] Phone numbers validated in E.164 format
- [ ] Opt-out handling implemented (STOP/UNSUBSCRIBE)
