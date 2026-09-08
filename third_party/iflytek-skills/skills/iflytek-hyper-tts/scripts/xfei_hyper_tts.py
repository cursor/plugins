#!/usr/bin/env python3
"""
讯飞超拟人语音合成 (iFlytek Hyper TTS)

将文本转换为超拟人语音。
API 文档：https://www.xfyun.cn/doc/spark/super%20smart-tts.html

默认发音人：聆小糖 (x5_lingxiaotang_flow)，女声，中文普通话，最适合作为默认主音色。
官方免费发音人：x5_lingxiaoxuan_flow / x5_lingfeiyi_flow / x5_lingxiaoyue_flow
               x5_lingyuzhao_flow / x5_lingyuyan_flow

环境变量（必须配置）：
  XFEI_APP_ID     - 讯飞应用ID
  XFEI_API_KEY    - 讯飞API Key
  XFEI_API_SECRET - 讯飞API Secret

使用示例：
  python3 scripts/xfei_hyper_tts.py --text "你好" --output hello.mp3
  python3 scripts/xfei_hyper_tts.py --vcn x5_lingfeiyi_flow --text "你好" --output hello.mp3
  python3 scripts/xfei_hyper_tts.py --action list_voices
"""

import argparse
import base64
import hashlib
import hmac
import json
import os
import sys
from datetime import datetime
from urllib.parse import urlencode, urlparse

try:
    import websocket
except ImportError:
    print(
        "Error: 缺少依赖库 websocket-client\n"
        "请运行: pip install websocket-client",
        file=sys.stderr,
    )
    sys.exit(1)


# ─── 常量定义 ────────────────────────────────────────────────────────────────

WS_URL = "wss://cbm01.cn-huabei-1.xf-yun.com/v1/private/mcd9m97e6"
TEXT_MAX_BYTES = 64 * 1024  # 64KB

# 音频格式扩展名映射（仅支持MP3）
ENCODING_EXT = {
    "lame": ".mp3",
}

# 默认发音人（官方免费发音人，无需额外开通）
DEFAULT_VOICE = "x5_lingxiaotang_flow"

# 官方默认免费发音人列表（来自官方文档发音人列表）
FREE_VOICES = [
    {"name": "聆小璇", "vcn": "x5_lingxiaoxuan_flow", "gender": "成年女", "lang": "中文普通话", "default": True},
    {"name": "聆飞逸", "vcn": "x5_lingfeiyi_flow",    "gender": "成年男", "lang": "中文普通话"},
    {"name": "聆小玥", "vcn": "x5_lingxiaoyue_flow",  "gender": "成年女", "lang": "中文普通话"},
    {"name": "聆玉昭", "vcn": "x5_lingyuzhao_flow",   "gender": "成年女", "lang": "中文普通话"},
    {"name": "聆玉言", "vcn": "x5_lingyuyan_flow",    "gender": "成年女", "lang": "中文普通话"},
]

