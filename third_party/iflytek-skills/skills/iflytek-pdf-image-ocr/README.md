# iFly PDF & Image OCR

> Modified for Cursor marketplace packaging to document URL-only PDF OCR support.

通用 OCR 技能，包含两个独立脚本：

- `scripts/image_ocr.py`：图片 OCR
- `scripts/pdf_ocr.py`：PDF OCR

这两个脚本都依赖 `requests`。

## 前置条件

```bash
pip install requests
```

环境变量按能力区分：

```bash
# 图片 OCR
export IFLY_APP_ID="your_app_id"
export IFLY_API_KEY="your_api_key"
export IFLY_API_SECRET="your_api_secret"

# PDF OCR
export IFLY_APP_ID="your_app_id"
export IFLY_API_SECRET="your_api_secret"
```

## 图片 OCR

适合对截图、扫描图、海报、表格图片做文字提取和版面保留。

```bash
# 默认同时返回 json 和 markdown 结果
python3 scripts/image_ocr.py ./image.jpg

# 只输出 markdown
python3 scripts/image_ocr.py ./image.jpg --format markdown

# 保存到文件
python3 scripts/image_ocr.py ./image.jpg -o output.txt
```

### 图片 OCR 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `image_path` | 图片路径 | - |
| `--format` | `json`、`markdown`、`json,markdown` | `json,markdown` |
| `--output`, `-o` | 保存结果到文件 | 不保存 |

## PDF OCR

适合对 PDF 文档进行结构化识别，输出 Word、Markdown 或 JSON，并返回下载地址与分页状态。

```bash
# 默认导出 Word
python3 scripts/pdf_ocr.py ./document.pdf

# 导出 Markdown
python3 scripts/pdf_ocr.py ./document.pdf --format markdown

# 只提交任务，不轮询
python3 scripts/pdf_ocr.py ./document.pdf --no-poll

# 使用上一步返回的任务号恢复查询
python3 scripts/pdf_ocr.py --task-no 25082744936879

# 调整轮询时间
python3 scripts/pdf_ocr.py ./document.pdf --poll-interval 10 --max-wait 600
```

### PDF OCR 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `pdf_path` | 本地 PDF 路径 | - |
| `--pdf-url` | 公网 PDF URL；使用时可省略本地 `pdf_path` | 不传 |
| `--task-no` | 查询 `--no-poll` 返回的已有任务 | 不传 |
| `--format` | `word`、`markdown`、`json` | `word` |
| `--no-poll` | 只返回任务号，不等待结果 | 关闭 |
| `--poll-interval` | 轮询间隔，最小 5 秒 | `5` |
| `--max-wait` | 最大等待时间（秒） | `300` |

## 限制说明

- PDF OCR 最大支持 `100` 页。
- 加密 PDF 不支持。
- 使用 `--pdf-url` 时可以省略本地 `pdf_path`；未提供 URL 时仍会校验本地文件是否存在。
- 使用 `--no-poll` 时请保存任务号，之后通过 `--task-no` 查询状态与下载地址。
- 图片 OCR 使用 `HMAC-SHA256` 鉴权；PDF OCR 使用 `MD5 + HMAC-SHA1` 鉴权。
- 完整文档与错误码说明见 [`SKILL.md`](./SKILL.md)。

## 参考链接

- 官方文档：https://www.xfyun.cn/doc/words/image_word_recognition/API.html
- 服务购买：https://console.xfyun.cn/services/se75ocrbm
