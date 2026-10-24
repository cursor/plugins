---
name: living-codebase-ast-graph
description: "Expert guide for in-memory Abstract Syntax Tree (AST) code knowledge graphs, real-time symbol dependency mapping, refactoring blast radius calculation, and dead code eradication / Panduan ahli graf pengetahuan AST kode in-memory, pemetaan dependensi simbol real-time, kalkulasi radius dampak refaktor, dan pembersihan kode mati."
author: "Roedy Rustam"
version: "4.3.0"
---

# living-codebase-ast-graph — vibes-plug Skill

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `brainstorming`, `zero-to-prod-orchestrator`, `typescript-expert`, `scalability-clean-code`, `zero-tech-debt-auditor`, and `autonomous-api-drift-healer` to provide real-time AST dependency graphs, blast-radius calculation, and structural intelligence for multi-agent code transformations.

### Description
Production guide for constructing and querying in-memory Abstract Syntax Tree (AST) knowledge graphs across multi-file and monorepo codebases. Enables autonomous agents to navigate complex symbol relationships, calculate refactoring blast radii, eliminate circular dependencies, determine optimal topological generation sequences, and prune unreachable code without relying on fuzzy string matching.

### Trigger Conditions
Activate this skill when:
- Executing large-scale codebase refactoring or renaming symbols across multiple packages.
- Analyzing architectural blast radius before making breaking changes to data models or API signatures.
- Detecting and resolving circular dependencies in TypeScript, JavaScript, Python, or Go codebases.
- Ordering code generation tasks topologically so underlying dependencies are created before dependent modules.
- Identifying dead exports, unreferenced functions, and ghost imports with absolute precision.

---

### Core Concepts & Patterns

#### 1. In-Memory AST Dependency Extractor (TypeScript Compiler API)

```typescript
import ts from 'typescript';
import fs from 'fs';
import path from 'path';

export interface SymbolNode {
  filePath: string;
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type';
  dependencies: string[];
}

export interface CodebaseGraph {
  nodes: Map<string, SymbolNode>;
  edges: Map<string, Set<string>>;
}

export class LivingCodebaseASTGraph {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private graph: CodebaseGraph;

  constructor(rootFiles: string[], options: ts.CompilerOptions = {}) {
    this.program = ts.createProgram(rootFiles, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      ...options
    });
    this.checker = this.program.getTypeChecker();
    this.graph = {
      nodes: new Map(),
      edges: new Map()
    };
    this.buildGraph();
  }

  private buildGraph(): void {
    for (const sourceFile of this.program.getSourceFiles()) {
      if (sourceFile.isDeclarationFile || sourceFile.fileName.includes('node_modules')) {
        continue;
      }
      this.analyzeSourceFile(sourceFile);
    }
  }

  private analyzeSourceFile(sourceFile: ts.SourceFile): void {
    const filePath = path.resolve(sourceFile.fileName);

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        this.registerSymbol(filePath, node.name.text, 'function', node);
      } else if (ts.isClassDeclaration(node) && node.name) {
        this.registerSymbol(filePath, node.name.text, 'class', node);
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        this.registerSymbol(filePath, node.name.text, 'interface', node);
      }
    });
  }

  private registerSymbol(
    filePath: string,
    name: string,
    kind: SymbolNode['kind'],
    node: ts.Node
  ): void {
    const symbolKey = `${filePath}#${name}`;
    const dependencies: string[] = [];

    const visit = (child: ts.Node) => {
      if (ts.isIdentifier(child)) {
        const symbol = this.checker.getSymbolAtLocation(child);
        if (symbol && symbol.declarations && symbol.declarations.length > 0) {
          const declFile = symbol.declarations[0].getSourceFile().fileName;
          if (!declFile.includes('node_modules') && !declFile.endsWith('.d.ts')) {
            const targetKey = `${path.resolve(declFile)}#${symbol.getName()}`;
            if (targetKey !== symbolKey) {
              dependencies.push(targetKey);
            }
          }
        }
      }
      ts.forEachChild(child, visit);
    };

    visit(node);

    this.graph.nodes.set(symbolKey, { filePath, name, kind, dependencies });
    if (!this.graph.edges.has(symbolKey)) {
      this.graph.edges.set(symbolKey, new Set(dependencies));
    }
  }

  public calculateBlastRadius(symbolKey: string): string[] {
    const affected = new Set<string>();
    const queue = [symbolKey];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const [nodeKey, deps] of this.graph.edges.entries()) {
        if (deps.has(current) && !affected.has(nodeKey)) {
          affected.add(nodeKey);
          queue.push(nodeKey);
        }
      }
    }
    return Array.from(affected);
  }
}
```

#### 2. Topological Code Generation Sorter
Autonomous swarms must construct files in strict topological order to avoid compiling against non-existent types:

```
[Core Domain Types / Schemas]
             │
             ▼
