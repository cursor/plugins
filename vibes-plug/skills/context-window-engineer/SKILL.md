---
name: context-window-engineer
description: "Expert guide for engineering and optimizing ultra-large context windows (2M+ tokens) across Gemini 4 Pro, Claude 5.5, and GPT Astra 6 — context partitioning, retrieval-augmented context injection, sliding window strategies, and cost-aware token budgeting / Panduan ahli rekayasa dan optimasi context window ultra-besar (2M+ token) di Gemini 4 Pro, Claude 5.5, dan GPT Astra 6 — partisi konteks, injeksi konteks berbasis retrieval, strategi sliding window, dan penganggaran token sadar-biaya."
author: "Roedy Rustam"
version: "4.3.0"
---

# context-window-engineer — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `kv-cache-prefix-optimizer`, `llm-finops-router`, `frontier-ai-models-expert`, `gemini-agent-booster`, `ai-llm-integration-expert`, `vercel-ai-sdk-expert`, `adaptive-model-cascade`, `session-memory-manager`, and `deep-research-analyst` to ensure context windows are utilized efficiently across all AI-powered workflows.

### Description
Production guide for engineering, partitioning, and optimizing ultra-large context windows (128k → 2M+ tokens) across frontier models. Prevents the most common failure mode in 2026 AI applications: dumping raw data into context without structure, causing degraded recall, wasted tokens, and hallucination amplification in the "lost in the middle" zone.

### Trigger Conditions
Activate this skill when:
- Building AI agents or applications that consume >50k tokens of context per request.
- Experiencing degraded model recall, "lost in the middle" failures, or hallucinations in long-context scenarios.
- Architecting Retrieval-Augmented Generation (RAG) systems that need to decide between retrieval vs. long-context stuffing.
- Optimizing token costs for applications with large system prompts, tool registries, or codebase context maps.
- Designing multi-turn agentic loops where context accumulates across dozens of turns.

---

### Core Concepts & Patterns

#### 1. Context Window Capacity Map (October 2026)

| Model | Max Context | Effective Recall Zone | Cost per 1M Input Tokens | Cache Discount |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 4 Pro** | 2,097,152 | ~1.8M (reliable) | $1.25 | 75% (explicit cache) |
| **Gemini 4 Flash** | 1,048,576 | ~900k | $0.075 | 75% |
| **Claude 5.5 Opus** | 500,000 | ~450k | $15.00 | 90% (prompt cache) |
| **Claude 5.5 Sonnet** | 200,000 | ~180k | $3.00 | 90% |
| **GPT Astra 6** | 256,000 | ~220k | $5.00 | 50% (prefix cache) |

#### 2. The Context Partitioning Architecture

Never treat the context window as a flat buffer. Partition it into semantically meaningful zones with explicit priority ordering:

```
┌──────────────────────────────────────────────────────┐
│ ZONE 1: IMMUTABLE SYSTEM DIRECTIVES (1-3%)           │
│   System prompt, behavioral guardrails, output format │
│   ► NEVER changes mid-session                        │
├──────────────────────────────────────────────────────┤
│ ZONE 2: STATIC REFERENCE CONTEXT (10-40%)            │
│   Codebase schemas, API specs, tool definitions,     │
│   architectural docs, PRD excerpts                   │
│   ► Changes only between sessions                    │
├──────────────────────────────────────────────────────┤
│ ZONE 3: RETRIEVED CONTEXT (20-50%)                   │
│   RAG chunks, relevant code files, search results,   │
│   documentation snippets                             │
│   ► Dynamically injected per query via retrieval      │
├──────────────────────────────────────────────────────┤
│ ZONE 4: CONVERSATION HISTORY (10-30%)                │
│   Prior turns, summarized older context,             │
│   tool call results                                  │
│   ► Sliding window with intelligent summarization     │
├──────────────────────────────────────────────────────┤
│ ZONE 5: ACTIVE QUERY + SCRATCHPAD (1-5%)             │
│   Current user message, chain-of-thought workspace   │
│   ► Most volatile, always at the tail                │
└──────────────────────────────────────────────────────┘
```

