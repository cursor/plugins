import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const AGENTS = join(ROOT, "harness/pstack/claude-code/agents");
// Claude Code agent frontmatter takes an alias, `inherit`, or a model ID, and sets no effort.
const ACCEPTED = /^(opus|sonnet|haiku|fable|inherit|claude-[a-z]+-\d+(?:-\d+)*)$/;

function model(path) {
  return readFileSync(path, "utf8").match(/^model:\s*(\S+)$/m)?.[1];
}

test("the Claude Code tree names only models Claude Code accepts", () => {
  for (const name of readdirSync(AGENTS)) {
    const value = model(join(AGENTS, name));
    if (value !== undefined) assert.match(value, ACCEPTED, `harness/pstack/claude-code/agents/${name}`);
  }
});

test("poteto-agent runs on the Opus alias in Claude Code and keeps its Cursor slug in pstack", () => {
  assert.equal(model(join(AGENTS, "poteto-agent.md")), "opus");
  assert.equal(model(join(ROOT, "pstack/agents/poteto-agent.md")), "claude-opus-5-5-xhigh-fast");
});
