---
name: tailscale-setup
description: Walk a user or team admin through connecting Grok Bot to a Tailscale tailnet - a personal tailnet (one-click Connect, or a tag:grokbot device when the user's policy should limit it), or a team's company tailnets with each member's own device - granting only the MCP hosts it should reach, and adding tailnet MCP servers, including ones on internal DNS names, behind subnet routes or app connectors, on any port, or with a private CA. Use when the user asks to set up, troubleshoot, or disconnect Grok Bot's Tailscale connection.
---

# Tailscale setup for Grok Bot

Grok Bot reaches MCP servers on a tailnet in one of two ways. Find out which one fits before anything else.

| | Personal tailnet | Company tailnet |
|---|---|---|
| Who turns it on | The user | A Grok Bot team admin, once for the team |
| Device | The user's own Grok Bot device (one-click Connect), or one device tagged `tag:grokbot` | Each member's own Grok Bot device, owned by that member and carrying the `custom:grokbot` attribute on Premium or Enterprise plans |
| Policy | The user's own access, or grants to `tag:grokbot` when using the tag | The member's usual access, narrowed with a posture on `custom:grokbot` |
| Plugin row | **Personal tailnet** | **Company tailnet for \<team\>** |

If signing in on the personal row fails with a `tag:grokbot` error on a company tailnet, use the company tailnet.

## Personal tailnet

If the row offers **Connect**, click it, approve on Tailscale's screen, then confirm the Tailscale login the row shows. Only an owner or admin of that tailnet can connect it this way, and the device gets the user's own access. To limit Grok Bot with the user's own grants instead, use **Connect with tag:grokbot** and the steps below. If the row offers **Authenticate**, use the steps below.

1. In the Tailscale admin console, open **Access controls** and merge these keys into the policy file instead of replacing it:

   ```hujson
   {
     "tagOwners": {
       "tag:grokbot": ["autogroup:admin"],
     },
     "grants": [
       {
         "src": ["tag:grokbot"],
         "dst": ["mcp-server.tail1234.ts.net"],
         "ip":  ["tcp:443"],
       },
     ],
   }
   ```

   List the user who will sign in (or `autogroup:admin`) in `tagOwners`. In the grant, use the user's real host names, `100.x` addresses, subnet-route CIDRs or tags, and only the ports their MCP servers listen on. If the policy still has the default allow-all rule, `tag:grokbot` can reach every device; point that out and suggest narrowing it.
2. In Grok Bot, open the **Tailscale** plugin, click **Authenticate**, sign in to Tailscale and approve the device.
3. If device approval is on, approve the device on the **Machines** page. With Tailnet Lock, sign it from a signing node (`tailscale lock sign <node-key>`); it can't reach anything until it's signed.

## Company tailnet

The team admin does this once:

1. Add the Tailscale plugin to the team.
2. In Grok Bot, open the **Tailscale** plugin's **Company tailnet** card. On the new cursor.com dashboard, the same setting is the **Tailscale** card under **Integrations** that says "Let your team's Grok Bot reach MCP servers on your company's Tailscale network"; the Tailscale page that asks for an OAuth client and a tag is for Rollouts, not Grok Bot. Enter the tailnet's MagicDNS suffix (like `tail1234.ts.net`) or click **Sign in to Tailscale** to fill it in, check **Members' Grok Bot devices may join this tailnet**, and click **Enable**. If the team's members are spread across more than one tailnet (for example two companies in one team), list each tailnet; a member's device is kept on any listed tailnet.
3. Lock Grok Bot devices down in the policy file. A member's Grok Bot device belongs to that member, so without this it gets everything the member can reach. The `custom:grokbot` attribute needs Tailscale Premium or Enterprise; on other plans Grok Bot devices can't be told apart from the member's other devices. Default postures are OR'd, so add `custom:grokbot NOT SET` to each one (or add one default posture with just that condition if the policy has none), then grant MCP hosts with a posture that requires the attribute:

   ```hujson
   {
     "defaultSrcPosture": ["posture:Default"],
     "postures": {
       "posture:Default": ["custom:grokbot NOT SET"],
       "posture:GrokBot": ["custom:grokbot IS SET"],
     },
     "grants": [
       {
         "src":        ["group:engineering"],
         "srcPosture": ["posture:GrokBot"],
         "dst":        ["tag:mcp"],
         "ip":         ["tcp:443"],
       },
     ],
   }
   ```

   Use the groups that already reach each MCP host, so people get the same access from Grok Bot that they have today, and nobody has to request anything new.

Each member then opens the **Tailscale** plugin and clicks **Connect** on the row that names the team and tailnet. They sign in with the account that's in a company tailnet (if that account belongs to more than one tailnet, they pick it on Tailscale's screen), then click **Authorize application**. Their device joins the company tailnet as them. With device approval on, a tailnet admin approves the `grokbot-team-…` device on the **Machines** page; Tailscale doesn't notify them.

