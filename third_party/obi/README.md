# Obi

Cursor plugin that connects agents to [Obi](https://rideobi.com/) through Obi's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Compare taxi and rideshare prices, book Uber or Lyft rides, find nearby places, and get transit routes.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Obi**.
3. Click **Install**, then complete the Obi sign-in prompt.

Or run `/add-plugin obi` in chat.

## MCP

```json
{
  "mcpServers": {
    "obi": {
      "type": "http",
      "url": "https://api.bellhop.me/mcp"
    }
  }
}
```

Cursor prompts you to sign in to your Obi account when the plugin connects.

## Before you connect

You need an Obi account. To book rides, link an Uber or Lyft account in the Obi app.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Ride prices | Compare offers across taxi and rideshare providers by price, service level, and pickup time |
| Booking | Book an Uber or Lyft offer after you confirm, through the account linked in the Obi app |
| Car types | Request Economy, XL, premium, or wheelchair-accessible rides |
| Places | Find nearby restaurants, pharmacies, cafes, and more |
| Transit | Show public transit routes with each leg's duration |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Bookings run under the ride-provider accounts linked to the Obi account that authorizes the connection.

## Docs

- Obi: https://rideobi.com/
- Server URL: https://api.bellhop.me/mcp

Logo is the Obi app icon from the `BellhopApp` GitHub organization, which links to rideobi.com. The submitted logo URL and rideobi.com were unreachable when this plugin was added, so the file was not downloaded from the website.

## License

MIT
