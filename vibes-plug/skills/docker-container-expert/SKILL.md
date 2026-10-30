---
name: docker-container-expert
description: "Expert guide for production Docker containerization, multi-stage BuildKit builds, rootless execution, distroless runtimes, container security hardening, and Docker Compose v2 topology / Panduan ahli kontainerisasi Docker produksi, multi-stage BuildKit, rootless, distroless, dan Docker Compose v2."
author: "Roedy Rustam"
version: "4.4.0"
---

# Docker Container Expert (Production Standard 2026)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects with: `brainstorming`, `zero-to-prod-orchestrator`, `ci-cd-devops-architect`, `github-actions-expert`, `js-backend-expert`, `python-programming-expert`, `go-programming-expert`, `rust-programming-expert`, `database-orm-expert`, `production-ready-hardener`, `session-memory-manager`.

### Description
Enterprise guide for building ultra-lean, hardened, and reproducible container images and orchestrating local and production workloads with **Docker Engine 27+** and **Docker Compose v2**. Covers BuildKit cache mounts (`--mount=type=cache`), secret mounts (`--mount=type=secret`), multi-stage builds targeting Google Distroless or Alpine Linux, non-root execution (UID 65532), dropping Linux kernel capabilities (`cap_drop: ALL`), health checks (`HEALTHCHECK`), internal isolated bridge networks, compose dependency sequencing (`condition: service_healthy`), and multi-architecture builds via `docker buildx`.

### Trigger Conditions
- Writing, refactoring, or optimizing `Dockerfile` manifests for Node.js, Python, Go, Rust, or Bun.
- Structuring multi-container local and staging topologies with `compose.yaml`.
- Accelerating build speeds using Docker BuildKit cache mounts and layer ordering.
- Minimizing image attack surface: eliminating shell binaries, package managers, and root permissions.
- Hardening container security: dropping Linux capabilities, setting read-only filesystems, and enforcing memory/CPU limits.
- Configuring robust health checks and zero-downtime container lifecycle management.

### What's New in 2026 (Modern Containerization Standards)

#### 1. BuildKit as the De Facto Engine
- Always specify `# syntax=docker/dockerfile:1.7` at the top of the Dockerfile.
- Use `--mount=type=cache` for package manager caches (`/root/.local/share/pnpm/store`, `/root/.cache/pip`, `/var/cache/apt`).
- Use `--mount=type=secret,id=npmrc` to inject credentials without leaving traces in image layers.

#### 2. Rootless & Distroless Execution
- Never run containers as `root` (UID 0). Use Google Distroless `nonroot` (UID 65532) or explicitly created system users with no shell (`/sbin/nologin`).
- Discard build tools (`gcc`, `npm`, `cargo`) completely in intermediate build stages.

#### 3. Compose Specification Standard
- Standard filename is `compose.yaml` (preferred over deprecated `docker-compose.yml`).
- Explicit health checks with dependency conditions (`depends_on: service: condition: service_healthy`).
- Strict resource reservations and limits (CPU and memory envelopes).

---

### Core Architecture Patterns

#### Pattern 1: Production Multi-Stage Distroless Node.js Dockerfile (`Dockerfile`)

```dockerfile
# syntax=docker/dockerfile:1.7
# Stage 1: Dependency resolution and compilation
FROM node:22-alpine AS builder
WORKDIR /app

# Enable pnpm deterministically via corepack
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Layer caching: copy package manifests first
COPY package.json pnpm-lock.yaml ./

# Install dependencies using persistent BuildKit cache mount
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy application source code
COPY . .

# Build production bundle and prune development dependencies
RUN pnpm run build && pnpm prune --prod

# Stage 2: Minimal hardened production runner (Zero Shell, Zero Package Manager)
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runner
WORKDIR /app

# Run strictly as unprivileged user (UID 65532)
USER nonroot

# Copy build artifacts and production dependencies with nonroot ownership
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Execute Node.js directly (no shell wrapper)
CMD ["dist/index.js"]
```

---

#### Pattern 2: Ultra-Minimal Static Go/Rust Binary Container (`Dockerfile.go`)

```dockerfile
# syntax=docker/dockerfile:1.7
# Stage 1: Compile static binary
FROM golang:1.24-alpine AS builder
WORKDIR /src

RUN apk add --no-cache ca-certificates tzdata

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .

# Compile static binary without CGO dependency
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /bin/server ./cmd/server

# Stage 2: Scratch container (Zero attack surface, < 15MB total size)
FROM scratch
WORKDIR /app

# Import SSL root certificates and timezone data from builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /bin/server /app/server

# Run as non-root user ID
USER 65532:65532

EXPOSE 8080

ENTRYPOINT ["/app/server"]
```

