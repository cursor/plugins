#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
iFlytek Official Document Proofreading (公文校对) — pure Python stdlib, no pip dependencies.

Modified for Cursor marketplace packaging to align the HTTP Host header with the signed endpoint.

Env vars required:
    IFLY_APP_ID       - 讯飞 appId
    IFLY_API_KEY      - apiKey
    IFLY_API_SECRET   - apiSecret

Usage:
    python3 text_proofread.py "要校对的文本内容"
    echo "要校对的文本" | python3 text_proofread.py -
    python3 text_proofread.py --file input.txt
"""
import argparse
import base64
import datetime
import hashlib
import hmac
import json
import os
import sys
import urllib.parse
import urllib.request

API_URL = "https://cn-huadong-1.xf-yun.com/v1/private/s37b42a45"

# Error category ID → description mapping
CATEGORY_MAP = {
    9: "错别字、词",
    31: "多字错误",
    32: "少字错误",
    35: "语义重复",
    34: "语序错误",
    39: "量和单位差错",
    36: "数字差错",
    20: "句式杂糅",
    21: "标点符号差错",
    24: "句子查重",
    119: "重要讲话引用",
    123: "地理名词",
    19: "机构名称",
    124: "专有名词及术语",
    122: "媒体报道禁用词和慎用词",
    6: "常识差错",
    111: "涉低俗辱骂",
    118: "其他敏感内容",
}

# Action ID → label
ACTION_MAP = {
    1: "标记",
    2: "替换",
    4: "删除",
}


# ---------------------------------------------------------------------------
# Auth helpers (ported from official demo, using stdlib only)
# ---------------------------------------------------------------------------

def _format_date_rfc1123():
    """Return current UTC time in RFC 1123 format: 'Mon, 06 Mar 2026 06:50:00 GMT'."""
    now = datetime.datetime.now(datetime.timezone.utc)
    # Weekday and month abbreviations in English
    weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return "{}, {:02d} {} {} {:02d}:{:02d}:{:02d} GMT".format(
        weekdays[now.weekday()], now.day, months[now.month], now.year,
        now.hour, now.minute, now.second
    )


def _parse_url(url):
    """Extract host, path, schema from URL."""
    idx = url.index("://")
    schema = url[:idx + 3]
    rest = url[idx + 3:]
    slash = rest.index("/")
    host = rest[:slash]
    path = rest[slash:]
    return host, path, schema


def _build_auth_url(url, api_key, api_secret):
    """Build the authenticated request URL with HMAC-SHA256 signature."""
    host, path, schema = _parse_url(url)
    date = _format_date_rfc1123()

    # signature_origin = "host: {host}\ndate: {date}\nPOST {path} HTTP/1.1"
    signature_origin = "host: {}\ndate: {}\nPOST {} HTTP/1.1".format(host, date, path)

    # HMAC-SHA256
    signature_sha = hmac.new(
        api_secret.encode("utf-8"),
        signature_origin.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    signature = base64.b64encode(signature_sha).decode("utf-8")

    # authorization_origin
    authorization_origin = (
        'api_key="{}", algorithm="hmac-sha256", headers="host date request-line", signature="{}"'
        .format(api_key, signature)
    )
    authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode("utf-8")

    params = {
        "host": host,
        "date": date,
        "authorization": authorization,
    }
    return url + "?" + urllib.parse.urlencode(params)


# ---------------------------------------------------------------------------
# Request body & HTTP call
# ---------------------------------------------------------------------------

def _build_body(app_id, text):
    """Build the JSON request body per API spec."""
    return {
        "header": {
            "app_id": app_id,
            "status": 3,
        },
        "parameter": {
            "midu_correct": {
                "output_result": {
                    "encoding": "utf8",
                    "compress": "raw",
                    "format": "json",
                }
            }
        },
        "payload": {
            "text": {
                "encoding": "utf8",
                "compress": "raw",
                "format": "plain",
                "status": 3,
                "text": base64.b64encode(text.encode("utf-8")).decode("utf-8"),
            }
        },
    }


def _http_post(url, body_dict, app_id, timeout=60):
    data = json.dumps(body_dict).encode("utf-8")
    host, _, _ = _parse_url(url)
    headers = {
        "Content-Type": "application/json",
        "host": host,
        "app_id": app_id,
    }
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---------------------------------------------------------------------------
# Result parsing
# ---------------------------------------------------------------------------

def _parse_result(api_response):
    """Parse the API response, decode base64 text field, return structured result."""
    header = api_response.get("header", {})
    code = header.get("code", -1)
    message = header.get("message", "")

    if code != 0:
        return {"error": True, "code": code, "message": message}

    payload = api_response.get("payload", {})
    output = payload.get("output_result", {})
    text_b64 = output.get("text", "")

    if not text_b64:
        return {"error": True, "code": -1, "message": "No output_result.text in response"}

    decoded = base64.b64decode(text_b64).decode("utf-8")
    result = json.loads(decoded)
    return result


def _format_output(result, raw=False, context_chars=0):
    """Format parsed result for human-readable output."""
    if raw:
        return json.dumps(result, ensure_ascii=False, indent=2)

    if result.get("error"):
        return "Error: code={}, message={}".format(result.get("code"), result.get("message"))

    code = result.get("code", -1)
    if code != 200:
        return "Service error: code={}, msg={}".format(code, result.get("msg", ""))

    data = result.get("data", {})
    checklist = data.get("checklist", [])

    if not checklist:
        return "✅ 无错误 — 文本校对通过"

    lines = ["🔍 发现 {} 处问题：".format(len(checklist)), ""]

    for i, item in enumerate(checklist, 1):
        word = item.get("word", "")
        explanation = item.get("explanation", "")
        context = item.get("context", "")
        position = item.get("position", "")
        length = item.get("length", "")
        suggests = item.get("suggest", [])

        type_info = item.get("type", {})
        type_name = type_info.get("name", "")
        belong_id = type_info.get("belongId", 0)
        category = CATEGORY_MAP.get(belong_id, type_info.get("desc", ""))

        action_info = item.get("action", {})
        action_id = action_info.get("id", 0)
        action_label = ACTION_MAP.get(action_id, str(action_id))

        lines.append("{}. 「{}」".format(i, word))
        if category:
            lines.append("   分类: {} ({})".format(category, type_name))
        if explanation:
            lines.append("   说明: {}".format(explanation))
        if context:
            lines.append("   上下文: {}".format(context))
        lines.append("   位置: {} (长度 {})".format(position, length))
        lines.append("   动作: {}".format(action_label))
        if suggests:
            lines.append("   建议: {}".format(" / ".join(suggests)))
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="iFlytek Official Document Proofreading (公文校对)"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("text", nargs="?", default=None,
                       help="Text to proofread (use '-' to read from stdin)")
    group.add_argument("--file", "-f", default=None,
                       help="Read text from a file")

    parser.add_argument("--raw", action="store_true",
                        help="Output raw JSON response (decoded)")
    args = parser.parse_args()

    # --- credentials ---
    app_id = os.environ.get("IFLY_APP_ID", "")
    api_key = os.environ.get("IFLY_API_KEY", "")
    api_secret = os.environ.get("IFLY_API_SECRET", "")

    if not all([app_id, api_key, api_secret]):
        print("Error: Set IFLY_APP_ID, IFLY_API_KEY, and IFLY_API_SECRET env vars.",
              file=sys.stderr)
        sys.exit(1)

    # --- get text ---
    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            text = f.read()
    elif args.text == "-":
        text = sys.stdin.read()
    else:
        text = args.text

    if not text or not text.strip():
        print("Error: No text provided.", file=sys.stderr)
        sys.exit(1)

    # Limit check (220000 chars)
    if len(text) > 220000:
        print("Warning: Text length ({}) exceeds 220000 char limit, truncating.".format(len(text)),
              file=sys.stderr)
        text = text[:220000]

    # --- call API ---
    auth_url = _build_auth_url(API_URL, api_key, api_secret)
    body = _build_body(app_id, text)
    response = _http_post(auth_url, body, app_id)

    # --- parse & output ---
    result = _parse_result(response)
    print(_format_output(result, raw=args.raw))


if __name__ == "__main__":
    main()
