---
name: doku-payment-gateway
description: "Expert guide for integrating DOKU Payment Gateway: DOKU Checkout (Hosted & Modal Popup with HMAC-SHA256), Direct API SNAP BI Standard (VA, QRIS, Direct Debit with HMAC-SHA512), and Direct API Non-SNAP (Card Payment Page, OVO Push). Covers single-integration checkout, direct host-to-host APIs, webhook verification, and atomic idempotency / Panduan ahli integrasi DOKU Payment Gateway (DOKU Checkout & Direct API)."
author: "Roedy Rustam"
version: "4.3.0"
---

# DOKU Payment Gateway Integration / Integrasi Payment Gateway DOKU

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with relevant domain skills:
- `payment-gateway-expert` — Multi-gateway routing, SaaS billing architectures, subscription state machines.
- `saas-billing` — Database synchronization, atomic locks, invoice fulfillment.
- `doku-mcp-server` — Exposes DOKU Checkout & Direct APIs to AI agents via Model Context Protocol.
- `database-orm-expert` — Transactional database models, race-condition mitigation.
- `async-queue-temporal-expert` — Background job retries and async payment reconciliation.

### Description
Expert guide for implementing DOKU Payment Gateway based on the official [DOKU Developers Documentation](https://developers.doku.com/).
DOKU offers two primary integration models:
1. **DOKU Checkout** (`/checkout/v1/payment`): Hosted payment page or modal overlay (`jokul-checkout-1.0.0.js`). The fastest, single-integration solution supporting all payment channels (Virtual Accounts, Credit Cards, QRIS, E-Wallets, Convenience Stores, Paylater, Direct Debit) with built-in retry handling and cart recovery. Uses **Non-SNAP HMAC-SHA256** signatures with request digest.
2. **Direct API**:
   - **SNAP BI Standard (Host-to-Host)**: Standardized open banking API mandated by Bank Indonesia. Employs OAuth 2.0 B2B token with Asymmetric RSA-SHA256, and **HMAC-SHA512** for transactional endpoints (Direct VA, Direct QRIS, Direct Debit).
   - **Non-SNAP Direct API**: Dedicated APIs for Credit Card Payment Page (`/credit-card/v1/payment-page`), OVO Push Payment (`/ovo-emoney/v1/payment`), and Direct Paylater.

---

### Integration Architecture Decision Matrix

| Dimension | DOKU Checkout (Hosted / Modal) | Direct API (SNAP BI Standard) | Direct API (Non-SNAP) |
|---|---|---|---|
| **Primary Use Case** | E-commerce, SaaS billing, mobile apps wanting instant multi-channel coverage | Bespoke in-app banking UI, automated dynamic VA generation, native QRIS display | Non-PCI DSS Card custom page, instant OVO push payment to phone |
| **Supported Channels** | All channels in 1 API (VA, CC, QRIS, E-Wallet, Alfa/Indomaret, Paylater, Direct Debit) | Specific endpoints: Bank Virtual Accounts, QRIS, Direct Debit | Credit Card 3DS, OVO Push, LinkAja, Paylater (Kredivo/Akulaku) |
| **Frontend Effort** | Minimal: Redirect to URL or trigger modal via `loadJokulCheckout()` | High: Merchant builds custom payment UI for each channel | Medium: Merchant embeds card iframe/redirect or prompts phone |
| **Signature Algorithm** | `HMACSHA256` with body `Digest` | `HMAC-SHA512` (Transactional) + RSA-SHA256 (B2B Token) | `HMACSHA256` with `Digest` (Card) or SHA256 checksum (OVO) |
| **Endpoint Base** | `/checkout/v1/payment` | `/virtual-accounts/bi-snap-va/v1.1/...`, `/snap-adapter/b2b/v1.0/qr/...` | `/credit-card/v1/payment-page`, `/ovo-emoney/v1/payment` |
| **Check Status** | `GET /orders/v1/status/{invoice_number}` (with order-level status) | Channel status endpoint (e.g. `/transfer-va/status`, `/qr-mpm-query`) | `GET /orders/v1/status/{invoice_number}` |

---

### Core Architecture & Credentials

#### Environment Gateways
| Environment | Base URL | Dashboard Portal | Simulator |
|---|---|---|---|
| **Sandbox** | `https://api-sandbox.doku.com` | `https://sandbox.doku.com` | `https://sandbox.doku.com/gtw-config-v2/simulator` |
| **Production** | `https://api.doku.com` | `https://dashboard.doku.com` | N/A |

#### Frontend JS SDK (for Modal Popup Mode)
- **Sandbox**: `https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js`
- **Production**: `https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js`

---

## 1. DOKU Checkout Integration (Recommended)

### Backend: Generate Checkout Payment URL

#### Endpoint
- **HTTP Method**: `POST`
- **Sandbox**: `https://api-sandbox.doku.com/checkout/v1/payment`
- **Production**: `https://api.doku.com/checkout/v1/payment`

#### Mandatory Headers
```http
Client-Id: MCH-0001-10791114622547
Request-Id: 2ebffd22-d23e-4368-95ce-5c38f7ddcf86
Request-Timestamp: 2026-10-03T01:30:00Z
Signature: HMACSHA256=1jap2tpgvWt83tG4J7IhEwUrwmMt71OaIk0oL0e6sPM=
Content-Type: application/json
```

> [!IMPORTANT]
> - `Request-Timestamp` MUST be in ISO8601 UTC+0 (`YYYY-MM-DDTHH:mm:ssZ`). For WIB (UTC+7), subtract 7 hours.
> - `Request-Target` is `/checkout/v1/payment`.

#### Signature Generation (Non-SNAP HMAC-SHA256)
1. **Calculate Digest**:
   ```typescript
   const jsonBody = JSON.stringify(body);
   const digest = crypto.createHash('sha256').update(jsonBody, 'utf8').digest('base64');
   ```
2. **Assemble Component String**:
   ```text
   Client-Id:<client-id>\nRequest-Id:<request-id>\nRequest-Timestamp:<timestamp>\nRequest-Target:<request-target>\nDigest:<digest>
   ```
3. **Calculate HMAC-SHA256**:
   ```typescript
   const hmac = crypto.createHmac('sha256', secretKey).update(componentString, 'utf8').digest('base64');
   const signatureHeader = `HMACSHA256=${hmac}`;
   ```

#### Full Request Payload Schema
```json
{
  "order": {
    "amount": 150000,
    "invoice_number": "INV-20261003-0001",
    "currency": "IDR",
    "callback_url": "https://myapp.com/checkout/return",
    "callback_url_cancel": "https://myapp.com/checkout/cancel",
    "callback_url_result": "https://myapp.com/checkout/result",
    "language": "EN",
    "auto_redirect": true,
    "disable_retry_payment": true,
    "recover_abandoned_cart": true,
    "expired_recovered_cart": 60,
    "line_items": [
      {
        "id": "ITEM-1",
        "name": "Pro SaaS Annual Subscription",
        "quantity": 1,
        "price": 150000,
        "sku": "SAAS-PRO-Y",
        "category": "services"
      }
    ]
  },
  "payment": {
    "payment_due_date": 60,
    "payment_method_types": [
      "VIRTUAL_ACCOUNT_BCA",
      "VIRTUAL_ACCOUNT_BANK_MANDIRI",
      "VIRTUAL_ACCOUNT_BRI",
      "VIRTUAL_ACCOUNT_BNI",
      "CREDIT_CARD",
      "QRIS",
      "EMONEY_SHOPEEPAY",
      "EMONEY_OVO",
      "EMONEY_DANA"
    ]
  },
  "customer": {
    "id": "CUST-9921",
    "name": "Alex",
    "last_name": "Kusuma",
    "email": "alex.kusuma@example.com",
    "phone": "6281234567890",
    "address": "Sudirman Central Business District",
    "city": "Jakarta Selatan",
    "country": "ID"
  },
  "additional_info": {
    "allow_tenor": [0, 3, 6, 12],
    "override_notification_url": "https://myapp.com/api/webhooks/doku/checkout"
  }
}
```

> [!TIP]
> To showcase **all** available channels enabled in your DOKU account, simply omit `payment.payment_method_types`.

#### Response Body Highlights
```json
{
  "message": ["SUCCESS"],
  "response": {
    "order": {
      "amount": "150000",
      "invoice_number": "INV-20261003-0001",
      "session_id": "5f6304ca900144c7a4fcf802ad6c0898"
    },
    "payment": {
      "url": "https://sandbox.doku.com/checkout-link-v2/5f6304ca900144c7a4fcf802ad6c0898...",
      "token_id": "5f6304ca900144c7a4fcf802ad6c08982024...",
      "payment_due_date": 60,
      "expired_date": "20261003104531"
    }
  }
}
```

---

### Frontend Integration (Popup Modal vs Redirect)

#### Approach A: Modal Overlay (Pop-Up Mode)
Import the DOKU Checkout JS SDK and trigger `loadJokulCheckout(url)`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Mandatory for responsive modal scaling -->
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js"></script>
</head>
<body>
  <button id="pay-button" class="btn-primary">Pay with DOKU</button>

  <script>
    document.getElementById('pay-button').addEventListener('click', async () => {
      // 1. Fetch payment URL from your backend
      const res = await fetch('/api/checkout/initiate', { method: 'POST' });
      const data = await res.json();

      // 2. Open DOKU Checkout modal overlay
      if (data.paymentUrl) {
        window.loadJokulCheckout(data.paymentUrl);
      }
    });
  </script>
</body>
</html>
```

#### Approach B: Direct Redirect Mode
For mobile browsers or standard redirects, navigate directly to `response.payment.url`:
```typescript
window.location.href = data.paymentUrl;
```

---

### Order Status & Check Status API (Non-SNAP)

The Check Status API tracks order-level statuses even before the customer selects a specific channel:
- **Endpoint**: `GET https://api-sandbox.doku.com/orders/v1/status/{invoice_number}`
- **Signature for GET**: Does NOT require a Digest.
  ```text
  Client-Id:<client-id>\nRequest-Id:<request-id>\nRequest-Timestamp:<timestamp>\nRequest-Target:/orders/v1/status/<invoice_number>
  ```
- **Statuses**:
  - `order.status`: `ORDER_GENERATED`, `ORDER_EXPIRED`, `ORDER_RECOVERED`.
  - `transaction.status`: `PENDING`, `SUCCESS`, `FAILED`, `EXPIRED`, `REFUNDED`.

---

### Webhook Verification & Atomic Idempotency (DOKU Checkout)

When a customer completes payment via Checkout, DOKU posts an HTTP Notification with headers:
- `Client-Id`, `Request-Id`, `Request-Timestamp`, `Signature: HMACSHA256=...`

```typescript
import crypto from 'crypto';

export function verifyDokuCheckoutNotification(
  clientId: string,
  secretKey: string,
  requestTarget: string, // path of your notification endpoint e.g., '/api/webhooks/doku/checkout'
  headers: Record<string, string>,
  rawBody: string
): boolean {
  const reqClientId = headers['client-id'];
  const reqId = headers['request-id'];
  const reqTimestamp = headers['request-timestamp'];
  const receivedSig = headers['signature'] || '';

  if (reqClientId !== clientId) return false;

  // 1. Compute Base64 SHA-256 Digest of raw body
  const digest = crypto.createHash('sha256').update(rawBody, 'utf8').digest('base64');

  // 2. Build string component
  const component = `Client-Id:${reqClientId}\nRequest-Id:${reqId}\nRequest-Timestamp:${reqTimestamp}\nRequest-Target:${requestTarget}\nDigest:${digest}`;

  // 3. Compute HMAC-SHA256
  const expectedSig = 'HMACSHA256=' + crypto.createHmac('sha256', secretKey).update(component, 'utf8').digest('base64');

  return crypto.timingSafeEqual(Buffer.from(receivedSig), Buffer.from(expectedSig));
}
```

---

## 2. Direct API — SNAP BI Standard (Host-to-Host)

For merchants requiring fully custom, native checkout experiences for Virtual Accounts, QRIS, or Direct Debit.

### Step 1: B2B Access Token Generation
- **Endpoint**: `POST /authorization/v1/access-token/b2b`
- **Headers**:
  - `X-CLIENT-KEY`: Merchant Client ID
  - `X-TIMESTAMP`: ISO8601 string (`YYYY-MM-DDTHH:mm:ssZ`)
  - `X-SIGNATURE`: `SHA256withRSA(PrivateKey, X-CLIENT-KEY + "|" + X-TIMESTAMP)` (Base64)
- **Body**: `{"grantType": "client_credentials"}`
- **Response**: `accessToken` (Bearer token, valid for 900 seconds).

```typescript
export function generateSnapB2bSignature(clientId: string, timestamp: string, privateKeyPem: string): string {
  const stringToSign = `${clientId}|${timestamp}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(stringToSign);
  return signer.sign(privateKeyPem, 'base64');
}
```

### Step 2: Transactional Endpoints Signature (HMAC-SHA512)
- **Formula**:
  1. `BodyHash = hex(sha256(minifiedBody)).toLowerCase()`
  2. `StringToSign = HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":" + BodyHash + ":" + Timestamp`
  3. `X-SIGNATURE = base64(hmacSha512(ClientSecret, StringToSign))`

```typescript
export function generateSnapTransactionalSignature(
  method: string,
  endpointPath: string,
  accessToken: string,
  timestamp: string,
  clientSecret: string,
  body?: object
): string {
  let bodyHash = '';
  if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    bodyHash = crypto.createHash('sha256').update(JSON.stringify(body), 'utf8').digest('hex').toLowerCase();
  }

  const stringToSign = `${method.toUpperCase()}:${endpointPath}:${accessToken}:${bodyHash}:${timestamp}`;
  return crypto.createHmac('sha512', clientSecret).update(stringToSign, 'utf8').digest('base64');
}
```

### Direct Virtual Account API (`/virtual-accounts/bi-snap-va/v1.1/...`)
1. **DOKU Generated Payment Code (DGPC)**:
   - `POST /virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va`
   - DOKU generates the unique VA number using the bank's BIN.
2. **Merchant Generated Payment Code (MGPC)**:
   - Merchant provides their own payment code conforming to bank BIN rules.
3. **Billing Types**:
   - `FIX_BILL`: Exact amount payment (standard e-commerce).
   - `NO_BILL`: Open amount (donations/wallet top-up).
   - `BILL_VARIABLE_AMOUNT`: Range-based amount.
   - `PARTIAL_AMOUNT`: Installment or partial payments (BNI, CIMB, Danamon).
4. **Maintenance Endpoints**:
   - Update VA: `PUT /virtual-accounts/bi-snap-va/v1.1/transfer-va/update-va`
   - Delete VA: `DELETE /virtual-accounts/bi-snap-va/v1.1/transfer-va/delete-va`

### Direct QRIS API (`/snap-adapter/b2b/v1.0/qr/...`)
1. **Generate QRIS**:
   - `POST /snap-adapter/b2b/v1.0/qr/qr-mpm-generate`
   - Request includes `partnerReferenceNo`, `amount.value` (format `10000.00`), `merchantId`, `terminalId`, `additionalInfo.postalCode`.
   - Response returns `qrContent` string (EMVCo payload) for rendering dynamic QR code.
2. **Query QRIS**: `POST /snap-adapter/b2b/v1.0/qr/qr-mpm-query`
3. **Cancel / Expire QRIS**: `POST /snap-adapter/b2b/v1.0/qr/qr-expire`
4. **Refund QRIS**: `POST /snap-adapter/b2b/v1.0/qr/qr-mpm-refund`

---

## 3. Direct API — Non-SNAP Channels

### Credit Card Payment Page (`/credit-card/v1/payment-page`)
For non-PCI DSS merchants wanting a customized branded card checkout page:
- **Method**: `POST`
- **Headers**: Non-SNAP `Client-Id`, `Request-Id`, `Request-Timestamp`, `Signature` (HMAC-SHA256 with Digest).
- **Body**: `order`, `customer`, `payment.type` (`"SALE"` or `"AUTHORIZE"`), `override_configuration.themes` (custom colors and logos).
- **Flow**: Redirects customer to DOKU 3D-Secure authentication, then returns to `callback_url`.

### OVO Push Payment (`/ovo-emoney/v1/payment`)
Initiates an instant push payment notification directly to customer's OVO mobile app:
- **Method**: `POST`
- **Body**:
  ```json
  {
    "client": { "id": "MCH-0001-10791114622547" },
    "order": { "invoice_number": "INV-20261003-0002", "amount": 50000 },
    "ovo_info": { "ovo_id": "081234567890" },
    "security": { "check_sum": "<sha256_checksum>" }
  }
  ```
- **Checksum Calculation**:
  ```typescript
  const checkSum = crypto.createHash('sha256')
    .update(`${amount}${clientId}${invoiceNumber}${ovoId}${secretKey}`, 'utf8')
    .digest('hex');
  ```
- **Wait Time**: The backend request waits up to **70 seconds** for the customer to confirm the payment on their phone.

---

## Complete TypeScript Implementation (DOKU Checkout & SNAP Direct)

```typescript
import crypto from 'crypto';

