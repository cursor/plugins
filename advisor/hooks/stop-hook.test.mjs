import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const hook = join(dirname(fileURLToPath(import.meta.url)), "stop-hook.sh");

function stop(t, lastResponse) {
  const root = mkdtempSync(join(tmpdir(), "advisor-stop-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, ".cursor", "advisor");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "state.json"), JSON.stringify({ enabled: true, conversation_id: "current" }));
  writeFileSync(join(dir, "pending"), "");
  writeFileSync(join(dir, "last-response.txt"), lastResponse);
  const result = spawnSync("bash", [hook], {
    input: JSON.stringify({ conversation_id: "current", status: "completed" }),
    encoding: "utf8",
    env: { ...process.env, CURSOR_PROJECT_DIR: root, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" },
    timeout: 30000,
  });
  assert.equal(result.status, 0, result.stderr);
  return { stdout: result.stdout, pending: existsSync(join(dir, "pending")) };
}

for (const [name, text] of [
  ["a question mark", "Should I merge the branch?\n"],
  ["a full-width question mark", "要我现在合并这个分支吗？\n"],
  ["a full-width question mark and a space", "このまま進めてもよろしいですか？ \n"],
]) {
  test(`stays quiet and keeps the marker after a reply ending in ${name}`, (t) => {
    const result = stop(t, text);
    assert.equal(result.stdout, "");
    assert.equal(result.pending, true);
  });
}

test("still nudges after a statement", (t) => {
  const result = stop(t, "合并完成，所有测试都通过了。\n");
  assert.match(JSON.parse(result.stdout).followup_message, /^\[Advisor\]/);
  assert.equal(result.pending, false);
});
