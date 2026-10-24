---
name: thinking-budget-orchestrator
description: "Expert guide for dynamic thinking budget allocation, test-time reasoning scaling (Gemini 4 Pro, Claude 3.7/5.1 Extended Thinking, OpenAI o3/o4-mini), and task complexity heuristics / Panduan ahli alokasi budget penalaran dinamis dan penskalaan reasoning test-time."
author: "Roedy Rustam"
version: "4.3.0"
---

# thinking-budget-orchestrator — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `test-time-compute-optimizer`, `adaptive-model-cascade`, `frontier-ai-models-expert`, `gemini-agent-booster`, `llm-finops-router`, `multi-agent-orchestration`, and `zero-to-prod-orchestrator` to enforce optimal cognitive budget allocation across AI tasks.

### Description
Production architecture for dynamically allocating and controlling reasoning thinking tokens (Extended Thinking / Test-Time Compute) across frontier LLMs (Gemini 4 Pro/Flash, Claude 3.7/5.1 Sonnet/Opus, OpenAI o3/o4-mini). Instead of static uniform token limits that either starve complex mathematical verifications or waste massive token budgets on simple queries, this skill evaluates structural task signals (AST blast radius, security boundaries, multi-agent topologies) and applies calibrated reasoning envelopes: `speed` (1K tokens), `balanced` (8K tokens), `deep` (32K tokens), and `exhaustive` (64K tokens).

### Trigger Conditions
Activate this skill when:
- Designing prompt chains or agents utilizing models with thinking budget controls (e.g. `thinking: { type: "enabled", budget_tokens: N }`).
- Running multi-agent swarms where leaf worker agents require lightweight budgets while root critic agents require deep reasoning.
- Optimizing API costs and P99 latency on enterprise agent pipelines.
- Automating verification for high-consequence tasks (FinTech billing, cryptographic state machines, security audits).

---

### Core Concepts & Reasoning Profiles

```
TASK INGESTION
      │
      ▼
┌───────────────────────────┐
│ HEURISTIC COMPLEXITY AST  │  Extract signals: blast radius, keywords, dependencies
└─────────────┬─────────────┘
              │
  ┌───────────┼───────────┬───────────┐
  ▼           ▼           ▼           ▼
SPEED     BALANCED      DEEP      EXHAUSTIVE
(1,024)    (8,192)    (32,768)     (65,536)
  │           │           │           │
Simple typo  Fullstack  Security    Formal math /
/ lint fixes  feature   audit/fuzz  SMT proving
```

#### 1. Token Budget Allocation Matrix

| Profile | Token Budget | Target Workload | Frontier Model Mapping |
|---|---|---|---|
| `speed` | 1,024 tokens | AST queries, documentation lookup, typos, single unit tests | Gemini 4 Flash / Claude 3.5 Haiku |
| `balanced` | 8,192 tokens | Feature implementation, component assembly, standard CRUD | Claude 3.7 Sonnet / Gemini 4 Pro |
| `deep` | 32,768 tokens | Architecture synthesis, cross-domain migrations, security audits | Claude 5.1 Sonnet / Gemini 4 Pro |
| `exhaustive` | 65,536 tokens | Cryptographic verification, SMT invariant proving, distributed sagas | OpenAI o3 / Gemini 4 Pro Deep Think |

#### 2. Native Multi-Provider Payload Generation (TypeScript)

