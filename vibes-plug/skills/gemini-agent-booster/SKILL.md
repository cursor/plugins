---
name: gemini-agent-booster
description: "Master optimization protocol for Gemini Agent (Antigravity) to unlock native 2M+ to 10M+ long-context reasoning, Gemini 4 Pro & Gemini 4 Flash dynamic thinking budget control, native context caching, Multimodal Live API, and high-speed problem solving / Protokol optimasi utama untuk Gemini Agent (Antigravity) untuk mengaktifkan pemikiran long-context 2M+ hingga 10M+, kontrol thinking budget dinamis Gemini 4 Pro & Gemini 4 Flash, context caching native, Multimodal Live API, dan pemecahan masalah kecepatan tinggi."
author: "Roedy Rustam"
version: "4.3.0"
---

# Gemini Agent Booster (2026 Edition — Gemini 4 Pro & 4.x Ecosystem)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, `ai-llm-integration-expert`, `frontier-ai-models-expert`, `test-time-compute-optimizer`, and `session-memory-manager` to ensure cohesive execution across all phases.

### Description
Master optimization protocol for the Gemini Agent (Antigravity) to leverage native Gemini 4.x frontier capabilities — centered on **Gemini 4 Pro** (flagship deep reasoning), **Gemini 4 Flash** (ultra-high speed agentic loops), and **Project Astra** (real-time spatial multimodal streaming). Unlocks 2M+ to 10M+ monolithic context ingestion, dynamic System-2 test-time thinking budget control (`thinkingConfig.thinkingBudget`), native context caching (`cachedContent`, 75–90% cost reduction), Multimodal Live API integration, visual UI auditing, and massively parallel tool execution.

### Trigger Conditions
- Deploying or querying Google's flagship reasoning model: **Gemini 4 Pro**.
- Analyzing massive codebases, full log histories, or monolithic documents requiring 1M–2M+ token context without chunk loss.
- Managing test-time reasoning compute budgets with Gemini 4 Thinking Mode (`thinkingConfig`).
- Implementing cost-saving architectures with native Gemini Context Caching (`cachedContent`).
- Performing real-time bidirectional multimodal audio/video streaming or visual UI audits.
- Running deep research tasks requiring Google Search Grounding with dynamic citation attribution.
- Delegating complex multi-step tasks to parallel agent swarms or browser subagents.

### Gemini 4.x & Frontier Model Capability Matrix (2026)

| Capability | Gemini 4 Pro (Flagship) | Gemini 4 Flash / Project Astra | Gemini 3.8 Flash (Agile Reasoning) | Gemini 3.1 Pro (Fallback) |
|---|---|---|---|---|
| Context Window | 2,097,152+ tokens (up to 10M+ Ring Attention) | 1,048,576+ tokens (1M+) | 1,000,000 tokens | 2,000,000 tokens |
| Thinking / Reasoning | System-2 Deep Thinking (Configurable up to 64K Budget) | Flash Thinking (Configurable Budget) | Agile Medium Thinking | Extended Reasoning |
| Native Context Caching | Native (`cachedContent`, 75–90% discount) | Native (`cachedContent`, 75% discount) | Native (`cachedContent`, 75% discount) | Native (`cachedContent`) |
| Multimodal | Native Any-to-Any Audio/Video/Text + Screen Grounding | Multimodal Live API (<100ms latency) | Multimodal Live Audio/Video | Native Multimodal |
| Code Generation & Tool Calling | SOTA Architectural Synthesis, Zero-Loss AST, Parallel MoE Tools | Ultra-fast iteration & subagent swarms | High-speed pair programming & CLI coding | Complex reasoning |
| Search Grounding | Google Search Grounding with verified attribution | Google Search Grounding | Google Search Grounding | Google Search Grounding |
| TTFT (Time to First Token) | Ultra-fast via Prefix KV-Cache Pinning | Sub-80ms ultra-low latency | Ultra-low latency (<100ms) | Balanced |
| Primary Role | Master System Architect & High-Risk Auditor | High-Throughput Subagent Workers | Daily Driver Interactive Pair Programming | Legacy Baseline |

