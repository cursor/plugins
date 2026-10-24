---
name: autonomous-api-drift-healer
description: "Expert guide for autonomous API schema drift detection, OpenAPI / gRPC breaking change monitoring, self-healing SDK adapter generation, and zero-downtime client-server synchronization / Panduan ahli deteksi drift skema API otonom, pemantauan breaking change OpenAPI / gRPC, pembuatan adapter SDK self-healing, dan sinkronisasi client-server tanpa downtime."
author: "Roedy Rustam"
version: "4.3.0"
---

# autonomous-api-drift-healer — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `brainstorming`, `zero-to-prod-orchestrator`, `api-design-expert`, `openapi-swagger-codegen-expert`, `typescript-expert`, and `zero-tech-debt-auditor` to autonomously detect breaking API drifts, update client SDKs, and generate compatibility adapters without human intervention.

### Description
Production guide for architecting autonomous API drift detection and self-healing pipelines across microservices and fullstack applications. Continuously analyzes schema differences across OpenAPI 3.1 specifications, gRPC Protocol Buffers, and GraphQL schemas, automatically synthesizing backward-compatible adapter layers, updating frontend Zod schemas, and issuing self-healing pull requests to eliminate client-server desynchronization.

### Trigger Conditions
Activate this skill when:
- Backend API endpoints or payload schemas are updated and frontend client calls risk desynchronization.
- Migrating between major API versions while requiring zero downtime for existing mobile and web clients.
- Auditing microservice contracts for breaking changes prior to deployment.
- Generating automated backward-compatibility shims when deprecating legacy fields.

---

### Core Concepts & Patterns

#### 1. API Drift Classification Taxonomy

| Drift Type | Severity | Impact | Self-Healing Strategy |
| :--- | :--- | :--- | :--- |
| **Field Renaming** | High (Breaking) | Old clients crash on `undefined` property | Synthesize getter shim translating old field name to new name |
| **New Required Param** | High (Breaking) | Old client requests rejected with 400 Bad Request | Introduce server-side default fallback in middleware |
| **Type Broadening** (e.g. `string` $\to$ `string \| string[]`) | Medium | Downstream callers may fail on single-item assumptions | Synthesize client normalizer normalizing to array |
| **Field Addition (Optional)** | Low (Additive) | Non-breaking | Regenerate TypeScript types and Zod schemas automatically |

#### 2. Autonomous Schema Drift Detector (TypeScript Implementation)

```typescript
export interface SchemaProperty {
  type: string;
  required?: boolean;
}

export interface EndpointContract {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  properties: Record<string, SchemaProperty>;
}

export interface DriftReport {
  breakingChanges: string[];
  additiveChanges: string[];
  hasDrift: boolean;
}

export class AutonomousApiDriftHealer {
  public static compareContracts(
    baseline: EndpointContract,
    updated: EndpointContract
  ): DriftReport {
    const breakingChanges: string[] = [];
    const additiveChanges: string[] = [];

    // Check for removed properties
    for (const [key, baseProp] of Object.entries(baseline.properties)) {
      if (!updated.properties[key]) {
        breakingChanges.push(`Property "${key}" of type "${baseProp.type}" was removed.`);
      } else if (baseProp.type !== updated.properties[key].type) {
        breakingChanges.push(
          `Property "${key}" changed type from "${baseProp.type}" to "${updated.properties[key].type}".`
        );
      }
    }

    // Check for newly introduced required properties
    for (const [key, updatedProp] of Object.entries(updated.properties)) {
      if (!baseline.properties[key]) {
        if (updatedProp.required) {
          breakingChanges.push(`New required property "${key}" was added.`);
        } else {
          additiveChanges.push(`New optional property "${key}" added.`);
        }
      }
    }

    return {
      breakingChanges,
      additiveChanges,
      hasDrift: breakingChanges.length > 0 || additiveChanges.length > 0
    };
  }

  public static generateBackwardCompatibleShim(
    oldField: string,
    newField: string
  ): string {
    return [
      `// Auto-generated backward compatibility adapter`,
      `export function adaptLegacyPayload<T extends Record<string, unknown>>(data: T): T & Record<string, unknown> {`,
      `  if (data && typeof data === 'object') {`,
      `    if (data['${newField}'] !== undefined && data['${oldField}'] === undefined) {`,
      `      return { ...data, ['${oldField}']: data['${newField}'] };`,
      `    }`,
      `  }`,
      `  return data;`,
      `}`
    ].join('\n');
  }
}
```

#### 3. Continuous Self-Healing Loop

```
[Git Commit: Backend Schema Edit]
               │
               ▼