export interface DokuConfig {
  clientId: string;
  secretKey: string;
  isProduction: boolean;
  privateKeyPem?: string; // For SNAP B2B RSA token
}

export class DokuService {
  private clientId: string;
  private secretKey: string;
  private baseUrl: string;
  private privateKeyPem?: string;

  constructor(config: DokuConfig) {
    this.clientId = config.clientId;
    this.secretKey = config.secretKey;
    this.baseUrl = config.isProduction ? 'https://api.doku.com' : 'https://api-sandbox.doku.com';
    this.privateKeyPem = config.privateKeyPem;
  }

  // =================== DOKU CHECKOUT (NON-SNAP) ===================
  private generateNonSnapHeaders(targetPath: string, body?: object) {
    const requestId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    let component = `Client-Id:${this.clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${targetPath}`;

    const headers: Record<string, string> = {
      'Client-Id': this.clientId,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      'Request-Target': targetPath,
    };

    if (body) {
      const minified = JSON.stringify(body);
      const digest = crypto.createHash('sha256').update(minified, 'utf8').digest('base64');
      headers['Digest'] = digest;
      headers['Content-Type'] = 'application/json';
      component += `\nDigest:${digest}`;
    }

    const hmac = crypto.createHmac('sha256', this.secretKey).update(component, 'utf8').digest('base64');
    headers['Signature'] = `HMACSHA256=${hmac}`;

    return headers;
  }

