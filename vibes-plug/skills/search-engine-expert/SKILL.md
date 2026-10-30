---
name: search-engine-expert
description: "Expert guide for full-text search engines (Typesense, Meilisearch, Elasticsearch), faceted search, and autocomplete / Panduan ahli mesin pencarian full-text (Typesense, Meilisearch, Elasticsearch), pencarian berfaset, dan autocomplete."
author: "Roedy Rustam"
version: "4.3.0"
---

# Search Engine & Full-Text Retrieval Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production guide for high-performance search engines, typo-tolerant autocomplete, faceted navigation, and hybrid retrieval. Covers native PostgreSQL Full-Text Search (`tsvector`, GIN index, `pg_trgm`), dedicated search engines (Typesense, Meilisearch), enterprise distributed clusters (OpenSearch/Elasticsearch), and hybrid search using Reciprocal Rank Fusion (RRF) to merge keyword matching with semantic vector embeddings.

### Trigger Conditions
- Implementing instant autocomplete or search-as-you-type beyond simple SQL `LIKE %query%` filters.
- Setting up faceted e-commerce product navigation (filtering by category, price ranges, ratings).
- Choosing between PostgreSQL built-in FTS vs dedicated clusters (Typesense/Meilisearch).
- Achieving sub-50ms search latency across millions of records.
- Implementing hybrid search combining dense vectors with sparse BM25 / full-text scores.

### Level 1: Native PostgreSQL Full-Text Search (Zero Extra Infrastructure)

```sql
-- Enable trigram extension for typo tolerance and fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create articles table with an automated tsvector generated column
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(64) NOT NULL,
  search_tokens TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED
);

-- Crucial: GIN index for full-text queries & Trigram index for typos
CREATE INDEX IF NOT EXISTS idx_articles_fts ON articles USING GIN (search_tokens);
CREATE INDEX IF NOT EXISTS idx_articles_title_trgm ON articles USING GIN (title gin_trgm_ops);

-- Fast ranked query with typo fallback
SELECT 
  id, 
  title, 
  ts_rank_cd(search_tokens, websearch_to_tsquery('english', :query)) AS rank,
  similarity(title, :query) AS sim_score
FROM articles
WHERE search_tokens @@ websearch_to_tsquery('english', :query)
   OR title % :query
ORDER BY rank DESC, sim_score DESC
LIMIT 20;
```

### Level 2: Dedicated Typo-Tolerant Engine (Typesense 2026)

```typescript
// src/lib/search/typesense-client.ts
import Typesense from 'typesense';

export const typesenseClient = new Typesense.Client({
  nodes: [{ host: process.env.TYPESENSE_HOST || 'localhost', port: 8108, protocol: 'http' }],
  apiKey: process.env.TYPESENSE_API_KEY!,
  connectionTimeoutSeconds: 2,
});

export async function searchProducts(searchTerm: string, selectedCategory?: string, maxPrice?: number) {
  const filterConditions: string[] = [];
  if (selectedCategory) filterConditions.push(`category:=${selectedCategory}`);
  if (maxPrice) filterConditions.push(`price:<=${maxPrice}`);

  const searchParams = {
    q: searchTerm || '*',
    query_by: 'name,description,brand',
    query_by_weights: '3,2,1',
    filter_by: filterConditions.join(' && '),
    facet_by: 'category,brand,price',
    sort_by: '_text_match:desc,rating:desc',
    num_typos: 2,
    per_page: 24,
  };

  const results = await typesenseClient.collections('products').documents().search(searchParams);
  return {
    hits: results.hits?.map((h: any) => h.document) || [],
    facets: results.facet_counts || [],
    found: results.found,
  };
}
```

### Reciprocal Rank Fusion (RRF) Hybrid Formula
When blending keyword search with vector semantic search, apply RRF to avoid score calibration drift:
$$\text{RRF Score}(d) = \sum_{m \in M} \frac{1}{60 + r_m(d)}$$
Where $r_m(d)$ is the 1-based rank of document $d$ in system $m$ (BM25 or Dense Vector).

## Orchestration & Integration
- **`database-orm-expert`**: Maintains PostgreSQL generated `tsvector` columns in Drizzle/Prisma.
- **`vector-db-rag-expert`**: Powers the dense vector half of hybrid search.
- **`ecommerce-expert`**: Drives product catalog search, autocomplete, and facet filters.
- **`performance-web-vitals`**: Ensures search autocomplete debouncing (<150ms) to prevent INP regression.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan produksi untuk mesin pencarian berkecepatan tinggi, autocomplete toleran salah ketik (*typo-tolerant*), navigasi berfaset (*faceted search*), dan pencarian hibrida (*hybrid search*). Mencakup Full-Text Search bawaan PostgreSQL (`tsvector`, GIN index, `pg_trgm`), mesin pencari khusus (Typesense, Meilisearch), kluster enterprise (OpenSearch/Elasticsearch), serta penggabungan skor kata kunci dan vektor semantik menggunakan formula *Reciprocal Rank Fusion* (RRF).

### Kondisi Pemicu
- Mengimplementasikan pencarian instan dan autocomplete di luar query dasar SQL `LIKE %kata%`.
- Membangun filter produk e-commerce berdasarkan kategori, kisaran harga, dan rating.
- Memilih antara FTS native PostgreSQL vs mesin pencari terdedikasi (Typesense/Meilisearch).
- Menargetkan latensi pencarian di bawah 50 milidetik pada jutaan baris data.
- Menggabungkan pencarian teks biasa dengan pencarian semantik AI (*Hybrid Search*).

### Pola Integrasi Pencarian Instan di Next.js

```typescript
// src/app/api/search/route.ts
import { NextResponse } from 'next/server';
import { searchProducts } from '@/lib/search/typesense-client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || undefined;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;

  try {
    const data = await searchProducts(q, category, maxPrice);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Gagal melakukan pencarian' }, { status: 500 });
  }
}
```

### Kapan Menggunakan PostgreSQL vs Typesense?
- **Gunakan PostgreSQL FTS**: Jika data di bawah 1 juta baris dan Anda ingin menghindari biaya/kompleksitas infrastruktur tambahan.
- **Gunakan Typesense / Meilisearch**: Jika membutuhkan koreksi saltik otomatis yang instan (*instant typo-tolerance*), pencarian saat mengetik (*search-as-you-type* <10ms), dan filter faset kompleks tanpa membebani database utama.

## Integrasi Orkestrasi
- **`database-orm-expert`**: Sinkronisasi data antara PostgreSQL dengan index Typesense melalui webhook atau event outbox.
- **`vector-db-rag-expert`**: Menyediakan ranking semantik untuk pencarian hibrida.
- **`ecommerce-expert`**: Menghubungkan faset pencarian dengan katalog produk toko online.
- **`performance-web-vitals`**: Mencegah pemanggilan API berlebihan dengan teknik *debounce* 150-200ms pada input pencarian.