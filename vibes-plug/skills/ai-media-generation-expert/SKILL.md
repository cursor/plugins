---
name: ai-media-generation-expert
description: "Expert guide for AI image generation (Flux, DALL-E, Stable Diffusion), video generation (Sora, Runway), voice synthesis (ElevenLabs TTS), and speech recognition (Whisper STT) integration / Panduan ahli integrasi AI generasi gambar, video, suara (TTS), dan pengenalan suara (STT)."
author: "Roedy Rustam"
version: "4.3.0"
---

# AI Media Generation Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
- **`ai-llm-integration-expert`**: Core LLM patterns and model selection.
- **`file-upload-media-expert`**: Storage, CDN, and media pipeline for generated assets.
- **`sse-websocket-streaming-expert`**: Real-time streaming for progressive image/audio generation.
- **`async-queue-temporal-expert`**: Background job processing for long-running generation tasks.
- **`zero-trust-secret-vault`**: Secure API key management for Replicate, OpenAI, ElevenLabs.

### Description
Production-grade guide for integrating AI-powered media generation into web and mobile applications. Covers image generation (Flux 1.1 Pro, SDXL, DALL-E 3), video generation (Sora, Runway Gen-3), text-to-speech (ElevenLabs v3, OpenAI TTS), speech-to-text (Whisper large-v3, Deepgram Nova-3), and voice cloning. Includes async processing patterns, cost optimization, and content safety filtering.

### Trigger Conditions
- Integrating AI image generation (Flux, DALL-E, Stable Diffusion, Midjourney API).
- Building text-to-speech or speech-to-text features.
- Implementing voice cloning or AI avatar generation.
- Adding AI video generation or editing capabilities.
- Building media processing pipelines with AI models.

---

### Core Architecture

#### 1. Image Generation

**Provider Selection Matrix:**

| Provider | Model | Speed | Quality | Cost | Best For |
|----------|-------|-------|---------|------|----------|
| Replicate | Flux 1.1 Pro | ~3s | ★★★★★ | $0.04/img | Photorealism, text rendering |
| Replicate | Flux Schnell | ~1s | ★★★★ | $0.003/img | High-volume, previews |
| OpenAI | DALL-E 3 | ~5s | ★★★★ | $0.04/img | Creative, prompt following |
| Stability | SDXL Turbo | ~2s | ★★★★ | $0.002/img | Self-hosted, customization |

**Recommendation:** Use **Flux 1.1 Pro** via Replicate for production quality. Use **Flux Schnell** for previews/drafts.

```typescript
// Image generation with Replicate (Flux)
import Replicate from 'replicate';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function generateImage(prompt: string, options?: {
  width?: number;
  height?: number;
  model?: 'flux-1.1-pro' | 'flux-schnell';
}) {
  const model = options?.model ?? 'flux-1.1-pro';
  const output = await replicate.run(
    `black-forest-labs/${model}`,
    {
      input: {
        prompt,
        width: options?.width ?? 1024,
        height: options?.height ?? 1024,
        num_inference_steps: model === 'flux-schnell' ? 4 : 28,
      },
    }
  );
  return output; // URL to generated image
}
```

#### 2. Text-to-Speech (TTS)

**Provider Selection:**

| Provider | Model | Latency | Expressiveness | Cost |
|----------|-------|---------|----------------|------|
| ElevenLabs | eleven_v3 | ~500ms | ★★★★★ | $0.30/1K chars |
| ElevenLabs | eleven_flash_v2_5 | ~200ms | ★★★★ | $0.15/1K chars |
| OpenAI | tts-1-hd | ~300ms | ★★★ | $0.030/1K chars |

**Recommendation:** Use **ElevenLabs eleven_v3** for expressive content. Use **eleven_flash_v2_5** for real-time chatbots.

```typescript
// ElevenLabs TTS streaming
async function textToSpeech(text: string, voiceId: string): Promise<ReadableStream> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_v3',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  return response.body!; // Stream audio chunks
}
```

#### 3. Speech-to-Text (STT)

```typescript
// OpenAI Whisper transcription
import OpenAI from 'openai';

const openai = new OpenAI();

async function transcribeAudio(audioFile: File) {
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word', 'segment'],
  });
  return transcription;
}
```

#### 4. Video Generation

```typescript
// Replicate video generation (async with webhook)
async function generateVideo(prompt: string) {
  const prediction = await replicate.predictions.create({
    model: 'minimax/video-01',
    input: { prompt, duration: 5 },
    webhook: `${process.env.APP_URL}/api/webhooks/replicate`,
    webhook_events_filter: ['completed'],
  });
  return prediction.id; // Poll or wait for webhook
}
```

#### 5. Production Patterns

- **Async Processing:** Always use background jobs (BullMQ, Inngest) for generation tasks >2s.
- **Webhook Architecture:** Use webhooks for Replicate predictions instead of polling.
- **Content Safety:** Implement NSFW filtering (OpenAI Moderation API, Replicate safety checker).
- **Cost Control:** Set per-user daily limits. Cache identical prompts. Use cheaper models for drafts.
- **Storage Pipeline:** Generate → upload to S3/R2 → serve via CDN → store URL in DB.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
- **`ai-llm-integration-expert`**: Pola LLM inti, pemilihan model penalaran, dan arsitektur orkestrasi prompt.
- **`file-upload-media-expert`**: Penyimpanan Cloudflare R2 / S3, optimasi CDN, dan pipeline media untuk aset yang dihasilkan.
- **`sse-websocket-streaming-expert`**: Streaming progresif untuk generasi gambar, status tugas, dan audio real-time.
- **`async-queue-temporal-expert`**: Pemrosesan background job (BullMQ/Temporal) untuk tugas generasi media berdurasi panjang.
- **`zero-trust-secret-vault`**: Manajemen rahasia aman untuk token Replicate, OpenAI, dan ElevenLabs.

