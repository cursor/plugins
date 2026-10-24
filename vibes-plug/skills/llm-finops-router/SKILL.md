---
name: llm-finops-router
description: Expert guide for AI FinOps, dynamic model routing (LiteLLM, Portkey, RouteLLM), cost optimization, budget enforcement, semantic caching, and latency-based fallback architectures / Panduan ahli untuk AI FinOps, routing model dinamis, optimasi biaya, penegakan anggaran, semantic caching, dan arsitektur fallback berbasis latensi.
author: "Roedy Rustam"
version: "4.3.0"
---

# LLM FinOps & Dynamic Model Router

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration

Connects and orchestrates with:
- `ai-llm-integration-expert` — base LLM integration patterns
- `vercel-ai-sdk-expert` — streaming + tool-call routing on the edge
- `multi-agent-orchestration` — per-agent budget allocation
- `cloud-hosting-expert` — gateway deployment (Vercel, Cloudflare, AWS)
- `llm-observability-expert` — Langfuse traces + cost dashboards
- `adaptive-model-cascade` — complexity-scored model selection
- `kv-cache-prefix-optimizer` — KV-cache hit maximization to cut costs

---

### Purpose

Optimize operational costs, reliability, and latency of multi-model LLM architectures using dynamic routing, provider fallback chains, semantic caching, and real-time FinOps analytics. Target: **40–70% reduction in monthly LLM spend** without degrading output quality.

---

### 1. LiteLLM v1.x — Deep Configuration Guide

LiteLLM provides a unified OpenAI-compatible interface across 100+ LLM providers with built-in fallback, retries, and budget management.

#### Install & Start Proxy

```bash
pip install litellm[proxy]
litellm --config litellm_config.yaml --port 4000
```

#### `litellm_config.yaml` — Full Production Config

```yaml
model_list:
  - model_name: fast-tier            # Virtual name used by clients
    litellm_params:
      model: gemini/gemini-3.8-flash
      api_key: os.environ/GEMINI_API_KEY
      rpm: 1000
      tpm: 2000000

  - model_name: fast-tier            # Fallback 1 for fast-tier
    litellm_params:
      model: groq/llama-3.1-8b-instant
      api_key: os.environ/GROQ_API_KEY
      rpm: 600

  - model_name: reasoning-tier
    litellm_params:
      model: anthropic/claude-5-sonnet
      api_key: os.environ/ANTHROPIC_API_KEY
      rpm: 100
      tpm: 400000

  - model_name: reasoning-tier       # Fallback 1 for reasoning-tier
    litellm_params:
      model: gemini/gemini-4-pro
      api_key: os.environ/GEMINI_API_KEY
      rpm: 60

  - model_name: embedding-tier
    litellm_params:
      model: text-embedding-3-small
      api_key: os.environ/OPENAI_API_KEY

router_settings:
  routing_strategy: least-busy        # Options: simple-shuffle | least-busy | latency-based-routing | cost-based-routing
  enable_pre_call_checks: true
  num_retries: 3
  retry_after: 2                      # seconds between retries
  timeout: 60
  fallbacks:
    - fast-tier: [groq/llama-3.1-8b-instant, openai/gpt-4o-mini]
    - reasoning-tier: [gemini/gemini-4-pro, openai/gpt-5]
  context_window_fallbacks:
    - reasoning-tier: [gemini/gemini-4-pro]  # 2M+ context fallback

litellm_settings:
  success_callback: ["langfuse"]
  failure_callback: ["langfuse"]
  cache: true
  cache_params:
    type: redis
    host: os.environ/REDIS_HOST
    port: 6379
    password: os.environ/REDIS_PASSWORD
    ttl: 600                          # Cache TTL in seconds
    similarity_threshold: 0.92        # Semantic cache hit threshold

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL  # PostgreSQL for spend tracking

# Virtual Keys with per-user budget limits
virtual_keys:
  - key: sk-agent-research
    user_id: agent-research
    max_budget: 5.00                  # USD per day
    budget_duration: 1d
    allowed_models: [fast-tier, embedding-tier]
  - key: sk-agent-code
    user_id: agent-code
    max_budget: 10.00
    budget_duration: 1d
    allowed_models: [fast-tier, reasoning-tier]
```

#### Python: Dynamic Routing via LiteLLM Client

