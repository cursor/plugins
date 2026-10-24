const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
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

function gitDiff(before, after) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canvas-meta-"));
  try {
    fs.writeFileSync(path.join(dir, "before"), before);
    fs.writeFileSync(path.join(dir, "after"), after);
    try {
      return execFileSync(
        "git",
        ["diff", "--no-index", "--no-color", "--", "before", "after"],
        { cwd: dir, encoding: "utf8" }
      );
    } catch (error) {
      if (error.status !== 1) throw error;
      return error.stdout;
    }
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
}

test("a real git diff does not number header lines or a trailing split blank", () => {
  const patch = gitDiff("alpha\n", "beta\n");
  assert.match(patch, /^index /m);
  assert.match(patch, /\n$/);
  const html = render(patch);
  assert.doesNotMatch(html, />index /);
  assert.doesNotMatch(html, />diff --git/);
  assert.match(
    html,
    /class="diff-del"><td class="diff-ln">1<\/td><td class="diff-ln"><\/td><td class="diff-code">alpha<\/td>/
  );
  assert.match(
    html,
    /class="diff-add"><td class="diff-ln"><\/td><td class="diff-ln">1<\/td><td class="diff-code">beta<\/td>/
  );
  assert.doesNotMatch(html, /<td class="diff-code"><\/td>/);
});

test("rename and mode headers are not rendered as source rows", () => {
  const patch = [
    "diff --git a/old.js b/new.js",
    "similarity index 90%",
    "rename from old.js",
    "rename to new.js",
    "index 1111111..2222222 100644",
    "--- a/old.js",
    "+++ b/new.js",
    "@@ -1 +1 @@",
    "-old",
    "+new",
    "",
  ].join("\n");
  const html = render(patch);
  for (const header of [
    "similarity index",
    "rename from",
    "rename to",
    "index 1111111",
  ]) {
    assert.doesNotMatch(html, new RegExp(header));
  }
  assert.match(
    html,
    /class="diff-del"><td class="diff-ln">1<\/td><td class="diff-ln"><\/td><td class="diff-code">old<\/td>/
  );
  assert.match(
    html,
    /class="diff-add"><td class="diff-ln"><\/td><td class="diff-ln">1<\/td><td class="diff-code">new<\/td>/
  );
  assert.doesNotMatch(html, /<td class="diff-code"><\/td>/);
});

test("a source line whose text starts with index is still shown", () => {
  const html = render(
    ["@@ -1 +1 @@", "-index keep", "+index kept", ""].join("\n")
  );
  assert.match(html, /class="diff-del".*>index keep</);
  assert.match(html, /class="diff-add".*>index kept</);
});