### 1. Thinking Budget Optimization for Gemini 4 Pro Tasks
For complex architectural decisions, formal security audits, or debugging distributed race conditions, control the reasoning depth via `thinkingConfig`:
- **Dynamic Thinking Budget Allocation**: Allocate test-time compute dynamically based on task entropy:
  - **Quick Fixes (2k)**: Linting, boilerplate, typo fixes.
  - **Standard Dev (8k)**: Feature implementation, UI token alignment.
  - **Architecture Design (16k–32k)**: Designing distributed schemas, refactoring core engines, formal state machines.
  - **Extreme Critical Tasks (64k)**: Post-quantum cryptographic migration, formal invariant proofs, zero-day CVE audits.
- **Reasoning Token Separation**: Ensure internal thinking tokens (`<thought>` / reasoning parts) are isolated from client-facing output streams so that final responses remain crisp, clean, and token-efficient.
- **TypeScript Example with `@google/genai`**:
  ```typescript
  import { GoogleGenAI } from '@google/genai';

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-4-pro',
    contents: [{ role: 'user', parts: [{ text: 'Formally verify lock-free queue concurrency invariant' }] }],
    config: {
      thinkingConfig: {
        thinkingBudget: 32768, // Test-time compute scaling up to 64k
      },
    },
  });
  ```

### 2. Native Context Caching (`cachedContent`)
Reduce token costs by up to 75–90% and drastically cut latency on large repositories:
- **Threshold**: Cache prompts, repository snapshots, or API schemas larger than 32,768 tokens.
- **TTL Management**: Set appropriate time-to-live (TTL, e.g., 1–2 hours for active dev sessions, 24 hours for stable documentation).
- **Structure**:
  ```typescript
  // Native Gemini 4 Pro Context Caching Example
  import { GoogleGenAI } from '@google/genai';
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  
  const cache = await ai.caches.create({
    model: 'gemini-4-pro',
    contents: [{ role: 'user', parts: [{ text: fullCodebaseDump }] }],
    ttl: '3600s',
  });
  
  const response = await ai.models.generateContent({
    model: 'gemini-4-pro',
    contents: [{ role: 'user', parts: [{ text: 'Locate memory leak in worker thread' }] }],
    cachedContent: cache.name,
  });
  ```

### 2.5 Automated Budget & Cache Advisor CLI (`gemini-budget-advisor.js`)
Use the included zero-dependency CLI tool to evaluate repository token volume, calculate task entropy, and generate dynamic `thinkingBudget` and `cachedContent` recommendations:
```bash
# Scan current repository with specific task description
node skills/gemini-agent-booster/scripts/gemini-budget-advisor.js --task "Refactor multi-tenant schema and RLS policies"

# Scan with active git diff and output JSON for automated agent pipelines
node skills/gemini-agent-booster/scripts/gemini-budget-advisor.js --diff --json
```

### 3. Monolithic Context Loading (2M+ to 10M+ Tokens)
When inspecting massive codebases with Gemini 4 Pro:
1. **Pass Full File Trees**: Use `list_dir` to obtain the complete project structure, then supply full source files into context.
2. **Whole-File Ingestion**: With 2M+ context, avoid grep fragmentation; inspect complete classes and dependency trees in one shot.
3. **Cross-Service Traceability**: Analyze upstream microservice contracts, protobufs, and frontend consumers concurrently in the same session.
4. **Massive Server Logs**: Ingest complete production logs (millions of lines) to uncover subtle intermittent race conditions and memory leaks.

