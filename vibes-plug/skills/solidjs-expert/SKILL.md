---
name: solidjs-expert
description: "Expert guide for SolidJS 2 and SolidStart — fine-grained reactivity, signals, createResource, and server-first rendering / Panduan ahli SolidJS 2 dan SolidStart — reaktivitas fine-grained, signals, createResource, dan rendering server-first."
author: "Roedy Rustam"
version: "4.3.0"
---

# SolidJS & SolidStart Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Expert guide for SolidJS 2 and SolidStart, the reactive framework with zero Virtual DOM overhead. Covers fine-grained reactivity primitives (`createSignal`, `createMemo`, `createEffect`), reactive state trees (`createStore`), avoiding reactivity destruction (proper usage of `mergeProps` and `splitProps`), SolidStart server functions (`"use server"`), streaming SSR, and micro-benchmarked UI rendering patterns.

### Trigger Conditions
- Developing high-performance, real-time web applications where Virtual DOM diffing is a bottleneck.
- Choosing SolidJS or SolidStart for low-latency dashboards, streaming financial terminals, or edge-rendered apps.
- Migrating from React to SolidJS while maintaining clean reactive state boundaries.
- Building reactive components with Tailwind CSS v4.

### Core Architectural Rules: SolidJS vs React
1. **Components Run Exactly Once**: A SolidJS component function is a setup function, not a render function. Do NOT write side-effects directly in the function body; place them in `createEffect` or `onMount`.
2. **Never Destructure Props**: Destructuring `const { name } = props` strips reactive getters. Always use `props.name`, `mergeProps(defaultProps, props)`, or `splitProps(props, ['keys'])`.
3. **Control Flow Primitives**: Always use `<Show>`, `<For>`, `<Index>`, and `<Switch>` instead of JavaScript ternary operators or `array.map()` to maximize DOM node reuse.

### Production SolidStart Server Action & Store Pattern

```tsx
// src/components/CartManager.tsx
import { createSignal, createResource, For, Show } from 'solid-js';
import { createStore, produce } from 'solid-js/store';
import { action, json } from '@solidjs/router';

interface CartItem {
  id: string;
  title: string;
  quantity: number;
  priceCents: number;
}

// Server Action executing strictly on the server
export const updateCartServerAction = action(async (formData: FormData) => {
  'use server';
  const itemId = formData.get('itemId') as string;
  const quantity = parseInt(formData.get('quantity') as string, 10);
  // Atomic database update via ORM...
  return json({ success: true, itemId, quantity });
});

export function CartManager() {
  const [store, setStore] = createStore<{ items: CartItem[]; promoCode: string }>({
    items: [
      { id: '1', title: 'Developer Pro License', quantity: 1, priceCents: 9900 }
    ],
    promoCode: ''
  });

  const totalCents = () => store.items.reduce((acc, i) => acc + i.priceCents * i.quantity, 0);

  const incrementItem = (id: string) => {
    setStore(
      'items',
      (item) => item.id === id,
      produce((item) => {
        item.quantity += 1;
      })
    );
  };

  return (
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="text-xl font-bold text-slate-900">Shopping Cart</h2>
      <div class="mt-4 divide-y divide-slate-100">
        <For each={store.items}>
          {(item) => (
            <div class="flex items-center justify-between py-3">
              <span class="font-medium text-slate-800">{item.title}</span>
              <div class="flex items-center gap-3">
                <span class="text-sm text-slate-500">Qty: {item.quantity}</span>
                <button
                  onClick={() => incrementItem(item.id)}
                  class="rounded bg-slate-100 px-2 py-1 text-xs font-semibold hover:bg-slate-200 transition"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </For>
      </div>
      <div class="mt-4 border-t border-slate-100 pt-4 flex justify-between font-bold text-slate-900">
        <span>Total:</span>
        <span class="tabular-nums">${(totalCents() / 100).toFixed(2)}</span>
      </div>
    </div>
  );
}
```

## Orchestration & Integration
- **`performance-web-vitals`**: Leverages Solid's direct DOM manipulation for near-zero INP and top-tier Lighthouse scores.
- **`tailwind-expert`**: Styles Solid components with Tailwind CSS v4 `@theme` design tokens.
- **`state-management-expert`**: Explains fine-grained signal patterns compared to React hooks and Zustand.
- **`typescript-expert`**: Provides type-safe store and props interfaces.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan ahli untuk SolidJS 2 dan SolidStart, framework reaktif tanpa overhead Virtual DOM. Mencakup primitif reaktivitas *fine-grained* (`createSignal`, `createMemo`, `createEffect`), pohon state reaktif (`createStore`), pencegahan hilangnya reaktivitas (penggunaan `mergeProps` dan `splitProps`), fungsi server SolidStart (`"use server"`), streaming SSR, dan pola rendering antarmuka berkecepatan tinggi.

### Kondisi Pemicu
- Membangun aplikasi web dengan tuntutan performa ekstrem di mana proses rekonsiliasi Virtual DOM menjadi beban (*bottleneck*).
- Memilih SolidJS atau SolidStart untuk dashboard analitik real-time atau terminal data streaming.
- Migrasi kode dari React ke SolidJS dengan pemisahan batas reaktivitas yang benar.
- Mengembangkan komponen dengan sistem desain Tailwind CSS v4.

### 3 Hukum Utama Reaktivitas SolidJS
1. **Fungsi Komponen Hanya Dijalankan Sekali**: Berbeda dari React yang mengeksekusi ulang seluruh fungsi komponen saat state berubah, SolidJS hanya menjalankan fungsi komponen satu kali saat inisialisasi. Jangan taruh *side-effect* langsung di badan fungsi; gunakan `createEffect` atau `onMount`.
2. **Jangan Pernah Melakukan Destrukturisasi Props**: Menulis `const { nama } = props` akan memutus getter reaktif. Selalu gunakan `props.nama`, `mergeProps(defaultProps, props)`, atau `splitProps`.
3. **Gunakan Komponen Kontrol Bawaan**: Gunakan `<Show>` dan `<For>` alih-alih `&&` atau `.map()` agar DOM node dapat digunakan kembali secara optimal tanpa rekonsiliasi ulang.

### Contoh Pelestarian Reaktivitas Props

```tsx
// src/components/UserCard.tsx
import { mergeProps, splitProps } from 'solid-js';

interface CardProps {
  name: string;
  role?: string;
  class?: string;
}

export function UserCard(rawProps: CardProps) {
  // Gabungkan nilai default tanpa merusak reaktivitas
  const props = mergeProps({ role: 'Member' }, rawProps);
  
  // Pisahkan styling class dari data bisnis
  const [local, others] = splitProps(props, ['class']);

  return (
    <div class={`rounded-lg border p-4 ${local.class || ''}`} {...others}>
      <h3 class="font-bold">{props.name}</h3>
      <p class="text-sm text-slate-500">{props.role}</p>
    </div>
  );
}
```

## Integrasi Orkestrasi
- **`performance-web-vitals`**: Memaksimalkan manipulasi DOM langsung untuk mencapai responsivitas instan (<10ms).
- **`tailwind-expert`**: Menata gaya komponen Solid dengan utilitas Tailwind CSS v4.
- **`state-management-expert`**: Menjelaskan perbandingan arsitektur signal vs selector Zustand.
- **`typescript-expert`**: Menjaga keamanan tipe pada Store dan Server Actions.