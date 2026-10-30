---
name: adaptive-model-cascade
description: "Expert guide for intelligent model cascading and routing — complexity-scored task routing from Flash/Haiku to Sonnet/Opus/Astra, dynamic escalation with quality gates, 40-60% token cost reduction while maintaining output quality / Panduan ahli untuk kaskade dan routing model cerdas — routing tugas berbasis skor kompleksitas dari Flash/Haiku ke Sonnet/Opus/Astra, eskalasi dinamis dengan gerbang kualitas, pengurangan biaya token 40-60% dengan kualitas output terjaga."
author: "Roedy Rustam"
version: "4.3.0"
---

# adaptive-model-cascade — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `llm-finops-router`, `frontier-ai-models-expert`, `context-window-engineer`, `kv-cache-prefix-optimizer`, `llm-observability-expert`, `ai-llm-integration-expert`, `vercel-ai-sdk-expert`, and `test-time-compute-optimizer` to implement cost-optimal model selection across all AI-powered features.

### Description
Production architecture for routing AI requests to the optimal model tier based on real-time task complexity assessment. Instead of sending every request to the most expensive frontier model, this skill implements a cascade: try the fastest/cheapest model first, evaluate output quality via automated judges, and escalate to more capable (expensive) models only when the cheaper tier fails the quality gate. Achieves 40-60% cost reduction for typical production workloads where 60-70% of requests are simple enough for smaller models.

### Trigger Conditions
Activate this skill when:
- Running AI features in production with significant token spend (>$500/month).
- Building applications where response quality varies by task complexity (some queries need GPT Astra 6, others need only Flash).
- Implementing cost optimization for multi-model AI architectures.
- Designing fallback and retry strategies across model providers.

---

### Core Concepts & Patterns

#### 1. The Model Cascade Architecture

```
USER REQUEST
      │
      ▼
┌──────────────────────┐
│ COMPLEXITY SCORER    │  Classify request complexity: LOW / MEDIUM / HIGH / ULTRA
│ (Fast heuristic or   │
│  lightweight model)   │
└──────┬───────────────┘
       │
       ├── LOW ──────────► Gemini 4 Flash-Lite / Claude Haiku ($0.025/1M)
       │                        │
       │                   ┌────▼────┐
       │                   │ QUALITY  │  Pass? → Return response
       │                   │ GATE     │  Fail? → Escalate to MEDIUM
       │                   └─────────┘
       │
       ├── MEDIUM ───────► Gemini 4 Flash / Claude Sonnet ($0.30/1M)
       │                        │
       │                   ┌────▼────┐
       │                   │ QUALITY  │  Pass? → Return response
       │                   │ GATE     │  Fail? → Escalate to HIGH
       │                   └─────────┘
       │
       ├── HIGH ─────────► Gemini 4 Pro / Claude Opus ($3-15/1M)
       │                        │
       │                   ┌────▼────┐
       │                   │ QUALITY  │  Pass? → Return response
       │                   │ GATE     │  Fail? → Escalate to ULTRA
       │                   └─────────┘
       │
       └── ULTRA ────────► GPT Astra 6 + Extended Thinking ($15/1M)
                                │
                           Return response (final tier, no escalation)
```

#### 2. Complexity Scorer (TypeScript Implementation)

```typescript
export type ComplexityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export interface ComplexitySignals {
  tokenCount: number;
  hasCodeGeneration: boolean;
  requiresReasoning: boolean;
  hasMultiStep: boolean;
  domainSpecificity: 'general' | 'technical' | 'specialized';
  requiresCreativity: boolean;
  hasToolCalls: boolean;
  contextSize: number;
}

export function scoreComplexity(signals: ComplexitySignals): ComplexityLevel {
  let score = 0;

  if (signals.tokenCount > 2000) score += 1;
  if (signals.tokenCount > 8000) score += 1;
  if (signals.hasCodeGeneration) score += 2;
  if (signals.requiresReasoning) score += 2;
  if (signals.hasMultiStep) score += 1;
  if (signals.domainSpecificity === 'technical') score += 1;
  if (signals.domainSpecificity === 'specialized') score += 2;
  if (signals.requiresCreativity) score += 1;
  if (signals.hasToolCalls) score += 1;
  if (signals.contextSize > 100_000) score += 1;
  if (signals.contextSize > 500_000) score += 2;

  if (score <= 2) return 'LOW';
  if (score <= 5) return 'MEDIUM';
  if (score <= 8) return 'HIGH';
  return 'ULTRA';
}
```

#### 3. Quality Gate Evaluator

