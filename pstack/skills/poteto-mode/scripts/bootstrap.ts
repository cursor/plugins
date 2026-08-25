import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const scriptsDirectory = import.meta.dir;
const nodeModulesDirectory = join(scriptsDirectory, "node_modules");
const commanderPackagePath = join(
  nodeModulesDirectory,
  "commander",
  "package.json"
);
const installKeyPath = join(
  nodeModulesDirectory,
  ".poteto-mode-tools-install-key"
);

type BootstrapState =
  | { status: "dependencies_ready" }
  | { status: "install_required" }
  | { status: "unsupported_runtime"; remediation: string };

function currentInstallKey(): string {
  return createHash("sha256")
    .update(readFileSync(join(scriptsDirectory, "package.json")))
    .update("\0")
    .update(readFileSync(join(scriptsDirectory, "bun.lockb")))
    .digest("hex");
}

function runtimeIsSupported(): boolean {
  const [major = 0, minor = 0, patch = 0] = Bun.version
    .split(".")
    .map(Number);
  return major > 1 || (major === 1 && (minor > 0 || patch >= 7));
}

function bootstrapState(installKey: string): BootstrapState {
  if (!runtimeIsSupported()) {
    return {
      status: "unsupported_runtime",
      remediation: "Upgrade Bun to version 1.0.7 or newer.",
    };
  }
  if (
    existsSync(commanderPackagePath) &&
    existsSync(installKeyPath) &&
    readFileSync(installKeyPath, "utf8").trim() === installKey
  ) {
    return { status: "dependencies_ready" };
  }
  return { status: "install_required" };
}

export function ensureDependenciesInstalled(): void {
  const installKey = currentInstallKey();
  const state = bootstrapState(installKey);
  if (state.status === "dependencies_ready") {
    return;
  }
  if (state.status === "unsupported_runtime") {
    throw new Error(`Unsupported Bun ${Bun.version}. ${state.remediation}`);
  }

  const result = Bun.spawnSync(
    [process.execPath, "install", "--frozen-lockfile"],
    { cwd: scriptsDirectory }
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

  const restarted = Bun.spawnSync([process.execPath, ...process.argv.slice(1)], {
    cwd: process.cwd(),
    env: process.env,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exit(restarted.exitCode ?? 1);
}