  public async createCheckoutUrl(payload: {
    amount: number;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
    callbackUrl?: string;
  }) {
    const targetPath = '/checkout/v1/payment';
    const body = {
      order: {
        amount: payload.amount,
        invoice_number: payload.invoiceNumber,
        currency: 'IDR',
        callback_url: payload.callbackUrl,
        auto_redirect: true,
      },
      payment: { payment_due_date: 60 },
      customer: {
        id: payload.customerEmail,
        name: payload.customerName,
        email: payload.customerEmail,
      },
    };

    const response = await fetch(`${this.baseUrl}${targetPath}`, {
      method: 'POST',
      headers: this.generateNonSnapHeaders(targetPath, body),
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return {
      paymentUrl: data.response.payment.url,
      tokenId: data.response.payment.token_id,
    };
  }

  // =================== SNAP BI DIRECT API ===================
  public async getSnapB2bToken(): Promise<string> {
    if (!this.privateKeyPem) throw new Error('Private key PEM required for SNAP B2B Token');
    const targetPath = '/authorization/v1/access-token/b2b';
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    
    // RSA-SHA256 signature
    const stringToSign = `${this.clientId}|${timestamp}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(stringToSign);
    const signature = signer.sign(this.privateKeyPem, 'base64');

    const response = await fetch(`${this.baseUrl}${targetPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CLIENT-KEY': this.clientId,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
      },
      body: JSON.stringify({ grantType: 'client_credentials' }),
    });

    const data = await response.json();
    return data.accessToken;
  }

