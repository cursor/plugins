#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
const argument = key => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
const host = argument('--host');
if (!['codex', 'claude-code'].includes(host) || !argument('--skill-root')) {
  console.error('Use --host codex|claude-code --project <project> --skill-root <installed skill>.'); process.exit(2);
}
const project = resolve(argument('--project') || process.cwd());
const skillRoot = resolve(argument('--skill-root'));
let spec;
try { spec = JSON.parse(readFileSync(join(skillRoot, 'pstack-source.json'), 'utf8')); }
catch { console.error('Missing or invalid pstack-source.json in selected skill. Reinstall this skill.'); process.exit(1); }
const homeRoots = host === 'codex'
  ? ['.agents/skills', '.codex/skills'] : ['.claude/skills', '.agents/skills'];
const roots = [...homeRoots.map(p => join(project,p)), ...homeRoots.map(p => join(homedir(),p))];
if (host === 'codex') roots.push(join(process.env.CODEX_HOME || join(homedir(),'.codex'),'skills'));
roots.push(dirname(skillRoot));
const supportRoot = resolve(dirname(fileURLToPath(import.meta.url)));
function find(name) {
  return roots.map(root => join(root, name)).find(path => existsSync(join(path,'SKILL.md')));
}
function compatible(path, name) {
  if (!path) return false;
  try {
    if (name === 'pstack-host') {
      const metadata = JSON.parse(readFileSync(join(path,'source.json'),'utf8'));
      return metadata.format === spec.format && metadata.upstreamCommit === spec.upstreamCommit
        && ['HOST.md','agents/poteto-agent.md','agents/comment-sicko.md','setup/setup.mjs'].every(file => existsSync(join(path,file)));
    }
    const metadata = JSON.parse(readFileSync(join(path,'pstack-source.json'),'utf8'));
    return metadata.directory === name && metadata.format === spec.format && metadata.upstreamCommit === spec.upstreamCommit;
  } catch { return false; }
}
const required = [...new Set(['pstack-host', ...spec.requires])];
const missing = required.filter(name => !compatible(find(name),name));
if (missing.length) {
  console.error(`Missing or incompatible pstack dependencies: ${missing.join(', ')}`);
  console.error(`npx skills add '${spec.repository}' --skill ${missing.join(' ')} --agent ${host} -y`);
  process.exit(1);
}
const selected = find('pstack-host');
if (realpathSync(selected) !== realpathSync(supportRoot)) {
  console.error(`Use the preflight in the visible project-priority support directory: ${join(selected,'preflight.mjs')}`); process.exit(1);
}
console.log(`PSTACK_HOST_ROOT=${selected}`);
console.log(`${spec.name}: installed dependencies verified for ${host}.`);
