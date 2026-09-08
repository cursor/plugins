#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
iFlytek LLM OCR Client
OCR images using iFlytek LLM OCR API (HMAC-SHA256 authentication)

Modified for Cursor marketplace packaging to correct HMAC host parsing.
"""

import argparse
import base64
import hashlib
import hmac
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests


class IflyImageOCRClient:
    """Client for iFlytek LLM OCR service."""

    API_HOST = "https://cbm01.cn-huabei-1.xf-yun.com/v1/private/se75ocrbm"

    def __init__(self, app_id: str, api_key: str, api_secret: str):
        self.app_id = app_id
        self.api_key = api_key
        self.api_secret = api_secret

    def _generate_auth_url(self) -> str:
        """
        Generate authenticated URL using HMAC-SHA256.

        Algorithm:
        1. Create signature_origin: "host: {host}\\ndate: {date}\\nPOST {path} HTTP/1.1"
        2. signature = HMAC-SHA256(signature_origin, apiSecret)
        3. authorization = hmac username="{apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature}"
        4. Encode authorization in base64
        5. Final URL: {host}?authorization={auth_base64}&host={host}&date={date}

        Returns:
            Authenticated URL
        """
        from urllib.parse import urlencode, urlparse

        # Parse host and path
        parsed_url = urlparse(self.API_HOST)
        host = parsed_url.netloc
        path = parsed_url.path

        # Generate date in RFC1123 format
        date = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")

        # Build signature origin
        signature_origin = f"host: {host}\ndate: {date}\nPOST {path} HTTP/1.1"

        # Generate HMAC-SHA256 signature
        mac = hmac.new(
            self.api_secret.encode('utf-8'),
            signature_origin.encode('utf-8'),
            hashlib.sha256
        ).digest()
        signature = base64.b64encode(mac).decode('utf-8')

        # Build authorization string
        authorization = f'hmac username="{self.api_key}", algorithm="hmac-sha256", headers="host date request-line", signature="{signature}"'
        authorization_base64 = base64.b64encode(authorization.encode('utf-8')).decode('utf-8')

        # Build final URL with query parameters
        params = {
            'authorization': authorization_base64,
            'host': host,
            'date': date
        }

        return f"{self.API_HOST}?{urlencode(params)}"

    def ocr(self, image_path: str, result_format: str = "json,markdown") -> dict:
        """
        Perform OCR on an image file.

        Args:
            image_path: Path to image file
            result_format: Output format - "json", "markdown", or "json,markdown"

        Returns:
            OCR result with text
        """
        # Read and encode image
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        file_type = Path(image_path).suffix.lstrip('.')

        # Build request JSON
        request_data = {
            "header": {
                "app_id": self.app_id,
                "uid": "12345",
                "did": "iocr",
                "net_type": "wifi",
                "net_isp": "CMCC",
                "status": 0,
                "request_id": None,
                "res_id": ""
            },
            "parameter": {
                "ocr": {
                    "result_option": "normal",
                    "result_format": result_format,
                    "output_type": "one_shot",
                    "exif_option": "1",
                    "json_element_option": "",
                    "markdown_element_option": "watermark=1,page_header=1,page_footer=1,page_number=1,graph=1",
                    "sed_element_option": "watermark=0,page_header=0,page_footer=0,page_number=0,graph=0",
                    "alpha_option": "0",
                    "rotation_min_angle": 5,
                    "result": {
                        "encoding": "utf8",
                        "compress": "raw",
                        "format": "plain"
                    }
                }
            },
            "payload": {
                "image": {
                    "encoding": file_type,
                    "image": image_base64,
                    "status": 0,
                    "seq": 0
                }
            }
        }

        # Generate authenticated URL
        auth_url = self._generate_auth_url()

        # Send request
        response = requests.post(
            auth_url,
            json=request_data,
            headers={"Content-Type": "application/json"},
            timeout=60
        )

        result = response.json()

        # Check for errors
        header = result.get('header', {})
        if header.get('code') != 0:
            raise Exception(f"OCR failed: [code={header.get('code')}] {header.get('message')}")

        # Decode base64 text result
        encoded_text = result.get('payload', {}).get('result', {}).get('text', '')
        if encoded_text:
            text = base64.b64decode(encoded_text).decode('utf-8')
        else:
            text = ""

        return {
            'text': text,
            'full_response': result
        }


def clean_env_value(value: str) -> str:
    """
    Clean environment variable value by removing problematic quotes.

    Handles:
    - Chinese full-width quotes (" " ' ')
    - English half-width quotes (" " ' ')
    - Leading/trailing whitespace
    """
    if not value:
        return value

    # Strip whitespace
    value = value.strip()

    # Remove full-width Chinese quotes (U+201C, U+201D, U+2018, U+2019)
    value = value.strip('\u201c').strip('\u201d').strip('\u2018').strip('\u2019')

    # Remove half-width English quotes
    value = value.strip('"').strip("'")

    return value


def load_config():
    """Load API credentials from environment variables."""
    app_id = os.getenv("IFLY_APP_ID")
    api_key = os.getenv("IFLY_API_KEY")
    api_secret = os.getenv("IFLY_API_SECRET")

    if not all([app_id, api_key, api_secret]):
        print("Error: Missing credentials. Set environment variables:", file=sys.stderr)
        print("  IFLY_APP_ID", file=sys.stderr)
        print("  IFLY_API_KEY", file=sys.stderr)
        print("  IFLY_API_SECRET", file=sys.stderr)
        sys.exit(1)

    # Clean values to remove problematic quotes
    app_id = clean_env_value(app_id)
    api_key = clean_env_value(api_key)
    api_secret = clean_env_value(api_secret)

    return app_id, api_key, api_secret


def main():
    parser = argparse.ArgumentParser(
        description="OCR images using iFlytek LLM OCR API"
    )
    parser.add_argument("image_path", help="Path to image file")
    parser.add_argument("--format", choices=["json", "markdown", "json,markdown"],
                        default="json,markdown", help="Output format (default: json,markdown)")
    parser.add_argument("--output", "-o", help="Save result to file")

    args = parser.parse_args()

    # Load credentials
    app_id, api_key, api_secret = load_config()

    # Check image file
    image_path = Path(args.image_path)
    if not image_path.exists():
        print(f"Error: Image not found: {image_path}", file=sys.stderr)
        sys.exit(1)

    try:
        # Create client
        client = IflyImageOCRClient(app_id, api_key, api_secret)

        # Perform OCR
        print(f"[1/1] Performing OCR on: {image_path.name}")
        result = client.ocr(str(image_path), args.format)

        print(f"  ✅ Completed!")
        print(f"\n{'='*60}")
        print("OCR Result:")
        print(f"{'='*60}")
        print(result['text'])

        # Save to file if requested
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(result['text'])
            print(f"\nResult saved to: {args.output}")

        print(f"{'='*60}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
