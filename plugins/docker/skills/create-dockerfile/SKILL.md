# Skill: Create Optimized Dockerfile

## Description

Create production-ready, optimized Dockerfiles for various programming languages and frameworks. This skill covers multi-stage builds, security hardening, layer caching, and language-specific best practices.

## Trigger

Use this skill when:
- Creating a new Dockerfile for a project
- Containerizing an existing application
- Optimizing an existing Dockerfile
- Setting up CI/CD Docker builds

## Instructions

### Step 1: Determine the Application Type

Identify the programming language, framework, and runtime requirements:
- What language and version?
- What package manager?
- Does it need a build step (compiled language, frontend bundling)?
- What ports does it expose?
- What environment variables does it need?
- Are there any system-level dependencies?

### Step 2: Choose the Base Image

Select the most appropriate base image:
- **Alpine variants** (`-alpine`): Smallest general-purpose images (~5MB base)
- **Slim variants** (`-slim`): Smaller than full images, more compatible than Alpine
- **Distroless** (`gcr.io/distroless/*`): Minimal images without shell or package manager
- **Scratch** (`scratch`): Empty image for fully static binaries

### Step 3: Create the Dockerfile

Use the appropriate language-specific template below.

---

## Language-Specific Patterns

### Node.js

```dockerfile
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    cp -R node_modules /prod_modules && \
    npm ci

# Build application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=deps /prod_modules ./node_modules
COPY package.json ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["node"]
CMD ["dist/index.js"]
```

### Python

```dockerfile
ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION}-slim AS base
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install dependencies
FROM base AS deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# For projects using Poetry
# COPY pyproject.toml poetry.lock ./
# RUN pip install poetry && \
#     poetry config virtualenvs.create false && \
#     poetry install --no-dev --no-interaction --no-ansi

# Production image
FROM base AS runtime
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin
COPY . .

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

ENTRYPOINT ["python"]
CMD ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Go

```dockerfile
ARG GO_VERSION=1.22
FROM golang:${GO_VERSION}-alpine AS builder
WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/server ./cmd/server

# Production image — scratch for smallest possible image
FROM scratch AS runtime
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD ["/server", "healthcheck"]

ENTRYPOINT ["/server"]
```

### Java (Spring Boot / Gradle)

```dockerfile
ARG JAVA_VERSION=21
FROM eclipse-temurin:${JAVA_VERSION}-jdk-alpine AS builder
WORKDIR /app

# Cache Gradle dependencies
COPY build.gradle.kts settings.gradle.kts gradlew ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon

# Build application
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# Extract Spring Boot layers for better caching
FROM eclipse-temurin:${JAVA_VERSION}-jdk-alpine AS extractor
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
RUN java -Djarmode=layertools -jar app.jar extract

# Production image
FROM eclipse-temurin:${JAVA_VERSION}-jre-alpine AS runtime
WORKDIR /app

COPY --from=extractor /app/dependencies/ ./
COPY --from=extractor /app/spring-boot-loader/ ./
COPY --from=extractor /app/snapshot-dependencies/ ./
COPY --from=extractor /app/application/ ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

### Rust

```dockerfile
ARG RUST_VERSION=1.76
FROM rust:${RUST_VERSION}-alpine AS builder
WORKDIR /app

RUN apk add --no-cache musl-dev

# Cache dependencies
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src

# Build application
COPY src ./src
RUN touch src/main.rs && cargo build --release

# Production image
FROM scratch AS runtime
COPY --from=builder /app/target/release/myapp /myapp

EXPOSE 8080

ENTRYPOINT ["/myapp"]
```

---

### Step 4: Create .dockerignore

Always create a `.dockerignore` alongside the Dockerfile:

```
.git
.gitignore
.dockerignore
Dockerfile*
docker-compose*
README.md
LICENSE
CHANGELOG.md
.env*
.vscode
.idea
*.md
node_modules
__pycache__
*.pyc
target/
dist/
build/
.next/
coverage/
.nyc_output/
*.test.*
*.spec.*
tests/
test/
docs/
```

### Step 5: Security Hardening

Apply these security measures to every Dockerfile:

1. **Non-root user**: Always run as non-root
2. **Read-only filesystem**: Use `--read-only` flag at runtime
3. **No new privileges**: Use `--security-opt=no-new-privileges` at runtime
4. **Drop capabilities**: Drop all capabilities, add only what's needed
5. **Scan for vulnerabilities**: Run `trivy image <image>` before deploying
6. **Use COPY --chmod**: Set file permissions without extra layers

```dockerfile
COPY --chown=appuser:appgroup --chmod=555 ./entrypoint.sh /entrypoint.sh
```

### Step 6: Verify the Image

After building, verify the image:

```bash
# Build the image
docker build -t myapp:latest .

# Check image size
docker images myapp:latest

# Inspect layers
docker history myapp:latest

# Analyze with dive
dive myapp:latest

# Scan for vulnerabilities
trivy image myapp:latest

# Test the container
docker run --rm -p 8080:8080 myapp:latest
```

## Output

The skill produces:
- An optimized, multi-stage Dockerfile
- A comprehensive `.dockerignore` file
- Security-hardened configuration
- Build and verification commands
