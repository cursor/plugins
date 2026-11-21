---
name: autonomous-tdd-debugger
description: "Empowers the agent to autonomously run tests, read terminal stack traces, and self-heal code until tests pass. Transforms the agent from a passive coder to an active CI pipeline debugger."
author: "Roedy Rustam"
version: "4.3.0"
---

# Autonomous TDD Debugger & Self-Healing Agent

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Transforms the AI agent from a passive code generator into an active, autonomous Test-Driven Development (TDD) engineer. When invoked, the agent is mandated to execute tests, parse terminal stack traces, analyze failing assertions, and autonomously modify code in an iterative self-healing loop until all tests pass (exit code 0)—without prompting the user to manually run commands or debug errors.

### Trigger Conditions
- User asks to fix failing tests or debug runtime errors without providing full error logs.
- Directives such as *"Write the feature and ensure all tests pass"*, *"Fix this bug autonomously"*, or *"Refactor and verify"*.
- Phase 6 (Automated Testing & Quality Gate) execution in `zero-to-prod-orchestrator`.
- Post-migration regression validation in `legacy-code-translator`.

### Autonomous Self-Healing Loop (5-Step Protocol)

```
┌────────────────────────────────────────────────────────┐
│ 1. EXECUTE TEST RUNNER                                 │
│    Run `vitest run`, `cargo test`, `pytest`, or `go test`│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. PARSE STACK TRACE & FILTER NOISE                   │
│    Extract failing file, line number, expected vs actual│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. AST BLAST-RADIUS CHECK                              │
│    Locate caller functions; isolate logic from tests   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. APPLY PRECISION PATCH                               │
│    Fix production implementation; NEVER mock fakes     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 5. RE-RUN & VERIFY (Max 5 Iterations)                  │
│    Exit Code 0? ──► [YES] Complete & Report Artifact   │
│                 └──► [NO]  Loop back to Step 2         │
└────────────────────────────────────────────────────────┘
```

### Self-Healing Script Example (TypeScript / Vitest)

```typescript
// scripts/tdd-runner.mjs
import { execSync } from 'node:child_process';
import path from 'node:path';

export function runTDDLoop(testPattern = '', maxAttempts = 5): boolean {
  console.log(`[TDD-Debugger] Starting autonomous test cycle (Limit: ${maxAttempts} attempts)...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\n--- Attempt ${attempt} of ${maxAttempts} ---`);
    try {
      const output = execSync(`npx vitest run ${testPattern} --reporter=verbose`, {
        encoding: 'utf8',
        stdio: 'pipe',
      });
      console.log('✅ All tests passed successfully!');
      return true;
    } catch (err: any) {
      const stdout = err.stdout?.toString() || '';
      const stderr = err.stderr?.toString() || '';
      const combined = stdout + '\n' + stderr;

      // Extract failing test location
      const frameMatch = combined.match(/(?:FAIL|Error:)\s+(.*?):(\d+):(\d+)/) ||
                         combined.match(/at\s+(.*?):(\d+):(\d+)/);

      if (frameMatch) {
        const [, file, line] = frameMatch;
        console.warn(`[TDD-Debugger] Failure detected at ${path.basename(file)}:${line}`);
      } else {
        console.warn('[TDD-Debugger] Test failure detected. Analyzing raw output...');
      }

      if (attempt === maxAttempts) {
        console.error('❌ Reached maximum self-healing attempts. Circuit breaker tripped.');
        return false;
      }
    }
  }
  return false;
}
```

### Non-Negotiable Agent Constraints
1. **Zero-Human Intervention**: NEVER ask the user *"Please run this and tell me the error"*. You possess `run_command`—execute it directly in the terminal, read stdout/stderr, and iterate until green.
2. **Respect Test Integrity (Anti-Slop Pillar 2)**:
   - Do NOT comment out or skip failing tests (`test.skip`) to fake a passing suite.
   - Do NOT replace failing assertions with trivial tautologies (`expect(true).toBe(true)`).
   - Fix the production source code first. Only modify test files if the test specification itself is demonstrably obsolete or contradictory.
