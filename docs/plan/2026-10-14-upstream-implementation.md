---
workspace: /Users/bytedance/.codex/worktrees/upstream-host-adaptation/pstack
title: 上游宿主适配实施记录
created: 2026-10-14
status: implementing
---

来源：origin/upstream 3357d59539a8dbe80f7a1d45bddda18abd632124；base：origin/main 978d51e1f9cebbef80d5f18ba3d5978d6a7ec58f。用户已授权实施及按计划向 main 提 PR。

原工作区的未提交同步 workflow、同步说明和计划保留；这次 PR 不包含同步 workflow。
旧 CLI、core、五宿主构建、查看器、运行记录工具保持原样，属于旧 0.15.15 分发；新技能独立安装。理由和升级区别见 docs/LEGACY-MANAGEMENT.md。

公共支持目录待原始安装验证后确定。setup 提供 node <support>/setup/setup.mjs --host codex|claude-code --project <path>，状态 .pstack/setup/<host>.json；实际命令和字段以实现文件为准。

任务及所有权：
- [x] 主线程：原始安装核对、公共支持目录、54 个入口路径及宿主绑定、迁移清单、安装矩阵、集成文档。
- [x] bootstrap_adapt：仅 skills/poteto-mode/scripts/**，缓存及模块解析、隔离脚本测试。
- [x] setup_adapt：skills/setup-pstack/**、skills/pstack-host/setup/**、skills/pstack-host/templates/**，agent 注册和更新测试。
- [x] benny_adapt：skills/pstack-host/benny/**、skills/pstack-host/benny-tools/**，pack 及模拟事件测试，不启用外部自动化。
- [ ] 集成后 OCR 委托审查，修复确认问题；迁移清单及真实运行证据回读；提交、推送、创建 main PR。

真实 Slack、tracker、自动触发未获指定测试目标授权，保持未验证。make-bot-ui 是否有等价能力按实际工具记录，不能宣称全量适配。

验证凭据和未验证项见 ../UPSTREAM-VALIDATION.md。公共支持名已确定为pstack-host；原始安装不携带agents证明需要公共发布目录。用户确认向main和本仓upstream分别提草稿PR；未合并原始来源分支。Claude Code真实验证待恢复登录，Benny外部测试待目标授权，make-bot-ui尚未适配。
