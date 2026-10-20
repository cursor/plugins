---
name: svelte-sveltekit-expert
description: "Expert guide for Svelte 5 (Runes) and SvelteKit 2+ — fine-grained reactivity, server-first architecture, form actions, and SSR/SSG / Panduan ahli Svelte 5 (Runes) dan SvelteKit 2+ — reaktivitas fine-grained, arsitektur server-first, form actions, dan SSR/SSG."
author: "Roedy Rustam"
version: "4.3.0"
---

# Svelte 5 & SvelteKit 2 Expert (Runes Standard 2026)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Comprehensive guide for Svelte 5 and SvelteKit 2+. Focuses on the modern Runes reactivity model (`$state`, `$derived`, `$effect`, `$props`, `$bindable`), server-first architecture, progressive enhancement form actions (`use:enhance`), streaming promises in `+page.server.ts`, and fullstack SSR/SSG/ISR deployment on modern edge platforms.

### Trigger Conditions
- Scaffolding new applications using Svelte 5 and SvelteKit 2.
- Migrating legacy Svelte 3/4 reactive declarations (`let x = 0; $: doubled = x * 2;`) to Svelte 5 Runes.
- Implementing form submissions with server actions and zero-JS fallbacks.
- Streaming large data sets to the client without blocking the initial page render.

### Svelte 5 Runes Architecture

| Rune | Purpose | Svelte 4 Equivalent |
|---|---|---|
| `$state(val)` | Declare reactive state variable | `let val = ...` |
| `$derived(expr)` | Compute cached derived values | `$: val = expr` |
| `$effect(() => {})` | Manage side-effects & subscriptions | `$: { ... }` or lifecycle hooks |
| `$props()` | Define type-safe component props | `export let prop` |
| `$bindable()` | Enable two-way component binding | Direct two-way binding |

### Svelte 5 Component with Modern Runes

```svelte
<!-- src/lib/components/Counter.svelte -->
<script lang="ts">
  interface Props {
    initialCount?: number;
    step?: number;
    onThreshold?: (val: number) => void;
  }

  // Modern Svelte 5 Props Rune with default values
  let { initialCount = 0, step = 1, onThreshold }: Props = $props();

  // Reactive State and Derived Runes
  let count = $state(initialCount);
  let doubled = $derived(count * 2);

  // Side-effect Rune with automatic dependency tracking
  $effect(() => {
    if (count >= 100 && onThreshold) {
      onThreshold(count);
    }
  });
</script>

<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
  <h3 class="text-lg font-bold text-slate-800">Svelte 5 Runes Counter</h3>
  <p class="mt-2 text-slate-600">
    Current: <span class="font-bold tabular-nums text-emerald-600">{count}</span> | 
    Doubled: <span class="font-bold tabular-nums text-slate-900">{doubled}</span>
  </p>
  <div class="mt-4 flex gap-2">
    <button
      onclick={() => (count -= step)}
      class="rounded-lg bg-slate-100 px-4 py-2 font-medium hover:bg-slate-200 transition"
    >
      -{step}
    </button>
    <button
      onclick={() => (count += step)}
      class="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500 transition"
    >
      +{step}
    </button>
  </div>
</div>
```

### SvelteKit 2 Server Actions with Progressive Enhancement

```typescript
// src/routes/tasks/+page.server.ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Streaming promise pattern: do not await slow data here if streaming is desired
  return {
    fastStats: { total: 42 },
    streamedFeed: new Promise((resolve) => setTimeout(() => resolve(['Item A', 'Item B']), 300))
  };
};

export const actions: Actions = {
  createTask: async ({ request }) => {
    const data = await request.formData();
    const title = data.get('title')?.toString().trim();

    if (!title || title.length < 3) {
      return fail(400, { title, error: 'Title must be at least 3 characters long.' });
    }

    // Atomic DB write...
    return { success: true };
  }
};
```

```svelte
<!-- src/routes/tasks/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  let { data, form } = $props();
</script>

<form method="POST" action="?/createTask" use:enhance class="space-y-4 max-w-md">
  {#if form?.error}
    <p class="text-sm font-semibold text-rose-600">{form.error}</p>
  {/if}

  <input
    name="title"
    type="text"
    placeholder="Task title..."
    class="w-full rounded-lg border border-slate-300 p-2.5 text-sm outline-none focus:border-emerald-500"
  />

  <button type="submit" class="rounded-lg bg-emerald-600 px-4 py-2 text-white font-medium hover:bg-emerald-500">
    Add Task
  </button>
</form>
```

## Orchestration & Integration
- **`tailwind-expert`**: Configures Tailwind CSS v4 with SvelteKit `@theme` directives.
- **`performance-web-vitals`**: Harnesses Svelte's compile-time optimization for zero bundle bloat.
- **`e2e-testing-expert`**: End-to-end testing with Playwright for SvelteKit routes.
- **`typescript-expert`**: Type-safe `$types` generation for page servers and actions.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan komprehensif untuk Svelte 5 dan SvelteKit 2+. Berfokus pada model reaktivitas modern berbasis Runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`), arsitektur *server-first*, formulir dengan *progressive enhancement* (`use:enhance`), *streaming promise* pada `+page.server.ts`, dan deployment SSR/SSG/ISR pada platform edge modern.

### Kondisi Pemicu
- Membangun aplikasi baru menggunakan Svelte 5 dan SvelteKit 2.
- Migrasi deklarasi reaktif Svelte 3/4 lawas (`$: x = ...`) ke model Runes Svelte 5.
- Mengimplementasikan pengiriman data formulir menggunakan Server Actions yang tetap berfungsi tanpa JavaScript aktif (*zero-JS fallback*).
- Mengalirkan (*streaming*) data asinkron lambat ke klien tanpa memblokir rendering halaman awal.

### 5 Runes Inti Svelte 5
1. **`$state(nilai)`**: Mendeklarasikan variabel reaktif utama.
2. **`$derived(ekspresi)`**: Menghitung nilai turunan yang di-cache secara otomatis.
3. **`$effect(() => {})`**: Menjalankan efek samping saat dependensi reaktif di dalamnya berubah.
4. **`$props()`**: Menerima props komponen secara type-safe.
5. **`$bindable()`**: Mengaktifkan *two-way binding* eksplisit antar komponen induk dan anak.

### Contoh Form Action dengan Progressive Enhancement

```svelte
<!-- src/routes/kontak/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  let isSubmitting = $state(false);
</script>

<form
  method="POST"
  action="?/kirimPesan"
  use:enhance={() => {
    isSubmitting = true;
    return async ({ update }) => {
      isSubmitting = false;
      await update();
    };
  }}
  class="space-y-4"
>
  <input name="email" type="email" required placeholder="nama@email.com" class="border p-2 rounded w-full" />
  <textarea name="pesan" required placeholder="Tulis pesan Anda..." class="border p-2 rounded w-full"></textarea>
  <button disabled={isSubmitting} class="bg-emerald-600 text-white px-4 py-2 rounded">
    {isSubmitting ? 'Mengirim...' : 'Kirim Pesan'}
  </button>
</form>
```

## Integrasi Orkestrasi
- **`tailwind-expert`**: Mengatur style Tailwind CSS v4 pada template SvelteKit.
- **`performance-web-vitals`**: Memanfaatkan kompilasi efisien Svelte tanpa virtual DOM untuk waktu muat ultra-cepat.
- **`e2e-testing-expert`**: Pengujian integrasi alur form dan rute menggunakan Playwright.
- **`typescript-expert`**: Memastikan integritas tipe data antara file server dan komponen UI.