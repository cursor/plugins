# benny

benny gives you two cursor automations for slack issue reports. one triages each report. the other reproduces confirmed bugs and may prepare a small draft fix.

## skills

- `/setup-benny` adds pstack to your target repository, checks your configuration, and guides you through the two automations.
- `/triage-issue-reports` reads one report, checks for duplicate tracker issues, and posts one verdict in the original slack thread.
- `/reproduce-and-fix-issues` waits for a trusted verdict, reproduces the bug through the real ui, verifies existing fixes, and may open a bounded draft pull request.

## set it up

1. run `/setup-benny` from a session where pstack is available.
2. let setup merge this project plugin entry into the target repository's `.cursor/settings.json`. keep every unrelated setting and plugin.

```json
{
	"plugins": {
		"pstack": { "enabled": true }
	}
}
```

3. open a fresh agent in the target repository. confirm that the three benny skills and pstack's `how`, `why`, `tdd`, `unslop`, and required principle skills resolve in project scope. if project plugins are unavailable, stop. do not copy only the benny skills.
4. commit `.cursor/settings.json` before enabling either automation. fresh automation checkouts need that setting to load the skills.
5. adapt [`configuration.example.yaml`](./templates/configuration.example.yaml) and [`feature-map.example.md`](./skills/reproduce-and-fix-issues/references/feature-map.example.md). provide your slack channel, tracker, repository, app-specific [control adapter](./skills/reproduce-and-fix-issues/references/control-adapter.md), models, and budgets.
6. keep secrets in your secret manager or environment. keep captures out of source control.
7. for new automations, review each `/automate` draft and editor handoff. for existing automations, update them in their editors instead of creating duplicates.
8. send a harmless test report before enabling normal traffic. every source-channel post must stay in the original thread.
