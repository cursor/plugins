---
name: speculative-multi-draft-synthesizer
description: "Expert guide for speculative multi-agent drafting, parallel hypothesis generation, AST-aware consensus arbitration, and multi-model code reconciliation / Panduan ahli penyusunan draf multi-agen spekulatif, generasi hipotesis paralel, arbitrase konsensus sadar-AST, dan rekonsiliasi kode multi-model."
author: "Roedy Rustam"
version: "4.3.0"
---

# speculative-multi-draft-synthesizer — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `brainstorming`, `zero-to-prod-orchestrator`, `multi-agent-orchestration`, `frontier-ai-models-expert`, `test-time-compute-optimizer`, and `living-codebase-ast-graph` to coordinate speculative multi-draft generation and frontier model consensus arbitration.

### Description
Production guide for architecting speculative multi-draft code synthesis pipelines. Dispatches high-concurrency, fast-draft subagents (powered by Gemini Flash or lightweight models) to generate competing implementation hypotheses in parallel, then feeds these candidates into a frontier arbiter model (Gemini 4 Pro, Claude Opus 5.5, or GPT Astra 6). The arbiter performs semantic AST reconciliation, extracting optimal algorithms, error boundaries, and type safety into a single superior implementation.

### Trigger Conditions
Activate this skill when:
- Solving complex, ambiguous algorithmic challenges where multiple valid architectural approaches exist.
- Designing high-scale microservices or critical algorithms where relying on a single model output risks blind spots.
- Combining strengths of multiple model families (e.g. Gemini long-context structural view + Claude rigorous type precision).
- Synthesizing large refactoring proposals submitted by concurrent swarm subagents.

---

### Core Concepts & Patterns

#### 1. Speculative Synthesis Swarm Topology

```
User Intent / Spec
       │
       ├───────────────────┬───────────────────┐
       ▼                   ▼                   ▼
Draft Agent A       Draft Agent B       Draft Agent C
(Algorithmic Focus) (Error Resilience)  (Type Rigor)
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
                  [FRONTIER ARBITER]
            (Gemini 4 Pro / Claude Opus 5.5)
                           │
                           ▼
              AST Reconciliation & Scoring
                           │
                           ▼
             Optimal Synthesized Solution
```

#### 2. Multi-Draft Arbiter Engine (TypeScript Implementation)

