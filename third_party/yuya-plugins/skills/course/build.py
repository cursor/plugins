# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright>=1.50"]
# ///
"""Assemble a MOOC-style course page from YESUnits units built by sibling skills.

    uv run build.py build <course dir>   # build every unit via its skill, then out/course.html
    uv run build.py shoot <course dir>   # out/frames: home, every unit's first view
    uv run build.py check <course dir>   # e2e in headless Chrome: quiz, review, resume, playback, versions, maximize

<course>/course.json:
  {"title", "subtitle", "credit", "bitrate": "32k",
   "lessons": [{"id", "title", "summary", "goals": [...],
                "units": [{"kind": "video", "src": "lessons/ai"}, {"kind": "quiz", "src": "lessons/ai/quiz.json"}]}]}
  A video unit may come in versions the learner switches between, instead of one "src":
    {"kind": "video", "variants": [{"key": "narrator", "label": "ナレーション", "src": "lessons/ai/narrator"},
                                   {"key": "zundamon", "label": "ずんだもん", "src": "lessons/ai/zundamon"}]}
"""

from __future__ import annotations

import argparse
import html
import importlib.util
import json
import os
import re
import subprocess
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SKILL_DIR.parents[1] / "scripts"))
from markup import attr_values
from output import export
SKILLS = SKILL_DIR.parent
# kind -> skill that knows how to build it (each exposes `build.py unit <src> --id --out`)
KINDS = {"video": "video", "quiz": "quiz", "slides": "slides"}
# data-unit of every unit node whose audio is playing (a version's node is <unit>~<key>)
PLAYING = "[...document.querySelectorAll('audio')].filter(a => !a.paused).map(a => a.closest('.su-unit').dataset.unit)"


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def load(root: Path) -> dict:
    course = json.loads((root / "course.json").read_text())
    seen = set()
    for les in course["lessons"]:
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", les["id"]):
            die(f"lesson id {les['id']!r}: use lowercase letters, digits and hyphens")
        counts: dict[str, int] = {}
        for u in les["units"]:
            if u["kind"] not in KINDS:
                die(f"{les['id']}: unknown unit kind {u['kind']!r} (known: {', '.join(KINDS)})")
            counts[u["kind"]] = counts.get(u["kind"], 0) + 1
            u.setdefault("id", f"{les['id']}-{u['kind']}" + (str(counts[u["kind"]]) if counts[u["kind"]] > 1 else ""))
            if u["id"] in seen:
                die(f"unit id {u['id']!r} is used twice")
            seen.add(u["id"])
            if "variants" in u:
                check_variants(les["id"], u)
    return course


def check_variants(lesson: str, u: dict) -> None:
    where = f"{lesson}: unit {u['id']}"
    if u["kind"] != "video":
        die(f"{where}: only video units have variants")
    if "src" in u:
        die(f"{where}: give either src or variants, not both")
    vs = u["variants"]
    if not isinstance(vs, list) or len(vs) < 2:
        die(f"{where}: variants needs at least two versions")
    keys = set()
    for v in vs:
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", str(v.get("key", ""))):
            die(f"{where}: variant key {v.get('key')!r}: use lowercase letters, digits and hyphens")
        if v["key"] in keys:
            die(f"{where}: variant key {v['key']!r} is used twice")
        if not v.get("label") or not v.get("src"):
            die(f"{where}: variant {v['key']!r} needs label and src")
        keys.add(v["key"])
        # each version is its own unit on the page; the shell addresses it as <unit>~<key>
        v["id"] = f"{u['id']}~{v['key']}"


def shape(tl: dict) -> list[list[int]]:
    """Lines per scene, per chapter: what switching versions maps a position by."""
    return [[sum(1 for ln in tl["lines"] if ln["scene"] == s["id"]) for s in tl["scenes"] if s["chapter"] == c["id"]]
            for c in tl["chapters"]]


