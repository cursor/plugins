---
name: test-time-compute-optimizer
description: "Expert guide for scaling test-time compute, dynamic reasoning token allocation (Gemini 4 Pro, Claude 5.5, GPT Astra 6), Monte Carlo Tree Search (MCTS), and Process Reward Models / Panduan ahli penskalaan komputasi waktu uji (test-time compute), alokasi dinamis budget penalaran, MCTS, dan Process Reward Models."
author: "Roedy Rustam"
version: "4.3.0"
---

# test-time-compute-optimizer — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `brainstorming`, `zero-to-prod-orchestrator`, `ai-llm-integration-expert`, `frontier-ai-models-expert`, `llm-finops-router`, and `speculative-multi-draft-synthesizer` to dynamically balance reasoning depth, inference latency, and token expenditures across frontier models.

### Description
Production guide for scaling test-time compute (inference-time reasoning) across frontier AI models including Google Gemini 4 Pro, Anthropic Claude 5.5 (Opus/Sonnet), and OpenAI GPT Astra 6 (`o6`). Provides concrete architectures for dynamic thinking budget allocation, tree-search exploration (MCTS, beam search), step-level Process Reward Model (PRM) verification, and self-consistency consensus loops.

### Trigger Conditions
Activate this skill when:
- Designing systems that tackle hard algorithmic, formal verification, or multi-step architectural problems.
- Configuring model reasoning parameters (`thinkingBudget`, `budget_tokens`, `reasoning_effort`).
- Implementing inference-time search algorithms (Monte Carlo Tree Search, Best-of-N with verification).
- Optimizing cost-vs-accuracy trade-offs to prevent over-spending on trivial tasks while maximizing reasoning on critical bottlenecks.

---

### Core Concepts & Patterns

#### 1. Dynamic Reasoning Budget Matrix

Inference-time compute scaling operates across three distinct operational tiers based on prompt entropy and execution risk:

| Complexity Tier | Target Problem Types | Gemini 4 Pro / 3.x (`thinkingBudget`) | Claude 5.5 (`budget_tokens`) | GPT Astra 6 (`reasoning_effort`) |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1: Deterministic / CRUD** | Simple UI components, DTO mappings, regex conversions | `0` (Thinking disabled) or `1024` | `1024` | `low` |
| **Tier 2: Business Logic & APIs** | Multi-table DB transactions, authentication flows, REST schemas | `4096` - `8192` | `4096` - `8192` | `medium` |
| **Tier 3: Mission-Critical Hard** | Financial state machines, distributed consensus, cryptographic proofs, complex refactoring | `16384` - `32768` | `16384` - `32768` | `high` |

#### 2. Entropy-Based Compute Dispatcher (TypeScript Implementation)

```typescript
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export type TaskComplexity = 'trivial' | 'standard' | 'complex' | 'extreme';

export interface ComputeAllocation {
  geminiThinkingBudget: number;
  claudeBudgetTokens: number;
  reasoningEffort: 'low' | 'medium' | 'high';
}

export function resolveComputeBudget(complexity: TaskComplexity): ComputeAllocation {
  switch (complexity) {
    case 'trivial':
      return { geminiThinkingBudget: 0, claudeBudgetTokens: 1024, reasoningEffort: 'low' };
    case 'standard':
      return { geminiThinkingBudget: 4096, claudeBudgetTokens: 4096, reasoningEffort: 'medium' };
    case 'complex':
      return { geminiThinkingBudget: 16384, claudeBudgetTokens: 16384, reasoningEffort: 'high' };
    case 'extreme':
      return { geminiThinkingBudget: 32768, claudeBudgetTokens: 32768, reasoningEffort: 'high' };
  }
}

export async function executeOptimizedReasoning(
  prompt: string,
  complexity: TaskComplexity,
  provider: 'gemini' | 'claude'
): Promise<string> {
  const budget = resolveComputeBudget(complexity);

  if (provider === 'gemini') {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY || ''
    });
    
    const result = await generateText({
      model: google('gemini-4-pro', {
        useSearchGrounding: false
      }),
      prompt,
      providerOptions: {
        google: {
          thinkingBudget: budget.geminiThinkingBudget
        }
      }
    });
    return result.text;
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || ''
  });

  const result = await generateText({
    model: anthropic('claude-3-7-sonnet-20250219'),
    prompt,
    providerOptions: {
      anthropic: {
        thinking: {
          type: 'enabled',
          budgetTokens: budget.claudeBudgetTokens
        }
      }
    }
  });
  return result.text;
}
```

