---
name: modern-css-native-expert
description: "Expert guide for cutting-edge Native CSS (2026 Standard) — CSS Anchor Positioning, @starting-style, View Transitions Level 2, Container Queries, and :has() / Panduan ahli fitur CSS native modern 2026."
author: "Roedy Rustam"

version: "4.3.0"
---

# Modern Native CSS Expert (2026 Standard & Primitives)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Purpose & Overview
Production-grade engineering guide for modern **Native CSS features (2026 Edition)** that replace cumbersome JavaScript libraries with pure browser-native primitives. Covers the **CSS Anchor Positioning API** for tooltips/popovers, **`@starting-style`** for smooth entry/exit animations on top-layer elements (`<dialog>`, `popover`), **View Transitions API Level 2**, **Container Queries (`@container`)**, and the **`:has()`** relational selector.

### Key Capabilities
1. **CSS Anchor Positioning**: Eliminating Floating UI / Popper.js dependencies. Tether tooltips, menus, and popovers to trigger elements natively with auto-flip fallbacks (`position-try-fallbacks`).
2. **Smooth Top-Layer Transitions**: Animating `<dialog>` and `[popover]` elements from `display: none` to visible with `@starting-style` and `transition-behavior: allow-discrete`.
3. **Container Queries (`@container`)**: Component-level responsive design based on parent container dimensions rather than viewport width.
4. **Relational `:has()` Selector**: Styling parent containers or sibling trees based on nested child states without React/JS state overhead.
5. **Native CSS Nesting & `@layer`**: Structuring clean, zero-build styles with cascade priority layers.

---

### Production Implementation Recipes

#### Recipe 1: Pure Native Anchor Positioning for Tooltips & Dropdowns (No JS)
```css
/* Define the anchor trigger button */
.anchor-trigger {
  anchor-name: --my-dropdown-anchor;
}

/* Tether the popover menu to the anchor trigger */
.dropdown-menu {
  position: fixed;
  position-anchor: --my-dropdown-anchor;
  
  /* Place below the anchor by default */
  top: anchor(bottom);
  left: anchor(left);
  margin-top: 8px;

  /* Automatic flip to top if screen boundary is reached */
  position-try-fallbacks: flip-block;
}
```

#### Recipe 2: Smooth `<dialog>` Entry/Exit Animation with `@starting-style`
```css
/* Dialog element with discrete transition support */
dialog {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
  transition: opacity 0.25s ease-out, transform 0.25s ease-out, display 0.25s allow-discrete;
}

/* Open state */
dialog[open] {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* Starting style when transitioning from display: none to open */
@starting-style {
  dialog[open] {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}

/* Backdrop smooth fade */
dialog::backdrop {
  background-color: rgb(0 0 0 / 0%);
  transition: background-color 0.25s ease-out, display 0.25s allow-discrete;
}

dialog[open]::backdrop {
  background-color: rgb(0 0 0 / 50%);
}

@starting-style {
  dialog[open]::backdrop {
    background-color: rgb(0 0 0 / 0%);
  }
}
```

---

#### Recipe 5: Material Design 3 (M3) Top-Layer Overlays with Emphasized Decelerate Easing
Implement M3 dialogs and modal bottom sheets natively using `<dialog>` and `@starting-style` with M3 Emphasized Decelerate Easing (`cubic-bezier(0.05, 0.7, 0.1, 1.0)`):

```css
/* M3 Modal Dialog using Native CSS Top-Layer with M3 Tokens */
dialog.m3-dialog {
  border: none;
  border-radius: var(--md-sys-shape-corner-extra-large, 28px);
  background-color: var(--md-sys-color-surface-container-high, #ECE6F0);
  color: var(--md-sys-color-on-surface, #1D1B20);
  box-shadow: var(--md-sys-elevation-level3, 0 4px 12px rgba(0, 0, 0, 0.18));
  padding: 24px;
  max-width: 560px;
  opacity: 0;
  transform: scale(0.9) translateY(16px);
  transition: 
    opacity 0.4s cubic-bezier(0.05, 0.7, 0.1, 1.0),
    transform 0.4s cubic-bezier(0.05, 0.7, 0.1, 1.0),
    display 0.4s allow-discrete;
}

dialog.m3-dialog[open] {
  opacity: 1;
  transform: scale(1) translateY(0);
}

@starting-style {
  dialog.m3-dialog[open] {
    opacity: 0;
    transform: scale(0.9) translateY(16px);
  }
}

dialog.m3-dialog::backdrop {
  background-color: rgb(0 0 0 / 0%);
  transition: background-color 0.4s cubic-bezier(0.05, 0.7, 0.1, 1.0), display 0.4s allow-discrete;
}

dialog.m3-dialog[open]::backdrop {
  background-color: rgb(0 0 0 / 32%); /* M3 Scrim */
}
```

---

