# 可灵 AI Cursor 插件

This marketplace lists the upstream `cn` branch separately as `kling-ai-cn` so it can be installed alongside the Global listing.

在 Cursor 的 Agent 对话中生成图片和视频、复用主体、查询任务进度。
这是 `cn` 分支的**国内版**，版本 **1.4.2**。使用国际站账号请前往
[`main` 分支](https://github.com/klingai-tech/cursor-plugin/tree/main)。

## 快速开始

### 1. 安装插件

打开 Cursor 桌面端，在 **Agent** 对话中粘贴这段话。

> 请从 https://github.com/klingai-tech/cursor-plugin 的 `cn` 分支安装可灵 AI Cursor 插件。
> 参照 Cursor 的本地插件安装说明，安装后引导我重载 Cursor、连接可灵国内站账号，
> 并检查连接和可用灵感值。先不要发起生成任务。

[可灵 MCP & CLI 官方指南（国内）](https://klingai.com/app/mcp/guide) ·
[Cursor 本地插件安装说明](https://cursor.com/docs/plugins#test-plugins-locally)

#### 手动安装

macOS 或 Linux 用户可在终端运行以下命令。

```bash
git clone --branch cn --single-branch https://github.com/klingai-tech/cursor-plugin.git
cd cursor-plugin
mkdir -p ~/.cursor/plugins/local/kling-ai
cp -R .cursor-plugin assets rules skills mcp.json README.md ~/.cursor/plugins/local/kling-ai/
```

<details>
<summary>Windows PowerShell</summary>

```powershell
git clone --branch cn --single-branch https://github.com/klingai-tech/cursor-plugin.git
Set-Location cursor-plugin
$pluginDir = Join-Path $HOME '.cursor/plugins/local/kling-ai'
New-Item -ItemType Directory -Force -Path $pluginDir | Out-Null
Copy-Item -Recurse -Force -Path .cursor-plugin, assets, rules, skills, mcp.json, README.md -Destination $pluginDir
```

</details>

如果已经克隆过仓库，更新本地 `cn` 分支，在仓库根目录执行复制步骤即可。
如果旧版的本地插件目录里还有 `commands/kling-ai.md`，请在重载前移除该旧文件。

[Cursor Directory 页面](https://cursor.directory/plugins/kling-ai)会分别添加 Rule 或 MCP。
要安装包含 `/kling-ai` Skill 的完整插件，请使用上面的本地安装步骤。

### 2. 授权可灵账号

1. 重启 Cursor，或在命令面板运行 **Developer: Reload Window**。
2. 打开 **Customize → Plugins**，确认 **Kling AI** 已加载。在 **Customize** 中找到已启用的
   `kling-ai` MCP 服务，点击 **Connect**。
3. 在浏览器登录可灵国内站账号并授权 Cursor。返回 Cursor，新建一个 Agent 对话。
   插件自带[国内站 MCP 配置](mcp.json)，地址为 `https://klingai.com/mcp/plugin`，由 Cursor 完成 OAuth 授权。

### 3. 在 Agent 对话中试用

输入 `/kling-ai`，选中 Skill 后发送提示词。

- **检查连接** · 帮我检查可灵账号是否已连接，以及还有多少可用灵感值。先不发起生成。
- **文生图** · 生成一张 4:5 的香水商品海报，玻璃瓶身、暖色棚拍光。先展示生成设置，等我确认后再提交。
- **图生视频** · 用我附上的商品图做首帧，生成一段 5 秒视频。商品保持不动，镜头缓慢推近。

有参考图或视频时，把素材附在对话里，并说明它是首帧、风格参考还是主体素材。
生成会消耗灵感值，请先核对设置再确认提交。提交后可以在结果卡片查看进度，也可以凭任务编号查询已有任务。

更多示例见[中文提示词](skills/kling-ai/references/prompt-examples.md#推荐提示词)和
[英文提示词](skills/kling-ai/references/prompt-examples.md#suggested-prompts)。

## 常见问题

- **找不到插件或 Skill** · 确认本地插件目录内有 `.cursor-plugin/plugin.json`，重载 Cursor 后新建 Agent 对话。
  企业版可请管理员确认 **Allow Local Plugin Imports** 已开启。
- **连接失败或账号不对** · 在 Cursor 中仅保留一个启用的可灵 MCP 条目，再重新连接插件的 `kling-ai` 服务。
  从国际版切换时，先断开旧连接，再用国内站账号授权。
- **任务还在运行或结果卡片未显示** · 如果已有任务编号，请让 Cursor 查询原任务。其他问题见[故障排查](skills/kling-ai/references/troubleshooting.md)。

## 功能

- 文生图、参考图编辑和连续组图。未指定模型时，如果当前账号支持且符合需求，优先使用可灵图片 4.0，再考虑账号可用的默认模型。
- [可灵图片 4.0](https://kling.ai/quickstart/kling-image-4-user-guide)支持原生 8K 和连续组图模式，单次最多生成 10 张连贯图片。
- 可灵 4.0 支持文生视频、首尾帧与中间关键帧，以及使用图片、视频、音频和主体的全能参考。支持 3–30 秒，默认 720p。可用 1080p 或 4K 的账号可在文生视频、图生视频和全能参考中开启 HDR 输出。
- 可灵 4.0 Flash 支持文生视频、单首帧图生视频，以及使用图片、视频和主体的全能参考。支持 3–20 秒、720p。
- 两款视频模型的全能参考均支持智能分镜。同步生成声音和保留原视频音频最多启用一项。实际可用模型、参数、素材上限和计费信息以当前账号为准。
- 支持素材上传、主体管理、动作库、灵感值查询和任务查询。生成前确认计费设置，每次确认对应一次提交，结果卡片可用时自动刷新。

## 插件组件

| 组件 | 路径 | 用途 |
| --- | --- | --- |
| 清单 | `.cursor-plugin/plugin.json` | 声明插件及组件入口 |
| MCP | `mcp.json` | 国内站远程 OAuth MCP |
| Rule | `rules/kling-ai.mdc` | 请求路由和单次提交规则 |
| 核心 Skill | `skills/kling-ai/` | `/kling-ai` 入口、授权、账号、素材、主体和任务查询 |
| 图片 Skill | `skills/kling-ai-generate-image/` | 图片生成、提示词和质量检查 |
| 视频 Skill | `skills/kling-ai-generate-video/` | 视频、动作控制、时长和镜头规划 |

## 生成流程

1. 生成前调用 `who_am_i`，使用服务返回的模型、参数、枚举值和输入定义。
2. 使用远程上传工具上传本地素材。同一目标复用一个 UUIDv7 `taskTraceId`。
3. 展示最终生成设置和当前服务要求的计费信息。用户已经授权这些设置时可直接继续，否则先取得明确确认。
4. 提交前在同一连接检查当前灵感值。余额不可用或不足时暂停。
5. 每次确认最多调用一次生成工具。提交结果不明确时，禁止自动重试。
6. Cursor 显示结果卡片时，由卡片自动刷新。卡片未显示时，按服务允许的间隔查询，直到任务结束、取消或对话无法继续。单次状态查询只查一次。
7. 任务成功并返回所需类型、数量的可用结果后，才报告完成。结果不足时报告实际数量。

灵感值不足时，请在国内站用同一账号补充，然后回到原 Cursor 对话继续。
Cursor 会先检查已有任务编号，并且只在可以安全提交时复核余额、按原设置提交。

## 开发验证

```bash
npm run check
npm test
for skill in skills/*; do
  python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" "$skill"
done
```

## 官方资料

- [Cursor 插件文档](https://cursor.com/docs/plugins)
- [Cursor 插件参考](https://cursor.com/docs/reference/plugins)
- [Cursor MCP 文档](https://cursor.com/docs/mcp)

## 许可证

MIT。可灵 AI 及相关商标归各自权利人所有。
