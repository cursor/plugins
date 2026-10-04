"""Test-only in-process acquisition persistence faults; no production hook."""
import importlib.util
import os
from pathlib import Path
import signal
import sys

scripts = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(scripts))
spec = importlib.util.spec_from_file_location("local_verifier_fixture", scripts / "run_local_verifier.py")
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
fault = sys.argv.pop(1)
original_save = runner.save
injected = False


def fault_save(path, value):
    global injected
    if path.name == "state.json" and value.get("phase") == "bound" and not injected:
        injected = True
        if fault == "before-bound-signal":
            os.kill(os.getpid(), signal.SIGTERM)
        elif fault == "bound-write-error":
            raise OSError("synthetic durable-write failure")
        original_save(path, value)
        if fault == "after-bound-signal":
            os.kill(os.getpid(), signal.SIGINT)
        return
    original_save(path, value)


runner.save = fault_save
raise SystemExit(runner.main())