```typescript
export interface QualityGateResult {
  passed: boolean;
  score: number;
  reasons: string[];
}

export async function evaluateQualityGate(
  request: string,
  response: string,
  tier: ComplexityLevel
): Promise<QualityGateResult> {
  const checks: Array<{ name: string; passed: boolean }> = [];

  // Structural completeness: does the response address all parts of the request?
  const hasSubstance = response.length > 50 && !response.includes("I don't know");
  checks.push({ name: 'substance', passed: hasSubstance });

  // Code validity: if code was requested, does the output contain valid-looking code blocks?
  if (request.toLowerCase().includes('code') || request.toLowerCase().includes('function')) {
    const hasCodeBlocks = /```[\s\S]+```/.test(response);
    checks.push({ name: 'code_blocks', passed: hasCodeBlocks });
  }

  // Refusal detection: did the model refuse or hedge excessively?
  const refusalPatterns = /i('m| am) (unable|not able|can't|cannot)\s+(to|help)/i;
  const noRefusal = !refusalPatterns.test(response);
  checks.push({ name: 'no_refusal', passed: noRefusal });

  // Length adequacy: response should be proportional to request complexity
  const minExpectedLength = tier === 'LOW' ? 100 : tier === 'MEDIUM' ? 300 : 500;
  const adequateLength = response.length >= minExpectedLength;
  checks.push({ name: 'adequate_length', passed: adequateLength });

  const passedCount = checks.filter((c) => c.passed).length;
  const score = passedCount / checks.length;
  const failedReasons = checks.filter((c) => !c.passed).map((c) => c.name);

  return {
    passed: score >= 0.75,
    score,
    reasons: failedReasons,
  };
}
```

#### 4. Cascade Router with Escalation

```typescript
import { generateText } from 'ai';

export interface ModelTier {
  level: ComplexityLevel;
  modelId: string;
  provider: string;
  costPer1MTokens: number;
  maxRetries: number;
}

const MODEL_TIERS: ModelTier[] = [
  { level: 'LOW', modelId: 'gemini-4-flash-lite', provider: 'google', costPer1MTokens: 0.025, maxRetries: 1 },
  { level: 'MEDIUM', modelId: 'claude-5.5-sonnet', provider: 'anthropic', costPer1MTokens: 3.0, maxRetries: 1 },
  { level: 'HIGH', modelId: 'gemini-4-pro', provider: 'google', costPer1MTokens: 1.25, maxRetries: 1 },
  { level: 'ULTRA', modelId: 'gpt-astra-6', provider: 'openai', costPer1MTokens: 15.0, maxRetries: 2 },
];

const TIER_ORDER: ComplexityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'ULTRA'];

export async function cascadeRequest(
  prompt: string,
  signals: ComplexitySignals,
  systemPrompt: string
): Promise<{ text: string; model: string; totalCost: number; escalations: number }> {
  const startTier = scoreComplexity(signals);
  const startIndex = TIER_ORDER.indexOf(startTier);
  let escalations = 0;

  for (let i = startIndex; i < MODEL_TIERS.length; i++) {
    const tier = MODEL_TIERS[i];

    const result = await generateText({
      model: getModelProvider(tier.provider, tier.modelId),
      system: systemPrompt,
      prompt,
    });

    const quality = await evaluateQualityGate(prompt, result.text, tier.level);

    if (quality.passed || i === MODEL_TIERS.length - 1) {
      return {
        text: result.text,
        model: tier.modelId,
        totalCost: calculateCost(result.usage, tier.costPer1MTokens),
        escalations,
      };
    }

    escalations++;
  }

  throw new Error('All model tiers exhausted');
}

function calculateCost(usage: { promptTokens: number; completionTokens: number }, costPer1M: number): number {
  return ((usage.promptTokens + usage.completionTokens) / 1_000_000) * costPer1M;
}
```

#### 5. Cost Savings Projection

| Workload Distribution | Without Cascade | With Cascade | Savings |
| :--- | :--- | :--- | :--- |
| 60% simple, 30% medium, 10% complex | $1,500/month (all Opus) | $450/month | **70%** |
| 40% simple, 40% medium, 20% complex | $2,000/month (all Pro) | $800/month | **60%** |
| 20% simple, 50% medium, 30% complex | $3,000/month (mixed) | $1,500/month | **50%** |

---

### Best Practices

