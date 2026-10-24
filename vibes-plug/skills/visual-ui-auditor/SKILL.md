---
name: visual-ui-auditor
description: "Expert guide for multimodal vision UI auditing (Gemini 4 Pro / Flash Vision, Claude 3.7 / 5.1 Sonnet, GPT-5 Vision) against Anti-Slop Pillar 7, 1px crisp borders, 3-tier radius scales, tabular numerals, and WCAG 2.2 AA / Panduan ahli audit visual UI berbasis vision multimodal."
author: "Roedy Rustam"
version: "4.3.0"
---

# Visual UI Auditor & Vision Quality Gate (Anti-Slop Pillar 7)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production guide for automated visual quality auditing using multimodal vision frontier models (Gemini 4 Pro/Flash Vision, Claude 3.7/5.1 Sonnet Vision, GPT-5 Vision). Standard text-based AST linters cannot evaluate spatial breathing room, perceived elevation, optical alignment, or contrast degradation under dynamic lighting. This skill combines automated regex/AST scanners with multimodal vision evaluation to audit UI code and rendered screenshots against the strict Anti-Slop Pillar 7 visual standard: 1px crisp borders, structured 3-tier radius scales, tabular numerals, eradication of generic neon radial glow orbs, and mandatory 5-state interactive contracts.

### Trigger Conditions
- Reviewing UI components, web pages, or application screenshots prior to release (Phase 5/6).
- Converting Figma designs or mockup screenshots into code (`screenshot-to-code-expert`).
- Auditing codebases for AI slop visual clichés (e.g., `bg-gradient-to-r from-blue-500 to-purple-600` or `rounded-full` on standard rectangular buttons).
- Enforcing WCAG 2.2 Level AA accessibility color contrast and keyboard focus indicators.

### The 20-Point Visual Quality Rubric

```
SCREENSHOT OR UI CODE
          │
          ▼
┌───────────────────────────────┐
│ 1. STATIC AST / REGEX SCAN    │  Bans `rounded-full` on buttons, generic blue-purple gradients
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ 2. MULTIMODAL VISION SAMPLING │  Evaluates optical balance, elevation, visual hierarchy
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ 3. STRUCTURED SCORECARD       │  Score (0-100), Verdict, Pixel-Level Fixes
└───────────────────────────────┘
```

#### The 6 Core Visual Laws (Pillar 7)
1. **Rejection of Pill-Button Addiction**: Standard rectangular action buttons must use structured radius (`rounded-md` 6px or `rounded-lg` 8px). `rounded-full` is strictly prohibited on non-circular/non-badge elements.
2. **1px Crisp Borders**: Elevated surfaces (dialogs, cards, dropdowns) must use crisp 1px borders (`border border-slate-200 dark:border-slate-800` or `rgba(255,255,255,0.08)`) to ground geometry rather than heavy floating drop-shadows.
3. **Anti-Generic Gradients**: Generic AI blue-to-purple gradients (`from-blue-500 to-purple-600`) and blurred neon radial backdrops are banned in favor of curated brand palettes.
4. **Tabular Numerals (`tabular-nums`)**: Monetary sums and data table counts must specify font tabular figures to prevent horizontal character shifting during live updates.
5. **5-State Interactive Affordance**: Buttons and controls must provide clear visual states for `default`, `hover`, `focus-visible`, `active` (pressed), and `disabled`.
6. **Anti-Decorative Emojis**: Prohibits rocket (`🚀`), sparkles (`✨`), and fire (`🔥`) clutter in enterprise titles and badges.

### Playwright Visual Regression Testing Snippet

```typescript
// tests/visual/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual UI Quality Gate', () => {
  test('dashboard should adhere to Anti-Slop Pillar 7 visual standards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check 1: Verify buttons do NOT use rounded-full (pill button addiction)
    const pillButtons = await page.$$eval(
      'button:not([data-badge]):not([data-icon-only])',
      (buttons) => buttons.filter((b) => getComputedStyle(b).borderRadius === '9999px').length
    );
    expect(pillButtons).toBe(0);

    // Check 2: Verify monetary values use tabular-nums
    const priceElements = await page.$$eval('.price-tag', (elements) =>
      elements.every((el) => getComputedStyle(el).fontVariantNumeric.includes('tabular-nums'))
    );
    expect(priceElements).toBe(true);

    // Check 3: Pixel-level screenshot regression comparison
    await expect(page).toHaveScreenshot('dashboard-baseline.png', {
      maxDiffPixelRatio: 0.02,
    });
  });
});
```

