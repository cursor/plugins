---
name: agent-factory
description: >-
  连接并使用智能体工场：MCP 地址与鉴权、弹表单收账密代签 PAT、项目/任务六工具与 status、含 demo。用户说连工场、列项目、建任务、装工场
  MCP 时用。
---
# 智能体工场

同事 bot / Agent 安装本插件后，用户说「连智能体工场 / 装工场 MCP / 列工场项目 / 建任务」即按下列执行。

## MCP

| 项 | 值 |
| --- | --- |
| URL | `https://agent.bitilinks.cn/api/connector/mcp` |
| 传输 | Streamable HTTP |
| 鉴权 | `Authorization: Bearer <afpat_…>` |
| 连接器名 | `智能体工场` |

只认 Bearer PAT，不读 cookie。令牌绑签发时唯一工作空间。无效/吊销 → 401 `{ "error": "未连接或令牌无效" }`。

签发：登录后 `POST https://agent.bitilinks.cn/api/connector/tokens`（明文只出现一次）。`GET` 列元数据；`DELETE` 吊销。默认 scope：`projects:read|write`、`tasks:read|write`。

装连接器（Grok Bot）：`AddMcpServer` → name `智能体工场`，url 同上，headers Bearer。本插件在 Cursor 里通过 `mcp.json` + 变量 `AF_CONNECTOR_TOKEN` 注入。

## 接入（强制）

禁止用户手抄/手填/粘贴 PAT 到聊天。

1. 已连接且 `list_projects` 通则结束。
2. 未装或 401：主动说明要账密 → Vault 或安全表单（勿往聊天贴密码）。
3. 代登录 → 签发 PAT → 写入连接器 / 插件变量。
4. 冒烟 `list_projects` / `list_tasks`；PAT 永不进聊天。

## 项目与任务

- **项目**：工作空间容器；对外 `name` = 现网 `title`；不可删。
- **任务**：工作项，不是智能体执行；`create_task` 不开跑；无 `project_id` 进「收件箱」。

| 工具 | 用途 |
| --- | --- |
| `list_projects` | 列项目 |
| `create_project(name)` | 新建项目 |
| `rename_project(id, name)` | 改名 |
| `list_tasks(project_id?)` | 我的任务 |
| `create_task(title, project_id?)` | 新建（不开跑） |
| `update_task(id, title?, status?)` | 改标题/状态 |

status：`backlog` `todo` `in_progress` `failed` `in_review` `blocked` `done` `cancelled`。

## Demo（对话 → 工具）

**连上**

- 用户：「帮我连智能体工场」
- Bot：检查连接器 → 未通则弹表单收账密 → 登录签发 PAT → 装 MCP → 「已连上，可以列项目/建任务了。」（不展示 PAT）

**列项目**

- 用户：「工场有哪些项目？」
- Bot：`list_projects` → 用短列表回项目名与 id。

**建项目**

- 用户：「建个项目叫 春季活动」
- Bot：`create_project({ name: "春季活动" })` → 回新项目 id 与名称。

**改名**

- 用户：「把刚才那个项目改成 春季活动-正式」
- Bot：用已知 id → `rename_project({ id, name: "春季活动-正式" })`。

**建任务（收件箱）**

- 用户：「记个待办：核对报名表」
- Bot：`create_task({ title: "核对报名表" })` → 进收件箱；说明未启动智能体。

**建任务（指定项目）**

- 用户：「在春季活动下加任务：设计海报」
- Bot：先 `list_projects` 找 id（若未知）→ `create_task({ title: "设计海报", project_id })`。

**列任务**

- 用户：「我的工场任务」 / 「春季活动里有哪些任务」
- Bot：`list_tasks()` 或 `list_tasks({ project_id })` → 标题 + status。

**改状态**

- 用户：「把『设计海报』标成进行中 / 做完了」
- Bot：`update_task({ id, status: "in_progress" })` 或 `status: "done"`。

## 不做

不引导去设置页复制 token；不暴露执行 run；不删项目/成员/评论；不双写 Todoist。
