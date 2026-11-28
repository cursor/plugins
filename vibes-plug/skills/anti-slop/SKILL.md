---
name: anti-slop
description: "Sovereign Anti-AI Slop Directive & Enforcement Engine (2026 Unified Edition). Absolute zero-tolerance standard for lazy placeholders, conversational fluff, syntax narration, speculative over-engineering, hallucinated code, generic UI clichés, and 38 mandatory rules (R-01 to R-38) with Liveliness Dials (ENERGY/RHYTHM/MOTION), Two Usage Modes (During vs Audit After), and Delivery Gate verification / Doktrin dan mesin penegakan anti-AI slop mutlak v5.0."
author: "Roedy Rustam"
version: "4.3.0"
---

# Sovereign Anti-AI Slop & Craftsmanship Engine (2026 Unified Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Executive Directive & Trigger Conditions
The **Sovereign Anti-Slop Directive** is the uncompromising zero-tolerance standard governing all AI agent actions across the vibes-plug swarm. AI slop degrades developer trust, burns context tokens, bloats codebases, and introduces catastrophic production defects.

Anti-slop is a **filter, not a style guide**: it prescribes no fixed colors, fonts, or layouts—your creative direction remains yours. Removing slop clears away generic AI habits, while the **Liveliness Toolkit** ensures the final product is vivid, authentic, and deliberate rather than sterile.

**Universal Trigger Conditions:**
- **Every Code Generation & Modification**: Every function, component, or file created or modified by any agent.
- **Frontend & UI Work**: Design systems, page layouts, components, cards, dashboards, and responsive styling.
- **Copywriting & Prose**: Headlines, CTAs, product copy, documentation, commit messages, and PR summaries.
- **Code Comments**: Documentation comments, inline annotations, and docstrings.
- **Automated Quality Gates & PR Audits**: Code reviews (`coderabbit`), TDD loops (`autonomous-tdd-debugger`), and production release hardening (`production-ready-hardener`).

---

## Two Usage Modes Protocol

On every anti-slop activation, resolve the operational mode in this strict priority:
1. **Explicit Session Instruction**: User specifies `during` or `after` in the prompt. Announce once: `antislop active: <mode> (session override).`
2. **Global Preference**: Read `%APPDATA%\antislop\settings.json` (Windows) or `~/.config/antislop/settings.json` (macOS/Linux).
3. **Default Fallback**: Mode 1 (DURING) for new features/code generation; Mode 2 (AFTER) when auditing existing projects.

### Mode 1: DURING (Active Real-Time Prevention)
- Follow all 38 rules actively while generating code, copy, and UI.
- Prevents slop from being written in the first place.
- Conclude the task with the **Mandatory Delivery Gate** report.

### Mode 2: AFTER (Post-Build Audit & Remediation)
- Audit an existing or completed codebase/project without altering files prematurely.
- Generate a timestamped audit report in `anti-slop/audit-001-YYYY-MM-DD.md` (incrementing sequence).
- Each finding is strictly numbered, citing:
  - Violated Rule ID (`R-XX`)
  - Finding description & exact file/line
  - Priority: Hard Gate = `HIGH`, Purpose-Gate = `MEDIUM`, Quality Lock = `LOW`
- **Hard Gate**: Wait for human approval of specific finding numbers. **Never touch unapproved items.**
- Remediate approved items and deliver a follow-up verification report.

---

## The 3-Tier Rule Framework (38 Mandatory Rules)

All 38 rules are organized into three distinct tiers with clear enforcement semantics:
1. **Hard Gate** (Tier 1): Absolute bans and mandatory requirements. Zero exceptions.
2. **Purpose-Gate** (Tier 2): Technique allowed ONLY when serving a stated hierarchy/identity purpose with written rationale. Includes strict dose caps.
3. **Quality Locks** (Tier 3): Craftsmanship and resilience standards.

