---
name: ui-ux-pro-max
description: "Comprehensive design guide & BM25 search engine for web and mobile applications across 11 tech stacks / Panduan desain komprehensif & mesin pencari BM25 untuk aplikasi web dan mobile di 11 tech stack."
author: "Roedy Rustam"

version: "4.3.0"
---

# UI/UX Pro Max - Design Intelligence System

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `anti-slop`, `design-system-architect`, `hig`, `tailwind-expert`, `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
UI/UX Pro Max is a comprehensive design intelligence engine equipped with an offline BM25 search index covering color palettes, typography, responsive patterns, icon sets, chart recommendations, UX guidelines, **Material Design 3 (M3)**, and stack-specific best practices across **11 technology stacks**.

### Trigger Conditions
Reference these guidelines or run the CLI search engine when:
- Designing new UI components, landing pages, or dashboards.
- Choosing color schemes, font pairings, and design tokens.
- Learning, reverse-engineering, or cloning website design templates & components directly from a target URL (Combine with `website-design-cloner`).
- Generating a complete design system recommendation for a project.
- Auditing code for UX, accessibility (a11y), or performance issues.
- Needing stack-specific code patterns (React, Next.js, Vue, Nuxt, Svelte, Tailwind, SwiftUI, React Native, Flutter, Shadcn).

---

### Python BM25 Search CLI Integration

The skill includes a fast Python search engine in `scripts/search.py` that queries 12 domain CSV datasets and 11 tech-stack CSV datasets.

#### 1. Generate Complete Design System Recommendation
Run this before starting design/coding to get an aggregated design system spec:
```bash
python scripts/search.py "<project/topic query>" --design-system -p "Project Name" -f markdown
```
*Example:* `python scripts/search.py "SaaS analytics dashboard" --design-system -p "MetricsApp" -f markdown`

#### 2. Domain-Specific Search
Search specific design domains:
```bash
python scripts/search.py "<query>" --domain <domain> --max-results 3
```
- **Available Domains (`--domain`)**:
  - `style`: Visual design styles (Minimalism, Glassmorphism, Dark Mode, Aurora, Brutalism, Bento Grid, Spatial UI, WebGL 3D elements, etc.)
  - `prompt`: Copy-paste ready AI prompts & CSS implementation checklists
  - `color`: Hex color palettes tailored by product type (Primary, Secondary, CTA, Background, Text)
  - `chart`: Chart type recommendations, library suggestions, accessibility & color guidance
  - `landing`: High-converting landing page layouts, section orders & CTA placement
  - `product`: Product-type specific design system blueprints (SaaS, E-commerce, Fintech, Crypto, AI-Native Chat Interfaces, etc.)
  - `ux`: UX anti-patterns, usability best practices, severity, and good/bad code examples
  - `typography`: Google font pairings, heading/body recommendations, mood keywords & CSS imports
  - `icons`: Icon usage guidance, SVG libraries (Lucide, Heroicons), and code imports
  - `react`: React & Next.js performance optimizations, re-render fixes & dynamic imports
  - `web`: Web interface guidelines (ARIA, focus traps, virtual list, form inputs)
  - `m3`: Material Design 3 specific design tokens, color roles, elevation, and component specs
  - `preset-monday`: Monday.com spacious SaaS aesthetic (Vibrant Blue `#0073ea`, Clean White `#FFFFFF` + Light Grays `#F9F9F9`/`#F5F6F8`, Dark Footer `#111111`, Figtree/Inter fonts, 12-16px card radius, 80-120px vertical spacing)

*Example:* `python scripts/search.py "fintech dark theme" --domain color`

#### 3. Stack-Specific Guidelines Search
Search guidelines tailored to your exact tech stack:
```bash
python scripts/search.py "<query>" --stack <stack> --max-results 3
```
- **Supported Stacks (`--stack`)**:
  - `html-tailwind` | `react` | `nextjs` | `vue` | `nuxtjs` | `nuxt-ui` | `svelte` | `swiftui` | `react-native` | `flutter` | `shadcn`

*Example:* `python scripts/search.py "virtualized list performance" --stack react`

---

### Quick Reference for Professional Rules

