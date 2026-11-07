import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  loadConfig, validateConfig, setupConfig, resolveRole, checkPanel, requireCapability,
} from '../lib/pstack-config.mjs';

const root = resolve(import.meta.dirname, '../..');
const cli = resolve(root, 'scripts/pstack-config.mjs');
const catalog = {
  models: [
    { id: 'gpt-exact-fast', family: 'gpt', reasoningEfforts: ['high'], speeds: ['standard', 'fast'] },
    { id: 'claude-exact-opus', family: 'claude', tier: 'opus', reasoningEfforts: ['medium'], speeds: ['standard'] },
    { id: 'claude-exact-sonnet', family: 'claude', tier: 'sonnet', speeds: ['fast'] },
    { id: 'xai-exact', family: 'xai', speeds: ['standard'] },
  ],
  selected: { id: 'host-exact-identity', family: 'xai' },
};

async function fixture(t) {
  const dir = resolve(import.meta.dirname, `.pstack-config-fixture-${randomUUID()}`);
  await mkdir(dir);
  t.after(() => rm(dir, { recursive: true, force: true }));
  const repo = resolve(dir, 'repo');
  const home = resolve(dir, 'home');
  const env = { HOME: home };
  const user = resolve(home, '.config/pstack/config.json');
  const repository = resolve(repo, '.pstack/config.json');
  const put = async (path, value) => {
    await mkdir(resolve(path, '..'), { recursive: true });
    await writeFile(path, typeof value === 'string' ? value : JSON.stringify(value));
  };
  return { dir, repo, home, env, user, repository, put };
}

async function defaults(t) {
  const f = await fixture(t);
  return loadConfig(f);
}

const route = (config, role, extra = {}) => resolveRole(config, role, {
  runtime: 'copilot-cli', catalog, ...extra,
});

test('load precedence merges role fields and limits, replacing arrays without dropping extensions', async t => {
  const f = await fixture(t);
  await f.put(f.user, {
    profile: 'user-profile',
    roles: { implementation: { reasoningEffort: 'high' }, review: [
      { id: 'user-first', family: 'gpt' }, { id: 'user-second', family: 'claude' },
    ] },
    nativeUnrelated: { keep: 1, nested: ['user'] },
  });
  await f.put(f.repository, {
    profile: 'repo-profile', limits: { maxWorkers: 3 },
    roles: { implementation: { speed: 'fast' } },
    nativeUnrelated: { other: 2, nested: ['repo'] },
  });
  const config = await loadConfig({
    ...f, override: { profile: 'cli-profile', roles: { implementation: { id: 'gpt-exact-fast' } } },
  });
  assert.equal(config.profile, 'cli-profile');
  assert.deepEqual(config.limits, { maxConcurrent: 2, maxWorkers: 3 });
  assert.deepEqual(config.roles.implementation, {
    family: 'gpt', fallback: 'inherit', reasoningEffort: 'high', speed: 'fast', id: 'gpt-exact-fast',
  });
  assert.deepEqual(config.roles.review.map(item => item.id), ['user-first', 'user-second']);
  assert.deepEqual(config.nativeUnrelated, { keep: 1, other: 2, nested: ['repo'] });
  assert.equal(config.integrations.automations, false);
});

test('XDG and PSTACK_CONFIG override home default; supplied environment isolates lookup', async t => {
  const f = await fixture(t);
  const xdg = resolve(f.dir, 'xdg');
  const explicit = resolve(f.dir, 'explicit.json');
  await f.put(f.user, { profile: 'home' });
  await f.put(resolve(xdg, 'pstack/config.json'), { profile: 'xdg' });
  await f.put(explicit, { profile: 'explicit' });
  assert.equal((await loadConfig({ ...f, env: { HOME: f.home, XDG_CONFIG_HOME: xdg } })).profile, 'xdg');
  assert.equal((await loadConfig({ ...f, env: { HOME: f.home, XDG_CONFIG_HOME: xdg, PSTACK_CONFIG: explicit } })).profile, 'explicit');
});

