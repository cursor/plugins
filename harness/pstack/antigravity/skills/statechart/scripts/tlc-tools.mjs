import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

// TLC's v1.8.0 is a rolling pre-release whose jar is re-uploaded, so pin the newest immutable
// release. The scripts read 1.7.4's output, which has no trace spec.
export const TLC_TOOL =
  "github:tlaplus/tlaplus[asset_pattern=tla2tools.jar,checksum=sha256:936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88]@1.7.4";
export const JAVA_TOOL = "java@temurin-25";

const SET_TLC_VARS =
  "set TLA2TOOLS to the path of tla2tools.jar, and JAVA to a java binary (Java 11 or later).";
const indent = (text) => text.replace(/^/gm, "  ");

export function findTlc() {
  const { TLA2TOOLS, JAVA } = process.env;
  for (const [name, file] of Object.entries({ JAVA, TLA2TOOLS }))
    if (file && !fs.existsSync(file)) throw new Error(`${name} is ${file}, which does not exist.`);
  if (TLA2TOOLS) return { jar: TLA2TOOLS, java: JAVA || "java" };
  const command = (tools) =>
    `cd "$(mktemp -d)" && MISE_CEILING_PATHS="$PWD" mise install ${tools.map((t) => `'${t}'`).join(" ")}`;
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "statechart-mise-"));
  const env = { ...process.env, MISE_CEILING_PATHS: empty };
  const run = (...args) => spawnSync("mise", args, { cwd: empty, env, encoding: "utf8" });
  const mise = (...args) => {
    const r = run(...args);
    if (r.error)
      throw new Error(
        `Cannot find TLC. It installs with mise, which cannot start: ${r.error.message}. Install mise (https://mise.jdx.dev), or ${SET_TLC_VARS}`,
      );
    if (r.status === 0) return r.stdout.trim();
    const said = (r.stderr ?? "").trim();
    if (!said || /not installed|mise bin/.test(said)) return "";
    throw new Error(
      `Cannot find TLC, because mise failed:\n${indent(said)}\nThe install command: ${command(JAVA ? [TLC_TOOL] : [JAVA_TOOL, TLC_TOOL])}\nFix that, or ${SET_TLC_VARS}`,
    );
  };
  const resolve = () => {
    const home = mise("where", TLC_TOOL);
    const jar = home && path.join(home, "tla2tools.jar");
    const java = JAVA || mise("which", "java", "--tool", JAVA_TOOL);
    return { jar: jar && fs.existsSync(jar) ? jar : "", java };
  };
  try {
    const found = resolve();
    if (found.jar && found.java) return found;
    const tools = [!found.java && JAVA_TOOL, !found.jar && TLC_TOOL].filter(Boolean);
    const names = [!found.jar && "TLC", !found.java && "Java"].filter(Boolean);
    console.error(`Installing ${names.join(" and ")} with mise. This happens once.`);
    const r = run("install", "--quiet", ...tools);
    const installed = resolve();
    if (installed.jar && installed.java) return installed;
    const said =
      `${r.stderr ?? ""}${r.stdout ?? ""}`.trim() ||
      `mise install exited ${r.status}, with no output`;
    throw new Error(
      `Cannot find TLC, and mise could not install it:\n${indent(said)}\nThe install command: ${command(tools)}\nOr ${SET_TLC_VARS}`,
    );
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
  }
}

export function cannotRunTlc({ java, jar }, r) {
  const said = `java exited ${r.status ?? r.signal}:\n${indent(`${r.stderr}${r.stdout}`.trim())}`;
  return `cannot run TLC with ${java} -cp ${jar}: ${r.error?.message ?? said}\nFix that, or ${SET_TLC_VARS}`;
}
