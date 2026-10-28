# /// script
# requires-python = ">=3.11"
# ///
"""Check every quoted claim in a video project's script.json against its source.

    uv run <plugin>/scripts/check_claims.py <project-dir>

Each `claims` entry with a `quote` is looked up in the text of `sources[source]`.
found: the quote is in the source. NOT FOUND: it is not; fix the line or the
quote before delivery. unfetched: the source could not be read (paywall, PDF,
script-only page); a person has to check it. Exit status 1 when anything is
NOT FOUND. Fetched text is cached in <project-dir>/out/claims-cache.
"""
from __future__ import annotations

import hashlib
import html
import json
import re
import ssl
import subprocess
import sys
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path

# Some documentation hosts refuse browser user agents and serve curl.
USER_AGENT = "curl/8.7.1"
FUZZY_MIN = 0.85
NUMBER = re.compile(
    r"\d[\d,.]*|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen"
    r"|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty"
    r"|ninety|hundred|thousand|million|billion|half|quarter)\b")


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).replace("_", "")
    text = re.sub(r"[‘’]", "'", re.sub(r"[“”]", '"', text))
    text = re.sub(r"-{2,}|[–—]", " - ", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def narrated_lines(script: dict) -> dict[str, str]:
    out = {}
    for ch in script["chapters"]:
        for sc in ch["scenes"]:
            for i, line in enumerate(sc["lines"]):
                out[f"{sc['id']}.{i}"] = line if isinstance(line, str) else line["text"]
        if quiz := ch.get("quiz"):
            out[f"{ch['id']}-quiz.0"], out[f"{ch['id']}-quiz.1"] = quiz["q"], quiz["a"]
    return out


def readable_url(url: str) -> str:
    if m := re.fullmatch(r"https://www\.gutenberg\.org/ebooks/(\d+)", url):
        return f"https://www.gutenberg.org/cache/epub/{m[1]}/pg{m[1]}.txt"
    return url


def curl_fetch(url: str) -> tuple[str, bytes]:
    """curl uses the system trust store, which completes chains a server sends without its intermediate."""
    out = subprocess.run(["curl", "-sSL", "--max-time", "30", "-A", USER_AGENT, "-w", "\n%{content_type}", url],
                         capture_output=True, check=True).stdout
    body, _, ctype = out.rpartition(b"\n")
    return ctype.decode(), body


def fetch_text(url: str) -> dict:
    try:
        req = urllib.request.Request(readable_url(url), headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=30) as resp:
            ctype, body = resp.headers.get("content-type", ""), resp.read()
    except urllib.error.HTTPError as e:
        return {"ok": False, "why": f"HTTP {e.code}"}
    except urllib.error.URLError as e:
        if not isinstance(e.reason, ssl.SSLCertVerificationError):
            return {"ok": False, "why": type(e.reason).__name__}
        try:
            ctype, body = curl_fetch(readable_url(url))
        except (OSError, subprocess.CalledProcessError):
            return {"ok": False, "why": "certificate chain incomplete and curl failed"}
    except TimeoutError as e:
        return {"ok": False, "why": type(e).__name__}
    if "pdf" in ctype:
        return {"ok": False, "why": "PDF"}
    text = body.decode("utf-8", "replace")
    if "html" in ctype:
        text = re.sub(r"(?is)<(script|style|noscript)\b.*?</\1>", " ", text)
        text = html.unescape(re.sub(r"<[^>]+>", " ", text))
    if len(normalize(text)) < 2000:
        return {"ok": False, "why": "page too thin to hold the source (script-only or redirect)"}
    return {"ok": True, "text": text}


def europe_pmc_abstract(doi: str) -> str:
    query = urllib.parse.quote(f'DOI:"{doi}"')
    url = f"https://www.ebi.ac.uk/europepmc/webservices/rest/search?query={query}&resultType=core&format=json"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            results = json.load(resp)["resultList"]["result"]
    except (urllib.error.URLError, TimeoutError, KeyError, ValueError):
        return ""
    return re.sub(r"<[^>]+>", "", results[0].get("abstractText", "")) if results else ""


def source_text(url: str, cache: Path) -> dict:
    path = cache / (hashlib.sha1(url.encode()).hexdigest()[:16] + ".json")
    if path.exists():
        return json.loads(path.read_text())
    got = fetch_text(url)
    if not got["ok"] and (m := re.fullmatch(r"https://doi\.org/(.+)", url)):
        if abstract := europe_pmc_abstract(m[1]):
            got = {"ok": True, "text": abstract, "via": "Europe PMC abstract"}
    cache.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(got, ensure_ascii=False))
    return got


def best_fuzzy(quote: str, text: str) -> float:
    """Best similarity of a window of `text` to `quote`, counting only windows with the same numbers."""
    words, n = quote.split(), len(quote)
    numbers = set(NUMBER.findall(quote))
    anchors = {m.start() for w in words[:3] + words[-3:] if len(w) > 3 for m in re.finditer(re.escape(w), text)}
    best = 0.0
    for a in anchors:
        for start in range(max(0, a - n), a + 1, max(1, n // 4)):
            if numbers <= set(NUMBER.findall(text[max(0, start - 20):start + n + 20])):
                best = max(best, SequenceMatcher(None, quote, text[start:start + n]).ratio())
    return best


def verdict(quote: str, got: dict) -> tuple[str, str]:
    if not got["ok"]:
        return "unfetched", got["why"]
    q, t = normalize(quote), normalize(got["text"])
    via = f" via {got['via']}" if got.get("via") else ""
    if q in t:
        return "found", "exact" + via
    score = best_fuzzy(q, t)
    return ("found" if score >= FUZZY_MIN else "NOT FOUND"), f"closest {score:.2f}{via}"


def main(project: Path) -> int:
    script = json.loads((project / "script.json").read_text())
    lines, sources = narrated_lines(script), script.get("sources", [])
    cache = project / "out" / "claims-cache"
    counts: dict[str, int] = {}
    for claim in script.get("claims", []):
        if "quote" not in claim:
            continue
        status, detail = verdict(claim["quote"], source_text(sources[claim["source"]]["url"], cache))
        counts[status] = counts.get(status, 0) + 1
        print(f"{status:9}  {claim['line']:10}  {lines.get(claim['line'], '')[:40]}  ({detail})")
    print(", ".join(f"{k} {v}" for k, v in sorted(counts.items())) or "no quoted claims")
    if counts.get("unfetched"):
        print("unfetched sources need a person to check the quotes by hand")
    return 1 if counts.get("NOT FOUND") else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    raise SystemExit(main(Path(sys.argv[1])))
