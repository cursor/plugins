import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseState, parseValue } from "../lib.mjs";

const scripts = dirname(dirname(fileURLToPath(import.meta.url)));

test("a set that TLC prints as an interval reads as its integers", () => {
  assert.deepEqual(parseValue("1..3"), [1, 2, 3]);
  assert.deepEqual(parseValue("-2..1"), [-2, -1, 0, 1]);
  assert.deepEqual(parseValue("[free |-> 1..2, held |-> {}]"), { free: [1, 2], held: [] });
  assert.deepEqual(parseState('/\\ free = 1..3\n/\\ held = {}'), { free: [1, 2, 3], held: [] });
});

test("a start state whose set TLC prints as an interval gets the label of its items", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const node = (id, free, held, init) =>
    `${id} [label="/\\\\ free = ${free}\\n/\\\\ held = ${held}"${init ? ",style = filled" : ""}]`;
  writeFileSync(
    join(dir, "Seats.dot"),
    `strict digraph DiskGraph {
${node(1, "1..3", "{}", true)}
${node(2, "{2, 3}", "{1}")}
1 -> 2 [label="Hold"];
2 -> 1 [label="Release"];
}`,
  );
  writeFileSync(
    join(dir, "seats.map.mjs"),
    'export const state = (v) => `${v.free.length} free, ${v.held.length} held`;\nexport const step = (a) => (a === "Hold" ? "you hold a seat" : "you release a seat");\n',
  );
  const r = spawnSync(
    process.execPath,
    [
      join(scripts, "tlc-to-chart.mjs"),
      ...["--dot", "Seats.dot", "--map", "seats.map.mjs", "--out", "chart.mmd"],
    ],
    { cwd: dir, encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
  const chart = readFileSync(join(dir, "chart.mmd"), "utf8");
  assert.match(chart, /^ {2}state "3 free, 0 held" as s\d+$/m);
  assert.doesNotMatch(chart, /4 free/);
});
