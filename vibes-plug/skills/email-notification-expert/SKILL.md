---
name: email-notification-expert
description: "Expert guide for transactional email (Resend, Postmark, SES), React Email templates, in-app notifications, and unified communication pipelines / Panduan ahli untuk email transaksional (Resend, Postmark, SES), template React Email, notifikasi in-app, dan pipeline komunikasi terpadu."
author: "Roedy Rustam"
version: "4.3.0"
---

# Email & Notification Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Production-grade guide for building reliable email delivery systems and unified notification pipelines. Covers **Resend**, **Postmark**, **AWS SES**, **React Email** / **MJML** template engines, **email deliverability** (SPF, DKIM, DMARC), **in-app notification systems** (bell icon, toast, notification center), **webhook-triggered email flows**, **email queuing** with BullMQ/Inngest, and **CAN-SPAM/GDPR** compliance.

### Trigger Conditions
Activate this skill when:
- Setting up transactional email (welcome, password reset, invoices, team invites).
- Building email templates with React Email or MJML.
- Integrating Resend, Postmark, SendGrid, or AWS SES.
- Implementing in-app notification systems (real-time bell, toast, notification center).
- Configuring email deliverability (SPF, DKIM, DMARC records).
- Building email queue systems for high-volume sends.
- Implementing unsubscribe management and compliance.

---

### Email Provider Selection Guide

| Provider | Best For | Key Strength | Pricing Model |
|---|---|---|---|
| **Resend** | Modern apps, React Email | Developer DX, React components as email | Per email (free tier: 3k/mo) |
| **Postmark** | Transactional-only | Industry-best deliverability, dedicated IP | Per email (free tier: 100/mo) |
| **AWS SES** | High volume, cost-sensitive | Cheapest at scale ($0.10/1000 emails) | Per email |
| **SendGrid** | Marketing + Transactional | Full marketing suite, analytics | Tiered plans |
| **Plunk** | Self-hostable, open-source | Full control, no vendor lock-in | Free (self-hosted) |

**Recommendation**: Use **Resend** for most new projects (best DX with React Email). Use **Postmark** for mission-critical transactional emails. Use **AWS SES** for high-volume (10k+/day) cost optimization.

---

### 1. React Email Templates

```tsx
// emails/welcome.tsx
import {
  Body, Button, Container, Head, Heading,
  Html, Img, Link, Preview, Section, Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  username: string;
  loginUrl: string;
}

export default function WelcomeEmail({ username, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to our platform, {username}!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src="https://yourdomain.com/logo.png" width={48} height={48} alt="Logo" />
          <Heading style={heading}>Welcome, {username}! 🎉</Heading>
          <Text style={text}>
            We're thrilled to have you on board. Your account is ready.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={loginUrl}>
              Get Started
            </Button>
          </Section>
          <Text style={footer}>
            If you didn't create this account, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '40px 20px', borderRadius: '8px', maxWidth: '560px' };
const heading = { fontSize: '24px', fontWeight: '600' as const, color: '#1a1a1a', margin: '24px 0 16px' };
const text = { fontSize: '16px', lineHeight: '26px', color: '#484848' };
const buttonContainer = { textAlign: 'center' as const, margin: '32px 0' };
const button = { backgroundColor: '#5046e5', borderRadius: '6px', color: '#fff', fontSize: '16px', padding: '12px 24px', textDecoration: 'none' };
const footer = { fontSize: '13px', color: '#999', marginTop: '32px' };
```

---

### 2. Sending Emails with Resend

```typescript
// lib/email.ts
import { Resend } from 'resend';
import WelcomeEmail from '@/emails/welcome';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(to: string, username: string) {
  const { data, error } = await resend.emails.send({
    from: 'Your App <noreply@yourdomain.com>',
    to,
    subject: `Welcome to Our Platform, ${username}!`,
    react: WelcomeEmail({ username, loginUrl: 'https://app.yourdomain.com/login' }),
    // Optional: plain text fallback
    text: `Welcome ${username}! Get started at https://app.yourdomain.com/login`,
    // Optional: tags for analytics
    tags: [
      { name: 'category', value: 'onboarding' },
    ],
  });

  if (error) {
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }

  return data;
}
```

---

### 3. Email Queue for High-Volume

```typescript
// queues/email-queue.ts
import { Queue, Worker } from 'bullmq';
import { sendEmail } from '@/lib/email';

// Queue definition
export const emailQueue = new Queue('emails', {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 86400 }, // Keep for 24h
    removeOnFail: { age: 604800 },    // Keep failed for 7 days
  },
});

