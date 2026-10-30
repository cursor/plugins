---
name: async-queue-temporal-expert
description: "Unified expert guide for async job queues & durable workflows: BullMQ v5 (Redis queues), Trigger.dev v3 (serverless tasks), Inngest, and Temporal.io (distributed sagas) / Panduan ahli terpadu untuk antrean job asinkron & workflow tahan-gagal: BullMQ v5, Trigger.dev v3, Inngest, dan Temporal.io."
author: "Roedy Rustam"
version: "4.3.0"
---

# Async Queue & Durable Workflow Expert (2026 Unified Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Purpose & Overview
Unified production-grade guide for background execution pipelines, async job queues, and distributed state machines. Covers the full spectrum from simple Redis-backed task queues to complex multi-service sagas with compensating rollbacks.

### 3-Tier Execution Model
| Tier | Engine | Best For |
|------|--------|----------|
| **Tier 1: Redis Task Queues** | BullMQ v5 | High-throughput worker jobs, priority queues, rate limiting, DLQ |
| **Tier 2: Serverless Durable Tasks** | Trigger.dev v3 / Inngest | Step-checkpointed tasks, automatic resume across crashes, zero infra |
| **Tier 3: Distributed Sagas** | Temporal.io | Multi-service orchestration, compensating rollbacks, long-running workflows |

### Core Capabilities
1. **Idempotency & Deduplication**: Deterministic `jobId` keys prevent double billing or duplicate emails.
2. **Dead Letter Queues (DLQ)**: Auto-relocate permanently failing jobs for audit and alerting.
3. **Exponential Backoff with Jitter**: Prevents thundering herds on upstream services.
4. **Tenant Priority Queues**: VIP/enterprise tiers get lower BullMQ priority numbers (higher throughput).
5. **Durable State Machines**: Workflows survive restarts, deployments, and network partitions.
6. **Saga Compensations**: Multi-step transactions with automated reverse-order rollbacks.

---

### Tier 1: BullMQ v5 — Redis Task Queues (TypeScript)

```typescript
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

const redisConnection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

export interface NotificationPayload {
  tenantId: string;
  userId: string;
  type: 'email' | 'webhook';
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

// Main Queue
export const notificationQueue = new Queue<NotificationPayload>('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1500 },
    removeOnComplete: { age: 86400, count: 5000 },
    removeOnFail: false, // Preserved for DLQ audit
  },
});

// Dead Letter Queue
export const notificationDLQ = new Queue('notifications-dlq', {
  connection: redisConnection,
});

// Enqueue with deduplication & priority
export async function enqueueNotification(data: NotificationPayload, isVip = false) {
  return await notificationQueue.add('send_notification', data, {
    jobId: `notif_${data.idempotencyKey}`, // Deterministic dedup key
    priority: isVip ? 1 : 10,
  });
}

// Worker with concurrency & rate limiting
export const notificationWorker = new Worker<NotificationPayload>(
  'notifications',
  async (job: Job<NotificationPayload>) => {
    if (job.data.type === 'email') await deliverEmail(job.data);
  },
  {
    connection: redisConnection,
    concurrency: 20,
    limiter: { max: 100, duration: 1000 },
  }
);

// DLQ forwarding on retry exhaustion
notificationWorker.on('failed', async (job, error) => {
  if (job && job.attemptsMade >= (job.opts.attempts || 5)) {
    await notificationDLQ.add('failed_notification', {
      originalJobId: job.id, failedReason: error.message,
      data: job.data, exhaustedAt: new Date().toISOString(),
    });
  }
});
```

---

### Tier 2: Trigger.dev v3 — Serverless Durable Tasks

```typescript
import { task } from '@trigger.dev/sdk/v3';

export const generateReport = task({
  id: 'generate-enterprise-report',
  retry: { maxAttempts: 4, minTimeoutInMs: 2000, factor: 2, randomize: true },
  run: async (payload: { tenantId: string; month: string }, { ctx }) => {
    // Each step is a durable checkpoint — survives crashes
    const data = await ctx.run('fetch-telemetry', async () => {
      return await fetchTelemetryFromWarehouse(payload.tenantId, payload.month);
    });
    const pdfUrl = await ctx.run('render-pdf', async () => {
      return await generateReportPdf(data);
    });
    await ctx.run('dispatch-webhook', async () => {
      return await sendWebhookNotification(payload.tenantId, pdfUrl);
    });
    return { success: true, pdfUrl };
  },
});
```

