#!/usr/bin/env python3
"""
iFlytek Video Translation API (讯飞视频翻译)

Provides video translation services using iFlytek's API.
Supports creating translation tasks, listing tasks, and getting task details.

Usage:
  # Create a video translation task
  python3 scripts/xfei_video_translate.py --action create_task --file_url "https://example.com/video.mp4" --src_lang en --dest_lang zh

  # List all tasks
  python3 scripts/xfei_video_translate.py --action list_tasks

  # Get task details
  python3 scripts/xfei_video_translate.py --action get_task --task_id "xxx-xxx-xxx"
"""

import argparse
import base64
import datetime
import hashlib
import hmac
import json
import os
import sys
from urllib.parse import urlparse

try:
    import requests
except ImportError:
    print(
        "Error: requests library is required.\n"
        "Install it with: pip install requests",
        file=sys.stderr,
    )
    sys.exit(1)


# ─── Constants ────────────────────────────────────────────────────────────────

API_BASE_URL = "https://spark-openapi.cn-huabei-1.xf-yun.com/api/v1/video-translate"
TIMEOUT = 60


# ─── Authentication ────────────────────────────────────────────────────────────

def _format_date_rfc1123():
    """Format date in RFC 1123 format."""
    now = datetime.datetime.now(datetime.timezone.utc)
    weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return "{}, {:02d} {} {} {:02d}:{:02d}:{:02d} GMT".format(
        weekdays[now.weekday()], now.day, months[now.month], now.year,
        now.hour, now.minute, now.second
    )


