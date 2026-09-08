---
name: iflytek-speed-transcription
description: Ultra-fast speech transcription using iFLYTEK Speed Transcription API. Transcribe audio files (MP3) up to 5 hours in ~20 seconds per hour. Supports Chinese, English, and 202+ Chinese dialects with automatic language detection. Use when user asks to transcribe audio files, convert speech to text, or mentions "speed transcription" or "极速转写".
metadata: {
  "homepage": "https://www.xfyun.cn/services/speed_transcription",
  "openclaw": "{\"emoji\":\"⚡\",\"dimensions\":[\"极速转写\",\"语音转文字\"],\"user_instructions\":[\"把这段音频转成文字\",\"帮我转写这个录音\",\"语音转文字\"],\"requires\":{\"bins\":[\"python3\"],\"env\":[\"XFEI_APP_ID\",\"XFEI_API_KEY\",\"XFEI_API_SECRET\"]},\"primaryEnv\":\"XFEI_API_KEY\"}"
}
---

# iFly Speed Transcription

> Modified for Cursor marketplace packaging to document task lookup and the MP3-only CLI contract.

Ultra-fast speech transcription service that converts audio files to text in record time - **1 hour of audio transcribes in ~20 seconds**.

## Quick Start

```bash
# Basic transcription (auto-detect language and dialect)
python3 scripts/transcribe.py /path/to/audio.mp3

# Save to file
python3 scripts/transcribe.py /path/to/audio.wav --output result.txt

# With domain-specific optimization
python3 scripts/transcribe.py /path/to/audio.mp3 --pd medical

# With speaker separation
python3 scripts/transcribe.py /path/to/meeting.mp3 --vspp-on 1 --speaker-num 2
```

## Setup

### 1. API Credentials

Get credentials from [iFlytek Open Platform](https://www.xfyun.cn/):

- **APP_ID**: Application ID
- **API_KEY**: API key for authentication
- **API_SECRET**: API secret for signing requests

### 2. Environment Variables

```bash
export XFEI_APP_ID="your_app_id"
export XFEI_API_KEY="your_api_key"
export XFEI_API_SECRET="your_api_secret"
```

## API Parameters

### Required Parameters

| Parameter | Description |
|-----------|-------------|
| `file_path` | Path to audio file (MP3, 16kHz, 16-bit, mono) |
| `--language` | Language code (default: `zh_cn` for Chinese+English+202 dialects) |
| `--accent` | Accent (default: `mandarin`) |

### Optional Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `--pd` | string | Domain: court, finance, medical, tech, sport, edu, gov, game, ecom, car |
| `--vspp-on` | int | Speaker separation: 0=off, 1=on |
| `--speaker-num` | int | Number of speakers (0=auto, range 1-10) |
| `--task-id` | string | Query an existing task without an audio file path |
| `--output-type` | int | Output: 0=1best, 1=cnlbest, 2=multi-candidate |
| `--postproc-on` | int | Post-processing: 0=off, 1=on (default) |
| `--enable-subtitle` | int | Subtitle mode: 0=document, 1=subtitle |
| `--smoothproc` | bool | Smoothing: true=on, false=off (default: true) |
| `--colloqproc` | bool | Colloquial processing: true=on, false=off |
| `--language-type` | int | Language mode: 1=auto, 2=Chinese, 3=English, 4=Chinese-only |
| `--dhw` | string | Hot words (comma-separated, UTF-8) |

### Audio Requirements

- **Format**: MP3
- **Sample rate**: 16kHz
- **Bit depth**: 16-bit
- **Channels**: Mono (single channel)
- **Size**: ≤ 500MB
- **Duration**: ≤ 5 hours (recommended: ≥ 5 minutes)

## Workflow

### 1. Upload Audio File

Files < 30MB use direct upload. Files ≥ 30MB use multipart upload (5MB chunks).

### 2. Create Transcription Task

Submit uploaded file URL with transcription parameters.

### 3. Poll for Results

Query task status periodically until completion.

## Response Format

```json
{
  "task_id": "1568100557463963551003",
  "task_status": "4",
  "text": "Transcribed text content...",
  "segments": [
    {
      "speaker": "spk-0",
      "begin": "0",
      "end": "470",
      "text": "听说。"
    }
  ]
}
```

### Task Status

- `1`: Pending
- `2`: Processing
- `3`: Completed
- `4`: Callback completed
- `-1`: Failed

## Language Support

### autodialect (language=zh_cn)
Automatic recognition of Chinese, English, and 202 Chinese dialects including:
- **Major**: Mandarin, Cantonese, Taiwanese, Sichuanese, Shanghainese, Northeastern
- **Full list**: 合肥话、芜湖话、皖北话、粤语、北京话、福州话、闽南语、潮汕话、客家话、贵阳话、海口话、石家庄话、太原话、郑州话、东北话、武汉话、长沙话、南京话、南昌话、大连话、呼和浩特话、银川话、西宁话、济南话、西安话、上海话、四川话、台湾话、天津话、乌鲁木齐话、云南话、杭州话、重庆话 (202 total)

## Common Use Cases

1. **Meeting Transcription**: Convert meeting recordings to text with speaker separation
2. **Interview Recording**: Transcribe interviews for documentation
3. **Lecture Recording**: Convert academic lectures to searchable text
4. **Voice Notes**: Transform voice memos into text notes
5. **Call Center**: Analyze customer service calls
6. **Legal Proceedings**: Transcribe court hearings with domain optimization
7. **Medical Consultation**: Doctor-patient conversation documentation

## Error Handling

| Error Code | Description | 友好提示 |
|------------|-------------|----------|
| 10107 | 自定音频编码字段错误 | 请检查 encoding 的传值是否规范～ (◎_◎) |
| 10303 | 参数值传递不规范 | 请检查传参值是否有误哦～ (°∀°)ﾉ |
| 10043 | 音频解码失败 | 请检查所传的音频是否与 encoding 字段描述的编码格式对应呢～ |
| 20304 | 静音音频、音频格式与传参不匹配 | 检查音频是否为16k、16bit单声道音频哦～ (｡•́︿•̀｡) |

💡 **遇到问题？**
- 📖 接口文档：https://console.xfyun.cn/services/ost
- 💰 购买套餐：https://www.xfyun.cn/services/fast_lfasr?target=price

## 常见问题 FAQ

**Q: 录音文件转写极速版的主要功能是什么？**
A: 快速地将长段音频（5小时以内）数据转换成文本数据呢～ (๑•̀ㅂ•́)و✧

**Q: 录音文件转写极速版支持什么语言？**
A: 支持中文、英文 + 202种方言免切识别哦！ ヽ(✿ﾟ▽ﾟ)ノ

**Q: 录音文件转写极速版支持什么应用平台？**
A: 目前支持 WebAPI 应用平台啦～

**Q: 为什么只支持 MP3 格式呀？**
A: 因为 MP3 格式兼容性好、文件小、传输快呢～ 使用 lame 编码就能轻松接入啦！ (◕‿◕)

## Tips

1. **For speaker separation**: Use `--vspp-on 1` for better speaker diarization
2. **For specific domains**: Use `--pd` parameter for improved accuracy
3. **For faster processing**: Audio files ≥ 5 minutes are prioritized
4. **For subtitle output**: Use `--enable-subtitle 1` for subtitle-formatted output
5. **For hot words**: Use `--dhw="word1,word2"` to boost recognition accuracy