### 4. Multimodal Live API & Screen Grounding (Project Astra Paradigm)
Integrate real-time, low-latency multimodal interaction using Astra-paradigm patterns:
- **Bidirectional Streaming**: Stream audio input and receive audio/text responses over WebSockets using Gemini Multimodal Live API with sub-150ms interruption handling for natural conversational turn-taking.
- **Continuous Video Perception**: Process 60fps video streams with spatial grounding.
- **Spatial Memory Protocol**: Track object locations across video frames, maintaining a spatial state map.
- **Screen & UI Grounding**: Capture frames and map GUI interactions using exact screen grounding coordinates.
- **Visual UI Auditing Protocol**:
  1. Capture current running application (delegate to `browser-automation-expert` skill using Playwright/Stagehand).
  2. Audit layout, typography, contrast, and visual hierarchy against HIG and WCAG standards.
  3. Compare visually with target design using `generate_image` or design system guidelines.
  4. Perform targeted micro-edits to CSS/Tailwind tokens until alignment reaches pixel perfection.

### 4.5 Gemini 4 Pro as Narrative Simulation & World State Engine
Leveraging Gemini 4 Pro's massive context window for persistent world-state in simulation environments:
- **Persistent World-State**: Maintain complete environment state within the context window.
- **Character AI Persona Management**: Utilize system instructions to manage personality vectors and emotional states.
- **Multi-turn Narrative Coherence**: Use context caching to cache the world state and only stream new character interactions.
- **Cost Optimization**: Cache world-state/character definitions (75-90% cost reduction), only stream new dialogue/actions.
- **Code Example - Cached World-State**:
  ```typescript
  const worldCache = await ai.caches.create({
    model: 'gemini-4-pro',
    contents: [{ role: 'system', parts: [{ text: fullWorldStateAndPersonas }] }],
    ttl: '3600s',
  });
  const characterResponse = await ai.models.generateContent({
    model: 'gemini-4-pro',
    contents: [{ role: 'user', parts: [{ text: 'Character X walks into the tavern.' }] }],
    cachedContent: worldCache.name,
  });
  ```

### 5. Deep Research & Search Grounding
Gemini 4 Pro's native Search Grounding connects the agent directly to real-time web knowledge:
- Use Grounding for fresh library releases, breaking API deprecations, or zero-day CVE lookups.
- Synthesize findings with verifiable dynamic source citations.

### 6. Massively Parallel Tool Execution (Agentic MoE)
Gemini 4 Pro natively supports concurrent batched function calls:
- Read and edit multiple independent files in a single turn.
- Trigger parallel web searches or subagent workers simultaneously to minimize round-trip latency.
- Scale with `mcp-server-architect` to support batched, high-throughput asynchronous MCP tool calls (10–20 concurrent subagents per inference cycle).

### 7. Gemini 4 Pro Production Architectural Standards
Ensure all code and orchestration flows adhere to the following standards:
- **Monolithic Context Loading (SSM/Ring Attention)**: Move away from highly fragmented RAG pipelines for repositories that fit within the context window. Inject the complete codebase natively to leverage zero-loss cross-file attention.
- **Aggressive Prefix KV-Caching (`kv-cache-prefix-optimizer`)**: Maintain strict deterministic hierarchies in orchestrator prompts (`brainstorming/SKILL.md`). Static prefix structures enable up to 90% TTFT latency reduction via KV cache reuse.
- **Native Any-to-Any Multimodal Tokens**: Utilize `voice-ai-realtime-agent` and `ai-media-generation-expert` to bypass external STT/TTS wrappers and transmit raw audio/visual tokens directly through transformer attention layers.
- **Native System-2 Budgeting**: Replace forced `<thought>` tags with API-level `thinkingBudget` and `reasoning_effort` parameters to maximize test-time compute.
- **Massive Parallel Tool Execution (Agentic MoE)**: Structure subagent pipelines so that `mcp-server-architect` tools can be executed concurrently without serial blocking.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, `ai-llm-integration-expert`, `frontier-ai-models-expert`, `test-time-compute-optimizer`, dan `session-memory-manager` untuk memastikan eksekusi yang kohesif di semua fase.

### Deskripsi
Protokol optimasi utama untuk Gemini Agent (Antigravity) memanfaatkan kapabilitas frontier ekosistem Gemini 4.x — berpusat pada **Gemini 4 Pro** (penalaran mendalam unggulan), **Gemini 4 Flash** (siklus agen ultra-cepat), dan **Project Astra** (streaming multimodal spasial real-time). Mengaktifkan ingesti konteks monolitik 2M+ hingga 10M+, kontrol dynamic thinking budget System-2 (`thinkingConfig.thinkingBudget`), native context caching (`cachedContent`, diskon biaya 75–90%), integrasi Multimodal Live API, audit visual UI, dan eksekusi tool paralel skala masif.

