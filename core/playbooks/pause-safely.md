### Pause safely

**You own a clean stop. Leave a checkpoint a cold-start agent can resume from.** This is explicit only. On "keep going", "going to bed, keep going", or "don't stop", do not pause.

1. Stop at a safe boundary. Finish the current atomic step or back out of it. Start nothing new, and cancel any nested subagents. With a run record, pause the task's run and start no run of your own. Record each subagent `rr delegate --job <job> --status cancelled --reason "paused"`, then close the current phase: `--done` if it finished, `--block "paused: <why>"` if you backed out. A paused run refuses phase entries, so record them now. On resume, `rr resume`, then `--start` picks the blocked attempt back up.
2. Take no irreversible action to pause. No PR and no push unless you already had one out.
3. Make the work durable. Commit uncommitted edits as one clear `wip:` commit on the current branch so nothing is lost. If the tree is broken, say so in the commit body in one line.
4. Write the resume note off-context. Capture intent, what you were doing, progress and what's verified, current state, next steps, key files, and gotchas. For the compaction trigger write it to a file like `/tmp/<slug>-resume.md`. If a show-me-your-work trail exists, point at it instead of duplicating it. With a run record, finish with `rr pause --next "<first action on resume>"` on the task's run. `rr check` then reports that run incomplete with this resume point, which is the honest state of a pause.

**Reply:** where you are in the loop, what's on disk versus still in your head (paths, no diff dumps), the commits you made and whether the tree is clean, and the first action on resume. This is a pause, not a final report.
