# /// script
# requires-python = ">=3.11"
# dependencies = ["budoux>=0.6", "imageio-ffmpeg>=0.5", "playwright>=1.50", "fonttools>=4.50", "brotli>=1.1"]
# ///
"""Build a narrated explainer video: a standalone HTML page, or a YESUnits unit for a course.

    uv run build.py lint  <project>   # script checks only, no synthesis
    uv run build.py build <project>   # synth (cached) -> timeline -> captions -> out/video.html
    uv run build.py shoot <project> [--at end|start|mid] [--only s3,s4]
    uv run build.py check <project>   # e2e in headless Chrome on out/video.html: maximize (F / button / Esc, fallback)
    uv run build.py unit  <project> --id ID --out DIR [--bitrate 32k]   # unit bundle for course
    uv run build.py tts-plan <project>  # out/tts-plan.json: the sentences YES_TTS_FILES still needs as WAV files

<project>/script.json   narration, chapters, scenes, quizzes (see SKILL.md)
<project>/scenes.html   one <section class="scene" data-scene="ID"> per non-quiz scene
<project>/readings.json optional {"surface": "reading"} merged over the skill's readings.json

Speech comes from the bundled `yes-speak` (Docker VOICEVOX) unless:
  YES_TTS_CMD     a command with the yes-speak contract (EV_TTS_CMD is an alias)
  YES_TTS_FILES=1 the agent writes the WAVs listed by `tts-plan` (e.g. from an MCP tool)
  YES_TTS_ENGINE  voicevox | other: what YES_TTS_CMD / YES_TTS_FILES produce (a command defaults to voicevox)
  YES_TTS_SPEAKERS  the engine's speaker list as JSON, for a cast with YES_TTS_FILES
"""

from __future__ import annotations

import argparse
import base64
import concurrent.futures as cf
import math
import os
import hashlib
import html
import json
import io
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
import wave
from urllib.parse import urlsplit
from array import array
from pathlib import Path

import budoux
import imageio_ffmpeg

SKILL_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SKILL_DIR.parents[1] / "scripts"))
from markup import attr_values
from output import export
from voice_licenses import SUPPORTED_VOICES, usage_notice, voice_policy
# shared across projects: a course rebuild reuses every sentence its lessons already synthesized
TTS_CACHE = Path(os.environ.get("EV_TTS_CACHE", Path.home() / ".cache" / "yes" / "tts"))
TTS_WORKERS = int(os.environ.get("EV_TTS_WORKERS", "4"))
RATE = 24000  # VOICEVOX output
LEAD_IN = 0.4
PAUSE_LINE = 0.35
PAUSE_SCENE = 0.9
PAUSE_CHAPTER = 1.4
QUIZ_THINK = 4.0
CAPTION_MAX = 40  # chars per cue (two lines of ~20)
LINE_WARN = 60
CPS_WARN = 7.5
DEICTIC = re.compile(r"この図|この部分|ここを|ここで見|こちら|この赤|この青|これを見")
ASCII_WORD = re.compile(r"[A-Za-z][A-Za-z0-9.+#'-]*")
# VOICEVOX pauses 0.3-0.6 s at every space, so only spaces between two ASCII words survive
JA_SPACE = re.compile(r"(?<=[^\x00-\x7f])[ \u3000]+|[ \u3000]+(?=[^\x00-\x7f])")
COMMA_WARN = 3
CHARACTERS = SKILL_DIR / "characters"
DEFAULT_STYLE = "ノーマル"
DEFAULT_FACE = "normal"
MOUTH_FPS = 30
MOUTH_FLOOR = 300  # RMS below this (about -40 dBFS) is silence, whatever the line's loudness
MOUTH_UP = (0.2, 0.5)  # normalized RMS that opens the mouth to half / open
MOUTH_DOWN = (0.12, 0.38)  # and the lower levels it must fall below to close again

parser_ja = budoux.load_default_japanese_parser()


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


# ---------- script model ----------

def load_project(root: Path) -> tuple[dict, dict, list[dict], list[dict]]:
    script = json.loads((root / "script.json").read_text())
    readings = json.loads((SKILL_DIR / "readings.json").read_text())
    if (root / "readings.json").exists():
        readings.update(json.loads((root / "readings.json").read_text()))
    cast = load_cast(script)
    KEEP_WHOLE.update(w for w in [*readings, *(m["name"] for m in cast)] if len(w) > 1)
    return script, readings, cast, flatten(script, [m["id"] for m in cast])


def load_cast(script: dict) -> list[dict]:
    """The script's cast in order. A member with art keeps its characters/<id>.json as `char`."""
    cast = []
    for raw in script.get("cast", []):
        if isinstance(raw, str):
            path = CHARACTERS / f"{raw}.json"
            if not path.exists():
                die(f"cast member {raw!r}: no {path}; write it inline as {{\"id\", \"speaker\"}} for a voice without art")
            char = json.loads(path.read_text())
            cast.append({"id": raw, "name": char["name"], "speaker": char["speaker"], "color": char.get("color"), "char": char})
        else:
            if not (raw.get("id") and raw.get("speaker")):
                die(f"inline cast member needs id and speaker: {raw!r}")
            cast.append({"id": raw["id"], "name": raw.get("name", raw["speaker"]), "speaker": raw["speaker"], "color": raw.get("color")})
    if licensed():
        for member in cast:
            if member["speaker"] not in SUPPORTED_VOICES:
                die("YES supports only ずんだもん and 四国めたん as VOICEVOX voices in the cast.")
    return cast


def norm_line(raw) -> dict:
    line = {"text": raw} if isinstance(raw, str) else dict(raw)
    if not line.get("text"):
        die(f"line without text: {raw!r}")
    return line


