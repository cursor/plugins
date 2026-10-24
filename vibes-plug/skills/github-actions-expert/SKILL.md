---
name: github-actions-expert
description: "Expert guide for GitHub Actions CI/CD workflows, reusable workflows, composite actions, matrix builds, OIDC cloud auth, security hardening, and artifact automation / Panduan ahli GitHub Actions CI/CD workflows, reusable workflows, aksi komposit, autentikasi cloud OIDC, pengerasan keamanan, dan otomasi rilis."
author: "Roedy Rustam"
version: "4.4.0"
---

# GitHub Actions Expert (Enterprise CI/CD Standard 2026)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects with: `brainstorming`, `zero-to-prod-orchestrator`, `ci-cd-devops-architect`, `e2e-testing-expert`, `autonomous-tdd-debugger`, `production-ready-hardener`, `anti-slop`, `zero-trust-secret-vault`, `cloud-hosting-expert`, `session-memory-manager`.

### Description
Enterprise-grade guide for engineering hardened, high-performance Continuous Integration & Continuous Delivery (CI/CD) pipelines on **GitHub Actions**. Covers deterministic dependency caching (pnpm/bun/uv/cargo), reusable workflows (`workflow_call`), composite actions (`using: 'composite'`), dynamic multi-platform matrix builds, OpenID Connect (OIDC) cloud federation for AWS/GCP/Azure with zero long-lived credentials, immutable action pinning by commit SHA, fine-grained `GITHUB_TOKEN` permissions, concurrency control, artifact attestation, and npm/OCI provenance publishing.

### Trigger Conditions
- Designing, scaffolding, or modernizing `.github/workflows/` pipelines.
- Implementing automated PR verification: linting, type-checking, unit tests, and E2E gates.
- Setting up reusable workflows (`workflow_call`) or modular composite actions.
- Hardening CI/CD security: replacing long-lived tokens with OIDC federation.
- Pinning third-party GitHub Actions to immutable full commit SHAs.
- Configuring concurrency groups with `cancel-in-progress: true` to prevent queue bloat.
- Generating build provenance and software bills of materials (SBOM).
- Automating multi-platform release builds, semantic versioning, and package publishing.

### What's New in 2026 (Modern GitHub Actions Standard)

#### 1. Security & Governance First
- **Zero Static Credentials**: All cloud deployments must use OpenID Connect (OIDC) federated role assumption via `permissions: id-token: write`.
- **Full SHA Action Pinning**: Never use `@v4` or `@main` tags in production workflows. Pin exact 40-character commit SHAs with inline human-readable comments (e.g. `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2`).
- **Least-Privilege Token Permissions**: Workflows must declare top-level `permissions: {}` (deny all) and elevate only specific job scopes (`contents: read`, `pull-requests: write`, etc.).
- **Software Supply Chain Provenance**: Automated SLSA Level 3 attestations using `actions/attest-build-provenance`.

#### 2. Speed & Determinism
- **Native Dependency Caching**: Utilize native package manager caching via setup actions (`setup-node` with `cache: 'pnpm'`, `setup-python` with `cache: 'uv'`).
- **Concurrency Cancellation**: Cancel redundant runs on rapid git pushes via `concurrency: group: ${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true`.
- **Fast-Fail Matrix Strategy**: Optimize CI compute cycles with `strategy: fail-fast: true` during preliminary PR checks and `fail-fast: false` for release suites.

---

### Core Architecture Patterns

#### Pattern 1: Production Hardened CI Pipeline (`.github/workflows/ci.yml`)

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

# Enforce least-privilege permissions across the entire workflow
permissions: {}

# Cancel obsolete in-flight runs when new commits arrive
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-typecheck:
    name: Code Quality & Type Check
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: read
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
        with:
          fetch-depth: 1

      - name: Install pnpm Package Manager
        uses: pnpm/action-setup@a3252b78c470c02df07e9d59298aecedc3ccdd6d # v3.0.0
        with:
          version: 9.15.4
          run_install: false

      - name: Setup Node.js Runtime
        uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version: 22
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Linter Audit
        run: pnpm run lint

      - name: Run TypeScript Verification
        run: pnpm run typecheck

  test-matrix:
    name: Test Suite Matrix (Node ${{ matrix.node-version }} on ${{ matrix.os }})
    needs: [lint-and-typecheck]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 15
    permissions:
      contents: read
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [20, 22, 24]
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Install pnpm Package Manager
        uses: pnpm/action-setup@a3252b78c470c02df07e9d59298aecedc3ccdd6d # v3.0.0
        with:
          version: 9.15.4

      - name: Setup Node.js Runtime
        uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Execute Automated Unit & Integration Tests
        run: pnpm test -- --coverage

      - name: Upload Test Coverage Artifacts (Ubuntu Node 22 only)
        if: matrix.os == 'ubuntu-latest' && matrix.node-version == 22
        uses: actions/upload-artifact@b4b15b8c7c6ac21ea08fcf65892d2ee8f75cf882 # v4.4.3
        with:
          name: code-coverage-report
          path: coverage/
          retention-days: 14
