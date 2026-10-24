import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schema = { type: "object", properties: { TOKEN: { type: "string" } } };
const config = (value) => ({ mcpServers: { example: { url: "https://example.com/mcp", headers: { Authorization: value } } } });

function validate(t, { plugin = {}, entry = {}, files = {} } = {}) {
  const dir = mkdtempSync(resolve(tmpdir(), "plugin-validation-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(resolve(dir, "scripts"));
  cpSync(resolve(root, "scripts/validate-plugins.mjs"), resolve(dir, "scripts/validate-plugins.mjs"));
  cpSync(resolve(root, "schemas"), resolve(dir, "schemas"), { recursive: true });
  symlinkSync(resolve(root, "node_modules"), resolve(dir, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  const contents = {
    ".cursor-plugin/marketplace.json": { name: "test", owner: { name: "Test" }, plugins: [{ name: "example", source: "example", ...entry }] },
    "example/.cursor-plugin/plugin.json": { name: "example", ...plugin },
    ...Object.fromEntries(Object.entries(files).map(([path, content]) => [`example/${path}`, content])),
  };
  for (const [path, content] of Object.entries(contents)) {
    mkdirSync(dirname(resolve(dir, path)), { recursive: true });
    writeFileSync(resolve(dir, path), typeof content === "string" ? content : JSON.stringify(content));
  }
  return spawnSync(process.execPath, [resolve(dir, "scripts/validate-plugins.mjs")], { encoding: "utf8" });
}

for (const [name, plugin, files] of [
  ["default discovery", {}, { "mcp.json": config("Bearer ${TYPO}") }],
  ["explicit path", { mcpServers: "configs/server.json" }, { "configs/server.json": config("${TYPO}") }],
  ["inline config", { mcpServers: config("${TYPO}") }, {}],
  ["mixed array", { mcpServers: [config("${TOKEN}"), "other.json"], variables: schema }, { "other.json": config("${TYPO}") }],
  ["no declared schema", { mcpServers: config("${TOKEN}") }, {}],
  ["inherited Object property", { mcpServers: config("${toString}"), variables: schema }, {}],
]) {
  test(`rejects undeclared variables in ${name}`, (t) => {
    const result = validate(t, { plugin, files });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /references undeclared variable/);
    assert.match(result.stderr, /variables.properties/);
  });
}

test("declared variables, defaults and runtime interpolation remain valid", (t) => {
  const result = validate(t, { plugin: { variables: schema, mcpServers: {
    mcpServers: { example: { command: "${CURSOR_PLUGIN_ROOT}/bin/server", cwd: "${CLAUDE_PLUGIN_ROOT}", args: ["${workspaceFolder}", "${workspaceFolderBasename}", "${userHome}", "${pathSeparator}", "${/}"], env: { TOKEN: "${TOKEN}", OTHER: "${env:OTHER}", OPTIONAL: "${CLIENT_SECRET:-}" } } },
  } } });
  assert.equal(result.status, 0, result.stderr);
});

test("declared variables work in discovered files and mixed arrays", (t) => {
  for (const mcpServers of [undefined, [config("${TOKEN}"), "mcp.json"]]) {
    const result = validate(t, { plugin: { variables: schema, ...(mcpServers === undefined ? {} : { mcpServers }) }, files: { "mcp.json": config("${TOKEN}") } });
    assert.equal(result.status, 0, result.stderr);
  }
});

test("explicit MCP configuration replaces default discovery", (t) => {
  const result = validate(t, { plugin: { mcpServers: config("literal") }, files: { "mcp.json": config("${TYPO}") } });
  assert.equal(result.status, 0, result.stderr);
});

for (const [name, files] of [["missing", {}], ["invalid JSON", { "custom.json": "{broken" }]]) {
  test(`reports ${name} MCP files with plugin context`, (t) => {
    const result = validate(t, { plugin: { mcpServers: "custom.json" }, files });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /Plugin "example": cannot read MCP config "custom.json"/);
  });
}

test("plugins without MCP configuration remain valid", (t) => {
  assert.equal(validate(t).status, 0);
});