```python
import litellm
from litellm import acompletion

async def route_by_complexity(prompt: str, complexity_score: float) -> str:
    """
    Routes to fast-tier (<0.5) or reasoning-tier (>=0.5) based on score.
    complexity_score: 0.0 (trivial) → 1.0 (very complex)
    """
    model = "reasoning-tier" if complexity_score >= 0.5 else "fast-tier"

    response = await acompletion(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        api_base="http://localhost:4000",
        api_key="sk-agent-code",
        metadata={
            "generation_name": "dynamic-route",
            "tags": ["finops", f"complexity:{complexity_score:.2f}"],
        },
    )
    return response.choices[0].message.content
```

---

### 2. Portkey AI Gateway — Production Setup

Portkey adds a middleware layer over LLM providers with semantic caching, canary routing, observability, and guardrails.

```bash
npm install portkey-ai
```

#### TypeScript: Portkey Gateway with Fallback & Semantic Cache

```typescript
import Portkey from "portkey-ai";

const portkey = new Portkey({
  apiKey: process.env.PORTKEY_API_KEY!,
  config: {
    strategy: { mode: "fallback" },
    targets: [
      {
        provider: "anthropic",
        api_key: process.env.ANTHROPIC_API_KEY!,
        override_params: { model: "claude-opus-4-5", max_tokens: 4096 },
        weight: 1,
      },
      {
        // Fallback if Anthropic fails or is rate-limited
        provider: "google",
        api_key: process.env.GEMINI_API_KEY!,
        override_params: { model: "gemini-2.5-pro", max_tokens: 4096 },
      },
    ],
    cache: {
      mode: "semantic",               // Semantic similarity matching
      max_age: 3600,                  // 1 hour TTL
    },
    retry: { attempts: 3, on_status_codes: [429, 500, 502, 503] },
  },
});

export async function callWithPortkey(
  prompt: string,
  userId: string,
): Promise<string> {
  const response = await portkey.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "claude-opus-4-5",
    // Portkey metadata for observability
    // @ts-expect-error — Portkey extends OpenAI types
    metadata: { _user: userId, environment: process.env.NODE_ENV },
  });

  return response.choices[0].message.content ?? "";
}
```

#### Portkey Canary Routing (A/B Test New Models)

```typescript
const portkey = new Portkey({
  apiKey: process.env.PORTKEY_API_KEY!,
  config: {
    strategy: { mode: "loadbalance" },
    targets: [
      {
        provider: "anthropic",
        api_key: process.env.ANTHROPIC_API_KEY!,
        override_params: { model: "claude-opus-4-5" },
        weight: 80,                   // 80% traffic to stable model
      },
      {
        provider: "anthropic",
        api_key: process.env.ANTHROPIC_API_KEY!,
        override_params: { model: "claude-opus-4-6-preview" },  // new model canary
        weight: 20,                   // 20% canary traffic
      },
    ],
  },
});
```

---

### 3. RouteLLM (Stanford) — Complexity Classifier Router

RouteLLM trains a binary classifier to decide whether a query needs a strong model or a weak model, achieving **strong-model call reduction of 40-85%** while preserving quality.

```bash
pip install routellm
```

#### Setup & Router Configuration

```python
from routellm.controller import Controller

# Initialize with a pre-trained classifier (matrix-factorization or causal-llm)
controller = Controller(
    routers=["mf"],                   # 'mf' = matrix-factorization (fastest)
    strong_model="gpt-4.1",
    weak_model="gpt-4o-mini",
    config={
        "mf": {
            "checkpoint_path": "routellm/mf-gpt4-turbo",  # HF checkpoint
        }
    },
    api_base=None,                    # Uses OpenAI API directly
    api_key=None,                     # Uses OPENAI_API_KEY env
)

# Threshold: higher = use weak model more aggressively
# 0.11875 = calibrated to 50% strong model call rate on MMLU benchmark
response = controller.chat.completions.create(
    model="router-mf-0.11875",        # router-{name}-{threshold}
    messages=[{"role": "user", "content": "What is the capital of France?"}],
)
print(response.choices[0].message.content)
```

#### Custom Task-Based Routing

```python
async def intelligent_route(task_type: str, prompt: str) -> str:
    """Route based on known task taxonomy."""
    FAST_TASKS = {"classification", "extraction", "summarization", "translation"}
    SLOW_TASKS = {"code_generation", "reasoning", "math", "planning", "creative"}

    use_strong = task_type in SLOW_TASKS
    model = "gpt-4.1" if use_strong else "gpt-4o-mini"

    import openai
    client = openai.AsyncOpenAI()
    resp = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.choices[0].message.content
```

---

### 4. Cost Calculation & Budget Enforcement

#### Per-Model Pricing Table (2026 approximate, USD per 1M tokens)

