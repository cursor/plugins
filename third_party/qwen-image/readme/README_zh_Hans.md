# Cursor Qwen Image 插件

通过 [Ace Data Cloud](https://platform.acedata.cloud) 在 Cursor 中生成或编辑 Qwen Image 图片。插件自带无第三方依赖的本地 MCP 服务，提供生成和同 task ID 查询工具；请求参数沿用 Ace Data Cloud Dify 集成已验证的当前服务契约。

[English guide](../README.md) · [可复制的首跑提示词](../examples/first-image.md) · [当前价格](https://platform.acedata.cloud/models)

## 1. 安装

先安装 [Node.js 20 或更新版本](https://nodejs.org/en/download)，并在终端运行 `node --version`。插件用 `node` 启动本地 MCP，不下载 npm 包或远端可执行程序。

在 Cursor 3.24 打开 **Customize → Browse Marketplace**，搜索 **Qwen Image**，确认作者 **Ace Data Cloud Dev** 和服务图标，再点击 **Add**。较早版本可能将 Plugins 放在 Settings。官方条目尚未出现时，可把本目录复制到 `~/.cursor/plugins/local/qwen-image/`，再到 **Customize → Plugins** 查看 **Local** 标签；本地安装不代表 Marketplace 已上架。

## 2. 获取服务 API Key

1. 登录 [Ace Data Cloud 应用管理](https://platform.acedata.cloud/console/applications)。
2. 打开 **General application** 或 Qwen Image 专用应用，复制已有服务 Key；也可通过 **Manage Keys → Create** 新建 Cursor 专用 Key。
3. 确认 Qwen Image 权限、[当前价格](https://platform.acedata.cloud/models)和余额。若启用了 **Allowed APIs**，同时允许 `/qwen-image/images` 和 `/qwen-image/tasks`。

使用服务 API Key，不要使用平台管理 token；也不要把 Key 写进提示词或仓库。

## 3. 配置插件

打开 **Customize → Plugins → Qwen Image → Configure**，将 Key 原文填入 **Ace Data Cloud API token** 并保存。团队管理员也可通过 **Dashboard → Plugins → Configure** 配置同一变量。插件把值作为 `ACEDATACLOUD_API_TOKEN` 传给本地 MCP，并自行加上 Bearer 请求头。

`mcp.json` 从 `CURSOR_PLUGIN_ROOT` 启动 `server.mjs`，只使用 Node 内置 fetch。若 MCP 没有启动，检查 Cursor 进程 PATH 中能找到 `node`，然后重连插件。

## 4. 生成并取回首张图片

在 Cursor Agent 中复制[首跑提示词](../examples/first-image.md)。示例只调用一次 `qwen_image_generate`，使用账户可用时的 `qwen-image-3.0`、尺寸 `1024*1024`、数量 `1`、无水印。实际可用模型以当前服务契约为准。

付费生成可能先返回 `task_id`，此时图片仍在处理。保存这个 ID，沿同一 ID 调用 `qwen_image_get_task`，直到 `status=succeeded` 并返回图片地址。聊天中断时新开聊天说“查询 Qwen Image 任务 <task_id>，不要重新生成”。打开最终 HTTPS PNG 检查图片。

到 **Ace Data Cloud → Usage/Billing** 核对这一次生成对应的 Credits 扣费。任务查询不会再提交生成。插件免费，API 调用按当前服务价格计费。

## 排障

| 现象 | 处理 |
| --- | --- |
| 找不到插件 | 核对 Qwen Image 条目和作者；本地插件与官方市场是两条渠道。 |
| MCP 未启动 | 运行 `node --version`，确认 Node 20+ 在 Cursor 的 PATH 中，再重连。 |
| 401 或 403 | 检查服务 Key、有效期、权限、余额和两个 Allowed APIs；配置值不要带 `Bearer `。 |
| 模型或尺寸错误 | 用当前支持的模型，尺寸写成 `WIDTH*HEIGHT`，例如 `1024*1024`。 |
| pending 或任务中断 | 沿原 task ID 查询，不要为轮询再次生成。 |
| 超时或 5xx | 先检查原任务和用量记录，再决定是否需要另一笔付费请求。 |
| 图片无法打开 | 确认终态成功，使用该任务最终返回的地址。 |

[源码](https://github.com/AceDataCloud/QwenImageCursor) · [问题反馈](https://github.com/AceDataCloud/QwenImageCursor/issues) · dev@acedata.cloud。图标复用 Ace Data Cloud 现有 Qwen Image 集成资源。本插件提供工具，不注册 Cursor 聊天模型 Provider。
