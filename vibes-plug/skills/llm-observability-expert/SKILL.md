---
name: llm-observability-expert
description: "Expert guide for LLM observability in production — token cost tracking, hallucination rate monitoring, latency analysis, prompt/completion logging, model comparison dashboards, and AI-specific tracing (Langfuse, Helicone, Lunary, OpenTelemetry GenAI) / Panduan ahli observabilitas LLM di produksi — pelacakan biaya token, pemantauan tingkat halusinasi, analisis latensi, logging prompt/completion, dashboard perbandingan model, dan tracing khusus AI."
author: "Roedy Rustam"
version: "4.3.0"
---

# llm-observability-expert — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `data-telemetry-expert`, `logging-error-tracking-expert`, `llm-finops-router`, `ai-llm-integration-expert`, `frontier-ai-models-expert`, `context-window-engineer`, `kv-cache-prefix-optimizer`, `adaptive-model-cascade`, and `ai-safety-governance-expert` to provide end-to-end visibility into AI application behavior in production.

### Description
Production observability framework for LLM-powered applications. Addresses the biggest blind spot in 2026 AI applications: teams deploy AI features to production with zero visibility into token costs, hallucination rates, latency distributions, cache hit ratios, or user satisfaction scores. This skill provides the instrumentation patterns, tool integrations, and dashboard architectures to make LLM behavior fully observable.

### Trigger Conditions
Activate this skill when:
- Deploying any LLM-powered feature to production (chatbots, AI assistants, code generators, content tools).
- Investigating unexplained cost spikes in AI API billing.
- Debugging hallucination reports or quality degradation in AI outputs.
- Building dashboards to monitor AI feature health and cost efficiency.
- Comparing model performance (latency, quality, cost) across providers.

---

### Core Concepts & Patterns

#### 1. LLM Observability Stack (2026)

| Layer | Tool | Purpose |
| :--- | :--- | :--- |
| **Tracing** | Langfuse / Helicone / Lunary | End-to-end trace of LLM calls, including prompt, completion, tokens, latency, and metadata |
| **Cost Tracking** | Helicone / LiteLLM Proxy / Custom | Real-time token cost aggregation by model, feature, user, and tenant |
| **Quality Metrics** | Langfuse Scores / Custom Evals | Hallucination rate, factuality score, user satisfaction (thumbs up/down) |
| **Alerting** | Grafana / PagerDuty / Custom | Cost anomaly alerts, latency SLA breaches, error rate spikes |
| **Logs** | OpenTelemetry + Axiom/Datadog | Structured logs with prompt/completion pairs for debugging |

#### 2. Core Metrics to Track

```typescript
export interface LLMCallMetrics {
  traceId: string;
  spanId: string;
  timestamp: string;

  // Model & Provider
  model: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';

  // Token Economics
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalCost: number;
  cacheHitRate: number;

  // Latency
  timeToFirstToken: number;
  totalLatency: number;
  tokensPerSecond: number;

  // Quality Signals
  userFeedback?: 'positive' | 'negative' | null;
  hallucinationDetected?: boolean;
  toolCallSuccess?: boolean;
  retryCount: number;

  // Context
  feature: string;
  userId?: string;
  tenantId?: string;
  sessionId: string;
}
```

#### 3. Langfuse Integration (TypeScript)

```typescript
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

export function traceLLMCall<T>(
  featureName: string,
  userId: string,
  fn: (trace: ReturnType<typeof langfuse.trace>) => Promise<T>
): Promise<T> {
  const trace = langfuse.trace({
    name: featureName,
    userId,
    metadata: { environment: process.env.NODE_ENV },
  });

  return fn(trace).finally(() => langfuse.flush());
}

// Usage in API route:
export async function handleChatRequest(req: Request) {
  const { message, userId } = await req.json();

  return traceLLMCall('chat-assistant', userId, async (trace) => {
    const generation = trace.generation({
      name: 'chat-completion',
      model: 'gemini-4-pro',
      input: message,
    });

    const response = await callLLM(message);

    generation.end({
      output: response.text,
      usage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      },
    });

    return new Response(JSON.stringify({ text: response.text }));
  });
}
```

#### 4. Cost Anomaly Detection

```typescript
export interface CostAlert {
  type: 'daily_budget_exceeded' | 'cost_per_call_spike' | 'cache_hit_drop';
  severity: 'warning' | 'critical';
  currentValue: number;
  threshold: number;
  message: string;
}

export function detectCostAnomalies(
  metrics: LLMCallMetrics[],
  dailyBudget: number,
  expectedCacheHitRate: number
): CostAlert[] {
  const alerts: CostAlert[] = [];

  const dailyCost = metrics.reduce((sum, m) => sum + m.totalCost, 0);
  if (dailyCost > dailyBudget) {
    alerts.push({
      type: 'daily_budget_exceeded',
      severity: 'critical',
      currentValue: dailyCost,
      threshold: dailyBudget,
      message: `Daily AI cost $${dailyCost.toFixed(2)} exceeds budget $${dailyBudget.toFixed(2)}`,
    });
  }

  const avgCacheHit = metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length;
  if (avgCacheHit < expectedCacheHitRate * 0.7) {
    alerts.push({
      type: 'cache_hit_drop',
      severity: 'warning',
      currentValue: avgCacheHit,
      threshold: expectedCacheHitRate,
      message: `Cache hit rate dropped to ${(avgCacheHit * 100).toFixed(1)}% (expected ${(expectedCacheHitRate * 100).toFixed(1)}%)`,
    });
  }

  return alerts;
}
```

#### 5. Dashboard Architecture

