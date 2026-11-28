const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Linear serves Streamable HTTP MCP here; https://mcp.linear.app/sse answers 404.
const LINEAR_STREAMABLE_HTTP_URL = 'https://mcp.linear.app/mcp';

function linearServers(file) {
  const markdown = fs.readFileSync(
    path.join(__dirname, '../skills/cursor-sdk/references', file),
    'utf8',
  );
  const pattern = /linear: (\{\n[\s\S]*?\n\s*\}),?\n/g;
  return [...markdown.matchAll(pattern)].map((match) =>
    vm.runInNewContext(`(${match[1].replace(/ as const/g, '').replace(/!/g, '')})`, {
      process: { env: { LINEAR_API_KEY: 'lin_api_example' } },
    }),
  );
}

for (const [file, count] of [['mcp.md', 2], ['patterns.md', 1], ['advanced.md', 1]]) {
  test(`${file} points the Linear HTTP server at the Streamable HTTP endpoint`, () => {
    const servers = linearServers(file);
    assert.equal(servers.length, count);
    for (const server of servers) {
      assert.equal(server.type, 'http');
      assert.equal(server.url, LINEAR_STREAMABLE_HTTP_URL);
      assert.equal(server.headers.Authorization, 'Bearer lin_api_example');
    }
  });
}
