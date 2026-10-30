---
name: affective-computing-emotion-ai
description: "Expert guide for Affective Computing, emotional AI, and real-time sentiment analysis through native multimodal tokens (voice intonation and facial micro-expressions) / Panduan ahli komputasi afektif, AI emosional, dan analisis sentimen real-time melalui token multimodal native."
author: "Roedy Rustam"
version: "4.3.0"
---

# Affective Computing & Emotion AI Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Comprehensive guide for Affective Computing, empathic conversational agents, and real-time biometric sentiment synthesis using native multimodal tokens (Gemini 4 Pro Multimodal Live API, WebRTC bidirectional audio streams). Interprets vocal pitch variance, speech rate, pause intervals, and facial micro-expressions. Maps affective signals into continuous 2D Valence-Arousal coordinate space (Russell Circumplex Model) to dynamically modulate agent voice prosody, conversation pacing, and generative UI layouts.

### Trigger Conditions
- Developing empathetic AI customer service, healthcare triage, or crisis support agents.
- Adaptive EdTech tutoring platforms that detect student confusion or cognitive fatigue.
- Interactive gaming NPCs that react to real human vocal intonation rather than text syntax.
- Real-time Affective Generative UI: dampening visual clutter and slowing animation springs when user agitation is detected.

### The Russell 2D Circumplex Model of Affect

```
                       High Arousal (+1.0)
                         [Agitated / Alert]
                               │
       Angry / Frustrated       │       Delighted / Excited
       (Valence: -0.8, Arousal: +0.7)  (Valence: +0.8, Arousal: +0.7)
                               │
Negative Valence (-1.0) ────────┼──────── Positive Valence (+1.0)
                               │
       Depressed / Fatigued     │       Calm / Serene
       (Valence: -0.6, Arousal: -0.6)  (Valence: +0.7, Arousal: -0.5)
                               │
                       Low Arousal (-1.0)
                         [Sleepy / Calm]
```

### Multimodal Real-Time Affective Pipeline (TypeScript)

```typescript
// src/services/affective-engine.ts
export interface AffectVector {
  valence: number; // -1.0 (Very Negative) to +1.0 (Very Positive)
  arousal: number; // -1.0 (Passive/Sleepy) to +1.0 (High Energy/Agitated)
  confidence: number;
}

export interface UIAdaptationContract {
  theme: 'calm-slate' | 'high-contrast-focus' | 'vibrant-energetic';
  cognitiveDensity: 'minimal' | 'balanced' | 'dense';
  animationSpringDamping: number; // Stiff vs Soft
}

export class AffectiveEngine {
  // Evaluates multimodal telemetry and computes dynamic UI parameters
  static computeUIAdaptation(affect: AffectVector): UIAdaptationContract {
    // Agitated or Frustrated user (High Arousal, Negative Valence)
    if (affect.arousal > 0.4 && affect.valence < -0.2) {
      return {
        theme: 'calm-slate',
        cognitiveDensity: 'minimal',
        animationSpringDamping: 40, // Gentle, non-distracting springs
      };
    }

    // Fatigued or Disengaged user (Low Arousal, Negative Valence)
    if (affect.arousal < -0.3 && affect.valence < 0.1) {
      return {
        theme: 'high-contrast-focus',
        cognitiveDensity: 'minimal',
        animationSpringDamping: 25,
      };
    }

    // Standard balanced baseline
    return {
      theme: 'vibrant-energetic',
      cognitiveDensity: 'balanced',
      animationSpringDamping: 20,
    };
  }
}
```

### Real-Time Gemini Multimodal Live Audio Stream

```typescript
// src/lib/gemini-affective-live.ts
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function createAffectiveLiveSession() {
  const session = await ai.models.createWebsocketSession({
    model: 'gemini-2.5-flash',
    config: {
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
        }
      },
      systemInstruction: `You are an empathic customer resolution sentinel.
Analyze user vocal pitch, breathiness, and cadence directly from raw audio frames.
If the customer sounds irritated, lower your pitch, slow your speaking rate by 20%, and maintain a supportive, calm demeanor.`
    }
  });

  return session;
}
```

