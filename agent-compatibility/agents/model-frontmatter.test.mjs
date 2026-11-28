import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const agentsDir = dirname(fileURLToPath(import.meta.url));

test("agent model is inherit or a real model id, not the bare fast alias", () => {
  const files = readdirSync(agentsDir).filter((name) => name.endsWith(".md"));
  assert.ok(files.length >= 4);
  for (const name of files) {
    const text = readFileSync(join(agentsDir, name), "utf8");
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter, name);
    const model = frontmatter[1].match(/^model:\s*(\S+)\s*$/m);
    assert.ok(model, `${name} declares a model`);
    assert.notEqual(
      model[1].toLowerCase(),
      "fast",
      `${name} sets model: fast, which Cursor does not resolve (it falls back and logs the alias as unusable)`
    );
    assert.match(model[1], /^(inherit|[a-z0-9][a-z0-9._+-]*)$/);
  }
});
