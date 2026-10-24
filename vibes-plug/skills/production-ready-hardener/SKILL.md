---
name: production-ready-hardener
description: "Ultimate production readiness skill that orchestrates all relevant skills (frontend, backend, security, performance, SEO, testing, DevOps) to harden applications before deployment / Skill kesiapan produksi utama yang mengorkestrasi semua skill relevan (frontend, backend, keamanan, performa, SEO, testing, DevOps) untuk mengeraskan aplikasi sebelum deployment."
author: "Roedy Rustam"
version: "4.3.0"
---

# Production-Ready Hardener

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
The **Production-Ready Hardener** is a master orchestrator skill that combines and delegates to all relevant vibes-plug skills to ensure your application is rock-solid, secure, performant, and production-grade before deployment. It acts as a comprehensive pre-production checklist that leaves no stone unturned — from frontend polish to backend resilience, from data security to observability.

This skill does NOT replace individual skills — it **coordinates** them into a structured, phased audit-and-hardening workflow.

### Orchestrated Skills Map

```
┌──────────────────────────────────────────────────────────────────┐
│              PRODUCTION-READY HARDENER                           │
│                 (Master Orchestrator — 7 Phases)                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── PHASE 1: Architecture & Code Quality ───────────────────┐  │
│  │  • scalability-clean-code (SOLID, DRY, Clean Architecture)  │  │
│  │  • fullstack-expert (Design & polyglot patterns)            │  │
│  │  • app-analyzer-optimizer (Deep codebase & bottleneck audit)│  │
│  │  • monorepo-architect (Turborepo & pnpm workspace structure)│  │
│  │  • dependency-upgrade-migrator (Codemod & package audits)  │  │
│  │  • anti-slop (Eliminate conversational & code slop)        │  │
│  │  • typescript-expert (Strict mode & type-safe patterns)    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── PHASE 2: Frontend Hardening ────────────────────────────┐  │
│  │  • senior-frontend (React 19, Next.js 15 App Router)       │  │
│  │  • design-system-architect (Tokens, Radix, Base UI, WCAG)  │  │
│  │  • tailwind-expert (CSS-first config, OKLCH, responsive)   │  │
│  │  • form-validation-expert (React Hook Form, Zod validation)│  │
│  │  • state-management-expert (Zustand, Jotai, TanStack Store)│  │
│  │  • ui-ux-pro-max / hig (HIG principles & design system)    │  │
│  │  • global-a11y-i18n-expert (Web accessibility & i18n)      │  │
│  │  • mobile-expo-expert / tauri-expert (Mobile & Desktop)    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── PHASE 3: Backend & AI Services ─────────────────────────┐  │
│  │  • js-backend-expert (Node 24, Bun 1.2, Fastify, Hono)     │  │
│  │  • go-programming-expert (Go 1.25+, microservices, gRPC)   │  │
│  │  • python-programming-expert (Python 3.13+, FastAPI, uv)   │  │
│  │  • rust-programming-expert (Rust 2024, Axum, async)        │  │
│  │  • database-orm-expert (Prisma 6, Drizzle, Edge DBs, RLS)  │  │
│  │  • cron-scheduler-expert / async-queue-temporal-expert     │  │
│  │  • email-notification-expert (Email & Push notifications)  │  │
│  │  • file-upload-media-expert (S3, Presigned URLs, CDN)      │  │
│  │  • mcp-server-architect (MCP Server Tools & Zod schemas)   │  │
│  │  • multi-agent-orchestration / ai-llm-integration-expert   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── PHASE 4: Security Hardening ────────────────────────────┐  │
│  │  • supabase-security-expert (RLS policies, Supabase Linter)│  │
│  │  • firebase-security-expert (Rules, App Check, data leak)  │  │
│  │  • authentication-identity-expert (OAuth2, RBAC/ABAC)     │  │
│  │  • zero-trust-secret-vault (Vault, Infisical, key rotation)│  │
│  │  • rate-limit-abuse-prevention (Rate limit & bot protection)│ │
│  │  • secure-fuzz-testing (Coverage-guided fuzzing)           │  │
│  │  • fullstack-expert (OWASP Top 10 & defense-in-depth)      │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── PHASE 5: Testing & Quality Assurance ───────────────────┐  │
│  │  • e2e-testing-expert (Playwright E2E & Vitest integration)│  │
│  │  • browser-automation-expert (Visual regression testing)   │  │
│  │  • secure-fuzz-testing (Security fuzz testing)             │  │
│  │  • error-resilience-expert (Retry logic & circuit breakers)│  │
│  │  • logging-error-tracking-expert (Pino, Sentry correlation)│  │
│  │  • coderabbit (AI code review & PR summarization)          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── PHASE 6: Performance & GEO/SEO ─────────────────────────┐  │
│  │  • seo (Technical SEO, Schema, Sitemap, E-E-A-T audit)     │  │
│  │  • seo-geo (Generative Engine Optimization & llms.txt)     │  │
│  │  • seo-aeo-landing-page-writer (AEO conversion landing)    │  │
│  │  • performance-web-vitals (CWV: LCP, INP, CLS optimization)│  │
│  │  • app-analyzer-optimizer (Bundle analysis & dynamic loading)│
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─── PHASE 7: DevOps & Deployment ───────────────────────────┐  │
│  │  • ci-cd-devops-architect (GitHub Actions, Docker, IaC)    │  │
│  │  • cloud-hosting-expert (Vercel, Cloudflare Workers, AWS)  │  │
│  │  • data-telemetry-expert (OpenTelemetry, PostHog metrics)  │  │
│  │  • session-memory-manager (State checkpoints & handoff)    │  │
│  │  • prd-architect (ADR records & changelog updates)         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Execution Protocol

When this skill is triggered, execute the following 7-phase hardening process **in order**. Each phase produces findings and recommendations. At the end, compile a **Production Readiness Report**.

---

#### PHASE 1: Architecture & Code Quality Audit
**Orchestrates:** `scalability-clean-code`, `fullstack-expert`, `app-analyzer-optimizer`, `monorepo-architect`, `dependency-upgrade-migrator`, `zero-tech-debt-auditor`, `typescript-expert`

**Checklist:**
- [ ] **Project structure** follows clean architecture (Domain → Use Cases → Adapters → Infrastructure)
- [ ] **SOLID principles** are applied consistently — no god classes, no leaky abstractions
- [ ] **DRY violations** identified and refactored into shared utilities/services
- [ ] **API contracts** are spec-first (OpenAPI/GraphQL schema) with proper versioning
- [ ] **Error handling** is structured and consistent (RFC 9457 Problem Details or equivalent)
- [ ] **TypeScript strict mode** enabled (`strict: true` in tsconfig), no `any` types (`typescript-expert`)
- [ ] **Input validation** on all API boundaries (Zod, Pydantic, or equivalent)
- [ ] **No hardcoded values** — all config via environment variables or config files
- [ ] **Sovereign Anti-Slop Audit Passed** — mandatory validation via `node scripts/check-anti-slop.js --strict` to verify 0 placeholders, 0 stubs, 0 syntax comments, and 0 debug logs (`anti-slop`)
- [ ] **Dependency audit** — all packages up-to-date, no known CVEs (`dependency-upgrade-migrator`, `npm audit`)

---

#### PHASE 2: Frontend Hardening
**Orchestrates:** `senior-frontend`, `design-system-architect`, `tailwind-expert`, `form-validation-expert`, `state-management-expert`, `design-system-architect, senior-frontend`, `ui-ux-pro-max`, `hig`, `tanstack-query-expert`, `global-a11y-i18n-expert`

**Checklist:**
- [ ] **Server Components by default** — `'use client'` only when truly needed (state, events, browser APIs)
- [ ] **Proper Suspense boundaries** with meaningful loading states (skeletons, not spinners)
- [ ] **Error boundaries** on all page segments with user-friendly error UI
- [ ] **Form validation** — robust validation with React Hook Form + Zod (`form-validation-expert`)
- [ ] **No hydration mismatches** — no client-only state (`localStorage`, `window`) in initial render
- [ ] **Accessibility (a11y) & i18n** — WCAG 2.2 compliance, ARIA, keyboard nav (`global-a11y-i18n-expert`)
- [ ] **Responsive design** — works flawlessly on mobile (320px), tablet, and desktop (`tailwind-expert`)
- [ ] **Image optimization** — `next/image` with proper sizes, WebP/AVIF format, lazy loading
- [ ] **Font optimization** — `next/font` with font-display: swap, preconnect to font CDN
- [ ] **Bundle analysis** — no unnecessary large libraries, proper code splitting & lazy loading
- [ ] **Meta tags** — proper title, description, OG tags, canonical URL on every page
- [ ] **State management** — TanStack Query for server state, Zustand/Jotai for client state (`state-management-expert`)
- [ ] **Caching strategy** — proper `staleTime`, `gcTime`, and query key factory patterns
- [ ] **UI consistency** — design tokens applied consistently (`design-system-architect`)

---

#### PHASE 3: Backend & AI Services Hardening
**Orchestrates:** `js-backend-expert`, `go-programming-expert`, `python-programming-expert`, `rust-programming-expert`, `database-orm-expert`, `cron-scheduler-expert`, `async-queue-temporal-expert`, `email-notification-expert`, `file-upload-media-expert`, `mcp-server-architect`, `multi-agent-orchestration`, `llm-finops-router`

**Checklist:**
- [ ] **Database migrations** — schema changes via managed migrations (Prisma 6 / Drizzle ORM)
- [ ] **Connection pooling** configured (PgBouncer/Supavisor, edge poolers via `database-orm-expert`)
- [ ] **Proper indexes** on all frequently queried columns (`WHERE`, `JOIN`, `ORDER BY`)
- [ ] **N+1 query prevention** — eager loading or DataLoader pattern for relational data
- [ ] **Query profiling** — `EXPLAIN ANALYZE` run on critical queries, no Seq Scans on large tables
- [ ] **Database backups** — automated backup strategy with tested restore procedures
- [ ] **API rate limiting** — token bucket or sliding window on all public endpoints
- [ ] **Idempotency keys** — all mutation endpoints handle retries safely
- [ ] **Pagination** — cursor-based for large datasets, with consistent response format
- [ ] **Background jobs & cron** — durable workflows (Temporal, BullMQ, Inngest) via `async-queue-temporal-expert`
- [ ] **Transactional Email & Media** — Resend/SES setup (`email-notification-expert`) & Presigned URLs (`file-upload-media-expert`)
- [ ] **MCP & AI Cost Optimization** — MCP schemas guarded (`mcp-server-architect`) & prompt caching active (`llm-finops-router`)
- [ ] **Graceful shutdown** — proper SIGTERM handling, drain connections before exit
- [ ] **Health check endpoints** — `/healthz` (liveness) and `/readyz` (readiness) implemented

---

#### PHASE 4: Security Hardening
**Orchestrates:** `supabase-security-expert`, `firebase-security-expert`, `authentication-identity-expert`, `zero-trust-secret-vault`, `rate-limit-abuse-prevention`, `secure-fuzz-testing`, `fullstack-expert`

**Checklist:**
- [ ] **Authentication** — OAuth 2.0 / OIDC implementation (`authentication-identity-expert`)
- [ ] **Authorization** — RBAC/ABAC with proper middleware on all protected routes
- [ ] **Row-Level Security (RLS)** — enabled on ALL public tables in Supabase/PostgreSQL (`supabase-security-expert`)
- [ ] **Security Rules** — Firebase Firestore/Storage rules are strict (no `allow read, write: if true`)
- [ ] **CORS configuration** — explicit allow-list of origins (never `*` in production)
- [ ] **CSP headers** — Content-Security-Policy configured with strict directives
- [ ] **HTTPS enforced** — HSTS header with `max-age=31536000; includeSubDomains; preload`
- [ ] **Secrets management** — zero-trust secret management via `zero-trust-secret-vault`
- [ ] **Rate Limiting & Abuse Prevention** — DDoS, bot protection, Cloudflare Turnstile (`rate-limit-abuse-prevention`)
- [ ] **`.gitignore` audit** — `.env`, `service-account.json`, private keys are excluded
- [ ] **SQL injection prevention** — all queries use parameterized statements
- [ ] **XSS & CSRF prevention** — output encoding, CSP, anti-CSRF tokens on state-changing endpoints
- [ ] **File upload validation** — content-type checking, size limits, no executable uploads
- [ ] **Webhook signature verification** — all incoming webhooks validate signatures
- [ ] **Audit logging** — sensitive operations logged (login, data export, permission changes, admin actions)

---

#### PHASE 5: Testing & Quality Assurance
**Orchestrates:** `e2e-testing-expert`, `browser-automation-expert`, `coderabbit`, `secure-fuzz-testing`, `error-resilience-expert`, `logging-error-tracking-expert`

**Checklist:**
- [ ] **Unit tests** — Vitest/Jest for frontend, pytest/go test for backend (≥80% coverage target)
- [ ] **Integration tests** — API endpoint tests with real database (test containers)
- [ ] **E2E tests** — Playwright for critical user flows (`e2e-testing-expert`)
- [ ] **Visual E2E testing** — screenshot comparison and UI regression via `browser-automation-expert`
- [ ] **Fuzz testing** — coverage-guided fuzzing on parsers, validators, and streams (`secure-fuzz-testing`)
- [ ] **Error resilience** — retry strategies, circuit breakers, and fallback UI via `error-resilience-expert`
- [ ] **Logging & Error Tracking** — structured JSON logging (Pino/Winston) & Sentry via `logging-error-tracking-expert`
- [ ] **Code review automation** — CodeRabbit configured on all PRs (`coderabbit`)
- [ ] **Type checking & linting** — `tsc --noEmit` and linter pass with zero errors in CI

---

#### PHASE 6: Performance & GEO/SEO Optimization
**Orchestrates:** `seo`, `seo-geo`, `seo-aeo-landing-page-writer`, `performance-web-vitals`, `app-analyzer-optimizer`

**Checklist:**
- [ ] **Core Web Vitals** — LCP < 2.5s, INP < 200ms, CLS < 0.1 (`performance-web-vitals`)
- [ ] **Bundle size** — analyzed and optimized (tree-shaking, dynamic imports, no duplicate deps)
- [ ] **CDN & Caching** — static assets served via CDN with multi-tier caching (Browser → CDN → Redis → DB)
- [ ] **SEO meta tags** — title, description, canonical URL, OG/Twitter cards on every page (`seo`)
- [ ] **Structured data & Sitemap** — Schema.org markup and XML sitemap generated
- [ ] **robots.txt** — properly configured (no accidental disallow of important pages)
- [ ] **AI search readiness (GEO)** — `llms.txt`, semantic HTML, AEO optimization (`seo-geo`, `seo-aeo-landing-page-writer`)
- [ ] **Lighthouse score** — Lighthouse score ≥ 90 on all key pages

---

#### PHASE 7: DevOps & Deployment Readiness
**Orchestrates:** `ci-cd-devops-architect`, `cloud-hosting-expert`, `data-telemetry-expert`, `session-memory-manager`, `prd-architect`

**Checklist:**
- [ ] **Docker** — multi-stage builds, non-root user, HEALTHCHECK, `.dockerignore` configured
- [ ] **CI/CD pipeline** — automated lint → test → build → deploy on push/PR (`ci-cd-devops-architect`)
- [ ] **Edge & Cloud Deployment** — Vercel / Cloudflare Workers / AWS Edge setup (`cloud-hosting-expert`)
- [ ] **Zero-downtime deployment & Rollback** — rolling updates or blue-green strategy with tested rollback
- [ ] **Telemetry & Observability** — OpenTelemetry, PostHog, Prometheus/Grafana (`data-telemetry-expert`)
- [ ] **SLIs/SLOs defined** — error rate < 0.1%, p99 latency < 500ms, uptime > 99.9%
- [ ] **Incident response & Runbooks** — documented runbooks for common failure scenarios
- [ ] **Backup & disaster recovery** — automated database backups, tested restore procedure
- [ ] **Session Checkpoint & Docs** — `session-memory-manager` checkpoint saved, `CHANGELOG.md` & `BLUEPRINT.md` updated (`prd-architect`)

---

### Automated Readiness Scanner
An automated Python scanner script is included at [production_readiness_scanner.py](file:///c:/Users/roedy/.gemini/config/plugins/vibes-plug/skills/production-ready-hardener/scripts/production_readiness_scanner.py) to perform all check phases automatically. It automatically detects technology stacks (Vite, React 19, Supabase, Vitest, Playwright, ESLint) and parses local developer logs (`tsc_errors.txt`, `eslint_output.txt`, etc.) to calculate a live readiness score and compile an interactive, clickable markdown report (`PRODUCTION_READINESS_REPORT.md`).

**Usage:**
```bash
# Run basic static checklist checks on a project
python scripts/production_readiness_scanner.py /path/to/project

