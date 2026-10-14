# upstream 宿主适配代码审查

日期：2026-10-14。最终代码结论：PASS。剩余 High / Medium：0。

范围来自 OCR workspace preview（staged + unstaged），首轮 138 个、复审 139 个可审文件。规则来自 OCR delegate rule；按清单逐文件取得 `git diff HEAD -- <path>`，读取新增内容并核对对应规则。另读取实施计划、HOST.md、setup 和 Benny 部署说明。没有调用额外 LLM 服务，没有修改实现或用户全局安装。

## 首轮问题与修复

- High：`skills/pstack-host/benny-tools/merge-pack.mjs:40` 固定临时记录文件未检查软链。提前创建 `.pstack/benny-install.json.tmp` 指向项目外文件，更新 pack 会通过 writeFile 覆盖外部文件，然后把软链改名为正式记录。隔离临时目录实际复现，回读外部文件被替换为 sourceCommit JSON。已改为 UUID 临时文件、wx 独占创建、改名及清理；补首次和升级两次外部文件不变的隔离测试。第二轮回读实现和测试，修复有效。
- Medium：`skills/setup-pstack/pstack-source.json:8` 没有声明 `poteto-mode` 依赖，但 `setup/setup.mjs:27-28` 强制读取其正文。按当前依赖补装后仍可预检成功并在 setup 遇到 ENOENT。已声明 poteto-mode，移除仅建议的验证技能强依赖；真实安装测试覆盖缺少 poteto 被拒绝、补装后注册两份 agent、技能目录哈希不变。第二轮回读实现和日志，修复有效。

## 已核对的行为与限制

setup 按管理段哈希判断冲突，保留段外模型与权限字段；上游更新和本地修改测试通过。preflight 保留项目版本优先并拒绝不兼容项目副本。bootstrap 将完整工具复制到调用项目缓存，冻结安装并重启缓存入口；并发发布采用完整目录改名。Benny 持久化 pending 后执行外部操作，未知结果不重复派发，可信作者、频道与原线程检查保留。真实调度、连接器和 UI 复现未验证。

首轮 Node setup/Benny 隔离测试 10 项通过；第二轮审查线程重新执行 13 项，全部通过，0 失败。新测试覆盖记录临时软链及三个真实 CLI 通过软链调用；三个入口使用 realpath 判断，均实际生成目标文件或持久化状态。回读 /tmp/pstack-upstream-install-final.log，12 个安装场景和最小 setup 子集通过。原始导入文件逐字节对照 upstream；继承的 latest 依赖等按来源保留，不作为本次适配引入的问题。

## 每文件规则覆盖

规则 1：JSON 键；规则 2：默认正确性、安全、并发、性能、测试；规则 3：YAML 键；规则 4：JS/TS 代码。逐文件差异已取得；来源一致标记表示与 upstream 相同。该清单不表示 54 个技能已逐个真实运行。

