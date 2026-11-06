---
name: zero-to-prod-orchestrator
description: "Master orchestrator to build an application from scratch to a production-ready release, enforcing strict step-by-step progression and continuous documentation / Orkestrator utama untuk membangun aplikasi dari nol hingga rilis siap produksi dengan dokumentasi bertahap."
author: "Roedy Rustam"
version: "4.3.0"
---

# Zero to Production Orchestrator (2026 Master Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Overview
The **Zero to Production Orchestrator** is the ultimate master skill designed to orchestrate the entire `vibes-plug` ecosystem as a highly interconnected **engineering swarm**. By acting as the central conductor, it ensures that no sub-skill is executed in isolation. It guides fullstack developers through the complete software engineering lifecycle — from concept discovery to AI integration, multi-platform backend architecture, design systems, automated testing, GEO/AEO optimization, and production deployment.

### Trigger Conditions
- Starting any new application development from scratch.
- Asking for a complete, end-to-end fullstack development roadmap.
- Orchestrating multiple domain skills across UI, Backend, AI/LLM, Database, Security, and Cloud.

### Core Principles & Hard Gates
1. **Never Skip Phases**: Each phase must be completed and validated before advancing to the next.
2. **Continuous Auto-Documentation**: Invoke `prd-architect` to log changes in `CHANGELOG.md` and `BLUEPRINT.md` after every major milestone.
3. **Strict Progress Tracking**: Maintain a `PROGRESS.md` checklist in the repository root.
4. **State Preservation & Context**: Utilize `session-memory-manager` when pausing work or starting a new session to preserve full context.
5. **Sovereign Anti-Slop Mandate**: Zero-tolerance for placeholders (`// TODO`, `// ...`), mock data in prod, syntax comments, and sycophancy across all phases. Run `node scripts/check-anti-slop.js --strict` as a mandatory validation gate before phase completion.

---

### 🐝 Swarm Execution Topologies & Subagent Delegation Protocols (2026 Master)

Whenever executing complex multi-domain phases, the Orchestrator MUST act as **Swarm Director** and delegate to specialized subagents in parallel:

#### 1. Topology Selection
- **Fan-Out / Fan-In**: Used in Phase 4 (APIs + MCP + DB) and Phase 5 (Frontend UI + Mobile + Animations).
  - *Director* dispatches Subagent A (Frontend UI via `senior-frontend`), Subagent B (Backend API via `js-backend-expert`), Subagent C (DB Migration via `database-orm-expert`).
  - Collects results and runs integration verification.
- **Pipeline Saga**: Sequential execution across Phases 1 to 8. Each phase produces a checkpoint artifact (`CONTEXT_MAP.md`, `BLUEPRINT.md`).
- **Critic-Validator Gate**: Used in Phase 6. Implementer agent submits code -> Auditor agent (`coderabbit`, `autonomous-red-teamer`) reviews -> Fixer agent (`autonomous-tdd-debugger`) resolves failures.

#### 2. Subagent Context Passing Protocol
When delegating to any subagent, ALWAYS pass:
1. Exact scope and non-goals.
2. File paths of relevant schemas (`schema.prisma` / `schema.ts`) and API routes.
3. Path to `PRD.md` and `BLUEPRINT.md`.
4. Verification command (e.g. `npm test`, `tsc --noEmit`) to confirm completion before returning.

#### 3. Sovereign Token Frugality & Context Pruning Protocol
To maintain token efficiency without sacrificing skill capabilities:
1. **Selective Context Slicing**: Never pass the entire global chat transcript to subagents. Pass only targeted interface types, local schema slices, and the active task boundary (`CONTEXT_MAP.md` slice).
2. **Deterministic KV-Cache Prefix Locking**: Ensure static prompt instructions, tool definitions, and skill contracts remain byte-identical across calls (`kv-cache-prefix-optimizer`) to maximize prompt caching hit rates (75-90% discount).
3. **Adaptive Model Cascading (`adaptive-model-cascade`)**:
   - `flash_lite` / `flash`: Discovery, AST scans, file searches, lint checks, and localized test validations.
   - `pro` / `inherit`: Architectural synthesis, multi-domain schemas, and security red-teaming.
4. **Ultra-Compact Phase Checkpointing (`session-memory-manager`)**:
   - At the completion of each phase, persist a compressed checkpoint (<300 tokens) in `PROGRESS.md` and `CHECKPOINT.md`.
5. **Non-Degradation Invariant**: Never truncate code with `// TODO`, `// ...`, or partial stubs to save tokens. Code quality and completeness must remain 100%.

---

### The 8-Phase Master Fullstack Pipeline

```
  PHASE 1          PHASE 2          PHASE 3          PHASE 4
Discovery/PRD ---> Foundation ---> Database/ORM ---> Backend/APIs
      |                                                   |
      v                                                   v
  PHASE 8          PHASE 7          PHASE 6          PHASE 5
Launch/Deploy <--- Security/GEO <--- Testing/QA  <--- Frontend/UI
```