def dedupe_blobs(unit_data: dict, min_len: int = 1024) -> tuple[dict, list[str]]:
    """Every data: URI that occurs more than once (立ち絵 layers shared by dialogue units) becomes
    {"$blob": n} into one shared table; the shell puts the strings back before any unit sees its data."""
    counts: dict[str, int] = {}

    def count(v):
        if isinstance(v, str):
            if len(v) >= min_len and v.startswith("data:"):
                counts[v] = counts.get(v, 0) + 1
        elif isinstance(v, dict):
            for x in v.values():
                count(x)
        elif isinstance(v, list):
            for x in v:
                count(x)

    count(unit_data)
    index: dict[str, int] = {}
    blobs: list[str] = []

    def swap(v):
        if isinstance(v, str) and counts.get(v, 0) > 1:
            if v not in index:
                index[v] = len(blobs)
                blobs.append(v)
            return {"$blob": index[v]}
        if isinstance(v, dict):
            return {k: swap(x) for k, x in v.items()}
        if isinstance(v, list):
            return [swap(x) for x in v]
        return v

    return swap(unit_data), blobs


def build_unit(root: Path, u: dict, bitrate: str) -> dict:
    """Build one unit (or one version of a unit: `u` is then the variant with the unit's kind)."""
    out = root / "out" / "units" / u["id"]
    cmd = ["uv", "run", "-q", str(SKILLS / KINDS[u["kind"]] / "build.py"), "unit", str(root / u["src"]), "--id", u["id"], "--out", str(out)]
    if u["kind"] == "video":
        cmd += ["--bitrate", bitrate]
    r = subprocess.run(cmd, text=True)
    if r.returncode != 0:
        die(f"building unit {u['id']} failed")
    return json.loads((out / "unit.json").read_text())


