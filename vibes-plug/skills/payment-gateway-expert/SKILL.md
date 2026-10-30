---
name: payment-gateway-expert
description: "Expert guide for integrating payment gateways (Stripe, PayPal, Xendit, Midtrans, DOKU SNAP BI) and secure webhooks into SaaS platforms / Panduan ahli integrasi payment gateway dan webhook aman."
author: "Roedy Rustam"
version: "4.3.0"
---

# Payment Gateway Expert / Ahli Payment Gateway

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Expert guide for integrating major payment gateways (Stripe, PayPal, Xendit, Midtrans, DOKU SNAP BI) into modern SaaS platforms. Covers checkout flows, secure raw-body webhook handling, atomic idempotency to prevent race conditions, subscription state machines, and local database synchronization.

### Core Principles
- **Security First**: Always validate webhook signatures using the raw, unparsed request body before processing any payment event. Never trust client-side data for prices or payment status. For Indonesian gateways (DOKU, Midtrans, Xendit), accurately apply the required signature protocol: **DOKU Checkout** uses **HMAC-SHA256 with body Digest**, while **SNAP BI Direct APIs** enforce **HMAC-SHA512** with ISO8601 timestamps.
- **Idempotency & Race Condition Prevention**: Implement idempotency keys for all payment creation requests. For webhook ingestion, **DO NOT rely solely on `findUnique` checks**, as concurrent webhook retries cause race conditions. Always use **Atomic Updates** (`UPDATE ... WHERE status = 'PENDING'`) or database pessimistic locks (`SELECT ... FOR UPDATE`).
- **Raw Body Ingestion**: Webhook signature verification fails if JSON is parsed or re-serialized with modified key ordering. Extract the exact raw string buffer (`req.text()` in Fetch API or `express.raw({ type: 'application/json' })` in Express).
- **Early 200 OK Acknowledgment**: If a webhook event is verified but already processed, immediately return `200 OK` so the payment gateway halts retries.
- **State Synchronization**: Ensure the local database (e.g., PostgreSQL, Supabase via Drizzle/Prisma) is updated transactionally upon receiving successful webhook events.
- **Subscription Management**: Map provider subscription statuses (`trialing`, `active`, `past_due`, `canceled`) accurately to internal SaaS state machines.

### Implementation Checklist
- [ ] Create dedicated raw Webhook endpoint (e.g., `/api/webhooks/stripe`, `/api/webhooks/doku/checkout`).
- [ ] Use raw request body string for signature verification (never parsed JSON).
- [ ] Verify signature using proper algorithm (HMAC-SHA256 + Digest for DOKU Checkout, Stripe, PayPal; HMAC-SHA512 for SNAP BI Direct API).
- [ ] Implement Atomic Update idempotency (`WHERE status = 'PENDING'`) to eliminate race conditions.
- [ ] Acknowledge duplicate webhooks immediately with HTTP `200 OK`.
- [ ] Offload heavy post-payment operations (invoicing, emails, webhooks) to background job queues (BullMQ/Temporal).

### Example: SNAP BI Webhook & Atomic Idempotency (Next.js App Router)
```typescript
import { headers } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const rawBody = await req.text(); // Raw body is mandatory
  const headerList = await headers();
  
  const timestamp = headerList.get('x-timestamp') || '';
  const receivedSig = headerList.get('x-signature') || '';
  const authHeader = headerList.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const path = new URL(req.url).pathname;

  // 1. SNAP BI Body Hash & Signature Verification (HMAC-SHA512)
  const bodyHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex').toLowerCase();
  const stringToSign = `POST:${path}:${token}:${bodyHash}:${timestamp}`;
  const calculatedSig = crypto
    .createHmac('sha512', process.env.DOKU_SECRET_KEY!)
    .update(stringToSign, 'utf8')
    .digest('base64');

  const isValid = crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(calculatedSig));
  if (!isValid) {
    return new Response('Invalid Signature', { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const invoiceNumber = payload.order?.invoice_number;

  // 2. Atomic Update: Eliminates Race Conditions by locking on 'PENDING' status
  const updated = await db.transaction.updateMany({
    where: {
      invoiceNumber: invoiceNumber,
      status: 'PENDING', // Key race condition prevention gate
    },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      externalReference: payload.transaction?.original_reference_no,
    },
  });

  // 3. Duplicate Webhook Handling (Idempotency)
  if (updated.count === 0) {
    // Already processed or invalid invoice — return 200 to halt gateway retry spam
    return new Response(JSON.stringify({ status: 'ALREADY_PROCESSED' }), { status: 200 });
  }

  // 4. Fulfillment (Execute only once)
  await grantUserSubscription(invoiceNumber);

  return new Response(JSON.stringify({ status: 'SUCCESS' }), { status: 200 });
}

async function grantUserSubscription(invoiceNumber: string) {
  // Safe business logic execution
}
```

