---
name: accessibility-testing-expert
description: "Expert guide for automated and manual Web Accessibility (a11y) testing — axe-core, Pa11y, Playwright a11y, screen reader testing, and WCAG 2.2 Level AA/AAA compliance / Panduan ahli pengujian aksesibilitas web."
author: "Roedy Rustam"

version: "4.3.0"
---

# Accessibility Testing Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
- **`global-a11y-i18n-expert`**: Core WCAG rules, ARIA patterns, and internationalization standards.
- **`e2e-testing-expert`**: Integrating automated accessibility assertions into Playwright/Vitest CI suites.
- **`design-system-architect, senior-frontend`**: Accessible component primitives (Radix UI, Base UI, ARIA patterns).
- **`browser-automation-expert`**: Visual QA audits for focus rings, contrast ratios, and layout flow using Vision LLM agents.
- **`anti-slop`**: Enforces strict accessibility rules (preventing stripped focus outlines, div-soup buttons, and color contrast violations).

### Description
Production guide for automated, semi-automated, and manual web accessibility (a11y) testing. Covers WCAG 2.2 Level AA/AAA compliance validation using `@axe-core/playwright`, Pa11y, Google Lighthouse CI, screen reader verification (NVDA, VoiceOver), keyboard navigation audits, focus management, and color contrast compliance.

### Trigger Conditions
- Running automated accessibility test suites in CI/CD pipelines.
- Auditing web apps for WCAG 2.1 / 2.2 Level AA compliance and legal accessibility requirements (ADA, EAA).
- Debugging keyboard traps, missing ARIA labels, or broken screen reader navigation.
- Writing test cases for focus trapping in modals and custom dialogs.

---

### Core Testing Workflows

#### 1. Automated A11y Testing with Playwright & Axe-Core
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Automated Audits', () => {
  test('homepage should have zero critical or serious a11y violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .disableRules(['color-contrast']) // If tested separately
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('modal dialog should trap focus and pass a11y audit', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button#open-modal');

    // Verify modal is open and focused
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    const modalAudit = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();

    expect(modalAudit.violations).toEqual([]);

    // Verify keyboard escape closes modal
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });
});
```

#### 2. Automated Pa11y CI Configuration (`.pa11yci.json`)
```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 15000,
    "runners": ["axe", "htmlcs"],
    "ignore": [
      "WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Abs"
    ]
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/login",
    "http://localhost:3000/pricing",
    "http://localhost:3000/docs"
  ]
}
```

#### 3. Keyboard & Screen Reader Verification Checklist
- **Tab Navigation**: All interactive elements (`<button>`, `<a>`, `<input>`) can receive focus in logical reading order.
- **Focus Indicators**: Visible, high-contrast focus rings (`outline: 2px solid var(--focus-color)` with `outline-offset`).
- **No Keyboard Traps**: Focus can enter and leave components using only `Tab`, `Shift+Tab`, and `Esc`.
- **Landmarks**: Proper semantic tags (`<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>`).
- **ARIA Attributes**: `aria-expanded`, `aria-controls`, `aria-haspopup`, and `aria-live` updated dynamically.

#### 4. Material Design 3 (M3) Accessibility & State Layer Assertions (https://m3.material.io/foundations/accessible-design/overview)
M3 enforces rigorous interaction states via standardized **State Layer Opacities** and an expanded **48×48dp Target Size**:

**1. M3 State Layer Opacity Matrix:**
- **Hover**: 8% (`0.08`) overlay of `on-surface` or `primary`.
- **Focus**: 10% (`0.10`) overlay with high-contrast ring.
- **Pressed**: 10% (`0.10`) overlay.
- **Dragged**: 16% (`0.16`) overlay.
- **Disabled**: Container opacity `38%` (`0.38`), content opacity `38%` (`0.38`).

**2. 48×48dp Minimum Touch Target Assertion (Playwright):**
```typescript
import { test, expect } from '@playwright/test';

