---
name: rubber-duck
description: Get a constructive second opinion on the current plan, changes, or tests from a contrasting-model critic.
---

# /rubber-duck

Consult the rubber-duck critic. Follow the `rubber-duck` skill: package intent + artifact, spawn the read-only `rubber-duck` agent on a contrasting model, then act on Blocking / Non-blocking / Suggestions.

## Usage

```
/rubber-duck
/rubber-duck <optional focus question>
```

## Examples

```
/rubber-duck
/rubber-duck What edge cases are missing?
/rubber-duck Critique the plan before I implement
/rubber-duck Are these tests sufficient for the original request?
```

## Notes

- Natural language also works: "Rubber duck your plan" or "Get a critique of the changes so far."
- The critic does not edit files; you decide what to change.
- Skip this for trivial one-line fixes.
