---
name: cloudflare-workers-expert
description: "Expert guide for Cloudflare Workers ecosystem — Workers, D1 (SQLite at edge), KV, R2 (S3-compatible storage), Queues, Durable Objects, Hyperdrive, and Workers AI / Panduan ahli ekosistem Cloudflare Workers — Workers, D1, KV, R2, Queues, Durable Objects, Hyperdrive, dan Workers AI."
author: "Roedy Rustam"
version: "4.4.0"
---

# Cloudflare Workers Ecosystem Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects with: `brainstorming`, `zero-to-prod-orchestrator`, `js-backend-expert`, `database-orm-expert`, `api-design-expert`, `authentication-identity-expert`, `wasm-edge-computing-expert`, `ci-cd-devops-architect`, `cloud-hosting-expert`, `session-memory-manager`.

### Description
Expert guide for building full-stack edge applications using the **Cloudflare Workers** ecosystem. Covers Workers runtime, D1 (SQLite at edge), KV (key-value store), R2 (S3-compatible object storage), Queues (message queues), Durable Objects (stateful edge), Hyperdrive (database connection pooling), Workers AI (inference at edge), and Wrangler CLI for development and deployment.

### Trigger Conditions
- Building serverless edge applications on Cloudflare Workers.
- Using **D1** as an edge SQLite database.
- Storing files with **R2** (S3-compatible, zero egress fees).
- Implementing **KV** for distributed key-value caching.
- Building stateful applications with **Durable Objects**.
- Setting up **Queues** for async job processing at the edge.
- Connecting to external databases via **Hyperdrive** connection pooling.
- Running AI inference at the edge with **Workers AI**.
- Deploying with **Wrangler CLI** and `wrangler.toml` configuration.
- Using **Hono v4** as the web framework on Workers.

### What's New in 2026

#### Cloudflare Workers — Platform Updates
- **D1 GA**: SQLite at the edge — fully production-ready with point-in-time recovery, read replicas, and up to 10GB databases.
- **Queues GA**: Reliable message queues for async processing, dead letter queues, and batch consumption.
- **Hyperdrive GA**: Connection pooling for PostgreSQL, MySQL — eliminates cold connection latency from Workers.
- **Workers AI Stable**: Run LLM inference (Llama 3, Mistral, embedding models) at the edge with zero cold starts.
- **Durable Objects Hibernation**: Cost-effective stateful edge — objects hibernate when idle, wake instantly on request.
- **Workers Static Assets**: Serve static files directly from Workers without separate Pages deployment.
- **Node.js Compatibility Mode**: Import Node.js built-in modules (`node:crypto`, `node:buffer`, `node:streams`) directly in Workers.

### Core Architecture Patterns

#### 1. Project Setup (Wrangler + Hono)
```bash
# Create new Workers project with Hono
npm create cloudflare@latest my-app -- --framework=hono
cd my-app

# wrangler.toml configuration
```

```toml
# wrangler.toml
name = "my-app"
compatibility_date = "2026-10-01"
compatibility_flags = ["nodejs_compat_v2"]

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# KV Namespace
[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# R2 Bucket
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "my-app-assets"

# Queue Producer
[[queues.producers]]
queue = "email-queue"
binding = "EMAIL_QUEUE"

# Queue Consumer
[[queues.consumers]]
queue = "email-queue"
max_batch_size = 10
max_batch_timeout = 30

# Durable Object
[[durable_objects.bindings]]
name = "RATE_LIMITER"
class_name = "RateLimiter"

[[migrations]]
tag = "v1"
new_classes = ["RateLimiter"]

# Hyperdrive (PostgreSQL connection pooling)
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Workers AI
[ai]
binding = "AI"
```

#### 2. Hono Application on Workers
```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { bearerAuth } from 'hono/bearer-auth';

type Bindings = {
  DB: D1Database;
  CACHE: KVNamespace;
  STORAGE: R2Bucket;
  EMAIL_QUEUE: Queue;
  AI: Ai;
  HYPERDRIVE: Hyperdrive;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// D1 SQLite query
app.get('/api/products', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, price FROM products WHERE active = 1 ORDER BY created_at DESC LIMIT 50'
  ).all();
  return c.json(results);
});

// KV cache-aside pattern
app.get('/api/config/:key', async (c) => {
  const key = c.req.param('key');
  const cached = await c.env.CACHE.get(key, 'json');
  if (cached) return c.json(cached);

  const { results } = await c.env.DB.prepare(
    'SELECT value FROM config WHERE key = ?'
  ).bind(key).all();
  
  if (results.length > 0) {
    await c.env.CACHE.put(key, JSON.stringify(results[0]), { expirationTtl: 3600 });
    return c.json(results[0]);
  }
  return c.notFound();
});

// R2 file upload
app.post('/api/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const key = `uploads/${Date.now()}-${file.name}`;
  
  await c.env.STORAGE.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  
  return c.json({ key, url: `/files/${key}` });
});

// Queue producer — send async job
app.post('/api/send-email', async (c) => {
  const body = await c.req.json();
  await c.env.EMAIL_QUEUE.send({
    to: body.email,
    subject: body.subject,
    template: body.template,
  });
  return c.json({ status: 'queued' });
});

// Workers AI — text generation
app.post('/api/ai/generate', async (c) => {
  const { prompt } = await c.req.json();
  const response = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
  });
  return c.json(response);
});

export default app;

// Queue consumer handler
export default {
  ...app,
  async queue(batch: MessageBatch, env: Bindings): Promise<void> {
    for (const message of batch.messages) {
      const { to, subject, template } = message.body as EmailJob;
      await sendEmail(to, subject, template); // your email sending logic
      message.ack();
    }
  },
};
```

