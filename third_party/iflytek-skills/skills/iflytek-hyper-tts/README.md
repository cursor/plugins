# Xfei Hyper TTS (讯飞超拟人语音合成)

基于讯飞超拟人语音合成API的语音合成工具，支持多属性控制。适用于"把这段文案读出来"等语音合成需求。

## 快速开始

### 1. 安装依赖

```bash
pip install websocket-client
```

### 2. 配置环境变量

```bash
export XFEI_APP_ID="your_app_id"
export XFEI_API_KEY="your_api_key"
export XFEI_API_SECRET="your_api_secret"
```

### 3. 基本使用

```bash
# 文本转语音（默认聆小糖）
python3 scripts/xfei_hyper_tts.py --text "你好，欢迎使用讯飞超拟人语音合成！"

# 指定输出文件
python3 scripts/xfei_hyper_tts.py --text "欢迎收听" --output welcome.mp3

# 指定发音人 - 讯飞聆飞鸿文档（男声，文档朗读）
python3 scripts/xfei_hyper_tts.py --text "文档内容" --vcn x4_lingfeihong_document_n

# 指定发音人 - Catherine（英文美式新闻）
python3 scripts/xfei_hyper_tts.py --text "Hello news" --vcn x4_EnUs_Catherine_profnews

# 带情感合成
python3 scripts/xfei_hyper_tts.py --text "今天真开心！" --emotion happiness

# 查看可用音色
python3 scripts/xfei_hyper_tts.py --action list_voices
```

## 参数说明

### 基础参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--text` | 要合成的文本 | - |
| `--text_file` | 文本文件路径 | - |
| `--output` | 输出文件路径 | output.mp3 |
| `--vcn` | 发音人 | x5_lingxiaotang_flow (聆小糖) |
| `--speed` | 语速 (0-100) | 50 |
| `--volume` | 音量 (0-100) | 50 |
| `--pitch` | 音调 (0-100) | 50 |
| `--encoding` | 音频格式 (lame=MP3) | lame |
| `--sample_rate` | 采样率 (8000/16000/24000) | 24000 |

### Omni 多属性参数

| 参数 | 说明 | 可选值 |
|------|------|--------|
| `--language` | 语言/方言 | zh_CN, en_US, en_UK, Sichuanese, Northeast |
| `--style` | 说话风格 | news, advertisement, story, novel, chat, reading |
| `--emotion` | 情感 | happiness, sadness, anger, fear, surprise, neutral |
| `--role` | 角色 | chat, narration, customer_service, assistant |

## 精选音色池（5大推荐发音人）

| 序号 | 发音人名称 | VCN代码 | 性别 | 语种 | 适用场景 |
|------|------------|---------|------|------|----------|
| 1 | 聆小糖 | x5_lingxiaotang_flow | 女 | 中文普通话 | **默认主音色**，语音助手、聊天 |
| 2 | 讯飞聆飞鸿文档 | x4_lingfeihong_document_n | 男 | 中文普通话 | 文档朗读、正式播报 |
| 3 | 讯飞关山 | x4_guanshan | 男 | 中文普通话 | 阅读场景、有声书 |
| 4 | 大模型高表现力音色1 | x5_lingxiaoxue | 女 | 中文普通话 | 高表现力需求 |
| 5 | Catherine | x4_EnUs_Catherine_profnews | 女 | 英文美式 | 新闻专业、英语播报 |

## 错误处理

常见错误及解决方案：

| 错误码 | 原因 | 解决方案 |
|--------|------|----------|
| MISSING_ENV_VARS | 未配置环境变量 | 设置 XFEI_APP_ID, XFEI_API_KEY, XFEI_API_SECRET |
| TEXT_TOO_LONG | 文本超长（>64KB） | 拆分为多个短文本 |
| CONNECTION_FAILED | 网络连接失败 | 检查网络连接 |
| AUTH_ERROR_10313 | APP_ID与API_KEY不匹配 | 核对讯飞控制台凭证 |
| SERVICE_NOT_AUTHORIZED_11200 | 未开通TTS服务 | 开通/续费超拟人语音合成服务 |
| INVALID_INPUT_10009 | 输入数据无效 | 避免使用制表符、HTML标签、表情符号 |

## 参数优先级

1. **默认参数**：用户未指定时，使用系统预设（聆小糖、语速50、音量50、音调50、MP3）
2. **用户优先**：用户明确指定的参数，优先级高于默认值
