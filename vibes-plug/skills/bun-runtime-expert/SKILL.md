---
name: bun-runtime-expert
description: "Expert guide for Bun JavaScript/TypeScript runtime. Use when building, testing, or deploying applications with Bun / Panduan ahli untuk runtime JavaScript/TypeScript Bun. Digunakan saat membuat, menguji, atau meluncurkan aplikasi dengan Bun."
author: "Roedy Rustam"
version: "4.3.0"
---

# Bun Runtime Expert

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

Expert-level guidance for building high-performance applications with the Bun JavaScript/TypeScript runtime (v1.1+). Covers Bun's built-in HTTP server, database clients, bundler, test runner, package manager, and Node.js migration strategies.

### Trigger Conditions
- Use when scaffolding a new project with Bun as the runtime.
- Use when building HTTP servers or APIs with `Bun.serve()`.
- Use when querying databases with `Bun.sql` (PostgreSQL, MySQL, SQLite).
- Use when interacting with S3-compatible object storage via `Bun.s3`.
- Use when bundling frontend or backend code with `bun build`.
- Use when writing tests with `bun:test`.
- Use when migrating an existing Node.js project to Bun.
- Use when optimizing package installation speed or lockfile management.

### Core Architecture

#### Why Bun?
Bun is a batteries-included JavaScript/TypeScript runtime that replaces Node.js, npm, Webpack/Vite, and Jest in a single binary:

| Capability | Bun Built-in | Node.js Equivalent |
|---|---|---|
| Runtime | `bun run` | `node` |
| Package Manager | `bun install` | `npm` / `pnpm` / `yarn` |
| Bundler | `bun build` | Webpack / Vite / esbuild |
| Test Runner | `bun test` | Jest / Vitest |
| HTTP Server | `Bun.serve()` | Express / Fastify |
| SQL Client | `Bun.sql` | `pg` / `mysql2` / `better-sqlite3` |
| S3 Client | `Bun.s3` | `@aws-sdk/client-s3` |
| Redis Client | Built-in | `ioredis` |
| TypeScript | Native (zero config) | `ts-node` / `tsx` |
| `.env` loading | Native | `dotenv` |

### Quick Start

#### 1. Install Bun
```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# Verify installation
bun --version
```

#### 2. Initialize a New Project
```bash
bun init
```
This generates `package.json`, `tsconfig.json`, and an `index.ts` entry point. TypeScript works out of the box with zero configuration.

#### 3. Install Dependencies
```bash
# Install all dependencies (10-100x faster than npm)
bun install

# Add a package
bun add hono zod drizzle-orm

# Add dev dependency
bun add -d @types/bun vitest
```

### Bun.serve() — High-Performance HTTP Server
`Bun.serve()` is a zero-dependency HTTP server with built-in TLS, WebSocket support, and hot module reloading.

#### Basic HTTP Server
```typescript
Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', runtime: 'bun' });
    }
    return new Response('Not Found', { status: 404 });
  },
});
```

### Bun.sql — Unified Database Client
Zero-dependency SQL client supporting PostgreSQL, MySQL/MariaDB, and SQLite via tagged template literals.

#### PostgreSQL
```typescript
import { sql } from 'bun';
const users = await sql`SELECT * FROM users WHERE active = ${true}`;
```

### Best Practices
- **Performance:** Use `Bun.serve()` directly or Hono for HTTP — avoid Express (slower compat layer). Use `Bun.file()` for efficient file I/O.
- **Security:** Always parameterize queries via template literals in `Bun.sql` (automatically prevents SQL injection).
- **Testing:** Use `bun:test` — it's Jest-compatible and significantly faster.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

Panduan tingkat ahli untuk membangun aplikasi berkinerja tinggi menggunakan runtime JavaScript/TypeScript Bun (v1.1+). Mencakup server HTTP bawaan, klien database, bundler, test runner, package manager, dan strategi migrasi dari Node.js.

### Kondisi Pemicu
- Gunakan saat merancang proyek baru menggunakan Bun sebagai runtime.
- Gunakan saat membangun server HTTP atau API dengan `Bun.serve()`.
- Gunakan saat melakukan query database dengan `Bun.sql` (PostgreSQL, MySQL, SQLite).
- Gunakan saat berinteraksi dengan object storage yang kompatibel dengan S3 via `Bun.s3`.
- Gunakan saat membundel kode frontend atau backend dengan `bun build`.
- Gunakan saat menulis pengujian (testing) menggunakan `bun:test`.
- Gunakan saat memigrasikan proyek Node.js ke Bun.
- Gunakan saat mengoptimalkan kecepatan instalasi paket atau manajemen lockfile.

### Arsitektur Inti

#### Mengapa Bun?
Bun adalah runtime JavaScript/TypeScript serba ada yang menggantikan Node.js, npm, Webpack/Vite, dan Jest dalam satu berkas biner tunggal:

| Kemampuan | Bawaan Bun | Setara di Node.js |
|---|---|---|
| Runtime | `bun run` | `node` |
| Package Manager | `bun install` | `npm` / `pnpm` / `yarn` |
| Bundler | `bun build` | Webpack / Vite / esbuild |
| Test Runner | `bun test` | Jest / Vitest |
| HTTP Server | `Bun.serve()` | Express / Fastify |
| SQL Client | `Bun.sql` | `pg` / `mysql2` / `better-sqlite3` |
| S3 Client | `Bun.s3` | `@aws-sdk/client-s3` |
| Redis Client | Built-in | `ioredis` |
| TypeScript | Native (tanpa config) | `ts-node` / `tsx` |
| `.env` loading | Native | `dotenv` |

### Memulai Cepat

#### 1. Instal Bun
```bash
# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Verifikasi instalasi
bun --version
```

#### 2. Inisialisasi Proyek Baru
```bash
bun init
```
Ini menghasilkan `package.json`, `tsconfig.json`, dan file entry point `index.ts`. TypeScript langsung berfungsi tanpa konfigurasi tambahan.

#### 3. Instal Dependensi
```bash
# Mengmenginstal semua dependensi (10-100x lebih cepat dari npm)
bun install

# Menambahkan paket
bun add hono zod drizzle-orm

# Menambahkan dev dependency
bun add -d @types/bun vitest
```

### Bun.serve() — HTTP Server Berkinerja Tinggi
`Bun.serve()` adalah server HTTP tanpa dependensi eksternal dengan dukungan TLS bawaan, WebSocket, dan hot module reloading.

#### Server HTTP Dasar
```typescript
Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', runtime: 'bun' });
    }
    return new Response('Not Found', { status: 404 });
  },
});
```

### Bun.sql — Klien Database Terpadu
Klien SQL tanpa dependensi eksternal yang mendukung PostgreSQL, MySQL/MariaDB, dan SQLite melalui tagged template literals.

#### PostgreSQL
```typescript
import { sql } from 'bun';
const users = await sql`SELECT * FROM users WHERE active = ${true}`;
```

### Praktik Terbaik
- **Performa:** Gunakan `Bun.serve()` secara langsung atau bersama Hono — hindari Express (karena lapisan kompatibilitasnya lebih lambat). Gunakan `Bun.file()` untuk I/O file yang efisien.
- **Keamanan:** Selalu gunakan parameterisasi query melalui template literals di `Bun.sql` untuk mencegah SQL Injection secara otomatis.
- **Pengujian:** Gunakan `bun:test` yang kompatibel dengan Jest namun jauh lebih cepat.

---

### Limitations / Batasan
- Use this skill only when the task involves the Bun runtime specifically.
- Bun's Node.js compatibility is extensive but not 100%. Always verify critical `node:*` API usage.