---

#### Pattern 3: Production-Grade Multi-Service `compose.yaml`

```yaml
services:
  database:
    image: postgres:17-alpine
    container_name: production_db
    restart: unless-stopped
    environment:
      POSTGRES_DB: app_production
      POSTGRES_USER: app_admin
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - internal_backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app_admin -d app_production"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2048M
        reservations:
          cpus: '0.5'
          memory: 512M

  cache:
    image: redis:7-alpine
    container_name: production_cache
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes", "--requirepass", "cache_secure_token"]
    volumes:
      - redisdata:/data
    networks:
      - internal_backend
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "cache_secure_token", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: production_api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://app_admin:secret@database:5432/app_production
      REDIS_URL: redis://:cache_secure_token@cache:6379
    ports:
      - "3000:3000"
    networks:
      - internal_backend
      - public_ingress
    depends_on:
      database:
        condition: service_healthy
      cache:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 1024M

networks:
  internal_backend:
    internal: true
  public_ingress:
    driver: bridge

volumes:
  pgdata:
  redisdata:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dengan: `brainstorming`, `zero-to-prod-orchestrator`, `ci-cd-devops-architect`, `github-actions-expert`, `js-backend-expert`, `python-programming-expert`, `go-programming-expert`, `rust-programming-expert`, `database-orm-expert`, `production-ready-hardener`, `session-memory-manager`.

### Deskripsi
Panduan standar industri enterprise untuk membangun image kontainer yang ramping, aman, dan dapat direproduksi serta mengorkestrasi lingkungan lokal dan produksi menggunakan **Docker Engine 27+** dan **Docker Compose v2**. Meliputi cache mount BuildKit (`--mount=type=cache`), secret mount (`--mount=type=secret`), multi-stage build berbasis Google Distroless atau Alpine Linux, eksekusi non-root (UID 65532), pelepasan kapabilitas Linux kernel (`cap_drop: ALL`), health check (`HEALTHCHECK`), isolasi jaringan internal (isolated bridge network), sequencing dependensi compose (`condition: service_healthy`), dan build multi-arsitektur menggunakan `docker buildx`.

### Kondisi Pemicu (Trigger Conditions)
- Menulis, merefaktor, atau mengoptimalkan `Dockerfile` untuk Node.js, Python, Go, Rust, atau Bun.
- Menyusun topologi multi-kontainer untuk lingkungan lokal atau staging menggunakan `compose.yaml`.
- Mempercepat build image dengan memanfaatkan BuildKit cache mount dan pengurutan layer yang optimal.
- Memperkecil permukaan serangan (attack surface) image: menghapus shell bash/sh, package manager, dan akses root.
- Memperketat keamanan kontainer: mencabut kemampuan Linux berlebih, filesystem read-only, dan limitasi resource CPU/RAM.
- Menyiapkan health check yang andal untuk manajemen siklus hidup kontainer tanpa downtime.

### Aturan Emas Kontainerisasi Modern 2026

1. **Dilarang Menjalankan Kontainer Sebagai Root**: Selalu gunakan user tanpa hak istimewa seperti `nonroot` (UID 65532 pada Google Distroless) untuk mencegah potensi container breakout ke host system.
2. **Multi-Stage Build Bersih**: Pisahkan lingkungan kompilasi/build (yang memerlukan compiler dan devDependencies) dari lingkungan runtime produksi. Image akhir hanya berisi artefak biner murni atau bundle yang siap dieksekusi.
3. **Pemanfaatan Cache Mount BuildKit**: Gunakan sintaks `# syntax=docker/dockerfile:1.7` dan opsi `--mount=type=cache` agar unduhan dependensi paket tidak diulang setiap kali ada perubahan kode sumber.
4. **Healthcheck & Urutan Dependensi**: Selalu definisikan mekanisme pemeriksaan kesehatan kontainer dan gunakan `depends_on: [service]: condition: service_healthy` pada `compose.yaml` untuk mencegah race condition saat database belum siap menerima koneksi.
5. **Isolasi Jaringan Internal**: Letakkan database dan cache pada jaringan internal dengan flag `internal: true` sehingga tidak dapat diakses secara langsung dari luar jaringan kontainer.
