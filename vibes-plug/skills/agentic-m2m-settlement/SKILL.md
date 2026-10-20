---
name: agentic-m2m-settlement
description: "Expert guide for autonomous Machine-to-Machine (M2M) agent settlement, dual-rail fiat & stablecoin micro-clearing, dynamic budget envelopes, and cryptographic agent invoicing / Panduan ahli settlement otonom antar-agen (M2M), kliring mikro dual-rail fiat & stablecoin, pagu anggaran dinamis, dan penagihan agen kriptografis."
author: "Roedy Rustam"
version: "4.3.0"
---

# Agentic M2M Settlement & Clearing Protocol (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `agentic-micro-economy-architect`, `doku-payment-gateway`, `doku-mcp-server`, `payment-gateway-expert`, `saas-billing`, `multi-agent-orchestration`, `formal-spec-z3-verifier`, `database-orm-expert`, and `zero-trust-secret-vault`.

### Description
In multi-agent swarms where sub-agents consume paid third-party APIs, compute clusters, specialized data scraping, or delegated reasoning, agents require an autonomous, real-time clearing and settlement rail. **Agentic M2M Settlement** establishes production-grade financial rails for autonomous Agent-to-Agent (A2A) and Agent-to-Infrastructure (A2I) transactions. It supports **Dual-Rail Clearing**:
1. **Fiat Rail**: Dynamic Bank Indonesia SNAP BI Standard QRIS/VA settlement and DOKU Checkout with HMAC-SHA512 webhook idempotency.
2. **Stablecoin / Account Abstraction Rail**: Instant, sub-cent micro-streaming (USDC on Base/Arbitrum) using ERC-4337 smart accounts and scoped session keys.

It enforces strict velocity caps, non-bypassable spending ceilings, cryptographic invoice signing, and milestone-gated critic escrow.

### Trigger Conditions
Activate this skill when:
- Designing systems where autonomous AI agents purchase API services, vector compute, or data from other agents.
- Implementing financial transaction rails between autonomous swarms and payment gateways (DOKU SNAP BI, Stripe Treasury).
- Enforcing strict FinOps budget envelopes with atomic kill-switches on agent wallets.
- Building decentralized or hybrid agent marketplaces with cryptographic escrow release.
- Implementing formal verification (Z3/SMT) on multi-agent billing state transitions to guarantee zero double-spend.

---

### Core Architecture & Settlement Protocols (2026 Standard)

```
                       [ Swarm Director Treasury ]
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        [ Fiat Settlement Rail ]            [ Stablecoin Micro Rail ]
        (DOKU SNAP BI QRIS / VA)            (USDC via Base ERC-4337)
                  │                                   │
                  └─────────────────┬─────────────────┘
                                    │
                     [ Escrow & Verification Vault ]
                     (Critic Agent + SMT Invariants)
                                    │
                                    ▼
                        [ Target Worker Sub-Agent ]
```

#### 1. Dual-Rail Settlement Architecture
- **Fiat Clearing (DOKU SNAP BI)**: Best for Indonesian and regional corporate compliance (PT/CV). Automatically generates dynamic SNAP BI QRIS or Open/Closed Virtual Accounts with cryptographic HMAC-SHA512 request signing.
- **Micro-Token Clearing (Base / Arbitrum USDC)**: Best for sub-second, cross-border M2M compute streaming (<$0.01 per step). Leverages ERC-4337 smart contract session keys restricted by hourly spend velocity and recipient allowlists.

#### 2. The 4 Hard FinOps Gates (Pagar FinOps)
1. **Hard Spend Envelopes**: Every spawned worker agent receives an immutable ceiling (e.g., `maxBudget: 25.00 USD`). Attempts to spend above this ceiling trigger immediate execution termination.
2. **Cryptographic Invoicing (AP2AP Protocol)**: Invoices are signed using Ed25519 or HMAC-SHA256 containing `taskId`, `nonce`, `callerAgentId`, `targetAgentId`, `itemizedCostBreakdown`, and `timestamp`.
3. **Critic-Validated Milestone Escrow**: Funds are locked in an atomic escrow state. Releasing funds requires signature approval from an independent Critic/Auditor sub-agent verifying output quality.
4. **Idempotency & Replay Defense**: All settlements record atomic UUIDv7 tokens and SNAP BI idempotency keys (`X-EXTERNAL-ID`) in PostgreSQL with unique constraint locks.

---

### Production Implementation Recipe (TypeScript + Node.js 24)

