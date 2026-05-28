---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Can critique architecture. Use why for motivation."
---

# How

Explore the codebase to answer "how does X work?" questions. Produce clear architectural explanations at the level of a senior engineer onboarding onto a subsystem, enough to build a working mental model, not so much that it reads like annotated source code.

Two modes:

1. **Explain** (default). Explore the codebase and produce a clear explanation
2. **Critique.** Explain first, then spawn multiple models to independently identify architectural issues

## Explain Mode

### Step 1. Understand the Question and Assess Complexity

Parse what the user is asking about. They might say:

- "How does the rate limiter work?", a subsystem
- "How do we handle billing for on-demand usage?", a feature flow
- "How is the auth service structured?", an architectural overview
- "Walk me through what happens when a user submits a form", a runtime trace

Identify the scope. If it's ambiguous, make your best guess and state your interpretation before exploring. Don't ask. Explore and let the user redirect if you're off.

**Assess complexity to decide the approach:**

- **Simple** (a single module, a small utility, a narrow question like "how does function X work"): Skip explorer agents entirely. The explainer agent explores and explains in a single pass. Go directly to Step 2b.
- **Complex** (a subsystem spanning multiple files/services, a cross-cutting feature, a full architectural overview): Spawn parallel explorer agents first, then hand off to the explainer. Go to Step 2a.

When in doubt, lean toward the simple path. You can always spawn explorers if the explainer hits a wall.

### Step 2a. Explore (complex questions only)

Decompose the question into 2-4 parallel exploration angles. Each angle should cover a distinct slice of the subsystem so the explorers aren't duplicating work. For example, if the question is "how does the rate limiter work?", you might split into:

- Explorer 1: the data model and state management
- Explorer 2: the request path and enforcement
- Explorer 3: the configuration and metrics infrastructure

The right decomposition depends on the question. Use your judgment. For narrow questions, 2 explorers is fine. For broad subsystems, use up to 4.

Spawn all explorers in a single message:

- `subagent_type`: `generalPurpose`
- `model`: `composer-2.5-fast`
- `readonly`: `true`

Each explorer gets the same base prompt from `references/explorer-prompt.md`, plus a specific exploration angle telling it which slice to focus on. Each explorer should:
- Start broad: Glob for relevant directories, Grep for key types/interfaces/class names
- Follow the thread: once you find an entry point, trace the call chain: callers, callees, data flow, type definitions
- Read the actual code, don't guess from file names
- Stop when you can describe the full path from input to output (or from trigger to effect) without hand-waving any step
- Note things that are surprising, non-obvious, or that a newcomer would get wrong

Each explorer returns structured findings: the components it found, the flow it traced, the files it read, and anything non-obvious. Overlap between explorers is fine. The explainer will reconcile.

Then proceed to Step 3.

### Step 2b. Direct Explain (simple questions)

Spawn a single Task subagent that explores and explains in one pass:

- `subagent_type`: `generalPurpose`
- `model`: `claude-opus-4-8-thinking-xhigh`
- `readonly`: `true`

This agent does its own exploration (Glob, Grep, Read) and writes the explanation directly. Read `references/explainer-prompt.md` for the communication style and output format. The agent follows the same structure, it just doesn't have explorer findings as input.

Proceed to Step 4.

### Step 3. Synthesize (complex questions only)

Once all explorers have returned, spawn a single Task subagent to synthesize their findings into one coherent explanation:

- `subagent_type`: `generalPurpose`
- `model`: `claude-opus-4-8-thinking-xhigh`
- `readonly`: `true`

The explainer gets all explorers' findings and writes the human-facing explanation (see output format below). Read `references/explainer-prompt.md` for the full prompt template. The explainer reconciles overlapping findings, resolves contradictions, and weaves the separate slices into a unified picture.

### Step 4. Present

Take the explainer's output and present it to the user. You may lightly edit for clarity or add context from the conversation, but don't substantially rewrite. The explainer agent's communication is the product.

### Output Format

The explanation should follow this structure, but adapt it to what makes sense for the question. Not every section is needed for every question.

**Overview.** 1-2 paragraphs. What is this thing, what does it do, why does it exist. Someone should be able to read this and decide whether they need to keep reading.

**Key Concepts.** The important types, services, or abstractions. Brief definition of each, not exhaustive, just the ones needed to understand the rest.

**How It Works.** The core of the explanation. Walk through the flow: what triggers it, what happens step by step, where does data go, what are the decision points. Use prose, not pseudocode. Reference specific files and functions so the reader can go look, but don't dump code blocks unless a specific snippet is genuinely necessary to understand the point.

**Where Things Live.** A brief map of the relevant files/directories. Not every file, just the ones someone would need to find to start working in this area.

**Gotchas.** Things that are non-obvious, surprising, or that would trip someone up. Historical context that explains why something looks weird. Known sharp edges.

## Critique Mode

Triggered when the user asks for architectural issues, problems, or improvements, not just understanding.

### Step 1. Explain First

Run the full explain flow above (Steps 1-4). You need to understand the architecture before you can critique it.

### Step 2. Spawn Critics

After the explanation is complete, spawn architectural critics. Launch all in a single message:

| Subagent | Model |
|----------|-------|
| Critic A | `claude-opus-4-8-thinking-xhigh` |
| Critic B | `gpt-5.3-codex-high-fast` |
| Critic C | `gpt-5.5-high-fast` |

For each critic:
- `subagent_type`: `generalPurpose`
- `model`: the model from the table. These are minimum reasoning levels. The lead should escalate any model when the architecture warrants deeper analysis.
- `readonly`: `true`

Read `references/critic-prompt.md` for the prompt template. Each critic gets:
1. The explanation from Step 1 (so they don't waste time re-exploring)
2. The relevant file paths (so they can read the actual code)
3. The architectural critique rubric from `references/critique-rubric.md`

### Step 3. Lead Judgment

Same framework as the interrogate skill. You're a pragmatic lead, not an aggregator.

Categorize findings:
- **Act on.** Architectural problems worth fixing now
- **Consider.** Real concerns, but the cost/benefit is unclear
- **Noted.** Valid observations, low priority
- **Dismissed.** Wrong, missing context, or style preference

Present the explanation first (from Step 1), then the critique verdict below it. The explanation should stand on its own. Someone who just wants to understand the system shouldn't have to wade through critique.
