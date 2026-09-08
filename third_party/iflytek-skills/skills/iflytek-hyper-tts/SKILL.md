---
name: iflytek-hyper-tts
description: Use when user asks to synthesize speech, convert text to audio, or read text aloud. 讯飞超拟人语音合成 - 支持文本转语音、语音合成（发音人/语速/语调/音量/输出格式）。大模型语音合成技能。语音合成, 文字转语音, 超拟人, TTS.
metadata: {
  "homepage": "https://www.xfyun.cn/doc/spark/super%20smart-tts.html",
  "openclaw": "{\"emoji\":\"🎙️\",\"dimensions\":[\"超拟人合成 Skill\",\"超拟人合成（大模型）\"],\"user_instructions\":[\"把这段文案读出来\",\"读出这段文字\",\"把这段话转语音\"],\"requires\":{\"bins\":[\"python3\"],\"env\":[\"XFEI_APP_ID\",\"XFEI_API_KEY\",\"XFEI_API_SECRET\"]},\"primaryEnv\":\"XFEI_API_KEY\"}"
}
---

# Ifly Hyper TTS (讯飞超拟人语音合成)

将文本转换为超拟人语音。适用于"把这段文案读出来"等语音合成需求。

API 文档：https://www.xfyun.cn/doc/spark/super%20smart-tts.html

## 核心特性

- **文本转语音**：通过 WebSocket 双向流式接口合成音频
- **发音人控制**：通过 `--vcn` 指定已授权的超拟人发音人，默认使用聆小糖
- **基础韵律控制**：语速（speed）/ 音量（volume）/ 语调（pitch）
- **多属性控制**：语言/方言通过选择不同发音人(VCN)实现
- **多格式输出**：MP3（lame）

---

## 使用场景（AI调用指南）

### 场景一：用户说"把这段文案读出来"

用户直接提供文本，要求语音合成。**默认使用系统预设参数**。

**触发条件**：用户指令包含"读出来"、"念出来"、"语音合成"、"转语音"、"文字转语音"等关键词。

**默认参数**：
- 发音人：聆小糖 (`x5_lingxiaotang_flow`) - 女声，中文普通话，最适合作为默认主音色
- 语速：50（正常）
- 音量：50（正常）
- 语调：50（正常）
- 输出格式：MP3（lame）
- 采样率：24000Hz

```bash
# 直接合成（使用默认参数）
python3 scripts/xfei_hyper_tts.py --text "你好，欢迎使用讯飞超拟人语音合成！"

# 指定输出文件
python3 scripts/xfei_hyper_tts.py --text "欢迎收听" --output welcome.mp3

# 使用默认发音人聆小糖
python3 scripts/xfei_hyper_tts.py --text "你好" --vcn x5_lingxiaotang_flow
```

### 场景二：用户明确指定参数

用户明确指定发音人、语速、语调、音量等参数时，**按用户指定参数执行**。

**触发条件**：用户明确提到发音人名称/VCN、语速数值、语调/音量调整等。

```bash
# 指定发音人（需填写已授权的 vcn 代码，可通过 list_voices 查看）
python3 scripts/xfei_hyper_tts.py --text "你好" --vcn x5_lingfeiyi_flow

# 调整语速
python3 scripts/xfei_hyper_tts.py --text "语速稍快" --output fast.mp3 --speed 70
python3 scripts/xfei_hyper_tts.py --text "语速稍慢" --output slow.mp3 --speed 30

# 调整音量和语调
python3 scripts/xfei_hyper_tts.py --text "大声一点" --output loud.mp3 --volume 80
python3 scripts/xfei_hyper_tts.py --text "音调高低" --output pitch_test.mp3 --pitch 60
```

### 场景三：语言/方言控制

⚠️ **重要说明**：讯飞超拟人API不支持 `--language`、`--style`、`--emotion` 参数。语言和方言通过**选择不同发音人(VCN)**来实现。

