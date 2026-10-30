---
name: zero-tech-debt-auditor
description: "Autonomous orchestrator that scans, refactors, and eradicates technical debt at the end of the development lifecycle to achieve a Zero Debt codebase / Orkestrator otonom untuk menghapus utang teknis sebelum rilis."
author: "Roedy Rustam"
version: "4.3.0"
---

# Zero Tech Debt Auditor 🧹

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Autonomous orchestrator that scans, refactors, and eradicates technical debt at the end of the development lifecycle to achieve a "Zero Debt" codebase before production release.

**CRITICAL RULE**: Applications are NOT considered "Production-Ready" until they pass the Zero Technical Debt (Zero Debt) audit. This skill must be invoked at the final stage of development.

### Core Philosophy
Technical debt slows down future scaling. The `zero-tech-debt-auditor` acts as an autonomous SonarQube. It does not just report issues; it **fixes** them autonomously.

### Trigger Conditions
- Invoked at the final verification phase before deployment (Phase 9 of zero-to-prod).
- When preparing an existing project for refactoring or technical debt elimination.
- When running comprehensive code health, deduplication, and dead code cleanup sweeps.

### Audit Dimensions

#### 1. Code Duplication & DRY Enforcement
- Scan the entire codebase for repeated logic.
- Extract duplicated UI elements into reusable generic components.
- Extract duplicated business logic into shared utility functions or custom hooks.

#### 2. Dead Code Elimination (Knip Protocol)
- Identify and remove unused files, exports, dependencies, and types.
- Review `package.json` and remove any library that is not actively imported.

#### 3. Type Safety Rigidity (TypeScript Strictness)
- Search for `any` or `@ts-ignore` and replace them with strict `Zod` schemas, discriminated unions, or generic types.
- Ensure all function returns are explicitly typed.

#### 4. Hardcoded Secrets & Magic Numbers
- Audit the codebase for hardcoded API URLs, keys, or "magic numbers" (e.g., `const timeout = 5000;`).
- Refactor them into centralized constant files (`constants.ts`) or environment variables (`process.env`).

#### 5. Test Coverage Handoff
- Ensure that critical business logic (e.g., payment webhooks, auth guards) have at least basic unit tests.
- If tests are missing, automatically generate them.

### Execution Protocol
When triggered, the Swarm Director must:
1. **Analyze:** Read the entire `src` directory.
2. **Report:** Generate a `TECH_DEBT_REPORT.md` (Artifact) listing the violations found.
3. **Eradicate:** Autonomously edit the files to fix the violations.
4. **Verify:** Run `npm run lint` and `npm run build` to ensure the eradications did not break the app.

### Orchestration & Integration
- Connected to `zero-to-prod-orchestrator`: Acts as Phase 9 (Final Handoff).
- Connected to `biome-linter-formatter-expert`: Uses strict linting rules to enforce consistency.
- Connected to `autonomous-tdd-debugger`: Fixes any tests broken during the refactoring process.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Orkestrator otonom yang memindai, melakukan refactoring, dan menghapus utang teknis (technical debt) di akhir siklus hidup pengembangan untuk mencapai basis kode "Zero Debt" sebelum rilis ke produksi.

**ATURAN KRUSIAL**: Aplikasi TIDAK dianggap "Siap Produksi" sampai lulus audit Zero Technical Debt. Skill ini wajib dijalankan pada tahap akhir pengembangan.

### Filosofi Utama
Utang teknis memperlambat skalabilitas masa depan. `zero-tech-debt-auditor` bertindak seperti SonarQube otonom. Bukan hanya melaporkan masalah, melainkan **memperbaikinya secara otonom**.

### Kondisi Pemicu
- Dijalankan pada fase verifikasi akhir sebelum peluncuran (Fase 9 zero-to-prod).
- Saat mempersiapkan proyek yang sudah ada untuk pembersihan atau refaktorisasi utang teknis.
- Saat melakukan pembersihan menyeluruh terhadap kode mati, duplikasi, dan inkonsistensi tipe.

### Dimensi Audit

#### 1. Duplikasi Kode & Penegakan DRY
- Pindai seluruh codebase untuk logika berulang.
- Ekstrak elemen UI yang berulang menjadi komponen generic yang dapat digunakan kembali.
- Ekstrak logika bisnis yang berulang ke fungsi utilitas bersama atau custom hook.

#### 2. Eliminasi Kode Mati (Protokol Knip)
- Identifikasi dan hapus file, ekspor, dependensi, dan tipe yang tidak terpakai.
- Tinjau `package.json` dan hapus dependensi yang tidak pernah diimpor.

#### 3. Ketelitian Tipe (TypeScript Strictness)
- Cari penggunaan `any` atau `@ts-ignore` dan ganti dengan skema `Zod`, discriminated unions, atau tipe generic yang ketat.
- Pastikan semua nilai kembalian fungsi memiliki tipe eksplisit.

#### 4. Kunci Rahasia & Angka Ajaib (Magic Numbers)
- Audit codebase untuk URL API, kunci rahasia, atau konstanta ajaib yang di-hardcode.
- Refaktor ke dalam file konstanta terpusat (`constants.ts`) atau variabel lingkungan (`process.env`).

#### 5. Cakupan Pengujian
- Pastikan logika bisnis penting (seperti webhook pembayaran, penjaga autentikasi) memiliki unit test dasar.
- Buat test otomatis jika belum ada.

### Protokol Eksekusi
1. **Analisis:** Pindai seluruh direktori `src`.
2. **Laporan:** Buat artifak `TECH_DEBT_REPORT.md` yang merinci pelanggaran yang ditemukan.
3. **Pemberantasan:** Edit file secara mandiri untuk memperbaiki masalah.
4. **Verifikasi:** Jalankan linting dan build untuk memastikan perbaikan tidak merusak aplikasi.

### Integrasi Orkestrasi
- Terhubung ke `zero-to-prod-orchestrator`: Bertindak sebagai Fase 9 (Serah Terima Akhir).
- Terhubung ke `biome-linter-formatter-expert`: Memakai aturan linting ketat untuk menjaga konsistensi.
- Terhubung ke `autonomous-tdd-debugger`: Memperbaiki pengujian yang terganggu selama proses refactoring.
