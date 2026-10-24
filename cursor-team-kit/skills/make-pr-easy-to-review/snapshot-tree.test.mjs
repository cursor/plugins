import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "SKILL.md"
);

function historyBlock() {
  const text = readFileSync(skillPath, "utf8");
  const section = text.split("## History Cleanup")[1].split("## Reviewer Guidance")[0];
  const blocks = [...section.matchAll(/```bash\n([\s\S]*?)```/g)].map((match) => match[1]);
  assert.equal(blocks.length, 2);
  return blocks;
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

test("a fork-only pull head is the tree that gets snapshotted", () => {
  const [snapshot, verify] = historyBlock();
  assert.match(snapshot, /refs\/pull\/<PR>\/head/);
  assert.doesNotMatch(snapshot, /git fetch origin <headRefName>/);
  assert.doesNotMatch(verify, /origin\/<headRefName>/);

  const root = mkdtempSync(path.join(tmpdir(), "fork-head-"));
  const origin = path.join(root, "origin.git");
  const seed = path.join(root, "seed");
  const clone = path.join(root, "clone");
  try {
    execFileSync("git", ["init", "--bare", "-q", origin]);
    execFileSync("git", ["init", "-q", "-b", "main", seed]);
    git(["config", "user.email", "test@example.com"], seed);
    git(["config", "user.name", "Test"], seed);
    writeFileSync(path.join(seed, "file.txt"), "on-main\n");
    git(["add", "file.txt"], seed);
    git(["commit", "-q", "-m", "main"], seed);
    git(["remote", "add", "origin", origin], seed);
    git(["push", "-q", "origin", "main"], seed);
    writeFileSync(path.join(seed, "file.txt"), "on-fork-pr\n");
    git(["commit", "-q", "-am", "fork"], seed);
    const forkCommit = git(["rev-parse", "HEAD"], seed);
    git(["push", "-q", "origin", "HEAD:refs/pull/4/head"], seed);
    execFileSync("git", ["clone", "-q", origin, clone]);

    // gh pr view needs GitHub; the bug is the fetch that follows it.
    const fetchScript = snapshot
      .replaceAll("<PR>", "4")
      .split("\n")
      .filter((line) => !line.trim().startsWith("gh "))
      .join("\n");
    const tree = execFileSync("bash", ["-c", `set -euo pipefail\n${fetchScript}\nprintf '%s\\n' "$ORIGINAL_TREE"`], {
      cwd: clone,
      encoding: "utf8",
    }).trim();
    const expected = git(["rev-parse", `${forkCommit}^{tree}`], seed);
    const mainTree = git(["rev-parse", "origin/main^{tree}"], clone);
    assert.equal(tree, expected);
    assert.notEqual(tree, mainTree);

    const verifyScript = verify.replaceAll("<headRefName>", "feature");
    const stat = execFileSync(
      "bash",
      ["-c", `set -euo pipefail\nORIGINAL_TREE=${tree}\n${verifyScript}`],
      { cwd: clone, encoding: "utf8" }
    );
    assert.match(stat, new RegExp(tree));
    assert.match(stat, new RegExp(mainTree));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
