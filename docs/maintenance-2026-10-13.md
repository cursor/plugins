# Upstream maintenance, 2026-10-13

## Scope

Integrate cursor/plugins `1dcc2bacde73ddd284803b7af28164d0436198fc` (pstack 0.15.21) from the previous pin `ccb5507cec1546dc88135c1139c811e6c59115ba`, based on fork main `f755e1ff74b990083cf336a882c1a7206960193c`. The upstream range contains 51 commits. The full repository merge retains other upstream plugin changes; those are distinct from the portable pstack adaptation.

The raw pstack, Thermos, README, and deslop dependency sources remain pristine at the new pin. Thermos and Claude-only Mods source and adapter content are unchanged. Their generated manifest versions advance only the upstream pin; their content digests remain unchanged.

## Adaptation changes

- Keep the new ketchup entry point explicitly invoked on both hosts. The previous generator dropped its `disable-model-invocation` flag. Add the matching Codex invocation policy and rejection tests for either policy being weakened.
- Review the upstream plan checker's fenced-code parser update and update the portable companion's source digest. Its diagnostics and output protocol are unchanged. Add portable regressions for nested, tilde, indented, and properly closed code examples; substantive structural failures remain failures.
- Keep the parent chat as the playbook runner, with native poteto-agent wrappers handling delegated steps. Recognize both the new `comment-sicko` name and the previous display name in runtime mappings.
- Regenerate all portable packages. Keep upstream's new root plugin manifest as source content; Claude and Codex portable manifests continue to carry their host registrations and adapter version.

## Executed checks

- Portable generation drift and pristine-source validation passed.
- All 133 portable Python regression tests passed, including Mods evidence/generator tests, Thermos, install verification, local worktree auditing, and sync fail-closed tests.
- All 63 upstream Bun tests passed in an isolated scripts copy (orchestrator, watch-pr, and plan checker); strict watch-pr TypeScript checking passed.
- Skills CLI 1.7.2 installed all 54 pstack skills and all 3 Thermos skills into isolated projects for both Claude Code and Codex. The installation verifier checked every bundled resource.
- Repository-wide marketplace/plugin schema validation passed.
- Shell syntax and staged/unstaged whitespace checks passed.
- Both compatibility failures were reproduced against the previous fork code before checking the fixes: ketchup lost explicit-only metadata; the plan companion rejected the updated upstream checker as source drift.

These checks establish source, packaging, executable helper, and installation behavior. They do not establish that a model follows every workflow. Native Claude Code plugin validation, native Mods execution, real model-turn behavior, and end-to-end watch-pr against GitHub were not run in this cloud environment. No user installation was changed.

## Sync queue

The open-sync-PR gate remains unchanged. It deliberately fails rather than overwriting a pending branch. The earlier draft PR #8 covers an older upstream revision and is still separate from this maintenance branch. Publishing, resolving that draft, triggering workflows, and merging require the corresponding authorized repository action; none is performed by generating this update.
