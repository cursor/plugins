const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stripTypeScriptTypes } = require("node:module");
const test = require("node:test");
const vm = require("node:vm");

const docPath = path.join(
  __dirname,
  "../skills/cursor-sdk/references/streaming.md",
);

function observingSnippet() {
  const doc = fs.readFileSync(docPath, "utf8");
  const start = doc.indexOf("## Observing a Run You Didn't Launch");
  const end = doc.indexOf("## Backpressure", start);
  const match = doc.slice(start, end).match(/```typescript\n([\s\S]*?)\n```/);
  assert.ok(match, "missing observing snippet");
  return stripTypeScriptTypes(match[1]);
}

// Cloud getRun validates both ids before the HTTP call.
function assertCloudIds(runId, agentId) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!agentId.startsWith("bc-") || !uuid.test(agentId.slice(3))) {
    throw Object.assign(new Error("Agent ID must be in the format 'bc-<uuid>'"), {
      name: "ConfigurationError",
    });
  }
  if (!runId.startsWith("run-") || !uuid.test(runId.slice(4))) {
    throw Object.assign(new Error("Run ID must be in the format 'run-<uuid>'"), {
      name: "ConfigurationError",
    });
  }
}

test("observing a cloud run uses an agent id getRun will send", async () => {
  const calls = [];
  const context = vm.createContext({
    runId: "run-00000000-0000-4000-8000-000000000002",
    apiKey: "cursor_test",
    Agent: {
      async getRun(id, options) {
        assertCloudIds(id, options.agentId);
        calls.push(options.agentId);
        return {
          supports() {
            return true;
          },
          async *stream() {},
          async wait() {
            return { status: "finished" };
          },
        };
      },
    },
  });
  const result = await vm.runInContext(
    `(async () => { ${observingSnippet()} return result; })()`,
    context,
  );
  assert.equal(result.status, "finished");
  assert.equal(calls.length, 1);
  assert.match(calls[0], /^bc-[0-9a-f-]{36}$/i);
});
