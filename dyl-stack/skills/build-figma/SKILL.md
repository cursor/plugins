---
name: build-figma
description: "Use for \"/build-figma\", a figma.com/design URL with node-id, or \"implement this Figma\" into a web, desktop, or shared UI. Orchestrates Figma MCP intake, maps nodes to the repo's own design system, then a verify-this visual judge. Do not paste Figma Tailwind."
icon: paintbrush
color: magenta
# Intentionally model-invocable so agents discover it from Figma URLs.
---

# Build Figma

Orchestrator for Figma → production UI. It does **not** replace the skills below. Read each when that phase starts; do not restate them here.

**Requires** `figma` (plugin and connected MCP) and `cursor-team-kit`. Check first with [../dyl-mode/references/requirements.md](../dyl-mode/references/requirements.md). Missing → stop and tell the user to run `/add-plugin <name>`.

Failure modes that shaped the gates: [references/failure-lessons.md](references/failure-lessons.md).

## Delegate to (do not copy)

| Phase | Read |
| --- | --- |
| Figma MCP mechanics | `figma-design-to-code` from the Figma plugin, before every `get_design_context` |
| Design-system inventory | [references/design-system-discovery.md](references/design-system-discovery.md), then any repo-local design-system skill or rule it finds |
| Visual claim / verdict shape | `verify-this` from `cursor-team-kit` + [references/visual-judge.md](references/visual-judge.md) |
| Drive live UI | `control-ui` from `cursor-team-kit`, or the repo's own control skill for that surface |

## Gates

```
Build-figma progress:
- [ ] 0. Parse fileKey + nodeId (refuse file-only URLs)
- [ ] 1. Intake done before any product UI edit (see below)
- [ ] 2. Mapped to the repo's primitives/tokens only
- [ ] 3. Styling in the surface's own styling system
- [ ] 4. Visual judge VERIFIED per visual-judge.md (verify-this claim shape)
```

Gate 1 blocks coding. "Functional first, polish visuals later" is the main failure mode.

## Workflow (thin)

### 0. Parse URL

`figma.com/design/:fileKey/...?node-id=1-2` → `fileKey`, `nodeId` (`1-2` → `1:2`). Branch URLs use `branchKey` as `fileKey`. No `node-id` → stop.

### 1. Intake (blocking)

Follow `figma-design-to-code`. Call `get_design_context` and `get_screenshot`. If the response is sparse or too large, split to implementable **child** nodes. Download brand assets from MCP URLs; never redraw logos.

Run [design-system discovery](references/design-system-discovery.md). Then write `/tmp/build-figma/<slug>/intake.md`:

- Target surface, code path, and how you will drive it live.
- Node tree.
- **Metric table.** Figma px → token, or pinned value when no token matches.
- **Node → primitive map.** Each Figma node to an existing component. Mark any node with no match as new, with why.

### 2. Implement

Use the surface's styling system and the mapped components. When Figma px disagree with a primitive's default size, pin the Figma metric in that styling system. Do not bend the primitive's defaults globally. Hard bans below.

### 3. Visual judge (blocking)

Specialize `verify-this` with [references/visual-judge.md](references/visual-judge.md). Treat the Figma shot as baseline and the live capture as treatment. Match theme polarity first, then apply the rubric and write the verdict. After NOT VERIFIED, fix the failed rows, recapture, and apply the rubric again. Repeat until VERIFIED or INCONCLUSIVE. Stop and report the blocker after INCONCLUSIVE; do not claim Gate 4 complete.

### 4. Report

Intake path, map highlights, verdict + evidence paths, remaining gaps.

## Hard bans

1. Paste Figma MCP Tailwind/React as product code.
2. Invent brand assets when Figma or the repo has them.
3. "Close enough" primitive for a distinct Figma structure.
4. Trust text/button/dialog size tokens without checking Figma px.
5. Claim visual done without the judge.
6. Edit product UI before `intake.md` exists.
