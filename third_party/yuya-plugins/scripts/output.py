"""Portable HTML output profiles shared by the YES builders."""
from __future__ import annotations
import base64
import hashlib
from pathlib import Path
import re

DATA = re.compile(r'data:(audio/mp4|audio/wav|image/png|image/jpeg|image/webp);base64,([A-Za-z0-9+/=]+)')
EXT = {'audio/mp4':'m4a', 'audio/wav':'wav', 'image/png':'png', 'image/jpeg':'jpg', 'image/webp':'webp'}


def export(page: Path, profile: str = 'single', max_bytes: int | None = None) -> Path:
    """Keep single HTML, or externalize embedded media into a relocatable bundle."""
    text = page.read_text(encoding='utf-8')
    target = page
    if profile == 'bundle':
        dest = page.parent / (page.stem + '-bundle')
        assets = dest / 'assets'
        assets.mkdir(parents=True, exist_ok=True)
        def replace(match):
            mime, encoded = match.groups()
            content = base64.b64decode(encoded, validate=True)
            name = hashlib.sha256(content).hexdigest()[:24] + '.' + EXT[mime]
            (assets / name).write_bytes(content)
            return 'assets/' + name
        target = dest / 'index.html'
        target.write_text(DATA.sub(replace, text), encoding='utf-8')
    elif profile != 'single':
        raise ValueError(f'Unknown profile: {profile}')
    if max_bytes is not None and target.stat().st_size > max_bytes:
        raise ValueError(f'{target} exceeds the selected host limit ({max_bytes} bytes).')
    print(f'output: {target}')
    return target
