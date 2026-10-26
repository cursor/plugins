# FTW Cloud ↔ AI assistant connection

Evidence:
- FTW Cloud implementation: https://github.com/srcfl/ftw-cloud (MCP Streamable HTTP, `/mcp`)
- FTW box agent access UI: https://github.com/srcfl/ftw/blob/master/web/settings/tabs/access.js
- FTW source reference: https://github.com/srcfl/ftw/blob/master/docs/agents.md (design rationale; verify currently shipped behavior against live tools)

The **FTW website** is https://ftw.sourceful.energy/. The base **MCP resource** for external assistants is https://cloud.ftw.energy/mcp. Use the public profile configured by this plugin; do not redirect the user to a private profile. These are not interchangeable. An FTW box may run completely locally without connecting any AI assistant.

## New connection

1. Owner installs a current FTW Core. For guided setup, they use the new box's local Start assistant setup flow. For ordinary readings and control, they first commission the home and verify its site meter.
2. Owner enables the relevant FTW Cloud functionality from the supported FTW local interface. Explain the privacy choice accurately: agent sessions through FTW Cloud can make permitted energy data readable to FTW Cloud; do not describe FTW Cloud as always blind or end-to-end private from Sourceful for agent use.
3. Install the FTW plugin in the AI assistant you use, or add the FTW MCP server by URL. The external MCP server supports OAuth 2.1 with PKCE, authorization metadata and dynamic client registration. Let the assistant open the server's actual authorization flow; do not ask for tokens or invent OAuth client IDs, redirects or secret values.
4. During OAuth, FTW Cloud presents the requester, requested scopes and a short approval code or invitation flow. The homeowner, from the official box local **Settings → Access** page or supported owner app, compares the request and authorizes only desired scopes/operations and caps. Codes expire and are single use; do not copy or send a code to the assistant.
5. If grant approval uses the box-local access page, its source documents a signed-in owner on another LAN device with the house password as a safety gate. Do not bypass it or promise the one-time code works without the box conditions.
6. After the OAuth connection reports success, call `homes_list` to confirm correct accessible home, exact scopes, operations, caps and expiration. Then `status` or `health_get` for a read-only connectivity test. Owner may revoke access in FTW.

## Least privilege

Start with read-only scopes adequate for requested tasks: live, plan, history and health. Logs and redacted settings can include sensitive data; request their scopes only for troubleshooting. This public connection offers typed setup tools and bounded, redacted measurement diagnostics. `setup_begin` requests `ftw.setup.write` together with `ftw.diag.run`; the owner must approve them separately from default reads. Other FTW clients with the diagnostic scope can read diagnostic backups that may contain device credentials. This public profile exposes no arbitrary API reader or backup export. Do not seek the diagnostic grant merely to avoid an unavailable tool. Immediate EV charging uses bounded `ftw.dispatch.hold` and an explicit approved operation; durable goals use `ftw.goals.request` and must be confirmed by the owner. Tool visibility does not imply an authorized grant.

**Failure behavior:** if the home has not yet been created, Cloud is off, login/approval failed, scopes are missing or data is stale, tell the homeowner precisely what step is incomplete. Do not invent a connection state or try to elevate scopes through another API.
