---
name: senior-frontend
description: "Frontend development for React 19, Next.js 15, TypeScript, and Tailwind CSS v4 / Pengembangan frontend dengan React 19, Next.js 15, TypeScript, dan Tailwind CSS v4."
author: "Roedy Rustam"
version: "4.3.0"
---

# Senior Frontend Specialist (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production-grade frontend development patterns, performance optimization, and modern ecosystem integrations for React 19 / Next.js 15 applications with Tailwind CSS v4 and TypeScript. Covers React 19 Compiler, Partial Prerendering (PPR), View Transitions API, and SPA/MPA hybrid strategies with automated self-healing testing loops.

### Orchestration & Integration
- `design-system-architect`: For building robust UI components (Radix, Base UI, shadcn) and design tokens.
- `tailwind-expert`: For styling and custom @theme configurations.
- `svg-animation-motion-expert`: For advanced animations, GSAP timelines, and motion physics.
- `nextjs-app-router-expert`: For RSC, caching, and Next.js routing patterns.
- `state-management-expert`: For client-side state (Zustand, Jotai).
- `tanstack-query-expert`: For advanced data fetching and server state caching.
- `spa-orchestrator`: For Single-Page Application architectures.
- `mpa-orchestrator`: For Multi-Page Application architectures.
- `autonomous-tdd-debugger`: For automated unit/component test execution and stack-trace self-healing.
- `anti-slop`: For enforcing complete, stub-free component implementations and zero syntax narration comments.

### Trigger Conditions
- Scaffold a new React or Next.js 15 project with TypeScript and Tailwind CSS v4.
- Generate new components, custom hooks, or Server Actions.
- Analyze and optimize bundle sizes and Core Web Vitals.
- Implement advanced React 19 patterns (`useActionState`, `useOptimistic`, `use()`).
- Build SPAs — coordinate with `spa-orchestrator`.
- Ensure accessibility compliance (WCAG 2.2) and testing.

### Technical Guidelines & Best Practices

#### 1. Next.js 15: Server vs Client Components
Use **Server Components** by default for performance and SEO. Use `'use client'` strictly for:
- State (`useState`, `useEffect`), event handlers (`onClick`), browser APIs.
- Interactive UI needing client hydration.

*Next.js 15.2+ Requirements:*
- Await `Promise`-based `params` and `searchParams` before accessing properties.
- Use **Partial Prerendering (PPR)** natively. Wrap dynamic sections in `<Suspense>`.

#### 2. React 19 Compiler & Hooks
Do not use `useMemo`, `useCallback`, or `React.memo` unless explicitly required; rely on the React 19 compiler.

**Mandatory Hooks:**
- **`useActionState`**: Manage form state, pending indicators, and action results with Server Actions.
- **`useOptimistic`**: Update UI instantly before server confirmation.
- **`useFormStatus`**: Read form submission state in child components.
- **`use(promise)`**: Unwrap promises or context inside render with Suspense.

#### 3. View Transitions API
Implement native View Transitions API for smooth page transitions. Use Next.js 15 `<Link viewTransition>` natively.

#### 4. Tailwind CSS v4
Use CSS-first configuration. Define custom tokens with `@theme` and register plugins with `@plugin` in the main CSS file. Never create `tailwind.config.js`.

#### 5. Accessibility (WCAG 2.2) & Self-Healing Testing
- Enforce semantic HTML (`<button>`, `<nav>`, `<main>`, `<article>`).
- Enforce full keyboard navigability and valid `aria-*` labels.
- Run typecheck (`tsc --noEmit`) to verify zero compiler diagnostics.
- Write unit tests using **Vitest** and **React Testing Library**.
- When tests fail, activate `autonomous-tdd-debugger` to self-heal until 100% passing.

#### 6. Architecture Integration
- **SPA (`spa-orchestrator`)**: Use **TanStack Router** for type-safe client routing and **TanStack Query v5** for server state. Never use bare `useEffect` for data fetching.
- **MPA (`mpa-orchestrator`)**: Use **Alpine.js** or **HTMX** for micro-interactions. Apply Progressive Enhancement.

#### 7. Animations & Motion
For web animations, scroll-driven timelines, GSAP choreographies, and Framer Motion spring physics, delegate directly to `svg-animation-motion-expert`.


#### 8. Material Design 3 (M3) Web Integration (https://m3.material.io/)
In modern React 19 / Next.js 15 apps, incorporate Google's official Material Web Components (`@material/web`) or token-mapped headless primitives:
- **Material Web Components**: Use Lit-based web components (`@material/web/button/filled-button.js`, `@material/web/textfield/outlined-text-field.js`) with React 19 native custom element support.
- **Dynamic CSS Variable Theming**: Map tokens dynamically at the root.

