# Runta

Cursor plugin that connects agents to [Runta](https://runta.com) through Runta's official remote [Model Context Protocol](https://modelcontextprotocol.io/) server.

Create and manage persistent Runta runtimes for AI agents: start, pause, resize, and delete them, run commands, publish ports over HTTPS, set egress policy, take and restore checkpoints, build runtime images, and manage VNC desktop and SSH access.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Runta**.
3. Click **Install**, then complete the Runta sign-in prompt.

Or run `/add-plugin runta` in chat.

## MCP

```json
{
  "mcpServers": {
    "runta": {
      "type": "http",
      "url": "https://mcp.runta.com/mcp"
    }
  }
}
```

Auth is OAuth with PKCE through Runta sign-in at `api.runta.com`, with the `runtime:read` and `runtime:manage` scopes. Runta identifies clients with Client ID Metadata Documents instead of dynamic client registration, so there is no client ID, secret, or API key to configure. When you connect, Runta's consent page opens in your browser: check that the client is Cursor, pick the organization, and approve. Tool calls run as you, with your organization role.

## What agents can do

| Area | Tools |
| --- | --- |
| Account | `whoami` |
| Runtimes | `list_runtimes`, `get_runtime`, `create_runtime`, `start_runtime`, `stop_runtime`, `pause_runtime`, `resume_runtime`, `resize_runtime`, `set_idle_policy`, `delete_runtime` |
| Commands | `run_command` |
| Published ports | `list_ports`, `publish_port`, `unpublish_port` |
| Egress | `get_egress`, `set_egress_policy`, `set_token_saving` |
| Checkpoints | `list_checkpoints`, `create_checkpoint`, `restore_checkpoint`, `delete_checkpoint` |
| Runtime images | `list_runtime_images`, `build_runtime_image`, `list_runtime_image_builds`, `cancel_runtime_image_build`, `delete_runtime_image` |
| VNC desktop | `get_vnc`, `enable_vnc`, `disable_vnc`, `list_vnc_credentials`, `create_vnc_credential`, `revoke_vnc_credential` |
| SSH access | `list_ssh_keys`, `list_runtime_ssh_keys`, `attach_ssh_key`, `detach_ssh_key` |

The hosted server is the source of truth for tool names and schemas. Runta publishes the tool reference at https://runta.com/docs/integrations/mcp/.

## Notes

- You need a Runta account in an organization. Sign up at https://dashboard.runta.com.
- The server can change and delete data: creating and deleting runtimes, running commands, and restoring checkpoints are all tool calls. Each tool says whether it reads, changes, or deletes, so Cursor can ask before running a change. Approve each one deliberately.
- Changing a runtime that another member owns needs the Owner or Admin role.
- Lifecycle tools return once Runta accepts the request. The agent then checks progress with `get_runtime`, `list_checkpoints`, or `list_runtime_image_builds`.
- `run_command` runs one non-interactive command and returns its output. For an interactive shell, use `runta exec` or SSH. The server can't copy files from your computer (use `runta cp`), and `build_runtime_image` can't `COPY` local files.
- Anyone with the URL of a published port can reach the service on it.
- The server does not manage secrets, billing, API keys, or organization members.

## Docs

- Runta MCP server: https://runta.com/docs/integrations/mcp/
- Runta docs: https://runta.com/docs/
- Server URL: https://mcp.runta.com/mcp

Logo is Runta's fox mark, the 256×256 favicon published on runta.com.

## License

MIT