def cmd_build(root: Path, host_scripts: list[Path] = ()) -> None:
    course = load(root)
    bitrate = course.get("bitrate", "32k")
    lessons, unit_data, fragments, css, js = [], {}, [], {}, {}
    n = len(course["lessons"])
    for i, les in enumerate(course["lessons"], 1):
        units = []
        for u in les["units"]:
            built = []
            for part in u.get("variants") or [u]:
                unit = build_unit(root, {**part, "kind": u["kind"]}, bitrate)
                d = unit["data"]
                if u["kind"] == "video":
                    # the lesson, not the video script, names what the learner sees
                    d.update(kicker=f"レッスン {i} / {n}", title=les["title"], goals=les.get("goals", d.get("goals", [])))
                    # A following quiz or other unit still belongs to this lesson.
                    if u is les["units"][-1]:
                        d["endTitle"] = f"レッスン {i} 完了"
                if u["kind"] == "quiz":
                    d["title"] = d.get("title") or f"確認テスト: {les['title']}"
                unit_data[part["id"]] = d
                udir = root / "out" / "units" / part["id"]
                fragments.append((udir / "unit.html").read_text())
                css.setdefault(u["kind"], (udir / "runtime.css").read_text())
                js.setdefault(u["kind"], (udir / "runtime.js").read_text())
                built.append(unit)
            first = built[0]
            entry = {"id": u["id"], "kind": u["kind"], "title": first["title"], "duration": first.get("duration", 0), "outline": first.get("outline", [])}
            if "variants" in u:
                entry["variants"] = [{"key": v["key"], "label": v["label"], "id": v["id"], "duration": b.get("duration", 0), "outline": b.get("outline", [])}
                                     for v, b in zip(u["variants"], built)]
                shapes = [shape(b["data"]["timeline"]) for b in built]
                for v, sh in zip(u["variants"][1:], shapes[1:]):
                    if sh != shapes[0]:
                        print(f"warn: {u['id']}: version {v['key']!r} has another shape (lines per scene per chapter) than "
                              f"{u['variants'][0]['key']!r}; switching between them lands on the chapter's start")
            units.append(entry)
        lessons.append({"id": les["id"], "title": les["title"], "summary": les.get("summary"), "goals": les.get("goals", []), "units": units})

    # units share one page: scene ids and element ids must not collide across them
    for attr in ("data-scene", "id"):
        found: dict[str, int] = {}
        for frag in fragments:
            for v in attr_values(frag, attr)[attr]:
                found[v] = found.get(v, 0) + 1
        dup = sorted(k for k, c in found.items() if c > 1)
        if dup:
            die(f"duplicate {attr} across units: {', '.join(dup[:10])} — prefix them with the lesson id")

    # dialogue videos carry `credits` (every voice plus art); older units a single `credit`
    credits: list[str] = []
    for c in [course.get("credit")] + [c for d in unit_data.values() for c in d.get("credits") or [d.get("credit")]]:
        if c and c not in credits:
            credits.append(c)
    meta = {"title": course["title"], "subtitle": course.get("subtitle"), "credit": course.get("credit"), "credits": credits}
    unit_data, blobs = dedupe_blobs(unit_data)
    data = json.dumps({"meta": meta, "lessons": lessons, "unitData": unit_data, "blobs": blobs}, ensure_ascii=False).replace("</", "<\\/")
    page = (SKILL_DIR / "page.html").read_text()
    for key, val in {
        "__TITLE__": html.escape(course["title"]),
        "/*__SHELL_CSS__*/": (SKILL_DIR / "shell.css").read_text(),
        "/*__UNIT_CSS__*/": "\n".join(css.values()),
        "/*__UNIT_JS__*/": "\n".join(js.values()),
        "<!--__UNITS__-->": "\n".join(fragments),
        "/*__DATA__*/": data,
        "/*__SHELL_JS__*/": (SKILL_DIR / "shell.js").read_text(),
    }.items():
        if key not in page:
            die(f"page.html lost placeholder {key}")
        page = page.replace(key, val)
    if host_scripts:
        # a host's window.YESHost goes right after the charset, before any runtime reads it
        bodies = [Path(f).read_text().replace("</script", "<\\/script") for f in host_scripts]
        inline = "".join(f"<script>\n{body}\n</script>\n" for body in bodies)
        anchor = '<meta charset="utf-8">\n'
        if anchor not in page:
            die("page.html lost its charset meta")
        page = page.replace(anchor, anchor + inline, 1)
    out = root / "out" / "course.html"
    out.write_text(page)
    (root / "out" / "course.json").write_text(json.dumps({"lessons": lessons}, ensure_ascii=False, indent=1))
    transcripts = []
    for les in lessons:
        for u in les["units"]:
            for part in u.get("variants") or [u]:
                t = root / "out" / "units" / part["id"] / "transcript.md"
                if t.exists():
                    label = f" ({part['label']})" if "label" in part else ""
                    transcripts.append(f"# {les['title']}{label}\n\n{t.read_text()}")
    (root / "out" / "transcript.md").write_text("\n\n".join(transcripts))
    total = sum(u["duration"] for les in lessons for u in les["units"])
    size = out.stat().st_size
    shared = f", {len(blobs)} shared images ({sum(map(len, blobs)) / 1e6:.1f} MB)" if blobs else ""
    print(f"{len(lessons)} lessons, {total / 60:.1f} min, page {size / 1e6:.1f} MB{shared} -> {out}")


def browser():
    from playwright.sync_api import sync_playwright
    pw = sync_playwright().start()
    # the installed Chrome: no browser download needed
    return pw, pw.chromium.launch(channel=os.environ.get("YES_BROWSER_CHANNEL", "chrome") or None, args=["--autoplay-policy=no-user-gesture-required"])


def cmd_shoot(root: Path) -> None:
    info = json.loads((root / "out" / "course.json").read_text())
    frames = root / "out" / "frames"
    frames.mkdir(parents=True, exist_ok=True)
    url = (root / "out" / "course.html").resolve().as_uri()
    pw, b = browser()
    for name, vp in (("desktop", {"width": 1280, "height": 800}), ("mobile", {"width": 390, "height": 844})):
        page = b.new_page(viewport=vp)
        page.goto(f"{url}#home")
        page.wait_for_timeout(500)
        page.screenshot(path=str(frames / f"_home-{name}.png"))
        for les in info["lessons"]:
            for u in les["units"]:
                for part in u.get("variants") or [u]:
                    page.evaluate(f"location.hash = {json.dumps(part['id'])}")
                    page.wait_for_timeout(500)
                    page.screenshot(path=str(frames / f"{part['id']}-{name}.png"))
                    if "key" in part:  # a version: also mid-video, where the switch sits over a running stage
                        page.evaluate(f"location.hash = {json.dumps(part['id'] + '/t=' + str(round(part['duration'] / 2, 1)))}")
                        page.wait_for_timeout(700)
                        page.screenshot(path=str(frames / f"{part['id']}-mid-{name}.png"))
        page.close()
    b.close()
    pw.stop()
    print(f"-> {frames}  (scene frames come from each video's own `shoot`)")


