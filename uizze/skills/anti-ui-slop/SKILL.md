---
name: anti-ui-slop
description: Stop coding agents from shipping generic UI. Use UIZZE's 800,000+ real web and iOS screens to build product-specific interfaces, define a design contract, cover required states, and run a hard finish gate. Use when designing, implementing, redesigning, critiquing, or pre-ship reviewing a web or iOS interface in Codex, Claude Code, Cursor, Copilot, or another coding agent. Trigger with "anti-ui-slop", "stop UI slop", "ground this UI in real screens", or "run the UI finish gate".
license: Apache-2.0; see LICENSE and NOTICE for attribution
allowed-tools: Read, Glob, Grep, WebFetch
metadata:
  version: "1.3.1"
  author: "UIZZE <business@uizze.com>"
  compatibility: "Designed for Claude Code, Codex, Cursor, and GitHub Copilot; works in any agent that can read project files and fetch a URL."
  tags: "ui-design, design-system, design-review, frontend, web-ui, ios-ui"
---

> **Stop AI coding agents from shipping generic UI.**

# Stop Making UI Slop

Build product-specific UI with 800,000+ real web and iOS screens via [UIZZE](https://uizze.com).

![Stop Making UI Slop with UIZZE](https://uizze.com/landing/anti-ui-slop-skill-banner.png)

## Overview

Use the product brief, existing UI, components, and local design system to make intentional interfaces. Uizze supplies focused design guidance and, when useful, a small number of relevant visual references.

## Prerequisites

- A screen or component to build, redesign, or review — a file path or a short description.
- The product's existing components, design tokens, and visual language, so the build extends them instead of inventing a new system.
- Optional access to the paid Uizze MCP for focused references and hosted materials.

## Authentication

- The free skill and public catalogue work without an account, token, MCP connection, dependency, script, or executable.
- The optional full UIZZE MCP may use the host's normal connection and authentication flow. Never claim it is connected without an actual host result.

## Work from the product

Read the brief, existing UI, components, tokens, assets, and any PRODUCT.md or DESIGN.md before designing. The user's request and project constraints outrank this skill. Preserve an established visual system for extensions and polish; replace it only for an approved redesign. A new project does not require those files.

Identify the audience, primary task, important states, and intended result. Ask only about missing choices that would materially change the work. A precise request is enough to proceed; do not turn a small fix into a discovery workshop.

## Select the workflow

Load the playbook for the requested action, plus the platform and craft guidance needed to execute it:

- New interface or major redesign: [new-work](reference/new-work.md)
- Product or dashboard work: [operate](reference/operate.md)
- Refinement and polish: [polish](reference/polish.md)
- Simplification: [distill](reference/distill.md)
- Explicit audit: [audit](reference/audit.md), read-only unless fixes were requested
- Native iOS: [iOS](reference/ios.md), alongside the action's playbook
- Explicit `/overdrive`, “Uizze Overdrive”, or a request for exceptional interaction work: [Overdrive](reference/overdrive.md)

For implementation, use [craft](reference/craft.md) after the direction is settled. Load only relevant files; multiple complementary playbooks are allowed. Overdrive is opt-in, not the default for ordinary UI work. It requires a chosen direction before implementation.

“Use Uizze Overdrive on this screen” works through this router; a native slash command depends on the host. These are self-contained Markdown playbooks, not an installer, background service, or executable engine.

## Optional Uizze evidence

Read [the reference policy](references/uizze-reference-policy.md) before using `find_ui_references` or `find_ui_materials`. Inspect relevant visual evidence when it can inform the layout, state, interaction, or assets. Use the host's available tools, not invented calls or connections. Paid retrieval is optional; missing access does not block local design work.

Distinguish an exact reference, a related example, no match, and a service error. Briefly disclose a limitation that affected the result. Never claim an image was inspected or a state was found without evidence.

## Finish

Build the requested scope and exercise its important states. Render and inspect the real result at representative desktop/mobile sizes or native device classes, including the user's reported failing size. Compare it with the chosen direction or supplied reference, not just with the absence of runtime errors.

Fix material problems in a batch, then render and inspect again. Stop once the requested result is verified; do not keep inventing work. If a bounded pass cannot resolve an issue, report it instead of claiming a pass. When rendering is unavailable, distinguish code checks from visual verification.

Keep the handoff concise: what changed, what was actually tested, and any remaining limitation. A skill does not authorize publishing, purchases, new dependencies, account changes, or destructive actions.
