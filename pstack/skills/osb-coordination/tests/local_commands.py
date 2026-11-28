"""Synthetic foreground verifier/publisher for orchestration fixtures only."""
import json
import os
from pathlib import Path
import sys
import time


def main():
    mode, marker, behavior = sys.argv[1:4]
    marker = Path(marker)
    if mode == "worker":
        pending = marker.with_suffix(".pending")
        pending.write_text(json.dumps({"pid": os.getpid(), "claim_file": os.environ.get("PSTACK_OSB_CLAIM_FILE")}))
        os.replace(pending, marker)
        if behavior == "wait":
            while not marker.with_suffix(".continue").exists():
                time.sleep(0.05)
        print("synthetic verifier output")
        return 1 if behavior == "fail" else 0
    if mode == "publisher":
        args = sys.argv[4:]
        if len(args) == 4 and args[:1] == ["--store"] and args[2:] == ["ledger", "summary"]:
            initialized = Path(args[1]) / "mock-initialized.json"
            return 0 if initialized.exists() and initialized.read_text() == "synthetic-initialized\n" else 2
        with marker.open("a") as output:
            output.write(json.dumps(args) + "\n")
        return 1 if behavior == "unknown" else 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