| Model | Input | Output | Cached Input |
|---|---|---|---|
| GPT-4.1 | \$2.00 | \$8.00 | \$0.50 |
| GPT-4o-mini | \$0.15 | \$0.60 | \$0.075 |
| Claude Opus 4.5 | \$15.00 | \$75.00 | \$1.50 |
| Claude Sonnet 4.5 | \$3.00 | \$15.00 | \$0.30 |
| Gemini 2.5 Pro | \$1.25 | \$10.00 | \$0.31 |
| Gemini 2.0 Flash | \$0.10 | \$0.40 | \$0.025 |
| Llama 3.1 8B (Groq) | \$0.05 | \$0.08 | — |
| text-embedding-3-small | \$0.02 | — | — |

#### TypeScript: Real-Time Cost Calculator

```typescript
interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cachedInputPerMillion?: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4.1":             { inputPerMillion: 2.00,  outputPerMillion: 8.00,  cachedInputPerMillion: 0.50 },
  "gpt-4o-mini":         { inputPerMillion: 0.15,  outputPerMillion: 0.60,  cachedInputPerMillion: 0.075 },
  "claude-opus-4-5":     { inputPerMillion: 15.00, outputPerMillion: 75.00, cachedInputPerMillion: 1.50 },
  "claude-sonnet-4-5":   { inputPerMillion: 3.00,  outputPerMillion: 15.00, cachedInputPerMillion: 0.30 },
  "gemini-2.5-pro":      { inputPerMillion: 1.25,  outputPerMillion: 10.00, cachedInputPerMillion: 0.31 },
  "gemini-2.0-flash":    { inputPerMillion: 0.10,  outputPerMillion: 0.40,  cachedInputPerMillion: 0.025 },
  "llama-3.1-8b-groq":   { inputPerMillion: 0.05,  outputPerMillion: 0.08 },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens = 0,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) throw new Error(`Unknown model: ${model}`);

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  const cachedCost = pricing.cachedInputPerMillion
    ? (cachedInputTokens / 1_000_000) * pricing.cachedInputPerMillion
    : 0;

  return inputCost + outputCost + cachedCost;
}

// Token Budget Guard — throws if projected cost exceeds daily cap
export async function guardedLLMCall(
  model: string,
  messages: Array<{ role: string; content: string }>,
  dailyBudgetUSD: number,
  spentTodayUSD: number,
): Promise<string> {
  const estimatedInputTokens = messages.reduce(
    (sum, m) => sum + Math.ceil(m.content.length / 4),
    0,
  );
  const estimatedCost = calculateCost(model, estimatedInputTokens, estimatedInputTokens * 2);

  if (spentTodayUSD + estimatedCost > dailyBudgetUSD) {
    // Cascade to cheaper model instead of rejecting
    const cheaperModel = "gemini-2.0-flash";
    console.warn(`Budget cap approaching. Cascading to ${cheaperModel}.`);
    return guardedLLMCall(cheaperModel, messages, dailyBudgetUSD, spentTodayUSD);
  }

  const { OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resp = await client.chat.completions.create({ model, messages } as Parameters<typeof client.chat.completions.create>[0]);
  return resp.choices[0].message.content ?? "";
}
```

---

### 5. Monitoring, Alerts & Daily Cost Caps

#### Langfuse Integration (spend tracking + tracing)

```python
from langfuse import Langfuse
from langfuse.decorators import langfuse_context, observe

langfuse = Langfuse(
    public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
    secret_key=os.environ["LANGFUSE_SECRET_KEY"],
    host=os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com"),
)

@observe(name="llm-call", as_type="generation")
async def tracked_llm_call(model: str, prompt: str, user_id: str) -> str:
    import litellm
    resp = await litellm.acompletion(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        metadata={"langfuse_user_id": user_id},
    )

    # Record cost for this generation
    cost = litellm.completion_cost(completion_response=resp)
    langfuse_context.update_current_observation(
        usage={
            "input": resp.usage.prompt_tokens,
            "output": resp.usage.completion_tokens,
            "unit": "TOKENS",
            "total_cost": cost,
        }
    )
    return resp.choices[0].message.content
```

#### Daily Cost Cap via Redis Counter

