import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let fixture;

function writeJSON(path, value) {
  const target = join(fixture, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(value));
}

function plugin(name, source) {
  writeJSON(`${source}/.cursor-plugin/plugin.json`, { name, version: "1.0.0" });
  return { name, source };
}

function validate(plugins) {
  writeJSON(".cursor-plugin/marketplace.json", { name: "fixture", plugins });
  return spawnSync(process.execPath, [join(fixture, "scripts/validate-plugins.mjs")], {
    encoding: "utf8",
  });
}

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), "marketplace-names-"));
  mkdirSync(join(fixture, "scripts"));
  cpSync(join(root, "scripts/validate-plugins.mjs"), join(fixture, "scripts/validate-plugins.mjs"));
  cpSync(join(root, "schemas"), join(fixture, "schemas"), { recursive: true });
  symlinkSync(join(root, "node_modules"), join(fixture, "node_modules"), "junction");
});

afterEach(() => {
  rmSync(fixture, { recursive: true, force: true });
});

test("distinct plugin names pass validation", () => {
  const result = validate([plugin("first", "first"), plugin("second", "second")]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /All plugins validated successfully/);
});

test("repeating the same marketplace entry fails validation", () => {
  const entry = plugin("repeated", "plugin");
  const result = validate([entry, entry]);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /duplicate plugin name "repeated"/);
});

test("different plugin directories cannot reuse a marketplace name", () => {
  const result = validate([plugin("repeated", "first"), plugin("repeated", "second")]);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /duplicate plugin name "repeated"/);
});

test("uniqueness is scoped to a marketplace, not the separate harness catalogs", () => {
  const entry = plugin("shared", "plugin");
  writeJSON("plugin/.claude-plugin/plugin.json", { name: "shared", version: "1.0.0" });
  writeJSON(".claude-plugin/marketplace.json", { name: "claude-fixture", plugins: [entry] });
  const result = validate([entry]);
  assert.equal(result.status, 0, result.stderr);
});

test("an empty marketplace remains valid", () => {
  const result = validate([]);
  assert.equal(result.status, 0, result.stderr);
});

test("existing plugin name mismatch validation is preserved", () => {
  const entry = plugin("first", "plugin");
  const result = validate([{ ...entry, name: "second" }]);
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /marketplace name does not match plugin.json name/);
});
