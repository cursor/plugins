# WhatsApp Business

Cursor plugin that connects agents to [WhatsApp Business](https://business.whatsapp.com) — Meta's messaging platform for businesses — through a [Model Context Protocol](https://modelcontextprotocol.io/) server that Cursor hosts.

Work with a WhatsApp Business Account: send messages from your business phone number, manage message templates, and look up contacts and phone numbers.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **WhatsApp Business** and click **Install**.
3. Enter your WhatsApp Business Account ID, phone number ID, and access token (see [Before you connect](#before-you-connect)).

Or run `/add-plugin whatsapp-business` in chat.

## MCP

This plugin ships no `mcp.json`, and that is deliberate.

Every other connector in this repository either points at a vendor's hosted endpoint or runs a package locally over stdio, so it carries its own server definition. WhatsApp Business does not: Cursor runs the server, and the plugin exists only as the opt-in that turns it on for your account. There is no command to run and no MCP endpoint to configure.

One consequence worth knowing: because the server is not declared here, you will not find it in a local `mcp.json` and you cannot point another MCP client at it. It is reachable from Cursor only.

## Before you connect

Each person who installs the plugin enters their own three values. These are per-member settings, so a team admin cannot set them for everyone.

### 1. Create a system user token in Meta

1. In [Meta Business Suite](https://business.facebook.com), open **Business settings → Users → System users** and add a system user, or pick an existing one.
2. Under **Assign assets**, give the system user access to your WhatsApp Business Account.
3. Click **Generate new token**, choose the Meta app connected to your WhatsApp Business Account, and select the `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
4. Copy the token. Meta shows it only once.

### 2. Find your IDs in WhatsApp Manager

- **WhatsApp Business Account ID:** shown next to your account name in [WhatsApp Manager](https://business.facebook.com/wa/manage/home/).
- **Phone number ID:** the long numeric ID under **Account tools → Phone numbers**. Use the ID, not the phone number itself.

### 3. Enter the values in Cursor

All three fields are required:

| Field | Value |
| --- | --- |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp Business Account ID from WhatsApp Manager. |
| `WHATSAPP_BUSINESS_PHONE_NUMBER_ID` | Phone number ID from **Account tools → Phone numbers**. Agents send messages from this number. |
| `WHATSAPP_BUSINESS_ACCESS_TOKEN` | The system user token from step 1. Treated as a secret and never shown back. |

## What agents can do

| Category | Capabilities |
| --- | --- |
| Messages | Send text and template messages from your business phone number |
| Templates | List and manage message templates |
| Contacts | Look up the contacts your business messages |
| Phone numbers | Read the phone numbers on your WhatsApp Business Account |

The server is the source of truth for tool names and schemas.

## Notes

- Access follows the system user token. The connector can reach only the WhatsApp Business Accounts assigned to that system user, within the token's permissions.
- WhatsApp only allows free-form messages within 24 hours of a customer's last message. Outside that window, agents must send an approved template.
- Messages go out from your real business number and can incur Meta's messaging charges. Review what agents send.
- Disconnecting the connector in Cursor deletes your saved account ID, phone number ID, and access token. Revoking the token in Meta Business Settings ends Cursor's access to your account.

## Docs

- WhatsApp Business Platform: https://business.whatsapp.com
- WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
- Model Context Protocol: https://modelcontextprotocol.io

Logo is WhatsApp's official mark, from `whatsapp.com`.

## License

MIT
