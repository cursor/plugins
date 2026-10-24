---
name: cron-scheduler-expert
description: "Expert guide for scheduled tasks, cron jobs, recurring background work (Vercel Cron, Cloudflare Workers Cron, Inngest, node-cron), and distributed scheduling / Panduan ahli untuk tugas terjadwal, cron job, pekerjaan latar belakang berulang, dan penjadwalan terdistribusi."
author: "Roedy Rustam"
version: "4.3.0"
---

# Cron & Scheduler Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Production-grade guide for implementing scheduled tasks, cron jobs, and recurring background work in modern web applications. Covers **Vercel Cron Jobs**, **Cloudflare Workers Cron Triggers**, **Inngest scheduled functions**, **node-cron**, **BullMQ repeatable jobs**, **distributed cron locking** (Redis-based), **timezone-aware scheduling**, and common use cases (cleanup jobs, report generation, health checks, subscription renewals).

### Trigger Conditions
Activate this skill when:
- Setting up scheduled/recurring tasks (daily reports, cleanup, health checks).
- Configuring Vercel Cron Jobs or Cloudflare Workers Cron Triggers.
- Implementing subscription renewal checks or billing cycle jobs.
- Building data aggregation or ETL pipelines on a schedule.
- Needing distributed cron locking to prevent duplicate execution.
- Scheduling email digests or notification batches.

---

### Platform Selection Guide

| Platform | Best For | Max Frequency | Invocation Model |
|---|---|---|---|
| **Vercel Cron** | Vercel-hosted Next.js apps | 1/min (Pro), 1/day (Hobby) | HTTP endpoint trigger |
| **Cloudflare Workers Cron** | Edge-first apps | 1/min | Worker script trigger |
| **Inngest** | Complex workflows, fan-out | Any (event-driven) | Serverless function |
| **BullMQ Repeatable** | Self-hosted, Redis-backed | Any | Worker process |
| **node-cron** | Simple Node.js servers | Any | In-process |
| **Trigger.dev v3** | Durable scheduled tasks | Any | Serverless function |

**Recommendation**: Use **Vercel Cron** for Next.js apps on Vercel. Use **Inngest** for complex multi-step scheduled workflows. Use **BullMQ repeatable jobs** for self-hosted environments.

---

### 1. Vercel Cron Jobs

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-cleanup",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/hourly-health-check",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/weekly-report",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

```typescript
// app/api/cron/daily-cleanup/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (not public)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Cleanup expired sessions
    const deletedSessions = await db.delete(sessions)
      .where(lt(sessions.expiresAt, new Date()));

    // Cleanup orphaned uploads (older than 24h, not linked to any record)
    const deletedUploads = await db.delete(uploads)
      .where(and(
        isNull(uploads.linkedRecordId),
        lt(uploads.createdAt, new Date(Date.now() - 86400000)),
      ));

    return NextResponse.json({
      ok: true,
      cleaned: { sessions: deletedSessions.rowCount, uploads: deletedUploads.rowCount },
    });
  } catch (error) {
    console.error('Daily cleanup failed:', error);
    return NextResponse.json({ ok: false, error: 'Cleanup failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60s for cleanup
```

---

### 2. Inngest Scheduled Functions

```typescript
// inngest/functions/weekly-report.ts
import { inngest } from '@/lib/inngest';

export const weeklyReportJob = inngest.createFunction(
  {
    id: 'weekly-usage-report',
    name: 'Generate Weekly Usage Report',
  },
  { cron: 'TZ=Asia/Jakarta 0 9 * * 1' }, // Every Monday 9 AM WIB
  async ({ step }) => {
    // Step 1: Gather data
    const metrics = await step.run('gather-metrics', async () => {
      return await db.query.usageMetrics.findMany({
        where: gte(usageMetrics.createdAt, subDays(new Date(), 7)),
      });
    });

    // Step 2: Generate report
    const report = await step.run('generate-report', async () => {
      return generateWeeklyReport(metrics);
    });

    // Step 3: Send to admins
    await step.run('send-report', async () => {
      const admins = await db.query.users.findMany({
        where: eq(users.role, 'admin'),
      });
      for (const admin of admins) {
        await emailQueue.add('weekly-report', { to: admin.email, report });
      }
    });

    return { sent: true, reportId: report.id };
  },
);
```

---

### 3. BullMQ Repeatable Jobs

