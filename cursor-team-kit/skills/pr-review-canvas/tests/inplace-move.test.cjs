const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function render(patch) {
  const context = { document: { addEventListener() {} } };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8"),
    context
  );
  const target = { innerHTML: "" };
  context.renderDiff(target, patch);
  return target.innerHTML;
}

test("an in-place edit of a multi-line block stays a deletion and addition", () => {
  const html = render(
    [
      "@@ -10,4 +10,4 @@",
      "-    if (ready) {",
      "-      start();",
      "-      return cache;",
      "-    }",
      "+    if (ready) {",
      "+      start();",
      "+      return fresh;",
      "+    }",
      "",
    ].join("\n")
  );
  assert.match(html, /class="diff-del".*return cache;/);
  assert.match(html, /class="diff-add".*return fresh;/);
  assert.doesNotMatch(html, /diff-moved/);
});

test("the same block removed above and inserted below is still a move", () => {
  const html = render(
    [
      "@@ -1,8 +1,8 @@",
      "-function a() {",
      "-  return 1;",
      "-}",
      " const keep = true;",
      " const also = true;",
      "+function a() {",
      "+  return 1;",
      "+}",
      "",
    ].join("\n")
  );
  assert.match(html, /class="diff-moved-del"/);
  assert.match(html, /class="diff-moved-add"/);
  assert.match(html, /class="diff-ctx".*const keep = true;/);
  assert.doesNotMatch(html, /class="diff-del"/);
  assert.doesNotMatch(html, /class="diff-add"/);
});

test("an EOF newline marker does not turn an in-place edit into a move", () => {
  const html = render([
    "@@ -10,4 +10,4 @@",
    "-    if (ready) {",
    "-      start();",
    "-      return cache;",
    "-    }",
    "\\ No newline at end of file",
    "+    if (ready) {",
    "+      start();",
    "+      return fresh;",
    "+    }",
  ]);
  assert.doesNotMatch(html, /diff-moved/);
  assert.match(html, /class="diff-del".*return cache;/);
  assert.match(html, /class="diff-add".*return fresh;/);
  assert.match(html, /No newline at end of file/);
  assert.match(html, /class="diff-add"><td class="diff-ln"><\/td><td class="diff-ln">10<\/td>/);
});
