# Spending Safeguards

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

**Real-money transactions.** Instant fulfillment after payment. Digital codes non-refundable per EU consumer rights once delivered.

**Agent-policy layer** — not in upstream Bitrefill or host docs. Read fully before any purchase tool call.

## Universal rules

- **Default: confirm before purchase.** Product, denomination, price, payment method. Wait explicit approval. Autonomous only when user opts in this session.
- **Codes = cash-like.** Gift card / eSIM QR = bearer money. Store secure. Never share publicly.
- **In-memory preferred.** Don't write codes to plain-text logs, transcripts, unencrypted files. Read → use → discard.
- **User asks for code:** return it; advise store secure, don't share, redeem ASAP.
- **Dedicated low-balance account for autonomous buying.** Never high-balance access. Pre-fund only session spend cap.
- **Headless CLI: agent-owned inbox.** Register with agent inbox ([AgentMail](https://www.agentmail.to/) or equivalent — [touchpoints/cli-headless-auth.md](touchpoints/cli-headless-auth.md)), not human primary email. Inbox compromise = account takeover.
- **Not a wallet.** No private keys or crypto wallets. Never seed phrases, hardware-wallet PINs, signing keys.
- **Log every purchase.** `invoice_id`, product slug, amount, payment method, timestamp.
- **Refunds:** digital goods only if defective code. EU 14-day change-of-mind **does not** apply.
- **Browser redemption fallback:** anti-bot on brand site → user redeems manually; return code.

Terms: <https://www.bitrefill.com/terms/>.

## Per-host hardening

### OpenClaw

Defaults permissive (sandboxing off, `security: full`, `ask: off`). Tighten:

- **Guest CLI via `exec` first** for purchases; sign in only for `balance` cap or cashback. → [harnesses/openclaw.md](harnesses/openclaw.md).
- `channels.<ch>.allowFrom: ["<your_id>"]` + `dmPolicy: "pairing"` every channel.
- `~/.openclaw/exec-approvals.json`: `security: allowlist` + `ask: on-miss`. Allowlist read tools; force `/approve` for `bitrefill buy-products` + MCP `buy-products`.
- `agents.list[]` Bitrefill persona with `tools.deny: ["gateway"]`.
- Disable voice readback (`audio_as_voice` / TTS). Text-only — no `MEDIA:<url>` for codes.

Full → [harnesses/openclaw.md](harnesses/openclaw.md) §8.

### Cursor / Grok Bot

**Never** add `buy-products` to Cursor's MCP allowlist (`mcpAllowlist` in `.cursor/permissions.json`; CLI: `permissions.allow` in `.cursor/cli.json`) or buy in **Run Everything** mode (CLI: `--force`). In **Auto-review** (default), add a `buy-products` rule to `autoRun.block_instructions` in `.cursor/permissions.json`. Grok Bot: never **Always allow** `buy-products`; add an Auto-review **Ask first** rule for it.

### Codex CLI

```bash
codex --sandbox workspace-write --ask-for-approval on-request
```

`BITREFILL_API_KEY` in profile (`~/.codex/config.toml` `[profiles.bitrefill]`), not committed config.

### Claude Code

`~/.claude/settings.json` (or project `.claude/settings.json`):

```json
{
  "sandbox": {
    "filesystem": {
      "denyRead": ["~/.ssh", ".env", "*.pem", "**/.bitrefill_token"],
      "denyWrite": ["~/.ssh", ".env"]
    },
    "network": {
      "allow": ["api.bitrefill.com", "registry.npmjs.org"]
    }
  }
}
```

### Claude Desktop / Claude.ai web

Per-tool approval on default. Keep on. Don't whitelist `buy-products`.

**claude.ai:** MCP-first, `show_widget`, sandbox exec (egress probe) → [harnesses/claude-chat.md](harnesses/claude-chat.md).

### ChatGPT (web / Desktop / Atlas / Agent)

Developer Mode for write tools. Keep **off** unless actively purchasing. Confirm in-chat before every `buy-products`.

### Gemini CLI

`--sandbox` (Seatbelt / Docker / gVisor). Per-shell confirmation on default.

### OpenCode

```jsonc
{
  "agents": {
    "bitrefill": {
      "permissions": {
        "edit": "ask",
        "bash": { "*": "ask", "bitrefill list-*": "allow", "bitrefill get-*": "allow" },
        "webfetch": "ask"
      }
    }
  }
}
```

## Payment method risk

→ [wallets/payment.md](wallets/payment.md), [wallets/matrix.md](wallets/matrix.md).

- `balance` — instant, capped by pre-fund. **Lowest blast radius.**
- x402 (AgentCash, awal, Base MCP) — bound wallet balance + caps.
- `lightning` / payment links — higher human involvement.

Default: pre-fund `balance` on dedicated account → `payment_method: "balance"` + `auto_pay: true`.

## NEVER

- Redemption codes through group chats, public channels, screen-share, shared docs.
- Speak codes via TTS / voice notes.
- Store codes in version control.
- Give agent seed phrases or hardware-wallet PINs.
- Auto-approve `buy-products` in any host MCP config.
- Run autonomous purchasing from an account with stored payment cards or high balances.

## Source of truth

- ToS: <https://www.bitrefill.com/terms/> | Refunds: <https://docs.bitrefill.com/docs/refunds>
- Routing: [harnesses/decision-engine.md](harnesses/decision-engine.md)
- Touchpoints: [touchpoints/mcp.md](touchpoints/mcp.md), [touchpoints/cli.md](touchpoints/cli.md), [touchpoints/x402.md](touchpoints/x402.md)
- OpenClaw: [harnesses/openclaw.md](harnesses/openclaw.md) | Claude Chat: [harnesses/claude-chat.md](harnesses/claude-chat.md)

**User hears:** confirm as a clean receipt — "[Product] — [amount]: [total] USDC. Confirm?" Non-refundable once, neutrally at delivery: "Your code is ready — keep it safe, not refundable once issued."
