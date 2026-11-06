const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { stripTypeScriptTypes } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');

function source() {
  const markdown = fs.readFileSync(
    path.join(__dirname, '../skills/cursor-sdk/references/patterns.md'),
    'utf8',
  );
  return markdown.match(/```typescript\n(async function runInBatches[\s\S]*?)\n```/)[1];
}

function helper() {
  const context = vm.createContext({});
  vm.runInContext(stripTypeScriptTypes(source()), context);
  return context.runInBatches;
}

test('rejects a zero batch size instead of spinning forever', () => {
  const child = spawnSync(
    process.execPath,
    ['-e', `
      const fs = require('node:fs');
      const { stripTypeScriptTypes } = require('node:module');
      const markdown = fs.readFileSync(${JSON.stringify(
        path.join(__dirname, '../skills/cursor-sdk/references/patterns.md'),
      )}, 'utf8');
      const source = markdown.match(/\\\`\\\`\\\`typescript\\n(async function runInBatches[\\s\\S]*?)\\n\\\`\\\`\\\`/)[1];
      eval(stripTypeScriptTypes(source));
      runInBatches([1], 0, async () => 1).then(
        () => process.exit(1),
        error => process.exit(error instanceof RangeError ? 0 : 2),
      );
    `],
    { timeout: 5_000 },
  );

  assert.equal(child.error, undefined, 'zero-sized batches must not hang the process');
  assert.equal(child.status, 0, child.stderr?.toString());
});

test('processes valid batches in input order', async () => {
  const results = await helper()([1, 2, 3], 2, async item => item * 2);
  assert.deepEqual(Array.from(results), [2, 4, 6]);
});

for (const size of [-1, 1.5, Number.POSITIVE_INFINITY]) {
  test(`rejects invalid batch size ${size}`, async () => {
    await assert.rejects(
      helper()([1], size, async () => 1),
      error => error?.name === 'RangeError',
    );
  });
}