def cmd_check(root: Path) -> None:
    """Drive the real page: answer a quiz (one wrong), review it, reload, play a video, switch lessons, resume."""
    course = load(root)
    info = json.loads((root / "out" / "course.json").read_text())
    url = (root / "out" / "course.html").resolve().as_uri()
    quiz_u = next((u for les in info["lessons"] for u in les["units"] if u["kind"] == "quiz"), None)
    video_us = [u for les in info["lessons"] for u in les["units"] if u["kind"] == "video"]
    # the video on screen: a unit's own node, or the node of the version it shows
    def shown_sel(uid: str) -> str:
        return f'.su-unit:not([hidden]):is([data-unit="{uid}"], [data-unit^="{uid}~"])'

    pw, b = browser()
    page = b.new_page(viewport={"width": 1280, "height": 800})
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    fails: list[str] = []

    def expect(ok: bool, what: str) -> None:
        print(("ok   " if ok else "FAIL ") + what)
        if not ok:
            fails.append(what)

    page.goto(f"{url}#home")
    page.wait_for_timeout(400)
    expect(page.locator(".cs-card").count() == len(info["lessons"]), "home lists every lesson")
    if quiz_u:
        src = next(u["src"] for les in course["lessons"] for u in les["units"] if u["id"] == quiz_u["id"])
        qs = json.loads((root / src).read_text())["questions"]
        page.goto(f"{url}#{quiz_u['id']}")
        page.wait_for_timeout(300)
        quiz = page.locator(f'.su-unit[data-unit="{quiz_u["id"]}"]')
        for qi, q in enumerate(qs):
            pick = (q["answer"] + 1) % len(q["choices"]) if qi == 0 else q["answer"]
            quiz.locator(".qz-q").nth(qi).locator(".qz-ch").nth(pick).click()
        expect(f"{len(qs) - 1} / {len(qs)}" in quiz.locator(".qz-result").inner_text(), "quiz scores one wrong answer")
        expect(quiz.locator(".qz-why").first.is_visible(), "quiz shows the explanation")
        page.goto(f"{url}#home")
        page.wait_for_timeout(300)
        expect("復習 (1)" in page.locator(".cs-acts").inner_text(), "home offers the review of 1 missed question")
        page.goto(f"{url}#review")
        page.wait_for_timeout(300)
        stored = page.evaluate("""({unit, answer}) => {
            document.querySelectorAll('#cs-review .qz-q .qz-ch')[answer].click();
            return JSON.parse(localStorage.getItem(`cs:${location.pathname}:u:${unit}`));
        }""", {"unit": quiz_u["id"], "answer": qs[0]["answer"]})
        expect("全問正解" in page.locator("#cs-review .qz-result").inner_text(), "review clears the missed question")
        expect(stored is not None and stored.get("wrong") == [] and stored.get("score") == len(qs) - 1,
               "review result is saved before navigation")
        page.reload()
        page.goto(f"{url}#home")
        page.wait_for_selector(".cs-cards")
        page.wait_for_timeout(400)
        expect("復習" not in page.locator(".cs-acts").inner_text() and f"{len(qs) - 1}/{len(qs)}" in page.locator(".cs-cards").inner_text(),
               "results survive a reload")
    slides_u = next((u for les in info["lessons"] for u in les["units"] if u["kind"] == "slides"), None)
    if slides_u:
        page.goto(f"{url}#{slides_u['id']}")
        page.wait_for_timeout(500)
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(300)
        expect(page.evaluate("location.hash").startswith(f"#{slides_u['id']}/"), "→ advances the deck and writes its position into the hash")
        page.keyboard.press("End")
        page.wait_for_timeout(300)
        for _ in range(40):  # walk the last slide's steps
            if page.locator(f'.su-unit[data-unit="{slides_u["id"]}"] .ss-unit-end').is_visible():
                break
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(120)
        expect(page.locator(f'.su-unit[data-unit="{slides_u["id"]}"] .ss-unit-end').is_visible(), "the deck's end offers the next step")
        page.goto(f"{url}#home")
        page.wait_for_timeout(300)
        expect("✓" in page.locator(".cs-cards").inner_text(), "finishing the deck marks it done")
    if video_us:
        v = video_us[0]
        page.goto(f"{url}#{v['id']}")
        page.wait_for_timeout(400)
        page.keyboard.press("Space")
        page.wait_for_timeout(2500)
        playing = [p.split("~")[0] for p in page.evaluate(PLAYING)]
        expect(playing == [v["id"]], f"space plays {v['id']} only")
        page.keyboard.press("Space")
        page.wait_for_timeout(300)
        expect(re.match(rf"#{re.escape(v['id'])}(~[a-z0-9-]+)?/t=", page.evaluate("location.hash")) is not None, "pausing writes the position into the hash")
        if len(video_us) > 1:
            page.locator(".cs-lesson").nth(1).locator("button").first.click()
            page.wait_for_timeout(300)
            page.keyboard.press("Space")
            page.wait_for_timeout(1500)
            playing = [p.split("~")[0] for p in page.evaluate(PLAYING)]
            expect(len(playing) == 1 and playing[0] != v["id"], "switching lessons stops the previous audio")
        page.locator(".cs-side-title").click()
        page.wait_for_timeout(600)
        expect(page.evaluate("location.hash") == "#home" and "続きから" in page.locator(".cs-acts").inner_text(), "home offers 続きから after watching")
        pair = next(((a, q) for les in info["lessons"] for a, q in zip(les["units"], les["units"][1:])
                     if a["kind"] == "video" and q["kind"] == "quiz"), None)
        if pair:
            vid, quiz_next = pair
            page.goto(f"{url}#{vid['id']}")
            box = page.locator(shown_sel(vid["id"]))
            box.wait_for(state="visible")
            page.wait_for_function("sel => { const a = document.querySelector(sel + ' audio'); return a && Number.isFinite(a.duration); }", arg=shown_sel(vid["id"]))
            box.evaluate("u => { const a = u.querySelector('audio'); a.currentTime = Math.max(0, a.duration - 0.3); a.play(); }")
            end = box.locator(".ev-end")
            end.wait_for(state="visible")
            primary = end.locator(".ev-end-go")
            expect("確認テスト" in end.locator("h1").inner_text(), "the video does not declare the lesson complete before its quiz")
            expect(end.evaluate("e => e.classList.contains('ev-counting')") == (quiz_u is None or quiz_next["id"] != quiz_u["id"]),
                   "only an untaken quiz starts a countdown")
            expect(primary.count() == 1 and "確認テスト" in primary.inner_text(), "a video's end leads to its lesson's quiz")
            if primary.count() == 1:
                primary.click()
                page.wait_for_timeout(300)
                expect(page.evaluate("location.hash") == f"#{quiz_next['id']}", "the end button opens the quiz")
    varied = [u for les in info["lessons"] for u in les["units"] if u.get("variants")]
    if varied:
        check_variants_e2e(b, root, info, varied, expect)
    if video_us:
        check_maximize_e2e(b, root, info, pair, expect)
    if slides_u:
        check_slides_maximize_e2e(b, root, slides_u, expect)
    expect(not errors, f"no page errors {errors[:3]}")
    b.close()
    pw.stop()
    if fails:
        die(f"{len(fails)} check(s) failed")


