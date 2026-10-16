# Xfei Video Translation

iFlytek (讯飞) Video Translation API Skill for AI-powered video dubbing and localization.

## Overview

This Skill provides a command-line interface to iFlytek's Video Translation API:
- Create video translation tasks
- List all translation tasks

## API Information

- **Base URL**: `https://opensapi.xfyun.com/api/v1/video-translate`
- **Endpoints**:
  - `POST /tasks` - Create translation task
  - `GET /tasks` - List all tasks

## Quick Start

### 1. Install Dependencies

```bash
pip install requests
```

### 2. Create an App

1. Visit [讯飞控制台](https://console.xfyun.cn)
2. Create an app with **视频翻译** service enabled
3. Enable the desired voice(s) in the console

### 3. Configure Credentials

Configure your shared iFLYTEK application credentials. Video Translation reads the API Key and API Secret; the App ID may remain configured for other skills:

```bash
export IFLY_APP_ID="your_app_id"
export IFLY_API_KEY="your_api_key"
export IFLY_API_SECRET="your_api_secret"
```

> Compatibility: use one credential namespace as a whole. If any `IFLY_*` credential variable is set (even empty), only that group is used and missing fields fail validation. Otherwise prefer `XFYUN_*`, then `XFEI_*`; never mix groups. Legacy prefixes emit a migration notice on stderr without credential values.

### 4. Create a Translation Task

```bash
python3 scripts/xfei_video_translate.py --action create_task \
    --file_url "https://example.com/video.mp4" \
    --src_lang en --dest_lang zh
```

### 5. List All Tasks

```bash
python3 scripts/xfei_video_translate.py --action list_tasks
```

## Usage Examples

```bash
# English to Chinese
python3 scripts/xfei_video_translate.py --action create_task \
    --file_url "https://example.com/video.mp4" \
    --src_lang en --dest_lang zh

# Chinese to English
python3 scripts/xfei_video_translate.py --action create_task \
    --file_url "https://example.com/video.mp4" \
    --src_lang zh --dest_lang en

# Japanese to Korean
python3 scripts/xfei_video_translate.py --action create_task \
    --file_url "https://example.com/video.mp4" \
    --src_lang ja --dest_lang ko

# List all tasks
python3 scripts/xfei_video_translate.py --action list_tasks
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `--action create_task` | Submit a new video translation task |
| `--action list_tasks` | List all tasks |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `IFLY_APP_ID` | Shared application ID; not read by this video API |
| `IFLY_API_KEY` | iFlytek API Key |
| `IFLY_API_SECRET` | iFlytek API Secret |

## Requirements

- Python 3.7+
- `requests` library

## Documentation

See [SKILL.md](./SKILL.md) for detailed API documentation and parameter reference.
