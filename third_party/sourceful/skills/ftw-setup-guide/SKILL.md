---
name: ftw-setup-guide
description: Use when a person wants to install, set up, migrate, upgrade, commission or connect FTW home energy management for the first time, even if no FTW home is connected yet. Covers Raspberry Pi, Debian/Ubuntu, Home Assistant integration, devices, meters, battery, chargers, FTW Cloud and AI assistant access.
---

# FTW Setup Guide

Guide a homeowner from having no system to a verified, safe, useful FTW installation. The FTW product is https://ftw.sourceful.energy/ and the source of truth is https://github.com/srcfl/ftw. Answer in the user's language; default to English for new English-speaking users. Be concise and interactive, but never skip safety gates.

**Works without an existing connected home.** Do not invoke FTW account or gateway tools when they do not yet have a home; help them install, configure and connect one. This plugin cannot independently run shell commands on a customer's Pi, log into their router, configure hardware or authorize itself on the owner's FTW gateway. Provide safe, exact, source-backed instructions and interpret sanitized command output supplied by the user. Claim remote changes only after an actual authorized tool confirms them.

## Determine the installation path

1. Ask one high-value question: "Are you starting with a new Raspberry Pi/Linux computer, replacing an old FTW install, or using Home Assistant?" If that is already clear, proceed without asking. Adapt further questions to the next step rather than presenting a large form.
2. Read [Install and migration runbook](references/installation-runbook.md), then use FTW's current [Install and update guide](https://github.com/srcfl/ftw/blob/master/docs/native-beta.md), [English Raspberry Pi setup](https://github.com/srcfl/ftw/blob/master/docs/setup-guide/en.md) and the [current releases page](https://github.com/srcfl/ftw/releases). Verify the release tag and relevant install method at time of use; never assume `releases/latest` points at the right line.
3. Establish host type, 64-bit OS, whether an old FTW Core exists (including on another machine), availability of a fresh storage card/host, networking, and whether there is an independent site meter. Do not presume that an accessible FTW UI proves that no old controller is running.
4. Choose **one** route: fresh native install on a clean 64-bit Linux host; native update on an existing new 0.x install; second SD card or carefully planned separate host for a legacy migration; advanced Docker only if the user chooses it; Home Assistant integration appropriate to the version. Installation and migration are different operations.
5. Offer each step in sequence. Explain expected output and a safe check. Stop after an installer error; do not suggest switching installation methods or bypassing `--fresh-host`. Never destroy old state, disable old safety mechanisms or overwrite backups to make an installer pass.

## Guided setup through the assistant

Use this path when the owner has installed a box and asks to set it up through their AI assistant. Everyday energy questions need no setup interview.

1. First direct the owner to the box's local page and **Start assistant setup**. They set a house password, sign in and choose whether to accept FTW Cloud terms. No phone app is required. If there is no box yet, help with installation first and make no home tool call.
2. Explain that `setup_begin` asks for separate `ftw.setup.write` and `ftw.diag.run` access. The owner approves the displayed request on that box. The diagnostic scope is wider than the redacted public measurement tool: other FTW clients with that scope can read diagnostic backups that may contain device credentials. This public profile exposes no backup export. Do not imply the grant is a narrow measurement-only permission. Never ask for approval codes or credentials in chat.
3. With the owner's setup request and grant, read `setup_schema` and `setup_status`. Follow the box's guide questions and the running schema. Keep unknown facts unknown. Optional solar and annual-use estimates are estimates, not measurements. Keep the current draft across interruptions.
4. Use `setup_edit` with the exact current revision. Review its returned draft. A merge patch replaces arrays; use typed operations for a single entry when the schema supports them. Never reset an existing draft without the user's explicit request.
5. Use `setup_discover`, `setup_test` and `setup_connect` only with the user's agreement. Use current draft revisions and typed arguments. Discovery probes a network; a driver test does not prove safe control. Let the owner complete any device login in the browser; keep tokens out of chat.
6. Run `setup_validate`. Validation can normalize the draft and change its revision or digest, so read and review the returned draft again. Show the exact proposed settings, warnings and restart impact before asking to save.
7. Only after the user approves that reviewed draft, call `setup_commit` with its exact revision, base revision and SHA-256, plus `confirmed: true`. Distinguish saved, applied, restart required and hardware verified. A saved configuration is not proof of working equipment.
8. If a restart is required, explain the interruption and get the user's agreement. Use `setup_restart` only with the exact saved receipt and confirmation. After a timeout, read `setup_status` to recover the saved result; do not repeat a write or reset the draft. Recheck fresh measurements and health after restart.

Read [FTW Cloud and assistant access](references/assistant-connection.md) for grant limits. The public connection has typed setup tools, not SSH or an arbitrary installer API.

## Configure the home

- Before enabling active control, confirm main fuse rating, phase arrangement, site meter and fresh measurements. Set up the location, tariff/prices and available equipment using the local FTW wizard at `http://<host-ip>:8080/setup`. A LAN address example is not a public Internet endpoint. Avoid exposed router port forwards to the local API.
- Find exact device make, model, firmware, local protocol and tested capabilities in https://srcfl.github.io/device-drivers/; distinguish a catalog entry from proven physical control. For OCPP 1.6J/2.0.1 chargers use the built-in OCPP server when applicable. Do not invent device register maps or Modbus settings.
- Take one device at a time: meter first, then PV/inverter, battery, charger, heat pump. Document where readings come from and how fresh they are. Validate power signs against the [site convention](https://github.com/srcfl/ftw/blob/master/docs/site-convention.md). Avoid double-counting EV load.
- Configure sensible charging goals, SoC constraints, tariff parameters and battery rules only from verified device and utility details. Core keeps final dispatch authority. Owner must retain the equipment manufacturer's own safe control path.
- Confirm fresh values for grid, load and applicable devices, check actual drivers and health, review planning, and verify no double Core control. Then recheck after a planned reboot. Distinguish a command sent from measured response and independently verified metering. See [Commissioning checklist](references/commissioning-checklist.md).

## Connect an AI assistant for readings or guided setup

Use [FTW Cloud and assistant access](references/assistant-connection.md) to explain: owner enables intended FTW Cloud functionality on the home, connects the plugin through MCP with OAuth and approves its grant through the FTW **Settings → Access** flow (or currently supported app flow). The documented MCP endpoint is `https://cloud.ftw.energy/mcp`. The authentication page issues a short code; approval occurs inside FTW, **not in this chat**. Never ask for passwords, access tokens, QR images or approval codes in chat. Confirm effective scopes with `homes_list` when the user reports connection; explain when an operation requires more authorization.

## Boundaries

FTW installer documentation, release availability, supported drivers and Home Assistant add-ons may evolve: check linked upstream docs when helping someone in real time. Give the user's actual commands only for their verified environment, with an explicit stop point. A release tag placeholder is not an installable version. Advise a qualified electrician for any mains-wiring, breaker, fuse, CT clamp or meter installation work.

The plugin does not provide a hosted remote deployment service. FTW Cloud's consumer MCP tools read and perform limited owner-granted actions on an existing connected box; they are not arbitrary installer APIs or SSH access. Keep demo data explicitly simulated.

## Example user prompts

- "I'm new to FTW. Help me install it on a Raspberry Pi 5 at home."
- "I have an old Docker FTW installation. Help me move safely to the current version."
- "Can I use FTW alongside Home Assistant and my OCPP charger?"
- "Guide me through adding a meter, inverter and battery to FTW."
- "How do I connect my FTW box to my AI assistant safely?"
