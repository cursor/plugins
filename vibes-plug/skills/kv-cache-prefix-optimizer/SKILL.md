---
name: kv-cache-prefix-optimizer
description: "Expert guide for deterministic prompt prefix engineering, KV-cache locking for Gemini 4 Pro / Claude 5.5 / GPT Astra 6, canonical tool sorting, and achieving 90%+ prompt cache hit rates / Panduan ahli rekayasa prefix prompt deterministik, penguncian KV-cache untuk Gemini 4 Pro / Claude 5.5 / GPT Astra 6, pengurutan kanonikal tool, dan pencapaian 90%+ cache hit rate."
author: "Roedy Rustam"
version: "4.3.0"
---

# kv-cache-prefix-optimizer — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `brainstorming`, `zero-to-prod-orchestrator`, `frontier-ai-models-expert`, `llm-finops-router`, `gemini-agent-booster`, and `vercel-ai-sdk-expert` to structure multi-turn prompts for maximum KV-cache reuse, slashing token billing by up to 80% and reducing Time-to-First-Token (TTFT) by up to 10x.

### Description
Production guide for engineering deterministic prompt prefixes, stabilizing KV-cache boundaries, and optimizing context reuse across frontier models (Google Gemini 4 Pro / 3.x context caching, Anthropic Claude 5.5 prompt caching, and OpenAI prefix caching). Delivers architectures that guarantee 90%+ cache hit rates through canonical tool definition sorting, stable JSON serialization, and dynamic context partitioning.

### Trigger Conditions
Activate this skill when:
- Operating large-context agents (>100k tokens) where recurring prompt costs dominate operational budgets.
- Experiencing high Time-to-First-Token (TTFT) latencies in interactive chat or agentic coding loops.
- Configuring model caching primitives (`cache_control: { type: 'ephemeral' }` or Gemini explicit cache tokens).
- Architecting system instructions, tool schemas, and workspace context maps for multi-turn sessions.

---

### Core Concepts & Patterns

#### 1. The Anatomy of a High-Cache Prompt
Modern frontier models utilize prefix-matching algorithms. Even a single changed byte (such as a timestamp, random ID, or altered tool order) invalidates all subsequent cached tokens:

```
[STATIC PREFIX: CACHE PINNED (90%+ HIT RATE)]
  ├── System Directives & Behavioral Guardrails (Immutable)
  ├── 140-Skill Ecosystem Registry (Canonical Alphabetical Order)
  ├── Tool Definitions (Strictly Sorted Keys & Parameters)
  └── Workspace Schema & Architecture Map (Immutable per Session)
------------------------ [CACHE BOUNDARY PIN] ------------------------
[DYNAMIC SUFFIX: VOLATILE PER TURN]
  ├── Ephemeral Turn Timestamp & User Message
  └── Real-Time Tool Execution Results
```

#### 2. Deterministic Prompt & Cache Pinning (TypeScript Implementation)

```typescript
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export function serializeCanonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => serializeCanonicalJson(item)).join(',')}]`;
  }
  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${serializeCanonicalJson((obj as Record<string, unknown>)[key])}`
  );
  return `{${entries.join(',')}}`;
}

export function sortToolsCanonically(tools: ToolDefinition[]): ToolDefinition[] {
  return [...tools].sort((a, b) => a.name.localeCompare(b.name));
}

export interface PromptPayload {
  systemPrompt: string;
  cachedContextBlock: {
    type: 'text';
    text: string;
    cache_control: { type: 'ephemeral' };
  };
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export function constructCacheOptimizedPayload(
  systemDirectives: string,
  staticWorkspaceContext: string,
  tools: ToolDefinition[],
  userTurns: Array<{ role: 'user' | 'assistant'; content: string }>
): PromptPayload {
  const sortedTools = sortToolsCanonically(tools);
  const canonicalToolSpecs = serializeCanonicalJson(sortedTools);

  const staticPinnedBlock = [
    '=== IMMUTABLE SYSTEM CONTEXT ===',
    systemDirectives,
    '=== CANONICAL TOOL REGISTRY ===',
    canonicalToolSpecs,
    '=== PROJECT ARCHITECTURAL MAP ===',
    staticWorkspaceContext
  ].join('\n\n');

  return {
    systemPrompt: 'You are an advanced sovereign AI coding agent operating under strict anti-slop guidelines.',
    cachedContextBlock: {
      type: 'text',
      text: staticPinnedBlock,
      cache_control: { type: 'ephemeral' }
    },
    messages: userTurns
  };
}
```

#### 3. Cache Performance & Telemetry Targets

| Metric | Unoptimized Baseline | KV-Cache Optimized Target | Improvement Factor |
| :--- | :--- | :--- | :--- |
| **Cache Hit Ratio** | 0% - 20% | **90% - 98%** | **4.5x - 5x higher** |
| **Time-to-First-Token (TTFT)** | 3,200ms - 5,500ms | **250ms - 450ms** | **~10x faster response** |
| **Prompt Token Cost** | 100% full rate | **20% - 25% discounted rate** | **75% - 80% cost reduction** |

---

### Best Practices

