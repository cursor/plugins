# Changelog

All notable changes to this plugin will be documented here.

## 1.0.4

- The setup skill matches the current connection: one Tailscale row with a slot per tailnet, several tailnets at once, company tailnets enabled at cursor.com and limited with `custom:grokbot` postures, and personal tailnets via one-click Connect or `tag:grokbot`.
- Drops the single-tailnet flow and the "confirm it's my Tailscale login" step. Grok Bot asks Allow/Deny before removing a device, adding a tailnet, or changing the default.
- Covers `http://` servers, one live personal tailnet at a time, Slack Connect refusals, and troubleshooting for expired devices, the app-allow and plan sign-in errors, public DNS names that point at Tailscale addresses, shared-in devices, and internal certificates.
- The plugin description covers one-click Connect, `tag:grokbot`, and the company tailnet.

## 1.0.2

- The setup skill covers the company tailnet end to end: the admin's **Company tailnet** steps, locking member devices down with `custom:grokbot` postures, and granting MCP hosts to the groups that already reach them.
- The setup skill covers the beta's per-tailnet enablement by Tailscale, the admin card on cursor.com Integrations, device approval, and the wrong-tailnet sign-out for members in more than one tailnet.
- The setup skill covers internal DNS names, subnet routes, app connectors, any port, `http://` on tailnet destinations, and `tls.caBundle` for servers with a private CA, plus matching troubleshooting.

## 1.0.1

- Description and setup skill cover the team's company tailnet as well as the personal tailnet.
- The setup skill points reachability checks to Check host and explains the `tag:grokbot` refusal on company tailnets.

## 1.0.0 — initial release

- Added the `tailscale` plugin, the opt-in for Grok Bot's built-in Tailscale connection. Installing it and signing in to Tailscale joins Grok Bot to your tailnet as one device tagged `tag:grokbot`.
- Carries no MCP server definition: the connection is served by the Cursor backend, and the MCP servers you reach over the tailnet are added separately.
- Added the Tailscale setup skill: the `tag:grokbot` tag owner and grant in the tailnet policy file, sign-in and device approval, Tailnet Lock, and how to disconnect.
- Grok Bot only (`grokbot` / `sand` 0.49.0 or newer, `cursor: "never"`).
- Logo: Tailscale's official mark, from the Tailscale press kit.