```bash
# 中文普通话（默认）
python3 scripts/xfei_hyper_tts.py --text "你好"

# 英语
python3 scripts/xfei_hyper_tts.py --text "Hello" --vcn x5_EnUs_Grant_flow

# 天津话
python3 scripts/xfei_hyper_tts.py --text "干嘛" --vcn x4_zijin_oral

# 东北话
python3 scripts/xfei_hyper_tts.py --text "嘎哈呢" --vcn x4_ziyang_oral
```

### 场景四：查看可用发音人列表

```bash
python3 scripts/xfei_hyper_tts.py --action list_voices
```

---

## 发音人说明

### 精选音色池（Skill 默认支持）

Skill 默认只开放以下 7 个精选发音人，避免全部暴露：

| 姓名 | VCN | 性别 | 语言 | 适用场景 |
|------|-----|------|------|----------|
| 聆小糖 | x5_lingxiaotang_flow | 女声 | 中文普通话 | **默认主音色**，适合语音助手 |
| 聆飞瀚 | x6_lingfeihan_pro | 成年男 | 中文普通话 | 纪录片、偏正式表达场景 |
| 温暖磁性男声 | x6_wennuancixingnansheng_mini | 成年男 | 中文普通话 | 角色配音、客服场景 |
| Grant | x5_EnUs_Grant_flow | 男 | 英语美式 | 英文场景 |
| Lila | x5_EnUs_Lila_flow | 女 | 英语美式 | 英文场景 |
| 天津话 | x4_zijin_oral | 成年男 | 天津话 | 方言场景 |
| 东北话 | x4_ziyang_oral | 成年男 | 东北话 | 方言场景 |

**说明**：语言/方言通过选择不同发音人(VCN)来实现，而非 `--language` 参数。

### 官方默认免费发音人

以下发音人为官方提供的免费发音人，无需额外开通：

| 姓名 | VCN | 性别 | 语言 |
|------|-----|------|------|
| 聆小璇 | x5_lingxiaoxuan_flow | 成年女 | 中文普通话 |
| 聆飞逸 | x5_lingfeiyi_flow | 成年男 | 中文普通话 |
| 聆小玥 | x5_lingxiaoyue_flow | 成年女 | 中文普通话 |
| 聆玉昭 | x5_lingyuzhao_flow | 成年女 | 中文普通话 |
| 聆玉言 | x5_lingyuyan_flow | 成年女 | 中文普通话 |

