---
name: deep-research-analyst
description: "Expert guide for autonomous deep research, iterative web search, citation verification, evidence graph synthesis, and hallucination mitigation / Panduan ahli riset mendalam otonom, pencarian web iteratif, verifikasi sitasi, dan mitigasi halusinasi."
author: "Roedy Rustam"
version: "4.3.0"
---

# Deep Research Analyst (2026 Autonomous Research Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `prd-architect`, `web-scraper`, `browser-automation-expert`, `session-memory-manager`, and `multi-agent-orchestration` to form an evidence-backed intelligence swarm.

### Description
Production guide for architecting and executing autonomous **Deep Research** pipelines. Unlike simple one-shot retrieval (RAG), Deep Research operates as a goal-directed autonomous loop: decomposing queries into multi-perspective sub-questions, crawling and scraping academic/technical sources, scoring source credibility, cross-verifying facts across multiple independent citations, constructing an evidence graph, and synthesizing comprehensive, citation-grounded intelligence briefs.

**Swarm Synergy:** Within the **Fan-Out / Fan-In Research Swarm**, this skill acts as the Lead Intelligence Subagent. It is deployed in Phase 1 (Discovery & PRD) to gather ground truth, audit competitor architectures, and resolve high-risk technical unknowns before code is written.

### Trigger Conditions
- Requiring deep, multi-source investigation before architectural decision-making.
- Benchmarking libraries, database engines, or cloud architectures with empirical data.
- Building autonomous research agents, competitive intelligence scrapers, or literature synthesis tools.
- Eliminating LLM hallucinations in high-stakes technical or business documentation.
- Synthesizing complex multi-page web information into structured, cited intelligence reports.

### Deep Research Operational Workflow

```
1. QUERY DECOMPOSITION & HYPOTHESIS FORMULATION
   [User Objective] ──► [Query Expander] ──┬──► Sub-query A (Technical Specs)
                                           ├──► Sub-query B (Benchmarks & Limitations)
                                           └──► Sub-query C (Community Issues & Regressions)

2. RECURSIVE SOURCE DISCOVERY & CRAWLING
   [Sub-queries] ──► [Crawl4AI / Firecrawl / SerpAPI] ──► Raw Markdown / HTML Sources

3. SOURCE CREDIBILITY & FACT TRIANGULATION
   Raw Documents ──► [Evidence Evaluator] ──► Triangulate Facts (>= 2 Independent Sources)
                                          ──► Discard Low-Trust / SEO-Spam Content

4. EVIDENCE GRAPH SYNTHESIS & REPORTING
   Verified Facts ──► [Synthesizer Node] ──► Structured Report with Clickable Markdown Citations
```

### Core Implementation Guidelines

#### 1. Recursive Query Decomposer (Python / TypeScript)
Break high-level user requests into diverse search vectors targeting technical documentation, GitHub issues, and benchmarks:
```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

interface ResearchPlan {
  coreObjective: string;
  subQueries: Array<{
    query: string;
    focus: 'architecture' | 'benchmarks' | 'security' | 'pitfalls';
    expectedSourceType: 'docs' | 'github_repo' | 'benchmark_paper';
  }>;
}

export async function decomposeResearchQuery(userPrompt: string): Promise<ResearchPlan> {
  const { object } = await generateObject({
    model: customModel('gemini-3.8-flash'),
    schema: z.object({
      coreObjective: z.string(),
      subQueries: z.array(z.object({
        query: z.string().describe('Precise keyword search query with technical operators'),
        focus: z.enum(['architecture', 'benchmarks', 'security', 'pitfalls']),
        expectedSourceType: z.enum(['docs', 'github_repo', 'benchmark_paper']),
      })).min(3).max(6),
    }),
    prompt: `Analyze the following research objective and decompose it into 4-6 targeted, non-overlapping search vectors: "${userPrompt}"`,
  });

  return object;
}
```

#### 2. Python Implementation: Autonomous Extraction
```python
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
from pydantic import BaseModel, Field
from pydantic_ai import Agent

class ResearchFinding(BaseModel):
    claim: str = Field(description="Technical claim extracted")
    confidence: float = Field(ge=0, le=1, description="Confidence score")
    source_url: str = Field(description="Source URL")
    corroborating_sources: list[str] = Field(default_factory=list)

research_agent = Agent(
    'google:gemini-3.8-flash',
    result_type=list[ResearchFinding],
    system_prompt="Extract and verify technical claims with confidence scores."
)

async def deep_research(query: str) -> list[ResearchFinding]:
    config = CrawlerRunConfig(cache_mode=CacheMode.BYPASS)
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=f"https://search-url/{query}", config=config)
        findings = await research_agent.run(result.markdown)
        return findings.data
```

