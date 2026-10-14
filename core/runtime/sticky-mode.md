# pstack runtime: the sticky mode shim

`/poteto-mode` is a Cursor *mode*: once entered it stays on across turns until the user opts out.
No other host has that primitive. Without a replacement, the ported mode fires once and evaporates,
which is the single largest behavioral regression in the port.

Three mechanisms, in descending order of fidelity. Use the best one the host supports.

## 1. Persistent instruction file (preferred)

On entry, write `.pstack/mode.md` and ensure the project's always-on instructions file
(`{{MEMORY_FILE}}` on this host) contains this block, exactly as written. It is the same block
`pstack init` installs:

```markdown
<!-- pstack:mode:start -->
## pstack mode

If `.pstack/mode.md` exists and its `active` field is `true`, pstack mode is ON for this project.
At the start of any turn involving engineering work, read `{{RUNTIME_DIR}}/host-binding.md`
and then the `poteto-mode` skill in full, and route the request to a playbook. A casual question is
exempt. Set `active: false` in `.pstack/mode.md`, or delete this block, to opt out.
<!-- pstack:mode:end -->
```

`.pstack/mode.md`:

```yaml
active: true
entered: <ISO date>
playbook: <the matched playbook, or none>
tier: <resolved delegation tier>
opt_out_phrase: "pstack off"
```

The always-on file is reloaded by every host on every turn, so this genuinely persists. It is also
inspectable and removable by the user, which a hidden mode is not.

## 2. Turn-boundary reminder

Hosts with a hook or rule that fires each turn get a one-line reminder, which is the closest analog
to the host's `reminder:` frontmatter:

> New task? Playbook match or rigor needed, apply pstack. Casual turn, or user opted out, do not.

On Claude Code this is a `UserPromptSubmit` hook. Keep it to one line. A reminder that restates the
whole skill burns context every turn and is worse than no reminder.

## 3. Explicit re-invocation (floor)

No persistence available. The user types the invocation each time. Say so once, at entry, in one
sentence, and do not repeat it every turn.

## Entering and leaving

**Enter** when the user invokes the mode by name, or asks for pstack-style rigor. The `poteto-mode`
bootstrap sends you here at that moment. Entering writes `active: true` through the best mechanism
above that the host supports. For mechanism 1, set `active`, `entered` and `playbook` in
`.pstack/mode.md`, and add the block above if the instructions file lacks it. `pstack on` does the
same from a shell, restoring the block when it is missing or half deleted.

**Stay on** for engineering turns: anything matching a playbook, anything nontrivial.

**Stand down** for casual turns without announcing it. Silence is the correct behavior for "what
does this function do". A mode that narrates its own applicability on every turn is noise.

**Leave** on any opt-out: "pstack off", "stop using pstack", "normal mode". Set `active: false`,
confirm in one sentence, and do not re-enter until asked.

## Do not

- Do not write the mode block into a user-global instructions file. It is per project, which is
  why `pstack init --user` installs the skills without it.
- Do not re-read the full skill on a turn you have already stood down from.
- Do not treat a mode as permission to skip the playbook match. The mode routes; it does not decide.
