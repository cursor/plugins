# Skill: Optimizing Prisma Queries

## Description

This skill covers techniques for detecting and resolving performance issues in Prisma queries, including N+1 query detection, query batching, raw query usage, and indexing strategies.

## Prerequisites

- A working Prisma setup with `@prisma/client` installed
- Access to database query logs or Prisma query logging enabled

## Steps

### 1. Enable Query Logging

Enable Prisma's built-in query logging to identify slow queries:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'warn' },
    { emit: 'stdout', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`);
  console.log(`Params: ${e.params}`);
  console.log(`Duration: ${e.duration}ms`);
  console.log('---');
});
```

Use this to establish a baseline and identify queries that take longer than expected.

### 2. Detect N+1 Queries

N+1 queries are the most common performance issue with ORMs. They occur when you fetch a list of records and then individually query related data for each record.

**Symptoms:**
- Many similar queries appearing in logs during a single request
- Query count grows linearly with the size of a result set
- Slow API responses that worsen as data grows

**Detection pattern — look for loops with nested queries:**

```typescript
// BAD: N+1 — 1 query for users + N queries for posts
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({
    where: { authorId: user.id },
  });
  user.posts = posts;
}
```

**Fix — use `include` or `select` to eager-load relations:**

```typescript
// GOOD: 1-2 queries total
const users = await prisma.user.findMany({
  include: {
    posts: true,
  },
});
```

**Fix — for fine-grained control, use `select`:**

```typescript
// GOOD: Fetch only what you need
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    posts: {
      select: { id: true, title: true },
      where: { published: true },
      take: 5,
    },
  },
});
```

### 3. Optimize Relation Loading

Choose between `include` and `select` based on the use case:

| Approach | Use When |
|----------|----------|
| `include` | You need the full parent model plus related models |
| `select` | You need specific fields only (reduces payload) |
| Nested `select` within `include` | You need the full parent but only some fields from the relation |

**Avoid deep nesting** — deeply nested `include` chains can generate complex joins:

```typescript
// CAUTION: Deep nesting generates heavy queries
const data = await prisma.user.findMany({
  include: {
    posts: {
      include: {
        comments: {
          include: {
            author: true,
          },
        },
      },
    },
  },
});
```

Consider breaking deeply nested queries into separate, targeted queries.

### 4. Use Batch Operations

Replace loops with batch operations:

```typescript
// BAD: N individual inserts
for (const user of users) {
  await prisma.user.create({ data: user });
}

// GOOD: Single batch insert
await prisma.user.createMany({
  data: users,
  skipDuplicates: true,
});
```

Similarly for updates and deletes:

```typescript
// Batch update
await prisma.post.updateMany({
  where: { published: false, createdAt: { lt: cutoffDate } },
  data: { archived: true },
});

// Batch delete
await prisma.comment.deleteMany({
  where: { postId: deletedPostId },
});
```

### 5. Implement Cursor-Based Pagination

Avoid large offsets which force the database to scan and discard rows:

```typescript
// BAD: Offset pagination degrades at high page numbers
const page10 = await prisma.post.findMany({
  skip: 200,  // DB must scan 200 rows to discard them
  take: 20,
});

// GOOD: Cursor-based pagination — consistent performance
const nextPage = await prisma.post.findMany({
  take: 20,
  skip: 1,  // Skip the cursor itself
  cursor: { id: lastSeenId },
  orderBy: { createdAt: 'desc' },
});
```

### 6. Add Database Indexes

Identify fields that need indexes based on query patterns:

```prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  published Boolean
  authorId  String
  createdAt DateTime @default(now())

  // Index for filtering by author
  @@index([authorId])

  // Composite index for common query pattern
  @@index([published, createdAt])

  // Full-text search (PostgreSQL)
  @@index([title], type: Hash)
}
```

**When to add an index:**
- Fields used in `WHERE` clauses
- Fields used in `ORDER BY`
- Foreign key fields (Prisma does not auto-create these for all databases)
- Fields used in unique lookups (`findUnique`, `findFirst` with unique fields)

**Verify with `EXPLAIN`:**

```typescript
const plan = await prisma.$queryRaw`
  EXPLAIN ANALYZE
  SELECT * FROM "Post"
  WHERE "published" = true
  ORDER BY "createdAt" DESC
  LIMIT 20
`;
console.log(plan);
```

### 7. Use Raw Queries for Complex Operations

When the Prisma Client API cannot express a query efficiently, use parameterized raw queries:

```typescript
// Complex aggregation
const stats = await prisma.$queryRaw`
  SELECT
    DATE_TRUNC('month', "createdAt") AS month,
    COUNT(*)::int AS count,
    COUNT(*) FILTER (WHERE "published" = true)::int AS published_count
  FROM "Post"
  WHERE "createdAt" >= ${startDate}
  GROUP BY month
  ORDER BY month DESC
`;
```

**Rules for raw queries:**
- Always use tagged template literals (`$queryRaw\`...\``) for parameterization
- Never use `$queryRawUnsafe` — it is vulnerable to SQL injection
- Use raw queries only when the Prisma Client API cannot express the query

### 8. Optimize Connection Pooling

Configure the connection pool based on your deployment environment:

```
# Standard server (adjust based on available connections)
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=10"

# Serverless (minimal connections)
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=1&pool_timeout=10"

# With PgBouncer
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/db?pgbouncer=true&connection_limit=10"
```

For serverless at scale, consider using **Prisma Accelerate** for managed connection pooling and caching.

### 9. Use Prisma Middleware or Extensions for Monitoring

Track and log slow queries automatically:

```typescript
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient().$extends({
  query: {
    $allOperations({ operation, model, args, query }) {
      const start = performance.now();
      return query(args).finally(() => {
        const duration = performance.now() - start;
        if (duration > 100) {
          console.warn(
            `Slow query: ${model}.${operation} took ${duration.toFixed(1)}ms`
          );
        }
      });
    },
  },
});
```

## Verification

After applying optimizations, verify improvements:

1. **Compare query counts** — Ensure N+1 patterns are eliminated (query count should not grow with result set size).
2. **Measure response times** — Use query logging to compare before and after durations.
3. **Check execution plans** — Use `EXPLAIN ANALYZE` to verify indexes are being used.
4. **Load test** — Test with realistic data volumes to ensure optimizations hold under load.

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Over-fetching with `include` | Use `select` to fetch only needed fields |
| Missing indexes on foreign keys | Add `@@index` for all relation fields |
| Using offset pagination for large tables | Switch to cursor-based pagination |
| Individual inserts in a loop | Use `createMany` or `$transaction` |
| Not monitoring query performance | Enable Prisma query logging in development |
| Using `queryRawUnsafe` | Always use parameterized `$queryRaw` |
