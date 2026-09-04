# iFly Image Understanding

基于讯飞图片理解能力，对单张图片进行描述、问答和内容分析。对应脚本为 `scripts/image_understanding.py`，纯 Python 标准库实现，无需额外安装依赖。

## 前置条件

1. 在讯飞控制台开通图片理解服务。
2. 配置环境变量：

```bash
export IFLY_APP_ID="your_app_id"
export IFLY_API_KEY="your_api_key"
export IFLY_API_SECRET="your_api_secret"
```

## 快速开始

```bash
# 自动描述图片
python3 scripts/image_understanding.py ./photo.jpg

# 针对图片提问
python3 scripts/image_understanding.py ./photo.jpg -q "图片里有什么动物？"

# 使用基础模型
python3 scripts/image_understanding.py ./photo.jpg --domain general

# 输出原始 WebSocket 返回帧
python3 scripts/image_understanding.py ./photo.jpg --raw
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `image` | 图片路径，仅支持 `.jpg`、`.jpeg`、`.png` | - |
| `--question`, `-q` | 对图片提出的问题；不传时自动描述图片 | 自动描述 |
| `--domain`, `-d` | 模型版本：`imagev3` 或 `general` | `imagev3` |
| `--temperature`, `-t` | 采样温度，范围 `(0, 1]` | `0.5` |
| `--max-tokens` | 最大响应 token 数，范围 `1-8192` | `2048` |
| `--raw` | 输出原始 JSON 帧，便于调试 | 关闭 |

## 限制说明

- 单图大小不能超过 `4MB`。
- 当前脚本只处理单张图片、单轮请求。
- 鉴权方式为 `HMAC-SHA256` WebSocket 签名。
- 完整文档与错误码说明见 [`SKILL.md`](./SKILL.md)。

## 使用建议

- `imagev3` 适合更复杂的理解和问答。
- `general` 成本更低，适合简单识别或摘要场景。
- 如果是票据、表格、海报等带文字图片，建议直接提具体问题，例如“总金额是多少”“请提取标题和日期”。

## 参考链接

- 官方文档：https://console.xfyun.cn/services/image
- 服务购买：https://console.xfyun.cn/sale/buy?wareId=9046&packageId=9046002