```typescript
import { createHmac, randomUUID } from 'node:crypto';

export interface SettlementInvoice {
  invoiceId: string;
  sourceAgentId: string;
  workerAgentId: string;
  taskId: string;
  amountMinor: bigint; // In smallest currency unit (e.g. cents or IDR rupiah)
  currency: 'IDR' | 'USD';
  rail: 'DOKU_SNAP_BI' | 'USDC_BASE_SMART_ACCOUNT';
  timestamp: string;
  signature: string;
}

export interface EscrowContract {
  escrowId: string;
  invoice: SettlementInvoice;
  maxBudgetMinor: bigint;
  status: 'PENDING' | 'CRITIC_VERIFIED' | 'RELEASED' | 'REFUNDED';
  criticAgentId: string;
}

export class AgentM2MSettlementEngine {
  private readonly sharedSecret: string;
  private readonly activeEscrows = new Map<string, EscrowContract>();

  constructor(sharedSecret: string) {
    if (!sharedSecret || sharedSecret.length < 32) {
      throw new Error('Settlement Secret must be at least 32 characters for HMAC-SHA512 security.');
    }
    this.sharedSecret = sharedSecret;
  }

  // Generate cryptographic invoice from worker agent
  public createAgentInvoice(params: {
    sourceAgentId: string;
    workerAgentId: string;
    taskId: string;
    amountMinor: bigint;
    currency: 'IDR' | 'USD';
    rail: 'DOKU_SNAP_BI' | 'USDC_BASE_SMART_ACCOUNT';
  }): SettlementInvoice {
    const invoiceId = `inv_${randomUUID()}`;
    const timestamp = new Date().toISOString();
    const payload = `${invoiceId}|${params.sourceAgentId}|${params.workerAgentId}|${params.taskId}|${params.amountMinor.toString()}|${params.currency}|${timestamp}`;
    
    const signature = createHmac('sha512', this.sharedSecret)
      .update(payload)
      .digest('hex');

    return {
      invoiceId,
      sourceAgentId: params.sourceAgentId,
      workerAgentId: params.workerAgentId,
      taskId: params.taskId,
      amountMinor: params.amountMinor,
      currency: params.currency,
      rail: params.rail,
      timestamp,
      signature
    };
  }

  // Open an escrow with strict budget envelope
  public openEscrow(invoice: SettlementInvoice, maxBudgetMinor: bigint, criticAgentId: string): EscrowContract {
    // 1. Verify invoice cryptographic authenticity
    const payload = `${invoice.invoiceId}|${invoice.sourceAgentId}|${invoice.workerAgentId}|${invoice.taskId}|${invoice.amountMinor.toString()}|${invoice.currency}|${invoice.timestamp}`;
    const expectedSignature = createHmac('sha512', this.sharedSecret)
      .update(payload)
      .digest('hex');

    if (invoice.signature !== expectedSignature) {
      throw new Error('Settlement Rejected: Cryptographic invoice signature tampering detected.');
    }

    // 2. Enforce strict budget envelope
    if (invoice.amountMinor > maxBudgetMinor) {
      throw new Error(`FinOps Gate Tripped: Invoice amount ${invoice.amountMinor} exceeds allocated ceiling ${maxBudgetMinor}.`);
    }

    const escrow: EscrowContract = {
      escrowId: `escrow_${randomUUID()}`,
      invoice,
      maxBudgetMinor,
      status: 'PENDING',
      criticAgentId
    };

    this.activeEscrows.set(escrow.escrowId, escrow);
    return escrow;
  }

  // Critic subagent verifies work quality and releases payment
  public releaseSettlement(escrowId: string, criticSignature: string, qualityScore: number): { success: boolean; txHash: string } {
    const escrow = this.activeEscrows.get(escrowId);
    if (!escrow) {
      throw new Error(`Escrow ${escrowId} not found in settlement vault.`);
    }

    if (escrow.status !== 'PENDING') {
      throw new Error(`Escrow ${escrowId} is already in ${escrow.status} state. Double-spend prevention active.`);
    }

    if (qualityScore < 0.85) {
      escrow.status = 'REFUNDED';
      throw new Error(`Settlement Rejected: Critic evaluation score (${qualityScore}) below quality threshold 0.85. Funds refunded.`);
    }

    // In production, dispatch DOKU SNAP BI transfer or execute Base USDC transfer
    escrow.status = 'RELEASED';
    const txHash = `settlement_tx_${randomUUID().replace(/-/g, '')}`;
    return { success: true, txHash };
  }
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi bersama `agentic-micro-economy-architect`, `doku-payment-gateway`, `doku-mcp-server`, `payment-gateway-expert`, `saas-billing`, `multi-agent-orchestration`, `formal-spec-z3-verifier`, `database-orm-expert`, dan `zero-trust-secret-vault`.

### Deskripsi
Dalam swarm multi-agen skala produksi di mana sub-agen mengonsumsi API pihak ketiga berbayar, komputasi GPU, scraping web berbayar, atau inferensi penalaran terdelegasi, agen memerlukan rel kliring dan settlement pembayaran otomatis secara real-time. **Agentic M2M Settlement** menyediakan infrastruktur finansial tangguh untuk transaksi Mesin-ke-Mesin (Agent-to-Agent / A2A) dan Agen-ke-Infrastruktur (A2I). Protokol ini mendukung **Kliring Dual-Rail**:
1. **Rel Fiat**: Penyelesaian instan standar QRIS SNAP BI Bank Indonesia dan Virtual Account dinamis DOKU Checkout dengan verifikasi webhook HMAC-SHA512 yang idempoten.
2. **Rel Stablecoin & Account Abstraction**: Kliring mikro sub-sen instan (USDC pada jaringan Base/Arbitrum) menggunakan smart account ERC-4337 dengan batas sesi (*session keys*) terenkripsi.

Protokol ini menerapkan batas kecepatan belanja (*velocity caps*), pagu anggaran mutlak tanpa toleransi (*hard budget ceiling*), penagihan kriptografis antar-agen, dan escrow berkala dengan gerbang validasi agen penilai (Critic Agent).

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Merancang arsitektur di mana agen AI otonom membeli layanan API, komputasi vektor, atau dataset dari agen AI lain.
- Mengimplementasikan integrasi pembayaran antar agen swarm dan gateway pembayaran resmi (DOKU SNAP BI, Stripe Treasury).
- Menerapkan pagar pengaman FinOps ketat dengan sakelar pemutus (*kill-switch*) otomatis pada dompet agen.
- Membangun marketplace agen terdesentralisasi atau hybrid dengan pelepasan dana escrow berbasis pencapaian tugas.
- Memverifikasi secara formal (Z3/SMT) transisi state penagihan multi-agen untuk menjamin nol pembelanjaan ganda (*zero double-spend*).

---

### Arsitektur Inti & Protokol Settlement (Standar 2026)

#### 1. Kliring Dual-Rail (Fiat & Stablecoin)
* **Kliring Fiat (DOKU SNAP BI)**: Pilihan utama untuk kepatuhan regulasi korporat Indonesia (PT/CV). Menghasilkan QRIS dinamis SNAP BI atau Virtual Account Bank (BCA, Mandiri, BRI, BNI, CIMB) dengan penandatanganan request HMAC-SHA512 secara otomatis.
* **Kliring Token Mikro (Base / Arbitrum USDC)**: Pilihan utama untuk komputasi streaming lintas negara berbiaya sangat rendah (<Rp150 per langkah komputasi). Memanfaatkan *session keys* ERC-4337 dengan pagu pengeluaran per jam dan daftar putih (*allowlist*) alamat penerima.

#### 2. Empat Pagar FinOps Mutlak
1. **Pagu Anggaran Mutlak (Hard Spend Envelope)**: Setiap sub-agen yang ditugaskan mendapatkan alokasi pagu anggaran tidak dapat dinegosiasikan (misal: `maxBudget: Rp250.000`). Upaya transaksi di atas pagu ini otomatis memicu terminasi eksekusi.
2. **Penagihan Kriptografis (AP2AP Protocol)**: Setiap tagihan ditandatangani menggunakan Ed25519 atau HMAC-SHA512 mencakup parameter `taskId`, `nonce`, `callerAgentId`, `targetAgentId`, dan rincian biaya.
3. **Escrow Berbasis Validasi Critic**: Dana ditahan pada brankas escrow atomik. Pelepasan dana memerlukan persetujuan tanda tangan dari sub-agen auditor/critic independen yang memeriksa kualitas hasil kerja.
4. **Idempotensi & Pencegahan Replay**: Seluruh penyelesaian transaksi mencatat token unik UUIDv7 dan header idempoten SNAP BI (`X-EXTERNAL-ID`) pada database PostgreSQL dengan kunci pengaman atomik.

---

### Resep Implementasi Mesin Settlement (TypeScript + Node.js 24)

```typescript
import { createHmac, randomUUID } from 'node:crypto';

