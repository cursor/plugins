# Changelog

All notable changes to the Mailtea Agent Plugin are documented here.

The plugin ships as a git tag on
[mailtea-agent-plugin](https://github.com/mailtea-app/mailtea-agent-plugin) —
there is no npm or PyPI package — so `v<version>` here is what a client pins.

## Unreleased

- The OpenAI directory listing is now in the Communication category instead of Productivity, and its long description opens with what Mailtea is for: sending transactional email and newsletters from a conversation. The directory review could not confirm the old category.
- The hosted MCP server lets any block carry `visibility` (`all`, `email` or `web`): `attrs.visibility` on `edit_block`, and an optional `visibility` on blocks in `compose` and `insert_blocks`. `issue.get_editor` shows it in the outline when it is not `all`. `issue.preview` takes `channel` (`email` or `web`). The email design skill describes all of it. A post with only `web` blocks has an empty email: Review in Mailtea Studio warns first, and a send is accepted, then the post is marked failed before any email goes out, with the reason `email_channel_empty` in its status (shown by `issue.delivery_progress` and `issue.wait_delivery`).
- The email design skill says footers and logos default to `email`: the hosted MCP server leaves them off the web version unless they carry `visibility: "all"` (on a site without the Website Builder, a post keeps its stored footer on the web until it is saved again), and lists them as `email` in the outline. On a site made with the Website Builder, `issue.preview` with `channel: "web"` returns the body the public page shows, rendered for the web. Available as soon as the API deploys.
- The hosted Mailtea MCP server adds `automation.preview_step`, which renders what an automation's `send_email` step would send (nothing is sent) so a mistyped variable mapping is caught before `automation.enable`. Available as soon as the API deploys; no plugin change is needed. The README counts 167 tools.
- The hosted MCP server documents `send_email` template variants (`config.variants`, first match wins) and `automation.preview_step` takes `variant`. No plugin change is needed.
- The Cursor manifests now pass Cursor's own schemas: the author carries only a
  name and email, the marketplace entry carries only the keys Cursor allows,
  and the MCP server is declared inline by URL so Cursor infers the transport.
  The email skill folder is now `skills/mailtea-email/` so it matches its
  `mailtea-email` name. `check-manifests.mjs` guards all three.
- The hosted MCP server's `email.inbound_reply` takes `to` and `headers`.
- The hosted Mailtea MCP server adds `api_key.current` and takes `attachments` on `email.inbound_reply`. Available as soon as the API deploys; no plugin change is needed.
- The Codex manifest now carries the review demo recording link in
  `extensions["com.openai"].review.demo_recording_url`: an unlisted YouTube
  video of the ChatGPT flow (connect, grant Demo Weekly, list publications and
  contacts, draft, test send, a refused unsafe send, the delivered fix,
  disconnect).
- The README counts 165 tools and drops `ai.*` from the Newsletters row: the
  MCP server removed the `ai.generate_draft` placeholder tool.
- The Mailtea MCP server the plugin connects to marks every tool that changes
  existing data as destructive, so Claude asks before draft edits and updates
  as well as deletes and sends. Failed calls come back as readable tool
  results, and long bodies and the suppression export are paged. This ships
  with the hosted server; the plugin's files do not change for it.
- The Codex listing subtitle is now "Send email and newsletters", within the
  30 character limit OpenAI's plugin portal enforces. The manifest check now
  also enforces the listing limits on the display name, subtitle, long
  description, developer name and default prompts.
- The `mailtea` and `mailtea-site-design` skills no longer say every site
  write goes to the draft. `site.apply_ops` edits the draft, but
  `site.page_upsert` writes a page's live document, so a published page
  changes for visitors at once. The skills now say so, and that a pending
  draft on the page is kept and replaces the upsert on the next
  `site.publish`.

## 0.10.0 (2026-10-06)

- The `mailtea` skill explains how to send a newsletter by email only:
  `issue.send_now` takes `publishToWeb: false`, while `issue.schedule` always
  publishes a newsletter. It also states the recipient limit: one send
  reaches at most 25,000 contacts by default, and a larger audience is
  refused, so split it into segments.
- The Claude manifest (`.claude-plugin/plugin.json`) adds
  `displayName: "Mailtea"`, so plugin directories show "Mailtea" instead of
  the lowercase package name.
- The plugin icon is fixed. The `assets/mailtea-logo-*.png` files were
  grayscale plus alpha, a valid but unusual PNG encoding, and the Claude plugin
  directory showed a generic glyph instead of the logo. They are now standard
  8-bit RGBA with the same pixels. `scripts/check-manifests.mjs` checks that
  the Claude `icon` exists and is 8-bit RGBA.
- The Claude manifest drops the `logo` key, which Claude does not recognise
  and `claude plugin validate --strict` rejected, and keeps `icon`. The
  Cursor, Grok and Codex manifests keep their own `logo`.
- The Claude manifest adds listing links next to `privacyPolicyUrl`:
  `termsOfServiceUrl` (`https://mailtea.app/terms-of-service`),
  `documentationUrl` (the Agent Plugin docs page) and `supportUrl`
  (`mailto:support@mailtea.app`).
- The README opens with a listing description: what the plugin does and who
  it is for, the 166 tools by family, the three skills, how to connect from
  Claude.ai, Claude Desktop, Claude Code, Cursor, VS Code and Codex, how
  consent and publication scoping work, and links to docs, support and
  privacy. The install details follow.

## 0.9.0 (2026-10-03)

- The Mailtea MCP server the plugin connects to labels every tool with a
  title and the four MCP safety hints (read only, destructive, idempotent,
  open world), so a client can ask before a send, a delete or a consent
  change and let reads through. Sends, deletes, suppressions and
  unsubscribes are marked destructive; anything that emails recipients,
  changes the public website or looks up public DNS is marked open world.
  The hosted server carries them as soon as the API deploys.
- The Claude Code manifest (`.claude-plugin/plugin.json`) adds an `icon`
  (`assets/mailtea-logo-512.png`, 512 by 512) and a `privacyPolicyUrl`
  (`https://mailtea.app/privacy-policy`) for the plugin directory. The
  existing `logo` field stays for the clients that read it.
- The README lists more clients, each pointing at the same hosted server:
  a one-click Add to Kiro link, Cline, Zed, Warp, JetBrains AI Assistant
  (which needs a personal access token, since it has no browser sign-in yet;
  Junie signs in itself), Amazon Q Developer CLI, and a custom connector row
  for Devin, Perplexity, Mistral Le Chat and Manus. The JSON for each is in a
  new Manual configuration section.
- The README has a Privacy and support section with the privacy policy,
  terms of service, support address and docs links that plugin directories
  ask for.
- The README no longer repeats itself: it held a cut-off first copy and a
  duplicated second half of the page, and now holds the page once.

## 0.8.0 (2026-10-01)

- The mailtea skill says how to send a post to one segment (`segmentId` on
  `issue.create_draft` / `issue.update_draft`, `null` to send to everyone
  again, ids from `segment.list` in the same publication), that a send to a
  segment that cannot be resolved or matches nobody is refused rather than
  widened, that `segment.delete` refuses a segment a draft, scheduled or
  sending post targets (`segment_in_use`), and that `segment.create` takes
  `inactive_days` for the silent cohort (not engaged readers; engagement
  tracking is not backfilled).

## 0.7.0 (2026-09-29)

- The mailtea skill says each `template.versions` entry carries its `from` and
  `reply_to`, that a sender-only change records a version (or folds into the
  open one, like any edit), that `template.restore_version` brings the sender
  back with the design, and that an entry with `sender_recorded: false` keeps
  the current sender.

## 0.6.0 (2026-09-28)

- The mailtea skill tells the agent to read first and pass what it read to
  `template.update` (`base_revision`), `automation.update` (`base_version`) and
  `issue.update_draft` (`baseUpdatedAt`), so its write never overwrites a
  change a person made in Mailtea Studio since. On a 409 it re-reads and
  retries instead of resending. It also says a draft written with
  `contentHtml` stays HTML until the operator chooses to convert it.

- The mailtea skill says a post's `name` is only its internal name (the subject
  is `title`), and that a post can carry its own `from` and `replyTo` through
  `issue.create_draft` / `issue.update_draft`, with `from` checked against the
  publication's verified domains.

