# 宿主适配验证

来源 3357d59539a8dbe80f7a1d45bddda18abd632124。169个源文件逐项回读，54原名入口+1公共支持入口。原始cursor/plugins提交1e5c90a4的pstack tree与upstream tree均为7bd1e77c112fab2bac404ccc939a95f0c57820aa，重新fetch后确认一致。

- Node setup/Benny 13项测试通过，包括更新保留用户内容、冲突拒绝、随机独占临时记录、软链CLI启动和模拟事件恢复。
- Bun 70项测试、280次断言通过，严格类型检查通过；并发冷启动、frozen失败恢复、锁文件更新、只读安装目录和移开源码已检查。忙机超过原测试默认5s限时后，以120s重跑通过。
- 真实skills@1.7.2安装12场景及最小setup子集通过；移开源码逐字节及权限比较、项目优先及混装拒绝、installed orch调用均通过。
- Codex CLI 0.161.0新会话实际调用poteto-agent、comment-sicko并由父线程回读；另跑architect/arena、why、bug-fix，7个poteto-agent及1个comment-sicko实际运行。父线程node check.mjs退出0，输出add verified。原未写成功配置的第一次测试不计入通过。凭据见 evidence/native-codex.json及evidence/codex/。
- Claude Code 2.1.299因OAuth过期返回401，真实新会话未验证。用户2026-10-14明确选择先提交草稿PR，保留此项未验证。
- Benny mock和真实Node本地入口测试通过；Slack/tracker/UI adapter未连接，自动触发和真实复现未验证，未启用调度。
- OCR第二轮139个可审文件PASS，无剩余High/Medium；报告见UPSTREAM-REVIEW.md。

保留工具的回归：make all通过（五宿主构建/链接/路由、4构建锁测试、86运行记录测试、291 YAML块无错误）；evals13测试0失败1跳过（未安装旧CLI）。旧CLI测试在Python3.11下因既有Path.read_text(newline=...)不支持大量失败；用项目声明的Python3.13重跑为304通过、3跳过、2个大小写文件系统测试失败。相同2测试在main源副本复现失败，旧core/build/packaging/evals/install.sh未修改；不把这些失败写成通过。源README及automate-me的既有末尾空白保留，git diff --check会报告这些原始空白。

发布目录实测267个文件，约824KB；对main的差异包含原始内容导入，不能与之前生成包新增行直接比较。公共agent及benny源只发布一份，没有旧五宿主生成副本。

## 逐入口覆盖

静态适配表示完整正文和宿主绑定已核对，不代表每个入口已真实执行。

| 原始name | Codex | Claude Code |
| --- | --- | --- |
| `architect` | Codex CLI 0.161.0 实际命名委托及代表流程通过；外部操作按测试范围跳过 | 静态适配；OAuth 401，真实运行未验证 |
| `arena` | Codex CLI 0.161.0 实际命名委托及代表流程通过；外部操作按测试范围跳过 | 静态适配；OAuth 401，真实运行未验证 |
| `automate-me` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `benchmark-checklist` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `blast-radius` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `bro` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `correct` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `create-verification-skill` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `figure-it-out` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `how` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `in-your-own-words` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `interrogate` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `ketchup` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `maintain-verification-skill` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `Make Bot UI` | 尚未适配：Cursor 专用状态、webhook、sender key | 尚未适配：Cursor 专用状态、webhook、sender key |
| `no-comments` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `poteto-help` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `Poteto Mode` | Codex CLI 0.161.0 实际命名委托及代表流程通过；外部操作按测试范围跳过 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-attack-the-premise` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-boundary-discipline` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-build-the-lever` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-encode-lessons-in-structure` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-exhaust-the-design-space` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-experience-first` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-explain-the-number` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-fix-root-causes` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-foundational-thinking` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-guard-the-context-window` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-laziness-protocol` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-make-operations-idempotent` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-migrate-callers-then-delete-legacy-apis` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-minimize-reader-load` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-model-the-domain` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-never-block-on-the-human` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-outcome-oriented-execution` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-prove-it-works` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-redesign-from-first-principles` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-separate-before-serializing-shared-state` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-sequence-verifiable-units` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-subtract-before-you-add` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-test-behavior-not-implementation` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `principle-type-system-discipline` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `recall` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `reflect` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `setup-pstack` | 注册、更新、冲突测试及新会话实际命名调用通过 | 静态适配；OAuth 401，真实运行未验证 |
| `sharpen` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `show-me-your-work` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `swarm` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `tdd` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `teach` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `technical-writing` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `typescript-best-practices` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `unslop` | 静态适配；未逐入口真实运行 | 静态适配；OAuth 401，真实运行未验证 |
| `why` | Codex CLI 0.161.0 实际命名委托及代表流程通过；外部操作按测试范围跳过 | 静态适配；OAuth 401，真实运行未验证 |
