import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fillOmittedPatches, patchKey } from "../fill-omitted-patches.mjs";

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function gitDiff(files) {
  const dir = mkdtempSync(path.join(tmpdir(), "omitted-patch-"));
  const before = path.join(dir, "before");
  const after = path.join(dir, "after");
  try {
    for (const [name, versions] of Object.entries(files)) {
      const from = path.join(before, name);
      const to = path.join(after, name);
      mkdir(from);
      mkdir(to);
      writeFileSync(from, versions[0]);
      writeFileSync(to, versions[1]);
    }
    try {
      return execFileSync(
        "git",
        ["diff", "--no-index", "--no-color", "--", "before", "after"],
        { cwd: dir, encoding: "utf8" }
      );
    } catch (error) {
      if (error.status !== 1) throw error;
      return error.stdout;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function mkdir(file) {
  execFileSync("mkdir", ["-p", path.dirname(file)]);
}

test("a null patch with line counts is filled from the pull diff", () => {
  const raw = gitDiff({
    "src/app.ts": ["export const n = 1;\n", "export const n = 2;\n"],
    "src/keep.ts": ["same\n", "same\n"],
  });
  // git diff --no-index prefixes every path with before/ and after/.
  const diff = raw
    .replaceAll("a/before/", "a/")
    .replaceAll("b/after/", "b/");
  const pages = [
    [
      {
        filename: "src/app.ts",
        additions: 1,
        deletions: 1,
        patch: null,
      },
      {
        filename: "assets/logo.png",
        additions: 0,
        deletions: 0,
        patch: null,
      },
    ],
    [
      {
        filename: "src/keep.ts",
        additions: 0,
        deletions: 3,
        patch: "@@ -1 +1 @@\n-from-api\n+from-api-kept\n",
      },
    ],
  ];
  const patches = fillOmittedPatches(pages, diff);
  const recovered = patches[patchKey("src/app.ts")];
  assert.match(recovered, /^@@ /);
  assert.match(recovered, /export const n = 2;/);
  assert.equal(
    patches[patchKey("src/keep.ts")],
    "@@ -1 +1 @@\n-from-api\n+from-api-kept\n"
  );
  assert.equal(patches[patchKey("assets/logo.png")], "");
});

test("the skill builds the patch map with the filler, not an empty patch", () => {
  const instructions = readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
  assert.match(instructions, /fill-omitted-patches\.mjs/);
  assert.match(instructions, /application\/vnd\.github\.diff/);
  assert.doesNotMatch(
    instructions,
    /value: \(\.patch \/\/ ""\)/
  );
});
