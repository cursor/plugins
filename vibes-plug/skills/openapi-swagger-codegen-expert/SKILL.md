---
name: openapi-swagger-codegen-expert
description: "OpenAPI 3.1 spec authoring, Swagger UI, automatic client/server code generation (openapi-typescript, Orval, Kiota), contract testing / Penulisan spesifikasi OpenAPI 3.1, Swagger UI, pembuatan kode klien/server otomatis, dan pengujian kontrak."
author: "Roedy Rustam"
version: "4.3.0"
---

# OpenAPI & Swagger Codegen Expert (Contract-First 2026)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Description
Dedicated expert guide for API contract-first development using OpenAPI 3.1 (with full JSON Schema 2020-12 alignment), interactive documentation (Scalar, Swagger UI, Redoc), and automated end-to-end client code generation. Covers generating strictly typed SDKs using `openapi-typescript` and `openapi-fetch`, creating automatic TanStack Query v5 hooks with `Orval`, scaffolding multi-language SDKs with Microsoft `Kiota`, and enforcing API design governance via `Spectral` in CI/CD pipelines.

### Trigger Conditions
- Scaffolding modern RESTful API contracts before writing server code (Phase 1/4).
- Generating type-safe frontend API clients and TanStack Query hooks.
- Configuring interactive API documentation with Scalar or Swagger UI.
- Setting up automated contract testing with Prism or Pact.
- Migrating manual, unvalidated `fetch()` calls to auto-generated typed clients.

### Production OpenAPI 3.1 Specification Example

```yaml
# specs/openapi.yaml
openapi: 3.1.0
info:
  title: Vibes Core Service API
  version: 1.0.0
  description: High-scale contract-first API with strict schema validation.
servers:
  - url: https://api.vibesplug.internal/v1
    description: Production Cluster
paths:
  /orders:
    post:
      operationId: createOrder
      summary: Place an atomic order
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        '201':
          description: Order created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/OrderResponse'
        '400':
          $ref: '#/components/responses/ValidationError'

components:
  schemas:
    CreateOrderRequest:
      type: object
      required: [customerId, items, totalCents]
      properties:
        customerId:
          type: string
          format: uuid
        items:
          type: array
          items:
            type: object
            required: [productId, quantity]
            properties:
              productId: { type: string }
              quantity: { type: integer, minimum: 1 }
        totalCents:
          type: integer
          minimum: 1
    OrderResponse:
      type: object
      required: [id, status, createdAt]
      properties:
        id: { type: string, format: uuid }
        status: { type: string, enum: [PENDING, PAID, FULFILLED] }
        createdAt: { type: string, format: date-time }
```

### Orval Configuration for TanStack Query v5

```typescript
// orval.config.ts
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: './specs/openapi.yaml',
    output: {
      mode: 'tags-split',
      target: './src/api/generated/endpoints',
      schemas: './src/api/generated/models',
      client: 'react-query',
      httpClient: 'fetch',
      override: {
        query: {
          useQuery: true,
          useMutation: true,
          signal: true,
        },
        mutator: {
          path: './src/api/custom-fetch-instance.ts',
          name: 'customFetch',
        },
      },
    },
  },
});
```

### Type-Safe Client Invocation (`openapi-fetch`)

```typescript
// src/api/client.ts
import createClient from 'openapi-fetch';
import type { paths } from './generated/schema';

export const apiClient = createClient<paths>({ baseUrl: 'https://api.vibesplug.internal/v1' });

// Fully type-checked: parameters, request body, and responses are verified at compile-time
export async function submitOrder(customerId: string, productId: string, quantity: number, totalCents: number) {
  const { data, error } = await apiClient.POST('/orders', {
    body: { customerId, items: [{ productId, quantity }], totalCents }
  });
  if (error) throw new Error(`Order placement failed: ${error}`);
  return data; // Type: OrderResponse
}
```

## Orchestration & Integration
- **`api-design-expert`**: Provides REST architectural standards, versioning, and status code rules.
- **`spec-driven-development-expert`**: Connects OpenAPI specs with TypeSpec and BDD test suites.
- **`tanstack-query-expert`**: Consumes generated React Query hooks on the frontend.
- **`ci-cd-devops-architect`**: Runs Spectral linting (`spectral lint specs/openapi.yaml`) in CI.

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `api-design-expert`, `spec-driven-development-expert`, `tanstack-query-expert`, dan `ci-cd-devops-architect` untuk memastikan eksekusi yang kohesif.

### Deskripsi
Panduan ahli khusus untuk pengembangan API dengan pendekatan *contract-first* menggunakan OpenAPI 3.1 (dengan dukungan penuh JSON Schema 2020-12), dokumentasi interaktif modern (Scalar, Swagger UI, Redoc), dan otomatisasi pembuatan klien SDK. Mencakup pembuatan SDK tipe ketat (*strictly typed*) menggunakan `openapi-typescript` dan `openapi-fetch`, pembuatan hooks TanStack Query v5 otomatis via `Orval`, *scaffolding* SDK multi-bahasa dengan Microsoft `Kiota`, serta penegakan standar desain API menggunakan `Spectral` pada pipeline CI/CD.

### Kondisi Pemicu
- Merancang spesifikasi API REST sebelum menulis kode backend (Fase 1/4).
- Menghasilkan klien API frontend dan hooks React Query yang bebas kesalahan tipe secara otomatis.
- Menyiapkan halaman dokumentasi API interaktif menggunakan Scalar atau Swagger UI.
- Menguji keselarasan kontrak backend vs frontend menggunakan mock server (Prism).
- Menggantikan pemanggilan `fetch()` manual tanpa tipe dengan klien otomatis yang terverifikasi.

### Pola Integrasi Orval & React Query di Frontend

```typescript
// Penggunaan hooks otomatis hasil generate Orval di komponen React 19
import { useCreateOrder } from '@/api/generated/endpoints/orders';

export function CheckoutButton({ customerId, productId, quantity, totalCents }: Props) {
  const { mutate, isPending } = useCreateOrder({
    mutation: {
      onSuccess: (order) => {
        console.log(`Pesanan berhasil dibuat: ${order.id}`);
      },
      onError: (err) => {
        console.error('Gagal membuat pesanan:', err);
      }
    }
  });

  return (
    <button 
      onClick={() => mutate({ data: { customerId, items: [{ productId, quantity }], totalCents } })}
      disabled={isPending}
      className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500"
    >
      {isPending ? 'Memproses...' : 'Bayar Sekarang'}
    </button>
  );
}
```

### Validasi Spectral di Pipeline CI/CD

```yaml
# .spectral.yaml
extends: ["spectral:oas"]
rules:
  operation-operationId-valid-in-url: error
  operation-description: warn
  no-eval-in-markdown: error
```

## Integrasi Orkestrasi
- **`api-design-expert`**: Menetapkan aturan penamaan endpoint, HTTP methods, dan struktur error standar.
- **`spec-driven-development-expert`**: Mengintegrasikan OpenAPI dengan pipeline otomatisasi kode.
- **`tanstack-query-expert`**: Mengelola status caching dan query invalidation di frontend.
- **`ci-cd-devops-architect`**: Menjalankan pengujian kepatuhan kontrak pada setiap Pull Request.