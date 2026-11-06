const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// @modelcontextprotocol/server-github authenticates only from this variable.
const SERVER_TOKEN_VARIABLE = 'GITHUB_PERSONAL_ACCESS_TOKEN';

function githubServerEnvs(file) {
  const markdown = fs.readFileSync(
    path.join(__dirname, '../skills/cursor-sdk/references', file),
    'utf8',
  );
  const pattern = /args: \["-y", "@modelcontextprotocol\/server-github"\],\s*\n\s*env: (\{.*\}),?\n/g;
  return [...markdown.matchAll(pattern)].map((match) => match[1].replace(/!/g, ''));
}

function evaluate(env) {
  const token = 'ghp_example';
  return vm.runInNewContext(`(${env})`, {
    GITHUB_TOKEN: token,
    process: { env: { GITHUB_TOKEN: token } },
  });
}

for (const [file, count] of [['mcp.md', 2], ['patterns.md', 1]]) {
  test(`${file} passes the token under the name server-github reads`, () => {
    const envs = githubServerEnvs(file);
    assert.equal(envs.length, count);
    for (const env of envs) {
      assert.equal(evaluate(env)[SERVER_TOKEN_VARIABLE], 'ghp_example', env);
    }
  });
}
