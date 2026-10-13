#!/usr/bin/env python3
"""Render the committed portable package without modifying upstream files."""
import argparse
from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

import yaml

from runtime import EFFORTS, WRAPPERS

ROOT = Path(__file__).resolve().parents[2]
NOTICE = ('On Claude Code or Codex, first read [the runtime adaptation]'
          '(../poteto-mode/references/runtime-adaptation.md). Apply its substitutions to this skill.\n\n')


@dataclass(frozen=True)
class PackageLayout:
    upstream: Path
    assets: Path
    published: Path
    package_name: str | None = None

    @property
    def name(self) -> str:
        return self.package_name or self.upstream.name


@dataclass(frozen=True)
class Artifact:
    data: bytes
    mode: int


ArtifactTree = dict[str, Artifact]


def read_tree(root: Path) -> ArtifactTree:
    if root.is_symlink() or not root.is_dir():
        raise ValueError(f'Expected a real package directory: {root}')
    tree = {}
    for path in sorted(root.rglob('*')):
        if path.is_symlink():
            raise ValueError(f'Unsupported symlink in package input or output: {path}')
        if path.is_file():
            tree[path.relative_to(root).as_posix()] = Artifact(path.read_bytes(), 0o755 if path.stat().st_mode & 0o111 else 0o644)
        elif not path.is_dir():
            raise ValueError(f'Unsupported file type: {path}')
    return tree


class UniqueLoader(yaml.SafeLoader):
    pass


def unique_mapping(loader, node):
    result = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        if key in result:
            raise ValueError(f'Duplicate YAML key: {key}')
        result[key] = loader.construct_object(value_node)
    return result


UniqueLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


def frontmatter(text):
    match = re.fullmatch(r'---\n(.*?)\n---\n(.*)', text, re.S)
    if not match:
        raise ValueError('Expected LF-delimited YAML frontmatter')
    front, body = match.groups()
    metadata = yaml.load(front, Loader=UniqueLoader)
    if not isinstance(metadata, dict) or not isinstance(metadata.get('name'), str) or not isinstance(metadata.get('description'), str):
        raise ValueError('Expected string name and description in frontmatter')
    return metadata, body.lstrip('\n')


def prepare(text, name):
    metadata, body = frontmatter(text)
    for key in ('mode', 'icon', 'color', 'reminder'):
        metadata.pop(key, None)
    if name not in ('poteto-help', 'ketchup'):
        metadata.pop('disable-model-invocation', None)
    metadata['name'] = name
    if name.startswith('principle-'):
        metadata['user-invocable'] = False
    if body.startswith(NOTICE):
        body = body[len(NOTICE):]
    front = yaml.safe_dump(metadata, sort_keys=False, allow_unicode=True).rstrip()
    return f'---\n{front}\n---\n\n{NOTICE}{body}'


