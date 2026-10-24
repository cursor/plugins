---
name: ai-code-review-autonomous
description: "Expert guide for multi-pass autonomous AI code self-review — syntax validation, logic correctness, architectural conformance, security audit, and performance analysis without external tooling — enabling the agent to catch its own errors before presenting code / Panduan ahli review kode otonom multi-pass oleh AI — validasi sintaks, kebenaran logika, konformitas arsitektur, audit keamanan, dan analisis performa tanpa tooling eksternal — memungkinkan agen menangkap errornya sendiri sebelum menampilkan kode."
author: "Roedy Rustam"
version: "4.3.0"
---

# ai-code-review-autonomous — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `anti-slop`, `coderabbit`, `autonomous-tdd-debugger`, `scalability-clean-code`, `production-ready-hardener`, `autonomous-red-teamer`, `typescript-expert`, `zero-tech-debt-auditor`, `living-codebase-ast-graph`, and `formal-spec-z3-verifier` to enforce comprehensive code quality across all generated output.

### Description
A structured multi-pass self-review protocol that the AI agent executes on its own generated code before presenting it to the user. Each pass focuses on a distinct quality dimension — syntax correctness, business logic validation, architectural conformance, security vulnerabilities, and performance characteristics. This eliminates the most common AI code generation failure: confidently presenting broken or insecure code because the model never re-read what it wrote.

### Trigger Conditions
Activate this skill when:
- Generating any code that will be written to files (not just shown in conversation).
- Making changes to critical paths: authentication, payment, data mutation, or API endpoints.
- Producing code that spans multiple files or requires cross-file consistency.
- The generated code exceeds 50 lines and involves non-trivial logic.
- Before finalizing any PR-ready code or phase completion in `zero-to-prod-orchestrator`.

---

### Core Concepts & Patterns

#### 1. The 5-Pass Self-Review Protocol

```
GENERATED CODE
      │
      ▼
┌──────────────────┐
│ PASS 1: SYNTAX   │  Does this code compile/parse without errors?
│                  │  - Type correctness (TypeScript strict mode)
│                  │  - Import resolution (no phantom imports)
│                  │  - JSX/HTML well-formedness
│                  │  - Missing semicolons, brackets, parentheses
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ PASS 2: LOGIC    │  Does this code do what it's supposed to do?
│                  │  - Edge cases (null, empty, boundary values)
│                  │  - Off-by-one errors in loops/slicing
│                  │  - Async/await correctness (missing awaits)
│                  │  - State mutation side effects
│                  │  - Race conditions in concurrent code
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ PASS 3: ARCH     │  Does this code fit the project's architecture?
│                  │  - Follows established patterns (DDD, MVC, etc.)
│                  │  - Uses existing utility functions, not duplicates
│                  │  - Respects separation of concerns
│                  │  - Consistent with existing naming conventions
│                  │  - No circular dependencies introduced
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ PASS 4: SECURITY │  Is this code safe in production?
│                  │  - SQL injection (parameterized queries?)
│                  │  - XSS (user input sanitized before render?)
│                  │  - Auth bypass (route protection verified?)
│                  │  - Secret exposure (no hardcoded keys/tokens)
│                  │  - IDOR (authorization checked per resource?)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ PASS 5: PERF     │  Will this code perform at scale?
│                  │  - N+1 query patterns in ORM calls
│                  │  - Unbounded array/list operations
│                  │  - Missing pagination on list endpoints
│                  │  - Memory leaks (unclosed streams, listeners)
│                  │  - Unnecessary re-renders in React components
└──────┬───────────┘
       │
       ▼
  REVIEWED CODE → Present to User
```

#### 2. Self-Review Prompt Template

After generating code, the agent internally executes this checklist:

```
SELF-REVIEW CHECKLIST for [filename]:

PASS 1 — SYNTAX:
□ All imports resolve to real modules/packages that exist in the project
□ TypeScript types are correct — no `any` unless explicitly justified
□ All brackets, parentheses, and JSX tags are balanced
□ No unreachable code after return/throw statements

PASS 2 — LOGIC:
□ Function handles null/undefined inputs gracefully
□ Array operations handle empty arrays
□ Async functions are properly awaited at call sites
□ Error paths return meaningful error messages, not silent failures
□ Loop/index boundaries are correct (no off-by-one)

PASS 3 — ARCHITECTURE:
□ New code uses existing project utilities (not reimplementing)
□ File location follows project's directory convention
□ Naming follows project's established patterns
□ No circular imports introduced
□ Single Responsibility Principle maintained

PASS 4 — SECURITY:
□ User input is validated/sanitized before use
□ Database queries use parameterized statements
□ API endpoints check authentication and authorization
□ No secrets, keys, or tokens in source code
□ CORS and CSP headers are correctly configured

PASS 5 — PERFORMANCE:
□ Database queries avoid N+1 patterns (use joins/includes)
□ List endpoints have pagination
□ React components are memoized where appropriate
□ No unbounded memory growth patterns
□ Event listeners are cleaned up on unmount
```

#### 3. Cross-File Consistency Verification

When changes span multiple files, verify:

```typescript
interface CrossFileCheck {
  importConsistency: boolean;      // Do all imports reference the correct export names?
  typeContractAlignment: boolean;  // Do function signatures match their call sites?
  schemaSync: boolean;             // Do DB schema changes propagate to ORM models and API types?
  routeRegistration: boolean;      // Are new routes registered in the router?
  envVarRegistration: boolean;     // Are new env vars documented in .env.example?
}
```

