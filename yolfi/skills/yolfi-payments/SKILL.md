---
name: yolfi-payments
description: Add Yolfi crypto checkout, payment links, and webhook handling to an app through the hosted Yolfi MCP server.
---

# Yolfi Payments Skill

Use this when the user asks to add crypto payments, payment links, checkout, subscriptions, donations, or webhook-based entitlements with Yolfi.

## Workflow

1. Inspect the target app first.
2. Identify the framework, env system, server routes, existing checkout code, existing webhook handlers, and entitlement logic.
3. This marketplace plugin uses the hosted MCP transport. Complete Cursor's host-managed OAuth flow, then call `yolfi_auth_status`. Do not run local CLI setup, check-in, or signup commands; they are not part of this plugin transport.
4. Call `yolfi_organization_get`, `yolfi_webhooks_list`, and `yolfi_paylinks_list` before proposing mutations.
5. Ask the user for the exact settlement account ids, wallet addresses, and enabled token ids. Never invent them. Configure only approved values with `yolfi_settlement_configure`.
6. Ask the user for product name, price, currency, payment type, and recurring interval.
7. Before creating a webhook, ask for its publicly reachable HTTPS callback URL and choose the adapter that matches the app's existing handler: `NONE`, `STRIPE`, or `LEMON_SQUEEZY`. Never guess the URL or adapter. Match both against the `yolfi_webhooks_list` result: reuse or update a matching endpoint with `yolfi_webhooks_update`, and call `yolfi_webhooks_configure` only when no matching endpoint exists.
8. Treat a signing secret returned by webhook creation or rotation as one-time secret material. Never repeat it in chat, commit it, or put it in ordinary source/config. Store it only through a user-approved deployment secret mechanism; if none is available, stop and ask the user to store it.
9. Reuse a matching result from `yolfi_paylinks_list`; otherwise create an approved paylink with `yolfi_paylinks_create`.
10. Store paylink ids in env/config, not hard-coded source when avoidable.
11. Add checkout UI or a server route that calls `POST /api/public/payments`. Pass a stable merchant-side customer/user id as `clientReferenceId` whenever webhook-driven attribution or subscription lifecycle updates must resolve that customer.
12. Add webhook signature verification for `X-Yolfi-Signature`. In native (`NONE`) payloads read `data.customer.clientReferenceId`; Stripe-compatible Checkout Session uses `data.object.client_reference_id`, while Stripe-compatible Invoice and Subscription objects use `data.object.metadata.client_reference_id`; Lemon Squeezy-compatible payloads use `meta.custom_data.client_reference_id`.
13. Connect webhook events to the app's existing entitlement/business logic when possible.
14. Verify payment status with `yolfi_payments_status`; a frontend redirect is not proof of payment.
15. Report changed files and exact verification commands.

## Webhook Contract

- Publicly supported endpoint adapters are `NONE`, `STRIPE`, and `LEMON_SQUEEZY`. Treat `NONE` as native Yolfi payload format, not as the absence of a provider.
- Create and manage independent endpoints with `yolfi_webhooks_configure`, `yolfi_webhooks_update`, `yolfi_webhooks_rotate_secret`, and `yolfi_webhooks_delete`; the removed organization-level `webhookUrl` and `webhookAdapter` fields are not supported.
- Each endpoint has its own signing secret. The hosted MCP returns it once on create or rotation, so provision it through the target deployment's secret manager immediately and never expose it in normal output.
- `YOLFI_API_KEY` authorizes Yolfi API calls and must never be used to verify webhook signatures. Verify `X-Yolfi-Signature` with that endpoint's signing secret only.
- Endpoint create/update accepts optional flat `metadataFilters` string maps (at most 10 entries; keys at most 100 characters; values at most 255 characters); a delivery must match every configured key/value.
- Cursor owns OAuth for this hosted MCP connection. Local `yolfi_agent_*` setup, check-in, and signup flows are not exposed by this plugin transport.
- Analytics routing uses `website_id`. Provision an adapter `NONE` endpoint with `metadataFilters: { "website_id": "<websiteId>" }`.

## Do Not

- Do not invent wallet addresses.
- Do not invent webhook callback URLs or adapters.
- Do not invent prices, plans, currencies, or recurring intervals.
- Do not commit API keys or webhook secrets.
- Do not call local setup, check-in, or signup tools from this hosted plugin.
- Do not pass webhook signing secrets as MCP arguments or ordinary CLI flags.
- Do not bypass available MCP tools with private REST endpoints.
- Do not replace existing billing logic unnecessarily.
- Do not use frontend redirect as proof of payment.
- Do not disable paylinks without explicit user approval.
- Do not duplicate webhook business handlers when an existing handler can be reused.
- Do not use email as the primary subscription identity when `clientReferenceId` can be supplied.
