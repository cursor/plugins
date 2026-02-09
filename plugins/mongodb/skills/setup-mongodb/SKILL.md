---
name: setup-mongodb
description: Connect Node.js/TypeScript to MongoDB with native driver and Mongoose, including Docker Compose setup
---

# Skill: Setting Up MongoDB with Node.js

## Description

This skill covers the complete workflow for connecting a Node.js/TypeScript application to MongoDB, using both the native MongoDB driver and Mongoose ODM, including connection configuration, model creation, and health checks.

## Prerequisites

- Node.js (v18 or later)
- npm, yarn, or pnpm
- A running MongoDB instance (local, Docker, or MongoDB Atlas)

## Steps

### 1. Choose Your Driver

| Feature | Native Driver (`mongodb`) | Mongoose |
|---------|--------------------------|----------|
| Schema validation | JSON Schema at DB level | Schema definitions + validators |
| Middleware / Hooks | No | Yes (pre/post hooks) |
| TypeScript support | Built-in generics | HydratedDocument, InferSchemaType |
| Population (joins) | Manual `$lookup` | `.populate()` |
| Performance | Minimal overhead | Slight overhead from hydration |
| Best for | Performance-critical, infrastructure | Application CRUD, rapid development |

### 2. Install Dependencies

**Option A — Mongoose (recommended for most applications):**

```bash
npm install mongoose
npm install -D @types/mongoose  # only if using older Mongoose < 8
```

**Option B — Native MongoDB Driver:**

```bash
npm install mongodb
```

**Both (for apps that use Mongoose models + native driver for aggregations):**

```bash
npm install mongoose mongodb
```

### 3. Set Up Environment Variables

Create a `.env` file at the project root:

```env
# Local MongoDB
MONGODB_URI="mongodb://localhost:27017/myapp"

# MongoDB Atlas
MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/myapp?retryWrites=true&w=majority"

# With authentication (local)
MONGODB_URI="mongodb://admin:password@localhost:27017/myapp?authSource=admin"
```

Add `.env` to `.gitignore`:

```gitignore
.env
.env.local
```

### 4. Create the Database Connection (Mongoose)

Create `src/lib/database.ts`:

```typescript
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * Global cache for the Mongoose connection to prevent multiple
 * connections in development (hot reloading) and serverless environments.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Closing MongoDB connection...`);
  await mongoose.connection.close();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
```

### 5. Create the Database Connection (Native Driver)

Create `src/lib/mongodb.ts`:

```typescript
import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'myapp';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongoCache {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<MongoClient> | null;
}

declare global {
  var mongoCache: MongoCache | undefined;
}

const cached: MongoCache = global.mongoCache ?? { client: null, db: null, promise: null };
global.mongoCache = cached;

export async function getDatabase(): Promise<Db> {
  if (cached.db) {
    return cached.db;
  }

  if (!cached.promise) {
    const client = new MongoClient(MONGODB_URI!, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      w: 'majority',
    });

    cached.promise = client.connect();
  }

  cached.client = await cached.promise;
  cached.db = cached.client.db(DB_NAME);
  return cached.db;
}

export async function getClient(): Promise<MongoClient> {
  if (cached.client) {
    return cached.client;
  }
  await getDatabase();
  return cached.client!;
}
```

### 6. Define Models (Mongoose)

Create `src/models/User.ts`:

```typescript
import { Schema, model, models, type HydratedDocument } from 'mongoose';

export interface IUser {
  email: string;
  name: string;
  role: 'user' | 'admin' | 'moderator';
  avatar?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin', 'moderator'],
        message: '{VALUE} is not a valid role',
      },
      default: 'user',
    },
    avatar: String,
    lastLoginAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ lastLoginAt: -1 });

export const User = models.User || model<IUser>('User', userSchema);
```

### 7. Define Collection Types (Native Driver)

Create `src/types/collections.ts`:

```typescript
import type { ObjectId } from 'mongodb';

export interface UserDocument {
  _id: ObjectId;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'moderator';
  avatar?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostDocument {
  _id: ObjectId;
  title: string;
  content: string;
  authorId: ObjectId;
  tags: string[];
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 8. Use in Application Code

```typescript
// With Mongoose
import { connectToDatabase } from '@/lib/database';
import { User } from '@/models/User';

await connectToDatabase();
const users = await User.find({ role: 'admin' }).sort({ createdAt: -1 }).lean();

// With native driver
import { getDatabase } from '@/lib/mongodb';
import type { UserDocument } from '@/types/collections';

const db = await getDatabase();
const users = await db.collection<UserDocument>('users')
  .find({ role: 'admin' })
  .sort({ createdAt: -1 })
  .toArray();
```

### 9. Run MongoDB Locally (Docker)

Create a `docker-compose.yml` for local development:

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    container_name: mongodb-dev
    ports:
      - '27017:27017'
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: myapp
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

Start MongoDB:

```bash
docker compose up -d
```

### 10. Seed the Database

Create `src/scripts/seed.ts`:

```typescript
import mongoose from 'mongoose';
import { connectToDatabase } from '../lib/database';
import { User } from '../models/User';

async function seed() {
  await connectToDatabase();

  // Clear existing data
  await User.deleteMany({});

  // Insert seed data
  const users = await User.insertMany([
    { email: 'alice@example.com', name: 'Alice', role: 'admin' },
    { email: 'bob@example.com', name: 'Bob', role: 'user' },
    { email: 'carol@example.com', name: 'Carol', role: 'moderator' },
  ]);

  console.log(`Seeded ${users.length} users`);
  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

Run the seed script:

```bash
npx tsx src/scripts/seed.ts
```

## Verification

After setup, verify the connection works:

```bash
# Test connection with mongosh
mongosh "mongodb://localhost:27017/myapp" --eval "db.runCommand({ ping: 1 })"

# Run the seed script
npx tsx src/scripts/seed.ts

# Verify data was inserted
mongosh "mongodb://localhost:27017/myapp" --eval "db.users.find().pretty()"
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `MONGODB_URI` not set | Ensure `.env` file exists and is loaded (use `dotenv` or framework built-in) |
| `ECONNREFUSED` | Verify MongoDB is running: `mongosh --eval "db.runCommand({ping:1})"` |
| Authentication failed | Check username/password and `authSource` parameter in URI |
| `MongoServerSelectionError` | Check network connectivity, firewall rules, and Atlas IP whitelist |
| Slow connections in dev | Hot reloading creates multiple connections — use the global cache pattern above |
| `querySrv ENOTFOUND` | DNS issue with Atlas SRV URI — check network or use standard URI format |
