---
name: mailtea-email-design
description: Design a beautiful, on-brand, deliverable email, newsletter or template in Mailtea. Use when an agent is about to build or restyle a Mailtea email — covers the structured block/ops path (fastest, email-safe by construction), hand-written email-safe HTML when you own the whole document, images, brand colour, and the render/QA loop. Pairs with the mailtea-email skill (which covers sending/managing) — this one covers how the email should LOOK.
---

# Mailtea email design

`mailtea-email` teaches you how to *send*. This teaches you how to make the email
*look good* — and survive real inboxes. Email is not the web: no flexbox, no CSS
variables, no web fonts you can rely on, and Outlook renders with Word.

## Choose your path first — one of these is much faster

| | **A. Ops (structured blocks)** — prefer this | **B. Hand-written HTML** |
|---|---|---|
| You write | Declarative blocks: `{kind:"heading",…}`, `{kind:"button",…}` | Tables, inline styles, media queries |
| Email-safety | **By construction.** The reducer only emits nodes that survive an inbox; it cannot produce `display:flex` | **Yours to get right** — see the contract below |
| Editing later | Surgical: address one block by path and change it | Re-emit the whole document |
| The operator | Keeps editing it as normal blocks in the Visual Email Designer | Opens as one "Custom HTML" block |
| Use for | Newsletters, broadcasts, anything an operator will touch again | Pixel-controlled transactional designs (receipts) where YOU own the whole layout |

**Default to A.** Reach for B only when you genuinely need a complete
`<!DOCTYPE html>` document. If you are doing B, skip to *The email-safe contract*.

## A. The ops path

### The loop

```
issue.create_draft  →  issue.apply_ops (compose + set_styles + set_headers)
                    →  email.lint      →  issue.preview / posts send-test
                    →  issue.apply_ops (edit_text / edit_block / arrange) to refine
```

`issue.apply_ops` takes a batch and returns a **report**: `applied`, `skipped`
(each with a reason), and — after any structural op — a fresh **outline**. Read
the report. It is the correction signal; nothing fails silently.

### Address blocks by path, from the outline

Paths are dot-joined child indexes: `0.3`, `0.12`. **Always read the outline from
the last response (or `issue.get_editor`) before addressing anything.** Never
carry paths across turns without re-reading — the tree moves when blocks are
added or removed.

```bash
mailtea call issue.get_editor --json '{"issueId":"iss_…"}'   # → outline, styles, headers
```

### Ops

| op | what it does |
|---|---|
| `compose` | Replaces the whole body. Establishes the editor's root wrapper, so paths start `0.0`, `0.1`, … and stay put. |
| `insert_blocks` | Adds blocks at `path` + `position` (`before`/`after`/`append-into`); no path = append to the end. |
| `edit_text` | Rewrites one block's copy: `{edits:[{path,text}]}`. |
| `edit_block` | Sets one block's attributes: `{path, expectType, attrs}`. |
| `set_styles` | The email's look, as flat tokens (below). |
| `arrange` | `moves` then `deletes`. Addresses resolve against the doc as it stands when this op runs, so an earlier `insert_blocks` or `arrange` in the same batch has already shifted them. Give every delete an `expectType` (`{path, expectType}`): if any address in the op is stale, the whole op is refused and nothing is deleted. |
| `set_headers` | `subject` and `previewText` (the inbox preheader). |

### Block kinds

`heading` (text, level 1-3) · `text` · `bulletList` / `numberedList` (items) ·
`quote` · `button` (label, href, alignment, variant) · `image` (src, alt,
alignment) · `divider` · `spacer` (height) · `columns` · `section` · `footer` ·
`html` · `variable` (key, fallback).

Text fields take inline markup — `**bold**`, `*italic*`, `[label](https://url)` —
and nothing else. **A `\n` inside one text block becomes a line break**; for two
visually separate lines with normal spacing, use two blocks.

### Where a block appears (`visibility`)

