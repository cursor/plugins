---
name: hig
description: "Applies Human Interface Guidelines (HIG) principles — Hierarchy, Harmony, and Consistency — to UI/UX designs to ensure intuitive and cohesive interfaces / Menerapkan prinsip Human Interface Guidelines (HIG) — Hierarchy, Harmony, dan Consistency — pada desain UI/UX untuk memastikan antarmuka yang intuitif dan kohesif."
author: "Roedy Rustam"

version: "4.3.0"
---

# Human Interface Guidelines (HIG) Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `anti-slop`, `ui-ux-pro-max`, `design-system-architect`, `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Applies Human Interface Guidelines (HIG) principles to web and mobile UI/UX designs. Covers the core triad (Hierarchy, Harmony, Consistency), Apple's HIG 2026 updates, Google Material Design 3, spatial design for Apple Vision Pro, and modern accessibility requirements.

### Trigger Conditions
- Reviewing or critiquing a UI design for HIG violations.
- Making design decisions about typography scale, color usage, or layout hierarchy.
- Designing for multiple platforms (iOS, Android, web) with consistent patterns.
- Evaluating whether a UI feels "premium" or "amateur".
- Ensuring UI components follow platform conventions (button placement, nav patterns).

### The Core HIG Triad

#### 1. Hierarchy — Guide the User's Eye
Visual hierarchy controls where the user looks first, how attention flows across information, and how confident they feel taking action (Linear/Apple/Stripe caliber).

**Modular Typographic Hierarchy & Optical Tracking:**
```css
/* Strict 5-tier typographic scale with optical letter-spacing */
.eyebrow { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: var(--color-text-muted); }
.h1      { font-size: 2.5rem;    font-weight: 700; letter-spacing: -0.025em; line-height: 1.15; color: var(--color-text-primary); }
.h2      { font-size: 1.75rem;   font-weight: 600; letter-spacing: -0.02em;  line-height: 1.25; color: var(--color-text-primary); }
.h3      { font-size: 1.25rem;   font-weight: 600; letter-spacing: -0.01em;  line-height: 1.35; color: var(--color-text-primary); }
.body    { font-size: 0.9375rem; font-weight: 400; letter-spacing: 0em;      line-height: 1.6;  color: var(--color-text-secondary); }
.caption { font-size: 0.75rem;   font-weight: 400; letter-spacing: 0.01em;   color: var(--color-text-tertiary); }
.metric  { font-size: 2rem;      font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
```

**Spatial & Depth Hierarchy (Z-axis Surface Tiers):**
- **Canvas (L0)**: Neutral background base (`bg-neutral-50 dark:bg-neutral-950`).
- **Surface (L1)**: Content cards and panels — crisp 1px border (`border-neutral-200/80 dark:border-neutral-800`) + subtle ambient shadow (`shadow-xs`).
- **Raised (L2)**: Active popovers, dropdown menus, hover elevation — (`shadow-md border border-neutral-200 dark:border-neutral-700`).
- **Overlay (L3)**: Modals, slide-over sheets with backdrop blur — (`shadow-xl`).
- **Floating (L4)**: Global toasts, command palette, floating action docks — (`shadow-2xl`).

**Color & Focus Hierarchy (60-30-10 Principle):**
- **60% Base**: Canvas and neutral containers.
- **30% Structure**: Cards, borders, headers, and secondary surfaces.
- **10% Accent**: Reserved strictly for the single primary conversion moment.
- **Single Primary CTA Law**: Exactly ONE primary emphasized button per screen. All secondary actions must use outline, tonal, or ghost styling to eliminate choice paralysis.
- **Destructive Actions**: Placed apart from primary paths, styled in danger color, with mandatory confirmation modals.

**Gestalt Proximity & Layout Scanability:**
- **Law of Proximity**: Control-label pairs must sit within 4–6px (`gap-1.5`). Distinct fieldsets sit at 16–24px. Page sections sit at 64–96px (`py-16 md:py-24`).
- **F-Pattern Layout**: Left-aligned anchors for analytical dashboards, documents, and data tables.
- **Z-Pattern Layout**: Diagonal flow for landing heroes and marketing narratives.

#### 2. Harmony — Visual Cohesion
All elements should feel like they belong to the same family.

