---
name: ephemeral-wasm-sandbox-executor
description: "Expert guide for ephemeral WebAssembly (WASM) and isolated micro-runtime sandboxes to securely execute AI-generated code, validate database migrations in-memory, and perform sub-millisecond fuzzing / Panduan ahli sandbox WebAssembly (WASM) efemeral dan micro-runtime terisolasi untuk eksekusi kode AI yang aman, validasi migrasi database in-memory, dan fuzzing sub-milidetik."
author: "Roedy Rustam"
version: "4.3.0"
---

# ephemeral-wasm-sandbox-executor — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `brainstorming`, `zero-to-prod-orchestrator`, `autonomous-tdd-debugger`, `wasm-edge-computing-expert`, `autonomous-red-teamer`, and `production-ready-hardener` to safely execute untrusted AI-generated code, simulate database migrations in-memory, and run security fuzzers with zero host blast radius.

### Description
Production guide for architecting ultra-low latency, zero-trust ephemeral sandboxes powered by WebAssembly (WASM) runtimes (such as Wasmtime, Extism, and PGlite/SQLite WASM). Provides agents with instant execution environments (<5ms startup overhead) to dry-run database migrations, test adversarial inputs, execute generated logic, and evaluate potential security hazards without Docker container overhead or risk to host systems.

### Trigger Conditions
Activate this skill when:
- Testing AI-generated code snippets or regex patterns that could trigger infinite loops or ReDoS.
- Dry-running SQL migrations, schema alterations, or database seeds in an in-memory WASM Postgres/SQLite instance before staging.
- Executing dynamic user-submitted code in multi-tenant SaaS environments with strict CPU and memory quotas.
- Running high-speed fuzz tests and dynamic property-based tests across generated functions.

---

### Core Concepts & Patterns

#### 1. Sandbox Comparison Matrix

| Runtime Model | Cold Start Latency | Memory Overhead | Host Isolation Level | Best Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Traditional Docker / OCI** | 1,500ms - 4,000ms | 100MB - 500MB | Hypervisor / Namespace | Heavy integration tests, full services |
| **Node.js `vm` module** | < 1ms | < 2MB | Weak (Prototype pollution vulnerable) | Not suitable for untrusted AI execution |
| **WASM Micro-Runtime (Extism / Wasmtime)** | **< 3ms** | **< 10MB** | **Absolute (Memory-isolated linear memory)** | **AI code validation, logic verification, transforms** |
| **In-Memory WASM DB (PGlite)** | **< 15ms** | **< 30MB** | **Complete file-system isolation** | **Zero-risk SQL migration dry runs** |

#### 2. In-Memory Migration Dry-Runner (PGlite Implementation)

```typescript
import { PGlite } from '@electric-sql/pglite';

export interface MigrationDryRunResult {
  success: boolean;
  appliedSteps: number;
  executionTimeMs: number;
  error?: string;
}

export class EphemeralDatabaseSandbox {
  private db: PGlite | null = null;

  public async initialize(): Promise<void> {
    this.db = new PGlite();
    await this.db.waitReady;
  }

  public async dryRunMigrations(sqlStatements: string[]): Promise<MigrationDryRunResult> {
    if (!this.db) {
      await this.initialize();
    }

    const startTime = performance.now();
    let applied = 0;

    try {
      await this.db!.query('BEGIN;');

      for (const statement of sqlStatements) {
        if (!statement.trim()) continue;
        await this.db!.query(statement);
        applied++;
      }

      await this.db!.query('ROLLBACK;');

      return {
        success: true,
        appliedSteps: applied,
        executionTimeMs: performance.now() - startTime
      };
    } catch (err: unknown) {
      if (this.db) {
        await this.db.query('ROLLBACK;').catch(() => {});
      }
      return {
        success: false,
        appliedSteps: applied,
        executionTimeMs: performance.now() - startTime,
        error: err instanceof Error ? err.message : String(err)
      };
    } finally {
      if (this.db) {
        await this.db.close();
        this.db = null;
      }
    }
  }
}
```

#### 3. Resource-Metered Sandboxing Architecture

To prevent adversarial infinite loops and excessive resource consumption:
1. **Instruction Fuel Metering**: Deduct fuel units per WASM instruction opcode; abort when fuel drops to zero.
2. **Linear Memory Caps**: Constrain guest WASM memory pages to a hard limit (e.g. 64MB max).
3. **No Ambient System Calls**: Deny disk writes, outbound sockets, and environment variable access by default unless explicitly shimmed through capability-based security.

---

### Best Practices

1. **Dry-Run All Migrations in WASM First**: Before applying DDL migrations to staging or production databases, run the exact SQL script in an ephemeral PGlite instance to catch syntax errors and foreign key violations.
2. **Enforce Strict Fuel Metering**: Attach instruction fuel limits to AI-generated loops to prevent denial-of-service or hangs.
3. **Isolate Guest State**: Instantiate a fresh WASM memory instance per test invocation to guarantee zero cross-test state pollution.
4. **Capture Standard Streams**: Pipe guest `stdout` and `stderr` into structured telemetry rather than unbuffered process output.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Vulnerability | Engineering Remedy |
| :--- | :--- | :--- |
| Using `eval()` or Node.js `vm` for AI code | Prototype escape and host environment compromise | Execute exclusively inside WASM or V8 isolate sandbox |
| Applying migrations directly to staging DB | Schema corruption and long downtime on failed rollback | Dry-run in ephemeral WASM Postgres before applying |
| Allowing unbounded WASM memory growth | Host OOM (Out Of Memory) crash | Configure max memory pages (`memory.grow` ceiling) |