def assemble_auth_url(api_base_url: str, api_key: str, api_secret: str, method: str = "GET", path: str = None) -> str:
    """Build authentication URL using HMAC-SHA256 (no digest)."""
    u = urlparse(api_base_url)
    host = u.hostname
    base_path = u.path  # e.g., /api/v1/video-translate

    # Full path includes base path + given path
    signature_path = base_path + (path if path else "/tasks")

    date = _format_date_rfc1123()

    # Build signature without digest
    signature_origin = "host: {}\ndate: {}\n{} {} HTTP/1.1".format(
        host, date, method.upper(), signature_path
    )

    signature_sha = hmac.new(
        api_secret.encode("utf-8"),
        signature_origin.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    signature_sha = base64.b64encode(signature_sha).decode("utf-8")

    # Build authorization
    authorization_origin = 'api_key="{}", algorithm="{}", headers="{}", signature="{}"'.format(
        api_key, "hmac-sha256", "host date request-line", signature_sha
    )
    authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode("utf-8")

    # Build URL with query params - full URL = base_url + path
    from urllib.parse import quote
    full_url = api_base_url + (path if path else "/tasks")
    return "{}?authorization={}&date={}&host={}".format(
        full_url,
        quote(authorization),
        quote(date),
        quote(host)
    )


# ─── Video Translation Client ────────────────────────────────────────────────

class XfeiVideoTranslateClient:
    """iFlytek Video Translation API client."""

    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret

    def _make_request(self, method: str, path: str, body_str: str = "") -> dict:
        """Make API request with URL-based auth."""
        # Build auth URL
        auth_url = assemble_auth_url(API_BASE_URL, self.api_key, self.api_secret, method, path)

        headers = {
            "Content-Type": "application/json",
        }

        print(f"   📡 {method} {path}...", file=sys.stderr)

        try:
            if method == "POST":
                response = requests.post(auth_url, headers=headers, data=body_str.encode("utf-8"), timeout=TIMEOUT)
            else:
                response = requests.get(auth_url, headers=headers, timeout=TIMEOUT)
        except requests.exceptions.ConnectionError as exc:
            raise ConnectionError(f"Failed to connect to API: {exc}") from exc
        except requests.exceptions.Timeout as exc:
            raise ConnectionError(f"Request timeout: {exc}") from exc

        return self._handle_response(response)

    def create_task(
        self,
        file_url: str,
        src_lang: str,
        dest_lang: str,
        task_name: str = None,
    ) -> dict:
        """Create a video translation task (POST /tasks)."""
        request_body = {
            "file_url": file_url,
            "src_lang": src_lang,
            "dest_lang": dest_lang,
        }

        if task_name:
            request_body["task_name"] = task_name

        body_str = json.dumps(request_body, ensure_ascii=False)

        print(f"   📁 视频文件: {file_url[:60]}...", file=sys.stderr)
        print(f"   🌐 翻译方向: {src_lang} ➜ {dest_lang}", file=sys.stderr)
        if task_name:
            print(f"   📝 任务名称: {task_name}", file=sys.stderr)

        return self._make_request("POST", "/tasks", body_str)

    def list_tasks(self) -> dict:
        """List all video translation tasks (GET /tasks)."""
        print(f"   📋 正在获取任务列表...", file=sys.stderr)
        return self._make_request("GET", "/tasks", "")

    def get_task(self, task_id: str) -> dict:
        """Get video translation task details (GET /tasks/:taskId)."""
        print(f"   🔍 正在查询任务: {task_id}", file=sys.stderr)
        return self._make_request("GET", f"/tasks/{task_id}", "")

    def confirm_transcript(self, task_id: str, force_rerun: bool = False) -> dict:
        """Confirm transcript segment, skip manual intervention (POST /tasks/:taskId/segments/transcript/confirm)."""
        print(f"   ⏭️ 正在确认转写文本，跳过人工审核...", file=sys.stderr)
        print(f"   🆔 任务 ID: {task_id}", file=sys.stderr)
        if force_rerun:
            print(f"   🔄 将强制重新执行后续流程", file=sys.stderr)
        path = f"/tasks/{task_id}/segments/transcript/confirm"

        # Build body
        body = {}
        if force_rerun:
            body["force_rerun"] = True
        body_str = json.dumps(body, ensure_ascii=False) if body else "{}"

        return self._make_request("POST", path, body_str)

    def _handle_response(self, response: requests.Response) -> dict:
        """Process API response and handle errors."""
        try:
            data = response.json()
        except json.JSONDecodeError:
            raise RuntimeError(f"Invalid JSON response: {response.text[:200]}")

        if response.status_code != 200:
            code = data.get("code", response.status_code)
            message = data.get("message", "Unknown error")
            request_id = data.get("request_id", "N/A")
            raise RuntimeError(f"API error {code}: {message} (HTTP {response.status_code}, request_id={request_id})")

        code = data.get("code", -1)
        if code != 0:
            message = data.get("message", "Unknown error")
            request_id = data.get("request_id", "N/A")
            raise RuntimeError(f"API error {code}: {message} (request_id={request_id})")

        return data.get("data", {})


# ─── CLI ──────────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="xfei_video_translate.py",
        description="iFlytek Video Translation — translate videos with AI dubbing",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create a video translation task
  python3 scripts/xfei_video_translate.py --action create_task \\
      --file_url "https://example.com/video.mp4" \\
      --src_lang en --dest_lang zh

  # List all tasks
  python3 scripts/xfei_video_translate.py --action list_tasks

  # Get task details
  python3 scripts/xfei_video_translate.py --action get_task \\
      --task_id "xxx-xxx-xxx"
        """,
    )

    parser.add_argument("--action", "-a",
        choices=["create_task", "list_tasks", "get_task", "confirm_transcript"],
        default="create_task", help="Action: create_task | list_tasks | get_task | confirm_transcript")

    # create_task
    parser.add_argument("--file_url", "-u", help="Video file OSS URL (required for create_task)")
    parser.add_argument("--src_lang", "-f", default="en", help="Source language (default: en)")
    parser.add_argument("--dest_lang", "-t", default="zh", help="Target language (default: zh)")
    parser.add_argument("--task_name", "-n", default="视频翻译任务", help="Task name (default: 视频翻译任务)")

    # get_task / confirm_transcript
    parser.add_argument("--task_id", "-i", help="Task ID (required for get_task/confirm_transcript)")

    # confirm_transcript
    parser.add_argument("--force_rerun", action="store_true", help="Force rerun after confirm (optional for confirm_transcript)")

    # output
    parser.add_argument("--json", "-j", action="store_true", help="Output raw JSON")

    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    # Validate
    if args.action == "create_task" and not args.file_url:
        print("Error: --file_url is required for create_task.", file=sys.stderr)
        sys.exit(1)

    if args.action == "get_task" and not args.task_id:
        print("Error: --task_id is required for get_task.", file=sys.stderr)
        sys.exit(1)

    # Get credentials from environment
    api_key = os.getenv("XFYUN_API_KEY")
    api_secret = os.getenv("XFYUN_API_SECRET")

    if not api_key or not api_secret:
        print("Error: XFYUN_API_KEY and XFYUN_API_SECRET environment variables are required.", file=sys.stderr)
        print("  export XFYUN_API_KEY=\"your_api_key\"", file=sys.stderr)
        print("  export XFYUN_API_SECRET=\"your_api_secret\"", file=sys.stderr)
        sys.exit(1)

    client = XfeiVideoTranslateClient(api_key, api_secret)

    try:
        if args.action == "create_task":
            result = client.create_task(
                file_url=args.file_url,
                src_lang=args.src_lang,
                dest_lang=args.dest_lang,
                task_name=args.task_name,
            )
            if args.json:
                print(json.dumps(result, ensure_ascii=False, indent=2))
            else:
                task_id = result.get("task_id", "N/A")
                print(f"Task created: {task_id}", file=sys.stderr)
                print(f"Status: {result.get('status')}", file=sys.stderr)
                print(json.dumps(result, ensure_ascii=False, indent=2))

        elif args.action == "list_tasks":
            result = client.list_tasks()
            if args.json:
                print(json.dumps(result, ensure_ascii=False, indent=2))
            else:
                # Handle both list and dict response
                if isinstance(result, dict):
                    tasks = result.get("tasks", [])
                    total = result.get("total", len(tasks))
                else:
                    tasks = result if isinstance(result, list) else []
                    total = len(tasks)
                print(f"Total tasks: {total} (◕‿◕)", file=sys.stderr)
                for task in tasks:
                    print(f"\nTask ID: {task.get('task_id')}", file=sys.stderr)
                    print(f"Name: {task.get('task_name', 'N/A')}", file=sys.stderr)
                    print(f"Status: {task.get('status')}", file=sys.stderr)
                    print(f"Lang: {task.get('src_lang')} -> {task.get('dest_lang')}", file=sys.stderr)
                    print(f"Created: {task.get('created_at')}", file=sys.stderr)
                print(json.dumps(result, ensure_ascii=False, indent=2))

        elif args.action == "get_task":
            result = client.get_task(args.task_id)
            if args.json:
                print(json.dumps(result, ensure_ascii=False, indent=2))
            else:
                task_id = result.get('task_id', 'N/A')
                task_name = result.get('task_name', '视频翻译任务')
                status = result.get('status', 'N/A')
                print(f"🔍 查询任务详情 (◕‿◕)✨", file=sys.stderr)
                print(f"   🎬 任务名称: {task_name}", file=sys.stderr)
                print(f"   🆔 任务 ID: {task_id}", file=sys.stderr)
                # Status with emoji and hint
                status_info = {
                    "waiting_parsing": ("⏳", "等待解析视频中..."),
                    "running": ("🔄", "正在翻译中..."),
                    "waiting_manual_intervention_segment": ("📝", "需要审核转写文本哦～"),
                    "waiting_manual_intervention_refine": ("📝", "需要审核翻译结果哦～"),
                    "completed": ("✅", "翻译完成！太棒啦！"),
                    "failed": ("❌", "哎呀，任务失败了..."),
                    "cancelled": ("🚫", "任务已取消"),
                }
                emoji, hint = status_info.get(status, ("💭", status))
                print(f"   {emoji} 状态: {status}", file=sys.stderr)
                print(f"      💡 {hint}", file=sys.stderr)
                print(f"   📅 创建时间: {result.get('created_at')}", file=sys.stderr)
                print(f"   ⏰ 更新时间: {result.get('updated_at')}", file=sys.stderr)
                if result.get('task_params'):
                    params = result.get('task_params', {})
                    print(f"   🌐 源语言: {params.get('src_lang', '?')}", file=sys.stderr)
                    print(f"   🌐 目标语言: {params.get('dest_lang', '?')}", file=sys.stderr)
                if result.get('output'):
                    output = result.get('output', {})
                    print(f"   🎥 视频URL: {output.get('output_video_url', 'N/A')[:80]}...", file=sys.stderr)
                    print(f"   📄 字幕URL: {output.get('subtitle_url', 'N/A')[:80]}...", file=sys.stderr)
                print(json.dumps(result, ensure_ascii=False, indent=2))

        elif args.action == "confirm_transcript":
            if not args.task_id:
                print("Error: --task_id is required for confirm_transcript.", file=sys.stderr)
                sys.exit(1)
            result = client.confirm_transcript(args.task_id, args.force_rerun)
            if args.json:
                print(json.dumps(result, ensure_ascii=False, indent=2))
            else:
                print(f"✅ 确认成功！ (◕‿◕)✿", file=sys.stderr)
                print(f"   🆔 任务 ID: {args.task_id}", file=sys.stderr)
                print(f"   💡 已跳过人工审核，任务将继续自动处理～", file=sys.stderr)
                print(json.dumps(result, ensure_ascii=False, indent=2))

    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        sys.exit(1)
    except (ConnectionError, RuntimeError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f"Unexpected error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
