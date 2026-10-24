---
name: spec-driven-development-expert
description: "Expert guide for Spec-Driven Development (SDD) & Contract-First Architecture — TypeSpec, OpenAPI 3.1, Gherkin BDD, Pact consumer-driven contracts, Spectral linting, and automated spec-to-code pipelines / Panduan ahli pengembangan berbasis spesifikasi (SDD) dan arsitektur contract-first."
author: "Roedy Rustam"
version: "4.3.0"
---

# 📐 Spec-Driven Development (SDD) & Contract-First Expert (2026 Edition)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with `api-design-expert`, `openapi-swagger-codegen-expert`, `formal-spec-z3-verifier`, `autonomous-tdd-debugger`, `e2e-testing-expert`, `autonomous-api-drift-healer`, `typescript-expert`, `database-orm-expert`, and `anti-slop`.

### Description
Spec-Driven Development (SDD) is the foundational engineering antidote to unstructured AI code generation. Instead of prompting AI agents to write code directly from vague conversational prompts, SDD enforces a strict **Contract-First Lifecycle**: formal, machine-readable specifications (TypeSpec, OpenAPI 3.1, JSON Schema Draft 2020-12, Gherkin BDD, and Pact Consumer-Driven Contracts) are authored, linted, and mathematically verified *before* any production code or test suite is generated.

This skill equips the AI agent to act as a **Principal Specifications Architect**, turning business requirements into unambiguous type-safe schemas, executable behavioral specifications, and automated contract drift verification pipelines.

### Trigger Conditions
Activate this skill when:
- Designing new microservices, REST APIs, or full-stack application contracts.
- Defining cross-team or cross-agent API boundaries before parallel development.
- Preventing schema drift between frontend clients and backend services.
- Implementing Consumer-Driven Contract testing with Pact and Vitest.
- Authoring high-level modular API definitions using Microsoft TypeSpec (`tsp`).
- Translating PRD functional requirements into executable Gherkin behavioral scenarios (`.feature` files).

---

### The 5 Laws of Spec-Driven Development (SDD Invariants)

1. **Spec as Single Source of Truth (SSoT)**:
   - Code never dictates the specification; the specification generates or strictly validates the code.
   - Hand-edited DTOs or models without corresponding spec updates are treated as anti-slop violations.

2. **Zero-Drift Bi-Directional Gate**:
   - Every CI/CD commit verifies client and server implementations against the canonical specification using Spectral linter and schema validators.

3. **Behavioral Invariant Locking (BDD)**:
   - Business edge cases are locked as executable Gherkin scenarios with deterministic Given-When-Then steps before feature coding commences.

4. **Hermetic Mockability**:
   - Specifications must be immediately compilable into zero-latency mock servers (e.g. Prism, MSW) allowing frontend and backend swarms to develop concurrently.

5. **Strict Semantic Versioning & Non-Breaking Evolution**:
   - Field removals or type mutations must follow a formal deprecation schedule. Breaking schema changes without major version bumps are rejected at the linting stage.

---

### Production Specification Examples

#### 1. Microsoft TypeSpec Schema Definition (`specs/billing-api.tsp`)

