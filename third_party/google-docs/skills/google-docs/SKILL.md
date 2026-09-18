---
name: google-docs
description: Author and edit Google Docs through the google-docs MCP tools - structured writing, character and paragraph styling, lists, tables, images, and safe index math. Use when creating a formatted document, editing document content, or applying styles.
---

# Google Docs authoring

## The index contract (the #1 source of bugs)

Docs edits address zero-based UTF-16 index ranges within one tab. Every write
SHIFTS later indexes, so:

1. `read_document` first; it returns each element's `{start, end}` plus the
   `revisionId`.
2. Compute ONE edit from that read, pass `requiredRevisionId`, apply.
3. Re-read before the next positional edit. Never reuse indexes across
   writes, and never do arithmetic across two writes.

Order multi-part positional work BACK-TO-FRONT (highest index first) when
re-reading between steps is too expensive; earlier ranges stay valid.

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

## Tables and images

- `insert_table` inserts an EMPTY grid. To fill it: re-read (cells appear
  with their own index ranges) and `insert_text` into cells from the LAST
  cell to the first, so earlier cell indexes stay valid.
- `insert_image` needs a PUBLICLY fetchable URL (Google fetches it; auth
  walls and localhost fail), PNG/JPEG/GIF. Size with width/height in points
  (aspect kept when only one is set).
- `insert_page_break` starts a new page at an index.

## Bulk text ops

`replace_text` replaces literal strings everywhere (or in named tabs) with
no index math; prefer it for renames and corrections. `delete_content`
rejects ranges that split table structure or surrogate pairs; deleting a
paragraph's final newline merges it with the next.

## Verifying

Re-read with `read_document` for structure and styles, or google-drive
`google_drive_read_file` for the whole doc as Markdown, or
`google_drive_export_file` (pdf) when the visual result matters.