3. **Circuit Breaker**: Capped at 5 self-healing iterations. If an issue remains unresolved after 5 cycles, pause to re-verify fundamental architectural assumptions.

## Orchestration & Integration
- **`e2e-testing-expert`**: Provides Playwright and Vitest configuration and fixture best practices.
- **`anti-slop`**: Enforces strict code quality, zero placeholders, and non-trivial assertions during fixes.
- **`error-resilience-expert`**: Guides the choice of resilient recovery patterns (retries, timeouts, fallbacks).
- **`session-memory-manager`**: Keeps track of failing symbols and modifications in `CHECKPOINT.md`.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `e2e-testing-expert`, `anti-slop`, `error-resilience-expert`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Mengubah agen AI dari sekadar pembuat kode pasif menjadi insinyur *Test-Driven Development* (TDD) yang aktif dan mandiri. Saat diaktifkan, agen diwajibkan menjalankan pengujian otomatis, mem-parsing *stack trace* di terminal, menganalisis kegagalan asersi, dan memodifikasi kode secara otonom dalam siklus perbaikan (*self-healing loop*) berulang hingga seluruh pengujian lulus (*exit code 0*)—tanpa meminta pengguna untuk melakukan pengujian manual.

### Kondisi Pemicu
- Pengguna meminta untuk memperbaiki *test* yang gagal atau mencari *bug* tanpa menyertakan log error lengkap.
- Instruksi seperti *"Tulis fitur ini dan pastikan semua test lulus"*, *"Debug kode ini secara mandiri"*, atau *"Refaktor dan buktikan dengan test"*.
- Eksekusi Fase 6 (Pengujian Otomatis & Gerbang Kualitas) pada `zero-to-prod-orchestrator`.
- Verifikasi regresi setelah migrasi kode warisan pada `legacy-code-translator`.

### Siklus Mandiri 5 Langkah

```
1. JALANKAN TEST RUNNER (via run_command)
   npx vitest run, cargo test, pytest, atau go test
        │
        ▼
2. FILTER STACK TRACE & NOISE TERMINAL
   Ekstrak file yang gagal, nomor baris, nilai aktual vs ekspektasi
        │
        ▼
3. ANALISIS RADIUS DAMPAK (AST CHECK)
   Cari fungsi implementasi terkait; pisahkan logika dari file test
        │
        ▼
4. TERAPKAN PERBAIKAN PRESISI
   Perbaiki implementasi di kode produksi; DILARANG membuat mock palsu
        │
        ▼
5. VERIFIKASI ULANG (Maksimal 5 Iterasi)
   Exit code 0? ──► [YA] Selesai & Laporkan ke pengguna
                └──► [TIDAK] Ulangi ke Langkah 2
```

### Panduan Ketat Tindakan Agen
1. **Dilarang Meminta Bantuan User (Zero-Human Intervention)**: Jangan pernah berkata *"Tolong jalankan perintah ini dan beritahu saya error-nya"*. Anda memiliki tool `run_command` untuk menjalankannya sendiri, membaca output terminal, dan memperbaikinya.
2. **Kepatuhan Anti-Slop (Pilar 2)**:
   - Dilarang keras menonaktifkan test gagal (`test.skip`) demi memalsukan exit code 0.
   - Dilarang mengubah asersi menjadi bernilai selalu benar (`expect(true).toBe(true)`).
   - Selalu perbaiki kode implementasi produksi terlebih dahulu.
3. **Circuit Breaker 5 Siklus**: Jika kode belum berhasil diperbaiki setelah 5 kali iterasi, hentikan loop dan evaluasi ulang arsitektur logika dasar agar tidak menghabiskan konteks.

## Integrasi Orkestrasi
- **`e2e-testing-expert`**: Menyediakan konfigurasi dan test runner Playwright/Vitest.
- **`anti-slop`**: Menegakkan asersi pengujian yang nyata dan bebas dari placeholder.
- **`error-resilience-expert`**: Memberikan panduan pola perbaikan error yang andal.
- **`session-memory-manager`**: Mencatat file yang diperbaiki ke `CHECKPOINT.md`.