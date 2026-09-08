---
name: iflytek-ocr-invoice
description: Use when user asks to recognize invoices, extract receipt data, or OCR bills and tickets. Recognize and extract structured data from invoices, receipts, and bills using iFlytek OCR API (科大讯飞票据识别). Supports VAT invoices, taxi receipts, train tickets, toll invoices, medical bills, bank receipts, and more.
metadata: {
  "homepage": "https://www.xfyun.cn/services/ocr",
  "openclaw": "{\"emoji\":\"🧾\",\"dimensions\":[\"票据识别\",\"发票OCR\"],\"user_instructions\":[\"识别这张发票\",\"提取发票信息\",\"帮我OCR这张票据\"],\"requires\":{\"bins\":[\"python3\"],\"env\":[\"XFYUN_APP_ID\",\"XFYUN_API_KEY\",\"XFYUN_API_SECRET\"]},\"primaryEnv\":\"XFYUN_API_KEY\"}"
}
---

# ifly-ocr-invoice

OCR-based invoice and receipt recognition using the iFlytek (科大讯飞) API. Extracts structured fields from photos or scans of Chinese invoices and bills.

## When to Use

- User provides an invoice/receipt image and wants structured data extracted
- Need to digitize paper invoices (增值税发票、出租车票、火车票、医疗票据 etc.)
- Expense report automation — extract amounts, dates, vendor info from receipts

## Prerequisites