def flatten(script: dict, cast: list[str] | None = None) -> list[dict]:
    """Every narrated line in order, with its scene/chapter and the pause after it.

    With a cast (ids), each line also gets `who` (default: the previous line's speaker),
    `style` (default ノーマル) and `face` (sticky per character)."""
    out: list[dict] = []
    explainer = cast[0] if cast else None
    who, faces = explainer, {}
    chapters = script["chapters"]
    for ci, ch in enumerate(chapters):
        scenes = list(ch["scenes"])
        if ch.get("quiz"):
            q = ch["quiz"]
            scenes.append({
                "id": f"{ch['id']}-quiz", "kind": "quiz",
                "lines": [
                    {"text": q["q"], "reading": q.get("q_reading"), "pause": q.get("think", QUIZ_THINK),
                     "who": q.get("q_who") or explainer},
                    {"text": q["a"], "reading": q.get("a_reading"), "who": q.get("a_who") or explainer},
                ],
            })
        for si, sc in enumerate(scenes):
            lines = [norm_line(ln) for ln in sc["lines"]]
            for li, line in enumerate(lines):
                last_in_scene = li == len(lines) - 1
                last_in_ch = last_in_scene and si == len(scenes) - 1
                default = PAUSE_CHAPTER if last_in_ch else PAUSE_SCENE if last_in_scene else PAUSE_LINE
                if ci == len(chapters) - 1 and last_in_ch:
                    default = 1.0
                entry = {
                    "id": f"{sc['id']}.{li}", "chapter": ch["id"], "scene": sc["id"],
                    "kind": sc.get("kind", "scene"), "idx": li,
                    "role": sc.get("role"), "aside": bool(line.get("aside")),
                    "text": line["text"], "reading": line.get("reading"),
                    "pause": float(line.get("pause") if line.get("pause") is not None else default),
                }
                if cast:
                    who = line.get("who") or who
                    faces[who] = line.get("face") or faces.get(who, DEFAULT_FACE)
                    entry.update(who=who, style=line.get("style") or DEFAULT_STYLE, face=faces[who])
                out.append(entry)
    return out


def reading_of(line: dict, readings: dict) -> str:
    if line.get("reading"):
        return JA_SPACE.sub("", line["reading"])
    text = line["text"]
    for surface in sorted(readings, key=len, reverse=True):
        # ASCII surfaces match whole words only, so "AI" never fires inside "MAIN"
        pat = re.escape(surface)
        if surface.isascii():
            pat = rf"(?<![A-Za-z0-9]){pat}(?![A-Za-z0-9])"
        text = re.sub(pat, lambda _, r=readings[surface]: r, text)
    return JA_SPACE.sub("", text)


# ---------- lint ----------

OPEN_TAG = re.compile(r"<[A-Za-z][^<>]*>")


def out_implies_at(scenes_html: str) -> str:
    """The runtime only schedules [data-at] elements, so a lone data-out would never hide."""
    def fix(m: re.Match) -> str:
        tag = m.group(0)
        if re.search(r"\sdata-out=", tag) and not re.search(r"\sdata-at=", tag):
            return re.sub(r"\sdata-out=", ' data-at="0" data-out=', tag, count=1)
        return tag
    return OPEN_TAG.sub(fix, scenes_html)


QUIZ_ECHO_WARN = 0.35


def lint(lines: list[dict], readings: dict, durations: dict | None = None) -> list[str]:
    warns = []
    for ln in lines:
        t = ln["text"]
        if len(t) > LINE_WARN:
            warns.append(f"{ln['id']}: {len(t)} chars (> {LINE_WARN}); split the sentence")
        commas = reading_of(ln, readings).count("、")
        if commas >= COMMA_WARN:
            warns.append(f"{ln['id']}: {commas} 読点, each a pause in speech; join a list with と or split the sentence")
        if DEICTIC.search(t):
            warns.append(f"{ln['id']}: deictic phrase '{DEICTIC.search(t).group()}' — name the thing so audio-only works")
        if not ln.get("reading"):
            spoken = reading_of(ln, readings)
            left = [w for w in ASCII_WORD.findall(spoken) if len(w) > 1]
            if left:
                warns.append(f"{ln['id']}: no reading for {', '.join(sorted(set(left)))} — add to readings.json or give the line a reading")
        if durations and ln["id"] in durations:
            cps = len(t) / max(durations[ln["id"]], 0.1)
            if cps > CPS_WARN:
                warns.append(f"{ln['id']}: {cps:.1f} chars/s on screen (> {CPS_WARN})")
        # the dialogue layout has room for two caption lines between the characters
        if "who" in ln and len(caption_chunks(t)) > 2:
            warns.append(f"{ln['id']}: caption runs over 2 lines; split the sentence")
    warns += quiz_echo_warnings(lines)
    warns += placement_warnings(lines)
    return warns


ROLES = ("hook", "example", "mechanism", "transition", "close")
NO_ASIDE_BEFORE_QUIZ = 3


def placement_warnings(lines: list[dict]) -> list[str]:
    """Every scene names its role; humor (`aside`) stays out of examples, mechanisms and quiz lead-ins."""
    warns, seen = [], set()
    for i, ln in enumerate(lines):
        scene = ln.get("scene")
        if not scene or scene.endswith("-quiz"):
            continue
        if scene not in seen:
            seen.add(scene)
            if ln.get("role") not in ROLES:
                warns.append(f"{scene}: role must be one of {', '.join(ROLES)}")
        if not ln.get("aside"):
            continue
        if ln.get("role") in ("example", "mechanism"):
            warns.append(f"{ln['id']}: humor in a {ln['role']} scene; cut it")
        ahead = lines[i + 1:i + 1 + NO_ASIDE_BEFORE_QUIZ]
        if any(x.get("scene", "").endswith("-quiz") for x in ahead):
            warns.append(f"{ln['id']}: humor right before a quiz; cut it")
    return warns


def _bigrams(text: str) -> set[str]:
    t = re.sub(r"[\s、。！？!?「」（）()・,.:：…]", "", text)
    return {t[i:i + 2] for i in range(len(t) - 1)}