```
┌────────────────────────────────────────────────────────────────────────┐
│             SOVEREIGN UNIFIED ANTI-SLOP RULE MATRIX                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
┌───▼───────────────────────────┐ ┌─▼───────────────────────────┐ ┌─▼───────────────────────────┐
│     TIER 1: HARD GATE         │ │   TIER 2: PURPOSE-GATE      │ │  TIER 3: QUALITY LOCKS      │
│  (Absolute - Zero Exception)  │ │ (Purpose & Written Reason)  │ │   (Craftsmanship & Invar)   │
├───────────────────────────────┤ ├─────────────────────────────┤ ├─────────────────────────────┤
│ R-02 Copywriting (Em Dash)    │ │ R-01 Color & Gradients      │ │ C-1 Intentionality          │
│ R-03 Mobile Responsiveness    │ │ R-04 Icons Relevance        │ │ C-2 Functional Completeness │
│ R-17 Real Data & Numbers      │ │ R-06 Typography Purpose     │ │ C-3 Content-Driven Comp.    │
│ R-18 Honest Testimonials      │ │ R-07 Background Texture     │ │ C-4 System Resilience       │
│ R-23 Clarification & Assets   │ │ R-08 Spacing Rhythm         │ │ C-5 Evidence Over Claims    │
│ R-24 Real Navigation Dests    │ │ R-09 Layout Diversity       │ └─────────────────────────────┘
│ R-25 WCAG AA Color Contrast   │ │ R-10 Glassmorphism Cap (1-2)│
│ R-26 Functional Interactive   │ │ R-11 Deliberate Radii       │
│ R-27 Mandatory 3 UI States    │ │ R-12 Grounded Shadows       │
│ R-28 Product-Specific FAQ     │ │ R-13 Focus Glow Cap (1-2)   │
│ R-32 Keyboard Accessibility   │ │ R-14 Purposeful Motion      │
│ R-33 No Script File-Patching  │ │ R-15 Action-Driven CTAs     │
│ R-34 All Shipped Themes Work  │ │ R-16 Buzzword Elimination   │
│ R-35 Click-Through Evidence   │ │ R-19 Contextual Visuals     │
│ R-36 No Fabricated Claims     │ │ R-20 Functional Decors Only │
│ R-37 Design Direction & Dials │ │ R-21 Authentic Demos        │
│ R-38 Honest Placeholders      │ │ R-22 Dark Mode Rationale    │
│                               │ │ R-29 No AI Capsule Badges   │
│                               │ │ R-30 No Redundant Eyebrows  │
│                               │ │ R-31 No Banner Comments     │
└───────────────────────────────┘ └─────────────────────────────┘
```

---

### Tier 1: Hard Gate Rules (Absolute Zero-Tolerance)

Breaking any rule in this tier causes an automatic **FAIL** at the Delivery Gate.

#### R-02 — Copywriting: Em Dash Ban
- **FORBIDDEN**: The em dash character (`—`) in any AI-generated prose, marketing copy, or UI text.
- **Allowed Alternatives**: Comma (`,`), period (`.`), colon (`:`), semicolon (`;`), or parentheses `()`.
- **Rationale**: The em dash is the single most over-represented syntactic tell of synthetic text generation.
- **Carve-out**: Documentation formatting (e.g. `R-02 — Title`) is exempt; UI content and body prose are strictly subject to this ban.

#### R-03 — Mobile Responsiveness: Continuous Reflow
- **REQUIRED**: Mobile layout must be a dedicated, deliberate layout, never the desktop version shrunk down.
- Zero horizontal overflow (`overflow-x: hidden` used as a band-aid for broken layouts is forbidden).
- No text escaping container boundaries; no colliding cards or off-screen clipping.
- Minimum interactive touch target: **44x44px** (`min-h-[44px] min-w-[44px]`).
- Fluid viewport units: use `100dvh` instead of `100vh` to avoid mobile browser address bar jumps.
- Breakpoints must be placed where content breaks, not matched to arbitrary device marketing specs.

#### R-17 — Data & Numbers Authenticity
- **FORBIDDEN**: Hallucinated statistics, percentages, or metrics (`10,000+ users`, `99.9% uptime`, `500M queries`).
- If real verified data is unavailable, display **no numbers at all** or use an honest placeholder (`[REAL METRIC]`). Empty is infinitely better than deceptive.

#### R-18 — Testimonials & Social Proof
- **FORBIDDEN**: AI avatars, fictional customer names, invented job titles, or generated reviews.
- Do not generate a testimonials section unless provided with verified real customer quotes.

#### R-23 — Clarification & Honest Visual Placeholders
- **REQUIRED**: Never invent final logos, team avatars, or brand mascots on assumption.
- Confirm with user before generating brand assets. If rapid prototyping without feedback, use honest text markers: `[LOGO]`, initials avatar, or geometric placeholders. Disguising assumptions as final deliverables is forbidden.

#### R-24 — Navigation Integrity
- **FORBIDDEN**: Navbar items pointing to non-existent sections, dead anchors (`#`), or unbuilt routes.
- Every nav link must navigate to an existing, accessible route or section. Label unbuilt features explicitly as "Coming Soon".

#### R-25 — Color Contrast (WCAG 2.2 AA)
- **REQUIRED**: All text must meet WCAG AA contrast against its actual background:
  - Normal text (<18px): **minimum 4.5:1 ratio**.
  - Large text (≥18px bold or ≥24px regular): **minimum 3:1 ratio**.
- **FORBIDDEN**: Light grey text on white/light grey, dark grey on black without computation, or white text across variable photo/gradient backgrounds without a protective solid scrim.
- Contrast verification must be computed via `scripts/contrast-check.py` or mathematical formula; eyeball claims of AA compliance are rejected.

#### R-26 — Interactive Elements Completeness
- Every button, dropdown trigger, link, and toggle must possess authentic behavior or be eliminated:
  - Links navigate to real destinations.
  - Modals open, trap focus, and close with `Escape`.
  - Forms validate inputs and display authentic submission feedback.
  - Menus and accordions toggle state.
- **FORBIDDEN**: Dead buttons (`onClick={() => {}}`), empty hrefs, or static div look-alikes.