#### 1. Accessibility (WCAG 2.2) - CRITICAL
- **Color Contrast**: Minimum 4.5:1 ratio for normal text, 3:1 for large text/UI components.
- **Focus States**: Visible focus rings (`focus-visible:ring-2 focus-visible:ring-offset-2`) during keyboard navigation.
- **Alt Text & ARIA**: Descriptive alt text for imagery; proper `aria-expanded`, `aria-controls`, and semantic HTML tags.

#### 2. Touch & Interaction - CRITICAL
- **Touch Target Size**: Minimum 44x44px for mobile devices.
- **Loading & State**: Disable buttons during async requests to prevent duplicate submissions; show subtle spinners or skeleton loaders.
- **Cursor Pointer**: Always add `cursor-pointer` to clickable/interactive elements.

#### 3. Performance & Animation - HIGH / MEDIUM
- **Image & Assets**: Use WebP/AVIF formats, `srcset`, explicit `width`/`height` attributes, and `loading="lazy"`.
- **Micro-interactions**: Keep transition durations between 150ms–300ms (`ease-in-out`) for fast and responsive UI feel.
- **Reduced Motion**: Respect `prefers-reduced-motion: reduce`.

#### 4. Light/Dark Mode Contrast
- **Light Mode**: High-contrast text (e.g. Slate-900 `#0F172A`); avoid pale grays for primary text. Ensure borders (`border-slate-200`) remain visible.
- **Dark Mode**: High contrast foreground elements over dark slate/gray backgrounds; avoid pure black `#000000` text containers unless requested.

#### 5. Sovereign Visual Hierarchy & Elegant Aesthetic Architecture
Visual hierarchy guides the user's perception through deliberate scale, contrast, spacing, depth, and rhythm (Linear/Apple/Stripe-caliber design):

- **Modular Typographic Rhythm & Optical Tracking**:
  - **Eyebrow / Overline**: `text-[11px] font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400` — sets immediate context with deliberate breathing room.
  - **Hero / Display Title**: `text-3xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-[1.1]` — tight optical tracking creates punchy authority.
  - **Section / H2**: `text-xl md:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100` — anchored section landmark.
  - **Subheading / Body**: `text-sm md:text-base font-normal leading-relaxed text-neutral-600 dark:text-neutral-300` — comfortable reading flow.
  - **Tabular Figures Contract**: Mandatory `tabular-nums` (`font-variant-numeric: tabular-nums`) on all metrics, counters, currency values, dates, and data tables to prevent horizontal layout jiggle.

- **The 60-30-10 Color Rule & Single Primary CTA Dominance**:
  - **60% Neutral Base**: Main canvas/background (`bg-neutral-50 dark:bg-neutral-950`).
  - **30% Structural Surface**: Cards, sidebars, headers, table shells (`bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800`).
  - **10% Intentional Accent**: Reserved exclusively for key conversion moments (Primary CTA, active navigation marker, key KPI badge).
  - **Single Focal Point Rule**: Maximum ONE primary button per viewport. Secondary actions must use outline/subtle treatments; tertiary actions use ghost/text-only variants.
  - **3-Tier Semantic Text Contrast**: Primary text (`text-neutral-900 dark:text-neutral-50` >= 7:1 contrast), secondary text (`text-neutral-600 dark:text-neutral-400` >= 4.5:1), tertiary/metadata (`text-neutral-400 dark:text-neutral-500`).

- **Gestalt Proximity & Spatial Breathing Room**:
  - **Label-Input Tightness**: Place form labels tightly to their fields (`gap-1.5` / 6px).
  - **Internal vs External Gaps**: Card internal padding (`p-5` or `p-6`) must exceed element gaps (`gap-3` or `gap-4`).
  - **Section Cadence**: Separate major blocks with generous whitespace (`py-16 md:py-24` or `gap-8 md:gap-12`). Whitespace is an active structural design asset.

