import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest import mock

from prepare import Artifact, NOTICE, PackageLayout, frontmatter, prepare, prepare_package, read_tree, verify_source


class PrepareTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / 'pstack'
        self.assets = self.root / 'tools/assets'
        self.layout = PackageLayout(self.source, self.assets, self.root / 'portable/pstack')
        for name, data in {'.cursor-plugin/plugin.json': '{"version":"1.0"}', 'skills/example/SKILL.md': '---\nname: Example\ndescription: "Example"\nmode: true\n---\n\n# Example\n', 'skills/example/references/data.bin': 'data', 'agents/example.md': '# Agent'}.items():
            path = self.source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(data)
        for name, data in {'.claude-plugin/plugin.json': '{"name":"pstack"}', '.codex-plugin/plugin.json': '{"name":"pstack"}', 'sync-pstack-upstream.md': '---\nname: sync-pstack-upstream\ndescription: Sync\n---\n\n# Sync\n'}.items():
            path = self.assets / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(data)
        (self.source / 'README').write_text('upstream')
        dependency = self.root / 'cursor-team-kit/skills/deslop/SKILL.md'
        dependency.parent.mkdir(parents=True)
        dependency.write_text('---\nname: deslop\ndescription: Clean\n---\n\nClean diff.\n')
        (self.root / 'cursor-team-kit/LICENSE').write_text('MIT')

    def generate(self, check=False):
        prepare_package(self.layout, 'a' * 40, check=check)

    def test_source_unchanged_and_generation_deterministic(self):
        before = read_tree(self.source)
        self.generate()
        first = read_tree(self.layout.published)
        self.generate()
        self.generate(check=True)
        self.assertEqual(before, read_tree(self.source))
        self.assertEqual(first, read_tree(self.layout.published))
        text = (self.layout.published / 'skills/example/SKILL.md').read_text()
        self.assertEqual(text.split(NOTICE)[1], '# Example\n')
        self.assertIn('name: example\n', text)
        self.assertNotIn('mode:', text)

    def test_help_stays_explicit_while_workflow_skills_remain_routable(self):
        source = '---\nname: source\ndescription: Help\ndisable-model-invocation: true\n---\n\n# Help\n'
        for name in ('poteto-help', 'ketchup'):
            with self.subTest(skill=name):
                metadata, body = frontmatter(prepare(source, name))
                self.assertIs(metadata.get('disable-model-invocation'), True)
                self.assertEqual(body, NOTICE + '# Help\n')
        workflow_metadata, _ = frontmatter(prepare(source, 'poteto-mode'))
        self.assertNotIn('disable-model-invocation', workflow_metadata)

    def test_added_deleted_renamed_resources_and_modes(self):
        self.generate()
        shutil.move(self.source / 'skills/example', self.source / 'skills/renamed')
        (self.source / 'skills/renamed/references/data.bin').unlink()
        executable = self.source / 'skills/renamed/run.sh'
        executable.write_text('#!/bin/sh\nexit 0\n')
        executable.chmod(0o755)
        with self.assertRaisesRegex(ValueError, 'drift'):
            self.generate(check=True)
        self.generate()
        self.assertFalse((self.layout.published / 'skills/example').exists())
        self.assertFalse((self.layout.published / 'skills/renamed/references/data.bin').exists())
        self.assertEqual((self.layout.published / 'skills/renamed/run.sh').stat().st_mode & 0o777, 0o755)
        (self.layout.published / 'extra').write_text('stale')
        with self.assertRaisesRegex(ValueError, 'extra'):
            self.generate(check=True)
        self.generate()
        (self.layout.published / 'skills/renamed/run.sh').chmod(0o644)
        with self.assertRaisesRegex(ValueError, 'run.sh'):
            self.generate(check=True)

    def test_overlay_collision_parser_and_symlink_fail_closed(self):
        path = self.source / '.claude-plugin/plugin.json'
        path.parent.mkdir(parents=True)
        path.write_text('{}')
        with self.assertRaisesRegex(ValueError, 'collides'):
            self.generate()
        path.unlink()
        for text in ['# No manifest', '---\nname:\n  nested: value\ndescription: Example\n---\n\n# Example', '---\nname: one\nname: two\ndescription: Example\n---\n# Example']:
            with self.assertRaises(ValueError):
                prepare(text, 'example')
        path = self.assets / 'skills/example'
        path.parent.mkdir(parents=True)
        path.write_text('file conflicts with upstream skill directory')
        with self.assertRaisesRegex(ValueError, 'collides'):
            self.generate()
        path.unlink()
        (self.source / 'escape').symlink_to('/etc/passwd')
        with self.assertRaisesRegex(ValueError, 'Unsupported symlink'):
            self.generate()

    def test_adapter_only_changes_update_both_native_versions(self):
        self.generate()
        def version(runtime):
            return json.loads((self.layout.published / f'.{runtime}-plugin/plugin.json').read_text())['version']
        before = version('claude')
        (self.assets / 'adaptation.md').write_text('changed mapping')
        self.generate()
        after = version('claude')
        self.assertNotEqual(before, after)
        self.assertEqual(after, version('codex'))
        self.generate()
        self.assertEqual(after, version('claude'))
        manifest = self.assets / '.claude-plugin/plugin.json'
        manifest.write_text('{"name":"pstack","version":"ignored-input-version"}')
        self.generate()
        self.assertEqual(after, version('claude'))

    def test_destination_overlap_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Unsafe'):
            prepare_package(PackageLayout(self.source, self.assets, self.source), 'a' * 40, check=False)
        with self.assertRaisesRegex(ValueError, 'Unsafe'):
            prepare_package(PackageLayout(self.source, self.assets, self.source / 'portable/pstack'), 'a' * 40, check=False)

    def test_input_root_symlinks_are_rejected(self):
        saved = self.assets.with_name('real-assets')
        self.assets.rename(saved)
        self.assets.symlink_to(saved, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'real package directory'):
            self.generate()

    def test_publication_failure_restores_previous_package(self):
        self.generate()
        before = read_tree(self.layout.published)
        (self.assets / 'new.md').write_text('new resource')
        original_rename = Path.rename

        def fail_publication(path, target):
            if path.name == 'package':
                raise OSError('simulated publication failure')
            return original_rename(path, target)

        with mock.patch.object(Path, 'rename', fail_publication):
            with self.assertRaisesRegex(OSError, 'simulated publication failure'):
                self.generate()
        self.assertEqual(read_tree(self.layout.published), before)
        self.assertEqual(list(self.layout.published.parent.glob('.pstack-*')), [])
        self.generate()
        self.generate(check=True)

    def test_interrupt_after_backup_rename_restores_previous_package(self):
        self.generate()
        before = read_tree(self.layout.published)
        (self.assets / 'new.md').write_text('new resource')
        original_rename = Path.rename

        def interrupt_after_backup(path, target):
            result = original_rename(path, target)
            if path == self.layout.published:
                raise KeyboardInterrupt('interrupted after backup')
            return result

        with mock.patch.object(Path, 'rename', interrupt_after_backup):
            with self.assertRaisesRegex(KeyboardInterrupt, 'interrupted after backup'):
                self.generate()
        self.assertEqual(read_tree(self.layout.published), before)
        self.assertEqual(list(self.layout.published.parent.glob('.pstack-*')), [])
        self.generate()
        self.generate(check=True)

    def test_failed_rollback_preserves_recoverable_backup(self):
        self.generate()
        before = read_tree(self.layout.published)
        (self.assets / 'new.md').write_text('new resource')
        original_rename = Path.rename

        def fail_publication_and_rollback(path, target):
            if path.name == 'package' or path.name.endswith('-previous'):
                raise OSError('simulated filesystem failure')
            return original_rename(path, target)

        with mock.patch.object(Path, 'rename', fail_publication_and_rollback):
            with self.assertRaisesRegex(RuntimeError, 'previous bundle retained at'):
                self.generate()
        backups = list(self.layout.published.parent.glob('.pstack-*-previous'))
        self.assertEqual(len(backups), 1)
        self.assertEqual(read_tree(backups[0]), before)
        self.assertFalse(self.layout.published.exists())
        backups[0].rename(self.layout.published)
        self.generate()
        self.generate(check=True)

    def test_upstream_header_merges_without_adapter_conflict(self):
        def git(*args):
            result = subprocess.run(['git', *args], cwd=self.root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            if result.returncode:
                raise AssertionError(result.stdout.decode())
            return result.stdout.decode().strip()
        git('init', '-b', 'main')
        git('config', 'commit.gpgsign', 'false')
        git('config', 'user.name', 'Test')
        git('config', 'user.email', 'test@example.com')
        (self.root / 'README.md').write_text('root upstream')
        git('add', '.')
        git('commit', '-m', 'upstream base')
        base = git('rev-parse', 'HEAD')
        git('switch', '-c', 'fork')
        self.generate()
        (self.assets / 'adaptation.md').write_text('adapter v1')
        git('add', '.')
        git('commit', '-m', 'portable adaptation')
        git('switch', '-c', 'incoming', base)
        skill = self.source / 'skills/example/SKILL.md'
        skill.write_text(skill.read_text().replace('# Example', '# Incoming\nNew upstream step.'))
        (self.source / 'skills/example/run.sh').write_text('exit 0\n')
        (self.source / 'skills/example/run.sh').chmod(0o755)
        git('add', '.')
        git('commit', '-m', 'upstream header')
        incoming = git('rev-parse', 'HEAD')
        git('switch', 'fork')
        (self.assets / 'adaptation.md').write_text('adapter v2')
        git('add', '.')
        git('commit', '-m', 'adapter separately changed')
        git('merge', '--no-ff', '--no-edit', incoming)
        verify_source(self.root, incoming)
        self.generate()
        self.assertIn('New upstream step.', (self.layout.published / 'skills/example/SKILL.md').read_text())
        self.assertEqual((self.layout.published / 'adaptation.md').read_text(), 'adapter v2')
        (self.source / 'untracked').write_text('extra')
        with self.assertRaisesRegex(ValueError, 'untracked'):
            verify_source(self.root, incoming)
        (self.source / 'untracked').unlink()
        executable = self.source / 'skills/example/run.sh'
        executable.chmod(0o644)
        with self.assertRaisesRegex(ValueError, 'run.sh'):
            verify_source(self.root, incoming)
        executable.unlink()
        executable.symlink_to('SKILL.md')
        with self.assertRaisesRegex(ValueError, 'run.sh'):
            verify_source(self.root, incoming)


if __name__ == '__main__':
    unittest.main()
