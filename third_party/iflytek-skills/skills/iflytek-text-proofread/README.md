# iFly Text Proofread

基于讯飞公文校对 API，对中文文本进行校对、纠错和风险提示。对应脚本为 `scripts/text_proofread.py`，纯 Python 标准库实现，无需第三方依赖。

## 前置条件

```bash
export IFLY_APP_ID="your_app_id"
export IFLY_API_KEY="your_api_key"
export IFLY_API_SECRET="your_api_secret"
```

## 快速开始

以下命令默认在 `ifly-text-proofread/` 目录下执行：

```bash
# 直接校对一段文本
python3 scripts/text_proofread.py "第二个百年目标"

# 从文件读取
python3 scripts/text_proofread.py --file ./document.txt

# 从标准输入读取
echo "测试文本" | python3 scripts/text_proofread.py -

# 输出原始 JSON
python3 scripts/text_proofread.py --raw "测试文本"
```

## 参数说明

| 参数 | 说明 |
|------|------|
| `text` | 要校对的文本；传 `-` 表示从标准输入读取 |
| `--file`, `-f` | 从文件读取文本 |
| `--raw` | 输出解码后的原始 JSON 响应 |

## 限制说明

- 请求和响应中的文本字段使用 Base64 编码。
- 鉴权方式为 `HMAC-SHA256`。
- 完整文档与错误码说明见 [`SKILL.md`](./SKILL.md)。

## 参考链接

- 官方文档：https://www.xfyun.cn/services/textCorrectionOfficial
- 控制台：https://console.xfyun.cn/services/s37b42a45
- 价格说明：https://www.xfyun.cn/services/textCorrectionOfficial?target=price

## 扩展说明

### 覆盖问题类型

- 文字与标点差错：错别字、多字、少字、语义重复、语序错误、量词单位、数字差错、标点符号等
- 知识性差错：机构名称、专有名词、常识差错、媒体报道禁用词和慎用词等
- 内容风险：低俗辱骂、其他敏感内容

### 输出说明

- 默认输出为可读性较强的校对结果。
- 如果未发现问题，会直接提示文本通过校对。
- 如果发现问题，会列出错误类型、原文片段和修改建议。
