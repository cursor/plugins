import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repository = fileURLToPath(new URL("../../", import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "pstack-harness-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  const skill = (name, explicit) => write(`pstack/skills/${name}/SKILL.md`,
    `---\nname: ${name}\ndescription: A fixture skill\ndisable-model-invocation: ${explicit}\n---\n\n# ${name}\n\nUse the Task tool.\n`);
  cpSync(join(repository, "scripts/generate-pstack-harness-trees.mjs"), join(root, "scripts/generate-pstack-harness-trees.mjs"), { recursive: true });
  cpSync(join(repository, "pstack/docs/harness"), join(root, "pstack/docs/harness"), { recursive: true });
  write("pstack/plugin.json", JSON.stringify({ name: "pstack", version: "1.0.0" }));
  write("pstack/README.md", "# pstack\n\n[asset](./assets/banner.txt)\n");
  write("pstack/LICENSE", "fixture license\n");
  write("pstack/assets/banner.txt", "not installed\n");
  write("pstack/agents/worker.md", "# Worker\n");
  write("pstack/docs/guide/README.md", "# Guide\n");
  skill("manual", true);
  skill("automatic", false);
  const run = (...args) => spawnSync(process.execPath, [join(root, "scripts/generate-pstack-harness-trees.mjs"), ...args], { encoding: "utf8" });
  const read = (path) => readFileSync(join(root, path), "utf8");
  return { root, write, read, run, skill };
}

function succeeds(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
}

test("generates both installable trees without changing source skills", (t) => {
  const f = fixture(t);
  const before = f.read("pstack/skills/manual/SKILL.md");
  succeeds(f.run());
  succeeds(f.run("--check"));
  assert.equal(f.read("pstack/skills/manual/SKILL.md"), before);
  for (const host of ["claude-code", "codex"]) {
    const prefix = `harness/pstack/${host}`;
    assert.equal(JSON.parse(f.read(`${prefix}/plugin.json`)).version, "1.0.0");
    assert.match(f.read(`${prefix}/skills/manual/SKILL.md`), new RegExp(`docs/harness/${host}\\.md`));
    assert.equal(f.read(`${prefix}/agents/worker.md`), f.read("pstack/agents/worker.md"));
    assert.match(f.read(`${prefix}/README.md`), /https:\/\/github\.com\/cursor\/plugins\/blob\/main\/pstack\/assets\/banner.txt/);
  }
  const manifest = JSON.parse(f.read("harness/pstack/codex/.codex-plugin/plugin.json"));
  assert.equal(manifest.name, "pstack");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(manifest.version, "1.0.0");
  assert.equal(f.read("harness/pstack/codex/skills/manual/agents/openai.yaml"), "policy:\n  allow_implicit_invocation: false\n");
  assert.equal(f.read("harness/pstack/codex/skills/automatic/agents/openai.yaml"), "policy:\n  allow_implicit_invocation: true\n");
  assert.equal(f.read("harness/pstack/codex/docs/harness/codex/sessions.mjs"), f.read("pstack/docs/harness/codex/sessions.mjs"));
});

test("the Codex compatibility manifest drops $schema while the copied manifests keep it", (t) => {
  const f = fixture(t);
  const $schema = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
  f.write("pstack/plugin.json", JSON.stringify({ $schema, name: "pstack", version: "1.0.0" }));
  succeeds(f.run());
  assert.deepEqual(JSON.parse(f.read("harness/pstack/codex/.codex-plugin/plugin.json")),
    { name: "pstack", version: "1.0.0", skills: "./skills/" });
  for (const path of ["codex/plugin.json", "claude-code/plugin.json", "claude-code/.claude-plugin/plugin.json"]) {
    assert.equal(JSON.parse(f.read(`harness/pstack/${path}`)).$schema, $schema);
  }
});

test("regeneration carries new skills, invocation changes and versions to both hosts", (t) => {
  const f = fixture(t);
  succeeds(f.run());
  f.skill("new-skill", true);
  f.skill("manual", false);
  f.write("pstack/plugin.json", JSON.stringify({ name: "pstack", version: "2.0.0" }));
  assert.equal(f.run("--check").status, 1);
  succeeds(f.run());
  succeeds(f.run("--check"));
  for (const host of ["claude-code", "codex"]) {
    assert.equal(JSON.parse(f.read(`harness/pstack/${host}/plugin.json`)).version, "2.0.0");
    assert.match(f.read(`harness/pstack/${host}/skills/new-skill/SKILL.md`), /# new-skill/);
  }
  assert.equal(f.read("harness/pstack/codex/skills/manual/agents/openai.yaml"), "policy:\n  allow_implicit_invocation: true\n");
  assert.equal(f.read("harness/pstack/codex/skills/new-skill/agents/openai.yaml"), "policy:\n  allow_implicit_invocation: false\n");
});

test("check rejects drift in either generated tree", (t) => {
  const f = fixture(t);
  for (const host of ["claude-code", "codex"]) {
    succeeds(f.run());
    f.write(`harness/pstack/${host}/skills/manual/SKILL.md`, "stale\n");
    const result = f.run("--check");
    assert.equal(result.status, 1);
    assert.ok(result.stdout.includes(`harness/pstack/${host}/skills/manual/SKILL.md`));
  }
});

test("generation rejects a missing Codex tool mapping", (t) => {
  const f = fixture(t);
  f.write("pstack/docs/harness/codex.md", f.read("pstack/docs/harness/codex.md").replaceAll("`Task`", "Task"));
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Codex adapter has no row for `Task`/);
});

test("generation refuses to overwrite authored invocation metadata", (t) => {
  const f = fixture(t);
  f.write("pstack/skills/manual/agents/openai.yaml", "interface:\n  display_name: Manual\n");
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /agents\/openai.yaml is generated/);
});
