---
name: ralph-loop-help
description: Explain the Ralph Loop plugin, how it works, and available skills. Use when the user asks for help with ralph loop, wants to understand the technique, or needs usage examples.
---

# Ralph Loop Help

## Trigger

The user asks what Ralph Loop is, how it works, or needs usage guidance.

## What to Explain

### What is Ralph Loop?

Ralph Loop implements the Ralph Wiggum technique — an iterative development methodology based on continuous AI loops, pioneered by Geoffrey Huntley.

Core concept: the same prompt is fed to the agent repeatedly. The "self-referential" aspect comes from the agent seeing its own previous work in the files and git history, not from feeding output back as input.

Each iteration:
1. The agent receives the SAME prompt
2. Works on the task, modifying files
3. Tries to exit
4. Stop hook intercepts and feeds the same prompt again
5. The agent sees its previous work in the files
6. Iteratively improves until completion

### Starting a Ralph Loop

Tell the agent your task along with options:

```
Start a ralph loop: "Build a REST API for todos" --max-iterations 20 --completion-promise "COMPLETE"
```

Options:
- `--max-iterations N` — max iterations before auto-stop
- `--completion-promise "TEXT"` — phrase to signal completion

How it works:
1. Creates `.cursor/ralph/scratchpad.md` state file
2. Agent works on the task
3. Stop hook intercepts exit and feeds the same prompt back
4. Agent sees its previous work and iterates
5. Continues until promise detected or max iterations reached

### Cancelling a Ralph Loop

Ask the agent to cancel the ralph loop. It will remove the state file and report the iteration count.

### Completion Promises

To signal completion, the agent outputs a `<promise>` tag:

```
<promise>TASK COMPLETE</promise>
```

The stop hook looks for this specific tag. Without it (or `--max-iterations`), Ralph runs indefinitely.

### When to Use Ralph

**Good for:**
- Well-defined tasks with clear success criteria
- Tasks requiring iteration and refinement
- Iterative development with self-correction
- Greenfield projects

**Not good for:**
- Tasks requiring human judgment or design decisions
- One-shot operations
- Tasks with unclear success criteria

### Learn More

- Original technique: https://ghuntley.com/ralph/
- Ralph Orchestrator: https://github.com/mikeyobrien/ralph-orchestrator

## Output

Present the above information clearly to the user, tailored to their specific question.
