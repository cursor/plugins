### Prototype

**You own the design decision, not the code. The prototype is a throwaway instrument; the real build follows Feature.** For "prototype", "mock it up", "sketch this", "try this layout", or exploring a UI, interaction, or layout before committing.

The one playbook where the Laziness Protocol's "smallest change" and the verification bar invert. Speed over polish, code quality does not matter, no planning. The rigor is in picking the right design cheaply. Be bold: propose variations the user didn't ask for, throw an approach away and try another.

1. Scope the decision the prototype exists to make: which layout, which interaction, which density. No decision means no prototype; route to Feature.
2. Gather references when the design space is open. Search for prior art, summarize a moodboard of themes, palettes, and layouts, let the user pick directions before building. Skip when the direction is set.
3. Build throwaway in an isolated scratch dir, separate from production source. Vanilla HTML/CSS/JS or the lightest stack that renders the idea, CDN deps, a dev server with hot reload. No production framework, no tests, no abstractions.
4. When comparing alternatives, build them behind one switcher (buttons or a keypress), each variant labeled so the user can name it. This is the **exhaust-the-design-space** principle skill made cheap.
5. Verify visually on the matching surface via the control skill: screenshot each variant, drive the interaction. The eye is the test here, not an assertion.
6. Present alternatives, tradeoffs, and a recommendation. The output is the decision plus the throwaway artifact, not shippable code. Hand the chosen direction to **Feature** (or `architect` for the shape) for the real build.

**Reply:** the variants explored, screenshots, tradeoffs, your recommendation, and the scratch path. Say plainly that the prototype is throwaway.
