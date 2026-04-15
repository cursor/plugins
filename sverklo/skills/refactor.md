---
name: Plan Safe Refactor
description: Analyze blast radius and plan a safe refactor using impact analysis, references, and test mapping.
arguments:
  - name: symbol
    description: The symbol to refactor (function, class, or type name)
    required: true
---

Plan a safe refactor for the symbol `{{symbol}}`:

1. Call `sverklo_impact symbol:"{{symbol}}"` to see all callers and the blast radius.
2. Call `sverklo_refs symbol:"{{symbol}}"` to find every reference with exact matching.
3. Call `sverklo_deps` on the file to understand dependency context.
4. Call `sverklo_test_map` to identify which tests need updating.

Present:
- Full list of files that need changes
- Risk level for each
- Step-by-step refactor plan
- Tests to update or add
