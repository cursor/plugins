"""The suite tests the tree it lives in, never another checkout's install."""
import subprocess
import sys
from pathlib import Path

SRC = (Path(__file__).resolve().parent.parent / "src").resolve()


def test_the_suite_imports_the_tree_under_test():
    import pstack_cli
    assert Path(pstack_cli.__file__).resolve().is_relative_to(SRC), pstack_cli.__file__


def test_a_child_process_imports_the_tree_under_test():
    out = subprocess.run([sys.executable, "-c", "import pstack_cli; print(pstack_cli.__file__)"],
                         capture_output=True, text=True, check=True).stdout.strip()
    assert Path(out).resolve().is_relative_to(SRC), out
