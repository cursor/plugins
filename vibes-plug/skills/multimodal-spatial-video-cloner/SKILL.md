---
name: multimodal-spatial-video-cloner
description: "Expert guide for reverse-engineering UI/UX interactions from screen-recordings and spatial video, extracting animation spring curves, and generating pixel-perfect Tailwind CSS v4 and Framer Motion code / Panduan ahli rekayasa balik interaksi UI/UX dari rekaman layar dan video spasial, ekstraksi kurva pegas animasi, dan pembuatan kode presisi Tailwind CSS v4 serta Framer Motion."
author: "Roedy Rustam"
version: "4.3.0"
---

# multimodal-spatial-video-cloner — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `brainstorming`, `zero-to-prod-orchestrator`, `website-design-cloner`, `senior-frontend`, `tailwind-expert`, `svg-animation-motion-expert`, and `ui-ux-pro-max` to transform screen recordings, UI video captures, and spatial demos into production-ready React 19 and Tailwind CSS v4 code.

### Description
Production guide for analyzing UI/UX screen-recordings, dynamic software walkthroughs, and spatial video captures to reverse-engineer interface hierarchies, interaction flows, and physics-based motion. Extracts exact layout hierarchies, color palettes, spacing rhythm, spring physics (stiffness, damping, mass), and micro-interactions, emitting clean Tailwind CSS v4 components with Framer Motion or native CSS View Transitions.

### Trigger Conditions
Activate this skill when:
- Provided with a screen recording, GIF, or video walkthrough of a target user interface or web app.
- Replicating complex UI micro-interactions, gesture-driven drawer animations, or fluid card expansion flows.
- Converting recorded spatial or mobile interfaces into responsive desktop and mobile web experiences.
- Extracting exact animation timing, cubic bezier curves, and spring parameters from visual media.

---

### Core Concepts & Patterns

#### 1. Video-to-Code Extraction Pipeline

```
[Screen Recording / MP4 / WebM]
                │
                ▼
   [Keyframe Slicing & Optical Flow]
  ├── Layout Keyframes (0%, 25%, 50%, 75%, 100%)
  └── Motion Vector Analysis (Acceleration & Spring Bounds)
                │
                ▼
   [Design Token & Physics Extraction]
  ├── OKLCH Colors, Typography, Border Radii
  └── Spring Parameters: { stiffness: 350, damping: 28, mass: 0.8 }
                │
                ▼
   [Production Code Synthesis]
  ├── React 19 Functional Component
  ├── Tailwind CSS v4 Theme Utility Classes
  └── Framer Motion / Native CSS Transition Specs
```

#### 2. Reverse-Engineered Spring Card Component (React 19 & Tailwind v4)

```tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SpatialCardProps {
  title: string;
  category: string;
  description: string;
  imageUrl: string;
}

export const ReverseEngineeredSpringCard: React.FC<SpatialCardProps> = ({
  title,
  category,
  description,
  imageUrl
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extracted physics from 60fps screen recording
  const springTransition = {
    type: 'spring' as const,
    stiffness: 380,
    damping: 30,
    mass: 0.9
  };

  return (
    <div className="relative p-4 flex justify-center items-center">
      <motion.div
        layout
        transition={springTransition}
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl cursor-pointer overflow-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
      >
        <motion.div layout className="relative h-48 w-full rounded-2xl overflow-hidden mb-4">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out hover:scale-105"
          />
          <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-500/20">
            {category}
          </span>
        </motion.div>

        <motion.h3 layout className="text-xl font-bold text-white tracking-tight">
          {title}
        </motion.h3>

        <AnimatePresence>
          {isExpanded && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="text-neutral-400 text-sm mt-3 leading-relaxed"
            >
              {description}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.div layout className="mt-4 flex items-center justify-between text-xs text-neutral-500">
          <span>Click to {isExpanded ? 'collapse' : 'expand'}</span>
          <span className="text-emerald-400 font-medium">Physics Verified</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
```

---

### Best Practices

1. **Extract Timing from Keyframe Deltas**: Calculate milliseconds between animation start, midpoint apex, and settled state from video frame timestamps.
2. **Support Reduced Motion**: Always wrap spring animations in `useReducedMotion()` checks, falling back to instant opacity fades for accessibility compliance (WCAG 2.2).
3. **Use OKLCH Color Spaces**: Convert colors extracted from video pixels into native Tailwind v4 OKLCH tokens to preserve visual fidelity across HDR displays.
4. **Never Truncate Intermediate States**: Accurately capture enter, active, and exit transitions rather than snapping between binary states.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Visual Artifact | Correct Approach |
| :--- | :--- | :--- |
| Guessing arbitrary `duration: 0.3s ease-in-out` | Feels robotic and unlike the fluid video source | Calibrate spring stiffness and damping from motion vectors |
| Missing focus outline on interactive motion cards | Fails accessibility audit for keyboard navigation | Include `focus-visible:ring-2 focus-visible:outline-none` |
| Overlooking responsive constraints seen in recording | Breaks on mobile viewports | Extract responsive layout shifts across desktop and mobile frames |