  public async generateDirectQris(accessToken: string, partnerRefNo: string, amount: number, merchantId: string, terminalId: string) {
    const targetPath = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const externalId = crypto.randomUUID();

    const body = {
      partnerReferenceNo: partnerRefNo,
      amount: { value: `${amount.toFixed(2)}`, currency: 'IDR' },
      merchantId,
      terminalId,
      additionalInfo: { postalCode: '12012', feeType: '1' }
    };

    const minified = JSON.stringify(body);
    const bodyHash = crypto.createHash('sha256').update(minified, 'utf8').digest('hex').toLowerCase();
    const stringToSign = `POST:${targetPath}:${accessToken}:${bodyHash}:${timestamp}`;
    const signature = crypto.createHmac('sha512', this.secretKey).update(stringToSign, 'utf8').digest('base64');

    const response = await fetch(`${this.baseUrl}${targetPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-PARTNER-ID': this.clientId,
        'X-EXTERNAL-ID': externalId,
        'X-TIMESTAMP': timestamp,
        'X-SIGNATURE': signature,
        'CHANNEL-ID': 'H2H'
      },
      body: minified,
    });

    return await response.json();
  }
}
```

---

### Common Pitfalls to Avoid

| Anti-Pattern | Issue | Solution |
|---|---|---|
| Using HMAC-SHA512 for DOKU Checkout | `401 Unauthorized / Invalid Signature` | DOKU Checkout uses **Non-SNAP HMAC-SHA256** with body `Digest`. |
| Using HMAC-SHA256 for SNAP BI Direct | `401 Unauthorized` | SNAP BI transactional endpoints strictly require **HMAC-SHA512** with lowercase hex SHA-256 body hash. |
| Forgetting `CHANNEL-ID: H2H` in SNAP | Bad request | SNAP BI Direct host-to-host APIs require `CHANNEL-ID: H2H` header. |
| Inverting `Request-Target` in Webhook | Signature validation fails | For incoming webhooks, `Request-Target` is the merchant's endpoint path (e.g., `/api/webhooks/doku/checkout`). |
| OVO Push timeout too short | premature failure | OVO push payments require up to **70 seconds** client timeout while the user confirms on mobile. |
| Non-atomic database updates | Race condition double top-up | Always guard webhook fulfillments with atomic SQL updates (`WHERE status = 'PENDING'`). |

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan:
- `payment-gateway-expert` — Arsitektur checkout SaaS, perutean multi-gateway, dan state machine langganan.
- `saas-billing` — Sinkronisasi database lokal, penguncian atomik (atomic locks), dan penerbitan invoice.
- `doku-mcp-server` — Membuka tool DOKU Checkout dan Direct API ke Agen AI via Model Context Protocol.
- `database-orm-expert` — Model database transaksional dan pencegahan race-condition.
- `async-queue-temporal-expert` — Antrean job latar belakang untuk retry dan rekonsiliasi pembayaran.

### Deskripsi
Panduan ahli untuk mengintegrasikan DOKU Payment Gateway berdasarkan dokumentasi resmi [DOKU Developers Portal](https://developers.doku.com/).
DOKU menyediakan 2 model integrasi utama:
1. **DOKU Checkout** (`/checkout/v1/payment`): Halaman pembayaran hosted atau modal pop-up overlay (`jokul-checkout-1.0.0.js`). Cara termudah dan tercepat untuk menerima seluruh metode pembayaran (Virtual Account, Kartu Kredit, QRIS, E-Wallet, Indomaret/Alfamart, Paylater, Direct Debit) dalam satu kali integrasi. Menggunakan tanda tangan **Non-SNAP HMAC-SHA256** dengan komponen `Digest`.
2. **Direct API**:
   - **Standar SNAP BI (Host-to-Host)**: Standar Bank Indonesia untuk integrasi perbankan langsung (B2B Access Token via RSA Asimetrik, transaksi via **HMAC-SHA512** untuk Direct VA, Direct QRIS, dan Direct Debit).
   - **Direct API Non-SNAP**: Endpoint khusus untuk Kartu Kredit (`/credit-card/v1/payment-page`) dengan 3DS kustom dan OVO Push Payment (`/ovo-emoney/v1/payment`) langsung ke ponsel pengguna.

---

### Perbandingan Model Integrasi (Checkout vs Direct API)

| Kebutuhan | Rekomendasi Solusi | Alasan |
|---|---|---|
| **E-commerce, SaaS, Starter** | **DOKU Checkout** | 1 API mengaktifkan semua kanal pembayaran sekaligus tanpa membangun UI per bank. |
| **In-App Native Banking UI** | **Direct API SNAP BI** | Memungkinkan merchant menampilkan nomor Virtual Account atau QRIS langsung di dalam aplikasi tanpa redirect. |
| **Non-PCI DSS Card Form** | **Credit Card Payment Page** | Halaman pembayaran kartu dengan 3DS aman tanpa beban audit sertifikasi PCI DSS. |
| **Push Payment E-Wallet** | **OVO Push Payment** | Langsung memicu prompt bayar di aplikasi OVO pelanggan menggunakan nomor ponsel (timeout 70 detik). |

---

### 🚨 Simulator Sandbox DOKU
- **URL Simulator**: `https://sandbox.doku.com/gtw-config-v2/simulator`
- **QRIS Simulator**: `https://sandbox.doku.com/qris-simulator/`
Gunakan simulator resmi di atas untuk menguji transaksi Virtual Account dan QRIS dalam mode Sandbox sebelum deployment ke produksi.