import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

const scriptsDirectory = import.meta.dir;
const packagePath = join(scriptsDirectory, "package.json");
const lockPath = join(scriptsDirectory, "bun.lock");

function currentInstallKey(): string {
  return createHash("sha256")
    .update(readFileSync(packagePath))
    .update("\0")
    .update(readFileSync(lockPath))
    .digest("hex");
}

function dataDirectory(): string {
  const configured = process.env.PSTACK_DATA_DIR ?? process.env.PLUGIN_DATA;
  if (configured !== undefined && configured.trim().length > 0) {
    return configured;
  }
  const codexHome = process.env.CODEX_HOME ?? join(homedir(), ".codex");
  return join(codexHome, "pstack");
}

export function ensureDependenciesInstalled(): void {
  const installKey = currentInstallKey();
  const runtimeDirectory = join(
    dataDirectory(),
    "runtime",
    "poteto-mode-tools",
    installKey
  );
  const nodeModulesDirectory = join(runtimeDirectory, "node_modules");
  const commanderPackagePath = join(
    nodeModulesDirectory,
    "commander",
    "package.json"
  );
  const installKeyPath = join(runtimeDirectory, ".install-key");
  const installed =
    existsSync(commanderPackagePath) &&
    existsSync(installKeyPath) &&
    readFileSync(installKeyPath, "utf8").trim() === installKey;
  const nodePathEntries = (process.env.NODE_PATH ?? "")
    .split(delimiter)
    .filter((value) => value.length > 0);
  if (installed && nodePathEntries.includes(nodeModulesDirectory)) {
    return;
  }

  if (!installed) {
    mkdirSync(runtimeDirectory, { recursive: true, mode: 0o700 });
    copyFileSync(packagePath, join(runtimeDirectory, "package.json"));
    copyFileSync(lockPath, join(runtimeDirectory, "bun.lock"));
    const result = Bun.spawnSync(
      [process.execPath, "install", "--frozen-lockfile", "--production"],
      { cwd: runtimeDirectory }
    );
    if (result.exitCode !== 0) {
      process.stdout.write(result.stdout);
      process.stderr.write(result.stderr);
      throw new Error(
        `bun install --frozen-lockfile exited with status ${result.exitCode}`
      );
    }
    if (!existsSync(commanderPackagePath)) {
      throw new Error(
        "bun install --frozen-lockfile completed without installing commander"
      );
    }

    writeFileSync(installKeyPath, `${installKey}\n`);
  }

  const restarted = Bun.spawnSync([process.execPath, ...process.argv.slice(1)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_PATH: [nodeModulesDirectory, ...nodePathEntries]
        .filter((value): value is string => value !== undefined && value.length > 0)
        .join(delimiter),
    },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exit(restarted.exitCode ?? 1);
}
