---
name: xerj-search-expert
description: "Expert guide for XERJ: the unified search engine for AI, vector database, zero-config autoindexer, agent memory store (/_memory/{ns}), and embedded 13-tool MCP server / Panduan ahli XERJ: mesin pencari terpadu untuk AI, vector database, autoindex tanpa konfigurasi, memori agen, dan 13 tool MCP server bawaan."
author: "Roedy Rustam"
version: "4.3.0"
---

# XERJ Search & Agent Memory Expert / Panduan Ahli Mesin Pencari & Memori Agen XERJ

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills:
- `search-engine-expert` — Integrating Elasticsearch wire-compatible endpoints, query DSLs, BM25 ranking, and faceted search.
- `vector-db-rag-expert` — Hybrid search (BM25 + vector RRF), dense vector indexing, and HNSW graph retrieval.
- `agentic-memory-architect` — Persistent agent episodic memory with `/_memory/{ns}` and namespace partitioning.
- `mcp-server-architect` — Configuring and routing the 13 built-in Model Context Protocol (MCP) tools via `xerj mcp`.
- `brainstorming` & `zero-to-prod-orchestrator` — Phase 3 (Database & Search) and Phase 4 (Backend APIs & AI Agents).
- `anti-slop` — Enforcing honest claims, verified benchmark numbers, and zero-hallucination citations.

### Description
Expert guide for installing, running, autoindexing, and querying **XERJ** — the unified, AI-native search engine, vector database, agent memory store, and log analytics engine written from scratch in Rust (Apache-2.0). XERJ replaces the complex retrieval stack an AI system normally assembles (Elasticsearch + vector database + embedding service + memory store) with a single native binary, speaking both native REST and Elasticsearch 8.x wire protocol (0-failure conformance gate) and exposing 13 native MCP tools.

### Key Capabilities

```
┌────────────────────────────────────────────────────────────────────────┐
│                              XERJ ENGINE                               │
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌────────────┐  │
│  │ xerj autoindex <dir>  │  │ xerj autoindex map    │  │ /_memory/  │  │
│  │ Zero-config indexing  │  │ Self-describing data  │  │ Long-term  │  │
│  │ Sniffs & types data   │  │ Ready-to-use queries  │  │ Agent Mem  │  │
│  └───────────────────────┘  └───────────────────────┘  └────────────┘  │
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌────────────┐  │
│  │ xerj mcp (13 Tools)   │  │ ES 8.x Wire Protocol  │  │ xerj code  │  │
│  │ Native stdio proxy    │  │ :9200 compatible      │  │ Reference  │  │
│  │ Full AI Agent toolkit │  │ 0-failure YAML gate   │  │ Coding Hub │  │
│  └───────────────────────┘  └───────────────────────┘  └────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Zero-Config Autoindex (`xerj autoindex <folder>`)**:
   - Walks, sniffs content (not just file extensions), samples types, and builds typed, queryable indices.
   - Always run with `--dry-run` first to estimate size and see ignore accounting.
   - Exit codes: `0` complete, `3` completed-with-junk (success; corpus is committed), `4` needs user decision.
2. **Data Map (`xerj autoindex map`)**:
   - Inspects the autoindex catalog and outputs dataset schemas, cardinality, semantic fields, and ready-to-copy curl queries.
3. **Agent Episodic Memory (`/_memory/{ns}`)**:
   - Built-in persistent namespace-isolated agent memory for stateful conversational agents and long-running swarms.
4. **Embedded MCP Server (`xerj mcp`)**:
   - Zero-dependency Model Context Protocol stdio server inside the same binary.

---

### The 13 Native MCP Tools

| Tool Name | Type | Description |
|---|---|---|
| `xerj_search` | Thin Proxy | Full-text BM25 search across indexed fields. |
| `xerj_semantic_search` | Thin Proxy | Semantic search (lexical hash by default; neural Candle BERT when `--embed-mode neural`). |
| `xerj_vector_search` | Thin Proxy | Dense vector search via persisted HNSW graph with exact rescoring. |
| `xerj_hybrid_search` | Thin Proxy | Reciprocal Rank Fusion (RRF) combining BM25 keyword and dense vector scores. |
| `xerj_memory_store` | Thin Proxy | Writes an agent memory observation into namespace `/_memory/{ns}`. |
| `xerj_memory_recall` | Thin Proxy | Recalls relevant agent memory observations from namespace `/_memory/{ns}`. |
| `xerj_brain_overview` | Thin Proxy | High-level topology overview of the deterministic link graph. |
| `xerj_brain_ego` | Thin Proxy | Queries the ego-network and outgoing/incoming edges for a node. |
| `xerj_brain_link` | Thin Proxy | Adds a directed semantic edge between two entities. |
| `xerj_brain_unlink` | Thin Proxy | Removes a directed edge between two entities. |
| `xerj_plan` | Thin Proxy | Invokes the deterministic rule-based query planner (`POST /_ask`). |
| `xerj_map` | Catalog Reader | Returns the autoindex catalog and per-index field mappings. |
| `xerj_code_search` | Rich Pipeline | Reference-coding search with staleness checks and licence attribution. |

---

### MCP Client Configurations

#### 1. Antigravity IDE (`.agents/mcp.json` or `~/.gemini/config/mcp.json`)
```json
{
  "mcpServers": {
    "xerj": {
      "command": "xerj",
      "args": ["mcp"],
      "env": {
        "XERJ_URL": "http://localhost:9200"
      }
    }
  }
}
```
*Note for Windows:* If `xerj` is not in system PATH, use absolute path: `%LOCALAPPDATA%\\Programs\\xerj\\xerj.exe`. Add `"XERJ_AUTH": "ApiKey <key>"` if auth is enabled.

#### 2. Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "xerj": {
      "command": "/usr/local/bin/xerj",
      "args": ["mcp"],
      "env": {
        "XERJ_URL": "http://127.0.0.1:9200"
      }
    }
  }
}
```

