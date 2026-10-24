---
name: local-slm-edge-ai-expert
description: "Expert guide for Local Small Language Models (SLMs) and Edge AI execution — WebLLM, Transformers.js v3, ONNX Runtime Web, WebGPU, and zero-latency local embeddings / Panduan ahli SLM lokal dan AI edge di browser."
author: "Roedy Rustam"
version: "4.3.0"
---

# Local SLM & Edge AI Expert (WebGPU & In-Browser Intelligence)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Purpose & Overview
Production-grade architectural guide for running **Small Language Models (SLMs)** and embedding models directly inside client browsers and edge runtimes. Eliminates cloud API costs, guarantees 100% data privacy (zero cloud data leakage), and enables instant, offline-capable AI features using **WebGPU**, **Transformers.js v3**, **WebLLM**, and **ONNX Runtime Web**.

### Key Capabilities
1. **Client-Side Model Execution**: Running quantized 1B–4B SLMs (Llama 3.2 1B/3B, Gemma 2 2B, Phi-3.5 Mini, Qwen 2.5 1.5B/3B) entirely inside the user's browser via WebGPU.
2. **In-Browser Embeddings**: Fast client-side vector embeddings with models like `all-MiniLM-L6-v2` or `bge-small-en-v1.5` using Transformers.js v3.
3. **Hybrid Edge-Cloud Fallback**: Gracefully falling back to server-side LLMs when client hardware lacks WebGPU or sufficient VRAM.
4. **Zero-Latency PII Masking**: Anonymizing sensitive user data locally on the client before sending queries to external LLMs.

---

### Production Implementation Recipes

#### Recipe 1: In-Browser Semantic Embedding Generation with Transformers.js v3
```typescript
import { pipeline, env } from '@huggingface/transformers';

// Configure cache and worker settings
env.allowLocalModels = false;
env.useBrowserCache = true;

let embedder: any = null;

export async function getLocalEmbedding(text: string): Promise<number[]> {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      dtype: 'fp32',
      device: 'webgpu', // Accelerate via WebGPU if supported
    });
  }

  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
```

#### Recipe 2: WebLLM In-Browser Chat Assistant with WebGPU
```typescript
import * as webllm from '@mlc-ai/web-llm';

export async function createLocalChatEngine(onProgress?: (report: webllm.InitProgressReport) => void) {
  // Check WebGPU compatibility
  if (!('gpu' in navigator)) {
    throw new Error('WebGPU is not supported in this browser. Fallback to cloud API.');
  }

  const selectedModel = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';

  const engine = await webllm.CreateMLCEngine(selectedModel, {
    initProgressCallback: onProgress,
  });

  return {
    generateResponse: async (prompt: string): Promise<string> => {
      const reply = await engine.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      });
      return reply.choices[0]?.message.content || '';
    },
  };
}
```

---

### Implementation Checklist
- [ ] Implement browser feature detection (`'gpu' in navigator`) before initiating WebGPU model loads.
- [ ] Provide a transparent download progress bar when fetching model weights on initial visit.
- [ ] Cache model shards in IndexedDB or Cache API to ensure instant subsequent launches.
- [ ] Provide automatic fallback to lightweight serverless APIs when client device VRAM is constrained.

## Orchestration & Integration
- Integrates with: `llm-finops-router`, `senior-frontend`, `vector-db-rag-expert`, `compliance-gdpr-privacy-expert`.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Tujuan & Gambaran Umum
Panduan arsitektur tingkat produksi untuk menjalankan **Small Language Models (SLM)** dan model *embedding* langsung di dalam browser pengguna dan runtime edge. Menghilangkan biaya API cloud, menjamin privasi data 100% (tidak ada data yang keluar ke server pihak ketiga), dan mengaktifkan fitur AI instan yang dapat bekerja secara *offline* menggunakan **WebGPU**, **Transformers.js v3**, **WebLLM**, dan **ONNX Runtime Web**.

### Kemampuan Utama
1. **Eksekusi Model di Sisi Klien**: Menjalankan SLM terkuantisasi 1B–4B (Llama 3.2 1B/3B, Gemma 2 2B, Phi-3.5 Mini, Qwen 2.5) sepenuhnya di dalam browser pengguna dengan akselerasi WebGPU.
2. **Embedding Vektor di Browser**: Pembuatan vektor semantik secepat kilat menggunakan Transformers.js v3 (`all-MiniLM-L6-v2` atau `bge-small`).
3. **Fallback Hibrida Klien-Cloud**: Mengalihkan tugas ke server secara otomatis jika perangkat klien tidak mendukung WebGPU atau memiliki VRAM terbatas.
4. **Penyensoran PII Tanpa Latensi**: Mengaburkan data pribadi sensitif secara lokal di perangkat klien sebelum diteruskan ke cloud.

---

### Resep Implementasi Produksi

#### Resep 1: Pembuatan Embedding Vektor di Browser dengan Transformers.js v3
```typescript
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let modelEmbedding: any = null;

export async function buatEmbeddingLokal(teks: string): Promise<number[]> {
  if (!modelEmbedding) {
    modelEmbedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      dtype: 'fp32',
      device: 'webgpu',
    });
  }

  const hasil = await modelEmbedding(teks, { pooling: 'mean', normalize: true });
  return Array.from(hasil.data);
}
```

#### Resep 2: Asisten AI di Browser dengan WebLLM & WebGPU
```typescript
import * as webllm from '@mlc-ai/web-llm';

export async function inisialisasiMesinLokal(laporanProgres?: (laporan: webllm.InitProgressReport) => void) {
  if (!('gpu' in navigator)) {
    throw new Error('WebGPU tidak didukung pada browser ini. Alihkan ke API cloud.');
  }

  const modelTerpilih = 'Llama-3.2-1B-Instruct-q4f32_1-MLC';

  const mesin = await webllm.CreateMLCEngine(modelTerpilih, {
    initProgressCallback: laporanProgres,
  });

  return {
    kirimPesan: async (pertanyaan: string): Promise<string> => {
      const balasan = await mesin.chat.completions.create({
        messages: [{ role: 'user', content: pertanyaan }],
        temperature: 0.2,
      });
      return balasan.choices[0]?.message.content || '';
    },
  };
}
```

---

### Checklist Implementasi
- [ ] Deteksi ketersediaan WebGPU (`'gpu' in navigator`) sebelum memuat model.
- [ ] Tampilkan indikator progres unduhan bobot model saat pertama kali diakses.
- [ ] Simpan bobot model di Cache API atau IndexedDB agar kunjungan berikutnya instan tanpa unduh ulang.
- [ ] Siapkan jalur fallback ke API cloud jika memori klien tidak mencukupi.

## Integrasi Orkestrasi
- Terintegrasi dengan: `llm-finops-router`, `senior-frontend`, `vector-db-rag-expert`, `compliance-gdpr-privacy-expert`.