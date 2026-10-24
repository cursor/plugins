---
name: parallel-tool-orchestrator
description: "Expert guide for parallel tool execution, MCP batching (vibes_batch), asynchronous Promise.allSettled pipelines, subagent concurrent fan-out, and latency-optimized tool calling loops / Panduan ahli eksekusi tool paralel dan batching MCP."
author: "Roedy Rustam"
version: "4.3.0"
---

# parallel-tool-orchestrator — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `multi-agent-orchestration`, `async-queue-temporal-expert`, `mcp-server-architect`, `performance-web-vitals`, `event-driven-architect`, and `zero-to-prod-orchestrator` to accelerate multi-tool execution pipelines.

### Description
Production guide for optimizing AI agent tool-calling throughput by executing independent tool invocations in parallel. Frontier models (Gemini 4, Claude 3.7/5.1, GPT-5) natively generate multi-tool calls in a single turn. Executing these calls sequentially creates unnecessary network round-trips and escalates latency. This skill provides architectures for parallel tool orchestration using Model Context Protocol batching (`vibes_batch`), resilient `Promise.allSettled` execution, automated dependency DAG resolution, and non-blocking background task workers.

### Trigger Conditions
Activate this skill when:
- Designing AI agents that call multiple inspection tools (e.g. querying AST symbols, checking memory, and scanning SQL DDL in one step).
- Running Fan-Out / Fan-In swarm topologies with multiple concurrent leaf workers.
- Mitigating high agentic latency on complex multi-step workflows.
- Handling partial tool execution failures without crashing the entire agent loop.

---

### Parallel Batching Architecture

```
MODEL EMITS MULTIPLE TOOL CALLS
              │
              ▼
┌───────────────────────────────┐
│ MCP BATCH DISPATCHER          │  vibes_batch wrapper
└─────────────┬─────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
  TOOL 1    TOOL 2    TOOL 3     Executed simultaneously
  (AST)     (Mem)     (SQL)      via Promise.allSettled()
    │         │         │
    └─────────┼─────────┘
              ▼
┌───────────────────────────────┐
│ AGGREGATED BATCH RESULT       │  Returns successful results and isolated errors
└───────────────────────────────┘
```

#### 1. Resilient Parallel Dispatcher Implementation (TypeScript)

```typescript
export interface ToolCall {
  tool: string;
  arguments: Record<string, any>;
}

export interface BatchResult<T = any> {
  batchSize: number;
  successful: number;
  failed: number;
  results: Array<{
    tool: string;
    success: boolean;
    data?: T;
    error?: string;
  }>;
}

export async function executeParallelBatch(
  calls: ToolCall[],
  executor: (call: ToolCall) => Promise<any>
): Promise<BatchResult> {
  if (!Array.isArray(calls) || calls.length === 0) {
    throw new Error('Batch calls must be a non-empty array.');
  }

  const executed = await Promise.allSettled(
    calls.map(async (c) => {
      const data = await executor(c);
      return { tool: c.tool, success: true, data };
    })
  );

  const results = executed.map((res, i) => {
    if (res.status === 'fulfilled') {
      return res.value;
    }
    return {
      tool: calls[i].tool,
      success: false,
      error: res.reason?.message || 'Execution error'
    };
  });

  const successful = results.filter(r => r.success).length;

  return {
    batchSize: calls.length,
    successful,
    failed: calls.length - successful,
    results
  };
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasikan skill `multi-agent-orchestration`, `async-queue-temporal-expert`, `mcp-server-architect`, `performance-web-vitals`, `event-driven-architect`, dan `zero-to-prod-orchestrator` untuk mengakselerasi pipeline eksekusi multi-tool.

### Deskripsi
Panduan produksi untuk mengoptimalkan throughput eksekusi tool agen AI dengan menjalankan pemanggilan tool independen secara bersamaan (paralel). Model frontier modern dapat menghasilkan beberapa tool call dalam satu giliran. Menjalankan panggilan secara berurutan menghasilkan latensi jaringan yang lambat. Skill ini menyediakan arsitektur orkestrasi tool paralel memanfaatkan batching Model Context Protocol (`vibes_batch`), eksekusi tangguh `Promise.allSettled`, resolusi DAG dependensi, dan penanganan kegagalan isolatif.

### Kondisi Pemicu
- Merancang agen AI yang memanggil beberapa tool analisis sekaligus dalam satu turn.
- Menjalankan topologi swarm Fan-Out / Fan-In dengan banyak pekerja konkuren.
- Mengurangi latensi pada workflow agentic yang kompleks.
- Mencegah kegagalan parsial tool menggugurkan keseluruhan sesi percakapan agen.

---

### Implementasi Dispatcher Paralel yang Tangguh (TypeScript)

```typescript
export interface PanggilanTool {
  tool: string;
  arguments: Record<string, any>;
}

export interface HasilBatch<T = any> {
  totalPanggilan: number;
  sukses: number;
  gagal: number;
  rincian: Array<{
    tool: string;
    berhasil: boolean;
    data?: T;
    pesanError?: string;
  }>;
}

export async function eksekusiBatchParalel(
  daftarPanggilan: PanggilanTool[],
  eksekutor: (panggilan: PanggilanTool) => Promise<any>
): Promise<HasilBatch> {
  if (!Array.isArray(daftarPanggilan) || daftarPanggilan.length === 0) {
    throw new Error('Daftar panggilan tool tidak boleh kosong.');
  }

  // Eksekusi seluruh tool call secara bersamaan
  const eksekusi = await Promise.allSettled(
    daftarPanggilan.map(async (p) => {
      const data = await eksekutor(p);
      return { tool: p.tool, berhasil: true, data };
    })
  );

  const rincian = eksekusi.map((res, i) => {
    if (res.status === 'fulfilled') {
      return res.value;
    }
    return {
      tool: daftarPanggilan[i].tool,
      berhasil: false,
      pesanError: res.reason?.message || 'Galat eksekusi tool'
    };
  });

  const sukses = rincian.filter((r) => r.berhasil).length;

  return {
    totalPanggilan: daftarPanggilan.length,
    sukses,
    gagal: daftarPanggilan.length - sukses,
    rincian
  };
}
```