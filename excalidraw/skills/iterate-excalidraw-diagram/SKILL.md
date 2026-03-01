---
name: iterate-excalidraw-diagram
description: Refine an existing Excalidraw file by applying focused, reversible diagram edits.
---

# Iterate Excalidraw diagram

## Trigger

Use when a user requests improvements to an existing `.excalidraw` file (layout cleanup, labeling, regrouping, or structural changes).

## Required Inputs

- Path to the existing `.excalidraw` file
- Requested changes (add/remove nodes, reroute edges, regroup sections, styling)
- Any constraints (preserve specific IDs, keep color palette, avoid moving certain areas)

## Workflow

1. Inspect the current scene:
   - Identify target elements and related connectors.
   - Confirm unchanged areas that must be preserved.
2. Apply changes incrementally:
   - Modify only relevant elements.
   - Keep IDs stable for untouched elements.
3. Rebalance the layout:
   - Resolve overlaps and crossing connectors when practical.
   - Maintain consistent spacing and readable labels.
4. Validate final JSON structure and scene integrity.
5. Summarize exactly what changed and what was intentionally preserved.

## Guardrails

- Preserve semantic flow unless the user explicitly requests re-architecture.
- Avoid deleting elements that may be referenced by connectors without replacement.
- Keep edits reversible and easy to review in version control.

## Output

- Updated `.excalidraw` file with targeted improvements.
- Brief delta summary highlighting changed sections and rationale.
