# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `servicenow` MCP server pointing at `https://${SERVICENOW_HOST}/sncapps/mcp-server/mcp/${SERVICENOW_MCP_SERVER}`, the Server URL from MCP Server Console.
- Declared `SERVICENOW_HOST`, `SERVICENOW_MCP_SERVER`, `CLIENT_ID`, and `CLIENT_SECRET` so each instance can point at its own server and OAuth inbound integration.
- Requests the `mcp_server` scope.
- Logo: 192×192 mark in ServiceNow green (`#81B5A1`).
