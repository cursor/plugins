# Maintenance closeout behavioral screen

These six public cases exercise the closeout decision after a supplied maintenance
pass. They cover explicit delegation, standalone publication, installation without
ownership, clean and blocked runs, and a separate product regression. The runner
sends the skill, request, and run note to a model; `criteria` stay with the grader.
Model calls run in a temporary Git workspace with no contribution history, so
checkout context cannot reveal the intended change or imply delivery ownership.
The cases are development material, not a hidden benchmark.

Run from the repository root with Ruby, Git, and an authenticated Claude Code CLI:

```sh
ruby evals/pstack/maintenance-closeout/run.rb \
  pstack/skills/maintain-verification-skill/SKILL.md \
  /tmp/maintenance-responses \
  claude -p --permission-mode plan --permission-prompts none --restricted \
  --safe-mode --strict-mcp-config --tools '' --output-format json -
```

Use a fresh output directory per run. Pin and record the model, effort, CLI
version, and skill revision when comparing revisions. Repeat with the original
skill saved outside the checkout to check for standalone regressions. Inspect
the CLI result for errors even when its process exits zero.

Give an independent grader the requests, run notes, criteria, and responses under
anonymous labels. Keep model names and which revision produced each response out
of its input. Grade each criterion pass/fail with a supporting response excerpt;
the author then reads every response and resolves disagreements. Capture failures
and missing responses rather than discarding them. Keep raw prompts and responses
outside Git; summarize counts, failures, and limitations in the PR.

This measures a model's stated closeout decision. It does not execute publication,
prove tool restraint, run the preceding maintenance steps, verify the supplied
artifacts, or establish end-to-end Shaka compatibility. A captured response is not
a passing grade. One screen cannot establish reliability or improvement over the
original skill. Repository checks validate packaging separately.
