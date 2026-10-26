import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const run = (dir, chart, module) => {
  writeFileSync(join(dir, "c.mmd"), chart);
  return spawnSync(
    process.execPath,
    [join(here, "..", "chart-to-tla.mjs"), "c.mmd", "--module", module],
    {
      cwd: dir,
      encoding: "utf8",
    },
  );
};

test("a never line names a state inside a composite by its caption", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const chart = `${readFileSync(join(here, "upload.mmd"), "utf8")}  %% never NoCheck: Checking the file -- The file is never checked.
  %% never NoSend: Sending the file & Upload failed -- unreachable pair, one region.
`;
  const one = run(dir, chart.replace(/ *%% never NoSend.*\n/, ""), "Upload");
  assert.equal(one.status, 0, one.stderr);
  assert.match(
    readFileSync(join(dir, "Upload.tla"), "utf8"),
    /^NoCheck == ~\(main = "Uploading\.Checking the file"\)$/m,
  );
  const two = run(dir, chart, "Upload");
  assert.notEqual(two.status, 0);
  assert.match(two.stderr, /names two states of one region/);
});

test("a never line names a nested composite by its caption, and asks for the path when two composites share it", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const chart = `stateDiagram-v2
  state Work {
    state Upload {
      [*] --> Sending
      Sending --> Checking : the last byte arrives
    }
    [*] --> Upload
  }
  state Idle
  [*] --> Idle
  Idle --> Work : you start
  Work --> Idle : you stop
  %% never NoUpload: Upload -- You never upload.
`;
  const r = run(dir, chart, "Nest");
  assert.equal(r.status, 0, r.stderr);
  assert.match(
    readFileSync(join(dir, "Nest.tla"), "utf8"),
    /^NoUpload == ~\(main \\in \{"Work\.Upload\.Sending", "Work\.Upload\.Checking"\}\)$/m,
  );
  const twice = run(
    dir,
    chart
      .replace(
        "  state Idle\n",
        '  state Idle {\n    state "Sending" as Resending\n    [*] --> Resending\n  }\n',
      )
      .replace("NoUpload: Upload", "NoSend: Sending"),
    "Twice",
  );
  assert.notEqual(twice.status, 0);
  assert.match(
    twice.stderr,
    /names "Sending", which is inside Work\.Upload and Idle; write the path, such as Work\.Upload\.Sending/,
  );
});

test("dots in captions are not hierarchy boundaries for never lines", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  const chart = `stateDiagram-v2
  state Work {
    state "Saving" as Saving
    state "Saving..." as Pending
    [*] --> Saving
    Saving --> Pending : save
  }
  [*] --> Work
  %% never NoSave: Saving -- Saving is forbidden, pending is allowed.
`;
  const r = run(dir, chart, "Dots");
  assert.equal(r.status, 0, r.stderr);
  assert.match(readFileSync(join(dir, "Dots.tla"), "utf8"), /^NoSave == ~\(main = "Work\.Saving"\)$/m);
  const missing = run(dir, chart.replace('    state "Saving" as Saving\n', '').replace('[*] --> Saving', '[*] --> Pending').replace('    Saving --> Pending : save\n', ''), "Missing");
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /not a state in the chart/);
  const dotted = run(dir, chart.replace('NoSave: Saving --', 'NoSave: Saving... --'), "Dotted");
  assert.equal(dotted.status, 0, dotted.stderr);
  assert.match(readFileSync(join(dir, "Dotted.tla"), "utf8"), /^NoSave == ~\(main = "Work\.Saving\.\.\."\)$/m);
});