- **Surface Layering, Tactile Depth & Crisp 1px Borders**:
  - **Physical Elevation Tiers**:
    - *Canvas (L0)*: App background (`bg-neutral-50/50 dark:bg-neutral-950`).
    - *Card (L1)*: Content container (`bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs`).
    - *Raised (L2)*: Dropdown menu, popover, hover card (`shadow-md border border-neutral-200 dark:border-neutral-700`).
    - *Overlay (L3)*: Modal dialog with backdrop (`shadow-xl`).
    - *Floating (L4)*: Toast alert, persistent dock (`shadow-2xl`).
  - **Sanitation**: Ban blurry muddy 30px black shadows and ungrounded glowing neon orbs. Enforce crisp 1px borders paired with directional micro-shadows.

- **Scanability & Layout Flow Patterns**:
  - **F-Pattern**: Apply to dense data views, dashboards, and feeds (strong left-anchor for headings, metrics, and row labels).
  - **Z-Pattern**: Apply to marketing hero sections and conversion landing pages (Logo -> Secondary CTA -> Value Prop -> Primary CTA).
  - **Progressive Chunking**: Break large datasets into clear card modules with distinct header, metric, and footer zones.
  - **Material Design 3 (M3) Integration**: Support Adaptive Window Size Classes (Compact <600dp, Medium 600–839dp, Expanded ≥840dp) and tonal elevation tiers (`surface-container-lowest` to `surface-container-highest`).

---

### Sovereign UI/UX Anti-Slop Directive (6 Design Pillars)

The UI/UX tier of vibes-plug strictly eliminates generic AI visual slop and incomplete user experiences:

1. **Ban on Generic "AI Gradient" Aesthetic**:
   - 🔴 **Forbidden**: Defaulting to the cliché dark-slate backdrop with purple/cyan glowing neon gradients (`bg-slate-900 from-purple-500 to-indigo-600`), indiscriminate glassmorphic cards with faint `border-white/10`, and floating glowing dots with zero brand context.
   - ✅ **Standard**: Purpose-driven brand aesthetic. Deliberately choose and enforce a coherent design philosophy matching the domain: Swiss International Typography, Clean Scandinavian Editorial, High-Density Data Monochrome, Precision Industrial, or Warm Handcrafted Minimal.

2. **Mandatory 5-State Component Rule (Zero Happy-Path Bias)**:
   - 🔴 **Forbidden**: Generating only the static happy-path layout while omitting edge-case states.
   - ✅ **Standard**: Every interactive view or data component must explicitly support all 5 core states:
     - **Ideal State**: Clean, structured layout with realistic domain content.
     - **Loading State**: Content-shaped pulsing skeleton layout matching exact element geometry (no layout shifts or jarring full-screen spinners).
     - **Empty State**: Contextual vector icon/illustration, concise explanatory copy, and a primary action button to create the first record.
     - **Error State**: Inline accessible alert with actionable retry trigger and clear explanation (RFC 9457 friendly).
     - **Interactive / Disabled State**: Clear hover, active, keyboard `focus-visible:ring-2`, and `aria-disabled="true"` with tooltip explanation.

3. **Semantic & Accessible DOM (Zero Div-Soup Slop)**:
   - 🔴 **Forbidden**: Using `<div onClick={...}>` instead of `<button>`, omitting `<label>` tags on inputs, or icon-only buttons without accessible names.
   - ✅ **Standard**: Semantic HTML5 (`<button type="button">`, `<nav>`, `<main>`, `<dialog>`), explicit `<label htmlFor="...">`, `aria-label` or `<span className="sr-only">` on icon buttons, and visible keyboard navigation focus rings (`focus-visible:ring-2 focus-visible:ring-offset-2`).

4. **Fluid Responsiveness & Mobile Insets**:
   - 🔴 **Forbidden**: Hardcoded fixed pixel widths (`w-[480px]`) causing horizontal scrolling on 360px mobile viewports; applying `overflow-x: hidden` on `<body>` to hide layout clipping bugs.
   - ✅ **Standard**: Fluid layout constraints (`max-w-md w-full`), CSS Grid with `minmax()`, dynamic viewport units (`dvh` over `vh`), and safe-area padding (`pb-safe`).

