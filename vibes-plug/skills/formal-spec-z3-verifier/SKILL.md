---
name: formal-spec-z3-verifier
description: "Expert guide for mathematical formal verification, SMT solver constraints (Z3, Dafny, TLA+), invariant theorem proving for FinTech billing state machines, RBAC/ABAC authorization, and zero-violation architecture / Panduan ahli verifikasi formal matematis, SMT solver (Z3, Dafny, TLA+), pembuktian invarian state machine billing FinTech, otorisasi RBAC/ABAC, dan arsitektur zero-violation."
author: "Roedy Rustam"
version: "4.3.0"
---

# formal-spec-z3-verifier — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `brainstorming`, `zero-to-prod-orchestrator`, `saas-billing`, `doku-payment-gateway`, `authentication-identity-expert`, and `database-orm-expert` to mathematically prove software invariants, state transitions, and authorization policies using formal SMT solvers before writing production code.

### Description
Production guide for applying formal methods, mathematical specifications, and SMT (Satisfiability Modulo Theories) solvers (Z3, Dafny, TLA+) to mission-critical software systems. Proves zero-invariant violation across double-entry ledger bookkeeping, billing subscription state machines, multi-tenant isolation boundaries, and cryptographic key lifecycle models.

### Trigger Conditions
Activate this skill when:
- Designing financial ledgers, wallets, or payment gateway state transition graphs.
- Verifying complex RBAC/ABAC permission rules to guarantee that privilege escalation is mathematically impossible.
- Modeling concurrent or distributed state machines where race conditions could cause state desynchronization.
- Formulating formal invariant specifications prior to backend ORM and database schema generation.

---

### Core Concepts & Patterns

#### 1. Invariant Specification Matrix

| System Domain | Mathematical Invariant | Solver Check |
| :--- | :--- | :--- |
| **Double-Entry FinTech Ledger** | $\sum \text{Debits} - \sum \text{Credits} = 0 \land \forall a, \text{balance}(a) \ge 0$ | Prove balance preservation across all concurrent transactions |
| **SaaS Billing State Machine** | $\text{State} \in \{ \text{Trial}, \text{Active}, \text{PastDue}, \text{Canceled} \}$ with strict monotonic transitions | Prove unreachable illegal transition (e.g. Canceled $\to$ Active without Payment) |
| **Multi-Tenant Authorization** | $\forall r \in \text{Resources}, \text{TenantId}(r) = \text{Session}(\text{TenantId})$ | Prove satisfiability of data leakage equals $\emptyset$ |

#### 2. Financial Ledger Invariant Verifier (Z3 TypeScript/Python Pattern)

```typescript
export interface LedgerEntry {
  accountId: string;
  debit: number;
  credit: number;
}

export interface VerificationResult {
  isSound: boolean;
  counterExample?: string;
  message: string;
}

export class LedgerFormalVerifier {
  public static verifyTransactionBalance(entries: LedgerEntry[]): VerificationResult {
    if (entries.length < 2) {
      return {
        isSound: false,
        message: 'A valid double-entry transaction must contain at least two entries.'
      };
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      if (entry.debit < 0 || entry.credit < 0) {
        return {
          isSound: false,
          counterExample: JSON.stringify(entry),
          message: 'Negative debit or credit amounts violate non-negative entry invariant.'
        };
      }
      if (entry.debit > 0 && entry.credit > 0) {
        return {
          isSound: false,
          counterExample: JSON.stringify(entry),
          message: 'Single entry cannot contain both debit and credit amounts simultaneously.'
        };
      }
      totalDebit += entry.debit;
      totalCredit += entry.credit;
    }

    const delta = Math.abs(totalDebit - totalCredit);
    if (delta > 0.0001) {
      return {
        isSound: false,
        counterExample: `Debits: ${totalDebit}, Credits: ${totalCredit}, Discrepancy: ${delta}`,
        message: 'Double-entry balance invariant violated: Debits must strictly equal Credits.'
      };
    }

    return {
      isSound: true,
      message: 'Ledger invariant mathematically verified: Zero discrepancy.'
    };
  }
}
```

#### 3. State Machine Transition Guard Validation
Before implementing database enum updates, model the allowable state graph as an adjacency matrix with strict precondition guards:

```
[Trial] ────────► [Active] ────────► [PastDue]
  │                  │                  │
  │                  ▼                  ▼
  └─────────────► [Canceled] ◄──────────┘
```
Any edge attempting to move from `Canceled` directly back to `Active` without passing through the `Checkout/Re-subscribe` gate is blocked by formal proof.

---

### Best Practices

1. **Specify Invariants Before Schema Generation**: Formulate formal invariants (e.g. balance conservation, role hierarchy) before creating tables or ORM migrations.
2. **Search for Counterexamples Actively**: Run SMT solvers in negation mode (`prove NOT invariant`) to discover edge-case input values that break assertions.
3. **Bind Formal Guards into Database Constraints**: Translate proven invariants into PostgreSQL `CHECK` constraints, foreign keys, and atomic database triggers.
4. **Never Rely Solely on Unit Tests for FinTech**: Unit tests only test known examples ($O(N)$); formal verification tests all possible states ($O(\infty)$).

---

### Common Pitfalls to Avoid

