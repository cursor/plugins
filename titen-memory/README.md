# Titen Memory

Use a Titen MCP server as explicit, evidence-grounded memory in Cursor. The
plugin adds one bounded skill and the nine ordinary Titen tools. It does not
capture transcripts, install a model, or run lifecycle hooks.

## Configure

Set these environment variables before starting Cursor:

- `TITEN_MCP_URL`: the HTTPS URL of the Titen `/mcp` endpoint.
- `TITEN_API_KEY`: a scoped, revocable Titen key for this agent.

Use the narrowest scopes needed for project resolution, context compilation,
observations, claims, feedback, checkpoints, leases, and handoffs. Keep the key
out of repository files and chat.

Documentation: [titen.dev](https://titen.dev) ·
[source](https://github.com/RamaAditya49/titen)
