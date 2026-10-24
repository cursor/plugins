---
name: compliance-gdpr-privacy-expert
description: "Expert guide for Data Privacy, GDPR, CCPA, and PDPA compliance. Covers consent management, data retention, privacy-by-design, and audit trails / Panduan kepatuhan Privasi Data, GDPR, dan PDPA."
author: "Roedy Rustam"
version: "4.3.0"
---

# Data Privacy & Compliance Expert (GDPR, CCPA & UU PDP 2026)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production engineering guide for regulatory data privacy and compliance across GDPR (EU), CCPA/CPRA (California), and UU PDP No. 27/2022 (Indonesia). Covers technical patterns for PII (Personally Identifiable Information) encryption at rest, cascading data anonymization (Right to be Forgotten while retaining immutable financial ledgers for tax authorities), consent state machines, and automated logger redaction.

### Trigger Conditions
- Storing customer PII (names, emails, physical addresses, phone numbers, IP addresses, national IDs).
- Implementing compliant cookie consent banners with opt-in tracking scripts.
- Handling data deletion and export requests (*Right to Access* and *Right to be Forgotten*).
- Sanitizing logging pipelines to prevent accidental PII leakage to Datadog, Axiom, or Sentry.

### Cascading PII Anonymization Routine (TypeScript / PostgreSQL)
Erases personal identity while preserving aggregate transaction integrity for accounting compliance:

```typescript
// src/services/privacy-compliance.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';

export async function processRightToBeForgotten(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. Generate irreversible cryptographic pseudo-identifier
    const pseudoHash = crypto.createHash('sha256').update(`${userId}-${process.env.PEPPER_SECRET}`).digest('hex').slice(0, 16);
    const anonymizedEmail = `deleted-${pseudoHash}@anonymized.internal`;

    // 2. Anonymize user record: scrub sensitive fields
    await tx.execute(sql`
      UPDATE users
      SET 
        name = 'Anonymized Customer',
        email = ${anonymizedEmail},
        phone_number = NULL,
        billing_address = NULL,
        ip_address = '0.0.0.0',
        is_anonymized = TRUE,
        anonymized_at = NOW()
      WHERE id = ${userId}
    `);

    // 3. Scrub profile sessions and third-party provider tokens
    await tx.execute(sql`DELETE FROM user_sessions WHERE user_id = ${userId}`);
    await tx.execute(sql`DELETE FROM oauth_accounts WHERE user_id = ${userId}`);

    // 4. Log compliance audit trail (immutable record of the erasure action)
    await tx.execute(sql`
      INSERT INTO privacy_audit_logs (id, action, target_pseudo_id, executed_at)
      VALUES (gen_random_uuid(), 'RIGHT_TO_BE_FORGOTTEN_EXECUTED', ${pseudoHash}, NOW())
    `);
  });
}
```

### Pino Logger Automated PII Redaction Configuration

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'email',
      'password',
      'token',
      'creditCard',
      'authorization',
      '*.email',
      '*.password',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED_PII]',
  },
});
```

### The 3 Golden Privacy Invariants
1. **Never Hard Delete Financial Invoices**: Tax laws require preserving transaction records for 5-10 years. Anonymize the customer's PII, but keep the currency amounts, timestamps, and VAT records intact.
2. **Prior Consent for Tracking Scripts**: Do NOT load Google Analytics, Meta Pixel, or third-party cookies until the user has actively opted in. Default to blocked.
3. **Encryption at Rest**: Columns containing sensitive national IDs (KTP/NIK/SSN) or phone numbers must be encrypted using AES-256-GCM before database insertion.

## Orchestration & Integration
- **`database-orm-expert`**: Maintains schema definitions for encrypted columns and anonymization flags.
- **`logging-error-tracking-expert`**: Enforces strict PII redaction rules across all application logs.
- **`authentication-identity-expert`**: Handles secure account de-registration and session revocation.
- **`saas-billing`**: Preserves financial audit ledgers during customer deletion workflows.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi bersama `database-orm-expert`, `logging-error-tracking-expert`, `authentication-identity-expert`, dan `saas-billing`.

### Deskripsi
Panduan rekayasa produksi untuk kepatuhan regulasi privasi data global dan nasional, termasuk GDPR (Uni Eropa), CCPA (California), dan UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP Indonesia). Mencakup enkripsi data pribadi (PII) saat tersimpan (*at rest*), anonimisasi berjenjang untuk pemenuhan hak penghapusan data tanpa merusak pembukuan keuangan perpajakan, manajemen persetujuan cookie (*opt-in*), serta sensor otomatis pada sistem logging.

### Kondisi Pemicu
- Menyimpan data pribadi pengguna (Nama, NIK/KTP, Email, Nomor Telepon, Alamat, Alamat IP).
- Mengimplementasikan banner persetujuan privasi dan pelacak pihak ketiga (Tracking Pixels).
- Menjalankan permintaan penghapusan akun (*Hak untuk Dilupakan* / *Right to be Forgotten*).
- Mencegah kebocoran data sensitif ke layanan monitor eksternal seperti Datadog, Axiom, atau Sentry.

### Skema Database Persetujuan Pengguna (UU PDP Compliant)

```sql
-- Tabel pencatatan riwayat persetujuan (Consent Audit Trail)
CREATE TABLE IF NOT EXISTS user_privacy_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(64) NOT NULL, -- 'MARKETING', 'ANALYTICS', 'TERMS_OF_SERVICE'
  is_granted BOOLEAN NOT NULL DEFAULT FALSE,
  policy_version VARCHAR(16) NOT NULL, -- misal 'v2.1'
  ip_address VARCHAR(45) NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_consents ON user_privacy_consents (user_id, consent_type);
```

### 3 Hukum Utama Kepatuhan Privasi Data
1. **Pemisahan Data Transaksi dan Identitas**: UU Perpajakan mewajibkan penyimpanan bukti transaksi selama bertahun-tahun. Ketika pengguna meminta dihapus, anonimkan data identitas mereka (ganti menjadi anonim), namun pertahankan catatan nominal transaksi.
2. **Opt-in Sebelum Pelacakan**: Skrip pelacak analitik dilarang berjalan sebelum pengguna mengklik tombol "Setuju" secara eksplisit.
3. **Sensor Log Otomatis**: Pastikan pustaka logger (Pino/Winston) menyensor kata kunci sensitif (`password`, `email`, `token`) agar tidak tersimpan sebagai teks biasa pada log server.

## Integrasi Orkestrasi
- **`database-orm-expert`**: Mengatur migrasi skema tabel untuk enkripsi PII dan status anonimisasi.
- **`logging-error-tracking-expert`**: Memastikan tidak ada data pribadi yang bocor ke log error.
- **`authentication-identity-expert`**: Menutup sesi aktif dan mencabut hak akses saat akun dihapus.
- **`saas-billing`**: Menjaga integritas pembukuan pembayaran SaaS sesuai regulasi akuntansi.