def quiz_echo_warnings(lines: list[dict]) -> list[str]:
    """A quiz answer already spoken in the lines just before the question is an echo, not recall."""
    warns = []
    for i, ln in enumerate(lines):
        if not ln.get("scene", "").endswith("-quiz") or i == 0 or lines[i - 1].get("scene") != ln.get("scene"):
            continue
        before = [x["text"] for x in lines[max(0, i - 4):i - 1] if x.get("chapter") == ln.get("chapter")]
        answer = _bigrams(ln["text"])
        if answer and len(answer & _bigrams(" ".join(before))) / len(answer) >= QUIZ_ECHO_WARN:
            warns.append(f"{ln['id']}: the quiz answer repeats the lines just before the question; "
                         "end the chapter on something the answer does not restate")
    return warns


def source_errors(sources: object) -> list[str]:
    """Reject malformed references before starting speech synthesis."""
    if not isinstance(sources, list):
        return ['sources: must be a list of {"title", "url"}']
    errs = []
    for i, source in enumerate(sources):
        if not isinstance(source, dict) or not isinstance(source.get("title"), str) or not source["title"].strip():
            errs.append(f"sources[{i}]: needs a nonempty title")
            continue
        url = source.get("url")
        try:
            parsed = urlsplit(url) if isinstance(url, str) else None
            valid = parsed is not None and parsed.scheme in ("http", "https") and bool(parsed.hostname)
        except ValueError:
            valid = False
        if not valid:
            errs.append(f"sources[{i}]: url must be an absolute http(s) URL")
        if "note" in source and not isinstance(source["note"], str):
            errs.append(f"sources[{i}]: note must be a string")
    return errs


DIGIT = re.compile(r"[0-9０-９]")


def claim_errors(script: dict, lines: list[dict]) -> list[str]:
    """Malformed claims ledger entries: each names a line and exactly one of quote, derived, fiction."""
    claims = script.get("claims", [])
    if not isinstance(claims, list):
        return ["claims: must be a list"]
    ids, n_sources = {ln["id"] for ln in lines}, len(script.get("sources") or [])
    errs = []
    for i, claim in enumerate(claims):
        if not isinstance(claim, dict) or claim.get("line") not in ids:
            errs.append(f"claims[{i}]: line must be a narrated line id such as c1-1.0")
            continue
        kinds = [k for k in ("quote", "derived", "fiction") if k in claim]
        if len(kinds) != 1:
            errs.append(f"claims[{i}]: give exactly one of quote (with source), derived or fiction")
        elif kinds == ["quote"]:
            if not isinstance(claim["quote"], str) or not claim["quote"].strip():
                errs.append(f"claims[{i}]: quote must be the source's own words")
            source = claim.get("source")
            if not isinstance(source, int) or isinstance(source, bool) or not 0 <= source < n_sources:
                errs.append(f"claims[{i}]: source must be an index into sources")
        elif kinds == ["derived"] and claim["derived"] not in ids:
            errs.append(f"claims[{i}]: derived must name the line it restates or computes from")
        elif kinds == ["fiction"] and claim["fiction"] is not True:
            errs.append(f"claims[{i}]: fiction must be true")
    return errs


def assumes_errors(script: dict) -> list[str]:
    assumes = script.get("assumes", [])
    if not isinstance(assumes, list) or not all(isinstance(a, str) and a.strip() for a in assumes):
        return ["assumes: must be a list of nonempty strings"]
    return []


def assumes_warnings(script: dict) -> list[str]:
    return [] if script.get("assumes") else [
        'assumes: list what the viewer must already know (the brief\'s Learner), shown under 前提 in the description']


def claim_warnings(script: dict, lines: list[dict]) -> list[str]:
    """A line with a number and no ledger entry is a factual claim nobody tied to a source."""
    declared = {c.get("line") for c in script.get("claims", []) if isinstance(c, dict)}
    return [f"{ln['id']}: has a number but no claims entry; quote its source, or mark it derived or fiction"
            for ln in lines if DIGIT.search(ln["text"]) and ln["id"] not in declared]


def cast_errors(lines: list[dict], cast: list[dict], styles: dict | None) -> list[str]:
    """Unknown who / face / style. `styles` None skips the style check (speaker list unavailable)."""
    by_id = {m["id"]: m for m in cast}
    errs = []
    for ln in lines:
        m = by_id.get(ln["who"])
        if not m:
            errs.append(f"{ln['id']}: unknown who {ln['who']!r} (cast: {', '.join(by_id)})")
            continue
        if "char" in m and ln["face"] not in m["char"]["faces"]:
            errs.append(f"{ln['id']}: {m['id']} has no face {ln['face']!r} (faces: {', '.join(m['char']['faces'])})")
        if styles is not None and (m["speaker"], ln["style"]) not in styles:
            known = [s for sp, s in styles if sp == m["speaker"]]
            errs.append(f"{ln['id']}: {m['speaker']} has no style {ln['style']!r}"
                        + (f" (styles: {', '.join(known)})" if known else " (speaker not in --list-speakers)"))
    return errs


# ---------- voices ----------

def backend() -> dict:
    """Where speech comes from. `engine` voicevox puts the VOICEVOX voice restriction, credits and terms on it."""
    cmd = os.environ.get("YES_TTS_CMD") or os.environ.get("EV_TTS_CMD") or ""
    files = os.environ.get("YES_TTS_FILES", "") not in ("", "0")
    engine = os.environ.get("YES_TTS_ENGINE", "")
    if engine not in ("", "voicevox", "other"):
        die("YES_TTS_ENGINE must be voicevox or other.")
    if cmd and files:
        die("Set YES_TTS_CMD or YES_TTS_FILES, not both.")
    if files and not engine:
        die("YES_TTS_FILES needs YES_TTS_ENGINE=voicevox or YES_TTS_ENGINE=other.")
    if cmd:
        # VOICEVOX unless declared otherwise: dropping its rules takes an explicit YES_TTS_ENGINE=other
        return {"kind": "cmd", "engine": engine or "voicevox", "cmd": shlex.split(cmd), "id": cmd}
    if files:
        return {"kind": "files", "engine": engine, "cmd": None, "id": "files:" + engine}
    if engine == "other":
        die("YES_TTS_ENGINE=other needs YES_TTS_CMD or YES_TTS_FILES; the bundled engine is VOICEVOX.")
    return {"kind": "bundled", "engine": "voicevox", "id": "bundled",
            "cmd": [sys.executable, str(SKILL_DIR.parents[1] / "scripts" / "yes_speak.py")]}