test('malformed, inaccessible, and invalid config are not silently ignored', async t => {
  const f = await fixture(t);
  await f.put(f.user, '{broken');
  await assert.rejects(loadConfig(f), /Invalid JSON.*config.json/);
  await f.put(f.user, []);
  await assert.rejects(loadConfig(f), /config must be a JSON object/);
  await f.put(f.user, { limits: { maxWorkers: 0 } });
  await assert.rejects(loadConfig({ ...f, override: { limits: { maxWorkers: 2 } } }), /positive integer/);
  await rm(f.user);
  await mkdir(f.user);
  await assert.rejects(loadConfig(f), /Cannot read JSON/);
});

test('known selectors and settings validate; unknown extension data survive', async t => {
  const config = await defaults(t);
  for (const patch of [
    { schemaVersion: 2 },
    { profile: '' },
    { limits: { maxConcurrent: 1.5 } },
    { integrations: { github: 'false' } },
    { roles: { implementation: { family: 'unknown' } } },
    { roles: { implementation: { id: '' } } },
    { roles: { implementation: { speed: 'turbo' } } },
    { roles: { implementation: { tier: 'invented' } } },
    { roles: { implementation: { reasoningEffort: 2 } } },
    { roles: { implementation: { fallback: 'guess' } } },
    { roles: { implementation: { fallback: [] } } },
    { roles: { implementation: { fallback: [{ family: 'gpt' }] } } },
    { roles: { review: [{ family: 'gpt' }] } },
  ]) assert.throws(() => validateConfig(patch, { partial: true }));
  assert.throws(() => validateConfig({ ...config, roles: { ...config.roles, implementation: {} } }), /requires id or family/);
  assert.equal(validateConfig({ ...config, extension: { custom: true } }).extension.custom, true);
  assert.doesNotThrow(() => validateConfig({ roles: { implementation: { reasoningEffort: 'custom-supported-value' } } }, { partial: true }));
});

test('setup preserves unrelated target data, is atomic and idempotent, and never edits host config', async t => {
  const f = await fixture(t);
  const host = resolve(f.home, '.config/Code/User/settings.json');
  await f.put(host, { untouched: true });
  await f.put(f.user, { unrelated: { values: [1, 2], flag: true }, roles: { implementation: { reasoningEffort: 'high' } } });
  const input = resolve(f.dir, 'input.json');
  await f.put(input, { limits: { maxWorkers: 4 }, unrelated: { additional: 'kept' } });
  const first = await setupConfig({ ...f, scope: 'user', input });
  assert.equal(first.path, f.user);
  assert.equal(first.changed, true);
  assert.deepEqual(first.config.unrelated, { values: [1, 2], flag: true, additional: 'kept' });
  assert.equal(first.config.roles.implementation.reasoningEffort, 'high');
  const before = await stat(f.user, { bigint: true });
  const text = await readFile(f.user, 'utf8');
  const second = await setupConfig({ ...f, scope: 'user', input });
  assert.equal(second.changed, false);
  assert.equal((await stat(f.user, { bigint: true })).mtimeNs, before.mtimeNs);
  assert.equal(await readFile(f.user, 'utf8'), text);
  assert.deepEqual(JSON.parse(await readFile(host, 'utf8')), { untouched: true });
  await assert.rejects(setupConfig({ ...f, scope: 'user', input: { limits: { maxWorkers: -1 } } }), /positive integer/);
  assert.equal(await readFile(f.user, 'utf8'), text);
});

test('repo setup includes user config; user setup ignores unrelated repository config', async t => {
  const f = await fixture(t);
  await f.put(f.user, { userExtension: { enabled: true }, profile: 'user-profile' });
  await f.put(f.repository, { repoExtension: true, profile: 'repo-profile' });
  const repoResult = await setupConfig({ ...f, scope: 'repo', input: { limits: { maxConcurrent: 1 } } });
  assert.equal(repoResult.config.repoExtension, true);
  assert.equal(repoResult.config.userExtension.enabled, true);
  assert.equal(repoResult.config.profile, 'repo-profile');
  const userResult = await setupConfig({ ...f, scope: 'user', input: {} });
  assert.equal(userResult.config.profile, 'user-profile');
  assert.equal(userResult.config.repoExtension, undefined);
  await assert.rejects(setupConfig({ ...f, scope: 'host', input: {} }), /scope/);
});

