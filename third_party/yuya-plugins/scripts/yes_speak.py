#!/usr/bin/env python3
"""VOICEVOX speech synthesis using a reusable, loopback-only Docker container."""
from __future__ import annotations

import argparse
import http.client
import io
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import wave

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice_licenses import SUPPORTED_VOICES, audio_notice, voice_policy

VERSION = "0.25.2"
IMAGE = "voicevox/voicevox_engine:cpu-ubuntu24.04-0.25.2"
CONTAINER = "yes-voicevox-0-25-2"
LABEL = "org.yuya-takeyama.agent-plugins"
MAX_AUDIO = 64 * 1024 * 1024


class SpeakError(Exception):
    pass


def docker(*args: str, check: bool = True) -> subprocess.CompletedProcess:
    try:
        result = subprocess.run(["docker", *args], capture_output=True, text=True, timeout=600)
    except FileNotFoundError as e:
        raise SpeakError("Docker is not installed or is not on PATH.") from e
    except subprocess.TimeoutExpired as e:
        raise SpeakError("Docker timed out; inspect Docker Desktop or your Docker daemon.") from e
    if check and result.returncode:
        raise SpeakError(result.stderr.strip() or "Docker command failed.")
    return result


def inspect_container() -> dict | None:
    result = docker("container", "inspect", CONTAINER, check=False)
    if result.returncode:
        # Distinguish an absent container from a daemon/permission failure.
        docker("info", "--format", "{{.ServerVersion}}")
        if "No such" not in result.stderr:
            raise SpeakError(result.stderr.strip())
        return None
    return json.loads(result.stdout)[0]


def check_owned(info: dict) -> None:
    config = info.get("Config", {})
    if (config.get("Labels") or {}).get(LABEL) != "yes-speak" or config.get("Image") != IMAGE:
        raise SpeakError(f"Container {CONTAINER} exists but is not managed by this yes-speak version; leave it unchanged.")


def engine_url(info: dict) -> str:
    check_owned(info)
    bindings = (info.get("NetworkSettings", {}).get("Ports", {}).get("50021/tcp") or [])
    if len(bindings) != 1 or bindings[0].get("HostIp") != "127.0.0.1":
        raise SpeakError("Managed container must expose exactly one loopback port for 50021/tcp.")
    port = int(bindings[0]["HostPort"])
    if not 1 <= port <= 65535:
        raise SpeakError("Invalid Docker port binding.")
    return f"http://127.0.0.1:{port}"


def request(url: str, method: str = "GET", data: dict | None = None, *, audio: bool = False, timeout: float = 120):
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method, headers={"Content-Type": "application/json"})
    # Local synthesis must not be sent through an environment proxy.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(req, timeout=timeout) as response:
            limit = MAX_AUDIO if audio else 4 * 1024 * 1024
            value = response.read(limit + 1)
            if len(value) > limit:
                raise SpeakError("VOICEVOX response is too large.")
            return value if audio else json.loads(value)
    except (urllib.error.URLError, http.client.HTTPException, ConnectionError, TimeoutError, ValueError) as e:
        raise SpeakError(f"VOICEVOX request failed: {e}") from e


def wait_ready(url: str, timeout: float) -> None:
    deadline = time.monotonic() + timeout
    while True:
        try:
            version = request(url + "/version", timeout=min(2, timeout))
        except SpeakError:
            if time.monotonic() >= deadline:
                raise SpeakError(f"VOICEVOX did not become ready; inspect `docker logs {CONTAINER}`.")
            time.sleep(0.5)
            continue
        if version != VERSION:
            raise SpeakError(f"Expected VOICEVOX {VERSION}, received {version!r}.")
        return


def ensure_engine(timeout: float = 120) -> str:
    info = inspect_container()
    if info is None:
        print(f"Starting {IMAGE}; Docker downloads the image on first use.", file=sys.stderr)
        result = docker("run", "-d", "--name", CONTAINER, "--label", f"{LABEL}=yes-speak",
                        "-p", "127.0.0.1::50021", IMAGE, check=False)
        info = inspect_container()
        if info is None:
            raise SpeakError(result.stderr.strip() or "Docker did not create the container.")
        # A concurrent sentence may have created the same named container.
    check_owned(info)
    if not info.get("State", {}).get("Running"):
        result = docker("start", CONTAINER, check=False)
        info = inspect_container()
        if info is None:
            raise SpeakError("Container disappeared while starting.")
        check_owned(info)
        if result.returncode and not info.get("State", {}).get("Running"):
            raise SpeakError(result.stderr.strip() or "Docker could not start the container.")
    url = engine_url(info)
    wait_ready(url, timeout)
    return url


def stop_engine() -> None:
    info = inspect_container()
    if info is not None:
        check_owned(info)
        docker("stop", CONTAINER)


def speakers(url: str) -> list[dict]:
    result = [speaker for speaker in request(url + "/speakers") if speaker["name"] in SUPPORTED_VOICES]
    for speaker in result:
        speaker["styles"] = [dict(style, type=style.get("type", "talk")) for style in speaker["styles"]
                             if style.get("type", "talk") == "talk"]
        speaker.update(voice_policy(speaker["name"]))
    return result