- The email-design skill says `arrange` addresses resolve when the op runs (an
  earlier op in the same batch has already shifted them), and tells the agent to
  give every delete an `expectType`: a stale address now refuses the whole op.
- The asset guidance no longer says SVG is refused. It is accepted for site
  pages; the skills say Gmail and Outlook do not show SVG, so email images stay
  PNG or JPEG.
- The `mailtea` skill now says a templated `email.send` may leave out
  `subject`, `from` and `sender_id` (the template's published subject and sender
  are used), and that template variables fill the subject like the body.
- The `mailtea` skill no longer tells the agent that editing a published
  template unpublishes it. Editing a published template, or restoring an older
  version onto one, saves the change as unpublished changes: the template
  keeps its published status, and automations and the API keep sending its
  published version until `template.publish` is called again. That includes a
  new From or Reply-To. The response's `has_unpublished_versions: true`
  replaces the old `unpublished: true` as the signal to read.
  `template.unpublish` is the only way to stop a published template sending,
  short of deleting it.
- The skill now explains `is_current` (the version that matches the design
  being edited) and `is_published` (the version that is sending) in
  `template.versions`.
- The skill now says that creating a post from a template escapes the
  variables you pass. This is a breaking change on the server: HTML passed in
  a variable now shows up as text unless the template uses `{{{key}}}`.
- Automations are safer to edit while they are live, and the agent sees why.
  Saving a live automation is refused only when the edit adds a new problem;
  problems the live version already had are marked `pre_existing` and no
  longer block the save. Changing what starts a live automation now needs a
  pause first (`trigger_locked_while_active`). An automation with nothing
  after its trigger, or with a rule that reads a step that is not in the
  automation, can't be started, unless it was already live that way.
  Moving a rule (removing a rule beside it, or grouping it) does not make an
  old problem new: issues about a rule carry `field`, what it reads. A
  `validate_only` dry run on a live automation gets the same refusals as the
  save.

