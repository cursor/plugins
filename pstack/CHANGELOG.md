# Changelog

All notable changes to the `pstack` plugin, newest first. Entries are merged pull
requests that touch `pstack/`. Backfilled through 2026-10-19; earlier history lives
in the git log.

## 2026-11-19

- fix: run /statechart on native Windows and read TLC's CRLF line ends (#1292).
- chore: run the Gemini panel seat at gemini-4-neon-xhigh (#1284).
- chore: route the Gemini seat to Gemini 4 Neon (#1283).

## 2026-11-16

- feat: shorter skill texts, worker.md, and Opus-first routing capped at xhigh (#1249).

## 2026-11-15

- feat: new default models, one-file why and how, statechart fixes, and sharpen and reflect text (#1236).

## 2026-10-27

- feat: make Orchestrate agentic and delete the orch scripts (#1043).
- feat: port recent skill updates (#986).
- chore: bump to 0.15.34 (#983).
- fix: keep qualified action names in property traces (#982).
- chore: bump to 0.15.33 (#978).
- feat: port the statechart compiler (#977).
- test: wait for the reap in the statechart SIGKILL view test (#981).

## 2026-10-23

- fix: renumber swarm's Phase A and fix its dangling table reference (#807).
- docs: note Claude Code auto-update is off for third-party marketplaces (#806).
- fix: read transcript mtimes with GNU stat and date in worktree-audit (#805).
- fix: prefer active PR over branch history in orch (#804).
- fix: recognize matching inline code delimiters (#803).
- fix: cap watch-pr polling sleeps at the deadline (#802).
- fix: distinguish fork heads during stack discovery in watch-pr (#801).
- fix: route reflect edits out of the plugin cache (#800).
- chore: bump to 0.15.32 (#798).
- feat: add the ketchup-video skill (#797).
- feat: tell generated verify skills to read each model-check result with /statechart (#794).
- chore: bump to 0.15.31 (#792).
- feat: bring the statechart skill up to date, with the Pele renderer (#791).

## 2026-10-22

- refactor: delete statechart comments that repeat the code, and rename helpers (#779).
- fix: bring the statechart skill up to date with six fixes (#776).
- feat: add the statechart skill to draw TLA+ models as charts (#741).

## 2026-10-20

- fix: restore /sharpen to the original prompt, return only the rewrite (#729).

## 2026-10-19

- chore: bump to 0.15.28, sync guide with create-formal-verification-skill (#724).
