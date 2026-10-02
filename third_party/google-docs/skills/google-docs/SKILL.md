---
name: google-docs
description: Author and edit Google Docs with the google-docs tools - structured writing, character and paragraph styling, lists, tables, images, headers/footers. Use when creating a formatted document, editing document content, or applying styles.
---

# Google Docs authoring

## Locate text, never compute indexes (the #1 source of bugs)

Docs edits address zero-based UTF-16 index ranges within one tab, and every
write SHIFTS later indexes. Guessed or stale indexes silently hit the wrong
paragraphs - the classic symptom is two lists merging into one continued
numbering. The tools remove the need for index math:

- `find_text` returns FRESH `{start, end}` ranges for exact text - the
  direct source of indexes for `apply_text_style`, `apply_paragraph_style`,
  `delete_content`, and `set_paragraph_format`. Locate, then edit, in
  back-to-back calls.
- `create_list` takes `firstItemText`/`lastItemText` anchors and resolves
  the range itself: name the first and last item paragraphs and no index
  ever touches your hands. Use one `create_list` per list with the right
  preset (BULLET_* for bullets, NUMBERED_* for numbers); never stretch one
  call across two visually separate lists.

When a range must come from structure instead of a phrase (styling a whole
paragraph, addressing a table), read it from `read_document` elements: a
paragraph's `{start, end}` is the range for paragraph-level tools. END IS
EXCLUSIVE: one short misses the last character, one long styles the
character after the phrase (the classic italic-or-link off-by-one).

When raw indexes are unavoidable: `read_document` first, compute ONE edit,
pass `requiredRevisionId`, apply, and re-read before the next positional
edit. Order multi-part positional work BACK-TO-FRONT (highest index first)
when re-reading between steps is too expensive; earlier ranges stay valid.

## Creating a document

`create_document` makes a BLANK doc (its API ignores content), so plan:

- Content known up front: prefer google-drive `google_drive_create_file`
  with Markdown (`target_mime_type: ...document`), which imports headings,
  lists, and tables in one call and can target a folder.
- Building incrementally: `create_document`, then `insert_text` with `index`
  omitted to APPEND each paragraph; append mode reads the tail itself and is
  revision-guarded automatically. `paragraphStyle` styles the new paragraphs
  and `bold`/`italic` style the inserted text in the same call, so a
  well-structured document is a sequence of appends with no styling pass.
- Doc creates cannot set a parent folder. When placement matters, create
  and then google-drive `google_drive_move_or_rename` with
  `destination_folder_id`.

## Structure is not optional

A document without hierarchy reads as a text dump. Default shape for any
report/memo/notes request: a TITLE paragraph, an italic byline or date line,
HEADING_2 per section, short body paragraphs with bold on the phrases that
matter, and bulleted lists for enumerations. Use `insert_text`'s
paragraphStyle/bold/italic arguments as you write rather than styling
afterwards.

## Styling

- Character styling (`apply_text_style`): bold/italic/underline/strike,
  fontSize, fontFamily, textColor/backgroundColor as `#RRGGBB`, linkUrl.
  Exclusive END index: to style one paragraph without its trailing newline,
  use `end - 1` from the read.
- Paragraph styling: `apply_paragraph_style` for named styles
  (TITLE/HEADING_1..6), `set_paragraph_format` for alignment, indents, and
  line spacing (percent, 100 = single).
- Lists: `create_list` over the paragraphs' range; each newline-separated
  paragraph becomes one item. Insert the plain lines first, then bullet them.
- The preset is part of correctness: enumerations get a BULLET_* preset by
  default; NUMBERED_* only when the content is ordered (steps, rankings) or
  the request says numbered.
- Before bulleting, check the read for paragraphs that ALREADY show a
  leading bullet - text appended directly after a list inherits its
  membership, and `create_list` over such paragraphs restyles the ORIGINAL
  list, continuing its numbering (a second list showing 4, 5, 6). Strip
  first: `create_list` with `remove: true` over exactly the new paragraphs,
  then apply the wanted preset.

## Tables and images

- `insert_table` inserts an EMPTY grid. To fill it: re-read (cells appear
  with their own index ranges) and `insert_text` into cells from the LAST
  cell to the first, so earlier cell indexes stay valid.
- Style a table AFTER filling it, addressing it by the table element's
  `start` from `read_document`: `set_table_cell_shading` the header row
  (pick the row's text color against that fill), `merge_table_cells` for a
  title cell spanning columns (top-left content survives, the rest is
  dropped), `set_table_column_width` for fixed widths in points. Structural
  edits (merge) shift indexes: re-read before further text edits.
- `insert_image` needs a PUBLICLY fetchable URL (Google fetches it; auth
  walls and private hosts fail), PNG/JPEG/GIF. Size with width/height in
  points (aspect kept when only one is set).
- `insert_page_break` starts a new page at an index.

## Headers and footers

`set_header_footer` sets the default header or footer in one call: it
creates the segment when the doc has none, replaces the text otherwise,
and empty text clears it. The text is static (no page-number fields exist
in the API); it applies to the first tab. Never `insert_text` a fake header
into the body - it scrolls away with the content.

## Bulk text ops

`replace_text` replaces literal strings everywhere (or in named tabs) with
no index math; prefer it for renames and corrections. `delete_content`
rejects ranges that split table structure or surrogate pairs; deleting a
paragraph's final newline merges it with the next.

## Verify your work

Re-read with `read_document` for structure and styles, or google-drive
`google_drive_read_file` for the whole doc as Markdown, or
`google_drive_export_file` (pdf) when the visual result matters. After any
styling call, confirm the styled span covers exactly the intended text
before moving on.
