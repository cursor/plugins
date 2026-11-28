---
name: api-design-expert
description: "Expert guide for designing robust APIs: REST best practices, GraphQL, gRPC, tRPC, OpenAPI/Swagger, API versioning, rate limiting, and contract-first design / Panduan ahli untuk merancang API yang kuat: praktik terbaik REST, GraphQL, gRPC, tRPC, OpenAPI/Swagger, versioning API, rate limiting, dan desain contract-first."
author: "Roedy Rustam"
version: "4.3.0"
---

# API Design Expert

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Expert guide for designing, documenting, and evolving production-grade APIs. Covers **REST** resource modeling and HTTP semantics, **GraphQL** schema design, **gRPC** with protobuf, and **tRPC** for end-to-end type-safe APIs in TypeScript monorepos. Includes OpenAPI 3.1 documentation, API versioning strategies, rate limiting, idempotency, and contract-first development workflows.

### Trigger Conditions
- Designing a new API from scratch (REST, GraphQL, gRPC, or tRPC).
- Evolving an existing API without breaking clients.
- Documenting APIs with OpenAPI/Swagger.
- Implementing rate limiting, throttling, or idempotency.
- Choosing between REST, GraphQL, gRPC, and tRPC.
- Designing webhook systems.
- Implementing API authentication (API keys, JWT, OAuth2).

---

### API Protocol Selection Guide

| Criteria | REST | GraphQL | gRPC | tRPC |
|---|---|---|---|---|
| **Type Safety** | Manual (OpenAPI) | Schema-enforced | Protobuf | End-to-end TS |
| **Performance** | Good | Good | Excellent (HTTP/2) | Good |
| **Browser Support** | Native | Native | Needs proxy | TS/JS only |
| **Streaming** | SSE / WebSocket | Subscriptions | Native bi-directional | SSE |
| **Best For** | Public APIs, mobile | Complex data graphs | Microservice-to-service | Next.js full-stack |
| **Tooling** | Universal | Rich ecosystem | Strong (Go, Java) | Next.js / Expo |

---

### REST API Design Principles

#### Resource Naming Conventions
```
Collection:  GET    /api/v1/posts
Item:        GET    /api/v1/posts/{id}
Sub-resource:GET    /api/v1/posts/{id}/comments
Action:      POST   /api/v1/posts/{id}/publish   (use sparingly)

AVOID: /api/v1/getPosts, /api/v1/createPost, /api/v1/deletePost/{id}
```

#### HTTP Method Semantics
| Method | Idempotent | Safe | Use Case |
|---|---|---|---|
| `GET` | Yes | Yes | Retrieve resources |
| `POST` | No | No | Create resources, trigger actions |
| `PUT` | Yes | No | Replace entire resource |
| `PATCH` | No | No | Partial update |
| `DELETE` | Yes | No | Remove resource |

#### Consistent Response Structure
```typescript
// Success response
{
  "data": { "id": "usr_01", "email": "user@example.com" },
  "meta": { "requestId": "req_xyz", "timestamp": "2026-01-01T00:00:00Z" }
}

// Paginated list response
{
  "data": [...],
  "meta": {
    "total": 1234,
    "page": 2,
    "pageSize": 20,
    "hasNextPage": true,
    "nextCursor": "eyJpZCI6"
  }
}

// Error response (RFC 9457 Problem Details)
{
  "type": "https://api.example.com/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "detail": "The 'email' field must be a valid email address.",
  "instance": "/api/v1/users",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

#### HTTP Status Codes — Correct Usage
```
200 OK          — Successful GET, PUT, PATCH
201 Created     — Successful POST (include Location header)
204 No Content  — Successful DELETE
400 Bad Request — Invalid request body or params
401 Unauthorized— Missing or invalid authentication
403 Forbidden   — Authenticated but not authorized
404 Not Found   — Resource not found
409 Conflict    — Duplicate key, version conflict
422 Unprocessable Entity — Validation failure
429 Too Many Requests    — Rate limit exceeded (include Retry-After)
500 Internal Server Error— Unexpected server error
```

---

### API Versioning Strategies

```
Strategy 1 — URL Path (Recommended for public APIs):
  GET /api/v1/users
  GET /api/v2/users

Strategy 2 — Header:
  GET /api/users
  Accept: application/vnd.example.v2+json

Strategy 3 — Query Parameter (Avoid in production):
  GET /api/users?version=2
```

**Rules for non-breaking changes** (no version bump needed):
- Adding new optional fields to responses.
- Adding new optional request parameters.
- Adding new endpoints.

**Breaking changes** (require new version):
- Removing or renaming fields.
- Changing field types.
- Changing error response structure.

---

### tRPC — End-to-End Type Safety

```typescript
// server/router.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.context<Context>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});

export const appRouter = router({
  users: router({
    list: publicProcedure
      .input(z.object({ page: z.number().int().min(1).default(1) }))
      .query(async ({ input, ctx }) => {
        return ctx.db.user.findMany({ skip: (input.page - 1) * 20, take: 20 });
      }),
    create: protectedProcedure
      .input(z.object({ email: z.string().email(), name: z.string().min(2) }))
      .mutation(async ({ input, ctx }) => {
        return ctx.db.user.create({ data: input });
      }),
  }),
});

export type AppRouter = typeof appRouter;
// Client automatically infers all types — no code generation needed
```

---

### Rate Limiting Implementation

```typescript
// Sliding window rate limit with Redis (using Upstash)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests/minute
  analytics: true,
  prefix: 'api:ratelimit',
});