## Orchestration & Integration
- **`voice-ai-realtime-agent`**: Provides bidirectional WebRTC audio transport and low-latency audio capture.
- **`ephemeral-generative-ui-architect`**: Dynamically re-renders UI components according to the calculated `AffectVector`.
- **`ui-ux-pro-max`**: Ensures affective UI themes adhere to WCAG 2.2 contrast ratios and non-jarring layout transitions.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi bersama `voice-ai-realtime-agent`, `ephemeral-generative-ui-architect`, `ai-llm-integration-expert`, dan `ui-ux-pro-max`.

### Deskripsi
Panduan komprehensif untuk Komputasi Afektif, agen percakapan empatik, dan sintesis sentimen biometrik waktu-nyata menggunakan token multimodal native (Gemini Multimodal Live API, WebRTC audio streaming dua arah). Menafsirkan variasi nada suara, tempo bicara, jeda nafas, dan mikro-ekspresi wajah tanpa ketergantungan pada transkrip teks biasa. Memetakan sinyal emosi ke dalam ruang koordinat 2D *Valence-Arousal* (Model Sirkumpleks Russell) untuk secara dinamis mengatur prosodi suara agen, kecepatan interaksi, dan tata letak antarmuka pengguna (UI).

### Kondisi Pemicu
- Membangun layanan pelanggan empatik, konsultasi medis awal, atau agen pendamping krisis.
- Platform EdTech adaptif yang mendeteksi kebingungan atau kelelahan kognitif siswa saat belajar.
- Karakter NPC dalam game interaktif yang bereaksi terhadap nada suara manusia secara nyata.
- Adaptasi UI Generatif: mengurangi kepadatan visual dan memperlambat animasi ketika terdeteksi kepanikan atau kemarahan pengguna.

### Pola Implementasi Respon UI Adaptif di Frontend

```tsx
// src/components/affective/AdaptiveContainer.tsx
'use client';

import { useMemo } from 'react';
import { AffectiveEngine, AffectVector } from '@/services/affective-engine';

export function AdaptiveContainer({ affect, children }: { affect: AffectVector; children: React.ReactNode }) {
  const adaptation = useMemo(() => AffectiveEngine.computeUIAdaptation(affect), [affect]);

  return (
    <div
      className={`min-h-screen transition-colors duration-700 ${
        adaptation.theme === 'calm-slate'
          ? 'bg-slate-900 text-slate-100'
          : adaptation.theme === 'high-contrast-focus'
          ? 'bg-black text-amber-300'
          : 'bg-white text-slate-900'
      }`}
    >
      <main className={`mx-auto p-6 ${adaptation.cognitiveDensity === 'minimal' ? 'max-w-2xl' : 'max-w-5xl'}`}>
        {children}
      </main>
    </div>
  );
}
```

### 3 Prinsip Dasar Komputasi Afektif
1. **Analisis Langsung pada Sinyal Audio (Zero-STT Latency)**: Jangan ubah suara menjadi teks terlebih dahulu. Analisis dilakukan langsung pada aliran PCM audio agar intonasi dan desahan nafas tidak hilang.
2. **Koordinat Kontinu Valence-Arousal**: Jangan batasi emosi pada label kaku (*"senang"*, *"sedih"*). Gunakan nilai desimal kontinu antara -1.0 hingga +1.0 untuk modulasi yang halus.
3. **Peredaman UI Ramah Stres**: Ketika pengguna frustrasi, jangan tampilkan notifikasi pop-up animasi yang ramai; sederhanakan tampilan hanya pada tindakan penyelesaian utama.

## Integrasi Orkestrasi
- **`voice-ai-realtime-agent`**: Mengalirkan paket audio WebRTC ultra-low latency (<300ms).
- **`ephemeral-generative-ui-architect`**: Menyesuaikan tata letak komponen secara reaktif.
- **`ui-ux-pro-max`**: Menjamin kontras warna tetap memenuhi standar aksesibilitas WCAG 2.2 AA.
