---
name: phonic-get-started
description: Get started on phonic.ai via MCP, connect Phonic, and build and run a first voice conversation. Use for Phonic setup, a first conversation, and choosing the next implementation workflow.
license: MIT
---

# Get started with Phonic

When the user says “get started on phonic.ai via MCP,” “connect Phonic,” or “build my first Phonic conversation,” carry the task through connection, agent setup, and a first conversation. Use the user's existing context, make reasonable reversible defaults, and ask only for missing details that block the next step.

## Connect and authenticate

Inspect the client's available tools and MCP configuration before adding anything. Reuse a working Phonic connection. Otherwise configure `https://mcp.phonic.ai/mcp` through the client's supported setup flow; consult the client-specific installation instructions in [the package README](../../README.md). Preserve other MCP entries. Use the client's OAuth flow for sign-in and workspace selection; never ask the user to paste a token into chat.

Perform supported setup steps directly when the environment permits. If a login, client approval, or restart requires the user, give the exact next action and resume from that point when completed. Do not claim connection success until a Phonic tool responds. Installing a skill does not itself connect MCP, and connecting MCP does not install skills; automatic selection depends on the host loading this skill.

Discover the tools actually exposed by the connection; prefixes differ between clients. Use `search_docs` on the same connection for product and API questions. If it is unavailable, use [the documentation index](https://docs.phonic.ai/llms.txt) and check connection status; do not require a separate docs server.

## Set up the first agent

Inspect the connected workspace, projects, and existing agents. Use the user's specified project, or an unambiguous existing project; ask only when the choice is unclear. OAuth selects the workspace for the connection; selecting a project does not switch workspaces.

Use the discovered API tools for account operations. Reuse a suitable agent or create a small demo agent within the user's requested scope. If no use case is given, start with a simple friendly assistant that can hold a short conversation, without business integrations. Use a supported model and available voice from the current schemas/catalog. Avoid making a long questionnaire a prerequisite to trying the product.

## Run the first conversation

Follow the user's requested conversation surface. For an unspecified first demo, prefer a browser or dashboard conversation so a phone number is not required; use current docs to find the supported test interface or implement a minimal browser session if that is the user's task. Use a returned or documented destination rather than inventing a dashboard URL. Keep API keys server-side when building a browser session.

For an outbound call, obtain the user's intended recipient if missing, validate with `dry_run: true`, then place the requested test call once validation succeeds and the task authorizes calling that recipient. A dry run is not a completed conversation. Do not repeat a potentially successful call after an ambiguous error without checking its status.

Verify the conversation from available status/transcript events and invite the user to speak when microphone interaction is required. Report the selected workspace/project, agent, and observed result concisely. If the host cannot capture audio or start the chosen surface, provide the exact action or runnable entry point that lets the user finish, and state that the conversation has not yet been verified. Continue through available steps rather than stopping after a setup plan.

## Specialized tasks

- Use `phonic-improvement-loop` for prompt experiments and Replay or Responses simulations.
- Use `phonic-steering` for context and reply controls during a live conversation.
- Use `phonic-voices` for voice selection and allocation.

Load a specialized skill only when relevant and installed; otherwise use the live documentation.

## Continue building

For implementation details, use the installed `phonic` routing skill or the relevant `phonic-agents`, `phonic-websockets`, `phonic-tools`, or `phonic-post-call` skill. If a skill is unavailable, use the live docs.