# Run active compilation, linting, and test execution diagnostics
python scripts/production_readiness_scanner.py /path/to/project --run-tsc --run-lint --run-tests --run-build
```

---

### Production Readiness Report Format

After completing all 7 phases, compile a **Production Readiness Report** with:

```markdown
# Production Readiness Report

## Executive Summary
Overall readiness score (0-100) with letter grade (A/B/C/D/F).

## Phase Scores
| Phase | Score | Critical Issues | Warnings |
|-------|-------|-----------------|----------|
| 1. Architecture & Code Quality | XX/100 | N | N |
| 2. Frontend Hardening | XX/100 | N | N |
| 3. Backend Hardening | XX/100 | N | N |
| 4. Security Hardening | XX/100 | N | N |
| 5. Testing & QA | XX/100 | N | N |
| 6. Performance & SEO | XX/100 | N | N |
| 7. DevOps & Deployment | XX/100 | N | N |

## 🔴 Critical Issues (Must Fix Before Production)
List of blockers that MUST be resolved.

## 🟡 Warnings (Should Fix)
List of important improvements.

## 🔵 Recommendations (Nice to Have)
List of enhancements for future iterations.

## Remediation Plan
Step-by-step action items ordered by priority.
```

### Scoring Methodology

Each phase is scored 0-100 based on checklist completion:
- **95-100**: Production-ready ✅
- **80-94**: Needs minor fixes ⚠️
- **60-79**: Significant issues 🟡
- **Below 60**: Not production-ready 🔴

**Overall Score** = Weighted average:
- Architecture (10%) + Frontend (15%) + Backend (15%) + **Security (25%)** + Testing (15%) + Performance (10%) + DevOps (10%)

> **Note:** Security is weighted highest because data breaches and vulnerabilities are the most damaging production issues.

### Trigger Conditions
Active whenever the user asks to:
1. Prepare an application for production deployment.
2. Run a production readiness review, pre-launch checklist, or hardening audit.
3. Ensure an application is secure, performant, and robust before going live.
4. Perform a comprehensive quality audit across frontend, backend, and infrastructure.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
**Production-Ready Hardener** adalah skill orkestrator utama yang menggabungkan dan mendelegasikan ke semua skill vibes-plug yang relevan untuk memastikan aplikasi Anda kokoh, aman, berperforma tinggi, dan siap produksi sebelum deployment. Skill ini berfungsi sebagai checklist pra-produksi komprehensif yang tidak meninggalkan celah — dari polish frontend hingga ketahanan backend, dari keamanan data hingga observability.

Skill ini TIDAK menggantikan skill individual — ia **mengoordinasikan** mereka ke dalam alur kerja audit-dan-pengerasan yang terstruktur dan bertahap.

### Peta Skill yang Diorkestrasi

| Fase | Skill yang Digunakan | Fokus Utama |
|------|---------------------|-------------|
| 1. Arsitektur & Kualitas Kode | `scalability-clean-code`, `fullstack-expert`, `app-analyzer-optimizer`, `monorepo-architect`, `dependency-upgrade-migrator`, `anti-slop`, `typescript-expert` | SOLID, DRY, Clean Architecture, RFC 9457 errors, pembersihan AI slop, strict TS |
| 2. Pengerasan Frontend | `senior-frontend`, `design-system-architect`, `tailwind-expert`, `form-validation-expert`, `state-management-expert`, `ui-ux-pro-max`, `hig`, `tanstack-query-expert`, `global-a11y-i18n-expert` | React 19, Error Boundaries, validasi Zod + RHF, a11y, state management, UI primitives |
| 3. Pengerasan Backend | `js-backend-expert`, `go-programming-expert`, `python-programming-expert`, `rust-programming-expert`, `database-orm-expert`, `cron-scheduler-expert`, `async-queue-temporal-expert`, `email-notification-expert`, `file-upload-media-expert`, `mcp-server-architect`, `multi-agent-orchestration`, `ai-llm-integration-expert` | Database migration, ORM, connection pooling, durable background jobs, transactional email, MCP tools, FinOps |
| 4. Pengerasan Keamanan | `supabase-security-expert`, `firebase-security-expert`, `authentication-identity-expert`, `zero-trust-secret-vault`, `rate-limit-abuse-prevention`, `secure-fuzz-testing`, `fullstack-expert` | RLS, RBAC, OAuth2, Turnstile bot protection, Upstash rate limit, secret vault, fuzzing, XSS/CSRF |
| 5. Testing & QA | `e2e-testing-expert`, `browser-automation-expert`, `coderabbit`, `secure-fuzz-testing`, `error-resilience-expert`, `logging-error-tracking-expert` | E2E (Playwright), visual testing, Unit (Vitest), circuit breaker, Sentry & Pino logging |
| 6. Performa & SEO | `seo`, `seo-geo`, `seo-aeo-landing-page-writer`, `performance-web-vitals`, `app-analyzer-optimizer` | Core Web Vitals (LCP, INP, CLS), bundle, CDN, sitemap, llms.txt & AEO |
| 7. DevOps & Observability | `ci-cd-devops-architect`, `cloud-hosting-expert`, `data-telemetry-expert`, `session-memory-manager`, `prd-architect` | Docker, CI/CD pipeline, OpenTelemetry, PostHog, Vercel/Cloudflare, state checkpoint & CHANGELOG |

### Protokol Eksekusi

Ketika skill ini dipicu, jalankan **7 fase pengerasan berurutan**. Setiap fase menghasilkan temuan dan rekomendasi. Di akhir, compile sebuah **Laporan Kesiapan Produksi**.

---

#### FASE 1: Audit Arsitektur & Kualitas Kode
- [ ] Struktur proyek mengikuti clean architecture
- [ ] Prinsip SOLID diterapkan konsisten
- [ ] Pelanggaran DRY diidentifikasi dan di-refactor
- [ ] Kontrak API menggunakan desain spec-first (OpenAPI/GraphQL)
- [ ] Error handling terstruktur dan konsisten (RFC 9457)
- [ ] TypeScript strict mode aktif (`strict: true`), tanpa tipe `any` (`typescript-expert`)
- [ ] Validasi input di semua batas API (Zod, Pydantic)
- [ ] Tidak ada hardcoded value — semua konfigurasi via environment variable
- [ ] Audit Anti-Slop Berdaulat Lolos — validasi wajib via `node scripts/check-anti-slop.js --strict` untuk menjamin 0 placeholder, 0 stub, 0 komentar sintaksis, dan 0 sampah debug (`anti-slop`)
- [ ] Audit dependensi — semua paket up-to-date, tanpa CVE (`dependency-upgrade-migrator`)

#### FASE 2: Pengerasan Frontend
- [ ] Server Components secara default
- [ ] Suspense boundary dengan loading state bermakna
- [ ] Error boundary di setiap segmen halaman
- [ ] Validasi formulir ketat dengan React Hook Form + Zod (`form-validation-expert`)
- [ ] Tidak ada hydration mismatch
- [ ] Aksesibilitas (a11y) & i18n — WCAG 2.2, ARIA, navigasi keyboard (`global-a11y-i18n-expert`)
- [ ] Desain responsif — berfungsi sempurna di mobile, tablet, desktop (`tailwind-expert`)
- [ ] Optimasi gambar dengan `next/image`, WebP/AVIF, lazy loading
- [ ] Analisis bundle — tanpa library besar yang tidak perlu
- [ ] Meta tags lengkap di setiap halaman
- [ ] Strategi state management (`state-management-expert`) dan caching yang tepat

#### FASE 3: Pengerasan Backend
- [ ] Semua perubahan schema via database migration (Prisma 6 / Drizzle ORM)
- [ ] Connection pooling dikonfigurasi (`database-orm-expert`)
- [ ] Index yang tepat pada kolom yang sering di-query
- [ ] Pencegahan N+1 query
- [ ] API rate limiting & idempotency keys aktif
- [ ] Durable background jobs & cron queues (`async-queue-temporal-expert`)
- [ ] Email transaksional & upload media presigned (`email-notification-expert`, `file-upload-media-expert`)
- [ ] Skema MCP Server guarded & optimasi prompt caching (`llm-finops-router`)
- [ ] Graceful shutdown dengan penanganan SIGTERM
- [ ] Health check endpoint (`/healthz`, `/readyz`)

#### FASE 4: Pengerasan Keamanan
- [ ] Autentikasi OAuth 2.0 / OIDC (`authentication-identity-expert`)
- [ ] Otorisasi RBAC/ABAC pada semua route dilindungi
- [ ] RLS aktif di SEMUA tabel publik (Supabase/PostgreSQL) (`supabase-security-expert`)
- [ ] Firebase Security Rules ketat
- [ ] CORS dengan allow-list eksplisit (bukan `*`)
- [ ] CSP headers dikonfigurasi
- [ ] HTTPS dipaksakan dengan HSTS
- [ ] Semua secret di environment variable / secret manager (`zero-trust-secret-vault`)
- [ ] Rate limiting & proteksi bot Turnstile (`rate-limit-abuse-prevention`)
- [ ] `.gitignore` mencakup `.env` dan file sensitif
- [ ] Pencegahan SQL injection, XSS, CSRF
- [ ] Validasi file upload (content-type, size limit)
- [ ] Verifikasi tanda tangan webhook & audit logging

#### FASE 5: Testing & Quality Assurance
- [ ] Unit test (≥80% coverage)
- [ ] Integration test dengan database real
- [ ] E2E test untuk alur kritis (Playwright) (`e2e-testing-expert`)
- [ ] Visual regression testing (`browser-automation-expert`)
- [ ] Fuzz testing pada parser dan validator (`secure-fuzz-testing`)
- [ ] Error resilience (circuit breaker & retry logic) (`error-resilience-expert`)
- [ ] Structured logging (Pino) & error tracking (Sentry) (`logging-error-tracking-expert`)
- [ ] Code review automation (CodeRabbit) (`coderabbit`)
- [ ] Type checking dan linting di CI tanpa error

#### FASE 6: Optimasi Performa & SEO
- [ ] Core Web Vitals memenuhi target (LCP < 2.5s, INP < 200ms, CLS < 0.1) (`performance-web-vitals`)
- [ ] Bundle size dioptimasi
- [ ] CDN untuk aset statis
- [ ] Caching multi-tier (Browser → CDN → Redis → Database)
- [ ] SEO meta tags lengkap (`seo`)
- [ ] Structured data (Schema.org) & XML Sitemap
- [ ] Kesiapan AI search & AEO (`seo-geo`, `seo-aeo-landing-page-writer`, `llms.txt`)

#### FASE 7: DevOps & Kesiapan Deployment
- [ ] Docker multi-stage build, non-root user, HEALTHCHECK
- [ ] CI/CD pipeline otomatis (lint → test → build → deploy) (`ci-cd-devops-architect`)
- [ ] Edge & Cloud Deployment (Vercel/Cloudflare Workers) (`cloud-hosting-expert`)
- [ ] Zero-downtime deployment & strategi rollback yang teruji
- [ ] Telemetri & observability (OpenTelemetry, PostHog, Sentry) (`data-telemetry-expert`)
- [ ] Structured logging format JSON
- [ ] SLI/SLO terdefinisi & backup database otomatis
- [ ] Session state checkpoint disimpan (`session-memory-manager`)
- [ ] Dokumentasi terkini (`CHANGELOG.md`, `BLUEPRINT.md`, `README`) (`prd-architect`)

---

### Scanner Kesiapan Otomatis
Script scanner Python otomatis tersedia di [production_readiness_scanner.py](file:///c:/Users/roedy/.gemini/config/plugins/vibes-plug/skills/production-ready-hardener/scripts/production_readiness_scanner.py) untuk menjalankan seluruh fase pemeriksaan secara otomatis. Scanner ini mendeteksi stack teknologi (Vite, React 19, Supabase, Vitest, Playwright, ESLint) serta mem-parsing file log error lokal (`tsc_errors.txt`, `eslint_output.txt`, dll) untuk mengkalkulasi skor kesiapan rilis dan menyusun laporan markdown interaktif (`PRODUCTION_READINESS_REPORT.md`).

**Cara Penggunaan:**
```bash
# Jalankan pemeriksaan checklist statis dasar pada proyek
python scripts/production_readiness_scanner.py /path/to/project

