import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isWorkspaceExcluded } from "./workspace-exclusions";

const fixtures: string[] = [];
afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "continual-learning-"));
  fixtures.push(root);
  const workspace = join(root, "private");
  mkdirSync(workspace);
  return { root, workspace, config: join(root, "config.json") };
}

test("missing config and empty exclusions preserve existing behavior", () => {
  const { workspace, config } = fixture();
  expect(isWorkspaceExcluded(workspace, config)).toBe(false);
  writeFileSync(config, JSON.stringify({ excludedPaths: [] }));
  expect(isWorkspaceExcluded(workspace, config)).toBe(false);
});

test("exclusions match a directory and descendants, not sibling prefixes", () => {
  const { root, workspace, config } = fixture();
  const child = join(workspace, "repo");
  const sibling = join(root, "private-public");
  mkdirSync(child);
  mkdirSync(sibling);
  writeFileSync(config, JSON.stringify({ excludedPaths: [workspace] }));
  expect(isWorkspaceExcluded(workspace, config)).toBe(true);
  expect(isWorkspaceExcluded(child, config)).toBe(true);
  expect(isWorkspaceExcluded(sibling, config)).toBe(false);
});

test("symlink aliases of a workspace remain excluded", () => {
  const { root, workspace, config } = fixture();
  const alias = join(root, "alias");
  symlinkSync(workspace, alias, "dir");
  writeFileSync(config, JSON.stringify({ excludedPaths: [workspace] }));
  expect(isWorkspaceExcluded(alias, config)).toBe(true);
  writeFileSync(config, JSON.stringify({ excludedPaths: [alias] }));
  expect(isWorkspaceExcluded(workspace, config)).toBe(true);
});

test.each(["{", "null", "[]", '{"excludedPaths":null}', '{"excludedPaths":"/private"}', '{"excludedPaths":["relative"]}'])(
  "invalid config cannot silently allow learning: %s", (text) => {
    const { workspace, config } = fixture();
    writeFileSync(config, text);
    expect(() => isWorkspaceExcluded(workspace, config)).toThrow();
  }
);

test("the stop hook skips excluded workspaces before writing state", () => {
  const { root, workspace, config } = fixture();
  writeFileSync(config, JSON.stringify({ excludedPaths: [workspace] }));
  const transcript = join(root, "transcript.txt");
  writeFileSync(transcript, "synthetic transcript");
  const result = Bun.spawnSync({
    cmd: [process.execPath, join(import.meta.dir, "continual-learning-stop.ts")],
    cwd: workspace,
    env: { ...process.env, CONTINUAL_LEARNING_CONFIG: config, CONTINUAL_LEARNING_MIN_TURNS: "1" },
    stdin: Buffer.from(JSON.stringify({ conversation_id: "test", status: "completed", loop_count: 0, transcript_path: transcript })),
  });
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout.toString())).toEqual({});
  expect(existsSync(join(workspace, ".cursor"))).toBe(false);
});

test("an allowed workspace still triggers learning and saves cadence state", () => {
  const { root, workspace, config } = fixture();
  writeFileSync(config, JSON.stringify({ excludedPaths: [] }));
  const transcript = join(root, "transcript.txt");
  writeFileSync(transcript, "synthetic transcript");
  const result = Bun.spawnSync({
    cmd: [process.execPath, join(import.meta.dir, "continual-learning-stop.ts")],
    cwd: workspace,
    env: { ...process.env, CONTINUAL_LEARNING_CONFIG: config, CONTINUAL_LEARNING_MIN_TURNS: "1", CONTINUAL_LEARNING_TRIAL_MODE: "false" },
    stdin: Buffer.from(JSON.stringify({ conversation_id: "test", status: "completed", loop_count: 0, transcript_path: transcript })),
  });
  expect(result.exitCode).toBe(0);
  expect(result.stderr.toString()).toBe("");
  expect(JSON.parse(result.stdout.toString()).followup_message).toContain("continual-learning");
  expect(existsSync(join(workspace, ".cursor/hooks/state/continual-learning.json"))).toBe(true);
});

test("an invalid config prevents hook writes and reports the error", () => {
  const { workspace, config } = fixture();
  writeFileSync(config, "{");
  const result = Bun.spawnSync({
    cmd: [process.execPath, join(import.meta.dir, "continual-learning-stop.ts")],
    cwd: workspace,
    env: { ...process.env, CONTINUAL_LEARNING_CONFIG: config },
    stdin: Buffer.from(JSON.stringify({ conversation_id: "test", status: "completed", loop_count: 0 })),
  });
  expect(result.exitCode).toBe(0);
  expect(result.stderr.toString()).toContain("failed");
  expect(JSON.parse(result.stdout.toString())).toEqual({});
  expect(existsSync(join(workspace, ".cursor"))).toBe(false);
});
