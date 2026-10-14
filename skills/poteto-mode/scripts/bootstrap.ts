import { createHash } from "node:crypto";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const scriptsDirectory = import.meta.dir;
// Include executable sources as well as the manifests: each cache is an immutable
// tool version whose imports resolve beside its own installed node_modules.
function currentInstallKey(): string {
  const hash = createHash("sha256");
  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === "node_modules" || entry.name === ".pstack") continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) hash.update(relative(scriptsDirectory, path)).update("\0").update(readFileSync(path)).update("\0");
    }
  }
  visit(scriptsDirectory);
  return hash.digest("hex");
}

export function ensureDependenciesInstalled(): void {
  const installKey = currentInstallKey();
  const toolsDirectory = resolve(process.cwd(), ".pstack", "tools", installKey);
  const nodeModulesDirectory = join(toolsDirectory, "node_modules");
  const commanderPackagePath = join(nodeModulesDirectory, "commander", "package.json");
  const installKeyPath = join(nodeModulesDirectory, ".poteto-mode-tools-install-key");
  const installed = (
    existsSync(commanderPackagePath) &&
    existsSync(installKeyPath) &&
    readFileSync(installKeyPath, "utf8").trim() === installKey
  );
  if (installed && scriptsDirectory === toolsDirectory) return;

  if (!installed) {
    const toolsRoot = resolve(process.cwd(), ".pstack", "tools");
    mkdirSync(toolsRoot, { recursive: true });
    const stagingDirectory = mkdtempSync(join(toolsRoot, `.${installKey}-`));
    try {
      cpSync(scriptsDirectory, stagingDirectory, {
        recursive: true,
        filter: (path) => !["node_modules", ".pstack"].includes(path.split("/").at(-1) ?? ""),
      });
      // A read-only installed skill may have read-only directories. Its private
      // copy must permit installation and cleanup without changing the source.
      function writableDirectories(directory: string): void {
        chmodSync(directory, 0o755);
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          if (entry.isDirectory()) writableDirectories(join(directory, entry.name));
        }
      }
      writableDirectories(stagingDirectory);
      const result = Bun.spawnSync(
        [process.execPath, "install", "--frozen-lockfile"],
        { cwd: stagingDirectory }
      );
      if (result.exitCode !== 0) {
        process.stdout.write(result.stdout);
        process.stderr.write(result.stderr);
        throw new Error(`bun install --frozen-lockfile exited with status ${result.exitCode}`);
      }
      const stagedNodeModules = join(stagingDirectory, "node_modules");
      if (!existsSync(join(stagedNodeModules, "commander", "package.json"))) {
        throw new Error("bun install --frozen-lockfile completed without installing commander");
      }
      writeFileSync(join(stagedNodeModules, ".poteto-mode-tools-install-key"), `${installKey}\n`);
      try {
        // Publish only complete installations. Concurrent callers install into
        // separate staging directories; the first atomic rename wins.
        renameSync(stagingDirectory, toolsDirectory);
      } catch (error) {
        if (!existsSync(commanderPackagePath) || !existsSync(installKeyPath) ||
            readFileSync(installKeyPath, "utf8").trim() !== installKey) throw error;
      }
    } finally {
      rmSync(stagingDirectory, { recursive: true, force: true });
    }
  }

  const entry = resolve(process.argv[1]);
  const entryRelative = relative(scriptsDirectory, entry);
  if (entryRelative.startsWith("..") || entryRelative === "") {
    throw new Error("Tool entry must be inside the poteto-mode scripts directory");
  }
  const restarted = Bun.spawnSync([process.execPath, join(toolsDirectory, entryRelative), ...process.argv.slice(2)], {
    cwd: process.cwd(),
    env: process.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exit(restarted.exitCode ?? 1);
}