```typescript
// queues/scheduled-jobs.ts
import { Queue, Worker } from 'bullmq';

const scheduledQueue = new Queue('scheduled', {
  connection: { host: process.env.REDIS_HOST },
});

// Add repeatable jobs on startup
export async function registerScheduledJobs() {
  // Daily cleanup at 3 AM
  await scheduledQueue.add('daily-cleanup', {}, {
    repeat: { pattern: '0 3 * * *', tz: 'Asia/Jakarta' },
    jobId: 'daily-cleanup', // Prevent duplicates on restart
  });

  // Every 5 minutes: health check
  await scheduledQueue.add('health-check', {}, {
    repeat: { every: 5 * 60 * 1000 }, // 5 minutes in ms
    jobId: 'health-check',
  });

  // Monthly: subscription renewal check (1st of each month at midnight)
  await scheduledQueue.add('subscription-renewal', {}, {
    repeat: { pattern: '0 0 1 * *', tz: 'Asia/Jakarta' },
    jobId: 'subscription-renewal',
  });
}

// Worker
const worker = new Worker('scheduled', async (job) => {
  switch (job.name) {
    case 'daily-cleanup':
      await performDailyCleanup();
      break;
    case 'health-check':
      await performHealthCheck();
      break;
    case 'subscription-renewal':
      await checkSubscriptionRenewals();
      break;
  }
}, { connection: { host: process.env.REDIS_HOST } });
```

---

### 4. Distributed Cron Locking (Redis)

```typescript
// lib/cron-lock.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

/**
 * Acquire a distributed lock to prevent duplicate cron execution
 * across multiple server instances.
 */
export async function acquireCronLock(
  jobName: string,
  ttlSeconds: number = 300,
): Promise<boolean> {
  const lockKey = `cron-lock:${jobName}`;
  // SET NX (only if not exists) with TTL
  const result = await redis.set(lockKey, Date.now().toString(), 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

export async function releaseCronLock(jobName: string): Promise<void> {
  await redis.del(`cron-lock:${jobName}`);
}

// Usage in cron handler
export async function GET(request: Request) {
  const locked = await acquireCronLock('daily-cleanup', 300);
  if (!locked) {
    return Response.json({ skipped: true, reason: 'Already running on another instance' });
  }

  try {
    await performDailyCleanup();
    return Response.json({ ok: true });
  } finally {
    await releaseCronLock('daily-cleanup');
  }
}
```

---

### Common Cron Patterns

| Schedule | Cron Expression | Description |
|---|---|---|
| Every minute | `* * * * *` | Health checks, queue monitoring |
| Every 5 minutes | `*/5 * * * *` | Cache warming, metric aggregation |
| Every hour | `0 * * * *` | Data sync, report generation |
| Daily at 3 AM | `0 3 * * *` | Cleanup, backups |
| Weekly Monday 9 AM | `0 9 * * 1` | Weekly reports |
| Monthly 1st at midnight | `0 0 1 * *` | Billing cycles, subscription renewals |
| Weekdays at 8 AM | `0 8 * * 1-5` | Business notifications |

---

### Common Pitfalls to Avoid

| Anti-Pattern | Problem | Correct Approach |
|---|---|---|
| No distributed locking | Duplicate execution across instances | Use Redis-based NX lock |
| Long-running cron without timeout | Resource exhaustion, overlapping runs | Set `maxDuration` and use lock TTL |
| No monitoring of cron failures | Silent failures go unnoticed | Log results, alert on failures |
| Hardcoded timezone | Jobs run at wrong time after DST | Always use explicit `tz` parameter |
| Cron job does too much work | Timeout, partial completion | Break into smaller steps (Inngest/Temporal) |

---

### Integration with Other Skills

- `async-queue-temporal-expert` — BullMQ repeatable jobs, Inngest scheduled functions
- `cloud-hosting-expert` — Vercel Cron, Cloudflare Workers Cron configuration
- `saas-billing` — Subscription renewal checks, billing cycle jobs
- `email-notification-expert` — Scheduled email digests, daily summaries
- `data-telemetry-expert` — Scheduled metric aggregation and reporting
- `logging-error-tracking-expert` — Cron job failure monitoring

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.
- `async-queue-temporal-expert` — BullMQ repeatable jobs dan alur kerja Inngest.
- `cloud-hosting-expert` — Konfigurasi Vercel Cron dan Cloudflare Workers Cron.
- `saas-billing` — Pemeriksaan siklus perpanjangan invoice langganan berkala.
- `email-notification-expert` — Pengiriman digest email harian/mingguan terjadwal.