### Deskripsi
Panduan tingkat produksi untuk mengintegrasikan generasi media berbasis AI ke dalam aplikasi web dan mobile modern. Mencakup generasi gambar (Flux 1.1 Pro, SDXL, DALL-E 3), generasi video (Sora, Runway Gen-3, MiniMax), text-to-speech (ElevenLabs v3, OpenAI TTS), speech-to-text (Whisper large-v3, Deepgram Nova-3), dan kloning audio. Dilengkapi pola pemrosesan asinkron via webhook, mitigasi biaya, serta penyaringan keamanan konten (NSFW/moderasi).

### Kondisi Pemicu
- Mengintegrasikan API generasi gambar AI beresolusi tinggi (Flux 1.1 Pro, DALL-E 3, SDXL).
- Membangun fitur sintesis suara ekspresif (Text-to-Speech) atau transkripsi audio otomatis (Speech-to-Text).
- Mengembangkan pipeline video AI asinkron berbasis webhook callback.
- Menerapkan pembatasan kuota generasi dan verifikasi keamanan konten pengguna.

---

### Matriks Pemilihan Model Generasi Media

| Tipe Media | Provider & Model | Latensi | Kualitas Visual/Audio | Estimasi Biaya | Rekomendasi Penggunaan |
|---|---|---|---|---|---|
| **Gambar** | Replicate (Flux 1.1 Pro) | ~3 detik | ★★★★★ | $0.04 / gambar | Gambar fotorealistik & tipografi akurat |
| **Gambar (Draft)** | Replicate (Flux Schnell) | ~1 detik | ★★★★ | $0.003 / gambar | Pratinjau instan & volume tinggi |
| **Gambar** | OpenAI (DALL-E 3) | ~5 detik | ★★★★ | $0.04 / gambar | Ilustrasi kreatif & pemahaman prompt deskriptif |
| **Suara (TTS)** | ElevenLabs (eleven_v3) | ~500 ms | ★★★★★ | $0.30 / 1K karakter | Narasi audio buku & karakter ekspresif |
| **Suara (Realtime)**| ElevenLabs (eleven_flash_v2_5) | ~200 ms | ★★★★ | $0.15 / 1K karakter | Agen percakapan AI & voicebot interaktif |
| **Transkripsi** | OpenAI (Whisper large-v3) | Cepat | ★★★★★ | $0.006 / menit | Transkripsi rapat & subtitling multibahasa |

---

### Pola Implementasi Teknis (TypeScript)

#### 1. Generasi Gambar Berkualitas Tinggi dengan Replicate (Flux 1.1 Pro)
```typescript
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

interface ImageGenOptions {
  width?: number;
  height?: number;
  mode?: 'production' | 'preview';
}

export async function hasilkanGambarAI(promptTeks: string, options: ImageGenOptions = {}) {
  const isPreview = options.mode === 'preview';
  const modelIdentifier = isPreview 
    ? 'black-forest-labs/flux-schnell' 
    : 'black-forest-labs/flux-1.1-pro';

  const output = await replicate.run(modelIdentifier, {
    input: {
      prompt: promptTeks,
      width: options.width ?? 1024,
      height: options.height ?? 1024,
      num_inference_steps: isPreview ? 4 : 28,
      output_format: 'webp',
      output_quality: 90,
    },
  });

  return output; // Mengembalikan URL langsung ke aset WebP yang dihasilkan
}
```

#### 2. Streaming Text-to-Speech (TTS) ElevenLabs
```typescript
export async function streamSuaraTeks(teks: string, voiceId: string): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: teks,
      model_id: 'eleven_v3',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.2,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }

  return response.body as ReadableStream<Uint8Array>;
}
```

#### 3. Transkripsi Audio Whisper Berpresisi Tinggi
```typescript
import OpenAI from 'openai';
import fs from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transkripsiAudio(fileBuffer: Buffer, namaFile: string) {
  const file = await OpenAI.toFile(fileBuffer, namaFile);
  
  const hasil = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['word', 'segment'],
  });

  return hasil;
}
```

#### 4. Pola Produksi Kritis
- **Arsitektur Asinkron**: Wajib menggunakan antrean tugas latar belakang (`BullMQ` atau `Inngest`) untuk setiap operasi media yang memerlukan waktu komputasi >2 detik.
- **Penerimaan Callback Webhook**: Jangan gunakan polling HTTP terus-menerus; gunakan endpoint webhook yang divalidasi dengan tanda tangan kriptografis untuk menerima hasil generasi dari Replicate.
- **Pencegahan Konten Terlarang (NSFW)**: Lakukan penyaringan ganda menggunakan OpenAI Moderation API sebelum memproses prompt dan verifikasi gambar hasil sebelum ditampilkan kepada pengguna umum.
- **Penyimpanan Permanen**: Jangan bergantung pada URL hosting sementara dari vendor AI. Segera unduh dan simpan aset ke Cloudflare R2 atau AWS S3, lalu sajikan melalui domain CDN kustom.