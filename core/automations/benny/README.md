# benny

benny gives you two automations for slack issue reports. one triages each report. the other reproduces confirmed bugs and may prepare a small draft fix.

the files in this directory are dormant setup and automation sources. they are not invoked directly as slash skills.

## set it up

1. point your agent at [`FOR_AGENTS.md`](./FOR_AGENTS.md) and name the target repository.
2. let setup merge this whole directory into the target at `.pstack/automations/benny/`. it must preserve destination-only files and review conflicts instead of overwriting local edits.
3. let setup install pstack in the target repository for shared dependencies:

Install pstack into the target repository with `install.sh`, so benny's skills can reach the
shared pstack skills they depend on.

4. keep user-owned configuration outside the copied pack, for example in `.pstack/benny/`. adapt [`configuration.example.yaml`](./templates/configuration.example.yaml) and [`feature-map.example.md`](./skills/reproduce-and-fix-issues/references/feature-map.example.md).
5. commit the pstack files the installer wrote (plus `.cursor/settings.json` on cursor), `.pstack/automations/benny/`, and any secret-free configuration before enabling either automation.
6. on cursor, review each new automation draft or update existing automations in their editors. on other hosts, review the ci or cron job that setup prepares, or run the skills by hand with a pasted report. then send a harmless test report and verify every source-channel post stays in the original thread.
