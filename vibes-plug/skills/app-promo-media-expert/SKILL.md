---
name: app-promo-media-expert
description: "Expert guide for creating high-converting application promotional media — App Store & Google Play screenshots, social promo graphics, dynamic Open Graph banners, Remotion programmatic video teasers, and AI promo showcases / Panduan ahli pembuatan media promosi aplikasi — mockup screenshot App Store & Google Play, kartu promo media sosial, banner Open Graph dinamis, video teaser terprogram Remotion, dan showcase promo berbasis AI."
author: "Roedy Rustam"
version: "4.3.0"
---

# App Promotional Media Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
- **`ai-media-generation-expert`**: Generates AI imagery (Flux 1.1 Pro), video B-roll (Sora, Runway Gen-3), and synthetic voiceover narration (ElevenLabs v3).
- **`svg-animation-motion-expert`**: High-performance SVG animations, Framer Motion transitions, and kinetic typography.
- **`file-upload-media-expert`**: CDN asset distribution, lossy/lossless image compression (Sharp), and video transcoding.
- **`seo`**: Dynamic Open Graph (`og:image`), Twitter Card metadata, and social crawlers previews.
- **`senior-frontend` / `tailwind-expert`**: High-fidelity CSS device frames, canvas compositing, and responsive layout styling.
- **`zero-to-prod-orchestrator`**: Coordinates Phase 5 (visual assets & UI branding) and Phase 8 (launch, deployment, marketing assets handover).

### Description
Production-grade engineering guide for creating high-converting application promotional media across visual still graphics (App Store screenshots, social media cards, dynamic OG banners) and dynamic motion media (Remotion programmatic video teasers, kinetic app walkthroughs, and AI-narrated launch demos).

### Trigger Conditions
- Generating promotional screenshots for Apple App Store & Google Play Store with device mockups.
- Creating launch graphics for Product Hunt, Twitter/X banners, LinkedIn showcases, and Instagram/TikTok carousel ads.
- Implementing dynamic Open Graph (OG) social card image generation via Satori / `@vercel/og`.
- Programmatically creating app promo videos, teaser trailers, or product tour videos using Remotion (React-based video).
- Scripting and synthesizing 30-second high-converting app teaser storyboards with AI voiceovers.
- Automating multi-resolution screenshot capture pipelines using headless browser automation (Playwright/Puppeteer).

---

### Core Architecture & Media Production Pillars

```
                     ┌──────────────────────────────────────────────┐
                     │          APP PROMOTIONAL MEDIA ENGINE         │
                     └──────────────────────┬───────────────────────┘
                                            │
               ┌────────────────────────────┴───────────────────────────┐
               ▼                                                        ▼
   STILL IMAGERY & GRAPHICS                                MOTION & VIDEO CREATION
 ├── App Store & Google Play Screenshots                   ├── Remotion Programmatic Videos (React)
 ├── Social Cards (X, LinkedIn, Product Hunt)              ├── 30s High-Converting Teaser Formula
 ├── Dynamic OpenGraph Banners (@vercel/og)                ├── Kinetic Typography & Cursor Trails
 └── Pure CSS/SVG Device Mockups (iPhone/Pixel)            └── AI Voiceover & B-Roll Synchronization
```

---

### 1. App Store & Google Play Screenshot Matrix

#### A. Resolution & Specification Standard (2026)

