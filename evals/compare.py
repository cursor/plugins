#!/usr/bin/env python3
"""Compare eval runs side by side.

    python3 evals/compare.py runs/*/result.json [--markdown]

Accepts result.json files or run directories (their result.json, else status.json for a skipped run).
"""
import argparse
import json
import sys
from pathlib import Path

COLUMNS = ["arm", "host", "task", "oracle", "phase order", "delegates", "wall-clock", "cost", "status"]


def load(p):
    p = Path(p)
    if p.is_dir():
        for name in ("result.json", "status.json"):
            if (p / name).is_file():
                p = p / name
                break
    d = json.loads(p.read_text())
    d.setdefault("_path", str(p))
    return d


def row(d):
    if d.get("status") == "skipped":
        return [d.get("arm", "?"), d.get("host", "?"), d.get("task", "?"), "-", "-", "-", "-", "-", d.get("reason", "skipped")]
    o = d.get("oracle") or {}
    oracle = f"{o['passed']}/{o['total']}" if "passed" in o else ("skipped" if o.get("skipped") else "-")
    po = d.get("phase_order") or {}
    phase = f"{po['passed']}/{po['total']}" if po.get("total") else "-"
    wall = d.get("wall_clock_seconds")
    cost = d.get("cost_usd")
    return [d.get("arm", "?"), d.get("host", "?"), d.get("task", "?"), oracle, phase,
            str(len(d.get("delegates", []))),
            f"{wall / 60:.1f} min" if isinstance(wall, (int, float)) else "-",
            f"${cost:.2f}" if isinstance(cost, (int, float)) else "-",
            d.get("status", "?")]


def render(rows, markdown):
    if markdown:
        lines = ["| " + " | ".join(COLUMNS) + " |", "|" + "---|" * len(COLUMNS)]
        lines += ["| " + " | ".join(r) + " |" for r in rows]
        return "\n".join(lines)
    widths = [max(len(c), *(len(r[i]) for r in rows)) for i, c in enumerate(COLUMNS)]
    fmt = "  ".join(f"{{:<{w}}}" for w in widths)
    return "\n".join([fmt.format(*COLUMNS), fmt.format(*("-" * w for w in widths))] + [fmt.format(*r) for r in rows])


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("results", nargs="+", help="result.json files or run directories")
    ap.add_argument("--markdown", action="store_true")
    a = ap.parse_args(argv)
    data = sorted((load(p) for p in a.results), key=lambda d: (d.get("task", ""), d.get("host", ""), d.get("arm", "")))
    print(render([row(d) for d in data], a.markdown))
    failing = [f"{d.get('host')}/{d.get('arm')}: {c['name']}" for d in data
               for c in (d.get("oracle") or {}).get("checks", []) if c.get("status") != "pass"]
    if failing:
        print("\nOracle checks not passed:\n  " + "\n  ".join(failing))
    return 0


if __name__ == "__main__":
    sys.exit(main())
