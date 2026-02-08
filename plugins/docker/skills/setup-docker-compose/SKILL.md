# Skill: Set Up Docker Compose

## Description

Set up a complete Docker Compose development environment with hot-reload, database services, networking, health checks, and production readiness.

## Trigger

Use this skill when:
- Setting up a local development environment with Docker
- Adding database or cache services to a project
- Creating a multi-service application stack
- Configuring Docker Compose for development with hot-reload

## Instructions

### Step 1: Identify Required Services

Determine what services the application needs:
- **Application server(s)**: Web API, frontend, workers
- **Databases**: PostgreSQL, MySQL, MongoDB, etc.
- **Caches**: Redis, Memcached
- **Message queues**: RabbitMQ, Kafka, NATS
- **Search**: Elasticsearch, Meilisearch
- **Monitoring**: Prometheus, Grafana
- **Email**: Mailhog, Mailpit
- **Storage**: MinIO (S3-compatible)

### Step 2: Create the Compose File

Use the following template structure:

```yaml
# compose.yaml — Development environment
# Usage: docker compose up -d

services:
  # ─── Application ───────────────────────────────────────────
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: dev  # Use dev stage for hot-reload
    ports:
      - "${APP_PORT:-3000}:3000"
    volumes:
      - .:/app             # Source code mount for hot-reload
      - /app/node_modules  # Prevent overwriting container's node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp_dev
      - REDIS_URL=redis://cache:6379
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s
    networks:
      - frontend
      - backend

  # ─── Database ──────────────────────────────────────────────
  db:
    image: postgres:16-alpine
    ports:
      - "${DB_PORT:-5432}:5432"
    environment:
      POSTGRES_DB: myapp_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - backend

  # ─── Cache ────────────────────────────────────────────────
  cache:
    image: redis:7.2-alpine
    ports:
      - "${REDIS_PORT:-6379}:6379"
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - backend

  # ─── Monitoring (optional) ────────────────────────────────
  prometheus:
    image: prom/prometheus:v2.50.0
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    profiles:
      - monitoring
    networks:
      - backend

  grafana:
    image: grafana/grafana:10.3.1
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    profiles:
      - monitoring
    depends_on:
      - prometheus
    networks:
      - backend

  # ─── Email (optional) ─────────────────────────────────────
  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "8025:8025"  # Web UI
      - "1025:1025"  # SMTP
    profiles:
      - debug
    networks:
      - backend

# ─── Volumes ──────────────────────────────────────────────────
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

# ─── Networks ─────────────────────────────────────────────────
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

### Step 3: Create Development Dockerfile Stage

Add a `dev` target to the Dockerfile for hot-reload:

```dockerfile
# Development stage with hot-reload
FROM base AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]
```

### Step 4: Create Environment Files

Create a `.env.example` template:

```env
# Application
APP_PORT=3000
NODE_ENV=development

# Database
DB_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp_dev

# Redis
REDIS_PORT=6379
REDIS_URL=redis://cache:6379

# Secrets (override in .env.local)
JWT_SECRET=dev-secret-change-me
API_KEY=dev-api-key
```

### Step 5: Add Helper Scripts

Create a `Makefile` or shell scripts for common operations:

```makefile
.PHONY: up down restart logs clean

up:                       ## Start all services
	docker compose up -d

up-all:                   ## Start all services including monitoring
	docker compose --profile monitoring --profile debug up -d

down:                     ## Stop all services
	docker compose down

restart:                  ## Restart all services
	docker compose restart

logs:                     ## Tail logs for all services
	docker compose logs -f

logs-app:                 ## Tail logs for the app only
	docker compose logs -f app

clean:                    ## Remove all containers, volumes, and images
	docker compose down -v --rmi local

db-shell:                 ## Open a psql shell
	docker compose exec db psql -U postgres -d myapp_dev

redis-cli:                ## Open a Redis CLI
	docker compose exec cache redis-cli

build:                    ## Rebuild all images
	docker compose build --no-cache

status:                   ## Show status of all services
	docker compose ps
```

### Step 6: Configure Hot-Reload

Ensure hot-reload works properly:

- **Node.js**: Mount source code, exclude `node_modules` with anonymous volume
- **Python**: Mount source code, use `--reload` flag with uvicorn/gunicorn
- **Go**: Use `air` or `CompileDaemon` for live reloading
- **Java**: Use Spring DevTools with `spring-boot-devtools`

### Step 7: Production Compose Override

Create a `compose.prod.yaml` for production overrides:

```yaml
# compose.prod.yaml — Production overrides
# Usage: docker compose -f compose.yaml -f compose.prod.yaml up -d

services:
  app:
    build:
      target: runtime  # Use production stage
    volumes: []        # No source code mounting
    environment:
      - NODE_ENV=production
    restart: always
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 256M
      replicas: 2

  db:
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password

  cache:
    command: redis-server --appendonly yes --requirepass $${REDIS_PASSWORD}

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## Common Patterns

### Database Initialization

Mount SQL scripts into the database's init directory:

```yaml
volumes:
  - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
  - ./scripts/seed-data.sql:/docker-entrypoint-initdb.d/02-seed.sql:ro
```

### Waiting for Dependencies

Use healthchecks with `depends_on` conditions:

```yaml
depends_on:
  db:
    condition: service_healthy
  cache:
    condition: service_started
  migrations:
    condition: service_completed_successfully
```

### Multi-App Stacks

For monorepos or microservices, use multiple build contexts:

```yaml
services:
  api:
    build:
      context: ./services/api
      dockerfile: Dockerfile
  web:
    build:
      context: ./services/web
      dockerfile: Dockerfile
  worker:
    build:
      context: ./services/worker
      dockerfile: Dockerfile
```

## Output

The skill produces:
- A complete `compose.yaml` for local development
- A `compose.prod.yaml` for production overrides
- A `.env.example` template
- Helper scripts / Makefile for common operations
- Properly configured networking, volumes, and healthchecks
