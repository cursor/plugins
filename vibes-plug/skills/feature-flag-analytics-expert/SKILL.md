---
name: feature-flag-analytics-expert
description: "Expert guide for Feature Flags & Progressive Rollout (PostHog, LaunchDarkly, GrowthBook), A/B testing orchestration, and canary releases / Panduan ahli Feature Flags, A/B testing, dan rilis bertahap."
author: "Roedy Rustam"
version: "4.3.0"
---

# Feature Flag & Progressive Rollout Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production-grade engineering guide for feature flag management, progressive rollouts (canary releases), A/B testing statistical orchestration, and dynamic server-side/client-side flag evaluation using PostHog, LaunchDarkly, and GrowthBook. Covers zero-flicker server-side bootstrapping in Next.js 15 App Router, deterministic user bucketing, conversion metric tracking, and automated flag lifecycle deprecation.

### Trigger Conditions
- Decoupling software deployment from feature release with instant operational kill-switches.
- Phased rollouts to user cohorts (e.g., internal team -> 5% beta -> 25% canary -> 100% GA).
- Setting up multivariate A/B/n testing experiments with statistical significance monitoring.
- Managing server-side gating in Next.js Server Components, Fastify, or Bun backends.
- Retiring obsolete feature flags to prevent technical debt accumulation.

### Zero-Flicker Server Component Pattern (Next.js 15 / PostHog)

```typescript
// src/lib/posthog-server.ts
import { PostHog } from 'posthog-node';

let posthogClient: PostHog | null = null;

export function getPostHogServer(): PostHog {
  if (!posthogClient) {
    posthogClient = new PostHog(process.env.POSTHOG_API_KEY!, {
      host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

// src/app/dashboard/page.tsx (React Server Component)
import { getPostHogServer } from '@/lib/posthog-server';
import { getCurrentUser } from '@/lib/auth';
import { ModernDashboard } from '@/components/dashboard/ModernDashboard';
import { LegacyDashboard } from '@/components/dashboard/LegacyDashboard';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const posthog = getPostHogServer();

  // Evaluated on the server: zero layout shift, zero client-side flicker
  const isV2Enabled = await posthog.isFeatureEnabled('modern-dashboard-v2', user.id, {
    personProperties: { tier: user.subscriptionTier, region: user.region },
  });

  return isV2Enabled ? <ModernDashboard user={user} /> : <LegacyDashboard user={user} />;
}
```

### Client-Side Integration & Tracking (React 19)

```tsx
// src/components/checkout/CheckoutCTA.tsx
'use client';

import { useFeatureFlagVariantKey } from 'posthog-js/react';
import posthog from 'posthog-js';

export function CheckoutCTA({ orderTotal }: { orderTotal: number }) {
  const variant = useFeatureFlagVariantKey('checkout-cta-variant') || 'control';

  const handleClick = () => {
    posthog.capture('checkout_button_clicked', {
      variant,
      order_total: orderTotal,
      currency: 'USD',
    });
  };

  return (
    <button
      onClick={handleClick}
      className={`rounded-lg px-6 py-3 font-semibold transition ${
        variant === 'emerald-glow'
          ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
          : 'bg-slate-900 text-white hover:bg-slate-800'
      }`}
    >
      {variant === 'emerald-glow' ? 'Complete Secure Checkout' : 'Pay Now'}
    </button>
  );
}
```

### Progressive Rollout Checklist
- [ ] **Deterministic Hashing**: Ensure flag evaluations use stable identifiers (`distinct_id` / user UUID) so users do not oscillate between variants.
- [ ] **Server-Side Fallbacks**: Always provide hardcoded safe fallbacks (`false` or `'control'`) if the flag provider times out (>100ms).
- [ ] **Flag Cleanup Cadence**: Add calendar reminders or GitHub issues to remove flags that reach 100% rollout within 14 days.

## Orchestration & Integration
- **`data-telemetry-expert`**: Bridges flag evaluation events with analytics data pipelines.
- **`nextjs-app-router-expert`**: Implements server-side flag evaluation to avoid Flash of Unstyled Content (FOUC).
- **`e2e-testing-expert`**: Mocks feature flag overrides during automated Playwright tests.
- **`zero-tech-debt-auditor`**: Scans and flags deprecated flags for systematic removal.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan tingkat produksi untuk manajemen *feature flags*, rilis bertahap (*canary rollout*), orkestrasi pengujian A/B berbasis statistik, dan evaluasi fitur dinamis pada sisi server maupun klien menggunakan PostHog, LaunchDarkly, dan GrowthBook. Mencakup evaluasi server-side tanpa kedip (*zero-flicker*) pada Next.js 15 App Router, segmentasi pengguna deterministik, pelacakan metrik konversi, dan pembersihan siklus hidup flag secara berkala.

### Kondisi Pemicu
- Memisahkan deployment kode dari aktivasi fitur dengan tombol *kill-switch* instan.
- Meluncurkan fitur secara bertahap ke kelompok pengguna (misal: tim internal -> 5% beta -> 25% canary -> 100% GA).
- Menjalankan eksperimen A/B/n testing dengan pemantauan signifikansi statistik.
- Mengelola pengecekan fitur di sisi server pada Server Components Next.js atau API Bun/Node.js.
- Membersihkan flag lama untuk mencegah penumpukan utang teknis (*technical debt*).

### Pola Integrasi Server-Side Tanpa Kedip

```typescript
// src/app/checkout/page.tsx
import { getPostHogServer } from '@/lib/posthog-server';
import { auth } from '@/lib/auth';

export default async function CheckoutPage() {
  const session = await auth();
  const posthog = getPostHogServer();

  // Evaluasi langsung di server sebelum HTML dikirim ke browser
  const isSnapBiEnabled = await posthog.isFeatureEnabled(
    'doku-snap-bi-direct',
    session?.user?.id || 'anonymous'
  );

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-2xl font-bold">Checkout Pembayaran</h1>
      {isSnapBiEnabled ? <DirectSnapBiPayment /> : <StandardHostedCheckout />}
    </main>
  );
}
```

### Checklist Implementasi Rollout
- [ ] **Identitas Pengguna Deterministik**: Gunakan ID pengguna yang konsisten agar pengguna yang sama tidak melihat tampilan yang berubah-ubah saat me-refresh halaman.
- [ ] **Nilai Fallback Aman**: Tentukan nilai default aman jika layanan pihak ketiga mengalami latensi atau gangguan jaringan.
- [ ] **Jadwal Pembersihan Flag**: Hapus pengecekan flag dari kode dalam waktu 14 hari setelah fitur diluncurkan 100%.

## Integrasi Orkestrasi
- **`data-telemetry-expert`**: Menghubungkan evaluasi fitur dengan pelacakan event analitik.
- **`nextjs-app-router-expert`**: Mengoptimalkan evaluasi server-side agar tidak terjadi pergeseran tata letak (*layout shift*).
- **`e2e-testing-expert`**: Melakukan mock nilai flag pada pengujian Playwright.
- **`zero-tech-debt-auditor`**: Menemukan dan membersihkan flag yang sudah kedaluwarsa.