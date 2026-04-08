---
name: appwrite
description: Use when the user works with Appwrite (Auth, Databases, Functions, Storage, teams) and needs accurate API operations or setup guidance inside Cursor.
---

# Appwrite

- Ensure `.mcp.json` uses real `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, and the correct `APPWRITE_ENDPOINT` (self-hosted installs use their own URL).
- Prefer enabling only the Appwrite MCP tool groups you need (`uvx mcp-server-appwrite --help`) to preserve model context.
- Follow least-privilege API keys; never commit secrets—configure them in Cursor MCP settings or environment.
