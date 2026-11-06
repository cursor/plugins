const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');
const test = require('node:test');

async function fixture(t, overrides = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sdk-triage-state-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const statePath = path.join(dir, 'state.json');
  const doc = await fs.readFile(path.join(__dirname, '../skills/cursor-sdk/references/patterns.md'), 'utf8');
  const start = doc.indexOf('async function readState()');
  const source = doc.slice(start, doc.indexOf('\nmain();', start));
  const ctx = vm.createContext({ STATE_PATH: statePath, randomUUID, readFile: fs.readFile, writeFile: fs.writeFile, rename: fs.rename, rm: fs.rm, ...overrides });
  vm.runInContext(stripTypeScriptTypes(source), ctx);
  return { ctx, statePath, dir };
}

test('first invocation with no state starts empty', async t => {
  const s = await fixture(t);
  assert.deepEqual(JSON.parse(JSON.stringify(await s.ctx.readState())), {});
});

test('corrupted persisted agent identity is surfaced instead of silently forgotten', async t => {
  const s = await fixture(t); await fs.writeFile(s.statePath, '{"agentId":');
  await assert.rejects(s.ctx.readState());
});

test('partial write failure preserves the last durable agent identity', async t => {
  const failure = Object.assign(new Error('disk full'), { code: 'ENOSPC' });
  const s = await fixture(t, { writeFile: async (p, content) => { await fs.writeFile(p, content.slice(0, 5)); throw failure; } });
  const before = '{"agentId":"previous","lastRunId":"run-old"}';
  await fs.writeFile(s.statePath, before);
  await assert.rejects(s.ctx.writeState({ agentId: 'next', lastRunId: 'run-new' }), error => error === failure);
  assert.equal(await fs.readFile(s.statePath, 'utf8'), before);
  assert.deepEqual(await fs.readdir(s.dir), ['state.json']);
});

test('successful persistence can be read on the next invocation', async t => {
  const s = await fixture(t); const next = { agentId: 'new', lastRunId: 'run-new' };
  await s.ctx.writeState(next);
  assert.deepEqual(JSON.parse(JSON.stringify(await s.ctx.readState())), next);
  assert.deepEqual(await fs.readdir(s.dir), ['state.json']);
});
