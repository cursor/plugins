---
name: yolfi-payments
description: Add Yolfi crypto checkout, payment links, and webhook handling to an app through @yolfi/agent or the Yolfi MCP server.
---

# Yolfi Payments Skill

Use this when the user asks to add crypto payments, payment links, checkout, subscriptions, donations, or webhook-based entitlements with Yolfi.

## Workflow

1. Inspect the target app first.
2. Identify the framework, env system, server routes, existing checkout code, existing webhook handlers, and entitlement logic.
3. Check auth with `yolfi auth:status` or `yolfi_auth_status`; an explicit `YOLFI_API_KEY` takes precedence over the protected local credential.
4. If auth is missing and the user already has a Yolfi account, use `yolfi setup --agent <slug>` followed by browser authorization and `yolfi checkin --agent <slug>`. The bundled plugin and local MCP server expose `yolfi_agent_setup_start` and `yolfi_agent_checkin`; manually configured remote MCP uses OAuth managed by the host instead. For a new user on the bundled/local transport, first ask them to confirm their email and project name, then call `yolfi_agent_register`. Ask them to open the emailed confirmation link, then call the same tool again with the same arguments. Existing emails must not be re-registered. The tool stores the credential locally, redacts it from model output, and reuses its pending idempotency key across confirmation check-ins.
5. Ask the user for settlement wallet addresses. Never invent them.
6. Ask the user for product name, price, currency, payment type, and recurring interval.
7. Configure settlement settings through `PUT /api/private/organization/current`, then create each webhook through `POST /api/private/organization/webhook-endpoints`. The CLI/local MCP stores the one-time signing secret in the protected local Yolfi config and redacts it from output.
8. List existing paylinks before creating a new one.
9. Create or reuse a paylink.
10. Store paylink ids in env/config, not hard-coded source when avoidable.
11. Add checkout UI or a server route that calls `POST /api/public/payments`. Pass a stable merchant-side customer/user id as `clientReferenceId` whenever webhook-driven attribution or subscription lifecycle updates must resolve that customer.
12. Add webhook signature verification for `X-Yolfi-Signature`. In native (`NONE`) payloads read `data.customer.clientReferenceId`; Stripe-compatible Checkout Session uses `data.object.client_reference_id`, while Stripe-compatible Invoice and Subscription objects use `data.object.metadata.client_reference_id`; Lemon Squeezy-compatible payloads use `meta.custom_data.client_reference_id`.
13. Connect webhook events to the app's existing entitlement/business logic when possible.
14. Verify payment status with `GET /api/public/payments/:id`.
15. Report changed files and exact verification commands.

## Webhook Contract

- Publicly supported endpoint adapters are `NONE`, `STRIPE`, and `LEMON_SQUEEZY`. Treat `NONE` as native Yolfi payload format, not as the absence of a provider.
- Create independent endpoints through `POST /api/private/organization/webhook-endpoints`; the removed organization-level `webhookUrl` and `webhookAdapter` fields are not supported.
- Each endpoint has its own signing secret. CLI/MCP create and rotate store it in the protected local config; use the endpoint id for local verification or provision `YOLFI_WEBHOOK_SECRET` through the target deployment's secret manager.
- `YOLFI_API_KEY` authorizes Yolfi API calls and must never be used to verify webhook signatures. Verify `X-Yolfi-Signature` with that endpoint's signing secret only.
- Endpoint create/update accepts optional flat `metadataFilters` string maps (at most 10 entries; keys at most 100 characters; values at most 255 characters); a delivery must match every configured key/value.
- Browser setup and agent-first signup each issue a scoped `yolfi_agent_*` credential. Neither credential is a webhook signing secret.
- Analytics routing uses `website_id`. Provision an adapter `NONE` endpoint with `metadataFilters: { "website_id": "<websiteId>" }`.

## Do Not

- Do not invent wallet addresses.
- Do not invent prices, plans, currencies, or recurring intervals.
- Do not commit API keys or webhook secrets.
- Do not print or echo the `yolfi_agent_*` credential returned during check-in.
- Do not pass webhook signing secrets as MCP arguments or CLI flags.
- Do not replace existing billing logic unnecessarily.
- Do not use frontend redirect as proof of payment.
- Do not disable paylinks without explicit user approval.
- Do not duplicate webhook business handlers when an existing handler can be reused.
- Do not use email as the primary subscription identity when `clientReferenceId` can be supplied.
