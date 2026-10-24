#!/usr/bin/env python3
"""WCAG 2.x contrast checker, home of the antislop-human contrast checker.

Usage:
    python3 contrast-check.py "#FFFFFF" "#777777"
    python3 contrast-check.py FFFFFF 777777
    python3 contrast-check.py --selftest

Prints the contrast ratio and a PASS/FAIL verdict for normal text (4.5:1)
and large text (3:1, 18px+ per antislop R-25). Exit code 0 only when both
verdicts pass, so scripts can chain on it.

--selftest parses the reference table out of the SKILL.md next to this script
(the skill doc is the source of truth, not a list copied into this script) and
recomputes every row with the formula, checking the ratio and both verdicts.
"""

import os
import re
import sys

REFERENCE_HEADER = "| Pairing (text on background) | Ratio | Normal text (4.5) | Large text (3.0) |"
NAMED_COLORS = {"black": (0, 0, 0), "white": (255, 255, 255)}


def parse_hex(value):
    value = value.strip().lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    if not re.fullmatch(r"[0-9A-Fa-f]{6}", value):
        raise ValueError(f"expected a hex color like #FFFFFF, got {value!r}")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def parse_pairing(pairing):
    """Turn 'White on #333333' or '#555555 on black' into two RGB tuples."""
    colors = []
    for token in re.split(r"\s+on\s+", pairing):
        token = token.strip()
        match = re.search(r"#[0-9A-Fa-f]{3,6}", token)
        if match:
            colors.append(parse_hex(match.group(0)))
        elif token.lower() in NAMED_COLORS:
            colors.append(NAMED_COLORS[token.lower()])
        else:
            raise ValueError(f"cannot parse {token!r} from pairing {pairing!r}")
    if len(colors) != 2:
        raise ValueError(f"expected two colors in pairing {pairing!r}")
    return tuple(colors)


def linearize(channel):
    c = channel / 255.0
    if c <= 0.03928:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def luminance(rgb):
    r, g, b = (linearize(ch) for ch in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(color_a, color_b):
    lum_a, lum_b = luminance(color_a), luminance(color_b)
    lighter, darker = sorted((lum_a, lum_b), reverse=True)
    return (lighter + 0.05) / (darker + 0.05)


def reference_doc_path():
    here = os.path.dirname(os.path.abspath(__file__))
    candidate = os.path.join(here, "SKILL.md")
    return candidate if os.path.isfile(candidate) else None


def parse_reference_rows(path):
    """Reference table rows from SKILL.md, with the ratio already a float.

    A row that does not split into four cells is dropped silently, not raised.
    """
    rows = []
    with open(path, encoding="utf-8") as handle:
        in_table = False
        for raw in handle:
            line = raw.rstrip("\n")
            if line.startswith(REFERENCE_HEADER):
                in_table = True
                continue
            if not in_table:
                continue
            if not line.startswith("|"):
                break
            if line.startswith("|---"):
                continue
            cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
            if len(cells) != 4:
                continue
            pairing, ratio, normal, large = cells
            rows.append({
                "pairing": pairing,
                "ratio": float(ratio),
                "normal": normal,
                "large": large,
            })
    return rows


def selftest():
    doc = reference_doc_path()
    if doc is None:
        print("selftest: SKILL.md not found next to the script; cannot check the table")
        return 2
    try:
        rows = parse_reference_rows(doc)
    except (OSError, ValueError) as exc:
        print(f"selftest: could not read the table from SKILL.md: {exc}")
        return 1
    if not rows:
        print("selftest: no reference rows found in SKILL.md")
        return 1

    failures = 0
    for row in rows:
        color_a, color_b = parse_pairing(row["pairing"])
        computed = round(contrast_ratio(color_a, color_b), 2)
        expected_normal = "Pass" if computed >= 4.5 else "Fail"
        expected_large = "Pass" if computed >= 3.0 else "Fail"
        if f"{computed:.2f}" != f"{row['ratio']:.2f}":
            failures += 1
            print(f"selftest: {row['pairing']}: table says {row['ratio']}, the formula says {computed:.2f}")
        if row["normal"] != expected_normal:
            failures += 1
            print(f"selftest: {row['pairing']}: normal text marked {row['normal']}, should be {expected_normal}")
        if row["large"] != expected_large:
            failures += 1
            print(f"selftest: {row['pairing']}: large text marked {row['large']}, should be {expected_large}")

    if failures:
        return 1
    print(f"selftest: {len(rows)} reference pairs OK")
    return 0


def main(argv):
    if len(argv) == 1 and argv[0] == "--selftest":
        return selftest()
    if len(argv) != 2:
        print("usage: python3 contrast-check.py <hex1> <hex2> | --selftest")
        return 2
    try:
        ratio = contrast_ratio(parse_hex(argv[0]), parse_hex(argv[1]))
    except ValueError as exc:
        print(f"error: {exc}")
        return 2

    normal = ratio >= 4.5
    large = ratio >= 3.0
    print(f"ratio: {ratio:.2f}:1")
    print(f"normal text (4.5:1): {'PASS' if normal else 'FAIL'}")
    print(f"large text  (3.0:1): {'PASS' if large else 'FAIL'}")
    return 0 if normal and large else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
