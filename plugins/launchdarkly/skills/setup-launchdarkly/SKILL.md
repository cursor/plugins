# Skill: Set Up LaunchDarkly

## Description

This skill walks through integrating LaunchDarkly into a TypeScript/JavaScript project from scratch, including SDK installation, client initialization, context construction, React provider setup, testing configuration, and production readiness.

## Prerequisites

- Node.js >= 18 installed
- A LaunchDarkly account with access to a project and environment
- Your LaunchDarkly SDK key (server-side) and/or client-side ID
- For React apps: React 18+ with a bundler (Vite, Next.js, webpack)

## Steps

### 1. Install the LaunchDarkly SDK

Choose the SDK(s) based on your application type:

```bash
# Server-side (Node.js, Express, Fastify, NestJS, etc.)
npm install @launchdarkly/node-server-sdk

# Client-side (React)
npm install launchdarkly-react-client-sdk

# Client-side (vanilla JS / non-React)
npm install launchdarkly-js-client-sdk

# Both (e.g., Next.js with SSR)
npm install @launchdarkly/node-server-sdk launchdarkly-react-client-sdk
```

### 2. Configure Environment Variables

Store your SDK keys securely — never commit them to source control:

```bash
# .env (add to .gitignore)
LAUNCHDARKLY_SDK_KEY=sdk-your-server-side-key
LAUNCHDARKLY_CLIENT_SIDE_ID=your-client-side-id
```

Add the `.env` file to `.gitignore`:

```bash
echo ".env" >> .gitignore
```

### 3. Initialize the Server-Side Client (Singleton)

Create a module that initializes the LaunchDarkly client once and exports it:

`src/lib/launchdarkly.ts`:

```typescript
import * as LaunchDarkly from "@launchdarkly/node-server-sdk";

let ldClient: LaunchDarkly.LDClient | null = null;
let initializationPromise: Promise<LaunchDarkly.LDClient> | null = null;

/**
 * Returns the singleton LaunchDarkly client.
 * Initializes on first call and reuses for subsequent calls.
 */
export function getLDClient(): Promise<LaunchDarkly.LDClient> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;
    if (!sdkKey) {
      throw new Error(
        "LAUNCHDARKLY_SDK_KEY environment variable is not set. " +
        "Get your SDK key from the LaunchDarkly dashboard: " +
        "Account Settings → Projects → Your Project → Environments."
      );
    }

    ldClient = LaunchDarkly.init(sdkKey, {
      // Optional: customize the logger
      logger: LaunchDarkly.basicLogger({
        level: process.env.NODE_ENV === "production" ? "warn" : "info",
      }),
    });

    try {
      await ldClient.waitForInitialization({ timeout: 10 });
      console.log("[LaunchDarkly] Client initialized successfully");
    } catch (error) {
      console.error("[LaunchDarkly] Client initialization failed:", error);
      // In production, you may want to fail fast or continue with defaults
      // ldClient is still usable — variation calls return defaults
    }

    return ldClient;
  })();

  return initializationPromise;
}

/**
 * Flush events and close the client. Call on application shutdown.
 */
export async function closeLDClient(): Promise<void> {
  if (ldClient) {
    await ldClient.flush();
    await ldClient.close();
    ldClient = null;
    initializationPromise = null;
    console.log("[LaunchDarkly] Client closed");
  }
}
```

### 4. Build a Context Factory

Create a helper that constructs well-formed LaunchDarkly contexts from your application's user/session data:

`src/lib/ld-context.ts`:

