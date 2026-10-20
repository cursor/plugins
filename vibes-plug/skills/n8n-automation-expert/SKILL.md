---
name: n8n-automation-expert
description: "Expert guide for workflow automation (n8n, Zapier, Make), custom nodes, webhook triggers, and AI-powered automation chains / Panduan ahli otomasi workflow (n8n, Zapier, Make), custom nodes, webhook triggers, dan rantai otomasi berbasis AI."
author: "Roedy Rustam"
version: "4.3.0"
---

# Workflow Automation & n8n AI Orchestration Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production engineering guide for self-hosted workflow automation using n8n (v1.60+), Zapier, and Make. Covers building fault-tolerant automation pipelines, custom TypeScript nodes, webhook triggers with HMAC SHA-256 signature verification, AI Agent nodes integrating Model Context Protocol (MCP) tools, sub-workflow error triggers, and high-volume queuing via n8n Queue Mode (Redis + BullMQ).

### Trigger Conditions
- Designing event-driven automations between SaaS tools (Slack, Discord, HubSpot, Notion, Stripe).
- Deploying self-hosted n8n in Docker or Kubernetes for data privacy compliance (GDPR/HIPAA).
- Creating AI-powered workflow pipelines with LangChain/n8n AI Agent nodes.
- Handling secure webhook ingestion with cryptographic signature validation.

### Production n8n Webhook HMAC Signature Validation (TypeScript / Code Node)

```typescript
// n8n Code Node (JavaScript/TypeScript runtime)
// Validates incoming HMAC signature from DOKU or Stripe before executing downstream nodes
import crypto from 'node:crypto';

const items = $input.all();
const rawBody = $json.body;
const signatureHeader = $json.headers['x-signature'] || $json.headers['x-hub-signature-256'];
const secretKey = $env.WEBHOOK_HMAC_SECRET;

if (!signatureHeader || !secretKey) {
  throw new Error('[n8n-Security] Missing signature header or HMAC secret.');
}

const computedSignature = crypto
  .createHmac('sha256', secretKey)
  .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
  .digest('hex');

// Timing-safe equality check to prevent side-channel timing attacks
const isValid = crypto.timingSafeEqual(
  Buffer.from(computedSignature, 'utf8'),
  Buffer.from(signatureHeader.replace('sha256=', ''), 'utf8')
);

if (!isValid) {
  throw new Error('[n8n-Security] Invalid HMAC signature. Unauthorized webhook invocation.');
}

return items.map(item => ({
  json: {
    ...item.json,
    verified: true,
    processedAt: new Date().toISOString()
  }
}));
```

### Self-Hosted n8n Queue Mode Topology (Docker Compose)

```yaml
# docker-compose.n8n.yml
services:
  n8n-main:
    image: n8nio/n8n:latest
    environment:
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
    ports:
      - "5678:5678"

  n8n-worker:
    image: n8nio/n8n:latest
    command: /bin/sh -c "n8n worker"
    environment:
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
    deploy:
      replicas: 2
```

## Orchestration & Integration
- **`cron-scheduler-expert`**: Orchestrates scheduled cron triggers and distributed job executions.
- **`ai-llm-integration-expert`**: Provides prompt templates and model routing inside n8n AI Agent nodes.
- **`email-notification-expert`**: Delivers transactional alerts and summary digests from workflows.
- **`payment-gateway-expert`**: Connects payment webhooks with automated CRM and billing sync.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi bersama `cron-scheduler-expert`, `ai-llm-integration-expert`, `email-notification-expert`, dan `payment-gateway-expert`.

### Deskripsi
Panduan rekayasa produksi untuk otomatisasi alur kerja (*workflow automation*) menggunakan n8n (v1.60+ *self-hosted*), Zapier, dan Make. Mencakup perancangan pipeline yang tahan gangguan, pembuatan *custom node* berbasis TypeScript, validasi tanda tangan kriptografis HMAC pada pemicu webhook, node AI Agent yang terhubung ke tool MCP, serta penskalaan pemrosesan beban tinggi melalui mode antrean n8n (Redis + BullMQ).

### Kondisi Pemicu
- Merancang alur otomatisasi antar layanan (Slack, Discord, Google Sheets, Notion, Stripe).
- Menjalankan n8n *self-hosted* di Docker/Kubernetes demi mematuhi regulasi privasi data lokal.
- Membuat alur kerja cerdas yang memproses dokumen otomatis menggunakan model LLM (Claude, Gemini, GPT).
- Memproses data webhook eksternal secara aman dengan validasi HMAC SHA-256.

### Pola Penanganan Error dengan Alur Khusus (Error Trigger Workflow)
Dalam n8n produksi, selalu pasang alur kerja penanganan kesalahan (*Error Workflow*) terpisah:
1. Hubungkan pengaturan workflow ke `Error Trigger`.
2. Tangkap detail node yang gagal, pesan error, dan waktu kejadian.
3. Kirim notifikasi darurat secara instan ke kanal Slack/Telegram tim teknis.

## Integrasi Orkestrasi
- **`cron-scheduler-expert`**: Mengatur jadwal pemicu waktu berkala (*Cron Node*).
- **`ai-llm-integration-expert`**: Mengintegrasikan node AI Agent dengan tool API internal.
- **`email-notification-expert`**: Mengirimkan email ringkasan laporan otomatis ke pemangku kepentingan.
- **`payment-gateway-expert`**: Memverifikasi keabsahan data webhook pembayaran sebelum mencatat pesanan.