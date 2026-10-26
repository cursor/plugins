import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const scripts = dirname(dirname(fileURLToPath(import.meta.url)));

test("chart-to-tla avoids TLA+ keywords for generated action names", () => {
  const dir = mkdtempSync(join(tmpdir(), "statechart-"));
  writeFileSync(
    join(dir, "chart.mmd"),
    "stateDiagram-v2\n  [*] --> A\n  A --> B : UNCHANGED\n",
  );
  execFileSync(process.execPath, [join(scripts, "chart-to-tla.mjs"), "chart.mmd", "--module", "Chart"], {
    cwd: dir,
  });
  const spec = readFileSync(join(dir, "Chart.tla"), "utf8");
  assert.match(spec, /^UNCHANGED2 ==$/m);
  assert.doesNotMatch(spec, /^UNCHANGED ==$/m);
});
