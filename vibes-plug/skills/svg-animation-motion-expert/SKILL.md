---
name: svg-animation-motion-expert
description: "Expert guide for web animations: SVG manipulation, Framer Motion 12+, GSAP 3, CSS Scroll-Driven Animations, and View Transitions API / Panduan ahli animasi web."
author: "Roedy Rustam"

version: "4.3.0"
---

# SVG & Web Animation Motion Expert

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
A dedicated skill for crafting fluid, high-performance web animations and micro-interactions. Covers direct SVG manipulation (paths, masks, clip-paths), React-based animations using Framer Motion 12+, advanced timeline choreography with GSAP 3, native CSS Scroll-Driven Animations, and the View Transitions API for seamless page navigations.

### Trigger Conditions
- When building complex landing page animations or scroll reveals.
- When creating interactive SVG graphics, charts, or diagrams.
- When the user asks for "buttery smooth", "apple-like", or "dynamic" interactions.
- When implementing page transitions using the native View Transitions API.

### Core Architecture & Guidelines

#### 1. Framer Motion 12+ (React/Next.js)
Use Framer Motion for declarative component animations, layout animations, and gesture-driven interactions.
- **Layout Animations**: Use the `layout` prop to automatically animate between flexbox/grid state changes.
- **Performance**: Use `style={{ x, y }}` with `useTransform` and `useScroll` instead of triggering React state updates on every frame.

```tsx
'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'

export function ScrollReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['0 1', '1 1'] })
  const y = useTransform(scrollYProgress, [0, 1], [100, 0])
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <motion.div ref={ref} style={{ y, opacity }}>
      {children}
    </motion.div>
  )
}
```

#### 2. GSAP 3 (Complex Choreography)
Use GSAP when you need highly coordinated timeline sequences, path tracing, or when working outside of React (Vanilla JS).
- **ScrollTrigger**: The industry standard for complex scroll-based animations.
- **DrawSVG / MorphSVG**: Use for advanced SVG path drawing and morphing (requires Club GreenSock, use open-source alternatives if unavailable).

#### 3. Native CSS Scroll-Driven Animations
Where possible, leverage modern native CSS to tie animations to scroll position on the compositor thread for zero-JS performance.
```css
@keyframes slide-in {
  from { opacity: 0; transform: translateY(100px); }
  to { opacity: 1; transform: translateY(0); }
}

.reveal-on-scroll {
  animation: slide-in linear both;
  animation-timeline: view();
  animation-range: entry 25% cover 50%;
}
```

#### 4. SVG Optimization & Manipulation
- Always run SVGs through SVGO to strip bloat before animating.
- Keep `viewBox` responsive.
- Target `<path>`, `<circle>`, and `<mask/>` elements via CSS vars or inline Framer Motion logic.

#### 5. Material Design 3 (M3) Motion Architecture (https://m3.material.io/styles/motion/overview)
M3 motion establishes physical purpose, directing user focus through spatial continuity:

**M3 Easing & Duration Tokens:**
```css
:root {
  /* M3 Easing Curves */
  --md-sys-motion-easing-emphasized:             cubic-bezier(0.2, 0.0, 0, 1.0);
  --md-sys-motion-easing-emphasized-decelerate:  cubic-bezier(0.05, 0.7, 0.1, 1.0);
  --md-sys-motion-easing-emphasized-accelerate:  cubic-bezier(0.3, 0.0, 0.8, 0.15);
  --md-sys-motion-easing-standard:               cubic-bezier(0.2, 0.0, 0, 1.0);
  --md-sys-motion-easing-standard-decelerate:     cubic-bezier(0, 0, 0.2, 1.0);

  /* M3 Durations */
  --md-sys-motion-duration-short-4:  200ms;
  --md-sys-motion-duration-medium-2: 300ms;
  --md-sys-motion-duration-medium-4: 400ms;
  --md-sys-motion-duration-long-2:   600ms;
}
```

