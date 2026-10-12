# Cursor Seedance 插件

Generate Seedance videos and retrieve the finished clip. 插件复用 [Ace Data Cloud seedance MCP](https://github.com/AceDataCloud/MCPs/tree/main/seedance)，并提供专用 Agent skill。实际工具参数和限制以在线 MCP schema 为准。

[English guide](../README.md) · [可复制的首跑提示词](../examples/first-run.md) · [当前价格](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=seedance_cursor_shared_readme_pricing_zh_hans)

## 1. 搜索安装

在 Cursor 3.24 打开 **Customize → Browse Marketplace**，搜索 **Seedance**，确认作者 **Ace Data Cloud Dev** 和服务图标后点击 **Add**。较早版本可能在 Settings 中提供 Plugins 入口。也可在聊天中输入 `/add-plugin seedance`。若官方条目尚未出现，可在 `~/.cursor/plugins/local/seedance/` 本地审查；本地安装不代表 Marketplace 已上架。

## 2. 获取服务 API Key

1. 登录 [Ace Data Cloud 应用管理](https://platform.acedata.cloud/console/applications?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=seedance_cursor_shared_readme_api_key_zh_hans)。
2. 打开 **General application** 或服务专用应用，复制已有 Key；也可通过 **Manage Keys → Create** 新建 Cursor 专用 Key。
3. 确认 Seedance 权限、[当前价格](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=seedance_cursor_shared_readme_pricing_zh_hans)和余额。若启用了 **Allowed APIs**，允许 /seedance/videos, /seedance/tasks。

使用服务 API Key，不要用平台管理 token，也不要放在聊天或仓库文件中。

## 3. 配置插件

打开 **Customize → Plugins → Seedance → Configure**，将 Key 原文填入 **Ace Data Cloud API token** 并点击 **Save**。Cursor 将其用于 `ACEDATACLOUD_API_TOKEN`；插件会自行添加 `Bearer `，连接 `https://seedance.mcp.acedata.cloud/mcp`；无需安装本地 Python 服务。工具未出现时重新连接 MCP。

## 4. 首次调用

在 Cursor Agent 中复制[首跑提示词](../examples/first-run.md)。它使用 `seedance_generate_video`，模型 `doubao-seedance-2-0-mini-260615`，参数为 duration 4 seconds, resolution 480p, ratio 16:9, generate_audio false，prompt 为 `A teal paper cube slowly rotates on a cream studio background. Static camera, no text.`。执行前核对当前模型权限和价格；字段变化时以在线工具 schema 为准。

只用 `seedance_generate_video` 提交一次，保存返回的 `task_id`，随后用同一 ID 调用 `seedance_get_task` 直到终态。pending 不代表已完成；成功后打开结果地址。不要为轮询重新生成。

打开返回的video结果并检查。在 **Ace Data Cloud → Usage/Billing** 核对本次调用对应的 Credits 扣费；插件免费，API 按当前服务价格计费。

## 排障

| 现象 | 处理 |
| --- | --- |
| 找不到插件或工具 | 核对 Seedance 条目、配置 Key 并重连 MCP。 |
| 401 或 403 | 检查 Key、服务权限、余额和 Allowed APIs；配置值不要带 `Bearer `。 |
| 模型或参数错误 | 以在线 MCP schema 和账户可用模型为准。 |
| 任务 pending | 沿原 task ID 查询，不要为轮询重新生成。 |
| 429、超时或 5xx | 先检查原任务和用量记录，再决定是否再次付费提交。 |
| 结果无法打开 | 确认终态成功，打开该次调用返回的地址。 |

[源码](https://github.com/AceDataCloud/SeedanceCursor) · [问题反馈](https://github.com/AceDataCloud/SeedanceCursor/issues) · dev@acedata.cloud。图标复用 Ace Data Cloud 现有集成资源。本插件提供工具，不注册 Cursor 聊天模型 Provider。
