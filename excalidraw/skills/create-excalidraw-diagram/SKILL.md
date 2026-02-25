---
name: create-excalidraw-diagram
description: Build a production-ready `.excalidraw` scene from architecture, flow, or product requirements.
---

# Create Excalidraw diagram

## Trigger

Use when a user wants a new Excalidraw diagram from plain-language requirements.

## Required Inputs

- Diagram objective (what decision or flow it should communicate)
- Preferred diagram type (architecture, sequence, flowchart, wireframe, timeline, etc.)
- Output file path for the `.excalidraw` document
- Optional style constraints (dark/light mode, color accents, level of detail)

## Workflow

1. Convert requirements into a compact scene plan:
   - Identify containers, nodes, and edge relationships.
   - Group elements by functional area.
2. Translate the scene plan into Excalidraw elements:
   - Use clear labels and consistent spacing.
   - Keep directional flow obvious (typically left-to-right or top-to-bottom).
3. Create or update the target `.excalidraw` file as valid JSON:
   - Include required top-level keys: `type`, `version`, `source`, `elements`, `appState`, `files`.
   - Ensure `elements` includes only valid object entries.
4. Verify usability:
   - No major overlaps.
   - Labels are concise and readable.
   - Color usage is purposeful and accessible.
5. Provide a short explanation of the structure and any assumptions.

## Guardrails

- Do not wrap `.excalidraw` JSON content in markdown code fences.
- When editing an existing file, preserve existing element IDs unless replacement is intentional.
- Prefer incremental updates to full scene rewrites.
- Keep diagram scope focused on the stated objective.

## Output

- A saved `.excalidraw` file matching the requested scenario.
- A concise change summary (what was added/updated and why).
