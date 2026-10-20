---
name: cloud-hosting-expert
description: "Expert guide for deploying SaaS applications with multiple entry points on modern edge and serverless platforms like Vercel and Cloudflare / Panduan ahli untuk mendeploy aplikasi SaaS dengan multiple entry points di platform edge dan serverless modern seperti Vercel dan Cloudflare."
author: "Roedy Rustam"
version: "4.3.0"
---

# Cloud Hosting Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert guide for deploying SaaS applications and their multiple entry points (landing page, app, super admin subdomain) on modern edge and serverless platforms. Covers Vercel, Cloudflare Workers & Pages, Railway, Fly.io, and **Cloudflare Workers AI** for AI-powered edge workloads.

### Trigger Conditions
- Deploying a Next.js, Hono, or Astro application to Vercel, Cloudflare, or Railway.
- Configuring custom domains and subdomain routing (e.g., `app.domain.com`, `admin.domain.com`).
- Setting up Edge Middleware for multi-tenant tenant identification.
- Deploying AI inference workloads to **Cloudflare Workers AI**.
- Deploying long-running backend services to **Railway** or **Fly.io**.
- Implementing CDN caching strategies for SaaS applications.

### Platform Selection Guide (2026)

| Platform | Best For | Free Tier | Cold Start |
|---|---|---|---|
| **Vercel** | Next.js, static, serverless functions | ✅ | ~200ms |
| **Cloudflare Workers** | Ultra-low latency APIs, edge logic | ✅ (100k req/day) | ~0ms |
| **Cloudflare Pages** | Static + full-stack (via Workers) | ✅ | ~0ms |
| **Railway** | Node.js/Go/Python long-running services, Bun | ✅ (5$/mo credit) | None |
| **Fly.io** | Docker containers, global distribution | ✅ (3 shared VMs) | ~500ms |
| **Render** | Node.js/Go/Python persistent services | ✅ (spins down) | ~30s |

### Multi-Entry Point Deployment Architecture

For SaaS applications, separate deployments for each entry point:
```
myapp.com         → Vercel (Marketing/Landing — Next.js static)
app.myapp.com     → Vercel (SaaS App — Next.js dynamic)
admin.myapp.com   → Vercel (Super Admin — Next.js, restricted access)
api.myapp.com     → Railway/Fly.io (Backend API — long-running)
cdn.myapp.com     → Cloudflare R2 (Static assets & user uploads)
```

### Vercel — Next.js Deployment

#### Multi-Domain Configuration
```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/$1" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" }
      ]
    }
  ]
}
```

#### Edge Middleware for Tenant Routing
```typescript
// middleware.ts — runs at the edge before every request
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';
  const subdomain = hostname.split('.')[0];

  // Route admin subdomain — enforce strict auth check
  if (subdomain === 'admin') {
    const adminToken = request.cookies.get('admin-session')?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Identify tenant from subdomain for multi-tenant apps
  if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'admin') {
    const response = NextResponse.next();
    response.headers.set('x-tenant-slug', subdomain);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Cloudflare Workers — Edge APIs

#### Hono on Cloudflare Workers
```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { rateLimit } from '@/middleware/rateLimit';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({ origin: ['https://app.myapp.com'] }));
app.use('/api/*', rateLimit(100)); // 100 req/min via KV

app.get('/api/health', (c) => c.json({ status: 'ok', region: c.env.CF_REGION }));

app.get('/api/data', async (c) => {
  // Access Cloudflare D1 (SQLite at edge)
  const result = await c.env.DB.prepare('SELECT * FROM items LIMIT 20').all();
  return c.json(result.results);
});

export default app;
```

#### Cloudflare Workers AI (On-Device Edge Inference)
Run AI models directly at Cloudflare's edge — no external API calls needed:
```typescript
export default {
  async fetch(request: Request, env: Env) {
    const { text } = await request.json() as { text: string };

    // Run Llama 3 or Mistral at the edge
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: text }
      ],
      stream: true,
    });

    return new Response(response, {
      headers: { 'Content-Type': 'text/event-stream' }
    });
  }
};
```

Available models on Workers AI:
- `@cf/meta/llama-3.1-8b-instruct` — Fast general-purpose chat
- `@cf/mistral/mistral-7b-instruct-v0.2` — Fast instruction model
- `@cf/baai/bge-small-en-v1.5` — Text embedding (for RAG)
- `@cf/stabilityai/stable-diffusion-xl-base-1.0` — Image generation

### Railway — Bun / Node.js Long-Running Services
```dockerfile
# Dockerfile for Railway (Bun runtime)
FROM oven/bun:1.2-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["bun", "run", "src/server.ts"]
```

```toml
# railway.toml
[build]
builder = "DOCKERFILE"