其余发音人（x6\_pro/x6\_mini 等系列）需在控制台单独开通授权后才可使用。完整发音人列表见[官方文档](https://www.xfyun.cn/doc/spark/super%20smart-tts.html#%E5%8F%91%E9%9F%B3%E4%BA%BA%E5%88%97%E8%A1%A8)。

---

## 输入输出规范

### 输入参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--text` | 要合成的文本内容（与 --text_file 二选一） | - |
| `--text_file` | 文本文件路径（与 --text 二选一） | - |
| `--output` | 输出文件路径 | output.mp3 |
| `--vcn` | 发音人 VCN 代码 | x5_lingxiaotang_flow（聆小糖） |
| `--speed` | 语速 0-100（0=半速，50=正常，100=双倍） | 50 |
| `--volume` | 音量 0-100（0=静音，50=正常，100=双倍） | 50 |
| `--pitch` | 语调 0-100（0=低，50=正常，100=高） | 50 |
| `--encoding` | 音频格式：lame(MP3) | lame |
| `--sample_rate` | 采样率：8000 / 16000 / 24000 | 24000 |
| `--role` | ⚠️ 角色（部分发音人支持，可能返回10163） | - |

### 响应格式

合成成功：

```json
{
  "success": true,
  "output_path": "/absolute/path/to/output.mp3",
  "encoding": "lame",
  "vcn": "x5_lingxiaotang_flow",
  "voice_name": "聆小糖",
  "text_length": 20,
  "total_size_bytes": 45312,
  "total_size_kb": 44.25,
  "frames": 12,
  "parameters_used": {
    "speed": 50,
    "volume": 50,
    "pitch": 50,
    "sample_rate": 24000
  }
}
```

---

## 工作流（Workflow）

1. **接收用户输入**：解析文本和参数
2. **参数优先级**：用户指定参数 > 系统默认参数（聆小糖、语速50、音量50、语调50、MP3）
3. **输入校验**：检查文本长度（最大 64KB）和参数范围
4. **鉴权构建**：使用 HMAC-SHA256 签名构建 WebSocket 认证 URL
5. **建立连接**：连接到讯飞超拟人 TTS WebSocket 端点
6. **发送请求**：传输文本和语音参数
7. **接收音频**：收集 Base64 编码的音频帧直至 status=2
8. **保存文件**：解码并写入输出文件
9. **返回结果**：JSON 格式返回文件路径、大小、编码等信息

---

## 常见问题 (FAQ) ❓

### Q1：超拟人语音合成和传统语音合成的区别是什么？🤔

**答：** 在传统语音合成的基础上，超拟人语音合成进一步提升了语音的自然度和表现力～ 🌟 它能精准模拟人类的**副语言现象**，如呼吸、叹气、语速变化等，使得语音不仅流畅自然，更**富有情感和生命力**！✨ 简单来说，就是让AI的声音更像真人说话那样有感情～ 🎤

---

### Q2：超拟人语音合成支持合成什么格式的音频？🎵

**答：** 支持合成以下格式的音频哦～ 🎶

| 格式 | encoding 参数值 | 文件扩展名 |
|------|-----------------|------------|
| MP3 | lame | .mp3 |
| PCM | raw | .pcm |
| Speex | speex / speex-wb | .spx |
| Opus | opus / opus-wb / opus-swb | .opus |

> 💡 **小提示**：如果需要处理这些音频格式，可以使用 FFmpeg、Audibility 等音频工具～

---

### Q3：如何查看合成音频的隐性标识？🔍

**答：** 只需要将 `implicit_watermark` 参数设置为 `true` 就可以啦～

当音频编码设置为 **lame（MP3）** 时，查看MP3的元数据信息，会发现这样的标识：

```
Metadata: {"AIGC":{
  "Label":"1",
  "ContentProducer":"001191340000711771143J00000",
  "ProduceID":"ase00018773@dx19c4b750907b867772",  ← 这是本次请求对应的 sid 哦～
  "ContentPropagator":"001191340000711771143J00000",
  "PropagateID":"%!s(MISSING)"
}}
```

> 📌 **注意**：除了 `ProduceID` 是本次请求对应的 sid，其他字段都是固定的～

---

## 错误处理

调用失败时，请参照以下表格进行处理哦～ 🔧

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| ❌ | 未配置环境变量 | 嗨呀～还没配置讯飞API凭证呢！请设置 `XFEI_APP_ID`、`XFEI_API_KEY`、`XFEI_API_SECRET` 这三个环境变量哦～ |
| 10009 | 输入数据非法 | 检查一下输入的数据吧～可能包含特殊字符或非法格式呢 🤔 |
| 10010 | 没有授权许可或授权数已满 | 抱歉，当前应用没有权限或配额用完啦！请联系讯飞提交工单处理哦～ |
| 10019 | session 超时 | 会话超时啦！检查一下数据是否发送完毕但没有关闭连接呢 🔌 |
| 10043 | 音频解码失败 | 音频解码出错了～请检查编码参数是否正确设置呢～ |
| 10114 | session 超时 | 会话时间超过60秒啦！加快发送速度试试看哦 ⏱️ |
| 10139 | 参数错误 | 参数写错了呢～请检查一下参数是否正确吧～ |
| 10160 | 请求数据格式非法 | 请求数据格式不对哦～确保发送的是合法的JSON数据吧 📝 |
| 10161 | base64 解码失败 | 数据编码有问题！确保发送的数据已经过base64编码啦～ |
| 10163 | 参数校验失败 | 常见原因：发音人不支持该参数哦（比如某些发音人不支持 role 参数） 💡 |
| 10200 | 读取数据超时 | 超过10秒没发送数据就会超时哦～保持流畅输入吧 ⏰ |
| 10222 | 数据超限 | 上传数据超过接口上限啦！或者检查一下SSL证书呢 🔒 |
| 10223 | lb 找不到节点 | 服务器内部问题～请联系讯飞提交工单哦 📮 |
| 10313 | appid 和 apikey 不匹配 | 哎呀，APP_ID 和 API_KEY 不对应呢！去讯飞控制台核对一下吧～ |
| 10317 | 版本非法 | 版本有问题！请联系讯飞技术支持处理哦 🔧 |
| 10700 | 引擎异常 | 引擎出错啦！可以提供 sid 给讯飞提交工单排查哦 🐛 |
| 11200 | 功能未授权 | 没有开通超拟人语音合成服务哦～去讯飞控制台开通一下吧！ |
| 11201 | 每日次数超限 | 今天的调用次数用完啦！可以提交应用审核提额，或联系商务购买企业版哦 💰 |
| 11502 | 服务配置错误 | 服务器配置有问题～请联系讯飞提交工单哦 📮 |
| 11503 | 服务内部响应数据错误 | 服务器内部错误～请联系讯飞提交工单哦 📮 |
| 100001~100010 | 调用引擎时出现错误 | 提供 sid 及错误信息，联系讯飞技术人员排查哦 🔧 |

---

## 配置说明

### 1. 安装依赖

```bash
pip install websocket-client>=1.6.0
```

### 2. 获取API凭证

访问[讯飞开放平台](https://www.xfyun.cn/)创建应用，获取：
- **APP_ID**：应用ID
- **API_KEY**：API密钥
- **API_SECRET**：API密钥私钥

### 3. 开通服务 & 购买套餐 🎁

如果还没有开通超拟人语音合成服务，可以通过以下链接进行开通或购买哦～

| 链接类型 | 地址 | 说明 |
|---------|------|------|
| 🌐 服务控制台 | [讯飞控制台 - 超拟人语音合成](https://console.xfyun.cn/services/uts) | 开通服务、管理应用、查看用量 |
| 💳 购买套餐 | [讯飞购买页面](https://console.xfyun.cn/sale/buy?wareId=9134&packageId=9134001&serviceName=%E8%B6%85%E6%8B%9F%E4%BA%BA%E8%AF%AD%E9%9F%B3%E5%90%88%E6%88%90&businessId=uts) | 购买语音包套餐 |

> 💡 **小提示**：新用户可能有免费试用额度哦～先去控制台看看能不能白嫖吧！😄

### 4. 配置环境变量

```bash
export XFEI_APP_ID="your_app_id"
export XFEI_API_KEY="your_api_key"
export XFEI_API_SECRET="your_api_secret"
```

---

## 使用提示

1. **默认发音人**：未指定 `--vcn` 时使用聆小糖（`x5_lingxiaotang_flow`），女声，中文普通话
2. **精选音色池**：Skill 默认只支持 7 个精选发音人（聆小糖、聆飞瀚、温暖磁性男声、Grant、Lila、天津话、东北话）
3. **语言/方言控制**：通过选择不同发音人(VCN)实现，不支持 `--language`、`--style`、`--emotion` 参数
4. **发音人授权**：非免费发音人需在控制台开通对应权限后才可使用，否则返回 10163
5. **长文本处理**：超过 64KB 的文本建议拆分处理
6. **推荐格式**：推荐使用 `--encoding lame --sample_rate 24000`（MP3 / 24kHz）
7. **购买 & 文档**：开通服务请访问[服务控制台](https://console.xfyun.cn/services/uts)，购买套餐点[这里](https://console.xfyun.cn/sale/buy?wareId=9134&packageId=9134001&serviceName=%E8%B6%85%E6%8B%9F%E4%BA%BA%E8%AF%AD%E9%9F%B3%E5%90%88%E6%88%90&businessId=uts)哦～ 🎁