| Target Platform | Display Size | Native Resolution | Aspect Ratio | Format Requirements |
|---|---|---|---|---|
| **Apple iOS (iPhone 16 Pro Max)** | 6.9" Super Retina | 1320 × 2868 px | 19.5:9 | 24-bit PNG, RGB, no alpha, max 10MB |
| **Apple iOS (iPhone 16 / 15 Pro)** | 6.7" Super Retina | 1290 × 2796 px | 19.5:9 | 24-bit PNG, RGB, no alpha, max 10MB |
| **Apple iPadOS (iPad Pro 13")** | 13.0" Liquid Retina | 2064 × 2752 px | 4:3 | 24-bit PNG, RGB, no alpha |
| **Google Play Phone** | Standard Flagship | 1080 × 2400 px (or 1080 × 1920) | 20:9 / 16:9 | PNG/JPEG, min 1080px on shortest side |
| **Google Play Feature Graphic** | Hero Banner | 1024 × 500 px | ~2:1 | 24-bit PNG/JPEG, no alpha, max 1MB |
| **App Store Promo Video** | Preview Video | 1080 × 1920 px (Portrait) / 1920 × 1080 | 9:16 / 16:9 | MP4/ProRes, max 30s, no fake OS overlays |

#### B. High-Converting Screenshot Composition Formula
Every screenshot in the sequence must follow a 4-part visual hierarchy:
1. **Headline (Punchy Benefit)**: Max 4-6 words. Focus on the transformation, not the technical feature (e.g., *"Automate Bills in 3 Seconds"* vs *"Invoice Generation Form"*).
2. **Subheadline (Contextual Anchor)**: 1 short sentence clarifying the workflow.
3. **Floating UI / Framed Mockup**: High-contrast, pixel-perfect device mockup tilted 5°-12° or front-facing, centered in the lower 65% of the frame.
4. **Ambient Canvas / Gradient**: Subtle OKLCH background gradient matching brand theme with soft radial glows.

---

### 2. Social Launch Graphic Specifications

- **Product Hunt Launch Kit**:
  - Gallery Images: `1270 × 760 px` (5:3 ratio). Showcase top 3 features with crisp typography and real UI screens.
  - Animated Gallery Teaser: `240 × 240 px` GIF or MP4 (under 3MB) for the product card thumbnail.
- **Twitter / X Cards**:
  - In-feed promotional card: `1200 × 675 px` (16:9) or `1200 × 630 px` (1.91:1).
  - Profile Banner: `1500 × 500 px` (3:1 ratio).
- **Instagram & TikTok Posts**:
  - Carousel Feed Slides: `1080 × 1350 px` (4:5 portrait ratio).
  - Story & Vertical Teaser: `1080 × 1920 px` (9:16 ratio).

---

### 3. Dynamic Open Graph (OG) Image Generator

Dynamic OG generation ensures every link share on Twitter/X, Discord, Slack, and WhatsApp renders a custom high-res branded card.

```tsx
// app/api/og/route.tsx (Next.js 15 + @vercel/og / Satori)
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || 'Next-Gen AI Workspace';
  const subtitle = searchParams.get('subtitle') || 'Built with VibesPlug Swarm Architecture';
  const tag = searchParams.get('tag') || 'v3.0 Production Ready';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '64px',
          backgroundColor: '#090a0f',
          backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.25) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(236, 72, 153, 0.2) 0%, transparent 60%)',
          fontFamily: 'Inter, sans-serif',
          color: '#ffffff',
        }}
      >
        {/* Top Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              padding: '6px 16px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '20px',
              fontWeight: 600,
              color: '#818cf8',
            }}
          >
            {tag}
          </div>
        </div>

        {/* Main Title & Subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '850px' }}>
          <h1
            style={{
              fontSize: '60px',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              margin: 0,
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontSize: '26px',
              color: '#94a3b8',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Footer Brand Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              }}
            />
            <span style={{ fontSize: '22px', fontWeight: 700 }}>MyApp.io</span>
          </div>
          <span style={{ fontSize: '18px', color: '#64748b' }}>Try free today • No credit card</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
```

---

### 4. Programmatic Video Creation with Remotion (React)

Remotion allows developers to render MP4 promo videos completely from code, enabling animated UI components, kinetic typography, spring physics, and device rotations.

```tsx
// src/remotion/AppPromoComposition.tsx
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import React from 'react';

export const AppPromoComposition: React.FC<{
  headline: string;
  subheadline: string;
  screenshotUrl: string;
}> = ({ headline, subheadline, screenshotUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring animation for the device mockup
  const deviceEntrance = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  const translateY = interpolate(deviceEntrance, [0, 1], [400, 0]);
  const scale = interpolate(deviceEntrance, [0, 1], [0.85, 1]);

  // Floating continuous hover effect after entry
  const hoverY = Math.sin(frame / 20) * 12;

  // Text reveal animation
  const textOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const textTranslateY = interpolate(frame, [0, 20], [30, 0], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0d14',
        backgroundImage: 'radial-gradient(ellipse at 50% 10%, rgba(99, 102, 241, 0.35) 0%, transparent 70%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden',
        padding: '60px',
      }}
    >
      {/* Kinetic Headline */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textTranslateY}px)`,
          textAlign: 'center',
          marginBottom: '40px',
          zIndex: 10,
        }}
      >
        <h1
          style={{
            fontSize: '56px',
            fontWeight: 800,
            color: '#ffffff',
            margin: '0 0 16px 0',
            letterSpacing: '-0.02em',
          }}
        >
          {headline}
        </h1>
        <p style={{ fontSize: '26px', color: '#94a3b8', margin: 0 }}>
          {subheadline}
        </p>
      </div>

      {/* Floating Device Container */}
      <div
        style={{
          transform: `translateY(${translateY + hoverY}px) scale(${scale})`,
          width: '720px',
          height: '1100px',
          borderRadius: '48px',
          padding: '16px',
          backgroundColor: '#1f2937',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.25)',
          border: '4px solid #374151',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Dynamic Notch / Island */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <div style={{ width: '120px', height: '24px', backgroundColor: '#000', borderRadius: '12px' }} />
        </div>
        
        {/* Screen Content */}
        <img
          src={screenshotUrl}
          alt="App Screen"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '32px',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
```

#### Remotion CLI Rendering Command
```bash
# Render 9:16 vertical promo teaser (Reels / TikTok / Shorts)
npx remotion render src/remotion/index.ts AppPromoTeaser out/promo-teaser.mp4 --props='{"headline":"Ship Apps in Minutes","subheadline":"Autonomous Swarm Intelligence","screenshotUrl":"/assets/screen.png"}'
```

---

### 5. The 30-Second High-Converting Teaser Video Formula

| Timestamp | Phase | Visual Cue | Audio / Narration Guidance |
|---|---|---|---|
| **00:00 - 00:04** | **The Hook** | Rapid zoom into problem (e.g., messy manual spreadsheets or failed builds). Red/Amber warning badges. | *"Still wasting hours manually deploying releases?"* (Punchy, energetic voiceover). |
| **00:04 - 00:12** | **The Reveal** | Seamless 3D device tilt transition. App dashboard appears with glowing interactive accents. | *"Meet [App Name] — your autonomous zero-to-prod engine."* |
| **00:12 - 00:20** | **Key Superpowers** | 3 rapid cuts showcasing core features: 1. One-click setup; 2. Live analytics; 3. Instant sync. | *"One click transforms your workflow, syncs real-time data, and eliminates human error."* |
| **00:20 - 00:26** | **Social Proof** | 5-star badges, G2/Product Hunt badges, floating testimonial avatar pills. | *"Trusted by over 10,000 developers worldwide."* |
| **00:26 - 00:30** | **Call-to-Action** | Big shiny CTA button, App Store & Google Play badges, prominent URL. | *"Download now on the App Store or visit myapp.io to start free today."* |

---

### 6. Automated Multi-Device Screenshot Capture (Playwright)

Run this script to automatically take pixel-perfect screenshot captures formatted for App Store specs:

```typescript
// scripts/capture-promo-screens.ts
import { chromium, devices } from 'playwright';
import path from 'path';

const TARGET_URL = process.env.APP_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(process.cwd(), 'promo-assets/screenshots');

const SCREEN_TARGETS = [
  { name: '01-dashboard-ios', device: devices['iPhone 15 Pro Max'], path: '/dashboard' },
  { name: '02-analytics-ios', device: devices['iPhone 15 Pro Max'], path: '/analytics' },
  { name: '03-settings-ios', device: devices['iPhone 15 Pro Max'], path: '/settings' },
];

async function captureScreens() {
  const browser = await chromium.launch();
  
  for (const target of SCREEN_TARGETS) {
    const context = await browser.newContext({
      ...target.device,
      deviceScaleFactor: 3, // Crisp Retina resolution
    });

    const page = await context.newPage();
    await page.goto(`${TARGET_URL}${target.path}`, { waitUntil: 'networkidle' });

    // Emulate dark mode or custom theme if desired
    await page.emulateMedia({ colorScheme: 'dark' });

    const outputPath = `${OUTPUT_DIR}/${target.name}.png`;
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log(`📸 Captured: ${outputPath}`);

    await context.close();
  }

  await browser.close();
}

captureScreens().catch(console.error);
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
- **`ai-media-generation-expert`**: Menghasilkan gambar AI (Flux 1.1 Pro), video B-roll (Sora, Runway Gen-3), dan suara narasi sintetis (ElevenLabs v3).
- **`svg-animation-motion-expert`**: Animasi grafis SVG, transisi Framer Motion, dan tipografi kinetik.
- **`file-upload-media-expert`**: Distribusi aset CDN, kompresi gambar (Sharp), dan transkoding video.
- **`seo`**: Dynamic Open Graph (`og:image`), Twitter Card metadata, dan preview link media sosial.
- **`senior-frontend` / `tailwind-expert`**: Mockup frame gadget CSS dengan presisi tinggi, komposisi canvas, dan styling Tailwind CSS v4.
- **`zero-to-prod-orchestrator`**: Mengorkestrasi Fase 5 (aset visual UI) dan Fase 8 (peluncuran, deployment, serah terima materi promosi).

### Deskripsi & Kegunaan
Panduan rekayasa tingkat produksi untuk membuat media promosi aplikasi berkualitas tinggi, baik materi grafis statis (screenshot App Store & Google Play, banner media sosial, kartu Open Graph dinamis) maupun materi video animasi gerak (video teaser terprogram dengan Remotion React, tur aplikasi kinetik, dan demo peluncuran berbasis AI).

### Kondisi Pemicu (Trigger Conditions)
- Mendesain screenshot promosi resmi untuk Apple App Store & Google Play Store lengkap dengan bingkai gawai (device frame).
- Membuat materi promosi peluncuran untuk Product Hunt, banner Twitter/X, kartu LinkedIn, dan iklan carousel Instagram/TikTok.
- Mengimplementasikan pembuatan gambar dinamis Open Graph (OG) berbasis Next.js 15 dan `@vercel/og` (Satori).
- Membuat video teaser atau demo aplikasi secara terprogram menggunakan Remotion (video berbasis React).
- Menyusun storyboard dan skrip video promosi aplikasi 30 detik berkonversi tinggi dengan voiceover AI.
- Mengotomatiskan pengambilan tangkapan layar (screenshot) multi-resolusi menggunakan Playwright/Puppeteer.

---

### Alur Kerja Pembuatan Media Promosi Aplikasi (5 Langkah)

```
[1. Script & Storyboard] ──► [2. Tangkapan Layar Otomatis] ──► [3. Framing & Tipografi]
                                                                        │
[5. Distribusi Multi-Channel] ◄── [4. Render Video Remotion / OG] ◄─────┘
```

1. **Penyusunan Konsep & Naskah**: Menentukan pesan inti aplikasi, target audiens, dan formula teaser 30 detik (Hook -> Solusi -> Fitur Unggulan -> Social Proof -> CTA).
2. **Pengambilan Layar Otomatis**: Menjalankan skrip Playwright untuk menangkap tampilan UI aplikasi dengan resolusi retina tinggi (3x pixel ratio) tanpa artefak buram.
3. **Komposisi Mockup Gawai**: Memasang screenshot ke dalam bingkai gawai modern (iPhone 16 Pro atau Android flagship) dengan sudut kemiringan (tilt) 5°-12° dan gradien latar belakang OKLCH.
4. **Produksi Video & Grafik Dinamis**: Merender video promosi vertikal (9:16 untuk Reels/TikTok) menggunakan Remotion dan menyinkronkan narasi suara ElevenLabs.
5. **Ekspor & Pengecekan Standar**: Memastikan ukuran file, resolusi, dan rasio aspek mematuhi pedoman App Store dan Google Play Console.

---

### Formula Naskah Video Teaser 30 Detik (Tingkat Konversi Tinggi)

- **Detik 00-04 (Hook / Pancingan)**: Tampilkan masalah utama audiens (misal: proses manual yang lambat). Contoh narasi: *"Masih menghabiskan waktu berjam-jam untuk deploy aplikasi secara manual?"*
- **Detik 04-12 (Reveal Solusi)**: Animasi transisi gawai muncul dengan UI aplikasi menyala interaktif. Contoh narasi: *"Perkenalkan [Nama Aplikasi] — platform pintar berbasis AI untuk mempercepat rilis produk Anda."*
- **Detik 12-20 (Fitur Utama)**: Transisi bento 3 fitur tercepat: 1. Setup satu klik; 2. Sinkronisasi instan; 3. Analitik real-time.
- **Detik 20-26 (Bukti Sosial / Kepercayaan)**: Tampilkan badge rating bintang 5, testimoni pengguna, atau logo penghargaan. *"Dipercaya oleh lebih dari 10.000 developer profesional."*
- **Detik 26-30 (Call-To-Action)**: Tombol unduh tegas dengan badge App Store & Google Play atau alamat web. *"Unduh sekarang di App Store dan mulai uji coba gratis hari ini."*

---

### Perintah Cepat Render Video Promosi (Remotion)
```bash
# Render video promosi vertikal 9:16 untuk TikTok / Instagram Reels
npx remotion render src/remotion/index.ts AppPromoTeaser out/promo-teaser.mp4 --props='{"headline":"Bangun Aplikasi Cepat","subheadline":"Didukung Agen AI Otonom","screenshotUrl":"/assets/screen.png"}'
```
