# Skill: Create a Cloudflare Worker

## Description

Step-by-step guide for creating a new Cloudflare Worker from scratch, including project setup, TypeScript configuration, bindings, local development, and deployment.

## Prerequisites

- Node.js 18+ installed
- A Cloudflare account (https://dash.cloudflare.com/sign-up)
- Wrangler CLI (`npm install -g wrangler`)

## Steps

### Step 1: Install Wrangler CLI

Install the Wrangler CLI globally:

```bash
npm install -g wrangler
```

Verify the installation:

```bash
wrangler --version
```

### Step 2: Authenticate

Log in to your Cloudflare account:

```bash
wrangler login
```

This opens a browser window for OAuth authentication. For CI/CD, use an API token:

```bash
export CLOUDFLARE_API_TOKEN="your-api-token"
```

Verify authentication:

```bash
wrangler whoami
```

### Step 3: Create a New Project

Scaffold a new Worker project:

```bash
wrangler init my-worker
```

Follow the prompts to select:
- **Type**: "Hello World" Worker, scheduled handler, or Durable Object
- **Language**: TypeScript (recommended) or JavaScript
- **Package manager**: npm, pnpm, or yarn

This creates the following project structure:

```
my-worker/
├── src/
│   └── index.ts          # Worker entry point
├── test/
│   └── index.spec.ts     # Vitest test file
├── wrangler.toml          # Wrangler configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies
└── vitest.config.ts       # Test configuration
```

Alternatively, create a project from a template:

```bash
npm create cloudflare@latest my-worker -- --template "cloudflare/workers-sdk/templates/worker-typescript"
```

### Step 4: Configure wrangler.toml

Edit `wrangler.toml` with your project settings:

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2025-12-01"
compatibility_flags = ["nodejs_compat"]

# Enable workers.dev subdomain for development
workers_dev = true

# Non-secret environment variables
[vars]
ENVIRONMENT = "development"
API_VERSION = "v1"

# Smart Placement — run near your back-end services
[placement]
mode = "smart"

# Observability
[observability]
enabled = true
```

### Step 5: Write Your Worker (Module Syntax)

Workers use ES module syntax with typed environment bindings:

```ts
// src/index.ts
export interface Env {
  ENVIRONMENT: string;
  API_VERSION: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Simple router
    switch (url.pathname) {
      case "/":
        return new Response("Hello from Cloudflare Workers!", {
          headers: { "Content-Type": "text/plain" },
        });

      case "/api/health":
        return Response.json({
          status: "healthy",
          environment: env.ENVIRONMENT,
          version: env.API_VERSION,
          timestamp: new Date().toISOString(),
        });

      default:
        return Response.json(
          { error: "Not Found" },
          { status: 404 }
        );
    }
  },
};
```

### Step 6: Add Bindings (KV, R2, D1)

Create the resources you need:

```bash
# Create a KV namespace
wrangler kv namespace create "CACHE"
# Output: Created namespace with id "abc123..."

# Create an R2 bucket
wrangler r2 bucket create "my-assets"

# Create a D1 database
wrangler d1 create "my-database"
# Output: Created database with id "def456..."
```

Add bindings to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "abc123..."  # Use the ID from the create command

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "my-assets"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "def456..."  # Use the ID from the create command
```

Update your `Env` interface:

```ts
export interface Env {
  CACHE: KVNamespace;
  ASSETS: R2Bucket;
  DB: D1Database;
  ENVIRONMENT: string;
  API_VERSION: string;
}
```

Generate TypeScript types from your bindings:

```bash
wrangler types
```

### Step 7: Add Secrets

Set encrypted secrets (never put these in `wrangler.toml`):

```bash
wrangler secret put API_TOKEN
# Enter secret value when prompted

wrangler secret put DATABASE_URL
```

Add secrets to your `Env` interface:

```ts
export interface Env {
  API_TOKEN: string;
  DATABASE_URL: string;
  // ... other bindings
}
```

### Step 8: Local Development

Start the local development server:

```bash
wrangler dev
```

This starts a local server (default: `http://localhost:8787`) with:
- Hot reloading on file changes
- Local KV, R2, and D1 emulation
- `console.log` output in the terminal

Test with real Cloudflare bindings:

```bash
wrangler dev --remote
```

Test your endpoints:

```bash
curl http://localhost:8787/
curl http://localhost:8787/api/health
```

### Step 9: Write Tests

Use Vitest with the Cloudflare Workers test utilities:

```ts
// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

describe("Worker", () => {
  it("responds with hello message on /", async () => {
    const request = new Request("http://localhost/");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("Hello from Cloudflare Workers!");
  });

  it("returns health check on /api/health", async () => {
    const request = new Request("http://localhost/api/health");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("healthy");
  });

  it("returns 404 for unknown routes", async () => {
    const request = new Request("http://localhost/unknown");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
  });
});
```

Run tests:

```bash
npx vitest run
```

### Step 10: Deploy

Deploy to Cloudflare:

```bash
# Deploy to workers.dev (preview)
wrangler deploy

# Deploy to a specific environment
wrangler deploy --env production
```

Verify the deployment:

```bash
# List recent deployments
wrangler deployments list

# Stream live logs
wrangler tail
```

Test your deployed Worker:

```bash
curl https://my-worker.<your-subdomain>.workers.dev/
curl https://my-worker.<your-subdomain>.workers.dev/api/health
```

### Step 11: Set Up Custom Domain (Optional)

Add a custom domain via the Cloudflare Dashboard or in `wrangler.toml`:

```toml
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

Or use a custom domain (no zone configuration needed):

```toml
routes = [
  { pattern = "api.yourdomain.com", custom_domain = true }
]
```

Deploy with the new route:

```bash
wrangler deploy
```

### Step 12: Set Up CI/CD (Optional)

GitHub Actions workflow for automated deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy Worker
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx vitest run
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy
```

## Project Structure (Full Example)

```
my-worker/
├── src/
│   ├── index.ts           # Worker entry point and router
│   ├── handlers/
│   │   ├── api.ts         # API route handlers
│   │   └── assets.ts      # Static asset handlers
│   ├── middleware/
│   │   ├── auth.ts        # Authentication middleware
│   │   └── cors.ts        # CORS middleware
│   ├── services/
│   │   ├── database.ts    # D1 query helpers
│   │   └── storage.ts     # R2/KV helpers
│   └── types.ts           # Env interface and shared types
├── migrations/
│   └── 0001_initial.sql   # D1 database migrations
├── test/
│   └── index.spec.ts      # Tests
├── wrangler.toml           # Wrangler configuration
├── tsconfig.json
├── package.json
└── vitest.config.ts
```

## Troubleshooting

### "Binding not found" Errors

- Verify the binding name in `wrangler.toml` exactly matches the property name in your `Env` interface.
- Run `wrangler types` to regenerate TypeScript types from your configuration.
- Ensure you're using `env.<BINDING>` (module syntax), not global variables.

### CPU Time Exceeded

- Profile with `wrangler dev --local` and Chrome DevTools.
- Move heavy computation to a Queue consumer or Durable Object.
- Use `ctx.waitUntil()` for non-critical background work.

### "Module not found" Errors

- Ensure the `main` field in `wrangler.toml` points to the correct entry file.
- Check that `tsconfig.json` includes the `src` directory.
- Run `wrangler types` to generate Cloudflare-specific type definitions.

### Local Development Issues

- Use `wrangler dev --local` for fully local emulation (no Cloudflare account needed).
- Use `wrangler dev --remote` when you need real Cloudflare bindings.
- Check that ports aren't conflicting (default: 8787).
