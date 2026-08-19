import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../..");
const pluginRoot = resolve(repositoryRoot, "agent-compatibility");

function readPluginFile(relativePath) {
  return readFileSync(resolve(pluginRoot, relativePath), "utf8");
}

function readRepositoryFile(relativePath) {
  return readFileSync(resolve(repositoryRoot, relativePath), "utf8");
}

function frontmatterValue(content, field) {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(frontmatter, "expected YAML frontmatter");

  const match = frontmatter[1].match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
  return match?.[1].trim();
}

const agentPaths = [
  "agents/compatibility-scan-review.md",
  "agents/startup-review.md",
  "agents/validation-review.md",
  "agents/docs-reliability-review.md",
];

test("agents that install, start, or validate are writable while docs review stays read-only", () => {
  for (const path of agentPaths.slice(0, 3)) {
    const content = readPluginFile(path);
    assert.equal(frontmatterValue(content, "readonly"), "false", path);
  }

  const docsReview = readPluginFile("agents/docs-reliability-review.md");
  assert.equal(frontmatterValue(docsReview, "readonly"), "true");
});

test("the published scanner is pinned everywhere it can be executed", () => {
  const files = [
    "README.md",
    "agents/compatibility-scan-review.md",
    "skills/check-agent-compatibility/SKILL.md",
  ];

  for (const path of files) {
    const content = readPluginFile(path);
    assert.doesNotMatch(content, /agent-compatibility@latest/, path);
  }

  assert.match(readPluginFile("README.md"), /agent-compatibility@0\.1\.7/);
  assert.match(
    readPluginFile("agents/compatibility-scan-review.md"),
    /agent-compatibility@0\.1\.7/,
  );
});

test("the orchestrator uses executable helpers for scanning and score synthesis", () => {
  const skill = readPluginFile("skills/check-agent-compatibility/SKILL.md");
  const scanReview = readPluginFile("agents/compatibility-scan-review.md");

  assert.match(skill, /scripts\/run-deterministic-scan\.mjs/);
  assert.match(skill, /scripts\/synthesize-results\.mjs/);
  assert.match(scanReview, /run-deterministic-scan\.mjs/);
  assert.match(skill, /use the synthesizer output exactly/i);
});

test("the orchestrator has an explicit degraded result when the deterministic scan is unusable", () => {
  const skill = readPluginFile("skills/check-agent-compatibility/SKILL.md");

  assert.match(skill, /Agent Compatibility Score: unavailable/);
  assert.match(skill, /Workflow Compatibility Score: N\/100/);
  assert.match(skill, /must not compute the 70\/30 blend/i);
});

test("the orchestrator refuses a blended score when a workflow lane is unavailable", () => {
  const skill = readPluginFile("skills/check-agent-compatibility/SKILL.md");

  assert.match(
    skill,
    /workflow lane is unavailable[^\n]+Agent Compatibility Score: unavailable/i,
  );
  assert.match(skill, /do not impute its score/i);
});

test("every delegated review receives the target, evidence contract, and bounded execution context", () => {
  const skill = readPluginFile("skills/check-agent-compatibility/SKILL.md");

  for (const phrase of [
    "Target root",
    "Deterministic scan result",
    "Time budget",
    "Allowed mutations",
    "Required evidence",
  ]) {
    assert.match(skill, new RegExp(phrase, "i"), phrase);
  }

  assert.match(
    skill,
    /launch .*startup-review.*validation-review.*docs-reliability-review.*parallel/is,
  );
});

test("specialists return a machine-checkable result with evidence and command outcomes", () => {
  for (const path of agentPaths) {
    const content = readPluginFile(path);

    for (const key of [
      '"status"',
      '"scoreName"',
      '"score"',
      '"summary"',
      '"targetRoot"',
      '"evidence"',
      '"problems"',
    ]) {
      assert.match(content, new RegExp(key), `${path}: ${key}`);
    }
  }

  for (const path of agentPaths.slice(0, 3)) {
    assert.match(readPluginFile(path), /"commands"/, path);
  }
});

test("stateful specialists report isolated execution provenance", () => {
  for (const path of [
    "agents/startup-review.md",
    "agents/validation-review.md",
  ]) {
    const content = readPluginFile(path);
    assert.match(content, /"executionRoot"/, path);
    assert.match(content, /"isolation": "isolated-copy"/, path);
  }
});

test("specialist output examples are valid JSON", () => {
  for (const path of agentPaths) {
    const content = readPluginFile(path);
    const example = content.match(/```json\n([\s\S]*?)\n```/);
    assert.ok(example, `${path}: missing JSON example`);

    const parsed = JSON.parse(example[1]);
    assert.equal(typeof parsed.status, "string", path);
    assert.doesNotMatch(
      parsed.status,
      /\|/,
      `${path}: status must be a concrete value`,
    );
    assert.equal(typeof parsed.scoreName, "string", path);
    assert.ok(Array.isArray(parsed.problems), path);
    assert.ok(Array.isArray(parsed.commands), path);
    for (const command of parsed.commands) {
      assert.doesNotMatch(
        command.outcome,
        /\|/,
        `${path}: command outcome must be a concrete value`,
      );
    }
  }
});

test("the scan specialist rejects an obviously wrong repository classification", () => {
  const scanReview = readPluginFile("agents/compatibility-scan-review.md");

  assert.match(scanReview, /classification/i);
  assert.match(scanReview, /obvious repository signals/i);
  assert.match(scanReview, /"unreliable"/);
});

test("stateful specialists define isolation and side-effect boundaries", () => {
  for (const path of [
    "agents/startup-review.md",
    "agents/validation-review.md",
  ]) {
    const content = readPluginFile(path);
    assert.match(content, /isolated/i, path);
    assert.match(content, /do not (run|perform).*deploy/i, path);
    assert.match(content, /paid|costs money/i, path);
    assert.match(content, /tracked files/i, path);
  }
});

test("CI runs contract tests whenever the plugin behavior can change", () => {
  const workflow = readRepositoryFile(".github/workflows/validate-plugins.yml");

  for (const watchedPath of [
    "agent-compatibility/agents/**",
    "agent-compatibility/skills/**",
    "agent-compatibility/test/**",
    "agent-compatibility/README.md",
    "agent-compatibility/CHANGELOG.md",
    ".github/workflows/validate-plugins.yml",
  ]) {
    assert.match(
      workflow,
      new RegExp(watchedPath.replaceAll("*", "\\*")),
      watchedPath,
    );
  }

  assert.match(
    workflow,
    /node --test agent-compatibility\/test\/\*\.test\.mjs/,
  );
  assert.match(workflow, /windows-latest/);
});

test("release documentation matches the manifest version", () => {
  const manifest = JSON.parse(readPluginFile(".cursor-plugin/plugin.json"));
  const readme = readPluginFile("README.md");
  const changelog = readPluginFile("CHANGELOG.md");

  assert.match(
    readme,
    new RegExp(`Plugin version ${manifest.version.replaceAll(".", "\\.")}`),
  );
  assert.match(
    changelog,
    new RegExp(`^## ${manifest.version.replaceAll(".", "\\.")} - `, "m"),
  );
});