```tsp
import "@typespec/http";
import "@typespec/rest";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.Rest;
using TypeSpec.OpenAPI;

@service({
  title: "Vibes Billing & Settlement Service",
  version: "2026-10-01"
})
namespace Vibes.Billing;

@doc("ISO 4217 Currency Code")
enum CurrencyCode {
  IDR,
  USD,
  EUR,
  USDC
}

@doc("Current lifecycle status of an invoice")
enum InvoiceStatus {
  Draft,
  PendingPayment,
  Paid,
  Void,
  Disputed
}

model InvoiceLineItem {
  @doc("Unique item identifier")
  id: string;

  @doc("Human readable description of service or compute consumption")
  description: string;

  @minValue(1)
  quantity: int32;

  @minValue(0)
  unitPriceCents: int64;

  @doc("Total amount for this line item (quantity * unitPriceCents)")
  totalCents: int64;
}

model CreateInvoiceRequest {
  @doc("Unique client idempotency token (UUID v4)")
  @header("Idempotency-Key")
  idempotencyKey: string;

  @doc("Tenant or customer identifier")
  customerId: string;

  currency: CurrencyCode;

  @minItems(1)
  items: InvoiceLineItem[];

  @doc("Target payment settlement rail")
  settlementRail: "SNAP_BI" | "BASE_USDC" | "STRIPE";
}

model InvoiceResponse {
  id: string;
  customerId: string;
  status: InvoiceStatus;
  currency: CurrencyCode;
  totalAmountCents: int64;
  createdAt: utcDateTime;
  items: InvoiceLineItem[];
}

@route("/v1/invoices")
@tag("Invoicing")
interface InvoicesResource {
  @post
  @summary("Create an invoice with atomic idempotency guarantee")
  create(
    @body request: CreateInvoiceRequest
  ): {
    @statusCode statusCode: 201;
    @body invoice: InvoiceResponse;
  } | {
    @statusCode statusCode: 409;
    @body error: ConflictError;
  };

  @get
  @route("/{invoiceId}")
  @summary("Retrieve invoice details by ID")
  getById(
    @path invoiceId: string
  ): {
    @statusCode statusCode: 200;
    @body invoice: InvoiceResponse;
  } | {
    @statusCode statusCode: 404;
    @body error: NotFoundError;
  };
}

@error
model NotFoundError {
  code: "NOT_FOUND";
  message: string;
}

@error
model ConflictError {
  code: "IDEMPOTENCY_CONFLICT";
  message: string;
  originalInvoiceId: string;
}
```

---

#### 2. Executable Gherkin Behavioral Specification (`specs/features/invoice-settlement.feature`)

```gherkin
@Billing @Settlement @Regression
Feature: Automated Invoice Clearing & Idempotent Settlement
  As an autonomous AI agent consumer
  I want to settle compute invoices via SNAP BI or USDC rails
  So that transaction state transitions are deterministic and race-condition free

  Background:
    Given a registered organization "AcmeAI" with customerId "cust_98765"
    And a funded agent wallet balance of 5000000 IDR

  Scenario: Successful idempotent invoice generation
    When the client posts to "/v1/invoices" with header "Idempotency-Key: idemp_112233":
      """json
      {
        "customerId": "cust_98765",
        "currency": "IDR",
        "settlementRail": "SNAP_BI",
        "items": [
          {
            "id": "item_1",
            "description": "Deep RAG Vector Embeddings (10k tokens)",
            "quantity": 1,
            "unitPriceCents": 1500000,
            "totalCents": 1500000
          }
        ]
      }
      """
    Then the response status code must be 201
    And the response body field "status" must equal "PendingPayment"
    And the database must contain an invoice record with id matching the response "id"

  Scenario: Duplicate request with identical idempotency key yields cached record
    Given an existing invoice created with idempotency key "idemp_112233" and id "inv_abc123"
    When the client posts to "/v1/invoices" with header "Idempotency-Key: idemp_112233" and identical body
    Then the response status code must be 201
    And the response body field "id" must equal "inv_abc123"
    And no duplicate invoice record must be inserted in the database
```

---

#### 3. Automated Consumer-Driven Contract Test (`tests/contracts/billing.contract.test.ts`)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';

const { like, regex, integer } = MatchersV3;

const provider = new PactV3({
  consumer: 'VibesFrontendAgent',
  provider: 'VibesBillingService',
  dir: path.resolve(process.cwd(), 'specs/pacts'),
});

