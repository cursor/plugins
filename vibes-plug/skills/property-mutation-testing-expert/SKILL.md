---
name: property-mutation-testing-expert
description: "Expert guide for property-based testing (fast-check, Hypothesis) and mutation testing (Stryker, mutmut) — AI-generated test properties, invariant discovery, mutation score optimization, and test suite quality verification / Panduan ahli property-based testing (fast-check, Hypothesis) dan mutation testing (Stryker, mutmut) — properti tes yang dihasilkan AI, penemuan invarian, optimasi skor mutasi, dan verifikasi kualitas suite tes."
author: "Roedy Rustam"
version: "4.3.0"
---

# property-mutation-testing-expert — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `e2e-testing-expert`, `autonomous-tdd-debugger`, `ai-code-review-autonomous`, `formal-spec-z3-verifier`, `anti-slop`, `typescript-expert`, `python-programming-expert`, and `production-ready-hardener` to enforce mathematically rigorous test quality across the entire codebase.

### Description
Production guide for two advanced testing techniques that frontier AI models unlock at unprecedented scale: (1) Property-Based Testing — generating thousands of randomized test inputs guided by algebraic properties and invariants, catching edge cases that example-based tests miss; and (2) Mutation Testing — systematically introducing bugs into the codebase and verifying that the test suite catches every one of them, measuring the actual "kill rate" of your tests. Together, these techniques expose false confidence in code coverage percentages.

### Trigger Conditions
Activate this skill when:
- Code coverage is high (>80%) but bugs still escape to production (false confidence in tests).
- Building financial, medical, or safety-critical logic where correctness is non-negotiable.
- The AI agent is generating test suites and needs to verify they actually catch real bugs.
- Implementing data transformations, serialization/deserialization, or mathematical computations.
- Auditing test quality during `production-ready-hardener` or `zero-tech-debt-auditor` phases.

---

### Core Concepts & Patterns

#### 1. Property-Based Testing with fast-check (TypeScript)

Instead of writing example-based tests (`expect(add(2, 3)).toBe(5)`), define universal properties that must hold for ALL inputs:

```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Array sorting properties', () => {
  it('output has the same length as input', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = [...arr].sort((a, b) => a - b);
        expect(sorted.length).toBe(arr.length);
      })
    );
  });

  it('output is ordered (monotonically non-decreasing)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = [...arr].sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
        }
      })
    );
  });

  it('output is a permutation of input (same elements)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = [...arr].sort((a, b) => a - b);
        const inputCounts = countElements(arr);
        const outputCounts = countElements(sorted);
        expect(outputCounts).toEqual(inputCounts);
      })
    );
  });

  it('sorting is idempotent (sorting twice = sorting once)', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sortOnce = [...arr].sort((a, b) => a - b);
        const sortTwice = [...sortOnce].sort((a, b) => a - b);
        expect(sortTwice).toEqual(sortOnce);
      })
    );
  });
});

function countElements(arr: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return counts;
}
```

#### 2. Common Property Patterns

| Pattern | Property | Example |
| :--- | :--- | :--- |
| **Roundtrip** | `decode(encode(x)) === x` | JSON serialize/deserialize, URL encode/decode |
| **Idempotency** | `f(f(x)) === f(x)` | Sorting, normalization, deduplication |
| **Commutativity** | `f(a, b) === f(b, a)` | Set union, addition, merging configs |
| **Invariant** | `property(f(x))` always holds | Sorted array is ordered, hash length is constant |
| **Equivalence** | `f_optimized(x) === f_reference(x)` | Optimized vs. naive implementation |

#### 3. Mutation Testing with Stryker (TypeScript/JavaScript)

```json
// stryker.config.json
{
  "$schema": "https://raw.githubusercontent.com/stryker-mutator/stryker/master/packages/core/schema/stryker-core.schema.json",
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts"],
  "testRunner": "vitest",
  "reporters": ["html", "progress", "dashboard"],
  "thresholds": {
    "high": 90,
    "low": 70,
    "break": 60
  },
  "concurrency": 4,
  "timeoutMS": 10000
}
```

**What mutation testing does:**

```
ORIGINAL CODE                    MUTANT (auto-generated)
─────────────                    ───────────────────────
if (age >= 18) {          →      if (age > 18) {           // boundary mutation
  return 'adult';                  return 'adult';
}                                }

price * quantity          →      price / quantity           // arithmetic mutation
price * quantity          →      price + quantity           // arithmetic mutation

items.length > 0          →      items.length >= 0          // relational mutation
items.length > 0          →      items.length < 0           // relational mutation
items.length > 0          →      false                      // boolean mutation
```

If your test suite **still passes** after a mutation, that mutant "survived" — meaning your tests have a gap.

#### 4. AI-Driven Property Generation

Leverage frontier models to discover non-obvious properties:

```
PROMPT FOR AI PROPERTY GENERATION:

Given this function:
```typescript
function calculateDiscount(price: number, memberTier: 'bronze' | 'silver' | 'gold', quantity: number): number {
  // ... implementation
}
```

Generate fast-check property tests covering:
1. All return values must be non-negative (discount cannot exceed price).
2. Higher membership tiers should always get equal or greater discounts.
3. Increasing quantity should never decrease the total discount.
4. Zero quantity should always return zero discount.
5. The discount should never exceed the original price × quantity.

For each property, use appropriate fast-check arbitraries.
```

#### 5. Mutation Score Targets

