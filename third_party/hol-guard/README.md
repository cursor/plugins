# HOL Guard

Cursor plugin that adds an agent skill for setting up and operating [HOL Guard](https://github.com/hashgraph-online/hol-guard), an open-source runtime and supply-chain security layer for AI agents.

## Install

1. Open **Cursor Settings → Plugins**.
2. Search for **HOL Guard**.
3. Click **Install**.

Or run `/add-plugin hol-guard` in chat.

## Set up Guard

HOL Guard is a separate local CLI. The plugin does not bundle or silently install the runtime.

```bash
pipx install hol-guard
hol-guard init
```

`hol-guard init` is the preferred guided setup: it discovers supported agent harnesses, shows the plan before side effects, and asks for approval at each checkpoint. For explicit Cursor harness setup, use:

```bash
hol-guard install cursor
```

Verify the local installation with:

```bash
hol-guard status
hol-guard doctor
```

Review pending decisions and local evidence with:

```bash
hol-guard approvals
hol-guard receipts
```

## Cursor security model

HOL Guard supports Cursor, but it does not replace Cursor's native tool approval. The current Cursor integration respects native tool approval and focuses Guard on artifact trust before launch.

`hol-guard command test` and `hol-guard command explain` are inspection-only helpers. They do not execute the command, apply final runtime policy, create an approval, or record a receipt. Use Guard's harness setup for protection rather than treating those commands as an enforcement wrapper.

Guard works locally without a cloud account. Guard Cloud is optional for synchronized evidence, team policy, fleet visibility, and shared approval workflows.

## Docs

- HOL Guard: https://github.com/hashgraph-online/hol-guard
- Product: https://hol.org/guard
- Harness support: https://github.com/hashgraph-online/hol-guard/blob/main/docs/guard/harness-support.md

## License

This Cursor marketplace packaging is MIT licensed. HOL Guard itself is licensed Apache-2.0 in its upstream repository.