def render_package(layout: PackageLayout, upstream_commit: str) -> ArtifactTree:
    if layout.name == 'pstack-mods':
        return render_mods(layout, upstream_commit)
    if layout.name == 'thermos':
        return render_thermos(layout, upstream_commit)
    tree = read_tree(layout.upstream)
    for name, artifact in list(tree.items()):
        if re.fullmatch(r'skills/[^/]+/SKILL.md', name):
            skill = name.split('/')[1]
            if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', skill):
                raise ValueError(f'Unsupported skill directory: {skill}')
            tree[name] = Artifact(prepare(artifact.data.decode(), skill).encode(), artifact.mode)
    overlay = read_tree(layout.assets)
    maintenance = overlay.pop('sync-pstack-upstream.md')
    overlay['skills/sync-pstack-upstream/SKILL.md'] = Artifact(prepare(maintenance.data.decode(), 'sync-pstack-upstream').encode(), maintenance.mode)
    for name in list(overlay):
        if name.startswith('sync-pstack-upstream/'):
            overlay['skills/' + name] = overlay.pop(name)
    for name, artifact in list(tree.items()):
        if re.fullmatch(r'agents/[^/]+\.md', name):
            target = 'skills/poteto-mode/references/portable-agents/' + Path(name).name
            if target in overlay:
                raise ValueError(f'Portable asset collides with generated agent: {target}')
            overlay[target] = artifact
    dependency = layout.upstream.parent / 'cursor-team-kit'
    for name in ('skills/deslop/SKILL.md', 'LICENSE'):
        path = dependency / name
        if any(p.is_symlink() for p in (path, *path.parents) if p.is_relative_to(dependency)):
            raise ValueError(f'Unsupported symlink in dependency: {path}')
    deslop = (dependency / 'skills/deslop/SKILL.md').read_text()
    imported = Artifact(prepare(deslop, 'deslop').encode(), 0o644)
    for target in ('skills/deslop/SKILL.md', 'skills/poteto-mode/references/deslop.md'):
        if target in tree or target in overlay:
            raise ValueError(f'Portable asset collides with dependency: {target}')
        data = imported.data
        if target.endswith('/references/deslop.md'):
            data = data.replace(NOTICE.encode(), NOTICE.replace('../poteto-mode/references/runtime-adaptation.md', 'runtime-adaptation.md').encode(), 1)
        overlay[target] = Artifact(data, imported.mode)
    overlay['LICENSE-CURSOR-TEAM-KIT'] = Artifact((dependency / 'LICENSE').read_bytes(), 0o644)
    overlay['DESLOP_SOURCE.md'] = Artifact((
        '# Deslop source\n\nImported without body changes from '
        f'https://github.com/cursor/plugins/blob/{upstream_commit}/cursor-team-kit/skills/deslop/SKILL.md.\n'
        'Its MIT license is LICENSE-CURSOR-TEAM-KIT.\n').encode(), 0o644)
    for name in ('LICENSE-CURSOR-TEAM-KIT', 'DESLOP_SOURCE.md'):
        for directory in ('skills/deslop', 'skills/poteto-mode/references'):
            target = directory + '/' + name
            if target in tree or target in overlay:
                raise ValueError(f'Portable asset collides with dependency notice: {target}')
            overlay[target] = overlay[name]
    agent_paths = []
    for agent in WRAPPERS:
        name = f'runtime-agents/{agent}.md'
        if name not in overlay:
            continue
        metadata, body = frontmatter(overlay[name].data.decode())
        metadata['model'] = 'inherit'
        overlay[name] = Artifact(('---\n' + yaml.safe_dump(metadata, sort_keys=False) + '---\n\n' + body).encode(), 0o644)
        agent_paths.append('./' + name)
        for effort in EFFORTS:
            variant = metadata | {'name': f'{agent}-{effort}', 'effort': effort}
            target = f'runtime-agents/{agent}-{effort}.md'
            if target in tree or target in overlay:
                raise ValueError(f'Portable asset collides with variant: {target}')
            overlay[target] = Artifact(('---\n' + yaml.safe_dump(variant, sort_keys=False) + '---\n\n' + body).encode(), 0o644)
            agent_paths.append('./' + target)
    manifest = json.loads(overlay['.claude-plugin/plugin.json'].data)
    manifest['agents'] = agent_paths
    overlay['.claude-plugin/plugin.json'] = Artifact((json.dumps(manifest, indent=2) + '\n').encode(), 0o644)
    return add_overlay(tree, overlay, upstream_commit)


def add_overlay(tree: ArtifactTree, overlay: ArtifactTree, upstream_commit: str) -> ArtifactTree:
    version = json.loads(tree['.cursor-plugin/plugin.json'].data)['version']
    package_version = version + '-portable.g' + upstream_commit[:12] + '.a' + package_digest(tree | overlay)
    for runtime in ('claude', 'codex'):
        name = f'.{runtime}-plugin/plugin.json'
        manifest = json.loads(overlay[name].data)
        manifest['version'] = package_version
        overlay[name] = Artifact((json.dumps(manifest, indent=2) + '\n').encode(), overlay[name].mode)
    for name, artifact in overlay.items():
        if name in tree or any(name.startswith(p + '/') or p.startswith(name + '/') for p in tree):
            raise ValueError(f'Portable overlay collides with upstream: {name}')
        tree[name] = artifact
    return tree


def package_digest(tree: ArtifactTree) -> str:
    """Hash paths, executable modes, and content, excluding generated versions."""
    digest = hashlib.sha256()
    for name, artifact in sorted(tree.items()):
        data = artifact.data
        if name in ('.claude-plugin/plugin.json', '.codex-plugin/plugin.json'):
            metadata = json.loads(data)
            metadata.pop('version', None)
            data = json.dumps(metadata, sort_keys=True).encode()
        for value in (name.encode(), str(artifact.mode).encode(), data):
            digest.update(len(value).to_bytes(8, 'big'))
            digest.update(value)
    return digest.hexdigest()[:12]


