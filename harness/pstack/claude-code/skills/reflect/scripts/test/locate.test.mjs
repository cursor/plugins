import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const skillPath = fileURLToPath(new URL("../../SKILL.md", import.meta.url));

function locateCommand(dir) {
  const text = readFileSync(skillPath, "utf8");
  const fence = text.match(/```bash\n([\s\S]*?)```/);
  assert.ok(fence, "reflect should show the transcript listing");
  return fence[1].trim().replaceAll("<agent-transcripts>", dir);
}

function run(shell, prefix, command) {
  return spawnSync(shell, [...prefix, command], { encoding: "utf8" });
}

test("a missing layout does not hide the transcripts that exist", () => {
  const parent = mkdtempSync(join(tmpdir(), "reflect-locate-"));
  const dir = join(parent, "agent transcripts");
  mkdirSync(join(dir, "abc"), { recursive: true });
  writeFileSync(join(dir, "abc", "abc.jsonl"), "{\"k\":1}\n");
  const command = locateCommand(dir);
  try {
    const bash = run(
      "bash",
      ["--noprofile", "--norc", "-c"],
      `shopt -s failglob; ${command}`
    );
    assert.equal(bash.error, undefined, bash.stderr);
    assert.equal(bash.status, 0, bash.stderr);
    assert.match(bash.stdout, /abc\.jsonl/);
    assert.doesNotMatch(bash.stderr, /no match/);

    const zsh = spawnSync("zsh", ["-f", "-c", "exit 0"]);
    if (zsh.error) return;
    const listed = run("zsh", ["-f", "-c"], command);
    assert.equal(listed.status, 0, listed.stderr);
    assert.match(listed.stdout, /abc\.jsonl/);
    assert.doesNotMatch(listed.stderr, /no matches found/);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});
