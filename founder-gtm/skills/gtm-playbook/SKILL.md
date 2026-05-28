---
name: gtm-playbook
description: Opens or points to the Founder GTM canvas playbook. Use when a founder wants the visual GTM guide, asks what the plugin includes, asks to see the playbook, or wants a walkthrough before running gtm-setup.
---

# GTM Playbook

Open the visual playbook at `${CURSOR_PLUGIN_ROOT}/canvases/founder-gtm-playbook.canvas.tsx`.

If the `cursor-app-control` MCP is available, use `open_resource` with that absolute plugin-root path. Do not open `canvases/founder-gtm-playbook.canvas.tsx` as a workspace-relative path; after Marketplace install, the canvas lives inside the installed plugin, not necessarily in the founder's current project. If `cursor-app-control` is not available, tell the founder where the canvas lives and suggest running `/gtm-setup` after they skim it.

After opening the canvas, give a short orientation:

1. The framework is identify, resonate, time, follow up.
2. The first practical step is `/gtm-sales-pack`.
3. The plugin gets better over time through `/gtm-get-better` and the bundled automations.

Do not summarize the whole canvas unless the founder asks. The point is to open the artifact and help them start.
