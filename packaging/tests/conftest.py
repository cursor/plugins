"""Test setup that has to run before any test module imports pstack_cli.

The suite must import the tree under test. A copied .venv can carry an editable install whose .pth
points at another checkout, which would quietly test that checkout's code instead. Several tests
also import run-record.py from core; keep them from leaving bytecode there.
"""
import os
import sys
from pathlib import Path

SRC = str(Path(__file__).resolve().parent.parent / "src")
sys.path.insert(0, SRC)
os.environ["PYTHONPATH"] = os.pathsep.join([SRC] + [p for p in os.environ.get("PYTHONPATH", "").split(os.pathsep) if p])

sys.dont_write_bytecode = True
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