THERMOS_NOTICE = ('On Claude Code or Codex, first read [the runtime adaptation]'
                  '(../thermos/references/runtime-adaptation.md). Apply its host substitutions to this skill.\n\n')
THERMOS_ROLES = ('thermo-nuclear-review', 'thermo-nuclear-code-quality-review')
MODS_VERSION = '0.1.0'
MODS_TYPE_SIDECARS = {'.claude-plugin/types/' + name for name in (
    '.gitignore', 'tsconfig.json', 'claude-code/index.d.ts',
    'claude-code-tools/index.d.ts', 'claude-code-mcp/index.d.ts',
)}

MODS_REFERENCE_ROOT = 'references/thermos'
MODS_THERMOS_FILES = ('LICENSE', *(
    name for role in THERMOS_ROLES
    for name in (f'skills/{role}/SKILL.md', f'agents/{role}-subagent.md')
))


def read_mods_tree(root: Path) -> ArtifactTree:
    return {name: value for name, value in read_tree(root).items() if name not in MODS_TYPE_SIDECARS}


def render_mods(layout: PackageLayout, upstream_commit: str) -> ArtifactTree:
    """Build the opt-in Claude adapter with unmodified, pinned reviewer inputs."""
    source = read_tree(layout.upstream)
    tree = read_mods_tree(layout.assets)
    if any(name.split('/')[0] in ('.codex-plugin', '.cursor-plugin') for name in tree):
        raise ValueError('The pstack-mods adapter must be Claude-only')
    if any(name == MODS_REFERENCE_ROOT or name.startswith(MODS_REFERENCE_ROOT + '/')
           or MODS_REFERENCE_ROOT.startswith(name + '/') for name in tree):
        raise ValueError('Mods asset collides with generated Thermos references')
    for name in MODS_THERMOS_FILES:
        if name not in source:
            raise ValueError(f'Missing Mods Thermos reference: {name}')
        tree[f'{MODS_REFERENCE_ROOT}/{name}'] = source[name]
    name = '.claude-plugin/plugin.json'
    if name not in tree:
        raise ValueError('Missing Mods Claude plugin manifest')
    manifest = json.loads(tree[name].data)
    if not isinstance(manifest, dict) or manifest.get('name') != 'pstack-mods':
        raise ValueError('Mods Claude plugin name must be pstack-mods')
    manifest['version'] = MODS_VERSION + '-mods.g' + upstream_commit[:12] + '.a' + package_digest(tree)
    tree[name] = Artifact((json.dumps(manifest, indent=2) + '\n').encode(), tree[name].mode)
    return tree


def render_thermos(layout: PackageLayout, upstream_commit: str) -> ArtifactTree:
    tree = read_tree(layout.upstream)
    overlay = read_tree(layout.assets)
    skills = {Path(name).parent.name for name in tree if re.fullmatch(r'skills/[^/]+/SKILL.md', name)}
    if skills != {'thermos', *THERMOS_ROLES}:
        raise ValueError(f'Thermos skill inventory changed; review the adapter: {sorted(skills)}')
    for skill in sorted(skills):
        name = f'skills/{skill}/SKILL.md'
        metadata, _ = frontmatter(tree[name].data.decode())
        if metadata['name'] != skill:
            raise ValueError(f'Thermos skill name differs: {name}')
        original = tree[name].data.decode()
        boundary = original.index('\n---\n', 4) + 5
        tree[name] = Artifact((original[:boundary] + THERMOS_NOTICE + original[boundary:]).encode(), tree[name].mode)
        policy = f'skills/{skill}/agents/openai.yaml'
        if policy in overlay:
            raise ValueError(f'Portable asset collides with invocation policy: {policy}')
        overlay[policy] = Artifact(b'policy:\n  allow_implicit_invocation: false\n', 0o644)
        license_path = f'skills/{skill}/LICENSE'
        if license_path in overlay:
            raise ValueError(f'Portable asset collides with license: {license_path}')
        overlay[license_path] = tree['LICENSE']
    for role in THERMOS_ROLES:
        name = f'agents/{role}-subagent.md'
        if name not in tree:
            raise ValueError(f'Missing Thermos source agent: {name}')
        target = f'skills/thermos/references/agents/{role}-subagent.md'
        if target in overlay:
            raise ValueError(f'Portable asset collides with agent reference: {target}')
        overlay[target] = tree[name]
    return add_overlay(tree, overlay, upstream_commit)


