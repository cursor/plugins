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

function render(patch) {
  const target = { innerHTML: '' };
  createRenderer().renderDiff(target, patch);
  return target.innerHTML;
}

function rows(html) {
  const pattern = /<tr class="([^"]+)"><td class="diff-ln">(\d*)<\/td><td class="diff-ln">(\d*)<\/td><td class="diff-code">(.*?)<\/td><\/tr>/g;
  return [...html.matchAll(pattern)].map((match) => ({
    type: match[1],
    oldLine: match[2] ? Number(match[2]) : null,
    newLine: match[3] ? Number(match[3]) : null,
    code: match[4],
  }));
}

function buildPatches(pages) {
  const section = instructions.split('1. During the fetch step,')[1].split('2. During assembly,')[0];
  const query = section.match(/(?:--jq|\| jq) '([^']+)'/)[1];
  const input = section.includes('--slurp') ? pages : pages.flat();
  const result = spawnSync('jq', [query], {
    input: JSON.stringify(input),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('hidden context imports preserve source line numbers', () => {
  const output = rows(render([
    '@@ -1,3 +1,3 @@',
    ' import Foundation',
    ' let name = "old"',
    '-let value = 1',
    '+let value = 2',
  ].join('\n')));
  assert.deepEqual(output.find((row) => row.code === 'let value = 1'), {
    type: 'diff-del', oldLine: 3, newLine: null, code: 'let value = 1',
  });
  assert.deepEqual(output.find((row) => row.code === 'let value = 2'), {
    type: 'diff-add', oldLine: null, newLine: 3, code: 'let value = 2',
  });
  assert(!output.some((row) => row.code.includes('import Foundation')));
});

test('hidden changed imports advance old and new line numbers independently', () => {
  const output = rows(render([
    '@@ -1,4 +1,5 @@',
    '-import Old',
    '+import New',
    '+import Extra',
    ' let same = 0',
    '-let value = 1',
    '+let value = 2',
    ' return value',
  ]));
  assert.equal(output.find((row) => row.code === 'let value = 1').oldLine, 3);
  assert.equal(output.find((row) => row.code === 'let value = 2').newLine, 4);
  assert.deepEqual(output.find((row) => row.code === 'return value'), {
    type: 'diff-ctx', oldLine: 4, newLine: 5, code: 'return value',
  });
});

test('deleting an import preserves the line offset until the next hunk', () => {
  const output = rows(render([
    '@@ -10,2 +10,1 @@',
    '-import Removed',
    ' first()',
    '@@ -30,2 +29,2 @@',
    ' import Kept',
    '-old()',
    '+new()',
  ]));
  assert.deepEqual(output.find((row) => row.code === 'first()'), {
    type: 'diff-ctx', oldLine: 11, newLine: 10, code: 'first()',
  });
  assert.equal(output.find((row) => row.code === 'old()').oldLine, 31);
  assert.equal(output.find((row) => row.code === 'new()').newLine, 30);
});

test('whitespace-only changes still collapse into numbered context', () => {
  const output = rows(render([
    '@@ -1,3 +1,3 @@',
    ' import Foundation',
    '-let value = 1',
    '+let  value = 1',
    ' return value',
  ]));
  assert.deepEqual(output.find((row) => row.code === 'let  value = 1'), {
    type: 'diff-ctx', oldLine: 2, newLine: 2, code: 'let  value = 1',
  });
  assert(!output.some((row) => row.type === 'diff-add' || row.type === 'diff-del'));
});

test('changed imports do not prevent whitespace-only code from collapsing', () => {
  const output = rows(render([
    '@@ -1,3 +1,4 @@',
    '-import Old',
    '-let value = 1',
    '+import New',
    '+import Extra',
    '+let  value = 1',
    ' return value',
  ]));
  assert.deepEqual(output.find((row) => row.code === 'let  value = 1'), {
    type: 'diff-ctx', oldLine: 2, newLine: 3, code: 'let  value = 1',
  });
  assert.deepEqual(output.find((row) => row.code === 'return value'), {
    type: 'diff-ctx', oldLine: 3, newLine: 4, code: 'return value',
  });
  assert(!output.some((row) => row.type === 'diff-add' || row.type === 'diff-del'));
});

test('moved blocks retain their highlighting and source line numbers', () => {
  const output = rows(render([
    '@@ -1,5 +1,5 @@',
    ' import Foundation',
    '-first()',
    '-second()',
    '-third()',
    ' pivot()',
    '+first()',
    '+second()',
    '+third()',
  ]));
  const removed = output.filter((row) => row.type === 'diff-moved-del');
  const added = output.filter((row) => row.type === 'diff-moved-add');
  assert.deepEqual(removed.map((row) => row.oldLine), [2, 3, 4]);
  assert.deepEqual(added.map((row) => row.newLine), [3, 4, 5]);
});

test('hidden imports do not join nonconsecutive lines into moved blocks', () => {
  const output = rows(render([
    '@@ -1,5 +1,5 @@',
    '-first()',
    '-import Old',
    '-second()',
    '-third()',
    ' pivot()',
    '+first()',
    '+import New',
    '+second()',
    '+third()',
  ]));
  assert(!output.some((row) => row.type.startsWith('diff-moved')));
  assert.deepEqual(output.filter((row) => row.type === 'diff-del').map((row) => row.oldLine), [1, 3, 4]);
  assert.deepEqual(output.filter((row) => row.type === 'diff-add').map((row) => row.newLine), [2, 4, 5]);
});

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
