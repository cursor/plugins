---
name: nextjs-app-router-expert
description: "Expert guide for Next.js 15 App Router: RSC, Server Actions, Middleware, Parallel/Intercepting Routes, Streaming, and Caching strategies / Panduan ahli untuk Next.js 15 App Router."
author: "Roedy Rustam"
version: "4.3.0"
---

# Next.js 15 App Router Expert

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Execute advanced Next.js 15 App Router architectural patterns: React Server Components (RSC), React 19 Server Actions, Middleware routing, Parallel/Intercepting Routes, Streaming/Suspense, Partial Prerendering (PPR), and explicit cache invalidation.

### Trigger Conditions
- Architecting new Next.js 15 `app/` directory applications.
- Migrating `pages/` directory to App Router.
- Implementing complex UI patterns (modals via Intercepting Routes).
- Debugging caching (`force-cache`, `revalidatePath`, tags).
- Building interfaces requiring Partial Prerendering (PPR) or Streaming.

### Core Architectural Patterns

#### 1. React Server Components (RSC) vs Client Components
- **Default to Server**: All `app/` components are Server Components. No hooks (`useState`) or browser APIs.
- **Client Boundaries**: Add `"use client"` only for interactivity/browser APIs. Push client boundaries down the component tree.
- **Interleaving**: Pass Server Components as `children` to Client Components; do not import Server Components into Client Components directly.

#### 2. React 19 Server Actions
Use Server Actions (`useActionState`) for all mutations. Avoid separate API routes.
```typescript
'use server'

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({ email: z.string().email() });

export async function subscribeUser(prevState: any, formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get('email') });
  
  if (!parsed.success) return { error: 'Invalid email' };

  await db.subscribers.insert({ email: parsed.data.email });
  revalidateTag('subscribers');
  return { success: true };
}
```

#### 3. Parallel & Intercepting Routes (Modals)
Render modals preserving background page context and URL shareability.
- **Intercepting (`(.)[segment]`)**: Matches route on client-side navigation.
- **Parallel (`@modal`)**: Renders simultaneously with `layout.tsx` children.

```
app/
 ├── @modal/
 │   ├── (.)photos/[id]/page.tsx
 │   └── default.tsx
 ├── photos/
 │   └── [id]/page.tsx
 ├── layout.tsx
 └── page.tsx
```

#### 4. Caching & Data Fetching (Next.js 15)
Fetch requests are **not cached by default**. Opt-in explicitly:
```typescript
// Indefinite cache
const res = await fetch('https://api.example.com/data', { cache: 'force-cache' });

// Time-Based Revalidation (ISR)
const res = await fetch('https://api.example.com/data', { next: { revalidate: 3600 } });

// On-Demand Revalidation
const res = await fetch('https://api.example.com/data', { next: { tags: ['collection'] } });
// In server action: revalidateTag('collection')
```

#### 5. Streaming & Partial Prerendering (PPR)
Wrap slow fetches in `<Suspense>` to stream UI instantly:
```tsx
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <SlowRevenueChart />
      </Suspense>
    </main>
  );
}
```

## Orchestration & Integration
- **`senior-frontend`**: Enhances UI/UX with Next.js App Router RSC and Next 15 caching.
- **`js-backend-expert`**: Bridges frontend Server Actions with backend Node.js/Bun architectures.
- **`tanstack-query-expert`**: Manages client-side state hydration from RSC.
- **`performance-web-vitals`**: Optimizes Core Web Vitals using Streaming and PPR.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Terapkan pola arsitektur lanjutan Next.js 15 App Router: React Server Components (RSC), React 19 Server Actions, Middleware, Parallel/Intercepting Routes, Streaming/Suspense, Partial Prerendering (PPR), dan invalidasi cache eksplisit.

### Kondisi Pemicu
- Merancang aplikasi Next.js 15 `app/` direktori baru.
- Migrasi direktori `pages/` ke App Router.
- Implementasi pola UI kompleks (modal via Intercepting Routes).
- Debugging cache (`force-cache`, `revalidatePath`, tags).
- Membangun antarmuka dengan Partial Prerendering (PPR) atau Streaming.

### Pola Arsitektur Inti

#### 1. RSC vs Client Components
- **Default Server**: Semua komponen `app/` adalah Server Components. Tanpa hooks/API browser.
- **Batas Klien**: Tambahkan `"use client"` hanya untuk interaktivitas. Dorong batas klien ke bawah struktur komponen.
- **Interleaving**: Berikan Server Components sebagai `children` ke Client Components; jangan impor langsung.

#### 2. React 19 Server Actions
Gunakan Server Actions (`useActionState`) untuk mutasi. Hindari pembuatan API routes terpisah.
Validasi input di server dengan Zod dan gunakan `revalidateTag` untuk perbarui UI.

#### 3. Parallel & Intercepting Routes
Gunakan untuk modal. Mencegat rute navigasi client-side (URL berubah, modal di atas halaman saat ini). Refresh langsung memuat halaman penuh.

#### 4. Caching di Next.js 15
Fungsi `fetch` **tidak di-cache default**. Aktifkan eksplisit via `{ cache: 'force-cache' }` atau `{ next: { revalidate: 3600 } }`. Gunakan cache tags untuk invalidasi spesifik.

#### 5. Streaming & Partial Prerendering (PPR)
Bungkus pengambilan data lambat dengan `<Suspense>` untuk menampilkan UI awal seketika sambil menunggu data (streaming).

## Integrasi Orkestrasi
- **`senior-frontend`**: Menguatkan UI/UX dengan pemahaman arsitektur RSC dan cache Next 15.
- **`js-backend-expert`**: Menghubungkan Server Actions dengan arsitektur backend Node.js/Bun.
- **`tanstack-query-expert`**: Mengelola hidrasi state client-side dari RSC.
- **`performance-web-vitals`**: Optimalisasi Core Web Vitals menggunakan Streaming dan PPR.