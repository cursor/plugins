"""e2e for a deck's maximize — F / the button / Esc, the Fullscreen API, the fill-the-window fallback, and the bar
floating over the stage until it fades.

Used by tests/smoke.py (a standalone deck, frame `html`) and course's `build.py check` (a deck inside the course
shell, frame = its unit), which load this file by path. Needs only a Playwright browser.
"""

from __future__ import annotations

from pathlib import Path

# the fallback: a browser without element fullscreen (iPhone Safari); the same script as video/maximize_check.py
NO_FULLSCREEN_API = """
for (const o of [Element.prototype, HTMLElement.prototype])
  for (const k of ['requestFullscreen', 'webkitRequestFullscreen'])
    try { Object.defineProperty(o, k, { value: undefined, configurable: true }); } catch {}
"""
VIEWS = {"desktop": (1280, 800), "phone-portrait": (390, 844), "phone-landscape": (844, 390)}
IDLE_MS = 3200  # the bar fades 2.6 s after the last pointer move, then a .3 s transition


def state(page, sel: str) -> dict:
    """Where the frame and its stage are, whether the frame is the fullscreen element, and what the button says."""
    return page.evaluate(
        """(sel) => { const r = document.querySelector(sel), b = r.getBoundingClientRect();
          const fs = document.fullscreenElement || document.webkitFullscreenElement || null;
          const hit = document.elementFromPoint(8, 8), deck = r.querySelector('.deck'), st = deck.getBoundingClientRect();
          const barEl = r.querySelector('.ss-bar'), bar = barEl.getBoundingClientRect(), fsb = r.querySelector('.ss-bar .ss-fs');
          return { max: r.getAttribute('data-ss-max') || 'off', api: fs === r, immersive: r.hasAttribute('data-ss-immersive'),
                   idle: r.hasAttribute('data-ss-idle'), barOpacity: +getComputedStyle(barEl).opacity,
                   x: b.x, y: b.y, w: b.width, h: b.height, vw: innerWidth, vh: innerHeight,
                   sw: Math.round(st.width), ar: deck.offsetWidth / deck.offsetHeight, stageMid: (st.top + st.bottom) / 2, frameMid: b.y + b.height / 2,
                   barOver: bar.top < st.bottom - 1, front: !!hit && r.contains(hit),
                   button: !!fsb && fsb.getBoundingClientRect().width > 0, label: fsb && fsb.getAttribute('aria-label') }; }""",
        sel,
    )


def fills(s: dict) -> bool:
    return abs(s["x"]) < 1 and abs(s["y"]) < 1 and abs(s["w"] - s["vw"]) < 1 and abs(s["h"] - s["vh"]) < 1


def check_maximize(browser, url: str, sel: str, expect, frames: Path, label: str = "") -> None:
    """`url` opens the deck; `sel` matches its frame (`html` for a standalone deck, the shown unit in a course)."""
    frames.mkdir(parents=True, exist_ok=True)
    tag = f"{label}: " if label else ""
    suffix = f"-{label}" if label else ""
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
        return page.locator(f"{sel} .ss-bar .ss-fs")

    # desktop: F in, Esc out, the button in and out; the bar floats over the full-size stage, then fades
    ctx, page = open_page("desktop")
    s0 = state(page, sel)
    expect(s0["max"] == "off" and s0["label"] == "全画面" and s0["button"], f"{tag}the deck starts in the page, button says 全画面")
    page.keyboard.press("f")
    page.wait_for_timeout(500)
    s = state(page, sel)
    expect(s["api"] and s["max"] == "api" and fills(s) and s["front"] and s["label"] == "全画面を終了",
           f"{tag}F puts the deck's frame in fullscreen over the whole viewport {s}")
    expect(s["sw"] > s0["sw"] and abs(s["sw"] - min(s["vw"], s["vh"] * s["ar"])) <= 2,
           f"{tag}the stage grows to the screen's limit ({s0['sw']} -> {s['sw']} px)")
    expect(s["immersive"] and s["barOver"] and abs(s["stageMid"] - s["frameMid"]) < 1,
           f"{tag}the bar floats over the stage instead of taking room from it {s}")
    page.mouse.move(640, 300)
    page.screenshot(path=str(frames / f"_slides-full-desktop{suffix}.png"))
    page.wait_for_timeout(IDLE_MS)
    s = state(page, sel)
    expect(s["idle"] and s["barOpacity"] == 0, f"{tag}the bar fades after a still moment {s}")
    page.screenshot(path=str(frames / f"_slides-full-idle-desktop{suffix}.png"))
    page.mouse.move(600, 320)
    page.wait_for_timeout(400)
    expect(not state(page, sel)["idle"], f"{tag}a pointer move brings the bar back")
    before = page.evaluate("YESSlides.state.slide")
    page.keyboard.press("End")
    page.wait_for_timeout(300)
    expect(page.evaluate("YESSlides.state.slide") > before, f"{tag}navigation keys still work while maximized")
    page.keyboard.press("Escape")
    page.wait_for_timeout(500)
    s = state(page, sel)
    expect(not s["api"] and s["max"] == "off" and s["sw"] == s0["sw"] and s["label"] == "全画面", f"{tag}Esc leaves fullscreen {s}")
    button(page).click()
    page.wait_for_timeout(500)
    s = state(page, sel)
    expect(s["api"] and fills(s), f"{tag}the button maximizes")
    button(page).click()
    page.wait_for_timeout(500)
    s = state(page, sel)
    expect(not s["api"] and s["max"] == "off", f"{tag}the button again restores")
    ctx.close()

    # phones: the button is there and maximizes, upright and sideways
    for view in ("phone-portrait", "phone-landscape"):
        ctx, page = open_page(view)
        expect(state(page, sel)["button"], f"{tag}{view}: the maximize button is shown")
        button(page).click()
        page.wait_for_timeout(600)
        s = state(page, sel)
        expect(s["max"] != "off" and fills(s) and s["front"], f"{tag}{view}: the button maximizes {s}")
        page.screenshot(path=str(frames / f"_slides-full-{view}{suffix}.png"))
        ctx.close()

    # no element fullscreen: the frame fills the window instead, in front of everything, and leaves the same ways
    ctx, page = open_page("desktop", no_api=True)
    button(page).click()
    page.wait_for_timeout(400)
    s = state(page, sel)
    expect(s["max"] == "pseudo" and not s["api"] and fills(s) and s["front"] and s["immersive"] and s["label"] == "全画面を終了",
           f"{tag}without the Fullscreen API the button fills the window, in front of everything {s}")
    expect(abs(s["sw"] - min(s["vw"], s["vh"] * s["ar"])) <= 2, f"{tag}and the stage fills it ({s['sw']} px)")
    page.screenshot(path=str(frames / f"_slides-full-fallback{suffix}.png"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    s = state(page, sel)
    expect(s["max"] == "off", f"{tag}Esc leaves the filled window {s}")
    page.keyboard.press("f")
    page.wait_for_timeout(300)
    s = state(page, sel)
    expect(s["max"] == "pseudo" and fills(s), f"{tag}F fills the window without the API")
    button(page).click()
    page.wait_for_timeout(300)
    expect(state(page, sel)["max"] == "off", f"{tag}the button leaves the filled window")
    ctx.close()
    expect(not errors, f"{tag}no page errors while maximizing {errors[:3]}")
