# Design-system discovery

Find what the repo already has before mapping a single node. Record every answer in `intake.md`. A mapping built on a guess at the component library is the failure this step exists to stop.

## Look for, in order

1. **Repo guidance.** `AGENTS.md`, `.cursor/rules/`, `.cursor/skills/`, and `CONTRIBUTING.md` for anything on UI, styling, design tokens, or components. A repo-local design-system, styling, or primitives skill outranks everything below. Read it in full and follow it.
2. **Target surface.** Which app or package the Figma frame belongs to. Use the ask and the Figma file name. If the repo has several UI surfaces with different styling systems, name the one you picked and why. Ask only when two surfaces are equally plausible and picking wrong means redoing the work.
3. **Component library.** The shared package or directory the surface imports primitives from (buttons, text, dialogs, icons, inputs). Note its import path and where its stories, gallery, or examples live.
4. **Tokens.** Where color, spacing, radius, and type scales are defined, and how components consume them (CSS variables, a theme object, a utility config).
5. **Styling system.** What the surface actually uses: CSS modules, a CSS-in-JS library, utility classes, plain CSS. Check lint rules that ban alternatives. Match what neighboring files in the target directory do.
6. **Icons and brand assets.** The icon set and its naming, and where logos and brand images live. Verify every icon name exists before using it.
7. **Live surface.** How to run and capture the target UI (dev server command, story, gallery page, desktop build). This is the treatment side of the visual judge.

## Output in `intake.md`

A short table: surface, code path, component library path, token source, styling system, icon source, and the command to drive it live. Every row cites the file you read it from.
