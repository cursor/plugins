"""Several tests import run-record.py from core. conftest.py keeps that from leaving bytecode there."""
import importlib.util
import shutil
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[2] / "core" / "skills" / "poteto-mode" / "scripts" / "run-record.py"


def test_importing_run_record_leaves_no_bytecode(tmp_path):
    copy = tmp_path / "run-record.py"
    shutil.copy(SCRIPT, copy)
    spec = importlib.util.spec_from_file_location("run_record_copy", copy)
    spec.loader.exec_module(importlib.util.module_from_spec(spec))
    assert sys.dont_write_bytecode and not (tmp_path / "__pycache__").exists()