#### 3. Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "xerj": {
      "command": "xerj",
      "args": ["mcp"],
      "env": {
        "XERJ_URL": "http://localhost:9200"
      }
    }
  }
}
```

---

### Invariants & Anti-Slop Honesty Rules
1. **Embedding Mode Transparency**: The default embedder is **lexical feature-hashing**. Never describe default output as neural or semantic transformer embeddings unless the node runs with `--embed-mode neural`.
2. **Deterministic Link Graph**: `xerj_brain_*` tools operate a deterministic link index, not a full graph database.
3. **Verified Measurements**: Always quote measured benchmarks (e.g. from `scripts/bench/` or `demo/playbooks/SCORECARD.md`); never fabricate unverified speedup ratios.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasikan skill domain berikut:
- `search-engine-expert` — Integrasi endpoint kompatibel Elasticsearch, query DSL, skor BM25, dan faceted search.
- `vector-db-rag-expert` — Pencarian hybrid (BM25 + vector RRF), pengindeksan vektor densitas tinggi, dan graf HNSW.
- `agentic-memory-architect` — Penyimpanan memori episodik jangka panjang agen melalui `/_memory/{ns}`.
- `mcp-server-architect` — Konfigurasi dan perutean 13 alat Model Context Protocol (MCP) native via `xerj mcp`.
- `brainstorming` & `zero-to-prod-orchestrator` — Fase 3 (Database & Search) dan Fase 4 (Backend APIs & AI Agents).
- `anti-slop` — Penegakan klaim jujur, verifikasi angka benchmark, dan atribusi tanpa halusinasi.

### Deskripsi
Panduan ahli untuk instalasi, pengoperasian, pengindeksan otomatis (*autoindex*), dan pencarian menggunakan **XERJ** — mesin pencari AI-native, vector database, memori agen, dan analitik log terpadu yang dibangun dari nol dalam bahasa Rust (Apache-2.0). XERJ menggantikan seluruh tumpukan retrieval terpisah (Elasticsearch + vector database + embedding service + memory store) menjadi satu binary mandiri, mendukung protokol Elasticsearch 8.x (gerbang conformance CI 0-failure) dan menyediakan 13 tool MCP bawaan.

### Kemampuan Utama
1. **Autoindex Tanpa Konfigurasi (`xerj autoindex <folder>`)**:
   - Memindai konten (berdasarkan sniffing data, bukan sekadar ekstensi), mengambil sampel tipe data, dan membangun indeks siap cari secara otomatis.
   - Selalu jalankan dengan `--dry-run` terlebih dahulu untuk estimasi kapasitas dan melihat aturan pengabaian file (*ignore rules*).
   - Kode keluar: `0` selesai sempurna, `3` selesai dengan berkas lewatan (*junk files*, status sukses), `4` membutuhkan persetujuan pengguna.
2. **Peta Data (`xerj autoindex map`)**:
   - Membaca katalog dan memaparkan skema dataset, kardinalitas kolom, kolom semantik, serta contoh query curl siap pakai.
3. **Memori Jangka Panjang Agen (`/_memory/{ns}`)**:
   - Penyimpanan memori berisolasi namespace bawaan untuk agen percakapan dan multi-agent swarm.
4. **Server MCP Native (`xerj mcp`)**:
   - Menyediakan 13 tool MCP langsung dari binary tunggal tanpa dependensi tambahan.

### Ringkasan 13 Tool MCP XERJ
- `xerj_search`: Pencarian full-text BM25.
- `xerj_semantic_search`: Pencarian teks semantik (lexical hash default, neural BERT saat flag aktif).
- `xerj_vector_search`: Pencarian dense vector berbasis graf HNSW dengan exact rescoring.
- `xerj_hybrid_search`: Penggabungan skor BM25 dan vektor melalui RRF (Reciprocal Rank Fusion).
- `xerj_memory_store` & `xerj_memory_recall`: Penyimpanan dan pemanggilan memori agen pada `/_memory/{ns}`.
- `xerj_brain_*`: Manajemen graf tautan deterministik.
- `xerj_plan`: Perencana query otomatis berdasar aturan (`POST /_ask`).
- `xerj_map`: Peta data skema indeks otomatis.
- `xerj_code_search`: Pencarian referensi kode dengan perlindungan lisensi dan staleness check.
