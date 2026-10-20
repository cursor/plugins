# Registration

## Sub-features
- `registration`: the 16 skill links under `~/.claude/skills/` resolve to plugin skill directories with a readable SKILL.md, and `~/.cursor/agents/onprem-agent.md` resolves.
- `--doctor`: the read-only readiness check (plugin root, manifest, rule file presence, git origin) that answers "is this machine worth driving at all?"

## How to get to it (user POV)
On the author's machine the plugin is wired by symlinks into the skill and agent roots so every new session sees it. A fresh clone is not wired: Cursor picks up `~/.cursor/plugins/local/` at startup, and a window reload may be needed. The suite tells the operator which of the two states they are in.

## Driving it with verify.py
`python3 .cursor/skills/verify-onprem/verify.py --doctor` for the readiness answer; the default pass for the link resolution. On a fresh clone the registration suite reports `skip:` with the missing names and exits 0.

## Gotchas
- Symlinks that resolve to a deleted plugin directory fail this suite; re-point them at the live checkout.
- The skill-link list in verify.py must track the plugin's skill directories. Adding or renaming a skill leaf means updating SKILL_LINKS in the same commit.
