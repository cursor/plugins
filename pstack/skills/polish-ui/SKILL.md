---
name: polish-ui
description: "Restyle a page or product screen so it looks quiet and intentional instead of AI-generated. Use for /polish-ui, or when asked to polish, redesign, or remove the generated look from an interface."
disable-model-invocation: true
---

# Polish UI

Restyle an interface so it reads as one deliberate design, not a stack of generated defaults. Keep each screen's purpose and behavior. Change how it looks and moves, not what it does.

## Find the reference

Look for the project's own visual source first: a landing page, a brand guide, design tokens, a design system, or a screen the user names as the one to match. When one exists, study it rendered and in motion, then carry its palette, type, spacing, and timing into the screens you restyle. Do not invent a second look beside it.

When there is no reference, write one short direction before editing: who the product serves, the one feeling it should give, and the palette, type, and motion that follow from that. The rules below fill any gap the reference leaves open.

## The template

- **First view:** one quiet composition. Small wordmark and sparse navigation, a short eyebrow, a large statement, one plain line of support, one primary action, and one carefully drawn object specific to the subject. Avoid a collage of cards.
- **Atmosphere:** build the background from broad, low-contrast gradients and, if it suits the product, faint grain. It is present on first paint and never flashes in.
- **Arrival:** choreograph one sequence. Navigation settles, the heading reveals, support and action follow, then the main image resolves. Use roughly 500–700 ms per stage with small staggers. Do not replay it on ordinary interaction.
- **Page rhythm:** alternate open light sections with an occasional deep-toned one. Give each section a clear heading, room to breathe, and one piece of evidence or product imagery. Hairline rows often beat a grid of feature cards.
- **Scroll:** reveal each section once with a 12–16 px rise and a fade. For a sequential workflow, let one sticky panel update as each step enters view. On mobile, put that panel's content under each step.
- **Touch response:** links draw a fine underline. Buttons darken slightly, lift 1 px, and move an arrow 3 px. Keep transitions at 180–260 ms. Any ambient motion is very slow and almost imperceptible.
- **Motion discipline:** animate only transform, opacity, and filter. Use one easing curve throughout, such as `cubic-bezier(0.2, 0.8, 0.2, 1)`. Under `prefers-reduced-motion`, show every element in its final state.

## Visual system

- **Color:** one light background with a slightly deeper variant, and a dark ink tinted toward the palette, never pure black. One restrained accent for the primary action, the active state, and a few links. Keep warning, error, and success colors semantic. Define every color once as a shared token.
- **Type:** at most two families, one for headings and prominent figures and one for body and controls, at weights 400–500. Use monospace only for IDs, timestamps, and code. Give every number tabular figures.
- **Surfaces:** flat or near-flat cards with 1 px hairline borders at low opacity, and little or no shadow. Controls take about 5 px corners and cards about 8–12 px. Use pill shapes only for status tokens.
- **Spacing:** generous margins and a clear type scale. Marketing pages can breathe. Work queues, tables, and forms stay compact enough to scan. One focal point per view.
- **Product screens:** bring the colors, type, borders, and touch response into dashboards and queues. Keep the full hero and scroll story for marketing and onboarding, not for every work screen, and never hide useful controls to make room for it.

## Copy and interaction

- Write in sentence case with short declarative phrases, in the product's own vocabulary. Say what changed, why it matters, and where the evidence comes from.
- Keep figures, states, and evidence legible. A state such as approved or failed must be clear without relying on color.
- Preserve keyboard focus, contrast, responsive layout, and existing behavior while restyling.

## Remove the tells

Remove gradient text, purple glow, glass panels, oversized pills, heavy shadows, generic three-card feature rows, floating dashboard collages, decorative icons, emoji, animated decoration, and vague claims such as "transform", "supercharge", or "unlock". Do not add an element only to fill space.

## Workflow

1. Name the one thing the user of the screen should understand or do.
2. Find the reference, or write the direction above. Note composition, atmosphere, and timing before editing.
3. Apply color and type through shared tokens and components first, then adjust each page's composition.
4. Render desktop and mobile views. Check alignment, wrapping, contrast, focus, scroll, and density.
5. Run the relevant build or tests. Report what changed and any visual or functional limit left.

A good pass looks quieter and more intentional, and makes the underlying work easier to understand.
