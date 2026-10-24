---
name: event-driven-architect
description: "Expert guide for microservices, message queues, Event Sourcing, and high-scale backend architectures / Panduan ahli untuk arsitektur microservices, antrean pesan, dan backend skala tinggi."
author: "Roedy Rustam"
version: "4.3.0"
---

# Event-Driven Architecture Expert (Transactional Outbox & Sagas 2026)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production architectural guide for Event-Driven Architecture (EDA), asynchronous messaging topologies, and distributed consistency. Covers transactional Outbox patterns (preventing dual-write anomalies), distributed Saga orchestrations with compensating transactions, consumer idempotency keys, Event Sourcing, and message brokers (BullMQ v5, Apache Kafka / Redpanda, RabbitMQ, and AWS SQS).

### Trigger Conditions
- Decomposing synchronous HTTP request chains between microservices to prevent cascading failures.
- Designing high-volume asynchronous background workers (video rendering, batch billing, analytics).
- Preventing dual-write failures (e.g., writing to PostgreSQL succeeds, but publishing to message broker fails).
- Coordinating multi-service distributed transactions (Saga choreography vs orchestration).

### The Transactional Outbox Pattern (PostgreSQL / TypeScript)
Guarantees at-least-once delivery without distributed dual-write race conditions:

```typescript
// src/services/outbox-publisher.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import crypto from 'node:crypto';

export async function createOrderWithOutbox(orderData: { customerId: string; totalCents: number }) {
  return await db.transaction(async (tx) => {
    const orderId = crypto.randomUUID();

    // 1. Mutate business state
    await tx.execute(sql`
      INSERT INTO orders (id, customer_id, total_cents, status)
      VALUES (${orderId}, ${orderData.customerId}, ${orderData.totalCents}, 'PENDING')
    `);

    // 2. Insert event into outbox table in the SAME atomic transaction
    const eventPayload = JSON.stringify({
      orderId,
      customerId: orderData.customerId,
      totalCents: orderData.totalCents,
      timestamp: new Date().toISOString(),
    });

    await tx.execute(sql`
      INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status)
      VALUES (gen_random_uuid(), 'Order', ${orderId}, 'ORDER_CREATED', ${eventPayload}::jsonb, 'PENDING')
    `);

    return { orderId };
  });
}
```

### Idempotent Consumer Pattern (BullMQ / Redis)
Ensures duplicate messages delivered by the broker do not cause duplicate charges:

```typescript
// src/workers/payment-consumer.ts
import { Worker, Job } from 'bullmq';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const paymentWorker = new Worker(
  'payment-processing',
  async (job: Job<{ orderId: string; totalCents: number }>) => {
    const { orderId, totalCents } = job.data;
    const idempotencyKey = `job-exec-${job.id}`;

    // Atomically claim the job execution
    const [claimed] = await db.execute(sql`
      INSERT INTO processed_jobs (idempotency_key, processed_at)
      VALUES (${idempotencyKey}, NOW())
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING idempotency_key
    `);

    if (!claimed) {
      console.warn(`[PaymentWorker] Duplicate job detected: ${job.id}. Skipping.`);
      return { status: 'already_processed' };
    }

    // Execute real payment processing...
    console.log(`[PaymentWorker] Charging ${totalCents}¢ for order ${orderId}`);
    return { status: 'completed' };
  },
  { connection: { host: process.env.REDIS_HOST || 'localhost', port: 6379 } }
);
```

### Key Event-Driven Invariants
1. **Never Make Synchronous State Mutations Over HTTP**: Service A should not call Service B's `/mutate` endpoint synchronously. Publish an event and let Service B consume it asynchronously.
2. **Always Enforce Idempotency**: Network retries will cause message duplicates. Every consumer MUST check an `idempotency_key` or message UUID before executing side effects.
3. **Dead Letter Queues (DLQ)**: Failed jobs must be routed to a DLQ after 3-5 retries with exponential backoff to prevent poison pills from blocking the queue.

## Orchestration & Integration
- **`domain-driven-design-expert`**: Sources domain events directly from Aggregate Roots.
- **`async-queue-temporal-expert`**: Extends BullMQ queues with durable temporal distributed sagas.
- **`database-orm-expert`**: Maintains outbox schema tables and database transaction boundaries.
- **`logging-error-tracking-expert`**: Correlates trace IDs (x-trace-id) across distributed event consumers.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi bersama `domain-driven-design-expert`, `async-queue-temporal-expert`, `database-orm-expert`, dan `logging-error-tracking-expert`.

### Deskripsi
Panduan arsitektur produksi untuk Arsitektur Berbasis Peristiwa (*Event-Driven Architecture* / EDA), topologi pengiriman pesan asinkron, dan konsistensi data terdistribusi. Mencakup pola *Transactional Outbox* (mencegah anomali *dual-write* saat database sukses tetapi broker pesan gagal), orkestrasi Saga terdistribusi dengan transaksi kompensasi, idempotensi *consumer*, serta integrasi broker pesan (BullMQ v5, Apache Kafka, RabbitMQ, Redis).

### Kondisi Pemicu
- Menghilangkan rantai panggilan HTTP sinkron antar microservices yang rentan memicu kegagalan beruntun (*cascading failure*).
- Merancang pemrosesan latar belakang volume tinggi (pembuatan video, pemrosesan batch, analitik).
- Menjamin konsistensi data antara database relasional dengan antrean pesan.
- Mengelola transaksi multi-layanan menggunakan pola Saga.

### Pola Konsumen Idempoten di Sisi Pekerja

```typescript
// Memastikan pemrosesan tidak terulang meskipun broker mengirim pesan ganda
export async function handleOrderEvent(event: { id: string; payload: any }) {
  const isDuplicate = await redis.set(`event:${event.id}`, 'locked', 'EX', 86400, 'NX');
  if (!isDuplicate) {
    console.log(`Event ${event.id} sudah pernah diproses. Lewati.`);
    return;
  }

  // Jalankan logika bisnis aman
  await prosesKirimEmailNotifikasi(event.payload);
}
```

### 3 Hukum Utama Arsitektur Berbasis Event
1. **Pola Transactional Outbox**: Selalu simpan entitas bisnis dan event outbox dalam satu transaksi SQL yang sama. Jangan memanggil `kafka.send()` langsung di dalam kode kontroler.
2. **Wajib Idempoten**: Karena broker pesan menjamin pengiriman *at-least-once*, konsumen pesan wajib memeriksa apakah event telah diproses sebelumnya.
3. **Dead Letter Queue (DLQ)**: Jika pemrosesan gagal berulang kali (setelah 3-5 retry), pindahkan pesan ke DLQ agar tidak menyumbat antrean utama.

## Integrasi Orkestrasi
- **`domain-driven-design-expert`**: Mengambil event domain langsung dari Aggregate Root.
- **`async-queue-temporal-expert`**: Menyediakan alur workflow tahan banting untuk orkestrasi Saga.
- **`database-orm-expert`**: Mengelola tabel outbox dan indeks status pesan.
- **`logging-error-tracking-expert`**: Melacak `trace_id` yang melintasi berbagai layanan asinkron.