#### 3. Token Budget Allocation (TypeScript Implementation)

```typescript
export interface ContextBudget {
  totalCapacity: number;
  zones: {
    systemDirectives: { maxTokens: number; priority: 1 };
    staticReference: { maxTokens: number; priority: 2 };
    retrievedContext: { maxTokens: number; priority: 3 };
    conversationHistory: { maxTokens: number; priority: 4 };
    activeQuery: { maxTokens: number; priority: 5 };
  };
}

export function createBudget(modelCapacity: number): ContextBudget {
  return {
    totalCapacity: modelCapacity,
    zones: {
      systemDirectives: { maxTokens: Math.floor(modelCapacity * 0.02), priority: 1 },
      staticReference: { maxTokens: Math.floor(modelCapacity * 0.30), priority: 2 },
      retrievedContext: { maxTokens: Math.floor(modelCapacity * 0.40), priority: 3 },
      conversationHistory: { maxTokens: Math.floor(modelCapacity * 0.25), priority: 4 },
      activeQuery: { maxTokens: Math.floor(modelCapacity * 0.03), priority: 5 },
    },
  };
}

export function enforceTokenBudget(
  zoneContents: Map<string, string>,
  budget: ContextBudget,
  tokenCounter: (text: string) => number
): Map<string, string> {
  const result = new Map<string, string>();
  const zones = Object.entries(budget.zones).sort(([, a], [, b]) => a.priority - b.priority);

  for (const [zoneName, { maxTokens }] of zones) {
    const content = zoneContents.get(zoneName) ?? '';
    const tokenCount = tokenCounter(content);

    if (tokenCount <= maxTokens) {
      result.set(zoneName, content);
    } else {
      result.set(zoneName, truncateToTokenLimit(content, maxTokens, tokenCounter));
    }
  }

  return result;
}

function truncateToTokenLimit(
  content: string,
  maxTokens: number,
  tokenCounter: (text: string) => number
): string {
  const lines = content.split('\n');
  let accumulated = '';
  for (const line of lines) {
    const candidate = accumulated ? `${accumulated}\n${line}` : line;
    if (tokenCounter(candidate) > maxTokens) break;
    accumulated = candidate;
  }
  return accumulated;
}
```

#### 4. "Lost in the Middle" Mitigation

Frontier models exhibit degraded recall for information positioned in the middle 40-60% of the context. Mitigate with:

1. **Needle Placement**: Place the most critical context at the very beginning (Zone 1-2) and very end (Zone 5) of the prompt.
2. **Structural Anchors**: Use explicit section headers (`=== CRITICAL: Database Schema ===`) to create attention anchors.
3. **Redundant Summarization**: For critical facts, include both the raw data AND a summary at the top.
4. **Chunked Retrieval**: Break large documents into semantically coherent chunks (512-1024 tokens each) rather than inserting monolithic blocks.

#### 5. RAG vs. Long-Context Decision Matrix

| Criterion | Use RAG (Retrieve & Inject) | Use Long-Context Stuffing |
| :--- | :--- | :--- |
| **Corpus size** | >10M tokens total corpus | <2M tokens total corpus |
| **Query specificity** | Narrow, focused queries | Broad, synthesis-oriented queries |
| **Freshness** | Corpus updates frequently | Corpus is static per session |
| **Cost sensitivity** | High (pay only for retrieved chunks) | Lower priority (amortized via cache) |
| **Recall requirement** | Precision-critical (top-k retrieval) | Recall-critical (need full picture) |

#### 6. Sliding Window Strategy for Multi-Turn Agents

