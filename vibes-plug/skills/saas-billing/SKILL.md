---
name: saas-billing
description: "Implement and audit SaaS billing systems, subscription state machines, secure webhooks, and local database synchronization / Implementasi dan audit sistem billing SaaS, state machine langganan, webhook aman, dan sinkronisasi database lokal."
author: "Roedy Rustam"
version: "4.3.0"
---

# SaaS Billing Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Expert guide for implementing and auditing SaaS billing systems. Covers subscription state machines, secure webhook handling, atomic database synchronization, and the 2026 billing landscape including Stripe, **Polar.sh** (open-source, developer-first), **LemonSqueezy**, Paddle, DOKU (Checkout & SNAP BI), and Midtrans (for Southeast Asia).

### Trigger Conditions
- Integrating any payment gateway (Stripe, Polar.sh, LemonSqueezy, DOKU Checkout / SNAP BI, Midtrans, PayPal) into a SaaS application.
- Using a Static-to-Dynamic QRIS alternative (with unique nominals and mutation webhooks) for local developers without PG accounts.
- Implementing subscription state machines (active → past_due → canceled → reactivated).
- Building secure webhook handlers with signature verification and atomic idempotency.
- Syncing external subscription status to a local database.
- Implementing usage-based billing or metered API pricing.
- Building the customer billing portal (manage subscription, download invoices).
- Auditing an existing billing system for security gaps.

### 2026 Billing Provider Landscape

| Provider | Best For | Open Source | Merchant of Record |
|---|---|---|---|
| **Stripe** | Enterprise, global, complex billing | ❌ | ❌ |
| **Polar.sh** | Developer-first, open-source products | ✅ | ✅ (optional) |
| **LemonSqueezy** | Indie hackers, simple pricing, global | ❌ | ✅ |
| **Paddle** | B2B SaaS, EU VAT compliance | ❌ | ✅ |
| **DOKU (Checkout & SNAP BI)** | Indonesia & SE Asia enterprise, QRIS, VA, Multi-channel | ❌ | ❌ |
| **Midtrans** | Southeast Asia / Indonesia | ❌ | ❌ |
| **PayPal** | Global, consumer trust | ❌ | ❌ |

> **Merchant of Record (MoR)**: The provider handles tax compliance (VAT, GST), chargebacks, and legal liability — ideal for small teams without a finance department.

### Polar.sh — Developer-First Billing (2026 Rising Star)
Polar.sh is the modern, open-source alternative to Gumroad/LemonSqueezy, purpose-built for developers and open-source projects:
```typescript
import { Polar } from "@polar-sh/sdk";

const polar = new Polar({ accessToken: process.env.POLAR_ACCESS_TOKEN });

// Create a checkout session
const checkout = await polar.checkouts.custom.create({
  productId: "prod_xxxx",
  successUrl: "https://myapp.com/success?checkout={CHECKOUT_ID}",
  customerEmail: user.email,
  metadata: { userId: user.id },
});

// Redirect to checkout
return redirect(checkout.url);
```

```typescript
// Webhook handler (Next.js App Router)
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("webhook-signature") ?? "";
  
  try {
    const event = validateEvent(body, req.headers, process.env.POLAR_WEBHOOK_SECRET!);
    
    switch (event.type) {
      case "subscription.created":
      case "subscription.updated":
        await syncSubscription(event.data);
        break;
      case "subscription.canceled":
        await cancelSubscription(event.data.id);
        break;
    }
    return new Response(null, { status: 200 });
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      return new Response("Invalid signature", { status: 403 });
    }
    throw e;
  }
}
```

### Stripe — Production Patterns

#### Subscription State Machine
```
FREE ──subscribe──> TRIALING ──trial_ends──> ACTIVE
                                              │
                              ┌───────────────┤
                              │               │
                         payment fails    cancel
                              │               │
                          PAST_DUE        CANCELED
                              │
                         3 failed retries
                              │
                          CANCELED
```