---

### Integration with Other Skills (MANDATORY)

- `autonomous-tdd-debugger` — Use sandbox as the execution harness for autonomous test verification.
- `wasm-edge-computing-expert` — Share WASM compilation toolchains, runtime profiles, and memory limits.
- `autonomous-red-teamer` — Safely execute exploit payloads and dynamic fuzzing within isolated WASM boundaries.
- `production-ready-hardener` — Verify all sandbox security headers, fuel limits, and capability policies.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "Testing & Keamanan" and "Backend & Runtime" matrix rows.
- `zero-to-prod-orchestrator` — Integrated in Phase 6 (Automated Testing, Error Resilience & Security Audit).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `brainstorming`, `zero-to-prod-orchestrator`, `autonomous-tdd-debugger`, `wasm-edge-computing-expert`, `autonomous-red-teamer`, dan `production-ready-hardener` untuk mengeksekusi kode hasil AI secara aman, mensimulasikan migrasi database in-memory, dan menjalankan pengujian keamanan tanpa risiko pada sistem host.

### Deskripsi
Panduan produksi untuk merancang sandbox efemeral berlatensi ultra-rendah dan berprinsip zero-trust yang ditenagai oleh runtime WebAssembly (WASM) seperti Wasmtime, Extism, serta PGlite/SQLite WASM. Menyediakan lingkungan eksekusi instan (<5ms) bagi agen otonom untuk memvalidasi migrasi database, menguji input berbahaya, dan memverifikasi kode hasil AI tanpa overhead kontainer Docker.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Menguji kode hasil AI atau pola regex yang berpotensi memicu loop tak berujung atau kerentanan ReDoS.
- Melakukan *dry-run* skrip migrasi SQL pada database in-memory (PGlite WASM) sebelum diterapkan ke database staging.
- Menjalankan kode pengguna pada arsitektur multi-tenant dengan kuota CPU dan memori yang ketat.
- Melakukan pengujian fuzzing kecepatan tinggi untuk memvalidasi ketahanan fungsi.

---

### Konsep Inti & Pola Praktik

#### 1. Validasi Migrasi In-Memory (PGlite)
Sebelum menerapkan migrasi database apa pun:
1. **Inisialisasi Cepat**: Buat instance Postgres WASM in-memory dalam hitungan milidetik.
2. **Eksekusi Transaksional**: Jalankan seluruh skrip DDL migrasi di dalam blok transaksi.
3. **Verifikasi Integritas**: Pastikan foreign key, tipe data, dan constraint terpasang tanpa konflik.
4. **Rollback & Buang**: Buang instance WASM tanpa meninggalkan jejak atau mengubah disk host.

#### 2. Pembatasan Sumber Daya (*Fuel Metering*)
- **Penghitungan Instruksi**: Tetapkan batas instruksi komputasi (*fuel*). Jika kode mengalami *infinite loop*, runtime WASM akan otomatis menghentikan eksekusi saat bahan bakar habis.
- **Batas Memori Linear**: Kunci alokasi memori maksimal pada angka aman (misalnya 64MB) guna mencegah crash *Out of Memory* pada server.

---

### Praktik Terbaik

1. **Dry-Run Seluruh Migrasi di WASM**: Validasi sintaks SQL dan dependensi relasional pada PGlite terlebih dahulu.
2. **Gunakan Batasan Bahan Bakar (*Fuel*)**: Hindari eksekusi tanpa batas waktu untuk kode yang dihasilkan oleh model AI.
3. **Isolasi Mutlak State**: Gunakan instance memori baru untuk setiap pengujian agar tidak terjadi kebocoran state antar pengujian.
4. **Blokir Akses Sistem Operasi**: Larang akses langsung ke disk lokal atau socket jaringan kecuali yang diberikan izin secara eksplisit.

---

### Jebakan Umum yang Harus Dihindari

| Praktik Buruk | Dampak Buruk | Solusi Rekayasa |
| :--- | :--- | :--- |
| Menggunakan `eval()` untuk menjalankan kode AI | Risiko pelarian sandbox dan kompromi server host | Jalankan secara eksklusif di dalam sandbox WASM |
| Menjalankan migrasi langsung ke staging | Database corrupt dan downtime saat rollback gagal | Jalankan dry-run di WASM Postgres sebelum deploy |
| Membiarkan memori WASM tanpa batas | Crash server akibat memori habis (OOM) | Batasi jumlah halaman memori maksimum |

---

### Integrasi dengan Skill Lain (WAJIB)

- `autonomous-tdd-debugger` — Menggunakan sandbox sebagai lingkungan eksekusi pengujian mandiri.
- `wasm-edge-computing-expert` — Sinkronisasi profil runtime dan batasan memori WASM.
- `autonomous-red-teamer` — Menjalankan uji penetrasi dan fuzzing dalam lingkungan terisolasi.
- `production-ready-hardener` — Memverifikasi kebijakan keamanan sandbox dan alokasi resource.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Tambahkan ke baris "Testing & Keamanan" dan "Backend & Runtime" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Tambahkan ke Fase 6 (Pengujian Otomatis, Ketahanan Error & Audit Keamanan).