### Implementation Checklist
- [ ] Replace JS positioning libraries (Popper, Floating UI) with native `anchor-name` and `position-anchor`.
- [ ] Use `@starting-style` and `transition-behavior: allow-discrete` for animating modals and popovers without JavaScript timers.
- [ ] Use `@container` on modular components to allow seamless reuse across sidebars, grids, and modals.
- [ ] Organize design tokens and reset styles into `@layer` (e.g. `@layer base, components, utilities;`).

## Orchestration & Integration
- Integrates with: `design-system-architect`, `design-system-architect, senior-frontend`, `tailwind-expert`, `senior-frontend`.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Tujuan & Gambaran Umum
Panduan rekayasa tingkat produksi untuk memanfaatkan **Fitur CSS Native Modern (Standar 2026)** yang menggantikan pustaka JavaScript berukuran besar dengan fitur asli browser. Mencakup **CSS Anchor Positioning API** untuk tooltip dan popover, **`@starting-style`** untuk animasi masuk dan keluar yang mulus pada elemen *top-layer* (`<dialog>`, `popover`), **View Transitions API Level 2**, **Container Queries (`@container`)**, dan selektor relasional **`:has()`**.

### Kemampuan Utama
1. **CSS Anchor Positioning**: Menghapus ketergantungan pada pustaka seperti Floating UI atau Popper.js. Mengikat tooltip, menu, dan popover ke tombol pemicu secara native dengan pembalikan posisi otomatis (`position-try-fallbacks`).
2. **Animasi Mulus Top-Layer**: Menganimasikan dialog dari status `display: none` ke tampil menggunakan `@starting-style` dan `transition-behavior: allow-discrete`.
3. **Container Queries (`@container`)**: Desain responsif berbasis ukuran kontainer induk, bukan lebar layar viewport.
4. **Selektor Relasional `:has()`**: Menata gaya elemen induk berdasarkan status elemen anak di dalamnya tanpa membutuhkan *state* JavaScript.
5. **Nesting Native & `@layer`**: Mengatur hierarki gaya CSS tanpa alat build dan mengontrol urutan spesifisitas secara terstruktur.

---

### Resep Implementasi Produksi

#### Resep 1: Anchor Positioning Murni untuk Menu Dropdown (Tanpa JavaScript)
```css
/* Definisikan tombol pemicu sebagai jangkar (anchor) */
.tombol-pemicu {
  anchor-name: --jangkar-menu;
}

/* Hubungkan menu popover ke tombol pemicu */
.menu-dropdown {
  position: fixed;
  position-anchor: --jangkar-menu;
  
  /* Posisikan di bawah tombol pemicu */
  top: anchor(bottom);
  left: anchor(left);
  margin-top: 8px;

  /* Balik posisi ke atas jika terpotong batas layar */
  position-try-fallbacks: flip-block;
}
```

#### Resep 2: Animasi Modal `<dialog>` dengan `@starting-style`
```css
dialog {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
  transition: opacity 0.25s ease-out, transform 0.25s ease-out, display 0.25s allow-discrete;
}

dialog[open] {
  opacity: 1;
  transform: scale(1) translateY(0);
}

@starting-style {
  dialog[open] {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}

dialog::backdrop {
  background-color: rgb(0 0 0 / 0%);
  transition: background-color 0.25s ease-out, display 0.25s allow-discrete;
}

dialog[open]::backdrop {
  background-color: rgb(0 0 0 / 50%);
}

@starting-style {
  dialog[open]::backdrop {
    background-color: rgb(0 0 0 / 0%);
  }
}
```

---

### Checklist Implementasi
- [ ] Ganti library positioning pihak ketiga dengan CSS `anchor-name` dan `position-anchor`.
- [ ] Gunakan `@starting-style` dan `transition-behavior: allow-discrete` untuk animasi modal tanpa jeda JavaScript.
- [ ] Gunakan `@container` pada komponen reusable agar adaptif di semua layout.
- [ ] Tata arsitektur CSS menggunakan `@layer base, components, utilities;`.

#### Resep 5: Overlay Top-Layer Material Design 3 (M3) dengan Easing Emphasized
Implementasikan dialog M3 dan modal bottom sheet secara native menggunakan `<dialog>` dan `@starting-style` dengan kurva Emphasized Decelerate M3 (`cubic-bezier(0.05, 0.7, 0.1, 1.0)`):
- Hubungkan token bentuk M3 (`--md-sys-shape-corner-extra-large: 28px`) dan surface container (`--md-sys-color-surface-container-high`).
- Backdrop scrim M3 transparan bertransisi halus ke opasitas 32% hitam (`rgb(0 0 0 / 32%)`).

---

## Integrasi Orkestrasi
- Terintegrasi dengan: `design-system-architect`, `design-system-architect, senior-frontend`, `tailwind-expert`, `senior-frontend`.