**Spacing Scale (8pt Grid):**
```
4px   → xs gaps (icon padding, tight list items)
8px   → sm (between related elements)
16px  → md (card padding, section spacing)
24px  → lg (between sections)
32px  → xl (between major blocks)
48px  → 2xl (page-level separation)
```

**Border Radius Consistency:**
- Small elements (badges, chips): `rounded-full` or `rounded-sm`
- Medium elements (inputs, buttons): `rounded-md`
- Large elements (cards, modals): `rounded-xl`
- Never mix `rounded-none` with `rounded-2xl` in the same screen

**Color Harmony:**
```
Analogous:     Brand + ±30° hue neighbors (natural, calm)
Complementary: Brand + 180° (high contrast, CTAs)
Triadic:       Brand + 120°/240° (vibrant, use sparingly)
Monochromatic: Single hue, varying lightness (professional)
```

#### 3. Consistency — Reduce Cognitive Load
Users should never wonder "how does this work?" — patterns should be predictable.

**Platform Conventions (Web):**
- Primary CTA: top-right (desktop nav) or bottom-center (mobile)
- Destructive actions: always require confirmation dialogs
- Form submission: Enter key submits, Escape cancels/closes
- Navigation: Breadcrumbs for 3+ depth levels
- Empty states: Always provide an actionable CTA

**Component Consistency Checklist:**
- [ ] Visual hierarchy is unmistakable: primary CTA stands out, secondary actions are subdued.
- [ ] Typographic scale applies optical tracking (`tracking-tight` on large titles, `tracking-wider` on eyebrows).
- [ ] Tabular numerals (`tabular-nums`) are enforced on all metrics, prices, and counters.
- [ ] All buttons use the same radius (`rounded-md` everywhere).
- [ ] All modals have the same padding (`p-6`) and close behavior (Escape key).
- [ ] All form inputs have the same height (`h-9`) and focus ring style.
- [ ] All error messages appear in the same position (below the input field).
- [ ] All tables use the same row height, tabular numerals, and hover style.

### Apple HIG 2026 Updates

#### Spatial Design (Vision Pro)
- Use **depth** as an organizational tool — foreground elements are more important.
- Avoid placing interactive elements outside comfortable viewing angles (±45° center).
- Use **glass morphism** (`backdrop-blur`) for panels to maintain spatial context.
- Prefer indirect input (gaze + pinch) over precise pointer interactions.

#### iOS 18 Design Patterns
- **Liquid Glass**: Full glass-morphism on navigation bars and toolbars.
- **Adaptive layouts**: Single codebase adapts from iPhone to iPad to Mac.
- **Symbols**: SF Symbols 6 with variable rendering (multicolor, hierarchical).
- **Menu patterns**: Context menus replace modal bottom sheets where possible.

### Material Design 3 (Google) — Modern Architecture (https://m3.material.io/)

#### 1. Dynamic Color & Algorithmic HCT System
M3 generates accessible, harmonious color palettes dynamically from a seed color or wallpaper using Google's **HCT (Hue, Chroma, Tone)** perceptual color model:
```typescript
import { argbFromHex, themeFromSourceColor } from '@material/material-color-utilities';

// Generates 5 tonal palettes (Primary, Secondary, Tertiary, Neutral, Neutral Variant)
const theme = themeFromSourceColor(argbFromHex('#6750A4'));
// light/dark schemes guarantee WCAG AA contrast (Tone difference >= 40 or 50)
```

#### 2. Surface Container Hierarchy (Shadowless Elevation)
Rather than relying solely on heavy drop shadows, modern M3 establishes depth through **Surface Container Tonal Tiers**:
- `surface-dim` / `surface` / `surface-bright`: Root viewport surfaces.
- `surface-container-lowest` & `surface-container-low`: Recessed or grouped cards.
- `surface-container`: Default card, dialog, and panel containment.
- `surface-container-high` & `surface-container-highest`: Elevated sheets, menus, and search bars.

#### 3. Component Hierarchy & Tonal Tiers
- **Buttons (5 Tiers)**:
  - `Filled`: High-emphasis primary action (`bg-primary text-on-primary`).
  - `Tonal`: Medium-high emphasis alternative (`bg-secondary-container text-on-secondary-container`).
  - `Elevated`: High emphasis on textured/busy backgrounds with subtle shadow.
  - `Outlined`: Medium-low emphasis secondary actions with clean border (`border-outline`).
  - `Text`: Lowest emphasis action inside cards, dialog actions, or flat lists.