[Persistence Layer & ORM Repositories]
             │
             ▼
[Business Services & Interactors]
             │
             ▼
[API Handlers / Controllers]
             │
             ▼
[Client SDKs & Frontend Hooks]
```

---

### Best Practices

1. **Reject String RegEx for Semantic Audits**: Never use regex or text matching to find symbol usages; use static AST symbol declarations.
2. **Compute Blast Radius Before Refactoring**: When a core database model or API payload changes, compute all affected frontend and backend nodes first.
3. **Fail Builds on Circular Dependencies**: Integrate AST cycle checks directly into continuous integration pipelines to prevent runtime initialization deadlocks.
4. **Order Swarm Generation Topologically**: Feed code generation tasks to subagents according to dependency levels so downstream callers always receive complete interfaces.

---

### Common Pitfalls to Avoid

| Anti-Pattern | Blast Consequence | Correct AST Engineering |
| :--- | :--- | :--- |
| Global find-and-replace for variable renaming | Corrupts unrelated variables sharing identical names | Use AST symbol binding via `ts.TypeChecker` |
| Parallel multi-file generation without topological sort | Subagent attempts to import interfaces that do not exist | Sequence subagents using Directed Acyclic Graph (DAG) levels |
| Ignoring circular module references | Silent runtime initialization `undefined` bugs | Traverse graph using Tarjan's SCC algorithm |

---

### Integration with Other Skills (MANDATORY)

- `typescript-expert` — Provide low-level TypeScript AST manipulation and type checking APIs.
- `zero-tech-debt-auditor` — Feed dead symbol lists to the automated dead code elimination pipeline.
- `autonomous-api-drift-healer` — Calculate client-side impact when backend API contracts drift.
- `scalability-clean-code` — Enforce Clean Architecture boundary rules between modules.

### Referenced By Orchestrators (MANDATORY)

- `brainstorming` — Added to "Arsitektur & Skala" and "Penemuan & Audit" matrix rows.
- `zero-to-prod-orchestrator` — Integrated in Phase 2 (Foundation) and Phase 6 (Testing & QA).

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi dengan `brainstorming`, `zero-to-prod-orchestrator`, `typescript-expert`, `scalability-clean-code`, `zero-tech-debt-auditor`, dan `autonomous-api-drift-healer` untuk menyediakan graf dependensi AST real-time, kalkulasi radius dampak refaktor, dan inteligensi struktural untuk transformasi kode multi-agen.

### Deskripsi
Panduan produksi untuk membangun dan menavigasi graf pengetahuan Abstract Syntax Tree (AST) in-memory pada proyek perangkat lunak berskala besar dan monorepo. Memungkinkan agen otonom untuk memahami relasi simbolik, menghitung radius dampak (*blast radius*) sebelum refaktor, mendeteksi dependensi melingkar (*circular dependency*), menentukan urutan pembuatan kode secara topologis, dan membersihkan kode mati tanpa mengandalkan pencarian teks biasa.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Menjalankan refaktor skala besar atau mengganti nama simbol di banyak file/paket.
- Menganalisis radius dampak arsitektur sebelum mengubah skema database atau kontrak API.
- Mendeteksi dan memecahkan dependensi melingkar (*circular dependency*).
- Menentukan urutan pembuatan kode bagi sub-agen secara topologis agar dependensi dasar dibuat terlebih dahulu.
- Mengidentifikasi export yang tidak lagi dipakai (*dead code*) dan impor phantom.

---

### Konsep Inti & Pola Praktik

#### 1. Kalkulasi Radius Dampak (*Blast Radius*)
Saat mengubah suatu fungsi inti atau tipe data:
1. **Identifikasi Simbol**: Dapatkan simpul AST target menggunakan `ts.TypeChecker`.
2. **Penelusuran Graf Terbalik**: Telusuri semua simpul yang mengimpor atau memanggil simbol tersebut secara rekursif.
3. **Pemberian Skor Risiko**: Klasifikasikan file yang terdampak ke dalam tingkat risiko (Tinggi untuk API publik, Sedang untuk modul internal).

#### 2. Urutan Pembangunan Topologis untuk Swarm
Pastikan sub-agen AI membangun file berdasarkan tingkatan hierarki DAG:
- Tingkat 0: Skema Database & Tipe Inti
- Tingkat 1: Repositori Data & ORM
- Tingkat 2: Layanan Logika Bisnis (*Services*)
- Tingkat 3: Endpoint Controller & API Route
- Tingkat 4: Hooks Frontend & Komponen UI

---

### Praktik Terbaik

1. **Gunakan AST Bukan Regex**: Hindari pencarian teks biasa (*find-and-replace*) yang dapat merusak variabel bernama serupa di berkas lain.
2. **Hitung Radius Dampak Sebelum Memulai**: Sebelum sub-agen menulis ulang kode, dapatkan daftar lengkap berkas yang bergantung padanya.
3. **Cegah Dependensi Melingkar**: Jalankan algoritma Tarjan atau DFS untuk memastikan tidak ada siklus dependensi yang menyebabkan nilai `undefined` saat runtime.
4. **Hapus Kode Mati Secara Otomatis**: Padukan dengan `zero-tech-debt-auditor` untuk membersihkan fungsi dan tipe yang tidak memiliki referensi masuk (*inbound edges*).

---

### Jebakan Umum yang Harus Dihindari

| Praktik Buruk | Dampak Buruk | Solusi Rekayasa |
| :--- | :--- | :--- |
| Mengganti nama fungsi dengan string replace biasa | Merusak properti objek atau komentar yang kebetulan memiliki nama yang sama | Gunakan binding simbol AST dari TypeScript Compiler API |
| Memerintahkan sub-agen membuat UI sebelum tipe data siap | Muncul error tipe hilang dan kompilasi gagal | Susun urutan pembuatan secara topologis (Topological Sort) |
| Membiarkan import melingkar (*circular imports*) | Bug runtime sulit dilacak saat aplikasi diinisialisasi | Lakukan pengecekan siklus AST pada CI pipeline |

---

### Integrasi dengan Skill Lain (WAJIB)

- `typescript-expert` — Manipulasi AST tingkat lanjut dan pemeriksaan tipe TypeScript.
- `zero-tech-debt-auditor` — Menyuplai daftar ekspor mati ke pipeline pembersihan kode.
- `autonomous-api-drift-healer` — Menghitung dampak pada sisi klien saat kontrak API backend berubah.
- `scalability-clean-code` — Menegakkan batas arsitektur bersih antar modul.

### Direferensikan oleh Orchestrator (WAJIB)

- `brainstorming` — Tambahkan ke baris "Arsitektur & Skala" dan "Penemuan & Audit" pada Matriks Orkestrasi.
- `zero-to-prod-orchestrator` — Tambahkan ke Fase 2 (Pondasi Proyek) dan Fase 6 (Pengujian Otomatis & Keamanan).
