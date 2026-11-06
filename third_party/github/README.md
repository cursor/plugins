# GitHub

Cursor plugin that connects agents to [GitHub](https://github.com) through GitHub's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Work with repositories, issues, pull requests, code search, and Actions under the permissions of a personal access token you provide.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **GitHub**.
3. Click **Install**, then set your GitHub personal access token (below).

Or run `/add-plugin github` in chat.

## MCP

```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

## Setup

GitHub's remote MCP server authenticates with a **personal access token (PAT)**. Create one, then paste it into the plugin config.

### 1. Create a personal access token

1. Open https://github.com/settings/tokens.
2. Create either a **fine-grained** token or a **classic** token.
3. Grant only the scopes the agent needs. Typical choices:
   - **Repositories / contents** — read or write code and files
   - **Issues** — list, create, and update issues
   - **Pull requests** — list, review, and manage PRs
   - **Actions** — inspect workflow runs (if you want CI access)
   - **Metadata** — always required on fine-grained tokens
4. Set an expiration you are comfortable with, then generate and copy the token.

Prefer a fine-grained token scoped to specific repositories when that is enough. Classic tokens with `repo` are broader and should be treated carefully.

### 2. Configure the plugin

In **Dashboard → Plugins → Configure**, set **GitHub personal access token** to the value you just created.

Tool calls run with that token's permissions. Rotate or revoke the token from GitHub Settings if it is ever exposed.


## Troubleshooting empty Bearer / streaming 400

If the host starts the MCP with an empty or unsubstituted token, GitHub returns:

```text
bad request: Authorization header is badly formatted
```

and clients may fall back to SSE / a streaming error. That usually means:

1. `GITHUB_PERSONAL_ACCESS_TOKEN` was never written into **this plugin's setup field** (Dashboard → Plugins → Configure), or
2. A messaging-channel / chat secret was set instead of the plugin variable (those stores are not the same), or
3. The host tried OAuth / Authenticate against `api.githubcopilot.com`, which does not support dynamic client registration for this PAT-header plugin (see cursor/plugins#251).

`plugin.json` now requires a non-empty PAT (`minLength: 1`) so an empty value is not treated as configured. Hosts should still avoid sending `Authorization: Bearer ` until the variable is set, and should route Authenticate to the PAT field rather than OAuth for this plugin.

## Docs

- Use the GitHub MCP server: https://docs.github.com/en/copilot/how-tos/context/use-mcp/use-the-github-mcp-server
- Managing personal access tokens: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

Logo is GitHub's official Octocat mark, placed on a white tile with padding so it reads well in the Cursor UI.

## License

MIT
