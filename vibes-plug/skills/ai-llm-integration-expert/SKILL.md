---
name: ai-llm-integration-expert
description: "Expert guide for integrating Large Language Models (LLMs), Model Context Protocol (MCP v1.x), hybrid reasoning models, RAG architecture, vector databases, and AI agents / Panduan ahli untuk integrasi LLM, Model Context Protocol (MCP), model hybrid reasoning, arsitektur RAG, vector database, dan agen AI."
author: "Roedy Rustam"
version: "4.3.0"
---

# AI & LLM Integration Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production-grade guidelines for integrating AI, Model Context Protocol (MCP), hybrid reasoning models, and Large Language Models (LLMs) into modern software architectures. Covers hybrid reasoning token streaming, Streamable HTTP MCP transports, agentic memory architectures, native context caching, RAG pipelines, and multi-model orchestration.

### Trigger Conditions
- Integrating frontier reasoning models: Google Gemini 4 Pro / Gemini 4 Flash / Project Astra, Anthropic Claude 5.1 (Fable/Mythos) / Claude 5 Sonnet, OpenAI GPT-5.6 / GPT-5 / o3 / o3-mini / GPT-4.5, DeepSeek-R1 / DeepSeek-Pro / V3, or open-source weights (Llama 4, Qwen 2.5/3 Coder).
- Implementing Model Context Protocol (MCP) server or client integrations with Streamable HTTP transport or MCP Sampling.
- Building AI chatbots, copilots, or autonomous AI agent workflows (LangGraph, OpenAI Agents SDK, Google ADK, Mastra.ai, Vercel AI SDK 5.x/6.x).
- Managing streaming reasoning tokens (`<think>` chunks) separately from final output in user interfaces.
- Implementing hybrid RAG with vector databases (Supabase pgvector HNSW, Qdrant, Pinecone) and cross-encoder rerankers.
- Building agentic memory systems (short-term, long-term semantic, episodic) using Mem0 or vector stores.
- Implementing cost optimization with provider-native Context Caching (Gemini `cachedContent`, Anthropic ephemeral prompt cache, OpenAI prefix cache).

### Model Capability Matrix (2026 Frontier Edition)

| Provider | Model | Context | Reasoning Type | Primary Strength |
|---|---|---|---|---|
| Google | Gemini 4 Pro | 2M+ | Deep Thinking & Long-Context Synthesis | 2M+ context, whole-repo reasoning, multimodal live, native caching |
| Google | Gemini 4 Flash / Astra | 1M–2M | Flash Thinking (Dynamic Budget) | Ultra-low latency (<100ms TTFT), subagent swarms, spatial audio/video |
| Anthropic | Claude 5.1 (Fable / Mythos) | 500K | Terminal-Bench 4.0 & EFS Guardrails | SOTA agentic coding, 45% cheaper cache reads, customer VPC privacy |
| Anthropic | Claude 5 / 4.5 Sonnet | 200K | Hybrid Extended Thinking | Complex refactoring, Computer Use (CUA), UI/UX spatial synthesis |
| OpenAI | GPT-5.6 / GPT-5 | 500K | Process Reward Models (PRM) & Native Multimodal | Native tool-use, multi-step planning, automated verification |
| OpenAI | o3 / o3-mini | 200K | Native Test-Time Reasoning (`reasoning_effort`) | Competitive coding, formal invariant logic, mathematical proofs |
| OpenAI | GPT-4.5 | 128K | High-Fidelity Instruction & Direct Tooling | Ultra-crisp structured output, low-latency agent orchestration |
| DeepSeek | DeepSeek-R1 / Pro | 128K | Open Reasoning (Distill & MoE) | SOTA open-weights reasoning, math, algorithms, code refactoring |
| DeepSeek | DeepSeek-V3 | 128K | General Multimodal / Text | High throughput, extremely cost-efficient coding loops |
| Qwen | Qwen 2.5 / 3 Coder | 128K | Open Source Code Specialist | Self-hosted coding agent, local copilot integration |

### Core Architecture Guidelines