#### PHASE 1: Discovery & AI PRD Architectural Planning
**Orchestrates:** `prd-architect`, `brainstorming`, `deep-research-analyst`, `mcp-server-architect`, `session-memory-manager`, `dependency-upgrade-migrator`, `app-analyzer-optimizer`, `seo`, `saas-architect`, `web-scraper`, `website-design-cloner`, `screenshot-to-code-expert`, `multimodal-spatial-video-cloner`, `headless-cms-expert`, `wordpress-headless-expert`, `documentation-site-expert`, `anti-slop`, `speculative-multi-draft-synthesizer`, `thinking-budget-orchestrator`
- [ ] Conduct structured dialogue to clarify product intent, target audience, and non-functional goals.
- [ ] Automatically draft a comprehensive Product Requirements Document (PRD.md), Entity Relationship Diagram (ERD.md), and Documentation (DOKUMENTASI.md) alongside the Roadmap (ROADMAP.md).
- [ ] Determine dynamic thinking budget profile (`thinking-budget-orchestrator`) across speed (1,024t), balanced (4,096t), deep (32,768t), or exhaustive (65,536t).
- [ ] Plan AI/LLM integration strategy (Vercel AI SDK, MCP Server tools, or Multi-Agent Graph).
- [ ] For existing projects: audit dependency health and plan upgrades with `dependency-upgrade-migrator`.
- [ ] Initialize `BLUEPRINT.md` and `PROGRESS.md`.

#### PHASE 2: Project Foundation & Monorepo Setup
**Orchestrates:** `monorepo-architect`, `micro-frontend-architect`, `bun-runtime-expert`, `python-programming-expert`, `go-programming-expert`, `ci-cd-devops-architect`, `spa-orchestrator`, `mpa-orchestrator`, `cloud-hosting-expert`, `mvc-expert`, `scalability-clean-code`, `api-design-expert`, `legacy-code-translator`, `web-3d-graphics-expert`, `web-game-engine-expert`, `glsl-shader-expert`, `webxr-ar-vr-expert`, `rust-programming-expert`, `typescript-expert`, `biome-linter-formatter-expert`, `composable-mach-architect`, `living-codebase-ast-graph`, `formal-spec-z3-verifier`, `structured-output-contracts`
- [ ] Initialize monorepo (Turborepo + pnpm workspaces) or single repo foundation.
- [ ] Set up language runtimes: Node.js 24 LTS / Bun 1.2+ / Python 3.14+ (uv) / Go 1.25+ / Rust 2024.
- [ ] Configure `Biome v2` (Rust-based linter + formatter) or `Ruff`, `ESLint`, `Prettier`, and TypeScript strict configurations.
- [ ] Establish strict JSON Schema and type contracts with `structured-output-contracts`.
- [ ] Setup initial CI/CD pipeline template (GitHub Actions, Docker).

#### PHASE 3: Database & Multi-Tenant Core Architecture
**Orchestrates:** `fullstack-expert`, `database-orm-expert`, `domain-driven-design-expert`, `saas-multi-tenant`, `supabase-security-expert`, `data-pipeline-etl-expert`, `search-engine-expert`, `xerj-search-expert`, `geospatial-maps-expert`, `graph-rag-knowledge-expert`
- [ ] Design normalized relational schemas, document models, and geospatial PostGIS structures.
- [ ] Configure ORM layer (Drizzle ORM / Prisma 6 / SQLx / sqlc) and full-text search indexing (Typesense/Meilisearch/XERJ).
- [ ] Implement Row-Level Security (RLS) policies and tenant isolation.
- [ ] Apply initial database migrations and connection poolers (PgBouncer/Supavisor/Neon).

#### PHASE 4: Backend APIs, Microservices & AI Agents
**Orchestrates:** `js-backend-expert`, `go-programming-expert`, `pydantic-ai-expert`, `vercel-ai-sdk-expert`, `frontier-ai-models-expert`, `synthetic-data-finetuning-expert`, `graphql-apollo-expert`, `openapi-swagger-codegen-expert`, `spec-driven-development-expert`, `ai-llm-integration-expert`, `ai-prompt-engineering-expert`, `ai-media-generation-expert`, `multi-agent-orchestration`, `mcp-server-architect`, `authentication-identity-expert`, `email-notification-expert`, `cron-scheduler-expert`, `rate-limit-abuse-prevention`, `file-upload-media-expert`, `saas-billing`, `agentic-micro-economy-architect`, `agentic-m2m-settlement`, `payment-gateway-expert`, `vector-db-rag-expert`, `async-queue-temporal-expert`, `doku-mcp-server`, `xerj-search-expert`, `event-driven-architect`, `gemini-agent-booster`, `realtime-collaboration-expert`, `api-gateway-proxy-expert`, `wasm-edge-computing-expert`, `sse-websocket-streaming-expert`, `n8n-automation-expert`, `chatbot-messaging-expert`, `pdf-document-generation-expert`, `ecommerce-expert`, `blockchain-web3-expert`, `local-slm-edge-ai-expert`, `voice-ai-realtime-agent`, `affective-computing-emotion-ai`, `graph-rag-knowledge-expert`, `browser-automation-expert`, `agentic-memory-architect`, `llm-finops-router`, `test-time-compute-optimizer`, `kv-cache-prefix-optimizer`, `speculative-multi-draft-synthesizer`, `autonomous-api-drift-healer`, `ephemeral-wasm-sandbox-executor`, `context-window-engineer`, `adaptive-model-cascade`, `llm-observability-expert`, `prompt-injection-firewall`, `thinking-budget-orchestrator`, `structured-output-contracts`, `parallel-tool-orchestrator`
- [ ] Build high-throughput REST / GraphQL / gRPC APIs using Fastify 5, NestJS, Hono, Gin, or Axum.
- [ ] Implement authentication (Clerk, Auth.js, Supabase Auth) and RBAC middleware.
- [ ] Build MCP Server tools or stateful LangGraph multi-agent workflows with human-in-the-loop gates.
- [ ] Orchestrate concurrent parallel tool execution (`parallel-tool-orchestrator`) with `vibes_batch` and `Promise.allSettled`.
- [ ] Enforce strict schema guarantees and zero-drift output types (`structured-output-contracts`).
- [ ] Allocate dynamic thinking token budgets (`thinking-budget-orchestrator`) per subagent complexity.
- [ ] Integrate AI media generation (Flux/ElevenLabs/Whisper), chatbot platforms (WhatsApp/Telegram/Discord), and n8n automations.
- [ ] Implement context window engineering (sliding window, retrieval-augmented injection) and dynamic model cascading (`adaptive-model-cascade`, `context-window-engineer`).
- [ ] Integrate prompt injection defenses, input sanitization, and output guardrails (`prompt-injection-firewall`).
- [ ] Set up LLM observability, latency tracking, hallucination monitoring, and token spend telemetry (`llm-observability-expert`).
- [ ] Implement background processing queues (BullMQ + Redis), scheduled jobs, and rate limiters.
- [ ] Set up transactional email pipeline (Resend/Postmark) and PDF generation.
- [ ] Implement file upload with presigned URLs (S3/R2) and media processing.
- [ ] Deploy Computer-Using Agent (CUA) patterns for autonomous browser interactions.
- [ ] Setup continuous multimodal streaming API for realtime voice and vision.
- [ ] Orchestrate narrative simulation agents with human-like behavioral modeling.
- [ ] Integrate episodic memory system for long-term agent context retention.

