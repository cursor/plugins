# Verified plans

Use a repository-local Markdown plan when several verifiable steps need to survive a session change. Include exactly one `## Tasks` section. Each checkbox has a unique ID, a one-line title, and a single shell command on the following line.

```markdown
## Tasks

- [ ] T01: Verify the build with the project's build command
  Verify: `npm run build`
- [ ] T02: Verify the behavior with the project's targeted test
  Verify: `npm test -- checkout`
```

Keep the goal, acceptance criteria, decisions, and live or performance evidence in other sections. Use the repo's actual commands. A check should be repeatable and return a nonzero exit status when the criterion fails. Record manual evidence in the corresponding PR section.

Run from the target repository root. Resolve the script path from the installed skill's `scripts/verify-plan.mjs`. Review verification commands before running them because they execute in the local shell.

- `node <script> <plan.md> --status` lists progress and names the first unchecked task.
- Implement the first unchecked task. Run `node <script> <plan.md> --next` to verify it and record a pass. If it fails, diagnose and retry the same task. Use one owner per plan.
- Once all tasks pass, run `node <script> <plan.md> --final` to recheck them in order. This leaves the plan unchanged. If a recheck fails, repair the regression and rerun the final check.
