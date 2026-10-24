---
name: monorepo-architect
description: "Expert guide for designing and managing scalable monorepos using Turborepo, pnpm workspaces, and shared packages / Panduan ahli untuk merancang dan mengelola monorepo skalabel menggunakan Turborepo dan pnpm workspaces."
author: "Roedy Rustam"
version: "4.3.0"
---

# Monorepo Architect (Turborepo 2.x / Moon Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert guide for designing and managing scalable monorepos. Covers **Turborepo 2.x** (the 2026 standard for JS/TS monorepos), **moon** (polyglot task runner for teams mixing JS + Rust + Go), **pnpm workspaces**, shared package design, incremental builds, remote caching, and CI/CD pipeline optimization.

### Trigger Conditions
- Managing a codebase with multiple apps and shared packages.
- Setting up a monorepo for a SaaS with separate `web`, `admin`, `api`, and `packages`.
- Optimizing build and test times with remote caching.
- Sharing TypeScript types, UI components, or utility functions across apps.
- Migrating from a multi-repo setup to a monorepo.

### Tool Selection Guide (2026)

| Tool | Best For | Language Agnostic |
|---|---|---|
| **Turborepo 2.x** | JS/TS monorepos (Next.js, Vite, Node) | ❌ (JS focused) |
| **moon** | Polyglot teams (JS + Go + Rust + Python) | ✅ |
| **Nx** | Enterprise, Angular/React, plugin ecosystem | ❌ (JS focused) |
| **Bazel** | Very large orgs, hermetic builds | ✅ |

### Turborepo 2.x — Standard JS Monorepo

#### Repository Structure
```
my-saas/
├── apps/
│   ├── web/          # Next.js 15 main app
│   ├── admin/        # Next.js 15 super admin (subdomain)
│   └── api/          # Hono/Fastify backend
├── packages/
│   ├── ui/           # Shared Tailwind v4 components
│   ├── db/           # Drizzle ORM schema + queries
│   ├── auth/         # Auth utilities (session, JWT)
│   ├── email/        # Email templates (React Email)
│   └── tsconfig/     # Shared TypeScript configs
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

#### turbo.json (v2 Syntax)
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "test/**", "vitest.config.*"]
    },
    "lint": {
      "inputs": ["src/**", "*.config.*", ".eslintrc*"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "db:generate": {
      "cache": false
    }
  }
}
```

#### pnpm-workspace.yaml
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

#### Remote Caching (Vercel Remote Cache)
```bash
# Authenticate with Vercel Remote Cache
npx turbo login
npx turbo link

# Or self-hosted with Turborepo Remote Cache
TURBO_TEAM=my-team TURBO_TOKEN=xxx turbo build
```

#### Shared UI Package (`packages/ui`)
```json
// packages/ui/package.json
{
  "name": "@myapp/ui",
  "version": "0.0.0",
  "private": true,
  "exports": {
    "./button": {
      "import": "./src/button.tsx",
      "types": "./src/button.tsx"
    },
    "./card": {
      "import": "./src/card.tsx",
      "types": "./src/card.tsx"
    }
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

#### Internal Package Pattern (No Build Step)
Use `"exports"` pointing to source files directly — Turborepo compiles them as part of the consuming app:
```json
// packages/db/package.json
{
  "name": "@myapp/db",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  },
  "devDependencies": {
    "drizzle-orm": "latest",
    "drizzle-kit": "latest"
  }
}
```

### moon — Polyglot Task Runner
For teams mixing JavaScript, Go, Rust, and Python in one repo:
```yaml
# .moon/workspace.yml
projects:
  - "apps/*"
  - "packages/*"
  - "services/*"   # Go/Rust microservices

vcs:
  manager: "git"
  defaultBranch: "main"
```

```yaml
# apps/api/moon.yml (Go service)
language: "go"
type: "application"

tasks:
  build:
    command: "go build -o ./bin/api ./cmd/api"
    inputs: ["src/**/*.go", "go.mod"]
    outputs: ["bin/api"]
  test:
    command: "go test ./..."
```

### CI/CD Optimization
```yaml
# .github/workflows/ci.yml
- name: Build & Test (Turborepo)
  run: |
    npx turbo run build test lint typecheck \
      --filter="...[origin/main]" \  # Only changed packages
      --cache-dir=".turbo"
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan ahli untuk merancang dan mengelola monorepo yang skalabel. Mencakup **Turborepo 2.x** (standar 2026 untuk monorepo JS/TS), **moon** (task runner poliglot untuk tim yang memadukan JS + Rust + Go), **pnpm workspaces**, desain shared package, incremental build, remote caching, dan optimasi pipeline CI/CD.

### Kondisi Pemicu
- Mengelola codebase dengan banyak aplikasi dan shared package.
- Menyiapkan monorepo untuk SaaS dengan `web`, `admin`, `api`, dan `packages` terpisah.
- Mengoptimalkan waktu build dan test dengan remote caching.
- Berbagi TypeScript types, komponen UI, atau utilitas antar aplikasi.
- Migrasi dari multi-repo ke monorepo.

### Panduan Pemilihan Tool (2026)
- **Turborepo 2.x**: Standar untuk monorepo JS/TS — cepat, zero-config, remote cache bawaan.
- **moon**: Untuk tim poliglot yang memadukan JS, Go, Rust, Python dalam satu repo.
- **Nx**: Untuk enterprise dengan ekosistem plugin yang kaya.

### Struktur Repositori
Pisahkan `apps/` (aplikasi yang dapat di-deploy) dari `packages/` (shared library internal):
- `apps/web` — Next.js utama
- `apps/admin` — Dashboard Super Admin (subdomain terpisah)
- `apps/api` — Backend API
- `packages/ui` — Komponen UI bersama (Tailwind v4)
- `packages/db` — Skema Drizzle ORM + query
- `packages/auth` — Utilitas auth

### Turborepo 2.x — Sintaksis Baru
Turborepo 2.x memperkenalkan TUI interaktif (`"ui": "tui"`), sintaksis `tasks` yang lebih ekspresif, dan caching yang lebih granular dengan `inputs`/`outputs`.

### Pola Internal Package (Tanpa Build Step)
Arahkan `exports` langsung ke file sumber TypeScript — Turborepo mengkompilasi sebagai bagian dari aplikasi yang mengonsumsinya. Ini menghilangkan kebutuhan langkah build terpisah untuk setiap package.

### moon — Task Runner Poliglot
Moon mendukung proyek dalam bahasa yang berbeda (Go, Rust, JS) dalam satu workspace, masing-masing dengan konfigurasi `moon.yml`-nya sendiri.

### Optimasi CI/CD
Gunakan flag `--filter="...[origin/main]"` Turborepo untuk hanya membangun dan menguji package yang berubah sejak commit terakhir. Gunakan remote cache Vercel atau self-hosted untuk berbagi cache antar runner CI.