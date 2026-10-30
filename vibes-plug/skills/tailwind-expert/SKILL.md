---
name: tailwind-expert
description: "Expert guide for Tailwind CSS v4, CSS-first configuration, @theme customization, and modern responsive design / Panduan ahli untuk Tailwind CSS v4, konfigurasi CSS-first, kustomisasi @theme, dan desain responsif modern."
author: "Roedy Rustam"

version: "4.3.0"
---

# Tailwind CSS Expert (v4 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Strict guidelines and best practices for Tailwind CSS v4. Enforces the CSS-first configuration model, `@theme` token definitions, dynamic utilities, and performance optimization via Lightning CSS.

### Trigger Conditions
- Scaffold or configure a Tailwind CSS v4 project.
- Migrate a codebase from Tailwind CSS v3 to v4.
- Implement design tokens via `@theme`.
- Apply 3D transforms, CSS container queries, or `field-sizing`.

## Orchestration & Integration
Integrates tightly with the following skills:
- **`anti-slop`**: Enforces strict anti-slop rules on Tailwind usage (no arbitrary value hacks, accessible focus rings, zero div-soup, and no cliché AI gradients).
- **`senior-frontend`**: Feeds modern CSS capabilities into Next.js/React component architecture.
- **`design-system-architect, senior-frontend`**: Provides the styling primitives for Radix/shadcn-style components.
- **`design-system-architect`**: Establishes the core tokens mapped inside `@theme`.

### Execution Standards

#### 1. CSS-First Architecture
Do NOT create `tailwind.config.js`. Define all configuration inside CSS using the `@theme` directive.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* OKLCH Colors for wide-gamut displays */
  --color-brand-50: oklch(97% 0.02 250);
  --color-brand-500: oklch(55% 0.2 250);

  /* Typography */
  --font-sans: "Inter Variable", system-ui, sans-serif;

  /* Custom breakpoints */
  --breakpoint-3xl: 112rem;
}

