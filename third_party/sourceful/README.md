# FTW

Cursor plugin that connects agents to [FTW](https://ftw.sourceful.energy), Sourceful's open-source home energy software, through FTW Cloud's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

FTW runs on the owner's own Raspberry Pi or Linux computer and reads the meter, solar, battery, and EV charger. This plugin helps install and set up FTW, explains live energy, plans, history, and equipment health, and, only with the owner's approval in FTW, runs short, bounded EV charging.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **FTW**.
3. Click **Install**, then complete the FTW Cloud sign-in prompt and approve the assistant in FTW.

Or run `/add-plugin sourceful` in chat.

## MCP

```json
{
  "mcpServers": {
    "sourceful": {
      "type": "http",
      "url": "https://cloud.ftw.energy/mcp?profile=public"
    }
  }
}
```

Auth is OAuth 2.1 with PKCE. The client registers itself (client ID metadata document or dynamic client registration), so there is no client ID or API key to configure.

## Skills

| Skill | Purpose |
| --- | --- |
| `ftw-setup-guide` | Install, migrate, commission, and connect FTW, even before any home is connected |
| `ftw-energy-assistant` | Read live energy, plans, history, and health; diagnose problems; bounded charging and owner-approved goal requests |

## Access

Nothing reaches the assistant until the home's owner approves it in FTW. Default access is four read scopes (live, plan, history, health). Control, setup, and diagnostics are separate grants with their own limits and expiry. Lasting changes, such as a new charging goal, wait for the owner to confirm in FTW. The public connection exposes 27 named tools, with no arbitrary API reader, backup export, or SSH access.

The hosted runtime is the source of truth for tool names and schemas.

## Docs

- FTW: https://ftw.sourceful.energy
- Plugin source: https://github.com/srcfl/ftw-plugin
- Server URL: https://cloud.ftw.energy/mcp?profile=public
- Privacy: https://ftw.sourceful.energy/privacy
- Support: support@sourceful.energy

Skills and logo are copied from [srcfl/ftw-plugin](https://github.com/srcfl/ftw-plugin) at commit `8b94a67`.

## License

MIT
