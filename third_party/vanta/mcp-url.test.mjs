import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

test("the Vanta server URL host is a required setup value", () => {
  const plugin = JSON.parse(
    readFileSync(join(root, ".cursor-plugin/plugin.json"), "utf8")
  );
  const mcp = JSON.parse(readFileSync(join(root, "mcp.json"), "utf8"));
  const url = mcp.mcpServers.vanta.url;
  const required = new Set(plugin.variables.required ?? []);
  const used = [...url.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map(
    (match) => match[1]
  );

  assert.deepEqual(used, ["VANTA_MCP_HOST"]);
  assert.equal(url, "https://${VANTA_MCP_HOST}/mcp");
  for (const name of used) {
    assert.ok(
      required.has(name),
      `${name} is interpolated into the server URL but is not required, so an install can save a URL Cursor cannot resolve`
    );
  }
  assert.deepEqual(plugin.variables.properties.VANTA_MCP_HOST.enum, [
    "mcp.vanta.com",
    "mcp.eu.vanta.com",
    "mcp.aus.vanta.com",
  ]);
});