---

### Integration with Other Skills (MANDATORY)

- `website-design-cloner` — Complement static URL cloning with dynamic video micro-interaction extraction.
- `senior-frontend` — Integrate generated motion components into React 19 and Next.js 15 apps.
- `tailwind-expert` — Map extracted spacing and colors to Tailwind CSS v4 `@theme` directives.
- `svg-animation-motion-expert` — Implement complex vector path interpolations seen in recorded demos.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "UI/UX & Design Systems" and "Penemuan & Audit" matrix rows.
- `zero-to-prod-orchestrator` — Integrated in Phase 1 (Discovery & PRD) and Phase 5 (Frontend & Design Systems).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `brainstorming`, `zero-to-prod-orchestrator`, `website-design-cloner`, `senior-frontend`, `tailwind-expert`, `svg-animation-motion-expert`, dan `ui-ux-pro-max` untuk mengubah rekaman layar, video antarmuka, dan demo spasial menjadi kode React 19 dan Tailwind CSS v4 siap produksi.

### Deskripsi
Panduan produksi untuk menganalisis rekaman layar UI/UX, video walkthrough software, dan rekaman spasial guna merekayasa balik hierarki visual, alur interaksi, dan fisika animasi. Mengekstrak tata letak, palet warna, ritme spasi, parameter pegas (*stiffness, damping, mass*), serta mikro-interaksi, menghasilkan komponen Tailwind CSS v4 dengan animasi Framer Motion atau CSS native yang presisi.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Diberikan rekaman video, GIF, atau tangkapan layar antarmuka pengguna atau aplikasi web.
- Mereplikasi mikro-interaksi UI yang rumit, animasi laci geser, atau ekspansi kartu yang dinamis.
- Mengonversi rekaman antarmuka aplikasi seluler/spasial menjadi halaman web responsif.
- Mengekstrak durasi animasi, kurva *cubic-bezier*, dan parameter fisika pegas secara akurat dari media visual.

---

### Konsep Inti & Pola Praktik

#### 1. Pipeline Analisis Video ke Kode
1. **Pemotongan Keyframe**: Mengambil frame pada titik 0%, 25%, 50%, 75%, dan 100% dari durasi interaksi.
2. **Kalkulasi Vektor Gerak**: Menghitung percepatan dan pantulan (*bounce*) elemen untuk menentukan parameter pegas (*spring physics*).
3. **Penyusunan Kode Produksi**: Menyusun komponen React 19 dengan utilitas Tailwind CSS v4 dan transisi Framer Motion atau CSS native.

#### 2. Kepatuhan Aksesibilitas
- Selalu sediakan fallback bagi pengguna dengan preferensi `prefers-reduced-motion`.
- Wajib menyertakan cincin fokus aksesibel (`focus-visible:ring-2`) pada elemen interaktif.

---

### Praktik Terbaik

1. **Hitung Waktu dari Timestamp Video**: Ukur milidetik transisi berdasarkan jarak antar frame untuk memperoleh kelembutan animasi yang identik.
2. **Gunakan Token OKLCH**: Manfaatkan gamut warna luas di Tailwind v4 untuk mempertahankan kecerahan warna yang terlihat di layar HDR.
3. **Pertahankan State Keluar (*Exit Transitions*)**: Pastikan elemen menghilang secara bertahap menggunakan `AnimatePresence`, bukan terputus seketika.
4. **Desain Responsif Sejak Awal**: Sesuaikan tata letak komponen agar tampil optimal di layar ponsel maupun desktop.

---

### Jebakan Umum yang Harus Dihindari

| Praktik Buruk | Dampak Buruk | Solusi Rekayasa |
| :--- | :--- | :--- |
| Mengira-ngira durasi animasi secara sembarangan | Gerakan terasa kaku dan tidak natural | Kalibrasi nilai stiffness dan damping dari video |
| Menghapus outline fokus pada kartu interaktif | Tidak lulus uji aksesibilitas navigasi keyboard | Berikan `focus-visible:ring-2 focus-visible:outline-none` |
| Mengabaikan layout layar kecil | Tampilan berantakan saat dibuka di perangkat mobile | Periksa perilaku responsif dari rekaman video |

---

### Integrasi dengan Skill Lain (WAJIB)

- `website-design-cloner` — Melengkapi kloning URL statis dengan ekstraksi mikro-interaksi dari video.
- `senior-frontend` — Integrasi komponen animasi ke aplikasi React 19 dan Next.js 15.
- `tailwind-expert` — Memetakan warna dan ukuran ke konfigurasi tema Tailwind CSS v4.
- `svg-animation-motion-expert` — Mengimplementasikan animasi path vektor yang tampak pada video.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Tambahkan ke baris "UI/UX & Design Systems" dan "Penemuan & Audit" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Tambahkan ke Fase 1 (Discovery & PRD) dan Fase 5 (Frontend, Design Systems & Mobile Apps).
