const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '../skills/cursor-sdk');
const files = ['SKILL.md', ...fs.readdirSync(path.join(root, 'references')).filter((f) => f.endsWith('.md')).map((f) => `references/${f}`)];
for (const file of files) {
  const markdown = fs.readFileSync(path.join(root, file), 'utf8');
  let index = 0;
  for (const block of markdown.matchAll(/```typescript\n([\s\S]*?)\n```/g)) {
    for (const declaration of block[1].matchAll(/(?:const|await using)\s+(\w+)\s*=[\s\S]*?;(?=[ \t]*(?:\/\/[^\n]*)?$)/gm)) {
      if (!/Agent\.(?:create|resume)\(/.test(declaration[0])) continue;
      const name = declaration[1], source = declaration[0];
      for (const resume of /\?\s*Agent\.resume/.test(source) || /\?\s*await Agent\.resume/.test(source) ? [false, true] : [false]) {
        test(`${file} declaration ${++index}: resolved agent handle (${resume ? 'resume' : 'create'})`, async () => {
          let disposed = 0, sends = 0;
          const handle = { agentId: 'offline-agent', async send() { sends++; return { id: 'offline-run' }; },
            async [Symbol.asyncDispose]() { disposed++; } };
          // SDK 1.0.12 public declarations: create/resume return Promise<SDKAgent>.
          const context = vm.createContext({
            Agent: { async create() { return handle; }, async resume() { return handle; } },
            process: { env: {}, cwd: () => '/offline' },
            previousAgentId: 'offline-agent', agentId: resume ? 'offline-agent' : undefined,
            existing: resume ? 'offline-agent' : undefined, state: { agentId: resume ? 'offline-agent' : undefined },
            apiKey: 'offline', userKey: 'offline', botKey: 'offline', CURSOR_API_KEY: 'offline',
            REPO_URL: 'https://example.com/offline', HEAD_REF: 'main', GITHUB_TOKEN: undefined,
            repoUrl: 'https://example.com/offline', mcpServers: {}, baseMcp: {}, sameInlineMcpYouUsedBefore: {}, options: {},
          });
          const js = stripTypeScriptTypes(`${source}\nassertHandle(${name}); await ${name}.send('offline');`);
          context.assertHandle = (agent) => assert.equal(agent.agentId, 'offline-agent');
          await vm.runInContext(`(async () => { ${js} })()`, context);
          assert.equal(sends, 1);
          assert.equal(disposed, source.startsWith('await using') ? 1 : 0);
        });
      }
    }
  }
}
