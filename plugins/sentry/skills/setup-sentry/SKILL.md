# Skill: Set Up Sentry

Set up Sentry error monitoring and performance tracking in a project, with framework-specific guidance for Next.js, React, Node.js, and Python.

## Prerequisites

- A Sentry account and project (https://sentry.io)
- Your project's DSN (found in **Settings → Projects → [Project] → Client Keys**)
- A Sentry auth token for source-map uploads (found in **Settings → Auth Tokens**)

## Environment Variables

Set these in your `.env` file (and CI/CD secrets):

```bash
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=my-org
SENTRY_PROJECT=my-project
SENTRY_AUTH_TOKEN=sntrys_XXXXXXXX
SENTRY_ENVIRONMENT=production    # or staging, development
SENTRY_RELEASE=                  # set automatically in CI, e.g. git SHA
```

---

## Next.js Setup

### 1. Install Dependencies

```bash
npx @sentry/wizard@latest -i nextjs
```

This automatically:
- Installs `@sentry/nextjs`
- Creates `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Updates `next.config.js` with `withSentryConfig`
- Creates or updates `instrumentation.ts`

### 2. Configure the SDK

**`sentry.client.config.ts`**:
```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "development",
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**`sentry.server.config.ts`**:
```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? "development",
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: 0.2,
});
```

### 3. Source Maps

The `@sentry/nextjs` Webpack/Turbopack plugin handles source map upload automatically during `next build` when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are set.

```js
// next.config.js
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
```

### 4. Error Boundary

Wrap your root layout with the Sentry error boundary:

```tsx
// app/global-error.tsx
"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

---

## React (Vite / CRA) Setup

### 1. Install Dependencies

```bash
npm install @sentry/react
# For source maps with Vite:
npm install @sentry/vite-plugin --save-dev
```

### 2. Initialize Sentry

```ts
// src/instrument.ts — import this FIRST in main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? "development",
  release: import.meta.env.VITE_SENTRY_RELEASE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

```tsx
// src/main.tsx
import "./instrument"; // MUST be first
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### 3. Error Boundary

```tsx
import * as Sentry from "@sentry/react";

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<p>An error has occurred.</p>} showDialog>
      <Router />
    </Sentry.ErrorBoundary>
  );
}
```

### 4. Source Maps (Vite)

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: { sourcemap: true },
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

---

## Node.js (Express / Fastify) Setup

### 1. Install Dependencies

```bash
npm install @sentry/node @sentry/profiling-node
```

### 2. Initialize Sentry

```ts
// src/instrument.ts — import FIRST in your entry file
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 0.2,
  profilesSampleRate: 0.1,
});
```

### 3. Express Integration

```ts
// src/app.ts
import "./instrument"; // MUST be first
import express from "express";
import * as Sentry from "@sentry/node";

const app = express();

// Routes
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api/users/:id", getUserHandler);

// Sentry error handler — MUST be after all routes and before other error handlers
Sentry.setupExpressErrorHandler(app);

// Fallback error handler
app.use((err, _req, res, _next) => {
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(3000);
```

### 4. Source Maps

Use `sentry-cli` in your build/deploy pipeline:

```bash
sentry-cli releases new "$SENTRY_RELEASE"
sentry-cli releases files "$SENTRY_RELEASE" upload-sourcemaps ./dist \
  --url-prefix "~/" \
  --rewrite
sentry-cli releases finalize "$SENTRY_RELEASE"
```

---

## Python (Django / Flask / FastAPI) Setup

### 1. Install Dependencies

```bash
pip install sentry-sdk
```

### 2. Django

```python
# settings.py
import sentry_sdk

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    environment=os.environ.get("SENTRY_ENVIRONMENT", "development"),
    release=os.environ.get("SENTRY_RELEASE"),
    traces_sample_rate=0.2,
    profiles_sample_rate=0.1,
    send_default_pii=False,
)
```

The Django integration is auto-enabled and instruments views, middleware, template rendering, and database queries.

### 3. Flask

```python
# app.py
import sentry_sdk
from flask import Flask

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    environment=os.environ.get("SENTRY_ENVIRONMENT", "development"),
    release=os.environ.get("SENTRY_RELEASE"),
    traces_sample_rate=0.2,
)

app = Flask(__name__)
```

### 4. FastAPI

```python
# main.py
import sentry_sdk
from fastapi import FastAPI

sentry_sdk.init(
    dsn=os.environ.get("SENTRY_DSN"),
    environment=os.environ.get("SENTRY_ENVIRONMENT", "development"),
    release=os.environ.get("SENTRY_RELEASE"),
    traces_sample_rate=0.2,
    profiles_sample_rate=0.1,
)

app = FastAPI()
```

---

## Releases and Environments

### Creating a Release

```bash
export SENTRY_RELEASE=$(git rev-parse --short HEAD)

sentry-cli releases new "$SENTRY_RELEASE"
sentry-cli releases set-commits "$SENTRY_RELEASE" --auto
sentry-cli releases files "$SENTRY_RELEASE" upload-sourcemaps ./dist
sentry-cli releases finalize "$SENTRY_RELEASE"
sentry-cli releases deploys "$SENTRY_RELEASE" new \
  --env "$SENTRY_ENVIRONMENT" \
  --name "deploy-$(date +%s)"
```

### Environment Best Practices

- Use consistent environment names across all projects: `production`, `staging`, `development`.
- Set the environment in `Sentry.init()` and when creating deploys.
- Use Sentry's environment filter in the Issues and Performance dashboards to focus on the right data.

---

## Verification Checklist

After setup, verify everything works:

1. **Trigger a test error:**
   ```ts
   // Temporarily add to a route or page
   Sentry.captureException(new Error("Sentry setup verification"));
   ```
2. **Check Sentry dashboard** — The test error should appear within 30 seconds.
3. **Verify source maps** — The stack trace should show your original source code, not minified bundles.
4. **Check performance** — Navigate your app and verify transactions appear in the Performance dashboard.
5. **Remove the test error** after verification.