test('preserved special JSON keys cannot pollute prototypes', async t => {
  const f = await fixture(t);
  await f.put(f.user, '{"__proto__":{"pstackPolluted":true},"constructor":{"preserved":1}}');
  const config = await loadConfig(f);
  assert.equal(Object.prototype.pstackPolluted, undefined);
  assert.equal(Object.hasOwn(config, '__proto__'), true);
  assert.equal(config.__proto__.pstackPolluted, true);
  assert.equal(config.constructor.preserved, 1);
});

test('routing discovers metadata-backed preferences and returns exact catalog IDs unchanged', async t => {
  const config = await defaults(t);
  const implementation = route(config, 'implementation');
  assert.equal(implementation.model.id, 'gpt-exact-fast');
  assert.equal(route(config, 'architecture').model.id, 'claude-exact-opus');
  assert.deepEqual(route(config, 'exploration').controls, { speed: 'fast' });
  const exact = { ...config, roles: { ...config.roles, implementation: { id: 'gpt-exact-fast', fallback: 'stop' } } };
  assert.equal(route(exact, 'implementation').model.id, 'gpt-exact-fast');
  exact.roles.implementation.id = 'gpt-exact-fast-fast';
  assert.throws(() => route(exact, 'implementation'), /resolution stopped/);
  assert.equal(implementation.runtimePolicy.invoked, false);
  assert.equal(implementation.runtimePolicy.modelSelectionEnforced, false);
  assert.match(implementation.runtimePolicy.disclosure, /host policy remains authoritative/);
  assert.equal(route(config, 'implementation', { runtime: 'vscode-local' }).runtimePolicy.capabilities.perCallModelSelection, true);
});

test('unknown family/provider metadata never becomes an inferred family from ID', async t => {
  const config = await defaults(t);
  const unknown = {
    models: [
      { id: 'gpt-looks-like-gpt', provider: 'openai' },
      { id: 'claude-looks-like-claude', family: 'unrecognized', provider: 'anthropic' },
    ],
    selected: { id: 'opaque-host' },
  };
  const result = route(config, 'implementation', { catalog: unknown });
  assert.equal(result.model.id, 'opaque-host');
  assert.equal(result.model.family, undefined);
  assert.equal(result.inherited, true);
  assert.match(result.warnings[0], /Inheriting selected host model/);
  assert.throws(() => route(config, 'review', { catalog: unknown }), /resolution stopped/);
  const exact = structuredClone(config);
  exact.roles.implementation = { id: 'gpt-looks-like-gpt' };
  assert.equal(route(exact, 'implementation', { catalog: unknown }).model.id, 'gpt-looks-like-gpt');
});

test('unavailable preference stops; explicit inheritance leaves unexposed identity unknown', async t => {
  const config = await defaults(t);
  config.roles.implementation = { id: 'not-in-catalog' };
  assert.throws(() => route(config, 'implementation'), /resolution stopped/);
  config.roles.implementation.fallback = 'inherit';
  const inherited = route(config, 'implementation');
  assert.equal(inherited.model.id, catalog.selected.id);
  assert.equal(inherited.inherited, true);
  assert.ok(inherited.warnings.length);
  const unknown = route(config, 'implementation', { catalog: { models: [] } });
  assert.equal(unknown.model, null);
  assert.equal(unknown.inherited, true);
  assert.match(unknown.warnings[0], /identity and family are not exposed/);
  assert.equal(route(config, 'implementation', { catalog: undefined }).model, null);
  assert.throws(() => route(config, 'implementation', { catalog: { models: [], selected: {} } }), /exact ID/);
});

test('only explicit exact fallback list is used, in order and with visible warning', async t => {
  const config = await defaults(t);
  config.roles.implementation = {
    id: 'unavailable',
    fallback: [{ id: 'also-unavailable' }, { id: 'claude-exact-sonnet', speed: 'fast' }, { id: 'gpt-exact-fast' }],
  };
  const result = route(config, 'implementation');
  assert.equal(result.model.id, 'claude-exact-sonnet');
  assert.deepEqual(result.controls, { speed: 'fast' });
  assert.equal(result.inherited, false);
  assert.match(result.warnings[0], /explicit fallback/);
});

