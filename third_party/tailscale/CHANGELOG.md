# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `tailscale` plugin, the opt-in for Grok Bot's built-in Tailscale connection. Installing it and signing in to Tailscale joins Grok Bot to your tailnet as one device tagged `tag:grokbot`.
- Carries no MCP server definition: the connection is served by the Cursor backend, and the MCP servers you reach over the tailnet are added separately.
- Added the Tailscale setup skill: the `tag:grokbot` tag owner and grant in the tailnet policy file, sign-in and device approval, Tailnet Lock, and how to disconnect.
- Grok Bot only (`grokbot` / `sand` 0.49.0 or newer, `cursor: "never"`).
- Logo: Tailscale's official mark, from the Tailscale press kit.
