---
name: logging-error-tracking-expert
description: "Expert guide for structured logging (Pino, Winston), error tracking (Sentry), log aggregation (Axiom, Datadog), request correlation, and GDPR-compliant log management / Panduan ahli untuk logging terstruktur (Pino, Winston), pelacakan error (Sentry), agregasi log, korelasi request, dan manajemen log sesuai GDPR."
author: "Roedy Rustam"
version: "4.3.0"
---

# Logging & Error Tracking Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills like `brainstorming`, `zero-to-prod-orchestrator`, and `session-memory-manager` to ensure cohesive execution.

### Description
Production-grade guide for implementing structured logging, error tracking, and application monitoring. Covers **Pino** (high-performance JSON logging), **Sentry** SDK integration (React, Node.js, Next.js), **source map upload** for production errors, **request ID correlation** across microservices, **log aggregation** (Axiom, Datadog, Logflare), **alert rules**, **GDPR-compliant log redaction** (PII masking), and **OpenTelemetry integration**.

### Trigger Conditions
Activate this skill when:
- Setting up structured logging for Node.js/Bun backend services.
- Integrating Sentry for error tracking in React/Next.js apps.
- Implementing request ID correlation across microservices.
- Setting up log aggregation and search (Axiom, Datadog, Grafana Loki).
- Configuring alerting rules for production errors.
- Implementing GDPR-compliant log management (PII redaction).
- Setting up source map uploads for production debugging.

---

### Logging Library Selection Guide

| Library | Best For | Performance | Output Format |
|---|---|---|---|
| **Pino** | High-throughput Node.js services | ⭐⭐⭐⭐⭐ (fastest) | JSON (structured) |
| **Winston** | Enterprise, multiple transports | ⭐⭐⭐ | Configurable |
| **Bunyan** | Legacy projects | ⭐⭐⭐⭐ | JSON |
| **console.log** | Never in production | ❌ | Unstructured |

**Recommendation**: Use **Pino** for all production services (10x faster than Winston, native JSON).

---

### 1. Structured Logging with Pino

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Redact sensitive fields (GDPR/PII)
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token', '*.ssn', '*.creditCard'],
    censor: '[REDACTED]',
  },
  // Standardized format
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      service: process.env.SERVICE_NAME ?? 'app',
      environment: process.env.NODE_ENV,
      version: process.env.APP_VERSION,
      pid: bindings.pid,
      hostname: bindings.hostname,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Child logger for specific domain
export const dbLogger = logger.child({ module: 'database' });
export const authLogger = logger.child({ module: 'auth' });
export const paymentLogger = logger.child({ module: 'payment' });
```

#### Log Level Strategy
```typescript
// When to use each level:
logger.fatal('Application cannot start — exiting');       // Process crash
logger.error({ err }, 'Payment processing failed');        // Failed operations (needs attention)
logger.warn('Rate limit threshold at 80%');                // Degraded state, approaching limits
logger.info({ userId, action: 'login' }, 'User logged in'); // Business events, audit trail
logger.debug({ query, params }, 'Database query executed'); // Development troubleshooting
logger.trace({ request }, 'Incoming request');              // Extreme detail (rarely enabled)
```

---

### 2. Request ID Correlation

```typescript
// middleware/request-id.ts
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

// Async context for request correlation
export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export function requestIdMiddleware(req: Request): string {
  // Use incoming header or generate new ID
  const requestId = req.headers.get('x-request-id') ?? randomUUID();

  // Propagate to downstream services
  return requestId;
}

// Usage with Pino child logger
export function getRequestLogger() {
  const ctx = requestContext.getStore();
  return ctx ? logger.child({ requestId: ctx.requestId }) : logger;
}

// In API route
export async function GET(request: Request) {
  const requestId = requestIdMiddleware(request);

  return requestContext.run({ requestId }, async () => {
    const log = getRequestLogger();
    log.info('Processing request');

    // All downstream log calls include requestId automatically
    const result = await fetchData(log);
    return Response.json(result);
  });
}
```

---

### 3. Sentry Integration (Next.js)

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay for debugging
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 1.0,   // 100% of error sessions

  integrations: [
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
  ],

  // Filter noise
  ignoreErrors: [
    'ResizeObserver loop',
    'Non-Error promise rejection',
    /Loading chunk \d+ failed/,
  ],

  // Scrub PII before sending
  beforeSend(event) {
    if (event.user) {
      delete event.user.ip_address;
      delete event.user.email; // Or hash it
    }
    return event;
  },
});
```

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,

  // Capture unhandled promise rejections
  integrations: [
    Sentry.prismaIntegration(), // Auto-track Prisma queries
  ],
});
```

#### Source Map Upload (CI/CD)
```yaml
# .github/workflows/deploy.yml
- name: Upload Source Maps to Sentry
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: your-project
  run: |
    npx @sentry/cli sourcemaps upload \
      --release=${{ github.sha }} \
      .next/static
```

---

### 4. Log Aggregation Setup (Axiom)

```typescript
// lib/axiom-transport.ts
import { pino } from 'pino';

// Pino transport for Axiom (or any HTTP log service)
const transport = pino.transport({
  targets: [
    // Console output (development)
    { target: 'pino-pretty', level: 'debug' },
    // Axiom (production)
    {
      target: '@axiomhq/pino',
      level: 'info',
      options: {
        dataset: process.env.AXIOM_DATASET,
        token: process.env.AXIOM_TOKEN,
      },
    },
  ],
});

