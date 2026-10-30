---
name: vector-db-rag-expert
description: "Expert guide for high-performance Vector Databases, Deep RAG architectures, pgvector 0.8+ HNSW, Reciprocal Rank Fusion (RRF), Cross-Encoder Re-ranking, and Late Chunking / Panduan ahli Vector DB, arsitektur Deep RAG, pgvector HNSW, RRF, dan Re-ranking."
author: "Roedy Rustam"
version: "4.3.0"
---

# Vector DB & Deep RAG Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Purpose & Overview
Production-grade architectural guide for Vector Databases (PostgreSQL `pgvector 0.8+`, Qdrant, LanceDB, Pinecone), Deep RAG indexing strategies, HNSW iterative search, **Reciprocal Rank Fusion (RRF)** hybrid retrieval, **Cross-Encoder Re-ranking** (Cohere Rerank v3, FlashRank, BGE-Reranker-v2), and **Late Chunking** to eliminate context fragmentation.

### Key Capabilities
1. **pgvector 0.8+ & HNSW Indexing**: High-dimensional vector storage, cosine/inner-product/L2 distance metric tuning, and iterative HNSW index scans with metadata filtering.
2. **Reciprocal Rank Fusion (RRF)**: Combining sparse keyword BM25 ranks with dense semantic vector ranks using $RRF(d) = \sum \frac{1}{k + rank(d)}$, far outperforming naive linear score weighting.
3. **Cross-Encoder Re-ranking**: Two-stage retrieval pipeline: retrieve Top-50 candidates via fast hybrid search, then re-rank down to Top-5 using a cross-encoder model to maximize NDCG@10.
4. **Late Chunking & Contextual Retrieval**: Embed long-context documents in full before pooling token embeddings into individual chunks, preserving document-level semantics across boundaries.
5. **RAG Evaluation**: Continuous retrieval precision and hallucination scoring using automated eval harnesses (Ragas, TruLens, DeepEval).

---

### Production Implementation Recipes

#### Recipe 1: Reciprocal Rank Fusion (RRF) Hybrid Search with Drizzle ORM
```typescript
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export interface SearchResult {
  id: string;
  content: string;
  score: number;
}

/**
 * Executes Reciprocal Rank Fusion (RRF) combining BM25 keyword search and pgvector HNSW
 * k = 60 is the industry standard constant
 */
export async function reciprocalRankFusionSearch(
  queryVector: number[],
  queryText: string,
  limit = 10,
  k = 60
): Promise<SearchResult[]> {
  const formattedVector = JSON.stringify(queryVector);

  const results = await db.execute(sql`
    WITH vector_matches AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> ${formattedVector}::vector) AS rank
      FROM documents
      WHERE status = 'published'
      ORDER BY embedding <=> ${formattedVector}::vector
      LIMIT 50
    ),
    text_matches AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', ${queryText})) DESC) AS rank
      FROM documents
      WHERE fts @@ websearch_to_tsquery('english', ${queryText})
      LIMIT 50
    )
    SELECT
      d.id,
      d.content,
      COALESCE(1.0 / (${k} + v.rank), 0.0) +
      COALESCE(1.0 / (${k} + t.rank), 0.0) AS rrf_score
    FROM documents d
    LEFT JOIN vector_matches v ON d.id = v.id
    LEFT JOIN text_matches t ON d.id = t.id
    WHERE v.id IS NOT NULL OR t.id IS NOT NULL
    ORDER BY rrf_score DESC
    LIMIT ${limit};
  `);

  return results.rows as unknown as SearchResult[];
}
```

#### Recipe 2: Two-Stage Re-Ranking Pipeline with FlashRank (Node.js / TypeScript)
```typescript
import { FlashRankRegistry } from 'flashrank';

const ranker = new FlashRankRegistry();

export async function rerankCandidates(query: string, candidates: { id: string; text: string }[], topN = 5) {
  const passages = candidates.map(c => ({ id: c.id, text: c.text }));
  
  // Ultra-fast client/server cross-encoder re-ranking
  const reranked = await ranker.rerank({
    query,
    passages,
    model: 'ms-marco-TinyBERT-L-2-v2', // Lightweight, 2ms latency
  });

  return reranked.slice(0, topN);
}
```

---

### Implementation Checklist
- [ ] Create `HNSW` index in PostgreSQL: `CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`
- [ ] Configure `hnsw.ef_search = 100` for high-recall queries during production traffic.
- [ ] Implement Reciprocal Rank Fusion (RRF) with constant `k = 60` instead of arbitrary linear weighting.
- [ ] Add a Cross-Encoder Re-ranker step before injecting retrieved chunks into the LLM system prompt.
- [ ] Apply Late Chunking or Contextual Chunking to retain parent document continuity.