/* Register plugins */
@plugin "@tailwindcss/typography";
```

#### 2. Advanced Utilities
Utilize v4-native features instead of custom CSS where possible:
- **3D Transforms**: Use `perspective-1000`, `rotate-x-12`, `transform-3d`, `backface-hidden`.
- **Color Mix**: Use inline mixing: `text-[color-mix(in_oklch,blue_70%,white)]`.
- **Container Queries**: Use `@container` on the parent, `@sm:grid-cols-2` on children.
- **Auto-sizing**: Use `field-sizing-content` for dynamically sizing textareas.

#### 3. Migration (v3 to v4)
When upgrading older codebases:
1. Run `npx @tailwindcss/upgrade` automatically.
2. Manually verify `tailwind.config.js` logic is perfectly translated to `@theme` CSS variables.
3. Replace deprecated `addVariant` plugin code with `@variant` CSS directives:
   ```css
   @variant hocus (&:hover, &:focus);
   @variant dark (&:where(.dark, .dark *));
   ```

#### 4. Performance Directives
- **Zero Configuration**: Rely on v4's automatic content detection. Do not manually specify content paths.
- **Specificity**: Use `@layer utilities` strictly when custom CSS requires Tailwind's specificity tier.
- **No `@apply` Abuse**: Avoid `@apply` in loops or highly repeated components; use HTML utility classes to leverage Lightning CSS tree-shaking.

#### 5. Bootstrap to Tailwind Migration Guide
1. **Analyze the Legacy Structure**:
   - Identify the version of Bootstrap being used.
   - Locate custom CSS files that override Bootstrap defaults.
   - Identify interactive components (modals, dropdowns, tooltips, tabs, carousels) that rely on Bootstrap's JavaScript or jQuery.
2. **Setup Modern Tools**:
   - Ensure **Tailwind CSS v4** is properly set up in the project (e.g., via CDN for simple projects, or PostCSS/Vite for build steps).
   - Inject **Alpine.js** via CDN or module bundler to handle interactivity.
3. **Migration Strategy**:
   - **Grid & Layout**: Convert Bootstrap grids (`container`, `row`, `col-*`) to Tailwind flexbox (`flex`, `flex-col`, `gap-*`) or CSS Grid (`grid`, `grid-cols-*`).
   - **Spacing & Typography**: Map Bootstrap spacing (`m-3`, `p-4`) to Tailwind spacing (`m-4`, `p-6`—noting scale differences). Map typography utilities (`text-center`, `font-weight-bold`) to Tailwind equivalents (`text-center`, `font-bold`).
   - **Colors**: Update Bootstrap semantic colors (`primary`, `success`, `danger`) to Tailwind color palettes (e.g., `blue-600`, `green-500`, `red-500`) or define custom themes in CSS variables for Tailwind v4.
   - **Components**: Rebuild Bootstrap components (cards, buttons, alerts, navbars) using Tailwind utility classes to match or improve the original design.
4. **Interactivity with Alpine.js**:
   - Remove jQuery and Bootstrap JS dependencies.
   - Replace interactive Bootstrap components with Alpine.js data and directives.
   - **Dropdowns**: Use `x-data="{ open: false }"` and `@click="open = !open"`.
   - **Modals**: Use Alpine.js to manage the open state and handle background overlays and click-away events (`@click.outside`).
   - **Tabs**: Manage active tab state with `x-data="{ tab: 'home' }"`.
5. **UI/UX Modernization & Skill Integration**:
   - Do NOT just do a 1:1 translation of Bootstrap classes. The goal is to elevate the design.
   - You MUST orchestrate and apply guidelines from other UI/UX skills (`design-system-architect`, `ui-ux-pro-max`, and `hig`).
   - Implement Human Interface Guidelines (HIG) principles: Hierarchy, Harmony, and Consistency.
   - Use vibrant colors, smooth micro-animations, glassmorphism (if appropriate), and modern typography to "WOW" the user.
6. **Quality Assurance**:
   - Verify that responsive design behaves correctly across breakpoints (`sm:`, `md:`, `lg:`).
   - Ensure interactive components (modals, dropdowns) feel premium with Alpine.js transitions (`x-transition`).

#### 6. Sovereign Anti-Slop Directives for Tailwind v4
Enforces zero-tolerance code standards for utility-first styling:
- **No Arbitrary Value Hacks**: Ban arbitrary values (e.g., `p-[13px]`, `w-[372px]`, `text-[15px]`) when canonical spacing or typography scales exist. If a custom dimension is truly needed, declare it once in `@theme` as a semantic CSS variable token.
- **Accessible Focus Indicator Law**: Never use `focus:outline-none` alone. You MUST pair it with `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-<color>` or an explicit high-contrast focus indicator.
- **Zero Div-Soup Wrapper Bloat**: Do not nest redundant layout wrappers (`<div className="w-full"><div className="flex">...</div></div>`). Leverage modern CSS grid and subgrid directly on semantic containers (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`).
- **Ban AI Gradient Slop**: Never apply generic cliché AI gradients (`bg-gradient-to-r from-purple-600 to-indigo-600` or `from-violet-500 to-fuchsia-500`) as default backgrounds. Use deliberate, brand-specific color palettes using OKLCH color spaces.
- **Mandatory 5 Interactive States**: Interactive elements (buttons, inputs, links) must declare utility variants for all 5 lifecycle states: default, hover (`hover:`), active/press (`active:`), keyboard focus (`focus-visible:`), and disabled (`disabled:pointer-events-none disabled:opacity-50`).
- **No Responsive Layout Clipping**: Avoid fixed hardcoded widths (`w-[600px]`); use fluid responsive primitives (`max-w-2xl w-full mx-auto`) and container queries (`@container`) to ensure zero horizontal scroll on mobile viewports.


#### 8. Sovereign Visual Hierarchy Utilities & Recipes
Implement production-grade visual hierarchy using concise, reusable Tailwind v4 utility clusters:

