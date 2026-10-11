# Cursor Suno 插件

通过 [Ace Data Cloud](https://platform.acedata.cloud) 托管 MCP 在 Cursor 中生成 Suno 音乐。插件提供音乐、歌词、音频编辑和任务查询工具，并附带异步任务使用说明。实际工具参数和可用模型以在线 MCP 为准。

[English guide](../README.md) · [可复制的首跑提示词](../examples/first-song.md) · [当前价格](https://platform.acedata.cloud/models)

## 1. 搜索和安装

在 Cursor 3.24 打开 **Customize → Browse Marketplace**，搜索 **Suno**，确认作者为 **Ace Data Cloud Dev**、图标为 Suno 标志后点击 **Add**。较早版本可能在 Settings 中提供 Plugins 入口。也可在聊天中输入 `/add-plugin suno`。如果官方列表尚未出现，可将源码放在 `~/.cursor/plugins/local/suno/` 本地审查；本地安装不能证明官方市场已经上架。

## 2. 获取具有 Suno 权限的 API Key

1. 登录 [Ace Data Cloud 应用管理](https://platform.acedata.cloud/console/applications)。
2. 打开 **General application** 或 Suno 专用应用，复制已有 Key；也可通过 **Manage Keys → Create** 新建 Cursor 专用 Key。
3. 确认 Suno 已开通、余额足够，并查看[当前价格](https://platform.acedata.cloud/models)。若启用了 Allowed APIs 限制，须同时允许生成 `/suno/audios` 和查询 `/suno/tasks`。

这里使用的是服务 API Key，不是平台管理 token。不要把 Key 写进聊天或仓库文件。

## 3. 配置插件

打开 **Customize → Plugins → Suno → Configure**，将 Key 原文填入 **Ace Data Cloud API token** 并点击 **Save**。Cursor 将其用于 `ACEDATACLOUD_API_TOKEN`；插件会自行添加 `Bearer ` 前缀，并连接 `https://suno.mcp.acedata.cloud/mcp`；无需安装本地 Python 服务。工具没有出现时重新连接 MCP。

## 4. 生成并取回第一首歌

在 Agent 聊天中复制[首跑提示词](../examples/first-song.md)。它会先检查可用模型和价格，再调用一次 `suno_generate_music`，随后用返回的 `task_id` 调用 `suno_get_task`。只有在线模型列表包含 `chirp-v6` 且账户有权限时才选它。

生成接口可能先返回已受理的任务 ID；此时音乐仍在处理中。若聊天中断或任务仍是 pending，新开聊天说：“用 `suno_get_task` 查询任务 `<task_id>`，不要重新生成。”成功后打开返回的音频地址，确认文件能播放。到 **Ace Data Cloud → Usage/Billing** 核对这一次生成对应的 Credits 扣费；插件免费，API 调用按当前服务价格计费。

## 排障

| 现象 | 处理 |
| --- | --- |
| 找不到插件或工具 | 核对 Suno 条目、配置 Key 并重新连接 MCP。本地安装与官方市场是两回事。 |
| 401 或 403 | 检查 Key、有效期、Suno 权限、余额和允许的生成/查询 API；配置值不要带 `Bearer `。 |
| 模型或参数错误 | 调用 `suno_list_models`，以在线工具 schema 为准。 |
| 任务 pending | 沿原 task ID 继续查询，不要为轮询再次生成。 |
| 429、超时或 5xx | 先检查原任务和用量记录，再决定是否需要另一笔付费请求。 |
| 音频无法打开 | 确认任务已成功，使用该任务最终返回的地址。 |

[Suno MCP 源码](https://github.com/AceDataCloud/MCPs/tree/main/suno) · [插件问题反馈](https://github.com/AceDataCloud/SunoCursor/issues)。反馈时提供 task ID 或 trace ID，不要提供 Key。图标复用 Ace Data Cloud 现有 Suno 集成资源。本插件提供工具，不注册 Cursor 聊天模型 Provider。