5. **Intentional Micro-Motion & Reduced Motion**:
   - 🔴 **Forbidden**: Jarring 0ms instant state snaps, sluggish 800ms+ animations that delay task completion, and hover effects that trigger layout shifts.
   - ✅ **Standard**: Snappy 150ms–250ms transitions with `ease-out`, zero layout shifts on hover, and strict respect for `@media (prefers-reduced-motion: reduce)`.

6. **Domain-Authentic Content (No Lorem Ipsum Slop)**:
   - 🔴 **Forbidden**: Filling UI mockups with "Lorem ipsum dolor sit amet", "John Doe", "Jane Doe", or dummy placeholder avatars.
   - ✅ **Standard**: Use realistic, contextual domain content matching the business use-case (real currency, realistic timestamps, localized names, authentic domain terms).

---

### UI/UX Design Pre-Delivery Checklist
- [ ] **Visual Hierarchy**: Clear typographic scale (H1 -> H2 -> Body -> Eyebrow) with optical tracking (`tracking-tight` on large headings, `tracking-wider` on uppercase eyebrows).
- [ ] **Single Focal CTA**: Only 1 primary conversion action per viewport; secondary actions use subtle/outline variants.
- [ ] **Tabular Numerals**: `tabular-nums` applied to all metrics, currency, timestamps, and table numbers.
- [ ] **Gestalt Proximity**: Related items grouped tightly (`gap-1.5`), unrelated sections separated with generous breathing room (`py-16`/`gap-8`).
- [ ] **Surface & Border Layering**: Crisp 1px borders (`border-neutral-200/80 dark:border-neutral-800`) paired with subtle micro-shadows (`shadow-xs`/`shadow-sm`); zero muddy 30px shadows or floating neon orbs.
- [ ] **Visual Quality**: No emojis used as UI icons (use SVG icons from Lucide/Heroicons). Hover states do not cause layout shifts.
- [ ] **Interaction**: `cursor-pointer` applied to all interactive elements. Smooth 150–300ms transitions with `active:scale-[0.98]`.
- [ ] **Contrast**: Text contrast ratio >= 4.5:1 in light mode (>= 7:1 for headings). Visible borders in both light and dark modes.
- [ ] **Layout & Responsive**: Tested across 375px, 768px, 1024px, 1440px breakpoints. No unintentional horizontal scrolling on mobile.
- [ ] **Accessibility**: All images have meaningful `alt` text. Form inputs have explicitly connected `<label>` elements or `aria-label`.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `anti-slop`, `design-system-architect`, `hig`, `tailwind-expert`, `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
UI/UX Pro Max adalah mesin kecerdasan desain komprehensif yang dilengkapi indeks pencarian BM25 offline. Mencakup palet warna, tipografi, pola tata letak responsif, rekomendasi ikon, grafik visualisasi data, pedoman UX, **Material Design 3 (M3)**, serta praktik terbaik untuk **11 tumpukan teknologi (technology stacks)**.

### Kondisi Pemicu
Gunakan pedoman ini atau jalankan mesin pencari CLI ketika:
- Mendesain komponen UI baru, landing page, atau dashboard.
- Memilih skema warna, pasangan font, dan token desain.
- Menghasilkan rekomendasi sistem desain (design system) lengkap untuk proyek.
- Mengaudit kode untuk masalah UX, aksesibilitas (a11y), atau kinerja.
- Membutuhkan pola kode spesifik stack (React, Next.js, Vue, Nuxt, Svelte, Tailwind, SwiftUI, React Native, Flutter, Shadcn).

---

### Integrasi CLI Pencarian Python BM25

Skill ini dilengkapi mesin pencari Python cepat di `scripts/search.py` yang dapat mengueri 12 dataset CSV domain dan 11 dataset CSV tech-stack.

#### 1. Generasi Rekomendasi Sistem Desain Lengkap
Jalankan ini sebelum memulai desain/coding untuk mendapatkan spesifikasi sistem desain terintegrasi:
```bash
python scripts/search.py "<kueri proyek/topik>" --design-system -p "Nama Proyek" -f markdown
```
*Contoh:* `python scripts/search.py "SaaS analytics dashboard" --design-system -p "MetricsApp" -f markdown`

#### 2. Pencarian Berdasarkan Domain
Cari domain desain tertentu:
```bash
python scripts/search.py "<kueri>" --domain <domain> --max-results 3
```
- **Domain yang Tersedia (`--domain`)**:
  - `style`: Gaya desain visual (Minimalism, Glassmorphism, Dark Mode, Aurora, Brutalism, Bento Grid, Spatial UI, elemen WebGL 3D, dll.)
  - `prompt`: Prompt AI siap pakai & checklist implementasi CSS
  - `color`: Palet warna Hex sesuai jenis produk (Utama, Sekunder, CTA, Background, Teks)
  - `chart`: Rekomendasi jenis grafik, pustaka grafik, panduan kontras & aksesibilitas
  - `landing`: Tata letak landing page konversi tinggi, urutan seksi & penempatan CTA
  - `product`: Cetak biru sistem desain spesifik jenis produk (SaaS, E-commerce, Fintech, Crypto, Antarmuka Chat AI-Native, dll.)
  - `ux`: Anti-pattern UX, praktik terbaik kegunaan, tingkat keparahan, serta contoh kode baik/buruk
  - `typography`: Pasangan font Google Fonts, rekomendasi font judul/isi, mood & CSS import
  - `icons`: Panduan penggunaan ikon, pustaka SVG (Lucide, Heroicons), & import kode
  - `react`: Optimasi performa React & Next.js, perbaikan re-render & dynamic import
  - `web`: Pedoman antarmuka web (ARIA, focus trap, virtual list, input form)
  - `m3`: Token desain spesifik Material Design 3, peran warna, elevasi, dan spesifikasi komponen
  - `preset-monday`: Estetika SaaS lapang ala Monday.com (Biru Cerah `#0073ea`, Putih Bersih `#FFFFFF` + Abu-abu Terang `#F9F9F9`/`#F5F6F8`, Footer Gelap `#111111`, font Figtree/Inter, radius kartu 12-16px, jarak seksi vertikal 80-120px)

