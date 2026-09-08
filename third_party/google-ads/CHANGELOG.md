# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `google-ads` MCP server running Google's official `google-ads-mcp` locally via `pipx run --spec git+https://github.com/googleads/google-ads-mcp.git`, the configuration Google documents for MCP clients.
- Configuration variables for the Google Ads API developer token, the Application Default Credentials file (authorized with the `https://www.googleapis.com/auth/adwords` scope), and the Google Cloud project ID. No client ID, secret, or token is bundled.
- Separate from the Gmail, Google Drive, and Google Calendar plugins: Google does not host a Google Ads MCP endpoint, and the Ads API needs its own developer token and OAuth scope rather than a Workspace sign-in.
- Logo: official Google Ads product icon on a padded white tile.
