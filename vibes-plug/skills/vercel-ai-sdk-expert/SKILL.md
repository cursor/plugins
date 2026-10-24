---
name: vercel-ai-sdk-expert
description: "Expert guide for Vercel AI SDK (Core, UI, RSC), streaming structured data, multi-provider model switching, tool calling loops, and React 19/Next.js 15 AI engineering / Panduan ahli Vercel AI SDK, streaming data terstruktur, dan integrasi AI pada React 19/Next.js 15."
author: "Roedy Rustam"
version: "4.3.0"
---

# Vercel AI SDK Expert (Core, UI & Fullstack AI Engineering)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with domain skills like `senior-frontend`, `nextjs-app-router-expert`, `ai-llm-integration-expert`, `design-system-architect, senior-frontend`, and `multi-agent-orchestration` to deliver reactive, streaming AI interfaces.

### Description
Production-grade guide for building AI applications using the **Vercel AI SDK (Core & UI)**. Covers unified model provider abstraction (`@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`), streaming text and structured objects (`streamText`, `streamObject`), dynamic multi-step tool execution loops with `maxSteps`, client-side React 19 hooks (`useChat`, `useCompletion`), streaming data attachments (`createDataStreamResponse`), and generative UI rendering.

**Swarm Synergy:** Within the **Frontend & UI Swarm**, this skill serves as the AI UI Presentation Lead. It translates complex backend multi-agent outputs and streaming tokens into accessible, beautiful web components in Phase 4 & Phase 5.

### Trigger Conditions
- Integrating conversational chat, streaming completions, or generative UI in React 19 / Next.js 15.
- Implementing structured data extraction using `generateObject` or `streamObject` with Zod schemas.
- Building autonomous multi-step tool-calling loops on Next.js Route Handlers or Server Actions.
- Switching seamlessly across frontier providers (Claude 5.1 Fable / 5 Sonnet, Gemini 4 Pro / Flash, OpenAI GPT-5.6 / o3 / GPT-4.5, Ollama).
- Building streaming data channels with custom metadata, tool status indicators, and citations.

### Vercel AI SDK Architecture (Core vs UI)

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
│  useChat / useCompletion / Generative UI React Components    │
│  • Optimistic updates  • Stream reader  • Tool invocation   │
└──────────────────────────────▲──────────────────────────────┘
                               │ HTTP SSE / Data Stream Protocol
┌──────────────────────────────▼──────────────────────────────┐
│                    SERVER ROUTE / ACTION                    │
│  streamText({                                               │
│    model: anthropic('claude-3-7-sonnet-20250219'),          │
│    tools: { weatherTool, dbQueryTool },                     │
│    maxSteps: 5,                                             │
│  }).toDataStreamResponse()                                  │
└─────────────────────────────────────────────────────────────┘
```

### Core Implementation Guidelines

#### 1. Next.js 15 Route Handler with Multi-Step Tool Calling Loop
Use `streamText` with `maxSteps` to enable the model to autonomously call tools, review results, and continue reasoning:
```typescript
// app/api/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 60; // Allow long-running agentic reasoning

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-3-7-sonnet-20250219'),
    messages,
    maxSteps: 5, // Enables iterative tool calling loop
    tools: {
      calculateMetrics: tool({
        description: 'Computes analytical metrics from raw time series data',
        parameters: z.object({
          datasetId: z.string(),
          metricType: z.enum(['p95_latency', 'error_rate', 'throughput']),
        }),
        execute: async ({ datasetId, metricType }) => {
          const data = await fetchDatasetMetrics(datasetId, metricType);
          return { datasetId, metricType, value: data.result };
        },
      }),
    },
    system: 'You are an elite software performance auditor. Always back up your conclusions with data tool outputs.',
  });

  return result.toDataStreamResponse();
}
```

#### 2. Streaming Type-Safe Structured Objects (`streamObject`)
Stream structured JSON objects directly into the UI while generating:
```typescript
import { google } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { codeDiff } = await req.json();

  const result = streamObject({
    model: google('gemini-4-flash'),
    schema: z.object({
      securityVulnerabilities: z.array(z.object({
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        cwe: z.string(),
        explanation: z.string(),
        suggestedFix: z.string(),
      })),
      overallRiskScore: z.number().min(0).max(100),
      passesReview: z.boolean(),
    }),
    prompt: `Audit the following git diff for security regressions:\n${codeDiff}`,
  });

  return result.toTextStreamResponse();
}
```

#### 3. Client Hook Integration (`useChat` with Tool Invocations)
Render real-time streaming tokens, loading skeletons, and interactive tool call results:
```tsx
'use client';

import { useChat } from '@ai-sdk/react';

export function AgenticChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    maxSteps: 5,
  });

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto border rounded-xl p-4 bg-background">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg max-w-[80%] ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.toolInvocations?.map((toolInvocation) => (
                <div key={toolInvocation.toolCallId} className="mt-2 text-xs p-2 bg-black/10 rounded">
                  <span className="font-semibold">Tool [{toolInvocation.toolName}]:</span>{' '}
                  {'result' in toolInvocation ? JSON.stringify(toolInvocation.result) : 'Executing...'}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask the agent..."
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
          Send
        </button>
      </form>
    </div>
  );
}
```

#### 4. Reasoning Token Streaming
Handle `part.type === 'reasoning'` in streamText responses to build collapsible thinking UIs.

Provider-specific thinking configuration:
- Anthropic: `thinking: { type: 'enabled', budgetTokens: 10000 }`
- Google: `thinkingConfig: { thinkingBudget: 10000 }`
- OpenAI: `reasoningEffort: 'high'`

```typescript
// Server: Route handler with reasoning streaming
const result = streamText({
  model: anthropic('claude-3-7-sonnet-20250219'),
  prompt: userMessage,
  providerOptions: {
    anthropic: { thinking: { type: 'enabled', budgetTokens: 10000 } }
  }
});
```

```tsx
// Client: React component rendering reasoning accordion
{message.parts?.map((part, i) => {
  if (part.type === 'reasoning') {
    return <ThinkingAccordion key={i} content={part.reasoning} />;
  }
  if (part.type === 'text') {
    return <Markdown key={i}>{part.text}</Markdown>;
  }
})}
```

#### 5. Multimodal Attachments in useChat
Handle user-uploaded images and documents in `useChat` using `experimental_attachments` in the chat input. This allows sending base64 or URL-based image attachments to vision models.

```tsx
const { messages, input, handleSubmit, handleInputChange } = useChat();