- **Modular Typographic Scale with Optical Tracking**:
  - *Eyebrow Label*: `text-[11px] font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400`
  - *Hero / Display 1*: `text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-[1.08]`
  - *Section Title (H2)*: `text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 leading-snug`
  - *Card Title (H3)*: `text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-100`
  - *Body Paragraph*: `text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed`
  - *Tabular Metric*: `text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-neutral-900 dark:text-neutral-50`

- **60-30-10 Color Layering Recipes**:
  - *60% Canvas*: `bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100`
  - *30% Surface Cards*: `bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs`
  - *10% Primary CTA (Single Focal Accent)*: `bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2`
  - *Secondary Action (Ghost/Outline)*: `border border-neutral-200 dark:border-neutral-700 bg-transparent text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800`

- **Gestalt Proximity Spacing Clusters**:
  - *Label to Input*: `flex flex-col gap-1.5`
  - *Form Fieldsets*: `space-y-4` or `space-y-6`
  - *Card Padding vs Child Gap*: `p-6 space-y-4` (container padding > child separation)
  - *Page Sections*: `py-16 sm:py-24 space-y-12`

#### 7. Material Design 3 (M3) System Mapping in Tailwind v4
Tailwind CSS v4 seamlessly implements Google Material Design 3 (M3) tokens inside `@theme` without external UI dependencies:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* M3 System Color Roles (HCT / OKLCH mapped) */
  --color-md-primary:               oklch(55% 0.22 270);
  --color-md-on-primary:            oklch(100% 0 0);
  --color-md-primary-container:     oklch(90% 0.08 270);
  --color-md-on-primary-container:  oklch(20% 0.12 270);

  --color-md-secondary-container:    oklch(92% 0.03 270);
  --color-md-on-secondary-container: oklch(22% 0.06 270);

  /* M3 Surface Container Tiers (Zero-Shadow Elevation) */
  --color-md-surface:               oklch(98% 0.005 270);
  --color-md-surface-container-low: oklch(96% 0.008 270);
  --color-md-surface-container:     oklch(94% 0.012 270);
  --color-md-surface-container-high:oklch(92% 0.015 270);

  --color-md-outline:               oklch(55% 0.02 270);
  --color-md-outline-variant:       oklch(82% 0.015 270);

  /* M3 Shape Families */
  --radius-md-xs:   4px;
  --radius-md-sm:   8px;
  --radius-md-md:   12px;
  --radius-md-lg:   16px;
  --radius-md-xl:   28px;
  --radius-md-full: 9999px;

  /* M3 Elevation Shadows */
  --shadow-md-elevation-1: 0 1px 3px 1px rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.30);
  --shadow-md-elevation-2: 0 2px 6px 2px rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.30);
  --shadow-md-elevation-3: 0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px 0 rgba(0, 0, 0, 0.30);
}
```

**M3 Component Patterns with Tailwind v4 Utilities:**
```html
<!-- M3 Filled Button (High Emphasis Primary CTA) -->
<button class="bg-md-primary text-md-on-primary rounded-md-full px-6 h-10 font-medium inline-flex items-center gap-2 transition hover:brightness-110 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 disabled:opacity-38 disabled:pointer-events-none">
  Primary Action
</button>

<!-- M3 Tonal Button (Medium-High Emphasis Secondary) -->
<button class="bg-md-secondary-container text-md-on-secondary-container rounded-md-full px-6 h-10 font-medium inline-flex items-center gap-2 transition hover:brightness-95 active:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2">
  Tonal Action
</button>

<!-- M3 Elevated Card with Surface Container Hierarchy -->
<div class="bg-md-surface-container rounded-md-lg p-6 shadow-md-elevation-1 hover:shadow-md-elevation-2 transition-shadow">
  <h3 class="text-lg font-medium text-slate-900 dark:text-slate-100">Elevated Card</h3>
  <p class="text-sm text-slate-600 dark:text-slate-400 mt-2">Layered with M3 tonal surface container and ambient elevation.</p>
</div>
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan ketat dan praktik terbaik untuk Tailwind CSS v4. Memaksa penggunaan model konfigurasi CSS-first, definisi token `@theme`, utilitas dinamis, dan optimasi performa melalui Lightning CSS.