def licensed() -> bool:
    """True when the audio is VOICEVOX, whose voices and terms YES enforces whichever way it is produced."""
    return backend()["engine"] == "voicevox"


def tts_cmd() -> list[str]:
    cmd = backend()["cmd"]
    if not cmd:
        die("YES_TTS_FILES runs no command; write the files listed by `build.py tts-plan`.")
    return cmd


def run_tts(cmd: list[str]) -> subprocess.CompletedProcess:
    """Run a TTS command, waiting out the shared VOICEVOX endpoint when it is saturated:
    429 when several builds run at once, 503 when its speaker list is not ready yet."""
    for attempt in range(6):
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0 or not re.search(r"HTTP (429|503)\b", r.stderr):
            return r
        time.sleep(2 ** attempt)
    return r


def list_speakers() -> list[dict]:
    """`<tts> --list-speakers --json` (or YES_TTS_SPEAKERS): [{name, styles: [{name, id, type}], credit}]."""
    if backend()["kind"] == "files":
        path = os.environ.get("YES_TTS_SPEAKERS")
        if not path:
            raise RuntimeError("YES_TTS_FILES needs YES_TTS_SPEAKERS, the engine's speaker list as JSON")
        result = json.loads(Path(path).read_text())
    else:
        r = run_tts([*tts_cmd(), "--list-speakers", "--json"])
        if r.returncode != 0:
            raise RuntimeError(r.stderr.strip() or f"exit {r.returncode}")
        result = json.loads(r.stdout)
    if licensed():
        result = [sp for sp in result if sp["name"] in SUPPORTED_VOICES]
        for speaker in result:
            speaker.update(voice_policy(speaker["name"]))
    return result


def style_ids(speakers: list[dict]) -> dict[tuple[str, str], int]:
    return {(sp["name"], st["name"]): st["id"]
            for sp in speakers for st in sp["styles"] if st.get("type", "talk") == "talk"}


def credits_for(timed: list[dict], cast: list[dict], speakers: list[dict]) -> list[str]:
    """Each voiced character's credit in order of first appearance, then each art source once."""
    speaker_of = {m["id"]: m["speaker"] for m in cast}
    credit_of = {sp["name"]: sp.get("credit") or f"VOICEVOX:{sp['name']}" for sp in speakers}
    out: list[str] = []
    for c in [credit_of[speaker_of[ln["who"]]] for ln in timed] + [
            m["char"].get("source", {}).get("credit") for m in cast if "char" in m]:
        if c and c not in out:
            out.append(c)
    return out


def narration_credit(script: dict) -> str:
    credit = script.get("credit")
    if isinstance(credit, str) and credit.strip():
        return credit.strip()
    if not licensed():
        die('A single-narrator script with YES_TTS_ENGINE=other needs a nonempty "credit".')
    return "VOICEVOX:ずんだもん"


def terms_for(script: dict, cast: list[dict], lines: list[dict], speakers: list[dict]) -> dict:
    art = [m["char"].get("source", {}) for m in cast if "char" in m]
    if not licensed():
        terms = script.get("usageTerms", usage_notice([], art) if art else {})
    else:
        used = {m["speaker"] for m in cast if any(ln["who"] == m["id"] for ln in lines)}
        voiced = [sp for sp in speakers if sp["name"] in used] if cast else [
            {"name": "ずんだもん", **voice_policy("ずんだもん")}]
        # only the bundled engine's version is known; another VOICEVOX gets the current terms
        terms = usage_notice(voiced, art, pinned=backend()["kind"] == "bundled")
    if not isinstance(terms, dict) or not isinstance(terms.get("text", ""), str):
        die("usageTerms must be an object with text and optional links.")
    if terms and not terms.get("text", "").strip():
        die("usageTerms.text must not be empty.")
    if errs := source_errors(terms.get("links", [])):
        die("usageTerms: " + "\n".join(errs))
    return terms


# ---------- caption font ----------

# The dialogue captions carry a thick outline; an angular fallback face spikes at its corners, so the
# rounded face the captions are designed for is embedded, cut down to the characters the captions use.
CAPTION_FONT = {
    "family": "M PLUS Rounded 1c",
    "url": "https://raw.githubusercontent.com/google/fonts/7d1c962b6fbc8987b59ed229bbe5c12764d3a624/ofl/mplusrounded1c/MPLUSRounded1c-ExtraBold.ttf",
    "sha256": "8e7c15901dca87f1451b356dda594f7d092ba252a5dcc47da74523a242493c36",
}
FONT_CACHE = Path(os.environ.get("YES_FONT_CACHE", Path.home() / ".cache" / "yes" / "fonts"))


def caption_font_file() -> Path | None:
    path = FONT_CACHE / Path(CAPTION_FONT["url"]).name
    if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() != CAPTION_FONT["sha256"]:
        path.unlink()
    if not path.exists():
        try:
            FONT_CACHE.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(CAPTION_FONT["url"], timeout=60) as r:
                body = r.read()
        except OSError as e:
            print(f"warn: caption font download failed ({e}); captions use the system font")
            return None
        if hashlib.sha256(body).hexdigest() != CAPTION_FONT["sha256"]:
            print("warn: caption font checksum mismatch; captions use the system font")
            return None
        tmp = path.with_suffix(".tmp")
        tmp.write_bytes(body)
        os.replace(tmp, path)
    return path


