# iFly Translate

基于讯飞机器翻译 API，在多语言之间做文本翻译。对应脚本为 `scripts/translate.py`，纯 Python 标准库实现，无需安装第三方依赖。

## 前置条件

```bash
export XFYUN_APP_ID="your_app_id"
export XFYUN_API_KEY="your_api_key"
export XFYUN_API_SECRET="your_api_secret"
```

## 快速开始

```bash
# 默认中译英
python3 scripts/translate.py "你好世界"

# 指定源语言和目标语言
python3 scripts/translate.py -s en -t cn "Hello world"

# 从标准输入读取
echo "こんにちは" | python3 scripts/translate.py - -s ja -t cn

# 从文件翻译
python3 scripts/translate.py -f ./document.txt -s cn -t en

# 输出语言标签
python3 scripts/translate.py -v "你好"

# 输出原始 JSON
python3 scripts/translate.py --raw "测试翻译"
```

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `text` | 待翻译文本；传 `-` 表示从标准输入读取 | - |
| `--file`, `-f` | 从文件读取文本 | 不传 |
| `--from`, `-s` | 源语言代码 | `cn` |
| `--to`, `-t` | 目标语言代码 | `en` |
| `--verbose`, `-v` | 输出源/目标语言标签 | 关闭 |
| `--raw` | 输出原始 JSON 响应 | 关闭 |

## 限制说明

- 单次文本长度不超过 `4096` 字节。
- 鉴权方式为 `HMAC-SHA256`，并带 `Digest` 请求头。
- 脚本允许传 `auto` 作为源语言；实际是否可用取决于讯飞账号和接口能力。
- 完整语种列表见官方文档。
- 完整文档与错误码说明见 [`SKILL.md`](./SKILL.md)。

## 参考链接

- 官方文档：https://www.xfyun.cn/doc/nlp/xftrans/API.html
- 控制台：https://console.xfyun.cn/services/its
- 价格说明：https://www.xfyun.cn/services/xftrans?target=price

## 扩展说明

### 常用语言代码

| 代码 | 语言 | 代码 | 语言 |
|------|------|------|------|
| `cn` | 中文 | `en` | 英语 |
| `ja` | 日语 | `ko` | 韩语 |
| `fr` | 法语 | `de` | 德语 |
| `es` | 西班牙语 | `ru` | 俄语 |
| `ar` | 阿拉伯语 | `th` | 泰语 |
| `vi` | 越南语 | `pt` | 葡萄牙语 |
| `it` | 意大利语 | `tr` | 土耳其语 |

支持常见别名，例如 `zh -> cn`、`english -> en`、`japanese -> ja`。
