---
name: screenshot-to-code-expert
description: "Expert guide for converting UI screenshots, mockups, Figma frames, and whiteboard sketches into production-ready frontend code using vision-capable frontier models (Gemini 4 Pro, Claude 5.5, GPT Astra 6) — multi-pass visual extraction, component decomposition, responsive generation, and design token mapping / Panduan ahli konversi screenshot UI, mockup, frame Figma, dan sketsa whiteboard menjadi kode frontend siap produksi menggunakan model frontier berkemampuan vision — ekstraksi visual multi-pass, dekomposisi komponen, generasi responsif, dan pemetaan design token."
author: "Roedy Rustam"
version: "4.3.0"
---

# screenshot-to-code-expert — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `senior-frontend`, `design-system-architect`, `tailwind-expert`, `ui-ux-pro-max`, `modern-css-native-expert`, `multimodal-spatial-video-cloner`, `website-design-cloner`, `hig`, `svg-animation-motion-expert`, `frontier-ai-models-expert`, and `anti-slop` to produce pixel-perfect, accessible, production-grade code from visual inputs.

### Description
Production workflow for transforming visual design artifacts (screenshots, Figma exports, whiteboard photos, PDF mockups) into clean, semantic, responsive frontend code. Leverages the native vision capabilities of frontier models (Gemini 4 Pro's 2M multimodal context, Claude 5.5's pixel-level visual understanding, GPT Astra 6's design comprehension) to extract layout structure, color palettes, typography, spacing, and interaction patterns — then maps them to the project's existing design system and component library.

### Trigger Conditions
Activate this skill when:
- The user provides a screenshot, mockup, or design image and asks to "build this" or "convert to code."
- Translating Figma frames or exported design assets into React, Vue, Svelte, or HTML/CSS components.
- Reverse-engineering competitor UIs from screenshots for inspiration (not exact cloning).
- Rapidly prototyping UI from hand-drawn sketches or whiteboard photos.
- Performing visual QA by comparing rendered output against original design.

---

### Core Concepts & Patterns

#### 1. Multi-Pass Extraction Pipeline

Single-pass screenshot-to-code produces fragile output. Use a structured multi-pass approach:

```
PASS 1: STRUCTURAL ANALYSIS
  ├── Identify layout grid (columns, rows, flex/grid containers)
  ├── Detect component boundaries and nesting hierarchy
  └── Map semantic HTML elements (header, nav, main, aside, footer)

PASS 2: DESIGN TOKEN EXTRACTION
  ├── Extract color palette (convert to OKLCH for design system)
  ├── Identify typography (font family, size, weight, line-height)
  ├── Measure spacing rhythm (padding, margin, gap patterns)
  └── Detect border radii, shadows, and elevation levels

PASS 3: COMPONENT DECOMPOSITION
  ├── Break UI into reusable atomic components
  ├── Identify repeated patterns (cards, list items, badges)
  ├── Map to existing project components where possible
  └── Define component props and variant slots

PASS 4: RESPONSIVE BEHAVIOR INFERENCE
  ├── Predict mobile/tablet adaptations from desktop layout
  ├── Identify collapsible navigation patterns
  ├── Map breakpoint-appropriate layout shifts
  └── Infer touch targets and mobile interaction patterns

PASS 5: CODE GENERATION & REFINEMENT
  ├── Generate semantic HTML + CSS/Tailwind classes
  ├── Apply project's design tokens and component library
  ├── Add accessibility attributes (ARIA roles, alt text)
  └── Refine with anti-slop review (no placeholder content)
```

#### 2. Optimal Vision Prompt Template

```
Analyze this UI screenshot and generate production-ready code.

STRUCTURAL ANALYSIS:
1. Describe the overall layout (grid system, flex containers, positioning).
2. List every distinct component you see, from outermost to innermost.
3. Identify the semantic HTML structure.

DESIGN TOKENS:
4. Extract the exact color values used (provide as HSL and hex).
5. Identify fonts, sizes, weights, and line-heights.
6. Measure the spacing rhythm (base unit and multiples).

CODE GENERATION:
7. Generate the complete component code using [FRAMEWORK] with [STYLING_SYSTEM].
8. Map colors and spacing to the project's existing design tokens where matches exist.
9. Include all hover/focus/active states visible or implied.
10. Add proper ARIA attributes for accessibility.

CONSTRAINTS:
- Use semantic HTML elements, not generic divs.
- No placeholder text like "Lorem ipsum" — use realistic content matching what's shown.
- Implement responsive behavior for mobile breakpoints.
- Follow the project's existing naming conventions: [CONVENTIONS].
```

#### 3. Design Token Mapping Strategy

```typescript
export interface ExtractedDesignTokens {
  colors: Array<{
    usage: string;
    hex: string;
    oklch: string;
    closestProjectToken?: string;
  }>;
  typography: Array<{
    element: string;
    fontFamily: string;
    fontSize: string;
    fontWeight: number;
    lineHeight: string;
    closestProjectToken?: string;
  }>;
  spacing: Array<{
    context: string;
    value: string;
    closestProjectToken?: string;
  }>;
}

export function mapToProjectTokens(
  extracted: ExtractedDesignTokens,
  projectTokens: Record<string, string>
): ExtractedDesignTokens {
  const tokenValues = Object.entries(projectTokens);

  for (const color of extracted.colors) {
    const match = tokenValues.find(([, v]) => colorDistance(v, color.hex) < 10);
    if (match) color.closestProjectToken = match[0];
  }

  for (const type of extracted.typography) {
    const match = tokenValues.find(([, v]) => v === type.fontSize);
    if (match) type.closestProjectToken = match[0];
  }

  return extracted;
}

function colorDistance(hex1: string, hex2: string): number {
  const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
  return Math.sqrt((r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2);
}
```

#### 4. Visual QA Comparison Loop

After generating code, render it and compare against the original screenshot:

1. Capture a screenshot of the rendered component.
2. Send both original and rendered screenshots to the vision model.
3. Ask: "Compare these two images. List every visual difference in layout, color, spacing, typography, and alignment."
4. Iterate on the generated code until the model reports zero material differences.

---

### Best Practices

1. **Always Use Multi-Pass**: Single-pass generation produces low-quality code. Run structural analysis before code generation.
2. **Map to Existing Design System First**: Never generate ad-hoc hex colors or pixel values. Always check against the project's design tokens.
3. **Validate with Visual QA Loop**: Render the generated code and compare screenshots to catch pixel-level discrepancies.
4. **Specify the Target Stack**: Always tell the model which framework (React/Vue/Svelte), styling system (Tailwind/CSS Modules), and component library (Radix/Shadcn) to target.
5. **Handle Text Content Realistically**: Extract actual text visible in the screenshot. Never substitute with lorem ipsum.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Consequence | Remedy |
| :--- | :--- | :--- |
| Single-pass "just convert this" prompt | Fragile, unsemantic code with hardcoded values | Use structured multi-pass extraction pipeline |
| Ignoring project's existing design system | Generated code doesn't match the rest of the app | Map extracted tokens to project tokens first |
| No responsive consideration | Desktop-only output, broken on mobile | Infer responsive behavior in Pass 4 |
| Accepting first output without visual QA | Pixel-level differences compound into poor UX | Always run visual QA comparison loop |

---

### Integration with Other Skills (MANDATORY)

- `design-system-architect` — Map extracted design tokens to the project's token system.
- `senior-frontend` — Generate code using React 19 / Next.js 15 patterns and component conventions.
- `tailwind-expert` — Output Tailwind v4 utility classes aligned with `@theme` tokens.
- `multimodal-spatial-video-cloner` — For animated UI extraction from screen recordings.
- `website-design-cloner` — For full-page URL-based design extraction (complementary approach).
- `anti-slop` — Enforce zero placeholder content and dead code in generated output.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "UI/UX & Design Systems" matrix row.
- `zero-to-prod-orchestrator` — Integrated in Phase 5 (Frontend, Design Systems & Mobile Apps).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `senior-frontend`, `design-system-architect`, `tailwind-expert`, `ui-ux-pro-max`, `modern-css-native-expert`, `multimodal-spatial-video-cloner`, `website-design-cloner`, `hig`, `svg-animation-motion-expert`, `frontier-ai-models-expert`, dan `anti-slop` untuk menghasilkan kode presisi-piksel, aksesibel, dan siap produksi dari input visual.

### Deskripsi
Alur kerja produksi untuk mentransformasi artefak desain visual (screenshot, ekspor Figma, foto whiteboard, mockup PDF) menjadi kode frontend yang bersih, semantik, dan responsif. Memanfaatkan kemampuan vision native model frontier untuk mengekstrak struktur layout, palet warna, tipografi, jarak, dan pola interaksi — kemudian memetakannya ke design system dan library komponen proyek yang sudah ada.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Pengguna memberikan screenshot, mockup, atau gambar desain dan meminta "buatkan ini" atau "konversi ke kode."
- Menerjemahkan frame Figma atau aset desain yang diekspor menjadi komponen React, Vue, Svelte, atau HTML/CSS.
- Memprototipi UI dengan cepat dari sketsa tangan atau foto whiteboard.

---

### Konsep Inti & Pola Praktik

#### 1. Pipeline Ekstraksi Multi-Pass
Lima tahap terstruktur: Analisis Struktural, Ekstraksi Design Token, Dekomposisi Komponen, Inferensi Perilaku Responsif, dan Generasi Kode & Penyempurnaan.

#### 2. Strategi Pemetaan Design Token
Jangan pernah menghasilkan nilai warna hex atau piksel ad-hoc. Selalu periksa terhadap design token proyek yang sudah ada. Gunakan `colorDistance()` untuk menemukan kecocokan terdekat.

#### 3. Loop QA Visual
Setelah menghasilkan kode, render dan bandingkan screenshot hasil dengan screenshot asli. Iterasi sampai model melaporkan nol perbedaan material.

---

### Praktik Terbaik

1. **Selalu Gunakan Multi-Pass**: Generasi single-pass menghasilkan kode berkualitas rendah.
2. **Petakan ke Design System yang Ada**: Jangan pernah gunakan hex atau piksel hardcode.
3. **Validasi dengan Loop QA Visual**: Render kode dan bandingkan screenshot.
4. **Spesifikasikan Stack Target**: Selalu beritahu model framework, sistem styling, dan library komponen target.

---

### Integrasi dengan Skill Lain (WAJIB)

- `design-system-architect` — Petakan design token yang diekstrak ke sistem token proyek.
- `senior-frontend` — Hasilkan kode menggunakan pola React 19 / Next.js 15.
- `tailwind-expert` — Output kelas utilitas Tailwind v4 yang selaras dengan token `@theme`.
- `multimodal-spatial-video-cloner` — Untuk ekstraksi UI animasi dari rekaman layar.
- `anti-slop` — Tegakkan nol konten placeholder dan kode mati di output yang dihasilkan.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Ditambahkan ke baris "UI/UX & Design Systems" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Diintegrasikan di Fase 5 (Frontend, Design Systems & Mobile Apps).