[deploy]
startCommand = "bun run src/server.ts"
healthcheckPath = "/health"
healthcheckTimeout = 10
restartPolicyType = "ON_FAILURE"
```

### Environment Variables & Secrets Management
- **Vercel**: Use Vercel's built-in secrets panel — supports preview/production scoping.
- **Cloudflare**: Use `wrangler secret put SECRET_NAME` or the dashboard.
- **Railway**: Use Railway's variable groups for shared secrets across services.
- **Never** commit `.env` files — use `.env.example` as documentation only.

### Caching Strategy
```typescript
// Vercel: Cache API responses at the edge
export async function GET() {
  const data = await fetchData();
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    }
  });
}

// Cloudflare: Use Cache API
const cache = caches.default;
const cached = await cache.match(request);
if (cached) return cached;
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan ahli untuk men-deploy aplikasi SaaS dan multiple entry points-nya (landing page, aplikasi, subdomain super admin) di platform edge dan serverless modern. Mencakup Vercel, Cloudflare Workers & Pages, Railway, Fly.io, dan **Cloudflare Workers AI** untuk workload AI di edge.

### Kondisi Pemicu
- Men-deploy aplikasi Next.js, Hono, atau Astro ke Vercel, Cloudflare, atau Railway.
- Mengonfigurasi domain kustom dan routing subdomain (`app.domain.com`, `admin.domain.com`).
- Menyiapkan Edge Middleware untuk identifikasi tenant multi-tenant.
- Men-deploy workload inferensi AI ke **Cloudflare Workers AI**.
- Men-deploy layanan backend long-running ke **Railway** atau **Fly.io**.

---

### Panduan Pemilihan Platform (2026)

| Platform | Pilihan Terbaik Untuk | Tier Gratis | Cold Start |
|---|---|---|---|
| **Vercel** | Next.js, situs statis, serverless functions | ✅ | ~200ms |
| **Cloudflare Workers** | API latensi ultra-rendah, logika edge | ✅ (100k req/hari) | ~0ms |
| **Cloudflare Pages** | Statis + full-stack (via Workers) | ✅ | ~0ms |
| **Railway** | Layanan Node.js/Bun/Go/Python long-running | ✅ ($5 kredit/bln) | Nol |
| **Fly.io** | Kontainer Docker terdistribusi global | ✅ (3 shared VM) | ~500ms |

---

### Implementasi Pola Kunci (TypeScript)

#### 1. Edge Middleware untuk Routing Subdomain & Tenant (Next.js 15)
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') ?? '';
  const subdomain = hostname.split('.')[0];

  // Rute subdomain admin — tegakkan pemeriksaan otentikasi ketat
  if (subdomain === 'admin') {
    const sesiAdmin = request.cookies.get('admin-session')?.value;
    if (!sesiAdmin) {
      return NextResponse.redirect(new URL('/masuk', request.url));
    }
  }

  // Identifikasi tenant dari subdomain pada aplikasi multi-tenant
  if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'admin') {
    const response = NextResponse.next();
    response.headers.set('x-tenant-slug', subdomain);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

#### 2. Cloudflare Workers AI (Inferensi AI di Edge)
```typescript
export default {
  async fetch(request: Request, env: Env) {
    const { teks } = (await request.json()) as { teks: string };

    // Jalankan inferensi Llama 3.1 langsung di edge tanpa server eksternal
    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'Anda adalah asisten AI yang akurat.' },
        { role: 'user', content: teks },
      ],
      stream: true,
    });

    return new Response(response, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  },
};
```

#### 3. Railway Dockerfile untuk Runtime Bun Berkecepatan Tinggi
```dockerfile
FROM oven/bun:1.2-alpine
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["bun", "run", "src/server.ts"]
```