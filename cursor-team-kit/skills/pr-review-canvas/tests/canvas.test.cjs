const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const vm = require('node:vm');

const skillDirectory = path.resolve(__dirname, '..');
const rendererSource = fs.readFileSync(path.join(skillDirectory, 'renderer.js'), 'utf8');
const instructions = fs.readFileSync(path.join(skillDirectory, 'SKILL.md'), 'utf8');

function createRenderer(document = {}) {
  const context = {
    document: { addEventListener() {}, ...document },
    console,
  };
  vm.createContext(context);
  vm.runInContext(rendererSource, context);
  return context;
}

function buildPatches(pages) {
  const section = instructions.split('1. During the fetch step,')[1].split('2. During assembly,')[0];
  const query = section.match(/(?:--jq|\| jq) '([^']+)'/)[1];
  const input = section.includes('--slurp')
    ? JSON.stringify(pages)
    : pages.map((page) => JSON.stringify(page)).join('\n');
  const result = spawnSync('jq', [query], {
    input,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('different punctuation in paths does not overwrite patches', () => {
  const patches = buildPatches([[
    { filename: 'src/a-b.ts', patch: '@@ -1 +1 @@\n-first\n+firstChanged' },
    { filename: 'src/a_b.ts', patch: '@@ -1 +1 @@\n-second\n+secondChanged' },
  ]]);
  assert.deepEqual(Object.keys(patches), ['src/a-b.ts', 'src/a_b.ts']);
  assert(patches['src/a-b.ts'].includes('firstChanged'));
  assert(patches['src/a_b.ts'].includes('secondChanged'));
});

test('all pages form one patch map, including files without textual patches', () => {
  const patches = buildPatches([
    [{ filename: 'src/first.ts', patch: 'first patch' }],
    [{ filename: 'src/second.ts', patch: 'second patch' }, { filename: 'image.png', patch: null }],
  ]);
  assert.deepEqual(patches, {
    'src/first.ts': 'first patch',
    'src/second.ts': 'second patch',
    'image.png': '',
  });
  assert.deepEqual(buildPatches([[]]), {});
});

test('auto-discovery renders the patch for each exact filename', () => {
  const patches = buildPatches([[
    { filename: 'src/a-b.ts', patch: '@@ -1 +1 @@\n-oldFirst\n+newFirst' },
    { filename: 'src/a_b.ts', patch: '@@ -1 +1 @@\n-oldSecond\n+newSecond' },
  ]]);
  const targets = ['src/a-b.ts', 'src/a_b.ts'].map((filename) => ({
    innerHTML: '',
    getAttribute() { return filename; },
  }));
  let onReady;
  createRenderer({
    addEventListener(event, callback) { if (event === 'DOMContentLoaded') onReady = callback; },
    getElementById() { return { textContent: JSON.stringify(patches) }; },
    querySelectorAll() { return targets; },
  });
  onReady();
  assert(targets[0].innerHTML.includes('newFirst'));
  assert(!targets[0].innerHTML.includes('newSecond'));
  assert(targets[1].innerHTML.includes('newSecond'));
  assert(!targets[1].innerHTML.includes('newFirst'));
});