test('unsupported reasoning or speed fail rather than editing identity or silently discarding controls', async t => {
  const config = await defaults(t);
  config.roles.implementation = { id: 'gpt-exact-fast', reasoningEffort: 'high', speed: 'fast' };
  assert.deepEqual(route(config, 'implementation').controls, { reasoningEffort: 'high', speed: 'fast' });
  config.roles.implementation.reasoningEffort = 'unsupported';
  assert.throws(() => route(config, 'implementation'), /does not advertise reasoningEffort/);
  config.roles.implementation.fallback = 'inherit';
  const inherited = route(config, 'implementation');
  assert.deepEqual(inherited.controls, {});
  assert.match(inherited.warnings[0], /requested controls are not applied/);
  config.roles.implementation = { id: 'claude-exact-opus', speed: 'fast' };
  assert.throws(() => route(config, 'implementation'), /does not advertise speed/);
  config.roles.implementation = { id: 'xai-exact', reasoningEffort: 'high' };
  assert.throws(() => route(config, 'implementation'), /does not advertise reasoningEffort/);
});

test('host policy stays authoritative over config preferences and inheritance', async t => {
  const config = await defaults(t);
  config.hostPolicy = { allowedModelIds: ['gpt-exact-fast'] };
  assert.throws(() => route(config, 'implementation', { hostPolicy: { allowedModelIds: [] } }), /Host policy disallows/);
  assert.throws(() => route(config, 'implementation', {
    hostPolicy: { deniedModelIds: ['gpt-exact-fast', catalog.selected.id] },
  }), /Host policy disallows inherited/);
  assert.throws(() => route(config, 'review', {
    hostPolicy: { allowedFamilies: ['gpt'] },
  }), /Host policy disallows/);
  assert.throws(() => route(config, 'implementation', { hostPolicy: { allowedModelIds: 'all' } }), /string array/);
});

test('catalog validation rejects duplicate identities and conflicting selected metadata', async t => {
  const config = await defaults(t);
  assert.throws(() => route(config, 'implementation', { catalog: { models: [catalog.models[0], catalog.models[0]] } }), /Duplicate/);
  assert.throws(() => route(config, 'implementation', {
    catalog: { models: [{ id: 'opaque', speeds: 'fast' }] },
  }), /string array/);
  config.roles.implementation = { id: 'unavailable', fallback: 'inherit' };
  assert.throws(() => route(config, 'implementation', {
    catalog: { models: [catalog.models[0]], selected: { id: catalog.models[0].id, family: 'claude' } },
  }), /Conflicting selected/);
});

test('review requires available distinct metadata-backed families and never claims missing diversity', async t => {
  const config = await defaults(t);
  const result = route(config, 'review');
  assert.equal(result.panel.crossFamily, true);
  assert.equal(result.panel.verified, true);
  assert.deepEqual(result.members.map(member => member.model.id), ['gpt-exact-fast', 'claude-exact-opus']);
  assert.throws(() => route(config, 'review', { catalog: { models: [catalog.models[0]], selected: catalog.selected } }), /resolution stopped/);
  assert.throws(() => checkPanel([{ id: 'one' }, { id: 'two', family: 'claude' }]), /verified cross-family/);
  assert.throws(() => checkPanel([{ id: 'one', family: 'gpt' }, { id: 'two', family: 'gpt' }]), /verified cross-family/);
  assert.throws(() => checkPanel([{ id: 'one' }, { id: 'one' }], { mode: 'independent-unverified' }), /independent/);
  const panel = checkPanel([{ id: 'one' }, { id: 'two' }], { mode: 'independent-unverified' });
  assert.equal(panel.crossFamily, false);
  assert.equal(panel.verified, false);
  assert.match(panel.warnings[0], /no cross-family diversity claim/);
  assert.throws(() => checkPanel([{ id: 'one' }, { id: 'two' }], { mode: 'automatic' }), /panel mode/);
});

