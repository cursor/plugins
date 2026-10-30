---
name: tailscale-setup
description: Connect Grok Bot to Tailscale on a company tailnet (a team admin enables it at cursor.com; each member authenticates their own device and an admin limits it with custom:grokbot postures) or a personal tailnet (one-click Connect when the member owns or administers the tailnet, otherwise a tag:grokbot device). Several tailnets can be connected at once. Use when the user asks to set up, troubleshoot, change the default tailnet, or disconnect Grok Bot's Tailscale connection.
---

# Tailscale setup for Grok Bot

Grok Bot desktop has one Tailscale row: **Connect apps → Your plugins → Tailscale**. The row has one slot per tailnet, labeled with the tailnet name first, then **Personal** or the team name, then the `.ts.net` address.

A member can connect several company tailnets at once, plus one personal tailnet at a time. They can add more personal tailnets, but only one is live; to switch, they make another one the default, which parks the current one. An address under a tailnet's `.ts.net` name goes to that tailnet. A short name or a `100.x` address goes to the member's default tailnet. They change the default by asking Grok Bot.

Grok Bot shows an Allow/Deny card before it removes a device, adds a tailnet, or changes the default. Wait for **Allow**.

Reach tailnet hosts only through this row. Never install, start or sign in to the Tailscale client (`tailscale`, `tailscaled`) on the bot's computer, and never ask the user to approve a device for it: that skips Grok Bot's tailnet safety checks and gives every bot on that computer the user's tailnet access. If there's no Tailscale row, tell the user Tailscale isn't available on their account yet.

Use one path per tailnet.

## Company tailnet

A team admin turns this on once, at cursor.com **Integrations → Tailscale**. In the **Enable Tailscale** dialog, enter the tailnet name or click **Sign in to Tailscale**, check **Members' Grok Bot devices may join this tailnet**, and click **Enable**. The tailnet needs Tailscale Premium or Enterprise.

Each member gets their own Grok Bot device, and that device carries the `custom:grokbot` attribute. Limit that device with postures. Without the posture, the device has the member's own access.

Merge the keys below into the existing policy file. If the policy already has default postures, add `"custom:grokbot NOT SET"` inside each of them and leave `defaultSrcPosture` as it is.

```hujson
{
  "postures": {
    "posture:grokbot": ["custom:grokbot == true"],
    "posture:human": ["custom:grokbot NOT SET"],
  },
  "defaultSrcPosture": ["posture:human"],
  "grants": [
    {
      "src": ["group:grokbot-mcp-users@example.com"],
      "srcPosture": ["posture:grokbot"],
      "dst": ["tag:mcp-servers"],
      "ip": ["tcp:443"],
    },
  ],
  "tests": [
    {
      "src": "user@example.com",
      "srcPostureAttrs": {"custom:grokbot": true},
      "accept": ["tag:mcp-servers:443"],
    },
  ],
}
```

Use the real group, and the tag or host names of the MCP servers, on the ports they listen on. The test's `src` has to be a member of that group.

The member opens that tailnet's slot and clicks **Authenticate**. If the tailnet requires device approval, an admin approves the `grokbot-` device on the **Machines** page.

## Personal tailnet

A personal sign-in to a tailnet the member's team lists as its company tailnet is refused. Use the company slot for that tailnet.

If the member owns or administers the tailnet and one-click Connect is available, **Authenticate** goes through Tailscale's consent screen and the device works right away. It is untagged and has the owner's access. To grant only specific MCP servers, use the tag path instead.

Otherwise define `tag:grokbot` and grant it only the MCP servers, then sign in with the tag. Merge into the policy file:

```hujson
{
  "tagOwners": {
    "tag:grokbot": ["autogroup:admin"],
  },
  "grants": [
    {
      "src": ["tag:grokbot"],
      "dst": ["mcp-server.tail1234.ts.net"],
      "ip": ["tcp:443"],
    },
  ],
}
```

`tagOwners` has to include the user who will sign in, or `autogroup:admin`. Use the real host names and ports. If the policy still has the default allow-all rule, `tag:grokbot` can reach every device; say so and narrow the grant.

## Who can use it

On a personal tailnet, only the bot owner's messages, linked teammates, and routines the owner schedules. On a company tailnet, only that member's own Grok Bot chats, Slack DMs, and routines they schedule. Slack Connect channels never use a tailnet. Removing the member from the team logs the device out.

## Add MCP servers

Add a server by its `http://` or `https://` address on the tailnet, or add it when the user asks. Use the full `name.tailnet.ts.net` host when it should use that tailnet. A short name or a `100.x` address uses the default tailnet. Split-DNS names and subnet-route addresses use HTTPS on port 443.

## Troubleshooting

- **Wrong account or tailnet:** **Sign in again**.
- **Expired link or expired device:** **Authenticate** again. Company devices follow the tailnet's key expiry.
- **"Your tailnet hasn't allowed Grok Bot's Tailscale app":** a tailnet admin allows the app, then the member connects again.
- **"Tailscale refused the sign-in key for your company tailnet":** company sign-in needs a plan with custom node attributes (Tailscale Premium or Enterprise). Move the tailnet to one of those plans, then **Authenticate** again.
- **Can't reach a server:** check the full `.ts.net` name against the default tailnet, the policy grant for that host and port, split DNS and subnet routes (ask the user's Cursor contact to enable those), and the certificate. A public DNS name that points at a Tailscale address isn't followed; use the MagicDNS name or split DNS.
- **Device shared in from another tailnet:** it can't be reached by name; use its `100.x` address with the receiving tailnet as the default.
- **Server with an internal certificate:** a team admin adds the CA in **Integrations → Tailscale** (ask the user's Cursor contact to enable it).