# Jalankan diagnostik aktif termasuk typecheck tsc, linter eslint, unit test, dan bundle build
python scripts/production_readiness_scanner.py /path/to/project --run-tsc --run-lint --run-tests --run-build
```

---

### Metodologi Penilaian

Setiap fase dinilai 0-100 berdasarkan penyelesaian checklist:
- **95-100**: Siap produksi ✅
- **80-94**: Perlu perbaikan minor ⚠️
- **60-79**: Ada masalah signifikan 🟡
- **Di bawah 60**: Belum siap produksi 🔴

**Skor Keseluruhan** = Rata-rata berbobot:
- Arsitektur (10%) + Frontend (15%) + Backend (15%) + **Keamanan (25%)** + Testing (15%) + Performa (10%) + DevOps (10%)

> **Catatan:** Keamanan diberi bobot tertinggi karena pelanggaran data dan kerentanan adalah masalah produksi yang paling merusak.

### Kondisi Pemicu
Aktif setiap kali pengguna meminta untuk:
1. Mempersiapkan aplikasi untuk deployment produksi.
2. Menjalankan review kesiapan produksi, checklist pra-peluncuran, atau audit pengerasan.
3. Memastikan aplikasi aman, berperforma tinggi, dan kokoh sebelum go-live.
4. Melakukan audit kualitas komprehensif di seluruh frontend, backend, dan infrastruktur.

### Referensi Dokumentasi
- [Production Readiness Checklist](file:///c:/Users/roedy/.gemini/config/plugins/vibes-plug/skills/production-ready-hardener/references/production_checklist.md)
- [Security Hardening Guide](file:///c:/Users/roedy/.gemini/config/plugins/vibes-plug/skills/production-ready-hardener/references/security_hardening_guide.md)
- [Performance Optimization Guide](file:///c:/Users/roedy/.gemini/config/plugins/vibes-plug/skills/production-ready-hardener/references/performance_optimization.md)