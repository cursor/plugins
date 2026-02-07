# Skill: Create Supabase Database Migration

## Description

This skill covers creating, writing, testing, and applying database migrations for Supabase projects using the Supabase CLI. Migrations manage your Postgres schema in version control and enable reproducible, reviewable schema changes.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- A Supabase project initialized (`supabase init`)
- For remote: project linked (`supabase link --project-ref <ref>`)

## Steps

### 1. Initialize Supabase (if not done)

```bash
# Initialize a new Supabase project in the current directory
supabase init

# This creates the supabase/ directory with:
# supabase/
# ├── config.toml       # Project configuration
# ├── migrations/       # Migration files
# └── seed.sql          # Seed data for local development
```

### 2. Start Local Development Database

```bash
# Start the local Supabase stack (Postgres, Auth, Storage, etc.)
supabase start

# This outputs local credentials:
# API URL: http://127.0.0.1:54321
# DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# anon key: eyJ...
# service_role key: eyJ...
```

### 3. Create a New Migration

```bash
# Create a timestamped migration file
supabase migration new create_todos_table

# Output: Created new migration at supabase/migrations/20260207120000_create_todos_table.sql
```

### 4. Write the Migration SQL

Edit the generated file (`supabase/migrations/<timestamp>_create_todos_table.sql`):

```sql
-- Create the todos table
CREATE TABLE public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comments
COMMENT ON TABLE public.todos IS 'User todo items with priority and due dates';
COMMENT ON COLUMN public.todos.priority IS 'Task priority: low, medium, high, or urgent';

-- Enable Row Level Security
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own todos"
  ON public.todos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_todos_user_id ON public.todos (user_id);
CREATE INDEX idx_todos_user_complete ON public.todos (user_id, is_complete)
  WHERE is_complete = false;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

### 5. Apply Migration Locally

```bash
# Reset the local database and run all migrations from scratch
supabase db reset

# Or apply only new (pending) migrations
supabase migration up
```

### 6. Verify the Migration

```bash
# Connect to the local database
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Check the table was created
\d public.todos

# Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

# Check policies
SELECT * FROM pg_policies WHERE tablename = 'todos';

# Check indexes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'todos';
```

### 7. Generate TypeScript Types

After applying migrations, regenerate your types:

```bash
# From local database
supabase gen types typescript --local > src/types/supabase.ts

# From remote database
supabase gen types typescript --project-id <project-ref> > src/types/supabase.ts
```

### 8. Detect Schema Drift (Remote)

Compare your local migrations against the remote database:

```bash
# Show differences between local and remote schema
supabase db diff

# Generate a migration to reconcile differences
supabase db diff --use-migra -f reconcile_drift
```

### 9. Apply Migration to Remote

```bash
# Push all pending migrations to the linked remote project
supabase db push

# Push with a dry run first
supabase db push --dry-run
```

### 10. Squash Migrations (Optional)

When you have many small development migrations, squash them before merging:

```bash
# Squash all migrations into a single file
supabase migration squash
```

## Migration Patterns

### Adding a Column

```sql
-- Forward
ALTER TABLE public.todos
  ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Rollback (in comments)
-- ALTER TABLE public.todos DROP COLUMN tags;
```

### Adding a Foreign Key Relationship

```sql
-- Create a related table
CREATE TABLE public.todo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.todo_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their todos"
  ON public.todo_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.todos
      WHERE todos.id = todo_comments.todo_id
      AND todos.user_id = auth.uid()
    )
  );

CREATE INDEX idx_todo_comments_todo_id ON public.todo_comments (todo_id);
CREATE INDEX idx_todo_comments_user_id ON public.todo_comments (user_id);
```

### Creating a View

```sql
CREATE OR REPLACE VIEW public.todo_summary AS
SELECT
  user_id,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE is_complete) AS completed,
  COUNT(*) FILTER (WHERE NOT is_complete) AS pending,
  COUNT(*) FILTER (WHERE due_date < now() AND NOT is_complete) AS overdue
FROM public.todos
GROUP BY user_id;

COMMENT ON VIEW public.todo_summary IS 'Aggregated todo statistics per user';
```

### Creating a Database Function (RPC)

```sql
CREATE OR REPLACE FUNCTION public.search_todos(search_query TEXT)
RETURNS SETOF public.todos
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM public.todos
  WHERE
    user_id = auth.uid()
    AND (
      title ILIKE '%' || search_query || '%'
      OR description ILIKE '%' || search_query || '%'
    )
  ORDER BY created_at DESC;
$$;
```

Call from the client:

```ts
const { data, error } = await supabase.rpc('search_todos', {
  search_query: 'groceries',
});
```

## Common Pitfalls

- **Forgetting RLS**: Every new table must have `ENABLE ROW LEVEL SECURITY`. Without it, the table is publicly accessible.
- **Missing FK indexes**: Postgres does not auto-index foreign key columns. Always add an index on FK columns.
- **Using TIMESTAMP instead of TIMESTAMPTZ**: Always use `TIMESTAMPTZ` for correct timezone handling.
- **Editing applied migrations**: Never edit a migration that has been applied to any environment. Create a new migration instead.
- **Large table ALTER**: Adding a column with a volatile default (e.g., `DEFAULT now()`) to a large table can lock the table. Use a constant default or add the column as nullable first.
- **Not testing locally**: Always run `supabase db reset` locally to verify the full migration chain before pushing to remote.

## Verification

1. Run `supabase db reset` — all migrations apply cleanly without errors.
2. Query the new table via `psql` or the Supabase dashboard.
3. Run `supabase gen types typescript --local` — types generate successfully and include the new table.
4. Test CRUD operations via the Supabase client — RLS policies correctly scope data.
5. Run `supabase db diff` against remote — no unexpected drift detected.
