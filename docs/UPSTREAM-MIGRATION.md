# 上游内容迁移清单

来源：`3357d59539a8dbe80f7a1d45bddda18abd632124`，169 个文件。原始插件版本 0.15.24。每项回读后标记；整体流程验证与逐入口可运行状态单列，文件存在不等于运行验证。

旧 CLI、core、build、packaging、evals、install.sh 保留原样，见 LEGACY-MANAGEMENT.md。根 README 为上游原文加安装适配说明；旧 README 保存在 LEGACY-MANAGEMENT.md。.gitignore 合并两份规则。

| 回读 | 源路径 | 目标路径 | 处理 |
| --- | --- | --- | --- |
| [x] | `.cursor-plugin/plugin.json` | `.cursor-plugin/plugin.json` | 逐字节一致 |
| [x] | `.gitignore` | `.gitignore` | 保留完整原文并加宿主说明 |
| [x] | `LICENSE` | `LICENSE` | 逐字节一致 |
| [x] | `README.md` | `README.md` | 保留完整原文并加宿主说明 |
| [x] | `agents/comment-sicko.md` | `skills/pstack-host/agents/comment-sicko.md` | 逐字节一致 |
| [x] | `agents/poteto-agent.md` | `skills/pstack-host/agents/poteto-agent.md` | 逐字节一致 |
| [x] | `assets/logo.png` | `assets/logo.png` | 逐字节一致 |
| [x] | `automations/benny/FOR_AGENTS.md` | `skills/pstack-host/benny/FOR_AGENTS.md` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `automations/benny/README.md` | `skills/pstack-host/benny/README.md` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `automations/benny/skills/reproduce-and-fix-issues/SKILL.md` | `skills/pstack-host/benny/skills/reproduce-and-fix-issues/instruction.md` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md` | `skills/pstack-host/benny/skills/reproduce-and-fix-issues/references/control-adapter.md` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `automations/benny/skills/reproduce-and-fix-issues/references/feature-map.example.md` | `skills/pstack-host/benny/skills/reproduce-and-fix-issues/references/feature-map.example.md` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `automations/benny/skills/reproduce-and-fix-issues/references/verify-existing-fix.md` | `skills/pstack-host/benny/skills/reproduce-and-fix-issues/references/verify-existing-fix.md` | 逐字节一致 |
| [x] | `automations/benny/skills/setup-benny/SKILL.md` | `skills/pstack-host/benny/skills/setup-benny/instruction.md` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `automations/benny/skills/triage-issue-reports/SKILL.md` | `skills/pstack-host/benny/skills/triage-issue-reports/instruction.md` | 逐字节一致 |
| [x] | `automations/benny/skills/triage-issue-reports/references/routing.example.md` | `skills/pstack-host/benny/skills/triage-issue-reports/references/routing.example.md` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `automations/benny/templates/configuration.example.yaml` | `skills/pstack-host/benny/templates/configuration.example.yaml` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `automations/benny/templates/reproduce-automation-prompt.md` | `skills/pstack-host/benny/templates/reproduce-automation-prompt.md` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `automations/benny/templates/triage-automation-prompt.md` | `skills/pstack-host/benny/templates/triage-automation-prompt.md` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `docs/guide/01-setup.md` | `docs/guide/01-setup.md` | 逐字节一致 |
| [x] | `docs/guide/02-poteto-mode.md` | `docs/guide/02-poteto-mode.md` | 逐字节一致 |
| [x] | `docs/guide/03-understand.md` | `docs/guide/03-understand.md` | 逐字节一致 |
| [x] | `docs/guide/04-design.md` | `docs/guide/04-design.md` | 逐字节一致 |
| [x] | `docs/guide/05-build-and-clean.md` | `docs/guide/05-build-and-clean.md` | 逐字节一致 |
| [x] | `docs/guide/06-verify-and-ship.md` | `docs/guide/06-verify-and-ship.md` | 逐字节一致 |
| [x] | `docs/guide/07-overnight.md` | `docs/guide/07-overnight.md` | 逐字节一致 |
| [x] | `docs/guide/08-principles.md` | `docs/guide/08-principles.md` | 逐字节一致 |
| [x] | `docs/guide/09-make-it-yours.md` | `docs/guide/09-make-it-yours.md` | 逐字节一致 |
| [x] | `docs/guide/10-recipes-and-pitfalls.md` | `docs/guide/10-recipes-and-pitfalls.md` | 逐字节一致 |
| [x] | `docs/guide/README.md` | `docs/guide/README.md` | 逐字节一致 |
| [x] | `docs/guide/images/design.jpg` | `docs/guide/images/design.jpg` | 逐字节一致 |
| [x] | `docs/guide/images/overnight.jpg` | `docs/guide/images/overnight.jpg` | 逐字节一致 |
| [x] | `docs/guide/images/recipes.jpg` | `docs/guide/images/recipes.jpg` | 逐字节一致 |
| [x] | `docs/guide/images/router.jpg` | `docs/guide/images/router.jpg` | 逐字节一致 |
| [x] | `docs/guide/images/understanding.jpg` | `docs/guide/images/understanding.jpg` | 逐字节一致 |
| [x] | `docs/guide/images/verification.jpg` | `docs/guide/images/verification.jpg` | 逐字节一致 |
| [x] | `plugin.json` | `plugin.json` | 逐字节一致 |
| [x] | `skills/architect/SKILL.md` | `skills/architect/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/architect/references/design-red-flags.md` | `skills/architect/references/design-red-flags.md` | 逐字节一致 |
| [x] | `skills/architect/references/rationale-template.md` | `skills/architect/references/rationale-template.md` | 逐字节一致 |
| [x] | `skills/architect/references/runner-prompt.md` | `skills/architect/references/runner-prompt.md` | 逐字节一致 |
| [x] | `skills/arena/SKILL.md` | `skills/arena/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/automate-me/SKILL.md` | `skills/automate-me/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/benchmark-checklist/SKILL.md` | `skills/benchmark-checklist/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/blast-radius/SKILL.md` | `skills/blast-radius/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/bro/SKILL.md` | `skills/bro/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/correct/SKILL.md` | `skills/correct/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/create-verification-skill/SKILL.md` | `skills/create-verification-skill/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/create-verification-skill/references/feature-map-example/README.md` | `skills/create-verification-skill/references/feature-map-example/README.md` | 逐字节一致 |
| [x] | `skills/create-verification-skill/references/feature-map-example/create-note.md` | `skills/create-verification-skill/references/feature-map-example/create-note.md` | 逐字节一致 |
| [x] | `skills/create-verification-skill/references/feature-map-example/search.md` | `skills/create-verification-skill/references/feature-map-example/search.md` | 逐字节一致 |
| [x] | `skills/figure-it-out/SKILL.md` | `skills/figure-it-out/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/how/SKILL.md` | `skills/how/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/how/references/explainer-prompt.md` | `skills/how/references/explainer-prompt.md` | 逐字节一致 |
| [x] | `skills/how/references/explorer-prompt.md` | `skills/how/references/explorer-prompt.md` | 逐字节一致 |
| [x] | `skills/in-your-own-words/SKILL.md` | `skills/in-your-own-words/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/interrogate/SKILL.md` | `skills/interrogate/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/interrogate/references/code-quality-review.md` | `skills/interrogate/references/code-quality-review.md` | 逐字节一致 |
| [x] | `skills/interrogate/references/lead-judgment.md` | `skills/interrogate/references/lead-judgment.md` | 逐字节一致 |
| [x] | `skills/interrogate/references/reviewer-prompt.md` | `skills/interrogate/references/reviewer-prompt.md` | 逐字节一致 |
| [x] | `skills/interrogate/references/rubric.md` | `skills/interrogate/references/rubric.md` | 逐字节一致 |
| [x] | `skills/ketchup/SKILL.md` | `skills/ketchup/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/maintain-verification-skill/SKILL.md` | `skills/maintain-verification-skill/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/make-bot-ui/SKILL.md` | `skills/make-bot-ui/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/no-comments/SKILL.md` | `skills/no-comments/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/poteto-help/SKILL.md` | `skills/poteto-help/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/poteto-help/references/prompting.md` | `skills/poteto-help/references/prompting.md` | 逐字节一致 |
| [x] | `skills/poteto-help/references/recipes.md` | `skills/poteto-help/references/recipes.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/SKILL.md` | `skills/poteto-mode/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/poteto-mode/playbooks/authoring-a-skill.md` | `skills/poteto-mode/playbooks/authoring-a-skill.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/autonomous-run.md` | `skills/poteto-mode/playbooks/autonomous-run.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/autopilot-full.md` | `skills/poteto-mode/playbooks/autopilot-full.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/autopilot-stack.md` | `skills/poteto-mode/playbooks/autopilot-stack.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/babysit.md` | `skills/poteto-mode/playbooks/babysit.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/bug-fix.md` | `skills/poteto-mode/playbooks/bug-fix.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/eval.md` | `skills/poteto-mode/playbooks/eval.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/feature.md` | `skills/poteto-mode/playbooks/feature.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/hillclimb.md` | `skills/poteto-mode/playbooks/hillclimb.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/investigation.md` | `skills/poteto-mode/playbooks/investigation.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/multi-phase-plan.md` | `skills/poteto-mode/playbooks/multi-phase-plan.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/opening-a-pr.md` | `skills/poteto-mode/playbooks/opening-a-pr.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/orchestrate.md` | `skills/poteto-mode/playbooks/orchestrate.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/pause-safely.md` | `skills/poteto-mode/playbooks/pause-safely.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/perf-issue.md` | `skills/poteto-mode/playbooks/perf-issue.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/prototype.md` | `skills/poteto-mode/playbooks/prototype.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/refactoring.md` | `skills/poteto-mode/playbooks/refactoring.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/runtime-forensics.md` | `skills/poteto-mode/playbooks/runtime-forensics.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/session-pickup.md` | `skills/poteto-mode/playbooks/session-pickup.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/shipping.md` | `skills/poteto-mode/playbooks/shipping.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/trace-forensics.md` | `skills/poteto-mode/playbooks/trace-forensics.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/visual-parity.md` | `skills/poteto-mode/playbooks/visual-parity.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/playbooks/worktree-cleanup.md` | `skills/poteto-mode/playbooks/worktree-cleanup.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/references/bugbot-triage.md` | `skills/poteto-mode/references/bugbot-triage.md` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/bootstrap.ts` | `skills/poteto-mode/scripts/bootstrap.ts` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `skills/poteto-mode/scripts/bun.lock` | `skills/poteto-mode/scripts/bun.lock` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/check-plan.mjs` | `skills/poteto-mode/scripts/check-plan.mjs` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/check-plan.test.ts` | `skills/poteto-mode/scripts/check-plan.test.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/orch/orch.test.ts` | `skills/poteto-mode/scripts/orch/orch.test.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/orch/orch.ts` | `skills/poteto-mode/scripts/orch/orch.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/orch/store.ts` | `skills/poteto-mode/scripts/orch/store.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/package.json` | `skills/poteto-mode/scripts/package.json` | 宿主适配修改，见 diff 和验证记录 |
| [x] | `skills/poteto-mode/scripts/watch-pr/cli.test.ts` | `skills/poteto-mode/scripts/watch-pr/cli.test.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/watch-pr/cli.ts` | `skills/poteto-mode/scripts/watch-pr/cli.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/watch-pr/fakes.test-helper.ts` | `skills/poteto-mode/scripts/watch-pr/fakes.test-helper.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/watch-pr/github.test.ts` | `skills/poteto-mode/scripts/watch-pr/github.test.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/watch-pr/github.ts` | `skills/poteto-mode/scripts/watch-pr/github.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/watch-pr/policy.test.ts` | `skills/poteto-mode/scripts/watch-pr/policy.test.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/watch-pr/policy.ts` | `skills/poteto-mode/scripts/watch-pr/policy.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/watch-pr/render.ts` | `skills/poteto-mode/scripts/watch-pr/render.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/watch-pr/tsconfig.json` | `skills/poteto-mode/scripts/watch-pr/tsconfig.json` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/watch-pr/types.compile.ts` | `skills/poteto-mode/scripts/watch-pr/types.compile.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/watch-pr/types.ts` | `skills/poteto-mode/scripts/watch-pr/types.ts` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/watch-pr/watch-pr` | `skills/poteto-mode/scripts/watch-pr/watch-pr` | 逐字节一致 |
| [x] | `skills/poteto-mode/scripts/worktree-audit.sh` | `skills/poteto-mode/scripts/worktree-audit.sh` | 逐字节一致 |
| [x] | `skills/principle-attack-the-premise/SKILL.md` | `skills/principle-attack-the-premise/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-boundary-discipline/SKILL.md` | `skills/principle-boundary-discipline/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-build-the-lever/SKILL.md` | `skills/principle-build-the-lever/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-encode-lessons-in-structure/SKILL.md` | `skills/principle-encode-lessons-in-structure/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-exhaust-the-design-space/SKILL.md` | `skills/principle-exhaust-the-design-space/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-experience-first/SKILL.md` | `skills/principle-experience-first/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-explain-the-number/SKILL.md` | `skills/principle-explain-the-number/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-fix-root-causes/SKILL.md` | `skills/principle-fix-root-causes/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-foundational-thinking/SKILL.md` | `skills/principle-foundational-thinking/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-guard-the-context-window/SKILL.md` | `skills/principle-guard-the-context-window/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-laziness-protocol/SKILL.md` | `skills/principle-laziness-protocol/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-make-operations-idempotent/SKILL.md` | `skills/principle-make-operations-idempotent/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md` | `skills/principle-migrate-callers-then-delete-legacy-apis/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-minimize-reader-load/SKILL.md` | `skills/principle-minimize-reader-load/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-model-the-domain/SKILL.md` | `skills/principle-model-the-domain/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-never-block-on-the-human/SKILL.md` | `skills/principle-never-block-on-the-human/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-outcome-oriented-execution/SKILL.md` | `skills/principle-outcome-oriented-execution/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-prove-it-works/SKILL.md` | `skills/principle-prove-it-works/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-redesign-from-first-principles/SKILL.md` | `skills/principle-redesign-from-first-principles/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-separate-before-serializing-shared-state/SKILL.md` | `skills/principle-separate-before-serializing-shared-state/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-sequence-verifiable-units/SKILL.md` | `skills/principle-sequence-verifiable-units/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-subtract-before-you-add/SKILL.md` | `skills/principle-subtract-before-you-add/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-test-behavior-not-implementation/SKILL.md` | `skills/principle-test-behavior-not-implementation/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/principle-type-system-discipline/SKILL.md` | `skills/principle-type-system-discipline/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/recall/SKILL.md` | `skills/recall/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/reflect/SKILL.md` | `skills/reflect/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/reflect/references/divergent-reviewer.md` | `skills/reflect/references/divergent-reviewer.md` | 逐字节一致 |
| [x] | `skills/reflect/references/judgment-reviewer.md` | `skills/reflect/references/judgment-reviewer.md` | 逐字节一致 |
| [x] | `skills/reflect/references/synthesizer.md` | `skills/reflect/references/synthesizer.md` | 逐字节一致 |
| [x] | `skills/reflect/references/tooling-reviewer.md` | `skills/reflect/references/tooling-reviewer.md` | 逐字节一致 |
| [x] | `skills/setup-pstack/SKILL.md` | `skills/setup-pstack/references/upstream-setup.md` | 逐字节一致 |
| [x] | `skills/sharpen/SKILL.md` | `skills/sharpen/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/show-me-your-work/SKILL.md` | `skills/show-me-your-work/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/show-me-your-work/references/decision-log-template.tsv` | `skills/show-me-your-work/references/decision-log-template.tsv` | 逐字节一致 |
| [x] | `skills/show-me-your-work/scripts/log.sh` | `skills/show-me-your-work/scripts/log.sh` | 逐字节一致 |
| [x] | `skills/swarm/SKILL.md` | `skills/swarm/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/tdd/SKILL.md` | `skills/tdd/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/teach/SKILL.md` | `skills/teach/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/technical-writing/SKILL.md` | `skills/technical-writing/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/typescript-best-practices/SKILL.md` | `skills/typescript-best-practices/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/typescript-best-practices/references/patterns.md` | `skills/typescript-best-practices/references/patterns.md` | 逐字节一致 |
| [x] | `skills/unslop/SKILL.md` | `skills/unslop/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/why/SKILL.md` | `skills/why/SKILL.md` | 原 frontmatter 和完整正文保留；新增宿主绑定段 |
| [x] | `skills/why/references/epistemics.md` | `skills/why/references/epistemics.md` | 逐字节一致 |
| [x] | `skills/why/references/investigator-prompt.md` | `skills/why/references/investigator-prompt.md` | 逐字节一致 |
| [x] | `skills/why/references/source-playbook.md` | `skills/why/references/source-playbook.md` | 逐字节一致 |
| [x] | `skills/why/references/sources/code-archaeology.md` | `skills/why/references/sources/code-archaeology.md` | 逐字节一致 |
| [x] | `skills/why/references/sources/databricks.md` | `skills/why/references/sources/databricks.md` | 逐字节一致 |
| [x] | `skills/why/references/sources/datadog.md` | `skills/why/references/sources/datadog.md` | 逐字节一致 |
| [x] | `skills/why/references/sources/incident-postmortem.md` | `skills/why/references/sources/incident-postmortem.md` | 逐字节一致 |
| [x] | `skills/why/references/sources/linear.md` | `skills/why/references/sources/linear.md` | 逐字节一致 |
| [x] | `skills/why/references/sources/notion.md` | `skills/why/references/sources/notion.md` | 逐字节一致 |
| [x] | `skills/why/references/sources/sentry.md` | `skills/why/references/sources/sentry.md` | 逐字节一致 |
| [x] | `skills/why/references/sources/slack.md` | `skills/why/references/sources/slack.md` | 逐字节一致 |
| [x] | `skills/why/references/synthesizer-prompt.md` | `skills/why/references/synthesizer-prompt.md` | 逐字节一致 |

所有169个源文件已逐项回读，hash凭据见 [upstream-migration.json](evidence/upstream-migration.json)。文件迁移不代表每个流程真实执行。
