# Reproduce automation prompt

> Source material for `$pstack:setup-benny`. Use it to create or update a user-authorized native Codex project cron; do not paste secrets into the cron prompt.

Run `$pstack:reproduce-and-fix-issues` for this project cron.

Run the cron on `gpt-5.6-terra` at `xhigh`. Route high-volume extraction and
evidence verification to `gpt-5.6-luna`, ordinary implementation to Terra,
hard debugging or security-sensitive reasoning to `gpt-5.6-sol`, and only
isolated bounded micro-edits to `gpt-5.3-codex-spark`; every route remains
`xhigh`.

Read the committed, secret-free configuration at:

```text
{{BENNY_CONFIG_PATH}}
```

On each run, poll only the configured Slack source channel for top-level reports within the configured lookback. Derive and freeze the source root coordinates from Slack, then wait only for a trusted triage marker under that root. Stop without posting when the report was already processed, the marker is missing or untrusted, source coordinates are uncertain, a person owns the fix, or an existing pull request or commit plausibly fixes it.

Require the configured control-adapter skill and feature map. Reproduce the exact discriminating symptom twice through the real UI, capture proof, and verify existing fixes without competing changes. Attempt one bounded root-cause fix only after the operational gates pass; open a draft pull request only after before-and-after evidence and required checks pass.

The coordinator is the only Slack writer. Every child receives a direct ban on Slack writes and no credentials, posting instructions, source coordinates for posting, or external-write authority. Never post a root message in the source channel. Do not use webhooks, browser automation, plugin manifests, or undocumented automation services.