#### Idempotent Webhook Handler (Race Condition Prevention)
```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';
import { db } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text(); // Raw body is mandatory
  const sig = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  // Idempotency: Atomic insert on unique constraint to guarantee zero race conditions
  try {
    await db.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        processedAt: new Date(),
      },
    });
  } catch (err: any) {
    // Unique violation (e.g. Prisma code P2002) means this event is ALREADY processed or currently processing
    return new Response(JSON.stringify({ message: 'Event already received' }), { status: 200 });
  }

  // Process event safely knowing this invocation is guaranteed unique
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      await db.subscription.upsert({
        where: { stripeSubId: sub.id },
        create: { stripeSubId: sub.id, status: sub.status, userId: sub.metadata.userId },
        update: { status: sub.status, currentPeriodEnd: new Date(sub.current_period_end * 1000) },
      });
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await sendDunningEmail(invoice.customer_email!);
      break;
    }
  }

  return new Response(null, { status: 200 });
}
```

#### Usage-Based Billing (Metered)
```typescript
// Report usage at end of billing period
await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  quantity: apiCallsThisMonth,
  timestamp: Math.floor(Date.now() / 1000),
  action: 'set', // 'set' or 'increment'
});
```

### PayPal — Checkout Integration

PayPal remains a trusted global standard for one-off payments and subscriptions.

#### Create Order (Server-Side)
```typescript
// app/api/paypal/create-order/route.ts
import { paypalClient } from '@/lib/paypal';
import paypal from '@paypal/checkout-server-sdk';

export async function POST() {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{ amount: { currency_code: 'USD', value: '29.99' } }]
  });

  const response = await paypalClient().execute(request);
  return Response.json({ id: response.result.id });
}
```

#### Capture Payment (Server-Side)
```typescript
// app/api/paypal/capture-order/route.ts
import { db } from '@/lib/db';
import { paypalClient } from '@/lib/paypal';
import paypal from '@paypal/checkout-server-sdk';

export async function POST(req: Request) {
  const { orderID, userId } = await req.json();
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});

  const response = await paypalClient().execute(request);
  if (response.result.status === 'COMPLETED') {
    // Grant access or update subscription in DB
    await db.subscription.create({
      data: { userId, provider: 'paypal', status: 'active' }
    });
    return Response.json({ success: true });
  }
  return Response.json({ success: false }, { status: 400 });
}
```

### QRIS Static-to-Dynamic (Indonesia Alternative)

For Indonesian developers without an official Payment Gateway account, you can create a "Dynamic" QRIS experience using a single Static QRIS combined with unique payment amounts and a bank mutation checking service (e.g., Moota, Cekmutasi) via webhook.

#### 1. Generate Unique Amount (Server-Side)
```typescript
// Add a unique 3-digit code to the base price
export async function createQrisTransaction(userId: string, basePrice: number) {
  // Generate a random code between 1 and 999
  const uniqueCode = Math.floor(Math.random() * 999) + 1;
  const totalAmount = basePrice + uniqueCode;
  
  const transaction = await db.transaction.create({
    data: {
      userId, basePrice, uniqueCode, totalAmount,
      status: 'pending', provider: 'qris_static',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins expiry
    }
  });
  
  return {
    transactionId: transaction.id,
    totalAmount,
    qrisUrl: "https://myapp.com/static-qris.png" // User must manually input totalAmount
  };
}
```

#### 2. Mutation Webhook Handler & Real-Time Notification
```typescript
// app/api/webhooks/mutation/route.ts
import { db } from '@/lib/db';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  const signature = req.headers.get("signature");
  // TODO: Verify signature from mutation service (e.g., Moota)
  
  const mutations = await req.json();
  
  for (const mutation of mutations) {
    if (mutation.type === 'CR' && mutation.amount > 0) {
      // Atomic Update: Only update if still pending
      const updateResult = await db.transaction.updateMany({
        where: {
          totalAmount: mutation.amount,
          status: 'pending',
          provider: 'qris_static',
          expiresAt: { gt: new Date() }
        },
        data: { status: 'paid' }
      });
      
      if (updateResult.count > 0) {
        const tx = await db.transaction.findFirst({ where: { totalAmount: mutation.amount, status: 'paid' } });
        if (tx) {
          await db.subscription.create({
            data: { userId: tx.userId, provider: 'qris_static', status: 'active' }
          });
          // Trigger real-time notification to frontend
          await pusherServer.trigger(`payment-${tx.id}`, 'payment-success', { success: true });
        }
      }
    }
  }
  
  return new Response("OK", { status: 200 });
}
```

