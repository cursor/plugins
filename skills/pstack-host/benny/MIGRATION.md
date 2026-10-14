# Benny 迁移核对

来源：`upstream=3357d59539a8dbe80f7a1d45bddda18abd632124`。以下源文件全部有对应文件；普通技能入口没有增加三个 Benny 指令。

| 源 | 目标 | 处理 | 核对 |
| --- | --- | --- | --- |
| `automations/benny/FOR_AGENTS.md` | `skills/pstack-host/benny/FOR_AGENTS.md` | 完整流程目标保留；Cursor 注册/automate 换宿主安装与可执行轮询 | 已回读 |
| `automations/benny/README.md` | `skills/pstack-host/benny/README.md` | 完整流程目标保留；Cursor 注册/automate 换宿主安装与可执行轮询 | 已回读 |
| `automations/benny/skills/reproduce-and-fix-issues/SKILL.md` | `skills/pstack-host/benny/skills/reproduce-and-fix-issues/instruction.md` | 完整保留正文/资源；项目路径替换；文件改名避免技能发现 | 已回读 |
| `automations/benny/skills/reproduce-and-fix-issues/references/control-adapter.md` | `skills/pstack-host/benny/skills/reproduce-and-fix-issues/references/control-adapter.md` | 完整保留正文/资源；项目路径替换 | 已回读 |
| `automations/benny/skills/reproduce-and-fix-issues/references/feature-map.example.md` | `skills/pstack-host/benny/skills/reproduce-and-fix-issues/references/feature-map.example.md` | 完整保留正文/资源；项目路径替换 | 已回读 |
| `automations/benny/skills/reproduce-and-fix-issues/references/verify-existing-fix.md` | `skills/pstack-host/benny/skills/reproduce-and-fix-issues/references/verify-existing-fix.md` | 完整保留正文/资源；项目路径替换 | 已回读 |
| `automations/benny/skills/setup-benny/SKILL.md` | `skills/pstack-host/benny/skills/setup-benny/instruction.md` | 完整流程目标保留；Cursor 注册/automate 换宿主安装与可执行轮询 | 已回读 |
| `automations/benny/skills/triage-issue-reports/SKILL.md` | `skills/pstack-host/benny/skills/triage-issue-reports/instruction.md` | 完整保留正文/资源；项目路径替换；文件改名避免技能发现 | 已回读 |
| `automations/benny/skills/triage-issue-reports/references/routing.example.md` | `skills/pstack-host/benny/skills/triage-issue-reports/references/routing.example.md` | 完整保留正文/资源；项目路径替换 | 已回读 |
| `automations/benny/templates/configuration.example.yaml` | `skills/pstack-host/benny/templates/configuration.example.yaml` | 完整保留正文/资源；项目路径替换 | 已回读 |
| `automations/benny/templates/reproduce-automation-prompt.md` | `skills/pstack-host/benny/templates/reproduce-automation-prompt.md` | 完整保留正文/资源；项目路径替换 | 已回读 |
| `automations/benny/templates/triage-automation-prompt.md` | `skills/pstack-host/benny/templates/triage-automation-prompt.md` | 完整保留正文/资源；项目路径替换 | 已回读 |

新增 `DEPLOYMENT.md`、`scripts/poll.mjs` 和 `benny-tools` 安装/测试工具。分类与复现正文业务顺序保留，复现的现有修复/所有权、两次 UI 复现、证据与草稿 PR 条件未删除。

模拟测试：pack 刷新保留目标独有文件；本地修改/无记录冲突整批拒绝；不可信作者、不同线程和多个标记拒绝；顶层去重、重启恢复、已有修复验证、外部结果不确定不重写、缺工具拒绝。真实调度、Slack、tracker、应用复现未验证，未启用。
