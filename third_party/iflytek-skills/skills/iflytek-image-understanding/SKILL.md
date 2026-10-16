---
name: iflytek-image-understanding
description: Use when user asks to analyze an image, describe image contents, or answer questions about a picture. iFlytek Image Understanding (图片理解) — analyze and answer questions about images using Spark Vision model. WebSocket API, pure Python stdlib, no pip dependencies.
metadata: {
  "homepage": "https://www.xfyun.cn/services/image_understanding",
  "openclaw": "{\"emoji\":\"🖼️\",\"dimensions\":[\"图片理解\",\"视觉问答\"],\"user_instructions\":[\"分析这张图片\",\"描述一下这张图\",\"这张图里有什么\"],\"requires\":{\"bins\":[\"python3\"],\"env\":[\"IFLY_APP_ID\",\"IFLY_API_KEY\",\"IFLY_API_SECRET\"]},\"primaryEnv\":\"IFLY_API_KEY\"}"
}
---

# ifly-image-understanding

Analyze images and answer questions about their content using iFlytek's Spark Vision model (图片理解).

## Setup

1. Create an app at [讯飞控制台](https://console.xfyun.cn) with 图片理解 service enabled
2. Set environment variables:
   ```bash
   export IFLY_APP_ID="your_app_id"
   export IFLY_API_KEY="your_api_key"
   export IFLY_API_SECRET="your_api_secret"
   ```

## Usage

### Describe an image

```bash
python3 scripts/image_understanding.py photo.jpg
```

### Ask a question about an image

```bash
python3 scripts/image_understanding.py photo.jpg -q "图片里有什么动物？"
```

### Use basic model (lower token cost)

```bash
python3 scripts/image_understanding.py photo.jpg --domain general
```

### Options

| Flag | Short | Description |
|------|-------|-------------|
| `image` | | Image file path (.jpg, .jpeg, .png) |
| `--question` | `-q` | Question about the image (default: describe) |
| `--domain` | `-d` | `imagev3` (advanced, default) or `general` (basic, fixed 273 tokens/image) |
| `--temperature` | `-t` | Sampling temperature (0,1], default 0.5 |
| `--max-tokens` | | Max response tokens 1-8192, default 2048 |
| `--raw` | | Output raw WebSocket JSON frames |

### Examples

```bash
# OCR a receipt
python3 scripts/image_understanding.py receipt.png -q "总金额是多少？"

# Identify objects
python3 scripts/image_understanding.py scene.jpg -q "图片中有哪些物体？"

# Low-cost basic model
python3 scripts/image_understanding.py chart.png -q "图表的趋势是什么？" -d general
```

## Notes

- **Image formats**: .jpg, .jpeg, .png
- **Max image size**: 4MB
- **Max tokens**: 8192 (input + output combined)
- **Auth**: HMAC-SHA256 signed WebSocket URL
- **Endpoint**: `wss://spark-api.cn-huabei-1.xf-yun.com/v2.1/image`
- **Pure stdlib**: No pip dependencies — uses built-in `socket` + `ssl` for WebSocket
- **Model versions**: `imagev3` (advanced, dynamic token cost) vs `general` (basic, fixed 273 tokens/image)

---

## 错误码说明 😢

遇到错误先别慌～看看下面找到对应的解决方法吧！✨

| 错误码 | 错误信息 | 解决办法 |
|--------|----------|----------|
| **0** | 🎉 成功 | 恭喜你！请求正常完成啦～ |
| **10003** | 用户的消息格式有错误 | 检查一下你的请求格式是否正确哦～确保发送的是合法的JSON格式呢！ |
| **10004** | 用户数据的schema错误 | 看起来数据结构有点问题～请检查一下字段名称和类型是否正确呀！ |
| **10005** | 用户参数值有错误 | 参数值可能不太对呢～仔细核对一下每个参数的有效范围吧！ |
| **10006** | 用户并发错误：同一用户不能多处同时连接 | 检测到重复连接啦！请确保只有一个客户端在连接同一个用户ID哦～ |
| **10013** | 用户问题涉及敏感信息，审核不通过 | 哎呀，你的问题可能包含了一些不太合适的内容～换个问题试试看吧！ |
| **10022** | 模型生产的图片涉及敏感信息，审核不通过 | 生成的图片没有通过审核呢...很抱歉，换张图片再试一下吧！ |
| **10029** | 图片任何一边的长度超过12800 | 图片尺寸太大啦！请确保图片宽高都不超过12800像素哦～ |
| **10041** | 图片分辨率不符合要求 | 图片尺寸不合适的呢～要求是：50×50 < 图片总像素值 < 6000×6000 哦！ |
| **10907** | Token数量超过上限 | 内容太丰富啦！对话历史+问题的字数太多，需要精简一下输入哦～ |

> 💡 **小贴士**：如果还有其他问题，可以查看官方文档或者联系技术支持哦！

---

## 常见问题 🤔

### 图片理解的主要功能是什么呀？🐱
答：用户输入一张图片和问题，从而识别出图片中的对象、场景等信息，然后回答你的问题～是不是很方便呢！✨

### 图片理解支持什么应用平台呢？📱
答：目前支持 **Web API** 应用平台哦！直接在代码里调用就可以啦～

### 图片理解的文本大小限制多少呀？📝
答：有效内容不能超过 **8192 Token** 呢～如果超过了就要精简一下输入啦！

---

## 更多资源 📚

- 📖 **使用文档**：https://console.xfyun.cn/services/image
- 🛒 **购买套餐**：https://console.xfyun.cn/sale/buy?wareId=9046&packageId=9046002&serviceName=%E5%9B%BE%E7%89%87%E7%90%86%E8%A7%A3&businessId=image

> 有更多问题随时来问我哦～祝你使用愉快！🌸
