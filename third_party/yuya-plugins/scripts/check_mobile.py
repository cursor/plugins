# /// script
# requires-python = ">=3.11"
# dependencies = ["playwright>=1.50"]
# ///
"""Check that an HTML page never scrolls sideways on a phone.

    uv run check_mobile.py page.html [more.html ...] [--width 390]

Opens each file in Chrome at a phone width, light and dark, and lists every
element whose right edge passes the viewport, unless an ancestor scrolls it
(overflow-x: auto/scroll/hidden/clip). Exit status 1 when any page overflows.
"""

import argparse
import os
import pathlib
import sys

from playwright.sync_api import sync_playwright

FIND = """() => {
  const vw = document.documentElement.clientWidth;
  const contained = (el) => {
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(a).overflowX)) return true;
    }
    return false;
  };
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= vw + 1 || contained(el)) continue;
    // Report the outermost offender only: its descendants overflow with it.
    if (el.parentElement && out.some((o) => o.el.contains(el))) continue;
    const text = (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 50);
    out.push({ el, line: `<${el.tagName.toLowerCase()}${el.className ? ' class="' + el.className + '"' : ''}> right=${Math.round(r.right)} "${text}"` });
  }
  return { scrollWidth: document.documentElement.scrollWidth, vw, offenders: out.map((o) => o.line) };
}"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--width", type=int, default=390)
    args = ap.parse_args()
    failed = False
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel=os.environ.get("YES_BROWSER_CHANNEL", "chrome") or None)
        for f in args.files:
            url = pathlib.Path(f).resolve().as_uri()
            for scheme in ("light", "dark"):
                page = browser.new_page(viewport={"width": args.width, "height": 844}, color_scheme=scheme)
                page.goto(url)
                page.evaluate("document.fonts.ready")
                r = page.evaluate(FIND)
                page.close()
                if r["scrollWidth"] <= r["vw"] and not r["offenders"]:
                    continue
                failed = True
                print(f"{f} ({scheme}, {args.width}px): page is {r['scrollWidth']}px wide")
                for line in r["offenders"][:20]:
                    print(f"  {line}")
                break
            else:
                print(f"{f}: ok at {args.width}px")
        browser.close()
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
