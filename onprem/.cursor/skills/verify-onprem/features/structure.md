# Structure

## Sub-features
- `manifest`: `.cursor-plugin/plugin.json` parses, is named `onprem`, declares `skills` and `agents`.
- `frontmatter`: every markdown file with YAML frontmatter parses; each skill's `name` matches its directory; every frontmatter has a description.
- `mode-dashes`: `skills/onprem-mode/SKILL.md` contains no long-dash characters (its own line 81 bans them on every reply the mode writes).
- `links`: every relative markdown link in the plugin resolves to an existing file.

## How to get to it (user POV)
This is the "will Cursor even register this plugin" suite. A broken frontmatter name silently unregisters a skill; a dead link sends a recipient down a wrong path; a mode file that violates its own writing rule erodes trust in the doctrine it carries.

## Driving it with verify.py
Part of the default pass. Observable end state: `"ok": true` on all four, with the frontmatter detail counting how many files parsed.

## Gotchas
- The dash check is scoped to the mode file on purpose. Guide pages and setup prose are human-facing and may use long dashes, mirroring pstack.
- A frontmatter `name`/dir mismatch usually means a directory was renamed without the file. Fix the directory or the name, not the check.
- HTTP(S) links are not checked for reachability, only for syntax via the link scan.
