import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const logsh = fileURLToPath(
  new URL("../log.sh", import.meta.url)
);

function logicalLines(text) {
  return text
    .split(/\r\n|[\n\r\u2028\u2029\u0085\v\f\u001c\u001d\u001e]/)
    .filter((line) => line.length > 0);
}

function append(file, cells) {
  const result = spawnSync(logsh, [file, ...cells], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return logicalLines(readFileSync(file, "utf8"));
}

test("a line separator in evidence stays in the cell instead of starting a formula row", () => {
  const dir = mkdtempSync(join(tmpdir(), "decision-log-"));
  try {
    const file = join(dir, "decisions.tsv");
    const evidence = "note\u2028=1+1\u2029tail\vmiddle\fend\u0085nel\u001crecord";
    const lines = append(file, ["phase", "-keep", "why", evidence, "ok"]);
    assert.equal(lines.length, 2);
    assert.equal(lines.some((line) => line.startsWith("=")), false);
    const cells = lines[1].split("\t");
    assert.equal(cells.length, 6);
    assert.equal(cells[2], "'-keep");
    assert.match(cells[4], /note =1\+1 tail middle end nel record/);
    assert.equal(cells[5], "ok");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a plain cell is not quoted and a leading equals sign still is", () => {
  const dir = mkdtempSync(join(tmpdir(), "decision-log-"));
  try {
    const file = join(dir, "decisions.tsv");
    const lines = append(file, ["phase", "kept the helper", "why", "=1+1", "ok"]);
    assert.equal(lines.length, 2);
    const cells = lines[1].split("\t");
    assert.equal(cells[2], "kept the helper");
    assert.equal(cells[4], "'=1+1");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
