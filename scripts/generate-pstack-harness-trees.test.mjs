import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "pstack-harness-"));
  const save = (path, text) => {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
  };
  const script = join(root, "scripts/generate-pstack-harness-trees.mjs");
  mkdirSync(dirname(script), { recursive: true });
  copyFileSync(join(ROOT, "scripts/generate-pstack-harness-trees.mjs"), script);
  save("pstack/skills/example/SKILL.md", "---\nname: example\ndescription: Exercise OMP tasks.\n---\n\n# Example\n\nCall the `Task` tool to investigate.\n");
  save("pstack/skills/setup-pstack/SKILL.md", "---\nname: setup-pstack\ndescription: Configure Cursor.\n---\n\n# Setup pstack\n\nWrite ~/.cursor/rules/pstack-models.mdc.\n");
  save("pstack/skills/poteto-mode/scripts/worktree-audit.sh", readFileSync(join(ROOT, "pstack/skills/poteto-mode/scripts/worktree-audit.sh"), "utf8"));
  save("pstack/agents/guide.md", "# Agent prompt\n");
  save("pstack/docs/guide/README.md", "# Guide\n");
  save("pstack/README.md", "# Example pstack\n");
  save("pstack/LICENSE", "Example license\n");
  save("pstack/plugin.json", "{}\n");
  for (const name of ["claude-code", "omp"]) {
    save(`pstack/docs/harness/${name}.md`, readFileSync(join(ROOT, `pstack/docs/harness/${name}.md`), "utf8"));
  }
  return { root, save };
}

function generate(root, ...args) {
  return spawnSync(process.execPath, ["scripts/generate-pstack-harness-trees.mjs", ...args], {
    cwd: root, encoding: "utf8",
  });
}

test("OMP skills point at their own adapter and drift blocks the generated tree", () => {
  const { root, save } = fixture();
  try {
    const initial = generate(root);
    assert.equal(initial.status, 0, initial.stderr || initial.stdout);
    const ompPath = join(root, "harness/pstack/omp/skills/example/SKILL.md");
    const claudePath = join(root, "harness/pstack/claude-code/skills/example/SKILL.md");
    assert.match(readFileSync(ompPath, "utf8"), /\[the OMP adapter\]\(\.\.\/\.\.\/docs\/harness\/omp\.md\)/);
    assert.match(readFileSync(claudePath, "utf8"), /\[the Claude Code adapter\]\(\.\.\/\.\.\/docs\/harness\/claude-code\.md\)/);
    assert.ok(existsSync(join(root, "harness/pstack/omp/docs/harness/omp.md")));
    const ompSetup = readFileSync(join(root, "harness/pstack/omp/skills/setup-pstack/SKILL.md"), "utf8");
    const claudeSetup = readFileSync(join(root, "harness/pstack/claude-code/skills/setup-pstack/SKILL.md"), "utf8");
    assert.match(ompSetup, /approval, rollback, and active-profile checks/);
    assert.doesNotMatch(ompSetup, /~\/\.cursor\/rules/);
    assert.match(claudeSetup, /~\/\.cursor\/rules\/pstack-models\.mdc/);
    assert.match(readFileSync(join(root, "harness/pstack/omp/skills/poteto-mode/scripts/worktree-audit.sh"), "utf8"), /transcripts="" # OMP history/);
    assert.match(readFileSync(join(root, "harness/pstack/claude-code/skills/poteto-mode/scripts/worktree-audit.sh"), "utf8"), /transcripts="\$HOME\/\.cursor\/projects/);
    assert.equal(generate(root, "--check").status, 0);

    save("harness/pstack/omp/skills/example/SKILL.md", "stale OMP skill\n");
    const drift = generate(root, "--check");
    assert.notEqual(drift.status, 0);
    assert.match(drift.stdout, /omp\/skills\/example\/SKILL\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a missing OMP mapping refuses generation without replacing existing output", () => {
  const { root, save } = fixture();
  try {
    assert.equal(generate(root).status, 0);
    const prior = readFileSync(join(root, "harness/pstack/omp/skills/example/SKILL.md"), "utf8");
    save("pstack/docs/harness/omp.md", "# No Task mapping\n");
    const rejected = generate(root);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stdout, /omp adapter has no row for `Task`/);
    assert.equal(readFileSync(join(root, "harness/pstack/omp/skills/example/SKILL.md"), "utf8"), prior);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("OMP audit requires manual review when chat history is unavailable", () => {
  const { root, save } = fixture();
  try {
    assert.equal(generate(root).status, 0);
    const repo = join(root, "repo");
    const worktree = join(root, "candidate");
    const init = spawnSync("git", ["init", "-q", repo], { encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);
    const commit = spawnSync("git", ["-C", repo, "-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-qm", "base"], { encoding: "utf8" });
    assert.equal(commit.status, 0, commit.stderr);
    const add = spawnSync("git", ["-C", repo, "worktree", "add", "-q", "--detach", worktree, "HEAD"], { encoding: "utf8" });
    assert.equal(add.status, 0, add.stderr);
    for (const command of ["origin", "gh"]) {
      save(`bin/${command}`, "#!/bin/sh\nexit 1\n");
      chmodSync(join(root, "bin", command), 0o755);
    }
    const audit = spawnSync("bash", [join(root, "harness/pstack/omp/skills/poteto-mode/scripts/worktree-audit.sh"), "-b", "HEAD", repo], {
      encoding: "utf8", env: { ...process.env, HOME: join(root, "home"), PATH: `${join(root, "bin")}:${process.env.PATH}` },
    });
    assert.equal(audit.status, 0, audit.stderr);
    const row = audit.stdout.split("\n").find((line) => line.endsWith(`\t${worktree}`));
    assert.ok(row, audit.stdout);
    assert.deepEqual(row.split("\t").slice(2, 8), ["YES", "clean", "detached", "-", "?", "review"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
