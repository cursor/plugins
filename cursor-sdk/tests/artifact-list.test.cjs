const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function snippet() {
  const markdown = fs.readFileSync(
    path.join(__dirname, '../skills/cursor-sdk/references/advanced.md'),
    'utf8',
  );
  return markdown.match(/const artifacts = await agent\.listArtifacts\(\);([\s\S]*?)\n```/)[0]
    .replace(/\n```$/, '');
}

async function run(artifacts) {
  const downloaded = [];
  const context = vm.createContext({
    agent: {
      async listArtifacts() {
        return artifacts;
      },
      async downloadArtifact(artifactPath) {
        downloaded.push(artifactPath);
        return Buffer.from('artifact');
      },
    },
    console: { log() {} },
    Buffer,
  });
  await vm.runInContext(`(async () => { ${snippet()} })()`, context);
  return downloaded;
}

test('an empty artifact list does not attempt to download an undefined path', async () => {
  assert.deepEqual(await run([]), []);
});

test('a non-empty artifact list still downloads the first artifact', async () => {
  assert.deepEqual(await run([{ path: 'report.json', sizeBytes: 10 }]), ['report.json']);
});