#### 3. Vector Store Caching for Intermediate Results
Caching intermediate research results in vector stores prevents redundant crawling and accelerates knowledge retrieval:
- **Storage:** Use `pgvector` or local `FAISS` for caching crawled page embeddings.
- **Deduplication:** Deduplicate sources via cosine similarity before processing.
- **Invalidation:** Implement TTL-based cache invalidation for time-sensitive research (e.g., fast-moving API docs).
- **Example Flow:**
  ```python
  # Store page chunks in vector store
  vector_store.add_texts(chunks, metadata=[{"url": url, "timestamp": now}])
  # Retrieve similar past findings
  cached = vector_store.similarity_search(query, k=3, filter={"ttl_valid": True})
  ```

#### 4. Episodic Research Memory
Maintain research memory across sessions to build continuous intelligence:
- **Storage:** Store research dossiers as episodic memories in `session-memory-manager`.
- **Knowledge Graphs:** Build cumulative knowledge graphs from multiple research sessions, linking related concepts over time.
- **Cross-referencing:** Cross-reference past findings with new queries to compound understanding without starting from scratch.

#### 5. Source Credibility & Fact Triangulation Protocol
Never accept a claim from a single unverified blog post. Require citation triangulation:
- **Tier 1 (Highest Confidence):** Official documentation, source code repositories, peer-reviewed benchmarks, RFCs.
- **Tier 2 (Medium Confidence):** Production engineering blogs (Uber, Netflix, Cloudflare), maintainer posts.
- **Tier 3 (Verify Required):** Forum discussions, social threads, unverified community tutorials.
- **Rule of Triangulation:** Any non-trivial technical claim must be confirmed by at least two independent sources or verified against raw benchmark code.

#### 6. Structured Evidence Graph Output
Every research brief produced by this skill must adhere to the following markdown template:
```markdown
# [Topic] — Deep Research & Evidence Dossier

## Executive Summary
- Concise 3-5 bullet takeaway synthesis.

## Evidence Matrix
| Technical Claim | Verified Status | Confidence (0-100%) | Primary Source | Corroborating Source |
|---|---|---|---|---|
| Claim Description | Confirmed / Disputed | 95% | [Source A](url) | [Source B](url) |

## Trade-off Analysis & Key Risks
- Concrete architectural trade-offs, cold-start latencies, memory footprint, or pricing cliff.

## Recommended Architectural Decision
- Prescriptive guidance for implementation swarms with justification.
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `prd-architect`, `web-scraper`, `browser-automation-expert`, `session-memory-manager`, dan `multi-agent-orchestration` untuk membentuk swarm intelijen berbasis bukti empiris.

### Deskripsi
Panduan produksi untuk merancang dan mengeksekusi pipeline **Riset Mendalam Otonom (Deep Research)**. Berbeda dari retrieval sederhana (RAG satu langkah), Deep Research beroperasi sebagai siklus otonom terarah: memecah pertanyaan menjadi sub-vektor dari berbagai sudut pandang, merayapi dan mengekstrak sumber teknis/akademis, menilai kredibilitas sumber, memvalidasi silang fakta (*fact triangulation*) di minimal 2 sumber independen, membangun graf bukti, dan menyusun laporan intelijen komprehensif berlandaskan sitasi yang valid.

**Sinergi Swarm:** Dalam topologi **Fan-Out / Fan-In Research Swarm**, skill ini berperan sebagai Sub-agen Analis Utama. Diterapkan pada Fase 1 (Discovery & PRD) untuk mengumpulkan fakta objektif, mengaudit arsitektur kompetitor, dan mengeliminasi ketidakpastian teknis berisiko tinggi sebelum penulisan kode dimulai.

### Kondisi Pemicu
- Membutuhkan penyelidikan multi-sumber yang mendalam sebelum membuat keputusan arsitektur.
- Melakukan benchmark komparatif library, database engine, atau infrastruktur cloud berbasis data empiris.
- Membangun agen riset otonom, alat pemantau kompetitor, atau sintesis literatur otomatis.
- Mengeliminasi halusinasi LLM pada dokumen teknis atau strategi bisnis berisiko tinggi.
- Merangkum informasi web yang rumit dan tersebar menjadi dokumen ringkasan terstruktur dengan sitasi klik langsung.

---

### Alur Kerja Operasional Riset Mendalam

```
1. DEKOMPOSISI KUERI & HIPOTESIS
   [Tujuan Riset] ──► [Query Expander] ──┬──► Sub-kueri A (Spesifikasi Teknis)
                                         ├──► Sub-kueri B (Benchmark & Batasan)
                                         └──► Sub-kueri C (Isu Komunitas & Regresi)

2. PERAYAPAN SUMBER REKURSIF
   [Sub-kueri] ──► [Crawl4AI / Firecrawl / SerpAPI] ──► Dokumen Mentah (Markdown/HTML)