#### R-27 — Mandatory 3 UI States Contract
- **REQUIRED**: Every data-driven view or component must explicitly implement:
  1. **Empty State**: Friendly contextual illustration/icon + 1-sentence explanation + primary action CTA.
  2. **Loading State**: Geometry-matching pulsing skeleton matching the target shape (no full-page jarring spinners).
  3. **Error State**: Actionable recovery message + retry button.

#### R-28 — Product-Specific FAQ
- **FORBIDDEN**: Template FAQ questions (*"Is my data secure?"*, *"Can I cancel anytime?"*) that lack specific domain relevance.
- If domain-specific questions cannot be answered truthfully, omit the FAQ section entirely.

#### R-32 — Keyboard Accessibility & Focus Indicator
- **REQUIRED**: Full keyboard navigability (`Tab` / `Shift+Tab`) following visual order.
- Actionable elements must trigger on `Enter` or `Space`.
- **FORBIDDEN**: Removing focus outline (`outline: none`, `focus:outline-none`) without providing an explicit high-contrast focus ring (`focus-visible:ring-2 focus-visible:ring-offset-2`).

#### R-33 — Prohibition of Script File-Patching
- **FORBIDDEN**: Adding features (e.g. dark mode, theme toggles) via external Python/Node helper scripts that perform regex or string replacement on `.css`/`.tsx` files.
- All styles and logic must be implemented cleanly in the source code files.

#### R-34 — All Shipped Themes Must Be 100% Functional
- If a theme switcher is provided, both Light and Dark modes must be fully styled, tested, and contrast-compliant. Shipping an unstyled or broken secondary mode is a Hard Gate failure.

#### R-35 — Verification & Click-Through Evidence
- **REQUIRED**: Build and execute the code before declaring completion.
- Inspect the terminal and browser console for runtime errors or warnings.
- Perform a manual click-through pass of every interactive element and record evidence in the Delivery Gate report.

#### R-36 — Zero Fabricated Compliance & Performance Claims
- **FORBIDDEN**: Fabricating compliance badges (*SOC 2 Type II Certified*, *ISO 27001*, *HIPAA Compliant*) or unverified performance claims (*300% faster*, *10x acceleration*) without authentic proof.

#### R-37 — Design Direction & Honest Default Dials
- Every UI must be anchored in `DESIGN.md` or explicit brand guidelines.
- If building without direction, you must explicitly declare the output as a *"Draft without direction"* and set the honest dials to **ENERGY 1 / RHYTHM 1 / MOTION 1**. Falling into a sterile default while pretending to have design direction is forbidden.

#### R-38 — Real Content or Honest Placeholder
- Every feature, card, and metric must represent genuine domain facts OR carry an explicit placeholder badge (`[REAL DATA]`). Never write semi-realistic placeholder fiction that deceives the viewer.

---

### Tier 2: Purpose-Gate Rules (Technique Allowed, Purpose Required)

Techniques in this tier are permitted **only when they serve a documented hierarchy or identity goal**, backed by written rationale in the code or design document.

- **R-01 — Color & Gradients**: Generic blue-purple, blue-cyan, or rainbow gradients are forbidden as defaults. Gradients are permitted only as functional hierarchy dividers with written rationale. Exactly ONE focal accent color per view.
- **R-04 — Icons**: Sparkle, star, orb, bot, and diamond icons are forbidden as default feature glyphs. Icons must possess authentic semantic connection to the feature.
- **R-06 — Typography**: Monospace terminal aesthetics and shouting wide-tracked uppercase labels (`HOW IT WORKS`) are forbidden as generic tech costumes. Type must enhance legibility and reflect brand character.
- **R-07 — Background**: Dot grids, blueprint grids, and graph paper textures are forbidden as cheap tech shortcuts. Use authentic brand textures or clean solid surfaces.
- **R-08 — Spacing Rhythm**: Uniform spacing across all sections is forbidden. Spacing must express intentional rhythm and visual breathing room.
- **R-09 — Layout**: Formulaic AI landing pages (Hero -> 3 feature cards -> 3 steps -> Bento grid -> Pricing -> FAQ) are forbidden. Layouts must reflect user task flows.
- **R-10 — Glassmorphism Dose Cap**: Frosted glass (`backdrop-blur`) is strictly capped at **maximum 1-2 elements per page** (e.g., sticky top navigation only).
- **R-11 — Deliberate Border Radius**: Indiscriminate pill-shape addiction (`rounded-full` on cards, inputs, and standard rectangular buttons) is forbidden. Follow the structured 3-tier radius scale (6-8px inputs/buttons, 12-16px cards, `rounded-full` only for avatars and status chips).
- **R-12 — Grounded Shadows**: Floating zero-gravity colored drop shadows (`shadow-2xl shadow-indigo-500/50`) are forbidden. Use crisp 1px borders paired with subtle directional elevation (`shadow-xs` / `shadow-sm`).
- **R-13 — Focus Glow Dose Cap**: Neon glow borders and radiating cards are capped at **maximum 1-2 focus elements** on the entire page.
- **R-14 — Purposeful Motion**: Perpetual floating loops and multi-stacked entrance animations on scroll (fade + slide + scale + bounce) are forbidden. Transitions must be snappy (150-250ms), purposeful, and honor `prefers-reduced-motion`.
- **R-15 — Action-Driven CTAs**: Generic CTAs (*Get Started*, *Learn More*, *Try Now*) are replaced with specific, outcome-oriented copy (*Create free account*, *Read API reference*, *Import repository*).
- **R-16 — Buzzword Elimination**: AI buzzwords (*unlock the power*, *seamless*, *robust*, *elevate*, *revolutionary*, *game-changer*, *next-level*, *delve*) are strictly eliminated in favor of concrete facts.
- **R-19 — Contextual Visuals**: Generic Undraw/Storyset/3D clay blob characters are forbidden. Use real interface screenshots, concrete diagrams, or code previews.
- **R-20 — Non-Functional Decorations**: Colored vertical accent stripes on card edges, trailing decorative button arrows (`→`), and floating ambient shapes are forbidden.
- **R-21 — Authentic Demos**: Marketing a tool without displaying the actual interface or executable product is forbidden.
- **R-22 — Dark Mode Rationale**: Dark mode is a conscious brand decision, not an automatic default chosen because it looks "developer-focused".
- **R-29 — Capsule Badges**: Pill badges containing "AI Powered", "Beta", or "New" with glowing dots are forbidden unless representing a verified functional runtime status.
- **R-30 — Redundant Eyebrows**: Pill badges parked directly above an H1 heading that merely repeat the category already stated in the headline are forbidden.
- **R-31 — Decorative Code Separators**: Banner comments, box-drawing separators (`// =======================`), and ALL CAPS workflow banners are forbidden in code comments.