### Kondisi Pemicu
- Menyiapkan atau mengonfigurasi proyek Tailwind CSS v4.
- Migrasi codebase dari Tailwind CSS v3 ke v4.
- Implementasi design token via `@theme`.
- Menggunakan 3D transform, container query, atau `field-sizing`.

## Integrasi Orkestrasi
Terintegrasi erat dengan skill berikut:
- **`anti-slop`**: Menegakkan aturan anti-slop ketat pada penggunaan Tailwind (tanpa hack nilai arbitrer, accessible focus ring wajib, tanpa div-soup, dan larangan gradien AI generik).
- **`senior-frontend`**: Menyuplai kapabilitas CSS modern ke dalam arsitektur komponen Next.js/React.
- **`design-system-architect, senior-frontend`**: Menyediakan primitif styling untuk komponen gaya Radix/shadcn.
- **`design-system-architect`**: Membangun token utama yang dipetakan di dalam `@theme`.

### Standar Eksekusi

#### 1. Arsitektur CSS-First
JANGAN membuat `tailwind.config.js`. Definisikan semua konfigurasi di dalam CSS menggunakan direktif `@theme`.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Warna OKLCH untuk layar wide-gamut */
  --color-brand-50: oklch(97% 0.02 250);
  --color-brand-500: oklch(55% 0.2 250);

  /* Tipografi */
  --font-sans: "Inter Variable", system-ui, sans-serif;
}