Any block can carry `visibility`: `all` (default), `email`, or `web`. Footers
and logos default to `email` (the site has its own); give one
`visibility: "all"` to keep it on the web page. Set it with
`edit_block` `attrs:{visibility}`, or as `visibility` on a block in `compose` or
`insert_blocks`. The outline shows it when it is not `all`. Check each version
with `issue.preview` and `channel: "email"` or `"web"`. A post where every block
is `web` has an empty email: the send is accepted, then the post is marked failed
with the reason `email_channel_empty` (in `issue.delivery_progress` and
`issue.wait_delivery`). Studio's Review warns first.

### Brand colour — `set_styles` tokens

```json
{"op":"set_styles","tokens":{
  "accentColor":"#FF6719", "linkColor":"#B23C00", "headingColor":"#1a1a1a",
  "textOnAccentColor":"#ffffff", "linkDecoration":"underline",
  "bodyFontSizePx":"18", "titleFontSizePx":"34",
  "bodyText":"#1a1a1a", "pageBackground":"#ffffff", "bodyBackground":"#ffffff",
  "fontFamily":"Georgia, 'Times New Roman', Times, serif",
  "bodyWidth":"600", "bodyPadding":"24", "pagePadding":"16",
  "bodyCornerRadius":"0", "bodyBorder":"0", "bodyBorderColor":"#e5e7eb"
}}
```

`accentColor` drives the button fill, the quote rule and section badges;
`linkColor` drives body links. **They are not the same value.** An accent chosen
to look right as a button fill is usually too light as link text — check the link
colour reaches 4.5:1 against the body background and darken it if not.

A button that was given its own colour keeps it and ignores the accent. To
recolour that one button: `edit_block` with `attrs:{buttonColor, textColor}`.

`titleFontSizePx` sets the whole heading scale — h2 and h3 derive from it, so
there is no separate token per level. Sizes are range-checked, not clamped: ask
for 9px body copy and the op is refused with the range, because a size nobody
chose is worse than an error.

**Underline your links unless something else distinguishes them.** The default
is `none` (it matches the template corpus), but colour alone fails WCAG 1.4.1 —
`"linkDecoration":"underline"` is the fix.

### Images

An image block needs an **absolute URL**, so the picture has to exist somewhere
first. Upload it — do not hot-link somebody else's host, and do not invent a URL.

```bash
mailtea assets upload --publication-id pub_123 --file ./hero.png \
  --name hero.png --width 1200 --height 452     # → JSON with the permanent `url`
mailtea assets list --publication-id pub_123    # what is already there
```

Then place it, with real alt text:

```json
{"op":"insert_blocks","path":"0.5","position":"after","blocks":[
  {"kind":"image","src":"https://…/asset_….png","alt":"What the picture shows.","alignment":"center"}]}
```

Four rules that decide whether the image works:

- **PNG or JPEG for email; 5 MB max.** GIF and WebP upload too. SVG uploads, but
  Gmail and Outlook do not show SVG images in email, so never put one in an
  email or template. The bytes are checked against the declared type, so a
  mislabelled file is rejected, not stored.
- **Size the artwork for a phone.** A 1200px-wide image lands at roughly 350px in
  a phone's mail app. Type drawn smaller than ~40px in that artwork arrives under
  12px and stops being readable. Design for the phone, then check it.
- **Never put meaning only in an image.** Many clients block images by default —
  the email must still read with them off, which is what `alt` is for.
- **Retiring an asset does not remove it from the email.** `assets delete` hides
  it from the library and the file keeps resolving (so already-sent mail stays
  intact); repoint or delete the block yourself.

### Gotchas that cost real time

- **`compose` replaces the body.** To add to an existing email use
  `insert_blocks`.
- **An HTML-backed draft cannot be addressed by ops.** `issue.get_editor` reports
  `docBacked: false` for those; `compose` first, then ops work.
