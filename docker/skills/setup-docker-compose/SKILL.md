---
name: setup-docker-compose
description: Multi-service development environments with databases, caches, and queues
---

# Skill: Set Up Docker Compose

## Description

Generate a complete Docker Compose configuration for a multi-service development environment. Includes databases, caches, message queues, and development utilities — all properly configured with health checks, networking, and volume persistence.

## Trigger

Use this skill when a user wants to:
- Set up a local development environment with Docker Compose
- Add services (databases, caches, queues) to their Docker stack
- Create a multi-service architecture with Docker Compose
- Configure a compose file for their project

## Inputs

1. **Application services** — The user's application(s) to run
2. **Data stores** — Required databases (Postgres, MySQL, MongoDB, etc.)
3. **Caches** — Required caching layers (Redis, Memcached, etc.)
4. **Message queues** — Required brokers (RabbitMQ, Kafka, NATS, etc.)
5. **Dev tools** — Optional development utilities (Adminer, Mailhog, etc.)

## Steps

### Step 1: Assess Requirements

Scan the project to determine required services:

| Dependency Indicator           | Service             | Default Image                      |
|-------------------------------|---------------------|------------------------------------|
| `pg`, `postgres`, `prisma`    | PostgreSQL          | `postgres:16.2-alpine`             |
| `mysql`, `mysql2`             | MySQL               | `mysql:8.3`                        |
| `mongodb`, `mongoose`         | MongoDB             | `mongo:7.0`                        |
| `redis`, `ioredis`            | Redis               | `redis:7.2-alpine`                 |
| `amqplib`, `rabbitmq`         | RabbitMQ            | `rabbitmq:3.13-management-alpine`  |
| `kafkajs`, `kafka`            | Kafka               | `confluentinc/cp-kafka:7.6.0`      |
| `elasticsearch`, `@elastic`   | Elasticsearch       | `elasticsearch:8.12.2`             |
| `minio`, `s3`                 | MinIO (S3-compat)   | `minio/minio:latest`               |
| `nats`                        | NATS                | `nats:2.10-alpine`                 |

### Step 2: Generate Compose File

#### Full-Stack Web Application (Node.js + Postgres + Redis)

```yaml
# compose.yaml
services:
  # Application
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    ports:
      - "${APP_PORT:-3000}:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/app_dev
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    volumes:
      - ./src:/app/src
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: package.json

  # PostgreSQL Database
  db:
    image: postgres:16.2-alpine
    ports:
      - "${DB_PORT:-5432}:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: ${POSTGRES_DB:-app_dev}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped
    networks:
      - app-network
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M

  # Redis Cache
  redis:
    image: redis:7.2-alpine
    ports:
      - "${REDIS_PORT:-6379}:6379"
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M

  # Database Admin UI (development only)
  adminer:
    image: adminer:4.8.1
    ports:
      - "${ADMINER_PORT:-8080}:8080"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network
    profiles:
      - dev

  # Mail catcher (development only)
  mailhog:
    image: mailhog/mailhog:v1.0.1
    ports:
      - "${MAILHOG_SMTP_PORT:-1025}:1025"
      - "${MAILHOG_UI_PORT:-8025}:8025"
    networks:
      - app-network
    profiles:
      - dev

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  app-network:
    driver: bridge
```

#### Microservices Architecture

```yaml
# compose.yaml
services:
  # API Gateway
  gateway:
    build:
      context: ./services/gateway
      target: development
    ports:
      - "3000:3000"
    environment:
      - AUTH_SERVICE_URL=http://auth:3001
      - USER_SERVICE_URL=http://users:3002
      - ORDER_SERVICE_URL=http://orders:3003
    depends_on:
      auth:
        condition: service_healthy
      users:
        condition: service_healthy
      orders:
        condition: service_healthy
    networks:
      - frontend
      - backend
    restart: unless-stopped

  # Auth Service
  auth:
    build:
      context: ./services/auth
      target: development
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@auth-db:5432/auth
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      auth-db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3001/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - backend
    restart: unless-stopped

  # User Service
  users:
    build:
      context: ./services/users
      target: development
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@users-db:5432/users
      - NATS_URL=nats://nats:4222
    depends_on:
      users-db:
        condition: service_healthy
      nats:
        condition: service_started
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3002/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - backend
    restart: unless-stopped

  # Order Service
  orders:
    build:
      context: ./services/orders
      target: development
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@orders-db:5432/orders
      - NATS_URL=nats://nats:4222
      - REDIS_URL=redis://redis:6379
    depends_on:
      orders-db:
        condition: service_healthy
      nats:
        condition: service_started
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3003/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - backend
    restart: unless-stopped

  # Databases
  auth-db:
    image: postgres:16.2-alpine
    environment:
      POSTGRES_DB: auth
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - auth_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    restart: unless-stopped

  users-db:
    image: postgres:16.2-alpine
    environment:
      POSTGRES_DB: users
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - users_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    restart: unless-stopped

  orders-db:
    image: postgres:16.2-alpine
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - orders_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    restart: unless-stopped

  # Shared Infrastructure
  redis:
    image: redis:7.2-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - backend
    restart: unless-stopped

  nats:
    image: nats:2.10-alpine
    ports:
      - "8222:8222"  # Monitoring
    command: "--js --sd /data"
    volumes:
      - nats_data:/data
    networks:
      - backend
    restart: unless-stopped

volumes:
  auth_db_data:
  users_db_data:
  orders_db_data:
  redis_data:
  nats_data:

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

### Step 3: Generate Environment Template

Create a `.env.example` file:

```env
# Application
APP_PORT=3000
NODE_ENV=development

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=app_dev
DB_PORT=5432

# Redis
REDIS_PORT=6379

# Dev Tools
ADMINER_PORT=8080
MAILHOG_SMTP_PORT=1025
MAILHOG_UI_PORT=8025

# Secrets (change in production)
JWT_SECRET=change-me-in-production
```

### Step 4: Generate Override File for Development

Create `compose.override.yaml` for local development additions:

```yaml
# compose.override.yaml — automatically loaded in development
services:
  app:
    build:
      target: development
    volumes:
      - ./src:/app/src
      - ./tests:/app/tests
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
    command: ["npm", "run", "dev"]
```

### Step 5: Validate

After generating the Compose configuration:

1. Validate syntax: `docker compose config`
2. Start services: `docker compose up -d`
3. Check health: `docker compose ps` (all services should be "healthy")
4. Verify connectivity between services: `docker compose exec app ping db`
5. Check logs for errors: `docker compose logs --tail=50`
6. Start with dev profile: `docker compose --profile dev up -d`

## Output

- `compose.yaml` — Main compose configuration
- `compose.override.yaml` — Development overrides
- `.env.example` — Environment variable template
- Service-specific initialization scripts if needed