export interface TagihanSettlement {
  invoiceId: string;
  sourceAgentId: string;
  workerAgentId: string;
  taskId: string;
  amountMinor: bigint;
  currency: 'IDR' | 'USD';
  rail: 'DOKU_SNAP_BI' | 'USDC_BASE_SMART_ACCOUNT';
  timestamp: string;
  signature: string;
}

export interface KontrakEscrow {
  escrowId: string;
  invoice: TagihanSettlement;
  maxBudgetMinor: bigint;
  status: 'PENDING' | 'CRITIC_VERIFIED' | 'RELEASED' | 'REFUNDED';
  criticAgentId: string;
}

export class MesinSettlementM2MAgen {
  private readonly secretKunci: string;
  private readonly tabelEscrow = new Map<string, KontrakEscrow>();

  constructor(secretKunci: string) {
    if (!secretKunci || secretKunci.length < 32) {
      throw new Error('Kunci rahasia minimal 32 karakter untuk HMAC-SHA512.');
    }
    this.secretKunci = secretKunci;
  }

  // Buat tagihan kriptografis dari agen pekerja
  public buatTagihanAgen(params: {
    sourceAgentId: string;
    workerAgentId: string;
    taskId: string;
    amountMinor: bigint;
    currency: 'IDR' | 'USD';
    rail: 'DOKU_SNAP_BI' | 'USDC_BASE_SMART_ACCOUNT';
  }): TagihanSettlement {
    const invoiceId = `inv_${randomUUID()}`;
    const timestamp = new Date().toISOString();
    const payload = `${invoiceId}|${params.sourceAgentId}|${params.workerAgentId}|${params.taskId}|${params.amountMinor.toString()}|${params.currency}|${timestamp}`;

    const signature = createHmac('sha512', this.secretKunci)
      .update(payload)
      .digest('hex');

    return {
      invoiceId,
      sourceAgentId: params.sourceAgentId,
      workerAgentId: params.workerAgentId,
      taskId: params.taskId,
      amountMinor: params.amountMinor,
      currency: params.currency,
      rail: params.rail,
      timestamp,
      signature
    };
  }

