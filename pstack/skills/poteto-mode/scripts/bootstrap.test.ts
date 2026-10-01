import { afterEach, describe, expect, it } from "bun:test";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const scriptsDirectory = import.meta.dir;
const copies: string[] = [];

function readOnlyCopy({ withCommander }: { readonly withCommander: boolean }): string {
  const root = mkdtempSync(join(tmpdir(), "poteto-mode-bootstrap-"));
  copies.push(root);
  for (const file of ["bootstrap.ts", "package.json", "bun.lock"]) {
    cpSync(join(scriptsDirectory, file), join(root, file));
  }
  writeFileSync(join(root, "entry.ts"), 'import { ensureDependenciesInstalled } from "./bootstrap.ts";\nensureDependenciesInstalled();\nconsole.log("ready");\n');
  if (withCommander) {
    mkdirSync(join(root, "node_modules", "commander"), { recursive: true });
    writeFileSync(join(root, "node_modules", "commander", "package.json"), '{"name":"commander","version":"14.0.0"}\n');
    chmodSync(join(root, "node_modules", "commander"), 0o555);
    chmodSync(join(root, "node_modules"), 0o555);
  }
  chmodSync(root, 0o555);
  return root;
}

function runEntry(root: string) {
  return Bun.spawnSync([process.execPath, "--no-install", join(root, "entry.ts")], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
}

afterEach(() => {
  for (const root of copies.splice(0)) {
    Bun.spawnSync(["chmod", "-R", "u+w", root]);
    rmSync(root, { recursive: true, force: true });
  }
});

describe("ensureDependenciesInstalled", () => {
  it("uses dependencies vendored into a read-only scripts directory", () => {
    const result = runEntry(readOnlyCopy({ withCommander: true }));

    expect(result.stdout.toString()).toBe("ready\n");
    expect(result.exitCode).toBe(0);
  });

  it("still fails when a read-only scripts directory has no dependencies", () => {
    const result = runEntry(readOnlyCopy({ withCommander: false }));

    expect(result.stdout.toString()).not.toContain("ready");
    expect(result.stderr.toString()).toContain("bun install --frozen-lockfile exited with status 1");
  });
});
