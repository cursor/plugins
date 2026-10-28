# /// script
# requires-python = ">=3.11"
# dependencies = ["psd-tools>=1.9", "pillow>=10.1"]
# ///
"""Character art (立ち絵) for dialogue videos: fetch the PSD, export its layers, compose faces.

    uv run characters.py fetch <id>                 # download, verify, export layers (idempotent)
    uv run characters.py sheet <id> [-o out.png]    # contact sheet: every face x mouth + blink

characters/<id>.json defines the source, scale, base layers and faces (see SKILL.md).
The PSD and every exported PNG live under $EV_CHAR_CACHE (default
~/.cache/yes/characters/<id>/) and never in git: the artist allows use
in videos but does not grant redistribution of the material.

build.py imports cast_entry(), which needs only the standard library.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import http.cookiejar
import io
import json
import math
import os
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent
DEFS_DIR = SKILL_DIR / "characters"
CACHE = Path(os.environ.get("EV_CHAR_CACHE", Path.home() / ".cache" / "yes" / "characters"))
REQUIRED_FACES = ("normal", "smile", "surprised", "troubled", "jito", "panic", "think", "angry", "cry")
MOUTH_NAMES = ("closed", "half", "open")


def load_definition(char_id: str) -> dict:
    path = DEFS_DIR / f"{char_id}.json"
    if not path.exists():
        raise SystemExit(f"no character definition: {path}")
    d = json.loads(path.read_text())
    missing = [f for f in REQUIRED_FACES if f not in d["faces"]]
    if missing:
        raise SystemExit(f"{path.name}: missing faces {missing}")
    for key in ("side", "facing"):
        if d.get(key) not in ("left", "right"):
            raise SystemExit(f'{path.name}: {key} must be "left" or "right"')
    for name, face in d["faces"].items():
        if "mouth" in face and len(face["mouth"]) != 3:
            raise SystemExit(f"{path.name}: face {name}: mouth must be [closed, half, open]")
    return d


def char_dir(char_id: str) -> Path:
    return CACHE / char_id


def scale_key(scale: float) -> str:
    return f"{scale:g}"


def read_json(path: Path) -> dict | None:
    return json.loads(path.read_text()) if path.exists() else None


def write_json(path: Path, data) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    tmp.replace(path)


# ---------- fetch: download -> extract -> export -> scale ----------


def md5_of(path: Path) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download_getuploader(url: str, password: str, dest: Path) -> None:
    """getuploader serves a file only after a cookie, a password POST and a token POST."""
    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    opener.addheaders = [("User-Agent", "Mozilla/5.0 (video characters.py)")]

    def post(fields: dict) -> str:
        body = urllib.parse.urlencode(fields).encode()
        with opener.open(urllib.request.Request(url, data=body, headers={"Referer": url}), timeout=60) as r:
            return r.read().decode("utf-8", "replace")

    with opener.open(url, timeout=60) as r:
        r.read()
    page = post({"password": password, "yes": "認証"})
    m = re.search(r'name="token"\s+value="([^"]+)"', page)
    if not m:
        raise SystemExit(f"getuploader: no token after password POST to {url} (wrong password?)")
    page = post({"token": m.group(1), "yes": "ダウンロード"})
    m = re.search(r'https://downloadx\.getuploader\.com/[^"\'<\s]+', page)
    if not m:
        raise SystemExit(f"getuploader: no download URL after token POST to {url}")
    file_url = html.unescape(m.group(0))
    part = dest.with_suffix(".part")
    print(
        f"downloading {urllib.parse.unquote(file_url.rsplit('/', 1)[-1])} (the uploader is slow, ~40 KB/s)",
        file=sys.stderr,
    )
    with (
        opener.open(urllib.request.Request(file_url, headers={"Referer": url}), timeout=600) as r,
        part.open("wb") as f,
    ):
        shutil.copyfileobj(r, f)
    part.replace(dest)


def zip_member_name(info: zipfile.ZipInfo) -> str:
    # the zips store CP932 names without the UTF-8 flag; zipfile decodes them as CP437
    if info.flag_bits & 0x800:
        return info.filename
    return info.filename.encode("cp437").decode("cp932")


def extract_psd(zip_path: Path, psd_name: str, dest: Path) -> None:
    with zipfile.ZipFile(zip_path) as z:
        for info in z.infolist():
            if Path(zip_member_name(info)).name == psd_name:
                with z.open(info) as src, dest.open("wb") as out:
                    shutil.copyfileobj(src, out)
                return
        names = [zip_member_name(i) for i in z.infolist()]
    raise SystemExit(f"{psd_name} not in {zip_path.name}: {names}")


def css_blend(mode) -> str:
    name = str(getattr(mode, "name", mode)).lower()
    return "normal" if name in ("normal", "pass_through") else name.replace("_", "-")


def export_layers(psd_path: Path, out: Path) -> dict:
    from psd_tools import PSDImage

    psd = PSDImage.open(psd_path)
    layers_dir = out / "layers"
    shutil.rmtree(layers_dir, ignore_errors=True)
    layers_dir.mkdir(parents=True)
    layers, seen = [], set()
    for layer in psd.descendants():  # bottom to top: list order is paint order
        if layer.is_group():
            continue
        chain, node, opacity = [], layer, 1.0
        while node is not None and node is not psd:
            chain.append(node.name)
            opacity *= node.opacity / 255
            node = node.parent
        path = "/".join(reversed(chain))
        if path in seen:
            raise SystemExit(f"duplicate layer path {path!r}")
        seen.add(path)
        img = layer.topil()
        if img is None or layer.bbox[2] <= layer.bbox[0]:
            continue
        file = f"layers/{len(layers):03d}.png"
        img.convert("RGBA").save(out / file, optimize=True)
        layers.append(
            {
                "path": path,
                "file": file,
                "bbox": list(layer.bbox),
                "blend": css_blend(layer.blend_mode),
                "opacity": round(opacity, 4),
            }
        )
    return {"canvas": [psd.width, psd.height], "layers": layers}


def scale_layers(out: Path, manifest: dict, scale: float) -> None:
    """Resample every layer onto the scaled pixel grid, keeping sub-pixel registration.

    Rounding each layer's position independently would shift mouths and eyes by up to a
    pixel against the face; sampling each output box from the exact source rectangle keeps
    every part registered.
    """
    from PIL import Image

    dest = out / "scaled" / scale_key(scale)
    shutil.rmtree(dest, ignore_errors=True)
    dest.mkdir(parents=True)
    pad = math.ceil(1 / scale) + 2
    layers = []
    for i, ly in enumerate(manifest["layers"]):
        img = Image.open(out / ly["file"]).convert("RGBA")
        left, top, right, bottom = ly["bbox"]
        x0, y0 = math.floor(left * scale), math.floor(top * scale)
        x1, y1 = math.ceil(right * scale), math.ceil(bottom * scale)
        src = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad))
        src.paste(img, (pad, pad))
        box = (x0 / scale - left + pad, y0 / scale - top + pad, x1 / scale - left + pad, y1 / scale - top + pad)
        small = src.resize((x1 - x0, y1 - y0), Image.Resampling.LANCZOS, box=box)
        if ly["opacity"] < 1:
            small.putalpha(small.getchannel("A").point(lambda a, o=ly["opacity"]: round(a * o)))
        file = f"{i:03d}.png"
        small.save(dest / file, optimize=True)
        layers.append(
            {"path": ly["path"], "file": file, "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0, "blend": ly["blend"]}
        )
    write_json(dest / "manifest.json", {"scale": scale, "layers": layers})


def fetch(char_id: str) -> Path:
    d = load_definition(char_id)
    src = d["source"]
    out = char_dir(char_id)
    out.mkdir(parents=True, exist_ok=True)
    manifest = read_json(out / "manifest.json")
    if not (manifest and manifest["md5"] == src["md5"] and manifest["psd"] == src["psd"]):
        zip_path = out / "source.zip"
        if not (zip_path.exists() and md5_of(zip_path) == src["md5"]):
            download_getuploader(src["url"], src["password"], zip_path)
            got = md5_of(zip_path)
            if got != src["md5"]:
                zip_path.unlink()
                raise SystemExit(f"{char_id}: MD5 mismatch: got {got}, expected {src['md5']}")
        psd_path = out / src["psd"]
        extract_psd(zip_path, src["psd"], psd_path)
        print(f"exporting layers of {src['psd']}", file=sys.stderr)
        manifest = {"md5": src["md5"], "psd": src["psd"], **export_layers(psd_path, out)}
        shutil.rmtree(out / "scaled", ignore_errors=True)
        write_json(out / "manifest.json", manifest)
    if not (out / "scaled" / scale_key(d["scale"]) / "manifest.json").exists():
        print(f"scaling layers to {d['scale']:g}", file=sys.stderr)
        scale_layers(out, manifest, d["scale"])
    return out


def is_fetched(d: dict) -> bool:
    out = char_dir(d["id"])
    manifest = read_json(out / "manifest.json")
    return bool(
        manifest
        and manifest["md5"] == d["source"]["md5"]
        and manifest["psd"] == d["source"]["psd"]
        and (out / "scaled" / scale_key(d["scale"]) / "manifest.json").exists()
    )


# ---------- faces ----------


def excludes(chosen: list[str], path: str) -> bool:
    """True when showing `chosen` hides `path` under the PSDTool rule.

    Every `*` segment of a chosen path picks one radio option, which hides that option's
    `*` siblings and everything under them; `!` siblings (めたん's `!黒目`) stay.
    """
    ps = path.split("/")
    for c in chosen:
        if c == path:
            return True
        cs = c.split("/")
        for i, seg in enumerate(cs):
            if seg.startswith("*") and len(ps) > i and ps[:i] == cs[:i] and ps[i].startswith("*") and ps[i] != seg:
                return True
    return False


def blink_group(blink: str) -> str:
    return blink.rpartition("/")[0] + "/"


def resolve_face(faces: dict, name: str) -> dict:
    face, normal = faces[name], faces["normal"]
    own = list(face.get("layers", []))
    layers = own + [p for p in normal["layers"] if not excludes(own, p)]
    return {
        "layers": layers,
        "mouth": list(face.get("mouth", normal["mouth"])),
        "blink": face["blink"] if "blink" in face else normal["blink"],
    }


def cast_entry(char_id: str, faces: set[str]) -> dict:
    """The unit's `cast` object for one character, embedding only the layers `faces` use.

    `layers` is in paint order (bottom first); a renderer draws the active set in that key
    order. A blink shows `blink` in place of every face layer under its group (the path
    prefix `blink_group(blink)`). `facing` is the way the art looks as drawn, seen by the
    viewer; the renderer mirrors a character whose `facing` points away from the stage centre.
    """
    d = load_definition(char_id)
    unknown = set(faces) - set(d["faces"])
    if unknown:
        raise ValueError(f"{char_id}: unknown faces {sorted(unknown)}; defined: {sorted(d['faces'])}")
    if not is_fetched(d):
        subprocess.run(["uv", "run", "--quiet", str(Path(__file__).resolve()), "fetch", char_id], check=True)
    scaled_dir = char_dir(char_id) / "scaled" / scale_key(d["scale"])
    by_path = {ly["path"]: ly for ly in json.loads((scaled_dir / "manifest.json").read_text())["layers"]}
    order = {p: i for i, p in enumerate(by_path)}

    def known(paths):
        bad = [p for p in paths if p is not None and p not in by_path]
        if bad:
            raise ValueError(f"{char_id}: layers not in {d['source']['psd']}: {bad}")
        return [p for p in paths if p is not None]

    def faces_paths(face):
        return [*face["layers"], *face["mouth"], face["blink"]]

    resolved_all = {n: resolve_face(d["faces"], n) for n in d["faces"]}
    # the canvas spans every layer the definition can show, so it is identical in every video
    every = known(d["base"]) + [p for f in resolved_all.values() for p in known(faces_paths(f))]
    left = min(by_path[p]["x"] for p in every)
    top = min(by_path[p]["y"] for p in every)
    right = max(by_path[p]["x"] + by_path[p]["w"] for p in every)
    bottom = max(by_path[p]["y"] + by_path[p]["h"] for p in every)

    for n, f in resolved_all.items():
        if f["blink"] and {p for p in f["layers"] if p.startswith(blink_group(f["blink"]))} != {
            p for p in f["layers"] if excludes([f["blink"]], p)
        }:
            raise ValueError(
                f"{char_id}: face {n}: blink {f['blink']} must be a `*` option whose group holds the face's eye layers"
            )

    chosen = {n: resolved_all[n] for n in sorted(set(faces) | {"normal"}, key=list(d["faces"]).index)}
    used = set(d["base"]) | {p for f in chosen.values() for p in known(faces_paths(f))}
    layers = {}
    for path in sorted(used, key=order.__getitem__):
        ly = by_path[path]
        png = (scaled_dir / ly["file"]).read_bytes()
        layers[path] = {
            "x": ly["x"] - left,
            "y": ly["y"] - top,
            "w": ly["w"],
            "h": ly["h"],
            "src": "data:image/png;base64," + base64.b64encode(png).decode(),
            "blend": ly["blend"],
        }
    return {
        "id": d["id"],
        "name": d["name"],
        "color": d["color"],
        "side": d["side"],
        "facing": d["facing"],
        "canvas": [right - left, bottom - top],
        "layers": layers,
        "base": sorted(d["base"], key=order.__getitem__),
        "faces": {n: {**f, "layers": sorted(f["layers"], key=order.__getitem__)} for n, f in chosen.items()},
    }


# ---------- contact sheet ----------


def compose(entry: dict, face: str, mouth: int, blink: bool):
    from PIL import Image, ImageChops

    f = entry["faces"][face]
    face_layers = f["layers"]
    if blink and f["blink"]:
        face_layers = [p for p in face_layers if not p.startswith(blink_group(f["blink"]))] + [f["blink"]]
    active = set(entry["base"]) | set(face_layers) | {f["mouth"][mouth]}
    canvas = Image.new("RGBA", tuple(entry["canvas"]))
    for path, ly in entry["layers"].items():
        if path not in active:
            continue
        img = Image.open(io.BytesIO(base64.b64decode(ly["src"].split(",", 1)[1]))).convert("RGBA")
        if ly["blend"] == "multiply":
            box = (ly["x"], ly["y"], ly["x"] + ly["w"], ly["y"] + ly["h"])
            under = canvas.crop(box)
            mixed = ImageChops.multiply(under.convert("RGB"), img.convert("RGB")).convert("RGBA")
            mixed.putalpha(under.getchannel("A"))
            canvas.paste(Image.composite(mixed, under, img.getchannel("A")), box[:2])
        elif ly["blend"] == "normal":
            canvas.alpha_composite(img, (ly["x"], ly["y"]))
        else:
            raise SystemExit(f"{path}: blend {ly['blend']} not supported by the sheet")
    return canvas


def sheet(char_id: str, out: Path, height: int) -> None:
    from PIL import Image, ImageDraw, ImageFont

    fetch(char_id)
    d = load_definition(char_id)
    entry = cast_entry(char_id, set(d["faces"]))
    cw, ch = entry["canvas"]
    cell_w, cell_h = round(cw * height / ch), height
    cols = [*MOUTH_NAMES, "blink"]
    label_w, head_h, gap = 130, 34, 6
    font = ImageFont.load_default(size=20)
    W = label_w + len(cols) * (cell_w + gap)
    H = head_h + len(entry["faces"]) * (cell_h + gap)
    sheet_img = Image.new("RGBA", (W, H), "#d8dce2")
    draw = ImageDraw.Draw(sheet_img)
    for c, name in enumerate(cols):
        draw.text((label_w + c * (cell_w + gap) + 8, 8), name, fill="#222", font=font)
    for r, face in enumerate(entry["faces"]):
        y = head_h + r * (cell_h + gap)
        draw.text((8, y + cell_h // 2 - 10), face, fill="#222", font=font)
        for c in range(len(cols)):
            img = compose(entry, face, min(c, 2) if c < 3 else 0, blink=c == 3)
            img = img.resize((cell_w, cell_h), Image.Resampling.LANCZOS)
            x = label_w + c * (cell_w + gap)
            sheet_img.paste("#f4f5f7", (x, y, x + cell_w, y + cell_h))
            sheet_img.alpha_composite(img, (x, y))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet_img.convert("RGB").save(out)
    print(out)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("fetch").add_argument("id")
    p = sub.add_parser("sheet")
    p.add_argument("id")
    p.add_argument("-o", "--out", type=Path)
    p.add_argument("--height", type=int, default=320, help="cell height in px (default 320, the on-stage size)")
    a = ap.parse_args()
    if a.cmd == "fetch":
        print(fetch(a.id))
    else:
        sheet(a.id, a.out or char_dir(a.id) / "sheet.png", a.height)


if __name__ == "__main__":
    main()