---

### Tier 3: Quality Locks & Craftsmanship (C-1 to C-5)

- **C-1 — Intentionality**: Every visual, architectural, and copy decision has a reason that can be articulated. Defaulting because "the LLM suggested it" is rejected.
- **C-2 — Functional Completeness**: Every control works completely. No partial stubs or non-responsive interactions.
- **C-3 — Content-Driven Composition**: Every section exists because the product content requires it, not to satisfy a page template.
- **C-4 — Resilience**: The UI holds up in all 3 states (empty, loading, error), all themes, all responsive breakpoints (320px to 4K), and under keyboard-only navigation.
- **C-5 — Evidence Over Claims**: Anything presented as fact (numbers, testimonials, security) is verified or removed.

---

## The Liveliness Toolkit: Dials & Design Archetypes

Filtering slop removes bad habits; the **Liveliness Toolkit** fills the space with intentional character so the interface does not degenerate into a sterile, lifeless default.

### The 3 Liveliness Dials (Scale 1 to 5)

Every design must deliberately declare its 3 dial settings:

| Dial | Scale 1 (Subdued / Minimal) | Scale 3 (Balanced / Professional) | Scale 5 (Expressive / Dynamic) |
| :--- | :--- | :--- | :--- |
| **ENERGY** | Monochromatic, quiet surfaces, restrained single accent, high whitespace. | Controlled dual-tone, crisp contrast, focused focal moments. | High-chroma accents, rich tonal depth, dramatic typographic contrast. |
| **RHYTHM** | Strict linear grid, identical column intervals, predictable reading flow. | Alternating card widths, split hero composition, dynamic content pacing. | Asymmetric editorial layouts, overlapping surfaces, syncopated modular grids. |
| **MOTION** | Zero ambient motion, instant opacity shifts (100ms), pure utilitarian. | Subtle hover feedback (150ms ease-out), tactile press scales (`scale-[0.98]`). | Coordinated page transitions, spring-physics micro-interactions, canvas shaders. |

*Rule R-37 Invariant: If designing without brand direction, dials MUST be declared honestly as ENERGY 1 / RHYTHM 1 / MOTION 1.*

---

### The 4 Proven Design Archetypes

Every interface must anchor itself in one coherent archetype to maintain stylistic unity:

#### 1. Archetype A: High-Precision Developer Tooling (Linear, Raycast, Vercel)
- **Palette**: Deep matte charcoal/zinc (`bg-neutral-950` / `bg-neutral-900`), crisp 1px borders (`border-neutral-800`), high contrast text.
- **Geometry**: Compact 6-8px radii (`rounded-md` / `rounded-lg`), tight padding, monospace metadata chips (`font-mono text-xs`).
- **Tactile Feel**: Keyboard shortcut pills (`<kbd>⌘K</kbd>`), instant hover highlights, subtle active press feedback (`active:scale-[0.99]`).
- **Dials Baseline**: ENERGY 2 | RHYTHM 3 | MOTION 2.

#### 2. Archetype B: Refined SaaS & FinTech (Stripe, Ramp, Mercury)
- **Palette**: Pure white or deep obsidian canvas, single deliberate conversion hue (emerald, indigo, or cobalt), 10% opacity badge fills.
- **Geometry**: 8-12px radii, tabular numerals on all amounts (`tabular-nums`), strict 4px/8px baseline rhythm.
- **Tactile Feel**: Pristine typography contrast (bold geometric display headers with neutral body), authentic ledger models.
- **Dials Baseline**: ENERGY 3 | RHYTHM 3 | MOTION 2.