| Anti-Pattern | Critical Risk | Engineering Remedy |
| :--- | :--- | :--- |
| Floating point arithmetic for currency | Inexact decimal rounding creates ledger drift | Enforce integer cents/satoshis with strict SMT bounds |
| Unconstrained state transitions | Illegitimate subscription access without payment | Model transition matrix with formal guard preconditions |
| Relying on application-layer checks alone | Race condition during concurrent API calls bypasses check | Pair formal proof with database atomic constraints & row locks |

---

### Integration with Other Skills (MANDATORY)

- `saas-billing` — Formally prove subscription state transitions and balance deductions.
- `doku-payment-gateway` — Validate atomic idempotency and payment settlement invariants.
- `authentication-identity-expert` — Mathematically verify RBAC/ABAC role hierarchies.
- `database-orm-expert` — Implement proven invariants as SQL check constraints and foreign keys.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "Testing & Keamanan" and "Desain API & Kontrak" matrix rows.
- `zero-to-prod-orchestrator` — Integrated in Phase 2 (Foundation) and Phase 6 (Testing & QA).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `brainstorming`, `zero-to-prod-orchestrator`, `saas-billing`, `doku-payment-gateway`, `authentication-identity-expert`, dan `database-orm-expert` untuk membuktikan invarian perangkat lunak, transisi state, dan kebijakan otorisasi secara matematis sebelum penulisan kode produksi.

### Deskripsi
Panduan produksi untuk menerapkan metode formal, spesifikasi matematis, dan SMT (*Satisfiability Modulo Theories*) solver (seperti Z3, Dafny, TLA+) pada sistem perangkat lunak misi kritis. Membuktikan ketiadaan pelanggaran invarian (*zero-invariant violation*) pada pembukuan entri ganda FinTech, transisi siklus langganan SaaS, batas isolasi multi-tenant, dan hierarki akses.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Merancang buku besar keuangan (*ledger*), dompet digital, atau state machine gateway pembayaran.
- Memverifikasi aturan perizinan RBAC/ABAC untuk memastikan eskalasi hak akses secara matematis mustahil terjadi.
- Memodelkan state machine konkuren atau terdistribusi di mana *race condition* dapat memicu desinkronisasi.
- Menyusun spesifikasi invarian formal sebelum membuat skema database dan ORM.

---

### Konsep Inti & Pola Praktik

#### 1. Pembuktian Invarian Buku Besar FinTech
Setiap transaksi keuangan wajib mematuhi aturan entri ganda:
1. **Konservasi Nilai**: Jumlah total debit harus sama persis dengan jumlah total kredit ($\sum \text{Debit} = \sum \text{Kredit}$).
2. **Ketiadaan Nilai Negatif**: Tidak boleh ada nilai debit atau kredit di bawah nol.
3. **Penyimpanan Integer**: Nilai moneter wajib disimpan dalam satuan terkecil (misalnya sen atau rupiah penuh) tanpa floating point.

#### 2. Verifikasi Transisi State Langganan
Pastikan tidak ada alur ilegal dalam sistem langganan:
- Akun yang sudah `Canceled` tidak boleh berubah menjadi `Active` tanpa melewati proses verifikasi pembayaran baru (*Re-checkout*).
- Status `PastDue` harus otomatis membatasi akses fitur premium sesuai aturan masa tenggang (*grace period*).

---

### Praktik Terbaik

1. **Spesifikasikan Invarian Sebelum Menulis Kode**: Tentukan rumus matematis invarian sebelum membuat tabel database atau API route.
2. **Cari *Counter-Example* Secara Aktif**: Gunakan solver untuk mencari kondisi tepi (*corner cases*) yang berpotensi melanggar asumsi sistem.
3. **Terjemahkan Invarian ke Constraint SQL**: Terapkan hasil pembuktian ke dalam `CHECK constraint` PostgreSQL dan atomic locks.
4. **Hindari Floating Point untuk Uang**: Gunakan bilangan bulat (integer) untuk mencegah kebocoran saldo akibat pembulatan desimal.

---

### Jebakan Umum yang Harus Dihindari

| Praktik Buruk | Dampak Buruk | Solusi Rekayasa |
| :--- | :--- | :--- |
| Menggunakan tipe data float untuk saldo keuangan | Selisih sen akibat rounding error yang menumpuk | Gunakan tipe integer (satuan sen) dengan validasi solver |
| Mengizinkan transisi state tanpa validasi prasyarat | Pengguna mendapat akses gratis setelah membatalkan langganan | Buktikan matriks transisi dengan formal state graph |
| Validasi hanya di lapisan aplikasi | Transaksi paralel dapat menembus pengecekan (race condition) | Gabungkan bukti formal dengan kunci transaksi database (`SELECT FOR UPDATE`) |

---

### Integrasi dengan Skill Lain (WAJIB)

- `saas-billing` — Membuktikan transisi state langganan dan deduksi kuota secara formal.
- `doku-payment-gateway` — Memvalidasi invarian idempotensi transaksi pembayaran.
- `authentication-identity-expert` — Memverifikasi hierarki peran RBAC/ABAC tanpa celah eskalasi.
- `database-orm-expert` — Mengimplementasikan invarian terbukti ke dalam constraint database.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Tambahkan ke baris "Testing & Keamanan" dan "Desain API & Kontrak" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Tambahkan ke Fase 2 (Pondasi Proyek) dan Fase 6 (Pengujian Otomatis & Keamanan).
