---
name: iflytek-video-translate
description: Use when user asks to translate videos, dub video content, or localize videos into other languages. Translate videos with AI-powered dubbing using iFlytek (Xfei) Video Translation API. Supports video language translation, voice dubbing, multilingual video localization, 视频翻译, 视频配音, 视频本地化. Features task creation, task list, task details retrieval. Ideal for content creators and localization teams.
metadata: {
  "homepage": "https://www.xfyun.cn/doc/Develop/Video_Translation",
  "openclaw": "{\"emoji\":\"🎬\",\"requires\":{\"bins\":[\"python3\"],\"env\":[\"XFYUN_API_KEY\",\"XFYUN_API_SECRET\"]},\"primaryEnv\":\"XFYUN_API_KEY\"}"
}
---

# Xfei Video Translation

Translate videos with AI-powered dubbing using iFlytek's Video Translation service.

## API Endpoints

Base URL: `https://spark-api-test.xf-yun.com/api/v1/video-translate`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/tasks` | POST | Create video translation task |
| `/tasks` | GET | List all tasks |
| `/tasks/:taskId` | GET | Get task details |

## Features

- **Video Translation**: Translate video audio to different languages
- **AI Dubbing**: Generate natural-sounding voiceovers
- **Multi-language**: Support for English, Chinese, Japanese, Korean, etc.
- **Task Management**: Create tasks, list tasks, get task details
- **Lip Sync**: Automatic face matching for translated audio

## Usage Scenarios

### Scenario 1: Create Video Translation Task

Submit a video for translation.

**Use this when:** User provides a video URL and wants to translate it.

```bash
# Create task - translate English video to Chinese
python3 scripts/xfei_video_translate.py --action create_task \
    --file_url "https://example.com/video.mp4" \
    --src_lang en --dest_lang zh

# Translate Chinese to English
python3 scripts/xfei_video_translate.py --action create_task \
    --file_url "https://example.com/video.mp4" \
    --src_lang zh --dest_lang en

# Translate Japanese to Chinese
python3 scripts/xfei_video_translate.py --action create_task \
    --file_url "https://example.com/video.mp4" \
    --src_lang ja --dest_lang zh
```

### Scenario 2: List All Tasks

View all video translation tasks.

**Use this when:** User wants to see all translation tasks.

```bash
# List all tasks
python3 scripts/xfei_video_translate.py --action list_tasks
```

### Scenario 3: Get Task Details

View detailed information about a specific task.

**Use this when:** User wants to check the status and details of a specific task.

```bash
# Get task details
python3 scripts/xfei_video_translate.py --action get_task \
    --task_id "xxx-xxx-xxx"
