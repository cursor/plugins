# Memory.fit

Cursor plugin that connects agents to [Memory.fit](https://memory.fit) through Memory.fit's hosted [Model Context Protocol](https://modelcontextprotocol.io/) server.

Memory.fit keeps your training, sleep, recovery, and fuel in one place. Agents read workouts from your watch and apps, sleep and HRV, and what you ate, then write your week back: sessions, daily targets, and meal plans, which show in the Memory.fit app on iPhone and Android.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **Memory.fit**.
3. Click **Install**, then complete the Memory.fit sign-in prompt.

Or run `/add-plugin memory-fit` in chat.

## MCP

```json
{
  "mcpServers": {
    "memory-fit": {
      "type": "http",
      "url": "https://api.memory.fit/mcp"
    }
  }
}
```

Auth is OAuth 2.1 with dynamic client registration, so Cursor prompts for Memory.fit sign-in when the plugin connects. There is no client ID or API key to configure.

## Before you connect

You need a Memory.fit account. Connect your watch and food-tracking apps in Memory.fit so the agent has data to read.

## What agents can do

| Category | Capabilities |
| --- | --- |
| Training | Read workouts from your watch and apps, and plan sessions for the week |
| Sleep and recovery | Read sleep and HRV |
| Nutrition | Read and log meals, set daily targets, and write meal plans |

The hosted runtime is the source of truth for tool names and schemas.

## Notes

- Plans and logs the agent writes appear in the Memory.fit app on iPhone and Android.

## Docs

- Memory.fit: https://memory.fit
- Server URL: https://api.memory.fit/mcp

`plugin.json` points `logo` at the submitted image, `https://memory.fit/android-chrome-512x512.png`. memory.fit could not be reached when this plugin was added, so no local logo file was committed.

## License

MIT
