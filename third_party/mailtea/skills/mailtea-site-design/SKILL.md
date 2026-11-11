---
name: mailtea-site-design
description: Build and restyle a publication's public website with Mailtea from an AI agent, pages, sections, theme, and the design brief that keeps later edits on-brand. Use when the user wants to create or change their Mailtea site (home, about, archive, a landing page), restyle it, or publish it. Pairs with mailtea-email-design, which covers the email side.
---

# Mailtea site design

Every Mailtea publication has one public website: a home page, an archive of
posts, and whatever else you add. It is edited the same way an email is, a
declarative ops batch against a draft, then a deliberate publish.

**Ops go to the DRAFT.** Real visitors keep seeing the live site until someone
calls `site.publish`. That is the safety net, so use it: build, look, fix, and
only publish when the user asks. `site.page_upsert` is the exception: it writes
live (see Pages).

## The loop

```
site.get                 → what exists: pages, theme, live vs draft
site.section_templates_list        → the section templates you can insert (use these, don't invent)
site.design_brief_set    → the durable intent, once (below)
site.apply_ops           → compose / insert / edit / arrange / theme / navbar / rename
site.publish             → make it real  ← only when the user asks
```

`site.discard_draft` throws away **every** pending draft edit across the whole
site, including the operator's own unpublished work. Destructive and not
undoable, confirm before calling it.

## Ops

`site.apply_ops` takes `{pageId, ops, baseVersion}` and reports
what applied and what was skipped, same contract as the email reducer.

Every site tool also accepts `publicationId`, but it is optional: it defaults to
the publication the connection is for. Pass it only when the connection reaches
more than one.

| op | what it does |
|---|---|
| `compose_page` | Replaces a page's whole section list. |
| `insert_section` | Adds a template section at `index`, with `copy` for its text slots. |
| `swap_section` | Replaces one section with a different template, carrying the copy across. |
| `edit_copy` | Rewrites text: `{edits:[{nodeId, …}]}`. |
| `edit_style` | One node's `style` / `layout`. |
| `arrange` | `moves` then `deletes`. |
| `set_navbar_template` | `templateId` from `site.navbar_templates_list`, optional `brand`. Replaces the navbar. |
| `rename_nodes` | `renames: [{nodeId, layerName}]`. Layer-tree labels only, nothing a visitor sees. |
| `set_theme` | Site-wide design tokens. |

Sections are addressed by **`nodeId`**, not by index path, ids are stable across
edits, so unlike the email reducer you can safely hold one across turns. Get them
from `site.page_get`.

Prefer `insert_section` with a **template** over composing raw structure: templates
are the vocabulary the theme knows how to style, so a template section inherits the
site's design and a hand-built one drifts from it.

## Pages

`site.page_upsert` needs `{kind, slug, title}` and optionally
`status`, `contentJson`, and the SEO fields (`seoTitle`, `seoDescription`,
`seoOgImageUrl`). Write the SEO fields, a page shared without them gets an ugly
unfurl, and nobody goes back to add them later.

`site.page_upsert` writes the page's **live** document, not the draft. A
published page changes for visitors at once, with no preview. If the page has a
pending draft (`hasDraft` on `site.page_get`), that draft is kept: `site.page_get`
keeps returning it, and the next `site.publish` replaces your upsert with it.
For edits that should wait for review, use `site.apply_ops`.

## The design brief

`site.design_brief_set` stores the site's durable design intent, audience, tone,
palette, the feel. Set it **before** a big design pass and every later edit,
yours or another agent's, has the same reference. Skipping it is why a site drifts
into a different look three edits in.

## Images

Same library and the same rules as email:

```bash
mailtea assets upload --publication-id pub_123 --file ./cover.jpg --width 1600 --height 900
mailtea assets list --publication-id pub_123
```

PNG / JPEG / GIF / WebP / SVG, 5 MB max. SVG is fine on a site page: it is
served under a sandboxing Content-Security-Policy, so it cannot run script. The
bytes are checked against the declared content type, so a mislabelled file is
rejected rather than stored.

Unlike email, a website is a normal web page: real fonts, flexbox and CSS
variables are all fine here. Do **not** carry the email-safe contract over, it
would make the site needlessly primitive.

## Don't

- Don't publish unless the user asked. Draft is the default for a reason.
- Don't call `site.discard_draft` to "clean up", it destroys the operator's
  pending work too.
- Don't invent section structure when a template exists.
- Don't hot-link images from another host; upload them.
- Don't leave a new page without `seoTitle` / `seoDescription`.