1. **Start with the Cheapest Tier**: Always try the fastest model first. Escalation costs less than defaulting to the most expensive model.
2. **Quality Gates Must Be Fast**: The evaluator should add <200ms overhead. Use heuristic checks, not another LLM call, for the gate.
3. **Log Every Escalation**: Track escalation frequency per feature to identify tasks that always require frontier models (route directly).
4. **Cache Before Cascade**: Apply `kv-cache-prefix-optimizer` patterns to reduce base cost at every tier.
5. **A/B Test Tier Boundaries**: Use `feature-flag-analytics-expert` to experiment with complexity score thresholds.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Consequence | Remedy |
| :--- | :--- | :--- |
| Sending everything to the frontier model | 5-10x unnecessary cost | Implement complexity scoring and cascade |
| Using another LLM call as the quality gate | Gate cost exceeds savings from cascading | Use fast heuristic checks (regex, length, structure) |
| No fallback for model provider outages | Total feature outage when one provider is down | Cascade across providers, not just model sizes |
| Static tier assignment without telemetry | Suboptimal routing as usage patterns evolve | Monitor and adjust complexity thresholds weekly |

---

### Integration with Other Skills (MANDATORY)

- `llm-finops-router` — Feed cascade cost data to the FinOps dashboard for ROI tracking.
- `llm-observability-expert` — Log all cascade decisions, escalations, and quality gate results.
- `frontier-ai-models-expert` — Reference model capabilities for tier assignment.
- `context-window-engineer` — Route to larger-context models when context exceeds smaller model limits.
- `kv-cache-prefix-optimizer` — Apply cache optimization at each tier to minimize base cost.
- `vercel-ai-sdk-expert` — Implement cascade routing using Vercel AI SDK's multi-provider support.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "AI & LLM Integration" matrix row.
- `zero-to-prod-orchestrator` — Integrated in Phase 4 (Backend APIs, Microservices & AI Agents).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `llm-finops-router`, `frontier-ai-models-expert`, `context-window-engineer`, `kv-cache-prefix-optimizer`, `llm-observability-expert`, `ai-llm-integration-expert`, `vercel-ai-sdk-expert`, dan `test-time-compute-optimizer` untuk mengimplementasikan pemilihan model optimal dari segi biaya di seluruh fitur berbasis AI.

### Deskripsi
Arsitektur produksi untuk merutekan permintaan AI ke tier model optimal berdasarkan penilaian kompleksitas tugas secara real-time. Alih-alih mengirim setiap permintaan ke model frontier termahal, skill ini mengimplementasikan kaskade: coba model tercepat/termurah dulu, evaluasi kualitas output via penilai otomatis, dan eskalasi ke model lebih capable (mahal) hanya jika tier murah gagal melewati gerbang kualitas. Menghemat 40-60% biaya untuk beban kerja produksi tipikal.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Menjalankan fitur AI di produksi dengan pengeluaran token signifikan (>$500/bulan).
- Membangun aplikasi di mana kualitas respons bervariasi menurut kompleksitas tugas.
- Mengimplementasikan optimasi biaya untuk arsitektur AI multi-model.

---

### Konsep Inti & Pola Praktik

#### 1. Arsitektur Kaskade Model
Empat tier berurutan: LOW (Flash-Lite/Haiku), MEDIUM (Flash/Sonnet), HIGH (Pro/Opus), ULTRA (Astra 6 + Extended Thinking). Setiap tier memiliki gerbang kualitas. Jika gagal, eskalasi ke tier berikutnya.

#### 2. Penilaian Kompleksitas
Skor numerik berdasarkan sinyal: jumlah token, kebutuhan generasi kode, penalaran, langkah multi-step, spesifisitas domain, kreativitas, tool calls, dan ukuran konteks.

#### 3. Gerbang Kualitas
Evaluasi cepat berbasis heuristik (<200ms): substansi respons, blok kode valid, deteksi penolakan, dan kecukupan panjang. Tidak menggunakan panggilan LLM tambahan.

---

### Praktik Terbaik

1. **Mulai dari Tier Termurah**: Selalu coba model tercepat dulu.
2. **Gerbang Kualitas Harus Cepat**: Evaluator harus menambahkan <200ms overhead.
3. **Log Setiap Eskalasi**: Lacak frekuensi eskalasi per fitur.
4. **Cache Sebelum Kaskade**: Terapkan pola `kv-cache-prefix-optimizer` untuk mengurangi biaya dasar di setiap tier.

---

### Integrasi dengan Skill Lain (WAJIB)

- `llm-finops-router` — Kirim data biaya kaskade ke dashboard FinOps.
- `llm-observability-expert` — Log semua keputusan kaskade, eskalasi, dan hasil gerbang kualitas.
- `frontier-ai-models-expert` — Referensi kemampuan model untuk penugasan tier.
- `context-window-engineer` — Rutekan ke model berkonteks lebih besar saat konteks melebihi batas model kecil.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Ditambahkan ke baris "AI & LLM Integration" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Diintegrasikan di Fase 4 (Backend APIs, Microservices & AI Agents).
