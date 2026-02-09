---
name: setup-verify
description: Phone verification with Twilio Verify, multi-channel fallback, and error handling
---

# Setting Up Phone Verification with Twilio Verify

## When to Use

Use this skill when:
- The user wants to verify phone numbers during registration or login
- The user needs to implement two-factor authentication (2FA)
- The user asks about sending OTP (one-time password) codes
- The user wants phone verification via SMS, voice call, email, or WhatsApp
- The user needs to add identity verification to their application

## Overview

Twilio Verify is a purpose-built API for sending and checking verification codes. Unlike sending raw SMS with verification codes, Twilio Verify includes built-in rate limiting, fraud detection, multi-channel delivery (SMS, voice, email, WhatsApp), and automatic code generation and expiration. You only pay for successful verifications, making it more cost-effective than raw SMS for verification use cases.

**Why use Verify instead of raw SMS?**
- Built-in fraud guard — blocks verification pumping attacks
- Rate limiting per phone number — prevents abuse
- Automatic code generation and expiration (10-minute default)
- Multi-channel fallback (SMS → Voice → WhatsApp)
- Only charged for successful verifications
- Managed templates with localization

## Prerequisites

- A [Twilio account](https://www.twilio.com/try-twilio)
- A Twilio Verify Service (created in the Console or via API)
- `TWILIO_ACCOUNT_SID` environment variable set
- `TWILIO_AUTH_TOKEN` environment variable set
- `TWILIO_VERIFY_SERVICE_SID` environment variable set

## Instructions

### Step 1: Create a Verify Service

#### Via the Twilio Console

1. Go to [Twilio Console → Verify → Services](https://console.twilio.com/us1/develop/verify/services)
2. Click **Create new** to create a Verify Service
3. Give it a friendly name (e.g., "My App Verification")
4. Configure settings:
   - Code length: 6 digits (default)
   - Code expiry: 10 minutes (default)
   - Enable fraud guard: Yes
5. Copy the Service SID (starts with `VA`) and set as `TWILIO_VERIFY_SERVICE_SID`

#### Via the API

```typescript
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

const service = await client.verify.v2.services.create({
  friendlyName: 'My App Verification',
  codeLength: 6,
  lookupEnabled: true, // Validate numbers before sending
});

console.log(`Verify Service SID: ${service.sid}`);
// Set this as TWILIO_VERIFY_SERVICE_SID
```

### Step 2: Install the Twilio SDK

```bash
npm install twilio
```

### Step 3: Create the Verification Service Module

```typescript
// lib/verify.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;

export type VerifyChannel = 'sms' | 'call' | 'email' | 'whatsapp';

/**
 * Send a verification code to the specified phone number or email.
 */
export async function sendVerificationCode(
  to: string,
  channel: VerifyChannel = 'sms'
): Promise<{ status: string; sid: string }> {
  try {
    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({ to, channel });

    console.log(`Verification sent to ${to} via ${channel}: ${verification.status}`);

    return {
      status: verification.status, // 'pending'
      sid: verification.sid,
    };
  } catch (err: any) {
    console.error(`Failed to send verification to ${to}:`, err.code, err.message);

    switch (err.code) {
      case 60200: // Invalid parameter
        throw new Error('Invalid phone number or email address.');
      case 60203: // Max send attempts reached
        throw new Error('Too many verification attempts. Please wait before trying again.');
      case 60205: // SMS not supported for this region
        throw new Error('SMS verification is not available for this number. Try voice or WhatsApp.');
      default:
        throw new Error('Failed to send verification code. Please try again later.');
    }
  }
}

/**
 * Check a verification code submitted by the user.
 */
export async function checkVerificationCode(
  to: string,
  code: string
): Promise<{ status: string; valid: boolean }> {
  try {
    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to, code });

    console.log(`Verification check for ${to}: ${check.status}`);

    return {
      status: check.status, // 'approved' or 'pending'
      valid: check.status === 'approved',
    };
  } catch (err: any) {
    console.error(`Verification check failed for ${to}:`, err.code, err.message);

    switch (err.code) {
      case 20404: // Verification not found
        throw new Error('Verification code expired or not found. Please request a new code.');
      case 60202: // Max check attempts reached
        throw new Error('Too many incorrect attempts. Please request a new code.');
      default:
        throw new Error('Verification check failed. Please try again.');
    }
  }
}
```

### Step 4: Create API Endpoints

#### Express.js

```typescript
import express from 'express';
import { sendVerificationCode, checkVerificationCode } from './lib/verify';

const app = express();
app.use(express.json());

// POST /api/verify/send — Send a verification code
app.post('/api/verify/send', async (req, res) => {
  try {
    const { phoneNumber, channel = 'sms' } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate E.164 format
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return res.status(400).json({
        error: 'Phone number must be in E.164 format (e.g., +14155551234)',
      });
    }

    const result = await sendVerificationCode(phoneNumber, channel);
    res.json({ status: result.status, message: 'Verification code sent' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/verify/check — Check a verification code
app.post('/api/verify/check', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({ error: 'Phone number and code are required' });
    }

    const result = await checkVerificationCode(phoneNumber, code);

    if (result.valid) {
      // Verification successful — mark the user as verified
      // (integrate with your user/session management here)
      res.json({ status: 'approved', message: 'Phone number verified successfully' });
    } else {
      res.status(400).json({ status: 'pending', message: 'Invalid verification code' });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
```

#### Next.js App Router

```typescript
// app/api/verify/send/route.ts
import { NextResponse } from 'next/server';
import { sendVerificationCode } from '@/lib/verify';

export async function POST(req: Request) {
  try {
    const { phoneNumber, channel = 'sms' } = await req.json();

    if (!phoneNumber?.match(/^\+[1-9]\d{1,14}$/)) {
      return NextResponse.json(
        { error: 'Valid phone number in E.164 format is required' },
        { status: 400 }
      );
    }

    const result = await sendVerificationCode(phoneNumber, channel);
    return NextResponse.json({ status: result.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
```

```typescript
// app/api/verify/check/route.ts
import { NextResponse } from 'next/server';
import { checkVerificationCode } from '@/lib/verify';

export async function POST(req: Request) {
  try {
    const { phoneNumber, code } = await req.json();

    if (!phoneNumber || !code) {
      return NextResponse.json(
        { error: 'Phone number and code are required' },
        { status: 400 }
      );
    }

    const result = await checkVerificationCode(phoneNumber, code);

    if (result.valid) {
      // Mark user as verified in your database
      return NextResponse.json({
        status: 'approved',
        message: 'Phone number verified',
      });
    }

    return NextResponse.json(
      { status: 'pending', message: 'Invalid code' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
```

### Step 5: Add Frontend Verification Flow

```typescript
// React component example
import { useState } from 'react';

export function PhoneVerification() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'verified'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSendCode() {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, channel: 'sms' }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setStep('code');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, code }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setStep('verified');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'verified') {
    return <div>✓ Phone number verified successfully!</div>;
  }

  return (
    <div>
      {step === 'phone' ? (
        <div>
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            placeholder="+14155551234"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button onClick={handleSendCode} disabled={loading}>
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </div>
      ) : (
        <div>
          <p>Enter the 6-digit code sent to {phone}</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button onClick={handleVerifyCode} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button onClick={handleSendCode} disabled={loading}>
            Resend Code
          </button>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### Step 6: Multi-Channel Fallback

```typescript
/**
 * Send verification with automatic channel fallback.
 * Tries SMS first, then voice, then WhatsApp.
 */
export async function sendVerificationWithFallback(
  to: string
): Promise<{ status: string; channel: string }> {
  const channels: VerifyChannel[] = ['sms', 'call', 'whatsapp'];

  for (const channel of channels) {
    try {
      const result = await sendVerificationCode(to, channel);
      return { status: result.status, channel };
    } catch (err: any) {
      console.warn(`Verification via ${channel} failed for ${to}:`, err.message);

      // If it's a rate limit or abuse error, don't try other channels
      if (err.message.includes('Too many')) {
        throw err;
      }
      // Otherwise, try the next channel
    }
  }

  throw new Error('All verification channels failed. Please try again later.');
}
```

### Step 7: Test the Integration

```bash
# 1. Start your development server
npm run dev

# 2. Test sending a verification code
curl -X POST http://localhost:3000/api/verify/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+14155551234", "channel": "sms"}'
# Response: {"status": "pending", "message": "Verification code sent"}

# 3. Check the verification code (use the code received via SMS)
curl -X POST http://localhost:3000/api/verify/check \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+14155551234", "code": "123456"}'
# Response: {"status": "approved", "message": "Phone number verified successfully"}

# 4. Test error cases
# Invalid phone number
curl -X POST http://localhost:3000/api/verify/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "not-a-number"}'
# Response: 400 {"error": "Phone number must be in E.164 format..."}

# Wrong code
curl -X POST http://localhost:3000/api/verify/check \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+14155551234", "code": "000000"}'
# Response: 400 {"status": "pending", "message": "Invalid verification code"}
```

### Environment Variables

Add these to your `.env` file:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Common Pitfalls

1. **Using raw SMS instead of Verify for OTP**: Twilio Verify includes fraud protection, rate limiting, and multi-channel support. Raw SMS for OTP is more expensive and less secure.
2. **Not handling expired codes**: Verification codes expire after 10 minutes (default). Handle the 20404 error code gracefully.
3. **Missing rate limit handling**: Twilio Verify has built-in rate limits. Handle the 60203 error to inform users when they've exceeded the limit.
4. **Wrong phone number format**: Always use E.164 format. Validate on both client and server.
5. **Not checking the response status**: A successful API call doesn't mean the code is correct — always check `status === 'approved'`.
6. **Storing verification codes locally**: Never generate and store your own codes when using Verify. The API manages code lifecycle for you.

## Database Schema (Prisma Example)

```prisma
model User {
  id              String    @id @default(cuid())
  email           String    @unique
  phone           String?   @unique
  phoneVerified   Boolean   @default(false)
  phoneVerifiedAt DateTime?
}

model VerificationAttempt {
  id        String   @id @default(cuid())
  phone     String
  channel   String   // sms, call, email, whatsapp
  status    String   // pending, approved, canceled, expired
  createdAt DateTime @default(now())
  userId    String?

  @@index([phone, createdAt])
}
```

## Checklist

- [ ] Twilio Verify Service created in the Console
- [ ] Twilio SDK installed (`npm install twilio`)
- [ ] Verification service module created (`lib/verify.ts`)
- [ ] Send verification endpoint implemented
- [ ] Check verification endpoint implemented
- [ ] E.164 phone number validation on both client and server
- [ ] Error handling with user-friendly messages
- [ ] Frontend verification flow (phone input → code input → success)
- [ ] Environment variables configured (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`)
- [ ] Rate limit handling for repeated attempts
- [ ] Multi-channel fallback (optional)
- [ ] Integration tested end-to-end
