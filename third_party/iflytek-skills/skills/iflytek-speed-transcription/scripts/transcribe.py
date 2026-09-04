#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Xfei Speed Transcription API Client
Ultra-fast speech transcription: 1 hour audio in ~20 seconds

Modified for Cursor marketplace packaging to correct request digests,
multipart chunk boundaries, and task-query CLI guidance.
"""

import argparse
import base64
import datetime
import hashlib
import hmac
import json
import math
import os
import sys
import time
from pathlib import Path
from time import mktime
from urllib.parse import urlparse
from wsgiref.handlers import format_date_time

import requests
from urllib3 import encode_multipart_formdata


# 错误码友好提示字典
ERROR_MESSAGES = {
    10107: (
        "哎呀呀~ (◎_◎) 看起来 encoding 参数设置不太对呢！\n"
        "请检查一下 encoding 的传值是否规范哦～\n"
        "tips: 如果您使用的是 MP3 文件，encoding 应该填 'lame' 呢 (๑•̀ㅂ•́)و✧\n\n"
        "📖 详细文档请查看：https://console.xfyun.cn/services/ost"
    ),
    10303: (
        "嗨嗨～ (°∀°)ﾉ 有一个小问题发现啦！\n"
        "请检查一下传参值是否有误呢～\n"
        "可以对照文档看看参数格式有没有写对哟 ヽ(✿ﾟ▽ﾟ)ノ\n\n"
        "📖 详细文档请查看：https://console.xfyun.cn/services/ost"
    ),
    10043: (
        "嗯嗯？(⊙_⊙) 音频解码好像出了点问题... \n"
        "请检查所传的音频是否与 encoding 字段描述的编码格式对应呢！\n"
        "常见问题：确保音频格式是 MP3，encoding 填写 'lame' 就好啦～ (◕‿◕)\n\n"
        "📖 详细文档请查看：https://console.xfyun.cn/services/ost"
    ),
    20304: (
        "嘿呀～ (｡•́︿•̀｡) 音频格式不太对哦！\n"
        "请检查一下音频是否为 16kHz、16bit、单声道音频呢～\n"
        "如果不确定的话，可以用音频转换工具处理一下哟 ( ˘ ³˘)♥\n\n"
        "📖 详细文档请查看：https://console.xfyun.cn/services/ost"
    ),
}

# 通用错误提示（当遇到未知错误时）
GENERIC_ERROR_HINT = (
    "\n\n💡 小提示：\n"
    "📖 接口文档：https://console.xfyun.cn/services/ost\n"
    "💰 购买套餐：https://www.xfyun.cn/services/fast_lfasr?target=price"
)


def get_error_message(error_code: int) -> str:
    """根据错误码返回友好的提示信息"""
    error_code = int(error_code)
    if error_code in ERROR_MESSAGES:
        return ERROR_MESSAGES[error_code]
    return None


class XfeiSpeedTranscription:
    """Client for Xfei Ultra-fast Speech Transcription API."""

    def __init__(self, app_id: str, api_key: str, api_secret: str):
        self.app_id = app_id
        self.api_key = api_key
        self.api_secret = api_secret

        # API endpoints
        self.upload_host = "upload-ost-api.xfyun.cn"
        self.api_host = "ost-api.xfyun.cn"

        # File upload endpoints
        self.upload_api = "/file/upload"
        self.mpupload_init = "/file/mpupload/init"
        self.mpupload_upload = "/file/mpupload/upload"
        self.mpupload_complete = "/file/mpupload/complete"

        # Task endpoints
        self.task_create_uri = "/v2/ost/pro_create"
        self.task_query_uri = "/v2/ost/query"

        # Chunk size for multipart upload (5MB)
        self.chunk_size = 5242880

    def _generate_request_id(self) -> str:
        """Generate unique request ID."""
        return time.strftime("%Y%m%d%H%M%S")

    def _hashlib_256(self, data) -> str:
        """Generate SHA-256 hash for digest."""
        if isinstance(data, str):
            data = data.encode('utf-8')
        m = hashlib.sha256(data).digest()
        return "SHA-256=" + base64.b64encode(m).decode(encoding='utf-8')

    def _assemble_auth_header(
        self,
        requset_url: str,
        file_data_type: str,
        method: str = "POST",
        body: str = ""
    ) -> dict:
        """Assemble authentication headers."""
        u = urlparse(requset_url)
        host = u.hostname
        path = u.path

        now = datetime.datetime.now()
        date = format_date_time(mktime(now.timetuple()))

        digest = self._hashlib_256(body)
        signature_origin = f"host: {host}\ndate: {date}\n{method} {path} HTTP/1.1\ndigest: {digest}"

        signature_sha = hmac.new(
            self.api_secret.encode('utf-8'),
            signature_origin.encode('utf-8'),
            digestmod=hashlib.sha256
        ).digest()
        signature_sha = base64.b64encode(signature_sha).decode(encoding='utf-8')

        authorization = (
            "api_key=" + '"' + self.api_key + '", algorithm="hmac-sha256", '
            'headers="host date request-line digest", signature="' + signature_sha + '"'
        )

        return {
            "host": host,
            "date": date,
            "authorization": authorization,
            "digest": digest,
            'content-type': file_data_type,
        }

    def _call_api(self, url: str, file_data, file_data_type: str) -> dict:
        """Make API request."""
        headers = self._assemble_auth_header(
            url, file_data_type, method="POST", body=file_data
        )

        try:
            resp = requests.post(url, headers=headers, data=file_data, timeout=60)
            return resp.json()
        except Exception as e:
            raise Exception(f"API call failed: {e}")

    def upload_small_file(self, file_path: Path) -> str:
        """Upload small file (< 30MB) directly."""
        url = f"https://{self.upload_host}{self.upload_api}"
        request_id = self._generate_request_id()

        with open(file_path, 'rb') as f:
            file = {
                "data": (str(file_path), f.read()),
                "app_id": self.app_id,
                "request_id": request_id,
            }

        encode_data = encode_multipart_formdata(file)
        file_data = encode_data[0]
        file_data_type = encode_data[1]

        result = self._call_api(url, file_data, file_data_type)

        if result.get('code') != 0:
            raise Exception(f"Upload failed: {result.get('message', 'Unknown error')}")

        return result['data']['url']

    def upload_large_file(self, file_path: Path) -> str:
        """Upload large file (>= 30MB) using multipart upload."""
        url_init = f"https://{self.upload_host}{self.mpupload_init}"
        url_upload = f"https://{self.upload_host}{self.mpupload_upload}"
        url_complete = f"https://{self.upload_host}{self.mpupload_complete}"

        request_id = self._generate_request_id()
        file_size = file_path.stat().st_size
        chunks = math.ceil(file_size / self.chunk_size)

        print(f"  Large file detected ({file_size / 1024 / 1024:.1f}MB)")
        print(f"  Using multipart upload ({chunks} chunks)")

        # Initialize multipart upload
        init_data = {
            "app_id": self.app_id,
            "request_id": request_id,
        }

        init_result = self._call_api(
            url_init,
            json.dumps(init_data),
            'application/json'
        )

        if init_result.get('code') != 0:
            raise Exception(f"Init failed: {init_result.get('message')}")

        upload_id = init_result['data']['upload_id']

        # Upload chunks
        with open(file_path, 'rb') as f:
            for slice_id in range(1, chunks + 1):
                current_size = min(self.chunk_size, file_size - f.tell())
                chunk_data = f.read(current_size)

                file = {
                    "data": (str(file_path), chunk_data),
                    "app_id": self.app_id,
                    "request_id": request_id,
                    "upload_id": upload_id,
                    "slice_id": slice_id,
                }

                encode_data = encode_multipart_formdata(file)
                file_data = encode_data[0]
                file_data_type = encode_data[1]

                print(f"  Uploading chunk {slice_id}/{chunks}...", end=' ')
                result = self._call_api(url_upload, file_data, file_data_type)

                if result.get('code') != 0:
                    raise Exception(f"Chunk {slice_id} failed: {result.get('message')}")

                print("OK")

        # Complete multipart upload
        complete_data = {
            "app_id": self.app_id,
            "request_id": request_id,
            "upload_id": upload_id,
        }

        complete_result = self._call_api(
            url_complete,
            json.dumps(complete_data),
            'application/json'
        )

        if complete_result.get('code') != 0:
            raise Exception(f"Complete failed: {complete_result.get('message')}")

        return complete_result['data']['url']

    def create_task(
        self,
        audio_url: str,
        file_path: Path = None,
        language: str = "zh_cn",
        accent: str = "mandarin",
        domain: str = "pro_ost_ed",
        callback_url: str = None,
        vspp_on: int = None,
        speaker_num: int = None,
        output_type: int = None,
        postproc_on: int = None,
        pd: str = None,
        enable_subtitle: int = None,
        smoothproc: bool = None,
        colloqproc: bool = None,
        language_type: int = None,
        vto: int = None,
        dhw: str = None,
    ) -> str:
        """Create transcription task."""
        url = f"https://{self.api_host}{self.task_create_uri}"
        request_id = self._generate_request_id()

        # Build request body
        business = {
            "request_id": request_id,
            "language": language,
            "accent": accent,
            "domain": domain,
        }

        # Optional parameters
        if callback_url:
            business["callback_url"] = callback_url
        if vspp_on is not None:
            business["vspp_on"] = vspp_on
        if speaker_num is not None:
            business["speaker_num"] = speaker_num
        if output_type is not None:
            business["output_type"] = output_type
        if postproc_on is not None:
            business["postproc_on"] = postproc_on
        if pd:
            business["pd"] = pd
        if enable_subtitle is not None:
            business["enable_subtitle"] = enable_subtitle
        if smoothproc is not None:
            business["smoothproc"] = smoothproc
        if colloqproc is not None:
            business["colloqproc"] = colloqproc
        if language_type is not None:
            business["language_type"] = language_type
        if vto is not None:
            business["vto"] = vto
        if dhw:
            business["dhw"] = dhw

        # MP3 encoding for transcription
        encoding = "lame"

        post_data = {
            "common": {"app_id": self.app_id},
            "business": business,
            "data": {
                "audio_url": audio_url,
                "audio_src": "http",
                "format": "audio/mp3",
                "encoding": encoding
            }
        }

        body = json.dumps(post_data)
        headers = self._assemble_auth_header(url, 'application/json', method="POST", body=body)
        headers["Content-Type"] = "application/json"

        try:
            response = requests.post(url, data=body, headers=headers, timeout=60)
            result = response.json()

            if result.get('code') != 0:
                error_code = result.get('code')
                friendly_msg = get_error_message(error_code)
                if friendly_msg:
                    raise Exception(f"错误码 {error_code}：\n{friendly_msg}\n\n原始错误：{result.get('message', 'Unknown error')}")
                else:
                    raise Exception(f"Create task failed: {result.get('message', 'Unknown error')}{GENERIC_ERROR_HINT}")

            return result['data']['task_id']

        except Exception as e:
            raise Exception(f"Create task failed: {e}")

    def query_task(self, task_id: str) -> dict:
        """Query task status and results."""
        url = f"https://{self.api_host}{self.task_query_uri}"

        post_data = {
            "common": {"app_id": self.app_id},
            "business": {
                "task_id": task_id,
            },
        }

        body = json.dumps(post_data)
        headers = self._assemble_auth_header(url, 'application/json', method="POST", body=body)
        headers["Content-Type"] = "application/json"

        try:
            response = requests.post(url, data=body, headers=headers, timeout=60)
            result = response.json()

            if result.get('code') != 0:
                error_code = result.get('code')
                friendly_msg = get_error_message(error_code)
                if friendly_msg:
                    raise Exception(f"错误码 {error_code}：\n{friendly_msg}\n\n原始错误：{result.get('message', 'Unknown error')}")
                else:
                    raise Exception(f"Query failed: {result.get('message', 'Unknown error')}{GENERIC_ERROR_HINT}")

            return result

        except Exception as e:
            raise Exception(f"Query failed: {e}")

    def transcribe(
        self,
        file_path: Path,
        poll: bool = True,
        poll_interval: int = 5,
        **kwargs
    ) -> dict:
        """Complete transcription workflow."""
        # 检查文件格式，只支持 MP3
        ext = file_path.suffix.lower()
        if ext != '.mp3':
            raise Exception(
                "抱歉啦 o(TヘTo) 目前只支持 MP3 格式的音频文件哦！\n"
                "请将您的音频转换为 MP3 格式后再试吧～\n"
                "tip: 可以使用ffmpeg等工具转换格式呢 (๑•̀ㅂ•́)و✧"
            )

        file_size = file_path.stat().st_size

        # Upload file
        print(f"[1/3] Uploading audio file ({file_path.name}, {file_size / 1024 / 1024:.2f}MB)...")

        if file_size < 31457280:  # 30MB
            print("  Using direct upload")
            audio_url = self.upload_small_file(file_path)
        else:
            audio_url = self.upload_large_file(file_path)

        print(f"  Upload complete")

        # Create task
        print(f"[2/3] Creating transcription task...")
        task_id = self.create_task(audio_url, file_path=file_path, **kwargs)
        print(f"  Task ID: {task_id}")

        if not poll:
            return {
                "task_id": task_id,
                "audio_url": audio_url
            }

        # Poll for results
        print(f"[3/3] Polling for results...")

        max_attempts = 120  # 10 minutes max
        for attempt in range(max_attempts):
            time.sleep(poll_interval)
            result = self.query_task(task_id)

            task_status = result.get('data', {}).get('task_status')

            if task_status in ['3', '4']:  # Completed
                print(f"  Completed!")
                return self._parse_result(result)
            elif task_status == '-1':  # Failed
                # 尝试从结果中获取错误码
                task_data = result.get('data', {})
                failed_msg = task_data.get('message', '')
                # 尝试提取错误码
                error_code = None
                for code in ERROR_MESSAGES.keys():
                    if str(code) in failed_msg or f"code={code}" in failed_msg:
                        error_code = code
                        break

                if error_code:
                    friendly_msg = get_error_message(error_code)
                    raise Exception(f"错误码 {error_code}：\n{friendly_msg}\n\n原始错误：{failed_msg}")
                else:
                    raise Exception(f"Transcription failed: {failed_msg}{GENERIC_ERROR_HINT}")
            elif task_status in ['1', '2']:  # Pending/Processing
                print(f"  Status: {'Processing' if task_status == '2' else 'Pending'}... ({attempt + 1}/{max_attempts})")

        raise Exception(f"Timeout: Task not completed after {max_attempts * poll_interval}s")

    def _parse_result(self, result: dict) -> dict:
        """Parse transcription result from API response."""
        data = result.get('data', {})
        result_obj = data.get('result', {})
        lattice = result_obj.get('lattice', [])

        # Extract text
        full_text = []
        segments = []

        for item in lattice:
            begin = item.get('begin', '0')
            end = item.get('end', '0')
            spk = item.get('spk', 'speaker-0')

            json_1best = item.get('json_1best', {})
            st = json_1best.get('st', {})
            rt_list = st.get('rt', [])

            segment_text = ""
            for rt in rt_list:
                for ws in rt.get('ws', []):
                    for cw in ws.get('cw', []):
                        w = cw.get('w', '')
                        wp = cw.get('wp', 'n')
                        if wp != 'g':  # Skip segment markers
                            segment_text += w

            if segment_text:
                full_text.append(segment_text)
                segments.append({
                    "speaker": spk,
                    "begin": begin,
                    "end": end,
                    "text": segment_text
                })

        return {
            "task_id": data.get('task_id'),
            "task_status": data.get('task_status'),
            "text": "".join(full_text),
            "segments": segments,
            "raw": result
        }


def load_config():
    """Load API credentials from environment variables."""
    app_id = os.getenv("XFEI_APP_ID")
    api_key = os.getenv("XFEI_API_KEY")
    api_secret = os.getenv("XFEI_API_SECRET")

    if not all([app_id, api_key, api_secret]):
        print("Error: Missing credentials. Set environment variables:", file=sys.stderr)
        print("  XFEI_APP_ID", file=sys.stderr)
        print("  XFEI_API_KEY", file=sys.stderr)
        print("  XFEI_API_SECRET", file=sys.stderr)
        sys.exit(1)

    return app_id, api_key, api_secret


def main():
    parser = argparse.ArgumentParser(
        description="Transcribe audio files using Xfei Ultra-fast Speech Transcription API"
    )
    parser.add_argument("file_path", nargs="?", help="Path to audio file")
    parser.add_argument("--task-id", help="Query an existing transcription task")
    parser.add_argument("--language", default="zh_cn",
                        help="Language (default: zh_cn for Chinese/English/202 dialects)")
    parser.add_argument("--accent", default="mandarin",
                        help="Accent (default: mandarin)")
    parser.add_argument("--pd", help="Domain: court, finance, medical, tech, etc.")
    parser.add_argument("--vspp-on", type=int, choices=[0, 1],
                        help="Enable speaker separation (0=off, 1=on)")
    parser.add_argument("--speaker-num", type=int,
                        help="Number of speakers (0=auto)")
    parser.add_argument("--no-poll", action="store_true",
                        help="Return task ID without polling")
    parser.add_argument("--poll-interval", type=int, default=5,
                        help="Polling interval in seconds (default: 5)")
    parser.add_argument("--output", "-o", help="Output file for transcription text")
    parser.add_argument("--output-format", choices=["text", "json"], default="text",
                        help="Output format (default: text)")

    args = parser.parse_args()

    # Load credentials
    app_id, api_key, api_secret = load_config()

    # Create client
    client = XfeiSpeedTranscription(app_id, api_key, api_secret)

    if args.task_id:
        try:
            query_result = client.query_task(args.task_id)
            task_status = query_result.get('data', {}).get('task_status')
            if task_status in ['3', '4']:
                parsed_result = client._parse_result(query_result)
                if args.output_format == "json":
                    output = json.dumps(parsed_result, ensure_ascii=False, indent=2)
                else:
                    output = parsed_result.get("text", "")
            elif args.output_format == "json":
                output = json.dumps(query_result, ensure_ascii=False, indent=2)
            else:
                output = f"Task {args.task_id} status: {task_status or 'unknown'}"

            print(output)
            if args.output:
                Path(args.output).write_text(output, encoding='utf-8')
                print(f"\nSaved to: {args.output}")
            return
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)

    if not args.file_path:
        parser.error("file_path is required unless --task-id is provided")

    # Transcribe
    file_path = Path(args.file_path)
    if not file_path.exists():
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    try:
        result = client.transcribe(
            file_path,
            poll=not args.no_poll,
            poll_interval=args.poll_interval,
            language=args.language,
            accent=args.accent,
            pd=args.pd,
            vspp_on=args.vspp_on,
            speaker_num=args.speaker_num if hasattr(args, 'speaker_num') else None,
        )

        if args.no_poll:
            # Just show task ID
            print(f"Task ID: {result['task_id']}")
            print(f"\nTo query results:")
            print(f"  python3 scripts/transcribe.py --task-id {result['task_id']}")
        else:
            # Show transcription
            if args.output_format == "json":
                output = json.dumps(result, ensure_ascii=False, indent=2)
                print(output)
            else:
                text = result.get("text", "")
                print(f"\n{'='*60}")
                print("Transcription Result:")
                print(f"{'='*60}")
                print(text)
                print(f"{'='*60}")

            # Save to file if specified
            if args.output:
                output_path = Path(args.output)
                if args.output_format == "json":
                    output_path.write_text(
                        json.dumps(result, ensure_ascii=False, indent=2),
                        encoding='utf-8'
                    )
                else:
                    output_path.write_text(text, encoding='utf-8')
                print(f"\nSaved to: {args.output}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