#### PHASE 5: Frontend, Design Systems & Mobile Apps
**Orchestrates:** `modern-web-guidance`, `design-system-architect`, `senior-frontend`, `anti-slop`, `vercel-ai-sdk-expert`, `nextjs-app-router-expert`, `vue-frontend-expert`, `astro-framework-expert`, `svelte-sveltekit-expert`, `solidjs-expert`, `angular-expert`, `tailwind-expert`, `tanstack-query-expert`, `spa-orchestrator`, `mobile-expo-expert`, `apple-ecosystem-expert`, `tauri-expert`, `desktop-electron-expert`, `browser-extension-mv3-pro`, `form-validation-expert`, `svg-animation-motion-expert`, `app-promo-media-expert`, `web-3d-graphics-expert`, `web-game-engine-expert`, `glsl-shader-expert`, `webxr-ar-vr-expert`, `browser-automation-expert`, `hig`, `global-a11y-i18n-expert`, `state-management-expert`, `ui-ux-pro-max`, `affective-computing-emotion-ai`, `data-visualization-expert`, `rich-text-editor-expert`, `documentation-site-expert`, `blockchain-web3-expert`, `modern-css-native-expert`, `pwa-offline-first-expert`, `ephemeral-generative-ui-architect`, `multimodal-spatial-video-cloner`, `screenshot-to-code-expert`, `visual-ui-auditor`, `parallel-tool-orchestrator`
- [ ] **MANDATORY**: Run `modern-web-guidance` FIRST before implementing any frontend HTML/CSS/JS features to ensure compliance with modern standards.
- [ ] Enforce Sovereign Anti-Slop UI standards (`anti-slop`): eradicate generic gradients, bento defaults, excessive glassmorphism, decorative dots/badges, and fake stat cards.
- [ ] Audit rendered UI elements against Pillar 7 standards with multimodal vision critic (`visual-ui-auditor`).
- [ ] Implement design tokens (OKLCH) and Tailwind CSS v4 `@theme` directive tokens.
- [ ] Construct accessible component primitives using Radix UI / Base UI and CVA variants.
- [ ] Convert UI screenshots, Figma frames, or whiteboard sketches into pixel-perfect frontend components with `screenshot-to-code-expert`.
- [ ] Integrate data visualizations (Recharts/Tremor/D3) and rich text editors (Tiptap/Lexical).
- [ ] Build React 19 / Next.js 15, Vue 3, Astro 5, Svelte 5, SolidJS 2, or Angular 19+ apps with state management and Web3 wallets.
- [ ] **MANDATORY**: Automatically scaffold standard pages: About, Profile, Contact, Terms of Reference/Service, and Privacy Policy.
- [ ] Implement complex forms with React Hook Form + Zod validation.
- [ ] If 3D Web or Web Games: architect with WebGPU (`WebGPURenderer`, PlayCanvas, or Babylon.js), KTX2 Basis Universal texture compression, Meshopt geometry, fixed-timestep physics loops, zero-GC object pooling, and 3D spatial audio.
- [ ] If SPA architecture — coordinate with `spa-orchestrator` for routing (TanStack Router), state (TanStack Query v5), and decoupled API layer.
- [ ] Integrate frontend state management with TanStack Query v5.

