---
name: coderabbit
description: "AI-powered automated code review, PR summarization, and interactive developer feedback / Review kode otomatis berbasis AI, ringkasan PR, dan umpan balik developer interaktif."
author: "Roedy Rustam"
version: "4.3.0"
---

# CodeRabbit (2026 Edition — CodeRabbit 2.x)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `anti-slop`, `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert guide for configuring and leveraging **CodeRabbit 2.x** — AI-powered automated code review, pull request summarization, and interactive developer feedback. Covers configuration, custom review rules, integration with CI/CD, and agentic review mode.

### Trigger Conditions
- Setting up CodeRabbit on a GitHub or GitLab repository.
- Configuring custom review rules for your tech stack.
- Using CodeRabbit's agentic mode for deep architectural reviews.
- Integrating CodeRabbit feedback into CI/CD quality gates.
- Writing CodeRabbit-compatible custom instructions in `.coderabbit.yaml`.

### CodeRabbit 2.x Key Features

| Feature | Description |
|---|---|
| **PR Summary** | Auto-generates structured PR description with walkthrough |
| **Line-by-line Review** | Inline comments with specific fix suggestions |
| **Agentic Review** | Deep analysis spanning multiple files for architectural issues |
| **Learnable Rules** | Learns from review dismissals and approvals over time |
| **CI Integration** | Blocks PR merge if critical issues found |
| **Chat Mode** | Ask CodeRabbit questions about the PR in review thread |

### Configuration (`.coderabbit.yaml`)

```yaml
# .coderabbit.yaml — place in repository root
version: "2"
language: "en-US"
tone_instructions: "Be concise and direct. Prioritize security and performance issues."

reviews:
  auto_review:
    enabled: true
    drafts: false           # Don't review draft PRs
    base_branches: ["main", "develop"]

  profile: "chill"          # assertive | chill | default
  request_changes_workflow: false
  high_level_summary: true
  commit_message_instructions: "Use Conventional Commits format: feat/fix/chore/docs"

  # Ignore paths from review
  path_filters:
    - "!**/*.lock"
    - "!**/migrations/**"
    - "!**/generated/**"
    - "!**/__snapshots__/**"

  # Stack-specific review instructions
  path_instructions:
    - path: "apps/api/**"
      instructions: |
        - Check for missing input validation (Zod schemas required on all handlers)
        - Flag any database queries without proper RLS consideration
        - Ensure all async functions have try/catch or error boundaries
        - Check for N+1 query patterns (missing .include() or DataLoader usage)
    - path: "apps/web/**"
      instructions: |
        - Check for missing `key` props in .map() renders
        - Flag `useEffect` without proper cleanup functions
        - Check for missing `alt` attributes on images
        - Verify Server Actions are properly validated with Zod
    - path: "apps/admin/**"
      instructions: |
        - All admin routes must verify isSuperAdmin === true
        - Flag any direct DB access without service role client
        - Check for proper audit logging on destructive operations

  # Custom review rules for the entire codebase
  instructions: |
    Review with these priorities:
    1. SECURITY: SQL injection, XSS, auth bypass, exposed secrets
    2. CORRECTNESS: Logic bugs, off-by-one errors, type unsafety
    3. PERFORMANCE: N+1 queries, unnecessary re-renders, bundle size
    4. MAINTAINABILITY: Code duplication, naming, SOLID violations
    5. STYLE: Only comment if it's a significant clarity issue
    6. SOVEREIGN ANTI-SLOP: Flag placeholders (// TODO, // ...), mock data in prod, syntax comments, and silent error suppression

# PR summary format
summary:
  auto_title_placeholder: "🤖 AI Title"
  description: |-
    ## Summary
    <!-- Concise description of what changed -->
    
    ## Changes
    <!-- Structured list by area -->
    
    ## Testing
    <!-- What was tested -->

# Enable chat for interactive Q&A
chat:
  auto_reply: true
```

### Agentic Review Mode (CodeRabbit 2.x)
CodeRabbit 2.x introduces **agentic review** — deep analysis that can read multiple files, run tools, and understand architectural context:

```
# Trigger agentic review in PR comment:
@coderabbitai review

# Ask specific questions:
@coderabbitai What is the security impact of changes in apps/api/src/routes/users.ts?
@coderabbitai Can you generate a test for the createWorkspace function?
@coderabbitai Is there a N+1 query issue in this PR?
@coderabbitai Summarize the architecture changes in this PR
```

### CI/CD Integration (GitHub Actions)
```yaml
# .github/workflows/pr-quality.yml
name: PR Quality Gate

on: [pull_request]

jobs:
  coderabbit-review:
    runs-on: ubuntu-latest
    steps:
      - name: Wait for CodeRabbit Review
        uses: coderabbit-ai/wait-for-review@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          min-approvals: 1
          block-on-critical: true  # Block merge if critical issues found
```

### CodeRabbit vs Manual Review — Best Practices
- **CodeRabbit first**: Let it run before human reviewers — catches the obvious issues.
- **Human focus**: After CodeRabbit, humans focus on business logic, architecture intent, and product decisions.
- **Teach it**: Dismiss false positives with an explanation — CodeRabbit learns your patterns.
- **Custom instructions**: Invest time in `path_instructions` for your specific stack — dramatically improves relevance.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan ahli untuk mengonfigurasi dan memanfaatkan **CodeRabbit 2.x** — review kode otomatis bertenaga AI, ringkasan pull request, dan umpan balik developer interaktif. Mencakup konfigurasi, aturan review kustom, integrasi dengan CI/CD, dan mode review agentik.

### Kondisi Pemicu
- Menyiapkan CodeRabbit di repositori GitHub atau GitLab.
- Mengonfigurasi aturan review kustom untuk tech stack Anda.
- Menggunakan mode agentik CodeRabbit untuk review arsitektur mendalam.
- Mengintegrasikan umpan balik CodeRabbit ke dalam quality gate CI/CD.
- Menulis instruksi kustom yang kompatibel dengan CodeRabbit di `.coderabbit.yaml`.

### Fitur Utama CodeRabbit 2.x

| Fitur | Deskripsi |
|---|---|
| **Ringkasan PR** | Membuat deskripsi PR terstruktur otomatis dengan walkthrough |
| **Review Baris per Baris** | Komentar inline dengan saran perbaikan spesifik |
| **Review Agentik** | Analisis mendalam yang mencakup banyak file untuk masalah arsitektur |
| **Aturan yang Dapat Dipelajari** | Belajar dari penolakan dan persetujuan review dari waktu ke waktu |
| **Integrasi CI** | Memblokir merge PR jika masalah kritis ditemukan |
| **Mode Chat** | Tanyakan pertanyaan kepada CodeRabbit di thread review |

### Konfigurasi (`.coderabbit.yaml`)
Tempatkan `.coderabbit.yaml` di root repositori. Konfigurasi kunci:
- `reviews.profile`: `assertive` (ketat), `chill` (santai), `default`.
- `reviews.path_instructions`: Instruksi review kustom per direktori — sangat berguna untuk menerapkan standar spesifik stack.
- `reviews.path_filters`: Kecualikan file lock, migrasi, kode yang dihasilkan dari review.
- `reviews.instructions`: Aturan global untuk seluruh codebase dengan prioritas eksplisit.

### Mode Review Agentik (CodeRabbit 2.x)
Mode agentik memungkinkan CodeRabbit membaca banyak file, menjalankan tool, dan memahami konteks arsitektur. Picu dengan `@coderabbitai review` di komentar PR atau ajukan pertanyaan spesifik tentang dampak keamanan, masalah N+1, atau perubahan arsitektur.

### Integrasi CI/CD (GitHub Actions)
Gunakan action `coderabbit-ai/wait-for-review@v1` untuk menunggu review selesai dan memblokir merge jika masalah kritis ditemukan.

### CodeRabbit vs Review Manual — Best Practices
- **CodeRabbit dulu**: Biarkan berjalan sebelum reviewer manusia — menangkap masalah yang jelas.
- **Fokus manusia**: Setelah CodeRabbit, manusia fokus pada logika bisnis, niat arsitektur, dan keputusan produk.
- **Ajarkan**: Tolak false positive dengan penjelasan — CodeRabbit belajar pola Anda.
- **Instruksi kustom**: Investasikan waktu di `path_instructions` untuk stack spesifik Anda — meningkatkan relevansi secara dramatis.