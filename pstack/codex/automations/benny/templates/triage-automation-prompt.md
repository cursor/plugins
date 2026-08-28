# Triage automation prompt

> Source material for `$pstack:setup-benny`. Use it to create or update a user-authorized native Codex project cron; do not paste secrets into the cron prompt.

Run `$pstack:triage-issue-reports` for this project cron.

Run the cron on `gpt-5.6-luna` at `xhigh`. Route high-volume extraction and
verification to Luna, ordinary source tracing to `gpt-5.6-terra`, hard
debugging or security-sensitive reasoning to `gpt-5.6-sol`, and only isolated
bounded micro-edits to `gpt-5.3-codex-spark`; every route remains `xhigh`.

Read the committed, secret-free configuration at:

```text
{{BENNY_CONFIG_PATH}}
```

On each run, poll only the configured Slack source channel for top-level reports within the configured lookback. Do not treat cron metadata as a Slack event payload. Establish the source channel and root thread timestamp from Slack before work; stop without posting or tracker writes if either is missing, changed, inaccessible, or cannot be proved unhandled.

Read the full report thread and attachments, trace the likely layer, deduplicate through the configured tracker, and create only a clear net-new bug or performance issue. The coordinator is the only Slack writer. Each child receives a direct ban on all Slack writes and no credentials or external-write authority.

Post exactly one concise verdict only as a reply in the immutable source thread. Never post a root message in the source channel. End the verdict with exactly one configured marker:

```text
[benny:bug]
[benny:performance]
[benny:other]
```

A bug or performance marker may add `tracker=<URL>`. Do not use webhooks, browser automation, plugin manifests, or undocumented automation services.