#### 1. Hybrid Reasoning & Streaming Token Handling
Modern frontier models emit internal thinking/reasoning tokens during test-time compute:
- **Thinking Token Separation**: Separate internal `<think>` or reasoning chunks from conversational output. Stream reasoning into collapsible UI accordion blocks while presenting clean output to the user.
- **Vercel AI SDK 5.x/6.x Integration**:
  ```typescript
  import { streamText } from 'ai';
  import { anthropic } from '@ai-sdk/anthropic';

  const result = streamText({
    model: anthropic('claude-3-7-sonnet-20250219'),
    providerOptions: {
      anthropic: {
        thinking: { type: 'enabled', budgetTokens: 4096 },
      },
    },
    prompt: 'Refactor this distributed consensus engine...',
  });

  // Access reasoning stream alongside main text
  for await (const part of result.fullStream) {
    if (part.type === 'reasoning') {
      process.stdout.write(`[Thinking]: ${part.textDelta}`);
    } else if (part.type === 'text-delta') {
      process.stdout.write(part.textDelta);
    }
  }
  ```
- **Thinking Token Overflow Handling**: If `max_tokens` cuts off reasoning before output generation (e.g., `<think>` block doesn't close), detect missing closing tags and dynamically increase budget/retry or append a forceful closing prompt block.
- **Multi-Provider Thinking Configuration**: Use Anthropic `thinking` parameter (`budgetTokens`), Google `thinkingConfig` (set to `true` with budget logic), and OpenAI reasoning tokens (via `reasoning_effort: "high"`).

#### 2. Model Context Protocol (MCP) — Streamable HTTP & Sampling
Standardize all agent-tool and agent-host communications using MCP specifications:
- **Streamable HTTP Transport**: Modern cloud deployments use Streamable HTTP (bidirectional JSON-RPC streaming over HTTP POST/SSE hybrid) instead of fragile stdio connections.
- **MCP Sampling**: Allow MCP servers to request LLM completions back from the host client, enabling nested agentic tools without distributing API keys to tool servers.
- **Authorization & Security**: Enforce OAuth 2.1 scoped bearer tokens on remote MCP endpoints. Validate all incoming tool inputs using strict Zod schemas.

#### 3. Agentic Memory Architecture
Production AI agents require multi-layered memory:
- **In-Context Working Memory**: Pass recent turn messages within the prompt window.
- **Long-Term Semantic Memory**: Embed user preferences and facts using pgvector (HNSW index) or Qdrant; perform cosine similarity searches.
- **Episodic Memory (Mem0 / Letta (formerly MemGPT))**: Automatically synthesize session checkpoints and index past user decisions for human-like recall.
- **Knowledge Graph Memory**: Maintain structured entity-relationship triples (using Graph DB or relational junction tables) for multi-hop relationship retrieval.

#### 4. Advanced RAG & Late Chunking Pipeline
Build high-precision RAG pipelines:
1. **Document Ingestion**: Chunk semantically (500–1000 tokens) with 10% overlap, or apply *Late Chunking* (chunking after full document contextual embedding).
2. **Embeddings**: Utilize `text-embedding-3-large`, `gemini-embedding-004`, or local `bge-large-en-v1.5`.
3. **Hybrid Search**: Combine dense vector cosine similarity with sparse BM25 / PostgreSQL `tsvector` queries.
4. **Cross-Encoder Reranking**: Reorder top-K candidates using Cohere Rerank 3 or FlashRank before feeding into the prompt.
5. **Context Window vs RAG Decision**: If document sets fit comfortably under 200k tokens and are queried repeatedly, prefer **Native Context Caching** over RAG chunking to eliminate retrieval boundary errors.

#### 5. Continuous Multimodal Streaming (Astra Paradigm)
- **Real-Time Bidirectional Streaming**: Use WebSocket or WebRTC to stream audio and video frames continuously.
- **Gemini Multimodal Live API**: Implement bidirectional audio streams utilizing `BidiGenerateContent` with `setup`, `clientContent`, and `serverContent` events.
- **OpenAI Realtime API**: Connect to `wss://api.openai.com/v1/realtime`, manage session configuration, and process audio delta events.
- **Low Latency Target**: Optimize network and processing paths to maintain sub-200ms response latency.
- **Live Perception Loop Architecture**: Continuously ingest frames, perform reasoning, execute actions, and loop back.
  ```typescript
  // Basic Gemini Multimodal Live streaming setup
  const ws = new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent');
  ws.onopen = () => {
    ws.send(JSON.stringify({ setup: { model: 'models/gemini-2.0-flash-exp' } }));
  };
  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.serverContent) {
      console.log('Received audio/text delta:', response.serverContent);
    }
  };
  ```

#### 6. Computer-Using Agents (CUA)
- **CUA Architectural Pattern**: Screen capture → Vision model analysis → Action execution (mouse/keyboard) → Verification loop.
- **GUI Automation (OpenAI Operator style)**: Use vision-language models to drive complete OS or browser sessions autonomously.
- **Screen Grounding**: Output exact coordinates (`click at x,y`) based on visual element detection instead of DOM parsing.
- **Multi-Hour Execution**: Ensure robust checkpoint and resume states for tasks spanning hours.
- **Safety Guardrails**: Implement confirmation gates for destructive actions, run in sandboxed execution environments, and build rollback capabilities.
  ```typescript
  // CUA action loop with Playwright + Vision model
  const screenshot = await page.screenshot();
  const action = await getVisionModelAction(screenshot); // Returns { action: 'click', x: 100, y: 200 }
  if (action.action === 'click') {
    await page.mouse.click(action.x, action.y);
  }
  ```

#### 7. Episodic & Spatio-Temporal Memory
- **Memory Hierarchy**: Working memory (context window) → Semantic memory (vector DB) → Episodic memory (temporal event store) → Knowledge graph memory.
- **Spatio-Temporal Awareness**: Track object locations across video frames and sequence temporal events accurately.
- **Persistent Episodic Memory**: Integrate with Letta (formerly MemGPT) to simulate infinite context through paging episodic records.
- **Mem0 Integration**: Automatically extract memory snippets and retrieve relevant past context based on user queries.
- **Memory Consolidation**: Periodically compress short-term observations into long-term summary memories.
  ```typescript
  // Episodic memory storage using Mem0
  import { Mem0 } from 'mem0';
  const mem0 = new Mem0({ apiKey: 'YOUR_API_KEY' });
  await mem0.add("User prefers dark mode and uses VSCode.", { user_id: "u123" });
  const context = await mem0.search("IDE preferences", { user_id: "u123" });
  ```

#### 8. Narrative Simulation & Character AI (Fable Paradigm)
- **Multi-Agent Narrative Simulation**: Build architectures inspired by Fable Studio's Showrunner/SHOW-1 for emergent storylines.
- **Character Personality Encoding**: Encode Big Five personality traits and emotional valence vectors into the system prompt.
- **State Management**: Persist character states across sessions to maintain long-term memory and relationship development.
- **World-State Consistency**: Enforce consistency using a shared state graph that all agents read and write to.
- **Episodic Generation**: Utilize an autonomous pipeline to generate coherent narrative episodes.
- **Dialogue Coherence**: Constrain inter-agent dialogue to align with narrative constraints and personality logic.
  ```typescript
  // Character agent with personality state
  const characterState = {
    name: 'Elara',
    traits: { openness: 0.8, conscientiousness: 0.9, extraversion: 0.3, agreeableness: 0.7, neuroticism: 0.2 },
    mood: 'contemplative'
  };
  const prompt = `You are ${characterState.name}. Traits: ${JSON.stringify(characterState.traits)}. Current mood: ${characterState.mood}. Respond to the user.`;
  ```

#### 9. FinOps, Context Caching & Dynamic Model Routing
- **Native Context Caching**: Store static system prompts or large codebases in cache (>32k tokens) to reduce costs by up to 90% (Anthropic ephemeral cache, OpenAI prefix cache, Gemini `cachedContent`).
- **Dynamic Model Router**: Route queries based on complexity scoring (prompt length, required schema, reasoning requirements):
  ```typescript
  export function selectOptimalModel(promptLength: number, taskType: 'classification' | 'reasoning' | 'summary') {
    if (taskType === 'classification' || promptLength < 500) {
      return 'gemini-3.8-flash'; // High speed, minimal cost
    }
    return 'gemini-3.1-pro'; // Deep reasoning
  }
  ```
- **Semantic Caching**: Hash query vector embeddings into Redis / vector DB to return cached completions for semantically identical questions before calling LLM APIs.
- **Tenant Token Quotas**: Implement per-tenant token budgeting and alert thresholds to prevent cost overruns.

#### 10. Structured Output & Guardrails
- Utilize native Structured Outputs (`response_format: { type: "json_schema" }`) guaranteed by model token-level grammar masks.
- Use Zod schemas to define tool parameters and final structured entities.
- Implement rate limiting, circuit breakers, and semantic caching (Redis / Upstash vector cache) to prevent runaway recursive tool loops.

## Orchestration & Integration
- **`mcp-server-architect`**: Delegate custom MCP server implementation, client consumption, schema definitions, and transport adapters.
- **`multi-agent-orchestration`**: Delegate complex multi-agent state graphs, swarm workflows, and supervisor patterns.
- **`gemini-agent-booster`**: Delegate Gemini 3.x long-context optimization, Multimodal Live API, and thinking budget controls.
- **`ai-prompt-engineering-expert`**: Delegate advanced prompt design, few-shot calibration, automated Promptfoo evals, and system prompt testing.
- **`vector-db-rag-expert`**: Delegate pgvector HNSW indexing and hybrid retrieval fine-tuning.
- **`zero-to-prod-orchestrator`**: Executes this skill during Phase 4 architecture and implementation.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan tingkat produksi untuk mengintegrasikan AI, Model Context Protocol (MCP), model hybrid reasoning, dan Large Language Models (LLM) ke dalam arsitektur perangkat lunak modern. Mencakup penanganan streaming token penalaran, transport MCP Streamable HTTP, arsitektur memori agentik, context caching native, pipeline RAG, dan orkestrasi multi-model.

### Kondisi Pemicu
- Mengintegrasikan model frontier reasoning: Google Gemini 4 Pro / Gemini 4 Flash / Project Astra, Anthropic Claude 5.1 (Fable/Mythos) / Claude 5 Sonnet, OpenAI GPT-5.6 / GPT-5 / o3 / o3-mini / GPT-4.5, DeepSeek-R1 / DeepSeek-Pro / V3, atau bobot open-source (Llama 4, Qwen 2.5/3 Coder).
- Mengimplementasikan server atau klien Model Context Protocol (MCP) dengan transport Streamable HTTP atau MCP Sampling.
- Membangun chatbot AI, copilot, atau workflow agen otonom (LangGraph, OpenAI Agents SDK, Google ADK, Mastra.ai, Vercel AI SDK 5.x/6.x).
- Mengelola streaming token penalaran (`<think>`) secara terpisah dari output akhir pada tampilan antarmuka pengguna.
- Mengimplementasikan RAG hibrida dengan database vektor (Supabase pgvector HNSW, Qdrant, Pinecone) dan reranker cross-encoder.
- Membangun sistem memori agentik (jangka pendek, semantik jangka panjang, episodik) menggunakan Mem0 atau vector store.
- Menerapkan optimasi biaya dengan Context Caching native provider (Gemini `cachedContent`, Anthropic ephemeral prompt cache, OpenAI prefix cache).

### Matriks Kapabilitas Model (Edisi Frontier 2026)

| Provider | Model | Konteks | Tipe Penalaran | Keunggulan Utama |
|---|---|---|---|---|
| Google | Gemini 4 Pro | 2M+ | Deep Thinking & Sintesis Konteks Panjang | Konteks 2M+, penalaran seluruh repo, multimodal live, native caching |
| Google | Gemini 4 Flash / Astra | 1M–2M | Flash Thinking (Budget Dinamis) | Latensi ultra-rendah (<100ms TTFT), swarm subagent, audio/video spasial |
| Anthropic | Claude 5.1 (Fable / Mythos) | 500K | Terminal-Bench 4.0 & Guardrail EFS | Coding agentic SOTA, cache read 45% lebih hemat, privasi VPC enterprise |
| Anthropic | Claude 5 / 4.5 Sonnet | 200K | Hybrid Extended Thinking | Refactoring kompleks, Computer Use (CUA), sintesis spasial UI/UX |
| OpenAI | GPT-5.6 / GPT-5 | 500K | Process Reward Models (PRM) & Multimodal Native | Tool use native, perencanaan multi-langkah, verifikasi otomatis |
| OpenAI | o3 / o3-mini | 200K | Test-Time Reasoning Native (`reasoning_effort`) | Competitive coding, logika invarian formal, pembuktian matematis |
| OpenAI | GPT-4.5 | 128K | Instruksi Presisi Tinggi & Tooling Cepat | Output terstruktur sangat presisi, orkestrasi agen latensi rendah |
| DeepSeek | DeepSeek-R1 / Pro | 128K | Open Reasoning (Distill & MoE) | Penalaran open weights terdepan, matematika, algoritma, refactoring kode |
| DeepSeek | DeepSeek-V3 | 128K | Teks & Multimodal Umum | Throughput tinggi, sangat hemat biaya untuk coding loops |
| Qwen | Qwen 2.5 / 3 Coder | 128K | Spesialis Kode Open Source | Agen coding mandiri / self-hosted, copilot lokal |

### Panduan Arsitektur Inti

#### 1. Hybrid Reasoning & Penanganan Token Streaming
Model frontier modern menghasilkan token pemikiran (*thinking tokens*) selama proses penalaran:
- **Pemisahan Token Pemikiran**: Pisahkan blok `<think>` dari output teks akhir. Alirkan proses pemikiran ke dalam accordion UI yang dapat dibuka/tutup, sementara output utama disajikan dengan bersih kepada user.
- **Integrasi Vercel AI SDK 5.x/6.x**: Gunakan event listener `reasoning` pada stream untuk menangkap proses pemikiran model secara terpisah dari `text-delta`.
- **Penanganan Overflow Token Pemikiran**: Jika `max_tokens` memotong proses penalaran sebelum teks output dimulai (blok `<think>` belum tertutup), deteksi tag yang hilang dan secara dinamis tingkatkan anggaran token atau tambahkan blok prompt penutup paksa.
- **Konfigurasi Thinking Multi-Provider**: Gunakan parameter `thinking` Anthropic (`budgetTokens`), `thinkingConfig` Google (diaktifkan dengan logika anggaran), dan reasoning token OpenAI (via `reasoning_effort: "high"`).

#### 2. Model Context Protocol (MCP) — Streamable HTTP & Sampling
Standarisasi seluruh komunikasi agen-ke-tool dan agen-ke-host menggunakan spesifikasi MCP:
- **Streamable HTTP Transport**: Standar cloud modern yang mendukung streaming dua arah JSON-RPC via HTTP POST/SSE hybrid tanpa ketergantungan koneksi stdio lokal.
- **MCP Sampling**: Memberikan izin kepada server MCP untuk meminta inferensi LLM kembali ke klien host, memungkinkan alat agentik modular tanpa membagikan API key sensitif.
- **Keamanan & Otorisasi**: Wajibkan bearer token berbasis OAuth 2.1 pada endpoint MCP publik dan validasi skema input dengan Zod.

#### 3. Arsitektur Memori Agentik
- **Memori Kerja In-Context**: Teruskan histori interaksi terbaru di jendela konteks.
- **Memori Semantik Jangka Panjang**: Simpan fakta dan preferensi pengguna di pgvector (indeks HNSW) atau Qdrant dengan pencarian kesamaan kosinus.
- **Memori Episodik (Mem0 / Letta (formerly MemGPT))**: Sintesiskan ringkasan sesi secara berkala agar agen memiliki daya ingat historis jangka panjang.
- **Memori Graph Pengetahuan**: Hubungkan entitas relasional dalam basis data graf untuk kueri multi-langkah (*multi-hop reasoning*).

#### 4. Pipeline RAG Lanjutan & Late Chunking
1. **Ingesti Dokumen**: Bagi dokumen secara semantik (500–1000 token, 10% overlap) atau gunakan metode *Late Chunking*.
2. **Embedding**: Gunakan `text-embedding-3-large` atau `gemini-embedding-004`.
3. **Pencarian Hibrida**: Kombinasikan dense vector cosine similarity dengan sparse keyword BM25 / PostgreSQL full-text search.
4. **Cross-Encoder Reranking**: Susun ulang kandidat terbaik menggunakan Cohere Rerank 3 atau FlashRank sebelum diteruskan ke system prompt.
5. **Keputusan Cache vs RAG**: Jika dokumen stabil dan berada di bawah 200k token, utamakan **Context Caching Native** daripada RAG chunking untuk menghindari hilangnya konteks di perbatasan potongan teks.

#### 5. Streaming Multimodal Berkelanjutan (Paradigma Astra)
- **Streaming Real-Time Dua Arah**: Gunakan WebSocket atau WebRTC untuk melakukan streaming audio dan frame video secara berkelanjutan.
- **Gemini Multimodal Live API**: Implementasikan stream audio dua arah memanfaatkan `BidiGenerateContent` dengan event `setup`, `clientContent`, dan `serverContent`.
- **OpenAI Realtime API**: Hubungkan ke `wss://api.openai.com/v1/realtime`, kelola konfigurasi sesi, dan proses event delta audio.
- **Target Latensi Rendah**: Optimasi jaringan dan jalur pemrosesan untuk mempertahankan latensi respons di bawah 200ms.
- **Arsitektur Loop Persepsi Langsung (Live Perception Loop)**: Ingesti frame terus-menerus, lakukan penalaran, eksekusi aksi, dan loop kembali.
  ```typescript
  // Setup dasar streaming Gemini Multimodal Live
  const ws = new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent');
  ws.onopen = () => {
    ws.send(JSON.stringify({ setup: { model: 'models/gemini-2.0-flash-exp' } }));
  };
  ws.onmessage = (event) => {
    const response = JSON.parse(event.data);
    if (response.serverContent) {
      console.log('Menerima delta teks/audio:', response.serverContent);
    }
  };
  ```

#### 6. Agen Pengguna Komputer (Computer-Using Agents / CUA)
- **Pola Arsitektural CUA**: Tangkapan layar (Screen capture) → Analisis model vision → Eksekusi aksi (mouse/keyboard) → Loop verifikasi.
- **Otomatisasi GUI (Gaya OpenAI Operator)**: Gunakan model vision-language untuk menggerakkan seluruh sesi OS atau browser secara otonom.
- **Screen Grounding**: Hasilkan koordinat pasti (`click at x,y`) berdasarkan deteksi elemen visual daripada parsing DOM.
- **Eksekusi Multi-Jam**: Pastikan adanya status checkpoint dan resume yang kuat untuk tugas yang berlangsung berjam-jam.
- **Guardrails Keselamatan**: Implementasikan gerbang konfirmasi untuk tindakan destruktif, jalankan di lingkungan sandbox, dan bangun kemampuan rollback.
  ```typescript
  // Loop aksi CUA dengan Playwright + Vision model
  const screenshot = await page.screenshot();
  const action = await getVisionModelAction(screenshot); // Mengembalikan { action: 'click', x: 100, y: 200 }
  if (action.action === 'click') {
    await page.mouse.click(action.x, action.y);
  }
  ```

#### 7. Memori Episodik & Spasio-Temporal
- **Hierarki Memori**: Memori kerja (context window) → Memori semantik (vector DB) → Memori episodik (penyimpanan event temporal) → Memori knowledge graph.
- **Kesadaran Spasio-Temporal (Spatio-Temporal Awareness)**: Lacak lokasi objek di seluruh frame video dan urutkan event temporal dengan akurat.
- **Memori Episodik Persisten**: Integrasikan dengan Letta (sebelumnya MemGPT) untuk mensimulasikan konteks tak terbatas melalui paging catatan episodik.
- **Integrasi Mem0**: Ekstrak cuplikan memori secara otomatis dan ambil konteks masa lalu yang relevan berdasarkan kueri pengguna.
- **Konsolidasi Memori**: Kompres observasi jangka pendek secara berkala menjadi memori ringkasan jangka panjang.
  ```typescript
  // Penyimpanan memori episodik menggunakan Mem0
  import { Mem0 } from 'mem0';
  const mem0 = new Mem0({ apiKey: 'YOUR_API_KEY' });
  await mem0.add("Pengguna lebih suka dark mode dan menggunakan VSCode.", { user_id: "u123" });
  const context = await mem0.search("Preferensi IDE", { user_id: "u123" });
  ```

#### 8. Simulasi Naratif & Character AI (Paradigma Fable)
- **Simulasi Naratif Multi-Agen**: Bangun arsitektur yang terinspirasi dari Showrunner/SHOW-1 karya Fable Studio untuk alur cerita emergen.
- **Enkode Kepribadian Karakter**: Enkode sifat kepribadian Big Five dan vektor valensi emosional ke dalam system prompt.
- **Manajemen State**: Pertahankan state karakter di seluruh sesi untuk mempertahankan memori jangka panjang dan pengembangan hubungan.
- **Konsistensi World-State**: Tegakkan konsistensi menggunakan shared state graph yang dibaca dan ditulis oleh semua agen.
- **Generasi Episodik**: Gunakan pipeline otonom untuk menghasilkan episode naratif yang koheren.
- **Koherensi Dialog**: Batasi dialog antar-agen agar selaras dengan batasan naratif dan logika kepribadian.
  ```typescript
  // Agen karakter dengan state kepribadian
  const characterState = {
    name: 'Elara',
    traits: { openness: 0.8, conscientiousness: 0.9, extraversion: 0.3, agreeableness: 0.7, neuroticism: 0.2 },
    mood: 'kontemplatif'
  };
  const prompt = `Anda adalah ${characterState.name}. Sifat: ${JSON.stringify(characterState.traits)}. Suasana hati saat ini: ${characterState.mood}. Tanggapi pengguna.`;
  ```

#### 9. FinOps, Context Caching & Routing Model Dinamis
- **Context Caching Native**: Simpan prompt sistem atau repositori besar di cache (>32k token) via API `cachedContent` Gemini, ephemeral cache Anthropic, atau prefix cache OpenAI untuk menghemat hingga 90% biaya.
- **Router Model Dinamis**: Arahkan kueri secara cerdas (tugas klasifikasi/parsing ke Flash, penalaran mendalam ke Pro/Opus).
- **Semantic Caching**: Simpan embedding kueri di Redis / Vector DB untuk menyajikan jawaban cache pada pertanyaan identik tanpa memanggil ulang API LLM.
- **Kuota & Anggaran Token**: Terapkan batas konsumsi token harian per pengguna/penyewa guna mencegah pembengkakan biaya.

#### 10. Output Terstruktur & Guardrails
- Manfaatkan mode Structured Outputs native model dengan skema Zod untuk menjamin integritas JSON.
- Terapkan rate limiting, circuit breaker, dan semantic caching (Redis / Upstash) untuk mencegah pemanggilan tool secara rekursif tak berujung.

## Integrasi Orkestrasi
- **`mcp-server-architect`**: Delegasikan pembuatan server MCP kustom, konsumsi klien, definisi skema, dan transport adapter.
- **`multi-agent-orchestration`**: Delegasikan alur kerja graph multi-agen, topologi swarm, dan pattern supervisor.
- **`gemini-agent-booster`**: Delegasikan optimasi long-context Gemini 3.x, Multimodal Live API, dan kontrol thinking budget.
- **`ai-prompt-engineering-expert`**: Delegasikan desain prompt lanjutan, kalibrasi few-shot, evaluasi Promptfoo, dan pengujian prompt.
- **`vector-db-rag-expert`**: Delegasikan tuning indeks HNSW pgvector dan pencarian hibrida.
- **`zero-to-prod-orchestrator`**: Mengeksekusi skill ini pada Fase 4 perancangan arsitektur dan implementasi.