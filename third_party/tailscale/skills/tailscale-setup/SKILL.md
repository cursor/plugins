---
name: tailscale-setup
description: Walk a user through connecting Grok Bot to their Tailscale tailnet - define tag:grokbot in the tailnet policy file, grant it only the MCP hosts and ports it should reach, sign in from the Tailscale plugin, approve the device, then add tailnet MCP servers. Use when the user asks to set up, troubleshoot, or disconnect Grok Bot's Tailscale connection.
---

# Tailscale setup for Grok Bot

Grok Bot joins the user's tailnet as one device tagged `tag:grokbot`. It can reach only the hosts and ports the tailnet policy file grants to that tag, so set up the policy before signing in.

## 1. Define the tag and grant access

In the Tailscale admin console, open **Access controls** and edit the policy file:

- Add `tag:grokbot` to `tagOwners`, listing the user who will sign in (or `autogroup:admin`).
- Add a grant from `tag:grokbot` to only the MCP hosts and ports Grok Bot should reach. Nothing else.

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

Merge these keys into the existing policy instead of replacing it. Use the user's real host names, `100.x` addresses, or tags in `dst`, and the ports their MCP servers listen on in `ip`. If the policy still has the default allow-all rule, `tag:grokbot` can reach every device; point that out and suggest narrowing it.

## 2. Connect Grok Bot

1. Open the **Tailscale** plugin in Grok Bot and click **Authenticate**.
2. Sign in to Tailscale and approve the new device.
3. If device approval is on for the tailnet, approve the device on the **Machines** page of the admin console.
4. If the tailnet uses Tailnet Lock, sign the device from a signing node (`tailscale lock sign <node-key>`). It cannot reach anything until it is signed.

## 3. Add MCP servers

Add each MCP server as usual, using its `*.ts.net` name or `100.x` address as the URL host. Requests to that host go over the tailnet.

## Who can use the tailnet

Only messages from the bot owner and linked teammates, and routines the owner schedules, can use the tailnet. Other people messaging the bot cannot.

## Disconnect

Click **Remove** on the Tailscale plugin page in Grok Bot.

## Troubleshooting

- **Cannot reach a host:** check that a grant from `tag:grokbot` covers that host and port, and that the device is approved (and signed, with Tailnet Lock).
- **Sign-in cannot apply the tag:** the signing-in user is not an owner of `tag:grokbot` in `tagOwners`.
