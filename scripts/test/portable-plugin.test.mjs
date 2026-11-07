import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { mkdtemp, mkdir, readFile, writeFile, rm, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { loadConfig, setupConfig, resolveRole, requireCapability } from "../lib/pstack-config.mjs";
import { setupModelAgents } from "../lib/model-agents.mjs";

const root = resolve(import.meta.dirname, "../..");
const text = path => readFileSync(join(root, path), "utf8");
const catalog = {
  models: [{ id: "test-gpt", family: "gpt" }, { id: "test-claude", family: "claude", tier: "opus" }],
};

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "pstack-portable-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const repo = join(dir, "project");
  const home = join(dir, "home");
  return { repo, home, env: { HOME: home } };
}

test("root installation and native distributions preserve bundled components and license", () => {
  const manifest = JSON.parse(text("plugin.json"));
  assert.equal(manifest.name, "pstack");
  for (const client of ["cursor", "claude-code"]) {
    const base = `dist/${client}`;
    assert.equal(text(`${base}/LICENSE`), text("LICENSE"));
    assert.equal(text(`${base}/config/defaults.json`), text("config/defaults.json"));
    for (const skill of readdirSync(join(root, "skills"))) {
      if (!existsSync(join(root, "skills", skill, "SKILL.md"))) continue;
      const entry = text(`${base}/skills/${skill}/SKILL.md`);
      assert.match(entry, /Read \[the .* adapter\]/);
      assert.ok(entry.includes(`../../docs/harness/${client === "cursor" ? "cursor" : "claude-code"}.md`));
    }
    assert.ok(existsSync(join(root, base, "scripts/lib/model-agents.mjs")));
  }
  const marketplace = JSON.parse(text(".claude-plugin/marketplace.json"));
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].source, "./");
  assert.ok(!existsSync(join(root, "pstack")));
  assert.ok(!existsSync(join(root, "third_party")));
});

test("generated agents restrict readers through tools and disclose harness differences", () => {
  const reader = text("com.github.copilot/agents/pstack-reader.agent.md");
  assert.match(reader, /tools: \["read","search"\]/);
  assert.match(reader, /strict-tools-list: true/);
  assert.doesNotMatch(reader.match(/^tools:.*$/m)[0], /execute|edit|agent|\*/);
  assert.match(text("agents/pstack-reader.md"), /tools: \["Read","Grep","Glob"\]/);
  assert.match(text("docs/harness/vscode-copilot.md"), /does not forward every Copilot field/);
  assert.match(text("docs/harness/vscode-local.md"), /agent\/runSubagent/);
  assert.match(text("docs/harness/copilot-cli.md"), /native `task`/);
});

test("how handles a small trace directly; review resolves two bounded families without model calls", async t => {
  const f = await fixture(t);
  const config = await loadConfig(f);
  assert.match(text("skills/how/SKILL.md"), /single module, symbol, or continuous trace is\nhandled directly/);
  const panel = resolveRole(config, "review", { runtime: "copilot-cli", catalog });
  assert.equal(panel.members.length, 2);
  assert.equal(panel.panel.crossFamily, true);
  assert.ok(panel.members.length <= config.limits.maxWorkers);
  assert.equal(panel.runtimePolicy.invoked, false);
  assert.throws(() => resolveRole({ ...config, limits: { ...config.limits, maxWorkers: 1 } }, "review", { runtime: "copilot-cli", catalog }), /exceeds limits.maxWorkers/);
  assert.throws(() => resolveRole(config, "review", { runtime: "claude-code", catalog: { models: [catalog.models[1]] } }), /resolution stopped/);
  assert.equal(requireCapability({}, "uiControl", { required: false }).skipped, true);
  assert.throws(() => requireCapability({}, "verification"), /Required capability unavailable/);
});

test("model-agent setup preflights every seat before writing a panel", async t => {
  const f = await fixture(t);
  const dir = join(f.home, ".copilot/agents");
  await mkdir(dir, { recursive: true });
  const second = join(dir, "pstack-review-2.agent.md");
  await writeFile(second, "Unrelated second-seat agent\n");
  const config = await loadConfig(f);
  await assert.rejects(setupModelAgents({ ...f, config, catalog, runtime: "copilot-cli", role: "review", scope: "user", pluginRoot: root }), /Refusing to overwrite unrelated/);
  assert.equal(existsSync(join(dir, "pstack-review-1.agent.md")), false);
  assert.equal(await readFile(second, "utf8"), "Unrelated second-seat agent\n");
});

test("setup stores overrides only, so later user defaults reach an existing repository override", async t => {
  const f = await fixture(t);
  await setupConfig({ ...f, input: { limits: { maxWorkers: 1 }, keep: { value: 7 } }, scope: "repo" });
  await setupConfig({ ...f, input: { roles: { explanation: { family: "gpt" } } }, scope: "user" });
  const config = await loadConfig(f);
  assert.equal(config.roles.explanation.family, "gpt");
  assert.equal(config.keep.value, 7);
  const stored = JSON.parse(await readFile(join(f.repo, ".pstack/config.json"), "utf8"));
  assert.equal(stored.roles, undefined);
  assert.equal((await setupConfig({ ...f, input: { limits: { maxWorkers: 1 } }, scope: "repo" })).changed, false);
});