def caption_font_css(texts: list[str], family: str) -> str:
    """An @font-face for `family` holding only the glyphs of `texts`, as WOFF2 in a data: URI ('' without the font)."""
    src = caption_font_file()
    if src is None:
        return ""
    from fontTools import subset

    chars = "".join(sorted(set("".join(texts)) | set("…ー。、！？「」（）")))
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    font = subset.load_font(str(src), opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=chars)
    sub.subset(font)
    buf = io.BytesIO()
    subset.save_font(font, buf, opts)
    data = base64.b64encode(buf.getvalue()).decode()
    return (f'@font-face{{font-family:"{family}";font-weight:800;font-display:block;'
            f'src:url(data:font/woff2;base64,{data}) format("woff2")}}')


# ---------- synthesis ----------

def cache_key(spoken: str, speed: float, style_id: int | None) -> str:
    # Include backend identity so a provider change never reuses incompatible audio.
    src = f"{speed}|{spoken}" if style_id is None else f"{style_id}|{speed}|{spoken}"
    src = "yes-voicevox-0.25.2|" + backend()["id"] + "|" + src
    return hashlib.sha1(src.encode()).hexdigest()[:16]


def synth_jobs(lines: list[dict], readings: dict, cache: Path, speed: float) -> dict[str, tuple[str, int | None, Path]]:
    jobs = {}
    for ln in lines:
        spoken = reading_of(ln, readings)
        style_id = ln.get("style_id")
        jobs[ln["id"]] = (spoken, style_id, cache / f"{cache_key(spoken, speed, style_id)}.wav")
    return jobs


def synth(lines: list[dict], readings: dict, cache: Path, speed: float) -> dict[str, Path]:
    cache.mkdir(parents=True, exist_ok=True)
    jobs = synth_jobs(lines, readings, cache, speed)
    todo = {p: (s, sid) for s, sid, p in jobs.values() if not p.exists()}
    print(f"synth: {len(jobs)} lines, {len(todo)} new")
    if backend()["kind"] == "files":
        if todo:
            die(f"{len(todo)} sentences have no audio yet: run `build.py tts-plan <project>`, write each listed WAV, then build again.")
        return {lid: p for lid, (_, _, p) in jobs.items()}
    tts = tts_cmd()

    def run(item):
        path, (spoken, style_id) = item
        with tempfile.NamedTemporaryFile(dir=cache, prefix=path.stem + ".", suffix=".wav", delete=False) as file:
            tmp = Path(file.name)
        try:
            cmd = [*tts, "--text", spoken, "-o", str(tmp), "--force", "--speed", str(speed)]
            if style_id is not None:
                cmd += ["--speaker", str(style_id)]
            r = run_tts(cmd)
            if r.returncode != 0:
                return f"{spoken[:30]}…: {r.stderr.strip()}"
            os.replace(tmp, path)
            return None
        finally:
            tmp.unlink(missing_ok=True)

    with cf.ThreadPoolExecutor(max_workers=TTS_WORKERS) as pool:
        for i, err in enumerate(pool.map(run, todo.items()), 1):
            if err:
                die(f"{tts[0]} failed: {err}")
            if i % 10 == 0:
                print(f"  {i}/{len(todo)}")
    return {lid: p for lid, (_, _, p) in jobs.items()}


def read_pcm(path: Path) -> bytes:
    with wave.open(str(path)) as w:
        if (w.getframerate(), w.getnchannels(), w.getsampwidth()) != (RATE, 1, 2):
            die(f"{path}: expected {RATE}Hz mono 16-bit")
        return w.readframes(w.getnframes())


def mouth_levels(pcm: bytes) -> list[int]:
    """Per 1/MOUTH_FPS s frame: 0 closed, 1 half, 2 open, from RMS normalized to the line."""
    samples = array("h", pcm)
    if sys.byteorder == "big":
        samples.byteswap()
    step = RATE // MOUTH_FPS
    rms = []
    for i in range(0, len(samples), step):
        frame = samples[i:i + step]
        rms.append(math.sqrt(sum(s * s for s in frame) / len(frame)))
    voiced = sorted(r for r in rms if r >= MOUTH_FLOOR)
    # the 90th percentile, so one loud syllable doesn't leave the rest half-closed
    ref = voiced[int(len(voiced) * 0.9)] if voiced else 1.0
    levels, level = [], 0
    for r in rms:
        x = min(r / ref, 1.0) if r >= MOUTH_FLOOR else 0.0
        up = 2 if x >= MOUTH_UP[1] else 1 if x >= MOUTH_UP[0] else 0
        down = 2 if x >= MOUTH_DOWN[1] else 1 if x >= MOUTH_DOWN[0] else 0
        level = up if up > level else down if down < level else level
        levels.append(level)
    return drop_blips(levels)


def drop_blips(levels: list[int]) -> list[int]:
    """Merge every one-frame run into its neighbour (the previous run, or the next at the start)."""
    runs: list[list[int]] = []
    for v in levels:
        if runs and runs[-1][0] == v:
            runs[-1][1] += 1
        else:
            runs.append([v, 1])
    merged: list[list[int]] = []
    for i, (v, n) in enumerate(runs):
        if n == 1 and len(runs) > 1:
            v = merged[-1][0] if merged else runs[i + 1][0]
        if merged and merged[-1][0] == v:
            merged[-1][1] += n
        else:
            merged.append([v, n])
    return [v for v, n in merged for _ in range(n)]


def assemble(lines: list[dict], wavs: dict[str, Path], out_wav: Path) -> list[dict]:
    pcm = bytearray(b"\0\0" * int(LEAD_IN * RATE))
    timed = []
    for ln in lines:
        data = read_pcm(wavs[ln["id"]])
        start = len(pcm) / 2 / RATE
        pcm += data
        end = len(pcm) / 2 / RATE
        pcm += b"\0\0" * int(ln["pause"] * RATE)
        item = {**ln, "start": round(start, 3), "end": round(end, 3)}
        if "who" in ln:
            item["mouth"] = "".join(map(str, mouth_levels(data)))
        timed.append(item)
    with wave.open(str(out_wav), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(pcm))
    return timed


