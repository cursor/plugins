All commands and relative resource paths below are relative to the owning skill directory, one level above this reference. `<PLUGIN>` is the directory containing `plugin.json`.

# slides

One deck = one HTML file built from `template.html`. The runtime (layout,
navigation bar, builds, permalinks, links) is embedded verbatim, so every
deck behaves and looks the same; you only write `<section class="slide">`s.
The result is an ordinary HTML file. Publishing is a separate user request.

## Authoring

Copy `template.html` (this directory) to `<topic>.html` in scratch and edit.
Never touch the blocks marked `data-slides` — they are the runtime.
Deck-specific CSS goes in the second `<style>`. `example.html` is a complete
deck that demonstrates every feature below; read it before a first deck.

**Content.** One claim per slide, the headline (`h2`) states it. Technical
terms follow `<PLUGIN>/references/terms-ja.md` (one form per term). 10–25
slides is normal; aim for ≤ 6 bullets or 2–4 cards per slide. Give every
slide a short `data-title` when its heading is long — it is what the TOC and
the bar show. Give a slide an `id` when other decks or slides will link to
it (`id="pricing"` → `#pricing`, stable across reordering). Put sources in
`<p class="src">` (sticks to the bottom). No filler, no invented numbers.
A thinking point is a question on one step whose answer is the next build
step; put the brief's thinking points there, one per section of slides that
makes one claim. The last content slide before `.slide.end` is a question the
reader answers unaided, not a summary.

**Layout kit** (use these, not pixel positioning, so phones reflow):
`.kicker` `.lead` `.muted` `.small` `.mono` `.num` · `.cols-2` `.cols-3`
`.cols-4` `.cols-2-1` `.cols-1-2` (collapse to one column on phones) ·
`.row` `.stack` `.fill` `.middle` `.center` · `.card` (+ `.accent` `.good`
`.warn` `.bad`) `.pill` `.callout` `ol.numbered` · `table`, `pre code`.
Slide variants: `.slide.cover`, `.slide.section` (big `.num`), `.slide.end`.
Colors are tokens (`--accent`, `--good`, `--warn`, `--bad` with `-soft`
backgrounds, `--ink`, `--muted`, `--line`, `--card`); override them in the
deck `<style>` for `:root`, the dark media query and `[data-theme="dark"]`.

**Screen fit.** The deck is designed at 1280×720 (`data-size` on `.deck`
changes it). Wide windows scale the whole stage; when that scale drops
below 0.45 (phones) the deck switches to flow mode: each slide becomes a
scrolling column at readable type sizes. Landscape screens never reflow: a
phone on its side (or a maximized deck) gets the full-bleed stage with the bar
floating over it, hidden after a moment and back on any tap. Safe-area
insets (notch, home indicator) are respected, so decks work as a
standalone PWA too. A slide whose figure is drawn in
absolute coordinates (scenes, hand-placed SVG) gets `data-fixed` and stays a
scaled 16:9 picture in flow mode. `data-flow="never"` on `.deck` forces
scaling everywhere (only for decks that are all fixed art).

**Builds (steps).** Every step is a permalink: `#5` is slide 5 before any
step, `#5.2` is slide 5 at step 2; `#pricing.2` works too. The opening
state (slide 1, no step) carries no fragment, so the plain URL is the cover. Opening such a
link lands on that state without animation.

- `data-step="k"` — appears at step k (1-based) and stays.
- `data-until="m"` — disappears after step m; `data-only="k"` = only at k.
- `data-anim="…"` — how it appears: `up` (default) `fade` `left` `right`
  `zoom` `pop` `blur`; `draw` traces an SVG stroke (add `pathLength="1"`);
  `highlight` is always visible and is emphasised while its step is current
  (table rows, list items, figure parts).
- `.dim-past` on a container fades earlier steps so the current one leads.
- `data-anim` without `data-step` = entrance animation when the slide
  opens; `style="--d:200ms"` delays it; `data-stagger` on a parent enters its
  children one after another.
- `<p data-step-pos>` prints "ステップ k / n" inside the slide.

Forward (→) animates; back (←), jumps and links show the end state at once
(transitions are skipped and one-shot CSS keyframe animations are finished;
infinite ones keep looping). The runtime's element defaults (`h2`, `p`,
`table`, …) have zero specificity, so a deck class always overrides them.
Keep builds purposeful: reveal a sequence, trace a flow, walk a table. A
slide that is read in one glance needs no steps.

