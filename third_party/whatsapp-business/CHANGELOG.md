# Changelog

All notable changes to this plugin will be documented here.

## 1.0.0 — initial release

- Added the `whatsapp-business` plugin, the opt-in for the WhatsApp Business MCP server that Cursor hosts.
- Carries no MCP server definition: the server is Cursor-side, so installing the plugin is the whole configuration.
- Each member enters their own `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_BUSINESS_PHONE_NUMBER_ID`, and `WHATSAPP_BUSINESS_ACCESS_TOKEN`. These are per-member values, not team settings.
- The access token is a Meta system user token with the `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
- Logo: WhatsApp's official mark, from `whatsapp.com`.
