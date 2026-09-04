---
name: iflytek-translate
description: iFlytek Machine Translation (机器翻译) — translate text between Chinese, English, Japanese, Korean, French, Spanish, German, Russian, Arabic, Thai, Vietnamese, and many more languages. Use when the user wants to translate text. Pure Python stdlib, no pip dependencies.
metadata: {
  "homepage": "https://www.xfyun.cn/services/machine_translation",
  "openclaw": "{\"emoji\":\"🌐\",\"dimensions\":[\"机器翻译\",\"多语言翻译\"],\"user_instructions\":[\"把这段话翻译成英文\",\"翻译成中文\",\"帮我翻译一下\"],\"requires\":{\"bins\":[\"python3\"],\"env\":[\"XFYUN_APP_ID\",\"XFYUN_API_KEY\",\"XFYUN_API_SECRET\"]},\"primaryEnv\":\"XFYUN_API_KEY\"}"
}
---

# ifly-translate

Translate text using iFlytek's Machine Translation API (机器翻译). Supports 70+ language pairs.

## Setup

1. Create an app at [讯飞控制台](https://console.xfyun.cn) with 机器翻译 service enabled
2. Set environment variables:
   ```bash
   export XFYUN_APP_ID="your_app_id"
   export XFYUN_API_KEY="your_api_key"
   export XFYUN_API_SECRET="your_api_secret"
   ```

## Usage

### Basic translation (Chinese → English by default)

```bash
python3 scripts/translate.py "你好世界"
```

### Specify source and target language

```bash
python3 scripts/translate.py -s en -t cn "Hello world"
```

### Read from stdin

```bash
echo "こんにちは" | python3 scripts/translate.py - -s ja -t cn
```

### Read from file

```bash
python3 scripts/translate.py -f document.txt -s cn -t en
```

### Options

| Flag | Short | Description |
|------|-------|-------------|
| `text` | | Text to translate (use `-` for stdin) |
| `--file` | `-f` | Read text from a file |
| `--from` | `-s` | Source language code (default: `cn`) |
| `--to` | `-t` | Target language code (default: `en`) |
| `--verbose` | `-v` | Show source/target language labels |
| `--raw` | | Output raw JSON response |

### Common language codes

| Code | Language | Code | Language |
|------|----------|------|----------|
| `cn` | 中文 | `en` | English |
| `ja` | 日语 | `ko` | 韩语 |
| `fr` | 法语 | `de` | 德语 |
| `es` | 西班牙语 | `ru` | 俄语 |
| `ar` | 阿拉伯语 | `th` | 泰语 |
| `vi` | 越南语 | `pt` | 葡萄牙语 |
| `it` | 意大利语 | `tr` | 土耳其语 |

Aliases are supported: `zh`→`cn`, `chinese`→`cn`, `english`→`en`, `japanese`→`ja`, etc.

Full language list: <https://www.xfyun.cn/doc/nlp/xftrans/API.html>

### Examples

```bash
# Chinese to English
python3 scripts/translate.py "人工智能改变世界"

# English to Chinese
python3 scripts/translate.py -s en -t cn "Artificial intelligence changes the world"

# Japanese to Chinese
python3 scripts/translate.py -s ja -t cn "おはようございます"

# Verbose output with language labels
python3 scripts/translate.py -v "你好"

# Raw JSON for debugging
python3 scripts/translate.py --raw "测试翻译"
```

## Output

- Default: translated text only (stdout)
- `--verbose`: shows source and target with language labels
- `--raw`: full API JSON response

## Notes

- **Auth**: HMAC-SHA256 with Digest header (SHA-256 of body) — different from some other xfyun APIs
- **Endpoint**: `POST https://itrans.xfyun.cn/v2/its`
- **Env vars**: `XFYUN_APP_ID`, `XFYUN_API_KEY`, `XFYUN_API_SECRET`
- **Text is base64-encoded** in the request body
- **No pip deps**: Uses only Python stdlib (`urllib`, `hmac`, `hashlib`, `json`, etc.)

---

# 常见问题 FAQ (´,,•ω•,,)♡

## 机器翻译的主要功能是什么？
答：支持文本到文本的机器翻译 ✨

## 机器翻译支持哪些语种？
答：目前支持包括英、日、法、西、俄等70多种语言，详细的语种可见 [语种列表](https://www.xfyun.cn/doc/nlp/xftrans/API.html)~

## 机器翻译支持什么应用平台？
答：目前仅支持webapi接口哦 (,,•́ . •̀,,)

## 机器翻译支持的文本长度是多少？
答：单次文本长度不得超过4096字节~

## 是否支持源语种的自动识别？
答：目前不支持，后续会开放，新消息请关注平台动态 (◕‿◕)

## 机器翻译如何购买？
答：机器翻译产品页对应产品价格 → 点击申请购买，填好相关信息，商务工作人员会及时与您联系~
- 📦 查看套餐包：[讯飞控制台](https://console.xfyun.cn/services/its)
- 💰 价格详情：[价格页面](https://www.xfyun.cn/services/xftrans?target=price)

---

## ❌ 常见错误及解决方案 (´,,•ω•,,)♡

### 错误：认证失败 / Invalid credential
**表现**：返回 `401 Unauthorized` 或 `authentication error`

**可能原因**：
- API Key 或 API Secret 填写错误啦 (´；ω；`)
- 环境变量没有正确设置

**解决方法**：
1. 确认你正确设置了环境变量：
   ```bash
   export XFYUN_APP_ID="你的APP_ID"
   export XFYUN_API_KEY="你的API_KEY"
   export XFYUN_API_SECRET="你的API_SECRET"
   ```
2. 检查是否有空格或多余的引号哦 ✧(≖ ◡ ≖)
3. 去 [讯飞控制台](https://console.xfyun.cn) 确认你的密钥是否正确复制~

---

### 错误：服务未开通 / Service not enabled
**表现**：返回 `403 Forbidden` 或提示服务未开通

**可能原因**：
- 机器翻译服务还没有开通呢 (；´Д`A)

**解决方法**：
1. 登录 [讯飞控制台](https://console.xfyun.cn)
2. 点击「创建新应用」或选择已有应用
3. 在「产品服务」中找到「机器翻译」并开通
4. 开通后可能需要几分钟生效，稍等一下下~ (,,•́ . •̀,,)

---

### 错误：额度不足 / Quota exceeded
**表现**：返回 `402 Payment Required` 或提示额度不足

**可能原因**：
- 免费额度用完啦，或者套餐包到期了 (╥_╥)

**解决方法**：
1. 登录 [讯飞控制台](https://console.xfyun.cn/services/its) 查看剩余额度
2. 如果需要更多资源，可以：
   - 购买机器翻译套餐包 👉 [价格页面](https://www.xfyun.cn/services/xftrans?target=price)
   - 联系商务工作人员申请更大额度~

---

### 错误：文本过长 / Text too long
**表现**：返回错误提示文本过长

**可能原因**：
- 单次翻译的文本超过4096字节啦 (⊙_⊙)

**解决方法**：
1. 将长文本拆分成多个小段落进行翻译
2. 每个段落单独调用翻译接口
3. 最后将结果拼接起来~ ✨

---

### 错误：网络连接失败 / Connection error
**表现**：连接超时或网络错误

**可能原因**：
- 网络不稳定 or 防火墙拦截了 (；・∀・)

**解决方法**：
1. 检查网络连接是否正常
2. 如果是企业网络，尝试关闭防火墙或代理
3. 确认 `itrans.xfyun.cn` 是否可访问
4. 可以ping一下试试看：`ping itrans.xfyun.cn`

---

### 错误：语种不支持 / Language not supported
**表现**：返回语种错误或无法识别

**可能原因**：
- 使用的语言代码不在支持列表中 (￣▽￣)

**解决方法**：
1. 请参考上方「Common language codes」表格
2. 语言代码要使用标准的双字母代码哦，比如 `cn`、`en`、`ja`
3. 支持的语言列表详见：[讯飞机器翻译API文档](https://www.xfyun.cn/doc/nlp/xftrans/API.html)

---

## ❓ 其他常见问题

**Q: 为什么翻译结果返回为空？**
> A: 检查一下输入的文本是否为空，或者是否包含特殊字符导致编码问题哦~ (｡・`ω´・)

**Q: 翻译速度很慢怎么办？**
> A: 可以检查一下网络状况，或者将长文本拆分处理~

**Q: 如何查看我的使用量？**
> A: 登录 [讯飞控制台](https://console.xfyun.cn/services/its) 即可查看详细的使用统计和账单信息！

---

💡 **小提示**：
- 使用 `--raw` 参数可以看到完整的API响应，方便调试哦~
- 遇到不确定的错误时，可以把错误信息复制到搜索引擎搜索一下，或者查看 [官方文档](https://www.xfyun.cn/doc/nlp/xftrans/API.html) 寻求帮助 (◕‿◕)
- 购买套餐包请访问：[讯飞控制台](https://console.xfyun.cn/services/its) 或 [价格页面](https://www.xfyun.cn/services/xftrans?target=price) ✨
