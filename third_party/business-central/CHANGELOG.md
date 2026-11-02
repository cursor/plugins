# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `business-central` plugin, the opt-in for the Microsoft Dynamics 365 Business Central MCP server that Cursor hosts and credentials.
- Carries no MCP server definition: the server is Cursor-side, so installing the plugin is the whole configuration.
- Auth is Cursor-managed OAuth against Microsoft (Entra ID). Work or school accounts only; a tenant admin may need to consent first.
- Logo: Business Central's official AppSource mark, from Microsoft's `microsoft/BCTech` repository.