- **The subject IS the issue title.** `set_headers` moves it. If an operator has
  the email open in the editor, refresh their tab after changing it.
- **Lint before you send, every time.** `email.lint` is a few seconds and it
  names the client that breaks.

## B. Hand-written HTML

### 0. Pick the surface

Mailtea has two content models. Using the wrong one is the #1 cause of "it looked
different when sent / when I opened it in the editor."

| | **Complete document** | **Newsletter fragment** |
|---|---|---|
| What it is | A whole self-contained email: `<!DOCTYPE html><html><head>…fonts/styles…</head><body>…own background/footer…</body>` | BODY content only — no `<html>`/`<head>`/`<body>`, no outer background, no footer |
| Ships via | **Transactional** — `POST /v1/emails` (html or template). Delivered **verbatim** (sanitize + tracking only). | **Newsletter/broadcast post** — `POST /v1/posts`. Mailtea **wraps it** in the publication's email shell (`<Container>` + unsubscribe footer). |
| Use for | Pixel-controlled designs, receipts, review requests, anything where YOU own the whole layout. | Regular editions where Mailtea's shell + compliant unsubscribe footer is wanted. |
| No-code editor | Opens **as one faithful "Custom HTML" block** — preview == inbox; edit the raw HTML. Block editing is intentionally NOT offered (it can't change a complete document without losing it). | Maps cleanly to editor **blocks** (text, image, button…); the shell is added at send. |

Rules of thumb:
- **A complete `<!DOCTYPE html>` document → send it transactionally.** If you post it as a
  newsletter it gets double-wrapped (a full `<html>` nested inside Mailtea's shell) and
  the sent email won't match your design.
- **Writing a newsletter post → emit a body fragment**, not a full document. Don't include
  `<html>`/`<head>`/`<body>`, your own page background, or an unsubscribe footer — Mailtea
  supplies the shell and a compliant footer. Fragments also survive the block editor.
- Either way, opening custom HTML in the no-code editor converts it into an **editable
  block-based design** (high-fidelity — tables/text/images/buttons become real blocks, the
  page background/width carry over), so operators can keep editing what you produced.

### 1. Frame (shape)

Before any HTML, decide:

- **Type** — transactional (one-shot, e.g. receipt/review-request) or marketing
  (newsletter/broadcast). Transactional leans focused + single-action; marketing
  can carry more sections.
- **One job per email.** A single primary action. Everything else is support.
- **Variables** — what's personalized (`{{first_name}}`, `{{review_url}}`,
  `{{unsubscribe_url}}`). Plan these as `{{snake_case}}` tokens now.

### 2. The email-safe contract (non-negotiable)

These aren't style preferences; break them and the layout collapses in a major client.

- **Tables, not divs, for layout.** `<table role="presentation" cellpadding="0"
  cellspacing="0">`. No `<div>` grids.
- **Inline every style** (`style="…"` on the element). `<style>` in `<head>` is
  for `@media` and `:hover` only — Gmail strips much of it.
- **Fixed width ~600px**, centered, with a `@media (max-width:620px){ width:100%
  !important }` fallback for mobile.
- **Never emit these** — Mailtea lints serialized HTML against the real
  caniemail matrix (`email.lint`), strict clients = **Apple Mail, Gmail,
  Outlook desktop**:

  | Severity | Don't use | Use instead |
  |----------|-----------|-------------|
  | **fail** (breaks) | `display:flex` / `inline-flex` | nested tables / `align`, `valign` |
  | **fail** | `position:absolute` / `fixed` | document flow only |
  | **fail** | `gap` | cell `padding` / spacer rows |
  | **fail** | `transform` | pre-positioned markup; a pre-rendered **image** for arched/rotated wordmarks |
  | **fail** | `aspect-ratio` | explicit `width`/`height` |
  | **fail** | `clamp()` | fixed px + a `@media` override |
  | **fail** | `vh` / `vw` units | `px` / `%` |
  | **fail** | `var(--…)` | literal values inline |
  | **warn** (degrades) | `box-shadow`, `*-gradient()` | flat fills; treat as enhancement only |

- **Fonts: declare a web font, always supply a system fallback.** Web fonts load
  only in Apple Mail / some clients; everywhere else the stack must still look
  intentional. `font-family:'Source Serif 4', Georgia, 'Times New Roman', serif`.
- **Logos / wordmarks → a hosted image, NOT inline `<svg>`.** Gmail and Outlook strip
  inline SVG entirely (it renders only in Apple Mail and in-app previews), so a `<textPath>`
  arched wordmark vanishes for most recipients. Pre-render it to a PNG/SVG file and reference
  it with `<img src="…" alt="…">`. (Inline SVG is also dropped when the email is opened in the
  no-code editor, for the same reason.)
- **Social / brand icons → hosted `<img>`, never icon fonts or bare glyphs.** A footer
  row of `f  𝕏  in` typed as font-glyphs or characters renders as plain text in most
  clients (no icon), looking broken. Each icon is a small hosted PNG/SVG
  `<img width height alt style="display:block;border:0">` inside its own cell — see the
  social-row recipe below.
- **Brand-critical display/poster type → a hosted image when the weight/tracking carries
  the brand.** A heavy condensed poster headline (e.g. a giant `BIG COZY`) falls back to a
  generic bold across clients and loses its punch. If the exact face matters, pre-render the
  headline to an `<img>` (as with arched wordmarks); otherwise pick the closest web-safe
  stack and accept the fallback.
- **Images** need `width`, `height`, `alt`, and `style="display:block;border:0"`.
  Don't depend on them: many clients block images by default, so the email must
  read with images off. Add a hidden **preheader** span as the first body node.
- **Dark mode**: Apple Mail/Outlook may invert. Keep the email canvas warm/light
  by design; don't rely on a dark background you didn't set.
- **Accessibility**: real text (not text-in-images), `lang` on `<html>`,
  `role="presentation"` on layout tables, ≥14px body, AA contrast.

## Design judgment (both paths)

Constraints handled — now make it *good*. Follow the publication's own brand; if
it hasn't got one written down, default to **precise, calm, recipient-faithful**.

Below is the rubric Mailtea's own email assistant is given and its eval harness
scores against, so it is the bar your email is measured at too.

<!-- BEGIN generated:design-rubric -->
<!-- Generated from @mailtea/contracts by scripts/sync-rubric-docs.mjs.
     Edit packages/contracts/src/design-rubric.ts, then run `pnpm rubric:sync`. -->

Every email you produce is scored on six dimensions, 0-4 each, 24 total. Aim for 4s.

### Hierarchy

One dominant idea leads and everything else supports it. Composition carries the reading order before a word is read: with detail blurred, the primary element, the secondary element and the major groups should still be identifiable in that order. Rhythm comes from deliberate contrast between tight and generous intervals, not one spacing value repeated until every block weighs the same. Group by proximity before reaching for a box, and give a heading more room above it than below.

4 — One unmistakable lead, groups that read in order, and an authored tight/generous rhythm.
2 — A lead exists but competes with a second element, or spacing is uniform throughout.
0 — No lead element — blocks of equal weight in an undifferentiated stack.

### Typography

Scale, weight and measure are chosen rather than inherited. Heading, body and fine print are distinguishable at a glance, and no two sizes sit close enough to be doing the same job. Body copy stays comfortable — 16px and up, with a line length in the 45-75 character range — and the family belongs to the product instead of being the closest available default.

4 — A deliberate role scale with obvious steps; body copy comfortable at every width.
2 — A workable scale with one collision, or a measure that runs long.
0 — Arbitrary or colliding sizes; body copy too small or too wide to read comfortably.

### Color

A restrained palette with roles, not a bag of swatches: a background, a surface, text, and one accent that owns the one action. Where the publication's design brief is present it governs — follow it strictly, and fall back to Mailtea house style only when no brief exists. The strongest color earns a deliberate region or role; spending it on decoration leaves nothing to mark the thing that matters.

4 — Every color has a role, the accent is rare and lands on the action, and the brief is honoured.
2 — Mostly coherent, but a second accent or a decorative color dilutes the action.
0 — Palette sprawl or an accent scattered everywhere; a brief, if present, is contradicted.

### Accessibility

WCAG AA, measured rather than claimed. Body text clears 4.5:1 against what sits behind it and large text 3:1. Every image carries alt text that reads on its own. Headings descend without skipping a level, links are told apart by more than color, and nothing that matters exists only inside a picture.

4 — Every measured pair passes, alt text is meaningful, structure is semantic.
2 — Mostly compliant with one measurable failure — a low-contrast secondary, a missing alt.
0 — Contrast failures on body copy, images without alt text, meaning carried only by an image.

### Clarity

Copy is concrete, active-voice and sentence case, in the publication's own language. Controls name the action they perform — a label reading "Learn more" out of context names nothing. There is one obvious next action, reachable without hunting. No hype adjectives, no exclamation marks, no invented statistics or testimonials.

4 — Every line concrete, one named primary action, nothing overstated.
2 — Readable copy, but a vague control label or a second action competing with the first.
0 — Hype copy, generic labels, and no discernible next action.

### Inbox fitness

The email survives a real client. It is a body FRAGMENT — never a full document, its own page background, or an unsubscribe footer, all three of which Mailtea's shell supplies. One column at around 600px, stacking cleanly on a phone. It still reads with images off, because many clients block them by default. Subject and preview text do different jobs and neither is empty. Shell chrome and the unsubscribe footer are outside this score.

4 — Fragment, single column at inbox width, meaningful with images off, headers doing two jobs.
2 — Deliverable but off-width, or the preview text merely restates the subject.
0 — A full document, content that collapses with images off, or empty headers.

### Named failure modes

Each of these is a defect the score looks for by name. Do not produce one.

- any.hierarchy.section-sprawl (P2) — Sections that do not earn their place — six things said vaguely instead of one thing said well.
- any.hierarchy.weak-opening (P2) — No dominant opening: nothing establishes what this is before the reader has to work it out.
- any.hierarchy.unauthored-rhythm (P2) — One spacing value repeated end to end — no tight/generous contrast, so every block weighs the same and nothing groups.
- any.hierarchy.no-lead-among-peers (P2) — Several topics set at identical weight, leaving the reader to choose the lead the composition should have named.
- any.typography.body-copy-too-small (P2) — Body copy set below 16px, which reads cramped on a phone.
- any.typography.scale-collision (P2) — Heading and body sizes sit too close to carry different jobs — one size doing two jobs.
- any.color.palette-sprawl (P2) — More colors than roles — beyond a background, a surface, text and one accent.
- any.color.brief-violation (P1) — Contradicts the publication's design brief, which governs whenever one is present.
- any.a11y.low-contrast (P1) — A text/background pair below WCAG AA — 4.5:1 for body copy, 3:1 for large text.
- any.a11y.missing-alt (P1) — An image with no alt text, or alt text that does not read on its own.
- any.a11y.meaning-in-image (P1) — Copy that exists only inside a picture — it disappears when images are blocked or unreadable.
- any.clarity.hype-copy (P2) — Hype adjectives, exclamation marks, or invented statistics and testimonials.
- any.clarity.generic-cta (P2) — A control labelled "Click here" or "Learn more" — a label that names nothing out of context.
- any.clarity.no-primary-action (P1) — No obvious next action, or several competing for the same attention.
- email.inbox.full-document (P0) — Emitted a full HTML document, its own page background, or an unsubscribe footer — Mailtea's shell supplies all three, so this double-wraps.
- email.inbox.missing-headers (P1) — Subject line or preview text left empty after composing.
- email.inbox.subject-preview-echo (P2) — Preview text restates the subject instead of saying what the subject left out.
- email.inbox.body-width-off (P2) — Body width outside 480-680px, the range inboxes render predictably.
- email.inbox.image-off-collapse (P1) — The email stops making sense with images blocked, which is how many clients open it.
- email.color.accent-two-jobs (P2) — Headings drawn in the accent, so they compete with the button for the same attention.
- email.a11y.link-color-only (P2) — Body links told apart by color alone and below 3:1 against the surrounding text — WCAG 1.4.1.

<!-- END generated:design-rubric -->

### Mailtea house specifics

- **typeset** — One serif for body (`Source Serif 4`), one sans for UI/labels
  (`Space Grotesk`); `Instrument Serif` for display moments. Body 16–19px,
  line-height ~1.6–1.75, generous paragraph spacing (margin, since `gap` is out).
  Don't mix four fonts.
- **layout** — Vertical rhythm via consistent cell padding. "One column" governs the
  *outer* frame — but faithful designs often have multi-column *regions* (a 2-up product
  grid, an image-beside-text row, a card collage). Build those as nested tables with
  fixed-percentage cells (`<td width="50%">`), and add a `@media (max-width:620px)` rule
  that stacks them (`display:block;width:100%`) on mobile. Don't flatten a genuine
  side-by-side layout into a single stacked column. Let the white canvas breathe; hairline
  dividers over boxes.
- **colorize** — Near-neutral text on a warm/white canvas. Status meaning stays
  (scheduled blue, sent green, failed red). No garish gradients (and they're
  `warn`-listed anyway).
- **polish** — The last 10%: optical alignment, consistent corner radii
  (`rounded-md`/`-lg`, not pill-everything), an underlined text link with
  `text-underline-offset` instead of a heavy button when the tone is personal,
  a real signature, a complete footer (address + unsubscribe).

## Render and compare — never ship unrendered

Never ship unrendered. The loop:

1. **Lint** — run the HTML past `email.lint`; resolve every `fail`.
2. **Render with variables** — Mailtea substitutes `{{var}}` and `{{{var}}}`
   placeholders. On the **posts** path only *passed* variables are replaced, so
   pass them all; the **transactional** send path also applies a variable's
   declared `fallback_value`.
3. **See it in a real client** — `issue.preview`, a send-test to your own
   address, or open the rendered HTML in a browser.
4. **Compare to intent** — if you were given a reference, screenshot the render and
   check fidelity (wordmark, fonts, spacing, color, footer). Fix the gaps, re-render.

## Create it in Mailtea

Once it renders right, persist it as a reusable **server template** (then any
send can reference it by id + variables):

```bash
# MCP (no code): tools template.create → template.publish
# CLI:
mailtea templates create --publication-id pub_123 --name "Review request" \
  --subject "A small favor" --html "$(cat email.html)"
mailtea templates publish <template-id> --publication-id pub_123

# Use it (substitutes server-side):
mailtea posts create --publication-id pub_123 --subject "A small favor" \
  --template-id <template-id> \
  --template-var first_name=Friend --template-var review_url=https://…
```

Declare each `{{variable}}` (with `type`, optional `fallback_value`) on create so
the template is self-documenting. REST equivalents: `POST /v1/templates`,
`POST /v1/templates/:id/publish?publication_id=…`, `POST /v1/posts`. For transactional
sends, pass a `template` object on `POST /v1/emails` instead — see `mailtea-email`.

## Starter skeleton (correct by construction)

A 600px card that satisfies the contract. Start here, then design into it.

```html
<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<style>
  body{margin:0;padding:0;background:#efeeec}
  table{border-collapse:collapse}
  img{border:0;line-height:100%;outline:none;text-decoration:none}
  @media (max-width:620px){.card{width:100%!important}.pad{padding-left:28px!important;padding-right:28px!important}}
</style></head>
<body>
  <span style="display:none;visibility:hidden;opacity:0;height:0;width:0;font-size:1px;color:#efeeec;">Preheader — the inbox preview line.</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efeeec">
    <tr><td align="center" style="padding:36px 16px">
      <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#fff">
        <tr><td class="pad" style="padding:48px 56px;font-family:'Source Serif 4',Georgia,serif;font-size:18px;line-height:1.72;color:#1b1b1b">
          <p style="margin:0 0 24px">Hi {{first_name}}!</p>
          <p style="margin:0 0 24px">Your message. One clear idea.</p>
          <p style="margin:0"><a href="{{cta_url}}" style="color:#1b1b1b;text-decoration:underline;text-underline-offset:3px">One clear action →</a></p>
        </td></tr>
        <tr><td align="center" class="pad" style="padding:18px 56px 48px;font-family:'Source Serif 4',Georgia,serif;font-size:13px;color:#9b9b9b">
          Your Company · City, Country<br>
          <a href="{{unsubscribe_url}}" style="color:#b4b4b4;text-decoration:none">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
```

## Recipes (copy these shapes for faithful recreations)

These are the three shapes agents most often get wrong when reproducing a real design.
All survive the email-safe lint AND the no-code editor's HTML→blocks import.

**Social icon row** — hosted images in cells, never glyphs:

```html
<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
  <td style="padding:0 8px"><a href="{{facebook_url}}"><img src="https://cdn.example.com/ic-facebook.png" width="28" height="28" alt="Facebook" style="display:block;border:0"></a></td>
  <td style="padding:0 8px"><a href="{{instagram_url}}"><img src="https://cdn.example.com/ic-instagram.png" width="28" height="28" alt="Instagram" style="display:block;border:0"></a></td>
  <!-- one <td> per icon -->
</tr></table>
```

**Two-column region** — nested table with `%` cells + a mobile stack fallback (put the
`@media` rule in `<head>`; give each column class `col`):

```html
<style>@media (max-width:620px){.col{display:block!important;width:100%!important}}</style>
…
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
  <td class="col" width="50%" valign="top" style="padding:12px">…left…</td>
  <td class="col" width="50%" valign="top" style="padding:12px">…right…</td>
</tr></table>
```

**Card with chrome** — accent bar as a colored row, outline + radius inline on the cell
(inline `border`, `border-radius`, `background` all survive the editor import; the bare
`border`/`bordercolor` HTML attributes are also honored):

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="border:1px solid #e5e7eb;border-radius:8px">
  <tr><td style="height:6px;background:#2680eb;border-radius:8px 8px 0 0;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:0"><img src="…" width="252" height="160" alt="…" style="display:block;border:0;width:100%"></td></tr>
  <tr><td style="padding:14px 16px;font-weight:600;text-decoration:underline">Card label</td></tr>
</table>
<!-- pill/badge: bg + radius + padding on an inline-block-ish cell -->
<span style="display:inline-block;padding:4px 12px;background:#111;color:#fff;border-radius:999px;font-size:12px">New</span>
```

## Don't

- Don't reach for hand-written HTML when blocks would do — the ops path is
  email-safe by construction and stays editable for the operator.
- Don't reuse a block path from an earlier turn. Re-read the outline.
- Don't put an image in without `alt`, or size its type for a desktop preview.
- Don't paste a web/marketing-page layout into an email — flex/grid/`var()` will
  collapse in Outlook and Gmail.
- Don't type social icons as font glyphs or characters — use hosted `<img>` icons.
- Don't flatten genuine side-by-side layouts into one stacked column — use a `%`-cell
  nested table with a `@media` mobile stack.
- Don't ship without rendering in a client.
- Don't leave `{{placeholders}}` unsubstituted, or a footer without an unsubscribe link.
- Don't reach for `box-shadow`/gradients/buttons by reflex; flat and typographic
  usually reads calmer and survives more clients.
