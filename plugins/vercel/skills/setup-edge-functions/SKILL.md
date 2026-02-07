# Skill: Set Up Edge Functions on Vercel

## Description

Guide for creating, configuring, and deploying Edge Functions on Vercel. Covers when to use edge vs. serverless, runtime configuration, practical examples, and performance optimization.

## When to Use Edge vs. Serverless

### Choose Edge Runtime When:

- **Low latency is critical** — Edge functions run on Vercel's global network, with sub-millisecond cold starts
- **Geographic proximity matters** — Code executes at the edge location nearest the user
- **Lightweight computation** — URL rewrites, authentication checks, A/B testing, feature flags
- **Streaming responses** — Real-time data, Server-Sent Events, LLM streaming
- **Middleware logic** — Request/response transformation before hitting origin

### Choose Node.js Serverless When:

- **Full Node.js API access** — `fs`, `child_process`, native modules
- **Heavy computation** — Image processing, PDF generation, data crunching
- **Large dependencies** — Libraries that exceed edge bundle size limits (1 MB compressed)
- **Database drivers** — Some database clients require Node.js-specific APIs
- **Long-running tasks** — Operations exceeding edge timeout (30 s on Pro)

### Quick Comparison

| Feature | Edge Runtime | Node.js Serverless |
|---|---|---|
| Cold start | ~0 ms | 250–1000+ ms |
| Max duration | 30 s (Pro) | 60–900 s (Pro/Enterprise) |
| Max bundle size | 1 MB (compressed) | 50 MB (compressed) |
| Node.js APIs | Subset (Web APIs) | Full |
| Global distribution | Yes (all regions) | Configurable regions |
| Streaming | Native | Supported |
| Cost | Lower per invocation | Higher per invocation |

## Step 1: Create an Edge Function (App Router)

Create a route handler with the edge runtime:

```ts
// app/api/hello/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') ?? 'World';

  return Response.json({
    message: `Hello, ${name}!`,
    region: process.env.VERCEL_REGION,
    timestamp: Date.now(),
  });
}
```

## Step 2: Create an Edge Function (Pages Router)

For projects using the Pages Router:

```ts
// pages/api/hello.ts
import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') ?? 'World';

  return Response.json({
    message: `Hello, ${name}!`,
    region: process.env.VERCEL_REGION,
  });
}
```

## Step 3: Edge Middleware

Middleware runs before every request and always uses the edge runtime:

```ts
// middleware.ts (project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Geo-based routing
  const country = request.geo?.country ?? 'US';

  if (country === 'DE') {
    return NextResponse.rewrite(new URL('/de', request.url));
  }

  // Add custom headers
  const response = NextResponse.next();
  response.headers.set('x-country', country);
  response.headers.set('x-region', process.env.VERCEL_REGION ?? 'unknown');

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

## Step 4: Streaming from Edge Functions

Edge functions are ideal for streaming responses:

```ts
// app/api/stream/route.ts
export const runtime = 'edge';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const items = ['Processing...', 'Analyzing...', 'Complete!'];

      for (const item of items) {
        controller.enqueue(encoder.encode(`data: ${item}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### Streaming with AI SDK

```ts
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'edge';

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
  });

  return result.toDataStreamResponse();
}
```

## Step 5: Authentication at the Edge

Verify JWTs and manage sessions at the edge for fast auth:

```ts
// app/api/protected/route.ts
import { jwtVerify } from 'jose';

export const runtime = 'edge';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Missing token' }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    return Response.json({ user: payload.sub, role: payload.role });
  } catch {
    return Response.json({ error: 'Invalid token' }, { status: 403 });
  }
}
```

## Step 6: Edge Config for Feature Flags

Use Vercel Edge Config for ultra-fast reads (~0 ms) at the edge:

```ts
// app/api/feature/route.ts
import { get } from '@vercel/edge-config';

export const runtime = 'edge';

export async function GET(request: Request) {
  const newDashboard = await get('feature_new_dashboard');

  if (newDashboard) {
    return Response.json({ dashboard: 'v2', features: ['charts', 'analytics'] });
  }

  return Response.json({ dashboard: 'v1', features: ['charts'] });
}
```

## Step 7: Configure Edge Functions in vercel.json

Fine-tune edge function behavior:

```json
{
  "functions": {
    "app/api/fast/**/*.ts": {
      "runtime": "edge",
      "regions": ["iad1", "sfo1", "lhr1", "hnd1"]
    },
    "app/api/compute/**/*.ts": {
      "memory": 1024,
      "maxDuration": 30,
      "regions": ["iad1"]
    }
  }
}
```

## Step 8: Test Edge Functions Locally

```bash
# Use Vercel CLI for local development
vercel dev

# Or use Next.js dev server (edge runtime is simulated)
npm run dev
```

Note: `vercel dev` provides a more accurate simulation of the edge runtime than `next dev`. Some Web APIs behave differently in the local simulation.

## Supported Web APIs in Edge Runtime

Edge functions support standard Web APIs:

- `fetch`, `Request`, `Response`, `Headers`
- `URL`, `URLSearchParams`, `URLPattern`
- `TextEncoder`, `TextDecoder`
- `ReadableStream`, `WritableStream`, `TransformStream`
- `crypto` (Web Crypto API)
- `atob`, `btoa`
- `setTimeout`, `setInterval` (limited)
- `AbortController`, `AbortSignal`
- `structuredClone`
- `console` methods

**Not supported** (use Node.js serverless instead):
- `fs`, `path`, `child_process`, `net`, `os`
- Node.js `Buffer` (use `Uint8Array`)
- `require()` (use `import`)
- Native Node.js modules / C++ addons

## Best Practices

1. **Keep bundles small** — Import only what you need. Avoid large libraries.
2. **Use Edge Config** for feature flags and configuration — reads are ~0 ms.
3. **Cache responses** — Set `Cache-Control` headers for cacheable GET requests.
4. **Handle errors gracefully** — Edge functions should never return raw errors to clients.
5. **Monitor performance** — Use Vercel Analytics and Speed Insights to track real-world latency.
6. **Use `waitUntil()`** — Defer logging and analytics to avoid blocking responses.
7. **Test locally** — Use `vercel dev` to simulate edge runtime behavior before deploying.
8. **Pin dependencies** — Lock dependency versions to avoid unexpected bundle size increases.

## Troubleshooting

### "Dynamic Code Evaluation Not Allowed"

Edge runtime doesn't support `eval()` or `new Function()`. Some libraries use these internally. Solutions:
- Find an edge-compatible alternative
- Move the function to Node.js serverless runtime
- Use `import()` for dynamic imports instead

### Bundle Size Exceeded

If your edge function exceeds 1 MB compressed:
- Audit imports with `npx @vercel/nft trace <file>`
- Replace heavy libraries with lighter alternatives
- Move to Node.js serverless if bundle reduction isn't feasible

### Unsupported API

If you get "X is not defined" errors:
- Check the supported Web APIs list above
- Use polyfills from `@vercel/edge` where available
- Switch to Node.js serverless for full Node.js API access
