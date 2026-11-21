#!/usr/bin/env python3
"""Check that Codex preserves the invocation policy declared by each skill."""
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / '.codex-plugin/plugin.json').read_text())
cursor = json.loads((root / '.cursor-plugin/plugin.json').read_text())
assert manifest['name'] == 'pstack-plugin'
assert manifest['version'] == cursor['version'], 'Keep the two manifest versions aligned'
assert manifest['skills'] == './skills/'
manual = 0
skills = sorted((root / 'skills').glob('*/SKILL.md'))
assert skills, 'No skills found'
for path in skills:
    header = path.read_text().split('---', 2)[1]
    explicit = bool(re.search(r'^disable-model-invocation:\s*true\s*$', header, re.M))
    sidecar = path.parent / 'agents/openai.yaml'
    text = sidecar.read_text() if sidecar.exists() else ''
    match = re.search(r'^  allow_implicit_invocation:\s*(true|false)\s*$', text, re.M)
    implicit = not match or match.group(1) == 'true'
    assert implicit != explicit, f'Invocation policy differs: {path.parent.name}'
    manual += explicit
assert not any(k in manifest for k in ('agents', 'hooks', 'mcpServers', 'apps'))
print(f'{len(skills)} skills: {manual} explicit-only, {len(skills) - manual} automatic')
