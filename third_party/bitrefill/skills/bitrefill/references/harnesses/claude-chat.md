# Host: Claude Chat (claude.ai)

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

[Claude Chat](https://claude.ai) — **code execution sandbox always available** (Python/Node/bash inside the host). **No agent shell** — no Claude Code-style `exec`, no `@bitrefill/cli`, no persistent project terminal. **Egress from sandbox is variable** — probe it; don't assume. **Chat-level MCP connectors** work independent of sandbox egress.

Covers **claude.ai** + custom MCP (Pro+ for connector URLs; Free has code execution, not custom MCP). Claude Code / Desktop / Cowork → [capability-matrix.md](capability-matrix.md) + [../touchpoints/mcp.md](../touchpoints/mcp.md). Only **claude.ai** has **`show_widget`** generative UI.

**Priority:** Bitrefill MCP → Base MCP pay → guest checkout via Base wallet sign-in → payment link. Route Bitrefill API via **MCP** first; sandbox HTTP only when MCP missing **and** egress probe succeeds.

## 1. Detect Claude Chat

**Run this check before generic harness probe.** Claude Chat is often missed when agents wait for every signal — treat as Claude Chat when **enough** match, not all.

| Signal | Weight |
| --- | --- |
| **`show_widget`** and/or **`read_me`** in tool list | Strong — generative UI hosts only |
| **`initiate_x402_request`** / **`get_wallets`** / Bitrefill MCP tools (`search-products`, …) as **chat connectors** | Strong |
| **Code execution** / file-creation tools present (host sandbox — not agent `exec`) | Supporting |
| User on **claude.ai** / Connectors UI / Pro+ custom MCP | Supporting |
| Claude Code, Cowork desktop, Cursor, Codex | **Not** Claude Chat → [capability-matrix.md](capability-matrix.md) |

**Decision:** strong generative-UI signal **or** MCP connector tools on claude.ai → **Claude Chat**. Do not require `show_widget` **and** `read_me` together; either is enough. Do **not** use missing agent `exec` as the detector — Claude Chat **has** sandbox code execution.

OpenClaw → [openclaw.md](openclaw.md). Else if not Claude Chat → [decision-engine.md](decision-engine.md).

## 2. User voice

Plain shopping language. Match the user's language when they write in Italian, etc. — **including thinking summaries and tool-call titles** (both are user-visible on claude.ai).

| Internal (never say) | User-facing |
| --- | --- |
| Path 1 / Path 2 | (omit — just do the right flow) |
| x402 REST / micro-fee / gated route | "quick wallet sign-in" or nothing |
| SIWX / JWT / connect | "Sign in with your Base wallet" (one approval) |
| Bitrefill MCP not authenticated | "Let's connect your Bitrefill account" — OAuth once; if user skips, Base wallet sign-in |
| Step 1: search… | "Searching for Amazon Italy…" |
| 4–5 approvals coming | "Two quick steps: sign in with Base, then approve payment" |
| initiate_x402_request | "Approve the payment in your Base Account" |

**Tool-call titles** — shopping verbs, not endpoints: "Search gift cards", "Get product price", "Sign in with Base wallet", "Approve USDC payment", "Check delivery" — never `web_request`, `/x402/connect`, `Orchestrated API strategy`, etc.

**Message budget:** ≤4 user-visible assistant messages per purchase — (1) goal + first approval if needed, (2) price receipt + confirm, (3) payment approval, (4) delivery. Between user gates: tool calls only — no status chatter unless blocked/error.

**Bad:** "Procedo con il flusso ottimale… Step 1: cerco Amazon Italy su Bitrefill MCP… Il Path 1 richiede script Node… Devo usare Path 2 (pay-per-call)."

**Good:** "Cerco la carta regalo Amazon Italia… Per pagare in USDC ti chiederò di collegare il wallet Base una volta, poi di approvare il pagamento."

Don't announce routing. Don't number steps aloud. Decide in silence; poll silently — never ask user to ping you.

## 3. Install connectors

Settings → Connectors → Add custom connector:

| Connector | URL | Role |
| --- | --- | --- |
| Bitrefill eCommerce MCP | `https://api.bitrefill.com/mcp` | OAuth; `search-products`, `buy-products`, poll |
| Base MCP | `https://mcp.base.org` | `web_request`, `sign`, x402 pay, optional `send` |

First Bitrefill call → OAuth (allow pop-ups / third-party cookies if loop — [../troubleshooting.md](../troubleshooting.md)). Keep **per-tool approval on**; never auto-approve `buy-products` ([../safeguards.md](../safeguards.md)).

Setup → [../touchpoints/mcp.md](../touchpoints/mcp.md) § Claude.ai. Guide → <https://docs.bitrefill.com/docs/use-with-claude-chat>.

## 4. Sandbox vs MCP (network layers)

Three separate paths. Don't conflate **sandbox code execution** with **sandbox egress** or **MCP**.

| Environment | Code execution | Network | Bitrefill routing |
| --- | --- | --- | --- |
| **Chat MCP** | — | Always reaches MCP URLs | **Preferred** — catalog, checkout, wallet sign-in, pay |
| **Code execution sandbox** | **Always available** (Python/Node/bash) | **Variable** — admin/user allowlist | Fallback HTTP only if MCP missing **and** egress probe OK |
| **Analysis tool (legacy)** | Browser JS (mutually exclusive with code execution) | **None** | N/A — disable if using code execution |

**MCP traffic independent of sandbox egress** — connectors work when sandbox egress is off. [Create and edit files with Claude](https://support.anthropic.com/en/articles/12111783-create-and-edit-files-with-claude).

### Probe sandbox egress (quick)

Egress is plan/org-dependent — **probe, don't assume**. One lightweight sandbox call:

```python
import urllib.request
try:
    urllib.request.urlopen("https://api.bitrefill.com/x402/checkout/info", timeout=8)
    print("egress_direct: true")
except Exception as e:
    print("egress_direct: false", e)
```

Or Node/`curl` equivalent in sandbox. Result:

| Outcome | Meaning |
| --- | --- |
| Success (any HTTP response) | `egress_direct: true` — sandbox can reach Bitrefill; still **prefer MCP** for shopping |
| Timeout / connection refused / allowlist error | `egress_direct: false` — use MCP or Base MCP `web_request` only |

No `@bitrefill/cli` in sandbox — that's agent-shell tooling ([../touchpoints/cli.md](../touchpoints/cli.md)), not host sandbox.

### Plan defaults (sandbox egress)

Source: Anthropic Help Center (Apr 2026). Org: **Organization settings → Capabilities → Code execution and file creation**.

| Plan | Code execution default | Sandbox egress default |
| --- | --- | --- |
| **Free / Pro / Max** | Off until user enables **Settings → Capabilities** | When on: **Allow network egress ON** — package managers only |
| **Team** | **On** at org level | **On** — package managers only; owner can disable |
| **Enterprise** | **On** for new orgs | **Off** — owner enables + domain whitelist |

**Team egress enabled** ≠ open internet. Default = package managers only (`pypi.org`, `registry.npmjs.org`, `github.com`, …). **`api.bitrefill.com` not on default allowlist.**

### Admin egress levels (Team / Enterprise)

| Setting | Sandbox can reach | Bitrefill via sandbox? |
| --- | --- | --- |
| Egress **off** | Pre-installed packages only | No |
| **Package managers only** (Team default when on) | npm, PyPI, GitHub, Ubuntu mirrors, … | No (unless admin whitelists `api.bitrefill.com`) |
| Package managers **+ custom domains** | Above + owner-whitelisted hosts | Only if `api.bitrefill.com` whitelisted |
| **All domains** | Internet except Anthropic blocklist | Yes — still **prefer MCP** for shopping |

Sandbox can run Node/Python (including SIWX helper logic) **when egress allows** — but guest checkout should still use Base MCP `web_request` + `sign` when Base MCP is connected (no egress dependency).

## 5. Fixed capability profile

Probe at session start — especially egress.

| Probe | Claude Chat value |
| --- | --- |
| `sandbox_exec` | **true** — host code sandbox always available |
| `exec_available` | **false** — no agent shell / `@bitrefill/cli` ([../touchpoints/cli.md](../touchpoints/cli.md)) |
| `egress_direct` | **probe** — see §4; default assume false until probe succeeds |
| `egress_mcp_proxy` | **true** when Base MCP connected |
| `browser_residential` | Chrome extension only (explore — [../touchpoints/browse.md](../touchpoints/browse.md)) |
| `bitrefill_mcp_live` | `search-products` visible after OAuth (Pro+) |
| `base_mcp_live` | `get_wallets` / `web_request` / `initiate_x402_request` visible |

**Rule:** probe **`bitrefill_mcp_live`** + **`base_mcp_live`** + **`egress_direct`** (quick sandbox test). Touchpoint choice ignores sandbox when MCP live. Guest checkout sign-in → Base MCP `web_request` + `sign` when Base MCP connected; else sandbox + egress + [../wallets/siwx.md](../wallets/siwx.md) inline helpers.

## 6. Ranked stack (autonomy-first)

| Rank | Touchpoint | Wallet | Residual HITL |
| --- | --- | --- | --- |
| 1 | Bitrefill MCP | `balance` + `auto_pay: true` | Confirm purchase only |
| 2 | Bitrefill MCP | Base MCP x402 on `x402_payment_url` | OAuth + 1 Base approval/pay |
| 3 | Guest checkout (wallet sign-in) | Base MCP sign + pay | 1 wallet sign-in + 1 pay |
| 4 | Bitrefill MCP | Base MCP `send` | OAuth + 1 send/pay |
| 5 | Bitrefill MCP | `payment_link` / Lightning | Human completes pay |

**Avoid:** `@bitrefill/cli`, **pay-per-call browse** when Base wallet sign-in works, routing shopping via sandbox when MCP is live, datacenter browse checkout.

**Dual-MCP:** both live → **Bitrefill MCP owns catalog/checkout**; **Base MCP owns pay** — don't duplicate browse via Base `web_request` or sandbox curl when Bitrefill MCP OAuth'd.

## 7. Primary workflow — Bitrefill MCP + Base MCP

1. **Search** — `search-products(query, country=<Alpha-2>, product_type=...)`.
2. **Detail** — `get-product-details(product_id, currency="USDC")` → exact `package_value` / `package_id`.
3. **Confirm** — product, denomination, exact price with user before buy.
4. **Buy** — `buy-products(cart_items=[...], payment_method="usdc_base", return_payment_link=true)` (or `"balance"` + `auto_pay: true` when pre-funded).
5. **Pay** ([../wallets/payment.md](../wallets/payment.md)):
   - **Best:** `payment_method: "balance"` + `auto_pay: true`.
   - **Default USDC:** Base MCP `initiate_x402_request(url=x402_payment_url, method, maxPayment)` → user approves Base Account → `complete_x402_request(requestId)`. `maxPayment` slightly above `price_usd`.
   - **Fallback:** Base MCP `send` to `payment_info.address` / `payment_info.altcoinPrice`.
6. **Poll** — `get-invoice-by-id(invoice_id)` until `invoice_status: complete` / `orders_delivery_status: all_delivered`.
7. **Deliver** — `orders[].redemption_info`; log per safeguards; never paste codes in shared channels.

MCP tools → [../touchpoints/mcp.md](../touchpoints/mcp.md). Base MCP pay → [../wallets/base-mcp.md](../wallets/base-mcp.md).

## 8. Fallback — guest checkout via Base wallet

When Bitrefill MCP unavailable (no OAuth, connector error, guest commerce):

**Do not** fall back to pay-per-call browse (Path 2). **Do not** claim code execution is unavailable — use Base MCP `web_request` + `sign` when connected; sandbox + egress only when Base MCP missing.

1. **Wallet sign-in once** — user approves Base sign message; session lasts ~2 h (agent holds token in memory only).
2. Search → detail → create order (no per-search payment while signed in).
3. User confirms price → **one** Base Account payment approval.
4. Poll delivery → wallet sign-in again only if codes need an extra proof.

User hears: "Sign in with Base" then "Approve payment" — not micro-fees or path names.

Every gated response embeds **`next_step: { url, body }`** — use for widget primary CTAs (§9).

## 9. `show_widget` — generative UI

Inline shopping UI via host **`show_widget`** — not Artifacts, not HTML in prose. **Narrative in assistant message; visual in `widget_code` only.**

### Prerequisites — `read_me`

Once per session before first widget:

```json
{ "modules": ["interactive"] }
```

Every `show_widget` → **`i_have_seen_read_me`: true**.

### Parameters

| Parameter | Required | Notes |
| --- | --- | --- |
| `i_have_seen_read_me` | yes | `true` after `read_me` |
| `title` | yes | snake_case id (e.g. `bitrefill_search_results`) |
| `widget_code` | yes | HTML fragment — structure below |
| `loading_messages` | optional | 1–4 strings while streaming |

### `widget_code` structure

Order: **`<style>` → HTML → `<script>`**. No `<html>`, `<head>`, `<body>`.

External scripts: CDN allowlist only — `cdnjs.cloudflare.com`, `cdn.jsdelivr.net`, `unpkg.com`, `esm.sh`.

### When to call

| Flow stage | Widget title | Data source |
| --- | --- | --- |
| Search results | `bitrefill_search_results` | MCP `search-products` or x402 `products[]` |
| Product detail | `bitrefill_product_detail` | MCP `get-product-details` or x402 `packages[]` |
| Invoice summary | `bitrefill_invoice_created` | MCP `buy-products` or x402 create |
| Delivery / codes | `bitrefill_delivery_status` | MCP `get-invoice-by-id` or x402 `invoice/status` |

**One widget per turn** at shopping state change. Explanatory text outside widget.

### Primary CTA — `sendPrompt(...)`

Primary button → host **`sendPrompt(text)`**. Prompt must carry context for next MCP/x402 step (slug, `package_value`, `invoice_id`).

**x402 REST:** primary CTA follows response **`next_step`** — not generic label.

**Bitrefill MCP:** map verb patterns by flow stage:

| State | Primary CTA label | Agent action after `sendPrompt` |
| --- | --- | --- |
| Search results | "See details for [product name]" | `get-product-details` or x402 detail |
| Product detail | "Buy [amount] on [product name]" | `buy-products` or x402 create |
| Invoice created | "Confirm and pay [amount] USDC" | Base MCP x402 pay |
| Payment confirmed | "Check delivery status" | `get-invoice-by-id` or x402 status poll |

**Secondary CTA** = lateral escape only (new search, help, different product). Never forward in funnel.

### UI/UX rules (host + Bitrefill)

**Typography:** no `font-family` (inherit host). Body/interactive ≥ **16px**; 14px meta only (non-interactive). **`font-weight: 500`** labels/names/primary button; **`400`** else. **`font-variant-numeric: tabular-nums`** on prices. **`text-wrap: balance`** on headings.

**Selectable components (cards, toggles):** no CLS on select. Resting: `border: 2px solid transparent` + `outline: 0.5px solid var(--color-border-tertiary)` + `outline-offset: -1px`. Selected: `border-color: var(--color-border-info)` + `background: var(--color-background-info)`; remove outline. Toggles: **`aria-pressed`**. List options: **`aria-selected`**. Keyboard: **`Enter`** + **`Space`** with `event.preventDefault()` on keydown.

**Hit areas:** interactive elements **`min-height: 44px`**, flex-centered.

**Buttons:** exactly one primary + one secondary, full-width, left-aligned, leading Tabler outline icon (`font-size: 18px`). Primary: `font-weight: 500`, `border: 0.5px solid var(--color-border-secondary)`. Secondary: `font-weight: 400`, `color: var(--color-text-secondary)`, `border: 0.5px solid var(--color-border-tertiary)`. Both: `display: flex; align-items: center; gap: 10px`. Press: `transform: scale(0.97)` on `:active`. Below primary: one-line **14px** hint in `var(--color-text-tertiary)`.

**CTA logic — x402 `next_step`:**

| State | `next_step` target | Primary CTA label |
| --- | --- | --- |
| Search results | `products/detail` | "See details for [product name]" |
| Product detail | `invoice/create` | "Buy [amount] on [product name]" |
| Invoice created | `invoice/pay` | "Confirm and pay [amount] USDC" |
| Payment confirmed | `invoice/status` | "Check delivery status" |

**Microcopy:** user world ("Buy 10 EUR on Amazon.it" not "Create invoice"). Dynamic labels: changing part first. **Pre-select defaults** (smallest denomination) so primary CTA works on first paint. Warnings just above CTA.

**Accessibility:** dynamic CTA regions `aria-live="polite" aria-atomic="true"`. Card grids: `role="listbox"` + `role="option"`. Toggle groups: `role="group"` + `aria-label`. Start with visually hidden `<h2 class="sr-only">`. Never color-only — pair with `aria-selected` / `aria-pressed`.

**Color:** CSS variables only. No hardcoded hex except amber star **`#EF9F27`** + warning note borders.

**Constraints:** no shadows, gradients, blur, glow, or `transition: all`. Use `transition: background .15s, border-color .15s, color .15s`. Press scale **`0.97`** only.

## 10. Claude Chat safeguards

- Per-tool approval on; **never whitelist `buy-products`**.
- Confirm product, denomination, exact USDC total before pay.
- JWT / tokens in-memory only (~2 h); never log or paste in chat.
- Redemption codes: deliver privately; never shared project threads.
- **`show_widget` = presentation only** — payment still needs explicit MCP pay approval.

Full policy → [../safeguards.md](../safeguards.md).

## 11. What not to do

- Route Bitrefill shopping via **sandbox HTTP** when MCP connectors are live — egress probe may pass, still use MCP.
- Assume sandbox egress without probing — run §4 probe once per session when MCP absent.
- Use **`Authorization`** on Base MCP (stripped) — use `X-Access-Token` + `sign-in-with-x`.
- Base MCP `web_request` to `docs.bitrefill.com` (not allowlisted).
- Datacenter browse checkout (Cloudflare) — MCP/x402 only.
- Shopping UI in **Artifacts** or raw HTML when `show_widget` available.
- **Pay-per-call browse** when Base wallet sign-in works (the common Claude Chat mistake).
- Numbered steps, path names, or connector jargon in **any visible surface** — messages, thinking summaries, tool-call titles.
- More than **4 user-visible messages** per standard purchase; status chatter between user gates.
- English thinking/titles in a non-English session (or vice versa).

## 12. Troubleshooting

| Issue | Fix |
| --- | --- |
| Free tier — cannot add MCP | Upgrade Pro+ or send `bitrefill.com` link |
| OAuth loop | Allow pop-ups; retry; [../troubleshooting.md](../troubleshooting.md) |
| MCP tools not visible | Re-auth connector; check Pro+ |
| `show_widget` rejected | `read_me` with `interactive` first; `i_have_seen_read_me: true` |
| Sandbox egress but Bitrefill fails | Expected on default allowlist — use MCP connectors |
| Wrong "no code execution" claim | Claude Chat has sandbox exec; only egress is uncertain — probe §4 |
| `INVOICE_NOT_PAYABLE` on pay | Already settled — poll status |
| Widget CTA dead | `<script>` must call `sendPrompt(...)` after stream completes |

## Source of truth

- Bitrefill Claude Chat: <https://docs.bitrefill.com/docs/use-with-claude-chat>
- Anthropic code execution + network: <https://support.anthropic.com/en/articles/12111783-create-and-edit-files-with-claude>
- MCP: [../touchpoints/mcp.md](../touchpoints/mcp.md) | x402: [../touchpoints/x402.md](../touchpoints/x402.md) | Base MCP: [../wallets/base-mcp.md](../wallets/base-mcp.md)
- Routing: [decision-engine.md](decision-engine.md), [capability-matrix.md](capability-matrix.md)

**User hears:** "Cerco la carta regalo…" → "Sign in with your Base wallet once" → "[Product] — [amount]: [total] USDC. Confirm?" → "Approve the payment in your Base Account" → "Your code is ready."