# 完整音色列表（根据接口文档）
VOICE_LIST = [
    # x5系列 (Omni)
    {"name": "聆小糖", "vcn": "x5_lingxiaotang_flow", "gender": "女", "lang": "中文普通话", "scene": "语音助手", "default": True},
    {"name": "聆小玥", "vcn": "x5_lingxiaoyue_flow", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "聆玉昭", "vcn": "x5_lingyuzhao_flow", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "Lila", "vcn": "x5_EnUs_Lila_flow", "gender": "女", "lang": "英文美式", "scene": "交互聊天"},
    {"name": "Grant", "vcn": "x5_EnUs_Grant_flow", "gender": "女", "lang": "英文美式", "scene": "交互聊天"},
    # x6_pro系列
    {"name": "海绵宝宝", "vcn": "x6_huanlemianbao_pro", "gender": "男", "lang": "中文普通话", "scene": "卡通"},
    {"name": "商务殷语", "vcn": "x6_xiangruiyingyu_pro", "gender": "男", "lang": "中文普通话", "scene": "商务"},
    {"name": "温柔男声", "vcn": "x6_taiqiangnuannan_pro", "gender": "男", "lang": "台湾腔", "scene": "客服"},
    {"name": "回访女声", "vcn": "x6_huifangnv_pro", "gender": "女", "lang": "中文普通话", "scene": "客服"},
    {"name": "聆飞文", "vcn": "x6_lingfeiwen_pro", "gender": "男", "lang": "中文普通话", "scene": "情感合成"},
    {"name": "聆小芸", "vcn": "x6_wumeinv_pro", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "聆伯松", "vcn": "x6_lingbosong_pro", "gender": "男", "lang": "中文普通话", "scene": "旁白"},
    {"name": "少女可莉", "vcn": "x6_dudulibao_pro", "gender": "女", "lang": "中文普通话", "scene": "卡通"},
    {"name": "滑稽大妈", "vcn": "x6_huajidama_pro", "gender": "女", "lang": "中文普通话", "scene": "搞笑"},
    {"name": "活泼少年", "vcn": "x6_huoposhaonian_pro", "gender": "男", "lang": "中文普通话", "scene": "卡通"},
    {"name": "聆小雪", "vcn": "x6_lingxiaoxue_pro", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "催收客服", "vcn": "x6_cuishounvsheng_pro", "gender": "女", "lang": "中文普通话", "scene": "客服"},
    {"name": "营销女声", "vcn": "x6_yingxiaonv_pro", "gender": "女", "lang": "中文普通话", "scene": "营销"},
    {"name": "温暖磁性男声", "vcn": "x6_wennuancixingnansheng_mini", "gender": "男", "lang": "中文普通话", "scene": "客服"},
    {"name": "奶狗弟弟", "vcn": "x6_xiaonaigoudidi_mini", "gender": "男", "lang": "中文普通话", "scene": "年轻"},
    {"name": "士兵女声", "vcn": "x6_shibingnvsheng_mini", "gender": "女", "lang": "中文普通话", "scene": "角色"},
    {"name": "恐怖女声", "vcn": "x6_kongbunvsheng_mini", "gender": "女", "lang": "中文普通话", "scene": "恐怖"},
    {"name": "娱乐新闻", "vcn": "x6_yulexinwennvsheng_mini", "gender": "女", "lang": "中文普通话", "scene": "新闻"},
    {"name": "温柔男声", "vcn": "x6_wenrounansheng_mini", "gender": "男", "lang": "中文普通话", "scene": "客服"},
    {"name": "景区导览", "vcn": "x6_jingqudaolannvsheng_mini", "gender": "女", "lang": "中文普通话", "scene": "导览"},
    {"name": "大气宣传片", "vcn": "x6_daqixuanchuanpiannansheng_mini", "gender": "男", "lang": "中文普通话", "scene": "宣传片"},
    {"name": "古风侠女", "vcn": "x6_gufengxianv_mini", "gender": "女", "lang": "中文普通话", "scene": "古风"},
    {"name": "午夜电台", "vcn": "x6_wuyediantai_mini", "gender": "女", "lang": "中文普通话", "scene": "电台"},
    {"name": "贴心男友", "vcn": "x6_tiexinnanyou_mini", "gender": "男", "lang": "中文普通话", "scene": "角色"},
    {"name": "聆小璃", "vcn": "x6_lingxiaoli_pro", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "聆小琪", "vcn": "x6_xiaoqiChat_pro", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "聆飞逸", "vcn": "x6_lingfeiyi_pro", "gender": "男", "lang": "中文普通话", "scene": "情感合成"},
    {"name": "聆飞哲", "vcn": "x6_feizheChat_pro", "gender": "男", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "聆小玥", "vcn": "x6_lingxiaoyue_pro", "gender": "女", "lang": "中文普通话", "scene": "情感合成"},
    {"name": "聆小璇", "vcn": "x6_lingxiaoxuan_pro", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "聆玉言", "vcn": "x6_lingyuyan_pro", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "旁白男声", "vcn": "x6_pangbainan1_pro", "gender": "男", "lang": "中文普通话", "scene": "旁白配音"},
    {"name": "旁白女声", "vcn": "x6_pangbainv1_pro", "gender": "女", "lang": "中文普通话", "scene": "旁白配音"},
    {"name": "聆飞瀚", "vcn": "x6_lingfeihan_pro", "gender": "男", "lang": "中文普通话", "scene": "纪录片旁白"},
    {"name": "聆飞皓", "vcn": "x6_lingfeihao_pro", "gender": "男", "lang": "中文普通话", "scene": "广告"},
    {"name": "古风旁白", "vcn": "x6_gufengpangbai_pro", "gender": "男", "lang": "中文普通话", "scene": "古风旁白"},
    {"name": "聆园儿", "vcn": "x6_lingyuaner_pro", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "干练女性", "vcn": "x6_ganliannvxing_pro", "gender": "女", "lang": "中文普通话", "scene": "职场"},
    {"name": "儒雅大叔", "vcn": "x6_ruyadashu_pro", "gender": "男", "lang": "中文普通话", "scene": "角色"},
    {"name": "聆玉菲", "vcn": "x6_lingyufei_pro", "gender": "女", "lang": "中文普通话", "scene": "时政新闻"},
    {"name": "聆小珊", "vcn": "x6_lingxiaoshan_pro", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "聆小芸", "vcn": "x6_lingxiaoyun_pro", "gender": "女", "lang": "中文普通话", "scene": "情感合成"},
    {"name": "聆佑佑", "vcn": "x6_lingyouyou_pro", "gender": "女", "lang": "中文普通话", "scene": "童声"},
    {"name": "聆小颖", "vcn": "x6_lingxiaoying_pro", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "聆小瑱", "vcn": "x6_lingxiaozhen_pro", "gender": "女", "lang": "中文普通话", "scene": "交互聊天"},
    {"name": "聆飞博", "vcn": "x6_lingfeibo_pro", "gender": "男", "lang": "中文普通话", "scene": "新闻"},
    {"name": "外国大叔", "vcn": "x6_waiguodashu_pro", "gender": "男", "lang": "中文普通话", "scene": "角色"},
    {"name": "高冷男神", "vcn": "x6_gaolengnanshen_pro", "gender": "男", "lang": "中文普通话", "scene": "角色"},
    {"name": "动漫少女", "vcn": "x6_dongmanshaonv_pro", "gender": "女", "lang": "中文普通话", "scene": "动漫角色"},
]



