# Path: CLI

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

Shell + `npm install`, **no MCP client** (CLI talks to Bitrefill MCP under hood). Runtimes: Claude Code, Codex CLI, Cursor terminal, Gemini CLI, OpenCode, OpenClaw, Jules, ChatGPT Agent.

Requires **`@bitrefill/cli` ≥ 0.3.0**. Sandboxed shells: allowlist `registry.npmjs.org` + `api.bitrefill.com`.

## Install

```bash
npm install -g @bitrefill/cli
```

From source: `git clone https://github.com/bitrefill/cli.git && cd cli && pnpm install && pnpm build && npm link`.

## Guest checkout (fastest first try)

**No `login` / `verify`.** Works while `whoami` shows `identity: unregistered`. Fastest autonomous path — search, quote, invoice, pay crypto or payment link.

```bash
bitrefill search-products --query "Amazon" --country IT --intent "Amazon gift card"
bitrefill get-product-details --product_id "amazon_it-italy"

bitrefill buy-products \
  --cart_items '[{"product_id":"amazon_it-italy","package_id":"10"}]' \
  --payment_method lightning \
  --return_payment_link true \
  --email "agent@example.com"
```

Response: `invoice_id`, `invoice_access_token`, `payment_link`, optional `x402_payment_url` / Lightning invoice. Poll `get-invoice-by-id --invoice_id <uuid> --invoice_access_token <token>`. Receipt → `--email`. Invoice expires ~30 min.

Guest payment: crypto or `--return_payment_link true`; card / Apple Pay / Google Pay: `--payment_method fiat_card` (or `apple_pay` / `google_pay`) `--billing_address '{"country":"US","city":"…","postal_code":"…","address_line1":"…"}'` (Apple Pay / Google Pay: `country` only) → send `payment_link`. Pay → [../wallets/payment.md](../wallets/payment.md). **`balance` / `cashback` need signed-in account** (below).

## Sign up / sign in (balance, cashback, order history)

After guest try, sign in when human wants **managed agent spending** or **rewards**:

| Signed-in benefit | Why |
|-------------------|-----|
| **`--payment_method balance`** | Instant from pre-funded store credit — spending cap, no on-chain wait |
| **`--payment_method cashback`** | Pay from rewards balance (BTC) |
| **Cashback on purchases** | Eligible products earn rewards |
| **`list-orders` / `list-invoices`** | Order history + redemption codes |

Same `login` for new + existing. Headless inbox → [cli-headless-auth.md](cli-headless-auth.md).

```bash
bitrefill login --email you@example.com
bitrefill verify --code GGWK87DR              # email magic-link code
bitrefill verify --code GGWK87DR --otp 122407   # + TOTP when 2FA
bitrefill whoami --json

# signed-in buy — instant from balance
bitrefill buy-products \
  --cart_items '[{"product_id":"amazon_it-italy","package_id":"10"}]' \
  --payment_method balance \
  --email "you@example.com"
```

**Verify gotchas:**

- Email code → `verify --code <value>`, **not** `login --code`.
- `--otp` = **authenticator TOTP only** when 2FA — not email code. Both `--code` + `--otp` when enrolled.
- After sign-in, `login` gone from `--help`; `logout` first to switch accounts.

## Bootstrap (optional)

```bash
bitrefill init                    # optional OpenClaw wiring only
```

`init` no longer stores API keys. OpenClaw only: merges MCP config + generates `~/.openclaw/skills/bitrefill/SKILL.md`.

## Auth

CLI 0.3.0: **guest checkout needs no sign-in.** Account auth = OAuth client_credentials (auto on first MCP connect) + email magic-link. No `--api-key`, no `credentials.json`.

| Step | Command | Notes |
|------|---------|-------|
| Register client | any command (or `login`) | MCP connect mints `access_token`; stored `~/.config/bitrefill-cli/<host>.v1.json` |
| Sign up or sign in | `login --email <addr>` | same for new + existing |
| Complete auth | `verify --code <code> [--otp <totp>]` | email code; `--otp` when TOTP |
| Check session | `whoami [--json]` | `identity: registered` + `email` when signed in |
| Sign out | `logout` | revokes session; keeps `client_id` |
| Full reset | `reset` | clears all local state + revokes session |