```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const DAILY_BUDGET_USD = parseFloat(process.env.LLM_DAILY_BUDGET_USD ?? "50");
const ALERT_THRESHOLD = 0.85; // Alert at 85% of budget

export async function trackAndCheckBudget(
  costUSD: number,
  slackWebhook?: string,
): Promise<{ allowed: boolean; spent: number; remaining: number }> {
  const key = `llm:spend:${new Date().toISOString().slice(0, 10)}`; // YYYY-MM-DD
  const spent = await redis.incrbyfloat(key, costUSD);
  await redis.expire(key, 86400 * 2); // 2 days TTL

  const remaining = DAILY_BUDGET_USD - spent;

  if (spent >= DAILY_BUDGET_USD * ALERT_THRESHOLD && slackWebhook) {
    await fetch(slackWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `⚠️ *LLM Budget Alert*: \$${spent.toFixed(4)} spent of \$${DAILY_BUDGET_USD} daily budget (${((spent / DAILY_BUDGET_USD) * 100).toFixed(1)}%).`,
      }),
    });
  }

  return { allowed: spent <= DAILY_BUDGET_USD, spent, remaining };
}
```

---

### 6. Complexity Scorer — Routing Decision Engine

```typescript
export interface ComplexityScore {
  score: number;           // 0.0 → 1.0
  tier: "fast" | "reasoning";
  reason: string;
}

const HIGH_COMPLEXITY_PATTERNS = [
  /step[ -]by[ -]step/i,
  /reason(ing|ed)/i,
  /code\s+(generation|review|refactor)/i,
  /math|calculation|equation/i,
  /analyze|synthesize|compare/i,
  /plan|architect|design system/i,
];

const LOW_COMPLEXITY_PATTERNS = [
  /translate/i,
  /summarize|tldr/i,
  /classify|label/i,
  /extract\s+(name|date|email|phone)/i,
  /yes or no/i,
  /what is the (capital|meaning)/i,
];

export function scoreComplexity(prompt: string): ComplexityScore {
  let score = 0.3; // baseline

  for (const pattern of HIGH_COMPLEXITY_PATTERNS) {
    if (pattern.test(prompt)) score = Math.min(score + 0.2, 1.0);
  }
  for (const pattern of LOW_COMPLEXITY_PATTERNS) {
    if (pattern.test(prompt)) score = Math.max(score - 0.2, 0.0);
  }

  // Penalize long prompts slightly toward reasoning tier
  if (prompt.length > 2000) score = Math.min(score + 0.1, 1.0);

  const tier = score >= 0.5 ? "reasoning" : "fast";
  const reason =
    tier === "reasoning"
      ? `High complexity (score: ${score.toFixed(2)}) — using frontier model`
      : `Low complexity (score: ${score.toFixed(2)}) — using fast model`;

  return { score, tier, reason };
}

export function selectModel(tier: "fast" | "reasoning"): string {
  return tier === "reasoning" ? "claude-opus-4-5" : "gemini-2.0-flash";
}
```

---

### 7. Full Routing Pipeline (TypeScript)

