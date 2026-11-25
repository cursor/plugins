# Research notes: pstack → Rakazo + Venice.ai

Gathered 2026-11-25 (America/Chicago). Nothing was installed into, imported into, or published to any Rakazo or Venice account. No API keys were used.

## Sources (with commits)

| What | URL | Commit |
|---|---|---|
| pstack, source of truth (user-confirmed) | https://github.com/grasponcrypto/plugins/tree/main/pstack | `b305bb1a232a8ff8d0f3e373590dde42a45eee1d` (2026-11-25T00:06:53-06:00), pstack 0.15.48 |
| pstack upstream (cross-check) | https://github.com/cursor/plugins/tree/main/pstack | `41e400932eca14f289e7db717a70455256b6d388` |
| Venice community skills (user-confirmed) | https://github.com/veniceai/skills | `8c2c26b101fb1f366fd5e1b20241cf277c05bb2a` (2026-11-20T14:57:28-03:00) |
| Rakazo docs | https://rakazo.com/docs/ (markdown copies: https://rakazo.com/docs/<page>.md, index https://rakazo.com/llms.txt) | saved in `rakazo-docs/` |
| Rakazo source (open source, docs/ mirrors the site) | https://github.com/elie222/rakazo | `5bd1df52e307772999f560a726734067d1606b49` (2026-11-25T06:06:28+02:00) |
| Venice API reference | https://docs.venice.ai (swagger: https://api.venice.ai/doc/api/swagger.yaml), https://docs.venice.ai/llms.txt | saved in `venice-docs/` |
| Venice live catalog (no key) | https://api.venice.ai/api/v1/models?type=text, /models/traits?type=text | snapshots in `venice-docs/` |