- **Cards (3 Tiers)**: `Elevated` (resting 1dp shadow), `Filled` (`surface-container-highest`), and `Outlined` (`border-outline-variant`).
- **Chips (4 Types)**: `Assist` (smart actions), `Filter` (toggled state), `Input` (tags/recipients), `Suggestion` (AI prompts).
- **Navigation Adaptive Tiers**:
  - `Compact (<600dp)`: Navigation Bar (Bottom 80dp, active pill indicator).
  - `Medium (600-839dp)`: Navigation Rail (Side 80dp, top FAB + icon destinations).
  - `Expanded (>=840dp)`: Navigation Drawer (Side 280-360dp, full persistent sidebar).

#### 4. Design Triad Synthesis: Apple HIG vs Google M3
| Dimension | Apple Human Interface Guidelines (HIG) | Google Material Design 3 (M3) |
| :--- | :--- | :--- |
| **Core Philosophy** | Content-First, Deference, Clarity | Expressive, Adaptive, Personalization (Material You) |
| **Depth & Materials** | Liquid Glass, Vibrancy, Backdrop Blurs | Surface Container Tonal Tiers + Tonal Tinting |
| **Color Model** | Semantic System Colors + Dark Mode Pairs | Algorithmic HCT Space + 5 Dynamic Tonal Palettes |
| **Iconography** | SF Symbols 6 (Multicolor, Hierarchical) | Material Symbols (Variable axes: Weight, Grade, Fill) |
| **Touch Targets** | Minimum 44×44pt | Recommended 48×48dp (Minimum 24×24dp) |
| **Corner Curvature** | Continuous Squircle / Superellipse | Explicit Radii Scale (0, 4, 8, 12, 16, 28, 9999px) |

