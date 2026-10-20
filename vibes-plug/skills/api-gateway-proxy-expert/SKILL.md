---
name: api-gateway-proxy-expert
description: "Expert guide for API Gateways, Reverse Proxies, and Service Mesh. Covers Kong, Traefik, NGINX, Cloudflare Gateway, and load balancing / Panduan ahli untuk API Gateway, Reverse Proxy, dan Service Mesh."
author: "Roedy Rustam"
version: "4.3.0"
---

# API Gateway, Reverse Proxy & Service Perimeter Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Production architectural guide for API Gateways, Edge Proxies, and perimeter traffic management in modern microservices and serverless topologies. Covers zero-downtime routing, SSL/TLS termination, automatic certificate issuance (Let's Encrypt), rate limiting at L7, Server-Sent Events (SSE) and WebSocket connection proxying, canary traffic splitting, and configuration templates for Caddy, Traefik, and NGINX.

### Trigger Conditions
- Architecting a unified API entry point (Backend-for-Frontend / BFF) in front of multiple microservices.
- Configuring reverse proxies for SSE, WebSockets, or streaming AI model outputs without proxy buffer truncation.
- Implementing edge-level DDoS mitigation, IP allowlisting, or API key validation.
- Configuring automatic SSL/TLS termination with modern HTTP/2 and HTTP/3 (QUIC) support.

### Level 1: Production Caddyfile (Automatic TLS + WebSocket/SSE Proxying)

```caddyfile
# /etc/caddy/Caddyfile
api.vibesplug.internal {
    # Modern TLS 1.3 enforcement
    tls admin@vibesplug.internal

    # Global compression
    encode zstd gzip

    # Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Route 1: Auth Service (Rate limited)
    handle /v1/auth/* {
        reverse_proxy localhost:4001 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Route 2: Streaming Real-time SSE / WebSockets (Buffer disabled)
    handle /v1/ai/stream* {
        reverse_proxy localhost:4002 {
            flush_interval -1
            header_up Connection "upgrade"
            header_up Upgrade {http.request.header.Upgrade}
        }
    }

    # Route 3: Default Core Microservice Pool (Round-Robin Load Balanced)
    handle /v1/* {
        reverse_proxy localhost:5001 localhost:5002 {
            lb_policy round_robin
            lb_try_duration 2s
            fail_duration 10s
            max_fails 3
        }
    }
}
```

### Level 2: High-Performance NGINX Reverse Proxy for AI Streaming & SSE

```nginx
# /etc/nginx/conf.d/api_gateway.conf
upstream backend_nodes {
    server 127.0.0.1:3001 max_fails=3 fail_timeout=10s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=10s;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name api.vibesplug.internal;

    ssl_certificate /etc/ssl/certs/bundle.crt;
    ssl_certificate_key /etc/ssl/private/privkey.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Crucial for SSE & LLM Streaming: disable proxy buffering and set long timeouts
    location /v1/stream {
        proxy_pass http://backend_nodes;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

### Key Perimeter Architectural Rules
1. **Always Set `proxy_buffering off` for Streaming**: If proxy buffering is enabled, LLM tokens and Server-Sent Events will be delayed and batched until the buffer fills (~4KB-16KB), destroying the perceived TTFT.
2. **Forwarded Header Sanitation**: Strip spoofed incoming `X-Forwarded-For` headers from untrusted clients to prevent security bypasses in IP-based rate limiters.
3. **Health Check Probes**: Always configure active health checks so the proxy immediately drops unhealthy microservice pods without returning 502 Bad Gateway to users.

## Orchestration & Integration
- **`rate-limit-abuse-prevention`**: Enforces L7 token bucket and sliding-window rate limits at the gateway layer.
- **`ci-cd-devops-architect`**: Automates Caddy/NGINX reload in containerized environments.
- **`js-backend-expert`**: Connects gateway proxy endpoints with Node.js, Bun, and Hono microservices.
- **`sse-websocket-streaming-expert`**: Validates non-buffered real-time streaming pipelines.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan arsitektur produksi untuk API Gateway, Edge Proxy, dan manajemen trafik perimeter dalam topologi microservices dan serverless modern. Mencakup routing tanpa downtime, terminasi SSL/TLS otomatis (Let's Encrypt), rate limiting pada layer L7, proxy koneksi Server-Sent Events (SSE) dan WebSocket tanpa buffering, pemisahan trafik canary, serta template konfigurasi untuk Caddy, Traefik, dan NGINX.

### Kondisi Pemicu
- Merancang pintu gerbang masuk tunggal (BFF) di depan kumpulan microservices backend.
- Mengonfigurasi reverse proxy untuk streaming token AI atau SSE agar respons tidak terpotong.
- Menerapkan pertahanan DDoS tingkat edge, pembatasan IP (allowlisting), atau verifikasi API key.
- Menyiapkan terminasi SSL/TLS dengan protokol HTTP/2 dan HTTP/3 (QUIC).

### Contoh Konfigurasi Docker Compose dengan Traefik (Auto-Discovery)

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.1
    command:
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
    ports:
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"

  api-service:
    image: my-company/api:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.vibesplug.internal`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=myresolver"
```

### 3 Praktik Wajib Proxy Streaming
1. **Matikan Buffering Proxy**: Untuk endpoint streaming AI atau Server-Sent Events, wajib matikan buffering (`proxy_buffering off` di NGINX, `flush_interval -1` di Caddy) agar token muncul seketika di layar pengguna.
2. **Atur Timeout Panjang**: Berikan batas waktu pembacaan (`proxy_read_timeout 600s`) agar koneksi streaming tidak terputus di tengah jalan saat respons AI panjang.
3. **Penyaringan Header Asli**: Teruskan `X-Real-IP` dan `X-Forwarded-Proto` agar backend dapat mendeteksi lokasi dan skema enkripsi klien secara akurat.

## Integrasi Orkestrasi
- **`rate-limit-abuse-prevention`**: Melindungi gateway dari banjir request berbahaya.
- **`ci-cd-devops-architect`**: Menangani reload konfigurasi proxy tanpa memutus koneksi aktif (*graceful reload*).
- **`js-backend-expert`**: Menjadi target proxy upstream bagi backend Node.js atau Bun.
- **`sse-websocket-streaming-expert`**: Mengawal kelancaran streaming data asinkron.