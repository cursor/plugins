#!/usr/bin/env python3
"""iFlytek Image Understanding API (图片理解).

Analyze images using iFlytek Spark Vision model. Supports single-turn and
multi-turn conversations about image content.

Environment variables:
    IFLY_APP_ID      - Required. App ID from https://console.xfyun.cn
    IFLY_API_KEY     - Required. API Key
    IFLY_API_SECRET  - Required. API Secret

Usage:
    # Describe an image
    python image_understanding.py photo.jpg

    # Ask a question about an image
    python image_understanding.py photo.jpg --question "图片里有什么动物？"

    # Use basic model (lower token cost)
    python image_understanding.py photo.jpg --domain general

    # Output raw JSON frames
    python image_understanding.py photo.jpg --raw

Examples:
    python image_understanding.py cat.jpg -q "这只猫是什么品种？"
    python image_understanding.py receipt.png -q "总金额是多少？"
    python image_understanding.py scene.jpg --domain general
"""

import argparse
import base64
import hashlib
import hmac
import json
import os
import ssl
import socket
import struct
import sys
from datetime import datetime
from time import mktime
from urllib.parse import urlencode, urlparse
from wsgiref.handlers import format_date_time

WS_URL = "wss://spark-api.cn-huabei-1.xf-yun.com/v2.1/image"
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
MAX_HEADER_SIZE = 64 * 1024
MAX_MESSAGE_SIZE = 16 * 1024 * 1024


class ImageUnderstandingError(RuntimeError):
    """Error returned by the image understanding API."""

    def __init__(self, code, message, sid=None):
        self.code = code
        self.sid = sid
        suffix = f" (sid={sid})" if sid else ""
        super().__init__(f"API error {code}: {message}{suffix}")