## Don't install Tailscale on the bot's computer

Grok Bot reaches tailnet MCP servers through this plugin. Don't install the Tailscale client on the bot's computer: it's wiped whenever the computer is replaced and keeps asking to log in again.

## Add MCP servers

Add each server in a chat ("add this MCP server: …") or in Settings. The URL host can be:

- a tailnet name (`*.ts.net`) or `100.x` address;
- an internal name the tailnet's DNS resolves (MagicDNS or split DNS);
- an address behind a subnet route or an app connector on the tailnet.

Any port in the URL works, and `http://` works for tailnet destinations. Grok Bot never uses exit nodes or default routes, so a host on the public internet doesn't go through the tailnet. Internal DNS names, subnet routes, app connectors, other ports and `http://` are still rolling out; if Grok Bot refuses one of them, it isn't on for the account yet.

If the server's certificate comes from a private CA, add the CA's PEM as `tls.caBundle`:

```json
{
  "internal-mcp": {
    "url": "https://mcp.corp.example.com/mcp",
    "tls": { "caBundle": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----" }
  }
}
```

The bundle has to be the real certificate text. A placeholder or a file path won't work.

## Who can use the tailnet

- **Personal tailnet:** only messages from the bot owner and linked teammates, and routines the owner schedules.
- **Company tailnet:** a member's device is used only in that member's own Grok Bot chats, Slack DMs and the routines they schedule. A member removed from the team is logged out.

## Disconnect

Click **Remove** on the Tailscale plugin page. A team admin can turn the company tailnet off with **Disable**. Grok Bot devices follow the tailnet's key expiry; when a key expires, reconnect, or disable key expiry on the device.

## Troubleshooting

- **Checking whether a host is reachable:** use the Tailscale plugin's Check host tool, not curl from the bot computer, which only uses the personal connection. Check host runs on the personal device; to test a company-tailnet host, add it as an MCP server.
- **Cannot reach a host:** on a personal tailnet, check that a grant from `tag:grokbot` covers that host and port. On a company tailnet, check that a grant with the Grok Bot posture covers the member and that host and port. In both cases, check that the device is approved (and signed, with Tailnet Lock).
- **Name doesn't resolve:** the tailnet's DNS has to resolve it. Check MagicDNS and the split DNS settings on the **DNS** page.
- **`destination_not_routed`:** the address isn't on a subnet route or app connector the device can use.
- **Certificate error:** the server uses a private CA. Add `tls.caBundle` with the CA's PEM.
- **"Your tailnet hasn't allowed Grok Bot's Tailscale app":** ask the tailnet's admin to allow it, then connect again.
- **Signed out because the device joined another tailnet:** the member's account landed in a tailnet the team doesn't list. Connect again with the account that's in a listed tailnet, or ask the team admin to add that tailnet.
- **"Only an owner or admin of this tailnet can connect it":** the user is a regular member of that tailnet. Ask its admin to set it up as the team's company tailnet, or connect a tailnet the user runs.
- **Sign-in can't apply the tag:** the signing-in user isn't an owner of `tag:grokbot` in `tagOwners`.
