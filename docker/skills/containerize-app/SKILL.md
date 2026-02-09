---
name: containerize-app
description: Language-specific Dockerfiles for Node.js, Python, Go, Java, and Rust with multi-stage builds
---

# Skill: Containerize an Application

## Description

Generate a production-ready Dockerfile for an application, tailored to its language, framework, and deployment requirements. Includes multi-stage builds, security hardening, and optimization best practices.

## Trigger

Use this skill when a user wants to:
- Create a Dockerfile for their application
- Containerize an existing project
- Convert a development Dockerfile to production-ready
- Add Docker support to a project

## Inputs

1. **Language/Runtime** — Detected from project files (package.json, go.mod, requirements.txt, Cargo.toml, pom.xml, etc.)
2. **Framework** — Detected from dependencies (Express, FastAPI, Gin, Spring Boot, Actix, etc.)
3. **Entry point** — The main file or command to run the application
4. **Port** — The port the application listens on
5. **Build command** — If applicable (npm run build, go build, cargo build, etc.)

## Steps

### Step 1: Detect Project Type

Scan the project root for dependency/config files to determine the language and framework:

| File                | Language   | Common Frameworks            |
|---------------------|------------|------------------------------|
| `package.json`      | Node.js    | Express, Next.js, Fastify    |
| `requirements.txt`  | Python     | Flask, FastAPI, Django       |
| `pyproject.toml`    | Python     | FastAPI, Django, Poetry      |
| `go.mod`            | Go         | Gin, Echo, Fiber             |
| `Cargo.toml`        | Rust       | Actix, Axum, Rocket         |
| `pom.xml`           | Java       | Spring Boot, Quarkus         |
| `build.gradle`      | Java/Kotlin| Spring Boot, Ktor           |
| `Gemfile`           | Ruby       | Rails, Sinatra               |
| `composer.json`     | PHP        | Laravel, Symfony             |

### Step 2: Generate Dockerfile

#### Node.js (Express / Fastify / NestJS)

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

#### Next.js

```dockerfile
# Dependencies stage
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy only the necessary files for standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
```

#### Python (FastAPI / Flask / Django)

```dockerfile
# Build stage
FROM python:3.12-slim AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Production stage
FROM python:3.12-slim AS production
WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Install runtime-only system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy application
COPY . .

# Security: run as non-root
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Go (Gin / Echo / Fiber)

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder
WORKDIR /app

# Install CA certificates for HTTPS and timezone data
RUN apk add --no-cache ca-certificates tzdata

# Download dependencies first for caching
COPY go.mod go.sum ./
RUN go mod download

# Build the binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server

# Production stage — scratch for minimal image
FROM scratch AS production
WORKDIR /app

# Copy CA certs and timezone data from builder
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the binary
COPY --from=builder /app/server .

# Run as non-root (numeric UID since scratch has no user database)
USER 65534:65534

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["/app/server", "healthcheck"]

EXPOSE 8080
ENTRYPOINT ["/app/server"]
```

#### Java (Spring Boot)

```dockerfile
# Build stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy gradle files for dependency caching
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
COPY gradlew ./
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon

# Build application
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# Extract layers for optimized Docker layering
FROM eclipse-temurin:21-jdk-alpine AS extractor
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# Production stage
FROM eclipse-temurin:21-jre-alpine AS production
WORKDIR /app

# Copy extracted layers (ordered by change frequency)
COPY --from=extractor /app/dependencies/ ./
COPY --from=extractor /app/spring-boot-loader/ ./
COPY --from=extractor /app/snapshot-dependencies/ ./
COPY --from=extractor /app/application/ ./

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

EXPOSE 8080
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

#### Rust (Actix / Axum)

```dockerfile
# Build stage
FROM rust:1.76-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache musl-dev

# Cache dependencies — build a dummy project first
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs
RUN cargo build --release && rm -rf src target/release/deps/$(basename $(pwd))*

# Build the real application
COPY src ./src
RUN cargo build --release

# Production stage
FROM alpine:3.19 AS production
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Copy the binary
COPY --from=builder /app/target/release/app .

# Security: run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

EXPOSE 8080
CMD ["./app"]
```

### Step 3: Generate .dockerignore

Create a `.dockerignore` file appropriate for the detected language:

```
# Version control
.git
.gitignore

# IDE and editor files
.vscode
.idea
*.swp
*.swo

# Docker files (prevent recursive context)
Dockerfile*
docker-compose*.yml
.dockerignore

# Documentation
*.md
LICENSE

# CI/CD
.github
.gitlab-ci.yml

# Environment files
.env
.env.*
!.env.example

# Test and coverage
coverage
__tests__
*.test.*
*.spec.*

# Language-specific (added based on detection)
# Node.js: node_modules, .next, .nuxt, dist
# Python: __pycache__, *.pyc, .venv, .pytest_cache
# Go: vendor (if not vendoring)
# Rust: target
# Java: build, .gradle, target
```

### Step 4: Validate

After generating the Dockerfile:

1. Verify the Dockerfile builds successfully: `docker build -t app:test .`
2. Verify the container runs: `docker run --rm -p PORT:PORT app:test`
3. Verify the health check passes: `docker inspect --format='{{.State.Health.Status}}' <container>`
4. Check image size: `docker images app:test`
5. Scan for vulnerabilities: `docker scout cves app:test`

## Output

- `Dockerfile` — Production-ready, multi-stage Dockerfile
- `.dockerignore` — Properly configured ignore file
- Inline comments explaining each instruction and optimization choice
