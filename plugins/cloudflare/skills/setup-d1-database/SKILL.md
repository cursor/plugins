# Skill: Set Up a Cloudflare D1 Database

## Description

Step-by-step guide for creating a Cloudflare D1 database, writing migrations, designing schemas, and querying from Workers. D1 is Cloudflare's native serverless SQL database built on SQLite.

## Prerequisites

- Wrangler CLI installed (`npm install -g wrangler`)
- Authenticated with Cloudflare (`wrangler login`)
- An existing Worker project (see **Create a Worker** skill)

## Steps

### Step 1: Create a D1 Database

```bash
# Create a new D1 database
wrangler d1 create my-app-db

# Output:
# ✅ Successfully created DB 'my-app-db'
#
# [[d1_databases]]
# binding = "DB"
# database_name = "my-app-db"
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the output and add it to your `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Step 2: Create a Migrations Directory

```bash
mkdir -p migrations
```

Migrations are numbered SQL files that run in order. Create your first migration:

```bash
# Using wrangler (recommended)
wrangler d1 migrations create my-app-db create_initial_tables

# Output: Created migration: migrations/0001_create_initial_tables.sql
```

### Step 3: Write the Initial Schema

Edit `migrations/0001_create_initial_tables.sql`:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create index on email for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(status, published_at DESC)
  WHERE status = 'published';

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Post-tag relationship (many-to-many)
CREATE TABLE IF NOT EXISTS post_tags (
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);
```

### Step 4: Apply Migrations Locally

Apply migrations to the local D1 database for development:

```bash
# Apply all pending migrations locally
wrangler d1 migrations apply my-app-db --local

# Verify the tables were created
wrangler d1 execute my-app-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### Step 5: Seed Development Data (Optional)

Create a seed file `migrations/seed.sql`:

```sql
-- Seed users
INSERT INTO users (id, email, name, role) VALUES
  ('user_001', 'alice@example.com', 'Alice', 'admin'),
  ('user_002', 'bob@example.com', 'Bob', 'user'),
  ('user_003', 'carol@example.com', 'Carol', 'moderator');

-- Seed tags
INSERT INTO tags (id, name) VALUES
  ('tag_001', 'typescript'),
  ('tag_002', 'cloudflare'),
  ('tag_003', 'workers');

-- Seed posts
INSERT INTO posts (id, user_id, title, slug, content, status, published_at) VALUES
  ('post_001', 'user_001', 'Getting Started with D1', 'getting-started-with-d1',
   'D1 is Cloudflare''s serverless SQL database...', 'published', datetime('now')),
  ('post_002', 'user_002', 'Building APIs with Workers', 'building-apis-with-workers',
   'Cloudflare Workers make it easy to build APIs...', 'published', datetime('now')),
  ('post_003', 'user_001', 'Draft Post', 'draft-post',
   'This is a draft...', 'draft', NULL);

-- Seed post-tag relationships
INSERT INTO post_tags (post_id, tag_id) VALUES
  ('post_001', 'tag_002'),
  ('post_001', 'tag_003'),
  ('post_002', 'tag_001'),
  ('post_002', 'tag_003');
```

Apply the seed data:

```bash
wrangler d1 execute my-app-db --local --file migrations/seed.sql
```

### Step 6: Query D1 from Your Worker

Update your Worker to query the database:

```ts
// src/index.ts
export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case "/api/posts":
          return handleListPosts(request, env);
        case "/api/posts/create":
          return handleCreatePost(request, env);
        default:
          // Dynamic route: /api/posts/:slug
          const slugMatch = url.pathname.match(/^\/api\/posts\/(.+)$/);
          if (slugMatch) {
            return handleGetPost(slugMatch[1], env);
          }
          return Response.json({ error: "Not Found" }, { status: 404 });
      }
    } catch (err) {
      console.error("Database error:", err);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
  },
};
```

### Step 7: Implement Query Helpers

Create reusable database query functions:

```ts
// src/services/database.ts

// List published posts with pagination
export async function listPosts(
  db: D1Database,
  page: number = 1,
  limit: number = 20
): Promise<{ posts: any[]; total: number }> {
  const offset = (page - 1) * limit;

  const [postsResult, countResult] = await Promise.all([
    db
      .prepare(
        `SELECT p.id, p.title, p.slug, p.status, p.published_at, p.created_at,
                u.name AS author_name, u.avatar_url AS author_avatar
         FROM posts p
         JOIN users u ON p.user_id = u.id
         WHERE p.status = 'published'
         ORDER BY p.published_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all(),
    db
      .prepare("SELECT COUNT(*) AS total FROM posts WHERE status = 'published'")
      .first<{ total: number }>(),
  ]);

  return {
    posts: postsResult.results,
    total: countResult?.total ?? 0,
  };
}

// Get a single post by slug with tags
export async function getPostBySlug(
  db: D1Database,
  slug: string
): Promise<any | null> {
  const post = await db
    .prepare(
      `SELECT p.*, u.name AS author_name, u.avatar_url AS author_avatar
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.slug = ?`
    )
    .bind(slug)
    .first();

  if (!post) return null;

  const tags = await db
    .prepare(
      `SELECT t.name FROM tags t
       JOIN post_tags pt ON t.id = pt.tag_id
       WHERE pt.post_id = ?`
    )
    .bind(post.id)
    .all();

  return { ...post, tags: tags.results.map((t: any) => t.name) };
}