```typescript
export interface ThinkingConfig {
  profile: 'speed' | 'balanced' | 'deep' | 'exhaustive';
  budgetTokens: number;
}

export const BUDGET_TOKENS: Record<string, number> = {
  speed: 1024,
  balanced: 8192,
  deep: 32768,
  exhaustive: 65536
};

export function resolveThinkingBudget(task: string, userOverride?: string): ThinkingConfig {
  const profile = (userOverride || detectComplexity(task)) as ThinkingConfig['profile'];
  return {
    profile,
    budgetTokens: BUDGET_TOKENS[profile] || BUDGET_TOKENS.balanced
  };
}

function detectComplexity(task: string): string {
  const lower = task.toLowerCase();
  if (/(invariant|formal|pqc|smt|z3|crypto|zero-day|exploit)/.test(lower)) return 'exhaustive';
  if (/(security|audit|red-team|refactor|migration|payment|gateway|doku|stripe)/.test(lower)) return 'deep';
  if (/(typo|lint|format|doc|readme|comment)/.test(lower)) return 'speed';
  return 'balanced';
}

export function formatProviderThinkingPayload(provider: 'gemini' | 'claude' | 'openai', config: ThinkingConfig) {
  switch (provider) {
    case 'claude':
      return {
        thinking: {
          type: 'enabled',
          budget_tokens: config.budgetTokens
        }
      };
    case 'gemini':
      return {
        generationConfig: {
          thinkingConfig: {
            thinkingBudget: config.budgetTokens
          }
        }
      };
    case 'openai':
      return {
        reasoning_effort: config.budgetTokens >= 32768 ? 'high' : config.budgetTokens >= 8192 ? 'medium' : 'low'
      };
    default:
      return {};
  }
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill `test-time-compute-optimizer`, `adaptive-model-cascade`, `frontier-ai-models-expert`, `gemini-agent-booster`, `llm-finops-router`, `multi-agent-orchestration`, dan `zero-to-prod-orchestrator` untuk menegakkan alokasi anggaran penalaran optimal di seluruh aktivitas agen AI.

### Deskripsi
Arsitektur produksi untuk mengalokasikan dan mengendalikan *reasoning thinking tokens* (Extended Thinking / Test-Time Compute) secara dinamis di seluruh LLM frontier (Gemini 4 Pro/Flash, Claude 3.7/5.1, OpenAI o3/o4-mini). Daripada menggunakan batas token statis seragam yang membuang biaya komputasi atau membatasi penalaran mendalam pada sistem kritis, skill ini mengevaluasi sinyal struktural tugas dan menerapkan profil reasoning terkalibrasi: `speed` (1K token), `balanced` (8K token), `deep` (32K token), dan `exhaustive` (64K token).

### Kondisi Pemicu
- Merancang alur agen yang memanfaatkan kontrol thinking budget native API.
- Menjalankan swarm multi-agen di mana subagen pelaksana membutuhkan budget ringan sedangkan agen auditor membutuhkan budget mendalam.
- Mengoptimalkan efisiensi biaya token dan latensi P99 pada pipeline AI enterprise.
- Memvalidasi logika berisiko tinggi (state machine finansial, billing SaaS, kriptografi).

---

### Implementasi Pola Kunci Alokasi Budget Penalaran (TypeScript)

```typescript
export interface KonfigurasiPenalaran {
  profil: 'speed' | 'balanced' | 'deep' | 'exhaustive';
  budgetTokens: number;
}

export function tentukanBudgetPenalaran(deskripsiTugas: string): KonfigurasiPenalaran {
  const teks = deskripsiTugas.toLowerCase();
  
  // 1. Tugas formal matematika/kriptografi: Berikan budget maksimal
  if (/(invarian|formal|pqc|smt|z3|kriptografi)/.test(teks)) {
    return { profil: 'exhaustive', budgetTokens: 65536 };
  }
  // 2. Audit keamanan, payment, dan migrasi arsitektur: Budget mendalam
  if (/(keamanan|audit|red-team|refaktor|migrasi|payment|doku|stripe)/.test(teks)) {
    return { profil: 'deep', budgetTokens: 32768 };
  }
  // 3. Perbaikan typo, formatting, dan dokumentasi: Budget super cepat
  if (/(typo|lint|format|dokumentasi|readme)/.test(teks)) {
    return { profil: 'speed', budgetTokens: 1024 };
  }
  // 4. Default pengembangan fitur fullstack: Budget seimbang
  return { profil: 'balanced', budgetTokens: 8192 };
}
```