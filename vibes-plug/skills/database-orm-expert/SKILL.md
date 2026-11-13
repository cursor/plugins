---
name: database-orm-expert
description: "Updated to be the unified database skill covering ORM, migrations, edge DBs, and Supabase CLI / Keahlian database terpadu untuk ORM, migrasi, edge DB, dan Supabase CLI."
author: "Roedy Rustam"
version: "4.3.0"
---

# Unified Database & ORM Expert

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Design schemas, select ORMs, execute zero-downtime migrations, optimize queries, and implement edge serverless databases. Covers Prisma 6, Drizzle ORM, TypeORM, Supabase CLI workflows, and Edge DBs (Neon, Cloudflare D1, Turso, Upstash).

### Trigger Conditions
- Designing or migrating a production schema (blue-green, canary).
- Choosing between Prisma, Drizzle ORM, or TypeORM.
- Writing complex queries with joins, aggregations, or pagination.
- Optimizing slow queries or N+1 problems.
- Building edge-compatible serverless database connections.
- Executing Supabase migrations and RLS patterns.
- Managing backward-compatible massive data backfills.

## Orchestration & Integration
- `js-backend-expert`: For Node/Bun/Deno backend implementations integrating these ORMs.
- `ci-cd-devops-architect`: For automated migration deployment steps.
- `supabase-security-expert`: For Supabase RLS and security.
- `cloud-hosting-expert`: For infrastructure integration.

---

### Core ORM & Query Strategies

#### ORM Selection Guide
| Criteria | Prisma 6 | Drizzle ORM | TypeORM |
|---|---|---|---|
| **Type Safety** | Schema-generated types | SQL-like, inferred types | Decorator-based |
| **Bundle Size** | Heavy (binary client) | Lightweight (<35KB) | Medium |
| **Query Style** | Fluent ORM API | SQL-first, composable | ActiveRecord / QueryBuilder |
| **Edge Runtime** | Prisma Accelerate needed | Native edge support | No |
| **Migrations** | `prisma migrate dev` | `drizzle-kit push/migrate` | `synchronize` (dev only) |

**Recommendation**: Use **Drizzle ORM** for edge-compatible apps and performance-critical systems. Use **Prisma 6** for teams preferring a schema-first DX.

#### Prisma 6 Best Practices
- Use `$transaction` for atomic operations.
- Avoid N+1 queries by using `select` and `include` (with Prisma 5.7+ relationJoins preview) rather than looping over `findMany`.

#### Drizzle ORM Best Practices
- Use `drizzle-kit generate` for generating SQL and `drizzle-kit migrate` for deployment.
- Utilize native edge support and type-safe query builders with `drizzle-orm`.

#### Query Optimization Principles
1. **Always index foreign keys** and columns used in `WHERE`, `ORDER BY`, and `JOIN`.
2. **Use `EXPLAIN ANALYZE`** to detect sequential scans.
3. **Cursor-based pagination** over offset for large datasets.
4. **Avoid `SELECT *`**. Batch inserts where possible.
5. **Connection Pooling**: Use PgBouncer, Supabase's built-in pooler, or Prisma Accelerate for standard TCP to avoid exhausting connection limits. Alternatively, use HTTP/WebSocket drivers for edge queries.

---

### Zero-Downtime Migrations & Versioning

#### 1. Zero-Downtime Migration Pattern (Expand and Contract)
Never make breaking changes in a single deployment.
- **Phase 1 (Expand)**: Add the new schema element (column, table) without removing the old one.
- **Phase 2 (Migrate)**: Update app to write to *both* and read from the new element (with fallback).
- **Phase 3 (Backfill)**: Run background script to backfill data to new element.
- **Phase 4 (Contract)**: Remove old application code.
- **Phase 5 (Cleanup)**: Drop old schema element in next deployment.

#### 2. Backward Compatibility Rules
- **Never `DROP` or `RENAME`** a column/table in active use.
- **Add `DEFAULT` values** to new `NOT NULL` columns.

#### 3. Migration Mechanics & Safe Data Backfilling
- **Never run `prisma db push` or `synchronize: true`** in production. Always use immutable version-controlled scripts (e.g., `20260814_add_user_status.sql`).
- Write idempotent scripts (`CREATE TABLE IF NOT EXISTS`).
- **Chunking**: For large tables, perform updates in batches (using `LIMIT` and sleep intervals) to prevent table locking. Use background jobs (BullMQ/Inngest).

---

### Edge & Serverless Drivers