```typescript
import OpenAI from "openai";
import { scoreComplexity, selectModel } from "./complexity-scorer";
import { trackAndCheckBudget } from "./budget-tracker";
import { calculateCost } from "./cost-calculator";

const client = new OpenAI({
  baseURL: "http://localhost:4000",   // LiteLLM proxy
  apiKey: process.env.LITELLM_MASTER_KEY,
});

export async function smartRoute(
  prompt: string,
  userId: string,
): Promise<{ content: string; model: string; costUSD: number }> {
  const complexity = scoreComplexity(prompt);
  const model = selectModel(complexity.tier);

  const { allowed, spent } = await trackAndCheckBudget(0, process.env.SLACK_WEBHOOK);
  if (!allowed) {
    throw new Error(`Daily LLM budget exhausted. Spent: \$${spent.toFixed(2)}`);
  }

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    user: userId,
  });

  const inputTokens = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const costUSD = calculateCost(model, inputTokens, outputTokens);

  await trackAndCheckBudget(costUSD, process.env.SLACK_WEBHOOK);

  return {
    content: response.choices[0].message.content ?? "",
    model,
    costUSD,
  };
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi

Terhubung dan mengorkestrasi bersama:
- `ai-llm-integration-expert` — pola integrasi LLM dasar
- `vercel-ai-sdk-expert` — routing streaming + tool-call di edge
- `multi-agent-orchestration` — alokasi anggaran per-agen
- `cloud-hosting-expert` — deployment gateway (Vercel, Cloudflare, AWS)
- `llm-observability-expert` — trace Langfuse + dashboard biaya
- `adaptive-model-cascade` — pemilihan model berbasis skor kompleksitas
- `kv-cache-prefix-optimizer` — maksimasi KV-cache hit untuk memangkas biaya

---

### Tujuan

Mengoptimalkan biaya operasional, keandalan, dan latensi arsitektur LLM multi-model menggunakan routing dinamis, rantai fallback penyedia, semantic caching, dan analitik FinOps real-time. Target: **pengurangan pengeluaran LLM bulanan 40–70%** tanpa menurunkan kualitas output.

---

### 1. LiteLLM v1.x — Panduan Konfigurasi Mendalam

LiteLLM menyediakan antarmuka standar kompatibel OpenAI untuk 100+ penyedia LLM dengan fallback bawaan, retry, dan manajemen anggaran.

**File konfigurasi utama:** `litellm_config.yaml`

Konsep kunci:
- **`model_name`** (virtual name): nama yang dipakai klien — bisa didefinisikan lebih dari sekali untuk fallback otomatis
- **`litellm_params.model`**: nama model nyata di penyedia
- **`router_settings.routing_strategy`**: `least-busy`, `latency-based-routing`, atau `cost-based-routing`
- **Virtual Keys**: kunci API virtual dengan batas anggaran per pengguna (`max_budget: 5.00` per hari)
- **Semantic Cache**: Redis-backed, similarity threshold 0.92 — kueri serupa dikembalikan dari cache

Lihat konfigurasi lengkap di [Seksi English](#english).

---

### 2. Portkey AI Gateway

Portkey bertindak sebagai middleware di atas penyedia LLM, memberikan:
- **Semantic Caching**: mengembalikan respons cached untuk kueri dengan kemiripan >92%, hemat 30–50% token
- **Fallback Strategy**: jika Anthropic gagal, otomatis turun ke Gemini
- **Load Balance / Canary**: kirim 80% traffic ke model stabil, 20% ke model baru untuk A/B test
- **Retry Logic**: retry otomatis pada status 429/500/502/503 hingga 3 kali
- **Observability Hooks**: setiap panggilan dicatat dengan metadata pengguna dan lingkungan

---

### 3. RouteLLM (Stanford)

RouteLLM melatih classifier biner untuk memutuskan apakah kueri memerlukan model kuat atau model lemah. Hasil benchmark: **pengurangan panggilan model kuat 40–85%** sambil mempertahankan kualitas.

- **Router `mf`** (matrix-factorization): tercepat, direkomendasikan untuk produksi
- **Threshold `0.11875`**: dikalibrasi untuk 50% tingkat panggilan model kuat pada MMLU benchmark
- Gunakan format `router-mf-{threshold}` sebagai nama model

---

### 4. Formula Biaya & Penegakan Anggaran

**Formula dasar:**

```
biaya = (input_token / 1_000_000 × harga_input)
      + (output_token / 1_000_000 × harga_output)
      + (cached_input_token / 1_000_000 × harga_cached)
```

**Strategi penegakan anggaran:**
1. Estimasi biaya sebelum memanggil LLM berdasarkan panjang prompt
2. Periksa saldo anggaran harian dari Redis
3. Jika saldo hampir habis → cascade ke model lebih murah, BUKAN tolak permintaan
4. Kirim alert Slack ketika pengeluaran mencapai 85% dari batas harian

---

### 5. Monitoring & Alert Biaya

**Langfuse** digunakan untuk:
- Melacak biaya per generasi (`total_cost` dalam metadata observasi)
- Dashboard penggunaan token per pengguna, per model
- Deteksi anomali pengeluaran (lonjakan tak terduga)

**Redis Cost Counter** (via Upstash):
- Key format: `llm:spend:YYYY-MM-DD`
- Increment atomic menggunakan `INCRBYFLOAT`
- Alert Slack otomatis saat 85% dari `LLM_DAILY_BUDGET_USD` terlampaui

---

### 6. Scorer Kompleksitas

Sistem scoring berbasis pola regex:
- **Pattern complexity tinggi**: `reasoning`, `code generation`, `analyze`, `plan`, `math` → tambah +0.2 skor
- **Pattern complexity rendah**: `translate`, `summarize`, `classify`, `extract` → kurangi -0.2 skor
- **Prompt panjang >2000 karakter**: tambah +0.1 skor
- **Threshold routing**: score ≥ 0.5 → reasoning tier; score < 0.5 → fast tier

Contoh implementasi TypeScript dan Python yang lengkap tersedia di [seksi English](#english).

---

### Anti-Slop Checklist FinOps

- [ ] Tidak ada penolakan hard saat anggaran penuh — selalu cascade ke model lebih murah
- [ ] Setiap panggilan LLM direkam dengan `user_id`, `model`, `cost_usd`, `input_tokens`, `output_tokens`
- [ ] Semantic cache aktif di gateway (Portkey atau LiteLLM Redis)
- [ ] Alert Slack dikonfigurasi pada 85% batas harian
- [ ] Virtual keys digunakan untuk isolasi anggaran per agen/tim
- [ ] Complexity scorer diuji pada setidaknya 50 prompt representatif sebelum deploy
