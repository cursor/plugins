---
name: app-analyzer-optimizer
description: "Deeply analyzes application architecture and structure to perform audit, bottleneck detection, and code/performance optimization / Mempelajari arsitektur dan struktur aplikasi secara mendalam untuk melakukan audit, deteksi bottleneck, serta optimasi performa dan kode."
author: "Roedy Rustam"
version: "4.3.0"
---

# App Analyzer & Optimizer (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Deep application analysis and optimization skill. Performs architectural audits, bottleneck detection, bundle analysis, database query profiling, and AI-assisted code review across Next.js, React, Node.js, Go, Python, and Rust applications.

### Trigger Conditions
- Auditing an existing codebase for architectural issues or technical debt.
- Detecting performance bottlenecks (slow API routes, large bundles, N+1 queries).
- Analyzing bundle size and suggesting code splitting opportunities.
- Reviewing code quality (complexity, duplication, dead code).
- Using AI-assisted tools to accelerate code review and analysis.

### Analysis Protocol (5 Phases)

#### Phase 1: Architecture Discovery
```bash
# Map the entire project structure
find . -type f -name "*.ts" -o -name "*.tsx" -o -name "*.go" | head -100
# Count lines per file (find largest files)
find . -name "*.ts" -exec wc -l {} + | sort -rn | head -20
# Find circular dependencies (TypeScript/JS)
npx madge --circular --extensions ts,tsx src/
```

#### Phase 2: Bundle Analysis (Next.js / Vite)
```bash
# Next.js bundle analyzer
ANALYZE=true next build

# Or install dedicated tool
npx @next/bundle-analyzer

# Vite bundle visualization
npx vite-bundle-visualizer

# Check for duplicate dependencies
npx depcheck
npx bundle-phobia-cli check package.json
```

Key bundle red flags:
- Any single chunk > 500KB (uncompressed).
- Importing entire libraries (`import _ from 'lodash'` vs `import debounce from 'lodash/debounce'`).
- Moment.js (replace with `date-fns` or `Temporal`).
- `node_modules` leaking into client bundle.

#### Phase 3: Database Query Analysis
```sql
-- PostgreSQL: Find slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find missing indexes (sequential scans on large tables)
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'your_table'
ORDER BY n_distinct DESC;

-- Detect N+1 queries: Enable query logging
-- In Drizzle:
const db = drizzle(client, { logger: true });
-- In Prisma:
DATABASE_URL="...?connection_limit=5" prisma studio
```

#### Phase 4: AI-Assisted Code Review
Use AI tools to accelerate analysis:

| Tool | Purpose |
|---|---|
| **CodeRabbit** | Automated PR review, pattern detection |
| **Sourcegraph Cody** | Codebase-wide semantic search and explanation |
| **GitHub Copilot** | Inline suggestions and refactoring |
| **Cursor / Windsurf** | AI IDE with full-repo context |

AI review prompts for Gemini Agent:
```
Analyze all files in src/features/ and identify:
1. Functions longer than 30 lines
2. Duplicated business logic across files
3. Missing error handling in async functions
4. Components that directly call APIs (violating separation of concerns)
```

#### Phase 5: Performance Profiling

**Frontend (React / Next.js):**
```bash
# React DevTools Profiler — identify render bottlenecks
# Chrome DevTools > Performance tab > Record interaction

# Lighthouse CI — automated CWV tracking
npm install -g @lhci/cli
lhci autorun
```

**Backend (Node.js):**
```bash
# Built-in Node.js profiler
node --prof server.js
node --prof-process isolate-*.log > processed.txt

# Clinic.js — flamegraph, bubble chart, doctor
npm install -g clinic
clinic doctor -- node server.js
clinic flame -- node server.js
```

**Go:**
```bash
# Built-in pprof profiler
go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
go tool pprof -http=:8080 profile.out
```

### Common Bottleneck Patterns & Fixes