Exploit serverless DBs for ultra-low latency:
- **Neon & Cloudflare D1**: Serverless autoscaling Postgres with instant branching; Distributed edge SQLite.
- **Embedded Replicas**: Sync edge SQLite read-replicas with central cloud DBs.
- **HTTP/WebSocket Proxy Pooling**: Use `neon-http` or similar when querying databases from Edge Workers/Functions.
- **Upstash Redis Edge Caching**:
```typescript
import { Redis } from '@upstash/redis';
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
export async function getCachedData(key: string) {
  let data = await redis.get(key);
  if (!data) {
    data = await fetchFromDB();
    await redis.set(key, data, { ex: 3600 });
  }
  return data;
}
```

---

### Supabase CLI & MCP Workflow

1. **Check Environment**: Ensure `supabase/migrations` directory exists.
2. **Review Available MCP Commands**: 
   - List existing migrations: `mcp_supabase-mcp-server_list_migrations` with `project_id`.
   - Confirm SQL before executing via server directly.
3. **Execute Command**:
   - Write SQL script locally: `npx supabase migration new [name]` -> writes to `supabase/migrations/<timestamp>_[name].sql`.
   - Test locally: `npx supabase migration up` or `npx supabase db reset`.
   - Apply remote: `npx supabase db push` (or use remote MCP `apply_migration`).
4. **Final Step**: If using RLS, explicitly add policies to new tables. Confirm completion with user.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Rancang skema, pilih ORM, eksekusi migrasi tanpa downtime, optimalkan query, dan implementasikan edge serverless DB. Mencakup Prisma 6, Drizzle, TypeORM, Supabase CLI, dan Edge DBs (Neon, Cloudflare D1, Turso, Upstash).

### Kondisi Pemicu
- Merancang atau memigrasikan skema produksi (blue-green, canary).
- Memilih antara Prisma, Drizzle, atau TypeORM.
- Mengoptimalkan query lambat atau masalah N+1.
- Membuat koneksi serverless kompatibel dengan edge.
- Mengeksekusi migrasi Supabase dan pola RLS.
- Mengelola backfill data besar secara backward-compatible.

## Integrasi Orkestrasi
- `js-backend-expert`: Untuk implementasi Node/Bun/Deno.
- `ci-cd-devops-architect`: Untuk otomatisasi langkah deployment migrasi.
- `supabase-security-expert`: Untuk RLS dan keamanan Supabase.
- `cloud-hosting-expert`: Untuk integrasi infrastruktur.

### Strategi Inti ORM & Query
- **Drizzle ORM** direkomendasikan untuk aplikasi edge, **Prisma 6** untuk DX schema-first.
- Gunakan `$transaction` dan batasi `SELECT *`.
- Selalu indeks foreign key dan gunakan pagination berbasis cursor (Cursor-based pagination).
- **Connection Pooling**: Gunakan pooler bawaan Supabase, PgBouncer, Prisma Accelerate, atau driver HTTP (seperti `neon-http`) untuk request edge.

### Migrasi Tanpa Downtime & Versioning
- **Pola Expand and Contract**: Jangan pernah melakukan breaking change dalam satu rilis. Tambah kolom baru, update kode untuk memakai keduanya, backfill data, hapus kode lama, lalu drop kolom lama.
- Jangan gunakan `DROP` atau `RENAME` pada kolom aktif. Kolom `NOT NULL` baru harus memiliki nilai `DEFAULT`.
- **Jangan jalankan `prisma db push` atau `synchronize: true`** di produksi. Gunakan skrip migrasi bertahap (idempoten).
- **Backfill Aman**: Gunakan pemrosesan batch/chunking dengan background job untuk tabel raksasa agar tidak menyebabkan table lock.

### Driver Edge & Serverless
- Manfaatkan Neon Serverless Postgres, Cloudflare D1, Turso, atau Upstash Redis (caching).
- Gunakan driver berbasis HTTP/WebSocket di lingkungan Edge Workers untuk mencegah habisnya batas koneksi TCP.

### Alur Kerja Supabase CLI & MCP
1. Pastikan folder `supabase/migrations` ada. 
2. Periksa migrasi dengan `mcp_supabase-mcp-server_list_migrations`.
3. Buat file migrasi lokal dengan `npx supabase migration new [nama]`.
4. Uji lokal dengan `npx supabase migration up`.
5. Deploy remote dengan `npx supabase db push` atau melalui MCP.
6. Tambahkan kebijakan RLS jika diperlukan. Konfirmasikan sukses ke pengguna.