### CLI Execution via Vibes Tooling
```bash
# Audit a code snippet directly:
vibes visual-audit '<button className="rounded-lg border border-slate-200 px-4 py-2 hover:bg-slate-50 font-medium tabular-nums">Pay $150.00</button>'

# Audit a screenshot image file:
vibes visual-audit assets/dashboard-screenshot.png
```

## Orchestration & Integration
- **`screenshot-to-code-expert`**: Validates generated code against the original Figma mockup screenshot.
- **`ui-ux-pro-max`**: Provides design token palettes, spacing scales, and typography rules.
- **`design-system-architect`**: Establishes headless accessible primitives and token scales.
- **`anti-slop`**: Audits and rejects low-quality visual fluff and AI clichés.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi bersama `screenshot-to-code-expert`, `ui-ux-pro-max`, `design-system-architect`, `senior-frontend`, `tailwind-expert`, dan `anti-slop` untuk mengaudit antarmuka visual terhadap penegakan Anti-Slop Directive Pilar 7.

### Deskripsi
Panduan produksi untuk audit kualitas visual otomatis menggunakan model frontier vision multimodal (Gemini 4 Pro/Flash Vision, Claude 3.7/5.1 Vision, GPT-5 Vision). Linter berbasis teks tidak dapat menilai bobot spasial, elevasi permukaan, maupun kontras warna dinamis. Skill ini menggabungkan heuristik kode statis dengan rubrik vision multimodal untuk memeriksa screenshot dan kode sumber UI terhadap 6 hukum visual utama: border 1px presisi, skala 3-tier radius, angka tabular, pembersihan gradien klise AI, dan kontrak interaktif 5-state.

### Kondisi Pemicu
- Meninjau tampilan komponen UI atau screenshot aplikasi sebelum rilis produksi (Fase 5/6).
- Mengonversi desain atau mockup visual ke dalam kode modern (`screenshot-to-code-expert`).
- Menghapus elemen klise visual AI generik (gradien biru-ungu, tombol *pill* bulat berlebih, drop-shadow mengambang).
- Menegakkan kepatuhan aksesibilitas WCAG 2.2 Level AA.

### 6 Hukum Mutlak Kualitas Visual (Anti-Slop Pilar 7)
1. **Larangan Tombol Kapsul Bulat (*Pill Button*)**: Tombol aksi persegi panjang wajib menggunakan radius terstruktur (`rounded-md` 6px atau `rounded-lg` 8px). Penggunaan `rounded-full` dilarang keras kecuali untuk avatar atau badge status kecil.
2. **Border 1px Presisi**: Kartu, dialog, dan popover wajib memiliki garis tepi 1px (`border border-slate-200 dark:border-slate-800`) agar geometri antarmuka terlihat tegas dan kokoh, bukan mengambang dengan bayangan berlebihan.
3. **Pemberantasan Gradien Generik AI**: Gradien klise biru-ke-ungu (`from-blue-500 to-purple-600`) dan efek orb neon blur dilarang. Gunakan palet warna slate monokrom elegan yang mencerminkan kualitas Linear/Stripe/Apple.
4. **Angka Tabular (`tabular-nums`)**: Kolom data angka dan mata uang wajib menerapkan `tabular-nums` agar lebar karakter seragam dan tidak bergeser saat nilai diperbarui secara langsung.
5. **Kontrak Interaktif 5 Status**: Setiap tombol dan kontrol wajib memiliki status visual lengkap: *default*, *hover*, *focus-visible* (ring aksesibilitas keyboard), *active* (saat ditekan), dan *disabled*.
6. **Bebas Polusi Emoji Dekoratif**: Judul dasbor enterprise dilarang dipenuhi emoji dekoratif seperti 🚀, ✨, atau 🔥.

### Contoh Tombol Profesional Kualitas Stripe / Linear

```tsx
// src/components/ui/Button.tsx
export function PrimaryButton({ children, onClick, disabled }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        inline-flex items-center justify-center
        rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white
        transition-colors duration-150
        hover:bg-slate-800 hover:border-slate-800
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2
        active:bg-slate-950 active:scale-[0.98]
        disabled:pointer-events-none disabled:opacity-50
        tabular-nums shadow-xs
      "
    >
      {children}
    </button>
  );
}
```

## Integrasi Orkestrasi
- **`screenshot-to-code-expert`**: Memverifikasi keselarasan visual hasil generasi kode dengan gambar referensi.
- **`ui-ux-pro-max`**: Menyediakan pedoman jarak, tipografi, dan hierarki tata letak.
- **`design-system-architect`**: Menjaga konsistensi token desain di seluruh aplikasi.
- **`anti-slop`**: Menyingkirkan dekorasi berlebihan dan elemen desain tiruan.