#### PHASE 6: Automated Testing, Error Resilience & Security Audit
**Orchestrates:** `e2e-testing-expert`, `accessibility-testing-expert`, `autonomous-red-teamer`, `firebase-security-expert`, `error-resilience-expert`, `logging-error-tracking-expert`, `anti-slop`, `coderabbit`, `autonomous-tdd-debugger`, `browser-automation-expert`, `zero-trust-secret-vault`, `post-quantum-crypto-migrator`, `compliance-gdpr-privacy-expert`, `ai-safety-governance-expert`, `agentic-coding-workflow-expert`, `zero-tech-debt-auditor`, `living-codebase-ast-graph`, `ephemeral-wasm-sandbox-executor`, `formal-spec-z3-verifier`, `ai-code-review-autonomous`, `prompt-injection-firewall`, `property-mutation-testing-expert`, `spec-driven-development-expert`, `mcp-sampling-critic`, `visual-ui-auditor`
- [ ] Write unit and integration tests with Vitest and pytest.
- [ ] Run autonomous multi-pass AI code self-review (`ai-code-review-autonomous`) across syntax, logic correctness, and security.
- [ ] Execute `sampling/createMessage` Critic-in-the-Loop review gates (`mcp-sampling-critic`) before merging or deployment.
- [ ] Execute visual UI regression audits (`visual-ui-auditor`) against Pillar 7 design standards.
- [ ] Execute property-based testing and mutation testing (`property-mutation-testing-expert`) with fast-check and Stryker to verify test suite invariants.
- [ ] Execute security fuzz testing (Atheris / cargo-fuzz / native Go fuzzing).
- [ ] Implement Error Boundaries, retry patterns, circuit breakers, and graceful degradation.
- [ ] Set up structured logging (Pino) and error tracking (Sentry) with source map uploads.
- [ ] Audit CORS, CSP headers, rate-limiting, and input sanitization.
- [ ] Run automated Anti-Slop Audit (`node scripts/check-anti-slop.js --strict`) to eliminate placeholders, syntax comments, and mock data before user handoff.
- [ ] Run Zero Technical Debt audit (`zero-tech-debt-auditor`) for dead code elimination (Knip protocol), DRY enforcement, and TypeScript strictness.

#### PHASE 7: DevOps, Deployment & Proactive Monitoring
**Orchestrates:** `ci-cd-devops-architect`, `cloud-hosting-expert`, `performance-web-vitals`, `logging-error-tracking-expert`, `production-ready-hardener`, `proactive-background-watcher`, `data-telemetry-expert`, `feature-flag-analytics-expert`, `error-resilience-expert`, `self-healing-cloud-orchestrator`, `llm-observability-expert`
- [ ] Perform pre-launch audit across Core Web Vitals (LCP, INP, CLS) and bundle sizes.
- [ ] Configure production monitoring, alerting rules, and on-call notifications.
- [ ] Configure LLM observability dashboards (Langfuse/Helicone) and production token spend alerting (`llm-observability-expert`).
- [ ] Optimize Generative Engine Optimization (GEO) for AI Overviews, Perplexity, ChatGPT Search, and deploy `/llms.txt`.
- [ ] Generate structured Schema.org JSON-LD markup and AEO conversion landing pages.

#### PHASE 8: Launch, Deployment & Handover
**Orchestrates:** `cloud-hosting-expert`, `saas-billing`, `agentic-micro-economy-architect`, `agentic-m2m-settlement`, `saas-architect`, `prd-architect`, `ci-cd-devops-architect`, `doku-payment-gateway`, `payment-gateway-expert`, `app-promo-media-expert`, `zero-tech-debt-auditor`, `autonomous-api-drift-healer`
- [ ] Deploy backend and edge services to Vercel, Cloudflare, AWS, or Railway.
- [ ] For SaaS applications: deploy Super Admin dashboard on a **separate subdomain** (e.g., `admin.yourdomain.com`) with strict role-based access (`isSuperAdmin` flag).
- [ ] Configure Stripe / Polar.sh / LemonSqueezy / DOKU SNAP BI billing and webhooks.
- [ ] Generate promotional media kit: App Store/Play Store screenshots, dynamic OpenGraph banners, and launch promo video teasers with `app-promo-media-expert`.
- [ ] Verify zero technical debt clearance (`zero-tech-debt-auditor`) before final handover.
- [ ] Finalize `CHANGELOG.md`, `BLUEPRINT.md`, and `PROGRESS.md`.
- [ ] Handover the production-grade application to the user.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Ringkasan
**Zero to Production Orchestrator** adalah skill master utama yang dirancang untuk mengorkestrasi seluruh ekosistem `vibes-plug` sebagai sebuah **engineering swarm** yang saling terhubung erat. Dengan bertindak sebagai konduktor pusat, skill ini memastikan tidak ada sub-skill yang dieksekusi secara terisolasi. Skill ini memandu pengembang *fullstack* melalui seluruh siklus hidup rekayasa perangkat lunak — mulai dari tahap ide awal hingga integrasi AI, arsitektur backend multi-platform, design system, pengujian otomatis, optimasi GEO/AEO, dan deployment produksi.

### Kondisi Pemicu
- Memulai pengembangan aplikasi baru dari nol.
- Meminta panduan roadmap pengembangan fullstack end-to-end yang terstruktur.
- Mengorkestrasi berbagai skill spesialis lintas domain (UI, Backend, AI/LLM, Database, Keamanan, dan Cloud).

### Prinsip Inti & Gerbang Ketat
1. **Jangan Pernah Melewati Fase**: Setiap fase harus diselesaikan dan divalidasi sebelum beralih ke fase berikutnya.
2. **Otomatisasi Dokumentasi**: Panggil `prd-architect` untuk memperbarui `CHANGELOG.md` dan `BLUEPRINT.md` setelah setiap milestone utama.
3. **Pelacakan Progres**: Pelihara daftar periksa `PROGRESS.md` di root repositori.
4. **Preservasi State & Konteks**: Gunakan `session-memory-manager` saat menjeda pekerjaan atau memulai sesi baru untuk menjaga konteks penuh.
5. **Amanat Anti-Slop Berdaulat**: Nol toleransi terhadap placeholder (`// TODO`, `// ...`), data mock di produksi, komentar sintaksis, dan basa-basi robotik di seluruh fase. Jalankan `node scripts/check-anti-slop.js --strict` sebagai *gate* verifikasi wajib sebelum penyelesaian fase.

