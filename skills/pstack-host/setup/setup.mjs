#!/usr/bin/env node
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
const hash = text => createHash('sha256').update(text).digest('hex');
const optional = async path => { try { return await readFile(path, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
const begin = '# BEGIN PSTACK MANAGED';
const end = '# END PSTACK MANAGED';
function section(text) {
  const first = text.indexOf(begin), last = text.indexOf(end);
  if (first < 0 || last < first || text.indexOf(begin, first + begin.length) >= 0 || text.indexOf(end, last + end.length) >= 0) return null;
  return text.slice(first, last + end.length);
}
async function safeTarget(path, project) {
  for (let cursor = path; ; cursor = dirname(cursor)) {
    try { if ((await lstat(cursor)).isSymbolicLink()) throw new Error(`Refusing symlink target: ${cursor}`); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (cursor === project || cursor === dirname(cursor)) break;
  }
}
export async function setup({ host, project, pack = resolve(dirname(fileURLToPath(import.meta.url)), '..'), potetoSkill }) {
  if (!['codex', 'claude-code'].includes(host)) throw new Error('host must be codex or claude-code');
  project = resolve(project);
  const source = JSON.parse(await readFile(join(pack, 'source.json'), 'utf8'));
  if (!/^[a-f0-9]{40}$/.test(source.upstreamCommit)) throw new Error('source.json requires upstreamCommit (40 hexadecimal characters)');
  const poteto = resolve(potetoSkill ?? join(pack, '..', 'poteto-mode', 'SKILL.md'));
  await readFile(poteto, 'utf8');
  const statePath = join(project, '.pstack', 'setup', `${host}.json`);
  await safeTarget(statePath, project);
  const oldText = await optional(statePath);
  const old = oldText ? JSON.parse(oldText) : { files: {} };
  if (!old.files || typeof old.files !== 'object') throw new Error('Invalid setup state');
  const proposed = [];
  for (const name of ['poteto-agent', 'comment-sicko']) {
    const original = await readFile(join(pack, 'agents', `${name}.md`), 'utf8');
    const match = original.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`Invalid agent source: ${name}`);
    const description = match[1].match(/^description: (.*)$/m)?.[1];
    if (!description) throw new Error(`Missing agent description: ${name}`);
    const instructions = match[2].trimEnd() + `\n\n## Host adaptation (${host})\n\nThe host instructions here override Cursor-specific paths and APIs above. The installed poteto-mode instruction path is ${JSON.stringify(poteto)}. Read it in full when required; never search Cursor plugin caches. The parent owns orchestration. Use the host's native delegation and wait/resume APIs only when available; report missing capabilities. Do not pass Cursor model slugs. Inherit the parent model unless a user-selected, available host model is supplied. Prompt constraints do not provide tool or sandbox isolation.\n`;
    const managed = host === 'codex'
      ? `${begin}\nname = ${JSON.stringify(name)}\ndescription = ${JSON.stringify(description)}\ndeveloper_instructions = ${JSON.stringify(instructions)}\n${end}`
      : `${begin}\n${instructions}${end}`;
    const path = join(project, host === 'codex' ? '.codex' : '.claude', 'agents', `${name}.${host === 'codex' ? 'toml' : 'md'}`);
    await safeTarget(path, project);
    const current = await optional(path), record = old.files[name];
    let content = host === 'codex' ? `${managed}\n` : `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n${managed}\n`;
    let status = 'create';
    if (current !== null) {
      if (!record || section(current) === null || hash(section(current)) !== record.managedHash) {
        proposed.push({ name, path, status: 'conflict', current, proposed: content });
        continue;
      }
      content = current.replace(section(current), managed);
      status = content === current ? 'unchanged' : 'update';
    } else if (record) {
      proposed.push({ name, path, status: 'conflict', current, proposed: content });
      continue;
    }
    proposed.push({ name, path, status, content, managedHash: hash(managed) });
  }
  const memoryPath = join(project, host === 'codex' ? 'AGENTS.md' : 'CLAUDE.md');
  await safeTarget(memoryPath, project);
  const memory = await optional(memoryPath);
  const memoryRecord = old.files['project-instructions'];
  const memoryManaged = `${begin}\n## pstack host configuration\n\nUse native ${host} delegation. Load project agents poteto-agent and comment-sicko for their named roles. Read ${JSON.stringify(poteto)} in full when using poteto-mode. Inherit the parent model unless the user has selected an available host model. Cursor model slugs and reasoning suffixes are not host model identifiers. Preserve panel entry counts, including repeated inherited-model entries, and use different review angles when all entries share a model. Honor user model and permission configuration; prompt-only read constraints do not establish sandbox isolation.\n${end}`;
  const existingSection = memory === null ? null : section(memory);
  const memoryContent = existingSection ? memory.replace(existingSection, memoryManaged) : `${memory ?? ''}${memory ? '\n' : ''}${memoryManaged}\n`;
  if ((memoryRecord && (!existingSection || hash(existingSection) !== memoryRecord.managedHash)) || (!memoryRecord && existingSection)) {
    proposed.push({ name: 'project-instructions', path: memoryPath, status: 'conflict', current: memory, proposed: memoryContent });
  } else {
    proposed.push({ name: 'project-instructions', path: memoryPath, status: memoryContent === memory ? 'unchanged' : 'update', content: memoryContent, managedHash: hash(memoryManaged) });
  }
  const conflicts = proposed.filter(x => x.status === 'conflict');
  if (conflicts.length) return { host, sourceCommit: source.upstreamCommit, conflicts, files: proposed.map(({ name, path, status }) => ({ name, path, status })) };
  const state = { sourceCommit: source.upstreamCommit, files: {} };
  for (const item of proposed) {
    if (item.status !== 'unchanged') { await mkdir(dirname(item.path), { recursive: true }); await writeFile(item.path, item.content); }
    const verified = await readFile(item.path, 'utf8');
    if (verified !== item.content) throw new Error(`Readback mismatch: ${item.path}`);
    state.files[item.name] = { hash: hash(verified), managedHash: item.managedHash, content: verified };
  }
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2) + '\n');
  if (JSON.parse(await readFile(statePath, 'utf8')).sourceCommit !== source.upstreamCommit) throw new Error('State readback failed');
  return { host, sourceCommit: source.upstreamCommit, statePath, conflicts: [], files: proposed.map(({ name, path, status }) => ({ name, path, status })) };
}
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    const { values } = parseArgs({ options: { host: { type: 'string' }, project: { type: 'string' }, 'poteto-skill': { type: 'string' } } });
    if (!values.project) throw new Error('--project is required; setup never targets the user home by default');
    const result = await setup({ host: values.host, project: values.project, potetoSkill: values['poteto-skill'] });
    console.log(JSON.stringify(result, null, 2));
    if (result.conflicts.length) process.exitCode = 2;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
