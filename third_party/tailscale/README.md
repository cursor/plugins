# Tailscale

Grok Bot plugin that lets agents reach [Model Context Protocol](https://modelcontextprotocol.io/) servers on your private [Tailscale](https://tailscale.com) network (tailnet).

Let Grok Bot reach MCP servers on your private Tailscale network: connect your own tailnet, or your team's company tailnets turned on by a team admin, with each member using their own device.

## Who can use it

- Grok Bot **0.49** or newer.
- A company tailnet needs a team admin and Tailscale Premium or Enterprise. A personal tailnet needs the member to own or administer it, or to be able to add `tag:grokbot` to the policy.
- Not available in Cursor. Cursor must not list or install this plugin.

## MCP

This plugin ships no `mcp.json`. Grok Bot's Tailscale connection is served by the Cursor backend, and installing the plugin is the opt-in that turns it on. MCP servers on the tailnet are added separately, by their `http://` or `https://` address.

## Setup

Grok Bot desktop has one **Tailscale** row (**Connect apps → Your plugins**) with one slot per tailnet. A member can connect several. The `tailscale-setup` skill walks through both paths, including the policy snippets.

- **Company tailnet.** A team admin enables it at cursor.com **Integrations → Tailscale** (Tailscale Premium or Enterprise) and limits each member's device with a `custom:grokbot` posture, not a tag. The member clicks **Authenticate** on that tailnet's slot.
- **Personal tailnet.** When the member owns or administers the tailnet and one-click Connect is available, **Authenticate** opens Tailscale's consent screen and the device joins untagged, with the owner's access. Otherwise define `tag:grokbot`, grant it only the MCP servers, and sign in with the tag.

## Notes

- An address under a tailnet's `.ts.net` name uses that tailnet. Short names and `100.x` addresses use the member's default tailnet.
- On a personal tailnet, only the bot owner, linked teammates, and routines the owner schedules can use it. On a company tailnet, only that member's own chats and routines.
- Grok Bot asks before it removes a device, adds a tailnet, or changes the default. Members change the default by asking Grok Bot.
- To disconnect, click **Remove** on the Tailscale plugin page in Grok Bot.

## Docs

- Tailscale grants: https://tailscale.com/docs/features/access-control/grants
- Tags: https://tailscale.com/docs/features/tags
- Device approval: https://tailscale.com/docs/features/access-control/device-management/device-approval
- Tailnet Lock: https://tailscale.com/docs/features/tailnet-lock

Logo is Tailscale's official mark, from the Tailscale press kit.

## License

MIT