test('interactive controls satisfy M3 48x48dp touch target standard', async ({ page }) => {
  await page.goto('/');

  const buttons = page.locator('button, a[role="button"], input[type="checkbox"]');
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    const box = await btn.boundingBox();
    if (box && await btn.isVisible()) {
      // M3 requires min 48x48dp bounding box for touch targets
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
    }
  }
});
```

#### 5. Sovereign Anti-Slop A11y Verification Gate
Zero-tolerance accessibility criteria for all generated interfaces:
- **No Stripped Focus Outlines**: Zero tolerance for `outline: none` or `focus:outline-none` without an explicit, high-contrast replacement ring (`focus-visible:ring-2 focus-visible:ring-offset-2`).
- **Semantic Elements Only**: Ban on non-semantic clickable divs/spans (`<div onClick=...>`). Every click target must be an authentic `<button>`, `<a>`, or provide `role="button"` + `tabIndex={0}` + keyboard event handlers (`onKeyDown` for Enter & Space).
- **Touch Target Minimums**: All interactive controls must satisfy WCAG 2.2 SC 2.5.8 (minimum 24×24px, recommended 44×44px with adequate padding).
- **Text Contrast Non-Negotiable**: Minimum 4.5:1 for normal body text, 3:1 for large text (18pt / 14pt bold).
- **Meaningful Labels**: Zero icon buttons without `aria-label` or screen-reader-only text (`<span className="sr-only">`).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
- **`global-a11y-i18n-expert`**: Pedoman standar WCAG, pola ARIA, dan aksesibilitas internasional.
- **`e2e-testing-expert`**: Integrasi pengujian aksesibilitas otomatis ke pipeline Playwright CI.
- **`design-system-architect, senior-frontend`**: Validasi aksesibilitas komponen headless dan desain UI.
- **`anti-slop`**: Menegakkan aturan aksesibilitas tanpa kompromi (mencegah penghapusan outline fokus, div-soup tombol, dan pelanggaran kontras warna).

### Deskripsi
Panduan produksi untuk pengujian aksesibilitas web (a11y) otomatis dan manual. Memastikan kepatuhan terhadap standar WCAG 2.2 Level AA/AAA menggunakan `@axe-core/playwright`, Pa11y, Lighthouse CI, pengujian screen reader, navigasi keyboard, dan kontras warna.

### Kondisi Pemicu
- Menjalankan audit aksesibilitas otomatis di pipeline CI/CD.
- Memverifikasi kepatuhan hukum aksesibilitas (WCAG 2.2, ADA, EAA).
- Menguji alur keyboard dan pembaca layar (screen reader) pada komponen kompleks seperti modal dan dropdown.

---

### Alur Pengujian Otomatis

#### 1. Pengujian Aksesibilitas Otomatis dengan Playwright & Axe-Core
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Audit Otomatis Aksesibilitas Web', () => {
  test('beranda bebas dari pelanggaran a11y kritis atau serius', async ({ page }) => {
    await page.goto('/');

    const hasilAudit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();

    expect(hasilAudit.violations).toEqual([]);
  });

  test('dialog modal mengunci fokus keyboard dan lolos audit a11y', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button#buka-modal');

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    const auditModal = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .analyze();

    expect(auditModal.violations).toEqual([]);

    // Verifikasi tombol Escape menutup modal
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });
});
```

#### 2. Konfigurasi CI Otomatis Pa11y (`.pa11yci.json`)
```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "timeout": 15000,
    "runners": ["axe", "htmlcs"]
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/masuk",
    "http://localhost:3000/harga",
    "http://localhost:3000/dokumentasi"
  ]
}
```

#### 3. Standar State Layer & Target Sentuh Material Design 3 (M3)
- **Matriks State Layer**:
  - Hover: Opacity 8% (`0.08`)
  - Focus: Opacity 10% (`0.10`) dengan ring kontras tinggi
  - Pressed: Opacity 10% (`0.10`)
  - Dragged: Opacity 16% (`0.16`)
  - Disabled: Opacity kontainer dan konten 38% (`0.38`)
- **Target Sentuh Minimum 48×48dp**: Meskipun aset visual hanya berukuran 24×24px, area sentuh interaktif wajib diperluas menjadi minimal 48×48dp menggunakan padding atau pseudo-elemen `::after`.

#### 4. Gerbang Verifikasi Aksesibilitas Anti-Slop
- **Dilarang Menghapus Outline Fokus**: Standar nol toleransi untuk `outline: none` atau `focus:outline-none` tanpa pengganti ring berlatar kontras tinggi (`focus-visible:ring-2 focus-visible:ring-offset-2`).
- **Wajib Elemen Semantik**: Larangan keras membuat div/span non-semantik yang dapat diklik (`<div onClick=...>`). Setiap target klik harus merupakan `<button>`, `<a>`, atau menyediakan `role="button"` + `tabIndex={0}` + penangan keyboard (`onKeyDown` untuk tombol Enter & Space).
- **Target Sentuh Minimum**: Semua kontrol interaktif harus memenuhi standar WCAG 2.2 SC 2.5.8 (minimal 24×24px, direkomendasikan 44×44px dengan padding memadai).
- **Kontras Teks Non-Negosiabel**: Minimal rasio 4.5:1 untuk teks biasa, dan 3:1 untuk teks berukuran besar (18pt / 14pt bold).
- **Label Bermakna**: Dilarang membuat tombol ikon tanpa `aria-label` atau teks khusus pembaca layar (`<span className="sr-only">`).