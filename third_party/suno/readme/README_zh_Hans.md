# Suno by Ace Data Cloud：Cursor 接入教程

这是由 **Ace Data Cloud** 维护的独立 **Suno** 工具插件，提供音乐、歌词、音频编辑与任务查询；不冒充服务品牌或 Cursor 官方插件。通过托管 MCP 连接，在 Configure 中保存自己的服务 API Token 后，可在 Cursor Agent 里使用，无需启动本地服务。

通过 [Ace Data Cloud](https://platform.acedata.cloud?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=suno_cursor_shared_readme_platform_zh_hans) 托管 MCP 在 Cursor 中生成 Suno 音乐。插件提供音乐、歌词、音频编辑和任务查询工具，并附带异步任务使用说明。实际工具参数和可用模型以在线 MCP 为准。

[English guide](../README.md) · [可复制的首跑提示词](../examples/first-song.md) · [当前价格](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=suno_cursor_shared_readme_pricing_zh_hans)

## 1. 搜索并安装独立 Suno 插件

打开 [Cursor 官方插件市场](https://cursor.com/marketplace)或 Cursor 的 **Customize**，搜索 **Suno**（亦可搜 suno, music, music generation），核对显示名 **Suno by Ace Data Cloud**、作者 **Ace Data Cloud Dev**，选择 **Install** 以及项目/用户范围。Cursor 3.24 曾使用 **Customize → Browse Marketplace → Add**，以所装版本为准。安装本插件不依赖 Ace 合集。

**发布状态：**[官方收录申请](https://github.com/cursor/plugins/pull/547)仍待审核；源码公开或检查成功不等于市场已上架。准确条目不存在时，不要安装同名无关插件。可选的`~/.cursor/plugins/local/suno/`源码本地审查属于手动路径，不能计作官方分发。本插件提供工具，不会在 Cursor 聊天模型服务商列表新增 Ace 预设。

准确官方条目尚未发布时，按[固定候选本地审查步骤](../docs/local-review.md)复制已跟踪文件并记录commit，不猜市场地址。加载前核已有安装、允许本地导入，再Reload；指向外部源码目录的软链接会被跳过，同名市场安装优先。本地加载不计官方安装成功。

## 2. 注册/登录并取得服务 API Token

1. 打开 [Ace Data Cloud](https://platform.acedata.cloud/?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=suno_cursor_shared_readme_register_signin_zh_hans)注册或登录，再进入 [Applications 应用管理](https://platform.acedata.cloud/console/applications?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=suno_cursor_shared_readme_api_key_zh_hans)；若尚无通用应用，先点 **Initialize General Application**。
2. 打开 **General application**，或已开通 **Suno** 的专用应用；生成前确认权限、余额及[当前价格](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=suno_cursor_shared_readme_pricing_zh_hans)。
3. 使用下图标记 **1** 的复制按钮取已有 API Key；需要独立 Cursor 凭据时，点标记 **2** 的 **Manage Keys → Create**。

![复制已有服务Token或进入Manage Keys](../assets/tutorial/get-api-key-en.png)

4. 可选新Key命名为 **Cursor Suno**，按需设置有效期、用量/API限制，创建后复制。截图里的 **Dify tutorial** 是历史示例名称，实际请填自己的Cursor名称。启用 Allowed APIs 时允许所需接口：`/suno/audios`, `/suno/tasks`。

![可选的独立API Token创建窗口](../assets/tutorial/create-api-key-en.png)

以上是复用[原Suno Dify教程](https://github.com/AceDataCloud/SunoDify/blob/8d3d03570e73324220f111f7fe343da0792a8071/README.md)的真实Ace应用管理截图，**2026-10-18核验**，原拍摄日期未记录；Key、应用ID和余额均已遮蔽。它展示Ace凭据管理，不要求为Cursor使用Dify。

只复制Token原文，不加`Bearer `、引号或图中遮蔽字符；不要使用平台管理token。不要把Key写进提示词、源码、截图或导出样例。

## 3. 粘贴到 Cursor Configure

打开 **Customize → Plugins → Suno by Ace Data Cloud → Configure**（旧版本可能只显示 **Suno**），将Token填到 **Ace Data Cloud API token**，点 **Save**，等保存完成后重开确认遮蔽值。Cursor替换`ACEDATACLOUD_API_TOKEN`，插件自行添加`Bearer `并连接托管HTTP MCP，无需启动本地Python/Node服务。工具未加载时重新连接。

路径和变量行为依据 **2026-10-18**读取的[Cursor官方插件说明](https://cursor.com/docs/reference/plugins#variables)。本插件当前版本的Configure真实截图仍待补；下方官方图只演示后续工具确认和结果区域，不是此Token输入框。

## 4. 生成并取回第一首歌

在 Agent 聊天中复制[首跑提示词](../examples/first-song.md)。它会先检查可用模型和价格，再调用一次 `suno_generate_music`，随后用返回的 `task_id` 调用 `suno_get_task`。只有在线模型列表包含 `chirp-v6` 且账户有权限时才选它。

生成接口可能先返回已受理的任务 ID；此时音乐仍在处理中。若聊天中断或任务仍是 pending，新开聊天说：“用 `suno_get_task` 查询任务 `<task_id>`，不要重新生成。”成功后打开返回的音频地址，确认文件能播放。到 **Ace Data Cloud → Usage/Billing** 核对这一次生成对应的 Credits 扣费；插件免费，API 调用按当前服务价格计费。

## 5. 确认一次工具调用并检查结果

首次免费连接检查可在Agent说：“仅列出本插件工具，不要生成任何内容。”随后用`suno_list_models`查看可用模型。新生成前核权限、现价并明确同意一次提交；关闭生成自动重试，超时先查原任务和用量，不自动另付一笔。

以下为**未经改动的Cursor官方真实截图**，于**2026-10-17**下载核验；原示例查询PostgreSQL，并非Ace，官方未注明截图版本/拍摄日期。它说明检查工具名/参数、点 **Run tool** 及查看返回值的位置，不证明本插件已安装或实测。

![Cursor官方工具确认图：PostgreSQL参考，非Ace运行](../assets/tutorial/tool-confirm.png)

![Cursor官方工具结果图：PostgreSQL参考，非Ace运行](../assets/tutorial/tool-call.png)

一次已批准生成后，仅用`suno_get_task`的 **`task_id`参数传原任务ID**。例如：“只调用`suno_get_task`，`task_id=<我的任务ID>`，不要再次生成。”确认成功终态，再打开自己实际返回的媒体URL。任务受理/pending、绿色工具标记或示例链接均不等于最终可播放结果。到Ace Usage/Billing核同一次生成的账单；Cursor和辅助模型费用另计。

![Cursor官方原图改编的Suno查询预览：非实际运行](../assets/tutorial/suno-query-preview.png)

**2026-10-17官方原图改编预览，不是Ace实测、正式发布或营收证明。** `EXAMPLE_TASK_ID`是占位编号；由协调者以官方确认窗口原图制作，未展示实际音频结果。

[截图来源、校验值及复用边界](../assets/tutorial/SOURCES.json)。

## 排障

| 现象 | 处理 |
| --- | --- |
| 找不到插件或工具 | 核对 Suno 条目、配置 Key 并重新连接 MCP。本地安装与官方市场是两回事。 |
| 401 或 403 | 检查 Key、有效期、Suno 权限、余额和允许的生成/查询 API；配置值不要带 `Bearer `。若同一 Key 直连 Ace API 成功而 Cursor 仍报 token invalid，确认 Save 已完成，重启 Cursor 后先重试旧任务只读查询。 |
| 模型或参数错误 | 调用 `suno_list_models`，以在线工具 schema 为准。 |
| 任务 pending | 沿原 task ID 继续查询，不要为轮询再次生成。 |
| 429、超时或 5xx | 先检查原任务和用量记录，再决定是否需要另一笔付费请求。 |
| 音频无法打开 | 确认任务已成功，使用该任务最终返回的地址。 |

[Suno MCP 源码](https://github.com/AceDataCloud/MCPs/tree/main/suno) · [插件问题反馈](https://github.com/AceDataCloud/SunoCursor/issues)。反馈时提供 task ID 或 trace ID，不要提供 Key。图标复用 Ace Data Cloud 现有 Suno 集成资源。本插件提供工具，不注册 Cursor 聊天模型 Provider。

[注册/登录](https://platform.acedata.cloud/?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=suno_cursor_shared_readme_register_signin_zh_hans) · [Applications / API Token](https://platform.acedata.cloud/console/applications?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=suno_cursor_shared_readme_api_key_zh_hans) · [当前Suno价格](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=suno_cursor_shared_readme_pricing_zh_hans)
