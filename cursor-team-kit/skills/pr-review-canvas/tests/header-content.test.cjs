const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function render(patch, fullDiff = false) {
  const context = { document: { addEventListener() {} } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../renderer.js'), 'utf8'), context);
  const target = { innerHTML: '' };
  // GitHub's files API exposes the hunk portion of git diff as `patch`.
  context.renderDiff(target, fullDiff ? patch : patch.slice(patch.indexOf('@@')));
  return target.innerHTML;
}

function patchFor(before, after) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-newline-'));
  try {
    fs.writeFileSync(path.join(dir, 'before'), before);
    fs.writeFileSync(path.join(dir, 'after'), after);
    try {
      return execFileSync('git', ['diff', '--no-index', '--no-color', '--', 'before', 'after'], { cwd: dir, encoding: 'utf8' });
    } catch (error) {
      if (error.status !== 1) throw error;
      return error.stdout;
    }
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
}

for (const fullDiff of [false, true]) {
  test(`preserve increment/decrement code in ${fullDiff ? 'full diff' : 'API patch'}`, () => {
    const html = render(patchFor('-- count;\n', '++ count;\n'), fullDiff);
    assert.match(html, /class="diff-del"><td class="diff-ln">1<\/td><td class="diff-ln"><\/td><td class="diff-code">-- count;<\/td>/);
    assert.match(html, /class="diff-add"><td class="diff-ln"><\/td><td class="diff-ln">1<\/td><td class="diff-code">\+\+ count;<\/td>/);
    assert.doesNotMatch(html, /diff-code">[+-]{2} [ab]\/(?:before|after)/);
  });
}

test('ordinary changed lines remain visible', () => {
  const html = render(patchFor('old\n', 'new\n'));
  assert.match(html, /diff-code">old<\/td>/);
  assert.match(html, /diff-code">new<\/td>/);
});
