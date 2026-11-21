import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const agentsDir = dirname(fileURLToPath(import.meta.url));

test("ci-watcher does not request the unresolvable model alias fast", () => {
  const text = readFileSync(join(agentsDir, "ci-watcher.md"), "utf8");
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(frontmatter);
  const model = frontmatter[1].match(/^model:\s*(\S+)\s*$/m);
  assert.ok(model);
  assert.notEqual(model[1].toLowerCase(), "fast");
  assert.equal(model[1], "inherit");
});
