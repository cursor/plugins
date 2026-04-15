---
name: Onboard to Codebase
description: Build a mental model of this codebase using sverklo's overview, top-PageRank files, and core memories.
arguments:
  - name: focus
    description: Optional area to focus on (e.g. 'auth', 'billing')
    required: false
---

Help a new developer get oriented in this codebase.

1. Call `sverklo_overview` to get the high-level structure: top languages, top-PageRank files, module map.
2. Call `sverklo_recall query:"architecture"` and `sverklo_recall query:"conventions"` to surface any saved invariants.
3. Pick 2-3 of the highest-PageRank source files and call `sverklo_lookup` on their main exported symbols.
4. For the most central file, call `sverklo_deps` to show its place in the import graph.

Write a concise onboarding doc (under 600 words) with:
- "Start here" — the 3-5 files to read first
- "Key abstractions" — the named concepts a new dev needs
- "Conventions" — anything from recall that affects how to write code
