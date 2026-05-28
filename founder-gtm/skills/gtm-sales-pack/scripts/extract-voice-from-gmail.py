#!/usr/bin/env python3
"""Extract a founder's writing voice profile from their last N sent Gmail messages.

Reuses the OAuth token created by `gtm-cold-email/scripts/gmail-auth.py`
(scopes include `gmail.readonly`). Read-only and idempotent: safe to run
repeatedly. Recipient names in excerpts are redacted to "<recipient>".

Usage:
    python extract-voice-from-gmail.py [--max-emails 100] [--min-words 30]
                                       [--out .gtm-state/voice-profile.json]

Prerequisites:
    pip install google-auth google-api-python-client

Reads:
    $CURSOR_PLUGIN_ROOT/.gtm-state/gmail-token.json
    $CURSOR_PLUGIN_ROOT/.gtm-state/oauth-client.json
        (used only to refresh the access token if it has expired)

Writes:
    The JSON path passed via --out (default: .gtm-state/voice-profile.json
    in the current working directory).

What the profile contains:
    sample_count, sentence_length (median/p25/p75), opener_capitalization
    (lowercase vs sentence case ratio), punctuation_tics (em dash, en dash,
    ellipsis, exclamation, semicolon), recurring_phrases (top bigrams and
    trigrams, stopword-filtered), sign_off_pattern, excerpts (3 redacted).
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import statistics
import sys
from collections import Counter
from pathlib import Path
from typing import Any

try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except ImportError as e:
    raise SystemExit(
        "Missing dependency. Run:\n"
        "    pip install google-auth google-api-python-client"
    ) from e

PLUGIN_ROOT = Path(os.environ.get("CURSOR_PLUGIN_ROOT", Path(__file__).resolve().parents[3]))
STATE_DIR = PLUGIN_ROOT / ".gtm-state"
TOKEN_FILE = STATE_DIR / "gmail-token.json"
CLIENT_FILE = STATE_DIR / "oauth-client.json"

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

STOPWORDS = set(
    """
    a an the and or but if so to of in on at for with from as is was were be been
    being have has had do does did this that these those i you he she it we they
    me him her us them my your his its our their what when where which who whom how
    why all any both each few more most other some such no nor not only own same
    than too very can will just don dont can't won't isn aren't shouldn wouldn
    about into between through during before after above below up down out off
    over under again further then once here there because while
    """.split()
)

AUTO_REPLY_SUBJECT_RE = re.compile(
    r"(out of office|ooo|auto-?reply|automatic reply|\[auto reply\]|vacation)",
    re.IGNORECASE,
)
CALENDAR_SUBJECT_RE = re.compile(
    r"(invitation:|updated invitation:|canceled event:|declined:|accepted:|tentative:)",
    re.IGNORECASE,
)


def load_credentials() -> Credentials:
    if not TOKEN_FILE.exists():
        raise SystemExit(
            f"Missing {TOKEN_FILE}.\n"
            "Run the cold-email Gmail bootstrap once first:\n"
            f"    python {PLUGIN_ROOT / 'skills/gtm-cold-email/scripts/gmail-auth.py'}"
        )
    creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        TOKEN_FILE.write_text(creds.to_json())
        os.chmod(TOKEN_FILE, 0o600)
    return creds


def fetch_sent_messages(service: Any, max_emails: int) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    page_token: str | None = None
    while len(results) < max_emails:
        page_size = min(100, max_emails - len(results))
        resp = (
            service.users()
            .messages()
            .list(
                userId="me",
                labelIds=["SENT"],
                maxResults=page_size,
                pageToken=page_token,
            )
            .execute()
        )
        for msg in resp.get("messages", []):
            try:
                full = (
                    service.users()
                    .messages()
                    .get(userId="me", id=msg["id"], format="full")
                    .execute()
                )
            except HttpError:
                continue
            results.append(full)
            if len(results) >= max_emails:
                break
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return results


def decode_body(payload: dict[str, Any]) -> str:
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode(
            "utf-8", errors="replace"
        )
    for part in payload.get("parts", []) or []:
        text = decode_body(part)
        if text:
            return text
    return ""


def strip_quoted(body: str) -> str:
    lines: list[str] = []
    for line in body.splitlines():
        if line.startswith(">"):
            break
        if re.match(r"^On .* wrote:$", line.strip()):
            break
        if re.match(r"^From: .+$", line.strip()):
            break
        lines.append(line)
    return "\n".join(lines).strip()


def get_header(headers: list[dict[str, str]], name: str) -> str:
    name = name.lower()
    for h in headers:
        if h.get("name", "").lower() == name:
            return h.get("value", "")
    return ""


def split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Za-z])", text.strip())
    return [p.strip() for p in parts if p.strip()]


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in re.findall(r"[A-Za-z']+", text)]


def ngrams(tokens: list[str], n: int) -> list[tuple[str, ...]]:
    return [tuple(tokens[i : i + n]) for i in range(len(tokens) - n + 1)]


def is_stopwordy(gram: tuple[str, ...]) -> bool:
    return all(t in STOPWORDS for t in gram)


def redact_recipient(text: str, to_header: str) -> str:
    if not to_header:
        return text
    name_match = re.match(r"\s*\"?([^\"<]+?)\"?\s*<", to_header)
    name = name_match.group(1).strip() if name_match else to_header.split("@")[0]
    first = name.split()[0] if name else ""
    if first and len(first) >= 2:
        text = re.sub(rf"\b{re.escape(first)}\b", "<recipient>", text)
    return text


def extract_sign_off(body: str) -> str:
    lines = [l.strip() for l in body.splitlines() if l.strip()]
    if len(lines) < 2:
        return ""
    for candidate in reversed(lines[:-1][-5:]):
        if 1 <= len(candidate.split()) <= 5 and candidate.endswith((",", ".", "")):
            return candidate
    return lines[-2] if len(lines) >= 2 else ""


def analyze(messages: list[dict[str, Any]], min_words: int) -> dict[str, Any]:
    kept: list[dict[str, Any]] = []
    for msg in messages:
        payload = msg.get("payload", {})
        headers = payload.get("headers", [])
        if get_header(headers, "Auto-Submitted") and get_header(
            headers, "Auto-Submitted"
        ).lower() != "no":
            continue
        subject = get_header(headers, "Subject")
        if AUTO_REPLY_SUBJECT_RE.search(subject) or CALENDAR_SUBJECT_RE.search(subject):
            continue
        body = strip_quoted(decode_body(payload))
        if not body or len(body.split()) < min_words:
            continue
        kept.append(
            {
                "subject": subject,
                "to": get_header(headers, "To"),
                "body": body,
            }
        )

    sentence_lengths: list[int] = []
    lowercase_openers = 0
    sentence_case_openers = 0
    punctuation = Counter()
    all_tokens: list[str] = []
    sign_offs: Counter = Counter()

    for m in kept:
        for s in split_sentences(m["body"]):
            words = s.split()
            if not words:
                continue
            sentence_lengths.append(len(words))
            if words[0][:1].islower():
                lowercase_openers += 1
            else:
                sentence_case_openers += 1
        punctuation["em_dash"] += m["body"].count("\u2014")
        punctuation["en_dash"] += m["body"].count("\u2013")
        punctuation["ellipsis"] += m["body"].count("...") + m["body"].count("\u2026")
        punctuation["exclamation"] += m["body"].count("!")
        punctuation["semicolon"] += m["body"].count(";")
        all_tokens.extend(tokenize(m["body"]))
        so = extract_sign_off(m["body"])
        if so:
            sign_offs[so] += 1

    bigrams = Counter(g for g in ngrams(all_tokens, 2) if not is_stopwordy(g))
    trigrams = Counter(g for g in ngrams(all_tokens, 3) if not is_stopwordy(g))

    excerpts: list[str] = []
    for m in kept:
        if len(excerpts) >= 3:
            break
        text = m["body"]
        text = redact_recipient(text, m["to"])
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) > 400:
            text = text[:397] + "..."
        excerpts.append(text)

    total_openers = lowercase_openers + sentence_case_openers
    lowercase_pct = round(100 * lowercase_openers / total_openers, 1) if total_openers else 0.0
    sentence_pct = round(100 * sentence_case_openers / total_openers, 1) if total_openers else 0.0

    profile: dict[str, Any] = {
        "sample_count": len(kept),
        "sentence_length": {
            "median": int(statistics.median(sentence_lengths)) if sentence_lengths else 0,
            "p25": int(_percentile(sentence_lengths, 25)) if sentence_lengths else 0,
            "p75": int(_percentile(sentence_lengths, 75)) if sentence_lengths else 0,
        },
        "opener_capitalization": {
            "lowercase_pct": lowercase_pct,
            "sentence_case_pct": sentence_pct,
        },
        "punctuation_tics": dict(punctuation),
        "recurring_phrases": {
            "bigrams": [
                {"phrase": " ".join(g), "count": c}
                for g, c in bigrams.most_common(10)
                if c >= 2
            ],
            "trigrams": [
                {"phrase": " ".join(g), "count": c}
                for g, c in trigrams.most_common(10)
                if c >= 2
            ],
        },
        "sign_off_pattern": sign_offs.most_common(1)[0][0] if sign_offs else "",
        "excerpts": excerpts,
    }
    return profile


def _percentile(values: list[int], pct: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    k = (len(s) - 1) * pct / 100
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return float(s[f])
    return s[f] + (s[c] - s[f]) * (k - f)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--max-emails", type=int, default=100)
    parser.add_argument("--min-words", type=int, default=30)
    parser.add_argument(
        "--out",
        type=str,
        default=str(Path(".gtm-state") / "voice-profile.json"),
    )
    args = parser.parse_args()

    creds = load_credentials()
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    messages = fetch_sent_messages(service, args.max_emails)
    if not messages:
        print("No sent messages found.", file=sys.stderr)
        sys.exit(1)
    profile = analyze(messages, args.min_words)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(profile, indent=2))
    print(f"Voice profile written to {out_path}")
    print(f"Samples kept: {profile['sample_count']}")


if __name__ == "__main__":
    main()