### HIG Audit Protocol
When reviewing a design, check:
1. **Hierarchy**: Is the primary action immediately obvious? Is text contrast sufficient?
2. **Harmony**: Is spacing consistent (8pt grid)? Are border radii uniform?
3. **Consistency**: Do interactive elements follow platform conventions?
4. **Accessibility**: Does it pass WCAG 2.2? Are touch targets ≥ 24×24px?
5. **Platform fit**: Does it feel native to its target platform?
6. **Anti-Slop Visual Cleanliness (`anti-slop`)**: Are generic purple/cyan AI gradients banned? Are all 5 interactive states accounted for? Is the content free of "Lorem Ipsum" filler? Are border-radii coherent across the entire view?

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `anti-slop`, `ui-ux-pro-max`, `design-system-architect`, `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Menerapkan prinsip Human Interface Guidelines (HIG) pada desain UI/UX web dan mobile. Mencakup triad inti (Hierarchy, Harmony, Consistency), pembaruan Apple HIG 2026, Google Material Design 3, desain spasial untuk Apple Vision Pro, dan persyaratan aksesibilitas modern.

### Kondisi Pemicu
- Meninjau atau mengkritik desain UI untuk pelanggaran HIG.
- Membuat keputusan desain tentang skala tipografi, penggunaan warna, atau hierarki tata letak.
- Merancang untuk berbagai platform (iOS, Android, web) dengan pola yang konsisten.
- Mengevaluasi apakah UI terasa "premium" atau "amatir".
- Memastikan komponen UI mengikuti konvensi platform.

### Triad HIG Inti

#### 1. Hierarki — Pandu Mata Pengguna
Hierarki visual mengontrol ke mana pengguna melihat pertama kali, bagaimana perhatian mengalir melintasi informasi, dan memunculkan rasa percaya diri saat mengambil aksi (standar kaliber Apple/Linear/Stripe).

- **Skala Tipografi Modular & Tracking Optik**:
  - **Eyebrow**: 11px / 0.6875rem, bobot 600, `tracking-wider`, uppercase — konteks kategori tanpa berebut fokus.
  - **Judul Utama (H1)**: 40px / 2.5rem, bobot 700, `tracking-tight`, leading padat (1.15) — jangkar otoritas visual.
  - **Subjudul (H2)**: 28px / 1.75rem, bobot 600, `tracking-tight`, leading 1.25.
  - **Judul Bagian (H3)**: 20px / 1.25rem, bobot 600, leading 1.35.
  - **Teks Tubuh (Body)**: 15–16px, bobot 400, leading santai (1.6) untuk kenyamanan membaca.
  - **Angka Metrik**: Wajib menggunakan angka tabular (`tabular-nums`) agar angka metrik dan tabel tidak bergeser horizontal saat berubah.

- **Tingkatan Permukaan & Elevasi Sumbu-Z**:
  - **Kanvas (L0)**: Latar belakang aplikasi netral (`bg-neutral-50 dark:bg-neutral-950`).
  - **Surface (L1)**: Kartu dan panel konten — border 1px tajam (`border-neutral-200/80 dark:border-neutral-800`) dipadu bayangan ambient mikro (`shadow-xs`).
  - **Raised (L2)**: Popover, dropdown, kartu hover (`shadow-md border border-neutral-200 dark:border-neutral-700`).
  - **Overlay (L3)**: Dialog modal, slide-over dengan backdrop halus (`shadow-xl`).
  - **Floating (L4)**: Toast notifikasi, command palette, dock navigasi melayang (`shadow-2xl`).

- **Hierarki Warna & Fokus (Aturan 60-30-10)**:
  - **60% Basis**: Kanvas dan latar belakang netral.
  - **30% Struktur**: Kartu, batas pembatas, header, dan permukaan sekunder.
  - **10% Aksen**: Dikhususkan eksklusif untuk momen konversi utama.
  - **Hukum Single Primary CTA**: Hanya SATU tombol aksi utama yang menonjol per layar. Aksi sekunder wajib bergaya outline atau ghost.
  - **Aksi Destruktif**: Berwarna merah, diletakkan terpisah dari CTA utama, wajib dengan dialog konfirmasi.

- **Kedekatan Gestalt & Pola Pindai**:
  - **Hukum Kedekatan**: Label dan kontrol berjarak rapat (4–6px). Grup form berjarak 16–24px. Seksi halaman berjarak lega (64–96px).
  - **Pola F**: Untuk dashboard analitik, feed data, dan tabel.
  - **Pola Z**: Untuk landing page promosi dan alur pengenalan produk.

#### 2. Harmoni — Kohesi Visual
Semua elemen harus terasa seperti milik keluarga yang sama.
- **Skala spacing (grid 8pt)**: 4px, 8px, 16px, 24px, 32px, 48px.
- **Konsistensi border radius**: Elemen kecil (rounded-full), sedang (rounded-md), besar (rounded-xl). Jangan campurkan rounded-none dengan rounded-2xl di layar yang sama.
- **Harmoni warna**: Analogis, komplementer, triadik, atau monokromatik — pilih satu skema dan patuhi.

#### 3. Konsistensi — Kurangi Beban Kognitif
Pengguna tidak pernah bertanya-tanya "bagaimana cara ini bekerja?" — pola harus dapat diprediksi.
- Konvensi platform: CTA utama di kanan atas (nav desktop) atau bawah tengah (mobile).
- Aksi destruktif selalu memerlukan dialog konfirmasi.
- Semua komponen sejenis menggunakan radius, padding, dan perilaku yang sama.

### Pembaruan Apple HIG 2026

#### Desain Spasial (Vision Pro)
Gunakan kedalaman sebagai alat organisasi. Gunakan glass-morphism (`backdrop-blur`) untuk panel. Hindari elemen interaktif di luar sudut pandang yang nyaman.

#### Pola iOS 18
Liquid Glass untuk navigation bar. Tata letak adaptif dari iPhone ke iPad ke Mac. SF Symbols 6 dengan rendering variabel.

### Material Design 3 (Google) — Arsitektur Modern (https://m3.material.io/)

#### 1. Warna Dinamis & Sistem HCT Algoritmik
M3 menghasilkan palet warna yang harmonis dan aksesibel secara dinamis dari warna seed atau wallpaper pengguna menggunakan model warna perseptual **HCT (Hue, Chroma, Tone)**:
```typescript
import { argbFromHex, themeFromSourceColor } from '@material/material-color-utilities';