### Deskripsi
Panduan tingkat produksi untuk mengimplementasikan tugas terjadwal, cron job, dan pekerjaan latar belakang berulang di aplikasi web modern. Mencakup **Vercel Cron Jobs**, **Cloudflare Workers Cron Triggers**, **Inngest scheduled functions**, **BullMQ repeatable jobs**, **distributed cron locking** (berbasis Redis), **penjadwalan sadar zona waktu**, dan kasus penggunaan umum (pembersihan data, pembuatan laporan, health check, perpanjangan langganan).

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Menyiapkan tugas terjadwal/berulang (laporan harian, pembersihan, health check).
- Mengonfigurasi Vercel Cron Jobs atau Cloudflare Workers Cron Triggers.
- Mengimplementasikan pemeriksaan perpanjangan langganan atau siklus billing.
- Membangun pipeline agregasi data atau ETL pada jadwal tertentu.
- Membutuhkan penguncian cron terdistribusi untuk mencegah eksekusi duplikat.

---

### Panduan Pemilihan Solusi Cron

| Platform | Pilihan Terbaik Untuk | Frekuensi Maksimum | Model Pemicu |
|---|---|---|---|
| **Vercel Cron** | Aplikasi Next.js di Vercel | 1x/menit (Pro), 1x/hari (Hobby) | Pemicu HTTP endpoint internal |
| **Cloudflare Workers Cron** | Arsitektur Edge murni | 1x/menit | Scheduled event script worker |
| **Inngest** | Alur bertahap (*step-functions*) multi-langkah | Fleksibel & event-driven | Serverless durable execution |
| **BullMQ Repeatable** | Aplikasi mandiri berbasis Redis | Fleksibel | Antrean worker Node.js terpisah |

---

### Implementasi Pola Kunci (TypeScript)

#### 1. Vercel Cron dengan Proteksi Autentikasi Rahasia (`CRON_SECRET`)
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/pembersihan-harian",
      "schedule": "0 3 * * *"
    }
  ]
}
```

```typescript
// app/api/cron/pembersihan-harian/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verifikasi permintaan resmi berasal dari scheduler Vercel
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Tidak memiliki otorisasi' }, { status: 401 });
  }

  try {
    // Jalankan operasi pembersihan sesi kadaluarsa
    const hasil = await db.delete(sesiPengguna)
      .where(lt(sesiPengguna.kadaluarsaPada, new Date()));

    return NextResponse.json({ ok: true, terhapus: hasil.rowCount });
  } catch (error) {
    console.error('Pembersihan cron gagal:', error);
    return NextResponse.json({ ok: false, error: 'Gagal membersihkan data' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60; // Izinkan eksekusi hingga 60 detik
```

#### 2. Inngest Scheduled Functions Sadar Zona Waktu (`TZ=Asia/Jakarta`)
```typescript
import { inngest } from '@/lib/inngest';

export const jobLaporanMingguan = inngest.createFunction(
  { id: 'laporan-mingguan-admin', name: 'Kirim Laporan Penggunaan Mingguan' },
  { cron: 'TZ=Asia/Jakarta 0 9 * * 1' }, // Setiap Senin pukul 09:00 WIB
  async ({ step }) => {
    const dataMetrik = await step.run('ambil-data-metrik', async () => {
      return await kumpulkanMetrik7HariTerakhir();
    });

    const fileLaporan = await step.run('buat-dokumen-laporan', async () => {
      return await generateReportPdf(dataMetrik);
    });

    await step.run('kirimkan-email-admin', async () => {
      await emailQueue.add('kirim-laporan', { file: fileLaporan });
    });

    return { status: 'sukses', terkirim: true };
  }
);
```

#### 3. Distributed Cron Locking Berbasis Redis (`SET NX`)
```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export async function dapatkanKunciCron(namaTugas: string, durasiDetik: number = 300): Promise<boolean> {
  const kunci = `kunci-cron:${namaTugas}`;
  const status = await redis.set(kunci, Date.now().toString(), 'EX', durasiDetik, 'NX');
  return status === 'OK';
}

export async function lepaskanKunciCron(namaTugas: string): Promise<void> {
  await redis.del(`kunci-cron:${namaTugas}`);
}
```

### Praktik Terbaik Keamanan Cron
- **Gunakan Distributed Lock**: Mencegah eksekusi ganda ketika aplikasi berjalan pada banyak instans server (cluster/autoscaling).
- **Tentukan `maxDuration`**: Hindari cron menggantung tanpa henti yang menghabiskan alokasi sumber daya komputasi.
- **Zona Waktu Eksplisit**: Selalu sertakan parameter timezone (`TZ=Asia/Jakarta`) agar jadwal tidak bergeser saat Daylight Saving Time (DST) di cloud server.