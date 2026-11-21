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
        "Authorization": "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}",
        "X-MCP-Features": "${GITHUB_MCP_FEATURES}"
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

### 3. Automations and background agents (optional)

When the client supports MCP Apps, GitHub's server answers `issue_write`, `create_pull_request` and `update_pull_request` with an interactive form and waits for someone to submit it. Automations and background agents have nobody to submit it, so the issue or PR is never created. Set **GitHub MCP feature flags** to `mcp_apps_disable_form_deferral` to make those tools run directly. The value is sent as the `X-MCP-Features` header (comma-separated); leave it empty to keep GitHub's defaults.

## Docs

- Use the GitHub MCP server: https://docs.github.com/en/copilot/how-tos/context/use-mcp/use-the-github-mcp-server
- Managing personal access tokens: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

Logo is GitHub's official Octocat mark, placed on a white tile with padding so it reads well in the Cursor UI.

## License

MIT
