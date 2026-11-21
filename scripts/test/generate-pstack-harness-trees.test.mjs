import assert from "node:assert/strict";
import { chmodSync, cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const generator = "scripts/generate-pstack-harness-trees.mjs";
const tree = "harness/pstack/antigravity";

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "pstack-harness-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  cpSync(join(root, "pstack"), join(dir, "pstack"), {
    recursive: true,
    filter: (path) => !path.split(/[\\/]/).includes("node_modules"),
  });
  mkdirSync(join(dir, "scripts"));
  cpSync(join(root, generator), join(dir, generator));
  return dir;
}

function run(dir, ...args) {
  const result = spawnSync(process.execPath, [generator, ...args], { cwd: dir, encoding: "utf8" });
  assert.ifError(result.error);
  return { status: result.status, output: result.stdout + result.stderr };
}

function pass(result) {
  assert.equal(result.status, 0, result.output);
}

function read(dir, path) {
  return readFileSync(join(dir, path), "utf8");
}

test("generates complete, relocatable native and Claude packages from the same source", (t) => {
  const dir = fixture(t);
  pass(run(dir));
  pass(run(dir, "--check"));
  const source = JSON.parse(read(dir, "pstack/plugin.json"));
  assert.deepEqual(JSON.parse(read(dir, `${tree}/plugin.json`)), { name: source.name, description: source.description });
  assert.equal(existsSync(join(dir, tree, ".claude-plugin")), false);
  assert.equal(read(dir, "harness/pstack/claude-code/plugin.json"), read(dir, "pstack/plugin.json"));
  assert.equal(read(dir, "harness/pstack/claude-code/.claude-plugin/plugin.json"), read(dir, "pstack/plugin.json"));
  assert.equal(read(dir, "harness/pstack/claude-code/agents/poteto-agent.md"), read(dir, "pstack/agents/poteto-agent.md"));
  const names = readdirSync(join(dir, "pstack/skills")).filter((name) => existsSync(join(dir, "pstack/skills", name, "SKILL.md")));
  assert.deepEqual(readdirSync(join(dir, tree, "skills")), names);
  assert.equal(read(dir, `${tree}/LICENSE`), read(dir, "pstack/LICENSE"));
  assert.equal(read(dir, `${tree}/docs/guide/README.md`), read(dir, "pstack/docs/guide/README.md"));
  const executable = "skills/poteto-mode/scripts/watch-pr/watch-pr";
  assert.equal(statSync(join(dir, tree, executable)).mode & 0o111, statSync(join(dir, "pstack", executable)).mode & 0o111);

  // Simulate a copy-only installation, without access to the source checkout.
  const installed = join(dir, "workspace/.agents/plugins/pstack");
  cpSync(join(dir, tree), installed, { recursive: true });
  rmSync(join(dir, "pstack"), { recursive: true });
  assert.match(readFileSync(join(installed, "skills/poteto-mode/SKILL.md"), "utf8"), /\.\.\/\.\.\/docs\/harness\/antigravity\.md/);
  assert.ok(existsSync(join(installed, "docs/harness/antigravity.md")));
  assert.ok(existsSync(join(installed, "skills/poteto-mode/playbooks/feature.md")));
  assert.ok(existsSync(join(installed, "docs/guide/README.md")));
});

test("agents load the adapter before bootstrapping and use native grants and model tiers", (t) => {
  const dir = fixture(t);
  pass(run(dir));
  for (const [name, model] of [["poteto-agent", "inherit"], ["comment-sicko", "pro"]]) {
    const text = read(dir, `${tree}/agents/${name}.md`);
    assert.match(text, new RegExp(`^model: ${model}$`, "m"));
    assert.match(text, /^subagent: true$/m);
    assert.match(text, /^mainAgent: false$/m);
    assert.match(text, /^commandExecutionPolicy: sandbox$/m);
    assert.match(text, /^tools: \[view_file, grep_search, replace_file_content, run_command, invoke_subagent\]$/m);
    assert.match(text, /\.\.\/docs\/harness\/antigravity\.md/);
    assert.doesNotMatch(text, /is_background:|~\/\.cursor\/plugins\/|\.cursor-plugin\/plugin\.json/);
  }
  assert.match(read(dir, `${tree}/agents/poteto-agent.md`), /\.\.\/skills\/poteto-mode\/SKILL\.md/);
  assert.match(read(dir, `${tree}/agents/comment-sicko.md`), /Yes\.\.\. Ha ha ha\.\.\. Yes!/);
});