#### 3. Best-of-N with External Verifier (Step-Level Scrutiny)

For non-deterministic algorithmic problems, test-time compute achieves superior results by sampling $N$ parallel candidate trajectories and scoring them against automated test suites or AST verifiers:

```
User Prompt ──┬──► Candidate 1 (Thinking = 8k) ──► Ephemeral Sandbox ──► Passed (Score 1.0)
              ├──► Candidate 2 (Thinking = 8k) ──► Ephemeral Sandbox ──► Failed Test 3
              └──► Candidate 3 (Thinking = 8k) ──► Ephemeral Sandbox ──► Syntax Error
                                                           │
                                                           ▼
                                               Synthesized Winning Node
```

---

### Best Practices

1. **Never Hardcode Fixed Thinking Budgets**: Calibrate reasoning tokens dynamically based on code AST complexity, cyclomatic complexity, or security criticality.
2. **Decouple Thinking from Output Stream**: Ensure thinking tokens are captured in structured audit logs rather than directly streamed to end-user UI channels.
3. **Combine Extended Thinking with Verifiable Tests**: Allocate maximum compute to generate both code and exhaustive property-based tests within the same execution loop.
4. **Enforce Hard Timeout Bounds**: Set execution deadlines on reasoning calls to prevent tail latency explosions when models enter recursive chain-of-thought exploration.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Operational Consequence | Engineering Remedy |
| :--- | :--- | :--- |
| Max thinking tokens on simple string manipulation | 10x latency and 15x cost inflation | Route through lightweight classifier to set `budget_tokens: 0` |
| Zero thinking tokens on concurrent state machines | Race conditions and hallucinated thread safety | Enforce minimum Tier 3 compute budget (`16384` tokens) |
| Discarding thinking logs | Lost insight into mathematical edge cases | Store thinking blocks in persistent telemetry for model evaluation |

---

### Integration with Other Skills (MANDATORY)

- `frontier-ai-models-expert` — Coordinate model parameters and feature flags across Gemini 4 Pro, Claude 5.5, and GPT Astra 6.
- `llm-finops-router` — Calculate token costs and optimize token expenditure per tenant.
- `ephemeral-wasm-sandbox-executor` — Serve as deterministic validation ground for Best-of-N search candidates.
- `speculative-multi-draft-synthesizer` — Supply multi-candidate generations to the arbiter.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "Integrasi AI & LLM" and "Frontier AI & Simulation" matrix rows.
- `zero-to-prod-orchestrator` — Integrated in Phase 4 (Backend APIs, Microservices & AI Agents).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `brainstorming`, `zero-to-prod-orchestrator`, `ai-llm-integration-expert`, `frontier-ai-models-expert`, `llm-finops-router`, dan `speculative-multi-draft-synthesizer` untuk menyeimbangkan kedalaman penalaran, latensi inferensi, dan biaya token pada model frontier.

### Deskripsi
Panduan produksi untuk penskalaan komputasi waktu uji (*test-time compute* / penalaran saat inferensi) pada model AI frontier termasuk Google Gemini 4 Pro, Anthropic Claude 5.5 (Opus/Sonnet), dan OpenAI GPT Astra 6 (`o6`). Menyediakan arsitektur konkret untuk alokasi dinamis budget penalaran (*thinking budget*), eksplorasi *tree-search* (MCTS, beam search), verifikasi bertahap dengan Process Reward Model (PRM), dan konsensus *self-consistency*.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Merancang sistem yang menyelesaikan masalah algoritma rumit, verifikasi formal, atau arsitektur multi-tahap.
- Mengonfigurasi parameter penalaran model (`thinkingBudget`, `budget_tokens`, `reasoning_effort`).
- Mengimplementasikan algoritma pencarian waktu inferensi (Monte Carlo Tree Search, Best-of-N dengan verifikator).
- Mengoptimalkan trade-off biaya vs akurasi agar tidak boros pada tugas sepele namun tetap maksimal pada titik kritis.