```typescript
export interface TurnSummary {
  turnIndex: number;
  role: 'user' | 'assistant';
  summary: string;
  tokenCount: number;
  fullContent?: string;
}

export function buildSlidingWindow(
  allTurns: TurnSummary[],
  maxHistoryTokens: number,
  recentTurnsToKeepFull: number = 4
): string[] {
  const recentFull = allTurns.slice(-recentTurnsToKeepFull);
  const older = allTurns.slice(0, -recentTurnsToKeepFull);

  let budget = maxHistoryTokens;
  const output: string[] = [];

  for (const turn of recentFull) {
    const content = turn.fullContent ?? turn.summary;
    budget -= turn.tokenCount;
    output.push(content);
  }

  if (budget > 0 && older.length > 0) {
    const olderSummaries = older.map((t) => `[Turn ${t.turnIndex}] ${t.summary}`);
    output.unshift(`=== SUMMARIZED EARLIER CONTEXT ===\n${olderSummaries.join('\n')}`);
  }

  return output;
}
```

---

### Best Practices

1. **Always Count Tokens Before Injection**: Use `tiktoken` (OpenAI), `@anthropic-ai/tokenizer`, or Gemini's `countTokens()` API to measure actual token counts.
2. **Cache-Align Zone Boundaries**: Coordinate with `kv-cache-prefix-optimizer` so static zones (1-2) align with KV-cache prefix boundaries.
3. **Measure Recall Quality**: Instrument needle-in-haystack tests at various context depths to validate your model's effective recall zone.
4. **Degrade Gracefully**: When context exceeds budget, drop Zone 4 (older history) first, then Zone 3 (retrieved context), never Zone 1-2.
5. **Monitor Token Spend Per Zone**: Log per-zone token consumption to `data-telemetry-expert` dashboards to identify context bloat early.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Consequence | Remedy |
| :--- | :--- | :--- |
| Dumping entire codebase into context | Exceeds effective recall zone, hallucination spikes | Use targeted retrieval + file relevance scoring |
| No zone partitioning | Critical instructions get "lost in the middle" | Implement explicit zone headers and priority ordering |
| Ignoring token counting | Silent context truncation by model API | Pre-count and enforce budgets client-side |
| Keeping full conversation history forever | Context fills up after 10-15 turns | Implement sliding window with summarization |

---

### Integration with Other Skills (MANDATORY)

- `kv-cache-prefix-optimizer` — Ensure Zone 1-2 boundaries align with cache-pinned prefixes for maximum cache hit rates.
- `llm-finops-router` — Feed per-zone token costs to the FinOps dashboard for budget optimization.
- `frontier-ai-models-expert` — Reference model-specific context window capacities and recall characteristics.
- `adaptive-model-cascade` — Route to larger-context models only when context exceeds smaller model capacity.
- `gemini-agent-booster` — Leverage Gemini 4 Pro's native 2M context caching for zero-latency re-reads.
- `session-memory-manager` — Persist context zone snapshots across sessions for seamless handoff.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "AI & LLM Integration" and "Frontier AI & Simulation" matrix rows.
- `zero-to-prod-orchestrator` — Integrated in Phase 4 (Backend APIs, Microservices & AI Agents).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `kv-cache-prefix-optimizer`, `llm-finops-router`, `frontier-ai-models-expert`, `gemini-agent-booster`, `ai-llm-integration-expert`, `vercel-ai-sdk-expert`, `adaptive-model-cascade`, `session-memory-manager`, dan `deep-research-analyst` untuk memastikan context window dimanfaatkan secara efisien di seluruh alur kerja berbasis AI.

### Deskripsi
Panduan produksi untuk merekayasa, mempartisi, dan mengoptimalkan context window ultra-besar (128k → 2M+ token) pada model frontier. Mencegah kegagalan paling umum di aplikasi AI 2026: memasukkan data mentah ke konteks tanpa struktur, yang menyebabkan recall menurun, token terbuang, dan amplifikasi halusinasi di zona "lost in the middle".

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Membangun agen atau aplikasi AI yang mengonsumsi >50k token konteks per permintaan.
- Mengalami penurunan recall model, kegagalan "lost in the middle", atau halusinasi pada skenario konteks panjang.
- Merancang sistem RAG yang perlu memutuskan antara retrieval vs. long-context stuffing.
- Mengoptimalkan biaya token untuk aplikasi dengan system prompt besar, registri tool, atau peta konteks codebase.

