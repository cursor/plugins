const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const vm = require('node:vm');
function snippet() {
  const markdown = fs.readFileSync(path.join(__dirname, '../skills/cursor-sdk/references/streaming.md'), 'utf8');
  return stripTypeScriptTypes(markdown.split('## Cancellation')[1].match(/```typescript\n([\s\S]*?)\n```/)[1]);
}
function setup({ wait = async () => ({}), streamError, cancelError, supports = true } = {}) {
  const timers = [], errors = []; let cancels = 0, drained = 0;
  const run = { supports: () => supports,
    async cancel() { cancels++; if (cancelError) throw cancelError; },
    async *stream() { if (streamError) throw streamError; drained++; }, wait,
  };
  const context = vm.createContext({ run, console: { error: (...args) => errors.push(args) },
    setTimeout(fn, delay) { const timer = { fn, delay, active: true }; timers.push(timer); return timer; },
    clearTimeout(timer) { if (timer) timer.active = false; },
  });
  const pending = vm.runInContext(`(async () => { ${snippet()} })()`, context);
  return { pending, timers, errors, cancels: () => cancels, drained: () => drained };
}

test('completed runs clear the timer after consuming the stream and waiting', async () => {
  const s = setup(); await s.pending;
  assert.equal(s.timers.filter((timer) => timer.active).length, 0);
  assert.equal(s.drained(), 1); assert.equal(s.cancels(), 0);
});

test('wait rejection also clears the timer and preserves the failure', async () => {
  const error = new Error('wait failed'); const s = setup({ wait: async () => { throw error; } });
  await assert.rejects(s.pending, (actual) => actual === error);
  assert.equal(s.timers.filter((timer) => timer.active).length, 0);
});

test('stream failure also clears the timer and preserves the failure', async () => {
  const error = new Error('stream failed'); const s = setup({ streamError: error });
  await assert.rejects(s.pending, (actual) => actual === error);
  assert.equal(s.timers.filter((timer) => timer.active).length, 0);
});

test('the deadline still cancels an active run and reports cancellation rejection', async () => {
  let finish; const wait = new Promise((resolve) => { finish = resolve; });
  const error = new Error('cancel endpoint unavailable'); const s = setup({ wait: () => wait, cancelError: error });
  const result = s.timers[0].fn();
  // Contain the old snippet's returned rejected promise in this regression probe.
  if (result?.catch) await result.catch(() => {});
  await Promise.resolve(); await Promise.resolve();
  assert.equal(s.cancels(), 1); assert.equal(s.errors.length, 1);
  assert.ok(s.errors[0].includes(error));
  finish({}); await s.pending;
});

test('unsupported cancellation does not schedule a deadline', async () => {
  const s = setup({ supports: false }); await s.pending;
  assert.equal(s.timers.length, 0); assert.equal(s.cancels(), 0);
});

test('a completed run lets a real Node child exit without waiting thirty seconds', () => {
  const code = `const run = { supports: () => true, cancel: async () => {}, stream: async function*(){}, wait: async () => ({}) }; (async () => { ${snippet()} })();`;
  const child = spawnSync(process.execPath, ['-e', code], { timeout: 1500, encoding: 'utf8' });
  assert.equal(child.error, undefined, 'completed example left a live thirty-second timer');
  assert.equal(child.status, 0, child.stderr);
});