test("role overrides can explicitly clear inherited identity constraints and controls", async t => {
  const f = await fixture(t);
  await setupConfig({ ...f, scope: "user", input: { roles: { architecture: { id: "test-claude" } } } });
  await setupConfig({ ...f, scope: "repo", input: { roles: {
    architecture: { id: null, family: "gpt", tier: null, fallback: "stop" },
    exploration: { family: null, id: "test-claude", speed: null, reasoningEffort: null, fallback: "stop" },
  } } });
  const config = await loadConfig(f);
  assert.equal(resolveRole(config, "architecture", { runtime: "copilot-cli", catalog }).model.id, "test-gpt");
  const explorer = resolveRole(config, "exploration", { runtime: "copilot-cli", catalog });
  assert.equal(explorer.model.id, "test-claude");
  assert.deepEqual(explorer.controls, {});
  await assert.rejects(setupConfig({ ...f, scope: "repo", input: { roles: { implementation: { id: null, family: null } } } }), /requires id or family/);
});

test("native model agents are exact, restricted, idempotent, and preserve unrelated files", async t => {
  const f = await fixture(t);
  const config = await loadConfig(f);
  const args = { ...f, config, catalog, runtime: "copilot-cli", role: "review", scope: "user", pluginRoot: root };
  const first = await setupModelAgents(args);
  assert.deepEqual(first.agents.map(agent => agent.model.id), ["test-gpt", "test-claude"]);
  for (const agent of first.agents) {
    const data = await readFile(agent.path, "utf8");
    assert.match(data, /model-policy: required/);
    assert.match(data, /tools: \["read","search"\]/);
  }
  assert.ok((await setupModelAgents(args)).agents.every(agent => !agent.changed));
  await writeFile(first.agents[0].path, "---\ndescription: unrelated\n---\nCustom content\n");
  await assert.rejects(setupModelAgents(args), /Refusing to overwrite unrelated/);
  assert.match(await readFile(first.agents[0].path, "utf8"), /Custom content/);
  await assert.rejects(setupModelAgents({ ...args, runtime: "vscode-local" }), /profile storage/);
});

test("CLI model-agent setup and unavailable-model failure have observable output", async t => {
  const f = await fixture(t);
  await mkdir(f.repo, { recursive: true });
  const cat = join(f.repo, "catalog.json");
  await writeFile(cat, JSON.stringify(catalog));
  const run = args => spawnSync(process.execPath, [join(root, "scripts/pstack-config.mjs"), ...args, "--repo", f.repo, "--home", f.home], {
    encoding: "utf8", env: { ...process.env, XDG_CONFIG_HOME: "", PSTACK_CONFIG: "" },
  });
  const agents = run(["agents", "--runtime", "copilot-cli", "--role", "review", "--catalog", cat, "--scope", "user"]);
  assert.equal(agents.status, 0, agents.stderr);
  assert.equal(JSON.parse(agents.stdout).agents.length, 2);
  const unavailable = run(["resolve", "--runtime", "copilot-cli", "--role", "implementation", "--catalog", cat,
    "--override", '{"roles":{"implementation":{"id":"missing","fallback":"stop"}}}']);
  assert.notEqual(unavailable.status, 0);
  assert.equal(unavailable.stdout, "");
  assert.match(JSON.parse(unavailable.stderr).error, /resolution stopped/);
});

test("generator check rejects drift without overwriting output", async t => {
  const check = spawnSync(process.execPath, [join(root, "scripts/generate-pstack-harness-trees.mjs"), "--check"], { encoding: "utf8" });
  assert.equal(check.status, 0, check.stderr);
  const f = await fixture(t);
  await mkdir(join(f.repo, "scripts/lib"), { recursive: true });
  for (const path of ["skills", "docs", "assets", "automations", "config", "README.md", "LICENSE", "plugin.json",
    "scripts/generate-pstack-harness-trees.mjs", "scripts/pstack-config.mjs", "scripts/lib/pstack-config.mjs", "scripts/lib/model-agents.mjs"]) {
    await cp(join(root, path), join(f.repo, path), { recursive: true, filter: path => !path.split("/").includes("node_modules") });
  }
  const run = args => spawnSync(process.execPath, [join(f.repo, "scripts/generate-pstack-harness-trees.mjs"), ...args], { encoding: "utf8" });
  assert.equal(run([]).status, 0);
  assert.equal(run(["--check"]).status, 0, "first-run output must not depend on an existing distribution");
  const output = join(f.repo, "dist/cursor/skills/how/SKILL.md");
  await writeFile(output, "Intentional fixture drift\n");
  const drift = run(["--check"]);
  assert.notEqual(drift.status, 0);
  assert.match(drift.stderr, /Generated output drift/);
  assert.equal(await readFile(output, "utf8"), "Intentional fixture drift\n");
});
