"""Credit and terms metadata for the pinned VOICEVOX engine, not a grant of rights."""
from __future__ import annotations

SUPPORTED_VOICES = frozenset({"ずんだもん", "四国めたん"})
ENGINE_TERMS = "https://github.com/VOICEVOX/voicevox_resource/blob/0.25.2/engine/README.md"
MODEL_TERMS = "https://github.com/VOICEVOX/voicevox_vvm/blob/0.16.4/README.md"
CURRENT_ENGINE_TERMS = "https://github.com/VOICEVOX/voicevox_resource/blob/main/engine/README.md"
CURRENT_MODEL_TERMS = "https://github.com/VOICEVOX/voicevox_vvm/blob/main/README.md"
VOICE_TERMS = "https://zunko.jp/con_ongen_kiyaku.html"
REUSE_NOTICE = (
    "YESのMITライセンスは音声・キャラクター・立ち絵には適用されません。"
    "音声の再利用は各音源の規約に従い、必要なクレジットを表示してください。"
    "音声の利用を他者に許諾する場合は、その相手にも各音源規約の遵守と、"
    "さらに他者へ許諾する際の同条件の引継ぎを義務付けてください。"
    "この表示自体は、音声や立ち絵の再利用を許諾するものではありません。"
)
REVIEW_NOTE = (
    "Check the current voice terms for your user type, purpose, and publication/distribution format. "
    "Credit alone does not establish permission."
)


def voice_policy(name: str) -> dict:
    if name not in SUPPORTED_VOICES:
        raise ValueError("YES supports only ずんだもん and 四国めたん.")
    return {
        "credit": f"VOICEVOX:{name}",
        "terms_url": VOICE_TERMS,
        "license_notes": [REVIEW_NOTE],
    }


def usage_notice(voices: list[dict], art: list[dict] | None = None, pinned: bool = True) -> dict:
    """`pinned` names the bundled engine's versions; another VOICEVOX engine links the current terms."""
    links = []
    if voices and pinned:
        links += [{"title": "VOICEVOX エンジン利用規約 (0.25.2)", "url": ENGINE_TERMS},
                  {"title": "VOICEVOX 音声モデル利用規約 (0.16.4)", "url": MODEL_TERMS}]
    elif voices:
        links += [{"title": "VOICEVOX エンジン利用規約", "url": CURRENT_ENGINE_TERMS},
                  {"title": "VOICEVOX 音声モデル利用規約", "url": CURRENT_MODEL_TERMS}]
    for voice in voices:
        links.append({"title": f"{voice['name']} 音源利用規約", "url": voice["terms_url"],
                      "note": " ".join(voice.get("license_notes", []))})
    for source in art or []:
        for link in source.get("terms", []):
            if link not in links:
                links.append(link)
        if source.get("url"):
            links.append({"title": source.get("credit", "立ち絵") + " 配布元・同梱README", "url": source["url"]})
    return {"text": REUSE_NOTICE, "links": links}


def audio_notice(speaker: dict) -> str:
    notice = usage_notice([speaker])
    lines = [speaker["credit"], "", notice["text"], ""]
    for link in notice["links"]:
        lines += [f"{link['title']}: {link['url']}", link.get("note", "")]
    lines += ["Display the credit where listeners can find it. For audio-only distribution, "
              "include an appropriate spoken credit or accompanying accessible credit; a detached sidecar alone may not reach listeners."]
    return "\n".join(lines) + "\n"