#### 3. Archetype C: Human Interface & Modern Editorial (Apple HIG, Notion, Arc)
- **Palette**: Warm neutrals (stone, warm zinc, slate), natural breathing room, soft borders.
- **Geometry**: Generous padding, relaxed line-height (`leading-relaxed`), clean SVG iconography with consistent 1.5px/2px stroke weight.
- **Tactile Feel**: Physical tactile button feedback (`active:scale-[0.98] transition-transform duration-75`).
- **Dials Baseline**: ENERGY 3 | RHYTHM 4 | MOTION 3.

#### 4. Archetype D: High-Density Analytics & Operations (Datadog, Cloudflare)
- **Palette**: Neutral dark canvas, high-contrast semantic indicators (green/amber/red), color-blind safe palettes.
- **Geometry**: Ultra-compact padding (`px-3 py-1.5`), split panes, explicit filter toolbars, zero decorative fluff.
- **Tactile Feel**: High-contrast sparklines, multi-level breadcrumbs, tabular data grid alignment.
- **Dials Baseline**: ENERGY 2 | RHYTHM 2 | MOTION 1.

---

## Specialized Domain Sub-Disciplines

### Sub-Discipline 1: Code Comments Hygiene
- **Scope Guardrail**: This filter modifies only comments; never touch executable code, identifiers, formatting, or logic.
- **Eliminate AI Comment Slop**:
  - ❌ Decorative box banners (`// =====================`, `/* ----- ROUTES ----- */`).
  - ❌ Restating the obvious (`// Increment count` above `count++`, `// User class` above `class User`).
  - ❌ Workflow step narration (`// Step 1: Validate`, `// Step 2: Query DB`, `// Finally return`).
  - ❌ Empty labels (`// Business logic`, `// Helper function`, `// Important note`).
  - ❌ Vague placeholders (`// TODO: Improve this later`, `// Add more validations`).
  - ❌ Signature echoing in JSDoc/docstrings (`@param price The price`, `@returns The total`).
  - ❌ Decorative emojis in comments (`// ✅ Validated`, `// 🚀 Performance boost`).
  - ❌ End-of-block markers (`} // end if`, `# end function`).
- **Preserve Real Engineering Value**:
  - ✅ Comments explaining **WHY** (domain invariants, security boundaries, race condition workarounds, upstream vendor bug workarounds).
  - ✅ Actionable TODOs with clear scope and context: `// TODO(auth): migrate to session tokens when v2 endpoint ships`.

---

### Sub-Discipline 2: Copywriting & Prose Sanitation
- **Eliminate AI Vocabulary & Hype Bingo**:
  - Replace inflated verbs (*unlock, elevate, empower, delve, showcase, revolutionize*) with concrete human actions (*use, build, see, manage*).
  - Eliminate significance inflation (*"marking a pivotal moment", "ushering in a new era"*).
  - Eliminate unsourced social proof (*"Trusted by thousands of developers"* without named logos).
  - Eliminate weasel attributions (*"Experts say", "Industry observers note"*).
  - Strict ban on em dashes (`—`) in all copy (R-02).
- **Before / After Matrix**:
  - 🔴 *Before*: "Unlock the power of next-generation AI to seamlessly elevate your workflow — revolutionizing team productivity."
  - 🟢 *After*: "Automate ticket triage and sync status updates across your engineering team in real time."

---

### Sub-Discipline 3: Human & Accessibility Engineering
- **WCAG 2.2 AA Contrast Enforcement**:
  - Minimum 4.5:1 for body text; minimum 3:1 for large text (≥18px).
  - Interactive element borders and focus rings must meet minimum 3:1 contrast against adjacent background.
- **Automated Contrast Check**: Run `python scripts/contrast-check.py "#HEX1" "#HEX2"`.
- **Keyboard Navigation & Trap Prevention**:
  - All interactive elements must be accessible via keyboard (`Tab`, `Enter`, `Space`, `Escape`).
  - Never trap focus in dialogs without an `Escape` key handler and clear close button.
  - Interactive elements must declare clear `focus-visible` ring indicators.

---

### Sub-Discipline 4: Mobile & Responsive Layout Ergonomics
- **Continuous Viewport Reflow**: Layouts must look intentional from 320px to 2560px.
- **Fluid Typography**: Use CSS `clamp()` (`clamp(1.5rem, 4vw + 1rem, 3rem)`) instead of static pixel jumps.
- **Touch Target Law**: All interactive elements must measure at least **44x44px** in physical touch area.
- **Dynamic Viewport Height**: Always use `100dvh` (or `min-h-dvh`) instead of `100vh` to prevent mobile address bar overlap.

---

## Mandatory Delivery Gate Protocol

Before completing any task that involves UI, copy, or code generation, you **MUST** provide the following 4-block report:

```markdown
### 🛡️ Sovereign Anti-Slop Delivery Gate Report

#### Block 1: Liveliness Dials & Archetype
- **Design Archetype**: [Archetype A / B / C / D / Custom]
- **Dials Declared**: ENERGY [1-5] | RHYTHM [1-5] | MOTION [1-5]
- **Direction Source**: [`DESIGN.md` / User Brief / Draft without direction (1/1/1)]

#### Block 2: 38-Rule Compliance Verification
- **Hard Gate (Tier 1)**: [PASS / FAIL] (R-02 Em Dash, R-03 Mobile, R-17 Data, R-25 Contrast, R-26 Functional Controls, R-27 States, R-32 Keyboard, R-35 Verification, R-36 Claims, R-38 Honesty)
- **Purpose-Gate (Tier 2)**: [PASS / FAIL] (R-01 Gradients, R-04 Icons, R-06 Fonts, R-10 Glass Cap, R-11 Radii, R-13 Glow Cap, R-16 Buzzwords, R-31 Separators)
- **Quality Locks (Tier 3)**: [PASS / FAIL] (C-1 Intentionality, C-2 Completeness, C-3 Content, C-4 Resilience, C-5 Evidence)

#### Block 3: Interactive Element Click-Through Evidence (R-35)
- [Element 1 Name / Target]: [Action observed & state feedback confirmed]
- [Element 2 Name / Target]: [Action observed & validation feedback confirmed]
- [Theme Toggle]: [Both Light and Dark modes rendered with zero console errors]
- [Mobile Viewport Check]: [Reflow confirmed at 375px with zero horizontal scroll]

#### Block 4: Delivery Verdict
- **Verdict**: [PASS / FAIL]
- **Notes / Overrides**: [Any documented human-approved overrides]
```

---

## Automated Tooling & Scripts

The skill includes built-in automated verification tools in `scripts/`:

1. **AST & Pattern Scanner**:
   ```bash
   node "scripts/check-anti-slop.js" --summary
   node "scripts/check-anti-slop.js" --strict
   ```
2. **WCAG Contrast Checker**:
   ```bash
   python "scripts/contrast-check.py" "#FFFFFF" "#0F172A"
   ```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Arahan Eksekutif & Kondisi Pemicu
**Sovereign Anti-Slop Directive** adalah standar tanpa toleransi yang mengatur seluruh tindakan agen AI di dalam ekosistem vibes-plug. AI slop menurunkan kepercayaan developer, menghabiskan token context, menggelembungkan codebase, dan memicu bug di produksi.

Anti-slop adalah **filter, bukan style guide**: filter ini tidak mendikte warna, font, atau layout Anda—arah kreatif tetap sepenuhnya milik Anda. Menghapus slop membersihkan kebiasaan klise AI, sementara **Liveliness Toolkit** memastikan produk akhir memiliki jiwa, karakter, dan ketegasan visual yang hidup, bukan menjadi tampilan yang steril.

**Kondisi Pemicu Universal:**
- **Setiap Pembuatan & Modifikasi Kode**: Setiap fungsi, komponen, atau file yang dibuat atau diubah agen.
- **Pekerjaan UI & Frontend**: Desain antarmuka, tata letak halaman, komponen, kartu, dashboard, dan gaya responsif.
- **Copywriting & Teks**: Judul, CTA, teks produk, dokumentasi, pesan commit, dan ringkasan PR.
- **Komentar Kode**: Komentar penjelasan, anotasi inline, dan docstring.
- **Quality Gates & Audit PR**: Review kode (`coderabbit`), pengujian mandiri (`autonomous-tdd-debugger`), dan hardening pra-rilis (`production-ready-hardener`).

---

### Protokol Dua Mode Operasi (Two Usage Modes)
1. **Mode 1: DURING (Pencegahan Real-Time Saat Bekerja)**:
   - Agen menerapkan 38 aturan secara aktif saat menulis kode, copy, dan UI.
   - Mencegah slop masuk ke codebase sejak awal.
   - Ditutup dengan laporan wajib **Delivery Gate**.
2. **Mode 2: AFTER (Audit & Remediasi Pasca Proyek Selesai)**:
   - Mengaudit proyek yang sudah ada tanpa mengubah file secara prematur.
   - Menghasilkan laporan audit bernomor: `anti-slop/audit-001-YYYY-MM-DD.md`.
   - Setiap temuan diberi nomor urut, pasal pelanggaran (`R-XX`), dan prioritas (Hard Gate = `HIGH`, Purpose-Gate = `MEDIUM`, Quality Lock = `LOW`).
   - Agen **wajib menunggu persetujuan manusia** atas nomor temuan yang ingin diperbaiki sebelum menyentuh kode.

---

### Kerangka 38 Aturan Wajib (3-Tier Rule Framework)

