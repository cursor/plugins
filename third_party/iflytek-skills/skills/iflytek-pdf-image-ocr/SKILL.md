---
name: iflytek-pdf-image-ocr
description: ifly-pdf-image-ocr skill supporting both image OCR (AI-powered LLM OCR) and PDF document recognition. Use when user asks to OCR images, extract text from images/PDFs, convert PDF to Word/Markdown, or perform any OCR tasks on images or PDFs. Supports multi-language text extraction, document layout understanding, and various output formats.
metadata: {
  "homepage": "https://www.xfyun.cn/services/ocr",
  "openclaw": "{\"emoji\":\"📄\",\"dimensions\":[\"文档OCR\",\"PDF识别\"],\"user_instructions\":[\"OCR这个PDF\",\"提取图片中的文字\",\"帮我把这个文档转成文字\"],\"requires\":{\"bins\":[\"python3\"],\"env\":[\"IFLY_APP_ID\",\"IFLY_API_KEY\",\"IFLY_API_SECRET\"]},\"primaryEnv\":\"IFLY_API_KEY\"}"
}
---

# ifly-pdf-image-ocr

AI-powered OCR service for images and PDF documents using iFlytek's advanced recognition APIs.

## Quick Start

### Image OCR (LLM OCR)

```bash
# OCR an image and extract text
python3 scripts/image_ocr.py /path/to/image.jpg

# Save result to file
python3 scripts/image_ocr.py /path/to/image.jpg -o output.txt

# Specify output format
python3 scripts/image_ocr.py /path/to/image.jpg --format json
python3 scripts/image_ocr.py /path/to/image.jpg --format markdown
```

### PDF OCR

```bash
# Convert PDF to Word (default)
python3 scripts/pdf_ocr.py document.pdf

# Convert PDF to Markdown
python3 scripts/pdf_ocr.py document.pdf --format markdown

# Convert PDF to JSON
python3 scripts/pdf_ocr.py document.pdf --format json

# From public URL
python3 scripts/pdf_ocr.py --pdf-url "https://example.com/doc.pdf" --format word

# Resume a task returned by --no-poll
python3 scripts/pdf_ocr.py --task-no "25082744936879"
```

## Setup

### API Credentials

