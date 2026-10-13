from pathlib import Path
import shutil
import tempfile
import unittest

from prepare import ROOT
from runtime import REQUIRED_LINKS, validate_wrappers


class ResourceTests(unittest.TestCase):
    def test_wrapper_reading_exists_and_deletion_is_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            for owner, targets in REQUIRED_LINKS.items():
                for name in (owner, *targets):
                    source = ROOT / ('tools/portable/assets' if name.startswith('runtime-agents/') else 'portable/pstack') / name
                    destination = root / name
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(source, destination)
            validate_wrappers(root)
            for targets in REQUIRED_LINKS.values():
                for name in targets:
                    path = root / name
                    data = path.read_bytes()
                    path.unlink()
                    with self.assertRaisesRegex(ValueError, 'Missing required'):
                        validate_wrappers(root)
                    path.write_bytes(data)


class PackageTests(unittest.TestCase):
    def test_real_package_and_missing_resources(self):
        from runtime import validate_resources, native_agents
        with tempfile.TemporaryDirectory(prefix='plugin path spaces ') as temporary:
            package = Path(temporary) / 'package'
            shutil.copytree(ROOT / 'portable/pstack', package)
            validate_resources(package, ROOT / 'pstack')
            targets = [*REQUIRED_LINKS, *(p[2:] for p in native_agents()),
                       '.claude-plugin/plugin.json', '.codex-plugin/plugin.json',
                       'hooks/hooks.json', 'hooks/codex-hooks.json', 'hooks/session-start.sh',
                       'hooks/session-start-context.md', 'LICENSE-CURSOR-TEAM-KIT', 'DESLOP_SOURCE.md',
                       'skills/deslop/LICENSE-CURSOR-TEAM-KIT', 'skills/deslop/DESLOP_SOURCE.md',
                       'skills/poteto-mode/references/LICENSE-CURSOR-TEAM-KIT',
                       'skills/poteto-mode/references/DESLOP_SOURCE.md',
                       'skills/poteto-help/agents/openai.yaml', 'skills/ketchup/agents/openai.yaml']
            for name in dict.fromkeys(targets):
                with self.subTest(name=name):
                    path = package / name
                    data, mode = path.read_bytes(), path.stat().st_mode
                    path.unlink()
                    with self.assertRaises(ValueError):
                        validate_resources(package, ROOT / 'pstack')
                    path.write_bytes(data)
                    path.chmod(mode)
            path = package / 'runtime-agents/poteto-agent.md'
            original = path.read_text()
            path.write_text(original.replace('${CLAUDE_PLUGIN_ROOT}/skills/poteto-mode/references/runtime-adaptation.md', '${CLAUDE_PLUGIN_ROOT}/compatibility.md'))
            with self.assertRaises(ValueError):
                validate_resources(package, ROOT / 'pstack')

    def test_ketchup_explicit_invocation_is_enforced_on_both_hosts(self):
        from runtime import validate_resources
        with tempfile.TemporaryDirectory() as temporary:
            package = Path(temporary) / 'package'
            shutil.copytree(ROOT / 'portable/pstack', package)
            skill = package / 'skills/ketchup/SKILL.md'
            original = skill.read_text()
            skill.write_text(original.replace('disable-model-invocation: true\n', ''))
            with self.assertRaisesRegex(ValueError, 'ketchup must require explicit invocation'):
                validate_resources(package, ROOT / 'pstack')
            skill.write_text(original)
            policy = package / 'skills/ketchup/agents/openai.yaml'
            policy.write_text('policy:\n  allow_implicit_invocation: true\n')
            with self.assertRaisesRegex(ValueError, 'ketchup Codex invocation policy differs'):
                validate_resources(package, ROOT / 'pstack')

    def test_metadata_duplicate_and_paths(self):
        from prepare import prepare
        from runtime import local_path
        with self.assertRaisesRegex(ValueError, 'Duplicate YAML'):
            prepare('---\nname: x\ndescription: one\ndescription: two\n---\nBody\n', 'x')
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            (root / 'good').write_text('good')
            self.assertEqual(local_path(root, 'good').read_text(), 'good')
            (root / 'link').symlink_to(root / 'good')
            for name in ('/etc/passwd', '../good', 'link'):
                with self.assertRaises(ValueError):
                    local_path(root, name)


