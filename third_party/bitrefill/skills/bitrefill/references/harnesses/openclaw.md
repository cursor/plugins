# Host: OpenClaw

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

[OpenClaw](https://docs.openclaw.ai/) — self-hosted Gateway bridging chat apps (Telegram, WhatsApp, Slack, Discord, iMessage, Signal, Matrix, Teams, …) to coding agents like **Pi**. **Superset host:** full shell, agentskills.io skill loader, MCP, mobile-node camera/canvas, cron, multi-channel routing.

Install + harden Bitrefill skill here; path files for workflow.

**Priority:** **guest CLI via `exec`** (no auth, fastest) → signed-in CLI (`login`/`verify`, `balance`, cashback) → MCP → API → Browse. Shell + MCP — prefer guest CLI unless typed MCP tools needed or signed-in for `balance`.

## 1. Detect OpenClaw

Any of:

- `~/.openclaw/openclaw.json` exists
- `~/.openclaw/skills/` exists
- `command -v openclaw` succeeds
- Tools: `gateway`, `cron`, `nodes`, `canvas`, `sessions_*` (OpenClaw-only)

Yes → continue. Else → [SKILL.md](../../SKILL.md) + [decision-engine.md](decision-engine.md).

## 2. Install skill

Loader precedence: `skills.load.extraDirs` → bundled → `~/.openclaw/skills/` → `~/.agents/skills/` → `<workspace>/.agents/skills/` → `<workspace>/skills/`.

Manual:

```bash
cp -r path/to/bitrefill ~/.openclaw/skills/bitrefill
openclaw skills list   # verify
openclaw gateway restart   # or /new in chat
```

ClawHub (if published):

```bash
openclaw skills install bitrefill
openclaw skills update --all
```

**agentskills.io-compatible** — no rewrite. Source: <https://docs.openclaw.ai/tools/skills.md>.

## 3. Install Bitrefill CLI (preferred — guest checkout)

Pi has `exec` on Gateway host (sandboxing **off** default). **Start here:** no login, no MCP — search, buy, pay crypto or payment link.

```bash
exec: npm install -g @bitrefill/cli
exec: bitrefill search-products --query "Netflix" --country US
exec: bitrefill buy-products \
  --cart_items '[{"product_id":"steam-usa","package_id":10}]' \
  --payment_method lightning \
  --return_payment_link true \
  --email "user@example.com"
```

Guest flow → [../touchpoints/cli.md](../touchpoints/cli.md) § Guest checkout. Optional: `bitrefill init --openclaw` (skill + MCP stub — not required for guest).

**Upgrade signed-in** when human wants store-credit cap (`balance`), cashback, order history:

```bash
exec: bitrefill login --email you@example.com
exec: bitrefill verify --code <email-code> [--otp <totp>]
```

Headless inbox → [../touchpoints/cli-headless-auth.md](../touchpoints/cli-headless-auth.md).

Docker sandbox: `setupCommand: "npm install -g @bitrefill/cli"`, `network` not `none`. Source: <https://docs.openclaw.ai/gateway/sandboxing.md>.

## 4. Install Bitrefill MCP (optional)

When: typed MCP tool calls without shell, or MCP-native integrations. **Not required for guest** — guest CLI faster (zero config).

```bash
openclaw mcp set bitrefill --url "https://api.bitrefill.com/mcp"
```

Or edit `~/.openclaw/openclaw.json`:

```json
{
  "mcp": {
    "servers": {
      "bitrefill": {
        "url": "https://api.bitrefill.com/mcp"
      }
    }
  }
}
```

Developer API key (optional): [../touchpoints/mcp.md](../touchpoints/mcp.md). Guest MCP may still need OAuth; **guest CLI avoids this.**

Transport: SSE/HTTP or `transport: "streamable-http"`. Restrict per-agent via `agents.list[].tools.allow`/`deny`. Source: <https://docs.openclaw.ai/cli/mcp.md>.

Then → [../touchpoints/mcp.md](../touchpoints/mcp.md).

## 5. Raw API path

`exec` + `curl`, or `web_fetch`. No special config. → [../touchpoints/api.md](../touchpoints/api.md).

## 6. Browser

Pi `browser` tool uses **Gateway host IP** — residential on user machine; VPS → Cloudflare 403. Playwright/Chrome MCP for DOM. Mac menubar app = user's Chrome, fully residential. → [../touchpoints/browse.md](../touchpoints/browse.md).

## 7. OpenClaw-only scenarios

Differentiators — no other host can do these.

### Buy gift card from Telegram (away from desk)

User DMs: "buy $50 Steam US". Pi runs guest CLI via `exec` (or signed-in + `balance`), confirms in chat, returns payment link or code after poll.

**Risk:** codes = cash. Never deliver to groups or `MEDIA:` URLs. Lock channel:

```jsonc
{
  "channels": {
    "telegram": {
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "pairing",
      "allowFrom": ["123456789"],
      "groups": { "*": { "requireMention": true } }
    }
  }
}
```

Source: <https://docs.openclaw.ai/channels/telegram>.

### Auto-renew mobile top-up monthly

`cron` + `exec: bitrefill buy-products ...` for fixed SKU. Guest: crypto + poll. Signed-in: `--payment_method balance` for instant pay.

### Multi-channel handoff

Trigger from Slack, deliver code to private Signal DM. Same Gateway, isolated session per channel/sender.

### Mobile camera context

Paired iOS/Android node: `camera.snap`, `canvas.*`. User photos request ("100 EUR Decathlon France"), Pi OCRs, runs `exec: bitrefill search-products` + `buy-products`. Source: <https://docs.openclaw.ai/nodes/index.md>.

### Heartbeat invoice polling

Default 30-min heartbeat or custom `cron` runs `exec: bitrefill get-invoice-by-id` until `status: complete`, pushes code to originating channel.

## 8. OpenClaw safeguards

Defaults permissive: sandboxing off, `security: full`, `ask: off`. **Tighten before agent buys.**

- **Restrict triggers:** `channels.<ch>.allowFrom: ["<your_id>"]` + `dmPolicy: "pairing"`. All channels.
- **Approval for buys:** `~/.openclaw/exec-approvals.json` — `security: allowlist` + `ask: on-miss`. Allowlist read CLI (`search-products`, `get-product-details`, `get-invoice-by-id`); force `/approve` for `buy-products` + MCP `buy-products`.
- **Isolate Bitrefill agent:** `agents.list[]` persona with `tools.deny: ["gateway"]` — can't rewrite Gateway config. Source: <https://docs.openclaw.ai/tools/exec-approvals.md>.
- **Guest first, balance when ready:** guest CLI + payment link = lowest friction; `login`/`verify` when human pre-funds for capped `balance`. **Never** give agent crypto seeds. Skill not a wallet.
- **No voice readback:** disable `audio_as_voice` / TTS for Bitrefill agent.
- **No `MEDIA:<url>` for codes:** text-only delivery.

## Source of truth

- OpenClaw: <https://docs.openclaw.ai/>
- Skills: <https://docs.openclaw.ai/tools/skills.md> | Creating: <https://docs.openclaw.ai/tools/creating-skills.md>
- MCP CLI: <https://docs.openclaw.ai/cli/mcp.md> | Exec: <https://docs.openclaw.ai/tools/exec.md>
- Sandboxing: <https://docs.openclaw.ai/gateway/sandboxing.md> | Exec approvals: <https://docs.openclaw.ai/tools/exec-approvals.md>
- Nodes: <https://docs.openclaw.ai/nodes/index.md> | Channels: <https://docs.openclaw.ai/channels/telegram>
- Bitrefill paths: [../touchpoints/mcp.md](../touchpoints/mcp.md), [../touchpoints/cli.md](../touchpoints/cli.md), [../touchpoints/api.md](../touchpoints/api.md), [../touchpoints/browse.md](../touchpoints/browse.md), [../safeguards.md](../safeguards.md)

**User hears:** same concierge flow — "Searching for [product]…" → "[Product] — [amount]: [total]. Confirm?" → "Your code is ready." Match channel language (Telegram, WhatsApp, etc.).