---

### Konsep Inti & Pola Praktik

#### 1. Arsitektur Partisi Konteks
Jangan perlakukan context window sebagai buffer datar. Partisi menjadi zona bermakna secara semantik:
- **Zona 1 (1-3%)**: Direktif sistem yang tidak berubah — prompt perilaku, format output.
- **Zona 2 (10-40%)**: Referensi statis — skema codebase, spesifikasi API, definisi tool.
- **Zona 3 (20-50%)**: Konteks yang di-retrieve — chunk RAG, file kode relevan, cuplikan dokumentasi.
- **Zona 4 (10-30%)**: Riwayat percakapan — giliran sebelumnya, ringkasan konteks lama.
- **Zona 5 (1-5%)**: Query aktif — pesan pengguna saat ini, ruang kerja chain-of-thought.

#### 2. Mitigasi "Lost in the Middle"
Model frontier menunjukkan recall yang menurun untuk informasi di tengah-tengah konteks. Mitigasi dengan penempatan informasi kritis di awal dan akhir, jangkar struktural, ringkasan redundan, dan retrieval berbasis chunk.

#### 3. Keputusan RAG vs. Long-Context
Gunakan RAG untuk korpus >10M token dengan query spesifik dan sensitivitas biaya tinggi. Gunakan long-context stuffing untuk korpus <2M token dengan kebutuhan sintesis luas dan corpus statis per sesi.

---

### Praktik Terbaik

1. **Selalu Hitung Token Sebelum Injeksi**: Gunakan API `countTokens()` untuk mengukur jumlah token aktual.
2. **Selaraskan Batas Zona dengan Cache**: Koordinasikan dengan `kv-cache-prefix-optimizer` agar zona statis selaras dengan batas prefix KV-cache.
3. **Ukur Kualitas Recall**: Instrumenkan tes needle-in-haystack pada berbagai kedalaman konteks.
4. **Degradasi Anggun**: Saat konteks melebihi anggaran, buang Zona 4 (riwayat lama) lebih dulu, bukan Zona 1-2.

---

### Jebakan Umum yang Harus Dihindari

| Praktik Buruk | Dampak | Solusi |
| :--- | :--- | :--- |
| Memasukkan seluruh codebase ke konteks | Melebihi zona recall efektif, halusinasi melonjak | Gunakan retrieval terarah + skor relevansi file |
| Tanpa partisi zona | Instruksi kritis "hilang di tengah" | Implementasikan header zona eksplisit |
| Mengabaikan penghitungan token | Pemotongan konteks diam-diam oleh API model | Hitung dan terapkan anggaran dari sisi klien |
| Menyimpan seluruh riwayat percakapan | Konteks penuh setelah 10-15 giliran | Terapkan sliding window dengan ringkasan |

---

### Integrasi dengan Skill Lain (WAJIB)

- `kv-cache-prefix-optimizer` — Pastikan batas Zona 1-2 selaras dengan prefix cache untuk cache hit rate maksimal.
- `llm-finops-router` — Kirim biaya token per-zona ke dashboard FinOps untuk optimasi anggaran.
- `frontier-ai-models-expert` — Referensi kapasitas context window dan karakteristik recall spesifik model.
- `adaptive-model-cascade` — Rutekan ke model berkonteks lebih besar hanya ketika konteks melebihi kapasitas model kecil.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Ditambahkan ke baris "Integrasi AI & LLM" dan "Frontier AI & Simulation" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Diintegrasikan di Fase 4 (Backend APIs, Microservices & AI Agents).
