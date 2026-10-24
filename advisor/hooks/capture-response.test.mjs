import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const hooks = dirname(fileURLToPath(import.meta.url));

function project(t) {
  const root = mkdtempSync(join(tmpdir(), "advisor-capture-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, ".cursor", "advisor");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "state.json"), JSON.stringify({ enabled: true, conversation_id: "current" }));
  return { root, dir };
}

function hook(root, name, input) {
  return spawnSync("bash", [join(hooks, name)], {
    input: JSON.stringify({ conversation_id: "current", ...input }),
    encoding: "utf8",
    env: { ...process.env, CURSOR_PROJECT_DIR: root, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" },
    timeout: 30000,
  });
}

function capture(t, text) {
  const { root, dir } = project(t);
  const result = hook(root, "capture-response.sh", { text });
  assert.equal(result.status, 0, result.stderr);
  return { root, dir, saved: readFileSync(join(dir, "last-response.txt")) };
}

test("keeps whole characters when trimming a multibyte response", (t) => {
  const text = "é".repeat(300) + " Done.";
  const { saved } = capture(t, text);
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(saved);
  assert.equal(text.endsWith(decoded.trimEnd()), true);
  assert.equal(decoded.trimEnd().endsWith("é Done."), true);
});

test("the stop hook still nudges after a long multibyte response", (t) => {
  const { root, dir } = capture(t, "é".repeat(300) + " All tests pass.");
  writeFileSync(join(dir, "pending"), "");
  const result = hook(root, "stop-hook.sh", { status: "completed" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).followup_message, /^\[Advisor\]/);
  assert.equal(existsSync(join(dir, "pending")), false);
});

test("the stop hook stays quiet after a long multibyte question", (t) => {
  const { root, dir } = capture(t, "é".repeat(300) + " Should I merge?");
  writeFileSync(join(dir, "pending"), "");
  const result = hook(root, "stop-hook.sh", { status: "completed" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(existsSync(join(dir, "pending")), true);
});
