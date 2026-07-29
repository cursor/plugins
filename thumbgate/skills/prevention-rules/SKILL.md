---
name: prevention-rules
description: Generate and review prevention rules auto-promoted from repeated failure patterns.
---

# Prevention Rules

Manage prevention rules that are auto-generated from repeated failure patterns.

## When to use

- Reviewing current active prevention rules for the project
- Checking if a specific action is blocked by a prevention rule
- Understanding why an action was blocked
- Generating new prevention rules from observed patterns

## How it works

Use the `prevention_rules` MCP tool to:

1. **List rules** — View all active prevention rules with their match patterns and corrective actions.
2. **Check rules** — Test if a specific action matches any prevention rule before execution.
3. **Review rule history** — See which feedback events led to a rule's promotion.

## Example

```
Check prevention rules for "npm publish without running tests" to see if this action is blocked.
```

Prevention rules are auto-promoted when the same failure pattern appears multiple times in captured feedback. Each rule includes the original failure context and a corrective action.