```typescript
export interface CandidateDraft {
  agentId: string;
  model: string;
  code: string;
  rationale: string;
}

export interface SynthesisEvaluation {
  selectedAlgorithmSource: string;
  selectedErrorStrategySource: string;
  selectedTypingSource: string;
  synthesizedCode: string;
  synthesisRationale: string;
}

export class SpeculativeDraftSynthesizer {
  public static buildArbiterPrompt(spec: string, drafts: CandidateDraft[]): string {
    const formattedDrafts = drafts
      .map(
        (draft, index) =>
          `### DRAFT ${index + 1} (From ${draft.agentId} using ${draft.model}):\n` +
          `Rationale: ${draft.rationale}\n\n` +
          `\`\`\`typescript\n${draft.code}\n\`\`\``
      )
      .join('\n\n---\n\n');

    return [
      'You are the Master Frontier Arbiter in an autonomous AI swarm.',
      'Your task is to analyze the following candidate code drafts for the given specification, identify their individual strengths, and synthesize a single, flawless, production-ready implementation.',
      '',
      'SPECIFICATION:',
      spec,
      '',
      'CANDIDATE DRAFTS:',
      formattedDrafts,
      '',
      'SYNTHESIS MANDATES:',
      '1. Take the highest-performance algorithmic core from the best candidate.',
      '2. Take the most exhaustive, error-resilient boundary handling from the best candidate.',
      '3. Enforce the strictest, most accurate TypeScript types without using "any".',
      '4. Output 100% complete, working production code without ellipses or placeholders.'
    ].join('\n');
  }

  public static reconcileDrafts(evalResult: SynthesisEvaluation): string {
    return evalResult.synthesizedCode;
  }
}
```

#### 3. Arbiter Selection Criteria
The arbiter reconciles drafts using four quantitative metrics:
- **Type Soundness**: Zero type assertions (`as unknown`), zero `any`, strict null safety.
- **Complexity Bound**: Minimal cyclomatic complexity and optimal Big-O time/space bounds.
- **Failure Resilience**: Complete error coverage, explicit domain error classes, no unhandled rejections.
- **Resource Footprint**: Minimal heap allocation, zero memory leaks, idiomatic resource cleanup.

---

### Best Practices

1. **Vary System Prompts Across Drafters**: Instruct Draft A to prioritize raw algorithmic speed, Draft B to prioritize error resilience, and Draft C to prioritize minimal memory footprint.
2. **Never Simply Pick One Winner**: Direct the arbiter to extract and fuse the best aspects of each draft into a unified hybrid AST.
3. **Run Ephemeral Sandbox Verification**: Before finalizing the synthesis, run the candidate through `ephemeral-wasm-sandbox-executor` to verify that all unit tests pass.
4. **Enforce Complete Implementations**: The arbiter must never emit truncated blocks; output must be fully executable on first compilation.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Operational Risk | Engineering Remedy |
| :--- | :--- | :--- |
| Asking one model to draft and critique itself | Shared blind spots and self-affirming hallucination | Spawn diverse model drafts (e.g. Gemini + Claude) |
| Naive text concatenation of code blocks | Syntax errors, duplicate variables, broken imports | Perform AST-level node reconciliation in arbiter |
| Discarding failed drafts without inspection | Lost insight into novel edge cases | Allow arbiter to review why certain edge branches were formed |

---

### Integration with Other Skills (MANDATORY)

- `multi-agent-orchestration` — Dispatch and monitor concurrent draft subagents.
- `frontier-ai-models-expert` — Configure frontier arbiter parameters across Gemini 4 Pro and Claude 5.5.
- `test-time-compute-optimizer` — Allocate elevated reasoning tokens for the final arbitration step.
- `living-codebase-ast-graph` — Ensure synthesized output complies with existing codebase dependency graphs.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "Integrasi AI & LLM" and "Frontier AI & Simulation" matrix rows.
- `zero-to-prod-orchestrator` — Integrated in Phase 1 (Discovery & PRD) and Phase 4 (Backend APIs & AI Agents).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `brainstorming`, `zero-to-prod-orchestrator`, `multi-agent-orchestration`, `frontier-ai-models-expert`, `test-time-compute-optimizer`, dan `living-codebase-ast-graph` untuk mengoordinasikan pembuatan draf spekulatif multi-agen dan arbitrase konsensus model frontier.

### Deskripsi
Panduan produksi untuk merancang pipeline sintesis kode berbasis draf spekulatif (*speculative multi-draft*). Menugaskan subagent berkecepatan tinggi secara paralel (seperti Gemini Flash atau model ringan) untuk menyusun beberapa hipotesis implementasi alternatif, kemudian menyerahkan draf-draf tersebut kepada model arbiter frontier (Gemini 4 Pro, Claude Opus 5.5, atau GPT Astra 6). Arbiter melakukan rekonsiliasi AST semantik guna menyatukan algoritma tercepat, penanganan error terkuat, dan ketepatan tipe terbaik menjadi satu solusi unggul.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Menyelesaikan masalah algoritma kompleks atau ambigu yang memiliki beberapa pendekatan arsitektur valid.
- Merancang microservices skala besar yang berisiko jika hanya mengandalkan perspektif satu model AI.
- Menggabungkan keunggulan keluarga model yang berbeda (misalnya konteks luas Gemini dengan ketelitian tipe Claude).
- Menyintesis proposal refaktor besar yang dikirimkan oleh beberapa sub-agen secara bersamaan.

---

### Konsep Inti & Pola Praktik

#### 1. Topologi Swarm Sintesis Spekulatif
1. **Penyebaran Draf (*Fan-Out*)**: Tiga sub-agen menghasilkan draf dengan fokus berbeda (Draf 1: performa algoritma, Draf 2: ketahanan error & edge cases, Draf 3: tipe data dan kesederhanaan arsitektur).
2. **Evaluasi Arbiter (*Consensus Arbitration*)**: Model frontier membedah kelebihan dan kekurangan dari setiap draf.
3. **Penyatuan Hibrida (*AST Reconciliation*)**: Arbiter mengambil bagian-bagian terbaik dari setiap kandidat untuk menghasilkan kode akhir yang lengkap.

#### 2. Kriteria Seleksi Arbiter
- **Ketelitian Tipe**: Nol tipe `any`, penanganan `null`/`undefined` yang ketat.
- **Kompleksitas Algoritma**: Kompleksitas waktu dan memori (Big-O) yang paling optimal.
- **Ketahanan Kegagalan**: Penanganan error menyeluruh tanpa *unhandled promise rejections*.

---

### Praktik Terbaik

1. **Variasikan Fokus Instruksi Draf**: Berikan peran yang berbeda pada tiap pembuat draf (kecepatan vs keamanan vs kesederhanaan).
2. **Jangan Hanya Memilih Satu Pemenang**: Perintahkan arbiter untuk memadukan modul-modul terbaik dari berbagai draf.
3. **Verifikasi dengan Sandbox**: Jalankan draf yang disintesis di `ephemeral-wasm-sandbox-executor` untuk membuktikan fungsionalitasnya.
4. **Keluaran 100% Lengkap**: Pastikan hasil akhir berupa kode produksi siap pakai tanpa placeholder.

---

### Jebakan Umum yang Harus Dihindari

| Praktik Buruk | Dampak Buruk | Solusi Rekayasa |
| :--- | :--- | :--- |
| Model mengkritik dan memperbaiki kodenya sendiri | Bias yang sama berulang (*shared blind spot*) | Gunakan model frontier yang berbeda sebagai arbiter independen |
| Penggabungan teks kode secara mentah | Kerusakan sintaksis dan deklarasi variabel ganda | Lakukan rekonsiliasi berbasis AST oleh arbiter |
| Membuang draf yang salah total | Kehilangan informasi tentang kemungkinan kegagalan | Berikan draf tersebut ke arbiter sebagai panduan apa yang harus dihindari |

---

### Integrasi dengan Skill Lain (WAJIB)

- `multi-agent-orchestration` — Mengatur eksekusi paralel sub-agen pembuat draf.
- `frontier-ai-models-expert` — Konfigurasi parameter arbiter frontier pada Gemini 4 Pro dan Claude 5.5.
- `test-time-compute-optimizer` — Mengalokasikan token penalaran tinggi untuk tahap arbitrase akhir.
- `living-codebase-ast-graph` — Menjaga agar hasil sintesis selaras dengan graf dependensi proyek.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Tambahkan ke baris "Integrasi AI & LLM" dan "Frontier AI & Simulation" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Tambahkan ke Fase 1 (Discovery & PRD) dan Fase 4 (Backend APIs & AI Agents).
