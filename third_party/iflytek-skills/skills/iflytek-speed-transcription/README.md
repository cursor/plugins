# iFly Speed Transcription

> Modified for Cursor marketplace packaging to document the task options and task queries (submitted upstream as iflytek/iFly-Skills#106).

基于讯飞极速转写 API，将长音频快速转成文本。对应脚本为 `scripts/transcribe.py`，依赖 `requests`。

## 前置条件

```bash
pip install requests
```

本 Skill 使用以下 `IFLY_*` 凭证环境变量：

```bash
export IFLY_APP_ID="your_app_id"
export IFLY_API_KEY="your_api_key"
export IFLY_API_SECRET="your_api_secret"
```

> 兼容说明：设置任意 `IFLY_*` 凭证变量（包括空值）后，仅使用该组，缺项报错；未设置标准组时，依次尝试 `XFEI_*`、`XFYUN_*`，不跨组拼接。旧前缀会在 stderr 输出一次不含凭证值的迁移提示。

## 快速开始

```bash
# 基础转写
python3 scripts/transcribe.py ./audio.mp3

# 保存结果到文件
python3 scripts/transcribe.py ./audio.mp3 --output result.txt

# 医疗领域优化
python3 scripts/transcribe.py ./audio.mp3 --pd medical

# 开启说话人分离
python3 scripts/transcribe.py ./meeting.mp3 --vspp-on 1 --speaker-num 2

# 返回 JSON 结果
python3 scripts/transcribe.py ./audio.mp3 --output-format json

# 只提交任务，不等待结果
python3 scripts/transcribe.py ./audio.mp3 --no-poll

# 查询已提交的任务
python3 scripts/transcribe.py --action query --task-id TASK_ID

# 字幕模式 + 热词
python3 scripts/transcribe.py ./audio.mp3 --enable-subtitle 1 --dhw "讯飞,星火"
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `file_path` | 音频文件路径（`--action query` 时不需要） | - |
| `--language` | 语言代码 | `zh_cn` |
| `--accent` | 方言口音 | `mandarin` |
| `--pd` | 领域参数，如 `medical`、`finance`、`court` | 不传 |
| `--vspp-on` | 是否开启说话人分离，`0` 或 `1` | 不传 |
| `--speaker-num` | 说话人数，`0` 为自动 | 不传 |
| `--output-type` | 输出类型：`0` 1best、`1` cnlbest、`2` 多候选 | 不传 |
| `--postproc-on` | 后处理：`0` 关、`1` 开 | 不传 |
| `--enable-subtitle` | 字幕模式：`0` 文档、`1` 字幕 | 不传 |
| `--smoothproc` | 顺滑处理：`true` 或 `false` | 不传 |
| `--colloqproc` | 口语规整：`true` 或 `false` | 不传 |
| `--language-type` | 语种模式：`1` 自动、`2` 中文、`3` 英文、`4` 纯中文 | 不传 |
| `--dhw` | 热词，英文逗号分隔（UTF-8） | 不传 |
| `--action` | `transcribe` 转写，或 `query` 查询已有任务 | `transcribe` |
| `--task-id` | 已有任务 ID，`--action query` 时必填 | - |
| `--no-poll` | 只返回任务 ID | 关闭 |
| `--poll-interval` | 轮询间隔（秒） | `5` |
| `--output`, `-o` | 保存输出到文件 | 不保存 |
| `--output-format` | `text` 或 `json` | `text` |

## 输出说明

- `text`：输出完整转写文本。
- `json`：输出任务 ID、状态、全文、分段结果和原始响应。

## 限制说明

- 当前脚本实现只接受 `.mp3` 文件，其他格式会直接报错。
- 脚本内采用分片上传，大文件会自动走分片流程。
- 使用两个接口域名：上传 `upload-ost-api.xfyun.cn`，任务处理 `ost-api.xfyun.cn`。
- 默认最长轮询约 `10` 分钟。
- 完整文档与错误码说明见 [`SKILL.md`](./SKILL.md)。

## 参考链接

- 接口文档：https://console.xfyun.cn/services/ost
- 服务购买：https://www.xfyun.cn/services/fast_lfasr?target=price