3. TRIANGULASI FAKTA & KREDIBILITAS
   Dokumen Mentah ──► [Evidence Evaluator] ──► Validasi Silang (>= 2 Sumber Independen)
                                           ──► Eliminasi Konten SEO-Spam & Blog Rendah Kredibilitas

4. SINTESIS GRAF BUKTI & LAPORAN
   Fakta Terverifikasi ──► [Synthesizer Node] ──► Laporan Terstruktur dengan Sitasi Klik Langsung
```

---

### Panduan Implementasi Inti

#### 1. Dekomposisi Kueri Rekursif (TypeScript & AI SDK)
```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

interface RencanaRiset {
  tujuanUtama: string;
  subKueri: Array<{
    kueri: string;
    fokus: 'arsitektur' | 'benchmark' | 'keamanan' | 'kelemahan';
    jenisSumber: 'dokumentasi' | 'repositori_github' | 'paper_teknis';
  }>;
}

export async function dekomposisiTujuanRiset(promptPengguna: string): Promise<RencanaRiset> {
  const { object } = await generateObject({
    model: customModel('gemini-3.8-flash'),
    schema: z.object({
      tujuanUtama: z.string(),
      subKueri: z.array(z.object({
        kueri: z.string().describe('Kueri kata kunci spesifik dengan operator pencarian teknis'),
        fokus: z.enum(['arsitektur', 'benchmark', 'keamanan', 'kelemahan']),
        jenisSumber: z.enum(['dokumentasi', 'repositori_github', 'paper_teknis']),
      })).min(3).max(6),
    }),
    prompt: `Analisis tujuan riset berikut dan pecah menjadi 4-6 vektor pencarian teknis yang spesifik: "${promptPengguna}"`,
  });

  return object;
}
```

#### 2. Ekstraksi Otonom & Evaluasi Klaim (Python & Crawl4AI)
```python
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode
from pydantic import BaseModel, Field
from pydantic_ai import Agent

class TemuanRiset(BaseModel):
    klaim_teknis: str = Field(description="Klaim teknis spesifik yang diekstraksi")
    skor_keyakinan: float = Field(ge=0, le=1, description="Skor keyakinan bukti (0 sampai 1)")
    url_sumber: str = Field(description="URL sumber primer")
    sumber_pendukung: list[str] = Field(default_factory=list, description="Daftar URL sumber pembanding")

agen_analis = Agent(
    'google:gemini-3.8-flash',
    result_type=list[TemuanRiset],
    system_prompt="Ekstrak temuan teknis obyektif beserta skor keyakinan dan sumber referensi."
)

async def eksekusi_riset_mendalam(kueri: str) -> list[TemuanRiset]:
    config = CrawlerRunConfig(cache_mode=CacheMode.BYPASS)
    async with AsyncWebCrawler() as crawler:
        halaman = await crawler.arun(url=f"https://search-engine.internal/q={kueri}", config=config)
        hasil = await agen_analis.run(halaman.markdown)
        return hasil.data
```

#### 3. Protokol Triangulasi Fakta & Skor Keyakinan
1. **Tier 1 (Otoritas Tertinggi):** Dokumentasi resmi, repositori kode sumber terbuka, spesifikasi RFC, dan laporan audit formal.
2. **Tier 2 (Dapat Diandalkan):** Blog teknik produksi dari tim rekayasa industri (Netflix, Cloudflare, Uber, Stripe).
3. **Tier 3 (Perlu Verifikasi Lanjutan):** Thread forum komunitas dan tutorial opini pribadi.
4. **Aturan Mutlak Triangulasi:** Setiap keputusan arsitektural krusial wajib didukung oleh sekurang-kurangnya 2 sumber Tier 1/2 independen.

#### 4. Format Laporan Riset Terstruktur (Evidence Dossier)
Setiap ringkasan intelijen riset wajib disusun dalam format markdown berikut:
```markdown
# [Topik Riset] — Laporan Riset Mendalam & Graf Bukti

## Ringkasan Eksekutif
- Sintesis ringkas 3-5 poin keputusan utama.

## Matriks Bukti Teknis
| Klaim Teknis | Status Validasi | Skor Keyakinan | Sumber Primer | Sumber Pendukung |
|---|---|---|---|---|
| Penjelasan Klaim | Terverifikasi / Dibantah | 95% | [Sumber A](url) | [Sumber B](url) |

## Analisis Komparatif & Risiko Kunci
- Trade-off latensi, batas memori, konsumsi biaya, atau kurva migrasi.

## Keputusan Arsitektur yang Direkomendasikan
- Arahan preskriptif untuk tim pengembang dengan justifikasi berbasis bukti.
```