```typescript
import type { LDContext } from "@launchdarkly/node-server-sdk";

interface User {
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  role: "admin" | "member" | "viewer";
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  plan: string;
  industry?: string;
  employeeCount?: number;
}

/**
 * Build a LaunchDarkly context from authenticated user data.
 */
export function buildUserContext(user: User): LDContext {
  return {
    kind: "user",
    key: user.id,
    name: user.name,
    email: user.email,
    custom: {
      plan: user.plan,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

/**
 * Build a multi-context for user + organization targeting.
 */
export function buildMultiContext(user: User, org: Organization): LDContext {
  return {
    kind: "multi",
    user: {
      key: user.id,
      name: user.name,
      email: user.email,
      custom: {
        plan: user.plan,
        role: user.role,
      },
    },
    organization: {
      key: org.id,
      name: org.name,
      custom: {
        plan: org.plan,
        industry: org.industry,
        employeeCount: org.employeeCount,
      },
    },
  };
}

/**
 * Build an anonymous context for unauthenticated users.
 */
export function buildAnonymousContext(sessionId: string): LDContext {
  return {
    kind: "user",
    key: sessionId,
    anonymous: true,
  };
}
```

### 5. Use Flags in an Express/Fastify Endpoint

`src/routes/features.ts`:

```typescript
import { Router } from "express";
import { getLDClient } from "../lib/launchdarkly";
import { buildUserContext } from "../lib/ld-context";

const router = Router();

router.get("/api/features", async (req, res) => {
  const client = await getLDClient();
  const context = buildUserContext(req.user);

  const [showNewDashboard, maxUploadSizeMb, checkoutMode] = await Promise.all([
    client.boolVariation("dashboard-v2", context, false),
    client.numberVariation("max-upload-size-mb", context, 10),
    client.stringVariation("checkout-mode", context, "standard"),
  ]);

  res.json({
    showNewDashboard,
    maxUploadSizeMb,
    checkoutMode,
  });
});

export default router;
```

### 6. Set Up the React Client-Side Provider

`src/app/providers/LaunchDarklyProvider.tsx`:

```tsx
import { LDProvider } from "launchdarkly-react-client-sdk";
import type { LDContext } from "launchdarkly-js-client-sdk";
import type { ReactNode } from "react";

interface Props {
  user: { id: string; email: string; name: string; plan: string };
  children: ReactNode;
}

export function LaunchDarklyProvider({ user, children }: Props) {
  const context: LDContext = {
    kind: "user",
    key: user.id,
    name: user.name,
    email: user.email,
    custom: {
      plan: user.plan,
    },
  };

  return (
    <LDProvider
      clientSideID={process.env.REACT_APP_LD_CLIENT_SIDE_ID!}
      context={context}
      options={{
        streaming: true, // Real-time flag updates
      }}
    >
      {children}
    </LDProvider>
  );
}
```

Use flags in components with hooks:

```tsx
import { useFlags, useLDClient } from "launchdarkly-react-client-sdk";

function PricingBanner() {
  const { showPromoBanner, promoBannerText } = useFlags();
  const ldClient = useLDClient();

  if (!showPromoBanner) return null;

  const handleDismiss = () => {
    ldClient?.track("promo-banner-dismissed");
  };

  return (
    <div className="banner">
      <p>{promoBannerText ?? "Check out our new plans!"}</p>
      <button onClick={handleDismiss}>Dismiss</button>
    </div>
  );
}
```

### 7. Register Shutdown Handlers

Ensure the LaunchDarkly client is closed on application shutdown to flush pending events:

`src/server.ts`:

```typescript
import { closeLDClient } from "./lib/launchdarkly";

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  await closeLDClient();
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

### 8. Set Up Testing with TestData

Create a test helper that provides a deterministic LaunchDarkly client:

`src/test/ld-test-helper.ts`:

```typescript
import * as LaunchDarkly from "@launchdarkly/node-server-sdk";
import { TestData } from "@launchdarkly/node-server-sdk/integrations";

export interface TestFlags {
  [flagKey: string]: boolean | string | number | Record<string, unknown>;
}

/**
 * Create a LaunchDarkly test client with predetermined flag values.
 */
