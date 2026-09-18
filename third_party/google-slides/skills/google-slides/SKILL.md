---
name: google-slides
description: Build and edit Google Slides through the google-slides MCP tools - slides, text boxes, shapes, images, tables, styling, and per-slide PNG rendering. Use when creating a deck, laying out slide elements, or verifying how a slide looks.
---

# Google Slides authoring

## Handles and geometry

Everything is addressed by objectId from `read_presentation`: slides, shapes,
tables, images. Element positions and sizes are in POINTS from the slide's
top-left; a standard slide is 720x405 pt. Plan a layout on that grid before
inserting (e.g. title at y 40-60, content rows at y 150+, keep 40 pt margins)
so elements do not overlap.

## Sequencing a styled deck

1. `create_presentation` (starts with ONE blank slide; it cannot target a
   folder - move it after with google-drive `google_drive_move_or_rename`).
   Delete the default placeholders when building a custom layout.
2. `read_presentation` for the first slide's objectId, the layouts list,
   and the revisionId.
3. Pick a PALETTE first: one background color, one card/accent color that
   harmonizes with it, one or two text colors. Every element uses it.
4. Per slide: `set_slide_background`, then insert elements with their style
   INLINE - `insert_text_box` takes bold/fontSize/textColor/textAlignment,
   `insert_shape` additionally fillColor/outlineColor, so one call produces
   a finished element. `insert_image` aspect-fits into maxWidth/maxHeight
   and never crops; give it the box you want filled.
5. More slides: `add_slide` with a predefined layout fills title/body
   placeholders in the same call; `move_slide` reorders.

## Layout that reads well

- Align to a grid: same y for elements in a row, equal sizes for peer cards,
  equal gaps (e.g. three 180 pt cards at x 60/270/480 on a 720 pt slide).
- Whitespace is part of the design, but content should not huddle in one
  corner of an otherwise empty slide; spread rows vertically (title ~56,
  content ~180, footer ~330).
- Tables are for genuinely tabular data on CONTENT slides; on title or
  summary slides prefer stat cards (`insert_shape` with text) or short
  bulleted placeholders.
- `set_text_style` restyles ALL text of one shape (or a table cell via
  cellRow/cellColumn); it does not do partial ranges.

Pass `requiredRevisionId` from the latest read (or the previous write's
response) so concurrent edits fail the write instead of corrupting layout.

## Tables

`insert_table` makes an empty grid; fill cells with `set_shape_text` using
`pageObjectId` = the slide, `objectId` = the table, and
`cell: {rowIndex, columnIndex}` (0-based, EXACTLY those key names). Note
`set_shape_text` REPLACES the whole cell/shape text.

## Placeholders vs free elements

`add_slide` with layout TITLE_AND_BODY etc. fills placeholders - the fastest
way to a clean, theme-consistent slide. Free `insert_text_box`/`insert_shape`
give exact control but inherit no theme styling; set fonts and colors
yourself with `set_text_style`.

## Position changes

`update_element_position` moves an element to an absolute point position; it
does not resize (the API resizes via transform scale against intrinsic size,
which is unreliable across element kinds - delete and re-create at the right
size instead).

## Verifying visually

`get_slide_thumbnail` renders ONE slide as PNG (base64; LARGE = 1600 px wide)
- the ground truth for layout checks; read_presentation cannot tell you
whether elements overlap. For the whole deck use google-drive
`google_drive_export_file` (pdf). Speaker notes: write with `set_shape_text`
using pageObjectId = the slide's notesPageId and objectId =
speakerNotesObjectId from `read_presentation`.
