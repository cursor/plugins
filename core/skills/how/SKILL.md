---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
---

# How

Explore the codebase to answer "how does X work?" questions. Produce architectural explanations at the level of a senior engineer onboarding onto a subsystem, enough to build a working mental model, not so much that it reads like annotated source code.

Resolve each delegate's role through `.pstack/models.md` and `runtime/roles.md`. A missing role line uses its class default. `auto`, `inherit-parent`, and `inherit` leave the model and effort unset. If the host rejects a configured model, use a confirmed available class default and report the substitution. When the host supports model families, prefer the same family. Never treat an inheritance alias as a rejected identifier.

## Step 1. Assess Complexity

If the scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple** (a single module, a small utility, a narrow question such as "how does function X work"): no explorers. One explainer explores and explains in a single pass. Go to Step 2b.
- **Complex** (a subsystem spanning multiple files or services, a cross-cutting feature, a full architectural overview): spawn parallel explorers first, then hand off to the explainer. Go to Step 2a.

When in doubt, take the simple path.

## Step 2a. Explore (complex questions only)

Decompose the question into 2 to 4 exploration angles, each a distinct slice of the subsystem. Spawn all explorers in a single message:

- `role`: `pstack-reviewer` (read-only delegate)
- `model`: the `how-explorer` line, default the `fast` class
- `access`: `read`

Each explorer gets the prompt in `references/explorer-prompt.md` with its angle filled in. Then go to Step 3.

## Step 2b. Direct Explain (simple questions)

Spawn one delegate that explores and explains in one pass:

- `role`: `pstack-reviewer` (read-only delegate)
- `model`: the `how-explainer` line, default the `deep` class
- `access`: `read`

Build its prompt from `references/explainer-prompt.md` without the explorer-findings section. Go to Step 4.

## Without delegation

No delegate available. Do not skip the exploration and do not answer from memory. Keep the Step 1
split. A simple question is one explore-and-explain pass, written to a file, then presented.
A complex question takes the same 2 to 4 angles from Step 2a, worked **one at a time**, writing each angle's findings to its own file
before starting the next, so a later angle cannot quietly reshape an earlier one. Then read all of
them together and write the explanation from the files. The angles are the mechanism here, not the
parallelism, so a serial run loses wall-clock and very little else.

## Step 3. Synthesize (complex questions only)

Once all explorers have returned, spawn one delegate to synthesize their findings into one explanation:

- `role`: `pstack-reviewer` (read-only delegate)
- `model`: the `how-explainer` line, default the `deep` class
- `access`: `read`

Build its prompt from `references/explainer-prompt.md` with every explorer's findings filled in.

## Step 4. Present

Present the explainer's output to the user. Light edits for clarity or context from the conversation are fine. Do not substantially rewrite it.

## Output Format

The explanation uses the sections defined in `references/explainer-prompt.md`, dropping any that do not apply: Overview, Key Concepts, How It Works, Where Things Live, Gotchas.
