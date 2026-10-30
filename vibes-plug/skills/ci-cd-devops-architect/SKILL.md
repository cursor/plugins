---
name: ci-cd-devops-architect
description: "Expert guide for continuous integration, deployment pipelines, Docker, Kubernetes, and Infrastructure as Code (IaC) / Panduan ahli untuk CI/CD dan infrastruktur."
author: "Roedy Rustam"
version: "4.3.0"
---

# CI/CD & DevOps Architect (Production Standard 2026)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Enterprise guide for modern Continuous Integration & Continuous Delivery (CI/CD) pipelines, immutable container workflows (Docker & Kubernetes 1.30+), and Infrastructure as Code (Terraform / OpenTofu). Covers parallelized GitHub Actions workflows with dependency caching (pnpm/bun), multi-stage non-root distroless Docker builds, Trivy container vulnerability scanning, zero-downtime rolling/canary deployments, and zero-trust secret injection via OIDC.

### Trigger Conditions
- Scaffolding new GitHub Actions or GitLab CI/CD pipelines (Phase 7).
- Writing hardened multi-stage Dockerfiles for Node.js, Bun, Go, or Rust applications.
- Setting up automated PR status checks and branch protection rules.
- Implementing container vulnerability scanning and SBOM generation.
- Configuring Infrastructure as Code (OpenTofu/Terraform) for cloud providers.

### Production Multi-Stage Dockerfile (Node.js 24 / Distroless)

```dockerfile
# syntax=docker/dockerfile:1.7
# Stage 1: Dependency resolution and compilation
FROM node:24-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy manifest files first to maximize layer caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code and build production bundle
COPY . .
RUN pnpm run build && pnpm prune --prod

# Stage 2: Minimal, hardened production runtime
FROM gcr.io/distroless/nodejs24-debian12:nonroot AS runner
WORKDIR /app

# Run strictly as non-root user (UID 65532 in distroless)
USER nonroot

# Copy only production artifacts
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["dist/index.js"]
```

### Production GitHub Actions Workflow (`.github/workflows/ci.yml`)

```yaml
name: Production CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest

      - name: Setup Node.js 24
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint and Format Check (Biome)
        run: npx @biomejs/biome ci .

      - name: Type Check (TypeScript)
        run: pnpm exec tsc --noEmit

      - name: Run Test Suite (Vitest)
        run: pnpm test

  security-scan:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Trivy Vulnerability Scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          ignore-unfixed: true
          severity: 'CRITICAL,HIGH'
```

### Key DevOps Invariants
1. **Immutable Artifacts**: Build the container image exactly once in CI. The identical binary is promoted across Staging and Production; only environment variables change.
2. **Non-Root Runtime**: Never run Docker containers as `root`. Always use unprivileged users (`nonroot` or `node`) to minimize container breakout vulnerabilities.
3. **No Hardcoded Secrets**: Secrets must never be stored in GitHub Secrets as plaintext strings. Use GitHub OIDC tokens to fetch short-lived credentials from AWS IAM or Vault (`zero-trust-secret-vault`).

## Orchestration & Integration
- **`cloud-hosting-expert`**: Connects pipeline deployment triggers with Vercel, Railway, or AWS ECS.
- **`zero-trust-secret-vault`**: Manages OIDC federated authentication and secret injection.
- **`autonomous-tdd-debugger`**: Runs unit and integration tests inside the CI runner.
- **`production-ready-hardener`**: Validates security headers, SBOM, and container scan outputs.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan enterprise untuk pipeline *Continuous Integration & Continuous Delivery* (CI/CD) modern, alur kerja kontainer imutabel (Docker & Kubernetes 1.30+), dan *Infrastructure as Code* (Terraform/OpenTofu). Mencakup pipeline GitHub Actions paralel dengan caching dependensi (pnpm/bun), Dockerfile multi-stage berbasis distroless non-root yang aman, pemindaian kerentanan kontainer dengan Trivy, serta injeksi rahasia tanpa password via OIDC.

### Kondisi Pemicu
- Membuat konfigurasi GitHub Actions atau GitLab CI/CD dari awal (Fase 7).
- Menulis Dockerfile multi-stage yang aman untuk aplikasi Node.js, Bun, Go, atau Rust.
- Mengatur aturan perlindungan cabang (*branch protection*) dan status checks wajib.
- Menjalankan pemindaian kerentanan kontainer otomatis sebelum rilis ke server.
- Mengonfigurasi infrastruktur cloud menggunakan Terraform atau OpenTofu.

### Contoh Manifest Kubernetes 1.30+ (Deployment Aman)

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vibes-api-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vibes-api
  template:
    metadata:
      labels:
        app: vibes-api
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 65532
      containers:
        - name: api
          image: myregistry.azurecr.io/vibes-api:latest
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
```

### 3 Hukum Mutlak Keamanan DevOps
1. **Artifak Imutabel**: Image kontainer yang diuji pada tahap Staging adalah file image yang sama persis yang dijalankan pada server Produksi.
2. **Larangan Akses Root**: Kontainer dilarang keras dijalankan dengan hak akses root demi mencegah eksploitasi pelarian kontainer (*container escape*).
3. **Rahasia Berumur Pendek**: Gunakan otentikasi OIDC tanpa kata kunci statis untuk mengakses registry dan server cloud.

## Integrasi Orkestrasi
- **`cloud-hosting-expert`**: Mengotomatisasi deployment akhir ke edge/cloud runner.
- **`zero-trust-secret-vault`**: Memasok token autentikasi dinamis ke dalam pipeline.
- **`autonomous-tdd-debugger`**: Memastikan seluruh test otomatis lolos sebelum komit di-merge.
- **`production-ready-hardener`**: Memverifikasi kesiapan rilis produksi pada tahap akhir CI.