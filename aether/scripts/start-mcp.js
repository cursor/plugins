#!/usr/bin/env node

/**
 * Aether MCP launcher — OS-agnostic.
 * Locates the bridge at ~/.aether/bin (from npx aether-init) and spawns it with --stdio.
 * If the bridge is missing, exits with a clear message.
 */

const { spawn } = require("child_process");
const { existsSync } = require("fs");
const { homedir, platform, arch } = require("os");
const { join } = require("path");

function detectPlatform() {
  const os = platform();
  const cpu = arch();
  if (os === "win32") return { os: "windows", arch: "x64", ext: ".exe" };
  if (os === "darwin") return { os: "darwin", arch: cpu === "arm64" ? "arm64" : "x64", ext: "" };
  if (os === "linux") return { os: "linux", arch: "x64", ext: "" };
  throw new Error(`Unsupported platform: ${os}/${cpu}`);
}

// Binary names must match those produced by npx aether-init (~/.aether/bin/).
function getBinaryName(plat) {
  return `aether-bridge-${plat.os}-${plat.arch}${plat.ext}`;
}

const binDir = join(homedir(), ".aether", "bin");
const plat = detectPlatform();
const binaryName = getBinaryName(plat);
const bridgePath = join(binDir, binaryName);

if (!existsSync(bridgePath)) {
  console.error(
    "[Aether] Bridge not found. Run from your Unity project root:\n  npx aether-init\nThen reload Cursor (Ctrl+Shift+P → Reload Window)."
  );
  process.exit(1);
}

const child = spawn(bridgePath, ["--stdio"], {
  stdio: ["pipe", "pipe", "inherit"],
});

process.stdin.pipe(child.stdin);
child.stdout.pipe(process.stdout);

child.on("error", (err) => {
  console.error("[Aether] Failed to start bridge:", err.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (code !== null) process.exit(code);
  process.exit(signal === "SIGTERM" ? 143 : 1);
});
