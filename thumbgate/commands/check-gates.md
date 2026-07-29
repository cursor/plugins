---
name: check-gates
description: Run a Pre-Action Gate check against prevention rules before executing a risky action.
---

# Check Gates

Run a pre-action gate check to verify if a planned action is safe to execute.

## Usage

Invoke this command before performing risky operations like deployments, force pushes, or destructive file operations.

## Steps

1. Describe the action you are about to take.
2. The command queries the `prevention_rules` MCP tool to check for matching rules.
3. If a match is found, the blocked action and corrective action are displayed.
4. If no match is found, the action is cleared to proceed.

## Example

```
/check-gates git push --force origin main
```