---

### 🐝 Topologi Eksekusi Swarm & Protokol Delegasi Subagent (Master 2026)

Saat mengeksekusi fase multi-domain yang kompleks, Orkestrator WAJIB bertindak sebagai **Swarm Director** dan mendelegasikan tugas ke subagent spesialis secara paralel:

#### 1. Pemilihan Topologi
- **Fan-Out / Fan-In**: Digunakan pada Fase 4 (API + MCP + DB) dan Fase 5 (Frontend UI + Mobile + Animasi).
  - *Director* mengirimkan tugas ke Subagent A (Frontend UI via `senior-frontend`), Subagent B (Backend API via `js-backend-expert`), Subagent C (Migrasi DB via `database-orm-expert`).
  - Mengumpulkan hasil dan menjalankan verifikasi integrasi.
- **Pipeline Saga**: Eksekusi berurutan dari Fase 1 hingga 8. Setiap fase menghasilkan artefak checkpoint (`CONTEXT_MAP.md`, `BLUEPRINT.md`).
- **Critic-Validator Gate**: Digunakan pada Fase 6. Agen implementor menyerahkan kode -> Agen auditor (`coderabbit`, `autonomous-red-teamer`) mereview -> Agen perbaikan (`autonomous-tdd-debugger`) menuntaskan kegagalan pengujian secara mandiri.

#### 2. Protokol Pengiriman Konteks Subagent
Saat mendelegasikan tugas ke subagent, SELALU berikan:
1. Ruang lingkup tugas dan non-goals yang tegas.
2. Path file skema terkait (`schema.prisma` / `schema.ts`) dan route API.
3. Lokasi dokumen panduan `PRD.md` dan `BLUEPRINT.md`.
4. Perintah verifikasi (seperti `npm test`, `tsc --noEmit`) untuk memastikan kode tervalidasi sebelum kembali ke Director.

#### 3. Protokol Efisiensi Token & Pemangkasan Konteks (Hemat Token)
Untuk menjaga efisiensi token tanpa mengurangi kapabilitas dan kedalaman fungsional skill:
1. **Pemangkasan Konteks Selektif (Selective Slicing)**: Jangan pernah mengirimkan seluruh transkrip obrolan global ke subagent. Kirimkan hanya tipe interface terkait, irisan skema lokal, dan batasan tugas yang relevan (`CONTEXT_MAP.md` slice).
2. **Penguncian Prefix KV-Cache Deterministik (`kv-cache-prefix-optimizer`)**: Pastikan instruksi statis, definisi tools, dan kontrak antarmuka tetap konsisten pada tingkat byte agar tingkat keberhasilan prompt cache mencapai 75-90%.
3. **Kaskade Model Dinamis (`adaptive-model-cascade`)**:
   - `flash_lite` / `flash`: Pencarian file, pemindaian simbol AST, verifikasi linter, dan pengecekan sintaks.
   - `pro` / `inherit`: Desain arsitektur multi-domain, pembuktian invarian Z3, dan audit keamanan mendalam.
4. **Checkpoint Fase Ultra-Ringkas (`session-memory-manager`)**:
   - Di akhir setiap fase, simpan checkpoint terkompresi (<300 token) di `PROGRESS.md` dan `CHECKPOINT.md`.
5. **Hukum Mutlak Non-Degradasi**: Dilarang memotong kode dengan `// TODO`, `// ...`, atau stub parsial demi menghemat token. Kualitas kode dan kelengkapan logika wajib 100%.

---

### Master Pipeline Fullstack 8-Fase

#### FASE 1: Discovery & Perencanaan Arsitektur PRD AI
**Mengorkestrasi:** `prd-architect`, `brainstorming`, `deep-research-analyst`, `mcp-server-architect`, `session-memory-manager`, `dependency-upgrade-migrator`, `app-analyzer-optimizer`, `seo`, `saas-architect`, `web-scraper`, `website-design-cloner`, `screenshot-to-code-expert`, `multimodal-spatial-video-cloner`, `headless-cms-expert`, `wordpress-headless-expert`, `documentation-site-expert`, `anti-slop`, `speculative-multi-draft-synthesizer`, `thinking-budget-orchestrator`
- [ ] Dialog terstruktur untuk memperjelas tujuan produk, audiens target, dan persyaratan non-fungsional.
- [ ] Secara otomatis menyusun Product Requirements Document (PRD.md), Entity Relationship Diagram (ERD.md), dan Dokumentasi (DOKUMENTASI.md) yang komprehensif beserta Roadmap (ROADMAP.md).
- [ ] Tentukan profil thinking budget dinamis (`thinking-budget-orchestrator`) antara speed (1.024t), balanced (4.096t), deep (32.768t), atau exhaustive (65.536t).
- [ ] Merencanakan integrasi AI/LLM (Vercel AI SDK, alat MCP Server, atau Graf Multi-Agen).
- [ ] Untuk proyek yang sudah ada: audit kesehatan dependensi dan rencanakan upgrade dengan `dependency-upgrade-migrator`.
- [ ] Menginisialisasi `BLUEPRINT.md` dan `PROGRESS.md`.