### Database Schema for Multi-Provider Billing
```typescript
// Drizzle ORM — supports Stripe, Polar, LemonSqueezy, PayPal, DOKU, QRIS Static
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').references(() => workspaces.id).notNull(),
  provider: text('provider').$type<'stripe' | 'polar' | 'lemonsqueezy' | 'doku' | 'paypal' | 'qris_static'>().notNull(),
  externalCustomerId: text('external_customer_id').notNull(),
  externalSubId: text('external_sub_id').notNull().unique(),
  status: text('status').$type<'active' | 'trialing' | 'past_due' | 'canceled' | 'paused'>().notNull(),
  plan: text('plan').$type<'free' | 'pro' | 'enterprise'>().default('free').notNull(),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Billing Security Checklist
- [ ] Webhook signature verified on every request — reject without valid signature.
- [ ] Webhook idempotency implemented with Atomic Lock — never process the same event twice.
- [ ] Session Management Optimization: Secure the billing portal route with strict session validation and CSRF protection. Do not cache session-dependent billing states.
- [ ] Use Stripe CLI / Polar.sh test webhooks for local development.
- [ ] All billing API calls use server-side code only — never expose secret keys to frontend.
- [ ] Plan limits enforced on every protected route (not just at checkout).
- [ ] Failed payment dunning flow configured (email sequence, grace period).
- [ ] Customer portal link available from within the app.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan ahli untuk mengimplementasikan dan mengaudit sistem billing SaaS. Mencakup state machine langganan, penanganan webhook aman, sinkronisasi database, dan lanskap billing 2026 termasuk Stripe, **Polar.sh** (open-source, developer-first), **LemonSqueezy**, Paddle, DOKU (Checkout & SNAP BI), dan Midtrans (untuk Asia Tenggara).

### Kondisi Pemicu
- Mengintegrasikan payment gateway (Stripe, Polar.sh, LemonSqueezy, DOKU Checkout / SNAP BI, Midtrans, PayPal) ke aplikasi SaaS.
- Menggunakan alternatif QRIS Statis menjadi Dinamis (dengan nominal unik dan webhook mutasi) untuk developer lokal tanpa akun PG.
- Mengimplementasikan state machine langganan.
- Membangun webhook handler aman dengan verifikasi tanda tangan dan idempotency berbasis atomic lock.
- Menyinkronkan status langganan eksternal ke database lokal.
- Mengimplementasikan billing berbasis penggunaan (metered pricing).
- Membangun portal billing pelanggan.
- Mengaudit sistem billing yang ada untuk celah keamanan.

### Lanskap Provider Billing 2026

| Provider | Terbaik Untuk | Open Source | Merchant of Record |
|---|---|---|---|
| **Stripe** | Enterprise, global, billing kompleks | ❌ | ❌ |
| **Polar.sh** | Developer-first, produk open-source | ✅ | ✅ (opsional) |
| **LemonSqueezy** | Indie hackers, harga sederhana | ❌ | ✅ |
| **Paddle** | B2B SaaS, kepatuhan PPN EU | ❌ | ✅ |
| **DOKU (Checkout & SNAP BI)** | Indonesia & Asia Tenggara, QRIS, Virtual Account, Multi-kanal | ❌ | ❌ |
| **Midtrans** | Asia Tenggara / Indonesia | ❌ | ❌ |
| **PayPal** | Global, kepercayaan konsumen (consumer trust) | ❌ | ❌ |

> **Merchant of Record (MoR)**: Provider menangani kepatuhan pajak (PPN, GST), chargeback, dan tanggung jawab hukum — ideal untuk tim kecil tanpa departemen keuangan.

### Polar.sh — Billing Developer-First
Polar.sh adalah alternatif open-source modern untuk Gumroad/LemonSqueezy, dirancang khusus untuk developer dan proyek open-source. Mendukung checkout, webhook, dan manajemen langganan dengan SDK TypeScript yang bersih.

### PayPal — Integrasi Checkout
PayPal sering digunakan sebagai gateway alternatif atau utama karena tingginya kepercayaan konsumen global.
- **Server-Side Checkout**: Gunakan `create-order` dan `capture-order` di backend (menggunakan `@paypal/checkout-server-sdk`) untuk memastikan keamanan dan mencegah manipulasi harga di sisi klien.
- **Webhook**: Verifikasi webhook dari PayPal untuk langganan yang diperbarui atau dibatalkan.

### Stripe — Pola Produksi

#### State Machine Langganan
Kelola transisi status: `FREE → TRIALING → ACTIVE → PAST_DUE → CANCELED → (reaktivasi)`.

#### Webhook Handler Idempoten (Pencegahan Race Condition)
Selalu verifikasi tanda tangan webhook dari raw body. Gunakan insert unik atomic di database (bukan sekadar `findUnique`) agar request retry simultan tidak menyebabkan penambahan saldo atau perpanjangan langganan ganda. Jika terdeteksi duplikat, langsung kembalikan status HTTP `200 OK`.

#### Billing Berbasis Penggunaan (Metered)
Laporkan penggunaan API dengan `stripe.subscriptionItems.createUsageRecord()` di akhir periode billing.

### Alternatif Lokal: QRIS Statis Rasa Dinamis (Tanpa Akun Payment Gateway)
Bagi pengguna/developer di Indonesia yang belum memiliki Payment Gateway (seperti Midtrans/DOKU), Anda dapat membuat pengalaman QRIS "Dinamis" menggunakan satu gambar QRIS statis biasa.
- **Generate Nominal Unik (Endpoint)**: Tambahkan angka unik (misalnya 3 digit acak) ke harga dasar (contoh: Rp 100.000 menjadi Rp 100.123). Simpan ke database sebagai transaksi `pending` dengan batas waktu kadaluarsa (misal 15 menit). Tampilkan gambar QRIS beserta instruksi transfer sesuai nominal unik.
- **Webhook Mutasi Bank**: Gunakan layanan pihak ketiga (seperti Moota, Cekmutasi) yang mengirimkan notifikasi webhook (ke `/api/webhooks/mutation`) setiap kali ada uang masuk.
- **Validasi Otomatis & Atomic Lock**: Saat webhook menerima payload mutasi kredit (`CR`), sistem memperbarui transaksi pending secara atomik. Jika cocok, sistem menandai tagihan sebagai lunas (`paid`) dan mengaktifkan langganan.
- **Notifikasi Klien**: Gunakan WebSocket (seperti Pusher atau Socket.io) di backend untuk melakukan *trigger event* "pembayaran berhasil". Di frontend, *listen* ke event tersebut dan tampilkan notifikasi *real-time* kepada pengguna secara instan tanpa perlu me-refresh halaman.

### Skema Database Multi-Provider
Rancang tabel `subscriptions` yang mendukung beberapa provider (`stripe`, `polar`, `lemonsqueezy`, `doku`, `paypal`, `qris_static`) dengan kolom `provider` dan ID eksternal yang terpisah.

### Checklist Keamanan Billing
- [ ] Tanda tangan webhook diverifikasi pada setiap permintaan menggunakan raw body.
- [ ] Idempotency webhook diimplementasikan dengan penguncian atomic.
- [ ] Optimasi Session Management: Amankan rute portal billing dengan validasi sesi yang ketat dan perlindungan CSRF. Jangan gunakan cache untuk state billing yang bergantung pada sesi pengguna.
- [ ] Semua panggilan API billing menggunakan kode sisi server saja.
- [ ] Batas plan diterapkan pada setiap rute yang dilindungi.
- [ ] Alur dunning pembayaran gagal dikonfigurasi.
- [ ] Tautan portal pelanggan tersedia dari dalam aplikasi.