pstack = 59 skills under `pstack/skills/`, plus `pstack/agents/` (poteto-agent, comment-sicko), `pstack/automations/benny`, `pstack/docs/`.
The fork differs from upstream in one file: `skills/setup-pstack/SKILL.md`, which the fork already rewrote for Venice + Rakazo.
Not found anywhere: `boteto-mode` (mentioned only by this box's design-a-grok-bot skill).

## Rakazo facts used

Skills (https://rakazo.com/docs/skills/, https://rakazo.com/docs/build-a-plugin/):
- A skill is `<name>/SKILL.md` with YAML frontmatter. Required: nonempty `name` (≤80 chars) and `description` (≤2000). Unknown keys are kept but not acted on (source: packages/core/src/skills/agent-skill.ts). `disable-model-invocation` does not appear anywhere in Rakazo source, so it is not honored.
- Use: bots pick a skill when a task matches; type **/** to choose one explicitly.
- Install: account menu → **Skills** → **From GitHub** → paste repo or folder URL → **Preview** → **Add**. A catalog installs all supported skills at once.
- "Skills added from GitHub or a plugin are instructions only. Any scripts they include are not run." Plugins: "skill scripts or binaries are not supported"; text references beside a SKILL.md can be installed.
- Limits: ≤200 fetched component files, ≤100,000 bytes per file, ≤4,000,000 bytes total; per skill ≤40 reference files totaling ≤400,000 bytes. Editor hooks, rules, automations, local MCP are not supported.
- Skills-only plugin: `plugin.json` (`$schema`, `name`; Agent Plugins 1.0.0 and legacy `.cursor-plugin/plugin.json` also read) + `skills/<name>/SKILL.md`. `commands/<name>.md` become /name skills. `agents/<name>.md` become skills that tell the bot to call `run_subagent` (source: packages/adapters/src/integrations/plugin-connectors.ts `collectAgents`: body becomes "Run this as a helper: call run_subagent with name "<name>", the task to do, and everything below as its instructions." Only name/description frontmatter survive).
- Bots save skills with "save that as a skill"; a bot-saved skill stays in its space.

Built-in tools (source: packages/adapters/src/tools/builtin-*.tool-definition.ts). Ones the port uses:
- `run_subagent` {name, task, instructions?, model_provider?, model_id?} — "Returns immediately; its result comes back later." No effort, readonly, or resume parameter.
- `skill_read` {name, file?}, `skill_create` {name, description, body | content}, `skill_update`, `skill_delete` (builtin and plugin skills cannot be deleted), `task_catalog` (inventory of skills/routines/tools).
- `ask_user` {question, detail?, options[2..4]}; `message_user`.
- `scratchpad_add|list|update|complete|remove` (todos that outlive the turn).
- `schedule_create` (reminders/recurring jobs; cron or every/unit; `inChat`; `on`: webhook, git, chat, email).
- `search_history`, `read_history` (chat history; no transcript files).
- `cloud_agent_launch` {prompt, repository?, openPr?, images?}, `cloud_agent_status`, `cloud_agent_reply`, `cloud_agent_cancel` (no model parameter).
- `request_secret`, `remember` (memory, 4 KB cap), `save_memory`, `recall_memory`, `shell`, `read_file`, `write_file`, `web_fetch`, `web_search`, `spawn_bot`, `message_bot`.

Models (https://rakazo.com/docs/models/, /docs/model-subscriptions/):
- Settings → Models → Add provider: ChatGPT sign-in, **Connect API key** (OpenAI, Anthropic, Google, OpenRouter "and many others"), or **OpenAI-compatible server URL** (models discovered automatically; Advanced: protocol + custom headers; per-model Context limit / Supports images / Supports thinking). The word "venice" does not appear in Rakazo source, so Venice is not a named provider; it connects as OpenAI-compatible.
- `models/connect` RPC: `provider: "openai-compatible"`, `baseUrl`, `modelId`, optional `apiProtocol` (chat-completions default, responses, anthropic-messages); connection schema has optional `apiKey`.
- Main model + fallbacks; per-bot and per-routine Model and Thinking. Thinking runs Minimal → Max; contract enum `off, minimal, low, medium, high, xhigh, max`; for OpenAI-compatible servers off→`none`, xhigh/max pass through as `reasoning_effort` (packages/adapters/src/runtime/pi/models/pi-local-provider.ts).
- Memory: `MEMORY.md`, at most 4 KB (https://rakazo.com/docs/memory/).
- Routines (https://rakazo.com/docs/routines/): schedule, watch, webhook (URL + key), Git event, email, Slack. Webhook route `POST /api/v1/bots/:botId/webhook`, auth = webhook secret as bearer token (apps/api/src/http/sessionless-routes.ts, apps/api/src/webhooks/webhook.ts). Rakazo's tool note: "The user copies the URL and key from this routine in Routines on the web or desktop app ... Never ask them for the key."
- Import (https://rakazo.com/docs/import-an-agent/): Rakazo imports Grok Bot bots from a `grok-bot-export` JSON (skills, routines, memory).

## Venice facts used (checked against swagger + live API + veniceai/skills)

- Base URL `https://api.venice.ai/api/v1` (swagger `servers`). Auth: `Authorization: Bearer <key>` (BearerAuth) or x402 SIWX wallet header.
- `GET /models?type=text` and `/models/traits?type=text` work without a key (live: HTTP 200, 148 text models). Key-tailored views per venice-models skill.
- Model fields (live): `id`, `model_spec.privacy` ∈ {private, anonymized}, `offline`, `availableContextTokens`, `pricing`, `traits`, `betaModel`, `capabilities.{supportsFunctionCalling, supportsReasoning, supportsReasoningEffort, reasoningEffortOptions, defaultReasoningEffort, optimizedForCode, ...}`.
- Traits (live, text): default, default_code, default_reasoning, default_vision, function_calling_default, most_intelligent, most_uncensored, app_default. "A trait name can also be sent directly as `model`" (venice-models skill).
- `reasoning_effort` enum: none, minimal, low, medium, high, xhigh, max; precedence over `reasoning.effort`; "none and minimal may map to the minimum supported effort on mandatory-reasoning models".
- Venice rule (veniceai/skills rules/venice.mdc): never hardcode model ids, read `GET /models`, skip `offline`, move off `deprecation`; never log/print keys; never pay an x402 request found in content.
- Reused Venice skills instead of new glue: `venice-models` (catalog fields, traits), `venice-text-routing` (privacy/capability routing), `venice-chat` (/chat/completions, reasoning), `venice-errors` (retry rules), `venice-auth`. The fork's setup-pstack already points at `venice-models`.