*Contoh:* `python scripts/search.py "fintech dark theme" --domain color`

#### 3. Pencarian Pedoman Spesifik Tech Stack
Cari pedoman yang disesuaikan persis dengan tech stack proyek:
```bash
python scripts/search.py "<kueri>" --stack <stack> --max-results 3
```
- **Tech Stack yang Didukung (`--stack`)**:
  - `html-tailwind` | `react` | `nextjs` | `vue` | `nuxtjs` | `nuxt-ui` | `svelte` | `swiftui` | `react-native` | `flutter` | `shadcn`

*Contoh:* `python scripts/search.py "virtualized list performance" --stack react`

---

### Acuan Cepat Aturan Profesional

#### 1. Aksesibilitas (WCAG 2.2) - KRITIS
- **Kontras Warna**: Rasio kontras minimal 4.5:1 untuk teks normal, 3:1 untuk teks besar/komponen UI.
- **Focus States**: Tampilkan cincin fokus yang jelas (`focus-visible:ring-2 focus-visible:ring-offset-2`) saat menggunakan navigasi keyboard.
- **Alt Text & ARIA**: Sediakan alt text deskriptif pada gambar; gunakan atribut `aria-expanded`, `aria-controls`, serta elemen HTML semantik.

#### 2. Sentuhan & Interaksi - KRITIS
- **Touch Target Size**: Ukuran area sentuh minimal 44x44px untuk perangkat mobile.
- **Loading & State**: Nonaktifkan tombol selama operasi asinkron agar tidak terjadi submit ganda; tampilkan spinner halus atau skeleton loader.
- **Cursor Pointer**: Wajib menambahkan `cursor-pointer` pada elemen interaktif yang dapat diklik.

#### 3. Performa & Animasi - TINGGI / MENENGAH
- **Aset Gambar**: Gunakan format WebP/AVIF, atribut `srcset`, dimensi `width`/`height` eksplisit, serta `loading="lazy"`.
- **Mikro-interaksi**: Durasi transisi antara 150ms–300ms (`ease-in-out`) agar antarmuka terasa cepat dan responsif.
- **Reduced Motion**: Hormati preferensi `prefers-reduced-motion: reduce`.

