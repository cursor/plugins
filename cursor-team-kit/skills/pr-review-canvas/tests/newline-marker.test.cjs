const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function render(patch) {
  const context = { document: { addEventListener() {} } };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../renderer.js'), 'utf8'), context);
  const target = { innerHTML: '' };
  // GitHub's files API exposes the hunk portion of git diff as `patch`.
  context.renderDiff(target, patch.slice(patch.indexOf('@@')));
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

for (const [name, before, after] of [
  ['old file lacks newline', 'old', 'new\n'],
  ['both files lack newline', 'old', 'new'],
  ['new file lacks newline', 'old\n', 'new'],
]) {
  test(name, () => {
    const html = render(patchFor(before, after));
    assert.match(html, /class="diff-del"><td class="diff-ln">1<\/td><td class="diff-ln"><\/td><td class="diff-code">old<\/td>/);
    assert.match(html, /class="diff-add"><td class="diff-ln"><\/td><td class="diff-ln">1<\/td><td class="diff-code">new<\/td>/);
    assert.match(html, /<td class="diff-ln"><\/td><td class="diff-ln"><\/td><td class="diff-code">\\ No newline at end of file<\/td>/);
    assert.doesNotMatch(html, /class="diff-ctx">(?:(?!<\/tr>)[^])*No newline at end of file/);
  });
}

test('ordinary newline-terminated replacement remains numbered correctly', () => {
  const html = render(patchFor('old\n', 'new\n'));
  assert.match(html, /class="diff-add"><td class="diff-ln"><\/td><td class="diff-ln">1<\/td>/);
  assert.doesNotMatch(html, /No newline/);
});
