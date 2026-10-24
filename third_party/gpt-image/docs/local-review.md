# GPT Image: pinned local candidate review / 固定候选本地审查

2026-10-19. This procedure prepares and loads an **unpublished source candidate**. It is not a Marketplace install, publisher approval, or proof of a completed service call. The public route remains [the existing official submission](https://github.com/cursor/plugins/pull/548).

## Preconditions and exact source

- Read the current **OPEN** source PR (https://github.com/AceDataCloud/GPTImageCursor/pull/2) and record its current commit SHA. Use that exact commit in your dedicated source checkout; do not assume `main` contains candidate README/manifest changes. Record `git rev-parse HEAD`, client version and source origin in the review receipt.
- In Cursor **Customize**, first check whether a Marketplace plugin with the same name `gpt-image` is already installed. Cursor gives it precedence over the local copy. Do not remove or change the user's installed plugin silently; use an already authorized isolated profile/project or report the collision.
- On Teams/Enterprise, **Allow Local Plugin Imports** is an administrator policy under Dashboard → Settings → Security & Identity → Marketplace and Plugins (off by default on Enterprise). If disabled, stop and report it; do not bypass policy or expand access.
- Do not point `~/.cursor/plugins/local/gpt-image` at this external Git checkout with a symlink: Cursor skips such symlinks. Use the physical tracked-file copy below. Never put a token in the candidate files.

## Copy the tracked candidate without overwriting existing state

Run inside the isolated source checkout at the verified commit. The shell stops on an existing destination, including a broken symlink. The command deliberately copies only Git-tracked files; local `.env`, user settings, caches and untracked credentials are excluded.

```sh
set -eu
candidate_commit=$(git rev-parse HEAD)
candidate_stage=$(mktemp -d "${TMPDIR:-/tmp}/gpt-image-cursor-review.XXXXXX")
git archive --format=tar "$candidate_commit" | tar -xf - -C "$candidate_stage"
test -f "$candidate_stage/.cursor-plugin/plugin.json"
test -f "$candidate_stage/mcp.json"
printf 'Candidate commit: %s\nStaged files: %s\n' "$candidate_commit" "$candidate_stage"
local_plugin_dir="$HOME/.cursor/plugins/local/gpt-image"
if [ -e "$local_plugin_dir" ] || [ -L "$local_plugin_dir" ]; then
  printf 'Stop: destination already exists: %s\n' "$local_plugin_dir" >&2
  exit 1
fi
mkdir -p "$HOME/.cursor/plugins/local"
cp -R "$candidate_stage" "$local_plugin_dir"
```

If staging completed but copying stopped, retain the temporary path and receipt; do not force-delete or overwrite an existing installation. Reviewers may inspect the staged directory without launching Cursor. This plugin is Git-distributed and has no build step or local Python/Node worker to run.

## Load, Configure, and verify a free boundary

1. Restart Cursor or run **Developer: Reload Window**. Open **Customize** and confirm `GPT Image by Ace Data Cloud`, manifest version **1.0.1**, one HTTP MCP and the expected Skill. Verify the installed files match your pinned commit, not the old `main` or a same-name Marketplace item.
2. Open the plugin **Configure**. With no key, only record the credential field/required-value behavior; do not claim authenticated access. Do not submit a billable tool just to test a missing token.
3. If an existing authorized service token is already available, paste only its value into **Ace Data Cloud API token**, click **Save**, wait, reopen, and confirm masking. Never place the token in chat, a JSON file, an exported profile or a screenshot. If policy disallows storage/import, stop.
4. For authorized free validation, enable only the existing-task retrieval or free metadata tool from the read-only prompt in the coordinator receipt. Use a task belonging to the existing credential, query the original successful ID, and do not generate, search, transform, or retry a paid action. Current service access, API restrictions and balance still apply.
5. Capture the actual source/client version, installation origin, masked Configure field, tool name/arguments, cancellation/error behavior and returned terminal fields. A tool-cancel before approval proves only cancellation, not a service result. Token rejection/403/429/timeout must remain distinguishable; after an ambiguous generation timeout, query the original ID/history rather than resubmit.

The copied files contain **configuration variable names only**, not secret values. `mcp.json` keeps the Authorization header template; Configure supplies the value. The UI rendering and persistence of that value require actual Cursor verification; a valid manifest or reference screenshot does not establish them.

## 中文操作摘要

1. 从原源码PR读取当前commit，在隔离源码目录固定该SHA；不要用尚未合并增强的main充当候选。
2. 先查同名市场插件和本地目录，企业本地导入策略关闭时停止；不卸载用户插件、不擅改管理员策略。外部仓库软链接会被跳过。
3. 上方命令把Git已跟踪文件放入临时目录，再在目标不存在时物理复制到`~/.cursor/plugins/local/gpt-image`。不复制`.env`、缓存或未跟踪凭据；有目标或软链接就停止，不能覆盖。
4. Reload Window/重启后，在Customize核插件名称/1.0.1、HTTP MCP、Skill以及文件commit。真实Configure只填已有合法服务Token并核遮蔽保存；无Key只能核空值行为。
5. 仅在既有授权范围查询原成功任务或免费元数据；生成、搜索、图像/人像变换和自动重试都保持关闭。记录真实确认、取消、错误及返回值。准备包/静态通过不能替代Cursor原生安装/调用，当前Configure实拍仍待补。

## Official basis / 官方依据

[Cursor Plugins — Test plugins locally](https://cursor.com/docs/plugins#test-plugins-locally), read **2026-10-19**: physical plugin folder, manifest, reload, allowed local imports, installed-plugin precedence and in-folder-only symlink rule. [Variables](https://cursor.com/docs/reference/plugins#variables): manifest declares variable names, not secret values; users supply them in Configure. Follow the labels in the actual recorded client version.
