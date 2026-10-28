# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""uv run test_build.py"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE.parent / "slides" / "template.html"
spec = importlib.util.spec_from_file_location("build", HERE / "build.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def course(root: Path, decks: list[str]) -> Path:
    lessons = []
    for i, text in enumerate(decks, 1):
        (root / f"deck{i}.html").write_text(text)
        lessons.append({"id": f"l{i}", "title": f"Lesson {i}", "units": [{"kind": "slides", "src": f"deck{i}.html"}]})
    (root / "course.json").write_text(json.dumps({"title": "Test course", "lessons": lessons}))
    return root


class SceneIds(unittest.TestCase):
    def test_two_decks_from_the_unmodified_template_build(self):
        with tempfile.TemporaryDirectory() as d:
            root = course(Path(d), [TEMPLATE.read_text()] * 2)
            build.cmd_build(root)
            self.assertTrue((root / "out" / "course.html").exists())

    def test_a_scene_name_used_by_two_decks_still_fails(self):
        deck = TEMPLATE.read_text().replace('<section class="slide', '<section data-scene="meter" class="slide', 1)
        self.assertIn('data-scene="meter"', deck)
        with tempfile.TemporaryDirectory() as d:
            root = course(Path(d), [deck] * 2)
            err = io.StringIO()
            with contextlib.redirect_stderr(err), self.assertRaises(SystemExit):
                build.cmd_build(root)
            self.assertIn("duplicate data-scene across units: meter", err.getvalue())


if __name__ == "__main__":
    unittest.main()