- **Python 3** (standard library only, no pip install needed)
- **Environment variables** (get from [讯飞控制台](https://console.xfyun.cn)):
  - `XFYUN_APP_ID` — Application ID
  - `XFYUN_API_KEY` — API Key
  - `XFYUN_API_SECRET` — API Secret

## Supported Image Formats

png, jpg/jpeg, bmp, gif, tif/tiff, pdf

## Usage

The script is at `scripts/invoice.py` relative to this skill directory.

### Basic Recognition

```bash
python3 scripts/invoice.py /path/to/invoice.png
```

### Options

| Flag | Description |
|------|-------------|
| `--raw` | Output raw API JSON response instead of formatted text |

### Examples

```bash
# Recognize a VAT invoice
python3 scripts/invoice.py ./vat_invoice.jpg

# Recognize a medical receipt with raw output
python3 scripts/invoice.py ./medical_bill.png --raw

# Recognize a taxi receipt
python3 scripts/invoice.py ./taxi_receipt.jpg
```

### Output Format (default)

Human-readable structured fields:

```
票据类型: 增值税普通发票

发票代码: 012345678901
发票号码: 12345678
开票日期: 2026年03月06日
金额: ¥1,234.56
...
```

### Output Format (--raw)

Full API JSON response including all metadata and encoded payload.

## Authentication

Uses HMAC-SHA256 signature-based auth (讯飞鉴权). The script handles all signing automatically — just set the three environment variables.

## API Details

- **Endpoint**: `POST https://api.xf-yun.com/v1/private/sc45f0684`
- **Auth**: HMAC-SHA256 signature in URL query parameters
- **Image limit**: Check your service tier on 讯飞控制台

## 哎呀，出错了怎么办？(´；ω；`)

别慌别慌～ 对照下面的表格看看，大部分问题都能自己解决哦！如果试了还是不行，随时来问我，我们一起解决～ ✧٩(ˊᗜˋ*)و✧

---

### 🌟 常见错误快速排查表

| 错误码 | 可能的原因 | 快去检查这个！ |
|--------|------------|----------------|
| **10105 / 10313** | 哎呀，认证信息好像不太对呢 | → 三个环境变量都设好了吗？[往下看有详细检查步骤](#q-一直提示-10105-unauthorized-怎么破) |
| **10163** | 传送的图片数据有点问题 | → 图片压缩一下试试？或者换个格式？ |
| **10200** | 找不到图片文件啦 | → 路径对不对？文件有没有损坏？ |
| **11201** | 今天的次数用完啦！ | → [去控制台看看剩余额度或购买更多次数](https://www.xfyun.cn/services/Invoice_recognition?target=price) |
| **10003** | 讯飞服务器可能在“打盹” | → 稍等几秒再试一次看看？ |

---

### 📋 完整错误码列表（超详细版）

| 错误码 | 发生了什么呀 | 温柔提示语 |
|--------|--------------|-----------|
| **0** | 成功啦！超棒的！ | 恭喜恭喜！识别成功啦～ (灬°ω°灬) |
| **10003** | 平台有点小状况 | 讯飞服务器可能暂时忙起来了，等几秒钟再试一次看看？成功率很高的！ |
| **10004** | 会话模式不太对 | 这个情况比较少见呢...如果一直出现的话，我们可以一起提交工单问问讯飞工程师～ |
| **10008** | 服务实例有问题 | 少见的情况！提交工单让技术小哥哥/小姐姐看看？ |
| **10009** | 输入的数据格式不对 | 请检查一下：<br>• 图片格式对不对呀？（支持 png/jpg/bmp/gif/tif/pdf）<br>• 图片有没有损坏呀？<br>• 试试用图片查看器打开看看能不能显示？ |
| **10010** | 授权额度不太够 | 去看看讯飞控制台吧，看看套餐是不是过期啦？或者额度用完了呢？ (｡•́︿•̀｡)<br>💰 [需要更多额度？点击购买](https://www.xfyun.cn/services/Invoice_recognition?target=price) |
| **10019** | 等太久啦，超时了 | 可能图片太大啦！试着压缩一下图片，或者网络慢一点也会这样哦～ |
| **10105** | **最常见的问题！** 认证失败啦 | 哎呀，这个一定要检查仔细哦：<br>① `XFYUN_APP_ID` 填好了吗？<br>② `XFYUN_API_KEY` 正确吗？<br>③ `XFYUN_API_SECRET` 没问题吧？<br>💡 小提示：从讯飞控制台**直接复制粘贴**是最好的方式，千万别手打哦，容易出错！ |
| **10114** | 会话超时啦 | 识别大图片需要耐心一点哦，确保网络稳定再试一次？ |
| **10118** | 服务端解析失败 | 这是讯飞平台的问题啦，重试几次看看？如果一直不行就提交工单～ |
| **10139** | 参数不对 | 检查一下调用的参数有没有写错？ |
| **10160** | JSON 解析失败 | 检查一下代码里有没有什么特殊字符打扰到了？ |
| **10161** | Base64 编码失败 | 确认图片是用 Base64 编码的哦～ 注意不要带文件头（就是不要 `data:image/xxx;base64,` 这个前缀！） |
| **10163** | 参数校验失败 | 看看错误信息里怎么说的：<br>• 说“图片为空”？→ 检查图片读取<br>• 说“图片太大”？→ 压个缩，4MB 以下最好～<br>• 其他... → 可能是格式不支持哦 |
| **10200** | **很常见！** 读不到图片 | 嗨呀，检查一下：<br>① 文件路径对不对呀？（相对路径要写对哦）<br>② 图片文件有没有损坏？（用预览打开试试？）<br>③ 文件名有没有奇怪符号？（尽量用英文名试试？）<br>💡 [快速确认文件是否存在往下看 ↓](#q-提示-10200-read-data-timeout-怎么办呀) |
| **10221** | 找不到可用连接 | 可能讯飞服务器现在有点忙，等几分钟再试试？ |
| **10222 / 10223** | 负载均衡找不到节点 | 技术问题，提交工单处理一下吧～ |
| **10225** | 找不到业务服务 | 检查一下 API 地址有没有写错？ |
| **10300 / 10301** | 排序缓冲区出问题啦 | 内部问题，提交工单吧～ |
| **10313** | **敲黑板！最常见！** AppID 不匹配 | 这个问题最多人遇到啦！请确认：<br>① 三个环境变量都设置了！<br>② `XFYUN_APP_ID` 是 AppID，不是 API Key 哦！<br>③ 确认应用和 API Key 在同一个讯飞账号下！<br>💡 [检查环境变量的快捷命令往下看 ↓](#q-一直提示-10105-unauthorized-怎么破) |
| **10317** | 版本号不对 | 检查一下 API 版本参数？ |
| **10400 / 10401** | 协议序列化出错 | 内部问题，提交工单～ |
| **10500** | 内部同步出错 | 先重试一次看看？可能只是临时小状况！ |
| **10600** | 事件异常 | 提交工单处理一下吧～ |
| **10700** | 权限不足 | 去讯飞控制台看看应用权限设置？ |
| **11200** | 功能未授权 | 可能情况：<br>① 开通的服务和调用的 API 不匹配<br>② 服务过期啦<br>③ 这个应用没开通这个功能<br>💡 去讯飞控制台 → 我的应用 → 账号服务权限 看看？<br>🚀 [需要开通服务？去看看有哪些套餐](https://www.xfyun.cn/services/Invoice_recognition?target=price) |
| **11201** | **日限额到啦！** | 免费版每天有次数限制哦：<br>• 方案1：等到明天，次数会刷新～<br>• 方案2：去讯飞控制台升级付费套餐 💰<br>🚀 **一键购买入口**：https://www.xfyun.cn/services/Invoice_recognition?target=price |
| **11502 / 11503** | 服务器内部错误 | 一般重试几次就好啦，持续报错请联系讯飞～ |
| **100001~100010** | 引擎初始化失败 | 技术大大们需要介入啦，提交工单吧！ |

---

### 💬 常见问题 Q&A

**Q: 一直提示 "10105 Unauthorized" 怎么破？(╥﹏╥)**
> 别急别急，十有八九是环境变量的问题！按这个顺序检查：
> 1. 三个环境变量都设好了吗？（`XFYUN_APP_ID`, `XFYUN_API_KEY`, `XFYUN_API_SECRET`）
> 2. 值是直接从讯飞控制台复制的吗？手打的话很容易漏掉字符哦！
>
> **✨ 快速确认环境变量（复制粘贴运行）：**
>
> ```bash
> # macOS / Linux 用户复制这行：
> echo "XFYUN_APP_ID: $XFYUN_APP_ID | XFYUN_API_KEY: $XFYUN_API_KEY | XFYUN_API_SECRET: $XFYUN_API_SECRET"
>
> # Windows 用户在 cmd 里运行这行：
> echo XFYUN_APP_ID: %XFYUN_APP_ID% ^|^| XFYUN_API_KEY: %XFYUN_API_KEY% ^|^| XFYUN_API_SECRET: %XFYUN_API_SECRET%
> ```
>
> 如果显示为空或者显示错误，那就是还没设好哦！设置方法：
> - **macOS/Linux**: 在终端运行 `export XFYUN_APP_ID=你的值`，然后 `echo 'export XFYUN_APP_ID=你的值' >> ~/.zshrc` 永久保存
> - **Windows**: 按 Win+R → 输入 `sysdm.cpl` → 高级 → 环境变量 → 新建

**Q: 提示 "10200 read data timeout" 怎么办呀？(;´Д`)**
> 一般是这几个原因：
> - 路径写错啦（注意相对路径和绝对路径的区别）
> - 图片文件坏掉了（用系统预览打开看看？）
> - 文件名有中文或特殊符号（试试改成英文名？）
>
> **✨ 快速确认文件是否存在（复制粘贴运行）：**
>
> ```bash
> # 检查文件是否存在（替换成你的文件路径）
> ls -la /path/to/your/invoice.png
>
> # 或者用这个命令查看当前目录下的图片文件
> ls -la *.png *.jpg *.jpeg *.bmp *.pdf 2>/dev/null
> ```
>
> 如果显示 "No such file or directory"，那就是路径不对哦！

**Q: 提示 "11201 auth no enough license" 是啥意思呀？**
> 哈哈，免费额度用光光啦！讯飞免费版每天有限制次数～
> - 方案1：休息一下，第二天再战！(额度会刷新)
> - 方案2：豪气地购买付费套餐 🚀
>
> 💰 **需要更多次数？点击这里直接购买**：https://www.xfyun.cn/services/Invoice_recognition?target=price

**Q: 图片太大识别好慢怎么破？(´；ω；`)**
> 来来来，试试这些小技巧：
> - 压缩图片到 1-2MB
> - 裁剪掉多余的背景部分
> - 分辨率保持在 2000x2000 以内

---

### ✨ 温馨小贴士

遇到问题先别慌！**环境变量和文件路径** 是最容易出错的环节，检查一遍往往就能搞定～

如果还有问题，把错误信息里的 **sid** 字段保存下来哦，这个可以帮讯飞技术定位问题！

记住：**你一定可以的！** (๑•̀ㅂ•́)و✧ 有问题随时来问我呀～

## Tips

- Ensure the image is clear and well-lit for best accuracy
- Crop to just the invoice area if possible (reduces noise)
- PDF support means you can pass scanned documents directly
