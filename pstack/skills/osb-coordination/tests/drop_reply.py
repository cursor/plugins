"""Test-only relay: fixed argv supplied by test supervisor, never production."""
import json
from pathlib import Path
import subprocess
import sys

marker, endpoint, database, actor = sys.argv[1:]
raw = sys.stdin.read()
process = subprocess.run([sys.executable, endpoint, database, actor], input=raw,
                         text=True, capture_output=True, timeout=8)
request = json.loads(raw)
if request["operation"] == "claim" and process.returncode == 0 and not Path(marker).exists():
    Path(marker).write_text("lost reply\n")
    raise SystemExit(74)
sys.stdout.write(process.stdout)
sys.stderr.write(process.stderr)
raise SystemExit(process.returncode)