// Next.js middleware usage
export async function rateLimitMiddleware(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    });
  }
}
```

---

### Idempotency for Mutations

```typescript
// Client sends Idempotency-Key header for safe retries
// POST /api/payments
// Idempotency-Key: a0e4b2c1-unique-uuid-here

async function handlePayment(req: Request) {
  const idempotencyKey = req.headers.get('idempotency-key');
  if (!idempotencyKey) return errorResponse(400, 'Idempotency-Key header required');

  // Check cache first
  const cached = await redis.get(`idempotency:${idempotencyKey}`);
  if (cached) return Response.json(JSON.parse(cached), { status: 200 });

  // Process payment
  const result = await processPayment(await req.json());

  // Cache result for 24 hours
  await redis.setex(`idempotency:${idempotencyKey}`, 86400, JSON.stringify(result));
  return Response.json(result, { status: 201 });
}
```

---

### OpenAPI 3.1 Documentation

```yaml
# openapi.yaml
openapi: "3.1.0"
info:
  title: Example API
  version: "1.0.0"
  description: "RESTful API for Example SaaS"

paths:
  /api/v1/users:
    get:
      operationId: listUsers
      summary: List all users
      tags: [Users]
      security: [{ bearerAuth: [] }]
      parameters:
        - name: page
          in: query
          schema: { type: integer, minimum: 1, default: 1 }
        - name: pageSize
          in: query
          schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
      responses:
        "200":
          description: Users list
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserListResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, `js-backend-expert`, dan `session-memory-manager` untuk memastikan arsitektur API yang tangguh dan terstandarisasi.

### Deskripsi
Panduan ahli untuk merancang, mendokumentasikan, dan mengembangkan API berkualitas produksi. Mencakup pemodelan resource **REST** dan semantik HTTP, desain skema **GraphQL**, **gRPC** dengan protobuf, dan **tRPC** untuk API end-to-end type-safe di TypeScript. Termasuk dokumentasi OpenAPI 3.1, strategi versioning API, rate limiting, idempotency, dan alur kerja contract-first.

### Kondisi Pemicu
- Merancang API baru dari nol (REST, GraphQL, gRPC, atau tRPC).
- Mengembangkan API yang ada tanpa merusak klien (*breaking changes*).
- Mendokumentasikan API dengan OpenAPI 3.1 / Swagger.
- Mengimplementasikan rate limiting, throttling, atau header idempotency.
- Memilih protokol API yang optimal (REST vs GraphQL vs gRPC vs tRPC).
- Merancang sistem webhook yang aman dengan verifikasi signature HMAC.

---

### Panduan Pemilihan Protokol API

| Kriteria | REST | GraphQL | gRPC | tRPC |
|---|---|---|---|---|
| **Type Safety** | Manual (OpenAPI) | Berbasis Skema | Protobuf | End-to-end TypeScript |
| **Performa** | Baik | Baik | Luar Biasa (HTTP/2) | Baik |
| **Dukungan Browser** | Native | Native | Butuh gRPC-Web proxy | Hanya TypeScript/JS |
| **Streaming** | SSE / WebSocket | Subscriptions | Native dua-arah | Server-Sent Events |
| **Kasus Terbaik** | API Publik & Mobile | Graf data relasional kompleks | Komunikasi Antar Microservice | Fullstack Next.js Monorepo |

---

### Pola Kunci Implementasi (TypeScript)

#### 1. Struktur Error Standar RFC 9457 (Problem Details)
```typescript
// Format standar penanganan error yang konsisten di seluruh endpoint
export interface ErrorDetailRFC9457 {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: Array<{ field: string; message: string }>;
}
```

#### 2. tRPC Router Type-Safe End-to-End
```typescript
import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.context<Context>().create();
export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  pengguna: router({
    daftar: publicProcedure
      .input(z.object({ halaman: z.number().int().min(1).default(1) }))
      .query(async ({ input, ctx }) => {
        return ctx.db.user.findMany({ skip: (input.halaman - 1) * 20, take: 20 });
      }),
    buat: publicProcedure
      .input(z.object({ email: z.string().email(), nama: z.string().min(2) }))
      .mutation(async ({ input, ctx }) => {
        return ctx.db.user.create({ data: input });
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

#### 3. Middleware Rate Limiting Berbasis Redis Sliding Window
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 request per menit
  analytics: true,
  prefix: 'api:ratelimit',
});

export async function middlewarePembatasLaju(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const { success, limit, remaining, reset } = await ratelimit.limit(ip);

  if (!success) {
    return new Response(JSON.stringify({ error: 'Terlalu Banyak Permintaan' }), {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
        'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    });
  }
}
```

#### 4. Kunci Idempotensi Mutasi Kritis (`Idempotency-Key`)
```typescript
export async function tanganiPembayaranIdempoten(req: Request) {
  const kunciIdempotensi = req.headers.get('idempotency-key');
  if (!kunciIdempotensi) {
    return Response.json({ error: 'Header Idempotency-Key wajib disertakan' }, { status: 400 });
  }

  // Cek cache Redis terlebih dahulu
  const hasilTersimpan = await redis.get(`idempotency:${kunciIdempotensi}`);
  if (hasilTersimpan) {
    return Response.json(JSON.parse(hasilTersimpan), { status: 200 });
  }

  // Proses transaksi finansial
  const hasil = await prosesTransaksi(await req.json());

  // Simpan hasil selama 24 jam untuk pengulangan aman
  await redis.setex(`idempotency:${kunciIdempotensi}`, 86400, JSON.stringify(hasil));
  return Response.json(hasil, { status: 201 });
}
```