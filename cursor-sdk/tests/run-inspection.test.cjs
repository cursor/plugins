const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stripTypeScriptTypes } = require("node:module");
const test = require("node:test");
const vm = require("node:vm");

const docPath = path.join(
  __dirname,
  "../skills/cursor-sdk/references/advanced.md",
);

function doc() {
  return fs.readFileSync(docPath, "utf8");
}

function fenced(section, nextHeading) {
  const start = doc().indexOf(section);
  const end = doc().indexOf(nextHeading, start + section.length);
  const match = doc().slice(start, end).match(/```typescript\n([\s\S]*?)\n```/);
  assert.ok(match, `missing snippet in ${section}`);
  return stripTypeScriptTypes(match[1]);
}

// CloudApiClient getCloudRun rejects anything else before the HTTP call.
function assertCloudRunId(runId) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!runId.startsWith("run-") || !uuid.test(runId.slice(4))) {
    throw Object.assign(new Error("Run ID must be in the format 'run-<uuid>'"), {
      name: "ConfigurationError",
    });
  }
}

test("an agent with no runs does not call getRun on an empty list", async () => {
  const calls = [];
  const context = vm.createContext({
    agentId: "agent-offline",
    process: { cwd: () => "/offline" },
    Agent: {
      async listRuns() {
        return { items: [] };
      },
      async getRun(id) {
        calls.push(id);
        return { id, supports() { return false; } };
      },
    },
  });
  const source = fenced("## Inspecting Runs", "### Cloud run IDs vs. agent IDs");
  await vm.runInContext(`(async () => { ${source} })()`, context);
  assert.deepEqual(calls, []);
});

test("a listed run is still fetched", async () => {
  const calls = [];
  const context = vm.createContext({
    agentId: "agent-offline",
    process: { cwd: () => "/offline" },
    Agent: {
      async listRuns() {
        return { items: [{ id: "run-offline" }] };
      },
      async getRun(id) {
        calls.push(id);
        return {
          id,
          supports() {
            return false;
          },
          async *stream() {},
        };
      },
    },
  });
  const source = fenced("## Inspecting Runs", "### Cloud run IDs vs. agent IDs");
  await vm.runInContext(`(async () => { ${source} })()`, context);
  assert.deepEqual(calls, ["run-offline"]);
});

test("the cloud run id this section tells you to pass is one getRun accepts", () => {
  const section = doc()
    .split("### Cloud run IDs vs. agent IDs")[1]
    .split("## Persisted Messages")[0];
  // The old sentence says these ids "look like regular UUIDs". getRun rejects those.
  const described = /regular UUIDs/.test(section)
    ? "6e0d261c-86a2-4383-89f0-9162c1c10662"
    : "run-00000000-0000-4000-8000-000000000002";
  assertCloudRunId(described);
  assert.match(section, /run-<uuid>/);
});
