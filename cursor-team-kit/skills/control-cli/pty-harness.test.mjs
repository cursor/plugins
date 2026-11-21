import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "SKILL.md"
);

function harnessSource() {
  const text = readFileSync(skillPath, "utf8");
  const fence = text.match(/```python\n([\s\S]*?)```/);
  assert.ok(fence, "control-cli skill should include a python PTY harness");
  return fence[1];
}

function runHarness(childSource) {
  const rewritten = harnessSource()
    .replace(
      '["<command>", "<arg>"]',
      `["python3", "-u", "-c", ${JSON.stringify(childSource)}]`
    )
    .replaceAll("<ready text>", "READY");
  return spawnSync("python3", ["-c", rewritten], {
    encoding: "utf8",
    timeout: 4000,
  });
}

test("the harness transcript includes the command's reply", () => {
  const result = runHarness(
    [
      "import sys",
      "print('READY', flush=True)",
      "line = sys.stdin.readline()",
      "print('ECHO:' + line.strip(), flush=True)",
    ].join("\n")
  );
  assert.equal(result.error, undefined, result.stderr);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ECHO:help/);
});

test("a CLI that exits before the ready text does not spin until the deadline", () => {
  const started = Date.now();
  const result = runHarness("print('bye', flush=True)");
  const elapsed = Date.now() - started;
  assert.equal(result.error, undefined, result.stderr);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /bye/);
  assert.ok(elapsed < 3000, `harness took ${elapsed}ms`);
});
