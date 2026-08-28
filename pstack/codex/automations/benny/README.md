# Benny

Benny is a dormant native Codex automation pack for Slack issue reports. One project cron triages eligible reports; another verifies confirmed bugs through the real UI and may prepare a small draft fix.

Use `$pstack:setup-benny` from the target repository. It creates only secret-free, user-owned configuration under `.codex/benny/`, validates the available integrations, and asks for explicit authorization before creating or updating either Codex cron.

Codex cron automation is periodic polling, not a Slack event trigger. The source thread and all external writes remain under the coordinator's control, and a run stops with no write if it cannot prove the candidate, thread coordinates, tracker access, or control adapter are safe.

The templates and references here are source material for the three discoverable skills at `skills/setup-benny/`, `skills/triage-issue-reports/`, and `skills/reproduce-and-fix-issues/`. Keep `.codex/benny/` and any referenced secret-free configuration committed before enabling a cron. Never commit credentials, tokens, recordings, logs, or captures.
