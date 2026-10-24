import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findTlc } from "../tlc-tools.mjs";

const scripts = dirname(dirname(fileURLToPath(import.meta.url)));
const node = (script, args, cwd) =>
  spawnSync(process.execPath, [join(scripts, script), ...args], {
    cwd,
    encoding: "utf8",
    timeout: 120_000,
  });
const tools = (() => {
  try {
    return findTlc();
  } catch {
    return null;
  }
})();

const chart = `stateDiagram-v2
  state "Waiting…" as W
  state "Don’t pay" as D
  state "Café 🎉" as C
  [*] --> W
  W --> D : you tap “Cancel”
  D --> C : you retry
  C --> W : you leave
  %% never NeverCafe: Café 🎉 -- You never reach the café.
`;

test("chart-to-tla writes captions with typographic characters as ASCII strings, and the map reads them back", async () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(join(dir, "pay.mmd"), chart);
  const r = node("chart-to-tla.mjs", ["pay.mmd", "--module", "Pay"], dir);
  assert.equal(r.status, 0, r.stderr);
  const spec = readFileSync(join(dir, "Pay.tla"), "utf8");
  const strings = spec.match(/"(?:[^"\\\n]|\\.)*"/g);
  assert.ok(strings.length > 0);
  for (const s of strings) assert.match(s, /^[\x20-\x7e]*$/, `SANY cannot read ${s}`);
  const mapping = await import(pathToFileURL(join(dir, "Pay.map.mjs")).href);
  const read = new Set(strings.map((s) => mapping.state({ main: JSON.parse(s) })));
  for (const caption of ["Waiting…", "Don’t pay", "Café 🎉"]) assert.ok(read.has(caption), caption);
});

test(
  "from-chart checks a chart whose captions have typographic characters and draws it back unchanged",
  { skip: tools ? false : "cannot find TLC" },
  () => {
    const dir = mkdtempSync(join(tmpdir(), "statechart-"));
    writeFileSync(join(dir, "pay.mmd"), chart);
    const r = node(
      "statechart.mjs",
      ["from-chart", "pay.mmd", "--expect-broken", "NeverCafe"],
      dir,
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^ {2}NeverCafe is broken \(expected\)\.$/m);
    assert.match(r.stdout, /\nThe spec draws pay\.mmd back unchanged\.\n/);
  },
);
