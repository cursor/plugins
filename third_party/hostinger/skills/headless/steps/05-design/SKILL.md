---
name: headless-step-design
description: "Step 5 (design) of the Hostinger Headless flow. Derives three distinct design directions from brief.md (plus any reference sites and brand assets), lets the user pick one in a single question, checks the chosen one against the 8-point grid and WCAG 2.2 AA, designs the logo as outlined SVG (wordmark, icon mark, favicon), following any logo wish the owner gave, then writes design.md — tokens, type, logo, components, per-page composition, accessibility and imagery — as the contract the frontend implements (the framework/stack is chosen later by the frontend step). When the brief says to keep an existing look, writes design.md from that look and its own logo instead. Prepare work: runs during the provision wait and never touches the backend."
---

# headless-step-design

Turn the brief into a look the user has chosen, and write it down so the frontend can't drift from
it. **One question, three options, one spec.** The output is **files** (`design.md` plus the logo),
not a conversation: the frontend step implements `design.md`, not the chat.

**In:** `brief.md` (required), `content-model.md` (if it exists yet), reference sites and assets the
user gave. **Out:** `~/.hostinger/<domain>/design.md` and the logo files in
`~/.hostinger/<domain>/brand/`.

> ## ⚠️ Build mode: "Bring your own frontend"? This step defers to the user
> Read `brief.md` → **Build mode** first. When it is **Bring your own frontend**, the user drives the
> design — **do not generate three directions or write a prescriptive `design.md` over their project.**
> The frontend already exists (or the user vibe-codes it with you); your job is to follow *their*
> direction, not impose one. Skip Steps 1–7 below: either write nothing, or capture only what the user
> explicitly asks for (a short note of their stated colours/vibe) so the frontend step has it. The logo
> and token work here apply only when **Build mode is "Agent designs and builds"**. (This mirrors the
> frontend step's existing "existing app the user brought" handling, now generalised to any backend.)

This is **prepare work**: it runs while provision settles (see *Background provision & the instance
barrier* in the top-level `SKILL.md`). Nothing here calls the Hostinger connector or the backend.

**Keep it short.** Refine already asked about tone and look; don't ask again. The step asks the user
**one** question: either the keep/change question (Step 1 and *Keep the current look*) or the three
directions (Step 4), never both. "You decide" is a valid answer.

**Talk like a person, not a designer.** Everything the user reads describes how the site will
**look and feel**: colours by name ("hot pink, butter yellow"), lettering by feel ("big chunky
rounded headlines"), and the details they'll notice ("photos tilted like stickers on a scrapbook").
No hex codes, font names, or design jargon (palette, accent, tokens, shape language, contrast).

**Two hard rules apply to every direction, however loud or quiet it is:**

- **The 8-point grid.** Every spacing, sizing and layout value is a multiple of 8 px (details in
  5.2).
- **WCAG 2.2 Level AA.** Colour, focus, motion, target size and reflow are decided here, so the
  frontend can't build them wrong (details in 5.1 and 5.3).

These rules are for you, not the user. **Never mention them**: no grid, contrast, WCAG or
accessibility talk in anything the user reads, and no "all options follow…" reassurances. The user
judges the look in the preview; the rules just make sure it works.

---

## Step 1 — Read the workspace, then the resume check

Read `brief.md`, `state.json`, and `content-model.md` if it exists.

- **`design.md` already exists and this is not a redesign** → don't overwrite it. Describe the
  current look in two or three plain sentences and ask: *keep it, or change something?* That is this
  step's one question.
  - **Keep** → leave the file alone and go straight to the `state.json` update at the end of Step 7.
  - **Change** → edit only what they asked for, re-run the 5.x checks on what changed, then save.
- **The site is already deployed** (`deploy.json` exists, or `state.json` has `deployed_at`) and the
  user asked for a different look → this is a **redesign**. Tell them plainly: their content stays
  as it is, only the look changes, and they'll see a preview before it goes live. Then run Steps 2–7
  as normal. The current `design.md` becomes one more signal in Step 2, so carry over what the user
  wants to keep and move away from the rest.
- **The brief says to keep the current look** (*Design direction* says so in the owner's words:
  "keep the look we have", "same look, new platform") → follow *Keep the current look* below instead
  of Steps 2–6. No three directions and no new logo. A live site, screenshots or a brand guide alone
  are signals for Step 2, not a request to keep.

### Keep the current look

1. **Read the look from what the brief points at.** A live site: use Step 2's reference-site method
   (computed fonts, colours by painted area, the feel), but this site is the owner's own, so take its
   logo file as it is (the header `<img>` or inline `<svg>`, plus its favicon if it has one) and save
   it unchanged in `brand/`. Screenshots or a brand guide: read the colours and lettering from them;
   a logo seen only in a screenshot counts as no logo file, so list "logo file needed" under gaps in
   the final report. Files or exact colours and fonts the owner supplied win over anything you read.
2. **Confirm in one question.** Describe the kept look in two plain sentences and ask: *keep it, or
   change something?* "Keep the look we have" still gets this question; skip it only when the brief
   says to change nothing at all ("keep it exactly as it is"). A skipped tool result is not Keep; see
   *When you ask the user* in the top-level `SKILL.md`. Change →
   apply only what they asked for; a request for a new logo runs Step 6 for the logo alone.
3. **Check it** as in Step 5. The kept colours are fixed like brand colours: a pair that fails gets a
   shade of the same hue in that role only. Spacing moves to the nearest grid value, and a font
   without an `@fontsource` package swaps to the closest one that resolves (5.4).
4. **Logo.** Reuse the existing logo and favicon unchanged; never redraw or recolour them. With no
   existing logo, the header shows the site name as text in the kept display font, and no logo is
   designed.
5. **Write `design.md`** (Step 7) from the kept look, then hand off as usual. In **Logo**:
   - *Files* and *Use* name the files as saved (a `.png` stays a `.png`), or say "No favicon kept".
   - *Built from* says "Kept, not rebuilt". *Measured* still gives the width at `--logo-h-sm`
     (≤ 192 px; else lower `--logo-h-sm` or show the name as text on small screens), and the header
     link has `alt` = the site name and a target of at least 24 px (as in Step 6).
   - With no logo: *Files* says "None", *Use* says the header link holds the site name as text in
     `--font-display` and the browser's default favicon stays, and the *Don't* line is dropped.

## Step 2 — Collect the signals

Before inventing anything, gather what already constrains the design:

| Signal | Where | How it constrains |
|---|---|---|
| Tone, purpose, audience | `brief.md` → *Tone*, *Purpose*, *Audience* | Sets the mood all three directions must fit |
| Brand assets | `brief.md` → *Assets* | Logo, brand colours and fonts are **fixed** in every direction. Never recolour a supplied logo; Step 6 uses it instead of designing one |
| Pages and entities | `content-model.md` → *Navigation*, *Pages*, *Articles*; if it doesn't exist yet, `brief.md` → *Pages* | Drives the component inventory and page composition |
| Reference sites | URLs in the brief or the conversation | Cues to borrow (see below) |
| Images already sourced | `content-model.md` → the image lines under *Articles* (skip if none yet) | Glance at a few at small size; keep accents from clashing with their dominant colours |
| Current design (redesign only) | existing `design.md` | What to keep, what to move away from |

**Reference sites.** Open each one in a real browser if you have one. Static fetches are often
blocked or rate-limited; without a browser, fetch the HTML and its linked CSS instead. If neither
works, say so in one line and continue from the brief alone. Pull **cues**:

- **Fonts:** the computed `font-family` of `h1`/`h2` and of body `p`.
- **Colours:** background colours weighted by painted area (element width × height), the top 5–8.
  Skip transparent and semi-transparent backgrounds and overlays (cookie banners, modals, chat
  widgets). Text colours come from headings, paragraphs and links.
- **Feel:** look at the first screen and one further down (screenshots shown to you, not saved in
  the workspace) and note what creates the feel: type weight, colour blocking, shapes, density.

**Borrow cues, never assets** (the owner's own site under *Keep the current look* is the exception).
Don't use its logo, copy, images or exact layout. **The brief wins** over the live site when they
disagree (the user's words are what they want). Note the mismatch in the direction.

**Brand colours that fail contrast** are still fixed, but only in roles where they pass. A pale brand
yellow can be a background band or a large decorative shape, never body text. Say so in the
direction.

## Step 3 — Derive three directions

Write three directions that **all fit the brief** but are **genuinely different**. Vary at least two
of: palette (temperature, saturation, light vs. dark), type personality (geometric, grotesk, serif,
display), and shape language (sharp vs. round, flat vs. outlined, airy vs. dense). Three shades of
one idea is not a choice. Neither is a wildcard that ignores the brief.

Order them: **A is the recommendation**, the closest reading of the brief and references. B and C
push in different directions.

Each direction carries exactly this:

- **Name** — 2–3 evocative words ("Sticker-book maximal", "Quiet gallery").
- **Mood** — one line on how the site feels.
- **Palette** — 5–7 hex colours with roles (base, text, primary accent, secondary accents, surface).
  These are the core colours the user sees; Step 5 may add derived shades (link, muted, error,
  focus) as tokens.
- **Type** — a display font and a body font, both self-hostable through `@fontsource`.
- **Shape language** — corners, borders, shadows and density in one phrase ("chunky 3 px ink
  outlines, hard 8 px offset shadows, tilted cards").
- **Signature element** — the one memorable move (a scrolling marquee, stickers, oversized numerals,
  a duotone photo treatment). If it moves on its own, it gets a pause control (5.3).
- **Logo idea** — one line on how the name becomes a logo, using a move from Step 6 ("letters
  bounce in different colours and the O is a smiley"). When the brief carries a logo wish (*Design
  direction* or *Assets*), every direction's logo idea is that wish in its own style. A wish is words
  describing a logo; a logo file in *Assets* is a supplied logo and wins (Step 6).

**Only offer what can pass.** Before asking, run two quick gates on **all three**:

1. **Contrast gate.** Every colour that will carry text (base, surfaces, and any accent used as a
   text block) has a palette text colour reaching **4.5:1** on it. Two text colours are fine (dark on
   light blocks, light on dark ones). Accents that only ever hold large text need 3:1.
2. **Font gate.** Each font resolves on npm, and the display font also has a static `@fontsource`
   package, because the logo is built from it (5.4).

A direction that fails either gate gets adjusted, not offered as-is. Don't offer a look that only
works by breaking the rules, such as body text on a neon accent or a marquee that can't be stopped.
Loud is fine; inaccessible is not.

**Avoid the template look** unless the brief asks for neutral: Inter or Roboto everywhere, a
blue-to-purple gradient hero, centred hero with three feature cards, grey cards on white. Every
direction should look like *this* site, not a starter theme.

## Step 4 — Ask once

Ask **one** question, with A marked as the recommendation. With a structured question UI (multiple
choice plus an "other" field), each option's **label** is the direction's name and its
**description** is one or two plain sentences, under ~160 characters. Without one, write each
option as one line in the same shape.

The description says what the site would feel like, the main colours by name, what the lettering
is like, the logo idea, and the one detail they'll remember. Hex codes and font names stay in your
notes. The question may end with one plain clause saying they can add a logo idea to their pick, but
never suggest one or give an example: that idea would end up in the logo.

> **Sticker-book maximal** — Loud and playful, like a scrapbook: candy pink, butter yellow and lilac,
> chunky headlines, tilted sticker photos and a bouncy logo with a smiley O.

> **Midnight disco** — A dark, glowing night-out feel: deep purple with neon pink, yellow and
> turquoise, heavy rounded headlines and a logo like a neon sign.

Then:

- **Pick** → use it as written, and confirm the look in one line.
- **"You decide"** → use A, and tell them in one line which look you went with.
- **Skipped tool result** → not an answer: write the three directions as plain lines
  and wait for the reply (see *When you ask the user* in the top-level `SKILL.md`).
- **A mix** ("A's colours with C's fonts") → merge them. Don't ask again.
- **Something else** → build a direction from what they said, run Step 5, and use it. Don't send
  three new options.

**Logo wish.** An answer can carry a logo idea next to the pick ("A, and make the logo a little
teapot"); it replaces the chosen direction's logo idea, and wins over a wish from the brief.
Whenever the logo follows a wish, from the answer or the brief, add it once to the line that confirms
the pick: *"The logo follows your idea: a little teapot."* If the kit can't draw it as said (a
detailed illustration, a photo), build its closest kit version and name what you simplified in that
same line. Don't ask a follow-up.

Don't ask about anything else in this step.

## Step 5 — Check the chosen direction

Fix any problem found here by adjusting the direction, not by asking the user. Don't report these
checks or their fixes; the user sees the result in the preview.

### 5.1 Contrast — WCAG 2.2 SC 1.4.3 and 1.4.11

**Which pairs count:** walk the component inventory you're about to write (Components table). For
each component, list every foreground/background combination in every state: default, hover,
focus, active, error. Include text on coloured bands (footer links on dark, marquee text, chips),
placeholder text and photo credits. Compute the WCAG contrast ratio for each:

| Kind | Examples | Minimum |
|---|---|---|
| Body text | paragraphs, links, footer text, input text, placeholder text, captions | **4.5:1** |
| Large text | ≥ 24 px regular, or ≥ 18.66 px (14 pt) bold | **3:1** |
| Non-text | input and button boundaries (when the outline is the only edge), focus indicator against each adjacent colour, icons that carry meaning, chip outlines | **3:1** |

A pair that fails gets a darker or lighter shade of the **same hue**; never drop a brand colour. A
new shade becomes a token (for example `--color-link` or `--color-muted`). Disabled controls and
pure decoration are exempt, but say which elements those are. **Text on photos** needs a scrim or
solid backing that gets the text to 4.5:1 against the lightest part of the image. If you can't
guarantee that, don't put text on photos. Record every pair and its ratio in `design.md`.

```js
// node -e: relative luminance + contrast ratio, hex in → ratio out
const L = h => { const c = h.match(/\w\w/g).map(x => parseInt(x, 16) / 255)
  .map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
```

### 5.2 The 8-point grid

Values are checked in px at the default 16 px root (`0.5rem` = 8 px).

| What | Rule |
|---|---|
| Spacing (padding, margin, gap) | Multiples of 8: `8 16 24 32 48 64 96 128`. **4 px** is the only half-step, and only inside small components (chip padding, icon-to-label gap) |
| Component sizes | Heights and fixed widths are multiples of 8. Buttons, nav items and inputs are **48 px** tall minimum |
| Radii | `8 16 24 32`, or `999px` for pills. 4 px only on elements under 32 px tall |
| Line heights | Fixed-size text: multiples of 8 (16/24, 18/32, 24/32), or of 4 for text ≤ 14 px (12/16, 14/20). Fluid headings (`clamp()` sizes) use a unitless line-height (1.0–1.2) and are exempt, because their line box can't stay on the grid at every size |
| Fluid spacing | `clamp()` for spacing or sizes uses grid values at both ends. Fluid **font sizes** are exempt |
| Shadow offsets | 4 or 8 multiples |
| Layout | Content width, gutters and breakpoints are multiples of 8 (e.g. `1200`, `768`, `1024`, `1280`) |
| Exempt | Border and outline widths (1–4 px), focus offset, font sizes, the `999px` pill radius, the 4-multiple line heights above, and anything that isn't a length (angles like a `-2deg` tilt, durations, opacity) |

Every value in the **Tokens** block must pass this table.

### 5.3 WCAG 2.2 AA — what the design must decide

These criteria are settled at design time. Write each answer into the **Accessibility** section of
`design.md`.

| Criterion | The design must specify |
|---|---|
| 1.4.1 Use of colour | Links in running text are underlined, not colour-only. States (active nav, selected, error) also change shape, weight or an icon, not only colour |
| 1.4.4 Resize text | Font sizes in `rem`; nothing breaks at 200 % zoom |
| 1.4.10 Reflow | Works at **320 CSS px** wide with no horizontal scroll. Every component has a stated ≤ 320 px behaviour; decorative pieces never widen the page |
| 1.4.12 Text spacing | No fixed-height boxes around text, so nothing clips when a user overrides spacing (line-height 1.5, paragraph spacing 2×, letter-spacing 0.12 em, word-spacing 0.16 em). Fixed line-height tokens are fine; clipping is not |
| 2.2.2 Pause, Stop, Hide | Anything that moves on its own for more than 5 s (marquee, carousel, animated sticker) has a **visible pause control**, and doesn't move at all under `prefers-reduced-motion`. Hover-to-pause alone doesn't count |
| 2.3.1 Three flashes | Nothing flashes more than 3 times a second |
| 2.4.7 Focus visible | One focus style (e.g. 3 px outline, 2 px offset) whose colour reaches 3:1 against **every** surface it can appear on. Name a second colour for surfaces where the first fails |
| 2.4.11 Focus not obscured *(new in 2.2)* | Sticky headers, cookie bars and chat bubbles never cover the focused element. Either the header isn't sticky, or `scroll-padding-top: var(--header-h)` |
| 2.5.8 Target size *(new in 2.2)* | Interactive targets ≥ 24 × 24 px with spacing. On this grid: **48 px** for buttons, nav and inputs, ≥ 24 px for inline icon buttons |
| 3.2.6 Consistent help *(new in 2.2)* | The contact or help link sits in the same place on every page (e.g. last nav item and footer) |
| 3.3.2 Labels | Every form field has a visible label; placeholders are never the only label |
| 1.1.1 Text alternatives | Content images get alt text describing what they show; purely decorative images and shapes get empty alt or `aria-hidden` |

### 5.4 Fonts resolve

For each family, prefer the variable package and fall back to the static one:
`npm view @fontsource-variable/<slug> version`, then `npm view @fontsource/<slug> version`. One must
answer with a version. If neither does, swap to the closest family that does. Record the exact
package names. The **display** family must also resolve as a static package
(`npm view @fontsource/<slug> version`): the static packages ship `.woff` files the logo kit can
read; the variable ones ship only `.woff2`.

## Step 6 — Design the logo

**The user supplied a logo** → copy it into `brand/` unchanged, note it in the **Logo** section, and
skip the rest of this step. Never redraw or recolour it.

Otherwise, turn the name into a **designed** logo: shaped, coloured and composed. Typing the name in
the display font with an emoji or symbol next to it doesn't count. Build the chosen direction's **logo
idea** (as replaced by any logo wish, Step 4) with one or two of these moves:

| Move | What it is | Suits |
|---|---|---|
| **Letter swap** | One letter becomes a simple shape tied to the subject: O → smiley, sun, loaf, plate, eye; I → candle, pencil, brush; A → roof, tent. Swap **one character** only, even if the letter appears twice, and the word must still read | Playful, friendly brands |
| **Bounce** | Letters tilt ±3–6° and bob off the baseline, each in a palette colour, with an ink outline and hard shadow | Loud, maximal directions |
| **Stack** | The name split over 2–3 lines on coloured tiles, or set as a tight block | Long names, bold directions |
| **Tag** | The main word large; a short second word on a pill, ribbon or tab | Two-part names ("Dopamine Den") |
| **Seal** | The name around a ring, with a monogram or symbol in the middle | A secondary mark (footer, hero sticker, social avatar), never the header logo |
| **Typographic contrast** | Weight, style or case contrast between words (a light italic word next to a heavy upright one), custom tight spacing, one shared stroke or cut between letters | Quiet, refined, editorial directions |

No emoji, clip-art, gradients, or details that vanish at small sizes. Colours come only from the
palette (base and surface colours count).

### Build it with the logo kit

The kit (`logo-kit.mjs`, next to this file) does the error-prone parts: it outlines letters into
vector paths, sets text on a circle, draws the outline-and-shadow treatment, measures, and validates
the output. You write the composition. Copy the kit into `brand/` so the build is self-contained
and a redesign can re-run it:

```bash
mkdir -p ~/.hostinger/<domain>/brand && cd ~/.hostinger/<domain>/brand
cp <the folder this SKILL.md is in>/logo-kit.mjs .
npm init -y >/dev/null && npm i opentype.js @fontsource/<display-slug>
```

Write `brand/logo-build.mjs`, import from `./logo-kit.mjs`, and always run it from `brand/`
(packages resolve from the working directory):

| Kit function | Use |
|---|---|
| `loadFont(slug, weight, style)` | Loads a static `@fontsource` weight across all its subsets (`latin`, `latin-ext`, …), so accented letters like Ė or Ł resolve; `style` is `'normal'` or `'italic'`. Throws if that weight or style isn't in the package, so pick another |
| `layout(font, text, size)` | Kerned glyph positions, total width, `capHeight`, `xHeight`; place letters one by one for bounce or swap. Throws if a character isn't in the font |
| `glyphPath(glyph, x, baselineY, size)` / `textPath(font, text, x, baselineY, size)` | Outlined path data for one letter or a whole word. For typographic contrast, load two weights or styles and set each word with `textPath` |
| `pathBox(font, text, x, baselineY, size)` | Tight box around a word's outlines; size the viewBox from it plus room for outlines, shadows and tilt |
| `arcText(font, text, { cx, cy, r, size })` | Letters around a circle, for seals |
| `sticker(d, { fill, ink, strokeWidth, shadow, shadowColor, transform })` | Ink outline + hard offset shadow, for outlined directions. On dark backgrounds give the outline and shadow a palette colour that shows (`shadowColor` defaults to `ink`) |
| `svgDoc({ width, height, title, body })` | Root SVG with `role="img"` and a `<title>` |
| `check(svg)` | Throws on `NaN`, live `<text>`, a missing title or viewBox. Run it on every file before writing |

Never call opentype's `path.toPathData()` directly; the kit's serializer exists because opentype.js
2.0 writes `NaN` into some paths, and browsers silently stop drawing at the first `NaN`.

### Deliver four files

| File | What | Must read clearly at |
|---|---|---|
| `brand/logo.svg` | The primary, mostly horizontal logo for the header | Its header display heights (desktop and small screens) |
| `brand/logo-mark.svg` | A square icon from the same idea (initial, monogram or the swapped symbol) on a solid rounded tile (corner radius ≈ ¼ of the side) in a palette colour | 32 px |
| `brand/favicon.svg` | The simplest form of the mark: same tile, no shadow, no thin details, outlines thickened if it has any | 16 px, on both light and dark browser tab bars |
| `brand/logo-build.mjs` | The script that built them, with `package.json`, kept so a redesign can adjust it | — |

Add `brand/logo-seal.svg` only if the direction uses a seal as a secondary mark. Delete
`brand/node_modules` when you're done; a redesign runs `npm i` in `brand/` first.

**Check the sizes.** Display heights are multiples of 8, with one for desktop and one for small
screens (they may be equal). Work them out from the viewBox:

- **Letter size:** letter height on screen = letter height ÷ viewBox height × display height, and it
  must be ≥ 16 px. Use `xHeight` when the logo is mostly lowercase and `capHeight` when it's mostly
  capitals; for mixed fonts, take the smaller word. A two-line lockup usually needs 64 px.
- **Headroom:** `pathBox` covers the letters, not what you add. Leave room above for accents (Ė, Ž, Å sit above cap height) and below for descenders, plus whatever bounce, tilt, outline and shadow add, so nothing touches the viewBox edge.
- **Width:** width on screen = viewBox width ÷ viewBox height × display height. At the small-screen
  height it must be **≤ 192 px**, which leaves room for the menu button in a 320 px header. If it
  doesn't fit, lower the small-screen height (letters still ≥ 16 px), simplify the logo, or show
  `logo-mark.svg` with the name beside it on small screens.
- **Look at it.** If you have a browser, render the files at both header heights, 32 px and 16 px,
  the favicon on a light and a dark background, and fix anything that reads wrong. Without a
  browser, rely on the numbers and list "logo not visually checked" under gaps in the final report.

The logo is exempt from text-contrast minimums, but the header link around it needs `alt` = the site
name and a target of at least 24 px.

Don't show the logo to the user in this step; they see it in the preview.

## Step 7 — Write `design.md` and hand off

Write `design.md` from the template below. Fill every section. The **Tokens** block is copied
verbatim into the frontend's global stylesheet, so it must be valid CSS. Every colour, font, type
size, line height, space, radius and shadow used elsewhere in the file must exist in it as a token.
The template's token list is the **minimum**: add what the design needs (`--color-error`,
`--color-on-accent`, `--leading-h3`…) under the same naming scheme.
**Breakpoints are the one exception**: CSS custom properties don't work inside `@media`, so they are
listed in *Grid, shape & motion* as plain px values.

Then update `state.json`: set `"stage": "frontend"` (also for a redesign: restyle, then validate and
deploy) and `updated_at` to the current UTC time (ISO 8601). Don't touch `provision`, `run` or
`history` (`run-log.mjs` owns those), or add other keys.

If content prepare hasn't sourced images yet, it now follows `design.md` → **Imagery** (see
`04-content-model/SKILL.md`).

## `design.md` template

````markdown
# Design — <domain>

> Direction **<name>**, selected on <YYYY-MM-DD> from three options (others offered: <B name>,
> <C name>). <"Picked by the user." | "User said 'you decide'; recommendation A used." |
> "Merged by the user: <what>."> — or, when kept: "Kept the owner's current look from <site URL |
> screenshots | brand guide>, confirmed on <YYYY-MM-DD>."

## Direction
<2–3 sentences: the mood, what it borrows from the references (and any brief/reference mismatch),
the signature element.>

## Stack
**<chosen by the frontend step>** — design doesn't decide the stack. The frontend step (06) picks and
confirms the framework (default Next.js SSR; ecommerce must be SSR) and records it in
`state.json → frontend`. Leave this as a placeholder for the frontend step to fill in.

## Tokens
```css
:root {
  /* colour — semantic names, never "--pink-2" */
  --color-base: #…;      --color-text: #…;      --color-surface: #…;    --color-muted: #…;
  --color-primary: #…;   --color-accent-1: #…;  --color-accent-2: #…;   --color-link: #…;
  --color-focus: #…;     --color-focus-alt: #…; /* for surfaces where --color-focus is < 3:1 */
  /* type */
  --font-display: '<Family> Variable', <fallback stack>;
  --font-body: '<Family> Variable', <fallback stack>;
  --text-body: …rem;   --leading-body: …rem;    /* 8-multiple in px */
  --text-small: …rem;  --leading-small: …rem;   /* 4-multiple in px */
  --text-h1: clamp(…rem, …, …rem);  --text-h2: clamp(…);  --text-h3: …rem;
  --leading-display: 1.05;          /* unitless; fluid headings are grid-exempt */
  /* 8-point grid */
  --space-half: 4px;  --space-1: 8px;   --space-2: 16px;  --space-3: 24px;  --space-4: 32px;
  --space-6: 48px;    --space-8: 64px;  --space-12: 96px; --space-16: 128px;
  --target-min: 48px;
  /* shape */
  --radius-sm: 8px;  --radius-card: …;  --radius-pill: 999px;
  --border: …;  --shadow: …;  --shadow-hover: …;
  --focus-ring: 3px solid var(--color-focus);  --focus-offset: 2px;
  /* layout */
  --content-max: …px;  /* multiple of 8 */
  --header-h: …px;     /* header band height, multiple of 8; scroll-padding-top uses it if sticky */
  --logo-h: …px;       /* header logo height on desktop, multiple of 8 */
  --logo-h-sm: …px;    /* on small screens; logo ≤ 192 px wide at this height */
}
```

## Palette roles
| Token | Hex | Used for |
|---|---|---|

## Contrast
| Foreground | Background | Kind (body text / large text / non-text) | Ratio | Needs | Passes |
|---|---|---|---|---|---|

## Type
- **Display:** <family> (`@fontsource-variable/<slug>@<version>`), weights …, tracking …; sizes `--text-h1…h3`, `--leading-display`
- **Body:** <family> (`@fontsource-variable/<slug>@<version>`); `--text-body` / `--leading-body`, measure ≤ 68ch

## Logo
- **Concept:** <the move(s), and what any swapped letter or symbol stands for, plus "From the owner:
  '<their words>'" only when it follows their wish | "Supplied by the user" | "Kept from <source>" |
  "No logo: owner kept the current look" (header shows the site name as text in `--font-display`)>
- **Built from:** `@fontsource/<display-slug>@<version>`, weight(s)/style(s) …
- **Files:** `brand/logo.svg` (header, `--logo-h` desktop / `--logo-h-sm` small screens),
  `brand/logo-mark.svg`, `brand/favicon.svg`<, `brand/logo-seal.svg`>; source `brand/logo-build.mjs`
- **Measured:** letters … px tall at `--logo-h-sm`; width … px at `--logo-h-sm`
- **Use:** the frontend copies `brand/*.svg` into `public/`. Header: `<a href="/"><img src="/logo.svg"
  alt="<Site name>" style="height: var(--logo-h)"></a>` (switch to `--logo-h-sm` on small screens).
  Favicon: `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`
- **Don't:** recolour, stretch, add effects, or retype the logo as live text.

## Grid, shape & motion
<section padding desktop/mobile (space tokens), gutters, breakpoints in px (multiples of 8), borders,
radii, shadows, hover behaviour, every animation and its pause control, and "no motion under
prefers-reduced-motion".>

## Accessibility (WCAG 2.2 AA)
- **Focus:** <style; which colour on which surface>
- **Targets:** <48 px controls; inline exceptions>
- **Links & states:** <underline rule; how active/error states differ beyond colour>
- **Motion:** <what moves, where its pause control is>
- **Sticky elements:** <none | header uses --header-h + scroll-padding-top>
- **Help:** <where the contact link sits on every page>
- **Text on images:** <none | scrim spec and resulting ratio>
- **Reflow:** <anything special at 320 px>
- **Exempt from contrast:** <disabled controls / decorative shapes, named>

## Components
| Component | Renders (from content model) | Look | ≤ 320 px |
|---|---|---|---|
| Header + nav | Navigation items | … | … |
| Post card | Article: image, category, title, excerpt | … | … |
| … | | | |

## Page composition
- **<Page>** — <sections top to bottom, each naming its component and band colour>
- …

## Imagery
<subjects, mood and colour fit for photos; search keywords; treatment (frame, crop ratio, radius,
duotone…); alt text written from what the photo shows.>

## Don'ts
- <3–6 site-specific rules, e.g. "no grey cards", "never put body text on the primary accent">
````

## Invariants

- **One question.** Refine owns discovery; this step only chooses among directions (or keeps the
  existing look).
- **8-point grid, always.** No spacing, size, radius or breakpoint off the grid except the listed
  exemptions.
- **WCAG 2.2 AA is the floor.** No direction is offered, chosen or written that fails it. Brand
  colours keep their hue but only appear in roles where they pass.
- **Brand assets are fixed.** A supplied logo, colour or font appears in every direction, unchanged.
- **A logo is designed, not typed.** Outlined SVG paths built with the logo kit, never live text,
  emoji or clip-art, and always readable at its smallest use. The one exception: a kept look with no
  logo shows the site name as text and gets no new logo.
- **Self-hosted fonts only** (`@fontsource`). No Google Fonts or other font CDN links in the output.
- **The tokens block is the only source of values** (breakpoints excepted). Components and pages
  reference tokens, never raw hex codes, pixel values or font names.
- **No backend calls.** Design never waits on provision and never writes to the instance.
- **Never overwrite an existing `design.md` silently.** Keep or change, as in Step 1.
