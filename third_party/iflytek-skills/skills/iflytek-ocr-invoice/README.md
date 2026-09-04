# iFly OCR Invoice

基于讯飞票据识别 API，从发票、收据、账单等票据图片中提取结构化字段。对应脚本为 `scripts/invoice.py`，纯 Python 标准库实现，无需安装第三方依赖。

## 前置条件

1. 在讯飞控制台开通票据识别服务。
2. 配置环境变量：

```bash
export XFYUN_APP_ID="your_app_id"
export XFYUN_API_KEY="your_api_key"
export XFYUN_API_SECRET="your_api_secret"
```

## 快速开始

```bash
# 识别增值税发票
python3 scripts/invoice.py ./vat_invoice.jpg

# 识别医疗票据并输出原始响应
python3 scripts/invoice.py ./medical_bill.png --raw

# 识别出租车票
python3 scripts/invoice.py ./taxi_receipt.jpg
```

## 参数说明

| 参数 | 说明 |
|------|------|
| `image` | 票据图片或 PDF 路径 |
| `--raw` | 输出原始 API JSON |

## 限制说明

- 完整文档与错误码说明见 [`SKILL.md`](./SKILL.md)。

## 参考链接

- 官方文档：https://www.xfyun.cn/services/Invoice_recognition
- 服务购买：https://www.xfyun.cn/services/Invoice_recognition?target=price

## 扩展说明

### 支持格式

脚本按文件后缀自动识别类型，支持：

- `png`
- `jpg` / `jpeg`
- `bmp`
- `gif`
- `tif` / `tiff`
- `pdf`

### 输出说明

- 默认输出为人类可读的字段列表，例如票据类型、发票代码、发票号码、日期、金额等。
- 传入 `--raw` 时输出完整 JSON，适合调试或二次处理。

### 适用场景

- 发票录入
- 报销单据结构化提取
- 出租车票、火车票、医疗票据归档

### 实现说明

- 鉴权方式为 `HMAC-SHA256`。
- 默认接口地址为 `https://api.xf-yun.com/v1/private/sc45f0684`。
