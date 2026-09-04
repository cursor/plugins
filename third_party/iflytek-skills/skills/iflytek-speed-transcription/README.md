# iFly Speed Transcription

> Modified for Cursor marketplace packaging to document task lookup by ID.

基于讯飞极速转写 API，将长音频快速转成文本。对应脚本为 `scripts/transcribe.py`，依赖 `requests`。

## 前置条件

```bash
pip install requests
```

配置环境变量，注意这里使用的是 `XFEI_*`：

```bash
export XFEI_APP_ID="your_app_id"
export XFEI_API_KEY="your_api_key"
export XFEI_API_SECRET="your_api_secret"
```

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

# Query a task returned by --no-poll
python3 scripts/transcribe.py --task-id YOUR_TASK_ID --output-format json
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `file_path` | 音频文件路径 | - |
| `--language` | 语言代码 | `zh_cn` |
| `--accent` | 方言口音 | `mandarin` |
| `--pd` | 领域参数，如 `medical`、`finance`、`court` | 不传 |
| `--vspp-on` | 是否开启说话人分离，`0` 或 `1` | 不传 |
| `--speaker-num` | 说话人数，`0` 为自动 | 不传 |
| `--no-poll` | 只返回任务 ID | 关闭 |
| `--task-id` | 查询已有任务 ID，可省略音频路径 | 不传 |
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
