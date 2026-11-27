# Form Backend

Connect Cursor to [Jotform Form Backend](https://www.jotform.com/agents/form-backend/). Give a new or existing website form a hosted submission backend while keeping its own design; no Jotform embed is required.

## Install

Requires Cursor 3.13.0 or newer.

1. Open **Cursor Settings → Plugins**.
2. Search for **Form Backend** by **Cursor**.
3. Click **Install**.
4. Enable the plugin's MCP server if prompted, then complete Jotform sign-in.

Or run `/add-plugin jotform-form-backend` in chat.

## MCP

```json
{
  "mcpServers": {
    "jotform-form-backend": {
      "type": "http",
      "url": "https://mcp.jotform.com/form-backend"
    }
  }
}
```

Cursor opens your browser so you can sign in to Jotform and approve access. No API key is needed.

## What agents can do

| Tool | Capability |
| --- | --- |
| create_form_backend | Create the backing form and return its submission integration. |
| update_form_backend | Update that form with its current key and complete field list. |
| list_form_responses | Read recent responses the connected user is authorized to access. |
| configure_response_emails | Configure future owner notifications and visitor confirmations. |
| update_response_email | Customize an existing response email. |

The hosted server's tool descriptions, schemas and returned integration instructions guide website integration and define supported arguments and optional features.

## Try it

- "Connect my form to Form Backend."
- "Show responses I got from my form."
- "Send me emails when I get form responses."
- "Add a phone field to my form."

## Notes

- Tool calls run as the Jotform user who authorizes the connection. Form submissions are stored in that user's Jotform account.
- The server URL is `https://mcp.jotform.com/form-backend`. Keep the `/form-backend` path; do not add a `/mcp` suffix.
- Email notifications and confirmations apply to new responses after you enable them.
- Visitor confirmation emails require an email field in your form.
- You can disconnect Cursor from **Jotform → My Account → Connected Apps → Jotform MCP → Clients**.

## Docs and support

[Form Backend](https://www.jotform.com/agents/form-backend/) · [Form Backend MCP](https://mcp.jotform.com/form-backend) · [Support](https://www.jotform.com/contact/) · [Privacy](https://www.jotform.com/privacy/) · [Terms](https://www.jotform.com/terms/)

