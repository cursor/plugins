# Changelog

## 0.16.0

- Opus 5.5 (`claude-opus-5-5-max`) replaces Fable 5.1 for judgment, prose, the hardest code, the explainers, and the synthesizers. Grok 4.7 (`grok-4.7-xhigh-fast`) replaces Grok 4.6 for the code delegates, explorers, investigators, and swarm workers.
- Arena, architect, and interrogate default to one runner each on Opus 5.5, Sol, and Grok 4.7. The Opus 5 slot moved to Opus 5.5 and repeated the first slot, so it is gone.
- A `~/.cursor/rules/pstack-models.mdc` from an earlier release still pins the old models, and a rerun of `/setup-pstack` keeps them. To adopt the new defaults, delete each role line you did not choose on purpose, or delete the file and run `/setup-pstack` again.
- Autopilot owners report a code-ready head SHA. The root verifies a round there and at each later push that changes the patch, while self-proof, CI, and babysit run in parallel. Audit lanes split by focus, and proven findings go back in one fix-forward with a red test for each defect.
- Autopilot owners track their subagents in a `children.tsv`. Each tick replaces stuck work that is still needed and ends only when no delegated work is left. The multi-phase-plan tick posts a status message only for a change that no earlier message reported.
- Shipping's patch-id rule treats test, doc, and lint-only drift as noise when the builds show no real difference. Swarm briefs name the exact SHAs and the method.
- Under a full-autonomy grant, poteto-mode decides the calls the grant covers and reports a default for each call only the operator can make.
- Fifteen instructions that Opus 5.5 follows without the text are gone from blast-radius, figure-it-out, the bug-fix, feature, and pause-safely playbooks, prove-it-works, sequence-verifiable-units, show-me-your-work, tdd, technical-writing, and unslop.
- `log.sh` no longer truncates an existing log when a network mount fails its existence test.