#### 9. Sovereign Visual Hierarchy & Scanability Engineering
Every React 19 / Next.js 15 view must demonstrate Linear/Apple-caliber visual hierarchy:
- **Typographic Cadence**: Eyebrows (`text-[11px] font-semibold tracking-wider uppercase text-neutral-500`) -> Hero Titles (`text-3xl md:text-5xl font-bold tracking-tight text-neutral-900 leading-[1.1]`) -> Section Headings (`text-xl md:text-2xl font-semibold tracking-tight`) -> Body (`text-sm md:text-base text-neutral-600 leading-relaxed`).
- **Tabular Figures**: Always wrap metrics, currency, and counters in `tabular-nums`.
- **Single Focal CTA**: Exactly one high-contrast primary button per screen view; secondary actions use subtle/outline treatments.
- **Gestalt Proximity**: Related controls sit within `gap-1.5` (6px); distinct groups sit at `space-y-4` (16px); section boundaries use generous whitespace (`py-16 md:py-24`).
- **Crisp 1px Surface Layering**: Pair `border border-neutral-200/80 dark:border-neutral-800` with subtle directional `shadow-xs` instead of blurry 30px drop-shadows.

```tsx
// Example: Production Component with Sovereign Visual Hierarchy
import { ArrowRight } from 'lucide-react';

interface MetricBannerProps {
  category: string;
  title: string;
  metricValue: string;
  metricLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
}

export function MetricBanner({
  category,
  title,
  metricValue,
  metricLabel,
  onPrimaryAction,
  onSecondaryAction,
}: MetricBannerProps) {
  return (
    <section className="bg-neutral-50/50 dark:bg-neutral-950 py-12 px-6">
      <div className="mx-auto max-w-5xl rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-xs">
        {/* Eyebrow: Context landmark with optical tracking */}
        <span className="text-[11px] font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
          {category}
        </span>

        {/* Title: Punchy authority with tight tracking */}
        <h1 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          {title}
        </h1>

        {/* Metric block with tabular numerals to eliminate horizontal jitter */}
        <div className="mt-6 flex items-baseline gap-3">
          <span className="text-4xl font-extrabold tracking-tight tabular-nums text-neutral-900 dark:text-neutral-50">
            {metricValue}
          </span>
          <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {metricLabel}
          </span>
        </div>

        {/* Actions: Single primary CTA dominance + subtle ghost action */}
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 transition hover:bg-neutral-800 dark:hover:bg-white active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Deploy Pipeline
            <ArrowRight className="h-4 w-4" />
          </button>

          {onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 transition hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-400"
            >
              View Documentation
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Pola pengembangan frontend tingkat produksi, optimasi performa, dan integrasi ekosistem modern untuk aplikasi React 19 / Next.js 15 dengan Tailwind CSS v4 dan TypeScript. Mencakup React 19 Compiler, Partial Prerendering (PPR), View Transitions API, dan strategi hybrid SPA/MPA dengan loop pengujian perbaikan mandiri (self-healing).

### Integrasi Orkestrasi
- `design-system-architect`: Untuk membangun komponen UI yang kuat (Radix, Base UI, shadcn) dan design token.
- `tailwind-expert`: Untuk styling dan konfigurasi @theme kustom.
- `svg-animation-motion-expert`: Untuk animasi web, timeline GSAP, dan fisika spring.
- `nextjs-app-router-expert`: Untuk RSC, caching, dan pola routing Next.js.
- `state-management-expert`: Untuk state client-side (Zustand, Jotai).
- `tanstack-query-expert`: Untuk fetching data lanjutan dan caching server state.
- `spa-orchestrator`: Untuk arsitektur Single-Page Application.
- `mpa-orchestrator`: Untuk arsitektur Multi-Page Application.
- `autonomous-tdd-debugger`: Untuk eksekusi pengujian otomatis dan perbaikan mandiri berdasarkan stack trace terminal.

### Kondisi Pemicu
- Buat proyek React atau Next.js 15 baru dengan TypeScript dan Tailwind CSS v4.
- Buat komponen baru, custom hooks, atau Server Actions.
- Analisis dan optimalkan ukuran bundle dan Core Web Vitals.
- Terapkan pola React 19 lanjutan (`useActionState`, `useOptimistic`, `use()`).
- Bangun SPA — koordinasikan dengan `spa-orchestrator`.
- Pastikan kepatuhan aksesibilitas (WCAG 2.2) dan pengujian.

### Panduan Teknis & Praktik Terbaik

#### 1. Next.js 15: Server vs Client Components
Gunakan **Server Components** secara default. Gunakan `'use client'` hanya untuk:
- State (`useState`, `useEffect`), event handler, API browser.
- UI interaktif yang membutuhkan hidrasi klien.

*Persyaratan Next.js 15.2+:*
- Wajib `await` pada `params` dan `searchParams` yang kini bertipe `Promise`.
- Gunakan **Partial Prerendering (PPR)** secara native. Bungkus bagian dinamis dengan `<Suspense>`.

#### 2. React 19 Compiler & Hook Baru
Jangan gunakan `useMemo`, `useCallback`, atau `React.memo` kecuali sangat diperlukan; andalkan compiler React 19.

**Hook Wajib:**
- **`useActionState`**: Kelola state form, indikator loading, dan hasil action dengan Server Actions.
- **`useOptimistic`**: Perbarui UI secara instan sebelum server mengonfirmasi.
- **`useFormStatus`**: Baca status form di dalam komponen anak.
- **`use(promise)`**: Buka promise atau context langsung di dalam render dengan Suspense.

#### 3. View Transitions API
Terapkan View Transitions API bawaan browser untuk transisi halaman. Gunakan `<Link viewTransition>` pada Next.js 15.

#### 4. Tailwind CSS v4
Gunakan konfigurasi CSS-first. Definisikan token kustom dengan `@theme` dan plugin dengan `@plugin` di file CSS utama (lihat `tailwind-expert`). Jangan pernah membuat file `tailwind.config.js`.

#### 5. Aksesibilitas (WCAG 2.2) & Pengujian Self-Healing
- Wajib gunakan HTML semantik (`<button>`, `<nav>`, `<main>`).
- Wajib pastikan navigasi keyboard dengan label `aria-*` yang valid.
- Jalankan pemeriksaan tipe (`tsc --noEmit`) untuk memastikan nol eror diagnostik.
- Tulis pengujian unit dengan **Vitest** dan **React Testing Library**.
- Jika pengujian gagal, aktifkan `autonomous-tdd-debugger` untuk memulihkan kode hingga 100% lolos.

#### 6. Integrasi Arsitektur
- **SPA (`spa-orchestrator`)**: Gunakan **TanStack Router** untuk routing klien dan **TanStack Query v5** untuk server state. Jangan gunakan `useEffect` murni untuk fetching data.
- **MPA (`mpa-orchestrator`)**: Gunakan **Alpine.js** atau **HTMX** untuk interaksi mikro. Terapkan Progressive Enhancement.

#### 7. Animasi & Motion
Untuk animasi web, timeline scroll-driven, koreografi GSAP, dan fisika spring Framer Motion, delegasikan langsung ke `svg-animation-motion-expert`.

#### 8. Integrasi Web Material Design 3 (M3) (https://m3.material.io/)
Pada aplikasi React 19 / Next.js 15 modern, terapkan komponen web resmi Google (`@material/web`) atau primitif headless yang dipetakan ke token M3:
- **Komponen Material Web**: Manfaatkan komponen berbasis Lit (`@material/web`) yang didukung secara native oleh React 19 tanpa wrapper tambahan.
- **Theming Variabel CSS Dinamis**: Terapkan token M3 (`--md-sys-color-primary`, `--md-sys-color-surface-container`) pada elemen root untuk menjamin paritas kontras WCAG di seluruh komponen antarmuka.

#### 9. Rekayasa Hierarki Visual & Kemampuan Pindai
Setiap tampilan React 19 / Next.js 15 wajib memancarkan hierarki visual kaliber Stripe/Linear:
- **Irama Tipografi**: Eyebrow (`text-[11px] font-semibold tracking-wider uppercase text-neutral-500`) -> Judul Utama (`text-3xl md:text-5xl font-bold tracking-tight text-neutral-900 leading-[1.1]`) -> Subjudul (`text-xl md:text-2xl font-semibold tracking-tight`) -> Body (`text-sm md:text-base text-neutral-600 leading-relaxed`).
- **Angka Tabular Wajib**: Selalu terapkan `tabular-nums` pada metrik, saldo mata uang, dan pencacah data.
- **Dominasi Single Primary CTA**: Maksimal satu tombol utama kontras tinggi per layar; aksi sekunder menggunakan gaya subtle/outline.
- **Kedekatan Gestalt (Proximity)**: Kontrol dan label terhubung duduk berjarak rapat `gap-1.5` (6px); batas antar-seksi menggunakan ruang kosong yang lega (`py-16 md:py-24`).
- **Pelapisan Permukaan 1px Tajam**: Padukan border tajam `border border-neutral-200/80 dark:border-neutral-800` dengan micro-shadow terarah `shadow-xs` alih-alih bayangan hitam buram 30px.