1. **Never Insert Timestamps in System Prompts**: Place dates or timestamps exclusively in the final volatile user message, never in the static system prompt.
2. **Sort Tool Definitions Alphabetically**: Always sort tool names and their JSON schema parameter keys canonically before sending requests.
3. **Partition Dynamic Context to the Tail**: Ensure all large documentation and code context maps appear before volatile conversation history.
4. **Monitor Cache Read Discrepancies**: Log `usage.prompt_tokens_details.cached_tokens` in application telemetry to catch accidental prefix cache busts immediately.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Operational Consequence | Engineering Remedy |
| :--- | :--- | :--- |
| Dynamic session IDs embedded in the system prompt | 100% cache invalidation on every user session | Relocate session IDs to application state headers |
| Randomized order of tools from `Object.values(tools)` | Non-deterministic JSON payload busts KV cache | Sort tools alphabetically by name and schema keys |
| Modifying instruction wording midway through conversation | Re-reads entire 100k+ token context at full price | Keep static prompt templates strictly versioned and immutable |

---

### Integration with Other Skills (MANDATORY)

- `frontier-ai-models-expert` — Align with caching specs across Gemini 4 Pro, Claude 5.5, and GPT Astra 6.
- `llm-finops-router` — Calculate financial savings and route cache-heavy workloads to optimal endpoints.
- `gemini-agent-booster` — Exploit Google Cloud native 2M context caching mechanisms.
- `vercel-ai-sdk-expert` — Implement provider options for Anthropic and Google cache controls.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "Integrasi AI & LLM" and "Frontier AI & Simulation" matrix rows.
- `zero-to-prod-orchestrator` — Integrated in Phase 4 (Backend APIs, Microservices & AI Agents).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `brainstorming`, `zero-to-prod-orchestrator`, `frontier-ai-models-expert`, `llm-finops-router`, `gemini-agent-booster`, dan `vercel-ai-sdk-expert` untuk menyusun prompt multi-turn dengan efisiensi KV-cache maksimal, menghemat biaya token hingga 80% dan memangkas waktu respons awal (TTFT) hingga 10x lebih cepat.

### Deskripsi
Panduan produksi untuk merekayasa awalan (*prefix*) prompt yang deterministik, mengunci batas KV-cache, dan memaksimalkan penggunaan ulang konteks pada model frontier (Google Gemini 4 Pro / 3.x context caching, Anthropic Claude 5.5 prompt caching, dan OpenAI prefix caching). Memberikan arsitektur yang menjamin tingkat keberhasilan cache (*cache hit rate*) di atas 90% melalui pengurutan definisi tool kanonikal, serialisasi JSON stabil, dan partisi konteks dinamis.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Mengelola agen berkonteks besar (>100k token) dengan biaya input token berulang yang signifikan.
- Mengalami latensi tinggi pada Time-to-First-Token (TTFT) saat percakapan atau coding loop interaktif.
- Mengonfigurasi parameter caching model (`cache_control: { type: 'ephemeral' }` atau Gemini explicit caching).
- Merancang instruksi sistem, skema tool, dan peta repositori untuk sesi multi-turn.

---

### Konsep Inti & Pola Praktik

#### 1. Anatomi Prompt Ber-Cache Tinggi
Model frontier mencocokkan token awalan secara persis (*prefix matching*). Perubahan satu karakter saja di awal prompt akan merusak seluruh cache setelahnya:
- **Blok Statis (Terkunci)**: Instruksi sistem, daftar 140 skill, skema tool terurut, dan peta arsitektur proyek.
- **Titik Kunci Cache (*Cache Pin*)**: Menandai akhir blok statis dengan header kontrol cache.
- **Blok Volatil (Dinamis)**: Riwayat percakapan terkini dan hasil eksekusi tool giliran terakhir.

#### 2. Serialisasi JSON Kanonikal
Kunci objek JSON wajib diurutkan secara alfabetis sebelum dikirimkan ke model agar representasi string biner tidak berubah antar permintaan.

---

### Praktik Terbaik

1. **Jangan Taruh Timestamp di System Prompt**: Masukkan waktu atau tanggal hanya pada pesan user paling akhir, bukan pada blok instruksi utama.
2. **Urutkan Definisi Tool Secara Alfabetis**: Selalu lakukan *sorting* pada daftar nama fungsi dan parameter tool.
3. **Posisikan Data Dinamis di Bagian Akhir**: Taruh seluruh dokumen referensi dan kode sebelum giliran pesan pengguna.
4. **Pantau Metrik Cache**: Pantau token yang terbaca dari cache melalui telemetri guna mendeteksi jika terjadi *cache bust* yang tidak disengaja.

---

### Jebakan Umum yang Harus Dihindari

| Praktik Buruk | Dampak Buruk | Solusi Rekayasa |
| :--- | :--- | :--- |
| Menyisipkan ID sesi acak ke dalam system prompt | Cache batal 100% pada setiap sesi baru | Pindahkan ID sesi ke header aplikasi di luar prompt |
| Urutan tool berubah-ubah dari `Object.values(tools)` | Representasi string berubah dan membatalkan KV cache | Urutkan tool secara alfabetis berdasarkan namanya |
| Mengubah redaksi instruksi di tengah percakapan | Membaca ulang 100k+ token dengan harga penuh | Kunci template instruksi dalam keadaan statis dan terversi |

---

### Integrasi dengan Skill Lain (WAJIB)

- `frontier-ai-models-expert` — Sinkronisasi spesifikasi caching pada Gemini 4 Pro, Claude 5.5, dan GPT Astra 6.
- `llm-finops-router` — Menghitung efisiensi anggaran dan mengarahkan beban kerja ber-cache tinggi.
- `gemini-agent-booster` — Memanfaatkan mekanisme context caching native Google Cloud 2M.
- `vercel-ai-sdk-expert` — Mengimplementasikan opsi provider untuk kontrol caching Anthropic dan Google.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Tambahkan ke baris "Integrasi AI & LLM" dan "Frontier AI & Simulation" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Tambahkan ke Fase 4 (Backend APIs, Microservices & AI Agents).