# ─── 鉴权模块 ──────────────────────────────────────────────────────────────

def get_env_credentials() -> tuple:
    """从环境变量加载并验证API凭证"""
    app_id     = os.getenv("XFEI_APP_ID")
    api_key    = os.getenv("XFEI_API_KEY")
    api_secret = os.getenv("XFEI_API_SECRET")

    missing = [
        name for name, val in [
            ("XFEI_APP_ID", app_id),
            ("XFEI_API_KEY", api_key),
            ("XFEI_API_SECRET", api_secret),
        ]
        if not val
    ]

    if missing:
        error_response = {
            "success": False,
            "error": {
                "code": "MISSING_ENV_VARS",
                "message": f"Missing required environment variables: {', '.join(missing)}",
                "cause": "未配置讯飞开放平台环境变量",
                "suggestion": "请在系统环境变量中配置 XFEI_APP_ID, XFEI_API_KEY, XFEI_API_SECRET"
            }
        }
        print(json.dumps(error_response, ensure_ascii=False, indent=2), file=sys.stderr)
        print("\n配置示例:", file=sys.stderr)
        print("  export XFEI_APP_ID=<your_app_id>", file=sys.stderr)
        print("  export XFEI_API_KEY=<your_api_key>", file=sys.stderr)
        print("  export XFEI_API_SECRET=<your_api_secret>", file=sys.stderr)
        sys.exit(1)

    return app_id, api_key, api_secret


# ─── TTS客户端 ───────────────────────────────────────────────────────────────

