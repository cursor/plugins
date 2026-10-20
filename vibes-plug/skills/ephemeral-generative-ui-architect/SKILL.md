---
name: ephemeral-generative-ui-architect
description: "Expert guide for Generative UI architectures, ephemeral dynamic interfaces, and real-time streaming of React Server Components (RSC) driven by Gemini 4 Pro / Panduan ahli arsitektur Generative UI, antarmuka dinamis efemeral, dan streaming RSC real-time yang didorong oleh Gemini 4 Pro."
author: "Roedy Rustam"
version: "4.3.0"
---

# Ephemeral Generative UI Architect (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `vercel-ai-sdk-expert`, `senior-frontend`, `ui-ux-pro-max`, `design-system-architect`, `gemini-agent-booster`, and `multi-agent-orchestration`.

### Description
Standard UIs are static and pre-compiled. In the Gemini 4 Pro era, interfaces are **ephemeral**: generated in real-time based on the user's immediate intent, and destroyed when no longer needed. This skill orchestrates Generative UI systems using React Server Components (RSC), Tool-Driven UI injection, and Vercel AI SDK, allowing LLMs to directly stream fully functional, interactive components (charts, forms, dashboards) instead of markdown text.

### Trigger Conditions
- The user requests an interface that adapts entirely to the data context (e.g., "Show me a dashboard of my spending" -> AI generates a custom chart component on the fly).
- Designing AI-native chat interfaces that render interactive widgets (booking forms, map components) instead of plain text responses.
- Integrating Vercel AI SDK `streamUI` or tool-call-to-component mappings.

### Core Architecture (2026 Standard)
1. **Tool-to-UI Mapping**: The AI decides to call a tool (e.g., `getWeather`). The server intercepts this tool call and streams a `<WeatherWidget />` React Server Component directly to the client.
2. **Zero-Client-State (Ephemeral)**: The UI state exists only within the LLM conversation history. If the chat resets, the UI resets.
3. **Optimistic Rendering**: The client immediately renders a loading skeleton (e.g., `<WeatherSkeleton />`) the millisecond the LLM begins emitting the tool call token, replaced by the final RSC once execution completes.

### Sovereign Visual Hierarchy in Ephemeral UI
Even when rendered dynamically on-the-fly, AI-generated components MUST strictly observe Sovereign Visual Hierarchy:
1. **Container Grounding**: Wrap streamed widgets in Level 1 Surface containers (`bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-xs`).
2. **Typographic Rhythm**: Eyebrow badge (`text-[11px] font-semibold uppercase tracking-wider text-neutral-500`) -> Title (`text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50`) -> Body (`text-sm text-neutral-600 dark:text-neutral-300`).
3. **Tabular Numerals**: Enforce `tabular-nums` on all streaming counters, prices, metrics, and telemetry stats.
4. **Single Primary CTA**: Exactly one primary action per streamed card (e.g., "Confirm Booking"); secondary options use subtle ghost styling.

### Implementation Recipe (Vercel AI SDK + React 19)
```tsx
import { streamUI } from 'ai/rsc';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { FlightTracker } from '@/components/flight-tracker';
import { Skeleton } from '@/components/skeleton';

export async function submitMessage(userInput: string) {
  'use server';

  const result = await streamUI({
    model: google('gemini-4-pro'),
    prompt: userInput,
    text: ({ content, done }) => {
      return <div>{content}</div>;
    },
    tools: {
      trackFlight: {
        description: 'Track a flight status in real-time',
        parameters: z.object({ flightNumber: z.string() }),
        generate: async function* ({ flightNumber }) {
          yield <Skeleton className="h-40 w-full" />; // Optimistic UI
          const data = await fetchFlightData(flightNumber); // Server-side execution
          return <FlightTracker data={data} />; // Final RSC streamed to client with Sovereign Visual Hierarchy
        },
      },
    },
  });

  return result.value;
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi bersama `vercel-ai-sdk-expert`, `senior-frontend`, `ui-ux-pro-max`, `design-system-architect`, `gemini-agent-booster`, dan `multi-agent-orchestration`.

### Deskripsi
UI standar bersifat statis dan di-compile sebelumnya. Di era Gemini 4 Pro, antarmuka bersifat **efemeral**: dihasilkan secara real-time berdasarkan niat langsung pengguna, dan dihancurkan saat tidak lagi dibutuhkan. Skill ini mengatur sistem Generative UI menggunakan React Server Components (RSC), injeksi UI berbasis Tool, dan Vercel AI SDK, memungkinkan LLM untuk langsung men-streaming komponen fungsional interaktif (grafik, formulir, dashboard) sebagai pengganti teks biasa.

### Kondisi Pemicu
- Pengguna meminta antarmuka yang beradaptasi sepenuhnya dengan konteks data (misal: "Tampilkan dashboard pengeluaran saya" -> AI menghasilkan komponen grafik kustom secara instan).
- Mendesain antarmuka percakapan AI-native yang merender widget interaktif (formulir pemesanan, peta) alih-alih teks biasa.
- Mengintegrasikan Vercel AI SDK `streamUI` atau pemetaan panggilan alat (*tool-call*) ke komponen React.

### Arsitektur Inti (Standar 2026)
1. **Pemetaan Tool-ke-UI**: AI memutuskan untuk memanggil alat (misal: `getWeather`). Server mencegat panggilan alat ini dan men-streaming komponen React Server (`<WeatherWidget />`) langsung ke klien.
2. **Zero-Client-State (Efemeral)**: State UI hanya ada di dalam riwayat percakapan LLM. Jika obrolan di-reset, UI ikut ter-reset.
3. **Render Optimistis**: Klien langsung merender kerangka pemuatan (misal: `<WeatherSkeleton />`) pada milidetik pertama LLM mulai mengeluarkan token pemanggilan alat, yang kemudian diganti dengan RSC final setelah eksekusi selesai.

### Kontrak Hierarki Visual pada UI Efemeral
Bahkan saat dirender secara dinamis seketika (*on-the-fly*), widget hasil AI WAJIB menerapkan Hierarki Visual Berdaulat:
1. **Pembatasan Kontainer**: Bungkus widget streaming dalam kontainer Permukaan Level 1 (`bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl shadow-xs`).
2. **Irama Tipografi**: Eyebrow (`text-[11px] font-semibold uppercase tracking-wider text-neutral-500`) -> Judul (`text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50`) -> Teks tubuh (`text-sm text-neutral-600 dark:text-neutral-300`).
3. **Angka Tabular Wajib**: Terapkan `tabular-nums` pada semua metrik angka, saldo, tarif, dan stempel waktu streaming.
4. **Dominasi Single Primary CTA**: Tepat satu tombol aksi utama per kartu widget (misal: "Konfirmasi Pesanan"); aksi sekunder menggunakan gaya ghost halus.