const handleFileUpload = (files: FileList) => {
  // Convert to data URLs or upload to storage
};

handleSubmit(e, { experimental_attachments: attachments });
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `senior-frontend`, `nextjs-app-router-expert`, `ai-llm-integration-expert`, `design-system-architect, senior-frontend`, dan `multi-agent-orchestration` untuk menghadirkan antarmuka AI yang reaktif dan berlatensi rendah.

### Deskripsi
Panduan produksi untuk membangun aplikasi AI menggunakan **Vercel AI SDK (Core & UI)**. Mencakup abstraksi penyedia model terpadu (`@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`), streaming teks dan objek terstruktur (`streamText`, `streamObject`), siklus eksekusi tool multi-langkah otonom dengan `maxSteps`, hook klien React 19 (`useChat`, `useCompletion`), streaming respons saluran data (`createDataStreamResponse`), dan rendering Generative UI.

**Sinergi Swarm:** Di dalam **Frontend & UI Swarm**, skill ini berperan sebagai Pemimpin Presentasi UI AI. Skill ini bertugas mentransformasikan keluaran multi-agen backend dan token streaming menjadi komponen web yang interaktif, aksesibel, dan elegan pada Fase 4 & Fase 5.

### Kondisi Pemicu
- Mengintegrasikan chat percakapan, streaming respons, atau generative UI di React 19 / Next.js 15.
- Menerapkan ekstraksi data terstruktur dengan validasi skema Zod via `generateObject` atau `streamObject`.
- Membangun loop pemanggilan tool (*tool-calling loops*) multi-langkah di Route Handler atau Server Actions.
- Beralih fleksibel antar penyedia model frontier (Claude 5.1 Fable / 5 Sonnet, Gemini 4 Pro / Flash, OpenAI GPT-5.6 / o3 / GPT-4.5, Ollama).
- Mengelola status eksekusi tool, indikator loading, dan rendering komponen UI secara dinamis saat streaming berlangsung.

---

### Implementasi Pola Kunci (TypeScript & React 19)

#### 1. Next.js 15 Route Handler dengan Multi-Step Tool Calling Loop
```typescript
// app/api/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 60; // Izinkan penalaran agen hingga 60 detik

export async function POST(req: Request) {
  const { messages } = await req.json();

  const hasil = streamText({
    model: anthropic('claude-3-7-sonnet-20250219'),
    messages,
    maxSteps: 5, // Mengaktifkan siklus pemanggilan tool multi-langkah
    tools: {
      hitungMetrikPerforma: tool({
        description: 'Menghitung metrik performa aplikasi dari data mentah',
        parameters: z.object({
          datasetId: z.string(),
          metrik: z.enum(['p95_latensi', 'tingkat_error', 'throughput']),
        }),
        execute: async ({ datasetId, metrik }) => {
          const data = await ambilMetrikSistem(datasetId, metrik);
          return { datasetId, metrik, nilai: data.hasil };
        },
      }),
    },
    system: 'Anda adalah auditor performa perangkat lunak elit. Selalu sertakan bukti dari pemanggilan tool.',
  });

  return hasil.toDataStreamResponse();
}
```

#### 2. Streaming Objek Terstruktur Type-Safe (`streamObject`)
```typescript
import { google } from '@ai-sdk/google';
import { streamObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { diffKode } = await req.json();

  const hasil = streamObject({
    model: google('gemini-4-flash'),
    schema: z.object({
      kerentananKeamanan: z.array(z.object({
        tingkatKeparahan: z.enum(['rendah', 'sedang', 'tinggi', 'kritis']),
        cwe: z.string(),
        penjelasan: z.string(),
        saranPerbaikan: z.string(),
      })),
      skorRisikoGlobal: z.number().min(0).max(100),
      lolosReview: z.boolean(),
    }),
    prompt: `Audit perubahan kode berikut untuk regresi keamanan:\n${diffKode}`,
  });

  return hasil.toTextStreamResponse();
}
```

#### 3. Integrasi Hook Klien React 19 (`useChat` dengan Invocations Tool)
```tsx
'use client';

import { useChat } from '@ai-sdk/react';

export function AntarmukaChatAgen() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    maxSteps: 5,
  });

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-900">
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg max-w-[80%] text-sm ${m.role === 'user' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'}`}>
              <div className="whitespace-pre-wrap">{m.content}</div>
              {m.toolInvocations?.map((invokasi) => (
                <div key={invokasi.toolCallId} className="mt-2 text-xs p-2 bg-black/10 dark:bg-white/10 rounded font-mono">
                  <span className="font-semibold">Tool [{invokasi.toolName}]:</span>{' '}
                  {'result' in invokasi ? JSON.stringify(invokasi.result) : 'Mengeksekusi...'}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Tanyakan analisis pada agen..."
          className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded bg-transparent focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-100"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded disabled:opacity-50"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}
```