---

### Konsep Inti & Pola Praktik

#### 1. Matriks Alokasi Budget Penalaran Dinamis

Penskalaan komputasi waktu inferensi dibagi menjadi tiga tingkatan operasional berdasarkan entropi instruksi dan risiko eksekusi:

- **Tingkat 1 (CRUD & UI Sederhana)**: Komponen antarmuka dasar, konversi tipe data, formatting string. Budget thinking dinonaktifkan (`0`) atau disetel minimal `1024` token.
- **Tingkat 2 (Logika Bisnis & API)**: Transaksi multi-tabel, alur autentikasi, skema REST/GraphQL. Budget penalaran disetel pada rentang `4096` hingga `8192` token.
- **Tingkat 3 (Kritis & Formal Proof)**: State machine finansial, konsensus terdistribusi, refaktor skala besar. Budget penalaran dialokasikan penuh antara `16384` hingga `32768` token.

#### 2. Protokol Evaluasi Langkah (Process Reward Models)
Alih-alih hanya mengevaluasi hasil akhir kode (*Outcome-based*), terapkan evaluasi pada setiap langkah dekomposisi logika (*Step-level*):
1. **Dekomposisi Masalah**: Model menguraikan bukti logika ke dalam *n* premis mandiri.
2. **Validasi Invarian**: Setiap premis diuji terhadap invariant sistem menggunakan sandboxing instan.
3. **Penyatuan Solusi**: Menggabungkan langkah-langkah yang terbukti valid ke dalam kode akhir.

---

### Praktik Terbaik

1. **Hindari Menyetel Budget Statis**: Sesuaikan alokasi token penalaran secara dinamis berdasarkan kompleksitas siklomatik dan risiko domain.
2. **Pisahkan Log Penalaran dari UI**: Simpan token penalaran di dalam sistem telemetri atau log audit internal, bukan ditampilkan mentah ke pengguna akhir.
3. **Kombinasikan dengan Pengujian Otomatis**: Alokasikan daya komputasi tinggi untuk menghasilkan kode beserta unit test berbasis properti secara simultan.
4. **Terapkan Batas Waktu Eksekusi**: Tetapkan timeout yang ketat pada panggilan penalaran guna mencegah lonjakan latensi (*tail latency*).

---

### Jebakan Umum yang Harus Dihindari

| Praktik Buruk | Dampak Operasional | Solusi Rekayasa |
| :--- | :--- | :--- |
| Menyetel token thinking maksimal untuk manipulasi string dasar | Latensi 10x lebih lambat dan biaya token melonjak 15x | Lewatkan ke pengklasifikasi ringan untuk menyetel `budget_tokens: 0` |
| Menonaktifkan thinking untuk perancangan konkurensi database | Munculnya race condition dan deadlock tersembunyi | Wajibkan alokasi Tingkat 3 (`16384` token) |
| Mengabaikan log internal penalaran (*thinking traces*) | Kehilangan visibilitas saat terjadi kesalahan logika | Simpan blok pemikiran ke penyimpanan telemetri |

---

### Integrasi dengan Skill Lain (WAJIB)

- `frontier-ai-models-expert` — Sinkronisasi parameter model untuk Gemini 4 Pro, Claude 5.5, dan GPT Astra 6.
- `llm-finops-router` — Menghitung biaya token dan mengoptimalkan anggaran inferensi.
- `ephemeral-wasm-sandbox-executor` — Lingkungan validasi deterministik untuk kandidat Best-of-N.
- `speculative-multi-draft-synthesizer` — Memberikan kandidat multi-draft untuk ditengahi oleh arbiter.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Tambahkan ke baris "Integrasi AI & LLM" dan "Frontier AI & Simulation" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Tambahkan ke Fase 4 (Backend APIs, Microservices & AI Agents).
