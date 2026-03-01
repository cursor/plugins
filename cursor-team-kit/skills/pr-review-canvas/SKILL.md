---
name: pr-review-canvas
disable-model-invocation: true
description: Generate an interactive PR review walkthrough as an HTML page. Fetches PR data via gh API, categorizes files into core vs mechanical changes, adds reviewer annotations, and renders diffs with moved-code detection. Use when the user pastes a GitHub PR URL and asks for a review, walkthrough, or summary, or says "review this PR".
---

# PR Review Canvas

Generate an interactive HTML review of a GitHub PR that reads like a peer walking you through what matters.

## Workflow

### 1. Fetch PR data

Run these `gh api` calls in parallel:

```bash
gh api repos/{owner}/{repo}/pulls/{number} --jq '{title, body, user: .user.login, state, additions, deletions, changed_files, base: .base.ref, head: .head.ref}'
gh api repos/{owner}/{repo}/pulls/{number}/files --paginate --jq '.[] | {filename, status, additions, deletions, patch}'
gh api repos/{owner}/{repo}/pulls/{number}/comments --jq '.[] | {user: .user.login, body, path, line}'
```

### 2. Analyze the PR and write the body HTML

Read the diffs, understand the PR, and write the `<body>` content directly as HTML. You have full creative freedom -- the goal is to explain the PR clearly to a reviewer. Use whatever structure best fits the PR.

**Typical structure** (adapt as needed):
- Header with title, PR number, author, stats
- Summary box explaining what the PR does in plain English
- Core file sections with annotations and diffs
- Mechanical/boilerplate files collapsed by default
- Review checklist at the bottom

**But you can also add:**
- **Pseudocode summaries** for verbose code -- show the algorithm in plain English or short pseudocode, with the real diff collapsed below (use a `.bp-section` card labeled "Show full implementation"). Great when 150 lines of retry/backoff/error-handling code is really just "fetch with exponential backoff and circuit breaker."
- Diagrams (inline SVG, mermaid via CDN, ASCII art in `<pre>`)
- Flowcharts showing before/after control flow
- Tables comparing old vs new behavior
- Callout boxes for warnings, questions, or gotchas
- Interactive widgets if they help
- Anything else that makes the review clearer

**Pseudocode pattern example:**
```html
<div class="file-card">
  <div class="file-hdr" onclick="toggle(this)">
    <span class="fname">retryClient.ts</span>
    <div class="fstats"><span class="pill add">+173</span><span class="pill del">&minus;11</span><span class="chev open">&#9654;</span></div>
  </div>
  <div class="file-body open">
    <div class="file-note">
      <strong>What this does in plain English:</strong>
      <pre style="margin-top:8px;color:var(--text);font-size:12px;line-height:1.6;">
fetch(url):
  if circuit breaker is open → fail fast
  retry up to N times:
    try fetch with timeout
    on success → close circuit breaker, return
    on retryable error → wait (exponential backoff + jitter)
    on non-retryable error → throw
  circuit breaker records failure</pre>
    </div>
    <div class="bp-section" style="margin:0;border:0;border-radius:0;">
      <div class="bp-hdr" onclick="toggleBP(this)">
        <span>Show full implementation (+173 lines)</span><span class="chev">&#9654;</span>
      </div>
      <div class="bp-body"><div data-diff="retryClient"></div></div>
    </div>
  </div>
</div>
```

### 3. Available CSS classes and JS utilities

Read [styles.css](styles.css) and [renderer.js](renderer.js) from this skill directory. These give you a prebuilt dark-themed toolkit. Inject them into [template.html](template.html) verbatim.

**CSS classes you can use:**

| Class | Purpose |
|-------|---------|
| `.header`, `.header h1`, `.header-meta` | Page header |
| `.pill.add`, `.pill.del`, `.pill.files` | Stat badges (+N, -N, N files) |
| `.content` | Centered content wrapper (max 900px) |
| `.summary` | Summary/TL;DR box |
| `.section-title` | Section heading with bottom border |
| `.ic` | Inline code reference (mono, blue, dark bg) |
| `.file-card`, `.file-hdr`, `.file-body` | Collapsible file card (use `onclick="toggle(this)"` on `.file-hdr`) |
| `.file-note` | Sticky reviewer annotation inside a file card |
| `.bp-section`, `.bp-hdr`, `.bp-body` | Collapsed boilerplate card (use `onclick="toggleBP(this)"`) |
| `.bp-note` | Note inside a boilerplate card |
| `.verdict` | Review checklist box |

**JS functions available:**

