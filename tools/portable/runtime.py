from pathlib import Path
import re

EFFORTS = ('low', 'medium', 'high', 'xhigh', 'max')
ROLES = ('feature, refactoring', 'bug-fix', 'perf-issue', 'hillclimb', 'judgment and prose',
         'hardest tasks', 'how explorer', 'how explainer', 'why investigators', 'why synthesizer',
         'reflect tooling', 'reflect judgment, divergent, synthesizer', 'arena runners',
         'arena cross-judge pool', 'swarm workers', 'architect runners', 'interrogate reviewers')
WRAPPERS = ('poteto-agent', 'comment-sicko')
ADAPTATION = 'skills/poteto-mode/references/runtime-adaptation.md'
REQUIRED_LINKS = {
    'runtime-agents/poteto-agent.md': (ADAPTATION, 'skills/poteto-mode/SKILL.md'),
    'runtime-agents/comment-sicko.md': (ADAPTATION, 'skills/poteto-mode/references/portable-agents/comment-sicko.md'),
}

REQUIRED_LINKS['skills/poteto-mode/references/deslop.md'] = (ADAPTATION,)
REQUIRED_LINKS[ADAPTATION] = (
    'skills/poteto-mode/references/claude-dispatch.md',
    'skills/poteto-mode/references/codex-dispatch.md',
    'skills/poteto-mode/references/deslop.md',
    'skills/poteto-mode/scripts/portable-worktree-audit.py',
    'skills/poteto-mode/scripts/check-portable-plan.mjs',
    'skills/poteto-mode/scripts/check-plan.mjs',
)


def local_path(root, name):
    path = Path(name)
    if path.is_absolute() or '..' in path.parts:
        raise ValueError(f'Unsafe package path: {name}')
    target = root / path
    if not target.resolve().is_relative_to(root.resolve()) or any((root / Path(*path.parts[:i])).is_symlink() for i in range(1, len(path.parts) + 1)):
        raise ValueError(f'Unsafe package path: {name}')
    if not target.is_file():
        raise ValueError(f'Missing required resource: {name}')
    return target


def validate_links(root, owner, required):
    source = local_path(root, owner)
    actual = set()
    for link in re.findall(r'\[[^\]]+\]\(([^)]+)\)', source.read_text()):
        if '://' in link or link.startswith('#'):
            continue
        prefix = '${CLAUDE_PLUGIN_ROOT}/'
        target = root / link[len(prefix):] if link.startswith(prefix) else source.parent / link
        name = target.resolve().relative_to(root.resolve()).as_posix()
        local_path(root, name)
        actual.add(name)
    if actual != set(required):
        raise ValueError(f'Required links differ in {owner}: {sorted(actual)}')


def validate_wrappers(root):
    for owner, required in REQUIRED_LINKS.items():
        validate_links(root, owner, required)



def native_agents():
    return ['./runtime-agents/' + name + '.md' for base in WRAPPERS
            for name in (base, *(base + '-' + effort for effort in EFFORTS))]