// Worker (separate process)
const emailWorker = new Worker('emails', async (job) => {
  const { type, to, data } = job.data;

  switch (type) {
    case 'welcome':
      await sendWelcomeEmail(to, data.username);
      break;
    case 'password-reset':
      await sendPasswordResetEmail(to, data.resetToken);
      break;
    case 'invoice':
      await sendInvoiceEmail(to, data.invoiceId);
      break;
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}, {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
  concurrency: 5,  // Process 5 emails at a time
  limiter: { max: 50, duration: 1000 }, // Max 50 emails/second (respect provider limits)
});

// Enqueue email from API route
export async function queueEmail(type: string, to: string, data: Record<string, unknown>) {
  await emailQueue.add(type, { type, to, data });
}
```

---

### 4. Email Deliverability Setup

#### DNS Records Required
```
# SPF — Authorize sending servers
TXT  @  "v=spf1 include:_spf.resend.com ~all"

# DKIM — Cryptographic signature
CNAME  resend._domainkey  resend._domainkey.yourdomain.com

# DMARC — Policy for failed authentication
TXT  _dmarc  "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100"

# Return-Path (custom bounce domain)
CNAME  bounce  feedback-smtp.us-east-1.amazonses.com
```

#### Deliverability Checklist
- [ ] SPF record configured and verified
- [ ] DKIM signing enabled and verified
- [ ] DMARC policy set to at least `p=quarantine`
- [ ] Custom `From` domain (not `@gmail.com` or `@resend.dev`)
- [ ] List-Unsubscribe header present in all marketing emails
- [ ] Bounce handling configured (remove invalid addresses)
- [ ] Complaint feedback loop registered with major ISPs
- [ ] Email content passes spam filter checks (no ALL CAPS, excessive links)

---

### 5. In-App Notification System

```typescript
// db/schema — Notification table (Drizzle ORM)
import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'info' | 'warning' | 'success' | 'error'
  title: text('title').notNull(),
  message: text('message').notNull(),
  actionUrl: text('action_url'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// API: Mark notification as read
export async function markAsRead(notificationId: string, userId: string) {
  await db.update(notifications)
    .set({ isRead: true })
    .where(and(
      eq(notifications.id, notificationId),
      eq(notifications.userId, userId),
    ));
}

// API: Get unread count
export async function getUnreadCount(userId: string): Promise<number> {
  const [result] = await db.select({ count: count() })
    .from(notifications)
    .where(and(
      eq(notifications.userId, userId),
      eq(notifications.isRead, false),
    ));
  return result.count;
}
```

```tsx
// components/notification-bell.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';

export function NotificationBell() {
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => fetch('/api/notifications/unread-count').then(r => r.json()),
    refetchInterval: 30_000, // Poll every 30 seconds
  });

  return (
    <button className="notification-bell" aria-label={`${unreadCount ?? 0} unread notifications`}>
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
      )}
    </button>
  );
}
```

---

### 6. Unsubscribe & Compliance

```typescript
// Mandatory headers for CAN-SPAM/GDPR compliance
const emailHeaders = {
  'List-Unsubscribe': '<https://app.yourdomain.com/unsubscribe?token=xxx>',
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
};

// One-click unsubscribe endpoint
export async function POST(request: Request) {
  const { token } = await request.json();
  const decoded = verifyUnsubscribeToken(token);
  await db.update(emailPreferences)
    .set({ unsubscribed: true, unsubscribedAt: new Date() })
    .where(eq(emailPreferences.userId, decoded.userId));
  return new Response('Unsubscribed', { status: 200 });
}
```

---

### 7. Mobile Push Notifications & iOS Live Activities

```typescript
import * as Notifications from 'expo-notifications';