// Menghasilkan 5 palet tonal (Primary, Secondary, Tertiary, Neutral, Neutral Variant)
const theme = themeFromSourceColor(argbFromHex('#6750A4'));
// Skema mode terang/gelap menjamin kontras WCAG AA (perbedaan Tone >= 40 atau 50)
```

#### 2. Hierarki Surface Container (Elevasi Tanpa Bayangan Tebal)
Alih-alih hanya mengandalkan drop shadow tebal, M3 modern menetapkan kedalaman melalui **Tingkatan Tonal Surface Container**:
- `surface-dim` / `surface` / `surface-bright`: Permukaan viewport dasar.
- `surface-container-lowest` & `surface-container-low`: Kartu bersarang atau pengelompokan list.
- `surface-container`: Kontainer default kartu, dialog, dan panel.
- `surface-container-high` & `surface-container-highest`: Lembar melayang (sheet), menu, dan search bar.

#### 3. Hierarki Komponen & Tingkatan Tonal
- **Tombol (5 Tingkatan)**:
  - `Filled`: Aksi utama berpenekanan tinggi (`bg-primary text-on-primary`).
  - `Tonal`: Alternatif berpenekanan sedang-tinggi (`bg-secondary-container text-on-secondary-container`).
  - `Elevated`: Penekanan tinggi pada latar belakang bertekstur/sibuk dengan bayangan halus.
  - `Outlined`: Aksi sekunder berpenekanan sedang-rendah dengan garis batas bersih (`border-outline`).
  - `Text`: Aksi berpenekanan terendah di dalam kartu, dialog, atau list datar.
- **Kartu (3 Tingkat)**: `Elevated` (bayangan 1dp saat diam), `Filled` (`surface-container-highest`), dan `Outlined` (`border-outline-variant`).
- **Chip (4 Tipe)**: `Assist` (aksi pintar), `Filter` (status toggle), `Input` (tag/entitas), `Suggestion` (rekomendasi AI).
- **Navigasi Adaptif M3**:
  - `Compact (<600dp)`: Navigation Bar (Bawah 80dp, indikator pil aktif).
  - `Medium (600-839dp)`: Navigation Rail (Sisi vertikal 80dp, FAB atas + ikon destinasi).
  - `Expanded (>=840dp)`: Navigation Drawer (Sidebar permanen 280-360dp).

#### 4. Sintesis Triad Desain: Apple HIG vs Google M3
| Dimensi | Apple Human Interface Guidelines (HIG) | Google Material Design 3 (M3) |
| :--- | :--- | :--- |
| **Filosofi Inti** | Content-First, Deference, Kejelasan | Ekspresif, Adaptif, Personalisasi (Material You) |
| **Kedalaman & Material** | Liquid Glass, Vibrancy, Efek Blur | Tingkatan Tonal Surface Container + Surface Tinting |
| **Model Warna** | Semantic System Colors + Pasangan Dark Mode | Ruang Algoritmik HCT + 5 Palet Tonal Dinamis |
| **Ikonografi** | SF Symbols 6 (Multicolor, Hierarchical) | Material Symbols (Variabel: Weight, Grade, Fill) |
| **Target Sentuh** | Minimal 44×44pt | Disarankan 48×48dp (Minimal 24×24dp) |
| **Kelengkungan Sudut** | Continuous Squircle / Superellipse | Skala Radius Eksplisit (0, 4, 8, 12, 16, 28, 9999px) |

### Protokol Audit HIG
Saat meninjau desain, periksa:
1. **Hierarki**: Apakah aksi utama langsung terlihat jelas? Apakah kontras teks memadai?
2. **Harmoni**: Apakah spacing konsisten (grid 8pt)? Apakah border radius seragam?
3. **Konsistensi**: Apakah elemen interaktif mengikuti konvensi platform?
4. **Aksesibilitas**: Apakah lulus WCAG 2.2? Apakah target sentuh ≥ 24×24px?
5. **Kesesuaian Platform**: Apakah terasa native untuk platform target?
6. **Kebersihan Visual Anti-Slop (`anti-slop`)**: Apakah gradien neon AI ungu/sian generik dilarang? Apakah kelima status interaktif terpenuhi? Apakah konten bebas dari teks pengisi "Lorem Ipsum"? Apakah border-radius seragam dan koheren di seluruh layar?