export const logger = pino(transport);
```

---

### 5. Alert Rules Configuration

```typescript
// Example alert conditions to configure in your monitoring tool
const ALERT_RULES = {
  criticalErrors: {
    condition: 'error count > 50 in 5 minutes',
    severity: 'critical',
    notification: ['pagerduty', 'slack'],
  },
  highErrorRate: {
    condition: 'error rate > 5% of total requests',
    severity: 'high',
    notification: ['slack'],
  },
  slowResponses: {
    condition: 'p99 response time > 3000ms for 10 minutes',
    severity: 'medium',
    notification: ['slack'],
  },
  diskSpace: {
    condition: 'disk usage > 85%',
    severity: 'warning',
    notification: ['email'],
  },
};
```

---

### 6. GDPR-Compliant Log Management

```typescript
// lib/pii-redactor.ts

/** Fields that must be redacted in logs */
const PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g,           // SSN
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
];

export function redactPII(text: string): string {
  let result = text;
  for (const pattern of PII_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

// Log retention policy
const LOG_RETENTION = {
  debug: '7 days',
  info: '30 days',
  warn: '90 days',
  error: '365 days',
  audit: '7 years', // Compliance requirement
};
```

---

### Common Pitfalls to Avoid

| Anti-Pattern | Problem | Correct Approach |
|---|---|---|
| `console.log` in production | Unstructured, no levels, no rotation | Use Pino with JSON output |
| Logging PII (emails, passwords) | GDPR violation, security risk | Use Pino `redact` option |
| No request correlation ID | Can't trace requests across services | Propagate `x-request-id` header |
| Logging everything at `info` level | Log noise, storage waste | Use appropriate levels (debug/info/warn/error) |
| No source maps in production errors | "Minified React error #xxx" | Upload source maps to Sentry |
| No log rotation/retention policy | Disk fills up, storage costs grow | Set TTL per level, archive old logs |
| Alerting on every error | Alert fatigue | Set meaningful thresholds and severity levels |

---

### Integration with Other Skills

- `data-telemetry-expert` — OpenTelemetry spans + log correlation
- `error-resilience-expert` — Error tracking and monitoring setup
- `js-backend-expert` — Server-side logging middleware (Fastify/Hono/Express)
- `ci-cd-devops-architect` — Source map upload in CI/CD pipeline
- `production-ready-hardener` — Pre-launch logging and monitoring audit
- `zero-trust-secret-vault` — Secure logging of secret access patterns

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `brainstorming`, `zero-to-prod-orchestrator`, dan `session-memory-manager` untuk memastikan pemantauan produksi yang andal.
- `data-telemetry-expert` — Span OpenTelemetry + korelasi log.
- `error-resilience-expert` — Setup pelacakan error dan monitoring.
- `js-backend-expert` — Middleware logging sisi server (Fastify/Hono/Express).
- `ci-cd-devops-architect` — Upload source map dalam pipeline CI/CD.
- `production-ready-hardener` — Audit logging dan monitoring pra-peluncuran.

### Deskripsi
Panduan tingkat produksi untuk mengimplementasikan logging terstruktur, pelacakan error, dan pemantauan aplikasi. Mencakup **Pino** (logging JSON berkinerja tinggi), integrasi SDK **Sentry** (React, Node.js, Next.js), **upload source map** untuk error produksi, **korelasi request ID** lintas microservice, **agregasi log** (Axiom, Datadog, Logflare), **aturan alerting**, **redaksi log sesuai GDPR / UU PDP** (masking PII), dan integrasi **OpenTelemetry**.

### Kondisi Pemicu
Aktifkan skill ini ketika:
- Menyiapkan logging terstruktur untuk layanan backend Node.js/Bun.
- Mengintegrasikan Sentry untuk pelacakan error di aplikasi React/Next.js.
- Mengimplementasikan korelasi request ID lintas microservice.
- Menyiapkan agregasi dan pencarian log (Axiom, Datadog, Grafana Loki).
- Mengonfigurasi aturan alerting untuk error produksi.
- Mengimplementasikan manajemen log sesuai GDPR dan UU PDP (redaksi PII).

---

### Implementasi Pola Kunci (TypeScript)

#### 1. Logger Terstruktur Berkinerja Tinggi dengan Pino & Redaksi PII
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Redaksi field sensitif otomatis (Kepatuhan UU PDP & GDPR)
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.nik',
      '*.nomorKartu',
    ],
    censor: '[TEREDAKSI]',
  },
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      layanan: process.env.SERVICE_NAME ?? 'backend-api',
      lingkungan: process.env.NODE_ENV,
      pid: bindings.pid,
      hostname: bindings.hostname,
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const dbLogger = logger.child({ modul: 'database' });
export const paymentLogger = logger.child({ modul: 'pembayaran' });
```

#### 2. Korelasi Request ID dengan AsyncLocalStorage
```typescript
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import { logger } from './logger';

export const konteksRequest = new AsyncLocalStorage<{ requestId: string }>();

export function getLoggerRequest() {
  const ctx = konteksRequest.getStore();
  return ctx ? logger.child({ requestId: ctx.requestId }) : logger;
}
```

#### 3. Inisialisasi Sentry Klien di Next.js 15
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0, // Rekam 100% sesi yang mengalami error
});
```