### Kondisi Pemicu
- Menerapkan atau mengirim prompt ke model penalaran unggulan Google: **Gemini 4 Pro**.
- Menganalisis codebase skala besar, histori log lengkap, atau dokumen monolitik yang membutuhkan konteks 1M–2M+ token tanpa kehilangan data chunking.
- Mengatur alokasi reasoning budget dengan Gemini 4 Thinking Mode (`thinkingConfig`).
- Menerapkan strategi pemangkasan biaya melalui native Gemini Context Caching (`cachedContent`).
- Menjalankan interaksi audio/video dua arah secara real-time atau audit visual UI.
- Menjalankan tugas riset mendalam dengan Google Search Grounding dan atribusi sitasi dinamis.
- Mendelegasikan tugas multi-langkah ke swarm agen paralel atau browser subagent.

### Matriks Kapabilitas Gemini 4.x & Model Frontier (2026)

| Kapabilitas | Gemini 4 Pro (Flagship) | Gemini 4 Flash / Project Astra | Gemini 3.8 Flash (Penalaran Gesit) | Gemini 3.1 Pro (Fallback) |
|---|---|---|---|---|
| Context Window | 2.097.152+ token (hingga 10M+ Ring Attention) | 1.048.576+ token (1M+) | 1.000.000 token | 2.000.000 token |
| Pemikiran / Penalaran | System-2 Deep Thinking (Budget hingga 64K) | Flash Thinking (Configurable Budget) | Agile Medium Thinking | Extended Reasoning |
| Native Context Caching | Didukung (`cachedContent`, diskon 75–90%) | Didukung (`cachedContent`, diskon 75%) | Didukung (`cachedContent`, diskon 75%) | Didukung (`cachedContent`) |
| Multimodal | Native Any-to-Any Audio/Video/Teks + Screen Grounding | Multimodal Live API (latensi <100ms) | Multimodal Live Audio/Video | Native Multimodal |
| Generasi Kode & Tool Calling | Sintesis Arsitektur SOTA, Zero-Loss AST, Parallel MoE Tools | Iterasi & subagent ultra-cepat | Pair programming interaktif & coding CLI cepat | Penalaran kompleks |
| Search Grounding | Google Search Grounding dengan atribusi sitasi terverifikasi | Google Search Grounding | Google Search Grounding | Google Search Grounding |
| TTFT (Latensi Token Pertama) | Ultra-cepat via Prefix KV-Cache Pinning | Sub-80ms latensi ultra-rendah | Latensi ultra-rendah (<100ms) | Seimbang |
| Peran Utama | Master Arsitek Sistem & Auditor Risiko Tinggi | Pekerja Subagent Throughput Tinggi | Daily Driver Pair Programming Interaktif | Baseline Warisan |

### 1. Optimasi Thinking Budget untuk Tugas Gemini 4 Pro
Untuk keputusan arsitektur kompleks, audit keamanan formal, atau perbaikan race condition terdistribusi, atur kedalaman penalaran via `thinkingConfig`:
- **Dynamic Thinking Budget Allocation**: Alokasikan test-time compute secara dinamis berdasarkan entropi tugas:
  - **Quick Fixes (2k)**: Perbaikan bug ringan, formatting, dan boilerplate.
  - **Standard Dev (8k)**: Implementasi fitur, penyesuaian token UI.
  - **Architecture Design (16k–32k)**: Mendesain skema terdistribusi, refaktor engine inti, state machine formal.
  - **Critical System Design (64k)**: Migrasi kriptografi pasca-kuantum, pembuktian invarian formal, audit CVE zero-day.
