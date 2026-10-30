---
name: saas-architect
description: "Master SaaS orchestrator for greenfield MVP launch (0 to 1) and legacy application SaaS transformation (1 to N) / Master orkestrator SaaS untuk peluncuran MVP dari nol (0 ke 1) dan transformasi aplikasi menjadi SaaS (1 ke N)."
author: "Roedy Rustam"
version: "4.3.0"
---

# SaaS Architect (MVP Launcher & Transformation Master)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with domain skills like `brainstorming`, `zero-to-prod-orchestrator`, `saas-multi-tenant`, `saas-billing`, `session-memory-manager`, `prd-architect`, and `production-ready-hardener`.
- **MANDATORY**: Execute `senior-frontend` FIRST for all frontend HTML/CSS/JS features to ensure compliance with modern standards.

### Description
The **SaaS Architect** is the master lifecycle orchestrator for building commercial SaaS platforms. It operates in two specialized modes:
- **Mode A (Greenfield MVP 0-to-1)**: Validating ideas, rapid stack selection, multi-entry points architecture, authentication, billing setup, and launch checklist.
- **Mode B (App Modernization 1-to-N)**: Systematically converting existing single-tenant or internal applications into enterprise-grade multi-tenant SaaS platforms using a 9-phase transformation pipeline.

### Trigger Conditions
- Planning or launching a brand-new SaaS product from scratch.
- Modernizing or converting an existing web app into a commercial SaaS.
- Setting up multi-tenancy, workspace isolation, team management, or feature gating.
- Conducting a technical audit of an existing SaaS architecture.

---

### Mode A: Greenfield SaaS MVP (0 to 1)

#### 1. Idea Validation & Scoping
- Define the exact customer problem in one sentence.
- Verify 3+ pre-commitments or letters of intent before deep coding.
- Keep MVP scope tight (target 4-6 weeks to launch).

#### 2. Modern SaaS Stack Blueprint (2026)
- **Frontend & App**: Next.js 15 App Router + React 19 + TypeScript.
- **Styling & UI**: Tailwind CSS v4 + Base UI / shadcn/ui primitives.
- **Data Layer**: PostgreSQL (Neon Serverless / Supabase) via Drizzle ORM or Prisma 6.
- **Auth**: Clerk, Auth.js v5, or Supabase Auth with OAuth2 PKCE.
- **Billing**: Stripe / Midtrans / DOKU via webhook-driven synchronization.
- **Email & Jobs**: Resend + React Email; BullMQ / Trigger.dev v3 for background jobs.
- **Deployment**: Vercel / Cloudflare Edge with zero-config CI/CD.

#### 3. Architecture & Entry Points Isolation
Apply the multiple-entry-points architecture (guided by `cloud-hosting-expert`) to segregate responsibilities:
- **Public Entry (`app.example.com` or `example.com`)**: Marketing landing, pricing, documentation, and blog.
- **Tenant Dashboard (`app.example.com/dashboard` or `[tenant].example.com`)**: Authenticated customer workspace.
- **Super Admin Subdomain (`admin.example.com`)**: Dedicated subdomain strictly isolated from customer tenant routes for global metrics, tenant provisioning, user moderation, and feature override controls.

#### 4. Pre-Launch Quality Gate
- Authentication and session validation (Edge JWT + Redis caching).
- Webhook signature validation active for all billing events.
- Error tracking configured (Sentry) and rate limiting on API routes.
- ToS, Privacy Policy, and 2-3 pricing tiers with trial workflows.

---

### Mode B: SaaS Transformation & Modernization (1 to N)

For existing codebases, execute the structured 9-phase transformation pipeline:

```
┌──────────────────────────────────────────────────────────────────┐
│                   SAAS TRANSFORMATION PIPELINE                   │
│  Phase 1: Discovery & Architecture Audit (Scanner script)        │
│  Phase 2: Multi-Tenancy & Data Isolation (saas-multi-tenant)    │
│  Phase 3: Identity & RBAC Management (authentication-identity)  │
│  Phase 4: Billing, Subscriptions & Webhooks (saas-billing)      │
│  Phase 5: Workspace & Team Collaboration (Invites, Roles)        │
│  Phase 6: Frontend App Shell & Multi-Entry Points               │
│  Phase 7: Feature Gating, Limits & Metering                     │
│  Phase 8: Production Hardening, Testing & Security Audit        │
│  Phase 9: Deployment, Multi-Tenant Monitoring & Launch          │
└──────────────────────────────────────────────────────────────────┘
```

#### Transformation Scanner
Run `python scripts/saas_transformation_scanner.py` to inspect the legacy codebase. It scores readiness across:
1. Multi-Tenancy Readiness (Foreign keys, tenant isolation)
2. Auth & RBAC Maturity
3. Billing & Subscription hooks
4. Feature Gating presence

