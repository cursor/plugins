# Troubleshooting

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

Common errors all paths. Full enum: <https://docs.bitrefill.com/docs/error-codes>, <https://docs.bitrefill.com/docs/References>.

## Browse path

### `403 Forbidden` on bitrefill.com

Cloudflare blocks datacenter IPs. Fix: residential browser (ChatGPT Atlas, Cursor browser, Claude+Chrome ext, OpenClaw on user host) or pivot MCP/CLI/API.

### Product in listing but not purchasable

Geolock at IP. URL country filters inventory; checkout enforces IP. User needs to be in a supported country — don't suggest VPNs or other workarounds ([ToS](https://www.bitrefill.com/terms/)); offer a product for the user's country.

## MCP path

### Tool not visible

- Cursor: 40-tool cap exceeded. Disable unused MCP server.
- ChatGPT: Developer Mode off → write tools hidden. Toggle Settings.
- Claude.ai Free: can't add custom MCP URLs. Upgrade Pro+.
- OpenClaw: `tools.deny: ["bundle-mcp"]` hiding server, or per-agent `tools.allow` too narrow.

### `StreamableHTTPError` with HTML body

Wrong `MCP_URL`. Unset env or set `https://api.bitrefill.com/mcp`.

### OAuth loop (Cursor / Claude.ai)

Clear cookies for `bitrefill.com`, different browser, allow pop-ups.

### MCP server filtered (OpenClaw)

Startup filter rejects: `NODE_OPTIONS`, `PYTHONSTARTUP`, `PYTHONPATH`, `PERL5OPT`, `RUBYOPT`, `SHELLOPTS`, `PS4`. Use standard `*_API_KEY` / `GITHUB_TOKEN` / proxy vars only.

### MCP output truncated

Claude Code: `MAX_MCP_OUTPUT_TOKENS=50000`. OpenClaw: `tools.toolResultMaxChars` (default 16000). Paginate: `--per_page 25`, multiple `list-orders`.

## CLI path

### `cart_items` JSON shape error

```
# WRONG (object)
--cart_items '{"product_id": "steam-usa", "package_id": 5}'

# RIGHT (array)
--cart_items '[{"product_id": "steam-usa", "package_id": 5}]'
```

### `Invalid denomination 'undefined'`

Both `product_id` AND `package_id` required per item.

### `Too big: expected array to have <=15 items`

Split into multiple `buy-products` calls.

### `per_page must be less than 500`

Server limit. Max 500.

### `error: required option '--<name>' not specified`

Client validation. Add missing option.

### "Must be one of" enum errors

| Option | Valid values | Common mistakes |
|--------|--------------|-----------------|
| `--payment_method` | `bitcoin`, `lightning`, `ethereum`, `usdc_polygon`, `usdt_polygon`, `usdc_erc20`, `usdt_erc20`, `usdc_arbitrum`, `usdc_solana`, `usdc_base`, `eth_base`, `balance` | `paypal`, `visa`, `USDC_BASE` (case-sensitive) |
| `--product_type` | `giftcard`, `esim` | `giftcards`, `gift_card`, `sim` |
| `--country` | `US`, `IT`, `BR` (uppercase Alpha-2) | `us`, `USA`, `"United States"` |

### Wrong `package_id` for named denominations

Exact, case-sensitive. WRONG `"1GB"`, `"300 nc"`. RIGHT `"1GB, 7 Days"`, `"PUBG New State 300 NC"`. Get from `get-product-details` `packages` array.

### Compound key in `package_id`

```
# WRONG
--cart_items '[{"product_id": "steam-usa", "package_id": "steam-usa<&>5"}]'

# RIGHT (value after <&>)
--cart_items '[{"product_id": "steam-usa", "package_id": 5}]'
```

### CLI auth failure (≥ 0.3.0)

OAuth client_credentials + email magic link — not API keys, not browser OAuth.

```bash
bitrefill reset
bitrefill login --email you@example.com
bitrefill verify --code 123456                     # add --otp for TOTP
bitrefill whoami --json
```