[Drift Detection Sentinel]
  ├── Compares Staging OpenAPI against Production Spec
  └── Generates Drift Classification Report
               │
         Is Breaking?
        ┌──────┴──────┐
        ▼             ▼
      (Yes)          (No)
        │             │
        │             ▼
        │     Update Frontend Types
        ▼
[Synthesize Compatibility Layer]
  ├── Inject Middleware Default Mappings
  ├── Update Zod Client Validation Schemas
  └── Run E2E Test Suite via Ephemeral Sandbox
               │
               ▼
[Generate Automated Self-Healing PR]
```

---

### Best Practices

1. **Enforce Contract Verification in CI**: Block merge requests that introduce unannounced breaking schema changes without adapters.
2. **Auto-Generate Compatibility Shims**: When deprecating fields, keep them active for at least one minor release cycle via transformation adapters.
3. **Keep Zod Schemas Synchronized**: Automatically run code generation from OpenAPI specs so frontend types and runtime validators stay in lockstep.
4. **Log Adapter Usage**: Track telemetry on how often legacy adapters are triggered to safely decommission them when usage reaches zero.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Operational Risk | Engineering Remedy |
| :--- | :--- | :--- |
| Deleting an API field without client audit | Instant client crashes on mobile apps where updates are delayed | Mark field `@deprecated` and synthesize compatibility getter |
| Silently ignoring unmapped fields | Data loss and corrupted downstream state | Validate payloads strictly using Zod `.strict()` or `.passthrough()` |
| Manual manual updating of API types | Drift builds up, leading to painful quarterly migrations | Automate codegen via `openapi-typescript` on every commit |

---

### Integration with Other Skills (MANDATORY)

- `api-design-expert` — Standardize OpenAPI and REST guidelines to minimize accidental drift.
- `openapi-swagger-codegen-expert` — Regenerate client SDKs and TypeScript interfaces automatically.
- `typescript-expert` — Guarantee compile-time safety and type exhaustiveness across adapters.
- `zero-tech-debt-auditor` — Flag and clean up expired compatibility adapters after deprecation windows close.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "Desain API & Kontrak" and "DevOps & CI/CD" matrix rows.
- `zero-to-prod-orchestrator` — Integrated in Phase 4 (Backend APIs) and Phase 8 (Launch & Deployment).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `brainstorming`, `zero-to-prod-orchestrator`, `api-design-expert`, `openapi-swagger-codegen-expert`, `typescript-expert`, dan `zero-tech-debt-auditor` untuk mendeteksi perubahan skema API yang berpotensi merusak (*breaking drift*), memperbarui SDK klien, dan menghasilkan adapter kompatibilitas secara otomatis.

### Deskripsi
Panduan produksi untuk merancang pipeline deteksi drift skema API dan penyembuhan mandiri (*self-healing*) pada aplikasi fullstack dan microservices. Menganalisis perbedaan skema secara berkesinambungan pada spesifikasi OpenAPI 3.1, gRPC Protocol Buffers, dan GraphQL, menghasilkan adapter kompatibilitas mundur (*backward-compatible*), memperbarui skema Zod pada frontend, serta membuat pull request otomatis untuk mencegah desinkronisasi client-server.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Endpoint API backend atau skema payload diubah dan panggilan frontend berisiko mengalami desinkronisasi.
- Melakukan migrasi antar versi API utama dengan target nol *downtime* pada aplikasi web dan mobile.
- Mengaudit kontrak microservices sebelum proses deploy ke produksi.
- Menghasilkan shim kompatibilitas mundur saat menghapus atau mengubah nama properti lawas.

---

### Konsep Inti & Pola Praktik

#### 1. Klasifikasi Perubahan Skema (*Drift Classification*)
- **Perubahan Merusak (*Breaking*)**: Menghapus field yang sudah ada, mengubah tipe data (misal dari string ke number), atau menambahkan parameter wajib (*required*) baru. Solusi: Buat adapter transformasi atau nilai default di middleware.
- **Perubahan Tambahan (*Additive*)**: Menambahkan field opsional baru. Solusi: Perbarui tipe TypeScript dan skema Zod secara otomatis.

#### 2. Pipeline Penyembuhan Mandiri (*Self-Healing Loop*)
1. **Deteksi Perubahan**: Bandingkan spesifikasi OpenAPI backend terkini dengan skema klien yang ada.
2. **Pembuatan Adapter**: Jika ditemukan penggantian nama field, buat adapter getter untuk menerjemahkan field lama ke field baru.
3. **Pembaruan Tipe Klien**: Jalankan generator tipe TypeScript dan skema validasi runtime Zod.
4. **Verifikasi Pengujian**: Uji integrasi dalam sandbox untuk memastikan klien lama tetap berfungsi.
5. **Pull Request Otomatis**: Buat cabang git dan PR dengan deskripsi perubahan yang jelas.

---

### Praktik Terbaik

1. **Jadikan Pengecekan Kontrak Sebagai Gerbang CI**: Gagalkan proses merge jika terdapat *breaking change* yang belum dilengkapi adapter kompatibilitas.
2. **Pertahankan Field Lawas Selama Masa Transisi**: Jangan langsung menghapus properti; tandai sebagai `@deprecated` dan gunakan adapter minimal selama satu siklus rilis.
3. **Sinkronkan Skema Zod**: Pastikan validator frontend selalu diperbarui langsung dari kontrak OpenAPI.
4. **Pantau Penggunaan Adapter**: Catat metrik penggunaan adapter untuk mengetahui kapan modul lawas aman dihapus sepenuhnya.

---

### Jebakan Umum yang Harus Dihindari

| Praktik Buruk | Dampak Buruk | Solusi Rekayasa |
| :--- | :--- | :--- |
| Menghapus field API tanpa memeriksa versi aplikasi mobile | Aplikasi versi lama langsung crash saat dibuka pengguna | Gunakan adapter kompatibilitas mundur pada middleware |
| Mengabaikan properti tambahan secara diam-diam | Terjadi kehilangan data saat payload disimpan kembali | Gunakan validasi eksplisit dengan skema Zod |
| Mengetik ulang interface API secara manual di frontend | Terjadi akumulasi desinkronisasi tipe data | Gunakan otomatisasi codegen dari OpenAPI pada setiap commit |

---

### Integrasi dengan Skill Lain (WAJIB)

- `api-design-expert` — Standardisasi spesifikasi REST dan OpenAPI untuk mencegah drift tak terduga.
- `openapi-swagger-codegen-expert` — Regenerasi SDK klien dan interface TypeScript otomatis.
- `typescript-expert` — Menjamin keamanan tipe data pada adapter.
- `zero-tech-debt-auditor` — Menandai dan membersihkan adapter lawas yang sudah kedaluwarsa.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Tambahkan ke baris "Desain API & Kontrak" dan "DevOps & CI/CD" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Tambahkan ke Fase 4 (Backend APIs) dan Fase 8 (Peluncuran & Deployment).