/* Registrasi plugin */
@plugin "@tailwindcss/typography";
```

#### 2. Utilitas Lanjutan
Gunakan fitur bawaan v4 alih-alih CSS kustom:
- **3D Transform**: Gunakan `perspective-1000`, `rotate-x-12`, `transform-3d`, `backface-hidden`.
- **Color Mix**: Gunakan `text-[color-mix(in_oklch,blue_70%,white)]`.
- **Container Queries**: Gunakan `@container` pada induk, `@sm:grid-cols-2` pada anak.
- **Auto-sizing**: Gunakan `field-sizing-content` untuk textarea agar ukurannya otomatis menyesuaikan.

#### 3. Migrasi (v3 ke v4)
Saat memperbarui codebase lama:
1. Jalankan `npx @tailwindcss/upgrade` secara otomatis.
2. Verifikasi manual logika `tailwind.config.js` agar diterjemahkan sempurna ke variabel CSS `@theme`.
3. Ganti plugin `addVariant` lama dengan direktif CSS `@variant`:
   ```css
   @variant hocus (&:hover, &:focus);
   @variant dark (&:where(.dark, .dark *));
   ```

#### 4. Arahan Performa
- **Konfigurasi Nol**: Andalkan deteksi konten otomatis v4. Jangan tentukan path konten secara manual.
- **Spesifisitas**: Gunakan `@layer utilities` secara ketat hanya jika CSS kustom memerlukan tingkat spesifisitas Tailwind.
- **Dilarang Menyalahgunakan `@apply`**: Hindari `@apply` pada loop atau komponen berulang; gunakan kelas utilitas di HTML untuk memaksimalkan tree-shaking Lightning CSS.

#### 5. Panduan Migrasi Bootstrap ke Tailwind
1. **Analisis Struktur Lama**:
   - Identifikasi versi Bootstrap yang digunakan.
   - Temukan file CSS kustom yang menimpa (override) default Bootstrap.
   - Identifikasi komponen interaktif (modal, dropdown, tooltip, tab, carousel) yang mengandalkan JavaScript Bootstrap atau jQuery.
2. **Setup Tools Modern**:
   - Pastikan **Tailwind CSS v4** disiapkan dengan benar di proyek (misalnya, melalui CDN untuk proyek sederhana, atau PostCSS/Vite jika ada build step).
   - Masukkan **Alpine.js** melalui CDN atau module bundler untuk menangani interaktivitas.
3. **Strategi Migrasi**:
   - **Grid & Layout**: Ubah grid Bootstrap (`container`, `row`, `col-*`) menjadi flexbox Tailwind (`flex`, `flex-col`, `gap-*`) atau CSS Grid (`grid`, `grid-cols-*`).
   - **Spacing & Tipografi**: Petakan spasi Bootstrap (`m-3`, `p-4`) ke Tailwind (`m-4`, `p-6`—perhatikan perbedaan skala). Petakan utilitas teks (`text-center`, `font-weight-bold`) ke padanan Tailwind (`text-center`, `font-bold`).
   - **Warna**: Perbarui warna semantik Bootstrap (`primary`, `success`, `danger`) ke palet warna Tailwind (misal: `blue-600`, `green-500`, `red-500`) atau definisikan tema kustom di variabel CSS untuk Tailwind v4.
   - **Komponen**: Bangun ulang komponen Bootstrap (card, button, alert, navbar) menggunakan kelas utilitas Tailwind untuk mencocokkan atau memperbaiki desain aslinya.
4. **Interaktivitas dengan Alpine.js**:
   - Hapus dependensi jQuery dan Bootstrap JS.
   - Ganti komponen interaktif Bootstrap dengan data dan direktif Alpine.js.
   - **Dropdown**: Gunakan `x-data="{ open: false }"` dan `@click="open = !open"`.
   - **Modal**: Gunakan Alpine.js untuk mengelola state terbuka, overlay latar belakang, dan event klik di luar (`@click.outside`).
   - **Tab**: Kelola state tab aktif dengan `x-data="{ tab: 'home' }"`.
5. **Modernisasi UI/UX & Integrasi Skill**:
   - JANGAN hanya menerjemahkan kelas Bootstrap 1:1. Tujuannya adalah meningkatkan kualitas desain.
   - Anda WAJIB mengorkestrasi dan menerapkan pedoman dari skill UI/UX lainnya (`design-system-architect`, `ui-ux-pro-max`, dan `hig`).
   - Terapkan prinsip Human Interface Guidelines (HIG): Hierarchy, Harmony, dan Consistency.
   - Gunakan warna cerah, mikro-animasi halus, glassmorphism (jika sesuai), dan tipografi modern untuk memberikan kesan "WOW" pada pengguna.
6. **Quality Assurance**:
   - Verifikasi bahwa desain responsif berfungsi dengan benar di semua breakpoint (`sm:`, `md:`, `lg:`).
   - Pastikan komponen interaktif (modal, dropdown) terasa premium dengan transisi Alpine.js (`x-transition`).

#### 6. Arahan Anti-Slop Tailwind v4
Menegakkan standar tanpa toleransi untuk styling utility-first:
- **Larangan Hack Nilai Arbitrer**: Dilarang menggunakan nilai arbitrer (misal `p-[13px]`, `w-[372px]`, `text-[15px]`) jika skala bawaan atau `@theme` sudah ada. Jika dimensi kustom benar-benar dibutuhkan, daftarkan sebagai token semantik di `@theme`.
- **Hukum Aksesibilitas Indikator Fokus**: Dilarang mematikan outline fokus (`focus:outline-none`) sendirian. WAJIB sertakan `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-<color>` atau indikator visual kontras tinggi yang jelas.
- **Nol Div-Soup Pembungkus Berlebih**: Hindari nesting pembungkus redundant (`<div className="w-full"><div className="flex">...</div></div>`). Manfaatkan CSS grid atau flexbox langsung pada elemen semantik HTML5 (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`).
- **Larangan Gradien AI Slop Generik**: Dilarang keras memakai gradien ungu-sian klise AI (`bg-gradient-to-r from-purple-600 to-indigo-600`) sebagai latar belakang default. Gunakan palet warna terencana yang relevan dengan identitas brand menggunakan ruang warna OKLCH.
- **Wajib 5 Status Interaktif**: Komponen interaktif (tombol, input, link) harus mendefinisikan utilitas untuk kelima status: normal, hover (`hover:`), active (`active:`), keyboard focus (`focus-visible:`), dan disabled (`disabled:pointer-events-none disabled:opacity-50`).
- **Bebas Layout Terpotong**: Hindari lebar statis kaku (`w-[600px]`); gunakan utilitas responsif (`max-w-2xl w-full mx-auto`) dan container query (`@container`) untuk mencegah horizontal scrollbar pada layar mobile.

