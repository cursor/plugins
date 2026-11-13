import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../worktree-audit.sh", import.meta.url));
const hasRg = spawnSync("rg", ["--version"]).status === 0;

test("finds the last chat for a repo path Cursor slugifies beyond slashes", () => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), "worktree-audit-")));
  const repo = join(directory, "my_repo.v2");
  const worktree = join(directory, "feature");
  const bin = join(directory, "bin");
  mkdirSync(repo);
  mkdirSync(bin);
  for (const command of ["gh", "origin"]) writeFileSync(join(bin, command), "#!/bin/sh\nexit 1\n", { mode: 0o755 });
  if (!hasRg) writeFileSync(join(bin, "rg"), '#!/bin/sh\nexec grep -r "$@"\n', { mode: 0o755 });
  const git = (...args) => {
    const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  };
  try {
    git("init", "-q");
    git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "--allow-empty", "-qm", "fixture");
    git("worktree", "add", "-qb", "feature", worktree);
    const slug = repo.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
    const transcripts = join(directory, ".cursor", "projects", slug, "agent-transcripts");
    mkdirSync(transcripts, { recursive: true });
    writeFileSync(join(transcripts, "chat.jsonl"), `${JSON.stringify({ path: `${worktree}/README.md` })}\n`);

    const result = spawnSync("bash", [script, "-b", "HEAD", repo], {
      encoding: "utf8",
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, HOME: directory },
    });
    assert.equal(result.status, 0, result.stderr);
    const rows = result.stdout.trim().split("\n").slice(2).map((row) => row.split("\t"));
    assert.equal(rows.length, 1, result.stdout);
    const [, , , , , , lastChat, bucket, path] = rows[0];
    assert.equal(path, worktree);
    assert.match(lastChat, /^\d{4}-\d{2}-\d{2}$/, result.stdout);
    assert.equal(bucket, "verify-recent-chat");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