## Orchestration & Integration
- Integrates with: `saas-billing`, `doku-payment-gateway`, `doku-mcp-server`, `async-queue-temporal-expert`, `database-orm-expert`.

### Trigger Conditions
Active whenever the user is working on billing integration, payment checkout, webhook handling, or integrating platforms like PayPal, Stripe, Xendit, Midtrans, or DOKU SNAP BI.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
- **`saas-billing`**: Alur penagihan langganan dan state machine status akun.
- **`doku-payment-gateway`**: Integrasi teknis spesifik DOKU Checkout dan Direct API SNAP BI.
- **`doku-mcp-server`**: Pemanggilan tool otonom pembuatan invoice oleh agen AI.
- **`async-queue-temporal-expert`**: Antrean tugas pasca-pembayaran (invoicing, notifikasi).
- **`database-orm-expert`**: Transaksi atomik dan locking database untuk mencegah race condition.

### Deskripsi
Panduan ahli untuk mengintegrasikan payment gateway utama (Stripe, PayPal, Xendit, Midtrans, DOKU SNAP BI) ke platform SaaS modern. Mencakup alur checkout, penanganan webhook raw-body aman, pencegahan race condition melalui atomic update, state machine langganan, dan sinkronisasi database lokal.

### Kondisi Pemicu
Aktif setiap kali pengguna sedang mengerjakan integrasi billing, checkout pembayaran, penanganan webhook, atau mengintegrasikan platform seperti PayPal, Stripe, Xendit, Midtrans, atau DOKU SNAP BI.

---

### Prinsip Utama & Kode Implementasi Webhook Idempoten (TypeScript)

```typescript
import { headers } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const rawBody = await req.text(); // Wajib membaca raw body mentah sebelum diparse
  const headerList = await headers();

  const timestamp = headerList.get('x-timestamp') || '';
  const signatureDiterima = headerList.get('x-signature') || '';
  const authHeader = headerList.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const path = new URL(req.url).pathname;

  // 1. Verifikasi Signature HMAC-SHA512 SNAP BI
  const bodyHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex').toLowerCase();
  const stringToSign = `POST:${path}:${token}:${bodyHash}:${timestamp}`;
  const signatureDihitung = crypto
    .createHmac('sha512', process.env.DOKU_SECRET_KEY!)
    .update(stringToSign, 'utf8')
    .digest('base64');

  if (!crypto.timingSafeEqual(Buffer.from(signatureDiterima), Buffer.from(signatureDihitung))) {
    return new Response('Tanda Tangan Tidak Valid', { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const nomorInvoice = payload.order?.invoice_number;

  // 2. Atomic Update: Kunci hanya baris dengan status 'PENDING' untuk mencegah race condition
  const diperbarui = await db.transaksi.updateMany({
    where: { nomorInvoice, status: 'PENDING' },
    data: { status: 'PAID', dibayarPada: new Date() },
  });

  // 3. Penanganan Webhook Duplikat (Idempotensi)
  if (diperbarui.count === 0) {
    return new Response(JSON.stringify({ status: 'SUDAH_DIPROSES' }), { status: 200 });
  }

  // 4. Aktivasi Layanan Pengguna (Hanya dieksekusi 1 kali)
  await aktifkanLangganan(nomorInvoice);
  return new Response(JSON.stringify({ status: 'BERHASIL' }), { status: 200 });
}
```