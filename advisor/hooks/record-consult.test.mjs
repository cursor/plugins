import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const hook = join(dirname(fileURLToPath(import.meta.url)), "record-consult.sh");
function consult(t, input, { brokenLog = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "advisor-consult-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, ".cursor", "advisor");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "state.json"), JSON.stringify({ enabled: true, conversation_id: "current", consults: 0 }));
  writeFileSync(join(dir, "pending"), "");
  if (brokenLog) mkdirSync(join(dir, "log.md"));
  const result = spawnSync("bash", [hook], {
    input: JSON.stringify({ conversation_id: "current", subagent_type: "advisor-subagent", status: "completed", ...input }),
    encoding: "utf8", env: { ...process.env, CURSOR_PROJECT_DIR: root }, timeout: 5000,
  });
  return { ...result, dir, state: JSON.parse(readFileSync(join(dir, "state.json"))), pending: existsSync(join(dir, "pending")) };
}

for (const [name, summary] of [
  ["short", "Advice remains intact"],
  ["long", "A".repeat(500_000)],
  ["unicode", "é".repeat(3000) + "tail"],
]) {
  test(`persists ${name} consult before marking it complete`, (t) => {
    const result = consult(t, { summary, description: "Review" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.state.consults, 1);
    assert.equal(result.pending, false);
    const log = readFileSync(join(result.dir, "log.md"));
    const expected = Buffer.from(summary).subarray(0, 6000);
    assert.equal(log.includes(expected), true);
    assert.equal(log.subarray(log.indexOf(Buffer.from("Review\n\n")) + 8).length, expected.length + 2);
  });
}

test("records absent summaries without dropping the consult", (t) => {
  const result = consult(t, {});
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(join(result.dir, "log.md"), "utf8"), /No summary captured/);
  assert.equal(result.state.consults, 1);
});

test("failed log writes leave the consult pending and uncounted", (t) => {
  const result = consult(t, { summary: "advice" }, { brokenLog: true });
  assert.notEqual(result.status, 0);
  assert.equal(result.state.consults, 0);
  assert.equal(result.pending, true);
});

for (const input of [{ status: "error" }, { status: "aborted" }, { conversation_id: "other" }, { subagent_type: "worker" }]) {
  test(`ignores unrelated or unfinished consult ${JSON.stringify(input)}`, (t) => {
    const result = consult(t, { summary: "advice", ...input });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.state.consults, 0);
    assert.equal(result.pending, true);
    assert.equal(existsSync(join(result.dir, "log.md")), false);
  });
}
