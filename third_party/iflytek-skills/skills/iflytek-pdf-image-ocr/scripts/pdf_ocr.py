#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
iFlytek PDF OCR Client
Recognize PDF documents using iFlytek PDF OCR API (MD5 + HMAC-SHA1 authentication)

Modified for Cursor marketplace packaging to support URL-only PDF OCR requests.
"""

import argparse
import base64
import hashlib
import hmac
import json
import os
import sys
import time
from pathlib import Path

import requests


class IflyPdfOCRClient:
    """Client for iFlytek PDF OCR service."""

    API_BASE = "https://iocr.xfyun.cn/ocrzdq/v1/pdfOcr"

    def __init__(self, app_id: str, api_secret: str):
        self.app_id = app_id
        self.api_secret = api_secret

    def _generate_signature(self, timestamp: int) -> str:
        """
        Generate signature for PDF OCR API (MD5 + HMAC-SHA1).

        Algorithm:
        1. auth = MD5(appId + timestamp)
        2. signature = HMAC-SHA1(auth, apiSecret) encoded in base64

        Args:
            timestamp: Unix timestamp in seconds

        Returns:
            Base64-encoded signature
        """
        # Step 1: MD5(appId + timestamp)
        auth_str = self.app_id + str(timestamp)
        md5_hash = hashlib.md5(auth_str.encode('utf-8')).hexdigest()

        # Step 2: HMAC-SHA1(md5_hash, apiSecret) then base64
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            md5_hash.encode('utf-8'),
            hashlib.sha1
        ).digest()
        signature_b64 = base64.b64encode(signature).decode('utf-8')

        return signature_b64

    def start_task(
        self,
        pdf_path: Path = None,
        pdf_url: str = None,
        export_format: str = "word"
    ) -> dict:
        """
        Start PDF OCR task.

        Args:
            pdf_path: Path to PDF file (optional if pdf_url provided)
            pdf_url: Public URL of PDF file (optional if pdf_path provided)
            export_format: Output format - word, markdown, or json

        Returns:
            Response with taskNo and status
        """
        if not pdf_path and not pdf_url:
            raise ValueError("Either pdf_path or pdf_url must be provided")

        # Current timestamp in seconds
        timestamp = int(time.time())

        # Generate signature
        signature = self._generate_signature(timestamp)

        # Prepare headers
        headers = {
            "appId": self.app_id,
            "timestamp": str(timestamp),
            "signature": signature
        }

        # Prepare multipart form data
        files = None
        data = {}

        if pdf_path:
            with open(pdf_path, 'rb') as f:
                files = {'file': (pdf_path.name, f.read(), 'application/pdf')}
        if pdf_url:
            data['pdfUrl'] = pdf_url

        if export_format:
            data['exportFormat'] = export_format

        url = f"{self.API_BASE}/start"

        response = requests.post(url, headers=headers, data=data, files=files, timeout=60)
        result = response.json()

        if not result.get('flag', False):
            raise Exception(f"Start task failed: [code={result.get('code')}] {result.get('desc', 'Unknown error')}")

        return result

    def query_status(self, task_no: str) -> dict:
        """
        Query PDF OCR task status.

        Note: This endpoint is rate-limited (once per 5 seconds).

        Args:
            task_no: Task number from start_task response

        Returns:
            Task status with download URLs
        """
        # Current timestamp in seconds
        timestamp = int(time.time())

        # Generate signature
        signature = self._generate_signature(timestamp)

        # Prepare headers
        headers = {
            "appId": self.app_id,
            "timestamp": str(timestamp),
            "signature": signature
        }

        url = f"{self.API_BASE}/status"
        params = {'taskNo': task_no}

        response = requests.get(url, headers=headers, params=params, timeout=60)
        result = response.json()

        if not result.get('flag', False):
            raise Exception(f"Query failed: [code={result.get('code')}] {result.get('desc', 'Unknown error')}")

        return result

    def ocr(
        self,
        pdf_path: Path = None,
        pdf_url: str = None,
        export_format: str = "word",
        poll: bool = True,
        poll_interval: int = 5,
        max_wait: int = 300
    ) -> dict:
        """
        Complete PDF OCR workflow: start task and poll for results.

        Args:
            pdf_path: Path to PDF file
            pdf_url: Public URL of PDF file
            export_format: word/markdown/json
            poll: Whether to poll for results
            poll_interval: Polling interval in seconds (min 5)
            max_wait: Maximum wait time in seconds

        Returns:
            OCR result with download URLs
        """
        # Start task
        print(f"[1/2] Starting PDF OCR task...")
        start_result = self.start_task(pdf_path, pdf_url, export_format)

        task_no = start_result['data']['taskNo']
        status = start_result['data']['status']
        print(f"  Task No: {task_no}")
        print(f"  Status: {status}")

        if not poll:
            return start_result

        # Poll for results
        print(f"[2/2] Polling for results...")
        max_attempts = max_wait // poll_interval

        for attempt in range(max_attempts):
            if attempt > 0:
                time.sleep(poll_interval)

            result = self.query_status(task_no)
            data = result.get('data', {})
            status = data.get('status')

            if status == 'FINISH':
                print(f"  ✅ Completed!")
                return result
            elif status == 'FAILED':
                raise Exception(f"Task failed: {data.get('tip', 'Unknown error')}")
            elif status == 'ANY_FAILED':
                print(f"  ⚠️  Partially completed (some pages failed)")
                return result
            elif status in ['DOING', 'WAITING']:
                print(f"  Status: {data.get('tip', status)}... ({attempt + 1}/{max_attempts})")
            else:
                print(f"  Status: {status} ({attempt + 1}/{max_attempts})")

        raise Exception(f"Timeout: Task not completed after {max_wait} seconds")


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
    api_secret = os.getenv("IFLY_API_SECRET")

    if not all([app_id, api_secret]):
        print("Error: Missing credentials. Set environment variables:", file=sys.stderr)
        print("  IFLY_APP_ID", file=sys.stderr)
        print("  IFLY_API_SECRET", file=sys.stderr)
        sys.exit(1)

    # Clean values to remove problematic quotes
    app_id = clean_env_value(app_id)
    api_secret = clean_env_value(api_secret)

    return app_id, api_secret


def print_result(result: dict):
    """Render a PDF OCR status response and any available download URLs."""
    data = result.get('data', {})
    status = data.get('status')
    export_format = data.get('exportFormat')
    down_url = data.get('downUrl')

    print(f"\n{'='*60}")
    print("PDF OCR Result:")
    print(f"{'='*60}")
    print(f"Task No: {data.get('taskNo')}")
    print(f"Status: {status}")
    print(f"Export Format: {export_format}")

    if down_url:
        print(f"\nDownload URL:")
        print(f"  {down_url}")

    page_list = data.get('pageList', [])
    if page_list:
        print(f"\nPages: {len(page_list)}")
        for page in page_list:
            page_num = page.get('pageNum')
            page_status = page.get('status')
            page_down_url = page.get('downUrl')
            print(f"  Page {page_num}: {page_status}")
            if page_down_url:
                print(f"    {page_down_url}")

    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(
        description="OCR PDF documents using iFlytek PDF OCR API"
    )
    parser.add_argument("pdf_path", nargs="?", help="Path to PDF file")
    parser.add_argument("--pdf-url", help="Public URL of PDF (alternative to file upload)")
    parser.add_argument("--task-no", help="Query an existing PDF OCR task")
    parser.add_argument("--format", choices=["word", "markdown", "json"],
                        default="word", help="Output format (default: word)")
    parser.add_argument("--no-poll", action="store_true",
                        help="Return task ID without polling")
    parser.add_argument("--poll-interval", type=int, default=5,
                        help="Polling interval in seconds (min 5, default: 5)")
    parser.add_argument("--max-wait", type=int, default=300,
                        help="Maximum wait time in seconds (default: 300)")

    args = parser.parse_args()

    # Load credentials
    app_id, api_secret = load_config()

    # Create client
    client = IflyPdfOCRClient(app_id, api_secret)

    if args.task_no and (args.pdf_path or args.pdf_url):
        parser.error("--task-no cannot be combined with pdf_path or --pdf-url")
    if not args.task_no and not args.pdf_path and not args.pdf_url:
        parser.error("pdf_path or --pdf-url is required unless --task-no is provided")

    # Check PDF file when a local path is provided
    pdf_path = Path(args.pdf_path) if args.pdf_path else None
    if pdf_path is not None and not pdf_path.exists():
        print(f"Error: PDF not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    try:
        if args.task_no:
            result = client.query_status(args.task_no)
            print_result(result)
            return

        result = client.ocr(
            pdf_path=pdf_path,
            pdf_url=args.pdf_url,
            export_format=args.format,
            poll=not args.no_poll,
            poll_interval=max(args.poll_interval, 5),
            max_wait=args.max_wait
        )

        if args.no_poll:
            # Just show task ID
            print(f"\nTask No: {result['data']['taskNo']}")
            print(f"Status: {result['data']['status']}")
            print(f"\nTo query results:")
            print(f"  python3 scripts/pdf_ocr.py --task-no {result['data']['taskNo']}")
        else:
            print_result(result)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
