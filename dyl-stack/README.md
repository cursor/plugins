# dyl-stack

My agent style, layered on [pstack](../pstack/). pstack does the heavy lifting: principles, playbooks, subagent routing. dyl-stack adds the few gates I keep correcting agents on, a PR review that fits in a paste, and a Figma-to-UI flow that won't call it done until it looks right.

## Install

```bash
/add-plugin pstack
/add-plugin cursor-team-kit
/add-plugin thermos
/add-plugin dyl-stack
```

`/build-figma` also needs the Figma plugin and its MCP connected.

## Skills

| Skill | Use it when |
|---|---|
| [`/dyl-mode`](./skills/dyl-mode/SKILL.md) | Default entry for non-trivial work. Routes through pstack's `poteto-mode` playbooks with my gates on top. |
| [`/dyl-review`](./skills/dyl-review/SKILL.md) | You want up to 7 paste-ready review comments and one 🟢/🟡/🔴 call. Say "deep" to add thermos and Bugbot. Never posts. |
| [`/dyl-ready-pr`](./skills/dyl-ready-pr/SKILL.md) | "Get PR green." Deep review until 🟢, mark ready, fix conflicts, babysit CI to merge-ready. Never merges. |
| [`/build-figma`](./skills/build-figma/SKILL.md) | You have a `figma.com/design` URL with a `node-id`. Intake first, map to your repo's design system, then a visual judge against the live UI. Also fires on its own from Figma URLs. |
| [`principle-the-algorithm`](./skills/principle-the-algorithm/SKILL.md) | Referenced by `dyl-mode`. Question the requirement, delete, then optimize, accelerate, automate. |

## What dyl-mode adds over poteto-mode

- **Root cause, not symptom.** Any failure gets a `Root cause: X because Y` todo before a fix. Null guards, retries, `.skip`, and snapshot updates are symptom fixes until that line justifies them.
- **The Algorithm** before designing anything bigger than a glance-sized edit.
- **Plain replies.** Default voice is pstack's `/bro`.
- **Merge gates.** Never merge without permission in the current turn. Update the existing PR, never open a duplicate.
- **Live UI proof** via `control-ui`, and measure before coding layout bugs.
- **Taste vetoes bind.** "Roll that back" means roll it back.

## Subagent

[`dyl-agent`](./agents/dyl-agent.md) runs the style end to end. Spawn it with `subagent_type: "dyl-agent"`.

## Not shipped here

- Principles, playbooks, `/bro`, `/unslop`, and the babysit watcher ship in `pstack`.
- `deslop`, `control-ui`, `control-cli`, and `verify-this` ship in `cursor-team-kit`.
- The thermos review subagents ship in `thermos`.
- `/review-bugbot` and `/create-skill` are Cursor built-ins.

## License

MIT
