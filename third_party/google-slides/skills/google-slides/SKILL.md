---
name: google-slides
description: Build and edit Google Slides through the google-slides MCP tools - slides, grids of cards and columns, text boxes, shapes, images, tables, styling, layout inspection, and per-slide PNG rendering. Use when creating a deck, laying out slide elements, matching a template, or verifying how a slide looks.
---

# Google Slides authoring

Coordinates are POINTS from the slide's top-left; a standard slide is 720x405
(read_slide_layout reports the real size). Everything is addressed by
objectId from `read_presentation`. Pass `requiredRevisionId` from the latest
read or write so a concurrent edit fails the write instead of corrupting it.

## Building a new deck: compose, then look

Write each slide as a layout, not as coordinates. `compose_slide` takes a
tree (stacks, grids, cards, text, images) or an HTML/CSS subset and lays
the whole slide out in one call: equal peer sizes, even gutters, vertical
centering, and contrast pairs hold by construction, text can `fit:
"shrink"`, and the reply carries every element's box plus lints on the
plan. Per slide:

1. `add_slide` layout BLANK (or the deck's first slide with `clear: true`), then
   `compose_slide` with the SAME `theme` every time (palette roles
   background/surface/primary/textSecondary and the font family). Colors in
   the tree are roles, not hexes, so one theme change restyles a deck.
2. Read the reply's `issues`. `text_overflow` means shorten, `fit:
   "shrink"`, or give the node more `size`; an `overlap` means two nodes
   share a box (usually a row that needs `gap`).
3. `get_slide_thumbnail` (LARGE) once per slide and LOOK at it: crowding,
   dead corners, a title that reads as body text, an image fighting the
   palette. Fix by re-composing the slide (delete the old elements first,
   or compose onto a fresh BLANK slide and `delete_object` the old one).

Tree recipes (column root; the root box is the slide minus a 48 pt margin):

- Title slide: `stack column justify:center` with a `display` text and an
  `h2` subtitle in `textSecondary`, both `align:center`.
- KPI cards: `h1`, then a `stack row size:150 gap:24` of `card`s, each with
  a `caption` label (`textSecondary`) over a `kpi` value.
- Text + image: `stack row gap:32` of a `body` text (`bullets:true`,
  `size:{flex:1}`) and an `image` (`size:{flex:1}`); the image aspect-fits.
- Agenda: one `body` text with newline-separated items and `bullets:true`.

HTML form, same result: `<section style="background:#0B2A4A; padding:48pt;
gap:24pt">` with `<h1>`, `<div style="display:flex; gap:24pt; height:150pt">`
of `<article class="card"><span class="caption">…</span><span
class="kpi">…</span></article>`, `<ul><li>` bullets, `<img style="flex:1">`.
Only the documented tags and properties compile; anything else is refused
by name, never dropped.

## Editing an existing deck: place, inspect, fix, look

For decks that already have content, or elements the tree does not model:

1. `insert_grid` for any row, column, or grid of cards/text/images (one
   call, aligned, equal sizes); `insert_text_box` / `insert_shape` /
   `insert_image` for singletons.
2. `read_slide_layout`: every element's box, z-order, text style,
   estimated wrapped height (`textFit.fits`), and `issues`. Fix every
   `error` and `warn` (`text_overflow`, `overlap`, `off_slide`,
   `low_contrast` with the fill actually behind the text named) and the
   `info` items when cheap (`near_miss_alignment`, `unequal_peers`,
   `tight_margin`, `empty_placeholder`).
3. `get_slide_thumbnail` once the lints are clean, and look.

## Grid conventions (when placing by hand)

Title at x 40, y 32, 640 wide, height 60-70 for one line of 28-34 pt (two
lines need ~110); subtitle under it at 16-18 pt. Content region x 40, y 130,
640 x 235 (insert_grid's default). Footer at y 370, 12 pt. Keep 40 pt side
margins unless an element is deliberately full-bleed. Process flows:
`insert_grid` the step shapes (columns = steps), then `connect_shapes`
between neighbors; connectors follow shapes when moved.

A 34 pt bold title wraps past ~32 characters in a 600 pt box and spills over
whatever sits below (the API does not grow boxes). `textFit` in the layout
read and `issues` in the compose reply predict this; long titles go to
24-28 pt, `fit: "shrink"`, or two lines with the subtitle pushed down.

## Palette and contrast

Pick a palette FIRST and reuse it on every slide (as `compose_slide`'s
`theme.palette`): background, one card/surface color, one accent, and a
secondary text color; on-colors derive automatically. When the user names a
template or brand, take its colors; otherwise these pairs pass WCAG AA as-is:

- Dark: background #0B2A4A, cards #1E4976, accent #4FC3F7, titles/text
  #FFFFFF, secondary #B8CCE0.
- Light: background #FFFFFF, cards #F1F3F4, accent #0B57D0 (white text on
  it), text #202124, secondary #444746.

Text color never defaults sensibly on a colored fill: every text-bearing
call picks its color against the fill BEHIND the text (the card's, not the
slide's). No mid-gray on mid-anything; on white, secondary text is #444746
or darker (#5F6368 is borderline, lighter fails). For a template or brand
palette, run `check_contrast` on every text/fill pair you intend to use
before writing (it returns a passing tint or shade for each failing pair);
`low_contrast` in the layout read is the check afterwards.

Tables on colored slides render dark-on-dark from theme fills:
`set_table_cell_fill` every cell (light fill + dark text, or accent + white)
and restyle with `set_text_style` (cellRow/cellColumn). Prefer stat cards
over a grid of numbers on title and summary slides; a table only for
genuinely tabular data, with the header row filled in the accent and kept
to a handful of rows.

## Slides and repetition

- `create_presentation` starts with one blank slide (delete its
  placeholders, or fill them with `set_shape_text`); it cannot target a
  folder, so move it after with google-drive `google_drive_move_or_rename`.
- `add_slide` with a predefined layout fills title/body placeholders in the
  same call (fastest theme-consistent slide); `move_slide` reorders.
- Repeated layouts (one template, N variants): build the first slide
  fully, then per variant `duplicate_object` on the slide id (the copy
  lands right after) and `replace_text` scoped by `pageObjectIds` to the
  copy; distinct placeholders like {{TITLE}} keep the replaces unambiguous.
- `set_shape_text` REPLACES a shape's or cell's whole text (cell =
  {rowIndex, columnIndex}); `set_text_style` restyles all of one shape or
  cell, not a range. `update_element_position` moves but does not resize:
  delete and re-create at the right size instead.
- Speaker notes: `set_shape_text` with pageObjectId = the slide's
  notesPageId and objectId = speakerNotesObjectId from `read_presentation`.
- Whole-deck render: google-drive `google_drive_export_file` (pdf).
