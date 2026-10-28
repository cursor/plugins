"""e2e for the player's maximize — F / the button / Esc, the Fullscreen API, and the fill-the-page fallback.

Shared by this skill's `build.py check` (one video page) and course's `build.py check` (a video inside the
course shell), which load this file by path. Needs only a Playwright browser.
"""

from __future__ import annotations

from pathlib import Path

# the fallback: a browser without element fullscreen (iPhone Safari)
NO_FULLSCREEN_API = """
for (const o of [Element.prototype, HTMLElement.prototype])
  for (const k of ['requestFullscreen', 'webkitRequestFullscreen'])
    try { Object.defineProperty(o, k, { value: undefined, configurable: true }); } catch {}
"""
VIEWS = {"desktop": (1280, 800), "desktop-16x9": (1280, 720), "phone-portrait": (390, 844), "phone-landscape": (844, 390)}


def state(page, sel: str) -> dict:
    """Where the shown player is, whether it is the fullscreen element, and what the button says."""
    return page.evaluate(
        """(sel) => { const r = document.querySelector(sel), b = r.getBoundingClientRect();
          const fs = document.fullscreenElement || document.webkitFullscreenElement || null;
          const hit = document.elementFromPoint(8, 8), st = r.querySelector('.ev-stage').getBoundingClientRect();
          const bar = r.querySelector('.ev-controls'), cap = r.querySelector('.ev-stage .ev-cap');
          return { bar: Math.round(bar.getBoundingClientRect().top), barOpacity: +getComputedStyle(bar).opacity,
                   vpBottom: Math.round(r.querySelector('.ev-viewport').getBoundingClientRect().bottom),
                   cap: cap ? Math.round(cap.getBoundingClientRect().bottom) : null,
                   full: r.classList.contains('ev-full'), pseudo: r.classList.contains('ev-pseudo'), api: fs === r,
                   x: b.x, y: b.y, w: b.width, h: b.height, vw: innerWidth, vh: innerHeight, sw: Math.round(st.width),
                   front: !!hit && r.contains(hit),
                   label: r.querySelector('.ev-fs').getAttribute('aria-label') }; }""",
        sel,
    )


def fills(s: dict) -> bool:
    return abs(s["x"]) < 1 and abs(s["y"]) < 1 and abs(s["w"] - s["vw"]) < 1 and abs(s["h"] - s["vh"]) < 1