## 0.5.0 (2026-09-19)

- Both rules below are Mailtea Cloud only, and the skill says so — a
  self-hosted install is exempt from each.
- The skill states the inbound-reply allowance: a team with no verified domain
  may still reply to whoever wrote to them, but not cc or bcc anyone else, and
  not follow a `Reply-To` that points away from the sender.
- The `mailtea` skill says `from` must be on a domain the user's team has
  verified — any publication of it counts — and that anything else, Mailtea's
  own addresses included, is refused with `422` and
  `reason: "DOMAIN_NOT_VERIFIED"`. A team-scoped key naming no publication used
  to skip that check.
- The `mailtea` skill says that until the user's team has verified a sending
  domain of its own, Mailtea only delivers to verified members of that team —
  whatever `from` is used, and on replies to inbound mail as well. Any other
  recipient refuses the whole send with `403` and
  `reason: "system_domain_recipient_restricted"`. The skill tells the agent to
  report it and point at verifying a domain, rather than retrying or quietly
  swapping the recipient for one that would be accepted.

## 0.4.0 (2026-09-15)

- The `mailtea` skill covers test mode: a test key (`mt_test_…`) whose sends are
  validated, recorded and webhook-emitting but never delivered, the reserved
  `test.mailtea.email` recipients that force each outcome, and the `mode` filter
  on `email.list`. It also says what test mode is not — a test key reads and
  writes the real contacts, templates, senders and webhooks, so only delivery is
  simulated — and which calls a test key refuses.

## 0.3.1 (2026-09-11)

- The `mailtea-email` and `mailtea-site-design` skills no longer tell agents to
  supply a publication id. Every MCP tool now defaults it to the publication the
  connection is for, so the skills say to omit it and to ask which publication to
  use only when the connection actually reaches more than one.

## 0.3.0 (2026-09-06)

- Packaged Mailtea for every plugin client from a single package root. The
  repository root is the plugin root, and each client reads its own manifest
  beside the portable one: `.codex-plugin/` (Codex), `.claude-plugin/` (Claude
  Code), `.cursor-plugin/` (Cursor), `.grok-plugin/` (Grok Build),
  `gemini-extension.json` (Gemini CLI), and `server.json` (MCP Registry).
- Added a repository marketplace for Claude Code, Cursor, and Grok Build
  alongside the existing Codex one, so `<client> plugin marketplace add
  mailtea-app/mailtea-agent-plugin` works in each.
- Moved the Codex package from `plugins/mailtea/` to the repository root. There
  is now exactly one copy of each skill and one copy of the assets, instead of
  two.
- Switched the portable `mcp.json` to the hosted Streamable HTTP endpoint at
  `https://api.mailtea.app/mcp`, which signs in through the client's browser
  flow. The stdio `npx -y mailtea-mcp` transport stays documented for
  self-hosting and local development.
- Made the three skills client-neutral and added a per-client reconnect table,
  so the same text is correct in Codex, Claude Code, Cursor, VS Code, Kiro, and
  Grok Build.
- Added `scripts/check-manifests.mjs`, which fails the build when the manifests
  disagree on name, version, description, a referenced path, or the MCP URL.

## 0.2.1 (2026-09-06)

- Added a guided first-email starter, clearer skill names and descriptions, and two getting-started visuals.
- Added copyable example prompts, setup and permission guidance, and troubleshooting for first-time users.
- Made the Codex preview installation command explicit.

## 0.2.0 (2026-09-05)

- Added a Codex plugin at `plugins/mailtea/` with a native manifest, official Mailtea icon, three bundled skills, and hosted OAuth MCP at `https://api.mailtea.app/mcp`.
- Added a repository marketplace at `.agents/plugins/marketplace.json` for installation with `codex plugin marketplace add mailtea-app/mailtea-agent-plugin` and `codex plugin add mailtea@mailtea`.
- Kept the portable Agent Plugins manifest and stdio configuration available for other clients and self-hosted installations.
- Added Codex setup and email workflow guidance.

## 0.1.0 (2026-08-07)

- Added: the first portable [Agent Plugins](https://agent-plugins.org/) 1.0.0
  package for Mailtea. One directory a compatible client loads to get the
  Mailtea MCP server (`plugin.json` + `mcp.json`, stdio via `npx -y mailtea-mcp`)
  and three skills: `mailtea` (send, schedule, manage email and newsletters),
  `mailtea-email-design` (the structured ops path, the email-safe HTML contract,
  and the render/QA loop), and `mailtea-site-design` (pages, presets, theme,
  draft → publish for the publication website).
- Auth stays client-managed. `mcp.json` carries no credentials by design; the
  client injects `MAILTEA_API_TOKEN` (and optionally `MAILTEA_PUBLICATION_ID` /
  `MAILTEA_API_BASE_URL`) into the MCP process.
