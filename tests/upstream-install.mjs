#!/usr/bin/env node
// Exercise the published directories with the real, pinned skills installer.
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, lstatSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const source = resolve(process.argv[2] || 'skills');
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'pstack-upstream-install-')));
const cache = process.env.npm_config_cache || join(homedir(), '.npm');
const run = (command, args, options = {}) => spawnSync(command, args, { encoding: 'utf8', timeout: 120000, ...options });
const bootstrap = run('npx', ['--yes', 'skills@1.7.2', '--version']);
assert.equal(bootstrap.status, 0, bootstrap.stderr);
const candidates = readdirSync(join(cache, '_npx')).map(dir => join(cache, '_npx', dir, 'node_modules/skills'));
const packageRoot = candidates.find(path => existsSync(join(path, 'package.json')) && JSON.parse(readFileSync(join(path, 'package.json'))).version === '1.7.2');
assert.ok(packageRoot, 'Pinned skills CLI must be available after bootstrap');
const cli = join(packageRoot, 'bin/cli.mjs');
const snapshot = join(scratch, 'source/skills');
mkdirSync(join(scratch, 'source'));
cpSync(source, snapshot, { recursive: true });
const manifest = JSON.parse(readFileSync(join(snapshot, 'pstack-host/source.json')));
assert.equal(manifest.skills.length, 54);
const entries = [...manifest.skills, { directory: 'pstack-host', name: 'pstack-host' }];
const sanitized = name => name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
function files(root, prefix = '') {
  return readdirSync(join(root, prefix)).sort().flatMap(name => {
    const path = join(prefix, name);
    return statSync(join(root, path)).isDirectory() ? files(root, path) : [path];
  });
}
function digest(root) {
  const hash = createHash('sha256');
  for (const file of files(root)) hash.update(file).update(String(statSync(join(root, file)).mode & 0o777)).update(readFileSync(join(root, file)));
  return hash.digest('hex');
}
function compare(expected, actual) {
  assert.deepEqual(files(actual), files(expected), `File inventory: ${actual}`);
  for (const file of files(expected)) {
    assert.deepEqual(readFileSync(join(actual, file)), readFileSync(join(expected, file)), `${actual}/${file}`);
    assert.equal(statSync(join(actual, file)).mode & 0o777, statSync(join(expected, file)).mode & 0o777, `File permissions: ${file}`);
  }
}
const scenarios = [];
for (const hosts of [['codex'], ['claude-code'], ['codex', 'claude-code']]) {
  for (const global of [false, true]) {
    for (const all of [false, true]) {
      // Single-host default copy, single-host explicit copy, multi-host links and copies.
      scenarios.push({ hosts, global, all, copy: all });
    }
  }
}
const installed = [];
for (const [index, scenario] of scenarios.entries()) {
  const root = join(scratch, `case-${index}`), home = join(root, 'home'), project = join(root, 'project');
  mkdirSync(home, { recursive: true }); mkdirSync(project);
  const env = { ...process.env, HOME: home, CODEX_HOME: join(home, '.codex'), CLAUDE_CONFIG_DIR: join(home, '.claude'), DISABLE_TELEMETRY: '1', DO_NOT_TRACK: '1' };
  const args = [cli, 'add', join(scratch, 'source'), '--skill', ...(scenario.all ? ['*'] : ['principle-foundational-thinking', 'pstack-host']), '--agent', ...scenario.hosts, '-y'];
  if (scenario.global) args.push('-g');
  if (scenario.copy) args.push('--copy');
  const result = run(process.execPath, args, { cwd: project, env });
  writeFileSync(join(root, 'install.log'), result.stdout + result.stderr);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const scope = scenario.global ? home : project;
  const selected = scenario.all ? entries : entries.filter(e => ['principle-foundational-thinking', 'pstack-host'].includes(e.directory));
  const hostRoots = scenario.hosts.map(host => ({ host, root: join(scope, host === 'codex' ? '.agents/skills' : '.claude/skills') }));
  for (const { host, root: hostRoot } of hostRoots) {
    assert.equal(readdirSync(hostRoot).length, selected.length);
    for (const entry of selected) compare(join(snapshot, entry.directory), join(hostRoot, sanitized(entry.name)));
    if (scenario.hosts.length === 2 && host === 'claude-code') assert.equal(lstatSync(join(hostRoot, 'pstack-host')).isSymbolicLink(), !scenario.copy);
  }
  installed.push({ ...scenario, root, env, project, hostRoots, selected });
}
const setupRoot = join(scratch, 'setup-subset'), setupHome = join(setupRoot, 'home'), setupProject = join(setupRoot, 'project');
mkdirSync(setupHome, { recursive: true }); mkdirSync(setupProject);
const setupEnv = { ...process.env, HOME: setupHome, CODEX_HOME: join(setupHome, '.codex'), CLAUDE_CONFIG_DIR: join(setupHome, '.claude'), DISABLE_TELEMETRY: '1', DO_NOT_TRACK: '1' };
const setupSkills = join(setupProject, '.agents/skills');
const setupMetadata = JSON.parse(readFileSync(join(snapshot, 'setup-pstack/pstack-source.json')));
assert.ok(setupMetadata.requires.includes('poteto-mode'), 'setup registers agents referencing poteto-mode');
function setupInstall(names) {
  const result = run(process.execPath, [cli, 'add', join(scratch, 'source'), '--skill', ...names, '--agent', 'codex', '-y', '--copy'], { cwd: setupProject, env: setupEnv });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result;
}
const setupInitial = setupInstall(['setup-pstack', 'pstack-host', ...setupMetadata.requires.filter(name => name !== 'poteto-mode')]);
function setupPreflight(skill) {
  return run(process.execPath, [join(setupSkills, 'pstack-host/preflight.mjs'), '--host', 'codex', '--project', setupProject, '--skill-root', join(setupSkills, skill)], { cwd: setupProject, env: setupEnv });
}
const setupMissing = setupPreflight('setup-pstack');
assert.equal(setupMissing.status, 1, setupMissing.stdout + setupMissing.stderr);
assert.ok(setupMissing.stderr.includes(`npx skills add '${setupMetadata.repository}' --skill poteto-mode --agent codex -y`), setupMissing.stderr);
const setupSupplement = setupInstall(['Poteto Mode']);
writeFileSync(join(setupRoot, 'install.log'), setupInitial.stdout + setupInitial.stderr + setupMissing.stderr + setupSupplement.stdout + setupSupplement.stderr);
renameSync(join(scratch, 'source'), join(scratch, 'source-removed'));
const frozenSnapshot = join(scratch, 'source-removed/skills');
function preflight(item, hostRoot, expected = 0, support = join(hostRoot.root, 'pstack-host')) {
  const result = run(process.execPath, [join(support, 'preflight.mjs'), '--host', hostRoot.host, '--project', item.project, '--skill-root', join(hostRoot.root, 'principle-foundational-thinking')], { cwd: item.project, env: item.env });
  assert.equal(result.status, expected, result.stdout + result.stderr);
  if (!expected) assert.ok(result.stdout.includes(`PSTACK_HOST_ROOT=${support}`), result.stdout);
  return result;
}
for (const item of installed) {
  for (const hostRoot of item.hostRoots) {
    const before = digest(hostRoot.root);
    preflight(item, hostRoot);
    for (const entry of item.selected) compare(join(frozenSnapshot, entry.directory), join(hostRoot.root, sanitized(entry.name)));
    assert.equal(digest(hostRoot.root), before);
  }
  console.log(`PASS ${item.hosts.join('+')} ${item.global ? 'global' : 'project'} ${item.all ? '55 entries' : 'subset'} ${item.copy ? 'copy' : 'default'}`);
}
const item = installed.find(i => i.global && i.hosts.length === 1 && i.hosts[0] === 'codex' && !i.all);
const hostRoot = item.hostRoots[0], support = join(hostRoot.root, 'pstack-host');
const metadataPath = join(support, 'source.json'), original = readFileSync(metadataPath);
for (const change of [{ upstreamCommit: 'wrong' }, { format: -1 }]) {
  writeFileSync(metadataPath, JSON.stringify({ ...JSON.parse(original), ...change }));
  const rejected = preflight(item, hostRoot, 1);
  assert.ok(rejected.stderr.includes(JSON.parse(readFileSync(join(hostRoot.root, 'principle-foundational-thinking/pstack-source.json'))).repository));
}
writeFileSync(metadataPath, original);
writeFileSync(metadataPath, '{broken json');
preflight(item, hostRoot, 1);
writeFileSync(metadataPath, original);
const projectSupport = join(item.project, '.agents/skills/pstack-host');
mkdirSync(join(item.project, '.agents/skills'), { recursive: true });
cpSync(support, projectSupport, { recursive: true });
writeFileSync(join(projectSupport, 'source.json'), '{}');
preflight(item, hostRoot, 1);
writeFileSync(join(projectSupport, 'source.json'), original);
preflight(item, hostRoot, 0, projectSupport);
preflight(item, hostRoot, 1);
rmSync(projectSupport, { recursive: true });
renameSync(support, `${support}-removed`);
const missing = run(process.execPath, [join(support + '-removed', 'preflight.mjs'), '--host', 'codex', '--project', item.project, '--skill-root', join(hostRoot.root, 'principle-foundational-thinking')], { cwd: item.project, env: item.env });
assert.equal(missing.status, 1, missing.stdout + missing.stderr);
renameSync(`${support}-removed`, support);
preflight(item, hostRoot);
console.log('PASS dependency rejection and project precedence');
const setupReady = setupPreflight('setup-pstack');
assert.equal(setupReady.status, 0, setupReady.stdout + setupReady.stderr);
// These are workflow dependencies of poteto-mode, not prerequisites for writing agents.
const potetoNotReady = setupPreflight('poteto-mode');
assert.equal(potetoNotReady.status, 1, 'The minimal setup subset must not accidentally install every workflow dependency');
const setupBefore = digest(setupSkills);
const setupResult = run(process.execPath, [join(setupSkills, 'pstack-host/setup/setup.mjs'), '--host', 'codex', '--project', setupProject, '--poteto-skill', join(setupSkills, 'poteto-mode/SKILL.md')], { cwd: setupProject, env: setupEnv });
assert.equal(setupResult.status, 0, setupResult.stdout + setupResult.stderr);
const setupState = JSON.parse(readFileSync(join(setupProject, '.pstack/setup/codex.json')));
assert.equal(setupState.sourceCommit, manifest.upstreamCommit);
for (const name of ['poteto-agent', 'comment-sicko']) {
  const agent = readFileSync(join(setupProject, '.codex/agents', `${name}.toml`), 'utf8');
  assert.ok(agent.includes(join(setupSkills, 'poteto-mode/SKILL.md')), 'Agent points to installed poteto-mode');
}
assert.equal(digest(setupSkills), setupBefore);
writeFileSync(join(setupRoot, 'setup.log'), setupReady.stdout + potetoNotReady.stderr + setupResult.stdout + setupResult.stderr);
console.log('PASS minimal setup: missing poteto rejected, supplement permits writing both named agents without workflow dependencies');
const toolCase = installed.find(i => i.all && !i.global && i.hosts.length === 1 && i.hosts[0] === 'codex');
const toolSkills = toolCase.hostRoots[0].root;
const immutableBefore = digest(toolSkills);
const tool = run('bun', [join(toolSkills, sanitized('Poteto Mode'), 'scripts/orch/orch.ts'), '--help'], { cwd: toolCase.project, env: toolCase.env });
writeFileSync(join(toolCase.root, 'orch-help.log'), tool.stdout + tool.stderr);
assert.equal(tool.status, 0, tool.stdout + tool.stderr);
assert.ok(tool.stdout.includes('Usage:'), tool.stdout);
assert.ok(existsSync(join(toolCase.project, '.pstack/tools')), 'Tool bootstrap must write into calling project');
assert.equal(digest(toolSkills), immutableBefore, 'Tool bootstrap must not modify installed skills');
console.log('PASS installed orch --help writes project cache and preserves installed hashes');
console.log(`CLI name "Make Bot UI" installs as "${sanitized('Make Bot UI')}"; original SKILL.md name preserved byte-for-byte.`);
console.log(`PASS 12 installation scenarios; logs and immutable source snapshot: ${scratch}`);