#### FASE 2: Pondasi Proyek & Setup Monorepo
**Mengorkestrasi:** `monorepo-architect`, `micro-frontend-architect`, `bun-runtime-expert`, `python-programming-expert`, `go-programming-expert`, `ci-cd-devops-architect`, `spa-orchestrator`, `mpa-orchestrator`, `cloud-hosting-expert`, `mvc-expert`, `scalability-clean-code`, `api-design-expert`, `legacy-code-translator`, `web-3d-graphics-expert`, `web-game-engine-expert`, `glsl-shader-expert`, `webxr-ar-vr-expert`, `rust-programming-expert`, `typescript-expert`, `biome-linter-formatter-expert`, `composable-mach-architect`, `living-codebase-ast-graph`, `formal-spec-z3-verifier`, `structured-output-contracts`
- [ ] Inisialisasi monorepo (Turborepo + pnpm workspaces) atau repositori tunggal.
- [ ] Menyiapkan runtime bahasa: Node.js 24 LTS / Bun 1.2+ / Python 3.14+ (uv) / Go 1.25+ / Rust 2024.
- [ ] Konfigurasi `Biome v2` (Rust linter & formatter) atau `Ruff`, `ESLint`, `Prettier`, dan TypeScript ketat.
- [ ] Tegakkan kontrak tipe skema JSON Schema terstruktur strict dengan `structured-output-contracts`.
- [ ] Menyiapkan template pipeline CI/CD awal (GitHub Actions, Docker).

#### FASE 3: Database & Arsitektur Multi-Tenant
**Mengorkestrasi:** `fullstack-expert`, `database-orm-expert`, `domain-driven-design-expert`, `saas-multi-tenant`, `supabase-security-expert`, `data-pipeline-etl-expert`, `search-engine-expert`, `xerj-search-expert`, `geospatial-maps-expert`, `graph-rag-knowledge-expert`
- [ ] Merancang skema relasional ter-normalisasi, pemodelan dokumen, dan struktur geospasial PostGIS.
- [ ] Konfigurasi lapisan ORM (Drizzle ORM / Prisma 6 / SQLx / sqlc) dan indexing mesin pencari (Typesense/Meilisearch/XERJ).
- [ ] Mengimplementasikan kebijakan Row-Level Security (RLS) dan isolasi tenant.
- [ ] Menerapkan migrasi database awal dan connection poolers (PgBouncer/Supavisor/Neon).

#### FASE 4: Backend API, Microservices & Agen AI
**Mengorkestrasi:** `js-backend-expert`, `go-programming-expert`, `pydantic-ai-expert`, `vercel-ai-sdk-expert`, `frontier-ai-models-expert`, `synthetic-data-finetuning-expert`, `graphql-apollo-expert`, `openapi-swagger-codegen-expert`, `spec-driven-development-expert`, `ai-llm-integration-expert`, `ai-prompt-engineering-expert`, `ai-media-generation-expert`, `multi-agent-orchestration`, `mcp-server-architect`, `authentication-identity-expert`, `email-notification-expert`, `cron-scheduler-expert`, `rate-limit-abuse-prevention`, `file-upload-media-expert`, `saas-billing`, `agentic-micro-economy-architect`, `agentic-m2m-settlement`, `payment-gateway-expert`, `vector-db-rag-expert`, `async-queue-temporal-expert`, `doku-mcp-server`, `xerj-search-expert`, `event-driven-architect`, `gemini-agent-booster`, `realtime-collaboration-expert`, `api-gateway-proxy-expert`, `wasm-edge-computing-expert`, `sse-websocket-streaming-expert`, `n8n-automation-expert`, `chatbot-messaging-expert`, `pdf-document-generation-expert`, `ecommerce-expert`, `blockchain-web3-expert`, `local-slm-edge-ai-expert`, `voice-ai-realtime-agent`, `affective-computing-emotion-ai`, `graph-rag-knowledge-expert`, `browser-automation-expert`, `agentic-memory-architect`, `llm-finops-router`, `test-time-compute-optimizer`, `kv-cache-prefix-optimizer`, `speculative-multi-draft-synthesizer`, `autonomous-api-drift-healer`, `ephemeral-wasm-sandbox-executor`, `context-window-engineer`, `adaptive-model-cascade`, `llm-observability-expert`, `prompt-injection-firewall`, `thinking-budget-orchestrator`, `structured-output-contracts`, `parallel-tool-orchestrator`
- [ ] Bangun API REST / GraphQL / gRPC *high-throughput* menggunakan Fastify 5, NestJS, Hono, Gin, atau Axum.
- [ ] Mengimplementasikan autentikasi (Clerk, Auth.js, Supabase Auth) dan middleware RBAC.
- [ ] Membangun alat MCP Server atau alur kerja multi-agen LangGraph berbasis state dengan gerbang *human-in-the-loop*.
- [ ] Orkestrasikan eksekusi paralel multi-tool concurrent (`parallel-tool-orchestrator`) dengan `vibes_batch` dan `Promise.allSettled`.
- [ ] Tegakkan penjaminan skema terstruktur zero-drift (`structured-output-contracts`).
- [ ] Alokasikan budget token penalaran dinamis (`thinking-budget-orchestrator`) sesuai kompleksitas subagent.
- [ ] Mengintegrasikan generasi media AI (Flux/ElevenLabs/Whisper), bot perpesanan (WhatsApp/Telegram/Discord), dan otomasi n8n.
- [ ] Implementasikan rekayasa context window (sliding window, injeksi berbasis retrieval) dan kaskade model cerdas (`context-window-engineer`, `adaptive-model-cascade`).
- [ ] Integrasikan pertahanan prompt injection dan guardrail input/output runtime (`prompt-injection-firewall`).
- [ ] Siapkan observabilitas LLM, pelacakan latensi, pemantauan halusinasi, dan analitik biaya token (`llm-observability-expert`).
- [ ] Mengimplementasikan antrean pemrosesan latar belakang (BullMQ + Redis), tugas terjadwal, dan rate limiter.
- [ ] Menyiapkan pipeline email transaksional (Resend/Postmark), pembuatan PDF, dan sistem notifikasi.
- [ ] Mengimplementasikan upload file dengan presigned URL (S3/R2) dan pemrosesan media.
- [ ] Menerapkan pola Computer-Using Agent (CUA) untuk otomatisasi interaksi peramban (browser).
- [ ] Mengonfigurasi API streaming multimodal kontinu untuk suara dan visi real-time.
- [ ] Mengorkestrasi agen simulasi naratif dengan pemodelan perilaku mirip manusia.
- [ ] Mengintegrasikan sistem memori episodik untuk retensi konteks agen jangka panjang.