describe('Billing Service Contract Verification', () => {
  it('fulfills invoice creation specification with valid idempotency key', async () => {
    provider
      .given('Customer cust_98765 is active and authorized')
      .uponReceiving('A request to generate an invoice line item')
      .withRequest({
        method: 'POST',
        path: '/v1/invoices',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idemp_uuid_valid_v4',
        },
        body: {
          customerId: 'cust_98765',
          currency: 'IDR',
          settlementRail: 'SNAP_BI',
          items: [
            {
              id: like('item_1'),
              description: like('GPU Vector Compute Hours'),
              quantity: integer(1),
              unitPriceCents: integer(500000),
              totalCents: integer(500000),
            },
          ],
        },
      })
      .willRespondWith({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: {
          id: regex(/inv_[a-zA-Z0-9]+/, 'inv_998877'),
          customerId: 'cust_98765',
          status: 'PendingPayment',
          currency: 'IDR',
          totalAmountCents: integer(500000),
          createdAt: like('2026-10-16T12:00:00Z'),
        },
      });

    await provider.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/v1/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'idemp_uuid_valid_v4',
        },
        body: JSON.stringify({
          customerId: 'cust_98765',
          currency: 'IDR',
          settlementRail: 'SNAP_BI',
          items: [
            {
              id: 'item_1',
              description: 'GPU Vector Compute Hours',
              quantity: 1,
              unitPriceCents: 500000,
              totalCents: 500000,
            },
          ],
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.status).toBe('PendingPayment');
      expect(data.customerId).toBe('cust_98765');
    });
  });
});
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasikan skill `api-design-expert`, `openapi-swagger-codegen-expert`, `formal-spec-z3-verifier`, `autonomous-tdd-debugger`, `e2e-testing-expert`, `autonomous-api-drift-healer`, `typescript-expert`, `database-orm-expert`, dan `anti-slop`.

### Deskripsi
Pengembangan Berbasis Spesifikasi (*Spec-Driven Development* / SDD) adalah fondasi rekayasa perangkat lunak modern untuk membasmi halusinasi kode AI. Alih-alih membiarkan model AI menulis kode langsung dari prompt instruksi yang tidak terstruktur, paradigma SDD mewajibkan penulisan **kontrak formal yang terbaca oleh mesin** (TypeSpec, OpenAPI 3.1, JSON Schema, Gherkin BDD, dan Pact Contracts) sebelum baris kode implementasi atau tes dibuat.

### Prinsip Utama & Siklus SDD 2026

1. **Spesifikasi sebagai Sumber Kebenaran Tunggal (*Single Source of Truth*)**:
   - Kode dilarang mendahului spesifikasi. Spesifikasi menghasilkan atau memvalidasi kode secara otomatis (*spec-to-code*).
2. **Pemberantasan Penyimpangan Kontrak (*Zero Contract Drift*)**:
   - Integrasi linter Spectral dan schema validator pada CI/CD memastikan tidak ada perubahan skema liar antara frontend, backend, dan subagen AI.
3. **Penguncian Perilaku dengan Gherkin BDD**:
   - Seluruh logika bisnis kritis wajib dirumuskan ke dalam skenario Given-When-Then yang dapat diuji secara deterministik.
4. **Mock Server Otomatis**:
   - Dari spesifikasi resmi, server mock (Prism/MSW) langsung tersedia sehingga tim frontend dan backend dapat bekerja paralel tanpa saling menunggu.
5. **Verifikasi Formal Invarian**:
   - State machine penting (misalnya alur billing dan otorisasi) diverifikasi bersama skill `formal-spec-z3-verifier` untuk membuktikan matematis ketiadaan kebocoran state atau deadlock.

---

### Contoh Spesifikasi Microsoft TypeSpec (`specs/billing-api.tsp`)
```tsp
import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

@service({ title: "Layanan Billing Vibes", version: "2026-10-01" })
namespace Vibes.Billing;

enum StatusTagihan { Draf, MenungguPembayaran, Lunas, Dibatalkan }

model PermintaanBuatTagihan {
  @header("Idempotency-Key") idempotencyKey: string;
  idPelanggan: string;
  totalJumlahIDR: int64;
  metodePembayaran: "SNAP_BI" | "DOKU_CHECKOUT";
}

model ResponsTagihan {
  id: string;
  idPelanggan: string;
  status: StatusTagihan;
  totalJumlahIDR: int64;
  dibuatPada: utcDateTime;
}

@route("/v1/tagihan")
interface TagihanResource {
  @post
  buat(@body permintaan: PermintaanBuatTagihan): {
    @statusCode statusCode: 201;
    @body tagihan: ResponsTagihan;
  };
}
```