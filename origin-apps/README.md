# Origin Apps

Two skills for building on [Cursor Origin](https://cursor.com/docs/api/origin),
Cursor's code forge. They cover creating an Origin App, calling the API,
receiving webhooks, and bringing an existing GitHub App across. The plugin is
skills only, so it runs in Cursor, Claude Code, Codex, and any agent that
reads [Agent Skills](https://agentskills.io).

## What it includes

`origin-api` routes questions to the section of the Origin docs that answers
them and names the rules to check first (native versus mirrored repositories,
event subscriptions, webhook verification, scopes from the spec, opaque
tokens and IDs). Use it for any Origin work.

`port-github-app-to-origin` plans the move of an existing GitHub App. Run it
inside the app's repository. It reads what the app uses out of the code, maps
that onto the live Origin spec, and writes a porting brief: a capability
table, the webhook fields your handlers read and where each comes from on
Origin, the scopes to request, a first-run path, feedback for Cursor, and
the questions your team should settle first. It plans; it writes no code
unless you ask.

Both skills fetch the spec at run time and never name an endpoint from memory.

## When to use

- Writing or reviewing code that calls Origin, mints installation tokens, or
  receives Origin webhooks: `origin-api`.
- Creating an Origin App and wanting the rules to know up front:
  `origin-api`.
- Holding a GitHub App (Probot, Octokit, go-github, hand-rolled) and wanting
  to know what an Origin App version looks like before starting:
  `port-github-app-to-origin`.
- Checking how a capability your app relies on today maps onto Origin:
  `port-github-app-to-origin`.

In Cursor, ask about the Origin API or ask to port the app, or run
`/origin-api` or `/port-github-app-to-origin`.

## Install in Cursor

Search for Origin Apps in the Cursor Marketplace
([cursor.com/marketplace/origin-apps](https://cursor.com/marketplace/origin-apps)),
or open Customize, find the plugin, and install it at user or project scope.

## Use outside Cursor

The skills use only the portable
[Agent Skills](https://agentskills.io) frontmatter, so they work unchanged in
other agents.

Claude Code, via the marketplace manifest at this repository's root:

```text
/plugin marketplace add cursor/plugins
/plugin install origin-apps@cursor-plugins
```

Any agent that reads Agent Skills (Claude Code, Codex, and others): copy the
skill directories into the agent's skills folder. Copy both. The porting
skill refers to `origin-api` for fundamentals.

```bash
git clone --depth 1 https://github.com/cursor/plugins.git
# Claude Code
mkdir -p .claude/skills && cp -r plugins/origin-apps/skills/* .claude/skills/
# Codex
mkdir -p .codex/skills && cp -r plugins/origin-apps/skills/* .codex/skills/
# Cursor, without the marketplace
mkdir -p .cursor/skills && cp -r plugins/origin-apps/skills/* .cursor/skills/
```

## Requirements

- Network access to `https://cursor.com/docs/api/origin/*` during the run.
- For the porting skill, read access to the app's source. Producing the brief
  needs no Origin credentials. You follow the brief's hello-world path
  afterwards.

## Where the brief goes

The porting skill writes `ORIGIN-PORTING-BRIEF.md` at the repository root and
prints its path. When there is feedback for Cursor, it also writes that
section to `ORIGIN-FEEDBACK.md`, ready to send as is; the rest of the brief
is for your team.

## License

MIT
