# Performance Optimization Guide

## Overview
This guide provides concrete performance optimization patterns for production applications. It covers frontend performance (Core Web Vitals), backend optimization (database, caching, API), and infrastructure tuning.

---

## 1. Core Web Vitals Optimization

### LCP (Largest Contentful Paint) < 2.5s

```typescript
// app/layout.tsx — Font optimization
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevent FOIT (Flash of Invisible Text)
  preload: true,
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

```typescript
// components/hero-image.tsx — Image optimization
import Image from 'next/image';

export function HeroImage() {
  return (
    <Image
      src="/hero.webp"
      alt="Product hero image"
      width={1200}
      height={630}
      priority          // Preload above-the-fold images
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px"
      quality={85}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."  // Base64 placeholder
    />
  );
}
```

### INP (Interaction to Next Paint) < 200ms

```typescript
// Pattern: Defer expensive computations
'use client';
import { useTransition, useState } from 'react';

export function SearchResults() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value); // Urgent: update input immediately

    startTransition(() => {
      // Non-urgent: defer expensive filtering
      const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(value.toLowerCase())
      );
      setResults(filtered);
    });
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search products..."
      />
      {isPending ? <Skeleton /> : <ProductGrid products={results} />}
    </div>
  );
}
```

### CLS (Cumulative Layout Shift) < 0.1

```css
/* Prevent layout shifts with explicit dimensions */
.hero-image {
  aspect-ratio: 16 / 9;
  width: 100%;
  height: auto;
}

/* Reserve space for dynamic content */
.ad-slot {
  min-height: 250px;
  contain: layout;
}

/* Prevent font swap shifts */
@font-face {
  font-family: 'Inter';
  font-display: swap;
  size-adjust: 100%;
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 0%;
}
```

---

## 2. Bundle Optimization

### Dynamic Imports & Code Splitting

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(
  () => import('@/components/rich-text-editor'),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
    ssr: false, // Client-only component
  }
);

const ChartDashboard = dynamic(
  () => import('@/components/chart-dashboard'),
  {
    loading: () => <Skeleton className="h-96 w-full" />,
  }
);
```

### Tree-Shaking Friendly Imports

```typescript
// ❌ Bad: Imports entire library
import _ from 'lodash';
const result = _.groupBy(items, 'category');

// ✅ Good: Import only what you need
import groupBy from 'lodash/groupBy';
const result = groupBy(items, 'category');

// ✅ Best: Use native alternatives
const result = Object.groupBy(items, (item) => item.category);
```

### Bundle Analysis

```bash
# Next.js bundle analyzer
npm install @next/bundle-analyzer

# next.config.ts
import withBundleAnalyzer from '@next/bundle-analyzer';
const config = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })({
  // ... your config
});

# Run analysis
ANALYZE=true npm run build
```

---

## 3. Database Performance

### Query Optimization Patterns

```sql
-- 1. Add compound indexes for common query patterns
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at DESC);

-- 2. Use partial indexes for filtered queries
CREATE INDEX idx_orders_pending
  ON orders (created_at DESC)
  WHERE status = 'pending';

-- 3. Use covering indexes to avoid table lookups
CREATE INDEX idx_products_catalog
  ON products (category_id, status)
  INCLUDE (name, price, image_url);

-- 4. Profile slow queries
SET log_min_duration_statement = 100; -- Log queries > 100ms

-- 5. EXPLAIN ANALYZE to verify index usage
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders
WHERE user_id = 'user_123' AND status = 'pending'
ORDER BY created_at DESC
LIMIT 20;
```

### Connection Pooling Configuration

```typescript
// lib/db/index.ts — Optimized for serverless
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const connectionString = process.env.DATABASE_URL!;

const client = globalForDb.conn ?? postgres(connectionString, {
  max: parseInt(process.env.DB_POOL_SIZE ?? '10'),
  idle_timeout: 20,       // Close idle connections after 20s
  connect_timeout: 10,    // Fail fast on connection issues
  prepare: false,         // Required for transaction poolers (PgBouncer/Supavisor)
  max_lifetime: 60 * 30,  // Recycle connections every 30 min
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.conn = client;
}

export const db = drizzle(client, { schema });
```

