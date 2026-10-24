---
name: mcp-sampling-critic
description: "Expert guide for MCP client sampling (sampling/createMessage), Critic-in-the-Loop agentic quality gates, autonomous human-in-the-loop emulation, and multi-model consensus verification / Panduan ahli sampling MCP client, quality gate agen Critic-in-the-Loop, dan verifikasi konsensus multi-model."
author: "Roedy Rustam"
version: "4.3.0"
---

# mcp-sampling-critic — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `mcp-server-architect`, `autonomous-red-teamer`, `ai-code-review-autonomous`, `speculative-multi-draft-synthesizer`, `anti-slop`, and `zero-to-prod-orchestrator` to establish autonomous Critic-in-the-Loop validation before any state or disk mutations.

### Description
Production protocol for leveraging Model Context Protocol (MCP v1.x) Client Sampling (`sampling/createMessage`) to create recursive adversarial quality gates. In standard architectures, tools execute code blindly upon invocation. With MCP Sampling, a specialized Critic engine pauses execution, initiates a nested sampling call to the host LLM (or a secondary frontier model), and asks the Critic model to inspect proposed diffs against the 7 Anti-Slop Pillars, security boundaries, and invariant state machines. Writes are only permitted when the Critic grants an `APPROVED` verdict.

### Trigger Conditions
Activate this skill when:
- Designing autonomous agent loops that modify filesystem files or execute database migrations.
- Implementing the `CRITIC_VALIDATOR` swarm topology where an implementer agent's draft must pass an independent quality audit.
- Eliminating AI-generated placeholders (`// TODO`), silent error suppressions, or SQL injection vectors before pull request creation.
- Enforcing human-in-the-loop or critic-in-the-loop safeguards without requiring manual human clicking.

---

### Critic-in-the-Loop Protocol Architecture

```
PROPOSED CODE DRAFT
        │
        ▼
┌───────────────────────────┐
│ STATIC REGEX & AST FILTER │  Instant rule scan (P1-P7 Anti-Slop, silent catches)
└─────────────┬─────────────┘
              │
  ┌───────────┴───────────┐
  ▼                       ▼
FAIL (Score < 85)     PASS (Score >= 85)
  │                       │
Reject immediately   ┌────▼────────────────────────┐
with suggestions     │ MCP SAMPLING REQUEST        │  sampling/createMessage
                     │ to Host LLM (Independent)   │
                     └────────────┬────────────────┘
                                  │
                                  ▼
                        FINAL CRITIC VERDICT
                     (APPROVED -> Write to disk)
```

#### 1. MCP Sampling Request Construction (TypeScript)

```typescript
export interface SamplingMessagePayload {
  messages: Array<{
    role: 'user' | 'assistant';
    content: { type: 'text'; text: string };
  }>;
  systemPrompt: string;
  maxTokens: number;
  modelPreferences?: {
    hints?: Array<{ name: string }>;
    costPriority?: number;
    speedPriority?: number;
    intelligencePriority?: number;
  };
}

export function buildCriticSamplingPayload(
  targetFile: string,
  proposedCode: string,
  staticFindings: Array<{ ruleName: string; message: string }>
): SamplingMessagePayload {
  const findingsSummary = staticFindings.length > 0
    ? staticFindings.map(f => `- ${f.ruleName}: ${f.message}`).join('\n')
    : 'None detected by initial AST filter.';

  return {
    systemPrompt: `You are the Sovereign Anti-Slop Critic (2026 Edition).
Perform a strict code audit against:
1. Zero placeholder stubs (// TODO, // ...rest of code).
2. Zero silent error suppression (empty catch blocks).
3. 5-state interactive UI contract (hover, focus-visible, active, disabled).
4. SQL injection prevention (parameterized queries only).
Output JSON: { "verdict": "APPROVED" | "REJECTED", "score": 0-100, "rationale": "..." }`,
    maxTokens: 2048,
    modelPreferences: {
      intelligencePriority: 1.0,
      costPriority: 0.2
    },
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Target: ${targetFile}\nPreliminary AST Warnings:\n${findingsSummary}\n\nCode to Audit:\n\`\`\`typescript\n${proposedCode}\n\`\`\``
        }
      }
    ]
  };
}
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasikan skill `mcp-server-architect`, `autonomous-red-teamer`, `ai-code-review-autonomous`, `speculative-multi-draft-synthesizer`, `anti-slop`, dan `zero-to-prod-orchestrator` untuk menetapkan validasi Critic-in-the-Loop otonom sebelum mutasi file atau database.

### Deskripsi
Protokol produksi untuk memanfaatkan *Client Sampling* pada Model Context Protocol (`sampling/createMessage`) guna membangun gerbang kualitas adversarial rekursif. Menggunakan MCP Sampling, server atau subagen menghentikan eksekusi sementara, melakukan panggilan sampling ke LLM host untuk mengaudit usulan perubahan kode terhadap 7 Pilar Anti-Slop, keamanan injeksi SQL, dan penanganan error. Kode hanya ditulis ke disk apabila mendapatkan status `APPROVED`.

### Kondisi Pemicu
- Merancang alur agen otonom yang memodifikasi file repositori atau migrasi basis data.
- Menjalankan topologi swarm `CRITIC_VALIDATOR` di mana draf implementer harus diverifikasi auditor independen.
- Menghapus stub placeholder malas (`// TODO`) dan penelanan error secara otomatis sebelum commit.

---

### Pembuatan Payload Permintaan MCP Sampling (TypeScript)

```typescript
export interface PayloadPesanSampling {
  messages: Array<{
    role: 'user' | 'assistant';
    content: { type: 'text'; text: string };
  }>;
  systemPrompt: string;
  maxTokens: number;
}

export function bangunPayloadSamplingCritic(
  fileTarget: string,
  drafKode: string,
  peringatanAwal: string[]
): PayloadPesanSampling {
  return {
    systemPrompt: `Anda adalah Auditor Anti-Slop Berdaulat (Edisi 2026).
Lakukan audit kode ketat terhadap:
1. Ketiadaan stub placeholder (// TODO, // ...rest of code).
2. Ketiadaan penelanan error diam-diam (empty catch block).
3. Kontrak 5-state UI interaktif (hover, focus-visible, active, disabled).
4. Pencegahan injeksi SQL (wajib parameterized query).
Keluarkan JSON: { "verdict": "APPROVED" | "REJECTED", "score": 0-100, "rationale": "..." }`,
    maxTokens: 2048,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `File: ${fileTarget}\nPeringatan AST Awal: ${peringatanAwal.join(', ')}\n\nKode yang Diaudit:\n\`\`\`typescript\n${drafKode}\n\`\`\``
        }
      }
    ]
  };
}
```