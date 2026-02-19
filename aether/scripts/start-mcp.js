#!/usr/bin/env node

/**
 * Aether MCP launcher — OS-agnostic.
 * Locates the bridge at ~/.aether/bin. If missing, auto-downloads via npx aether-init --bridge-only.
 * Then spawns the bridge with --stdio.
 */

const { spawn, execSync } = require("child_process");
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

function getBinaryName(plat) {
  return `aether-bridge-${plat.os}-${plat.arch}${plat.ext}`;
}

const binDir = join(homedir(), ".aether", "bin");
const plat = detectPlatform();
const binaryName = getBinaryName(plat);
const bridgePath = join(binDir, binaryName);

if (!existsSync(bridgePath)) {
  try {
    execSync("npx aether-init@latest --bridge-only", {
      stdio: "ignore",
      env: { ...process.env, npm_config_yes: "true" },
    });
  } catch (e) {
    console.error(
      "[Aether] Bridge not found and auto-download failed. Run manually from your Unity project root:\n  npx aether-init\nThen reload Cursor (Ctrl+Shift+P → Reload Window)."
    );
    process.exit(1);
  }
  if (!existsSync(bridgePath)) {
    console.error("[Aether] Bridge download completed but binary not found. Try: npx aether-init");
    process.exit(1);
  }
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