```

## Setup

### 1. Install Dependency

```bash
pip install requests>=2.31.0
```

### 2. Configure Environment Variables

```bash
export XFYUN_API_KEY="your_api_key"
export XFYUN_API_SECRET="your_api_secret"
```

## Parameters

### create_task (POST /tasks)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `--file_url` / `-u` | string | Yes | Video file OSS URL (视频文件 OSS 地址) |
| `--src_lang` / `-f` | string | Yes | Source language code (e.g., en, zh, ja, ko) |
| `--dest_lang` / `-t` | string | Yes | Target language code |

### list_tasks (GET /tasks)

No parameters required.

### get_task (GET /tasks/:taskId)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `--task_id` / `-i` | string | Yes | Task ID |

## Response Format

Standard response: `{"code": 0, "message": "success", "request_id": "xxx", "data": {}}`

### create_task Response (data)

```json
{
  "task_id": "xxx-xxx-xxx",
  "status": "waiting_parsing",
  "created_at": "2025-01-17T10:30:45Z"
}
```

### list_tasks Response (data)

```json
[
  {
    "task_id": "xxx-xxx-xxx",
    "task_name": "我的翻译任务",
    "status": "completed",
    "src_lang": "en",
    "dest_lang": "zh",
    "created_at": "2025-01-17T10:30:45Z",
    "updated_at": "2025-01-17T11:30:45Z"
  }
]
```

### get_task Response (data)

```json
{
  "task_id": "xxx-xxx-xxx",
  "task_name": "我的翻译任务",
  "status": "completed",
  "created_at": "2025-01-17T10:30:45Z",
  "updated_at": "2025-01-17T11:30:45Z",
  "task_params": {
    "file_url": "https://example.com/video.mp4",
    "src_lang": "en",
    "dest_lang": "zh"
  },
  "output": {
    "subtitle_url": "https://example.com/output.srt",
    "output_video_url": "https://example.com/output.mp4"
  }
}
```

## Task Status Values

| Status | Description |
|--------|-------------|
| `running` | Task in progress |
| `completed` | Task completed successfully |
| `failed` | Task failed |
| `cancelled` | Task cancelled |
| `waiting_manual_intervention_segment` | Waiting for transcript editing |
| `waiting_manual_intervention_refine` | Waiting for translation editing |

## Language Codes

| Code | Language |
|------|----------|
| `zh` | Chinese (中文) |
| `en` | English (英文) |
| `ja` | Japanese (日文) |
| `ko` | Korean (韩文) |
| `ru` | Russian (俄文) |
| `fr` | French (法文) |
| `ar` | Arabic (阿拉伯语) |
| `es` | Spanish (西班牙语) |
| `yue` | Cantonese (粤语) |

## Input Video Requirements

- **Format**: MP4
- **Duration**: Max 5 minutes
- **Resolution**: 720p - 4k
- **FPS**: Recommended 25
- **Audio**: Single audio track only

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| XFYUN_API_KEY and XFYUN_API_SECRET are required | No credentials configured | Set environment variables |
| --file_url is required | No video URL provided | Provide valid OSS video URL |
| --task_id is required | No task ID provided | Provide valid task ID |
| API error XXXX | Request failed | Check message in response |

### 鉴权失败错误提示 (๑•̀ㅂ•́)و✧

哎呀呀～遇到鉴权错误啦！ (⊙_⊙) 快来看看是哪里出问题了吧～

| HTTP Code | 错误描述 | 原因 | 处理建议 |
|-----------|----------|------|----------|
| **401** | `{"message":"Unauthorized"}` | 缺少 authorization 参数 | 哎呀～检查一下有没有正确带上传入的 authorization 参数哦～ |
| **401** | `{"message":"HMAC signature cannot be verified"}` | 签名参数解析失败 | 嗯嗯～ (°∀°)ﾉ 检查一下各签名参数是否完整，确认 APIKey 是不是正确呀～ |
| **401** | `{"message":"HMAC signature does not match"}` | 签名校验失败 | 嘿呀～ (｡•́︿•̀｡) 检查一下 APIKey/APISecret 是否正确呢～还要看看 host、date、request-line 拼接对不对哦～signature 的 Base64 长度正常应该是 44 字节呢～ |
| **403** | `{"message":"HMAC signature cannot be verified, a valid date or x-date header is required"}` | 时钟偏移校验失败 | 嗯嗯？ (⊙_⊙) 服务器时钟可能有偏差哦～偏差超过 300 秒就会被拒绝啦！快去校准一下时间吧～ |

**小贴士** 💡：
- 如果遇到签名不匹配的错误，首先检查 APIKey 和 APISecret 是否正确～
- 确保服务器的日期时间准确，偏差太大会导致 403 错误哦～
- 签名中的 path 需要和实际请求的路径完全一致才可以呢～

## Tips

1. **Video URL**: Must be an OSS (Aliyun Object Storage Service) URL accessible by iFlytek
2. **Task status**: Use get_task to check task progress
3. **Completed tasks**: When status is "completed", the output_video_url contains the translated video
4. **Manual intervention**: Some videos may require human review for transcript or translation
