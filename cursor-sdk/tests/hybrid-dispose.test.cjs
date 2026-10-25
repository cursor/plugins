const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stripTypeScriptTypes } = require("node:module");
const test = require("node:test");
const vm = require("node:vm");

const docPath = path.join(
  __dirname,
  "../skills/cursor-sdk/references/runtime-choice.md",
);

function finallyBody() {
  const doc = fs.readFileSync(docPath, "utf8");
  const start = doc.indexOf("## Hybrid: running a local and a cloud agent");
  const match = doc.slice(start).match(/```typescript\n([\s\S]*?)\n```/);
  assert.ok(match, "missing hybrid snippet");
  const marker = "finally {";
  const at = match[1].indexOf(marker);
  assert.notEqual(at, -1);
  const inner = match[1].slice(at + marker.length).replace(/\n\}\s*$/, "");
  return stripTypeScriptTypes(inner);
}

function runDisposal(localAgent, cloudAgent) {
  const context = vm.createContext({ localAgent, cloudAgent, Promise, Symbol });
  return vm.runInContext(`(async () => { ${finallyBody()} })()`, context);
}

test("a failed local dispose still disposes the cloud agent", async () => {
  const disposed = [];
  const localAgent = {
    async [Symbol.asyncDispose]() {
      disposed.push("local");
      throw new Error("local dispose failed");
    },
  };
  const cloudAgent = {
    async [Symbol.asyncDispose]() {
      disposed.push("cloud");
    },
  };
  await assert.rejects(runDisposal(localAgent, cloudAgent), /local dispose failed/);
  assert.deepEqual(disposed, ["local", "cloud"]);
});

test("both agents dispose when neither disposal fails", async () => {
  const disposed = [];
  const agent = (name) => ({
    async [Symbol.asyncDispose]() {
      disposed.push(name);
    },
  });
  await runDisposal(agent("local"), agent("cloud"));
  assert.deepEqual(disposed, ["local", "cloud"]);
});
