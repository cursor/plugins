### Pause safely

**You own a clean stop. Leave a checkpoint a cold-start agent can resume from.** This is explicit only. On "keep going", "going to bed, keep going", or "don't stop", do not pause.

1. Stop at a safe boundary. Finish the current atomic step or back out of it. Start nothing new, and cancel any nested subagents.
2. Take no irreversible action to pause. No PR and no push unless you already had one out.
3. Make the work durable. Commit uncommitted edits as one clear `wip:` commit on the current branch so nothing is lost. If the tree is broken, say so in the commit body in one line.
4. Write the resume note off-context. Capture intent, what you were doing, progress and what's verified, current state, next steps, key files, and gotchas. Write it where it survives a restart: `.audit/<slug>-resume.md`, next to the show-me-your-work trail when one exists. Only for the compaction trigger, where no restart is involved, is a file like `/tmp/<slug>-resume.md` fine. If a show-me-your-work trail exists, point at it instead of duplicating it. Name the note's path in your reply so Session pickup can find it.

**Reply:** where you are in the loop, what's on disk versus still in your head (paths, no diff dumps), the commits you made and whether the tree is clean, the path of the resume note, and the first action on resume. This is a pause, not a final report.
