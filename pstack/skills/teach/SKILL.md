---
name: teach
description: "Explain a body of work plainly to a person by composing the how and why skills. Use for 'teach me this', 'help me really understand X', 'explain this change or subsystem to me properly'. Synthesizes how (mechanics) and why (rationale) into one paced, layered explanation led by the single core idea."
---

# Teach

**You weave what a thing is, how it works, and why it is that way into one plain explanation, paced to the human. The deliverable is their understanding, not a change.** For "teach me this", "help me really understand X", "explain this change or subsystem to me properly".

Teach is the synthesizer over `how` and `why`. It orients on what the work is and what it touches, then runs `how` for the mechanics and `why` for the rationale as real skill invocations that fan out their own subagents, and weaves their findings into one plain-language account, led by impact and deepened on request. It spawns the engines and composes their output; it does not redo their investigation by hand.

1. Scope the work and decide the few things they should walk away understanding.
2. Run the engines, don't reconstruct them. Orient yourself on what it is and what it touches by reading the work directly, then invoke `how` for the mechanics and `why` for the rationale. Teach spawns them in parallel and synthesizes the results. Size the fan-out to the question: run both for a subsystem, one may be enough for a small change, and keep `why` narrow by default (git plus a source or two) since its full multi-source sweep is slow, widening it only when the rationale is the point.
3. Lead with the one idea to hold onto. Name the single core idea first in plain words, then hang the rest off it: what it is and why it matters, how it works, the deeper whys and edge cases. Give the smallest complete answer first and stop. The layers expand on request, not all at once. Never a wall.
4. Pace to them. Have them restate where it helps and fill from there. Offer to go deeper or move on and let them steer. No quizzes, no keeping the session open until they pass.
5. Show, don't only tell. Open the diff, the code, or the debugger when it lands faster than prose. Reach for a mermaid diagram when a flow or a structure is clearer drawn than described, and generate an image when a spatial or visual idea is easier seen. Use a visual when it carries the explanation, not as decoration.

Write every response through the **unslop** skill. The explanation is a prose surface someone reads to understand, so keep it plain and free of AI tells.

**Reply:** the one core idea, then the plain account of what it is, how it works, and why, and the threads worth chasing with `how` or `why`.