#### FASE 5: Frontend, Design System & Mobile App
**Mengorkestrasi:** `modern-web-guidance`, `design-system-architect`, `senior-frontend`, `anti-slop`, `vercel-ai-sdk-expert`, `nextjs-app-router-expert`, `vue-frontend-expert`, `astro-framework-expert`, `svelte-sveltekit-expert`, `solidjs-expert`, `angular-expert`, `tailwind-expert`, `tanstack-query-expert`, `spa-orchestrator`, `mobile-expo-expert`, `apple-ecosystem-expert`, `tauri-expert`, `desktop-electron-expert`, `browser-extension-mv3-pro`, `form-validation-expert`, `svg-animation-motion-expert`, `app-promo-media-expert`, `web-3d-graphics-expert`, `web-game-engine-expert`, `glsl-shader-expert`, `webxr-ar-vr-expert`, `browser-automation-expert`, `hig`, `global-a11y-i18n-expert`, `state-management-expert`, `ui-ux-pro-max`, `affective-computing-emotion-ai`, `data-visualization-expert`, `rich-text-editor-expert`, `documentation-site-expert`, `blockchain-web3-expert`, `modern-css-native-expert`, `pwa-offline-first-expert`, `ephemeral-generative-ui-architect`, `multimodal-spatial-video-cloner`, `screenshot-to-code-expert`, `visual-ui-auditor`, `parallel-tool-orchestrator`
- [ ] **MANDATORY**: Jalankan `modern-web-guidance` PERTAMA KALI sebelum mengimplementasikan fitur frontend HTML/CSS/JS untuk memastikan kepatuhan dengan standar modern Google.
- [ ] Tegakkan standar Anti-Slop UI Berdaulat (`anti-slop`): basmi gradien klise, bento default, glassmorphism berlebih, titik status dekoratif, dan metrik tiruan.
- [ ] Audit elemen UI yang dirender terhadap standar Pillar 7 dengan penguji visi multimodal (`visual-ui-auditor`).
- [ ] Implementasikan token desain (OKLCH) dan konfigurasi tema Tailwind CSS v4.
- [ ] Bangun komponen primitif aksesibel menggunakan Radix UI / Base UI dan CVA.
- [ ] Konversi screenshot antarmuka, frame Figma, atau sketsa whiteboard menjadi komponen frontend siap produksi dengan `screenshot-to-code-expert`.
- [ ] Integrasikan visualisasi data (Recharts/Tremor/D3) dan editor rich text (Tiptap/Lexical).
- [ ] Buat halaman React 19 / Next.js 15, Vue 3, Astro 5, Svelte 5, SolidJS 2, atau Angular 19+ dengan wallet Web3.
- [ ] **MANDATORY**: Otomatis buat halaman standar: About, Profile, Contact, Terms of Reference/Service, dan Privacy Policy.
- [ ] Mengimplementasikan formulir kompleks dengan React Hook Form + validasi Zod.
- [ ] Jika Web 3D atau Web Game: arsitekturkan dengan WebGPU (`WebGPURenderer`, PlayCanvas, atau Babylon.js), kompresi tekstur KTX2 Basis Universal, geometri Meshopt, loop fisika fixed-timestep, zero-GC object pooling, dan audio spasial 3D.
- [ ] Jika arsitektur SPA — koordinasikan dengan `spa-orchestrator` untuk routing (TanStack Router), state (TanStack Query v5), dan API layer terpisah.
- [ ] Mengintegrasikan manajemen state frontend dengan TanStack Query v5.

