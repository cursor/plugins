import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";

const script = fileURLToPath(new URL("worktree-audit.sh", import.meta.url));

for (const spaced of [false, true]) {
  test(`audits worktree paths ${spaced ? "with" : "without"} spaces`, () => {
    const directory = realpathSync(mkdtempSync(join(tmpdir(), "worktree-audit-")));
    const repo = join(directory, spaced ? "main checkout" : "main");
    const worktree = join(directory, spaced ? "feature checkout" : "feature");
    const bin = join(directory, "bin");
    mkdirSync(repo);
    mkdirSync(bin);
    // Keep the fixture offline, regardless of the caller's forge installation.
    for (const command of ["gh", "origin"])
      writeFileSync(join(bin, command), "#!/bin/sh\nprintf '[]\\n'\n", { mode: 0o755 });
    const git = (...args) => {
      const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    };
    try {
      git("init", "-q");
      git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "-qm", "fixture");
      git("worktree", "add", "-qb", "feature", worktree);
      const transcripts = join(directory, ".cursor/projects", repo.slice(1).replaceAll("/", "-"), "agent-transcripts");
      mkdirSync(transcripts, { recursive: true });
      writeFileSync(join(transcripts, spaced ? "chat record.txt" : "chat.txt"), JSON.stringify({ cwd: worktree }));
      const result = spawnSync("bash", [script, "-b", "HEAD", repo], {
        encoding: "utf8",
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, HOME: directory },
      });
      assert.equal(result.status, 0, result.stderr);
      const rows = result.stdout.trim().split("\n").slice(2).map((row) => row.split("\t"));
      assert.equal(rows.length, 1, result.stdout);
      assert.equal(rows[0][8], worktree);
      assert.equal(rows[0][2], "YES");
      assert.equal(rows[0][3], "clean");
      if (process.platform === "darwin") {
        assert.notEqual(rows[0][6], "-");
        assert.equal(rows[0][7], "verify-recent-chat");
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
