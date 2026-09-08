---
name: iflytek-text-proofread
description: iFlytek Official Document Proofreading (公文校对) — detect and correct errors in Chinese text including typos, punctuation, word order, factual mistakes, sensitive content, and more (27 error types). Supports up to 220,000 characters. Use when the user wants to proofread, check, or correct Chinese text, especially official documents. Pure Python stdlib, no pip dependencies.
metadata: {
  "homepage": "https://www.xfyun.cn/services/text_proofread",
  "openclaw": "{\"emoji\":\"✏️\",\"dimensions\":[\"公文校对\",\"文本纠错\"],\"user_instructions\":[\"帮我校对这段文字\",\"检查这篇文章有没有错别字\",\"公文纠错\"],\"requires\":{\"bins\":[\"python3\"],\"env\":[\"IFLY_APP_ID\",\"IFLY_API_KEY\",\"IFLY_API_SECRET\"]},\"primaryEnv\":\"IFLY_API_KEY\"}"
}
---

# ifly-text-proofread

Proofread Chinese text using iFlytek's Official Document Proofreading API (公文校对). Detects 27 types of errors across three categories:

**文字标点差错**: 错别字、多字、少字、语义重复、语序错误、句式杂糅、标点符号、量词单位、数字差错、句子查重、序号检查

**知识性差错**: 地理名词、机构名称、专有名词及术语、常识差错、媒体报道禁用词和慎用词

**内容导向风险**: 涉低俗辱骂、其他敏感内容

## Setup