#### Tier 1: Hard Gate (Mutlak, Tanpa Pengecualian)
- **R-02 Copywriting**: Larangan mutlak tanda em dash (`—`) pada teks buatan AI. Gunakan koma, titik, atau titik dua.
- **R-03 Responsivitas Mobile**: Layout mobile wajib dirancang khusus dengan reflow continuous; target sentuh minimal **44x44px**; gunakan `100dvh`; dilarang ada overflow horizontal.
- **R-17 Data & Angka Autentik**: Dilarang mengarang statistik atau angka fiktif (`99.9% uptime`, `10,000 users`). Jika data tidak tersedia, jangan tampilkan angka atau gunakan `[REAL DATA]`.
- **R-18 Testimoni Autentik**: Dilarang membuat avatar AI, nama samaran, atau ulasan fiktif.
- **R-23 Konfirmasi Aset Visual**: Dilarang mengasumsikan logo/avatar final tanpa konfirmasi; gunakan penanda jujur `[LOGO]`.
- **R-24 Integritas Navigasi**: Dilarang menempatkan tautan di navbar menuju halaman/bagian yang tidak ada.
- **R-25 Kontras Warna (WCAG AA)**: Minimal 4.5:1 untuk teks normal; 3:1 untuk teks besar (≥18px). Validasi menggunakan script `contrast-check.py`.
- **R-26 Kelengkapan Elemen Interaktif**: Setiap tombol, link, dan dropdown wajib memiliki perilaku nyata atau dihapus. Dilarang ada tombol mati.
- **R-27 Tiga State UI Wajib**: Setiap tampilan data wajib memiliki state **Empty**, **Loading** (skeleton loader), dan **Error** (dengan tombol coba lagi).
- **R-28 FAQ Spesifik**: FAQ harus menjawab pertanyaan riil domain produk, bukan template klise.
- **R-32 Aksesibilitas Keyboard**: Semua kontrol interaktif harus dapat diakses via keyboard dan memiliki indikator fokus yang kontras (`focus-visible:ring-2`).
- **R-33 Larangan Patching File via Script**: Dilarang menambahkan fitur lewat script eksternal yang melakukan string-replace pada file CSS/TSX.
- **R-34 Seluruh Tema Wajib Berfungsi Penuh**: Jika menyediakan toggle tema, mode Terang dan Gelap wajib 100% berfungsi dan lulus uji kontras.
- **R-35 Verifikasi Sebelum Penyerahan (Click-Through)**: Wajib menjalankan aplikasi dan mencatat bukti click-through setiap elemen interaktif sebelum dinyatakan selesai.
- **R-36 Larangan Klaim Kepatuhan Fiktif**: Dilarang mengarang lencana sertifikasi (SOC 2, ISO 27001) atau klaim akselerasi fiktif.
- **R-37 Arah Desain Wajib**: Wajib bersumber dari `DESIGN.md`. Jika tanpa arah, wajib dideklarasikan sebagai *"Draft without direction"* dengan dial **ENERGY 1 / RHYTHM 1 / MOTION 1**.
- **R-38 Konten Nyata atau Placeholder Jujur**: Seluruh konten harus berupa data nyata atau penanda eksplisit (`[REAL DATA]`).

#### Tier 2: Purpose-Gate (Boleh Digunakan Hanya Jika Ada Tujuan Tertulis & Batasan Dosis)
- **R-01 Warna & Gradien**: Gradien biru-ungu/neon dilarang sebagai default; hanya boleh untuk pemisah hierarki dengan alasan tertulis.
- **R-04 Ikon**: Ikon sparkle, bintang, orb, dan robot dilarang sebagai default.
- **R-06 Tipografi**: Font monospace berlebihan dan judul uppercase dengan tracking renggang dilarang tanpa alasan keterbacaan.
- **R-07 Latar Belakang**: Grid titik, garis blueprint, dan grafis kotak-kotak dilarang sebagai shortcut visual.
- **R-08 Ritme Spasi**: Spasi seragam di setiap bagian dilarang; gunakan variasi ritme vertikal.
- **R-09 Variasi Layout**: Layout formulaik klise (Hero -> 3 kartu -> 3 langkah -> Bento grid -> Pricing -> FAQ) dilarang.
- **R-10 Batas Glassmorphism**: Efek frosted glass dibatasi **maksimal 1-2 elemen** per halaman (misalnya hanya header sticky).
- **R-11 Batas Border Radius**: Radius pil (`rounded-full`) dilarang pada tombol persegi panjang atau kartu. Gunakan skala 6-8px untuk kontrol dan 12-16px untuk kartu.
- **R-12 Shadow Membumi**: Shadow melayang berwarna neon dilarang; gunakan border 1px solid dan elevasi halus.
- **R-13 Batas Glow**: Efek pendaran neon dibatasi maksimal 1-2 elemen fokus.
- **R-14 Animasi Berbobot**: Animasi berulang tanpa henti (kartu melayang) dilarang; animasi transisi wajib cepat (150-250ms).
- **R-15 CTA Berorientasi Aksi**: Ganti CTA generik (*Get Started*, *Learn More*) dengan instruksi spesifik (*Buat akun gratis*, *Baca dokumentasi API*).
- **R-16 Eliminasi Buzzword**: Hapus kata-kata klise AI (*unlock, elevate, seamless, revolutionize, game-changer*).
- **R-19 Visual Kontekstual**: Ilustrasi 3D blob generik dilarang; gunakan screenshot produk asli atau diagram teknis.
- **R-20 Dekorasi Fungsional**: Garis strip vertikal di tepi kartu dan panah dekoratif (`→`) dilarang jika tanpa fungsi.
- **R-21 Demo Produk Nyata**: Menjual alat tanpa memperlihatkan interface nyata dilarang.
- **R-22 Alasan Mode Gelap**: Mode gelap harus didasarkan pada karakter brand, bukan sekadar latah default.
- **R-29 Lencana Kapsul**: Lencana pil "AI Powered" dengan dot berkedip dilarang kecuali mewakili status runtime asli.
- **R-30 Eyebrow Badge Redundan**: Lencana kecil di atas H1 yang mengulang kata-kata judul dilarang.
- **R-31 Larangan Separator Banner Kode**: Garis pembatas dekoratif (`// =====================`) pada komentar kode dilarang.