def check_maximize(browser, url: str, sel: str, expect, frames: Path, label: str = "") -> None:
    """`url` opens the video past its start screen; `sel` matches the shown player's root (.ev-video)."""
    frames.mkdir(parents=True, exist_ok=True)
    tag = f"{label}: " if label else ""
    errors: list[str] = []

    def open_page(view: str, no_api: bool = False):
        w, h = VIEWS[view]
        ctx = browser.new_context(viewport={"width": w, "height": h})
        if no_api:
            ctx.add_init_script(NO_FULLSCREEN_API)
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(url)
        page.wait_for_timeout(500)
        return ctx, page

    def button(page):
        return page.locator(f"{sel} .ev-controls .ev-fs")

    # desktop: F in, Esc out, the button in and out; playback keys still work while maximized
    ctx, page = open_page("desktop")
    s0 = state(page, sel)
    expect(not s0["full"] and s0["label"] == "全画面", f"{tag}the player starts in the page, button says 全画面")
    page.keyboard.press("f")
    page.wait_for_timeout(500)
    s = state(page, sel)
    expect(s["api"] and s["full"] and not s["pseudo"] and fills(s) and s["label"] == "全画面を終了",
           f"{tag}F puts the player in fullscreen over the whole viewport {s}")
    # 16:9 at the largest size the whole screen allows: the controls float over it instead of taking a band
    expect(s["sw"] > s0["sw"] and abs(s["sw"] - min(s["vw"], round(s["vh"] * 16 / 9))) <= 2,
           f"{tag}the stage grows to the screen's limit ({s0['sw']} -> {s['sw']} px)")
    expect(s["bar"] < s["vpBottom"], f"{tag}the controls overlay the picture instead of sitting under it {s}")
    expect(s["front"], f"{tag}nothing of the page shows over the maximized player")
    page.keyboard.press("Space")
    page.wait_for_timeout(400)
    playing = page.evaluate(f"!document.querySelector({sel!r} + ' audio').paused")
    page.keyboard.press("Space")
    page.wait_for_timeout(300)
    expect(playing, f"{tag}Space plays while maximized")
    page.screenshot(path=str(frames / f"_full-desktop{('-' + label) if label else ''}.png"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)
    s = state(page, sel)
    expect(not s["api"] and not s["full"] and s["sw"] == s0["sw"] and s["label"] == "全画面", f"{tag}Esc leaves fullscreen {s}")
    button(page).click()
    page.wait_for_timeout(500)
    s = state(page, sel)
    expect(s["api"] and fills(s), f"{tag}the button maximizes")
    button(page).click()
    page.wait_for_timeout(500)
    s = state(page, sel)
    expect(not s["api"] and not s["full"], f"{tag}the button again restores")
    ctx.close()

    # a 16:9 screen: the stage fills it, the caption clears the visible bar, and both settle once playback idles
    ctx, page = open_page("desktop-16x9")
    page.keyboard.press("f")
    page.wait_for_timeout(600)
    s = state(page, sel)
    expect(s["full"] and s["sw"] == s["vw"], f"{tag}on a 16:9 screen the stage fills it edge to edge {s}")
    expect(s["cap"] is not None and s["cap"] <= s["bar"], f"{tag}the caption sits above the shown controls {s}")
    page.screenshot(path=str(frames / f"_full-16x9{('-' + label) if label else ''}.png"))
    page.keyboard.press("j")
    page.keyboard.press("j")
    page.keyboard.press("Space")
    page.wait_for_timeout(3300)
    i = state(page, sel)
    expect(i["barOpacity"] == 0, f"{tag}playing without input, the controls fade out {i}")
    expect(i["cap"] > s["cap"], f"{tag}with the controls gone, the caption returns to its place ({s['cap']} -> {i['cap']})")
    page.screenshot(path=str(frames / f"_full-16x9-idle{('-' + label) if label else ''}.png"))
    ctx.close()

    # the key help works maximized: it shows on top inside the fullscreen player, holds the controls up while
    # playing, and Esc closes it before it leaves fullscreen
    ctx, page = open_page("desktop")
    page.keyboard.press("f")
    page.wait_for_timeout(500)
    page.keyboard.press("?")
    page.keyboard.press("Space")
    page.wait_for_timeout(3300)
    h = page.evaluate(
        """(sel) => { const r = document.querySelector(sel), pop = r.querySelector('.ev-pop'), b = pop.getBoundingClientRect();
          const hit = b.width ? document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2) : null;
          return { open: !pop.hidden && b.width > 0, top: !!hit && pop.contains(hit), keys: pop.querySelectorAll('kbd').length,
                   playing: !r.querySelector('audio').paused }; }""",
        sel,
    )
    s = state(page, sel)
    expect(s["api"] and h["open"] and h["top"] and h["keys"] >= 10, f"{tag}? opens the key help over the maximized player {h}")
    expect(h["playing"] and s["barOpacity"] == 1, f"{tag}while the help is open the controls stay up during playback {s}")
    page.screenshot(path=str(frames / f"_full-help{('-' + label) if label else ''}.png"))
    page.keyboard.press("Space")
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    s = state(page, sel)
    expect(s["full"] and page.locator(f"{sel} .ev-pop").is_hidden(), f"{tag}Esc closes the help first and stays maximized {s}")
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)
    expect(not state(page, sel)["full"], f"{tag}a second Esc leaves fullscreen")
    ctx.close()

    # phones: the same, looked at upright and sideways
    for view in ("phone-portrait", "phone-landscape"):
        ctx, page = open_page(view)
        button(page).click()
        page.wait_for_timeout(600)
        s = state(page, sel)
        expect(s["full"] and fills(s), f"{tag}{view}: the button maximizes {s}")
        if view == "phone-landscape":
            expect(s["cap"] <= s["bar"], f"{tag}{view}: the caption sits above the shown controls {s}")
        page.screenshot(path=str(frames / f"_full-{view}{('-' + label) if label else ''}.png"))
        ctx.close()

    # no element fullscreen: the player fills the page instead, and leaves the same ways
    ctx, page = open_page("desktop", no_api=True)
    button(page).click()
    page.wait_for_timeout(400)
    s = state(page, sel)
    expect(s["full"] and s["pseudo"] and not s["api"] and fills(s) and s["front"] and s["label"] == "全画面を終了",
           f"{tag}without the Fullscreen API the button fills the page, in front of everything {s}")
    page.screenshot(path=str(frames / f"_full-fallback{('-' + label) if label else ''}.png"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    s = state(page, sel)
    expect(not s["full"] and not s["pseudo"], f"{tag}Esc leaves the filled page {s}")
    page.keyboard.press("f")
    page.wait_for_timeout(300)
    s = state(page, sel)
    expect(s["pseudo"] and fills(s), f"{tag}F fills the page without the API")
    button(page).click()
    page.wait_for_timeout(300)
    expect(not state(page, sel)["full"], f"{tag}the button leaves the filled page")
    ctx.close()

    # the screenshot mode never offers it
    ctx, page = open_page("desktop")
    page.evaluate("location.hash = location.hash.replace(/(t=[\\d.]+)$/, '$1&shot')")
    page.wait_for_timeout(400)
    page.keyboard.press("f")
    page.wait_for_timeout(300)
    s = state(page, sel)
    expect(not s["full"] and not button(page).is_visible(), f"{tag}the shot mode has no maximize")
    ctx.close()
    expect(not errors, f"{tag}no page errors while maximizing {errors[:3]}")