def encode(raw_wav: Path, out_m4a: Path, bitrate: str) -> None:
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    probe = subprocess.run(
        [ff, "-hide_banner", "-i", str(raw_wav), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    m = json.loads(probe[probe.rindex("{"):probe.rindex("}") + 1])
    af = (
        "loudnorm=I=-16:TP=-1.5:LRA=11:linear=true"
        f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
        f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}"
    )
    subprocess.run(
        [ff, "-hide_banner", "-loglevel", "error", "-y", "-i", str(raw_wav), "-af", af,
         "-ar", str(RATE), "-ac", "1", "-c:a", "aac", "-b:a", bitrate, str(out_m4a)],
        check=True,
    )


# ---------- captions ----------

def caption_chunks(text: str) -> list[str]:
    """The text cut at BudouX phrase boundaries into cues of at most CAPTION_MAX chars."""
    chunks, cur = [], []
    for p in parser_ja.parse(text):
        if cur and len("".join(cur + [p])) > CAPTION_MAX:
            chunks.append("".join(cur))
            cur = []
        cur.append(p)
    chunks.append("".join(cur))
    return chunks


def cues_for(line: dict) -> list[dict]:
    chunks = caption_chunks(line["text"])
    total = sum(len(c) for c in chunks)
    t, span = line["start"], line["end"] - line["start"]
    out = []
    for c in chunks:
        d = span * len(c) / total
        out.append({"start": round(t, 3), "end": round(t + d, 3), "text": c, "html": wbr(c)})
        t += d
    return out


def vtt_time(s: float) -> str:
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{sec:06.3f}"


def write_vtt(timed: list[dict], path: Path) -> None:
    out = ["WEBVTT", ""]
    for ln in timed:
        for i, c in enumerate(ln["cues"]):
            out += [f"{ln['id']}-{i}", f"{vtt_time(c['start'])} --> {vtt_time(c['end'])}", c["text"], ""]
    path.write_text("\n".join(out))


# ---------- page ----------

def timeline(script: dict, timed: list[dict], duration: float) -> dict:
    chapters, scenes = [], []
    for ln in timed:
        if not chapters or chapters[-1]["id"] != ln["chapter"]:
            ch = next(c for c in script["chapters"] if c["id"] == ln["chapter"])
            chapters.append({"id": ch["id"], "title": ch["title"], "start": ln["start"]})
        if not scenes or scenes[-1]["id"] != ln["scene"]:
            scenes.append({"id": ln["scene"], "chapter": ln["chapter"], "kind": ln["kind"], "start": ln["start"]})
    for seq in (chapters, scenes):
        for a, b in zip(seq, seq[1:] + [None]):
            a["end"] = b["start"] if b else duration
    keys = ("id", "scene", "chapter", "idx", "text", "start", "end", "cues", "who", "face", "style_id", "mouth")
    lines = [{k: ln[k] for k in keys if k in ln} for ln in timed]
    return {"duration": duration, "chapters": chapters, "scenes": scenes, "lines": lines}


# Words a caption never breaks inside: BudouX splits some names (ずんだも|ん). Extended per project
# with the cast's names and the readings' surfaces.
KEEP_WHOLE = {"ずんだもん", "四国めたん", "めたん"}


def wbr(text: str) -> str:
    """Escape and allow line breaks only between BudouX phrases, never inside a KEEP_WHOLE word."""
    cuts, pos = [], 0
    for phrase in parser_ja.parse(text)[:-1]:
        pos += len(phrase)
        cuts.append(pos)
    inside = set()
    for word in KEEP_WHOLE:
        i = text.find(word)
        while i >= 0:
            inside.update(range(i + 1, i + len(word)))
            i = text.find(word, i + 1)
    out, last = [], 0
    for cut in cuts:
        if cut not in inside:
            out.append(text[last:cut])
            last = cut
    out.append(text[last:])
    return "<wbr>".join(html.escape(p) for p in out)


def quiz_section(scene_id: str, timed: list[dict]) -> str:
    q, a = [ln for ln in timed if ln["scene"] == scene_id]
    return (
        f'<section class="scene ev-quiz" data-scene="{scene_id}">'
        '<div class="ev-quiz-kicker">止めて考える</div>'
        f'<div class="ev-quiz-q">{wbr(q["text"])}</div>'
        '<div class="ev-quiz-bar"><i></i></div>'
        f'<div class="ev-quiz-a" data-at="1">{wbr(a["text"])}</div>'
        "</section>"
    )


def resolve_voices(cast: list[dict], lines: list[dict]) -> list[dict]:
    """Give each line its style id and return the engine's speakers (none for the bundled single narrator)."""
    b = backend()
    # a VOICEVOX narrator from another command or from files is named, never left to that engine's default voice
    need = bool(cast) or (licensed() and b["kind"] in ("cmd", "files"))
    if not need:
        return []
    try:
        speakers = list_speakers()
    except (OSError, RuntimeError, ValueError) as e:
        die(f"speaker list failed: {e}")
    styles = style_ids(speakers)
    if not cast:
        sid = styles.get(("ずんだもん", "ノーマル"))
        if sid is None:
            die("the speaker list has no ずんだもん ノーマル style")
        for ln in lines:
            ln["style_id"] = sid
        return speakers
    errs = cast_errors(lines, cast, styles)
    if errs:
        die("\n".join(errs))
    speaker_of = {m["id"]: m["speaker"] for m in cast}
    for ln in lines:
        ln["style_id"] = styles[(speaker_of[ln["who"]], ln["style"])]
    return speakers


def make_unit(root: Path, uid: str, out: Path, bitrate: str) -> dict:
    """Synthesize, time and caption the video; write the unit bundle to `out` and return unit.json."""
    script, readings, cast, lines = load_project(root)
    if errs := source_errors(script.get("sources", [])) + claim_errors(script, lines) + assumes_errors(script):
        die("\n".join(errs))
    credit = narration_credit(script) if not cast else None
    speakers = resolve_voices(cast, lines)
    terms = terms_for(script, cast, lines, speakers)
    out.mkdir(parents=True, exist_ok=True)
    wavs = synth(lines, readings, TTS_CACHE, float(script.get("speed", 1.0)))
    timed = assemble(lines, wavs, out / "narration.raw.wav")
    duration = round(timed[-1]["end"] + timed[-1]["pause"], 3)
    for ln in timed:
        ln["cues"] = cues_for(ln)
    encode(out / "narration.raw.wav", out / "narration.m4a", bitrate)
    write_vtt(timed, out / "captions.vtt")
    tl = timeline(script, timed, duration)
    names = {m["id"]: m["name"] for m in cast}

    def said(ln: dict) -> str:
        return f"{names[ln['who']]}: {ln['text']}" if cast else ln["text"]

    (out / "transcript.md").write_text("\n\n".join(
        f"## {c['title']}\n\n" + "\n".join(said(ln) for ln in timed if ln["chapter"] == c["id"]) for c in tl["chapters"]))

    scenes_html = out_implies_at((root / "scenes.html").read_text())
    declared = set(attr_values(scenes_html, "data-scene")["data-scene"])
    wanted = {s["id"] for s in tl["scenes"] if s["kind"] == "scene"}
    if wanted - declared:
        die(f"{root}/scenes.html is missing sections for: {', '.join(sorted(wanted - declared))}")
    if declared - wanted:
        print(f"warn: scenes.html has unused sections: {', '.join(sorted(declared - wanted))}")
    quizzes = "".join(quiz_section(s["id"], timed) for s in tl["scenes"] if s["kind"] == "quiz")
    font_css = ""
    if cast:
        # one family per unit: a course page holds several videos, each with its own subset
        tag = hashlib.sha1(uid.encode()).hexdigest()[:10]
        face = caption_font_css([ln["text"] for ln in timed], f"yes-cap-{tag}")
        if face:
            font_css = f'<style>{face}[data-cap="{tag}"]{{--ev-cap-font:"yes-cap-{tag}"}}</style>\n'
    cap_attr = f' data-cap="{tag}"' if font_css else ""
    (out / "unit.html").write_text(
        f'<div class="su-unit" data-unit="{html.escape(uid)}" data-kind="video"{cap_attr} hidden>\n{font_css}{scenes_html}\n{quizzes}\n</div>\n')
    for f in ("runtime.js", "runtime.css"):
        shutil.copy(SKILL_DIR / f, out / f)
    data = {"title": script.get("title", ""), "kicker": script.get("subtitle", ""), "goals": script.get("goals", []),
            "assumes": script.get("assumes", [])}
    if cast:
        data.update(cast=cast_data(cast, timed), credits=credits_for(timed, cast, speakers),
                    description=script.get("description", ""))
    else:
        data["credit"] = credit
    if script.get("sources"):
        data["sources"] = [{k: s[k] for k in ("title", "url", "note") if s.get(k)} for s in script["sources"]]
    if not cast and licensed():
        # A custom attribution must not replace the bundled narrator's required credit.
        data["credits"] = list(dict.fromkeys([voice_policy("ずんだもん")["credit"], credit]))
    data["usageTerms"] = terms
    data.update(timeline=tl, audio="data:audio/mp4;base64," + base64.b64encode((out / "narration.m4a").read_bytes()).decode())
    unit = {
        "id": uid, "kind": "video", "title": script.get("title", uid), "duration": duration,
        "outline": [{"rest": c["id"], "title": c["title"]} for c in tl["chapters"]],
        "data": data,
    }
    (out / "unit.json").write_text(json.dumps(unit, ensure_ascii=False))
    for w in lint(lines, readings, {ln["id"]: ln["end"] - ln["start"] for ln in timed}) + claim_warnings(script, lines):
        print(f"warn: {w}")
    print(f"{uid}: {duration / 60:.1f} min, {len(timed)} lines")
    return unit


def cast_data(cast: list[dict], timed: list[dict]) -> list[dict]:
    """unit.json cast: art (only the faces the lines use, plus normal) or just name and color."""
    used: dict[str, set[str]] = {}
    for ln in timed:
        used.setdefault(ln["who"], {DEFAULT_FACE}).add(ln["face"])
    if any("char" in m for m in cast):
        sys.path.insert(0, str(SKILL_DIR))
        from characters import cast_entry
    return [cast_entry(m["id"], used.get(m["id"], {DEFAULT_FACE})) if "char" in m
            else {k: m[k] for k in ("id", "name", "color") if m.get(k)} for m in cast]


def standalone_page(unit_dir: Path) -> str:
    """One unit on its own page: the skill's page.html host plus the bundle."""
    unit = json.loads((unit_dir / "unit.json").read_text())
    data = json.dumps({"kind": unit["kind"], "data": unit["data"]}, ensure_ascii=False).replace("</", "<\\/")
    page = (SKILL_DIR / "page.html").read_text()
    for key, val in {
        "__TITLE__": html.escape(unit["title"]),
        "/*__CSS__*/": (unit_dir / "runtime.css").read_text(),
        "/*__JS__*/": (unit_dir / "runtime.js").read_text(),
        "<!--__UNIT__-->": (unit_dir / "unit.html").read_text().replace(" hidden>", ">", 1),
        "/*__DATA__*/null": data,
    }.items():
        if key not in page:
            die(f"page.html lost placeholder {key}")
        page = page.replace(key, val)
    return page


# ---------- commands ----------

def cmd_lint(root: Path) -> None:
    script, readings, cast, lines = load_project(root)
    if errs := source_errors(script.get("sources", [])) + claim_errors(script, lines) + assumes_errors(script):
        die("\n".join(errs))
    if not cast:
        narration_credit(script)
    chars = sum(len(ln["text"]) for ln in lines)
    print(f"{len(lines)} lines, {chars} chars ≈ {chars / 300:.1f} min at 300 chars/min")
    for w in lint(lines, readings) + claim_warnings(script, lines) + assumes_warnings(script):
        print(f"warn: {w}")
    if not cast:
        return
    styles = None
    try:
        styles = style_ids(list_speakers())
    except (OSError, RuntimeError, ValueError) as e:
        print(f"warn: speaker list failed ({e}); style names not checked")
    errs = cast_errors(lines, cast, styles)
    for e in errs:
        print(f"error: {e}")
    if errs:
        sys.exit(1)


def cmd_tts_plan(root: Path) -> None:
    """List every sentence that has no audio yet, with the file the build will read it from."""
    script, readings, cast, lines = load_project(root)
    resolve_voices(cast, lines)
    speed = float(script.get("speed", 1.0))
    TTS_CACHE.mkdir(parents=True, exist_ok=True)
    jobs = synth_jobs(lines, readings, TTS_CACHE, speed)
    speaker_of = {m["id"]: m["speaker"] for m in cast}
    narrator = "ずんだもん" if licensed() else None
    items, seen = [], set()
    for ln in lines:
        spoken, style_id, path = jobs[ln["id"]]
        if path.exists() or path in seen:
            continue
        seen.add(path)
        items.append({"file": str(path), "text": spoken, "speaker": speaker_of.get(ln.get("who"), narrator),
                      "style": ln.get("style", "ノーマル"), "style_id": style_id, "speed": speed})
    plan = {"engine": backend()["engine"], "format": "WAV, 24000 Hz, mono, 16-bit", "items": items}
    out = root / "out" / "tts-plan.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(plan, ensure_ascii=False, indent=1))
    print(f"{len(items)} sentences to synthesize -> {out}")


def cmd_build(root: Path) -> None:
    script = json.loads((root / "script.json").read_text())
    unit_dir = root / "out" / "unit"
    make_unit(root, script.get("id", "main"), unit_dir, script.get("bitrate", "48k"))
    for f in ("captions.vtt", "transcript.md"):
        shutil.copy(unit_dir / f, root / "out" / f)
    shutil.copy(unit_dir / "unit.json", root / "out" / "unit.json")
    page = root / "out" / "video.html"
    page.write_text(standalone_page(unit_dir))
    size = page.stat().st_size
    print(f"page {size / 1e6:.1f} MB -> {page}")


def cmd_shoot(root: Path, at: str, only: set[str] | None) -> None:
    tl = json.loads((root / "out" / "unit.json").read_text())["data"]["timeline"]
    frames = root / "out" / "frames"
    if frames.exists():
        shutil.rmtree(frames)
    frames.mkdir()
    url = (root / "out" / "video.html").resolve().as_uri()
    from playwright.sync_api import sync_playwright

    with sync_playwright() as pw:
        # the installed Chrome: no browser download needed
        browser = pw.chromium.launch(channel=os.environ.get("YES_BROWSER_CHANNEL", "chrome") or None)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.goto(url)
        page.evaluate("document.fonts.ready")
        for s in tl["scenes"]:
            if only and s["id"] not in only:
                continue
            lines = [ln for ln in tl["lines"] if ln["scene"] == s["id"]]
            t = {"start": lines[0]["start"] + 0.3,
                 "mid": lines[len(lines) // 2]["start"] + 0.3,
                 "end": lines[-1]["start"] + 0.3}[at]
            page.evaluate(f"location.hash = 't={t:.2f}&shot'")
            page.wait_for_timeout(900)  # let build transitions finish
            png = frames / f"{s['id']}.png"
            page.screenshot(path=str(png))
            print(png)
        browser.close()


def cmd_check(root: Path) -> None:
    """Drive the built page: maximize and restore, with and without the Fullscreen API; frames in out/frames/_full-*.png."""
    from playwright.sync_api import sync_playwright
    from maximize_check import check_maximize

    tl = json.loads((root / "out" / "unit.json").read_text())["data"]["timeline"]
    url = (root / "out" / "video.html").resolve().as_uri() + f"#t={tl['duration'] / 2:.1f}"
    fails: list[str] = []

    def expect(ok: bool, what: str) -> None:
        print(("ok   " if ok else "FAIL ") + what)
        if not ok:
            fails.append(what)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel=os.environ.get("YES_BROWSER_CHANNEL", "chrome") or None, args=["--autoplay-policy=no-user-gesture-required"])
        check_maximize(browser, url, ".su-unit.ev-video", expect, root / "out" / "frames")
        browser.close()
    if fails:
        die(f"{len(fails)} check(s) failed")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["lint", "build", "shoot", "unit", "check", "tts-plan"])
    ap.add_argument("project", type=Path)
    ap.add_argument("--at", default="end", choices=["start", "mid", "end"])
    ap.add_argument("--only")
    ap.add_argument("--id")
    ap.add_argument("--out", type=Path)
    ap.add_argument("--bitrate", default="48k")
    ap.add_argument("--format", choices=["single", "bundle"], default="single")
    ap.add_argument("--max-bytes", type=int, help="Optional publishing-host HTML size limit")
    a = ap.parse_args()
    root = a.project.resolve()
    if a.cmd == "lint":
        cmd_lint(root)
    elif a.cmd == "build":
        cmd_build(root)
        export(root / "out" / "video.html", a.format, a.max_bytes)
    elif a.cmd == "check":
        cmd_check(root)
    elif a.cmd == "tts-plan":
        cmd_tts_plan(root)
    elif a.cmd == "unit":
        if not (a.id and a.out):
            die("unit needs --id and --out")
        make_unit(root, a.id, a.out.resolve(), a.bitrate)
    else:
        cmd_shoot(root, a.at, set(a.only.split(",")) if a.only else None)


if __name__ == "__main__":
    main()