def check_variants_e2e(b, root: Path, info: dict, varied: list[dict], expect) -> None:
    """Versions of a video: switching keeps the line and the playing state, the choice follows the learner
    into other lessons and across a reload, and finishing either version completes the lesson."""
    url = (root / "out" / "course.html").resolve().as_uri()
    page = b.new_page(viewport={"width": 1280, "height": 800})
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    u = varied[0]
    va, vb = u["variants"][0], u["variants"][1]
    tl = {v["id"]: json.loads((root / "out" / "units" / v["id"] / "unit.json").read_text())["data"]["timeline"]
          for w in varied for v in w["variants"]}

    def pick_line(vid: str) -> tuple[int, int, int, dict]:
        """A line past the first scene and not the first of its scene, so a time-based mapping would miss it."""
        t = tl[vid]
        for ln in t["lines"]:
            if ln["idx"] >= 1 and ln["scene"] != t["scenes"][0]["id"]:
                ci = next(i for i, c in enumerate(t["chapters"]) if c["id"] == ln["chapter"])
                si = [s["id"] for s in t["scenes"] if s["chapter"] == ln["chapter"]].index(ln["scene"])
                return ci, si, ln["idx"], ln
        raise SystemExit(f"{vid}: no line to test switching with")

    def line_of(vid: str, ci: int, si: int, li: int) -> dict:
        t = tl[vid]
        sc = [s for s in t["scenes"] if s["chapter"] == t["chapters"][ci]["id"]][si]
        return next(ln for ln in t["lines"] if ln["scene"] == sc["id"] and ln["idx"] == li)

    def audio_time(vid: str) -> float:
        return page.evaluate(f"document.querySelector('.su-unit[data-unit=\"{vid}\"] audio').currentTime")

    def pressed() -> list[str]:
        return page.evaluate("[...document.querySelectorAll('#cs-variants button[aria-pressed=true]')].map(b => b.dataset.variant)")

    page.goto(f"{url}#{u['id']}")
    page.wait_for_timeout(400)
    expect(page.locator("#cs-variants").is_visible() and page.locator("#cs-variants button").count() == len(u["variants"])
           and pressed() == [va["key"]], f"{u['id']} shows a switch with every version, the first one chosen")
    expect(page.locator(f'.su-unit[data-unit="{va["id"]}"]').is_visible(), "a bare unit link opens the first version")
    # paused on a line: the other version opens on the same line's head, still paused
    ci, si, li, ln = pick_line(va["id"])
    page.goto(f"{url}#{va['id']}/t={ln['start'] + 0.05:.2f}")
    page.wait_for_timeout(400)
    page.locator(f'#cs-variants button[data-variant="{vb["key"]}"]').click()
    page.wait_for_timeout(400)
    want = line_of(vb["id"], ci, si, li)
    got = audio_time(vb["id"])
    expect(abs(got - (want["start"] + 0.01)) < 0.05 and abs(want["start"] - ln["start"]) > 0.05,
           f"switching while paused lands on the same line (chapter {ci}, scene {si}, line {li}) in {vb['key']}: "
           f"{got:.2f}s, line starts {want['start']:.2f}s (was {ln['start']:.2f}s)")
    expect(page.evaluate(PLAYING) == [], "switching while paused stays paused")
    expect(page.evaluate("location.hash").startswith(f"#{vb['id']}/t="), "the hash names the version and its position")
    expect(pressed() == [vb["key"]], "the switch marks the chosen version")
    want_titles = [c["title"] for c in tl[vb["id"]]["chapters"]]
    got_titles = page.locator(".cs-lesson.now .cs-sub button").all_inner_texts()[:len(want_titles)]
    expect(got_titles == want_titles, f"the outline lists the chosen version's chapters {got_titles}")
    # playing: the other version keeps playing from the line
    page.keyboard.press("Space")
    page.wait_for_timeout(300)
    page.locator(f'#cs-variants button[data-variant="{va["key"]}"]').click()
    page.wait_for_timeout(300)
    expect(page.evaluate(PLAYING) == [va["id"]], "switching while playing keeps playing, in the new version only")
    page.keyboard.press("Space")
    page.wait_for_timeout(300)
    # the preference follows into the next lesson and across a reload
    page.locator(f'#cs-variants button[data-variant="{vb["key"]}"]').click()
    page.wait_for_timeout(600)
    if len(varied) > 1:
        w = varied[1]
        page.goto(f"{url}#{w['id']}")
        page.wait_for_timeout(400)
        expect(page.locator(f'.su-unit[data-unit="{w["id"]}~{vb["key"]}"]').is_visible() and pressed() == [vb["key"]],
               f"another lesson opens in the chosen version ({vb['key']})")
        page.reload()
        page.wait_for_timeout(600)
        page.goto(f"{url}#{w['id']}")
        page.wait_for_timeout(400)
        expect(page.locator(f'.su-unit[data-unit="{w["id"]}~{vb["key"]}"]').is_visible(), "the chosen version survives a reload")
        page.goto(f"{url}#home")
        page.wait_for_timeout(400)
        page.locator(".cs-acts .cs-act.primary").click()
        page.wait_for_timeout(400)
        expect(page.evaluate("location.hash").startswith(f"#{u['id']}~{vb['key']}/t="), "続きから reopens the version and position last paused")
    # finishing one version (85 % actually played) completes the unit, and with it a lesson of only that video
    les = next(l for l in info["lessons"] if any(x["id"] == varied[-1]["id"] for x in l["units"]))
    w = varied[-1]
    wv = w["variants"][0]
    audio = f"document.querySelector('.su-unit[data-unit=\"{wv['id']}\"] audio')"
    page.goto(f"{url}#{wv['id']}")
    page.wait_for_timeout(400)
    page.keyboard.press("Space")
    page.wait_for_timeout(200)
    page.evaluate(f"{audio}.playbackRate = 8")
    # stop short of the end: the 'ended' event completes a unit by itself, the 85 % rule is what is checked here
    page.wait_for_function(f"{audio}.currentTime >= {audio}.duration * 0.9", timeout=int(wv["duration"] / 8 * 1000 * 3 + 5000))
    page.evaluate(f"{audio}.pause()")
    page.wait_for_timeout(300)
    page.goto(f"{url}#home")
    page.wait_for_timeout(400)
    card = page.locator(".cs-card").nth(info["lessons"].index(les))
    expect("視聴済み" in card.inner_text() and card.inner_text().count("視聴済み") == 1,
           "the home card shows the video once, watched")
    if all(x["kind"] == "video" for x in les["units"]):
        expect("done" in (card.get_attribute("class") or ""), f"watching one version completes lesson {les['id']}")
    expect(not errors, f"no page errors in the version checks {errors[:3]}")
    page.close()


