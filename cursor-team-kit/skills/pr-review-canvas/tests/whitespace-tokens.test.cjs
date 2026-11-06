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

test("joining tokens is still a visible edit", () => {
  const html = render(
    ["@@ -1,2 +1,2 @@", "-return foo;", "+returnfoo;", " keep", ""].join("\n")
  );
  assert.match(html, /class="diff-del".*return foo;/);
  assert.match(html, /class="diff-add".*returnfoo;/);
  assert.doesNotMatch(html, /class="diff-ctx"[^>]*>.*returnfoo;/);
});

test("a change in the amount of whitespace still collapses", () => {
  const html = render(
    ["@@ -1,2 +1,2 @@", "-foo bar", "+foo  bar", " keep", ""].join("\n")
  );
  assert.match(html, /class="diff-ctx".*foo {2}bar/);
  assert.doesNotMatch(html, /class="diff-del"/);
  assert.doesNotMatch(html, /class="diff-add"/);
});

test("indentation-only changes still collapse", () => {
  const html = render(
    ["@@ -1,1 +1,1 @@", "-  foo", "+    foo", ""].join("\n")
  );
  assert.match(html, /class="diff-ctx"/);
  assert.doesNotMatch(html, /class="diff-del"/);
  assert.doesNotMatch(html, /class="diff-add"/);
});
