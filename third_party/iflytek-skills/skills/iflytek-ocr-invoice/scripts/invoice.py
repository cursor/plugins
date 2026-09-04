#!/usr/bin/env python3
"""iFlytek Invoice Recognition API (票据识别) - OCR for invoices/receipts.

Supports: VAT invoices, taxi receipts, train tickets, toll invoices,
medical bills, bank receipts, and more.

Environment variables:
    XFYUN_APP_ID      - Required. App ID from https://console.xfyun.cn
    XFYUN_API_KEY     - Required. API Key
    XFYUN_API_SECRET  - Required. API Secret

Usage:
    python invoice.py <image_path> [--raw]

Examples:
    python invoice.py ./receipt.png
    python invoice.py ./invoice.jpg --raw
"""

import argparse
import base64
import hashlib
import hmac
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime
from time import mktime
from urllib.parse import urlencode, urlparse
from wsgiref.handlers import format_date_time

API_URL = "https://api.xf-yun.com/v1/private/sc45f0684"


def build_auth_url(request_url: str, api_key: str, api_secret: str, method: str = "POST") -> str:
    """Build HMAC-SHA256 signed authentication URL (讯飞鉴权)."""
    url_result = urlparse(request_url)
    date = format_date_time(mktime(datetime.now().timetuple()))

    signature_origin = "host: {}\ndate: {}\n{} {} HTTP/1.1".format(
        url_result.hostname, date, method, url_result.path
    )
    signature_sha = hmac.new(
        api_secret.encode("utf-8"),
        signature_origin.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    signature_sha_b64 = base64.b64encode(signature_sha).decode("utf-8")

    authorization_origin = (
        'api_key="%s", algorithm="%s", headers="%s", signature="%s"'
        % (api_key, "hmac-sha256", "host date request-line", signature_sha_b64)
    )
    authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode("utf-8")

    params = {
        "host": url_result.hostname,
        "date": date,
        "authorization": authorization,
    }
    return request_url + "?" + urlencode(params)


def read_image_base64(image_path: str) -> str:
    """Read an image file and return its base64 encoding."""
    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}", file=sys.stderr)
        sys.exit(1)
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def detect_encoding(image_path: str) -> str:
    """Detect image format from extension."""
    ext = os.path.splitext(image_path)[1].lower()
    mapping = {
        ".png": "png",
        ".jpg": "jpg",
        ".jpeg": "jpg",
        ".bmp": "bmp",
        ".gif": "gif",
        ".tif": "tif",
        ".tiff": "tif",
        ".pdf": "pdf",
    }
    return mapping.get(ext, "jpg")


def recognize_invoice(image_path: str, app_id: str, api_key: str, api_secret: str) -> dict:
    """Call the invoice recognition API."""
    image_b64 = read_image_base64(image_path)
    encoding = detect_encoding(image_path)

    request_data = {
        "header": {
            "app_id": app_id,
            "status": 3,
        },
        "parameter": {
            "image_recognize": {
                "output_text_result": {
                    "encoding": "utf8",
                    "compress": "raw",
                    "format": "plain",
                }
            }
        },
        "payload": {
            "image": {
                "encoding": encoding,
                "image": image_b64,
                "status": 3,
            }
        },
    }

    auth_url = build_auth_url(API_URL, api_key, api_secret)
    url_result = urlparse(API_URL)

    data = json.dumps(request_data).encode("utf-8")
    req = urllib.request.Request(
        auth_url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "host": url_result.hostname,
            "app_id": app_id,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"HTTP {e.code}: {body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Request failed: {e.reason}", file=sys.stderr)
        sys.exit(1)


def extract_result(data: dict) -> str:
    """Extract and decode the OCR result from API response."""
    header = data.get("header", {})
    code = header.get("code")
    if code != 0:
        return f"API Error (code {code}): {header.get('message', json.dumps(data, ensure_ascii=False))}"

    # Extract base64-encoded text result
    try:
        text_result = data["payload"]["output_text_result"]["text"]
        decoded = base64.b64decode(text_result).decode("utf-8")
        # Try to parse as JSON for pretty printing
        try:
            parsed = json.loads(decoded)
            return json.dumps(parsed, ensure_ascii=False, indent=2)
        except json.JSONDecodeError:
            return decoded
    except KeyError:
        return f"Unexpected response structure: {json.dumps(data, ensure_ascii=False)}"


def format_result(parsed_json: str) -> str:
    """Format the parsed OCR result into human-readable text."""
    try:
        data = json.loads(parsed_json)
    except (json.JSONDecodeError, TypeError):
        return parsed_json

    lines = []

    # Handle different response structures
    if isinstance(data, dict):
        invoice_type = data.get("type", data.get("invoice_type", ""))
        if invoice_type:
            lines.append(f"票据类型: {invoice_type}")
            lines.append("")

        # Flatten key-value pairs
        for key, value in data.items():
            if key in ("type", "invoice_type"):
                continue
            if isinstance(value, dict):
                lines.append(f"【{key}】")
                for k, v in value.items():
                    lines.append(f"  {k}: {v}")
            elif isinstance(value, list):
                lines.append(f"【{key}】")
                for i, item in enumerate(value, 1):
                    if isinstance(item, dict):
                        lines.append(f"  #{i}")
                        for k, v in item.items():
                            lines.append(f"    {k}: {v}")
                    else:
                        lines.append(f"  - {item}")
            else:
                lines.append(f"{key}: {value}")

    return "\n".join(lines) if lines else parsed_json


def main():
    parser = argparse.ArgumentParser(description="iFlytek Invoice Recognition (票据识别)")
    parser.add_argument("image", help="Path to invoice/receipt image (png, jpg, bmp, gif, tif, pdf)")
    parser.add_argument("--raw", action="store_true", help="Output raw API JSON response")
    args = parser.parse_args()

    # Read credentials from environment
    app_id = os.environ.get("XFYUN_APP_ID")
    api_key = os.environ.get("XFYUN_API_KEY")
    api_secret = os.environ.get("XFYUN_API_SECRET")

    if not all([app_id, api_key, api_secret]):
        missing = []
        if not app_id:
            missing.append("XFYUN_APP_ID")
        if not api_key:
            missing.append("XFYUN_API_KEY")
        if not api_secret:
            missing.append("XFYUN_API_SECRET")
        print(f"Error: Missing environment variables: {', '.join(missing)}", file=sys.stderr)
        print("Get credentials from https://console.xfyun.cn", file=sys.stderr)
        sys.exit(1)

    result = recognize_invoice(args.image, app_id, api_key, api_secret)

    if args.raw:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        extracted = extract_result(result)
        formatted = format_result(extracted)
        print(formatted)


if __name__ == "__main__":
    main()