---

### Tier 3: Temporal.io — Distributed Saga with Compensations

```typescript
import { proxyActivities, ApplicationFailure } from '@temporalio/workflow';
import type * as activities from './activities';

const { chargeCustomer, provisionLicense, sendWelcomeEmail, refundCustomer, revokeLicense } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '1 minute',
    retry: {
      initialInterval: '1s', backoffCoefficient: 2, maximumAttempts: 5,
      nonRetryableErrorTypes: ['InvalidCardError', 'AccountSuspendedError'],
    },
  });

export async function subscriptionSagaWorkflow(input: {
  customerId: string; planId: string; amountCents: number;
}) {
  const compensations: Array<() => Promise<void>> = [];
  try {
    const charge = await chargeCustomer(input.customerId, input.amountCents);
    compensations.unshift(() => refundCustomer(charge.chargeId));

    const license = await provisionLicense(input.customerId, input.planId);
    compensations.unshift(() => revokeLicense(license.licenseId));

    await sendWelcomeEmail(input.customerId, license.licenseKey);
    return { status: 'COMPLETED' };
  } catch (error) {
    for (const compensate of compensations) {
      try { await compensate(); } catch (e) { console.error('Compensation failed:', e); }
    }
    throw ApplicationFailure.create({
      message: `Saga rolled back: ${(error as Error).message}`, nonRetryable: true,
    });
  }
}
```

> **Temporal Determinism Rule**: Never use `Math.random()`, `Date.now()`, or direct DB calls inside workflow files. Run them inside activities.

---

### Implementation Checklist
- [ ] Configure `maxRetriesPerRequest: null` on ioredis for BullMQ v5.
- [ ] Use deterministic `jobId` from business logic (`order_${orderId}`) for deduplication.
- [ ] Forward permanently dead jobs to DLQ via `worker.on('failed')` listener.
- [ ] Implement rate limiting via worker `limiter` to protect third-party APIs.
- [ ] Enforce deterministic code inside Temporal workflows (activities for side-effects).
- [ ] Store large payloads in S3/R2; pass only IDs through queues.
- [ ] Implement Saga rollback handlers for multi-step distributed payments.

## Orchestration & Integration
- Integrates with: `js-backend-expert`, `cron-scheduler-expert`, `error-resilience-expert`, `saas-billing`, `doku-payment-gateway`, `data-telemetry-expert`.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Tujuan & Gambaran Umum
Panduan terpadu tingkat produksi untuk pipeline eksekusi latar belakang, antrean job asinkron, dan state machine terdistribusi. Mencakup spektrum penuh dari antrean Redis sederhana hingga saga multi-layanan dengan rollback kompensasi.

### Model Eksekusi 3-Tier
| Tier | Engine | Cocok Untuk |
|------|--------|-------------|
| **Tier 1: Antrean Redis** | BullMQ v5 | Job worker throughput tinggi, antrean prioritas, rate limiting, DLQ |
| **Tier 2: Task Serverless** | Trigger.dev v3 / Inngest | Task dengan checkpoint, resume otomatis, tanpa perlu mengelola infra server |
| **Tier 3: Saga Terdistribusi** | Temporal.io | Orkestrasi multi-layanan, rollback kompensasi, workflow berdurasi panjang |

### Kemampuan Utama
1. **Idempotensi & Deduplikasi**: Kunci `jobId` deterministik mencegah duplikasi penagihan atau email ganda.
2. **Dead Letter Queue (DLQ)**: Pemindahan otomatis job yang gagal berulang kali untuk proses audit dan peringatan darurat.
3. **Backoff Eksponensial + Jitter**: Mencegah beban serentak (*thundering herd*) pada server hilir atau API pihak ketiga.
4. **Prioritas Tenant**: Pengguna VIP/enterprise dialokasikan prioritas lebih tinggi (`priority: 1` di BullMQ).
5. **State Machine Tahan-Gagal**: Alur kerja tetap berlanjut meskipun server restart, deploy ulang, atau terjadi gangguan jaringan.
6. **Kompensasi Saga**: Transaksi bertahap dengan pembatalan otomatis secara berurutan terbalik jika salah satu langkah gagal.

---

### Implementasi Pola Kunci (TypeScript)