Get credentials from [iFlytek Open Platform](https://console.xfyun.cn/):

**For Image OCR:**
- **APP_ID**: Application ID
- **API_KEY**: API key for authentication
- **API_SECRET**: API secret for signing requests

**For PDF OCR:**
- **APP_ID**: Application ID
- **API_SECRET**: Application secret (for signature generation)

### Environment Variables

```bash
# Required for both Image OCR and PDF OCR
export IFLY_APP_ID="your_app_id"

# Required for Image OCR
export IFLY_API_KEY="your_api_key"

# Required for PDF OCR
export IFLY_API_SECRET="your_api_secret"
```

## Features

### Image OCR (LLM OCR)

- **AI-powered**: Advanced LLM-based OCR for high accuracy
- **Multi-format output**: JSON, Markdown, or both
- **Layout understanding**: Preserves document structure
- **Multi-language**: Supports text extraction in multiple languages
- **Image preprocessing**: Automatic rotation correction, noise removal

### PDF OCR

- **AI-powered OCR**: Advanced AI model for accurate text extraction
- **Multiple output formats**:
  - Word (.docx) - Editable Word document
  - Markdown - Plain text with formatting
  - JSON - Structured data
- **Large PDF support**: Up to 100 pages per document
- **Page-by-page results**: Access individual page results
- **Download URLs**: Direct links to processed files

## API Parameters

### Image OCR Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `image_path` | string | Yes | Path to image file |
| `--format` | string | No | Output format: json, markdown, json,markdown (default: json,markdown) |
| `--output` | string | No | Save result to file |

### PDF OCR Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pdf_path` | string | Yes* | Path to PDF file |
| `--pdf-url` | string | No* | Public URL of PDF file |
| `--task-no` | string | No* | Query an existing task returned by `--no-poll` |
| `--format` | string | No | Output format: word, markdown, json (default: word) |
| `--no-poll` | flag | No | Return task ID without polling |
| `--poll-interval` | int | No | Polling interval in seconds (min 5, default: 5) |
| `--max-wait` | int | No | Maximum wait time in seconds (default: 300) |

*Provide `pdf_path` or `--pdf-url` to create a task, or `--task-no` to query an existing task.

## Authentication

### Image OCR (HMAC-SHA256)

Uses HMAC-SHA256 signature authentication:

1. Generate RFC1123 format date: `EEE, dd MMM yyyy HH:mm:ss GMT`
2. Create signature origin: `host: {host}\\ndate: {date}\\nPOST {path} HTTP/1.1`
3. Calculate signature: `HMAC-SHA256(signature_origin, apiSecret)`
4. Build authorization: `hmac username="{apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature}"`
5. Encode authorization in base64
6. Send as query parameters: `?authorization={auth}&host={host}&date={date}`

### PDF OCR (MD5 + HMAC-SHA1)

Uses MD5 + HMAC-SHA1 signature authentication:

1. Generate timestamp (Unix epoch in seconds)
2. Calculate `auth = MD5(appId + timestamp)`
3. Calculate `signature = Base64(HMAC-SHA1(auth, apiSecret))`
4. Send headers:
   - `appId`: Application ID
   - `timestamp`: Timestamp in seconds
   - `signature`: Generated signature

**Important**: Timestamp must be within 5 minutes of server time.

## Response Format

### Image OCR Response

```json
{
  "header": {
    "code": 0,
    "message": "success"
  },
  "payload": {
    "result": {
      "text": "Base64-encoded OCR text..."
    }
  }
}
```

### PDF OCR Start Response

```json
{
  "flag": true,
  "code": 0,
  "desc": "成功",
  "data": {
    "taskNo": "25082744936879",
    "status": "CREATE",
    "tip": "任务创建成功"
  }
}
```

### PDF OCR Status Response

```json
{
  "flag": true,
  "code": 0,
  "desc": "成功",
  "data": {
    "taskNo": "25082759289333",
    "exportFormat": "word",
    "status": "FINISH",
    "downUrl": "http://bjcdn.openstorage.cn/...",
    "tip": "已完成",
    "pageList": [...]
  }
}
```

## Task Status (PDF OCR)

| Status | Description |
|--------|-------------|
| `CREATE` | Task created successfully |
| `WAITING` | Waiting in queue |
| `DOING` | Processing |
| `FINISH` | Completed |
| `FAILED` | Failed |
| `ANY_FAILED` | Partially completed (some pages failed) |
| `STOP` | Paused |

## Error Codes

> (｡･ω･｡) 嗨~遇到错误码了吗？来看看怎么解决吧~ ✧⁺⸜(●˙▾˙●)⸝⁺✧

### Platform Common Error Codes

| Code | Description | Hint | Solution |
|------|-------------|------|----------|
| 10009 | input invalid data | (◎_◎;) 哎呀~数据格式不太对呢 | 检查输入数据是否符合要求 |
| 10010 | service license not enough | (╯°□°)╯︵ ┻━┻ 授权数量不足或已过期！ | 提交工单联系客服 |
| 10019 | service read buffer timeout | (。-`ω´-) session超时啦~ | 检查是否数据发送完毕但未关闭连接 |
| 10043 | Syscall AudioCodingDecode error | (◎_◎;) 音频解码失败惹... | 检查aue参数，如果为speex，请确保音频是speex音频并分段压缩且与帧大小一致 |
| 10114 | session timeout | (。-`ω´-) 会话时间超时啦~ | 检查是否发送数据时间超过了60s |
| 10139 | invalid param | (◎_◎;) 参数好像不太对呢 | 检查参数是否正确 |
| 10160 | parse request json error | (◎_◎;) 请求数据格式有误~ | 检查请求数据是否是合法的json |
| 10161 | parse base64 string error | (◎_◎;) Base64解码失败啦 | 检查发送的数据是否使用base64编码了 |
| 10163 | param validate error | (◎_◎;) 参数校验没通过呢 | 具体原因见详细的描述 |
| 10200 | read data timeout | (。-`ω´-) 读取数据超时了~ | 检查是否累计10s未发送数据并且未关闭连接 |
| 10222 | context deadline exceeded | (╯°□°)╯︵ ┻━┻ 出错啦！ | 1.检查上传数据是否超过接口上限；2.SSL证书无效请提交工单 |
| 10223 | RemoteLB: can't find valued addr | (◎_◎;) 找不到服务节点呢 | 提交工单联系技术人员 |
| 10313 | invalid appid | (◎_◎;) appid和apikey不匹配哦 | 检查appid是否合法 |
| 10317 | invalid version | (◎_◎;) 版本号有问题呢 | 请到控制台提交工单联系技术人员 |
| 10700 | not authority | (╯°□°)╯︵ ┻━┻ 权限不足！ | 按照报错原因对照开发文档检查，如仍无法解决，请提供sid及错误信息提交工单 |
| 11200 | auth no license | (╯°□°)╯︵ ┻━┻ 功能未授权！ | 检查appid是否正确，确认是否添加了相关服务，检查调用量是否超限或授权是否到期 |
| 11201 | auth no enough license | (╯°□°)╯︵ ┻━┻ 每日交互次数超限啦！ | 提交应用审核提额或联系商务购买企业级接口 |
| 11503 | server error: atmos return error | (。-`ω´-) 服务器返回了错误数据... | 提交工单 |
| 11502 | server error: too many datas | (。-`ω´-) 服务器配置有问题呢 | 提交工单 |
| 100001~100010 | WrapperInitErr | (◎_◎;) 引擎调用出错啦！ | 请根据message中的errno查看引擎错误码说明 |

### Additional Resources

- (｡･ω･｡) 服务购买链接：[通用文字识别（OCR大模型版）](https://console.xfyun.cn/services/se75ocrbm)
- (｡･ω･｡) 商务咨询链接：[购买服务量](https://console.xfyun.cn/sale/buy?wareId=9166&packageId=9166001&serviceName=%E9%80%9A%E7%94%A8%E6%96%87%E6%A1%A3%E8%AF%86%E5%88%AB%EF%BC%88OCR%E5%A4%A7%E6%A8%A1%E5%9E%8B%EF%BC%89&businessId=se75ocrbm)

---

### Original API Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 10000 | System error | Check auth info, request method, parameters |
| 10001 | Signature authentication failed | Check credentials |
| 10002 | Business processing error | Check error message |
| 10003 | Quota/insufficient balance | Check account balance |

## Limitations

### Image OCR
- **Format**: Common image formats (JPG, PNG, etc.)
- **Size**: Reasonable file sizes for web upload
- **Rate limiting**: Follow API rate limits

### PDF OCR
- **Max pages**: 100 pages per PDF
- **Protected PDFs**: Not supported (password/encrypted)
- **Rate limiting**: Status query limited to once per 5 seconds
- **Time limit**: Timestamp must be within ±5 minutes of server time

## Tips

### Image OCR
1. **High-quality images**: Use clear, high-resolution images for best results
2. **Multiple formats**: Use `json,markdown` to get both structured and formatted output
3. **Save results**: Use `-o` flag to save OCR results to file

### PDF OCR
1. **Math formulas**: Use markdown format for PDFs with mathematical formulas
2. **Large PDFs**: Split into sections if > 100 pages
3. **Polling interval**: Minimum 5 seconds between status queries
4. **Network URLs**: Ensure PDF URLs are publicly accessible
5. **Download URLs**: Download files promptly as URLs may expire
6. **Long-running tasks**: Use `--no-poll`, save the task number, then query it later with `--task-no`