---

## 4. Caching Strategy

### Multi-Tier Caching Architecture

```
Request Flow:
  Client → Browser Cache → CDN Edge → App Cache (Redis) → Database
           (immutable)     (30s-1h)    (5min-1h)          (source)
```

### Application Cache (Redis)

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface CacheConfig {
  ttl: number;      // Time to live in seconds
  staleWhileRevalidate?: number; // Serve stale while refreshing
}

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig = { ttl: 300 }
): Promise<T> {
  // Try cache first
  const cached = await redis.get<{ data: T; timestamp: number }>(key);

  if (cached) {
    const age = (Date.now() - cached.timestamp) / 1000;

    // Fresh cache — return immediately
    if (age < config.ttl) {
      return cached.data;
    }

    // Stale but within revalidation window — return stale, refresh in background
    if (config.staleWhileRevalidate && age < config.ttl + config.staleWhileRevalidate) {
      // Fire-and-forget background refresh
      refreshCache(key, fetcher, config.ttl).catch(console.error);
      return cached.data;
    }
  }

  // Cache miss or expired — fetch fresh data
  return refreshCache(key, fetcher, config.ttl);
}

async function refreshCache<T>(key: string, fetcher: () => Promise<T>, ttl: number): Promise<T> {
  const data = await fetcher();
  await redis.set(key, { data, timestamp: Date.now() }, { ex: ttl * 2 });
  return data;
}

// Cache invalidation helper
export async function invalidateCache(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// Usage
const products = await cached(
  `products:category:${categoryId}`,
  () => db.select().from(products).where(eq(products.categoryId, categoryId)),
  { ttl: 300, staleWhileRevalidate: 60 }
);
```

### HTTP Cache Headers

```typescript
// next.config.ts — Static asset caching
const config: NextConfig = {
  async headers() {
    return [
      {
        // Immutable static assets (hashed filenames)
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Public images
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=43200',
          },
        ],
      },
      {
        // API responses — no cache by default
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
    ];
  },
};
```

---

## 5. API Performance

### Request Batching & Deduplication

```typescript
// lib/data-loader.ts — Batch database queries
import DataLoader from 'dataloader';
import { db } from './db';
import { users } from './db/schema';
import { inArray } from 'drizzle-orm';

// Create per-request loader (do NOT share across requests)
export function createUserLoader() {
  return new DataLoader<string, typeof users.$inferSelect | null>(
    async (ids) => {
      const results = await db
        .select()
        .from(users)
        .where(inArray(users.id, [...ids]));

      const map = new Map(results.map(u => [u.id, u]));
      return ids.map(id => map.get(id) ?? null);
    },
    { maxBatchSize: 100, cache: true }
  );
}
```

### Response Compression & Streaming

```typescript
// app/api/export/route.ts — Stream large responses
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Stream header
      controller.enqueue(encoder.encode('['));

      let first = true;
      const cursor = db.select().from(records).prepare('export_cursor');

      for await (const batch of cursor.execute()) {
        for (const record of batch) {
          if (!first) controller.enqueue(encoder.encode(','));
          controller.enqueue(encoder.encode(JSON.stringify(record)));
          first = false;
        }
      }

      controller.enqueue(encoder.encode(']'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

---

## Performance Budget

| Metric | Target | Tool |
|--------|--------|------|
| LCP | < 2.5s | Lighthouse, CrUX |
| INP | < 200ms | Lighthouse, CrUX |
| CLS | < 0.1 | Lighthouse, CrUX |
| TTFB | < 800ms | WebPageTest |
| Total JS | < 200KB gzip | Bundle analyzer |
| Total CSS | < 50KB gzip | Bundle analyzer |
| Lighthouse | ≥ 90 | Lighthouse CI |
| API p99 | < 500ms | APM (Sentry/Datadog) |
| DB query p99 | < 100ms | EXPLAIN ANALYZE |

---

## Conclusion
Performance is not an optimization — it's a feature. Measure before optimizing, focus on real user metrics (Core Web Vitals), and implement caching at every layer. The fastest request is the one you never make.