// Register for push tokens (Expo Push / FCM / APNs)
export async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;
  return (await Notifications.getExpoPushTokenAsync()).data;
}
```
- **Expo Push & FCM**: Send batched push notifications with deep links, actions, and custom data payloads.
- **iOS Live Activities / Dynamic Island**: Update real-time status (orders, deliveries, live events) using ActivityKit.
- **Push Token Lifecycle**: Save push tokens to database associated with `userId`; handle token rotation and app reinstall events.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Problem | Correct Approach |
|---|---|---|
| Sending email synchronously in API routes | Slow response times, timeout risk | Queue emails with BullMQ/Inngest |
| Using `@gmail.com` as sender | Poor deliverability, spam filters | Use custom domain with SPF/DKIM |
| No plain-text fallback | Emails may display incorrectly | Always include `text` alongside HTML |
| Hardcoded email content | Can't update without deploys | Use templates with dynamic variables |
| No unsubscribe link | CAN-SPAM violation, ISP blocking | Always include List-Unsubscribe header |
| Sending passwords in email | Security vulnerability | Send one-time reset links with expiry |

---

### Integration with Other Skills

- `saas-billing` — Payment receipt emails, failed payment dunning sequences
- `saas-architect` — Team invitation emails, workspace notifications
- `authentication-identity-expert` — Password reset emails, email verification, MFA codes
- `mobile-expo-expert` — Unified notification strategy (email + push + in-app)
- `async-queue-temporal-expert` — Email queue workers with BullMQ/Inngest
- `production-ready-hardener` — Email deliverability audit before launch

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan tingkat produksi untuk membangun sistem pengiriman email yang andal dan pipeline notifikasi terpadu. Mencakup **Resend**, **Postmark**, **AWS SES**, mesin template **React Email** / **MJML**, **deliverabilitas email** (SPF, DKIM, DMARC), **sistem notifikasi in-app** (bell icon, toast, pusat notifikasi), **alur email berbasis webhook**, **antrean email** dengan BullMQ/Inngest, dan kepatuhan **CAN-SPAM/GDPR**.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Menyiapkan email transaksional (selamat datang, reset password, invoice, undangan tim).
- Membangun template email dengan React Email atau MJML.
- Mengintegrasikan Resend, Postmark, SendGrid, atau AWS SES.
- Mengimplementasikan sistem notifikasi in-app (bell real-time, toast, pusat notifikasi).
- Mengonfigurasi deliverabilitas email (SPF, DKIM, DMARC).
- Membangun sistem antrean email untuk pengiriman volume tinggi.
- Mengimplementasikan manajemen unsubscribe dan kepatuhan regulasi.

### Panduan Pemilihan Provider Email

| Provider | Terbaik Untuk | Kekuatan Utama | Model Harga |
|---|---|---|---|
| **Resend** | Aplikasi modern, React Email | DX developer terbaik, komponen React sebagai email | Per email (gratis: 3k/bulan) |
| **Postmark** | Hanya transaksional | Deliverabilitas terbaik di industri, IP dedicated | Per email (gratis: 100/bulan) |
| **AWS SES** | Volume tinggi, hemat biaya | Termurah di skala besar ($0.10/1000 email) | Per email |
| **SendGrid** | Marketing + Transaksional | Suite marketing lengkap, analitik | Paket bertingkat |

**Rekomendasi**: Gunakan **Resend** untuk kebanyakan proyek baru (DX terbaik dengan React Email). Gunakan **Postmark** untuk email transaksional misi-kritis. Gunakan **AWS SES** untuk optimasi biaya volume tinggi (10k+/hari).

### Notifikasi Push Mobile & iOS Live Activities
- **Expo Push & FCM**: Kirim notifikasi push masal dengan payload kustom, aksi tombol, dan deep linking ke rute aplikasi (Expo Router).
- **iOS Live Activities**: Tampilkan status dinamis secara real-time pada Dynamic Island dan Lock Screen iOS menggunakan ActivityKit.
- **Siklus Hidup Push Token**: Simpan token push ke database per `userId` dan tangani event rotasi token saat instal ulang aplikasi.

### Kesalahan Umum yang Harus Dihindari

| Anti-Pola | Masalah | Pendekatan yang Benar |
|---|---|---|
| Mengirim email secara sinkron di API route | Waktu respons lambat, risiko timeout | Antrean email dengan BullMQ/Inngest |
| Menggunakan `@gmail.com` sebagai pengirim | Deliverabilitas buruk, filter spam | Gunakan domain kustom dengan SPF/DKIM |
| Tidak ada fallback teks biasa | Email mungkin tampil tidak benar | Selalu sertakan `text` di samping HTML |
| Tidak ada link unsubscribe | Pelanggaran CAN-SPAM, pemblokiran ISP | Selalu sertakan header List-Unsubscribe |

### Integrasi dengan Skill Lain

- `saas-billing` — Email kuitansi pembayaran, sekuens dunning gagal bayar
- `saas-architect` — Email undangan tim, notifikasi workspace
- `authentication-identity-expert` — Email reset password, verifikasi email, kode MFA
- `async-queue-temporal-expert` — Worker antrean pengiriman email & push dengan BullMQ/Inngest
- `production-ready-hardener` — Audit deliverabilitas email sebelum peluncuran