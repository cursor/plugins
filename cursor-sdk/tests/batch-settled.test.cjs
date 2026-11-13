const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');
function helper() {
  const markdown = fs.readFileSync(path.join(__dirname, '../skills/cursor-sdk/references/patterns.md'), 'utf8');
  const snippet = markdown.match(/```typescript\n(async function runInBatches[\s\S]*?)\n```/)[1];
  const context = vm.createContext({});
  vm.runInContext(stripTypeScriptTypes(snippet), context);
  return context.runInBatches;
}

test('one rejected repo preserves its reason and does not prevent later batches', async () => {
  const seen = [], error = new Error('one repo failed');
  const results = await helper()([0, 1, 2, 3, 4], 2, async (item) => {
    seen.push(item); if (item === 1) throw error; return item * 10;
  });
  assert.deepEqual(seen, [0, 1, 2, 3, 4]);
  assert.equal(results.length, 5);
  assert.equal(results[1].status, 'rejected'); assert.equal(results[1].reason, error);
  assert.equal(results[4].status, 'fulfilled'); assert.equal(results[4].value, 40);
});

test('successful batches expose settled outcomes consistently with the unbatched example', async () => {
  const results = await helper()([1, 2, 3], 2, async (item) => item * 2);
  assert.deepEqual(Array.from(results, (result) => [result.status, result.value]),
    [['fulfilled', 2], ['fulfilled', 4], ['fulfilled', 6]]);
});

test('input order is retained when tasks finish out of order', async () => {
  let release;
  const first = new Promise((resolve) => { release = resolve; });
  const pending = helper()([0, 1], 2, async (item) => item === 0 ? first : 'second');
  release('first'); const results = await pending;
  assert.deepEqual(Array.from(results, (result) => result.value), ['first', 'second']);
});

test('empty input returns no results and launches no work', async () => {
  let calls = 0; const results = await helper()([], 2, async () => calls++);
  assert.equal(results.length, 0); assert.equal(calls, 0);
});

test('batching still caps simultaneous work at the requested size', async () => {
  let active = 0, maxActive = 0;
  await helper()([0, 1, 2, 3, 4], 2, async (item) => {
    active++; maxActive = Math.max(maxActive, active);
    await Promise.resolve(); active--; return item;
  });
  assert.equal(maxActive, 2); assert.equal(active, 0);
});