| Error | Fix |
|-------|-----|
| `Access token is required for login/verify` | Any command first (MCP connect), or `reset` then retry |
| `No pending login` | Run `login --email` before `verify` |
| `No OTP code provided` on verify | Account has 2FA — add `--otp` (authenticator), keep `--code` (email) |
| `Invalid code` on verify | Wrong email code or TOTP; email → `--code`, authenticator → `--otp` |
| `unknown option '--code'` on login | Code on `verify --code`, not `login` |
| `unknown command 'login'` | Already signed in — `logout` first |
| `Failed to establish a session` | `reset`, retry |
| Invalid / expired code | Re-run `login --email`; headless → poll agent inbox ([touchpoints/cli-headless-auth.md](touchpoints/cli-headless-auth.md)) |
| Missing TOTP | `verify --code … --otp "$(op read 'op://Vault/Item/one-time password?attribute=otp')"` |

State: `~/.config/bitrefill-cli/<host>.v1.json`. `logout` revokes session; `reset` clears all.

Pre-0.3.0 (`credentials.json`, `--api-key`): upgrade CLI. Developer API keys still work for [touchpoints/mcp.md](touchpoints/mcp.md) / [touchpoints/api.md](touchpoints/api.md) only.

### Empty search results, no error

`found: 0`, no error. Causes: bad `--category` slug; product unavailable in `--country`; `--in_stock true` (default) filters OOS.

Fix: drop `--category`, change `--country`, or `--in_stock false`.

### Unpaid invoices missing from list

`list-invoices` defaults `--only_paid true`. Use `--only_paid false`.

## API path

### `401 Unauthorized`

- Personal: `Authorization: Bearer $BITREFILL_API_KEY` missing/wrong.
- Business / Affiliate: `Authorization: Basic $(echo -n "$ID:$SECRET" | base64)` malformed.

### `429 Too Many Requests`

Rate limited. Defaults: 60 req/10 min most endpoints; 60 req/min on `/products` + `/products/search` + 1000 product req/hr; 1 req/3 s on `/ping`. Back off + retry. Cache catalog.

### `RESOURCE_NOT_FOUND` on `GET /invoices/{id}`

Bad invoice ID. Verify via `list-invoices`.

### `Product '{slug}' is not available`

Bad slug. Verify via `search-products`.

### Invoice expired

**180 minutes**. Can't re-pay. Create new.

## OpenClaw-specific

### Cron purchase failed silently

`exec-approvals.json` `ask: on-miss` but no operator for `/approve`. Pre-approve `bitrefill buy-products` for trusted SKU/amount, or schedule when operator available.

### Pi can't see Bitrefill MCP

Check: `openclaw mcp list`; `openclaw.json` parses; agent not denying `bundle-mcp`; CLI signed in (`whoami --json`) or MCP OAuth done — not just shell env vars.

### Mobile node camera unavailable

Node not paired or offline. `openclaw nodes list`. Re-pair via Control UI (`openclaw dashboard`).

### Telegram message not reaching agent

`channels.telegram.dmPolicy: "pairing"` and sender not paired. `openclaw pairing approve telegram <CODE>` (codes expire 1 hr).

## x402 / SIWX path

### `402` after SIWX send

Stale nonce (5 min expiry), wrong EIP-55 checksum, malformed payload. Re-fetch challenge, re-sign. → [wallets/siwx.md](wallets/siwx.md).

### `403` on SIWX route

Signing wallet ≠ invoice payer. Sign with payer wallet.

### HTTP `500` on `invoice/create`

Wrong `package_value` — exact string from product detail. Confirm no onchain charge before retry.

### `INVOICE_NOT_PAYABLE` on pay

Already settled — poll `invoice/status` or `get-invoice-by-id`.

### Base MCP `web_request` rejected

Hostname not allowlisted — only `api.bitrefill.com` (not `docs.bitrefill.com`). → [wallets/base-mcp.md](wallets/base-mcp.md).

### Phantom `wallet_balances` schema error

Known Phantom MCP issue — use `wallet_addresses` + external balance, or Base MCP `get_portfolio`.

## Source of truth

- Error codes: <https://docs.bitrefill.com/docs/error-codes> | Handling: <https://docs.bitrefill.com/docs/References>
- Rate limits: <https://docs.bitrefill.com/docs/rate-limits>
- OpenClaw: <https://docs.openclaw.ai/help> + per-tool pages

**User hears:** plain language — "That didn't go through — let's try again" / "Still processing, one moment" — never error codes, endpoint names, or stack traces.
