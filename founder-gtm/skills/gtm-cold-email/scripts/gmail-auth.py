#!/usr/bin/env python3
"""One-time Gmail OAuth bootstrap for the founder-gtm cold-email skill.

Run once after creating the OAuth client in the Google Cloud Console.

Usage:
    python scripts/gmail-auth.py

Prerequisites:
    pip install google-auth-oauthlib google-api-python-client

Reads:
    $CURSOR_PLUGIN_ROOT/.gtm-state/oauth-client.json

Writes:
    $CURSOR_PLUGIN_ROOT/.gtm-state/gmail-token.json (chmod 600)
"""

import os
from pathlib import Path

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError as e:
    raise SystemExit(
        "Missing dependency. Run:\n"
        "    pip install google-auth-oauthlib google-api-python-client"
    ) from e

SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.readonly",
]

PLUGIN_ROOT = Path(os.environ.get("CURSOR_PLUGIN_ROOT", Path(__file__).resolve().parents[3]))
STATE_DIR = PLUGIN_ROOT / ".gtm-state"
CLIENT_FILE = STATE_DIR / "oauth-client.json"
TOKEN_FILE = STATE_DIR / "gmail-token.json"


def main() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    if not CLIENT_FILE.exists():
        raise SystemExit(
            f"Missing {CLIENT_FILE}.\n"
            "Create an OAuth client (Desktop app) at\n"
            "  https://console.cloud.google.com/apis/credentials\n"
            f"and save the downloaded JSON to that path."
        )

    flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_FILE), SCOPES)
    creds = flow.run_local_server(port=0, prompt="consent")
    TOKEN_FILE.write_text(creds.to_json())
    os.chmod(TOKEN_FILE, 0o600)
    print(f"Token saved to {TOKEN_FILE} (chmod 600)")


if __name__ == "__main__":
    main()
