# Security Hardening Guide

## Overview
This guide provides concrete, implementable security patterns for production applications. It covers authentication, authorization, data protection, API security, and infrastructure hardening.

---

## 1. Authentication & Session Security

### OAuth 2.0 / OIDC Setup (Next.js + Clerk)

```typescript
// middleware.ts — Protect all app routes
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/health(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect(); // Redirect unauthenticated users
  }
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
};
```

### JWT Token Validation (Edge Function / API Route)

```typescript
// lib/auth.ts
import { jwtVerify, JWTVerifyResult } from 'jose';

const JWKS_URL = process.env.CLERK_JWKS_URL!;
const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function verifyToken(token: string): Promise<JWTVerifyResult> {
  try {
    return await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Usage in API route
export async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.slice(7);
  const { payload } = await verifyToken(token);

  return {
    userId: payload.sub!,
    role: payload.role as string,
    email: payload.email as string,
  };
}
```

---

## 2. Authorization — Row-Level Security (RLS)

### Supabase/PostgreSQL RLS Patterns

```sql
-- Enable RLS on all user-facing tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Pattern 1: Owner-only access
CREATE POLICY "Users can CRUD own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Pattern 2: Team-based access via junction table
CREATE POLICY "Team members can read projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.project_id = projects.id
        AND team_members.user_id = auth.uid()
    )
  );

-- Pattern 3: Role-based access via JWT claims
CREATE POLICY "Admins can manage all projects"
  ON projects FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Pattern 4: Public read, authenticated write
CREATE POLICY "Anyone can read published posts"
  ON posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authors can manage own posts"
  ON posts FOR ALL
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);
```

---

## 3. Security Headers Configuration

### Next.js Security Headers

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Tighten in production
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const config: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default config;
```

---

## 4. Input Sanitization & Validation

### Defense-in-Depth Validation Pattern

```typescript
// lib/validators/user-input.ts
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Layer 1: Schema validation with Zod
export const UserInputSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be under 100 characters')
    .regex(/^[a-zA-Z\s\-']+$/, 'Name contains invalid characters'),
  email: z.string().email('Invalid email address'),
  bio: z.string()
    .max(500, 'Bio must be under 500 characters')
    .transform((val) => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })) // Layer 2: Strip all HTML
    .optional(),
  website: z.string()
    .url('Invalid URL')
    .refine(
      (url) => url.startsWith('https://'), // Layer 3: Only allow HTTPS
      'Only HTTPS URLs are allowed'
    )
    .optional(),
});

// Layer 4: Rate limiting on the endpoint (see middleware)
// Layer 5: CSRF token validation (see middleware)
// Layer 6: WAF rules (Cloudflare, AWS WAF)
```

---

## 5. Webhook Security

### Stripe Webhook Signature Verification

```typescript
// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // CRITICAL: Always verify webhook signatures
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Process verified event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
```

---

## 6. Secrets Management

### Environment Variable Validation

```typescript
// lib/env.ts — Validate all required env vars at startup
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_DIRECT_URL: z.string().url().optional(),

  // Auth
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),

  // App
  NODE_ENV: z.enum(['development', 'test', 'production']),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

// Validate on import — fail fast if missing
export const env = envSchema.parse(process.env);

// Type-safe environment access
declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
```

---

## 7. Audit Logging

### Structured Audit Log Pattern

```typescript
// lib/audit.ts
import { db } from './db';
import { auditLogs } from './db/schema';

interface AuditEvent {
  action: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  await db.insert(auditLogs).values({
    action: event.action,
    userId: event.userId,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    metadata: event.metadata ?? {},
    ipAddress: event.ipAddress ?? 'unknown',
    userAgent: event.userAgent ?? 'unknown',
    timestamp: new Date(),
  });
}

// Usage
await logAuditEvent({
  action: 'user.data_export',
  userId: currentUser.id,
  resourceType: 'user',
  resourceId: currentUser.id,
  metadata: { exportFormat: 'csv', recordCount: 1500 },
  ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
});
```

---

## Security Checklist Quick Reference

| Category | Check | Tool/Method |
|----------|-------|-------------|
| Auth | Token validation | Clerk/NextAuth middleware |
| Authz | RLS policies | `pg_policies` view |
| Headers | CSP, HSTS | securityheaders.com |
| Secrets | No hardcoded | `grep -rn` + git history |
| Input | Validation | Zod schemas |
| XSS | Output encoding | DOMPurify + CSP |
| CSRF | Token validation | SameSite cookies |
| SQLi | Parameterized | ORM (Drizzle/Prisma) |
| Dependencies | CVE scan | `npm audit`, Snyk |
| Webhooks | Signature verify | Provider SDK |

---

## Conclusion
Security is not a feature — it's a requirement. Implement defense-in-depth with multiple layers of protection. Validate inputs, sanitize outputs, verify identities, authorize access, log actions, and monitor anomalies.