#### Tier 3: Quality Locks & Craftsmanship (C-1 sampai C-5)
- **C-1 Intentionality**: Setiap keputusan desain dan kode memiliki alasan yang dapat dipertanggungjawabkan.
- **C-2 Kelengkapan Fungsional**: Setiap kontrol berfungsi utuh tanpa stub setengah jadi.
- **C-3 Komposisi Berbasis Konten**: Setiap seksi ada karena dibutuhkan produk, bukan sekadar pengisi template.
- **C-4 Ketahanan Sistem**: UI bertahan pada seluruh 3 state (empty, loading, error), semua tema, dan navigasi keyboard.
- **C-5 Bukti Di Atas Klaim**: Fakta yang disajikan terverifikasi secara nyata.

---

### Liveliness Toolkit: 3 Dial & 4 Arsitektur Desain

Untuk mencegah antarmuka jatuh ke dalam kegagalan sebaliknya—yaitu desain yang steril, datar, dan membosankan—anti-slop menggunakan **3 Dial Karakter**:
1. **ENERGY (1-5)**: Skala 1 (monokromatik, sunyi) hingga Skala 5 (aksen berani, kontras tinggi).
2. **RHYTHM (1-5)**: Skala 1 (grid linear kaku) hingga Skala 5 (tata letak editorial dinamis).
3. **MOTION (1-5)**: Skala 1 (statis murni) hingga Skala 5 (transisi halus berbasis fisika).

#### 4 Arsitektur Desain Teruji:
1. **Archetype A: High-Precision Developer Tooling** (Linear, Raycast, Vercel)
   - Permukaan matte gelap (`bg-neutral-950`), border 1px solid, tombol shortcut keyboard (`<kbd>⌘K</kbd>`), font mono untuk metadata, padding ringkas.
2. **Archetype B: Refined SaaS & FinTech** (Stripe, Ramp, Mercury)
   - Latar belakang bersih, kontras display header tegas, angka tabular (`tabular-nums`), ritme spasi 4px/8px, data transaksi otentik.
3. **Archetype C: Human Interface & Modern Editorial** (Apple HIG, Notion, Arc)
   - Nuansa hangat netral (stone/slate), padding lega, feedback sentuhan fisik (`active:scale-[0.98]`), ikonografi SVG konsisten.
4. **Archetype D: High-Density Analytics & Operations** (Datadog, Cloudflare)
   - Kepadatan informasi tinggi, breadcrumbs bertingkat, sparklines kontras tinggi, palet aman untuk buta warna, nol dekorasi sia-sia.

---

### Protokol Wajib Delivery Gate

Sebelum menyelesaikan tugas coding atau UI, Anda **WAJIB** menyertakan 4 blok laporan ini:
1. **Konfirmasi Dial & Archetype**: Nama archetype dan nilai dial (ENERGY/RHYTHM/MOTION).
2. **Checklist Kepatuhan 38 Aturan**: Evaluasi PASS/FAIL pada Hard Gate, Purpose-Gate, dan Quality Locks.
3. **Bukti Click-Through Elemen Interaktif (R-35)**: Daftar elemen yang telah dicoba langsung beserta perilakunya.
4. **Keputusan Akhir (Verdict)**: PASS atau FAIL.

---

## Orchestration & Integration

This skill serves as the foundational quality, craftsmanship, and anti-slop gate across the entire vibes-plug swarm architecture. It actively connects to and hardens:

| Skill | Relationship & Integration Flow |
| :--- | :--- |
| `senior-frontend` | Sanitizes React 19 / Next.js 15 components from generic AI templates and unhandled states. |
| `tailwind-expert` | Enforces CSS-first styling, eliminates excessive pill buttons, and prevents stacked neon glows. |
| `design-system-architect` | Validates 5-state interactive contracts, accessible tokens, and solid borders. |
| `autonomous-tdd-debugger` | Enforces 100% complete implementations on the first try without test skips or fake mocks. |
| `production-ready-hardener` | Acts as the final delivery quality gate before any release or production deployment. |
| `zero-tech-debt-auditor` | Scans and eradicates syntax narration comments, dead code, and speculative abstractions. |
| `coderabbit` | Powers the autonomous PR review and code inspection engine. |