#### 4. Severity Classification

| Severity | Definition | Action |
| :--- | :--- | :--- |
| **P0 — Blocker** | Code won't compile, runtime crash, data loss, security vulnerability | Fix immediately before presenting |
| **P1 — Critical** | Logic error in core business path, missing error handling | Fix before presenting |
| **P2 — Major** | Architectural violation, performance regression, accessibility gap | Flag and fix in same turn |
| **P3 — Minor** | Style inconsistency, suboptimal pattern, missing comment | Fix silently without flagging |

---

### Best Practices

1. **Review Before Writing to File**: Never write generated code to disk without completing at least Passes 1-2. For production code, complete all 5 passes.
2. **Re-Read What You Wrote**: After writing code, re-read the file content to verify the write was correct and complete.
3. **Check Import Validity**: The most common AI hallucination is importing modules, functions, or types that don't exist.
4. **Verify Cross-File Contracts**: When modifying interfaces, types, or schemas, check all consuming files for breakage.
5. **Admit Uncertainty**: If you're unsure about a logic path, explicitly state it rather than generating speculative code.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Consequence | Remedy |
| :--- | :--- | :--- |
| Skipping self-review for "simple" changes | Simple changes cause cascading failures | Every change gets at least Pass 1-2 |
| Phantom imports (hallucinated module names) | Runtime ModuleNotFoundError | Verify every import exists in project |
| Missing `await` on async calls | Silent data corruption or race conditions | Trace every async call chain |
| Assuming happy path only | Crashes on null/empty/error inputs | Explicitly handle edge cases |

---

### Integration with Other Skills (MANDATORY)

- `anti-slop` — Enforce zero placeholder content, dead code, and syntax narration in reviewed output.
- `autonomous-tdd-debugger` — After self-review, execute tests to verify the code actually works.
- `coderabbit` — For team-facing PR reviews, complement self-review with external automated review.
- `production-ready-hardener` — Apply self-review as a pre-deployment quality gate.
- `typescript-expert` — Validate TypeScript strict mode compliance during Pass 1.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "Testing & Security" matrix row.
- `zero-to-prod-orchestrator` — Integrated in Phase 6 (Automated Testing, Error Resilience & Security Audit).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `anti-slop`, `coderabbit`, `autonomous-tdd-debugger`, `scalability-clean-code`, `production-ready-hardener`, `autonomous-red-teamer`, `typescript-expert`, `zero-tech-debt-auditor`, `living-codebase-ast-graph`, dan `formal-spec-z3-verifier` untuk menegakkan kualitas kode komprehensif di seluruh output yang dihasilkan.

### Deskripsi
Protokol self-review terstruktur multi-pass yang dieksekusi agen AI terhadap kode yang dihasilkannya sendiri sebelum ditampilkan ke pengguna. Setiap pass fokus pada dimensi kualitas yang berbeda — kebenaran sintaks, validasi logika bisnis, konformitas arsitektur, kerentanan keamanan, dan karakteristik performa. Mengeliminasi kegagalan paling umum generasi kode AI: menyajikan kode rusak atau tidak aman dengan percaya diri karena model tidak pernah membaca ulang apa yang ditulisnya.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Menghasilkan kode yang akan ditulis ke file (bukan hanya ditampilkan dalam percakapan).
- Membuat perubahan pada jalur kritis: autentikasi, pembayaran, mutasi data, atau endpoint API.
- Menghasilkan kode yang mencakup beberapa file atau memerlukan konsistensi antar-file.

---

### Konsep Inti & Pola Praktik

#### 1. Protokol Self-Review 5-Pass
Lima pass berurutan: Sintaks (kompilasi/parse), Logika (edge case, async, state), Arsitektur (pola, konvensi, SRP), Keamanan (SQL injection, XSS, auth bypass), dan Performa (N+1, pagination, memory leak).

#### 2. Klasifikasi Keparahan
P0 Blocker: perbaiki segera. P1 Critical: perbaiki sebelum ditampilkan. P2 Major: tandai dan perbaiki di giliran yang sama. P3 Minor: perbaiki tanpa menandai.

---

### Praktik Terbaik

1. **Review Sebelum Menulis ke File**: Jangan pernah tulis kode ke disk tanpa menyelesaikan minimal Pass 1-2.
2. **Baca Ulang yang Sudah Ditulis**: Verifikasi penulisan benar dan lengkap.
3. **Periksa Validitas Import**: Halusinasi paling umum AI adalah mengimpor modul yang tidak ada.
4. **Verifikasi Kontrak Antar-File**: Saat memodifikasi interface atau skema, periksa semua file konsumer.
5. **Akui Ketidakpastian**: Jika ragu, nyatakan secara eksplisit daripada menghasilkan kode spekulatif.

---

### Integrasi dengan Skill Lain (WAJIB)

- `anti-slop` — Tegakkan nol placeholder, kode mati, dan narasi sintaks.
- `autonomous-tdd-debugger` — Setelah self-review, jalankan tes untuk verifikasi.
- `coderabbit` — Untuk review PR tim, lengkapi self-review dengan review otomatis eksternal.
- `typescript-expert` — Validasi kepatuhan TypeScript strict mode pada Pass 1.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Ditambahkan ke baris "Testing & Security" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Diintegrasikan di Fase 6 (Automated Testing, Error Resilience & Security Audit).