class HookTests(unittest.TestCase):
    def test_hooks_are_read_only_and_respect_sheet_directives(self):
        import os
        import subprocess
        import json
        with tempfile.TemporaryDirectory(prefix='pstack hook spaces ') as temporary:
            root = Path(temporary)
            hooks = root / 'plugin with spaces/hooks'
            shutil.copytree(ROOT / 'portable/pstack/hooks', hooks)
            script = hooks / 'session-start.sh'
            expected = (hooks / 'session-start-context.md').read_text()
            for runtime, variable in [('claude', 'CLAUDE_CONFIG_DIR'), ('codex', 'CODEX_HOME')]:
                home = root / runtime
                home.mkdir()
                env = os.environ | {'HOME': str(root / 'unused home'), variable: str(home)}
                sheet = home / 'pstack-models.md'
                def invoke():
                    definition = 'hooks.json' if runtime == 'claude' else 'codex-hooks.json'
                    command = json.loads((hooks / definition).read_text())['hooks']['SessionStart'][0]['hooks'][0]['command']
                    hook_env = env | {'CLAUDE_PLUGIN_ROOT': str(hooks.parent), 'PLUGIN_ROOT': str(hooks.parent)}
                    return subprocess.run(command, shell=True, input='$(touch SHOULD_NOT_EXIST)',
                                          text=True, capture_output=True, env=hook_env, check=True)
                self.assertEqual(invoke().stdout, expected)
                for contents, enabled, warning in [
                    ('session hook: on\n', True, False),
                    ('session hook: off\n', False, False),
                    ('session hook: off\nsession hook: on\n', False, True),
                    ('session hook: invalid\n', False, True),
                    ('bug-fix: $(touch SHOULD_NOT_EXIST)\n', True, False),
                ]:
                    sheet.write_text(contents)
                    result = invoke()
                    self.assertEqual(result.stdout, expected if enabled else '')
                    self.assertEqual(bool(result.stderr), warning)
                    self.assertEqual(sheet.read_text(), contents)
                    self.assertNotIn('$(touch', result.stdout)
                sheet.chmod(0o000)
                result = invoke()
                self.assertEqual(result.stdout, '')
                self.assertIn('unreadable', result.stderr)
                sheet.chmod(0o644)
                sheet.unlink()
                sheet.symlink_to(home / 'missing')
                result = invoke()
                self.assertEqual(result.stdout, '')
                self.assertIn('unreadable', result.stderr)
                sheet.unlink()
                sheet.mkdir()
                self.assertEqual(invoke().stdout, '')
                sheet.rmdir()
            for runtime, directory in [('claude', '.claude'), ('codex', '.codex')]:
                fallback = root / 'fallback home' / directory
                fallback.mkdir(parents=True)
                (fallback / 'pstack-models.md').write_text('session hook: off\n')
                fallback_env = os.environ.copy()
                fallback_env.pop('CLAUDE_CONFIG_DIR', None)
                fallback_env.pop('CODEX_HOME', None)
                fallback_env['HOME'] = str(root / 'fallback home')
                result = subprocess.run(['sh', str(script), runtime], text=True, capture_output=True, env=fallback_env)
                self.assertEqual(result.stdout, '')
                (fallback / 'pstack-models.md').unlink()
                result = subprocess.run(['sh', str(script), runtime], text=True, capture_output=True, env=fallback_env)
                self.assertEqual(result.stdout, expected)
            result = subprocess.run(['sh', str(script), 'unknown'], text=True, capture_output=True)
            self.assertEqual(result.stdout, '')
            self.assertIn('unknown runtime', result.stderr)
            (hooks / 'session-start-context.md').unlink()
            result = subprocess.run(['sh', str(script), 'claude'], text=True, capture_output=True,
                                    env=os.environ | {'CLAUDE_CONFIG_DIR': str(root / 'absent')})
            self.assertEqual(result.stdout, '')
            self.assertIn('context unreadable', result.stderr)
            self.assertFalse((ROOT / 'SHOULD_NOT_EXIST').exists())


class MutationTests(unittest.TestCase):
    def test_variant_manifest_metadata_body_and_role_mutations(self):
        from runtime import validate_resources
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            package = root / 'portable/pstack'
            upstream = root / 'pstack'
            shutil.copytree(ROOT / 'portable/pstack', package)
            shutil.copytree(ROOT / 'pstack', upstream)
            shutil.copytree(ROOT / 'cursor-team-kit/skills/deslop', root / 'cursor-team-kit/skills/deslop')
            shutil.copyfile(ROOT / 'cursor-team-kit/LICENSE', root / 'cursor-team-kit/LICENSE')
            validate_resources(package, upstream)
            mutations = [
                (package / 'runtime-agents/poteto-agent-high.md', 'effort: high', 'effort: max'),
                (package / '.claude-plugin/plugin.json', './runtime-agents/poteto-agent.md', './runtime-agents/missing.md'),
                (package / 'hooks/codex-hooks.json', 'startup|resume|clear|compact', 'startup'),
                (package / 'skills/poteto-mode/SKILL.md', 'name: poteto-mode', 'disable-model-invocation: true\nname: poteto-mode'),
                (package / 'skills/poteto-help/SKILL.md', 'disable-model-invocation: true', 'disable-model-invocation: false'),
                (package / 'skills/poteto-help/SKILL.md', 'disable-model-invocation: true\n', ''),
                (package / 'skills/poteto-help/SKILL.md', 'disable-model-invocation: true', 'disable-model-invocation: 1'),
                (package / 'skills/poteto-help/agents/openai.yaml', 'allow_implicit_invocation: false', 'allow_implicit_invocation: true'),
                (package / 'skills/poteto-help/agents/openai.yaml', 'allow_implicit_invocation: false', 'allow_implicit_invocation: 0'),
                (package / 'skills/poteto-help/agents/openai.yaml', 'policy:\n  allow_implicit_invocation: false', 'policy: null'),
                (package / 'skills/principle-model-the-domain/SKILL.md', 'user-invocable: false', 'user-invocable: true'),
                (package / 'skills/deslop/SKILL.md', '# Remove AI code slop', '# Changed'),
                (upstream / 'skills/setup-pstack/SKILL.md', 'hardest tasks:', 'strongest judgment:'),
            ]
            for path, old, new in mutations:
                with self.subTest(path=path):
                    original = path.read_text()
                    self.assertIn(old, original)
                    path.write_text(original.replace(old, new))
                    with self.assertRaises(ValueError):
                        validate_resources(package, upstream)
                    path.write_text(original)
            script = package / 'hooks/session-start.sh'
            script.chmod(0o644)
            with self.assertRaisesRegex(ValueError, 'not executable'):
                validate_resources(package, upstream)
