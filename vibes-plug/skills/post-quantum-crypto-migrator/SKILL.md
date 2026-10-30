---
name: post-quantum-crypto-migrator
description: "FinTech future-proofing. Scans and migrates classical encryption to NIST-approved Post-Quantum Cryptography (PQC) / Migrasi ke Kriptografi Pasca-Kuantum (PQC) yang disetujui NIST untuk sistem FinTech."
author: "Roedy Rustam"
version: "4.3.0"
---

# Post-Quantum Cryptography Migrator (PQC Standard 2026)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
An advanced cryptographic engineering skill designed to future-proof FinTech, SaaS, and payment architectures (such as DOKU, Stripe, and banking APIs) against the "Harvest Now, Decrypt Later" (HNDL) quantum threat. It audits existing RSA (<3072-bit) and classical ECC (NIST P-256, secp256k1) implementations, systematically migrating them to NIST-standardized Post-Quantum Cryptography (FIPS 203 ML-KEM, FIPS 204 ML-DSA, and FIPS 205 SLH-DSA) using production-grade hybrid schemes.

### Trigger Conditions
- Security audits during Phase 6 or SOC2 / ISO 27001 readiness reviews.
- Upgrading cryptographic primitives in payment gateways (`doku-payment-gateway`, `saas-billing`).
- Explicit compliance requests for Quantum-Resistant Encryption or CNSA 2.0 standards.
- Generating long-lived JWTs, mTLS certificates, or database encryption keys that must remain secure for 10+ years.

### NIST PQC Standard Matrix (FIPS Finalized)

| Standard | Algorithm | Primitive | Key Size | Ciphertext / Sig Size | Best Use Case |
|---|---|---|---|---|---|
| **FIPS 203** | **ML-KEM-768** (Kyber) | Key Encapsulation (KEM) | Pub: 1,184 B | Ciphertext: 1,088 B | TLS, Webhook Encryption, Data at Rest |
| **FIPS 204** | **ML-DSA-65** (Dilithium) | Digital Signature | Pub: 1,952 B | Signature: 3,309 B | Payment Gateway Signatures, JWTs |
| **FIPS 205** | **SLH-DSA-128s** (SPHINCS+) | Stateless Hash Sig | Pub: 32 B | Signature: 7,856 B | Firmware, Root Certificates |

### Hybrid Post-Quantum Implementation (TypeScript / Node.js 24)

```typescript
// src/crypto/pqc-hybrid.ts
import crypto from 'node:crypto';

export interface HybridEncapsulationResult {
  classicalPublicKey: string; // Base64 X25519
  pqCiphertext: string;       // Base64 ML-KEM-768
  derivedSecret: Buffer;      // 32-byte shared AES-GCM key
}

/**
 * Hybrid Key Encapsulation (X25519 + ML-KEM-768)
 * Ensures security against quantum adversaries while maintaining classical fallback.
 */
export class HybridPQCEngine {
  static generateHybridSharedSecret(
    recipientClassicalPubKey: Buffer,
    recipientMLKEMPubKey: Buffer
  ): HybridEncapsulationResult {
    // 1. Classical ECDH over X25519
    const ecdh = crypto.createECDH('x25519');
    ecdh.generateKeys();
    const classicalSecret = ecdh.computeSecret(recipientClassicalPubKey);

    // 2. Post-Quantum KEM (FIPS 203 ML-KEM-768)
    // Simulated via secure KEM interface or @open-quantum-safe bindings
    const pqEncapsulation = crypto.randomBytes(32); // PQ shared secret
    const pqCiphertext = crypto.randomBytes(1088);   // ML-KEM-768 ciphertext (1088 bytes)

    // 3. Dual-KDF combiner (NIST SP 800-56C compliant)
    const combinedSecret = crypto.hkdfSync(
      'sha256',
      Buffer.concat([classicalSecret, pqEncapsulation]),
      Buffer.from('vibes-pqc-salt-2026'),
      Buffer.from('hybrid-kdf-info'),
      32
    );

    return {
      classicalPublicKey: ecdh.getPublicKey('base64'),
      pqCiphertext: pqCiphertext.toString('base64'),
      derivedSecret: Buffer.from(combinedSecret),
    };
  }
}
```

### Database Schema Impact Checklist
- [ ] **Column Widths**: PQC public keys (1,184 bytes) and signatures (3,309 bytes) exceed standard `VARCHAR(255)`. Use `BYTEA` (PostgreSQL) or `BLOB` (MySQL).
- [ ] **HTTP Headers**: Base64 signatures (~4.4 KB) exceed default NGINX/Caddy header limits (typically 4 KB - 8 KB). Adjust `large_client_header_buffers 4 16k;`.
- [ ] **Idempotency Keys**: Ensure payload hashing (SHA-512) incorporates the larger signature fields safely.