def resolve_speaker(value: str, available: list[dict]) -> tuple[int, str]:
    name, _, style_name = value.partition("/")
    for speaker in available:
        if speaker["name"] not in SUPPORTED_VOICES:
            continue
        for style in speaker["styles"]:
            if str(style["id"]) == value or (speaker["name"] == name and style["name"] == (style_name or "ノーマル")):
                return style["id"], speaker["credit"]
    raise SpeakError(f"Unsupported speaker/style {value!r}; YES supports only ずんだもん and 四国めたん. Run --list-speakers.")


def validate_wav(data: bytes) -> None:
    try:
        with wave.open(io.BytesIO(data)) as wav:
            if (wav.getframerate(), wav.getnchannels(), wav.getsampwidth()) != (24000, 1, 2):
                raise SpeakError("Expected 24000 Hz mono 16-bit WAV.")
            frames = wav.getnframes()
            if not frames or len(wav.readframes(frames)) != frames * 2:
                raise SpeakError("VOICEVOX returned empty or truncated audio.")
    except (wave.Error, EOFError) as e:
        raise SpeakError("VOICEVOX did not return valid WAV audio.") from e


def synthesize(url: str, text: str, speaker: int, speed: float) -> bytes:
    params = urllib.parse.urlencode({"text": text, "speaker": speaker})
    query = request(url + "/audio_query?" + params, "POST")
    query.update(speedScale=speed, outputSamplingRate=24000, outputStereo=False)
    data = request(url + "/synthesis?" + urllib.parse.urlencode({"speaker": speaker}), "POST", query, audio=True)
    validate_wav(data)
    return data


def save_audio(path: Path, data: bytes, force: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not force:
        with path.open("xb") as file:
            file.write(data)
        return
    temp = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as file:
            temp = Path(file.name)
            file.write(data)
        os.replace(temp, path)
    finally:
        if temp is not None:
            temp.unlink(missing_ok=True)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("text", nargs="?")
    parser.add_argument("--text", dest="explicit_text")
    parser.add_argument("--stdin", action="store_true")
    parser.add_argument("--speaker", default="3", help="ずんだもん or 四国めたん: talk style ID or character/style name")
    parser.add_argument("--speed", type=float, default=1.0)
    parser.add_argument("--output", "-o", type=Path)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--list-speakers", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--start", action="store_true", help="Start or reuse the engine and print its local URL")
    parser.add_argument("--stop", action="store_true", help="Stop only the container managed by YES")
    parser.add_argument("--startup-timeout", type=float, default=120)
    args = parser.parse_args(argv)
    try:
        if not math.isfinite(args.startup_timeout) or args.startup_timeout <= 0:
            raise SpeakError("--startup-timeout must be positive and finite.")
        if sum((args.start, args.stop, args.list_speakers)) > 1:
            raise SpeakError("Choose only one of --start, --stop, --list-speakers.")
        if args.json and not args.list_speakers:
            raise SpeakError("--json requires --list-speakers.")
        if args.stop:
            stop_engine()
            return 0
        if args.start:
            print(ensure_engine(args.startup_timeout))
            return 0
        if args.list_speakers:
            available = speakers(ensure_engine(args.startup_timeout))
            print(json.dumps(available, ensure_ascii=False) if args.json else "\n".join(
                f"{style['id']}\t{sp['name']}/{style['name']}\t{sp['credit']}\t{sp['terms_url']}\t{' '.join(sp['license_notes'])}"
                for sp in available for style in sp['styles']))
            return 0
        if sum((args.text is not None, args.explicit_text is not None, args.stdin)) != 1:
            raise SpeakError("Supply exactly one text argument, --text, or --stdin.")
        text = sys.stdin.read() if args.stdin else (args.explicit_text if args.explicit_text is not None else args.text)
        if not text.strip() or len(text) > 5000:
            raise SpeakError("Text must contain 1–5000 characters; split long narration into sentences.")
        if not math.isfinite(args.speed) or not 0.5 <= args.speed <= 2:
            raise SpeakError("--speed must be between 0.5 and 2.")
        if args.output is None:
            raise SpeakError("Specify --output FILE.wav.")
        notice_path = args.output.with_name(args.output.name + ".license.txt")
        for path in (args.output, notice_path):
            if path.exists() and not args.force:
                raise SpeakError(f"Output exists: {path}; use --force to replace it.")
        url = ensure_engine(args.startup_timeout)
        available = speakers(url)
        speaker, credit = resolve_speaker(args.speaker, available)
        selected = next(sp for sp in available if any(style["id"] == speaker for style in sp["styles"]))
        for note in selected["license_notes"]:
            print(f"{note} {selected['terms_url']}", file=sys.stderr)
        audio = synthesize(url, text, speaker, args.speed)
        # Write the notice first so a successful audio write has its terms alongside it.
        save_audio(notice_path, audio_notice(selected).encode("utf-8"), args.force)
        save_audio(args.output, audio, args.force)
        print(credit, file=sys.stderr)
        print(f"License notice: {notice_path}", file=sys.stderr)
        print(args.output)
        return 0
    except (SpeakError, OSError, ValueError, KeyError, TypeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