def validate_resources(root, upstream):
    import json
    import yaml
    from prepare import NOTICE, frontmatter

    validate_wrappers(root)
    for base in WRAPPERS:
        metadata, body = frontmatter(local_path(root, f'runtime-agents/{base}.md').read_text())
        if base == 'comment-sicko' and metadata.get('tools') != 'Read, Grep, Glob':
            raise ValueError('Comment Sicko must use read-only tools')
        if metadata.get('model') != 'inherit' or 'effort' in metadata:
            raise ValueError(f'Invalid inherited agent: {base}')
        for effort in EFFORTS:
            owner = f'runtime-agents/{base}-{effort}.md'
            variant, variant_body = frontmatter(local_path(root, owner).read_text())
            if variant != metadata | {'name': base + '-' + effort, 'effort': effort} or variant_body != body:
                raise ValueError(f'Invalid effort variant: {owner}')
            validate_links(root, owner, REQUIRED_LINKS[f'runtime-agents/{base}.md'])
    for runtime in ('claude', 'codex'):
        manifest = json.loads(local_path(root, f'.{runtime}-plugin/plugin.json').read_text())
        if runtime == 'claude':
            if manifest.get('agents') != native_agents() or 'hooks' in manifest:
                raise ValueError('Claude native registration differs')
        elif 'agents' in manifest or manifest.get('hooks') != './hooks/codex-hooks.json':
            raise ValueError('Codex native registration differs')
        filename = 'hooks.json' if runtime == 'claude' else 'codex-hooks.json'
        hooks = json.loads(local_path(root, 'hooks/' + filename).read_text())
        variable = 'CLAUDE_PLUGIN_ROOT' if runtime == 'claude' else 'PLUGIN_ROOT'
        sources = 'startup|resume|clear|compact' + ('|fork' if runtime == 'claude' else '')
        expected = {'hooks': {'SessionStart': [{'matcher': sources, 'hooks': [
            {'type': 'command', 'command': f'sh "${{{variable}}}/hooks/session-start.sh" {runtime}'}]}]}}
        if hooks != expected:
            raise ValueError(f'Invalid {runtime} startup hook')
    script = local_path(root, 'hooks/session-start.sh')
    if not script.stat().st_mode & 0o111:
        raise ValueError('Startup hook is not executable')
    local_path(root, 'hooks/session-start-context.md')
    setup = (upstream / 'skills/setup-pstack/SKILL.md').read_text()
    model_rule = setup.split('```')[1].split('# budget:')[1]
    source_roles = re.findall(r'^([^#\n]+): [^\n]+$', model_rule, re.M)
    if tuple(source_roles) != ROLES:
        raise ValueError('Upstream model roles changed; review runtime contract')
    for source in (upstream / 'skills').glob('*/SKILL.md'):
        _, original = frontmatter(source.read_text())
        metadata, portable = frontmatter(local_path(root, 'skills/' + source.parent.name + '/SKILL.md').read_text())
        if portable != NOTICE + original:
            raise ValueError(f'Upstream skill body changed: {source.parent.name}')
        if any(key in metadata for key in ('mode', 'icon', 'color', 'reminder')):
            raise ValueError(f'Cursor metadata retained: {source.parent.name}')
        if source.parent.name in ('poteto-help', 'ketchup'):
            if metadata.get('disable-model-invocation') is not True:
                raise ValueError(f'{source.parent.name} must require explicit invocation')
            policy = yaml.safe_load(local_path(root, f'skills/{source.parent.name}/agents/openai.yaml').read_text())
            if policy != {'policy': {'allow_implicit_invocation': False}} or policy['policy']['allow_implicit_invocation'] is not False:
                raise ValueError(f'{source.parent.name} Codex invocation policy differs')
        elif 'disable-model-invocation' in metadata:
            raise ValueError(f'Workflow skill cannot be routed: {source.parent.name}')
        if source.parent.name.startswith('principle-') and metadata.get('user-invocable') is not False:
            raise ValueError('Principle metadata classification differs')
    for source in (upstream / 'skills/poteto-mode/playbooks').glob('*.md'):
        target = local_path(root, source.relative_to(upstream).as_posix())
        if source.read_bytes() != target.read_bytes():
            raise ValueError(f'Playbook changed: {source.name}')
    dependency = upstream.parent / 'cursor-team-kit'
    _, original = frontmatter((dependency / 'skills/deslop/SKILL.md').read_text())
    for name in ('skills/deslop/SKILL.md', 'skills/poteto-mode/references/deslop.md'):
        _, body = frontmatter(local_path(root, name).read_text())
        notice = NOTICE if name.startswith('skills/deslop/') else NOTICE.replace('../poteto-mode/references/runtime-adaptation.md', 'runtime-adaptation.md')
        if body != notice + original:
            raise ValueError('Deslop body changed')
    if local_path(root, 'LICENSE-CURSOR-TEAM-KIT').read_bytes() != (dependency / 'LICENSE').read_bytes():
        raise ValueError('Deslop license changed')
    provenance = local_path(root, 'DESLOP_SOURCE.md').read_bytes()
    license_data = (dependency / 'LICENSE').read_bytes()
    for directory in ('skills/deslop', 'skills/poteto-mode/references'):
        if local_path(root, directory + '/LICENSE-CURSOR-TEAM-KIT').read_bytes() != license_data:
            raise ValueError('Skills-only deslop license changed')
        if local_path(root, directory + '/DESLOP_SOURCE.md').read_bytes() != provenance:
            raise ValueError('Skills-only deslop provenance changed')
