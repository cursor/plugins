# Origin Apps

Two skills for building on [Cursor Origin](https://cursor.com/docs/api/origin),
Cursor's code forge. They cover creating an Origin App, calling the API,
receiving webhooks, and moving an existing GitHub App over. The plugin is
skills only, so it runs in Cursor, Claude Code, Codex, and any agent that
reads [Agent Skills](https://agentskills.io).

## What it includes

`origin-api` sends the agent to the section of the Origin docs that answers
its question and lists the rules to check first: native versus mirrored
repositories, event subscriptions, webhook verification, scopes from the
spec, opaque tokens and IDs. Use it for any Origin work.

`port-github-app-to-origin` plans the move of an existing GitHub App. Run it
inside the app's repository. It reads what the app uses out of the code,
maps that onto the live Origin spec, and writes a porting brief with what
carries over and what does not, the webhook fields your handlers read and
where each comes from on Origin, the scopes to request, an end-to-end test
for your app, feedback for Cursor, and the questions your team has to
decide. It plans. It writes no code unless you ask.

Both skills read the live spec at run time and never name an endpoint from memory.

## When to use

Ask about the Origin API, or ask to port a GitHub App, and the matching skill
loads. In Cursor you can also run `/origin-api` or
`/port-github-app-to-origin`.

## Install in Cursor

Search for Origin Apps in the Cursor Marketplace
([cursor.com/marketplace/origin-apps](https://cursor.com/marketplace/origin-apps)),
or open Customize, find the plugin, and install it at user or project scope.

## Use outside Cursor

The skills use only portable [Agent Skills](https://agentskills.io)
frontmatter. In Claude Code: `/plugin marketplace add cursor/plugins` then
`/plugin install origin-apps@cursor-plugins`. Any other agent: copy
`origin-apps/skills/*` into its skills folder (copy both; the porting skill
refers to `origin-api`).

## Requirements

- Network access to `https://cursor.com/docs/api/origin/*` during the run.
- For the porting skill, read access to the app's source. Writing the brief
  needs no Origin credentials. You run the brief's end-to-end test
  afterwards.

## Where the brief goes

The porting skill writes `ORIGIN-PORTING-BRIEF.md` at the repository root and
prints its path. When there is feedback for Cursor, it also writes that
section to `ORIGIN-FEEDBACK.md`, ready to send as is; the rest of the brief
is for your team.

## License

MIT