class XfeiHyperTTSClient:
    """讯飞超拟人语音合成 WebSocket 客户端"""

    def __init__(self, app_id: str, api_key: str, api_secret: str):
        self.app_id     = app_id
        self.api_key    = api_key
        self.api_secret = api_secret

    def _build_auth_url(self) -> str:
        """使用 HMAC-SHA256 签名构建认证URL"""
        parsed = urlparse(WS_URL)
        host   = parsed.netloc
        path   = parsed.path
        date   = datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")

        signature_origin = f"host: {host}\ndate: {date}\nGET {path} HTTP/1.1"

        signature_bytes = hmac.new(
            self.api_secret.encode("utf-8"),
            signature_origin.encode("utf-8"),
            digestmod=hashlib.sha256,
        ).digest()

        signature = base64.b64encode(signature_bytes).decode()

        authorization_origin = (
            "api_key=" + '"' + self.api_key + '", '
            'algorithm="hmac-sha256", '
            'headers="host date request-line", '
            'signature="' + signature + '"'
        )
        authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode()

        query = urlencode({"authorization": authorization, "date": date, "host": host})
        return f"{WS_URL}?{query}"

    def synthesize(
        self,
        text: str,
        output_path: str,
        vcn: str           = "x5_lingxiaotang_flow",  # 默认聆小糖（女声）
        speed: int         = 50,
        volume: int        = 50,
        pitch: int         = 50,
        encoding: str      = "lame",
        sample_rate: int   = 24000,
        role: str          = None,
    ) -> dict:
        """合成语音"""
        # 验证文本长度
        text_bytes = text.encode("utf-8")
        if len(text_bytes) > TEXT_MAX_BYTES:
            error_response = {
                "success": False,
                "error": {
                    "code": "TEXT_TOO_LONG",
                    "message": f"Text too long: {len(text_bytes)} bytes (max {TEXT_MAX_BYTES})",
                    "cause": "文本内容超过API限制（64KB）",
                    "suggestion": "请将文本拆分为多个短文本后分别合成"
                }
            }
            raise ValueError(json.dumps(error_response, ensure_ascii=False, indent=2))

        print(f"[1/3] 连接讯飞超拟人语音合成服务...", file=sys.stderr)
        auth_url = self._build_auth_url()

        # 构建请求消息
        request_msg = {
            "header": {
                "app_id": self.app_id,
                "status": 2,
            },
            "parameter": {
                "tts": {
                    "vcn":    vcn,
                    "speed":  speed,
                    "volume": volume,
                    "pitch":  pitch,
                    "bgs":    0,
                    "reg":    0,
                    "rdn":    0,
                    "rhy":    0,
                    "audio": {
                        "encoding":    encoding,
                        "sample_rate": sample_rate,
                        "channels":    1,
                        "bit_depth":   16,
                        "frame_size":  0,
                    },
                }
            },
            "payload": {
                "text": {
                    "encoding": "utf8",
                    "compress": "raw",
                    "format":   "plain",
                    "status":   2,
                    "seq":      0,
                    "text":     base64.b64encode(text_bytes).decode(),
                }
            },
        }

        # 将 role 参数添加到请求中（部分发音人支持）
        if role:
            tts_params = request_msg["parameter"]["tts"]
            tts_params["role"] = role

        # 获取发音人名称
        voice_name = vcn
        for v in VOICE_LIST:
            if v["vcn"] == vcn:
                voice_name = v.get("name", vcn)
                break

        print(f"[2/3] 合成中: 发音人={voice_name}({vcn})", end="", file=sys.stderr)
        print(f", 文本长度={len(text)}字符", file=sys.stderr)

        audio_chunks: list[bytes] = []

        try:
            ws = websocket.create_connection(auth_url, timeout=30)
        except Exception as exc:
            error_response = {
                "success": False,
                "error": {
                    "code": "CONNECTION_FAILED",
                    "message": f"Failed to connect: {exc}",
                    "cause": "网络连接失败",
                    "suggestion": "请检查网络连接后重试"
                }
            }
            raise ConnectionError(json.dumps(error_response, ensure_ascii=False, indent=2)) from exc

        try:
            ws.send(json.dumps(request_msg, ensure_ascii=False))

            frame_count = 0
            while True:
                raw = ws.recv()
                if not raw:
                    break

                response = json.loads(raw)
                header   = response.get("header", {})
                code     = header.get("code", -1)

                if code != 0:
                    error_msg = header.get("message", "Unknown error")
                    sid = header.get("sid", "N/A")

                    # 常见错误码处理
                    error_info = self._get_error_info(code, error_msg)
                    raise RuntimeError(json.dumps(error_info, ensure_ascii=False, indent=2))

                payload     = response.get("payload", {})
                audio_block = payload.get("audio", {})
                raw_audio   = audio_block.get("audio", "")

                if raw_audio:
                    chunk = base64.b64decode(raw_audio)
                    audio_chunks.append(chunk)
                    frame_count += 1

                if audio_block.get("status") == 2:
                    break

        finally:
            ws.close()

        if not audio_chunks:
            error_response = {
                "success": False,
                "error": {
                    "code": "NO_AUDIO_DATA",
                    "message": "No audio data received from API",
                    "cause": "未收到音频数据",
                    "suggestion": "请检查文本内容是否有效，或稍后重试"
                }
            }
            raise RuntimeError(json.dumps(error_response, ensure_ascii=False, indent=2))

        # 保存音频文件
        print(f"[3/3] 保存音频到: {output_path}", file=sys.stderr)
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        with open(output_path, "wb") as fh:
            for chunk in audio_chunks:
                fh.write(chunk)

        total_bytes = sum(len(c) for c in audio_chunks)
        print(f"       完成! 文件大小: {round(total_bytes / 1024, 2)} KB", file=sys.stderr)

        result = {
            "success": True,
            "output_path":      os.path.abspath(output_path),
            "encoding":         encoding,
            "vcn":              vcn,
            "voice_name":       voice_name,
            "text_length":      len(text),
            "total_size_bytes": total_bytes,
            "total_size_kb":    round(total_bytes / 1024, 2),
            "frames":           len(audio_chunks),
            "parameters_used": {
                "speed":       speed,
                "volume":      volume,
                "pitch":       pitch,
                "sample_rate": sample_rate,
            }
        }

        # 如果使用了 role 参数，添加到结果中
        if role:
            result["role"] = role

        return result

    def _get_error_info(self, code: int, message: str) -> dict:
        """获取错误详情和建议"""
        error_map = {
            10313: {
                "code": "AUTH_ERROR_10313",
                "message": f"API error {code}: {message}",
                "cause": "APP_ID 与 API_KEY 不匹配",
                "suggestion": "请前往讯飞开放平台控制台核对 APP_ID 和 API_KEY 是否正确"
            },
            11200: {
                "code": "SERVICE_NOT_AUTHORIZED_11200",
                "message": f"API error {code}: {message}",
                "cause": "未开通TTS服务或服务已过期",
                "suggestion": "请前往讯飞控制台开通/续费超拟人语音合成服务"
            },
            10009: {
                "code": "INVALID_INPUT_10009",
                "message": f"API error {code}: {message}",
                "cause": "输入数据无效（可能包含特殊字符）",
                "suggestion": "请检查文本内容，避免使用制表符、HTML标签、表情符号"
            },
        }

        if code in error_map:
            return {
                "success": False,
                "error": error_map[code]
            }

        return {
            "success": False,
            "error": {
                "code": f"API_ERROR_{code}",
                "message": f"API error {code}: {message}",
                "cause": "未知错误",
                "suggestion": "请查看讯飞开放平台文档或联系技术支持"
            }
        }


