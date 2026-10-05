---
name: kapa-setup-web-crawl
description: Set up a Kapa web crawl source so a documentation site is ingested. Use when the user wants Kapa to answer from a website, documentation site or sitemap.
---

# Set up a web crawl

Three things happen in order: find the right pages, extract the right text from
them, then ingest. The first two are free and repeatable, the third spends the
team's quota. So judge the first two before doing the third.

A source cannot be ingested until it has been previewed with the exact
configuration you intend to ingest with. Changing the crawl config retires the
preview, so a change means previewing again.

## 1. Create the source

`create_web_crawl_source` with `project` and `name`. Name it after the site, such as
"Acme docs". Keep the returned source id.

## 2. Say what to crawl

`set_crawl_config` with `source_scrape` (the source id) and `urls_start`, the
pages the crawl begins from.

- `urls_include` and `urls_exclude` narrow it. Use them when the site holds
  content the user does not want answered from, such as a blog or a changelog.
- `enable_sitemap` follows the site's sitemap. It describes one site, so it only
  applies with a single start URL.
- `render_js` is for a site that builds its content in the browser. It is
  slower, so leave it off until a preview shows thin pages.

Start URLs must be public `http://` or `https://` addresses. A private or
loopback host is rejected, since the crawler cannot reach it.

## 3. Preview the crawl

`preview_crawl` with the source `id` and `page_limit: 50`. Nothing is ingested
and no quota is spent.

Then `get_crawl_status` until it leaves `PENDING` and `IN_PROGRESS`. `SUCCESS`
means it finished, `FAILURE` carries the reason. Poll every couple of seconds
rather than in a tight loop.

`list_preview_pages` with `source_scrape` to see what it found. **Read this
list and judge it**, since nothing else will:

- Pages the user would not want answered from mean `urls_exclude` is needed.
- A section that should be there and is not means `urls_start` or
  `urls_include` is wrong, or the site needs `render_js`.

Fix the config and preview again until the set of URLs is right. Only then move
on. A capped preview reports as much, so raise or drop the limit if 50 pages
were not representative.

To change the config, use `update_crawl_config`, not `set_crawl_config`.
`set_crawl_config` creates one and refuses a second call. `update_crawl_config`
takes the **config id**, which `get_crawl_config` returns, not the source id.

## 4. Settle the content selector

The selector picks the element holding the article text. Everything outside it,
navigation, sidebars, footers, is dropped. Getting this wrong degrades every
answer the source ever gives, and nothing errors.

1. `detect_content_selector` with the source `id`. It recognises common
   documentation platforms and answers with settings, or null if it cannot tell.
   Call it once, not in a loop: it is rate limited. Use its `selector`,
   `selectors_exclude` and `classes_exclude`, and ignore `detected_by` and
   `platform`, which are metadata and must never be saved.
2. `inspect_content_selector` with the `id` and a candidate `selector` renders
   it against real preview pages without saving. Start broad, with `main` or
   `article`, then narrow.
3. **Read the extracted text, both its start and its end.** Navigation or
   "related articles" in the output means the selector is too broad. A nearly
   empty page means it is too narrow, or the page needs `render_js`. Repeat
   until only the article remains.
4. `set_content_selector` with `source_scrape` and the selector you settled on.
   To change it later use `update_content_selector`, which takes the content
   config id rather than the source id.

Keep the headings. Kapa chunks on the breadcrumb that headings form, so a
selector that strips `h1` or `h2` quietly makes retrieval worse.

`selectors_exclude` takes full CSS selectors. Use it for things inside the
article that are not article text, such as an edit link or a banner.

## 5. Ingest

`start_crawl` reads every page it finds and spends the team's quota, so confirm
with the user first.

This is the step that populates the project. A source that is configured but
never crawled answers nothing, so do not stop at step 4.

Afterwards `get_crawl_status` follows it, and `cancel_crawl` stops it.

## Changing a source that is already live

Editing the configuration of a deployed source changes what it serves. Say so
and get the user's agreement before saving.

Extraction changes only take effect by ingesting again, so a new selector on a
live source does nothing until `start_crawl` re-runs.

## When things go wrong

**"Crawl in progress" or a 409.** A crawl is running, or approved pages are
still processing. Nothing clears it from here. Tell the user to wait, and do not
retry in a loop.

**No pages found.** Not an error, a result. The crawl config matched nothing:
check the start URLs are reachable and that the include patterns are not too
strict.

**Pages come back thin.** Their content is built in the browser. API reference
pages often are. Either turn on `render_js` and preview again, or exclude those
paths and add an OpenAPI source instead, with `create_openapi_source` and
`set_openapi_config`. A spec is structured, so it gives cleaner coverage than
any crawl of the rendered page.

**The preview will not start.** The error carries the reason. A failed preview
leaves a draft source behind, so reuse it rather than creating another.

## Shared Kapa workflow rules

Tools act as the connected user with that user's project permissions. Resolve the intended project and use only authorized data. Do not invent credentials, source IDs, filters, or tool results. Check the available tool schema before passing arguments.

Explain and obtain approval for ingestion and its quota cost before saving a configuration that starts ingestion or calling `start_crawl`; existing explicit approval for that exact action is sufficient. Ask the user to choose source scope and filters. Validate credentials and discover accessible content before saving. Keep credentials out of visible results, logs, and exported artifacts. Use a secure credential input if the host provides one.

For a web source, preview the exact configuration and inspect the extracted article content before ingestion. Report queued, running, failed, and completed states accurately. If uncertain about Kapa behavior, use `search_kapa_docs` when available.