def check_maximize_e2e(b, root: Path, info: dict, pair, expect) -> None:
    """The video's maximize inside the shell: over the outline and the version switch, out again before the end
    screen moves on, and a version switch after it still plays the right video."""
    spec = importlib.util.spec_from_file_location("maximize_check", SKILLS / KINDS["video"] / "maximize_check.py")
    mx = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mx)
    url = (root / "out" / "course.html").resolve().as_uri()
    u = next((x for les in info["lessons"] for x in les["units"] if x.get("variants")), None) \
        or next(x for les in info["lessons"] for x in les["units"] if x["kind"] == "video")
    part = (u.get("variants") or [u])[0]
    sel = f'.su-unit:not([hidden])[data-unit="{part["id"]}"]'
    mx.check_maximize(b, f"{url}#{part['id']}/t={part['duration'] / 2:.1f}", sel, expect, root / "out" / "frames", "course")

    page = b.new_page(viewport={"width": 1280, "height": 800})
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    fs = "document.fullscreenElement && document.fullscreenElement.dataset.unit"
    if u.get("variants"):
        # the switch sits behind the maximized player; after restoring, switching versions still works
        page.goto(f"{url}#{part['id']}/t={part['duration'] / 2:.1f}")
        page.wait_for_timeout(400)
        bar = page.locator("#cs-variants").bounding_box()
        page.keyboard.press("f")
        page.wait_for_timeout(500)
        hit = page.evaluate(f"(() => {{ const h = document.elementFromPoint({bar['x'] + bar['width'] / 2}, {bar['y'] + bar['height'] / 2}); "
                            f"return h && h.closest('.su-unit') ? h.closest('.su-unit').dataset.unit : null; }})()")
        expect(hit == part["id"], f"the maximized player covers the version switch ({hit})")
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)
        other = u["variants"][1]
        page.locator(f'#cs-variants button[data-variant="{other["key"]}"]').click()
        page.wait_for_timeout(400)
        page.keyboard.press("f")
        page.wait_for_timeout(500)
        expect(page.evaluate(fs) == other["id"], f"after a version switch F maximizes the version on screen ({other['key']})")
        page.keyboard.press("Space")
        page.wait_for_timeout(400)
        expect(page.evaluate(PLAYING) == [other["id"]], "and plays it, only it")
        page.keyboard.press("Space")
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)
    if pair:
        # maximized at the end, the next step leaves fullscreen before it opens the quiz
        v, q = pair
        page.goto(f"{url}#{v['id']}")
        page.wait_for_timeout(400)
        vsel = f'.su-unit:not([hidden]):is([data-unit="{v["id"]}"], [data-unit^="{v["id"]}~"])'
        page.keyboard.press("f")
        page.wait_for_timeout(500)
        expect(bool(page.evaluate(fs)), "the video is maximized before its end")
        page.evaluate(f"document.querySelector({json.dumps(vsel + ' audio')}).dispatchEvent(new Event('ended'))")
        page.wait_for_timeout(300)
        page.locator(f"{vsel} .ev-end-go").click()
        page.wait_for_timeout(500)
        expect(page.evaluate("location.hash") == f"#{q['id']}" and page.evaluate(fs) is None
               and page.locator(".ev-video.ev-full").count() == 0, "the end screen's next step leaves fullscreen, then opens the quiz")
    expect(not errors, f"no page errors in the maximize checks {errors[:3]}")
    page.close()


