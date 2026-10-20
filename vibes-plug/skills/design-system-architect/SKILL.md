---
name: design-system-architect
description: "Expert guide for designing, building, and maintaining scalable UI design systems with design tokens, headless primitives, Material Design 3 (M3), Tailwind v4 @theme, and WCAG 2.2 accessibility."
author: "Roedy Rustam"

version: "4.3.0"
---

# Design System Architect (2026 Edition — shadcn/ui Registry)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Expert guide for building and maintaining scalable UI design systems. Covers design tokens with OKLCH and Tailwind v4 `@theme`, **Material Design 3 (M3)** integration, headless component primitives (Radix UI, **Base UI 1.x**), **shadcn/ui registry** for distributable component libraries, CVA for type-safe variants, and WCAG 2.2 accessibility compliance.

### Trigger Conditions
- Building a shared UI component library from scratch.
- Setting up design tokens (colors, typography, spacing) with Tailwind v4.
- Applying Material Design 3 (M3) principles (https://m3.material.io/).
- Using headless primitives (Radix UI, Base UI 1.x) with custom styling.
- Distributing components via the **shadcn/ui registry** format.
- Auditing a component library for WCAG 2.2 accessibility compliance.
- Enforcing `anti-slop` quality standards on component primitives and tokens.

### Anti-Slop Component Design Contract
- **Zero Div-Soup Primitives**: Build exclusively on accessible headless primitives (Radix UI, Base UI 1.x) using semantic HTML (`<button>`, `<dialog>`, `<nav>`, `<input>`).
- **Visual Hierarchy & Surface Layering Contract**: Enforce explicit surface container tiers (Canvas L0, Card L1, Raised L2, Overlay L3) with crisp 1px solid borders (`border-border`) and directional micro-shadows (`shadow-xs`). Ban muddy 30px black shadows and ungrounded neon glow orbs.
- **Single Focal Primary Action**: Component presets must enforce a single primary CTA variant per view; secondary and tertiary actions must map to outline, tonal, or ghost variants.
- **Mandatory 5 States**: Every component primitive must explicitly define: default, hover/active, visible keyboard `focus-visible:ring-2`, loading/skeleton state, and disabled/error styling.
- **Optical Typography & Tabular Figures**: Headings must default to tight letter-spacing (`tracking-tight`), uppercase eyebrows to wide letter-spacing (`tracking-wider`), and all numeric/counter/price components must enforce `tabular-nums`.
- **Contracted Contrast Tokens**: All semantic tokens must pass WCAG 2.2 AA contrast ratios (>= 4.5:1 text, >= 3:1 graphical elements) in both light and dark themes.
- **Strict Scale Compliance**: Ban arbitrary pixel values (`p-[13px]`); enforce unified `@theme` tokens.

### Design Token Foundation (Tailwind v4 + OKLCH)

```css
/* packages/ui/src/tokens.css */
@import "tailwindcss";

@theme {
  /* --- Color System (OKLCH for wide-gamut P3 displays) --- */
  /* Brand */
  --color-brand-50:  oklch(97% 0.015 250);
  --color-brand-100: oklch(93% 0.04  250);
  --color-brand-500: oklch(55% 0.22  250);
  --color-brand-700: oklch(40% 0.18  250);
  --color-brand-900: oklch(20% 0.10  250);

  /* Semantic (maps to brand in light/dark automatically) */
  --color-primary:     var(--color-brand-500);
  --color-primary-fg:  oklch(100% 0 0);        /* White */
  --color-surface:     oklch(100% 0 0);        /* White */
  --color-surface-canvas:  oklch(98.5% 0.005 250); /* L0 Canvas */
  --color-surface-card:    oklch(100% 0 0);        /* L1 Card */
  --color-surface-raised:  oklch(100% 0 0);        /* L2 Popover/Raised */
  --color-surface-overlay: oklch(99% 0.005 250);   /* L3 Modal Dialog */
  --color-surface-2:   oklch(97% 0.005 250);
  --color-border:      oklch(90% 0.01  250);
  --color-text:        oklch(15% 0.02  250);        /* >= 7:1 Contrast */
  --color-text-secondary: oklch(45% 0.015 250);    /* >= 4.5:1 Contrast */
  --color-text-muted:  oklch(50% 0.015 250);
  --color-destructive: oklch(55% 0.22  25);    /* Red */

  /* Optical Letter-Spacing */
  --tracking-tighter: -0.04em;
  --tracking-tight:   -0.02em;
  --tracking-normal:   0em;
  --tracking-wide:     0.025em;
  --tracking-wider:    0.05em;

  /* --- Fluid Typography (clamp) --- */
  --font-sans: "Inter Variable", "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
  --font-size-xs:   clamp(0.7rem, 0.17vi + 0.66rem, 0.75rem);
  --font-size-sm:   clamp(0.8rem, 0.17vi + 0.76rem, 0.875rem);
  --font-size-base: clamp(0.9rem, 0.17vi + 0.86rem, 1rem);
  --font-size-lg:   clamp(1rem, 0.17vi + 0.96rem, 1.125rem);
  --font-size-xl:   clamp(1.1rem, 0.34vi + 1.02rem, 1.25rem);
  --font-size-2xl:  clamp(1.2rem, 0.69vi + 1.03rem, 1.5rem);
  --font-size-3xl:  clamp(1.5rem, 0.86vi + 1.29rem, 1.875rem);
  --font-size-4xl:  clamp(1.8rem, 1.03vi + 1.54rem, 2.25rem);

  /* --- Spacing & Radius --- */
  --radius-sm:  0.25rem;
  --radius-md:  0.5rem;
  --radius-lg:  0.75rem;
  --radius-xl:  1rem;
  --radius-full: 9999px;

  /* --- Animation --- */
  --animate-fade-in:   fade-in   0.2s ease-out;
  --animate-slide-up:  slide-up  0.3s cubic-bezier(0.16, 1, 0.3, 1);
  --animate-scale-in:  scale-in  0.2s ease-out;
}

/* Dark mode tokens */
@variant dark {
  :root {
    --color-surface:    oklch(10% 0.015 250);
    --color-surface-2:  oklch(15% 0.015 250);
    --color-border:     oklch(25% 0.02  250);
    --color-text:       oklch(95% 0.005 250);
    --color-text-muted: oklch(60% 0.01  250);
  }
}
```

### Material Design 3 (M3) Complete Architecture (https://m3.material.io/)
When implementing or adhering to **Google Material Design 3 (Material You)**, strictly apply the 8 foundational pillars and token system:

#### 1. 3-Tier Token Architecture
M3 organizes design tokens into three strict tiers:
- **Reference Tokens (`md.ref.*`)**: Primitive building blocks storing raw values (e.g. `md.ref.palette.primary40: #6750A4`).
- **System Tokens (`md.sys.*`)**: Context-aware decisions that dynamically adapt between light and dark modes (e.g. `md.sys.color.primary`, `md.sys.elevation.level2`, `md.sys.shape.corner-large`).
- **Component Tokens (`md.comp.*`)**: Element-specific styling attributes (e.g. `md.comp.filled-button.container.color: var(--md-sys-color-primary)`).

#### 2. Dynamic Color & Algorithmic HCT (Hue, Chroma, Tone)
M3 replaces RGB/HSL color matching with the perceptually uniform **HCT space**. Tone (0 to 100) dictates absolute luminance, mathematically guaranteeing WCAG contrast across all hues:
- Difference of $\Delta \text{Tone} \ge 40$ guarantees $\ge 3:1$ contrast (large text/graphics).
- Difference of $\Delta \text{Tone} \ge 50$ guarantees $\ge 4.5:1$ contrast (standard body text).

Dynamic color extraction pipeline from seed color via `@material/material-color-utilities`:
```typescript
import { argbFromHex, themeFromSourceColor } from '@material/material-color-utilities';

// Generate 5 core tonal palettes from a single brand seed
const theme = themeFromSourceColor(argbFromHex('#6750A4'));
// Schemes contain full light/dark role maps:
// theme.schemes.light.primary, theme.schemes.dark.primary
```

#### 3. Complete 25+ Color Roles & Surface Container Tier
Never use static hex colors. Map all elements to semantic M3 color roles:
- **Accent Keys & Containers**:
  - `primary` / `on-primary` (High-emphasis CTA)
  - `primary-container` / `on-primary-container` (Medium-high emphasis fill)
  - `secondary` / `on-secondary` (Filter chips, secondary elements)
  - `secondary-container` / `on-secondary-container` (Active nav pill, subtle highlight)
  - `tertiary` / `on-tertiary` (Balanced contrasting accent, creative accents)
  - `tertiary-container` / `on-tertiary-container` (Callouts, tags, contextual banners)
  - `error` / `on-error` & `error-container` / `on-error-container` (Alerts, validation errors)
- **Modern Surface Container Hierarchy (Zero-Shadow Elevation)**:
  Modern M3 deprecates heavy drop shadows in favor of **Surface Container Tonal Tiers**:
  - `surface-dim` (Tone 87 L / Tone 6 D): Background grounding
  - `surface` (Tone 98 L / Tone 6 D): Baseline surface
  - `surface-bright` (Tone 98 L / Tone 24 D): High-contrast surface
  - `surface-container-lowest` (Tone 100 L / Tone 4 D): Contained elements on dark canvas
  - `surface-container-low` (Tone 96 L / Tone 10 D): Contained cards, grouped lists
  - `surface-container` (Tone 94 L / Tone 12 D): Default cards, dialogs, bottom sheets
  - `surface-container-high` (Tone 92 L / Tone 17 D): Floating search bars, action popups
  - `surface-container-highest` (Tone 90 L / Tone 22 D): Top-level modal overlays
- **Borders & Outlines**:
  - `outline`: High-contrast borders (text field boundaries, unselected buttons).
  - `outline-variant`: Subtle dividers, table row borders, card outlines.

#### 4. Elevation & Surface Tinting (Levels 0–5)
Elevation conveys z-axis separation using **surface tinting** (primary color blended onto surface) and ambient diffuse shadow:
- **Level 0 (0dp)**: Flat surface, 0% tint overlay, no shadow.
- **Level 1 (1dp)**: Resting cards, search bar, 5% tint overlay, `box-shadow: 0 1px 3px rgba(0,0,0,0.12)`.
- **Level 2 (3dp)**: Hovered cards, small menus, 8% tint overlay, `box-shadow: 0 2px 6px rgba(0,0,0,0.15)`.
- **Level 3 (6dp)**: Floating Action Button (FAB), 11% tint overlay, `box-shadow: 0 4px 12px rgba(0,0,0,0.18)`.
- **Level 4 (8dp)**: Active/pressed FAB, 12% tint overlay, `box-shadow: 0 6px 16px rgba(0,0,0,0.20)`.
- **Level 5 (12dp)**: Modal dialogs, time pickers, 14% tint overlay, `box-shadow: 0 8px 24px rgba(0,0,0,0.24)`.

#### 5. Typography Scale (15 Baseline + 15 Emphasized)
M3 defines 5 type roles in Large, Medium, Small with strict optical sizing and tracking:
- `display-large` (57px/64px -0.25 tracking) | `display-medium` (45px/52px) | `display-small` (36px/44px)
- `headline-large` (32px/40px) | `headline-medium` (28px/36px) | `headline-small` (24px/32px)
- `title-large` (22px/28px) | `title-medium` (16px/24px 0.15 tracking) | `title-small` (14px/20px 0.1 tracking)
- `body-large` (16px/24px 0.5 tracking) | `body-medium` (14px/20px 0.25 tracking) | `body-small` (12px/16px 0.4 tracking)
- `label-large` (14px/20px 0.1 tracking, weight 500) | `label-medium` (12px/16px 0.5 tracking) | `label-small` (11px/16px 0.5 tracking)

#### 6. Shape Scale & Corner Radii
Corner radius communicates component structure:
- `corner-none`: 0px (Full-bleed images, dividers)
- `corner-extra-small`: 4px (Text fields, snackbars, autocomplete)
- `corner-small`: 8px (Chips, tooltips)
- `corner-medium`: 12px (Cards, compact dialogs)
- `corner-large`: 16px (Navigation drawers, modal bottom sheets, standard FABs)
- `corner-extra-large`: 28px (Large modal dialogs, date/time pickers)
- `corner-full`: 9999px (Pill buttons, badges, active search bar, navigation indicators)

#### 7. Adaptive Window Size Classes
M3 adapts navigation and layout structures according to window size classes:
- **Compact (< 600dp)**: Mobile portrait. Navigation Bar (bottom 80dp), 16dp screen margins, 4-column layout.
- **Medium (600–839dp)**: Tablets & foldables. Navigation Rail (side 80dp), 24dp margins, 8-column layout.
- **Expanded (≥ 840dp)**: Desktops & landscape tablets. Persistent Navigation Drawer (280–360dp), 24dp margins, 12-column layout, multi-pane list-detail views.

#### 8. M3 Tailwind v4 `@theme` Mapping Architecture
```css
@theme {
  /* M3 System Color Roles (OKLCH mapping) */
  --color-md-sys-primary:                 oklch(55% 0.22 270);
  --color-md-sys-on-primary:              oklch(100% 0 0);
  --color-md-sys-primary-container:       oklch(90% 0.08 270);
  --color-md-sys-on-primary-container:    oklch(20% 0.12 270);

  --color-md-sys-secondary:               oklch(58% 0.08 270);
  --color-md-sys-on-secondary:            oklch(100% 0 0);
  --color-md-sys-secondary-container:     oklch(92% 0.03 270);
  --color-md-sys-on-secondary-container:  oklch(22% 0.06 270);

  --color-md-sys-surface:                 oklch(98% 0.005 270);
  --color-md-sys-on-surface:              oklch(18% 0.015 270);
  --color-md-sys-surface-container-low:   oklch(96% 0.008 270);
  --color-md-sys-surface-container:       oklch(94% 0.012 270);
  --color-md-sys-surface-container-high:  oklch(92% 0.015 270);

  --color-md-sys-outline:                 oklch(55% 0.02 270);
  --color-md-sys-outline-variant:         oklch(82% 0.015 270);

  /* M3 Shapes */
  --radius-md-sys-xs:   4px;
  --radius-md-sys-sm:   8px;
  --radius-md-sys-md:   12px;
  --radius-md-sys-lg:   16px;
  --radius-md-sys-xl:   28px;
  --radius-md-sys-full: 9999px;

  /* M3 Elevation Shadows */
  --shadow-md-sys-1: 0 1px 3px 1px rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.30);
  --shadow-md-sys-2: 0 2px 6px 2px rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.30);
  --shadow-md-sys-3: 0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px 0 rgba(0, 0, 0, 0.30);
}
```

### Component Architecture

#### Headless + Styled Pattern (Base UI 1.x / Radix UI)
Use headless primitives for accessibility, apply styles via Tailwind + CVA:

```typescript
// packages/ui/src/button.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-fg shadow-sm hover:brightness-110 active:brightness-90',
        secondary:   'bg-surface-2 text-text border border-border hover:bg-surface hover:border-brand-300',
        destructive: 'bg-destructive text-white hover:brightness-110',
        ghost:       'hover:bg-surface-2 text-text',
        link:        'text-primary underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm:   'h-8  px-3 text-xs',
        md:   'h-9  px-4 text-sm',
        lg:   'h-11 px-6 text-base',
        icon: 'h-9  w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### Component Layout (Container Queries over Media Queries)
Avoid `@media` queries for internal component styling. Use **CSS Container Queries (`@container`)** so components respond to their wrapper, not the viewport. This makes components truly reusable anywhere.
```tsx
// Example of a container-aware component using Tailwind v4
<div className="@container">
  <div className="flex flex-col @md:flex-row gap-4">
    <div className="p-4 bg-surface rounded-xl">Fluid Card</div>
  </div>
</div>
```

### shadcn/ui Registry — Distributable Components (2026)

shadcn/ui v2 introduces a **registry** system — distribute your components as a shareable library that others can `npx shadcn add` into their projects:

```json
// registry.json — defines your component library
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "my-ui",
  "homepage": "https://ui.myapp.com",
  "items": [
    {
      "name": "button",
      "type": "registry:ui",
      "title": "Button",
      "description": "Multi-variant button component with CVA",
      "files": [
        { "path": "registry/ui/button.tsx", "type": "registry:ui" }
      ],
      "tailwind": {
        "config": {
          "theme": {
            "extend": {
              "colors": { "primary": "hsl(var(--primary))" }
            }
          }
        }
      }
    }
  ]
}
```

```bash
# Users install your components directly
npx shadcn add https://ui.myapp.com/registry.json button
npx shadcn add https://ui.myapp.com/registry.json card dialog
```

### Base UI 1.x — Unstyled Accessibility Primitives
Base UI (from MUI team) is the 2026 alternative to Radix UI with React 19 native support:
```typescript
import { Dialog, Button, Select } from '@base-ui-components/react';