```
┌──────────────────────────────────────────────────────┐
│                  AI OPERATIONS DASHBOARD              │
├──────────────┬───────────────┬────────────────────────┤
│ COST CENTER  │ QUALITY       │ PERFORMANCE            │
├──────────────┼───────────────┼────────────────────────┤
│ Daily spend  │ Hallucination │ P50/P95/P99 latency    │
│ by model     │ rate (24h)    │ by model               │
│              │               │                        │
│ Cost per     │ User feedback │ Tokens/second           │
│ feature      │ ratio (+/-)   │ throughput              │
│              │               │                        │
│ Cache hit    │ Tool call     │ Time-to-first-token     │
│ rate trend   │ success rate  │ distribution            │
│              │               │                        │
│ Token volume │ Retry rate    │ Error rate by           │
│ by tenant    │ by feature    │ provider                │
└──────────────┴───────────────┴────────────────────────┘
```

---

### Best Practices

1. **Instrument Every LLM Call**: No LLM call should go untraced. Wrap all provider SDK calls in an observability layer.
2. **Track Cost Per Feature, Not Just Total**: Aggregate costs by feature name to identify the most expensive AI functions.
3. **Set Budget Alerts Early**: Configure daily/weekly cost alerts before going to production, not after the first billing shock.
4. **Collect User Feedback Signals**: Implement thumbs up/down buttons on AI outputs and log them as quality scores in Langfuse.
5. **Monitor Cache Hit Rates**: A drop in cache hit rate directly increases costs — alert on deviations from baseline.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Consequence | Remedy |
| :--- | :--- | :--- |
| No observability in production AI features | Zero visibility into costs, quality, or failures | Instrument every LLM call with Langfuse/Helicone |
| Logging full prompts without PII filtering | GDPR/PDPA violation from stored user data | Apply PII scrubbing before logging |
| No cost alerting | Surprise $10k+ monthly bills | Set daily budget alerts with automatic circuit breakers |
| Tracking only latency, ignoring quality | Low-latency but high-hallucination responses | Track factuality scores alongside latency |

---

### Integration with Other Skills (MANDATORY)

- `data-telemetry-expert` — Extend OpenTelemetry instrumentation with LLM-specific spans and metrics.
- `llm-finops-router` — Feed real-time cost data to the FinOps router for dynamic model selection.
- `kv-cache-prefix-optimizer` — Monitor cache hit rates to detect prefix cache invalidation.
- `logging-error-tracking-expert` — Integrate LLM traces with Sentry error tracking and Pino structured logs.
- `ai-safety-governance-expert` — Log and audit AI outputs for compliance with safety policies.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "AI & LLM Integration" matrix row.
- `zero-to-prod-orchestrator` — Integrated in Phase 7 (DevOps, Deployment & Proactive Monitoring).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `data-telemetry-expert`, `logging-error-tracking-expert`, `llm-finops-router`, `ai-llm-integration-expert`, `frontier-ai-models-expert`, `context-window-engineer`, `kv-cache-prefix-optimizer`, `adaptive-model-cascade`, dan `ai-safety-governance-expert` untuk memberikan visibilitas end-to-end terhadap perilaku aplikasi AI di produksi.

### Deskripsi
Kerangka observabilitas produksi untuk aplikasi berbasis LLM. Mengatasi blind spot terbesar di aplikasi AI 2026: tim men-deploy fitur AI ke produksi tanpa visibilitas terhadap biaya token, tingkat halusinasi, distribusi latensi, rasio cache hit, atau skor kepuasan pengguna.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Men-deploy fitur berbasis LLM ke produksi (chatbot, asisten AI, generator kode).
- Menginvestigasi lonjakan biaya tak terduga di tagihan API AI.
- Men-debug laporan halusinasi atau degradasi kualitas output AI.
- Membangun dashboard untuk memonitor kesehatan fitur AI.

---

### Konsep Inti & Pola Praktik

#### 1. Metrik Inti yang Dilacak
Setiap panggilan LLM harus mencatat: traceId, model, provider, token (prompt/completion/cached), biaya total, cache hit rate, TTFT, latensi total, feedback pengguna, deteksi halusinasi, dan konteks fitur/user/tenant.

#### 2. Integrasi Langfuse
Gunakan Langfuse untuk tracing end-to-end setiap panggilan LLM, termasuk input prompt, output completion, penggunaan token, dan latensi.

#### 3. Deteksi Anomali Biaya
Implementasikan alert otomatis untuk: anggaran harian terlampaui, lonjakan biaya per-panggilan, dan penurunan cache hit rate.

---

### Praktik Terbaik

1. **Instrumenkan Setiap Panggilan LLM**: Tidak ada panggilan LLM yang boleh tidak dilacak.
2. **Lacak Biaya Per Fitur**: Agregasikan biaya berdasarkan nama fitur untuk mengidentifikasi fungsi AI termahal.
3. **Atur Alert Anggaran Sejak Awal**: Konfigurasikan alert biaya harian/mingguan sebelum ke produksi.
4. **Kumpulkan Sinyal Feedback Pengguna**: Implementasikan tombol thumbs up/down pada output AI.

---

### Integrasi dengan Skill Lain (WAJIB)

- `data-telemetry-expert` — Perluas instrumentasi OpenTelemetry dengan span dan metrik khusus LLM.
- `llm-finops-router` — Kirim data biaya real-time ke router FinOps.
- `kv-cache-prefix-optimizer` — Pantau cache hit rate untuk deteksi invalidasi prefix cache.
- `logging-error-tracking-expert` — Integrasikan trace LLM dengan pelacakan error Sentry.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Ditambahkan ke baris "AI & LLM Integration" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Diintegrasikan di Fase 7 (DevOps, Deployment & Proactive Monitoring).