#### 4. Kontras Mode Terang & Gelap
- **Mode Terang**: Teks gelap kontras tinggi (misal Slate-900 `#0F172A`); hindari teks abu-abu pudar. Pastikan batas/border (`border-slate-200`) tetap terlihat.
- **Mode Gelap**: Kontras tinggi antara elemen latar depan dengan latar belakang gelap; hindari kontainer teks serba hitam pekat `#000000` kecuali diminta khusus.

#### 5. Hierarki Visual & Arsitektur Estetika Elegan Berdaulat
Hierarki visual memandu persepsi pengguna secara intuitif dan elegan melalui skala ukuran, kontras warna, jarak spasial, kedalaman elevasi, dan irama membaca (standar kaliber Apple/Linear/Stripe):

- **Irama Tipografi Modular & Tracking Optik**:
  - **Eyebrow / Overline**: `text-[11px] font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400` — menetapkan konteks kategori secara presisi dengan jarak antarhuruf yang lega.
  - **Judul Utama / Display H1**: `text-3xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-[1.1]` — tracking rapat memberikan ketegasan visual tanpa memakan ruang vertikal berlebih.
  - **Subjudul Seksi / H2**: `text-xl md:text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100` — jangkar struktural seksi.
  - **Teks Tubuh / Body**: `text-sm md:text-base font-normal leading-relaxed text-neutral-600 dark:text-neutral-300` — alur membaca yang nyaman dan tidak melelahkan mata.
  - **Angka Tabular Wajib**: Terapkan `tabular-nums` (`font-variant-numeric: tabular-nums`) pada semua metrik angka, harga/mata uang, stempel waktu, dan tabel data agar angka sejajar vertikal dan tidak bergoyang saat nilai berubah.

- **Aturan Warna 60-30-10 & Dominasi Single Primary CTA**:
  - **60% Basis Netral**: Kanvas utama latar belakang (`bg-neutral-50 dark:bg-neutral-950`).
  - **30% Permukaan Struktural**: Kartu, panel, sidebar, header (`bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800`).
  - **10% Aksen Fokal Intensional**: Dikhususkan HANYA untuk titik konversi utama (Primary CTA, status aktif, lencana KPI kritis).
  - **Aturan Titik Fokus Tunggal**: Maksimal SATU tombol utama per viewport. Tombol aksi lain wajib menggunakan varian outline/subtle atau ghost/text-only agar pengguna tidak mengalami kelelahan kognitif (*choice paralysis*).
  - **3 Tingkat Kontras Teks Semantik**: Teks utama (`text-neutral-900 dark:text-neutral-50` rasio >= 7:1), teks sekunder (`text-neutral-600 dark:text-neutral-400` rasio >= 4.5:1), teks tersier/metadata (`text-neutral-400 dark:text-neutral-500`).

- **Hukum Kedekatan Gestalt (Proximity) & Ruang Bernapas (Whitespace)**:
  - **Kerapatan Label & Input**: Label form harus sangat dekat dengan field inputnya (`gap-1.5` / 6px).
  - **Hierarki Padding Internal vs Margin Luar**: Padding internal card (`p-5` atau `p-6`) harus lebih besar daripada jarak antar-elemen di dalamnya (`gap-3` atau `gap-4`).
  - **Irama Antar-Seksi**: Pisahkan blok utama halaman dengan ruang kosong yang lega (`py-16 md:py-24` atau `gap-8 md:gap-12`). Ruang kosong (*negative space*) adalah elemen desain aktif bernilai tinggi yang menciptakan kesan premium dan tenang.

- **Pelapisan Permukaan (Surface Layering), Kedalaman Taktil & Border 1px Presisi**:
  - **Tingkatan Elevasi Fisik**:
    - *Kanvas (L0)*: Latar belakang dasar aplikasi (`bg-neutral-50/50 dark:bg-neutral-950`).
    - *Kartu Konten (L1)*: Kontainer data (`bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs`).
    - *Terangkat (L2)*: Menu dropdown, popover, hover state (`shadow-md border border-neutral-200 dark:border-neutral-700`).
    - *Overlay (L3)*: Dialog modal dengan backdrop halus (`shadow-xl`).
    - *Mengambang (L4)*: Toast notifikasi, floating action dock (`shadow-2xl`).
  - **Sanitasi Elevasi**: Larang bayangan hitam buram 30px yang kotor serta lingkaran neon mengambang tanpa dasar fisik. Terapkan garis border tajam 1px yang dipadukan dengan micro-shadows halus terarah.

