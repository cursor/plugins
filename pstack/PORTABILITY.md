# pstack portability contract

This fork preserves pstack's 44-skill behavior from upstream commit
`60c641e4fad674784b30abcf9f8915dea39df38d` while making its instructions
usable by any Agent Skills-compatible host.

## Portable core

Instructions under `skills/` describe capabilities, not vendors:

- delegate work through the host's native subagent mechanism;
- inherit the current model unless the user maps a role to a confirmed model;
- use host-exposed task, question, transcript, connector, and wait features when
  available;
- degrade explicitly when a capability is unavailable;
- never guess model identifiers or scan unrelated sessions.

The portable core must not require a named model, a Cursor path, or Cursor's
tool-call schema.

## Adapters

Host-specific delivery may name its host. The Cursor plugin manifest, Cursor
agent definitions, Benny automations, and Cursor protocol recognition in
`watch-pr` are adapters, not portable behavior. Portable skills use only
Agent Skills frontmatter; pstack-specific values live under `metadata` and
have an equivalent instruction in the body. Other host adapters should be
added only when executable behavior actually differs.

## Identity and acceptance

The objective, 44 skill names, triggers, playbook routes, safety boundaries,
and verification intent are human-owned. A genericization change may edit
wording and capability binding; it may not silently change those invariants.

Compare every candidate with both the upstream commit above and the current
fork. Do not create a release tag or promote the generic package until:

1. `node scripts/check-pstack-portability.mjs` passes;
2. all existing pstack runtime tests pass;
3. all skill references still resolve;
4. clean-session smoke tests pass in Cursor and at least two non-Cursor hosts;
5. unavailable capabilities produce an explicit bounded fallback.

The currently installed upstream pstack remains the rollback target until all
five gates pass.
