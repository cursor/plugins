#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
iFlytek Machine Translation (机器翻译) — pure Python stdlib, no pip dependencies.

Env vars required:
    XFYUN_APP_ID       - 讯飞 appId
    XFYUN_API_KEY      - apiKey
    XFYUN_API_SECRET   - apiSecret

Usage:
    python3 translate.py "Hello world"
    python3 translate.py -s en -t cn "Hello world"
    echo "你好世界" | python3 translate.py -
"""
import argparse
import base64
import datetime
import hashlib
import hmac
import json
import os
import sys
import urllib.request

HOST = "itrans.xfyun.cn"
REQUEST_URI = "/v2/its"
URL = "https://" + HOST + REQUEST_URI

# Common language codes (subset — full list in API docs)
LANG_ALIASES = {
    "zh": "cn", "chinese": "cn", "中文": "cn",
    "english": "en", "英文": "en", "英语": "en",
    "japanese": "ja", "日文": "ja", "日语": "ja",
    "korean": "ko", "韩文": "ko", "韩语": "ko",
    "french": "fr", "法语": "fr",
    "spanish": "es", "西班牙语": "es",
    "german": "de", "德语": "de",
    "russian": "ru", "俄语": "ru",
    "arabic": "ar", "阿拉伯语": "ar",
    "thai": "th", "泰语": "th",
    "vietnamese": "vi", "越南语": "vi",
    "portuguese": "pt", "葡萄牙语": "pt",
    "italian": "it", "意大利语": "it",
}


# ---------------------------------------------------------------------------
# Auth helpers (ported from official demo, stdlib only)
# ---------------------------------------------------------------------------

def _format_date_rfc1123():
    now = datetime.datetime.now(datetime.timezone.utc)
    weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return "{}, {:02d} {} {} {:02d}:{:02d}:{:02d} GMT".format(
        weekdays[now.weekday()], now.day, months[now.month], now.year,
        now.hour, now.minute, now.second
    )


def _sha256_digest(body_str):
    """SHA-256 digest of the request body, formatted as 'SHA-256=<base64>'."""
    m = hashlib.sha256(body_str.encode("utf-8")).digest()
    return "SHA-256=" + base64.b64encode(m).decode("utf-8")


def _generate_signature(api_secret, date, digest):
    """HMAC-SHA256 signature over host + date + request-line + digest."""
    signature_origin = "host: {}\ndate: {}\nPOST {} HTTP/1.1\ndigest: {}".format(
        HOST, date, REQUEST_URI, digest
    )
    sig = hmac.new(
        api_secret.encode("utf-8"),
        signature_origin.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    return base64.b64encode(sig).decode("utf-8")


def _build_headers(api_key, api_secret, body_str):
    """Build full headers with auth for the translation request."""
    date = _format_date_rfc1123()
    digest = _sha256_digest(body_str)
    signature = _generate_signature(api_secret, date, digest)

    auth_header = (
        'api_key="{}", algorithm="hmac-sha256", '
        'headers="host date request-line digest", '
        'signature="{}"'
    ).format(api_key, signature)

    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Host": HOST,
        "Date": date,
        "Digest": digest,
        "Authorization": auth_header,
    }


# ---------------------------------------------------------------------------
# Request body & HTTP
# ---------------------------------------------------------------------------

def _build_body(app_id, text, from_lang, to_lang):
    body = {
        "common": {"app_id": app_id},
        "business": {
            "from": from_lang,
            "to": to_lang,
        },
        "data": {
            "text": base64.b64encode(text.encode("utf-8")).decode("utf-8"),
        },
    }
    return json.dumps(body)


def _http_post(url, body_str, headers, timeout=30):
    req = urllib.request.Request(
        url, data=body_str.encode("utf-8"), headers=headers, method="POST"
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---------------------------------------------------------------------------
# Result parsing
# ---------------------------------------------------------------------------

def _parse_result(response):
    code = response.get("code", -1)
    if code != 0:
        msg = response.get("message", response.get("desc", "unknown"))
        return None, "Error: code={}, message={}".format(code, msg)

    data = response.get("data", {})
    result = data.get("result", {})

    # trans_result.dst contains the translated text
    trans_result = result.get("trans_result", {})
    dst = trans_result.get("dst", "")
    src = trans_result.get("src", "")

    # from/to language detected
    from_lang = result.get("from", "")
    to_lang = result.get("to", "")

    return {
        "src": src,
        "dst": dst,
        "from": from_lang,
        "to": to_lang,
    }, None


def _format_output(parsed, raw_response, raw=False, verbose=False):
    if raw:
        return json.dumps(raw_response, ensure_ascii=False, indent=2)

    if parsed is None:
        return ""

    if verbose:
        lines = [
            "原文 ({}): {}".format(parsed["from"], parsed["src"]),
            "译文 ({}): {}".format(parsed["to"], parsed["dst"]),
        ]
        return "\n".join(lines)
    else:
        return parsed["dst"]


# ---------------------------------------------------------------------------
# Language normalization
# ---------------------------------------------------------------------------

def _normalize_lang(lang):
    """Normalize language code, supporting aliases."""
    if not lang:
        return lang
    lower = lang.lower().strip()
    return LANG_ALIASES.get(lower, lower)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="iFlytek Machine Translation (机器翻译)"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("text", nargs="?", default=None,
                       help="Text to translate (use '-' to read from stdin)")
    group.add_argument("--file", "-f", default=None,
                       help="Read text from a file")

    parser.add_argument("--from", "-s", dest="from_lang", default="cn",
                        help="Source language code (default: cn). Use 'auto' for auto-detect if supported.")
    parser.add_argument("--to", "-t", dest="to_lang", default="en",
                        help="Target language code (default: en)")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Show source and target language labels")
    parser.add_argument("--raw", action="store_true",
                        help="Output raw JSON response")
    args = parser.parse_args()

    # --- credentials ---
    app_id = os.environ.get("XFYUN_APP_ID", "")
    api_key = os.environ.get("XFYUN_API_KEY", "")
    api_secret = os.environ.get("XFYUN_API_SECRET", "")

    if not all([app_id, api_key, api_secret]):
        print("Error: Set XFYUN_APP_ID, XFYUN_API_KEY, and XFYUN_API_SECRET env vars.",
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

    # --- normalize languages ---
    from_lang = _normalize_lang(args.from_lang)
    to_lang = _normalize_lang(args.to_lang)

    # --- call API ---
    body_str = _build_body(app_id, text, from_lang, to_lang)
    headers = _build_headers(api_key, api_secret, body_str)
    response = _http_post(URL, body_str, headers)

    # --- parse & output ---
    parsed, error = _parse_result(response)
    if error:
        print(error, file=sys.stderr)
        sys.exit(1)

    print(_format_output(parsed, response, raw=args.raw, verbose=args.verbose))


if __name__ == "__main__":
    main()