// Fully unstyled — apply any className/Tailwind styles
<Dialog.Root>
  <Dialog.Trigger render={<Button />}>Open Dialog</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Backdrop className="fixed inset-0 bg-black/50 animate-fade-in" />
    <Dialog.Popup className="fixed inset-0 m-auto h-fit max-w-md rounded-xl bg-surface p-6 shadow-xl animate-slide-up">
      <Dialog.Title className="text-lg font-semibold">Title</Dialog.Title>
      <Dialog.Close className="absolute right-4 top-4">✕</Dialog.Close>
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>
```

### The 4 Pillars of UI Components Catalog

#### 1. Input Controls (Buttons, Inputs, Selects)
- **Visual States**: Explicitly define `default`, `hover`, `active`, `focus`, `disabled`, and `error`.
- **Validation**: Display inline validation on blur using `aria-invalid` and `aria-describedby` (React Hook Form + Zod).
- **Touch Targets**: Minimum 44×44px (WCAG 2.5.8), M3 recommends 48×48px.
- **M3 Integration**: Use M3 button tiers (Filled, Tonal, Elevated, Outlined, Text) and FABs for primary actions.

#### 2. Navigation (Navbars, Tabs, Command Palettes)
- **Command Palette**: Add `⌘K` command menu via `cmdk`.
- **Responsive Layout**: Bottom nav (<768px), collapsible rail (tablet), full sidebar (desktop).
- **Smooth Page Transitions**: In Next.js 15, leverage `<Link viewTransition>` for layout morphing.
- **Active State**: Clear high-contrast indicator with `role="navigation"` and `aria-current="page"`.

#### 3. Information & Feedback (Toasts, Skeletons, Empty States)
- **Toasts**: Use **Sonner**; cap at max 3 concurrent visible toasts. Auto-dismiss success, keep errors persistent.
- **Loading UX**: Use layout-matching Skeletons over spinners to eliminate Cumulative Layout Shift (CLS).
- **Empty States**: Clear illustration, contextual message, and primary CTA.

#### 4. Containers & Layout (Cards, Modals, Sheets)
- **Modals & Dialogs**: Radix UI / Base UI Dialog with automatic focus trapping and background scroll lock.
- **Sheets / Drawers**: Bottom sheet for mobile secondary actions; side sheet on desktop.
- **Cards**: Flat border or subtle shadow (`shadow-sm`); avoid heavy drop shadows in light mode.

### WCAG 2.2 Accessibility Checklist
- [ ] All interactive elements have visible focus indicators (`ring-2`).
- [ ] Color contrast ≥ 4.5:1 (text), ≥ 3:1 (large text / UI components).
- [ ] All images have `alt` text; decorative images have `alt=""`.
- [ ] All form inputs have associated `<label>` elements.
- [ ] Keyboard navigation works for all interactions (Tab, Enter, Space, Escape, Arrow keys).
- [ ] `aria-label` or `aria-labelledby` on icon buttons.
- [ ] Modals trap focus and restore it on close.
- [ ] No content relies on color alone to convey information.
- [ ] Touch targets ≥ 24×24px (WCAG 2.2 new requirement).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `anti-slop`, `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan ahli untuk membangun dan memelihara design system UI yang skalabel. Mencakup design token dengan OKLCH dan `@theme` Tailwind v4, primitif komponen headless (Radix UI, **Base UI 1.x**), **registry shadcn/ui** untuk distribusi library komponen, CVA untuk varian type-safe, dan kepatuhan aksesibilitas WCAG 2.2.