# ─── 辅助函数 ──────────────────────────────────────────────────────────────────

def _resolve_output_path(output: str, encoding: str) -> str:
    """自动添加文件扩展名"""
    ext = ENCODING_EXT.get(encoding, "")
    if ext and "." not in os.path.basename(output):
        return output + ext
    return output


def _read_text_file(path: str) -> str:
    """读取文本文件"""
    if not os.path.exists(path):
        error_response = {
            "success": False,
            "error": {
                "code": "FILE_NOT_FOUND",
                "message": f"Text file not found: {path}",
                "cause": "指定的文本文件不存在",
                "suggestion": "请检查文件路径是否正确"
            }
        }
        print(json.dumps(error_response, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(1)

    with open(path, "r", encoding="utf-8") as fh:
        content = fh.read().strip()

    if not content:
        error_response = {
            "success": False,
            "error": {
                "code": "EMPTY_FILE",
                "message": "Text file is empty",
                "cause": "文本文件内容为空",
                "suggestion": "请在文本文件中添加要合成的内容"
            }
        }
        print(json.dumps(error_response, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(1)

    return content


# ─── 命令行解析 ──────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="xfei_hyper_tts.py",
        description="讯飞超拟人语音合成 - 文本转语音，多属性控制",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
发音人示例（官方免费发音人，无需额外开通）:
  # 默认 - 聆小糖（女声，中文普通话）
  python3 scripts/xfei_hyper_tts.py --text "你好" --output hello.mp3

  # 聆飞逸（成年男，中文普通话）
  python3 scripts/xfei_hyper_tts.py --text "你好" --vcn x5_lingfeiyi_flow

  # 聆小玥（成年女，中文普通话）
  python3 scripts/xfei_hyper_tts.py --text "你好" --vcn x5_lingxiaoyue_flow

音色列表:
  python3 scripts/xfei_hyper_tts.py --action list_voices
        """,
    )

    parser.add_argument(
        "--action", "-a",
        choices=["synthesize", "list_voices"],
        default="synthesize",
        help="操作类型: synthesize(合成) | list_voices(音色列表)",
    )

    # 文本输入（互斥）
    text_group = parser.add_mutually_exclusive_group()
    text_group.add_argument(
        "--text", "-t",
        help="要合成的文本内容",
    )
    text_group.add_argument(
        "--text_file", "-f",
        help="文本文件路径",
    )

    parser.add_argument(
        "--output", "-o",
        default="output.mp3",
        help="输出文件路径 (默认: output.mp3)",
    )

    # 发音人（默认聆小糖，精选音色）
    parser.add_argument(
        "--vcn",
        default="x5_lingxiaotang_flow",
        help="发音人 VCN 代码 (默认: x5_lingxiaotang_flow 聆小糖，女声)",
    )

    # 韵律参数
    parser.add_argument("--speed",  type=int, default=50, metavar="0-100",
                        help="语速: 0=半速, 50=正常, 100=双倍 (默认: 50)")
    parser.add_argument("--volume", type=int, default=50, metavar="0-100",
                        help="音量: 0=静音, 50=正常, 100=双倍 (默认: 50)")
    parser.add_argument("--pitch",  type=int, default=50, metavar="0-100",
                        help="语调: 0=低, 50=正常, 100=高 (默认: 50)")

    # 音频格式（仅支持MP3）
    parser.add_argument(
        "--encoding",
        choices=["lame"],
        default="lame",
        help="音频格式: lame=MP3 (默认: lame)",
    )
    parser.add_argument(
        "--sample_rate",
        type=int,
        choices=[8000, 16000, 24000],
        default=24000,
        help="采样率 (默认: 24000)",
    )

    # 角色参数（部分发音人支持，可能返回10163）
    parser.add_argument(
        "--role",
        help="角色（部分发音人支持）: chat, narration, customer_service",
    )

    return parser


# ─── 主函数 ──────────────────────────────────────────────────────────────────

def main():
    parser = build_parser()
    args   = parser.parse_args()

    # 音色列表（无需凭证）
    if args.action == "list_voices":
        result = {
            "free_voices": FREE_VOICES,
            "all_voices": VOICE_LIST,
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    # 合成语音
    app_id, api_key, api_secret = get_env_credentials()

    # 验证输入
    if not args.text and not args.text_file:
        error_response = {
            "success": False,
            "error": {
                "code": "MISSING_INPUT",
                "message": "--text or --text_file is required",
                "cause": "未提供要合成的文本",
                "suggestion": "请使用 --text 指定文本内容，或使用 --text_file 指定文本文件"
            }
        }
        print(json.dumps(error_response, ensure_ascii=False, indent=2), file=sys.stderr)
        parser.print_help(sys.stderr)
        sys.exit(1)

    text = _read_text_file(args.text_file) if args.text_file else args.text.strip()
    if not text:
        error_response = {
            "success": False,
            "error": {
                "code": "EMPTY_TEXT",
                "message": "Input text is empty",
                "cause": "文本内容为空",
                "suggestion": "请提供要合成的有效文本内容"
            }
        }
        print(json.dumps(error_response, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(1)

    # 验证参数范围
    for name, val in [("speed", args.speed), ("volume", args.volume), ("pitch", args.pitch)]:
        if not 0 <= val <= 100:
            error_response = {
                "success": False,
                "error": {
                    "code": "INVALID_PARAMETER",
                    "message": f"--{name} must be between 0 and 100, got {val}",
                    "cause": f"参数 {name} 超出有效范围",
                    "suggestion": f"请将 --{name} 设置为 0-100 之间的数值"
                }
            }
            print(json.dumps(error_response, ensure_ascii=False, indent=2), file=sys.stderr)
            sys.exit(1)

    output_path = _resolve_output_path(args.output, args.encoding)
    client      = XfeiHyperTTSClient(app_id, api_key, api_secret)

    try:
        result = client.synthesize(
            text         = text,
            output_path  = output_path,
            vcn          = args.vcn,
            speed        = args.speed,
            volume       = args.volume,
            pitch        = args.pitch,
            encoding     = args.encoding,
            sample_rate  = args.sample_rate,
            role         = args.role,
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))

    except KeyboardInterrupt:
        print("\n已中断", file=sys.stderr)
        sys.exit(1)
    except (ConnectionError, RuntimeError, ValueError) as exc:
        print(json.dumps(json.loads(str(exc)), ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        error_response = {
            "success": False,
            "error": {
                "code": "UNEXPECTED_ERROR",
                "message": str(exc),
                "cause": "发生意外错误",
                "suggestion": "请查看错误信息或联系技术支持"
            }
        }
        print(json.dumps(error_response, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
