---
name: sse-websocket-streaming-expert
description: "Expert guide for Server-Sent Events (SSE), WebSockets, and Streaming Architectures. Covers real-time data push, Socket.IO, Hono WebSocket, and AI response streaming / Panduan ahli streaming real-time."
author: "Roedy Rustam"
version: "4.3.0"
---

# SSE, WebSocket & Streaming Expert

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
A focused guide for building real-time data push architectures. While `realtime-collaboration-expert` focuses on CRDTs (Yjs) for multi-player editing, this skill focuses on the transport layer: when to use Server-Sent Events (SSE) vs WebSockets vs HTTP Streaming, scaling pub/sub architectures, and streaming AI responses.

### Trigger Conditions
- When building live notification systems, live sports scores, or stock tickers.
- When streaming LLM text generation responses chunk-by-chunk to the UI.
- When the user asks about "WebSockets", "Socket.IO", or "SSE".
- When implementing a chat application.

### Core Architectural Guidelines

#### 1. SSE vs WebSockets
Choose the right transport mechanism to save server resources.
- **Server-Sent Events (SSE)**: Unidirectional (Server to Client). Uses standard HTTP. Best for live feeds, AI streaming, notifications. Handles reconnections automatically.
- **WebSockets**: Bidirectional. Best for chat apps, multiplayer games. Requires a persistent TCP connection and custom ping/pong keepalives.

#### 2. Streaming AI Responses (HTTP Streaming)
For LLMs, use standard HTTP Streaming (often via the `ai` SDK in React/Next.js) instead of complex WebSockets.
```typescript
// Next.js Route Handler Example
export async function POST(req: Request) {
  const { prompt } = await req.json();
  const stream = await myLLM.stream(prompt);
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

#### 3. Scaling WebSockets (Pub/Sub)
A single Node.js process can handle thousands of WebSockets, but when you scale horizontally (multiple servers), clients on Server A cannot see messages from Server B.
- **Redis Adapter**: Use a Pub/Sub mechanism (like Redis) so when a message is published, all server instances broadcast it to their respective connected clients.
- **Serverless WebSockets**: In serverless environments (AWS API Gateway, Cloudflare Durable Objects), you do not hold the connection in your code. The infrastructure holds it, and calls your webhook when messages arrive.

#### 4. Reconnection & Idempotency
- Always assume connections will drop.
- Clients must maintain a `lastEventId` or cursor. Upon reconnection, the client sends this cursor so the server can push any missed messages, preventing data loss.

## Orchestration & Integration
- Supplements `js-backend-expert` or `go-programming-expert` with real-time push capabilities.
- Essential for `gemini-agent-booster` when building AI streaming chat interfaces.
- Integrates with `api-gateway-proxy-expert` to ensure proxies do not buffer streaming responses.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Deskripsi
Panduan terfokus untuk membangun arsitektur push data real-time. Skill ini berfokus pada lapisan transport: kapan harus menggunakan Server-Sent Events (SSE) vs WebSockets vs HTTP Streaming, penskalaan arsitektur pub/sub (Redis), dan streaming respons AI.

### Kondisi Pemicu
- Saat membangun sistem notifikasi live, pembaruan skor, atau ticker saham.
- Saat melakukan streaming teks hasil generasi LLM bagian-demi-bagian (chunk-by-chunk) ke UI.
- Saat mengimplementasikan aplikasi obrolan (chat).

### Panduan Arsitektur Inti

#### 1. SSE vs WebSockets
Pilih mekanisme transport yang tepat:
- **Server-Sent Events (SSE)**: Satu arah (Server ke Klien). Berjalan di atas HTTP biasa. Sangat ideal untuk feed berita, notifikasi, dan streaming AI. Mendukung rekoneksi otomatis secara native.
- **WebSockets**: Dua arah. Ideal untuk aplikasi chat dan game. Membutuhkan penanganan koneksi persisten dan mekanisme ping/pong manual.

#### 2. Streaming Respons AI
Gunakan HTTP Streaming biasa (biasanya menggunakan `text/event-stream`) untuk merender kata demi kata dari AI tanpa perlu memelihara koneksi WebSocket yang kompleks.

#### 3. Penskalaan (Scaling) WebSockets
Saat aplikasi diskalakan ke beberapa server (horizontal scaling), pengguna yang terhubung ke Server A tidak akan menerima pesan dari pengguna di Server B. Anda WAJIB menggunakan Redis Pub/Sub (atau mekanisme message broker serupa) sebagai *backplane* agar semua server saling berkomunikasi.

#### 4. Rekoneksi & Penanganan Kehilangan Data
- Klien harus selalu mengirimkan kursor (misal: ID pesan terakhir yang diterima) saat melakukan rekoneksi.
- Server menggunakan kursor tersebut untuk memutar ulang (replay) pesan yang terlewat selama klien terputus.

## Integrasi Orkestrasi
- Melengkapi `js-backend-expert` atau `go-programming-expert` dengan kemampuan push real-time.
- Sangat penting bagi `gemini-agent-booster` saat membangun antarmuka chat AI.
- Terintegrasi dengan `api-gateway-proxy-expert` (pastikan NGINX/proxy tidak melakukan *buffering* pada koneksi streaming).