test("invocation restrictions survive on skills with and without headings", (t) => {
  const dir = fixture(t);
  pass(run(dir));
  for (const name of ["poteto-mode", "bro"]) {
    const text = read(dir, `${tree}/skills/${name}/SKILL.md`);
    assert.match(text, /^---\nname:/);
    assert.match(text, /Follow this skill only when the user explicitly requests it/);
    assert.match(text, /^disable-model-invocation: true$/m);
  }
  assert.doesNotMatch(read(dir, "harness/pstack/claude-code/skills/bro/SKILL.md"), /Being listed in the skill catalog/);
});

for (const change of ["contents", "missing", "extra", "mode"]) {
  test(`--check detects ${change} drift and regeneration repairs it`, (t) => {
    const dir = fixture(t);
    pass(run(dir));
    const path = join(dir, tree, "plugin.json");
    if (change === "contents") writeFileSync(path, "{}\n");
    if (change === "missing") rmSync(path);
    if (change === "extra") writeFileSync(join(dir, tree, "stale.md"), "stale\n");
    if (change === "mode") chmodSync(path, 0o755);
    const failed = run(dir, "--check");
    assert.equal(failed.status, 1);
    assert.match(failed.output, /harness\/pstack\/antigravity\//);
    assert.match(failed.output, /out of date/);
    pass(run(dir));
    pass(run(dir, "--check"));
  });
}

test("source edits invalidate both trees", (t) => {
  const dir = fixture(t);
  pass(run(dir));
  const path = "pstack/skills/how/SKILL.md";
  writeFileSync(join(dir, path), `${read(dir, path)}\nA new source instruction.\n`);
  const result = run(dir, "--check");
  assert.equal(result.status, 1);
  assert.match(result.output, /antigravity\/skills\/how\/SKILL.md/);
  assert.match(result.output, /claude-code\/skills\/how\/SKILL.md/);
});

test("missing adapter mappings fail before overwriting either tree", (t) => {
  const dir = fixture(t);
  pass(run(dir));
  const before = read(dir, `${tree}/plugin.json`);
  const path = "pstack/docs/harness/antigravity.md";
  writeFileSync(join(dir, path), read(dir, path).replaceAll("AskQuestion", "UnmappedQuestion"));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.output, /Google Antigravity adapter has no row for `AskQuestion`/);
  assert.equal(read(dir, `${tree}/plugin.json`), before);
});

test("new agent metadata cannot silently pass through as native configuration", (t) => {
  const dir = fixture(t);
  const path = "pstack/agents/poteto-agent.md";
  writeFileSync(join(dir, path), read(dir, path).replace("is_background: true", "is_background: true\nmodel: unknown-cursor-model"));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.output, /Unsupported Antigravity source frontmatter/);
  assert.equal(existsSync(join(dir, "harness")), false);
});

test("links leaving the installable tree fail generation", (t) => {
  const dir = fixture(t);
  writeFileSync(join(dir, "outside.md"), "outside\n");
  const path = "pstack/skills/how/SKILL.md";
  writeFileSync(join(dir, path), `${read(dir, path)}\n[outside](../../../outside.md)\n`);
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.output, /antigravity\/skills\/how\/SKILL.md links to/);
  assert.match(result.output, /claude-code\/skills\/how\/SKILL.md links to/);
});

for (const change of ["bootstrap", "heading"]) {
  test(`source agent ${change} changes cannot silently disable adaptation`, (t) => {
    const dir = fixture(t);
    const path = "pstack/agents/poteto-agent.md";
    const text = read(dir, path);
    writeFileSync(join(dir, path), change === "bootstrap"
      ? text.replace("~/.cursor/plugins/", "~/.cursor/new-location/")
      : text.replace("# Poteto subagent", "Poteto subagent"));
    const result = run(dir);
    assert.equal(result.status, 1);
    assert.match(result.output, change === "bootstrap" ? /Cursor install lookup changed/ : /has no H1/);
    assert.equal(existsSync(join(dir, "harness")), false);
  });
}