1. Create an app at [讯飞控制台](https://console.xfyun.cn) with 公文校对 service enabled
2. Set environment variables:
   ```bash
   export IFLY_APP_ID="your_app_id"
   export IFLY_API_KEY="your_api_key"
   export IFLY_API_SECRET="your_api_secret"
   ```

## Usage

### Basic proofreading

```bash
python3 scripts/text_proofread.py "第二个百年目标"
```

### Read from stdin

```bash
echo "我们要加强对蓝球运动的推广" | python3 scripts/text_proofread.py -
```

### Read from file

```bash
python3 scripts/text_proofread.py --file document.txt
```

### Options

| Flag | Short | Description |
|------|-------|-------------|
| `text` | | Text to proofread (use `-` for stdin) |
| `--file` | `-f` | Read text from a file |
| `--raw` | | Output decoded JSON response |

### Examples

```bash
# Proofread a sentence
python3 scripts/text_proofread.py "我国加强蓝球运动的推广力度"

# Proofread a long document from file
python3 scripts/text_proofread.py -f report.txt

# Pipe from clipboard or other tools
pbpaste | python3 scripts/text_proofread.py -

# Raw JSON for debugging
python3 scripts/text_proofread.py --raw "测试文本"
```

## Output

- **✅ 无错误** — text passed proofreading with no issues
- **🔍 发现 N 处问题** — lists each error with:
  - Error word + category
  - Explanation
  - Context in the original text
  - Position and length
  - Suggested action (标记/替换/删除)
  - Correction suggestions

## Notes

- **Max text length**: 220,000 characters per request (auto-truncated with warning)
- **Auth**: HMAC-SHA256 signed URL (host + date + request-line → signature → authorization)
- **Endpoint**: `POST https://cn-huadong-1.xf-yun.com/v1/private/s37b42a45`
- **Env vars**: `IFLY_APP_ID`, `IFLY_API_KEY`, `IFLY_API_SECRET`
- **No pip deps**: Uses only Python stdlib (`urllib`, `hmac`, `hashlib`, `json`, etc.)
- **Text is base64-encoded** in the request body; response text field is also base64-encoded

---

## 常见问题

### ❓ 错误能力ID对照表
在使用API时，返回的 `belongId` 字段对应以下错误类型：

| belongId | 说明 | 常见场景 |
|----------|------|----------|
| 9 | 错别字、词 | 「蓝球」→「篮球」、「的」「地」「得」混淆 |
| 31 | 多字错误 | 「大大大大力」→ 删除多余字 |
| 32 | 少字错误 | 「中国成立」→ 「中华人民共和国成立」 |
| 35 | 语义重复 | 「大力大力发展」→ 语义重复 |
| 34 | 语序错误 | 「很好很强大」→ 「很强大很好」 |
| 39 | 量和单位差错 | 「3斤米」→ 「3公斤米」 |
| 36 | 数字差错 | 「第十几个」→ 数据不一致 |
| 20 | 句式杂糅 | 「原因是由于...」→ 句式杂糅 |
| 21 | 标点符号差错 | 顿号逗号混用、书名号错误 |
| 24 | 句子查重 | 文档内部重复句子 |
| 119 | 重要讲话引用 | 领导人讲话用词规范 |
| 123 | 地理名词 | 省市区名称、行政区划 |
| 19 | 机构名称 | 党政机关、企事业单位名称 |
| 124 | 专有名词及术语 | 专业术语、科技术语 |
| 122 | 媒体报道禁用词 | 敏感词、违规词检测 |
| 6 | 常识差错 | 明显与事实不符的内容 |
| 111 | 涉低俗辱骂 | 低俗内容、辱骂词汇 |
| 118 | 其他敏感内容 | 各类敏感信息检测 |

---

### 🔧 出现错误怎么办？— 用户视角引导

#### 1️⃣ 收到错误响应不要慌～ (´▽`)

- **首先检查**：环境变量 `IFLY_APP_ID`、`IFLY_API_KEY`、`IFLY_API_SECRET` 是否都设置好了呢？ฅ•̀∀•́ฅ
- **然后看这里**：
  - 返回的 `code` 字段：`0` = 成功，其他 = 失败 (详见下文错误码表)
  - 响应里的 `data` 字段包含检测结果，`message` 字段有详细说明哦～

#### 2️⃣ 常见错误码一览 ✧(•̀ω•́)✧

| code | 说明 | 解决方法 |
|------|------|----------|
| 0 | 成功 | 完美！继续使用吧～ ✨ |
| 101 | 参数缺失 | 快检查一下 `text` 参数有没有传呀？ |
| 102 | 参数无效 | 文本内容有问题，看看是不是太长了（≤220000字符）？ |
| 103 | 请求超长 | 文本太长了啦！分段处理试试吧～ |
| 104 | 超过并发 | 访问太频繁啦，休息一下再试试呗～ ⏳ |
| 105 | 无配额 | 配额用完了...去讯飞控制台看看还能不能用吧 (｡•́︿•̀｡) |
| 106 | 无产品权限 | 还没开通公文校对服务哦！去 [讯飞控制台](https://console.xfyun.cn/services/s37b42a45) 开通一下吧～ |
| 107 | 授权失败 | API密钥可能过期或错误，检查一下环境变量吧！ |
| 108 | 模型加载失败 | 服务端问题，稍后再试一次吧～ |

#### 3️⃣ 解析结果好迷茫？来，手把手教你～ (｡･ω･｡)

返回的 `detail` 数组里每个元素代表一个错误，来看看怎么读懂它：

```
detail[i].word        → 错误的内容是什么
detail[i].type        → 错误类型ID（对应上面的对照表哦）
detail[i].position    → 错误开始位置（从0开始计数）
detail[i].length      → 错误内容的长度
detail[i].suggestion  → 纠错建议
detail[i].ruleName    → 具体触发的规则名称
```

📍 **小技巧**：想知道错误在哪里结束吗？`position + length` 就是结束位置啦！这样就可以精准定位错误咯～

---

### 💡 常见问题解答

#### Q1: 公文校对与文本纠错、文本合规有哪些区别？
**A**: 文本纠错主要偏向通用领域（如写作、出版）文本进行纠错，公文校对在公文写作使用等领域效果更佳，同时也适合通用领域～ 文本合规对各类场景风险拦截更全面哦！(`･ω･´)ゞ

#### Q2: 公文校对的position仅标记开始位置，结束位置怎么计算呢？
**A**: 超简单的啦！讯飞已经给了 `position` 和 `length`，用 `position + length` 就是对应错误词在文本中的结束位置咯～ ✧٩(ˊᗜˋ*)و✧

#### Q3: 公文校对的文本有什么要求吗？
**A**: 有的呢～ 原请求的校对文本：
- ✨ 不能为空
- ✨ 不能超过 **220,000个字符**
- ✨ 汉字、英文字符、数字、标点都算做一个字符哦！

> 💡 **小提示**：如果文本太长，建议拆分成多条请求处理，这样效果会更好呀～

#### Q4: 为什么返回的结果是空的呀？(｡•́︿•̀｡)
**A**: 可能的原因：
- 1. 文本太短，没有检测到错误（这是好事！说明文本很棒棒～）
- 2. API调用失败了，检查一下 `code` 是不是 0 呢
- 3. 网络波动导致的，再试一次看看吧！

#### Q5: 如何开通或购买服务？
**A**: 去讯飞官方平台就好啦～
- 📖 [控制台入口](https://console.xfyun.cn/services/s37b42a45)
- 💰 [价格详情](https://www.xfyun.cn/services/textCorrectionOfficial?target=price)

---

### 🎉 使用小贴士

1. **批量处理**：长文本可以拆分成多条请求，结果合并起来就好啦～
2. **实时反馈**：可以配合编辑器插件，实现输入即校对功能哦！
3. **错误分类**：利用 `belongId` 统计各类错误数量，方便针对性修改～

---

### 📚 更多资源

- 官方文档：[讯飞公文校对](https://www.xfyun.cn/services/textCorrectionOfficial)
- 控制台：[讯飞开放平台](https://console.xfyun.cn)
- 价格说明：[计费方式](https://www.xfyun.cn/services/textCorrectionOfficial?target=price)

---

祝大家校对顺利！有问题随时来问哦～ (´▽`)ﾉ 💕