| Context | Minimum Kill Rate | Rationale |
| :--- | :--- | :--- |
| **Financial calculations** | ≥95% | Any surviving mutant = potential money loss |
| **Authentication/Authorization** | ≥95% | Security-critical logic |
| **Core business domain** | ≥85% | High-impact business logic |
| **Utility functions** | ≥80% | Moderate risk |
| **UI rendering logic** | ≥70% | Lower risk, visual regression tests supplement |

---

### Best Practices

1. **Properties Over Examples**: For any pure function, write property-based tests first. Example tests are supplementary, not primary.
2. **Target Mutation Score, Not Coverage**: 100% line coverage with 50% mutation score means half your tests are worthless.
3. **Use AI to Discover Properties**: Ask frontier models to identify algebraic properties of your functions that you may not have considered.
4. **Run Stryker on Critical Paths Only**: Mutation testing is computationally expensive. Target `src/domain/`, `src/auth/`, `src/billing/` — not the entire codebase.
5. **Shrink Failed Cases**: fast-check automatically shrinks failing inputs to the minimal reproducing case. Always include the shrunk value in bug reports.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Consequence | Remedy |
| :--- | :--- | :--- |
| Relying solely on line coverage metrics | Tests pass with mutants alive (false confidence) | Run mutation testing to measure real test quality |
| Writing only example-based tests | Edge cases missed (empty arrays, negative numbers, Unicode) | Use property-based tests with random generation |
| Running mutation testing on entire codebase | Hours of CI time, developer frustration | Scope to critical domain and business logic paths |
| Ignoring surviving mutants | Known gaps in test quality left unaddressed | Treat surviving mutants as P1 bugs to fix |

---

### Integration with Other Skills (MANDATORY)

- `e2e-testing-expert` — Complement property/mutation tests with end-to-end Playwright tests for full coverage.
- `autonomous-tdd-debugger` — Auto-fix failing property tests in the TDD self-healing loop.
- `formal-spec-z3-verifier` — For safety-critical logic, complement property tests with formal Z3/SMT proofs.
- `ai-code-review-autonomous` — Include mutation score in the Pass 5 (Performance) self-review checklist.
- `production-ready-hardener` — Enforce minimum mutation kill rates as a pre-deployment gate.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "Testing & Security" matrix row.
- `zero-to-prod-orchestrator` — Integrated in Phase 6 (Automated Testing, Error Resilience & Security Audit).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `e2e-testing-expert`, `autonomous-tdd-debugger`, `ai-code-review-autonomous`, `formal-spec-z3-verifier`, `anti-slop`, `typescript-expert`, `python-programming-expert`, dan `production-ready-hardener` untuk menegakkan kualitas tes yang ketat secara matematis di seluruh codebase.

### Deskripsi
Panduan produksi untuk dua teknik testing lanjutan yang model frontier AI buka pada skala belum pernah ada: (1) Property-Based Testing — menghasilkan ribuan input tes acak yang dipandu oleh properti aljabar dan invarian, menangkap edge case yang tes berbasis contoh lewatkan; dan (2) Mutation Testing — secara sistematis menyisipkan bug ke codebase dan memverifikasi bahwa suite tes menangkap setiap bug, mengukur "kill rate" aktual tes Anda.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Coverage kode tinggi (>80%) tetapi bug masih lolos ke produksi (kepercayaan palsu pada tes).
- Membangun logika kritis (keuangan, medis, keamanan) di mana kebenaran tidak bisa dinegosiasikan.
- Agen AI menghasilkan suite tes dan perlu memverifikasi bahwa tes benar-benar menangkap bug nyata.

---

### Konsep Inti & Pola Praktik

#### 1. Property-Based Testing
Alih-alih menulis tes contoh, definisikan properti universal yang harus berlaku untuk SEMUA input: Roundtrip (`decode(encode(x)) === x`), Idempotency (`f(f(x)) === f(x)`), Commutativity (`f(a,b) === f(b,a)`), Invariant (properti selalu berlaku), dan Equivalence (implementasi optimal = implementasi referensi).

#### 2. Mutation Testing
Secara sistematis memperkenalkan mutasi kecil pada kode (mengubah `>=` menjadi `>`, `*` menjadi `/`, `true` menjadi `false`) dan memverifikasi suite tes mendeteksi setiap mutasi. Jika tes masih lolos setelah mutasi, ada celah di kualitas tes Anda.

#### 3. Target Skor Mutasi
Kalkulasi keuangan: ≥95%. Autentikasi/otorisasi: ≥95%. Domain bisnis inti: ≥85%. Fungsi utilitas: ≥80%.

---

### Praktik Terbaik

1. **Properti di Atas Contoh**: Untuk fungsi pure, tulis property-based tests lebih dulu.
2. **Targetkan Skor Mutasi, Bukan Coverage**: 100% line coverage dengan 50% mutation score berarti separuh tes Anda tidak berguna.
3. **Gunakan AI untuk Menemukan Properti**: Minta model frontier mengidentifikasi properti aljabar dari fungsi Anda.
4. **Jalankan Stryker pada Jalur Kritis Saja**: Mutation testing mahal secara komputasi.

---

### Integrasi dengan Skill Lain (WAJIB)

- `e2e-testing-expert` — Lengkapi property/mutation tests dengan tes end-to-end Playwright.
- `autonomous-tdd-debugger` — Auto-fix tes properti yang gagal dalam loop self-healing TDD.
- `formal-spec-z3-verifier` — Untuk logika kritis, lengkapi property tests dengan bukti formal Z3/SMT.
- `production-ready-hardener` — Terapkan minimum kill rate mutasi sebagai gerbang pre-deployment.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Ditambahkan ke baris "Testing & Security" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Diintegrasikan di Fase 6 (Automated Testing, Error Resilience & Security Audit).