#### FASE 6: Pengujian Otomatis, Ketahanan Error & Audit Keamanan
**Mengorkestrasi:** `e2e-testing-expert`, `accessibility-testing-expert`, `autonomous-red-teamer`, `firebase-security-expert`, `error-resilience-expert`, `logging-error-tracking-expert`, `anti-slop`, `coderabbit`, `autonomous-tdd-debugger`, `browser-automation-expert`, `zero-trust-secret-vault`, `post-quantum-crypto-migrator`, `compliance-gdpr-privacy-expert`, `ai-safety-governance-expert`, `agentic-coding-workflow-expert`, `zero-tech-debt-auditor`, `living-codebase-ast-graph`, `ephemeral-wasm-sandbox-executor`, `formal-spec-z3-verifier`, `ai-code-review-autonomous`, `prompt-injection-firewall`, `property-mutation-testing-expert`, `spec-driven-development-expert`, `mcp-sampling-critic`, `visual-ui-auditor`
- [ ] Menulis unit test dan integration test dengan Vitest dan pytest.
- [ ] Jalankan self-review kode otonom multi-pass (`ai-code-review-autonomous`) mencakup validasi sintaks, logika, arsitektur, dan keamanan.
- [ ] Eksekusi gerbang validasi review Critic-in-the-Loop berbasis `sampling/createMessage` (`mcp-sampling-critic`) sebelum merge atau rilis.
- [ ] Eksekusi audit regresi visual antarmuka (`visual-ui-auditor`) terhadap standar kepatuhan Pillar 7.
- [ ] Eksekusi property-based testing dan mutation testing (`property-mutation-testing-expert`) dengan fast-check dan Stryker untuk validasi invarian sistem.
- [ ] Jalankan pengujian prompt injection dan mitigasi serangan jailbreak dengan `prompt-injection-firewall`.
- [ ] Menulis pengujian browser E2E Playwright dan pengujian aksesibilitas WCAG 2.2 otomatis (`@axe-core/playwright` dan Pa11y).
- [ ] Menjalankan pengujian fuzzing keamanan (Atheris / cargo-fuzz / native Go fuzzing).
- [ ] Mengimplementasikan Error Boundary, pola retry, circuit breaker, dan degradasi anggun.
- [ ] Menyiapkan logging terstruktur (Pino) dan pelacakan error (Sentry) dengan upload source map.
- [ ] Mengaudit CORS, CSP headers, rate-limiting, dan sanitasi input.
- [ ] Menjalankan audit Anti-Slop otomatis (`node scripts/check-anti-slop.js --strict`) untuk membersihkan placeholder, komentar sintaksis, dan data tiruan sebelum serah terima ke pengguna.
- [ ] Menjalankan audit Zero Technical Debt (`zero-tech-debt-auditor`) untuk eliminasi kode mati (protokol Knip), penegakan DRY, dan ketelitian TypeScript.

#### FASE 7: Hardening Pra-Peluncuran, Monitoring & DevOps Sentinel
**Mengorkestrasi:** `ci-cd-devops-architect`, `cloud-hosting-expert`, `performance-web-vitals`, `logging-error-tracking-expert`, `production-ready-hardener`, `proactive-background-watcher`, `data-telemetry-expert`, `feature-flag-analytics-expert`, `error-resilience-expert`, `self-healing-cloud-orchestrator`, `llm-observability-expert`
- [ ] Audit pra-peluncuran pada Core Web Vitals (LCP, INP, CLS) dan ukuran bundle.
- [ ] Mengonfigurasi monitoring produksi, aturan alerting, dan notifikasi on-call.
- [ ] Konfigurasi dashboard observabilitas LLM (Langfuse/Helicone) dan pemantauan pengeluaran token produksi (`llm-observability-expert`).
- [ ] Mengoptimalkan GEO untuk AI Overviews, Perplexity, ChatGPT Search, dan merilis `/llms.txt`.
- [ ] Membuat markup terstruktur Schema.org JSON-LD dan landing page konversi AEO.

#### FASE 8: Peluncuran, Deployment & Serah Terima
**Mengorkestrasi:** `cloud-hosting-expert`, `saas-billing`, `agentic-micro-economy-architect`, `agentic-m2m-settlement`, `saas-architect`, `prd-architect`, `ci-cd-devops-architect`, `doku-payment-gateway`, `payment-gateway-expert`, `app-promo-media-expert`, `zero-tech-debt-auditor`
- [ ] Deploy backend dan edge services ke Vercel, Cloudflare, AWS, atau Railway.
- [ ] Untuk aplikasi SaaS: deploy dashboard Super Admin pada **subdomain terpisah** (misal: `admin.domain.com`) dengan kontrol akses berbasis role (`isSuperAdmin`).
- [ ] Konfigurasi billing Stripe / Polar.sh / LemonSqueezy / DOKU SNAP BI dan webhooks.
- [ ] Memproduksi paket media promosi: screenshot App Store/Google Play, banner Open Graph dinamis, dan video teaser peluncuran dengan `app-promo-media-expert`.
- [ ] Verifikasi kelulusan audit Zero Technical Debt (`zero-tech-debt-auditor`) sebelum rilis final.
- [ ] Menyelesaikan `CHANGELOG.md`, `BLUEPRINT.md`, dan `PROGRESS.md`.
- [ ] Serah terima aplikasi siap produksi kepada pengguna.

---
### 🎨 Automatic Visual Assets Generation Mandate (CRITICAL)
**MANDATORY**: Whenever you are building a new application, scaffolding a project, or finalizing the initial UI/UX, you MUST automatically use the `generate_image` tool to create a custom logo that perfectly matches the application's core concept and aesthetic. 
This generated image MUST be explicitly used as:
1. The primary application logo (e.g., in the header/navbar).
2. The website favicon (`favicon.ico` or equivalent).
3. The Open Graph (OG) image for SEO metadata (`og:image`).

Do not use placeholders for these assets. Generate and integrate them automatically. If `generate_image` is unavailable, delegate to `ai-media-generation-expert` skill.

---
### 📄 Standard Pages Mandate (CRITICAL)
**MANDATORY**: Whenever you are building a new application, landing page, or website, you MUST automatically create the following standard pages:
1. **About Page** (`/about`)
2. **Profile Page** (`/profile`)
3. **Contact Page** (`/contact`)
4. **Terms of Reference / Terms of Service** (`/terms`)
5. **Privacy Policy** (`/privacy-policy`)

These pages must be generated with standard boilerplate content that can later be customized to fit the specific application. Do not wait for the user to ask for them; they are a strict requirement for all web projects. / **WAJIB**: Otomatis buatkan halaman standar (About, Profile, Contact, Terms, Privacy Policy) pada setiap pembuatan aplikasi/website baru dengan konten boilerplate yang bisa disesuaikan nanti.




