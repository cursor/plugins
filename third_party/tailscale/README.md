# Tailscale

Grok Bot plugin that lets agents reach [Model Context Protocol](https://modelcontextprotocol.io/) servers on your private [Tailscale](https://tailscale.com) network (tailnet).

Let Grok Bot reach MCP servers on your private Tailscale network. Sign in to Tailscale to connect your tailnet; Grok Bot joins it as one tagged device and only reaches the hosts you grant to tag:grokbot.

## Who can use it

- Grok Bot **0.49** or newer.
- A Tailscale account with permission to edit the tailnet policy file.
- Not available in Cursor. Cursor must not list or install this plugin.

## MCP

This plugin ships no `mcp.json`. Grok Bot's Tailscale connection is served by the Cursor backend, and installing the plugin is the opt-in that turns it on. The MCP servers you want to reach on the tailnet are added separately, by their `*.ts.net` name or `100.x` address.

## Setup

1. In the tailnet policy file, define `tag:grokbot` and grant it access to only the MCP hosts and ports Grok Bot should reach.
2. Open **Tailscale** in Grok Bot's plugins, click **Authenticate**, and sign in to Tailscale.
3. Approve the new device in the Tailscale admin console if device approval is on. On a tailnet with Tailnet Lock, sign the device too.

The `tailscale-setup` skill walks through each step, including a policy snippet.

## Notes

- Only messages from the bot owner and linked teammates, and routines the owner schedules, can use the tailnet.
- Grok Bot reaches nothing beyond what your grants allow `tag:grokbot` to reach.
- To disconnect, click **Remove** on the Tailscale plugin page in Grok Bot.

## Docs

- Tailscale grants: https://tailscale.com/docs/features/access-control/grants
- Tags: https://tailscale.com/docs/features/tags
- Device approval: https://tailscale.com/docs/features/access-control/device-management/device-approval
- Tailnet Lock: https://tailscale.com/docs/features/tailnet-lock

Logo is Tailscale's official mark, from the Tailscale press kit.

## License

MIT