def check_slides_maximize_e2e(b, root: Path, unit: dict, expect) -> None:
    """A deck's maximize inside the shell: over the outline, out again when the learner leaves the unit or takes
    the next step from the deck's end."""
    spec = importlib.util.spec_from_file_location("slides_maximize_check", SKILLS / KINDS["slides"] / "maximize_check.py")
    mx = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mx)
    url = (root / "out" / "course.html").resolve().as_uri()
    sel = f'.su-unit:not([hidden])[data-unit="{unit["id"]}"]'
    mx.check_maximize(b, f"{url}#{unit['id']}", sel, expect, root / "out" / "frames", "course")

    page = b.new_page(viewport={"width": 1280, "height": 800})
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    maxed = f"document.querySelector('[data-unit=\"{unit['id']}\"]').getAttribute('data-ss-max')"
    page.goto(f"{url}#{unit['id']}")
    page.wait_for_timeout(400)
    page.keyboard.press("f")
    page.wait_for_timeout(500)
    expect(page.evaluate(maxed) == "api", "the deck is maximized before the learner leaves")
    page.evaluate("location.hash = '#home'")
    page.wait_for_timeout(500)
    expect(page.evaluate(maxed) is None and page.evaluate("document.fullscreenElement") is None,
           "leaving the unit leaves fullscreen")
    page.evaluate(f"location.hash = {json.dumps('#' + unit['id'])}")
    page.wait_for_timeout(400)
    page.keyboard.press("End")
    end = page.locator(f"{sel} .ss-unit-end")
    for _ in range(40):  # walk the last slide's steps
        if end.is_visible():
            break
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(120)
    page.keyboard.press("f")
    page.wait_for_timeout(500)
    expect(page.evaluate(maxed) == "api" and end.is_visible(), "the deck's end is reachable while maximized")
    end.locator("button").first.click()
    page.wait_for_timeout(500)
    expect(page.evaluate("location.hash") != f"#{unit['id']}" and page.evaluate(maxed) is None
           and page.evaluate("document.fullscreenElement") is None, "the end's next step leaves fullscreen, then moves on")
    expect(not errors, f"no page errors in the slides maximize checks {errors[:3]}")
    page.close()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["build", "shoot", "check"])
    ap.add_argument("course", type=Path)
    ap.add_argument("--format", choices=["single", "bundle"], default="single")
    ap.add_argument("--max-bytes", type=int, help="Optional publishing-host HTML size limit")
    ap.add_argument("--host-script", type=Path, action="append", default=[],
                    help="JavaScript that defines window.YESHost (storage, link resolution); inlined first in <head>")
    a = ap.parse_args()
    root = a.course.resolve()
    if a.cmd == "build":
        cmd_build(root, [f.resolve() for f in a.host_script])
    else:
        {"shoot": cmd_shoot, "check": cmd_check}[a.cmd](root)
    if a.cmd == "build":
        export(root / "out" / "course.html", a.format, a.max_bytes)


if __name__ == "__main__":
    main()
