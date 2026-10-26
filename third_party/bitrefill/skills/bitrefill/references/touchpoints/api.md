# Path: REST API

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

Outbound HTTP, no MCP, no shell. Last resort — verbose, no typed validation. Examples use `curl`; any HTTP client works.

Base URL: `https://api.bitrefill.com/v2`

## Three tiers

| Tier | Auth | Use case |
|------|------|----------|
| Personal | Bearer token | Personal projects, agent automation |
| Business | Basic auth (`API_ID:API_SECRET`) | Platforms, resellers, BRGC batches, deposits, test products |
| Affiliate | Basic auth | Business + commission tracking, results filtered by `referrer_id` |

## Personal API (agent default)

Key: <https://www.bitrefill.com/account/developers>.

```bash
export BITREFILL_API_KEY=YOUR_API_KEY
H="Authorization: Bearer $BITREFILL_API_KEY"

# 1. Ping
curl -H "$H" https://api.bitrefill.com/v2/ping
# → {"data":{"message":"pong"}}

# 2. Balance
curl -H "$H" https://api.bitrefill.com/v2/accounts/balance

# 3. Search
curl -H "$H" "https://api.bitrefill.com/v2/products/search?q=amazon"

# 4. Product details
curl -H "$H" https://api.bitrefill.com/v2/products/amazon-us

# 5. Buy (balance, instant)
curl -X POST -H "$H" -H "Content-Type: application/json" \
  -d '{
    "products": [{"product_id":"amazon-us","package_id":"amazon-us<&>50","quantity":1}],
    "payment_method": "balance",
    "auto_pay": true
  }' \
  https://api.bitrefill.com/v2/invoices

# 6. Order / redemption
curl -H "$H" https://api.bitrefill.com/v2/orders/{order_id}
# → data.redemption_info.code, .link, .pin, .instructions
```

Crypto: omit `auto_pay`, set `payment_method: "bitcoin"|"lightning"|"usdc_base"|...`, include `refund_address` for crypto, poll `GET /invoices/{id}` until `status: "complete"`.

## Business API

Apply: <https://www.bitrefill.com/integrate>.

```bash
TOKEN=$(printf "%s:%s" "$BITREFILL_API_ID" "$BITREFILL_API_SECRET" | base64)
H="Authorization: Basic $TOKEN"

curl -H "$H" https://api.bitrefill.com/v2/ping
```

Adds: BRGC batches, account deposits via crypto, full catalog incl. test products. Same endpoints + `POST /brgc-batches`, `POST /accounts/deposit`.

## Affiliate API

Apply: <https://www.bitrefill.com/affiliate>. Same auth as Business. Adds `GET /commissions` with `after`/`before` filters. Order/invoice queries filtered by `referrer_id` not `user_id`.

## Key endpoints

- `GET /ping` — health (1 req / 3 s)
- `GET /accounts/balance` — current balance
- `GET /products` — paginated catalog (cache locally, refresh daily; 1000 product req/hr quota shared with search)
- `GET /products/search?q=...` — keyword search
- `GET /products/{id}` — details with `packages` array
- `POST /invoices` — create (max 20 products)
- `POST /invoices/{id}/pay` — pay unpaid balance invoice
- `GET /invoices/{id}` — status
- `GET /orders/{id}` — redemption info
- `POST /esims` — create eSIM invoice (or top-up via `esim_id`)
- `GET /esims` / `GET /esims/{id}` — list / get user eSIMs

Webhooks: `webhook_url` on invoice creation → notification when delivered.

## Test products

Business/Affiliate only. No charge. Examples: `test-gift-card-code`, etc. Full: <https://docs.bitrefill.com/docs/test-products>.

## Rate limits

Most endpoints 60 req / 10 min. `/products` + `/products/search` 60 req/min + 1000 product req/hr. `/ping` 1 req / 3 s. Full: <https://docs.bitrefill.com/docs/rate-limits>.

## Source of truth

- <https://docs.bitrefill.com/docs/api-overview> — tiers + auth
- <https://docs.bitrefill.com/docs/quickstart-2> — 6-step purchase
- <https://docs.bitrefill.com/reference> — endpoint catalog
- <https://docs.bitrefill.com/docs/error-codes> — error codes
- <https://docs.bitrefill.com/docs/webhooks> — webhook spec

**User hears:** same purchase flow — never "REST API", "Bearer token", or endpoint paths.
