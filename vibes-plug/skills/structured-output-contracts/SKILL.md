---
name: structured-output-contracts
description: "Expert guide for agent-native structured outputs, JSON Schema strict mode enforcement (OpenAI response_format, Gemini schema mode, Claude tool_use), MCP resource schemas, and zero-hallucination type contracts / Panduan ahli kontrak output terstruktur native agen dan penegakan JSON schema ketat."
author: "Roedy Rustam"
version: "4.3.0"
---

# structured-output-contracts — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `spec-driven-development-expert`, `typescript-expert`, `openapi-swagger-codegen-expert`, `mcp-server-architect`, `anti-slop`, and `zero-to-prod-orchestrator` to guarantee zero-hallucination structured responses across multi-agent pipelines.

### Description
Production standard for enforcing strict JSON Schema output contracts across frontier LLMs. With modern models supporting grammar-constrained decoding (e.g. `response_format: { type: "json_schema", strict: true }` or Gemini `responseSchema`), AI agents must not rely on loose Markdown backticks (```json ... ```) with post-hoc regex parsing. This skill formalizes typed JSON schemas for Swarm Director plans, memory handoffs, anti-slop verification audits, and exposes them as native Model Context Protocol (MCP) resources (`vibes://schemas/*`).

### Trigger Conditions
Activate this skill when:
- Designing AI agent outputs that must be programmatically consumed by backend APIs or CI systems.
- Defining MCP Tools or MCP Resources requiring unambiguous parameter validation.
- Preventing JSON truncation, missing fields, or hallucinated types in multi-agent pipelines.
- Standardizing contract-first API boundaries between AI agents and database layers.

---

### Standard Output Schema Architecture

```
PROMPT + SCHEMA CONTRACT
           │
           ▼
┌─────────────────────────────────┐
│ GRAMMAR-CONSTRAINED DECODING    │  Enforces AST schema directly in token sampler
└─────────────────┬───────────────┘
                  │
                  ▼
        VALIDATED TYPED JSON
  (Zero parsing errors, 100% typed)
```

#### 1. Core Schema Contract Example (Swarm Plan)

```typescript
export const SWARM_PLAN_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'SwarmPlan',
  type: 'object',
  required: ['topology', 'reasoningProfile', 'subagents', 'totalWorkers'],
  additionalProperties: false,
  properties: {
    topology: {
      type: 'string',
      enum: ['fan-out-fan-in', 'pipeline-saga', 'critic-validator']
    },
    reasoningProfile: {
      type: 'string',
      enum: ['speed', 'balanced', 'deep', 'exhaustive']
    },
    thinkingBudgetTokens: {
      type: 'integer',
      minimum: 1024,
      maximum: 65536
    },
    totalWorkers: {
      type: 'integer',
      minimum: 1
    },
    subagents: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'name', 'role', 'skills'],
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string' },
          skills: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    }
  }
} as const;
```

#### 2. Multi-Provider Strict Enforcement Pattern

```typescript
export function applyStructuredContract(schema: object, provider: 'openai' | 'gemini' | 'claude') {
  if (provider === 'openai') {
    return {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: (schema as any).title || 'StructuredOutput',
          strict: true,
          schema
        }
      }
    };
  }
  if (provider === 'gemini') {
    return {
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    };
  }
  // Claude tool_use pattern for guaranteed structured response
  return {
    tools: [
      {
        name: 'submit_structured_output',
        description: 'Submit the final structured data matching schema',
        input_schema: schema
      }
    ],
    tool_choice: { type: 'tool', name: 'submit_structured_output' }
  };
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill `spec-driven-development-expert`, `typescript-expert`, `openapi-swagger-codegen-expert`, `mcp-server-architect`, `anti-slop`, dan `zero-to-prod-orchestrator` untuk menjamin respons terstruktur zero-hallucination pada pipeline multi-agen.

### Deskripsi
Standar produksi untuk menegakkan kontrak output JSON Schema ketat pada model-model frontier. Memanfaatkan *grammar-constrained decoding* (seperti `response_format: { type: "json_schema", strict: true }` atau Gemini `responseSchema`), agen AI dilarang mengandalkan teks Markdown mentah dengan parsing regex rentan gagal. Skill ini meresmikan skema typed JSON untuk perencanaan swarm, checkpoint memori, dan audit kualitas MCP resources (`vibes://schemas/*`).

### Kondisi Pemicu
- Merancang output agen AI yang harus diproses otomatis oleh API backend atau pipeline CI/CD.
- Mendefinisikan tool atau resource MCP yang memerlukan validasi parameter mutlak.
- Menghilangkan kegagalan format JSON atau field halusinasi pada swarm multi-agen.
- Menerapkan kontrak skema API seragam antara agen AI dan layer basis data.

---

### Pola Implementasi Penegakan Skema Ketat Multi-Provider (TypeScript)

```typescript
export function terapkanKontrakTerstruktur(skema: object, penyedia: 'openai' | 'gemini' | 'claude') {
  if (penyedia === 'openai') {
    return {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: (skema as any).title || 'OutputTerstruktur',
          strict: true,
          schema: skema
        }
      }
    };
  }

  if (penyedia === 'gemini') {
    return {
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: skema
      }
    };
  }

  // Claude: Gunakan pola tool_use dengan tool_choice eksplisit untuk respon terstruktur
  return {
    tools: [
      {
        name: 'kirim_output_terstruktur',
        description: 'Kirimkan data hasil akhir yang sesuai dengan skema JSON',
        input_schema: skema
      }
    ],
    tool_choice: { type: 'tool', name: 'kirim_output_terstruktur' }
  };
}
```