// Create a new post
export async function createPost(
  db: D1Database,
  data: { userId: string; title: string; slug: string; content: string; tagIds?: string[] }
): Promise<any> {
  const id = crypto.randomUUID().replace(/-/g, "");

  // Use a batch for transactional insert
  const statements = [
    db
      .prepare(
        "INSERT INTO posts (id, user_id, title, slug, content) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(id, data.userId, data.title, data.slug, data.content),
  ];

  // Add tag associations
  if (data.tagIds?.length) {
    for (const tagId of data.tagIds) {
      statements.push(
        db
          .prepare("INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)")
          .bind(id, tagId)
      );
    }
  }

  await db.batch(statements);

  return getPostBySlug(db, data.slug);
}

// Full-text search using LIKE (for simple cases)
export async function searchPosts(
  db: D1Database,
  query: string
): Promise<any[]> {
  const results = await db
    .prepare(
      `SELECT p.id, p.title, p.slug, p.published_at
       FROM posts p
       WHERE p.status = 'published'
         AND (p.title LIKE ? OR p.content LIKE ?)
       ORDER BY p.published_at DESC
       LIMIT 20`
    )
    .bind(`%${query}%`, `%${query}%`)
    .all();

  return results.results;
}
```

### Step 8: Create Additional Migrations

As your schema evolves, create new migrations — never edit applied migrations:

```bash
wrangler d1 migrations create my-app-db add_comments_table
```

Edit `migrations/0002_add_comments_table.sql`:

```sql
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Add comment count to posts for denormalization
ALTER TABLE posts ADD COLUMN comment_count INTEGER NOT NULL DEFAULT 0;
```

Apply the new migration:

```bash
# Locally
wrangler d1 migrations apply my-app-db --local

# Remotely (production)
wrangler d1 migrations apply my-app-db --remote
```

### Step 9: Deploy to Production

Apply migrations to the remote (production) database:

```bash
# Check pending migrations
wrangler d1 migrations list my-app-db --remote

# Apply migrations to production
wrangler d1 migrations apply my-app-db --remote

# Deploy the Worker
wrangler deploy
```

### Step 10: Monitor and Debug

```bash
# Query the remote database directly
wrangler d1 execute my-app-db --remote --command "SELECT COUNT(*) FROM posts"

# Export the database for backup
wrangler d1 export my-app-db --remote --output backup.sql

# View D1 metrics in the Cloudflare Dashboard
# Dashboard → Workers & Pages → D1 → my-app-db → Metrics
```

## D1 Best Practices

### Use Parameterized Queries

Always use `.bind()` for user input — never concatenate strings into SQL:

```ts
// ✅ Safe — parameterized
const result = await db
  .prepare("SELECT * FROM users WHERE email = ?")
  .bind(email)
  .first();

// ❌ Dangerous — SQL injection risk
const result = await db
  .prepare(`SELECT * FROM users WHERE email = '${email}'`)
  .first();
```

### Use Batch for Transactions

D1's `.batch()` executes multiple statements in a single transaction:

```ts
const results = await db.batch([
  db.prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)").bind(id, email, name),
  db.prepare("INSERT INTO user_settings (user_id, theme) VALUES (?, ?)").bind(id, "dark"),
]);
```

### Use Appropriate Data Types

D1 is built on SQLite — use SQLite-compatible types:

| Concept | Recommended Type | Notes |
|---|---|---|
| Primary key | `TEXT` with `randomblob` or UUID | SQLite has no native UUID type |
| Timestamps | `TEXT` with `datetime('now')` | ISO 8601 format, stored as text |
| Boolean | `INTEGER` (0/1) | SQLite has no native boolean |
| JSON | `TEXT` | Store as serialized JSON, parse in Worker |
| Enums | `TEXT` with `CHECK` constraint | Enforced at the database level |

### Index Strategy

- Index columns used in `WHERE`, `JOIN`, and `ORDER BY` clauses.
- Use partial indexes (`WHERE` clause on index) for filtered queries.
- Don't over-index — each index adds write overhead.

```sql
-- Partial index: only index published posts
CREATE INDEX idx_posts_published ON posts(published_at DESC)
  WHERE status = 'published';

-- Composite index for common query patterns
CREATE INDEX idx_posts_user_status ON posts(user_id, status);
```

## Common Pitfalls

- **Editing applied migrations**: Never modify a migration that has been applied. Create a new migration instead.
- **Missing indexes on foreign keys**: SQLite does not auto-index foreign key columns. Always add explicit indexes.
- **Large result sets**: D1 has row limits per query. Use `LIMIT` and `OFFSET` for pagination, or cursor-based pagination for large datasets.
- **Not using `.batch()`**: Multiple related writes should use `.batch()` for atomicity and performance.
- **Forgetting `--local` vs. `--remote`**: Always test migrations locally first with `--local` before applying to production with `--remote`.

## Verification

1. Run `wrangler d1 migrations apply my-app-db --local` — all migrations apply cleanly.
2. Query tables via `wrangler d1 execute my-app-db --local --command "SELECT * FROM users"`.
3. Start `wrangler dev` and test API endpoints against the local D1 database.
4. Run `wrangler d1 migrations apply my-app-db --remote` — migrations apply to production.
5. Deploy with `wrangler deploy` and verify live queries via `curl` or the browser.