**M3 Container Transform Pattern (Framer Motion `layoutId`):**
Morphing a card into a modal detail view with shared geometry:
```tsx
import { motion, AnimatePresence } from 'framer-motion';

// M3 Container Transform with Emphasized Decelerate Easing
const m3Transition = {
  duration: 0.4,
  ease: [0.05, 0.7, 0.1, 1.0], // M3 Emphasized Decelerate
};

export function M3CardToDetail({ selectedId, onSelect, item }: any) {
  return (
    <>
      <motion.div
        layoutId={`m3-container-${item.id}`}
        onClick={() => onSelect(item.id)}
        className="bg-surface-container rounded-2xl p-4 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
        transition={m3Transition}
      >
        <motion.h3 layoutId={`m3-title-${item.id}`} className="text-lg font-medium text-on-surface">
          {item.title}
        </motion.h3>
        <p className="text-sm text-on-surface-variant mt-1">{item.subtitle}</p>
      </motion.div>

      <AnimatePresence>
        {selectedId === item.id && (
          <motion.div
            layoutId={`m3-container-${item.id}`}
            className="fixed inset-4 md:inset-20 z-50 bg-surface-container-high rounded-3xl p-8 shadow-2xl flex flex-col"
            transition={m3Transition}
          >
            <motion.h3 layoutId={`m3-title-${item.id}`} className="text-2xl font-bold text-on-surface">
              {item.title}
            </motion.h3>
            <div className="mt-4 flex-1 overflow-y-auto text-on-surface-variant">
              {item.fullContent}
            </div>
            <button
              onClick={() => onSelect(null)}
              className="mt-4 self-end bg-primary text-on-primary rounded-full px-6 py-2.5 font-medium"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

#### 6. Sovereign Anti-Slop Motion Directives
Zero-tolerance principles for intentional, high-performance web motion:
- **Strict `prefers-reduced-motion` Enforcement**: Every animation MUST respect user accessibility settings. In Framer Motion, check `useReducedMotion()`; in CSS, provide `@media (prefers-reduced-motion: reduce) { animation: none !important; transition: none !important; }`.
- **Compositor-Only Animations (Zero Layout Thrashing)**: Only animate `transform` and `opacity`. Strictly ban animating layout triggers (`top`, `left`, `width`, `height`, `margin`, `padding`).
- **Ban Bouncy Slop & Excessive Springs**: Avoid cartoonish, excessive spring bounces (`damping: 5, stiffness: 500`) on UI controls. Interactive components must use subtle, purposeful easings (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **No Orphan Infinite Animations**: Eliminate infinite CSS/JS loops that run off-screen, eating CPU and mobile battery. Use `IntersectionObserver` or CSS `content-visibility` to halt animations when not in viewport.

## Orchestration & Integration
- Works hand-in-hand with `ui-ux-pro-max` and `design-system-architect` to bring designs to life.
- Complements `senior-frontend` by handling the motion layer of the UI.
- Integrates with `seo` to build visually stunning landing pages.
- **`anti-slop`**: Enforces zero-bouncy slop, strict prefers-reduced-motion fallbacks, and compositor-only transforms.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Skill khusus untuk membuat animasi web dan interaksi mikro yang lancar dan berkinerja tinggi. Mencakup manipulasi SVG langsung, animasi berbasis React menggunakan Framer Motion 12+, koreografi timeline lanjutan dengan GSAP 3, CSS Scroll-Driven Animations native, dan View Transitions API.

### Kondisi Pemicu
- Saat membangun animasi landing page yang kompleks.
- Saat membuat grafik, chart, atau diagram SVG interaktif.
- Saat pengguna meminta interaksi yang "sangat mulus", "mirip Apple", atau "dinamis".
- Saat mengimplementasikan transisi halaman menggunakan View Transitions API native.

### Panduan Arsitektur Inti

#### 1. Framer Motion 12+ (React/Next.js)
Gunakan Framer Motion untuk animasi komponen deklaratif, animasi layout, dan interaksi gestur.
- Hindari memicu pembaruan state React pada setiap frame animasi. Gunakan `useTransform` dan `useScroll` yang beroperasi di luar siklus render React untuk performa 60fps.

#### 2. GSAP 3
Gunakan GSAP untuk urutan timeline yang sangat terkoordinasi atau saat bekerja di luar ekosistem React. Plugin `ScrollTrigger` sangat berguna untuk merangkai aksi kompleks berdasarkan posisi scroll.

#### 3. CSS Scroll-Driven Animations Native
Manfaatkan CSS modern (`animation-timeline: view()`) untuk mengikat animasi ke posisi scroll langsung di compositor thread tanpa JavaScript sama sekali. Ini memberikan performa terbaik untuk efek paralaks dan reveal.

#### 4. Manipulasi SVG
- Selalu optimasi SVG (buang tag tidak perlu) sebelum dianimasikan.
- Gunakan `<clipPath>` dan `<mask>` untuk transisi transisi pengungkapan gambar yang dramatis.

#### 5. Arsitektur Gerak Material Design 3 (M3 Motion) (https://m3.material.io/styles/motion/overview)
Gerak dalam M3 memberikan kontinuitas spasial dan mengarahkan fokus pengguna:
- **Kurva Easing M3**:
  - `emphasized-decelerate` (`cubic-bezier(0.05, 0.7, 0.1, 1.0)`): Digunakan untuk elemen yang masuk ke layar (modal, drawer, sheet) dengan durasi 400ms.
  - `emphasized-accelerate` (`cubic-bezier(0.3, 0.0, 0.8, 0.15)`): Digunakan untuk elemen yang meninggalkan layar dengan durasi 200ms.
  - `standard` (`cubic-bezier(0.2, 0.0, 0, 1.0)`): Digunakan untuk transformasi bentuk dan pergeseran posisi dalam layar dengan durasi 300ms.
- **Pola Transisi M3**:
  - **Container Transform**: Transformasi morphing mulus dari kartu/chip kecil menjadi tampilan detail layar penuh menggunakan `layoutId` pada Framer Motion.
  - **Shared Axis**: Transisi geser sepanjang sumbu X (alur wizard maju/mundur), sumbu Y (pindah level atas/bawah), atau sumbu Z (zoom in/out).
  - **Fade Through**: Penggantian tampilan saat beralih antar destinasi navigasi utama (Bottom Navigation Bar atau Navigation Rail).

#### 6. Arahan Anti-Slop Gerakan & Animasi
Prinsip nol toleransi untuk gerakan web yang fungsional dan berkinerja tinggi:
- **Kepatuhan Mutlak `prefers-reduced-motion`**: Semua animasi WAJIB menghormati preferensi aksesibilitas pengguna (`useReducedMotion()` di Framer Motion, atau `@media (prefers-reduced-motion: reduce)` di CSS).
- **Animasi Khusus Compositor (Bebas Layout Thrashing)**: Hanya animasikan `transform` dan `opacity`. Dilarang menganimasikan `top`, `left`, `width`, `height`, atau `margin` yang memicu re-layout dan lag.
- **Larangan Bouncy Slop Berlebihan**: Hindari efek pegas memantul ekstrem dan kekanak-kanakan pada kontrol tombol/menu. Gunakan kurva easing profesional (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Larangan Loop Tanpa Batas di Luar Layar**: Matikan animasi yang tidak terlihat di viewport menggunakan `IntersectionObserver` untuk mencegah boros baterai dan beban CPU.

## Integrasi Orkestrasi
- Bekerja sama dengan `ui-ux-pro-max` dan `design-system-architect` untuk menghidupkan desain statis.
- Melengkapi `senior-frontend` dengan menangani lapisan pergerakan (motion layer) UI.
- Terintegrasi dengan `seo` untuk merancang landing page yang memukau secara visual.
- **`anti-slop`**: Menegakkan larangan animasi memantul berlebihan (bouncy slop), kewajiban fallback prefers-reduced-motion, dan animasi khusus compositor.