- **Pemisahan Token Penalaran**: Pastikan token pemikiran internal (`<thought>` / reasoning parts) dipisahkan dari aliran output pengguna agar respons akhir tetap ringkas, bersih, dan efisien token.
- **Contoh TypeScript dengan `@google/genai`**:
  ```typescript
  import { GoogleGenAI } from '@google/genai';

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-4-pro',
    contents: [{ role: 'user', parts: [{ text: 'Verifikasi formal invarian konkurensi lock-free queue' }] }],
    config: {
      thinkingConfig: {
        thinkingBudget: 32768, // Skala test-time compute hingga 64k
      },
    },
  });
  ```

### 2. Native Context Caching (`cachedContent`)
Pangkas biaya API sebesar 75–90% serta kurangi latensi respons pada repositori besar:
- **Ambang Batas**: Lakukan cache pada prompt, snapshot kode, atau skema dokumen yang melebihi 32.768 token.
- **Manajemen TTL**: Tetapkan masa aktif cache (misal: 1–2 jam untuk sesi development aktif, 24 jam untuk dokumentasi statis).
- **Contoh Implementasi**:
  ```typescript
  import { GoogleGenAI } from '@google/genai';
  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  
  const cache = await ai.caches.create({
    model: 'gemini-4-pro',
    contents: [{ role: 'user', parts: [{ text: fullCodebaseDump }] }],
    ttl: '3600s',
  });
  
  const response = await ai.models.generateContent({
    model: 'gemini-4-pro',
    contents: [{ role: 'user', parts: [{ text: 'Temukan memory leak pada worker thread' }] }],
    cachedContent: cache.name,
  });
  ```

### 2.5 Utilitas CLI Advisor Budget & Cache Otomatis (`gemini-budget-advisor.js`)
Gunakan utilitas CLI bawaan (zero-dependency) untuk mengestimasi footprint token repositori, mengevaluasi entropi tugas, serta menghasilkan rekomendasi `thinkingBudget` dan `cachedContent` secara otomatis:
```bash
# Analisis repositori saat ini dengan deskripsi tugas spesifik
node skills/gemini-agent-booster/scripts/gemini-budget-advisor.js --task "Refactor multi-tenant schema dan RLS policies"

# Analisis dengan git diff aktif dan keluaran format JSON untuk pipeline agen
node skills/gemini-agent-booster/scripts/gemini-budget-advisor.js --diff --json
```

### 3. Strategi Ingesti Konteks Monolitik (2M+ hingga 10M+ Token)
Saat menganalisis repositori besar dengan Gemini 4 Pro:
1. **Pohon File Penuh**: Gunakan `list_dir` untuk memetakan struktur proyek, lalu masukkan seluruh file terkait ke dalam konteks.
2. **Ingesti File Penuh**: Dengan jendela 2M+ token, hindari fragmentasi grep; periksa seluruh class dan dependency tree secara menyeluruh dalam satu kali pembacaan.
3. **Pelacakan Antar Layanan**: Analisis kontrak upstream microservice, skema database, dan frontend consumer secara bersamaan dalam satu sesi.
4. **Log Produksi Masif**: Masukkan jutaan baris log untuk mengungkap anomali memori dan race condition intermiten.

### 4. Multimodal Live API & Screen Grounding (Paradigma Project Astra)
Integrasikan interaksi multimodal latensi rendah secara langsung menggunakan pola Astra-paradigm:
- **Streaming Dua Arah**: Streaming input suara dan terima respons audio/teks via WebSockets menggunakan Gemini Multimodal Live API dengan sub-150ms interruption handling untuk percakapan alami.
- **Continuous Video Perception**: Proses aliran video 60fps dengan spatial grounding.
- **Spatial Memory Protocol**: Lacak lokasi objek di seluruh frame video, mempertahankan peta status spasial.
- **Screen & UI Grounding**: Tangkap frame layar dan petakan interaksi GUI menggunakan koordinat grounding layar yang presisi.
- **Protokol Audit UI Visual**:
  1. Ambil screenshot aplikasi yang sedang berjalan (delegasikan ke skill `browser-automation-expert` dengan Playwright/Stagehand).
  2. Audit tata letak, tipografi, kontras, dan konsistensi terhadap pedoman HIG dan WCAG.
  3. Bandingkan dengan referensi desain target menggunakan `generate_image` atau pedoman sistem desain.
  4. Lakukan penyesuaian presisi pada token CSS/Tailwind hingga tampilan mencapai pixel-perfect.