**TOTP via 1Password** ([`op read`](https://www.1password.dev/cli/reference/commands/read)):

```bash
bitrefill verify --code "$CODE" --otp "$(op read 'op://Vault/Bitrefill/one-time password?attribute=otp')"
```

Shorthand ([`op item get --otp`](https://developer.1password.com/llms-cli.txt)):

```bash
bitrefill verify --code "$CODE" --otp "$(op item get Bitrefill --otp)"
```

Server may return `browser_url` for passkey/WebAuthn — open in browser, retry.

**Developer API keys** (Personal REST / key-in-path MCP) separate from CLI auth. → [mcp.md](mcp.md), [api.md](api.md).

## Global flags

Before subcommand:

- **`--json`** — stdout single JSON per run (TOON → JSON); status/errors on **stderr**. Use with `jq`.

```bash
bitrefill --json search-products --query "Amazon" --per_page 1 | jq '.products[0].name'
```

## Agent discovery

`manifest` — JSON schema for every built-in + MCP command:

```bash
bitrefill manifest --json | jq '.commands[].name'
bitrefill manifest -o bitrefill-manifest.json
```

`llm-context` embeds manifest in fenced JSON block.

## `llm-context`

Regenerates Markdown from live MCP `tools/list`. For **CLAUDE.md**, Cursor rules, **`.github/copilot-instructions.md`**. Connection line = redacted MCP URL — safe to commit.

```bash
bitrefill llm-context -o BITREFILL-MCP.md
```

## OpenClaw quick-bootstrap

Optional `bitrefill init --openclaw`: MCP stub in `~/.openclaw/openclaw.json` + skill SKILL.md. **Not required for guest CLI** — install CLI, guest checkout via `exec`. OpenClaw prefers guest CLI first → [../harnesses/openclaw.md](../harnesses/openclaw.md). Hardening → exec-approvals for `buy-products`.

## Workflow

Subcommands from remote MCP (`bitrefill --help` after connect). Core:

```
search-products  →  get-product-details  →  buy-products  →  get-invoice-by-id
```

1. **Search** — `search-products`. *(say: "Searching for [product]…")*
2. **Get price** — `get-product-details`. *(silent)*
3. **Prepare order** — `buy-products`. Confirm with user first. *(say: "[Product] — [amount]: [total] USDC. Confirm?")*
4. **Pay** → [../wallets/payment.md](../wallets/payment.md). *(say: "Approve the payment in your Base Account")*
5. **Deliver** — `get-invoice-by-id` until complete. *(say: "Your code is ready.")*

### 1. Search

```bash
bitrefill search-products --query "Netflix" --country US
bitrefill --json search-products --query "Netflix" --country US --per_page 5 | jq '.products'
bitrefill search-products --query "eSIM" --product_type esim --country IT
bitrefill search-products --query "*" --category games --country US
```

`--country` = uppercase Alpha-2. `--product_type` = `giftcard` or `esim`. Categories: `--query "*"` returns `categories` array with slugs.

### 2. Details

```bash
bitrefill get-product-details --product_id "steam-usa" --currency USDC
```

`packages` array → `package_value` = `package_id` for `buy-products`. Ignore `<&>` compound key.

Denomination types:

- **Numeric**: `5`, `50`, `200` (number).
- **Duration**: `"1 Month"`, `"12 Months"` (exact, case-sensitive).
- **Named**: `"1GB, 7 Days"`, `"PUBG New State 300 NC"` (exact, case-sensitive).

Only values from `get-product-details` accepted.

### 3. Buy

`--cart_items` = JSON **array**, even single item. Max 15. **`--email`** = receipt (required guest; optional signed-in).

```bash
# Guest — crypto + payment link
bitrefill buy-products \
  --cart_items '[{"product_id":"amazon_it-italy","package_id":"10"}]' \
  --payment_method lightning \
  --return_payment_link true \
  --email "agent@example.com"

# Signed-in — instant from store credit
bitrefill buy-products \
  --cart_items '[{"product_id": "steam-usa", "package_id": 5}]' \
  --payment_method balance \
  --email "you@example.com"

# Signed-in — crypto via x402
bitrefill buy-products \
  --cart_items '[{"product_id": "steam-usa", "package_id": 5}]' \
  --payment_method usdc_base

# Duration package
bitrefill buy-products \
  --cart_items '[{"product_id": "spotify-usa", "package_id": "1 Month"}]' \
  --payment_method balance

# Named eSIM
bitrefill buy-products \
  --cart_items '[{"product_id": "bitrefill-esim-europe", "package_id": "1GB, 7 Days"}]' \
  --payment_method usdc_base
```

Response: `invoice_id`, `payment_link`, `x402_payment_url`, `payment_info` (`address`, `paymentUri`, `altcoinPrice`).

**Pay** → [../wallets/payment.md](../wallets/payment.md): x402 on `x402_payment_url`, Base MCP `send` to `payment_info`, or `balance` when signed in.

### 4. Track / Redeem

```bash
bitrefill get-invoice-by-id --invoice_id "UUID" --invoice_access_token "TOKEN"   # guest: both from buy-products
bitrefill list-orders --include_redemption_info true   # signed-in only
bitrefill get-order-by-id --order_id "ID"              # signed-in only
```

Invoices expire 180 min. Expired = create new.

## Critical gotchas

- `--cart_items` = **array** `[...]`, not object `{...}`. Single quotes outside, double inside.
- Use `package_value` after `<&>`, not compound key. WRONG `"steam-usa<&>5"`. RIGHT `5`.
- Named/duration `package_id` exact, case-sensitive. WRONG `"1GB"`. RIGHT `"1GB, 7 Days"`.
- Country uppercase Alpha-2. WRONG `us`, `USA`. RIGHT `US`.
- `login`/`verify` only when not signed in. `logout` before switching accounts.
- Guest: `--payment_method balance`/`cashback` fail — crypto or sign in first.
- Signed-in + 2FA: `verify` needs **both** `--code` (email) + `--otp` (authenticator).

## Payment methods

Pay-time routing → [../wallets/payment.md](../wallets/payment.md). Signed-in: prefer `balance` + pre-funded cap. Guest: `usdc_base` or `lightning` + wallet from [../wallets/matrix.md](../wallets/matrix.md).

## Source of truth

- <https://github.com/bitrefill/cli> — commands, options, flags
- <https://docs.bitrefill.com/docs/crypto-payments> — payment methods
- `bitrefill manifest --json` / `bitrefill llm-context` — live tool list + schemas

**User hears:** "Searching for [product]…" → "[Product] — [amount]: [total] USDC. Confirm?" → "Approve the payment" → "Your code is ready."
