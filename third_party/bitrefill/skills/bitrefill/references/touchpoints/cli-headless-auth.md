# Headless CLI auth (agents)

> Internal mechanics — never voiced. Speak / think / title tools in plain shopping language: "sign in with your wallet", "approve the payment", "your code is ready"; never x402 / SIWX / JWT / path / endpoint.

Agent must **sign up / sign in** without human at keyboard — unlock `balance`, cashback, order history.

**Guest checkout needs no inbox** — `--email` on `buy-products` + pay crypto. Fastest first try → [cli.md](cli.md) § Guest checkout.

Use when graduating guest → signed-in with AgentMail or equivalent inbox.

Requires `@bitrefill/cli` ≥ 0.3.0. Agent-owned inbox via **AgentMail or equivalent** — programmatic receive (list messages, parse body).

## Why AgentMail or equivalent

Bitrefill `login` sends magic-link code to email. Agent needs inbox API/MCP to poll without human. [AgentMail](https://www.agentmail.to/) = reference below; equivalent = Gmail API, IMAP, Mailgun inbound, etc.

## One-time inbox setup (AgentMail example)

Human verifies provider once. Agent handles Bitrefill after.

```bash
npm install -g agentmail-cli

agentmail agent sign-up \
  --human-email you@example.com \
  --username bitrefill-agent
# → api_key, inbox_id (e.g. bitrefill-agent@agentmail.to)

export AGENTMAIL_API_KEY="am_..."   # from sign-up response

agentmail agent verify --otp-code 123456   # human reads OTP from you@example.com
```

Refs: [quickstart](https://docs.agentmail.to/quickstart.md), [agent onboarding](https://docs.agentmail.to/agent-onboarding.md).

Optional (AgentMail): [AgentMail MCP](https://docs.agentmail.to/agent-onboarding.md) (`npx -y agentmail-mcp`) with `AGENTMAIL_API_KEY` — `list_threads`, `get_thread`, `get_message`. Equivalent providers: their MCP/API.

## Bitrefill auth flow

Agent inbox address = Bitrefill email. Signup = login (same command).

```bash
npm install -g @bitrefill/cli

bitrefill init --openclaw    # optional

bitrefill login --email bitrefill-agent@agentmail.to
```

Poll inbox for verification email. AgentMail ([list command](https://docs.agentmail.to/messages)):

```bash
agentmail inboxes:messages list --inbox-id bitrefill-agent@agentmail.to
```

Parse `extracted_text` or `text` from latest message for numeric code:

```bash
bitrefill verify --code 123456
```

Bitrefill account has TOTP → add `--otp` ([1Password](#totp-via-1password) below).

Confirm:

```bash
bitrefill whoami --json
# → { "identity": "registered", "email": "bitrefill-agent@agentmail.to", ... }
```

Then catalog/purchase per [cli.md](cli.md).

## End-to-end script sketch

```bash
INBOX="bitrefill-agent@agentmail.to"

bitrefill login --email "$INBOX"
sleep 5   # allow delivery

CODE=$(agentmail inboxes:messages list --inbox-id "$INBOX" \
  | jq -r '.messages[0].extracted_text // .messages[0].text' \
  | grep -oE '[0-9]{6,8}' | head -1)

bitrefill verify --code "$CODE"
bitrefill whoami --json
```

Adjust regex/poll for environment. Codes expire (~12–20 min server-side); on expiry re-run `login`.

## TOTP via 1Password

Bitrefill account has authenticator → TOTP on verify.

Secret reference ([`op read`](https://www.1password.dev/cli/reference/commands/read)):

```bash
bitrefill verify --code "$CODE" \
  --otp "$(op read 'op://Vault/Bitrefill/one-time password?attribute=otp')"
```

Item flag ([`op item get --otp`](https://developer.1password.com/llms-cli.txt)):

```bash
bitrefill verify --code "$CODE" --otp "$(op item get Bitrefill --otp)"
```

Needs 1Password desktop integration or service account. → [Get started with 1Password CLI](https://www.1password.dev/cli/get-started).

## Safeguards

- Dedicated low-balance Bitrefill account on agent inbox — not human primary email.
- Agent inbox = auth surface; restrict readers.
- `bitrefill reset` + re-login after compromise.
- Never log magic-link codes or redemption codes to shared transcripts.

Spending policy → [../safeguards.md](../safeguards.md).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Access token is required for login/verify` | Any CLI command first (MCP connect mints token), or `reset` then retry |
| `No pending login` | Re-run `login --email` before `verify` |
| Code invalid / expired | Re-run `login --email`; poll inbox |
| `browser_url` in login response | Passkey/WebAuthn — human opens URL, retry |
| Inbox empty after login | Wait + re-list; check spam; confirm inbox address |

More CLI errors → [troubleshooting.md](../troubleshooting.md).

## Source of truth

- AgentMail: <https://docs.agentmail.to/quickstart.md>, <https://docs.agentmail.to/messages>
- Bitrefill CLI: <https://github.com/bitrefill/cli> (≥ 0.3.0)
- 1Password CLI: <https://www.1password.dev/cli/reference/commands/read>

**User hears:** "Let's connect your Bitrefill account" — never "magic-link", "AgentMail", or "verify --code"