```

---

#### Pattern 2: Zero-Secret OIDC Cloud Deployment (`.github/workflows/deploy.yml`)

```yaml
name: Deploy Production Service

on:
  push:
    branches: [main]

permissions: {}

concurrency:
  group: production-deployment
  cancel-in-progress: false

jobs:
  deploy-cloud:
    name: OIDC Authenticated Cloud Deploy
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.production.internal
    permissions:
      id-token: write # Required for requesting OpenID Connect JWT tokens
      contents: read
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Authenticate with AWS via OIDC Role Assumption
        uses: aws-actions/configure-aws-credentials@e3ddf1e3cb0f23561c4d1c6a56b5b9eb29570d8c # v4.0.2
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-production-deployer
          aws-region: ap-southeast-1
          audience: sts.amazonaws.com

      - name: Verify AWS Caller Identity
        run: aws sts get-caller-identity

      - name: Deploy Infrastructure or Edge Worker
        run: |
          echo "Deploying verified release to production..."
          # Application deploy command executed here
```

---

#### Pattern 3: Custom Modular Composite Action (`.github/actions/setup-project/action.yml`)

```yaml
name: Setup Project Environment
description: Reusable composite action to install pnpm, setup Node.js runtime, and hydrate cache.

inputs:
  node-version:
    description: Node.js major version
    required: false
    default: '22'
  pnpm-version:
    description: pnpm package manager version
    required: false
    default: '9.15.4'

runs:
  using: 'composite'
  steps:
    - name: Enable Corepack and Install pnpm
      shell: bash
      run: |
        corepack enable
        corepack prepare pnpm@${{ inputs.pnpm-version }} --activate

    - name: Setup Node.js with Native pnpm Cache
      uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'pnpm'

    - name: Hydrate Node Modules
      shell: bash
      run: pnpm install --frozen-lockfile
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dengan: `brainstorming`, `zero-to-prod-orchestrator`, `ci-cd-devops-architect`, `e2e-testing-expert`, `autonomous-tdd-debugger`, `production-ready-hardener`, `anti-slop`, `zero-trust-secret-vault`, `cloud-hosting-expert`, `session-memory-manager`.

### Deskripsi
Panduan standar industri enterprise untuk merancang dan memelihara pipeline Continuous Integration & Continuous Delivery (CI/CD) berperforma tinggi dan aman di **GitHub Actions**. Meliputi optimasi cache dependensi deterministik (pnpm/bun/uv/cargo), workflow pakai ulang (`workflow_call`), aksi komposit modular (`using: 'composite'`), matriks pengujian multi-platform, autentikasi cloud OpenID Connect (OIDC) tanpa kunci statis untuk AWS/GCP/Azure, penguncian aksi pihak ketiga dengan full commit SHA, hak akses minimum `GITHUB_TOKEN`, manajemen konkurensi, atestasi artifak, dan publikasi paket dengan sertifikasi provenance.

### Kondisi Pemicu (Trigger Conditions)
- Membuat, mengonfigurasi, atau memodernisasi pipeline di folder `.github/workflows/`.
- Menerapkan pengujian otomatis pada Pull Request: linter, typecheck TypeScript, unit test, dan E2E test.
- Mengonfigurasi aksi komposit modular atau reusable workflow untuk efisiensi repo.
- Meningkatkan keamanan CI/CD: mengganti secret statis berumur panjang dengan OIDC federation.
- Mengunci third-party action menggunakan 40-karakter commit SHA permanen.
- Mengatur grup konkurensi dengan `cancel-in-progress: true` untuk menghentikan workflow redundan.
- Menghasilkan tanda tangan bukti perangkat lunak (SBOM / SLSA Level 3 Provenance).
- Otomasi rilis versi paket (npm, Docker OCI, VSIX) saat git tag dibuat.

### Aturan Emas Keamanan & Performa 2026

1. **Prinsip Hak Akses Terendah (Least Privilege)**: Tentukan `permissions: {}` di level workflow root, lalu berikan izin spesifik yang diperlukan pada setiap job (`contents: read`, `pull-requests: write`).
2. **Kunci SHA Komit Penuh (Full SHA Pinning)**: Dilarang menggunakan tag yang dapat berubah seperti `@v4` atau `@main`. Selalu gunakan hash 40 karakter commit SHA disertai komentar versi.
3. **Autentikasi Cloud OIDC (Zero-Static Secrets)**: Gunakan OpenID Connect JWT token (`permissions: id-token: write`) untuk berinteraksi dengan AWS/GCP/Azure tanpa menyimpan API Key permanen di repository secrets.
4. **Pencegahan Penumpukan Antrean**: Gunakan blok `concurrency` dengan pembatalan otomatis untuk menghemat menit CI runner pada push beruntun.
5. **Cache Dependensi Terpadu**: Manfaatkan caching bawaan pada runner daripada melakukan download paket berulang dari internet pada setiap langkah pengujian.