#### 1. Tier 1: Antrean BullMQ v5 Berbasis Redis & DLQ
```typescript
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

const koneksiRedis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // Wajib untuk BullMQ v5
});

export interface NotifikasiPayload {
  tenantId: string;
  userId: string;
  jenis: 'email' | 'webhook';
  konten: Record<string, unknown>;
  kunciIdempotensi: string;
}

export const antreanNotifikasi = new Queue<NotifikasiPayload>('notifikasi', {
  connection: koneksiRedis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 1500 },
    removeOnComplete: { age: 86400, count: 5000 },
    removeOnFail: false, // Pertahankan untuk audit DLQ
  },
});

export const antreanDLQ = new Queue('notifikasi-dlq', { connection: koneksiRedis });

// Masukkan job dengan deduplikasi deterministik
export async function jadwalkanNotifikasi(data: NotifikasiPayload, isVip = false) {
  return await antreanNotifikasi.add('kirim_notifikasi', data, {
    jobId: `notif_${data.kunciIdempotensi}`,
    priority: isVip ? 1 : 10,
  });
}

// Worker dengan konkurensi dan pembatas laju
export const workerNotifikasi = new Worker<NotifikasiPayload>(
  'notifikasi',
  async (job: Job<NotifikasiPayload>) => {
    if (job.data.jenis === 'email') await kirimEmail(job.data);
  },
  {
    connection: koneksiRedis,
    concurrency: 20,
    limiter: { max: 100, duration: 1000 },
  }
);

// Teruskan ke DLQ setelah batas retry habis
workerNotifikasi.on('failed', async (job, error) => {
  if (job && job.attemptsMade >= (job.opts.attempts || 5)) {
    await antreanDLQ.add('notifikasi_gagal_permanen', {
      originalJobId: job.id,
      alasanGagal: error.message,
      data: job.data,
      waktuGagal: new Date().toISOString(),
    });
  }
});
```

#### 2. Tier 2: Trigger.dev v3 Serverless Durable Tasks
```typescript
import { task } from '@trigger.dev/sdk/v3';

export const tugasLaporanBulanan = task({
  id: 'generate-laporan-bulanan',
  retry: { maxAttempts: 4, minTimeoutInMs: 2000, factor: 2, randomize: true },
  run: async (payload: { tenantId: string; bulan: string }, { ctx }) => {
    const data = await ctx.run('ambil-telemetri', async () => {
      return await ambilDataGudang(payload.tenantId, payload.bulan);
    });
    const urlPdf = await ctx.run('render-pdf', async () => {
      return await renderDokumenPdf(data);
    });
    await ctx.run('kirim-webhook', async () => {
      return await kirimWebhookNotifikasi(payload.tenantId, urlPdf);
    });
    return { status: 'sukses', urlPdf };
  },
});
```

#### 3. Tier 3: Temporal.io Distributed Saga & Kompensasi Rollback
```typescript
import { proxyActivities, ApplicationFailure } from '@temporalio/workflow';
import type * as activities from './activities';

const { debitRekening, alokasikanLisensi, kirimEmailSelamatDatang, kembalikanDana, batalkanLisensi } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '1 minute',
    retry: { initialInterval: '1s', backoffCoefficient: 2, maximumAttempts: 5 },
  });

export async function sagaLanggananWorkflow(input: {
  pelangganId: string; paketId: string; totalBayar: number;
}) {
  const daftarKompensasi: Array<() => Promise<void>> = [];
  try {
    const transaksi = await debitRekening(input.pelangganId, input.totalBayar);
    daftarKompensasi.unshift(() => kembalikanDana(transaksi.transaksiId));

    const lisensi = await alokasikanLisensi(input.pelangganId, input.paketId);
    daftarKompensasi.unshift(() => batalkanLisensi(lisensi.lisensiId));

    await kirimEmailSelamatDatang(input.pelangganId, lisensi.kodeLisensi);
    return { status: 'SELESAI' };
  } catch (error) {
    // Eksekusi kompensasi rollback dalam urutan terbalik
    for (const kompensasi of daftarKompensasi) {
      try { await kompensasi(); } catch (e) { console.error('Kompensasi gagal:', e); }
    }
    throw ApplicationFailure.create({
      message: `Saga berhasil di-rollback: ${(error as Error).message}`, nonRetryable: true,
    });
  }
}
```

### Integrasi Orkestrasi
- Terintegrasi dengan: `js-backend-expert`, `cron-scheduler-expert`, `error-resilience-expert`, `saas-billing`, `doku-payment-gateway`, `data-telemetry-expert`.