#### Core Modernization Principles
- **Data Isolation**: Refer to `saas-multi-tenant` for Shared Schema RLS or Schema-per-tenant patterns. Do not write raw duplicate schemas.
- **Subscription State Machine**: Refer to `saas-billing` for webhook handling, invoice synchronization, and dunning cycles.
- **Feature Gating**: Implement hierarchical checks (System Flag -> Plan Tier -> Tenant Addon -> User Role) as detailed in `references/feature_gating_patterns.md`.

---

### 🎨 Automatic Visual Assets Generation Mandate (CRITICAL)
When initializing or scaffolding any new SaaS application:
1. Automatically invoke `generate_image` to create a production-quality application logo matching the brand identity.
2. Use this asset immediately as the navbar logo, browser favicon (`favicon.ico`), and Open Graph social banner (`og:image`). Never use placeholder icons.

### 📄 Standard Pages Mandate
Every SaaS application must scaffold complete, functional implementations for:
- Landing Page (Hero, Features, Social Proof, Pricing, FAQ)
- Authentication (Sign In, Sign Up, Password Reset, Magic Link)
- Onboarding Wizard (<5 minutes to first value)
- Settings (Profile, Workspace, Team Members, Billing / Plans, API Keys)
- Super Admin Panel on dedicated subdomain (`admin.example.com`)

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain seperti `brainstorming`, `zero-to-prod-orchestrator`, `saas-multi-tenant`, `saas-billing`, `session-memory-manager`, `prd-architect`, dan `production-ready-hardener`.
- **WAJIB**: Jalankan `senior-frontend` PERTAMA KALI untuk semua pengerjaan frontend web.

### Deskripsi
**SaaS Architect** adalah orkestrator siklus hidup utama untuk membangun platform SaaS komersial. Beroperasi dalam dua mode:
- **Mode A (Greenfield MVP 0 ke 1)**: Validasi ide, pemilihan tech stack kilat, arsitektur multi-entry points, autentikasi, billing, dan checklist peluncuran.
- **Mode B (Modernisasi Aplikasi 1 ke N)**: Mentransformasi aplikasi single-tenant atau internal yang sudah ada menjadi SaaS multi-tenant enterprise menggunakan pipeline 9 fase terstruktur.

### Kondisi Pemicu
- Membangun produk SaaS baru dari awal.
- Memodernisasi atau mengubah aplikasi web biasa menjadi SaaS komersial.
- Mengonfigurasi multi-tenancy, isolasi ruang kerja (workspace), manajemen tim, atau feature gating.
- Melakukan audit arsitektur teknis SaaS.

---

### Mode A: SaaS MVP dari Nol (0 ke 1)
1. **Validasi Ide**: Rumuskan masalah dalam satu kalimat, validasi dengan 3+ komitmen bayar sebelum mulai coding.
2. **Tech Stack Modern (2026)**: Next.js 15 App Router, Tailwind CSS v4, PostgreSQL (Neon/Supabase) via Drizzle/Prisma, Clerk/Auth.js, Stripe/Midtrans/DOKU, Resend, Vercel.
3. **Isolasi Entry Point**: Pisahkan landing page publik, dashboard penyewa (tenant), dan **Dashboard Super Admin** pada subdomain terpisah (`admin.example.com`).
4. **Gerbang Kualitas Pra-Rilis**: Sesi login teroptimasi (JWT + Redis), webhook billing tervalidasi, Sentry aktif, rate limiting, halaman harga 2-3 tier.

---

### Mode B: Transformasi & Modernisasi SaaS (1 ke N)
Gunakan pipeline 9 fase terstruktur:
1. Audit arsitektur & jalankan `python scripts/saas_transformation_scanner.py`.
2. Fondasi multi-tenancy (merujuk ke `saas-multi-tenant`).
3. Autentikasi terpusat & RBAC (merujuk ke `authentication-identity-expert`).
4. Mesin billing & siklus langganan (merujuk ke `saas-billing`).
5. Manajemen tim & undangan workspace.
6. Shell frontend & pemisahan entry point.
7. Feature gating berjenjang (`references/feature_gating_patterns.md`).
8. Pengujian E2E & hardening keamanan.
9. Rilis & pemantauan multi-tenant.

---

### 🎨 Mandat Pembuatan Aset Visual Otomatis (KRITIS)
Gunakan tool `generate_image` secara otomatis untuk membuat logo aplikasi kustom saat inisialisasi aplikasi. Pasang logo tersebut sebagai logo navbar, favicon (`favicon.ico`), dan gambar Open Graph (`og:image`). Dilarang memakai placeholder.