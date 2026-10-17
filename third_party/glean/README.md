# Glean

Cursor plugin that connects agents to [Glean](https://www.glean.com) through Glean's hosted [remote MCP server](https://developers.glean.com/guides/mcp/), Glean's first-party [Model Context Protocol](https://modelcontextprotocol.io/) service.

Search your company's knowledge across every connected source, ask Glean Assistant questions, look up people, and read the documents you already have access to — all under the signed-in user's own Glean permissions.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Glean**.
3. Click **Install**, set your Glean instance (below), and complete the Glean sign-in prompt in your browser.

Or run `/add-plugin glean` in chat.

## MCP

```json
{
  "mcpServers": {
    "glean": {
      "type": "http",
      "url": "https://${GLEAN_INSTANCE}-be.glean.com/mcp/default"
    }
  }
}
```

## Setup

Glean hosts one remote MCP server per organization. The plugin needs to know which one is yours.

### 1. Find your Glean instance

Your instance is the subdomain of your Glean backend — the part before `-be.glean.com`. For example, if your organization's server is `https://acme-be.glean.com/mcp/default`, the instance is `acme`.

Any of these shows it:

- Glean's **MCP Configurator**: open **Settings → Third party apps and MCP** in Glean (or [app.glean.com/settings/install?mcpConfigure=true](https://app.glean.com/settings/install?mcpConfigure=true)) and copy the server URL it shows.
- A Glean admin can read it under **Server instance** at **Admin → About Glean**.

If the Configurator is not visible, a Glean admin needs to enable at least one MCP server for your organization (the default server is on for eligible tenants).

### 2. Configure the plugin

In **Dashboard → Plugins → Configure**, set **Glean instance**, then complete the Glean login in your browser when Cursor prompts. Glean's server supports OAuth with dynamic client registration, so no client ID or secret is needed.

On a team marketplace an admin sets the instance once. Each member still authenticates individually, so tools run with that member's own Glean permissions.

## What you get

Glean's default server exposes the organization's enabled Glean tools — enterprise search, Glean Assistant chat, people lookup, and document access. The exact set depends on which tools your Glean admin has enabled; see Glean's [MCP usage guide](https://help.glean.com/user-guide/mcp/usage).

## Differences from Glean's stdio plugin

Glean also publishes a plugin that runs a local server process on the user's machine. This listing talks to Glean's hosted server directly instead, which means:

- Your Glean instance is a one-time setup field rather than being looked up from your work email.
- Sign-in happens through Cursor's connector flow in your own browser, and Cursor manages token refresh.
- Reading local files into tool arguments (`file_args`) is not available; Cursor's connector permissions replace the local plugin's own approval prompts.

## Troubleshooting

| Symptom | Cause |
|:--------|:------|
| "Finish plugin setup" | **Glean instance** is not set. |
| Sign-in page 404s or the server is unreachable | The instance is wrong, or your organization has not enabled an MCP server. Check the URL in Glean's MCP Configurator. |
| Signed in, but no tools or empty results | Your Glean admin has not enabled those tools for the default server, or your Glean permissions do not include the content. |

## Docs

- Glean MCP guide: https://developers.glean.com/guides/mcp/
- Using Glean's MCP server: https://help.glean.com/user-guide/mcp/usage
- Admin setup: https://docs.glean.com/administration/platform/mcp/about

## License

MIT