| Bottleneck | Symptom | Fix |
|---|---|---|
| N+1 queries | DB calls proportional to list length | Add `.include()` / JOIN or DataLoader |
| Missing indexes | Slow queries on filtered columns | `CREATE INDEX CONCURRENTLY` |
| Unoptimized images | Large LCP, slow page load | Next.js `<Image>`, WebP, lazy loading |
| Over-fetching | Fetching full objects when only 1 field needed | Select specific columns |
| No pagination | Fetching entire tables | Add `LIMIT/OFFSET` or cursor pagination |
| Blocking main thread | High INP, unresponsive UI | `useTransition`, web workers |
| No caching | Same data fetched repeatedly | Redis, React Query staleTime, HTTP cache |
| Bundle bloat | Large JS payload | Tree-shaking, code splitting, lazy imports |

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Skill analisis dan optimasi aplikasi mendalam. Melakukan audit arsitektur, deteksi bottleneck, analisis bundle, profiling query database, dan code review berbantuan AI di aplikasi Next.js, React, Node.js, Go, Python, dan Rust.

### Kondisi Pemicu
- Mengaudit codebase yang ada untuk masalah arsitektur atau hutang teknis.
- Mendeteksi bottleneck performa (rute API lambat, bundle besar, query N+1).
- Menganalisis ukuran bundle dan menyarankan peluang code splitting.
- Meninjau kualitas kode (kompleksitas, duplikasi, kode mati).
- Menggunakan tool berbantuan AI untuk mempercepat code review dan analisis.

### Protokol Analisis (5 Fase)

#### Fase 1: Penemuan Arsitektur
Petakan seluruh struktur proyek, hitung baris per file untuk menemukan file terbesar, dan deteksi dependensi circular dengan `npx madge --circular`.

#### Fase 2: Analisis Bundle (Next.js / Vite)
Gunakan `ANALYZE=true next build` atau `npx vite-bundle-visualizer`. Tanda bahaya bundle: chunk tunggal > 500KB, mengimpor library penuh, Moment.js, atau `node_modules` yang bocor ke bundle klien.

#### Fase 3: Analisis Query Database
Gunakan `pg_stat_statements` untuk menemukan query lambat. Cari scan sequential pada tabel besar (tanda indeks yang hilang). Aktifkan logging query di Drizzle/Prisma untuk mendeteksi pola N+1.

#### Fase 4: Code Review Berbantuan AI
Gunakan CodeRabbit untuk review PR otomatis, Sourcegraph Cody untuk pencarian semantik seluruh codebase, dan Gemini Agent dengan prompt analisis spesifik untuk menemukan fungsi panjang, logika bisnis yang diduplikasi, dan error handling yang hilang.

#### Fase 5: Profiling Performa
- **Frontend**: React DevTools Profiler, Lighthouse CI.
- **Backend Node.js**: `node --prof`, Clinic.js untuk flamegraph.
- **Go**: `go tool pprof` untuk CPU dan memory profiling.

### Pola Bottleneck Umum & Perbaikan

| Bottleneck | Gejala | Perbaikan |
|---|---|---|
| Query N+1 | Panggilan DB proporsional dengan panjang daftar | Tambahkan `.include()` / JOIN atau DataLoader |
| Indeks yang hilang | Query lambat pada kolom yang difilter | `CREATE INDEX CONCURRENTLY` |
| Gambar tidak dioptimalkan | LCP besar, halaman lambat | Next.js `<Image>`, WebP, lazy loading |
| Over-fetching | Mengambil objek penuh saat hanya 1 field dibutuhkan | Pilih kolom spesifik |
| Tanpa paginasi | Mengambil seluruh tabel | Tambahkan `LIMIT/OFFSET` atau cursor pagination |
| Memblokir thread utama | INP tinggi, UI tidak responsif | `useTransition`, web workers |
| Tanpa caching | Data yang sama diambil berulang kali | Redis, React Query staleTime, HTTP cache |
| Bundle membengkak | Payload JS besar | Tree-shaking, code splitting, lazy imports |


## Orchestration & Integration
- Integrates with performance-web-vitals and production-ready-hardener.