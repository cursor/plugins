import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repository = fileURLToPath(new URL("../../", import.meta.url));

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "pstack-marketplace-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, value) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), JSON.stringify(value));
  };
  cpSync(join(repository, "scripts/validate-plugins.mjs"), join(root, "scripts/validate-plugins.mjs"), { recursive: true });
  cpSync(join(repository, "schemas"), join(root, "schemas"), { recursive: true });
  symlinkSync(join(repository, "node_modules"), join(root, "node_modules"), "junction");
  const cursor = JSON.parse(readFileSync(join(repository, ".cursor-plugin/marketplace.json"), "utf8"));
  write(".cursor-plugin/marketplace.json", { ...cursor, plugins: [] });
  const manifest = { name: "pstack", version: "1.0.0" };
  write("plugin/plugin.json", manifest);
  write("plugin/.codex-plugin/plugin.json", manifest);
  const entry = {
    name: "pstack", source: { source: "local", path: "./plugin" },
    policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }, category: "Developer Tools",
  };
  const catalog = (plugin) => write(".agents/plugins/marketplace.json", { name: "fixture", plugins: [plugin] });
  catalog(entry);
  const run = () => spawnSync(process.execPath, [join(root, "scripts/validate-plugins.mjs")], { encoding: "utf8" });
  return { write, catalog, entry, run };
}

test("validates Codex entries and rejects compatibility manifest version drift", (t) => {
  const f = fixture(t);
  const valid = f.run();
  assert.equal(valid.status, 0, valid.stderr);
  f.write("plugin/.codex-plugin/plugin.json", { name: "pstack", version: "0.9.0" });
  const drifted = f.run();
  assert.equal(drifted.status, 1);
  assert.match(drifted.stderr, /manifest versions differ/);
});

test("rejects Codex source escapes, missing portable manifests, mismatched names and invalid policies", (t) => {
  const f = fixture(t);
  f.write("codex-only/.codex-plugin/plugin.json", { name: "pstack", version: "1.0.0" });
  for (const [entry, error] of [
    [{ ...f.entry, source: { source: "local", path: "./codex-only" } }, /missing portable plugin.json/],
    [{ ...f.entry, source: { source: "local", path: "./../outside" } }, /source leaves the repository/],
    [{ ...f.entry, source: { source: "local", path: 3 } }, /source must be a/],
    [{ ...f.entry, name: "different" }, /name differs from plugin.json/],
    [{ ...f.entry, policy: { installation: "unknown", authentication: "ON_INSTALL" } }, /policy or category/],
  ]) {
    f.catalog(entry);
    const result = f.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, error);
  }
});