## Orchestration & Integration
- Integrates with: `ai-llm-integration-expert`, `database-orm-expert`, `llm-finops-router`, `app-analyzer-optimizer`.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan arsitektur tingkat produksi untuk Vector Database (PostgreSQL `pgvector 0.8+`, Qdrant, LanceDB, Pinecone), arsitektur Deep RAG modern, pencarian HNSW iteratif, **Reciprocal Rank Fusion (RRF)** hybrid retrieval, **Cross-Encoder Re-ranking** (Cohere Rerank v3, FlashRank, BGE-Reranker-v2), dan **Late Chunking** untuk mencegah fragmentasi konteks.

### Fitur Utama
1. **pgvector 0.8+ & Indeks HNSW**: Penyimpanan vektor dimensi tinggi, tuning metrik jarak (cosine/inner-product/L2), dan pemindaian HNSW iteratif dengan filter metadata.
2. **Reciprocal Rank Fusion (RRF)**: Menggabungkan peringkat kata kunci BM25 dengan peringkat semantik vektor menggunakan rumus $RRF(d) = \sum \frac{1}{k + rank(d)}$, jauh lebih akurat daripada pembobotan linear biasa.
3. **Cross-Encoder Re-ranking**: Pipeline retrieval 2 tahap: ambil 50 kandidat teratas melalui pencarian hybrid, lalu urutkan ulang menjadi 5 dokumen paling relevan menggunakan model cross-encoder.
4. **Late Chunking**: Melakukan embedding dokumen secara utuh dalam transformer sebelum memecahnya menjadi chunk-chunk terpisah, mempertahankan makna global dokumen.
5. **Evaluasi RAG**: Pengukuran presisi retrieval dan deteksi halusinasi secara otomatis (Ragas, TruLens, DeepEval).

---

### Resep Implementasi Produksi

#### Resep 1: Pencarian Hybrid RRF dengan Drizzle ORM
```typescript
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export async function cariDokumenRRF(
  queryVector: number[],
  queryText: string,
  limit = 10,
  k = 60
) {
  const vectorStr = JSON.stringify(queryVector);

  const hasil = await db.execute(sql`
    WITH vector_matches AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> ${vectorStr}::vector) AS rank
      FROM documents
      WHERE status = 'published'
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT 50
    ),
    text_matches AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank_cd(fts, websearch_to_tsquery('english', ${queryText})) DESC) AS rank
      FROM documents
      WHERE fts @@ websearch_to_tsquery('english', ${queryText})
      LIMIT 50
    )
    SELECT
      d.id,
      d.content,
      COALESCE(1.0 / (${k} + v.rank), 0.0) +
      COALESCE(1.0 / (${k} + t.rank), 0.0) AS skor_rrf
    FROM documents d
    LEFT JOIN vector_matches v ON d.id = v.id
    LEFT JOIN text_matches t ON d.id = t.id
    WHERE v.id IS NOT NULL OR t.id IS NOT NULL
    ORDER BY skor_rrf DESC
    LIMIT ${limit};
  `);

  return hasil.rows;
}
```

#### Resep 2: Pipeline Re-Ranking dengan FlashRank (Node.js / TypeScript)
```typescript
import { FlashRankRegistry } from 'flashrank';

const ranker = new FlashRankRegistry();

export async function susunUlangKandidat(kueri: string, kandidat: { id: string; text: string }[], topN = 5) {
  const passages = kandidat.map(c => ({ id: c.id, text: c.text }));
  
  const hasilRerank = await ranker.rerank({
    query: kueri,
    passages,
    model: 'ms-marco-TinyBERT-L-2-v2',
  });

  return hasilRerank.slice(0, topN);
}
```

---

### Checklist Implementasi
- [ ] Buat indeks `HNSW` di PostgreSQL: `CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`
- [ ] Konfigurasikan `hnsw.ef_search = 100` untuk kueri dengan recall tinggi di lingkungan produksi.
- [ ] Terapkan Reciprocal Rank Fusion (RRF) dengan konstanta `k = 60` alih-alih pembobotan linear manual.
- [ ] Tambahkan langkah Cross-Encoder Re-ranker sebelum menyuntikkan konteks ke prompt LLM.
- [ ] Terapkan Late Chunking agar konteks dokumen utuh tidak hilang saat dipotong.

## Integrasi Orkestrasi
- Terintegrasi dengan: `ai-llm-integration-expert`, `database-orm-expert`, `llm-finops-router`, `app-analyzer-optimizer`.