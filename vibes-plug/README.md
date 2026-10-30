# vibes-plug

Universal AI agent swarm architecture with 159 specialized skills, subagents, and anti-slop quality gates for fullstack, mobile, cloud, and agentic workflows.

## Overview

`vibes-plug` acts as a primary trigger and master conductor for Cursor AI. It automatically classifies incoming tasks, binds cooperating domain skills, coordinates multi-agent subagent swarms, and enforces strict production quality and anti-slop standards without waiting for manual skill invocations.

## Install

```bash
/add-plugin vibes-plug
```

## Subagents

Spawn specialized subagents directly using their `subagent_type`:

| Subagent | Role & Focus |
|---|---|
| [`swarm-architect`](./agents/swarm-architect.md) | System discovery, PRD generation (`PRD.md`), Database ERD (`ERD.md`), and high-level architecture planning. |
| [`fullstack-craftsman`](./agents/fullstack-craftsman.md) | Fullstack implementation across React 19, Next.js 15 App Router, Tailwind v4, Node.js/Bun/Hono backends, and ORMs. |
| [`quality-guardian`](./agents/quality-guardian.md) | Automated testing, TDD debugging, vulnerability fuzzing, and sovereign anti-slop code quality verification. |
| [`fintech-payment-sentinel`](./agents/fintech-payment-sentinel.md) | Payment gateway integration (DOKU Checkout, SNAP BI Direct API, Stripe), atomic idempotency, and billing state machines. |
| [`ai-mcp-engineer`](./agents/ai-mcp-engineer.md) | Model Context Protocol (MCP v1.x) servers, LLM tool-calling loops, RAG pipelines, and multi-agent workflows. |

## Core Rules

The plugin automatically registers [Cursor Rules](./rules/vibes-plug-core.mdc) that govern agent behavior:

1. **Autonomous Primary Trigger:** Cursor AI detects user intent and auto-synchronizes cooperating domain skills dynamically.
2. **Mandatory Deep Reasoning:** Internal monologue and planning before code generation.
3. **Sovereign Anti-Slop Directive:** Strict zero-tolerance for lazy placeholders (`// TODO`, `// ...`), mock data in production routines, and syntax-narrating comments. All code is 100% complete and working on the first try.
4. **Mandatory Documentation:** Automated generation of `PRD.md`, `ERD.md`, and `DOKUMENTASI.md` for new projects before code execution.
5. **Deterministic Token Optimization:** KV-cache prefix locking and selective subagent context slicing.

## Skill Domains

`vibes-plug` provides 159 specialized skills in [`skills/`](./skills/). Key domains include:

| Domain | Key Skills |
|---|---|
| **AI & Agentic Swarms** | [`ai-llm-integration-expert`](./skills/ai-llm-integration-expert/SKILL.md), [`mcp-server-architect`](./skills/mcp-server-architect/SKILL.md), [`multi-agent-orchestration`](./skills/multi-agent-orchestration/SKILL.md), [`vector-db-rag-expert`](./skills/vector-db-rag-expert/SKILL.md), [`pydantic-ai-expert`](./skills/pydantic-ai-expert/SKILL.md), [`deep-research-analyst`](./skills/deep-research-analyst/SKILL.md) |
| **Frontend & UI/UX** | [`senior-frontend`](./skills/senior-frontend/SKILL.md), [`tailwind-expert`](./skills/tailwind-expert/SKILL.md), [`design-system-architect`](./skills/design-system-architect/SKILL.md), [`ui-ux-pro-max`](./skills/ui-ux-pro-max/SKILL.md), [`modern-css-native-expert`](./skills/modern-css-native-expert/SKILL.md), [`svg-animation-motion-expert`](./skills/svg-animation-motion-expert/SKILL.md) |
| **Backend & APIs** | [`js-backend-expert`](./skills/js-backend-expert/SKILL.md), [`python-programming-expert`](./skills/python-programming-expert/SKILL.md), [`go-programming-expert`](./skills/go-programming-expert/SKILL.md), [`rust-programming-expert`](./skills/rust-programming-expert/SKILL.md), [`api-design-expert`](./skills/api-design-expert/SKILL.md), [`graphql-apollo-expert`](./skills/graphql-apollo-expert/SKILL.md) |
| **Databases & Data** | [`database-orm-expert`](./skills/database-orm-expert/SKILL.md), [`supabase-security-expert`](./skills/supabase-security-expert/SKILL.md), [`data-pipeline-etl-expert`](./skills/data-pipeline-etl-expert/SKILL.md), [`search-engine-expert`](./skills/search-engine-expert/SKILL.md) |
| **SaaS & FinTech** | [`saas-architect`](./skills/saas-architect/SKILL.md), [`saas-billing`](./skills/saas-billing/SKILL.md), [`doku-payment-gateway`](./skills/doku-payment-gateway/SKILL.md), [`payment-gateway-expert`](./skills/payment-gateway-expert/SKILL.md), [`saas-multi-tenant`](./skills/saas-multi-tenant/SKILL.md) |
| **Testing & Hardening** | [`e2e-testing-expert`](./skills/e2e-testing-expert/SKILL.md), [`autonomous-tdd-debugger`](./skills/autonomous-tdd-debugger/SKILL.md), [`autonomous-red-teamer`](./skills/autonomous-red-teamer/SKILL.md), [`production-ready-hardener`](./skills/production-ready-hardener/SKILL.md), [`anti-slop`](./skills/anti-slop/SKILL.md), [`zero-tech-debt-auditor`](./skills/zero-tech-debt-auditor/SKILL.md) |
| **Mobile & Desktop** | [`mobile-expo-expert`](./skills/mobile-expo-expert/SKILL.md), [`desktop-electron-expert`](./skills/desktop-electron-expert/SKILL.md), [`tauri-expert`](./skills/tauri-expert/SKILL.md), [`pwa-offline-first-expert`](./skills/pwa-offline-first-expert/SKILL.md) |
| **Full Lifecycle** | [`brainstorming`](./skills/brainstorming/SKILL.md), [`prd-architect`](./skills/prd-architect/SKILL.md), [`zero-to-prod-orchestrator`](./skills/zero-to-prod-orchestrator/SKILL.md), [`session-memory-manager`](./skills/session-memory-manager/SKILL.md) |

## License

MIT © [Roedy Rustam](https://github.com/roedyrustam)