#### 7. Pemetaan Sistem Material Design 3 (M3) pada Tailwind v4
Tailwind CSS v4 memudahkan implementasi token Google Material Design 3 (M3) langsung di dalam direktif `@theme` tanpa library tambahan:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Peran Warna M3 (Dipetakan ke OKLCH / HCT) */
  --color-md-primary:               oklch(55% 0.22 270);
  --color-md-on-primary:            oklch(100% 0 0);
  --color-md-primary-container:     oklch(90% 0.08 270);
  --color-md-on-primary-container:  oklch(20% 0.12 270);

  --color-md-secondary-container:    oklch(92% 0.03 270);
  --color-md-on-secondary-container: oklch(22% 0.06 270);

  /* Tingkatan Surface Container M3 (Elevasi Tonal) */
  --color-md-surface:               oklch(98% 0.005 270);
  --color-md-surface-container-low: oklch(96% 0.008 270);
  --color-md-surface-container:     oklch(94% 0.012 270);
  --color-md-surface-container-high:oklch(92% 0.015 270);

  --color-md-outline:               oklch(55% 0.02 270);
  --color-md-outline-variant:       oklch(82% 0.015 270);

  /* Keluarga Bentuk M3 */
  --radius-md-xs:   4px;
  --radius-md-sm:   8px;
  --radius-md-md:   12px;
  --radius-md-lg:   16px;
  --radius-md-xl:   28px;
  --radius-md-full: 9999px;

  /* Bayangan Elevasi M3 */
  --shadow-md-elevation-1: 0 1px 3px 1px rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.30);
  --shadow-md-elevation-2: 0 2px 6px 2px rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.30);
  --shadow-md-elevation-3: 0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px 0 rgba(0, 0, 0, 0.30);
}
```

**Pola Komponen M3 dengan Utilitas Tailwind v4:**
```html
<!-- Tombol Filled M3 (CTA Utama Berpenekanan Tinggi) -->
<button class="bg-md-primary text-md-on-primary rounded-md-full px-6 h-10 font-medium inline-flex items-center gap-2 transition hover:brightness-110 active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 disabled:opacity-38 disabled:pointer-events-none">
  Aksi Utama
</button>

<!-- Kartu Elevated M3 dengan Hierarki Surface Container -->
<div class="bg-md-surface-container rounded-md-lg p-6 shadow-md-elevation-1 hover:shadow-md-elevation-2 transition-shadow">
  <h3 class="text-lg font-medium text-slate-900 dark:text-slate-100">Kartu Elevated</h3>
  <p class="text-sm text-slate-600 dark:text-slate-400 mt-2">Diberi lapisan container tonal M3 dan bayangan elevasi ambient.</p>
</div>
```

#### 8. Utilitas & Pola Hierarki Visual Berdaulat
Menerapkan hierarki visual tingkat produksi menggunakan kelompok utilitas Tailwind v4 yang ringkas dan teruji:
- **Skala Tipografi Modular & Tracking Optik**:
  - *Label Eyebrow*: `text-[11px] font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400`
  - *Judul Utama (H1)*: `text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-[1.08]`
  - *Judul Seksi (H2)*: `text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 leading-snug`
  - *Teks Tubuh*: `text-sm sm:text-base text-neutral-600 dark:text-neutral-300 leading-relaxed`
  - *Metrik Tabular*: `text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-neutral-900 dark:text-neutral-50`
- **Resep Pewarnaan 60-30-10**:
  - *60% Kanvas*: `bg-neutral-50 dark:bg-neutral-950`
  - *30% Kartu Permukaan*: `bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs`
  - *10% CTA Utama (Fokus Tunggal)*: `bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 active:scale-[0.98] focus-visible:ring-2`
- **Pola Jarak Kedekatan Gestalt**:
  - *Label ke Input*: `flex flex-col gap-1.5`
  - *Jarak Form*: `space-y-4`
  - *Jarak Seksi Halaman*: `py-16 sm:py-24`
