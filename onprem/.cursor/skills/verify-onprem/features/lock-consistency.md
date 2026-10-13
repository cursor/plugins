# Lock consistency

## Sub-features
- `closed-set`: the four real slugs appear in all nine core files; the exact-set surfaces (audit playbook step 2, setup template comment line) name both `inherit-parent` and `auto`.
- `banned-leak`: no banned-family name (claude, anthropic, fable, opus, sonnet, haiku, gemini, grok, xai, gpt, openai, sol) appears in any file that carries no lock language.

## How to get to it (user POV)
An operator who suspects the lock drifted after an edit asks "is my lock intact?" in a chat, or runs the suite after a hand-edited file. The suites answer the mechanical half of that question; the `/onprem-mode` audit playbook answers the session half (whether the machine actually has the slugs).

## Driving it with verify.py
`python3 .cursor/skills/verify-onprem/verify.py` runs both suites in one pass. Observable end state: `"ok": true` on `closed-set` and `banned-leak`, plus an evidence JSON on disk. A `closed-set` failure names the file and the missing slug; a `banned-leak` failure names file:line and the word.

## Gotchas
- The leak scan exempts any file containing lock language (never/banned/allowlist/closed). A banned family name inside a ban statement is correct content, not a leak.
- `sol` as a substring is the banned-set's own token; the scan uses word boundaries, so `consolidated` never trips it.
- These suites check text consistency, not endpoint liveness. A slug can be consistently named and still not served by the local deployment; the first real `/onprem-mode` task is that check.