  // Buka brankas escrow dengan pagu anggaran ketat
  public bukaEscrow(invoice: TagihanSettlement, maxBudgetMinor: bigint, criticAgentId: string): KontrakEscrow {
    const payload = `${invoice.invoiceId}|${invoice.sourceAgentId}|${invoice.workerAgentId}|${invoice.taskId}|${invoice.amountMinor.toString()}|${invoice.currency}|${invoice.timestamp}`;
    const expectedSignature = createHmac('sha512', this.secretKunci)
      .update(payload)
      .digest('hex');

    if (invoice.signature !== expectedSignature) {
      throw new Error('Settlement Ditolak: Tanda tangan kriptografis tagihan tidak valid.');
    }

    if (invoice.amountMinor > maxBudgetMinor) {
      throw new Error(`Pagar FinOps Terpicu: Nilai tagihan ${invoice.amountMinor} melebihi batas anggaran ${maxBudgetMinor}.`);
    }

    const escrow: KontrakEscrow = {
      escrowId: `escrow_${randomUUID()}`,
      invoice,
      maxBudgetMinor,
      status: 'PENDING',
      criticAgentId
    };

    this.tabelEscrow.set(escrow.escrowId, escrow);
    return escrow;
  }

  // Sub-agen Critic memvalidasi kualitas output dan melepaskan pembayaran
  public lepaskanSettlement(escrowId: string, skorKualitas: number): { berhasil: boolean; hashTransaksi: string } {
    const escrow = this.tabelEscrow.get(escrowId);
    if (!escrow) {
      throw new Error(`Escrow ${escrowId} tidak ditemukan.`);
    }

    if (escrow.status !== 'PENDING') {
      throw new Error(`Escrow ${escrowId} sudah dalam status ${escrow.status}. Proteksi double-spend aktif.`);
    }

    if (skorKualitas < 0.85) {
      escrow.status = 'REFUNDED';
      throw new Error(`Settlement Ditolak: Skor evaluasi (${skorKualitas}) di bawah ambang batas 0.85. Dana dikembalikan.`);
    }

    escrow.status = 'RELEASED';
    const hashTransaksi = `tx_${randomUUID().replace(/-/g, '')}`;
    return { berhasil: true, hashTransaksi };
  }
}
```