def verify_source(root: Path, upstream_commit: str, packages=('pstack',)) -> None:
    entries = subprocess.check_output(['git', 'ls-tree', '-rz', upstream_commit, '--', *packages, 'README.md', 'cursor-team-kit/skills/deslop/SKILL.md', 'cursor-team-kit/LICENSE'], cwd=root).split(b'\0')
    if any((root / name).is_symlink() for name in packages):
        raise ValueError('Upstream source root must not be a symlink')
    expected = {}
    for entry in entries:
        if not entry:
            continue
        header, name = entry.split(b'\t', 1)
        mode, kind, oid = header.split()
        if kind != b'blob':
            raise ValueError(f'Unsupported upstream Git object: {name.decode()}')
        expected[name.decode()] = (mode.decode(), subprocess.check_output(['git', 'cat-file', 'blob', oid.decode()], cwd=root))
    if 'README.md' not in expected or any(not any(p.startswith(name + '/') for p in expected) for name in packages):
        raise ValueError('Pin must contain root README.md and package files')
    actual = {}
    paths = [path for name in packages for path in (root / name).rglob('*')] + [root / 'README.md', root / 'cursor-team-kit/skills/deslop/SKILL.md', root / 'cursor-team-kit/LICENSE']
    for path in paths:
        if path.is_symlink():
            actual[path.relative_to(root).as_posix()] = ('120000', path.readlink().as_posix().encode())
        elif path.is_file():
            actual[path.relative_to(root).as_posix()] = ('100755' if path.stat().st_mode & 0o111 else '100644', path.read_bytes())
        elif not path.is_dir():
            raise ValueError(f'Unsupported source file type: {path}')
    changed = sorted(name for name in expected.keys() | actual.keys() if expected.get(name) != actual.get(name))
    if changed:
        raise ValueError('Upstream source differs from pin: ' + ', '.join(changed))


def prepare_package(layout: PackageLayout, upstream_commit: str, *, check: bool) -> None:
    destination = layout.published
    source_name = 'thermos' if layout.name == 'pstack-mods' else layout.name
    expected_destination = layout.upstream.parent.absolute() / 'portable' / layout.name
    if (layout.name not in ('pstack', 'thermos', 'pstack-mods')
            or layout.upstream.name != source_name
            or destination.absolute() != expected_destination
            or destination.is_symlink() or destination.parent.is_symlink()):
        raise ValueError(f'Unsafe generated destination: {destination}')
    resolved = destination.resolve()
    for source in (layout.upstream.resolve(), layout.assets.resolve()):
        if resolved == source or resolved.is_relative_to(source) or source.is_relative_to(resolved):
            raise ValueError('Generated destination overlaps an input')
    desired = render_package(layout, upstream_commit)
    actual = (read_mods_tree(destination) if layout.name == 'pstack-mods' else read_tree(destination)) if destination.exists() else {}
    changed = sorted(name for name in desired.keys() | actual.keys() if desired.get(name) != actual.get(name))
    if check:
        if changed:
            raise ValueError('Generated package drift: ' + ', '.join(changed))
        return
    if not changed:
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f'.{layout.name}-', dir=destination.parent) as temporary:
        staged = Path(temporary) / 'package'
        staged.mkdir()
        for name, artifact in desired.items():
            path = staged / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(artifact.data)
            path.chmod(artifact.mode)
        # The backup lives outside the staging directory so failed rollback cannot
        # make TemporaryDirectory cleanup erase the last usable bundle.
        backup = Path(temporary + '-previous')
        try:
            if destination.exists():
                destination.rename(backup)
            staged.rename(destination)
        except BaseException:
            if backup.exists():
                try:
                    backup.rename(destination)
                except OSError as error:
                    raise RuntimeError(f'Could not restore generated package; previous bundle retained at {backup}') from error
            raise
        else:
            if backup.exists():
                shutil.rmtree(backup)
    print(f'Regenerated {destination}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    pin = json.loads((ROOT / 'tools/portable/upstream.json').read_text())['last_merged_sha']
    verify_source(ROOT, pin, packages=('pstack', 'thermos'))
    for package, assets in (('pstack', 'assets'), ('thermos', 'thermos-assets')):
        prepare_package(PackageLayout(ROOT / package, ROOT / 'tools/portable' / assets, ROOT / 'portable' / package), pin, check=args.check)
    mods = PackageLayout(ROOT / 'thermos', ROOT / 'tools/portable/mods-assets',
                         ROOT / 'portable/pstack-mods', package_name='pstack-mods')
    prepare_package(mods, pin, check=args.check)


if __name__ == '__main__':
    main()