| 文件 | OCR 规则 | 来源 |
| --- | --- | --- |
| `.cursor-plugin/plugin.json` | 1 | upstream 一致 |
| `.gitignore` | 2 | 适配或新增 |
| `Makefile` | 2 | 适配或新增 |
| `docs/evidence/native-codex.json` | 1 | 适配或新增 |
| `docs/evidence/upstream-migration.json` | 1 | 适配或新增 |
| `plugin.json` | 1 | upstream 一致 |
| `skills/architect/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/architect/pstack-source.json` | 1 | 适配或新增 |
| `skills/arena/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/arena/pstack-source.json` | 1 | 适配或新增 |
| `skills/automate-me/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/automate-me/pstack-source.json` | 1 | 适配或新增 |
| `skills/benchmark-checklist/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/benchmark-checklist/pstack-source.json` | 1 | 适配或新增 |
| `skills/blast-radius/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/blast-radius/pstack-source.json` | 1 | 适配或新增 |
| `skills/bro/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/bro/pstack-source.json` | 1 | 适配或新增 |
| `skills/correct/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/correct/pstack-source.json` | 1 | 适配或新增 |
| `skills/create-verification-skill/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/create-verification-skill/pstack-source.json` | 1 | 适配或新增 |
| `skills/figure-it-out/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/figure-it-out/pstack-source.json` | 1 | 适配或新增 |
| `skills/how/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/how/pstack-source.json` | 1 | 适配或新增 |
| `skills/in-your-own-words/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/in-your-own-words/pstack-source.json` | 1 | 适配或新增 |
| `skills/interrogate/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/interrogate/pstack-source.json` | 1 | 适配或新增 |
| `skills/ketchup/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/ketchup/pstack-source.json` | 1 | 适配或新增 |
| `skills/maintain-verification-skill/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/maintain-verification-skill/pstack-source.json` | 1 | 适配或新增 |
| `skills/make-bot-ui/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/make-bot-ui/pstack-source.json` | 1 | 适配或新增 |
| `skills/no-comments/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/no-comments/pstack-source.json` | 1 | 适配或新增 |
| `skills/poteto-help/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/poteto-help/pstack-source.json` | 1 | 适配或新增 |
| `skills/poteto-mode/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/poteto-mode/pstack-source.json` | 1 | 适配或新增 |
| `skills/poteto-mode/scripts/bootstrap.ts` | 4 | 适配或新增 |
| `skills/poteto-mode/scripts/check-plan.mjs` | 4 | upstream 一致 |
| `skills/poteto-mode/scripts/orch/orch.ts` | 4 | upstream 一致 |
| `skills/poteto-mode/scripts/orch/store.ts` | 4 | upstream 一致 |
| `skills/poteto-mode/scripts/package.json` | 5 | 适配或新增 |
| `skills/poteto-mode/scripts/watch-pr/cli.ts` | 4 | upstream 一致 |
| `skills/poteto-mode/scripts/watch-pr/fakes.test-helper.ts` | 4 | upstream 一致 |
| `skills/poteto-mode/scripts/watch-pr/github.ts` | 4 | upstream 一致 |
| `skills/poteto-mode/scripts/watch-pr/policy.ts` | 4 | upstream 一致 |
| `skills/poteto-mode/scripts/watch-pr/render.ts` | 4 | upstream 一致 |
| `skills/poteto-mode/scripts/watch-pr/tsconfig.json` | 1 | upstream 一致 |
| `skills/poteto-mode/scripts/watch-pr/types.compile.ts` | 4 | upstream 一致 |
| `skills/poteto-mode/scripts/watch-pr/types.ts` | 4 | upstream 一致 |
| `skills/poteto-mode/scripts/watch-pr/watch-pr` | 2 | upstream 一致 |
| `skills/poteto-mode/scripts/worktree-audit.sh` | 2 | upstream 一致 |
| `skills/principle-attack-the-premise/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-attack-the-premise/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-boundary-discipline/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-boundary-discipline/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-build-the-lever/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-build-the-lever/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-encode-lessons-in-structure/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-encode-lessons-in-structure/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-exhaust-the-design-space/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-exhaust-the-design-space/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-experience-first/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-experience-first/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-explain-the-number/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-explain-the-number/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-fix-root-causes/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-fix-root-causes/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-foundational-thinking/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-foundational-thinking/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-guard-the-context-window/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-guard-the-context-window/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-laziness-protocol/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-laziness-protocol/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-make-operations-idempotent/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-make-operations-idempotent/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-migrate-callers-then-delete-legacy-apis/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-migrate-callers-then-delete-legacy-apis/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-minimize-reader-load/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-minimize-reader-load/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-model-the-domain/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-model-the-domain/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-never-block-on-the-human/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-never-block-on-the-human/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-outcome-oriented-execution/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-outcome-oriented-execution/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-prove-it-works/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-prove-it-works/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-redesign-from-first-principles/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-redesign-from-first-principles/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-separate-before-serializing-shared-state/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-separate-before-serializing-shared-state/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-sequence-verifiable-units/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-sequence-verifiable-units/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-subtract-before-you-add/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-subtract-before-you-add/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-test-behavior-not-implementation/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-test-behavior-not-implementation/pstack-source.json` | 1 | 适配或新增 |
| `skills/principle-type-system-discipline/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/principle-type-system-discipline/pstack-source.json` | 1 | 适配或新增 |
| `skills/pstack-host/benny-tools/merge-pack.mjs` | 4 | 适配或新增 |
| `skills/pstack-host/benny-tools/test-benny.mjs` | 4 | 适配或新增 |
| `skills/pstack-host/benny/scripts/poll.mjs` | 4 | 适配或新增 |
| `skills/pstack-host/benny/templates/configuration.example.yaml` | 3 | 适配或新增 |
| `skills/pstack-host/preflight.mjs` | 4 | 适配或新增 |
| `skills/pstack-host/setup/setup.mjs` | 4 | 适配或新增 |
| `skills/pstack-host/setup/setup.test.mjs` | 4 | 适配或新增 |
| `skills/pstack-host/source.json` | 1 | 适配或新增 |
| `skills/recall/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/recall/pstack-source.json` | 1 | 适配或新增 |
| `skills/reflect/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/reflect/pstack-source.json` | 1 | 适配或新增 |
| `skills/setup-pstack/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/setup-pstack/pstack-source.json` | 1 | 适配或新增 |
| `skills/sharpen/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/sharpen/pstack-source.json` | 1 | 适配或新增 |
| `skills/show-me-your-work/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/show-me-your-work/pstack-source.json` | 1 | 适配或新增 |
| `skills/show-me-your-work/scripts/log.sh` | 2 | upstream 一致 |
| `skills/swarm/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/swarm/pstack-source.json` | 1 | 适配或新增 |
| `skills/tdd/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/tdd/pstack-source.json` | 1 | 适配或新增 |
| `skills/teach/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/teach/pstack-source.json` | 1 | 适配或新增 |
| `skills/technical-writing/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/technical-writing/pstack-source.json` | 1 | 适配或新增 |
| `skills/typescript-best-practices/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/typescript-best-practices/pstack-source.json` | 1 | 适配或新增 |
| `skills/unslop/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/unslop/pstack-source.json` | 1 | 适配或新增 |
| `skills/why/agents/openai.yaml` | 3 | 适配或新增 |
| `skills/why/pstack-source.json` | 1 | 适配或新增 |
| `tests/upstream-install.mjs` | 4 | 适配或新增 |

## 第二轮范围和验证边界

使用最终 OCR workspace preview 和 rule 清单重新匹配 139 条路径并取得 git diff；初轮已覆盖文件沿用首轮结果，重点复查记录写入、软链 CLI 入口、setup 依赖和安装子集测试，新增 native-codex.json 按 JSON 规则检查。技能入口缺公共支持时的措辞改为停止并给补装命令，符合用户授权边界。

回读 native-codex.json，包含 Codex 0.161.0 的两次 agent_type 命名委托 call_id。它只证明已记录的 Codex 调用，不证明全部工作流执行。Claude Code 登录返回 401，原生新会话仍未验证；真实 Benny 调度和外部写入仍未验证。代码 PASS 不替代这些验证。
