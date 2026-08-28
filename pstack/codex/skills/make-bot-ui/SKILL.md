---
name: make-bot-ui
description: Build a small UI that sends actions through a local server to a user-provided supported HTTP, MCP-bridge, or workspace-agent endpoint.
---

# Make bot UI

Build a page the user clicks and a local server that forwards validated JSON to an endpoint the user already controls or explicitly provides.

Codex automations do not expose a generic incoming webhook. Do not invent a Codex automation URL, sender key, routine API, or webhook wake format. A heartbeat or cron automation is scheduled work, not an HTTP receiver.

## 1. Establish the target

Require the user to provide one supported target before implementation:

- an HTTP endpoint with its documented authentication and request schema;
- an MCP-capable bridge that explicitly accepts the requested action from this server; or
- a supported workspace-agent endpoint with documented ingress behavior.

If the target is missing or its contract is unclear, stop and ask for the endpoint documentation or schema. Do not guess from a product name. Do not substitute a Codex automation.

Confirm:

- URL or MCP/workspace-agent identifier;
- method or tool name;
- request fields and response contract;
- authentication mechanism;
- harmless probe payload;
- whether the endpoint may mutate external state.

Use MCP or app tooling only when it is actually available in the session. An arbitrary browser POST cannot directly invoke a connector unless the supplied bridge documents that behavior.

## 2. Protect credentials

Keep credentials on the server. Never place them in browser JavaScript, HTML, source control, chat, URLs, logs, or generated screenshots. Have the user provision secrets through the project's established secret manager or the server process environment; do not ask them to paste a secret into chat.

The browser calls only the local server. The local server validates an allowlisted action and builds the upstream request. Do not proxy arbitrary URLs, headers, bodies, or tool names from the browser.

## 3. Build the smallest adapter

Keep the field list small and typed. Reject unknown actions and malformed input. Configure:

- a short timeout;
- bounded request and response sizes;
- one attempt by default;
- no secret-bearing error output;
- explicit success and failure states in the UI.

Do not retry a mutating request unless the endpoint provides an idempotency contract and the user asked for retries. If failed actions need recovery, persist a redacted action record without credentials or sensitive payload fields.

## 4. Verify safely

Before declaring the UI live:

1. Test input validation locally.
2. Probe the supplied endpoint only with the agreed harmless payload.
3. Confirm the browser never receives the upstream credential.
4. Confirm logs and UI errors contain no secrets.
5. Verify one expected success and one expected rejection.

If the endpoint changes external state, the probe itself requires the user's authorization unless the documented harmless action is read-only.

## 5. Optional tailnet access

Expose the local server beyond localhost only when the user asks. Prefer an already-running tailnet or the project's existing private-network setup. Installing software, joining a tailnet, changing firewall rules, or running privileged commands requires explicit authorization.

When tailnet access is requested and already available, bind to the intended private interface or `0.0.0.0` only after checking the server's authentication and exposure boundary. Report the exact private URL and verified health result. Do not add public ingress or HTTPS termination unless requested.

## Hand-off

Report the local UI path, local/private URL, endpoint type, request schema, verification performed, and any unverified external-state behavior. Reiterate where the operator must provision the credential without printing its value.