### Kondisi Pemicu
- Membangun library komponen UI bersama dari awal.
- Menyiapkan design token (warna, tipografi, spacing) dengan Tailwind v4.
- Menerapkan prinsip Material Design 3 (M3) (https://m3.material.io/).
- Menggunakan primitif headless (Radix UI, Base UI 1.x) dengan styling kustom.
- Mendistribusikan komponen via format **registry shadcn/ui**.
- Mengaudit library komponen untuk kepatuhan aksesibilitas WCAG 2.2.
- Menegakkan standar kualitas `anti-slop` pada primitif komponen dan token visual.

### Kontrak Desain Komponen Anti-Slop
- **Nol Primitif Div-Soup**: Bangun komponen secara eksklusif menggunakan primitif headless aksesibel (Radix UI, Base UI 1.x) dengan HTML5 semantik (`<button>`, `<dialog>`, `<nav>`, `<input>`).
- **Kontrak Hierarki Visual & Pelapisan Permukaan**: Tegakkan tingkatan surface container yang tegas (Kanvas L0, Kartu L1, Terangkat L2, Overlay L3) dengan border solid 1px tajam (`border-border`) dan micro-shadow terarah (`shadow-xs`). Dilarang keras bayangan hitam buram 30px dan lingkaran neon mengambang tanpa dasar fisik.
- **Hukum Aksi Utama Tunggal**: Preset komponen wajib membatasi hanya satu varian CTA utama per tampilan; aksi sekunder dan tersier wajib menggunakan varian outline, tonal, atau ghost.
- **Tipografi Optik & Angka Tabular**: Judul harus default menggunakan tracking rapat (`tracking-tight`), eyebrow menggunakan tracking renggang (`tracking-wider`), dan semua komponen angka/metrik/harga wajib menerapkan `tabular-nums`.
- **Wajib 5 Status Komponen**: Setiap primitif komponen wajib mengekspor status: default, hover/active, cincin fokus keyboard `focus-visible:ring-2`, status loading/skeleton, dan status disabled/error.
- **Token Kontras Terjamin**: Semua token warna semantik wajib lolos rasio kontras WCAG 2.2 AA (≥ 4.5:1 teks, ≥ 3:1 komponen antarmuka) di mode terang maupun gelap.
- **Kepatuhan Skala Ketat**: Dilarang menggunakan nilai piksel sembarangan (`p-[13px]`); tegakkan token `@theme` yang terpadu.

### Fondasi Design Token (Tailwind v4 + OKLCH)
Definisikan semua token di CSS menggunakan direktif `@theme`. Gunakan warna OKLCH untuk tampilan P3 wide-gamut. Definisikan token semantik (`--color-primary`, `--color-surface`, `--color-border`) yang secara otomatis beradaptasi antara mode terang/gelap melalui `@variant dark`.

### Arsitektur Lengkap Material Design 3 (M3) (https://m3.material.io/)
Ketika menerapkan atau mengacu pada **Google Material Design 3 (Material You)**, tegakkan 8 pilar fondasi dan sistem token berikut:

#### 1. Arsitektur Token 3 Tingkat
M3 mengorganisasi token desain ke dalam tiga hierarki:
- **Reference Tokens (`md.ref.*`)**: Blok pembangun primitif yang menyimpan nilai mentah (misal `md.ref.palette.primary40: #6750A4`).
- **System Tokens (`md.sys.*`)**: Keputusan desain berbasis konteks yang beradaptasi otomatis antara tema terang/gelap (misal `md.sys.color.primary`, `md.sys.elevation.level2`, `md.sys.shape.corner-large`).
- **Component Tokens (`md.comp.*`)**: Atribut styling spesifik komponen (misal `md.comp.filled-button.container.color: var(--md-sys-color-primary)`).

#### 2. Ruang Warna HCT Algoritmik & Warna Dinamis
M3 menggantikan pencocokan warna RGB/HSL dengan **ruang warna HCT (Hue, Chroma, Tone)** yang perseptual seragam. Tone (0 hingga 100) menentukan luminansi absolut dan menjamin kepatuhan kontras WCAG secara matematis pada semua rona:
- Selisih $\Delta \text{Tone} \ge 40$ menjamin kontras $\ge 3:1$ (teks besar/grafis UI).
- Selisih $\Delta \text{Tone} \ge 50$ menjamin kontras $\ge 4.5:1$ (teks isi standar).

Ekstraksi warna dinamis dari seed color via `@material/material-color-utilities`:
```typescript
import { argbFromHex, themeFromSourceColor } from '@material/material-color-utilities';

// Buat 5 palet tonal inti dari satu warna seed brand
const theme = themeFromSourceColor(argbFromHex('#6750A4'));
// Skema menghasilkan peran lengkap untuk mode terang dan gelap:
// theme.schemes.light.primary, theme.schemes.dark.primary
```

#### 3. 25+ Peran Warna & Tingkatan Surface Container
Dilarang menggunakan hex warna statis. Petakan elemen ke peran warna semantik M3:
- **Warna Aksen & Wadah**:
  - `primary` / `on-primary` (Tombol aksi utama/CTA kontras tinggi)
  - `primary-container` / `on-primary-container` (Wadah berbobot visual sedang-tinggi)
  - `secondary` / `on-secondary` (Filter chip, elemen aksen sekunder)
  - `secondary-container` / `on-secondary-container` (Indikator pil navigasi aktif)
  - `tertiary` / `on-tertiary` (Aksen kontras penyeimbang yang kreatif)
  - `tertiary-container` / `on-tertiary-container` (Callout, banner kontekstual)
  - `error` / `on-error` & `error-container` / `on-error-container` (Peringatan & error validasi)
- **Hierarki Surface Container Modern (Elevasi Tanpa Bayangan Tebal)**:
  M3 modern merekomendasikan **Surface Container Tiers** tonal alih-alih drop shadow tebal:
  - `surface-dim` (Tone 87 L / Tone 6 D): Latar belakang terdalam
  - `surface` (Tone 98 L / Tone 6 D): Permukaan dasar aplikasi
  - `surface-bright` (Tone 98 L / Tone 24 D): Permukaan kontras tinggi di mode gelap
  - `surface-container-lowest` (Tone 100 L / Tone 4 D): Wadah terendah pada kanvas gelap
  - `surface-container-low` (Tone 96 L / Tone 10 D): Kartu bersarang, pengelompokan list
  - `surface-container` (Tone 94 L / Tone 12 D): Wadah kartu default, dialog, bottom sheet
  - `surface-container-high` (Tone 92 L / Tone 17 D): Search bar melayang, menu popup
  - `surface-container-highest` (Tone 90 L / Tone 22 D): Overlay modal tingkat atas
- **Garis Batas (Borders & Outlines)**:
  - `outline`: Batas kontras tinggi (field teks, tombol unselected).
  - `outline-variant`: Pemisah halus (garis batas kartu, pemisah baris tabel).

#### 4. Tingkat Elevasi & Surface Tinting (Tingkat 0–5)
Elevasi menyampaikan kedalaman sumbu Z menggunakan **surface tinting** (warna primer yang ditumpangkan di atas surface) dipadukan dengan bayangan difus ambient:
- **Tingkat 0 (0dp)**: Permukaan datar, tint 0%, tanpa bayangan.
- **Tingkat 1 (1dp)**: Kartu resting, search bar, tint 5%, `box-shadow: 0 1px 3px rgba(0,0,0,0.12)`.
- **Tingkat 2 (3dp)**: Kartu saat di-hover, menu kecil, tint 8%, `box-shadow: 0 2px 6px rgba(0,0,0,0.15)`.
- **Tingkat 3 (6dp)**: Floating Action Button (FAB), tint 11%, `box-shadow: 0 4px 12px rgba(0,0,0,0.18)`.
- **Tingkat 4 (8dp)**: FAB saat ditekan/aktif, tint 12%, `box-shadow: 0 6px 16px rgba(0,0,0,0.20)`.
- **Tingkat 5 (12dp)**: Dialog modal, date/time picker, tint 14%, `box-shadow: 0 8px 24px rgba(0,0,0,0.24)`.

#### 5. Skala Tipografi (15 Baseline + 15 Emphasized)
M3 mendefinisikan 5 peran tipe dengan ukuran Large, Medium, Small serta tracking presisi:
- `display-large` (57px/64px -0.25 tracking) | `display-medium` (45px/52px) | `display-small` (36px/44px)
- `headline-large` (32px/40px) | `headline-medium` (28px/36px) | `headline-small` (24px/32px)
- `title-large` (22px/28px) | `title-medium` (16px/24px 0.15 tracking) | `title-small` (14px/20px 0.1 tracking)
- `body-large` (16px/24px 0.5 tracking) | `body-medium` (14px/20px 0.25 tracking) | `body-small` (12px/16px 0.4 tracking)
- `label-large` (14px/20px 0.1 tracking, weight 500) | `label-medium` (12px/16px 0.5 tracking) | `label-small` (11px/16px 0.5 tracking)

#### 6. Skala Bentuk & Radius Sudut
- `corner-none`: 0px (Gambar full-bleed, divider)
- `corner-extra-small`: 4px (Text field container, snackbar)
- `corner-small`: 8px (Chip, tooltip)
- `corner-medium`: 12px (Kartu, dialog kecil)
- `corner-large`: 16px (Navigation drawer, modal bottom sheet, FAB standar)
- `corner-extra-large`: 28px (Dialog modal penuh, date/time picker)
- `corner-full`: 9999px (Tombol bentuk pil, badge, search bar aktif)

#### 7. Kelas Ukuran Jendela Adaptif (Window Size Classes)
M3 membagi adaptasi tata letak berdasarkan lebar jendela:
- **Compact (< 600dp)**: Layar portrait ponsel. Navigation Bar (bawah 80dp), margin 16dp, tata letak 4-kolom.
- **Medium (600–839dp)**: Tablet & ponsel lipat. Navigation Rail (sisi 80dp), margin 24dp, tata letak 8-kolom.
- **Expanded (≥ 840dp)**: Desktop & tablet lanskap. Navigation Drawer permanen (280–360dp), margin 24dp, tata letak 12-kolom dengan multi-pane list-detail.

### Arsitektur Komponen
Gunakan pola Headless + Styled: primitif headless (Base UI/Radix) untuk aksesibilitas, gaya melalui Tailwind + CVA (class-variance-authority) untuk varian type-safe.

**Container Queries (`@container`)**: DILARANG keras menggunakan `@media` query (misal `md:`, `lg:`) untuk layout di dalam sebuah komponen. Gunakan **Container Queries (`@md:`, `@lg:`)** agar komponen dapat menyesuaikan diri dengan lebar pembungkusnya, bukan lebar layar secara keseluruhan. Ini membuat komponen Anda 100% *reusable*.

### Registry shadcn/ui — Komponen yang Dapat Didistribusikan (2026)
shadcn/ui v2 memperkenalkan sistem registry — distribusikan komponen Anda sebagai library yang dapat dibagikan sehingga orang lain dapat menginstalnya dengan `npx shadcn add [url] [komponen]`.

### Base UI 1.x — Primitif Aksesibilitas Tanpa Gaya
Base UI (dari tim MUI) adalah alternatif Radix UI untuk 2026 dengan dukungan native React 19. Sepenuhnya tanpa gaya — terapkan className/Tailwind apapun.

### Katalog 4 Pilar Komponen UI
1. **Input Controls (Tombol, Input, Select)**: Definisikan status visual (`default`, `hover`, `active`, `focus`, `disabled`, `error`). Tampilkan validasi inline on-blur (`aria-invalid`, `aria-describedby` via React Hook Form + Zod). Target sentuh minimal 44x44px.
2. **Navigasi (Navbar, Tab, Command Palette)**: Sediakan menu perintah `⌘K` dengan `cmdk`. Layout responsif (navigasi bawah di mobile, rail di tablet, sidebar penuh di desktop). Transisi halaman halus via `<Link viewTransition>` di Next.js 15.
3. **Informasi & Feedback (Toast, Skeleton, Empty State)**: Gunakan **Sonner** untuk toast (maksimal 3 bersamaan). Gunakan Skeleton sesuai tata letak untuk mencegah CLS dibanding spinner.
4. **Wadah & Layout (Card, Modal, Sheet)**: Dialog/Modal dengan penguncian scroll dan focus trapping otomatis (Base UI/Radix). Gunakan bottom sheet di mobile dan side sheet di desktop.

### Checklist Aksesibilitas WCAG 2.2
- Semua elemen interaktif memiliki indikator fokus yang terlihat.
- Kontras warna ≥ 4.5:1 (teks), ≥ 3:1 (komponen UI).
- Semua input form memiliki elemen `<label>` terkait.
- Navigasi keyboard berfungsi untuk semua interaksi.
- Modal menjebak fokus dan memulihkannya saat ditutup.
- Target sentuh ≥ 24×24px (persyaratan baru WCAG 2.2).


## Orchestration & Integration
- Integrates with `anti-slop` (ensures zero stubbed components, complete token sets, and 5-state resilience), frontend orchestrators, Tailwind v4, Base UI, and shadcn/ui.
