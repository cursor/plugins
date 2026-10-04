# Uizze Overdrive

Adapted from Impeccable's Overdrive, pinned and credited in NOTICE and MODIFICATIONS.md. Use only for an explicit Overdrive or ambitious interaction request. This is a design workflow using the host's existing tools, not a command to download an engine.

## Choose the result before the technique

Make an existing experience unusually good in a way its users will notice. Context decides what that means. A cinematic reveal may suit a portfolio; a settings screen benefits more from clear, immediate state transitions and reliable feedback. Fix hierarchy, readability and usability before adding technical ambition.

Before implementing, propose two or three concrete directions. Each option must describe the visible result, why it fits this product, platform/browser support, performance cost, and implementation complexity. Ask for the user's choice. If the user already chose a specific effect and scope, honour that instead of reopening the decision. An unanswered choice is not approval: continue ordinary in-scope polish or stop at the proposal.

Keep the chosen enhancement focused. One well-executed interaction is usually stronger than several competing effects. Do not replace an established identity or expand product functionality under the label of polish.

## Match ambition to the surface

- **Marketing or expressive work:** a distinctive composition, product-led reveal, or shared-element transition can make the subject tangible. The offer and primary action must remain immediately understandable.
- **Functional UI:** make a dialog maintain continuity with its trigger, filters update without losing focus, or selection/reordering feel direct. Preserve predictable controls, loading, rollback and error feedback.
- **Data-heavy work:** fluid transitions can explain changes; virtualisation can make genuinely large collections usable. Keep labels, keyboard navigation and an accessible representation. Do not render fake data to suggest a capability.
- **Performance-critical work:** move demonstrably expensive computation off the main thread, reduce unnecessary work, or load only what is needed. Measure before claiming an improvement.
- **Native iOS:** use the project's native animation/navigation mechanisms. Preserve back gestures, safe areas, keyboard behavior, Dynamic Type and Reduce Motion. Web APIs are not a native implementation plan.

## Choose the smallest suitable implementation

Prefer the project's existing stack and native platform capabilities. Verify current support for the actual target browsers/devices instead of relying on this document for a compatibility matrix.

- CSS transitions, the Web Animations API or an existing motion library can handle most UI continuity. Make transitions interruptible and reversible.
- Shared-element/View Transitions or scroll-driven animation can suit navigation and storytelling when supported. Keep a functional no-enhancement path; never hide content while waiting for optional APIs.
- SVG suits geometry, diagrams and precise icons. Canvas/WebGL may suit genuinely custom, dense or spatial rendering that ordinary DOM/CSS cannot express well. Avoid a new renderer for a simple glow.
- Virtualisation suits measured large-list cost; Web Workers suit expensive computation. WASM or a new dependency needs a concrete benefit and project approval, not a preference for novelty.
- Device sensors, sound and personal data are separate permission decisions. No autoplay sound, surprise permission prompts or unrequested device access.

This changes how existing functionality feels, not what the product promises. Real-time collaboration, offline sync, new backend services, payments and authentication are separate product work. Optimistic feedback is appropriate only when the existing operation supports reliable failure recovery.

## Implement a resilient enhancement

The baseline must remain usable without the effect, with reduced motion, on touch devices, and when assets or optional capabilities fail. Preserve semantics, focus, keyboard access and content order.

Use feature detection where required. Lazy-initialise heavy resources, pause off-screen or background rendering, and clean up observers, animation loops, listeners and GPU resources when the view unmounts. Avoid layout thrashing and unbounded particle/DOM growth. Do not add a dependency or external service without authority.

Target smooth motion on representative devices; measure frame pacing and responsiveness rather than guessing from the development machine. Reduce complexity when the enhancement causes jank, battery-heavy continuous rendering, delayed input or layout shifts. A simpler implementation that stays responsive is the correct outcome.

## Verify the actual experience

Use browser automation or the native simulator/device when available. Inspect the result in motion, not only its source or a single still frame:

1. Capture the baseline and enhanced state, then exercise entry, exit, rapid repeated input and interrupted transitions.
2. Check desktop/mobile or the relevant native device classes, keyboard/touch use, reduced motion and the fallback path.
3. Inspect the approved direction: timing, easing, continuity, asset sharpness and typography should form one coherent result.
4. Batch the material fixes and repeat the affected checks. Do not call an unpreviewed effect polished.

Use four final questions: Does it fit the product? Is the experience worse when removed? Does it still work without the enhancement? Is it smooth on the devices actually tested?

If preview or device access is unavailable, keep the implementation bounded and report exactly what was and was not verified. Do not fabricate frame-rate results, user reactions, performance gains or a visual pass. Stop when the chosen result works; propose extra scope separately.