export async function createTestClient(
  flags: TestFlags
): Promise<{ client: LaunchDarkly.LDClient; td: ReturnType<typeof TestData> }> {
  const td = TestData();

  for (const [key, value] of Object.entries(flags)) {
    if (typeof value === "boolean") {
      td.update(td.flag(key).booleanFlag().variationForAll(value));
    } else if (typeof value === "string") {
      td.update(
        td.flag(key).valueForAll(value)
      );
    } else if (typeof value === "number") {
      td.update(
        td.flag(key).valueForAll(value)
      );
    } else {
      td.update(
        td.flag(key).valueForAll(value)
      );
    }
  }

  const client = LaunchDarkly.init("test-sdk-key", {
    updateProcessor: td,
  });

  await client.waitForInitialization();
  return { client, td };
}
```

Usage in tests:

```typescript
import { createTestClient } from "../test/ld-test-helper";

describe("feature: checkout-v2", () => {
  it("renders new checkout when flag is on", async () => {
    const { client } = await createTestClient({
      "checkout-v2": true,
      "max-upload-size-mb": 50,
    });

    const context = { kind: "user" as const, key: "test-user" };
    const result = await client.boolVariation("checkout-v2", context, false);
    expect(result).toBe(true);

    await client.close();
  });
});
```

### 9. Set Up Next.js Integration (SSR + Client)

For Next.js applications that need flags on both server and client:

`src/lib/ld-server.ts` (server-side):

```typescript
import { getLDClient } from "./launchdarkly";
import { buildUserContext } from "./ld-context";

export async function getServerFlags(user: User) {
  const client = await getLDClient();
  const context = buildUserContext(user);

  return {
    showNewDashboard: await client.boolVariation("dashboard-v2", context, false),
    maxUploadSizeMb: await client.numberVariation("max-upload-size-mb", context, 10),
  };
}
```

`pages/_app.tsx` (client-side bootstrap):

```tsx
import { LDProvider } from "launchdarkly-react-client-sdk";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LDProvider
      clientSideID={process.env.NEXT_PUBLIC_LD_CLIENT_SIDE_ID!}
      context={pageProps.ldContext}
      options={{
        bootstrap: pageProps.ldFlags, // Prevents flicker on hydration
      }}
    >
      <Component {...pageProps} />
    </LDProvider>
  );
}
```

### 10. Verify the Integration

Run through this checklist to confirm everything is working:

```bash
# 1. Verify the server-side client connects
node -e "
  const LD = require('@launchdarkly/node-server-sdk');
  const c = LD.init(process.env.LAUNCHDARKLY_SDK_KEY);
  c.waitForInitialization({ timeout: 5 })
    .then(() => { console.log('✓ Connected'); c.close(); })
    .catch(e => { console.error('✗ Failed:', e.message); process.exit(1); });
"

# 2. Create a test flag in the dashboard called "test-flag" (boolean, default false)
# 3. Evaluate it from your app and verify the value
# 4. Toggle it in the dashboard and verify the value changes
# 5. Check the LaunchDarkly dashboard for evaluation events
```

## Best Practices Checklist

- [ ] SDK key stored in environment variables (never committed)
- [ ] Client initialized once using the singleton pattern
- [ ] Contexts include stable keys and relevant targeting attributes
- [ ] Shutdown handler registered to flush events and close the client
- [ ] Test helper configured with `TestData` for deterministic unit tests
- [ ] React provider wraps the app root with the client-side ID
- [ ] Flag values are logged during development for debugging
- [ ] `.env` added to `.gitignore`
- [ ] Server-side SDK key and client-side ID use the correct environment (dev/staging/prod)
- [ ] Anonymous contexts used for unauthenticated users

## Troubleshooting

| Issue | Solution |
|-------|---------|
| `LAUNCHDARKLY_SDK_KEY is not set` | Set the environment variable in `.env` or your deployment config |
| Client never initializes | Check network connectivity and SDK key validity; ensure the key matches the environment |
| Flags always return defaults | Client may be in offline mode or not initialized; check logs for errors |
| React hydration mismatch | Bootstrap the client SDK with server-evaluated flag values |
| Stale flag values in browser | Ensure streaming is enabled in the client SDK options |
| Events not appearing in dashboard | Call `client.flush()` or wait for the default flush interval (5 seconds) |
| `TypeError: client.boolVariation is not a function` | You may be using an older SDK version; upgrade or use `client.variation()` |
