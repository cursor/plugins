# Skill: Setting Up Prisma in a Project

## Description

This skill covers the complete workflow for adding Prisma ORM to a new or existing TypeScript/JavaScript project, including installation, schema creation, database migration, seeding, and client generation.

## Prerequisites

- Node.js (v18 or later)
- npm, yarn, or pnpm
- A supported database (PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, CockroachDB)

## Steps

### 1. Install Prisma

Install Prisma CLI as a dev dependency and the Prisma Client as a production dependency:

```bash
npm install prisma --save-dev
npm install @prisma/client
```

### 2. Initialize Prisma

Generate the initial Prisma configuration:

```bash
npx prisma init --datasource-provider postgresql
```

This creates:
- `prisma/schema.prisma` — the Prisma schema file
- `.env` — environment file with `DATABASE_URL`

Supported `--datasource-provider` values: `postgresql`, `mysql`, `sqlite`, `sqlserver`, `mongodb`, `cockroachdb`.

### 3. Configure the Database URL

Set the `DATABASE_URL` in the `.env` file:

```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"

# MySQL
DATABASE_URL="mysql://user:password@localhost:3306/mydb"

# SQLite
DATABASE_URL="file:./dev.db"
```

### 4. Define Your Schema

Edit `prisma/schema.prisma` to define your data models:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
  @@map("users")
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?  @db.Text
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
  @@index([published, createdAt])
  @@map("posts")
}

enum Role {
  ADMIN
  USER
  MODERATOR
}
```

### 5. Create and Run Migrations

Generate and apply a migration:

```bash
# Create a migration (development)
npx prisma migrate dev --name init

# Apply migrations in production
npx prisma migrate deploy
```

### 6. Generate the Prisma Client

The client is auto-generated during `migrate dev`, but you can also generate it manually:

```bash
npx prisma generate
```

### 7. Create the Prisma Client Singleton

Create a reusable client instance at `lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### 8. Seed the Database

Create a seed script at `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      name: 'Alice',
      role: 'ADMIN',
      posts: {
        create: [
          { title: 'Hello World', content: 'My first post', published: true },
        ],
      },
    },
  });

  console.log({ alice });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add the seed command to `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Run the seed:

```bash
npx prisma db seed
```

### 9. Explore Your Data

Open Prisma Studio to browse and edit data:

```bash
npx prisma studio
```

### 10. Add to .gitignore

Ensure generated files and environment secrets are excluded:

```gitignore
node_modules/
.env
prisma/dev.db
prisma/dev.db-journal
```

## Verification

After setup, verify everything works:

```bash
# Check schema validity
npx prisma validate

# Check migration status
npx prisma migrate status

# Generate client
npx prisma generate

# Open Studio
npx prisma studio
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `DATABASE_URL` not set | Ensure `.env` file exists and is loaded |
| Migration fails | Check database connectivity and permissions |
| Client types not updating | Run `npx prisma generate` after schema changes |
| Connection timeout | Verify database is running and URL is correct |
| `Can't reach database server` | Check host, port, and firewall rules |