test('strict review cannot use inherited missing preferences to satisfy diversity', async t => {
  const config = await defaults(t);
  config.roles.review[1] = { family: 'claude', fallback: 'inherit' };
  assert.throws(() => route(config, 'review', {
    catalog: { models: [catalog.models[0]], selected: catalog.selected },
  }), /Strict panel.*inherit/);
});

test('explicit capability evidence distinguishes required failures from optional disclosed skips', () => {
  assert.deepEqual(requireCapability({ tests: true }, 'tests'), { capability: 'tests', supported: true, skipped: false });
  assert.throws(() => requireCapability({}, 'tests'), /Required capability unavailable/);
  assert.throws(() => requireCapability({ tests: 'yes' }, 'tests'), /not explicitly supported/);
  assert.deepEqual(requireCapability({}, 'tests', { required: false }), {
    capability: 'tests', supported: false, skipped: true, reason: 'tests is not explicitly supported',
  });
  assert.throws(() => requireCapability({ tests: true }, 'tests', { hostPolicy: { capabilities: { tests: false } } }), /Host policy prohibits/);
  assert.equal(requireCapability({ tests: true }, 'tests', {
    required: false, hostPolicy: { capabilities: { tests: false } },
  }).skipped, true);
  assert.throws(() => requireCapability({ cloudAgent: true }, 'cloudAgent'), /disabled/);
});

test('readers cannot receive shell or MCP and concurrent writers require worktree isolation', () => {
  assert.equal(requireCapability({ readers: true }, 'readers', { tools: ['read', 'search'] }).supported, true);
  for (const tools of [undefined, [], ['read', 'shell'], ['read', 'MCP'], ['read', 'mcp-read']]) {
    assert.throws(() => requireCapability({ readers: true }, 'readers', { tools }), /read\/search-only/);
  }
  assert.throws(() => requireCapability({ concurrentWriters: true }, 'concurrentWriters', { workers: 2 }), /worktrees/);
  assert.throws(() => requireCapability({ concurrentWriters: true }, 'concurrentWriters', { workers: 2, isolation: 'shared' }), /worktrees/);
  assert.equal(requireCapability({ concurrentWriters: true }, 'concurrentWriters', { workers: 2, isolation: 'worktree' }).supported, true);
  assert.equal(requireCapability({ concurrentWriters: true }, 'concurrentWriters', { workers: 2, required: false }).skipped, true);
});

test('CLI show/setup/resolve produce JSON, honor overrides, and report failures on stderr', async t => {
  const f = await fixture(t);
  const run = args => spawnSync(process.execPath, [cli, ...args, '--repo', f.repo], {
    cwd: root, encoding: 'utf8', env: { ...process.env, HOME: f.home, XDG_CONFIG_HOME: '', PSTACK_CONFIG: '' },
  });
  const show = run(['show', '--override', '{"profile":"cli-custom"}']);
  assert.equal(show.status, 0, show.stderr);
  assert.equal(JSON.parse(show.stdout).profile, 'cli-custom');
  const input = resolve(f.dir, 'input.json');
  await f.put(input, { limits: { maxWorkers: 2 } });
  const setup = run(['setup', '--input', input, '--scope', 'repo']);
  assert.equal(setup.status, 0, setup.stderr);
  assert.equal(JSON.parse(setup.stdout).changed, true);
  assert.equal(JSON.parse(run(['setup', '--input', input, '--scope', 'repo']).stdout).changed, false);
  const catalogPath = resolve(f.dir, 'catalog.json');
  await f.put(catalogPath, catalog);
  const resolution = run(['resolve', '--runtime', 'copilot-cli', '--role', 'review', '--catalog', catalogPath]);
  assert.equal(resolution.status, 0, resolution.stderr);
  assert.equal(JSON.parse(resolution.stdout).panel.crossFamily, true);
  for (const args of [
    ['resolve', '--runtime', 'copilot-cli', '--role', 'review'],
    ['resolve', '--runtime', 'made-up', '--role', 'review', '--catalog', catalogPath],
    ['setup', '--input', input, '--scope', 'native-host'],
    ['show', '--override', '{broken'],
    ['show', '--unknown-option'],
  ]) {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.equal(typeof JSON.parse(result.stderr).error, 'string');
  }
});
