---
name: publish-release-folder
description: Package and publish a Drive release folder, apply sharing policies, and send a Chat announcement.
---

# Publish release folder

## Trigger

Use when a team needs to ship a release bundle stored in Drive and announce it in Google Chat.

## Required inputs

- Drive folder ID containing release assets
- Target audience (specific users/groups, domain, or public)
- Chat space ID for announcement
- Release version string and summary notes

## Workflow

1. Verify `gws` authentication and Drive/Chat API availability.
2. Enumerate release files in the target folder and validate required assets.
3. Create or update a release index document (if requested) with canonical links.
4. Apply sharing permissions in the requested order (least privilege first).
5. Build a concise release announcement with links and key checksums/metadata.
6. Post the announcement to the target Chat space.
7. Return a release report with file list, permission outcomes, and message link.

## Tooling

- Prefer `gws mcp -s drive,chat -w -e`.
- Use `--dry-run` for permission-changing operations when uncertainty exists.
- Optional upstream skills:
  - `npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-drive`
  - `npx skills add https://github.com/googleworkspace/cli/tree/main/skills/gws-chat`

## Guardrails

- Never widen file/folder visibility beyond explicit user intent.
- Confirm before applying domain-wide or public sharing.
- Preserve existing owner/editor permissions unless instructed otherwise.
- Validate that announcement links are accessible to the intended audience.

## Output

- Published asset inventory with Drive links
- Permission change summary
- Chat announcement status and message reference