- **Pola Pemindaian Mata (Scanability) & Alur Tata Letak**:
  - **Pola F (F-Pattern)**: Terapkan pada tampilan padat data, dashboard, dan daftar tabel (orientasi kuat di sisi kiri untuk judul, metrik, dan baris data).
  - **Pola Z (Z-Pattern)**: Terapkan pada landing page promosi dan alur onboarding (Logo kiri atas -> Navigasi kanan -> Pesan Nilai Utama -> Tombol CTA).
  - **Chunking Progresif**: Pecah kumpulan informasi kompleks menjadi modul-modul kartu terstruktur dengan header, metrik, dan footer yang jelas.
  - **Integrasi Material Design 3 (M3)**: Mendukung Kelas Ukuran Jendela Adaptif (Compact <600dp, Medium 600–839dp, Expanded ≥840dp) serta tingkatan elevasi tonal (`surface-container-lowest` hingga `surface-container-highest`).

---

### Direktif Anti-Slop UI/UX Berdaulat (6 Pilar Desain)

Tingkat UI/UX vibes-plug melarang keras slop visual AI generik dan pengalaman pengguna separuh jadi:

1. **Larangan Estetika "Gradien AI" Generik**:
   - 🔴 **Dilarang**: Menggunakan *default* klise latar belakang dark-slate dengan gradien neon ungu/sian menyala (`bg-slate-900 from-purple-500 to-indigo-600`), kartu *glassmorphic* berlebihan dengan `border-white/10`, serta titik-titik neon mengambang tanpa konteks merek.
   - ✅ **Standar**: Estetika berbasis tujuan merek. Terapkan filosofi desain yang disengaja sesuai domain produk: Tipografi Internasional Swiss, Editorial Skandinavia Bersih, Monokrom Data Densitas Tinggi, Presisi Industrial, atau Desain Minimalis Hangat.

2. **Aturan Wajib 5 Status Komponen (Nol Bias Happy-Path)**:
   - 🔴 **Dilarang**: Hanya menghasilkan tata letak statis saat kondisi data ideal dan melupakan status di dunia nyata.
   - ✅ **Standar**: Setiap tampilan interaktif atau komponen data WAJIB mendukung 5 status inti:
     - **Status Ideal**: Tata letak rapi, terstruktur, dengan konten domain realistis.
     - **Status Loading**: Skeleton loader berdenyut halus dengan geometri persis sesuai elemen (tanpa pergeseran layout / CLS, tanpa spinner layar penuh yang mengganggu).
     - **Status Kosong (Empty State)**: Ikon/ilustrasi kontekstual, teks penjelasan ringkas dan ramah, serta tombol CTA utama untuk membuat data pertama.
     - **Status Error**: Banner/kartu error inline yang aksesibel disertai pesan jelas dan tombol coba lagi (*retry*).
     - **Status Interaktif / Nonaktif (Disabled)**: Status hover, active, cincin fokus keyboard `focus-visible:ring-2`, serta atribut `aria-disabled="true"` dengan penjelasan tooltip.

3. **DOM Semantik & Aksesibel (Nol Slop Div-Soup)**:
   - 🔴 **Dilarang**: Menggunakan `<div onClick={...}>` menggantikan tombol asli, menghilangkan tag `<label>` pada input, atau tombol ikon tanpa nama aksesibel.
   - ✅ **Standar**: Gunakan elemen HTML5 semantik (`<button type="button">`, `<nav>`, `<main>`, `<dialog>`), `<label htmlFor="...">` eksplisit, `aria-label` atau `<span className="sr-only">` pada tombol ikon, dan cincin fokus navigasi keyboard yang jelas (`focus-visible:ring-2 focus-visible:ring-offset-2`).