#### 3. D1 Migrations
```bash
# Create migration
wrangler d1 migrations create my-app-db create_products

# Write SQL migration
# migrations/0001_create_products.sql
```
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  description TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_created ON products(created_at DESC);
```
```bash
# Apply migration
wrangler d1 migrations apply my-app-db
```

#### 4. Durable Objects (Stateful Edge)
```typescript
export class RateLimiter implements DurableObject {
  private requests: number[] = [];
  private readonly limit = 100;
  private readonly windowMs = 60_000;

  constructor(private state: DurableObjectState, private env: Bindings) {}

  async fetch(request: Request): Promise<Response> {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    
    if (this.requests.length >= this.limit) {
      return new Response('Rate limit exceeded', { status: 429 });
    }
    
    this.requests.push(now);
    await this.state.storage.put('requests', this.requests);
    
    return new Response('OK', {
      headers: {
        'X-RateLimit-Remaining': String(this.limit - this.requests.length),
        'X-RateLimit-Limit': String(this.limit),
      },
    });
  }
}
```

#### 5. Hyperdrive (External Database Connection)
```typescript
import { Client } from 'pg';

app.get('/api/users', async (c) => {
  const client = new Client({ connectionString: c.env.HYPERDRIVE.connectionString });
  await client.connect();
  
  const { rows } = await client.query('SELECT id, email, name FROM users LIMIT 100');
  await client.end();
  
  return c.json(rows);
});
```

### Performance Best Practices
1. **Use D1 for read-heavy workloads** — SQLite at edge with automatic read replicas.
2. **KV for hot cache** — Sub-millisecond reads for configuration, feature flags, and session data.
3. **R2 for assets** — Zero egress fees, S3-compatible API.
4. **Queues for async work** — Decouple request handling from background processing.
5. **Hyperdrive for external DBs** — Connection pooling eliminates cold connection latency.
6. **Workers AI for inference** — Run models at edge without managing GPU infrastructure.
7. **Use `waitUntil()`** — For fire-and-forget operations (logging, analytics) after response is sent.

### Anti-Patterns to Avoid
1. **Storing large blobs in KV** — Use R2 for files >25MB. KV is for small values (<25MB).
2. **Opening new DB connections per request without Hyperdrive** — Cold connections add 50-200ms latency.
3. **Not using prepared statements with D1** — Always use `.prepare().bind()` to prevent SQL injection.
4. **Synchronous heavy computation** — Workers have a CPU time limit (10-30ms for free, 30s for paid). Offload to Queues.
5. **Ignoring `wrangler dev --remote`** — Use remote mode to test D1, R2, and KV with real data.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dengan: `brainstorming`, `zero-to-prod-orchestrator`, `js-backend-expert`, `database-orm-expert`, `api-design-expert`, `authentication-identity-expert`, `wasm-edge-computing-expert`, `ci-cd-devops-architect`, `cloud-hosting-expert`, `session-memory-manager`.

### Deskripsi
Panduan ahli untuk membangun aplikasi full-stack edge menggunakan ekosistem **Cloudflare Workers**. Mencakup runtime Workers, D1 (SQLite di edge), KV (key-value store), R2 (object storage kompatibel S3), Queues (antrean pesan), Durable Objects (stateful edge), Hyperdrive (connection pooling database), Workers AI (inferensi di edge), dan Wrangler CLI untuk pengembangan dan deployment.

### Kondisi Pemicu
- Membangun aplikasi edge serverless di Cloudflare Workers.
- Menggunakan **D1** sebagai database SQLite di edge.
- Menyimpan file dengan **R2** (kompatibel S3, tanpa biaya egress).
- Mengimplementasikan **KV** untuk caching key-value terdistribusi.
- Membangun aplikasi stateful dengan **Durable Objects**.
- Menyiapkan **Queues** untuk pemrosesan job async di edge.

### Pola Arsitektur Inti

#### 1. Ekosistem Cloudflare Workers
| Layanan | Fungsi | Analogi |
|:---|:---|:---|
| **Workers** | Runtime serverless di edge (V8 isolates) | AWS Lambda@Edge |
| **D1** | Database SQLite di edge | PlanetScale / Turso |
| **KV** | Key-value store terdistribusi | Redis (read-heavy) |
| **R2** | Object storage (S3-compatible) | AWS S3 (tanpa biaya egress) |
| **Queues** | Antrean pesan | AWS SQS / BullMQ |
| **Durable Objects** | State persisten di edge | Stateful actors |
| **Hyperdrive** | Connection pooling ke DB eksternal | PgBouncer di edge |
| **Workers AI** | Inferensi model AI di edge | Replicate / Together AI |

#### 2. Praktik Terbaik
- Gunakan **D1** untuk workload read-heavy di edge.
- Gunakan **KV** untuk cache panas (konfigurasi, feature flags, sesi).
- Gunakan **R2** untuk aset (tanpa biaya egress, API kompatibel S3).
- Gunakan **Queues** untuk pekerjaan async (email, notifikasi, pemrosesan gambar).
- Gunakan **Hyperdrive** untuk koneksi ke database PostgreSQL/MySQL eksternal.
- Gunakan **`waitUntil()`** untuk operasi fire-and-forget (logging, analitik) setelah respons dikirim.