| Function | Usage |
|----------|-------|
| `toggle(hdrElement)` | Toggle a `.file-body` open/closed |
| `toggleBP(hdrElement)` | Toggle a `.bp-body` open/closed |
| `renderDiff(target, diffInput)` | Render a unified diff. `target` can be a DOM element, string ID, or CSS selector. `diffInput` can be a raw patch string OR an array of lines -- both work. Automatically filters imports, collapses whitespace-only changes, detects moved code (blue/purple tint). |
| `esc(string)` | HTML-escape a string |

**Rendering diffs -- use `data-diff` attributes with auto-discovery.**
Put `<div data-diff="KEY"></div>` placeholders in your body HTML wherever you want a diff rendered. The renderer finds them automatically after DOM load and fills them from the `<script id="pr-diffs-json" type="application/json">` element in `template.html`.

**CRITICAL: Patch strings can contain `</script>` in addition to newlines, backslashes, and quotes.** Even `json.dumps(...)` is not enough if you paste raw output into executable `<script>` because HTML parsing can terminate the tag early. Never manually embed patch strings in JS/JSON. Instead, use this safe approach:

1. During the fetch step, save patches to a JSON file using `jq` (which handles escaping correctly):
```bash
gh api repos/{owner}/{repo}/pulls/{number}/files --paginate \
  --jq '[.[] | {key: (.filename | gsub("[^a-zA-Z0-9]"; "_")), value: (.patch // "")}] | from_entries' \
  > /tmp/pr-patches-{number}.json
```

2. During assembly, use Python to safely inject the JSON into `template.html`:
```bash
python3 <<'PY'
import json
from pathlib import Path

patches = json.loads(Path('/tmp/pr-patches-{number}.json').read_text())
html = Path('/tmp/pr-review-{number}-body.html').read_text()
css = Path('styles.css').read_text()
js = Path('renderer.js').read_text()
tmpl = Path('template.html').read_text()

# Prevent literal </script> from terminating HTML script tags early.
safe_json = json.dumps(patches).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')

out = (
  tmpl.replace('/* INJECT_CSS */', css)
      .replace('/* INJECT_JS */', js)
      .replace('<!-- INJECT_BODY -->', html)
      .replace('{"__PR_DIFFS_PLACEHOLDER__":true}', safe_json)
)

Path('/tmp/pr-review-{number}.html').write_text(out)
PY
```

This guarantees valid JSON and script-safe HTML embedding. The agent writes body HTML to a temp file, then Python assembles everything safely.

The diff data keys should match the `data-diff` attribute values in the HTML:
```html
<div data-diff="path_to_file_ts"></div>
```

Since renderer.js loads in `<head>`, you can also call `renderDiff(target, lines)` directly from inline `<script>` tags if needed for custom use cases. The function accepts a DOM element, ID string, or CSS selector as `target`, and a string or array as `lines`.

**You're not limited to these.** Add your own inline `<style>` blocks, `<script>` blocks, SVGs, diagrams, or anything else. The prebuilt pieces save time but don't constrain you.

### 4. Assemble and serve

1. Write your body HTML (everything that goes inside `<body>`) to `/tmp/pr-review-{number}-body.html`
2. Save patches to `/tmp/pr-patches-{number}.json` using the `jq` command from step 3 above
3. Run the Python assembly script from step 3 above (reads styles.css, renderer.js, template.html from this skill directory, injects body + patches safely, writes final HTML)
4. Start a local server on a fixed port:
   ```bash
   cd /tmp && python3 -m http.server 8432 --bind 127.0.0.1
   ```
   Run this backgrounded, then navigate the in-app browser to `http://127.0.0.1:8432/pr-review-{number}.html`.

   **Why a fixed port and `cd /tmp`:** Background shells have no TTY, so Python buffers its startup message ("Serving HTTP on...") indefinitely — using port 0 means you can never read which port was chosen. And `--directory /tmp` works but `cd /tmp` is more robust across Python versions. If port 8432 is taken, try 8433, 8434, etc.

### Diff features (handled automatically by renderer.js)

- Filters out import-only lines
- Collapses whitespace-only changes into context lines
- Detects moved code blocks (3+ consecutive lines deleted in one place and added identically elsewhere) -- renders in blue/purple instead of red/green
- Near-matches (moved + small edit) get a different purple tint

### Style notes

- Dark theme: `#1a1a1a` background, Inter body font, IBM Plex Mono for code
- Use `var(--warning)` for orange, `var(--success)` for green, `var(--danger)` for red, `var(--accent)` for blue
- Sticky file headers (`position: sticky; top: 0`) and notes (`top: 35px`) pin while scrolling
- Core files expanded by default (`.file-body.open`), mechanical files collapsed