**Scenes** — motion that CSS classes cannot express (counters, timelines,
simulations). Mark the slide `data-scene="name"` (usually with
`data-fixed`) and register after the runtime:

```js
YESSlides.scene('name', {
  steps: 3,             // counted into the slide's steps
  enter(ctx) {},        // slide opened; ctx.every / ctx.later loops stop when it closes
  step(ctx, k) {},      // draw state k FROM SCRATCH (k = 0..steps); idempotent
  leave(ctx) {},
});
```

`ctx.root` is the slide, `ctx.$` / `ctx.$$` query inside it, `ctx.animate`
is false on jumps (skip transitions, set the end state directly),
`ctx.later(ms, fn)` inside `step` is cancelled when the step changes and
runs on the next tick when not animating. Never keep state between calls that
`step(ctx, k)` cannot rebuild — a `#5.3` link must render the same as
pressing → three times.

**Sound (optional, off by default).** `data-sound` on `.deck` adds a 🔇
button to the bar (S toggles it). Nothing plays until the viewer turns it
on; the tap that does so creates the audio, so browsers never block it.
While on, moving forward chimes (a rising note per step, a whoosh per
slide); going back, jumps and links stay quiet. `data-sound="manual"` keeps
navigation silent and leaves every sound to the deck. The deck plays the
built-in synthesized one-shots with `YESSlides.sfx(name)` — `tap` `pop`
`step` `slide` `correct` `wrong` `xp` `levelup` `finale` — which does
nothing and returns `false` while sound is off (`YESSlides.sound` says
whether it is on). Never make sound carry meaning: a muted viewer must get
everything from the slide. Leave it out of decks for meetings and reading;
it is for playful decks such as the ドパガキ ones below.

**Links.** Use `href="#7"` or `href="#pricing.2"` within a deck. Link to
other documents with ordinary `href` URLs, or `data-page="other.html#3.2"`.
Single-page publishing hosts may not support relative documents. External
links use `target="_blank" rel="noopener"`. A host page can resolve
`data-page` itself: a `<script>` before the runtime block that defines
`window.YESHost.resolveLink(ref, hash, {framed})` returning `{href, target}`
(or `null` for the plain rules) is asked first.

**Controls** (built by the runtime, identical in every deck; `?` shows them):
→ / Space / PageDown next, ← / PageUp back, Shift+→/← skip steps, Home /
End, digits + Enter jumps, G focuses the slide number, T or ☰ opens the
TOC, R replays the slide's animation, P autoplays its steps
(`data-autoplay="ms"` on `.deck`), S toggles sound (`data-sound` decks), F or the maximize button (bottom right) maximizes
(the Fullscreen API, or filling the window where the browser has none, as on
iPhone; Esc or F again restores), horizontal swipe on touch. Decks of up to 12
slides show dots; longer decks show a slide-number input. Printing gives
one page per slide with every step shown.

## In a course (course unit)

A deck can be one unit of a `course` lesson (`{"kind": "slides", "src":
"lessons/x/deck.html"}`). Write it as an ordinary deck from the template;
`build.py unit <deck.html> --id ID --out DIR` (course calls it) keeps
the deck's own `<style>`, the `.deck` and the deck's `<script>`s and swaps in
this runtime. Inside a course the deck fits the unit's box instead of the
window, keys and swipes only reach the deck on screen, its position goes
into the course's hash (`#<unit>/5.2`), maximizing covers the outline and
ends when the learner leaves the unit or takes the next step, and the last
step shows the course's next action. Section slides become the lesson's
outline. Several decks can share the page, so in a course deck: scope CSS to
`.deck` (never `:root`; the build warns) and prefix slide ids with the
lesson id. `YESSlides.go/next/state` act on the deck last shown.

## Verify before publishing

Serve the file over http (any static server; `file://` previews may not run
scripts) and check at desktop size and at a phone size (375×812):

1. No console errors; `YESSlides.state` shows the expected slide count.
2. Walk the deck with → once: nothing clipped or overflowing in fit mode,
   each step reveals what it should, the bar shows the step pips.
3. Open two permalinks with steps (`#N.S`) directly and confirm they land on
   the same state as walking there, scenes included.
4. At phone size every non-fixed slide reads as a column and scrolls.
