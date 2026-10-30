// Run with: node --test cursor-team-kit/skills/pr-review-canvas/renderer.test.mjs
// renderer.js is browser code with no exports, so it is evaluated in a vm
// context with a minimal `document` stub and renderDiff is pulled out of it.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "renderer.js"), "utf8");

function loadRenderDiff() {
  const context = {
    console,
    document: {
      addEventListener() {},
      getElementById() {
        return null;
      },
      querySelector() {
        return null;
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.renderDiff = renderDiff;`, context);
  return context.renderDiff;
}

const ROW = /<tr class="([^"]+)"><td class="diff-ln">([^<]*)<\/td><td class="diff-ln">([^<]*)<\/td><td class="diff-code">([^<]*)<\/td>/g;

function renderRows(diff) {
  const renderDiff = loadRenderDiff();
  const el = { innerHTML: "" };
  renderDiff(el, diff);
  return [...el.innerHTML.matchAll(ROW)].map(([, cls, oldLine, newLine, code]) => ({
    cls,
    oldLine: oldLine === "" ? null : Number(oldLine),
    newLine: newLine === "" ? null : Number(newLine),
    code,
  }));
}

test("hidden import lines still advance the gutter line numbers", () => {
  const rows = renderRows([
    "--- a/x.ts",
    "+++ b/x.ts",
    "@@ -1,4 +1,5 @@",
    "+import { b } from './b';",
    " import { a } from './a';",
    " ",
    "-const x = 1;",
    "+const x = 2;",
    " export default x;",
  ]);

  assert.deepEqual(
    rows.map((r) => [r.cls, r.oldLine, r.newLine]),
    [
      ["diff-hunk", null, null],
      ["diff-ctx", 2, 3],
      ["diff-del", 3, null],
      ["diff-add", null, 4],
      ["diff-ctx", 4, 5],
    ],
  );
  assert.equal(rows.some((r) => r.code.includes("import")), false);
});

test("a whitespace-only change collapses to context with both line numbers", () => {
  const rows = renderRows(["@@ -10,3 +20,3 @@", " a", "-  b", "+b", " c"]);

  assert.deepEqual(
    rows.map((r) => [r.cls, r.oldLine, r.newLine, r.code]),
    [
      ["diff-hunk", null, null, "@@ -10,3 +20,3 @@"],
      ["diff-ctx", 10, 20, "a"],
      ["diff-ctx", 11, 21, "b"],
      ["diff-ctx", 12, 22, "c"],
    ],
  );
});

test("a whitespace-only change on a line that starts with a dash still collapses", () => {
  const rows = renderRows(["@@ -1,1 +1,1 @@", "-- item", "+-  item"]);

  assert.deepEqual(
    rows.map((r) => [r.cls, r.oldLine, r.newLine, r.code]),
    [
      ["diff-hunk", null, null, "@@ -1,1 +1,1 @@"],
      ["diff-ctx", 1, 1, "-  item"],
    ],
  );
});

test("moved blocks are still detected after the numbering change", () => {
  const rows = renderRows([
    "@@ -1,8 +1,8 @@",
    "-function a() {",
    "-  return 1;",
    "-}",
    " const keep = true;",
    " const also = true;",
    "+function a() {",
    "+  return 1;",
    "+}",
  ]);

  assert.deepEqual(
    rows.filter((r) => r.cls !== "diff-hunk").map((r) => r.cls),
    ["diff-moved-del", "diff-moved-del", "diff-moved-del", "diff-ctx", "diff-ctx", "diff-moved-add", "diff-moved-add", "diff-moved-add"],
  );
});
