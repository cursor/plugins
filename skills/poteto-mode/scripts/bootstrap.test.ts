import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function snapshot(root: string): string {
  const hash = createHash("sha256");
  for (const name of readdirSync(root).sort()) {
    const path = join(root, name);
    hash.update(name);
    hash.update(statSync(path).isDirectory() ? snapshot(path) : readFileSync(path));
  }
  return hash.digest("hex");
}

function permissions(root: string, writable: boolean): void {
  chmodSync(root, writable ? 0o755 : 0o555);
  for (const name of readdirSync(root)) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) permissions(path, writable);
    else chmodSync(path, writable ? 0o644 : 0o444);
  }
}

test("project cache preserves read-only installed tools across repeat, update and source removal", () => {
  const root = mkdtempSync(join(tmpdir(), "pstack-tools-"));
  const installed = join(root, "installed");
  const project = join(root, "project");
  cpSync(import.meta.dir, installed, { recursive: true, filter: path => !["node_modules", ".pstack"].includes(path.split("/").at(-1) ?? "") });
  // Keep the project independent of both the installed skill and its repository.
  mkdirSync(project);
  function run(entry: string): void {
    const result = Bun.spawnSync([process.execPath, entry, "--help"], { cwd: project });
    expect(result.stderr.toString()).not.toContain("Cannot find");
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("Usage:");
  }
  try {
    permissions(installed, false);
    const before = snapshot(installed);
    run(join(installed, "orch/orch.ts"));
    run(join(installed, "watch-pr/watch-pr"));
    const tools = join(project, ".pstack/tools");
    const [first] = readdirSync(tools);
    const marker = join(tools, first, "node_modules/.poteto-mode-tools-install-key");
    const firstInstall = statSync(marker).mtimeMs;
    run(join(installed, "orch/orch.ts"));
    expect(statSync(marker).mtimeMs).toBe(firstInstall);
    expect(snapshot(installed)).toBe(before);
    expect(readFileSync(join(tools, first, "bun.lock"))).toEqual(readFileSync(join(installed, "bun.lock")));

    permissions(installed, true);
    writeFileSync(join(installed, "bun.lock"), readFileSync(join(installed, "bun.lock"), "utf8") + "\n");
    permissions(installed, false);
    run(join(installed, "orch/orch.ts"));
    expect(readdirSync(tools)).toHaveLength(2);
    permissions(installed, true);
    renameSync(installed, join(root, "removed-source"));
    run(join(tools, first, "orch/orch.ts"));
    run(join(tools, first, "watch-pr/watch-pr"));
    permissions(join(root, "removed-source"), true);
  } finally {
    permissions(root, true);
    rmSync(root, { recursive: true, force: true });
  }
}, 120000);

test("parallel cold starts publish one complete cache and failed installs can retry", async () => {
  const root = mkdtempSync(join(tmpdir(), "pstack-tools-concurrent-"));
  const installed = join(root, "installed");
  const project = join(root, "project");
  cpSync(import.meta.dir, installed, { recursive: true, filter: path => !["node_modules", ".pstack"].includes(path.split("/").at(-1) ?? "") });
  mkdirSync(project);
  const entry = join(installed, "orch/orch.ts");
  try {
    const manifestPath = join(installed, "package.json");
    const manifest = readFileSync(manifestPath, "utf8");
    writeFileSync(manifestPath, manifest.replace('"commander": "14.0.0"', '"commander": "13.0.0"'));
    const failed = Bun.spawnSync([process.execPath, entry, "--help"], { cwd: project });
    expect(failed.exitCode).not.toBe(0);
    expect(failed.stderr.toString()).toContain("frozen-lockfile");
    const tools = join(project, ".pstack/tools");
    expect(readdirSync(tools)).toHaveLength(0);
    writeFileSync(manifestPath, manifest);
    permissions(installed, false);
    const before = snapshot(installed);
    const children = [
      Bun.spawn([process.execPath, entry, "--help"], { cwd: project, stdout: "pipe", stderr: "pipe" }),
      Bun.spawn([process.execPath, join(installed, "watch-pr/watch-pr"), "--help"], { cwd: project, stdout: "pipe", stderr: "pipe" }),
    ];
    const results = await Promise.all(children.map(async child => ({
      code: await child.exited,
      stdout: await new Response(child.stdout).text(),
      stderr: await new Response(child.stderr).text(),
    })));
    for (const result of results) {
      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Usage:");
      expect(result.stderr).not.toContain("Cannot find");
    }
    expect(snapshot(installed)).toBe(before);
    expect(readdirSync(tools)).toHaveLength(1);
    const [key] = readdirSync(tools);
    expect(readFileSync(join(tools, key, "node_modules/.poteto-mode-tools-install-key"), "utf8").trim()).toBe(key);
  } finally {
    permissions(root, true);
    rmSync(root, { recursive: true, force: true });
  }
}, 120000);