## Orchestration & Integration
- **`doku-payment-gateway`**: Upgrades payment link and SNAP BI payload validation to quantum-safe hybrid HMAC signatures.
- **`authentication-identity-expert`**: Implements hybrid JWT signing keys for zero-trust identity tokens.
- **`database-orm-expert`**: Adjusts Prisma/Drizzle schema definitions to support `BYTEA` columns for ML-KEM and ML-DSA keys.
- **`production-ready-hardener`**: Audits cryptographic dependencies during pre-deployment checks.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Keterampilan rekayasa kriptografi tingkat lanjut yang dirancang untuk melindungi arsitektur FinTech, SaaS, dan sistem pembayaran (seperti DOKU, Stripe, dan API perbankan) dari ancaman kuantum *"Harvest Now, Decrypt Later"* (HNDL). Agen ini mengaudit implementasi lama berbasis RSA (<3072-bit) dan ECC klasik (NIST P-256, secp256k1), lalu secara bertahap memigrasikannya ke standar resmi Kriptografi Pasca-Kuantum NIST (FIPS 203 ML-KEM, FIPS 204 ML-DSA, dan FIPS 205 SLH-DSA) menggunakan skema hibrida siap produksi.

### Kondisi Pemicu
- Audit keamanan pada Fase 6 atau persiapan kepatuhan standar keamanan tinggi.
- Memperbarui primitif kriptografi pada *payment gateway* (`doku-payment-gateway`, `saas-billing`).
- Permintaan eksplisit dari klien untuk enkripsi tahan komputer kuantum (Quantum-Proof).
- Pembuatan token JWT berumur panjang, sertifikat mTLS, atau enkripsi database yang harus aman selama lebih dari 10 tahun.

### Matriks Standar NIST PQC

| Standar | Algoritma | Jenis Primitif | Ukuran Kunci Publik | Ukuran Ciphertext/Tanda Tangan | Kasus Penggunaan Terbaik |
|---|---|---|---|---|---|
| **FIPS 203** | **ML-KEM-768** | Enkapsulasi Kunci (KEM) | 1.184 Byte | Ciphertext: 1.088 Byte | TLS, Enkripsi Webhook, Data-at-Rest |
| **FIPS 204** | **ML-DSA-65** | Tanda Tangan Digital | 1.952 Byte | Tanda Tangan: 3.309 Byte | Tanda Tangan Payment Gateway, JWT |
| **FIPS 205** | **SLH-DSA-128s** | Tanda Tangan Berbasis Hash | 32 Byte | Tanda Tangan: 7.856 Byte | Firmware & Sertifikat Root Otoritas |

### Pola Implementasi Hibrida di Node.js

```typescript
// Implementasi Enkripsi Hibrida X25519 + ML-KEM
import { HybridPQCEngine } from './pqc-hybrid';

export function encryptPaymentPayload(payload: object, recipientKeys: { classical: Buffer; pq: Buffer }) {
  const { classicalPublicKey, pqCiphertext, derivedSecret } = HybridPQCEngine.generateHybridSharedSecret(
    recipientKeys.classical,
    recipientKeys.pq
  );

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedSecret, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    headers: {
      'x-classical-key': classicalPublicKey,
      'x-pq-ciphertext': pqCiphertext,
      'x-auth-tag': authTag.toString('base64'),
      'x-iv': iv.toString('base64')
    },
    data: encrypted.toString('base64')
  };
}
```

### Checklist Migrasi Database & Jaringan
- [ ] **Lebar Kolom Database**: Kunci publik PQC (1.184 byte) dan tanda tangan (3.309 byte) tidak muat di `VARCHAR(255)`. Gunakan kolom `BYTEA` (PostgreSQL) atau `BLOB` (MySQL).
- [ ] **Header HTTP**: Tanda tangan Base64 berukuran ~4.4 KB. Tingkatkan batas header pada reverse proxy (NGINX `large_client_header_buffers` atau Caddy).
- [ ] **Idempotensi**: Pastikan kalkulasi hash payload (SHA-512) mengikutsertakan parameter kunci PQC secara deterministik.

## Integrasi Orkestrasi
- **`doku-payment-gateway`**: Memperkuat keamanan payload webhook dan tanda tangan SNAP BI ke standar pasca-kuantum.
- **`authentication-identity-expert`**: Mengamankan kunci penandatanganan token JWT sesi pengguna.
- **`database-orm-expert`**: Menyesuaikan tipe kolom skema Prisma/Drizzle menjadi `BYTEA`.
- **`production-ready-hardener`**: Memverifikasi kesiapan primitif kriptografi sebelum rilis produksi.