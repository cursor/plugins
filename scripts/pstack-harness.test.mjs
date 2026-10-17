import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(path, "utf8");
const walk = (dir) => readdirSync(dir, { recursive: true }).map((path) => join(dir, path));

test("the Codex marketplace installs every portable upstream skill with its description and invocation policy", () => {
  const marketplace = JSON.parse(read(join(root, ".agents/plugins/marketplace.json")));
  const plugin = marketplace.plugins.find(({ name }) => name === "pstack");
  const installed = join(root, plugin.source.path);
  const manifest = JSON.parse(read(join(installed, ".codex-plugin/plugin.json")));
  assert.equal(manifest.name, plugin.name);
  assert.equal(manifest.version, JSON.parse(read(join(root, "pstack/plugin.json"))).version);
  assert.ok(existsSync(join(installed, "docs/harness/codex.md")));
  const skills = readdirSync(join(root, "pstack/skills")).filter((name) => name !== "make-bot-ui" && existsSync(join(root, "pstack/skills", name, "SKILL.md")));
  assert.deepEqual(readdirSync(join(installed, manifest.skills)).sort(), skills.sort());
  for (const name of skills) {
    const [, source] = read(join(root, "pstack/skills", name, "SKILL.md")).split("---\n");
    const [, frontmatter] = read(join(installed, "skills", name, "SKILL.md")).split("---\n");
    assert.ok(frontmatter.startsWith(`name: ${name}\n`));
    assert.ok(frontmatter.includes(source.match(/^description:.*(?:\n[ \t]+.*)*/m)[0]), `${name} lost its description`);
    const implicit = !/^disable-model-invocation:\s*true\s*$/m.test(source);
    assert.equal(read(join(installed, "skills", name, "agents/openai.yaml")), `policy:\n  allow_implicit_invocation: ${implicit}\n`);
  }
});

test("neither package ships or links to the Grok Bot skill", () => {
  for (const tree of ["claude-code", "codex"]) {
    const installed = join(root, "harness/pstack", tree);
    assert.ok(!existsSync(join(installed, "skills/make-bot-ui")));
    for (const path of walk(installed).filter((path) => path.endsWith(".md"))) {
      assert.ok(!read(path).includes("make-bot-ui"), `${path} mentions make-bot-ui`);
    }
  }
});

test("both generators share harness/pstack without clobbering or flagging each other", (t) => {
  const scratch = mkdtempSync(join(tmpdir(), "pstack-harness-test-"));
  t.after(() => rmSync(scratch, { recursive: true, force: true }));
  for (const folder of ["scripts", "pstack", "harness"]) cpSync(join(root, folder), join(scratch, folder), { recursive: true });
  const run = (...args) => execFileSync(process.execPath, args, { cwd: scratch, stdio: "pipe" });
  run("scripts/generate-pstack-codex.mjs");
  run("scripts/generate-pstack-harness-trees.mjs");
  run("scripts/generate-pstack-codex.mjs", "--check");
  run("scripts/generate-pstack-harness-trees.mjs", "--check");
  unlinkSync(join(scratch, "harness/pstack/codex/skills/poteto-mode/SKILL.md"));
  assert.throws(() => run("scripts/generate-pstack-codex.mjs", "--check"));
});