def build_auth_url(ws_url: str, api_key: str, api_secret: str) -> str:
    """Build HMAC-SHA256 signed WebSocket URL."""
    url_result = urlparse(ws_url)
    date = format_date_time(mktime(datetime.now().timetuple()))

    signature_origin = "host: {}\ndate: {}\nGET {} HTTP/1.1".format(
        url_result.hostname, date, url_result.path
    )
    signature_sha = hmac.new(
        api_secret.encode("utf-8"),
        signature_origin.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()
    signature_b64 = base64.b64encode(signature_sha).decode("utf-8")

    authorization_origin = (
        'api_key="%s", algorithm="%s", headers="%s", signature="%s"'
        % (api_key, "hmac-sha256", "host date request-line", signature_b64)
    )
    authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode("utf-8")

    params = {
        "authorization": authorization,
        "date": date,
        "host": url_result.hostname,
    }
    return ws_url + "?" + urlencode(params)


def read_image_base64(image_path: str) -> str:
    """Read image file and return base64 string."""
    if not os.path.exists(image_path):
        raise ValueError(f"File not found: {image_path}")
    size = os.path.getsize(image_path)
    if size > 4 * 1024 * 1024:
        raise ValueError(f"Image too large ({size} bytes). Max 4MB.")
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def gen_params(app_id: str, messages: list, domain: str,
               temperature: float, max_tokens: int) -> dict:
    """Generate request parameters."""
    return {
        "header": {
            "app_id": app_id,
        },
        "parameter": {
            "chat": {
                "domain": domain,
                "temperature": temperature,
                "top_k": 4,
                "max_tokens": max_tokens,
                "auditing": "default",
            }
        },
        "payload": {
            "message": {
                "text": messages,
            }
        },
    }


def temperature_value(value: str) -> float:
    """Parse a temperature in the API-supported range (0, 1]."""
    try:
        parsed = float(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("temperature must be a number") from exc
    if not 0 < parsed <= 1:
        raise argparse.ArgumentTypeError("temperature must be in (0, 1]")
    return parsed


def max_tokens_value(value: str) -> int:
    """Parse max_tokens in the API-supported range [1, 8192]."""
    try:
        parsed = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("max-tokens must be an integer") from exc
    if not 1 <= parsed <= 8192:
        raise argparse.ArgumentTypeError("max-tokens must be between 1 and 8192")
    return parsed


# ── Minimal WebSocket client (stdlib only) ──────────────────────────────

def _ws_handshake(sock, host, path_with_query):
    """Perform WebSocket upgrade handshake."""
    import secrets
    key = base64.b64encode(secrets.token_bytes(16)).decode()
    lines = [
        f"GET {path_with_query} HTTP/1.1",
        f"Host: {host}",
        "Upgrade: websocket",
        "Connection: Upgrade",
        f"Sec-WebSocket-Key: {key}",
        "Sec-WebSocket-Version: 13",
        "",
        "",
    ]
    sock.sendall("\r\n".join(lines).encode("utf-8"))

    # Read HTTP response headers
    buf = b""
    while b"\r\n\r\n" not in buf:
        chunk = sock.recv(4096)
        if not chunk:
            raise ConnectionError("WebSocket handshake failed: connection closed")
        buf += chunk
        if len(buf) > MAX_HEADER_SIZE:
            raise ConnectionError("WebSocket handshake headers are too large")

    header_part = buf.split(b"\r\n\r\n")[0].decode("utf-8", errors="replace")
    header_lines = header_part.split("\r\n")
    status_line = header_lines[0]
    status_parts = status_line.split(" ", 2)
    if len(status_parts) < 2 or status_parts[1] != "101":
        raise ConnectionError(f"WebSocket handshake failed: {status_line}")

    response_headers = {}
    for line in header_lines[1:]:
        if ":" not in line:
            continue
        name, value = line.split(":", 1)
        response_headers[name.strip().lower()] = value.strip()

    if response_headers.get("upgrade", "").lower() != "websocket":
        raise ConnectionError("WebSocket handshake failed: invalid Upgrade header")
    connection_tokens = {
        item.strip().lower()
        for item in response_headers.get("connection", "").split(",")
    }
    if "upgrade" not in connection_tokens:
        raise ConnectionError("WebSocket handshake failed: invalid Connection header")
    expected_accept = base64.b64encode(
        hashlib.sha1((key + WS_GUID).encode("ascii")).digest()
    ).decode("ascii")
    if not hmac.compare_digest(
        response_headers.get("sec-websocket-accept", ""), expected_accept
    ):
        raise ConnectionError("WebSocket handshake failed: invalid Sec-WebSocket-Accept")

    # Return any leftover data after headers
    return buf.split(b"\r\n\r\n", 1)[1]


def _ws_send_frame(sock, opcode: int, payload: bytes = b""):
    """Send one final, masked WebSocket frame."""
    import secrets
    frame = bytearray()
    frame.append(0x80 | opcode)

    length = len(payload)
    if length < 126:
        frame.append(0x80 | length)  # MASK bit set
    elif length < 65536:
        frame.append(0x80 | 126)
        frame.extend(struct.pack(">H", length))
    else:
        frame.append(0x80 | 127)
        frame.extend(struct.pack(">Q", length))

    mask = secrets.token_bytes(4)
    frame.extend(mask)
    masked = bytearray(b ^ mask[i % 4] for i, b in enumerate(payload))
    frame.extend(masked)
    sock.sendall(bytes(frame))


def _ws_send(sock, data: str):
    """Send a text frame over WebSocket."""
    _ws_send_frame(sock, 0x1, data.encode("utf-8"))


def _ws_send_pong(sock, payload: bytes):
    """Reply to a WebSocket ping with the same payload."""
    _ws_send_frame(sock, 0xA, payload)


def _ws_recv_frame(sock, leftover: bytearray) -> tuple:
    """Receive one WebSocket frame. Returns (fin, opcode, payload, leftover)."""

    def _read_exact(n):
        nonlocal leftover
        while len(leftover) < n:
            chunk = sock.recv(8192)
            if not chunk:
                raise ConnectionError("Connection closed while reading frame")
            leftover.extend(chunk)
        data = bytes(leftover[:n])
        leftover = leftover[n:]
        return data

    hdr = _read_exact(2)
    fin = bool(hdr[0] & 0x80)
    opcode = hdr[0] & 0x0F
    masked = bool(hdr[1] & 0x80)
    length = hdr[1] & 0x7F

    if length == 126:
        length = struct.unpack(">H", _read_exact(2))[0]
    elif length == 127:
        length = struct.unpack(">Q", _read_exact(8))[0]
    if length > MAX_MESSAGE_SIZE:
        raise ConnectionError("WebSocket frame is too large")
    if opcode >= 0x8 and (not fin or length > 125):
        raise ConnectionError("Invalid WebSocket control frame")
    if masked:
        raise ConnectionError("Server WebSocket frames must not be masked")

    payload = _read_exact(length)

    return fin, opcode, payload, leftover


def _ws_close(sock):
    """Send WebSocket close frame."""
    try:
        _ws_send_frame(sock, 0x8, struct.pack(">H", 1000))
    except Exception:
        pass


def ws_communicate(url: str, message: str) -> list:
    """Connect to WebSocket, send message, collect all response frames."""
    parsed = urlparse(url)
    host = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "wss" else 80)
    path_query = parsed.path
    if parsed.query:
        path_query += "?" + parsed.query

    raw_sock = socket.create_connection((host, port), timeout=60)

    if parsed.scheme == "wss":
        ctx = ssl.create_default_context()
        sock = ctx.wrap_socket(raw_sock, server_hostname=host)
    else:
        sock = raw_sock

    try:
        leftover_data = _ws_handshake(sock, host, path_query)
        leftover = bytearray(leftover_data)

        _ws_send(sock, message)

        frames = []
        fragmented = None
        while True:
            fin, opcode, payload, leftover = _ws_recv_frame(sock, leftover)

            if opcode == 0x1:  # text frame
                if fragmented is not None:
                    raise ConnectionError("Received a new text frame during fragmentation")
                if fin:
                    message_payload = payload
                else:
                    fragmented = bytearray(payload)
                    continue
            elif opcode == 0x0:  # continuation frame
                if fragmented is None:
                    raise ConnectionError("Received continuation frame without a start frame")
                fragmented.extend(payload)
                if len(fragmented) > MAX_MESSAGE_SIZE:
                    raise ConnectionError("WebSocket message is too large")
                if not fin:
                    continue
                message_payload = bytes(fragmented)
                fragmented = None
            elif opcode == 0x8:  # close
                if fragmented is not None:
                    raise ConnectionError("Connection closed during a fragmented message")
                break
            elif opcode == 0x9:  # ping → pong
                _ws_send_pong(sock, payload)
                continue
            elif opcode == 0xA:  # pong
                continue
            else:
                raise ConnectionError(f"Unsupported WebSocket opcode: {opcode}")

            try:
                text_message = message_payload.decode("utf-8")
            except UnicodeDecodeError as exc:
                raise ConnectionError("WebSocket text message is not valid UTF-8") from exc
            frames.append(text_message)

            # Check if this is the last frame from the API
            try:
                data = json.loads(text_message)
                header = data.get("header", {})
                if header.get("code", 0) != 0:
                    break
                choices = data.get("payload", {}).get("choices", {})
                if choices.get("status") == 2:
                    break
            except json.JSONDecodeError:
                pass

        _ws_close(sock)
        return frames
    finally:
        sock.close()


def run_understanding(app_id: str, api_key: str, api_secret: str,
                      messages: list, domain: str, temperature: float,
                      max_tokens: int, raw: bool) -> str:
    """Run image understanding and return the assembled text response."""
    auth_url = build_auth_url(WS_URL, api_key, api_secret)
    params = gen_params(app_id, messages, domain, temperature, max_tokens)
    request_data = json.dumps(params)

    frames = ws_communicate(auth_url, request_data)

    full_text = ""
    for f in frames:
        if raw:
            print(f)
        try:
            data = json.loads(f)
        except json.JSONDecodeError as exc:
            raise ConnectionError("API returned an invalid JSON message") from exc

        header = data.get("header", {})
        code = header.get("code", 0)
        if code != 0:
            msg = header.get("message", "unknown error")
            raise ImageUnderstandingError(code, msg, header.get("sid"))

        choices = data.get("payload", {}).get("choices", {})
        texts = choices.get("text", [])
        if not raw:
            for t in texts:
                content = t.get("content", "")
                full_text += content

        # Print usage info on last frame
        if choices.get("status") == 2:
            usage = data.get("payload", {}).get("usage", {}).get("text", {})
            if usage:
                print(
                    f"\n--- Token usage: prompt={usage.get('prompt_tokens', '?')}, "
                    f"completion={usage.get('completion_tokens', '?')}, "
                    f"total={usage.get('total_tokens', '?')} ---",
                    file=sys.stderr,
                )

    return full_text


def main():
    parser = argparse.ArgumentParser(
        description="iFlytek Image Understanding (图片理解)"
    )
    parser.add_argument("image", help="Image file path (.jpg, .jpeg, .png)")
    parser.add_argument(
        "--question", "-q", default="请详细描述这张图片的内容",
        help="Question about the image (default: describe the image)"
    )
    parser.add_argument(
        "--domain", "-d", default="imagev3",
        choices=["general", "imagev3"],
        help="Model version: general (basic, fixed 273 tokens/image) or imagev3 (advanced, dynamic tokens). Default: imagev3"
    )
    parser.add_argument(
        "--temperature", "-t", type=temperature_value, default=0.5,
        help="Sampling temperature (0, 1]. Default: 0.5"
    )
    parser.add_argument(
        "--max-tokens", type=max_tokens_value, default=2048,
        help="Max response tokens (1-8192). Default: 2048"
    )
    parser.add_argument(
        "--raw", action="store_true",
        help="Output raw WebSocket JSON frames"
    )
    args = parser.parse_args()

    # Validate the local input before requiring credentials or opening a socket.
    try:
        image_b64 = read_image_base64(args.image)
    except ValueError as exc:
        parser.error(str(exc))

    # Read credentials
    app_id = os.environ.get("IFLY_APP_ID")
    api_key = os.environ.get("IFLY_API_KEY")
    api_secret = os.environ.get("IFLY_API_SECRET")

    if not all([app_id, api_key, api_secret]):
        missing = []
        if not app_id:
            missing.append("IFLY_APP_ID")
        if not api_key:
            missing.append("IFLY_API_KEY")
        if not api_secret:
            missing.append("IFLY_API_SECRET")
        print(f"Error: Missing environment variables: {', '.join(missing)}", file=sys.stderr)
        print("Get credentials from https://console.xfyun.cn", file=sys.stderr)
        return 1

    # Build messages: image first, then question
    messages = [
        {"role": "user", "content": image_b64, "content_type": "image"},
        {"role": "user", "content": args.question, "content_type": "text"},
    ]

    try:
        result = run_understanding(
            app_id, api_key, api_secret,
            messages=messages,
            domain=args.domain,
            temperature=args.temperature,
            max_tokens=args.max_tokens,
            raw=args.raw,
        )
    except (ImageUnderstandingError, ConnectionError, OSError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if result:
        print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
