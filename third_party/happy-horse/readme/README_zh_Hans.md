# Happy Horse by Ace Data Cloud：Cursor 接入教程

这是由 **Ace Data Cloud** 维护的独立 **Happy Horse** 工具插件，提供视频生成、图片或参考素材输入、视频编辑与任务查询；不冒充服务品牌或 Cursor 官方插件。通过托管 MCP 连接，在 Configure 中保存自己的服务 API Token 后，可在 Cursor Agent 里使用，无需启动本地服务。

Generate Happy Horse videos and retrieve the finished clip. 插件复用 [Ace Data Cloud happyhorse MCP](https://github.com/AceDataCloud/MCPs/tree/main/happyhorse)，并提供专用 Agent skill。实际工具参数和限制以在线 MCP schema 为准。

[English guide](../README.md) · [可复制的首跑提示词](../examples/first-run.md) · [当前价格](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=happy_horse_cursor_shared_readme_pricing_zh_hans)

## 1. 搜索并安装独立 Happy Horse 插件

打开 [Cursor 官方插件市场](https://cursor.com/marketplace)或 Cursor 的 **Customize**，搜索 **Happy Horse**（亦可搜 happy horse, happyhorse, happy-horse），核对显示名 **Happy Horse by Ace Data Cloud**、作者 **Ace Data Cloud Dev**，选择 **Install** 以及项目/用户范围。Cursor 3.24 曾使用 **Customize → Browse Marketplace → Add**，以所装版本为准。安装本插件不依赖 Ace 合集。

**发布状态：**[官方收录申请](https://github.com/cursor/plugins/pull/552)仍待审核；源码公开或检查成功不等于市场已上架。准确条目不存在时，不要安装同名无关插件。可选的`~/.cursor/plugins/local/happy-horse/`源码本地审查属于手动路径，不能计作官方分发。本插件提供工具，不会在 Cursor 聊天模型服务商列表新增 Ace 预设。

## 2. 注册/登录并取得服务 API Token

1. 打开 [Ace Data Cloud](https://platform.acedata.cloud/?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=happy_horse_cursor_shared_readme_register_signin_zh_hans)注册或登录，再进入 [Applications 应用管理](https://platform.acedata.cloud/console/applications?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=happy_horse_cursor_shared_readme_api_key_zh_hans)；若尚无通用应用，先点 **Initialize General Application**。
2. 打开 **General application**，或已开通 **Happy Horse** 的专用应用；生成前确认权限、余额及[当前价格](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=happy_horse_cursor_shared_readme_pricing_zh_hans)。
3. 使用下图标记 **1** 的复制按钮取已有 API Key；需要独立 Cursor 凭据时，点标记 **2** 的 **Manage Keys → Create**。

![复制已有服务Token或进入Manage Keys](../assets/tutorial/get-api-key-en.png)

4. 可选新Key命名为 **Cursor Happy Horse**，按需设置有效期、用量/API限制，创建后复制。截图里的 **Dify tutorial** 是历史示例名称，实际请填自己的Cursor名称。启用 Allowed APIs 时允许所需接口：`/happyhorse/videos`, `/happyhorse/tasks`。

![可选的独立API Token创建窗口](../assets/tutorial/create-api-key-en.png)

以上是复用[原Suno Dify教程](https://github.com/AceDataCloud/SunoDify/blob/8d3d03570e73324220f111f7fe343da0792a8071/README.md)的真实Ace应用管理截图，**2026-10-18核验**，原拍摄日期未记录；Key、应用ID和余额均已遮蔽。它展示Ace凭据管理，不要求为Cursor使用Dify。

只复制Token原文，不加`Bearer `、引号或图中遮蔽字符；不要使用平台管理token。不要把Key写进提示词、源码、截图或导出样例。

## 3. 粘贴到 Cursor Configure

打开 **Customize → Plugins → Happy Horse by Ace Data Cloud → Configure**（旧版本可能只显示 **Happy Horse**），将Token填到 **Ace Data Cloud API token**，点 **Save**，等保存完成后重开确认遮蔽值。Cursor替换`ACEDATACLOUD_API_TOKEN`，插件自行添加`Bearer `并连接托管HTTP MCP，无需启动本地Python/Node服务。工具未加载时重新连接。

路径和变量行为依据 **2026-10-18**读取的[Cursor官方插件说明](https://cursor.com/docs/reference/plugins#variables)。本插件当前版本的Configure真实截图仍待补；下方官方图只演示后续工具确认和结果区域，不是此Token输入框。

## 4. 首次调用

在 Cursor Agent 中复制[首跑提示词](../examples/first-run.md)。它使用 `happyhorse_generate_video`，模型 `happyhorse-1.1-t2v`，参数为 duration 3 seconds, resolution 720P, ratio 16:9, watermark false，prompt 为 `A teal cube on a cream table, slow camera orbit, simple studio lighting, no text.`。执行前核对当前模型权限和价格；字段变化时以在线工具 schema 为准。

只用 `happyhorse_generate_video` 提交一次，保存返回的 `task_id`，随后用同一 ID 调用 `happyhorse_get_task` 直到终态。pending 不代表已完成；成功后打开结果地址。不要为轮询重新生成。

打开返回的video结果并检查。在 **Ace Data Cloud → Usage/Billing** 核对本次调用对应的 Credits 扣费；插件免费，API 按当前服务价格计费。

## 5. 确认一次工具调用并检查结果

首次免费连接检查可在Agent说：“仅列出本插件工具，不要生成任何内容。”随后用`happyhorse_list_models`查看可用模型。新生成前核权限、现价并明确同意一次提交；关闭生成自动重试，超时先查原任务和用量，不自动另付一笔。

以下为**未经改动的Cursor官方真实截图**，于**2026-10-17**下载核验；原示例查询PostgreSQL，并非Ace，官方未注明截图版本/拍摄日期。它说明检查工具名/参数、点 **Run tool** 及查看返回值的位置，不证明本插件已安装或实测。

![Cursor官方工具确认图：PostgreSQL参考，非Ace运行](../assets/tutorial/tool-confirm.png)

![Cursor官方工具结果图：PostgreSQL参考，非Ace运行](../assets/tutorial/tool-call.png)

一次已批准生成后，仅用`happyhorse_get_task`的 **`task_id`参数传原任务ID**。例如：“只调用`happyhorse_get_task`，`task_id=<我的任务ID>`，不要再次生成。”确认成功终态，再打开自己实际返回的媒体URL。任务受理/pending、绿色工具标记或示例链接均不等于最终可播放结果。到Ace Usage/Billing核同一次生成的账单；Cursor和辅助模型费用另计。

[截图来源、校验值及复用边界](../assets/tutorial/SOURCES.json)。

## 排障

| 现象 | 处理 |
| --- | --- |
| 找不到插件或工具 | 核对 Happy Horse 条目、配置 Key 并重连 MCP。 |
| 401 或 403 | 检查 Key、服务权限、余额和 Allowed APIs；配置值不要带 `Bearer `。 |
| 模型或参数错误 | 以在线 MCP schema 和账户可用模型为准。 |
| 任务 pending | 沿原 task ID 查询，不要为轮询重新生成。 |
| 429、超时或 5xx | 先检查原任务和用量记录，再决定是否再次付费提交。 |
| 结果无法打开 | 确认终态成功，打开该次调用返回的地址。 |

[源码](https://github.com/AceDataCloud/HappyHorseCursor) · [问题反馈](https://github.com/AceDataCloud/HappyHorseCursor/issues) · dev@acedata.cloud。图标复用 Ace Data Cloud 现有集成资源。本插件提供工具，不注册 Cursor 聊天模型 Provider。

[注册/登录](https://platform.acedata.cloud/?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=happy_horse_cursor_shared_readme_register_signin_zh_hans) · [Applications / API Token](https://platform.acedata.cloud/console/applications?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=happy_horse_cursor_shared_readme_api_key_zh_hans) · [当前Happy Horse价格](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=happy_horse_cursor_shared_readme_pricing_zh_hans)
