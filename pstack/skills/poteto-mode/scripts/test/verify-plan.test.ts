import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../verify-plan.mjs", import.meta.url));
const plan = [
  "# Pilot",
  "",
  "## Tasks",
  "",
  "- [ ] T1: Check the first input",
  "  Verify: `node -e \"require('node:fs').accessSync('first')\"`",
  "- [ ] T2: Check the second input",
  "  Verify: `node -e \"require('node:fs').accessSync('second')\"`",
  "",
  "## Notes",
  "- [ ] A manual review",
  "",
].join("\r\n");

function fixture(t: { after(fn: () => void): void }, source = plan) {
  const cwd = mkdtempSync(join(tmpdir(), "pstack-plan-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(join(cwd, "plan.md"), source);
  return {
    run: (mode: string) => spawnSync(process.execPath, [script, "plan.md", mode], { cwd, encoding: "utf8" }),
    read: () => readFileSync(join(cwd, "plan.md"), "utf8"),
    put: (name: string) => writeFileSync(join(cwd, name), ""),
    remove: (name: string) => rmSync(join(cwd, name)),
  };
}

test("a failure leaves progress intact, and fresh runs resume and recheck", (t) => {
  const repo = fixture(t);
  assert.match(repo.run("--status").stdout, /T1: .*\(next\)/);
  assert.equal(repo.run("--final").status, 1);
  assert.equal(repo.run("--next").status, 1);
  assert.equal(repo.read(), plan);

  repo.put("first");
  assert.equal(repo.run("--next").status, 0);
  assert.equal(repo.read(), plan.replace("[ ] T1", "[x] T1"));
  assert.match(repo.run("--status").stdout, /T2: .*\(next\)/);
  assert.equal(repo.run("--next").status, 1);

  repo.put("second");
  assert.equal(repo.run("--next").status, 0);
  const completed = plan.replace("[ ] T1", "[x] T1").replace("[ ] T2", "[x] T2");
  assert.equal(repo.read(), completed);
  assert.equal(repo.run("--final").status, 0);
  repo.remove("first");
  assert.equal(repo.run("--final").status, 1);
  assert.equal(repo.read(), completed);
});

test("invalid tasks fail before a verification command runs", (t) => {
  const malformed = plan.replace("T2:", "T1:");
  const repo = fixture(t, malformed);
  const result = repo.run("--next");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Duplicate task ID: T1/);
  assert.equal(result.stdout, "");
  assert.equal(repo.read(), malformed);
});

test("a command that edits the plan cannot record a pass against an old copy", (t) => {
  const source = [
    "## Tasks",
    "- [ ] T1: Edit the plan",
    "  Verify: `node -e \"require('node:fs').appendFileSync('plan.md', '\\n## Updated')\"`",
    "",
  ].join("\n");
  const repo = fixture(t, source);
  const result = repo.run("--next");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Plan changed during verification/);
  assert.equal(repo.read(), source + "\n## Updated");
});