### 4.5 Gemini 4 Pro sebagai World State Engine & Simulasi Naratif
Memanfaatkan context window masif Gemini 4 Pro untuk status dunia yang persisten dalam lingkungan simulasi:
- **Persistent World-State**: Pertahankan status lingkungan lengkap dalam context window tanpa kompresi kehilangan data.
- **Character AI Persona Management**: Kelola vektor kepribadian dan status emosional via system instructions.
- **Multi-turn Narrative Coherence**: Gunakan context caching untuk world state dan hanya streaming interaksi karakter baru.
- **Cost Optimization**: Cache world-state/karakter (hemat biaya 75-90%), hanya memproses dialog/aksi baru.
- **Contoh Kode - Cached World-State**:
  ```typescript
  const worldCache = await ai.caches.create({
    model: 'gemini-4-pro',
    contents: [{ role: 'system', parts: [{ text: fullWorldStateAndPersonas }] }],
    ttl: '3600s',
  });
  const characterResponse = await ai.models.generateContent({
    model: 'gemini-4-pro',
    contents: [{ role: 'user', parts: [{ text: 'Karakter X memasuki kedai minuman.' }] }],
    cachedContent: worldCache.name,
  });
  ```

### 5. Penelitian Mendalam & Search Grounding
Search Grounding native Gemini 4 Pro menghubungkan agen langsung ke informasi web terkini:
- Gunakan Grounding untuk rilis pustaka terbaru, breaking change dokumentasi, atau audit kerentanan CVE terbaru.
- Sintesiskan temuan lengkap dengan sitasi sumber yang dapat diverifikasi secara dinamis.

### 6. Eksekusi Tool Paralel Skala Masif (Agentic MoE)
Gemini 4 Pro secara native mendukung pemanggilan banyak function call secara bersamaan dalam satu giliran:
- Baca dan modifikasi beberapa file independen sekaligus.
- Jalankan pencarian web atau spawn subagent pekerja secara simultan guna meminimalkan total round-trip latency.
- Integrasikan dengan `mcp-server-architect` untuk mendukung pemanggilan banyak tool MCP sekaligus (*batched asynchronous tool calls*) hingga 10–20 subagent per siklus inferensi.

### 7. Standar Arsitektur Produksi Gemini 4 Pro
Pastikan seluruh kode dan alur orkestrasi mematuhi standar berikut:
- **Monolithic Context Loading (SSM/Ring Attention)**: Tinggalkan RAG yang terfragmentasi untuk codebase yang muat dalam context window. Masukkan seluruh file ke dalam context window untuk memanfaatkan pemahaman atensi lintas-file tanpa kehilangan informasi (zero-loss).
- **Prefix KV-Caching Agresif (`kv-cache-prefix-optimizer`)**: Pastikan hirarki prompt pada orkestrator (`brainstorming/SKILL.md`) sangat deterministik. Struktur *prefix* statis dapat memangkas latensi TTFT hingga 90% dengan meminjam *KV Cache* dari iterasi sebelumnya.
- **Native Any-to-Any Multimodal Tokens**: Kembangkan `voice-ai-realtime-agent` dan `ai-media-generation-expert` agar menghindari wrapper STT/TTS eksternal, dan langsung mengirim/menerima raw token audio/visual melalui arsitektur transformer asli.
- **Native System-2 Budgeting**: Ganti kebiasaan menggunakan tag `<thought>` paksaan di prompt dengan mengelola parameter API level komputasi seperti `thinkingBudget` dan `reasoning_effort` untuk memanfaatkan komputasi pada saat tes (*test-time compute*).
- **Eksekusi Tool Paralel Skala Masif (Agentic MoE)**: Rancang alur kerja subagent agar tool `mcp-server-architect` dieksekusi secara konkuren tanpa pemblokiran serial.
