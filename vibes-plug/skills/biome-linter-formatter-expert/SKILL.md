---
name: biome-linter-formatter-expert
description: "Expert guide for Biome (Rust-based linter + formatter), ESLint/Prettier migration, and code quality tooling / Panduan ahli Biome (linter + formatter berbasis Rust), migrasi dari ESLint/Prettier, dan tooling kualitas kode."
author: "Roedy Rustam"
version: "4.3.0"
---

# Biome Linter & Formatter Expert (Rust Tooling 2026)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Expert guide for Biome v2, the unified, ultra-fast Rust-based linter, formatter, and import organizer designed to replace legacy ESLint + Prettier toolchains. Covers single-file configuration (`biome.json`), automated zero-loss migration (`biome migrate`), Lefthook/Husky Git pre-commit hooks, strict type-checking lint rules for React 19 and TypeScript 5.8+, monorepo workspace partitioning, and CI/CD quality gate enforcement.

### Trigger Conditions
- Scaffolding new JavaScript, TypeScript, JSX, or CSS projects requiring sub-second linting and formatting.
- Migrating codebases from slow ESLint + Prettier setups (achieving 10-100x speedup).
- Configuring Git pre-commit hooks to prevent bad commits from entering the repository.
- Resolving lint rule conflicts between formatting and syntactic validation.

### Production `biome.json` Configuration (v2.0 Standard)

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "includes": ["src/**/*", "scripts/**/*", "tests/**/*"]
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 100
  },
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": "warn",
        "noVoid": "error"
      },
      "correctness": {
        "noUnusedVariables": "error",
        "useHookAtTopLevel": "error"
      },
      "suspicious": {
        "noExplicitAny": "warn",
        "noArrayIndexKey": "warn"
      },
      "style": {
        "useConst": "error",
        "useTemplate": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always",
      "trailingCommas": "es5"
    }
  }
}
```

### Git Hook Integration with Lefthook (Sub-Second Pre-Commit)

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    biome-check:
      glob: "*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc,css}"
      run: npx @biomejs/biome check --write --no-errors-on-unmatched --staged {staged_files}
      stage_fixed: true
```

### Essential Biome CLI Commands

```bash
# Initialize Biome in current project
npx @biomejs/biome init

# Migrate automatically from ESLint and Prettier configs
npx @biomejs/biome migrate eslint --write
npx @biomejs/biome migrate prettier --write

# Run format + lint + import sorting in one pass
npx @biomejs/biome check --write ./src

# CI verification (exit code 1 on errors without modifying files)
npx @biomejs/biome ci ./src
```

## Orchestration & Integration
- **`monorepo-architect`**: Configures Biome extends across Turborepo and pnpm workspaces.
- **`ci-cd-devops-architect`**: Embeds `biome ci` into GitHub Actions before test runs.
- **`typescript-expert`**: Aligns Biome rules with TypeScript strict mode compiler settings.
- **`anti-slop`**: Complements anti-slop AST checks by enforcing clean, dead-code-free repositories.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan ahli untuk Biome v2, linter, formatter, dan pengatur impor terpadu berbasis Rust yang dirancang untuk menggantikan rantai perkakas ESLint + Prettier yang lambat. Mencakup konfigurasi satu file (`biome.json`), migrasi otomatis bebas kendala (`biome migrate`), integrasi Git pre-commit hooks via Lefthook/Husky, aturan linting ketat untuk React 19 dan TypeScript 5.8+, serta pengawasan kualitas di pipeline CI/CD.

### Kondisi Pemicu
- Menyiapkan proyek baru yang membutuhkan proses linting dan pemformatan ultra-cepat (di bawah 1 detik).
- Migrasi dari kombinasi ESLint dan Prettier untuk mempercepat proses *check* hingga 10-100x lebih cepat.
- Mengonfigurasi hook pre-commit agar kode kotor tidak dapat di-commit ke repositori.
- Mengatasi konflik aturan antara formatter dan linter.

### Perbandingan: Biome vs ESLint + Prettier

| Aspek | Biome v2 | ESLint + Prettier |
|---|---|---|
| **Kecepatan** | 10-100x lebih cepat (Rust) | Lambat (Node.js engine) |
| **Konfigurasi** | 1 file tunggal (`biome.json`) | 3+ file (`.eslintrc`, `.prettierrc`, plugin) |
| **Ketergantungan Paket** | 1 package `@biomejs/biome` | Belasan plugin & dependensi parser |
| **Import Sorting** | Terintegrasi native | Membutuhkan plugin tambahan |

### Integrasi CI/CD di GitHub Actions

```yaml
# .github/workflows/quality.yml
name: Code Quality
on: [push, pull_request]

jobs:
  biome:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: biomejs/setup-biome@v2
        with:
          version: latest
      - name: Run Biome CI Gate
        run: biome ci .
```

## Integrasi Orkestrasi
- **`monorepo-architect`**: Mengatur pewarisan konfigurasi Biome pada monorepo pnpm.
- **`ci-cd-devops-architect`**: Menjalankan pemeriksaan `biome ci` secara otomatis pada setiap pull request.
- **`typescript-expert`**: Menyelaraskan aturan penamaan dan deteksi tipe data TypeScript.
- **`anti-slop`**: Membantu membersihkan kode mati (*dead code*) dan variabel tak terpakai secara instan.