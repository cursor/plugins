# Kling AI for Cursor

Generate images and videos, reuse Elements, and track Kling tasks from Cursor
Agent chat. This is the **Global** plugin on the `main` branch, version **1.4.2**.
Using a China account? See the [China plugin on the `cn` branch](https://github.com/klingai-tech/cursor-plugin/tree/cn).

## Quick start

### 1. Install the plugin

Open Cursor desktop, switch the chat to **Agent**, and paste this request.

> Install the Kling AI Cursor plugin from https://github.com/klingai-tech/cursor-plugin
> using the `main` branch. Follow Cursor’s local plugin instructions, then guide me
> through reloading Cursor, connecting my Kling AI Global account, and checking
> the connection and credits before creating any generation tasks.

[Official Kling MCP & CLI guide](https://kling.ai/app/mcp/guide) ·
[Cursor local plugin instructions](https://cursor.com/docs/plugins#test-plugins-locally)

#### Install manually

On macOS or Linux, run the following in a terminal.

```bash
git clone --branch main --single-branch https://github.com/klingai-tech/cursor-plugin.git
cd cursor-plugin
mkdir -p ~/.cursor/plugins/local/kling-ai
cp -R .cursor-plugin assets rules skills mcp.json README.md ~/.cursor/plugins/local/kling-ai/
```

<details>
<summary>Windows PowerShell</summary>

```powershell
git clone --branch main --single-branch https://github.com/klingai-tech/cursor-plugin.git
Set-Location cursor-plugin
$pluginDir = Join-Path $HOME '.cursor/plugins/local/kling-ai'
New-Item -ItemType Directory -Force -Path $pluginDir | Out-Null
Copy-Item -Recurse -Force -Path .cursor-plugin, assets, rules, skills, mcp.json, README.md -Destination $pluginDir
```

</details>

If you already have the repository, update your `main` checkout and run the
copy commands from its root. When upgrading a local install that still has
`commands/kling-ai.md` in the plugin folder, remove that legacy file before reloading.

The [Cursor Directory listing](https://cursor.directory/plugins/kling-ai) installs
its rule and MCP entry individually. Use the steps above to load the full plugin
and its `/kling-ai` Skill.

### 2. Connect your Kling AI account

1. Restart Cursor or run **Developer: Reload Window** from the Command Palette.
2. Open **Customize → Plugins** and check that **Kling AI** is loaded. Find the
   enabled `kling-ai` MCP server in **Customize** and click **Connect**.
3. In the browser, sign in to your Kling AI Global account and authorize Cursor.
   Return to Cursor and open a new Agent chat. The plugin supplies
   `https://kling.ai/mcp/plugin` in its bundled [MCP config](mcp.json) and Cursor
   handles OAuth.

### 3. Try it in Agent chat

Type `/kling-ai`, select the Skill, and send a prompt.

- **Check the connection** · Check my Kling AI connection and available credits. Skip generation.
- **Generate an image** · Create a 4:5 product poster of a glass perfume bottle in warm studio light. Show the settings and wait for confirmation.
- **Animate a reference** · Use the attached product photo as the first frame of a 5-second video. Keep the product fixed while the camera slowly pushes in.

For reference-based requests, attach the image or video in chat and say how it
should be used. For generation, review the final settings and confirm the
credit-consuming submission. Follow progress in the result card when it appears.
You can also ask Cursor to look up an existing task by its task number.

See more prompt examples in [English](skills/kling-ai/references/prompt-examples.md#suggested-prompts)
or [中文](skills/kling-ai/references/prompt-examples.md#推荐提示词).

## Troubleshooting

- **Plugin or Skill missing.** Check that `.cursor-plugin/plugin.json` is inside the
  local plugin folder, reload Cursor, and start a new Agent chat. On an Enterprise
  account, your admin can check **Allow Local Plugin Imports**.
- **Connection or account issue.** Keep one Kling MCP entry active in Cursor and
  reconnect the plugin’s `kling-ai` server. When switching from China to Global,
  disconnect the previous session and authorize your Global account.
- **Task still running or result card missing.** Ask Cursor to check the existing
  task number, if available. For other issues, see the [troubleshooting guide](skills/kling-ai/references/troubleshooting.md).

## Capabilities

- Text-to-image, reference-guided editing, and coherent image series. If no image model is specified, prefer Kling Image 4.0 when it is available and meets the request, then consider the account's compatible default.
- [Kling Image 4.0](https://kling.ai/quickstart/kling-image-4-user-guide) supports native 8K and Series Mode for up to 10 coherent images in one generation. Available settings follow the connected account's MCP capabilities.
- Kling 4.0: text-to-video, first/last/intermediate keyframes, and Omni-Ref with images, videos, audio, and Elements. Outputs are 3–30 seconds and default to 720p. Accounts with access to 1080p or 4K can enable HDR output in text-to-video, image-to-video, and Omni-Ref.
- Kling 4.0 Flash: text-to-video, single first-frame image-to-video, and Omni-Ref with images, videos, and Elements. Outputs are 3–20 seconds at 720p.
- Both Omni-Ref models support smart shot splitting. Synchronized sound generation and source audio retention are mutually exclusive. Model availability and settings follow the connected account.
- Live account-scoped model discovery, reference limits, and billing disclosures
- Media upload, Element management, motion library, credit checks, and task status
- Confirmation immediately before credit-consuming generation
- At most one submission per confirmed intent
- One self-refreshing MCP App per generation when available

## Components

| Component | Path | Purpose |
| --- | --- | --- |
| Manifest | `.cursor-plugin/plugin.json` | Plugin identity and native component entrypoints |
| MCP | `mcp.json` | Global remote OAuth MCP |
| Rule | `rules/kling-ai.mdc` | Routing, safety, and single-submission constraints |
| Core Skill | `skills/kling-ai/` | `/kling-ai` entrypoint, OAuth, account, media, Elements, status, and shared contract |
| Image Skill | `skills/kling-ai-generate-image/` | Image workflows, prompting, and quality gates |
| Video Skill | `skills/kling-ai-generate-video/` | Video, motion control, duration, and shot planning |

## Generation contract

1. Call `who_am_i` before generation and use the live service's canonical
   models, arguments, enums, and inputs.
2. Upload local media with the remote upload tool and reuse one UUIDv7
   `taskTraceId` for the same objective.
3. Show final billable settings, including live-required billing disclosures, and
   obtain explicit confirmation unless those settings are already authorized.
4. Check the current credit balance on the same connection immediately before
   submission. If the balance is unavailable or insufficient, pause the task.
5. Call a generation tool at most once per confirmed intent; never retry an
   ambiguous submission automatically.
6. When Cursor mounts the generation MCP App, let that App refresh internally
   instead of creating duplicate model-side `query_tasks` cards.
7. If no App mounts, query at the provider-permitted interval until terminal,
   cancelled, or the turn cannot continue. Report completion only after terminal
   success with the requested number and type of usable results. If fewer results
   are available, report the actual count. An explicit status request queries once.

If credits run out, sign in to the same account on your region's official Kling
site and top up. Return to the same Cursor conversation and ask to continue the
paused task. If the original submission has a task number, Cursor checks it first.
If a new submission is safe, Cursor rechecks the balance and uses the original
settings.

## Validation

```bash
npm run check
npm test
for skill in skills/*; do
  python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" "$skill"
done
```

## Official references

- [Cursor Plugins](https://cursor.com/docs/plugins)
- [Cursor Plugins Reference](https://cursor.com/docs/reference/plugins)
- [Cursor MCP](https://cursor.com/docs/mcp)

## License

MIT. Kling AI and related marks belong to their respective owners.