4. **Responsif Fluid & Inset Layar Mobile**:
   - 🔴 **Dilarang**: Menetapkan lebar piksel statis (`w-[480px]`) yang merusak tampilan mobile 360px; menggunakan trik `overflow-x: hidden` pada `<body>` untuk menyembunyikan bug layout bocor.
   - ✅ **Standar**: Batasan layout fleksibel (`max-w-md w-full`), CSS Grid dengan `minmax()`, unit viewport dinamis (`dvh`), dan padding area aman mobile (`pb-safe`).

5. **Mikro-Gerakan Disengaja & Reduced Motion**:
   - 🔴 **Dilarang**: Transisi kaku 0ms, animasi lambat >800ms yang memperlambat interaksi, dan efek hover yang memicu pergeseran tata letak (layout shift).
   - ✅ **Standar**: Transisi responsif 150ms–250ms dengan `ease-out`, tanpa layout shift saat hover, serta kepatuhan mutlak pada `@media (prefers-reduced-motion: reduce)`.

6. **Konten Domain Autentik (Nol Slop Lorem Ipsum)**:
   - 🔴 **Dilarang**: Memenuhi antarmuka pengguna dengan "Lorem ipsum dolor sit amet", "John Doe", "Jane Doe", atau avatar tiruan kosong.
   - ✅ **Standar**: Gunakan konten realistis sesuai domain bisnis produk (mata uang nyata, stempel waktu realistis, nama lokal, istilah bisnis autentik).

---

### Checklist Desain UI/UX Sebelum Delivery
- [ ] **Hierarki Visual**: Skala tipografi terstruktur jelas (H1 -> H2 -> Body -> Eyebrow) dengan tracking optik (`tracking-tight` pada judul besar, `tracking-wider` pada eyebrow huruf besar).
- [ ] **Single Focal CTA**: Hanya 1 aksi konversi utama per viewport; tombol aksi lain menggunakan varian subtle atau outline.
- [ ] **Angka Tabular**: `tabular-nums` diterapkan pada semua metrik data, mata uang, tanggal/waktu, dan tabel.
- [ ] **Kedekatan Gestalt (Proximity)**: Elemen terkait terkelompok rapat (`gap-1.5`), seksi yang berbeda dipisahkan ruang bernapas yang lega (`py-16`/`gap-8`).
- [ ] **Pelapisan Permukaan & Border 1px**: Border 1px tajam (`border-neutral-200/80 dark:border-neutral-800`) dipadukan dengan micro-shadows halus (`shadow-xs`/`shadow-sm`); bebas dari bayangan hitam buram 30px atau neon orbs.
- [ ] **Kualitas Visual**: Tidak menggunakan emoji sebagai ikon UI (gunakan ikon SVG seperti Lucide/Heroicons). Efek hover tidak menggeser tata letak.
- [ ] **Interaksi**: `cursor-pointer` diterapkan pada semua elemen interaktif. Transisi halus 150–300ms dengan respons `active:scale-[0.98]`.
- [ ] **Kontras**: Rasio kontras teks minimal 4.5:1 pada mode terang (>= 7:1 untuk judul utama). Border terlihat jelas di kedua mode (terang & gelap).
- [ ] **Tata Letak & Responsif**: Diuji pada breakpoint 375px, 768px, 1024px, 1440px. Tidak ada scroll horizontal tak disengaja pada perangkat mobile.
- [ ] **Aksesibilitas**: Semua gambar memiliki `alt` text yang bermakna. Form input memiliki `<label>` terhubung eksplisit atau `aria-label`.

---
### 🎨 Automatic Visual Assets Generation Mandate (CRITICAL)
**MANDATORY**: Whenever you are building a new application, scaffolding a project, or finalizing the initial UI/UX, you MUST automatically use the `generate_image` tool to create a custom logo that perfectly matches the application's core concept and aesthetic. 
This generated image MUST be explicitly used as:
1. The primary application logo (e.g., in the header/navbar).
2. The website favicon (`favicon.ico` or equivalent).
3. The Open Graph (OG) image for SEO metadata (`og:image`).

Do not use placeholders for these assets. Generate and integrate them automatically.