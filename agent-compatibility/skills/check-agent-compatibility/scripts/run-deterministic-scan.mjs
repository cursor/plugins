#!/usr/bin/env node

import { execFile } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import {
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
  win32 as windowsPath,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

export const SCANNER_VERSION = "0.1.7";
export const SCANNER_SPECIFIER = `agent-compatibility@${SCANNER_VERSION}`;

const SCORE_NAME = "Deterministic Compatibility Score";
const execFileAsync = promisify(execFile);
const sourceExtensions = [
  "js",
  "cjs",
  "mjs",
  "ts",
  "cts",
  "mts",
  "py",
  "rb",
  "sh",
  "bash",
  "zsh",
  "go",
  "rs",
  "php",
  "ex",
  "exs",
];
const cliFrameworkPackages = [
  "@oclif/core",
  "cac",
  "citty",
  "clipanion",
  "commander",
  "meow",
  "sade",
  "yargs",
];

export function resolveNpxRunner({
  platform = process.platform,
  nodeExecutable = process.execPath,
  npmExecPath = process.env.npm_execpath ?? null,
  pathExists = existsSync,
} = {}) {
  if (platform !== "win32") {
    return { command: "npx", prefixArgs: [] };
  }

  const candidates = [];
  if (typeof npmExecPath === "string" && npmExecPath.trim() !== "") {
    candidates.push(
      windowsPath.join(windowsPath.dirname(npmExecPath), "npx-cli.js"),
    );
  }
  candidates.push(
    windowsPath.join(
      windowsPath.dirname(nodeExecutable),
      "node_modules",
      "npm",
      "bin",
      "npx-cli.js",
    ),
  );

  const npxCli = [...new Set(candidates)].find((candidate) => {
    try {
      return pathExists(candidate);
    } catch {
      return false;
    }
  });

  return npxCli === undefined
    ? null
    : { command: nodeExecutable, prefixArgs: [npxCli] };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function readJsonObject(path) {
  const content = readText(path);
  if (content === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(content);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function relativePath(root, path) {
  return relative(root, path).split(sep).join("/");
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function executableLookingFile(name) {
  if (!name.includes(".")) {
    return true;
  }

  const extension = name.split(".").at(-1)?.toLowerCase();
  return sourceExtensions.includes(extension);
}

function directoryEntrypoints(targetRoot, directoryName) {
  const directory = join(targetRoot, directoryName);
  if (!existsSync(directory)) {
    return [];
  }

  const found = [];
  const visit = (currentDirectory, depth) => {
    let entries;
    try {
      entries = readdirSync(currentDirectory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      const path = join(currentDirectory, entry.name);
      if (entry.isFile() && executableLookingFile(entry.name)) {
        found.push(relativePath(targetRoot, path));
      } else if (entry.isDirectory() && depth < 2) {
        visit(path, depth + 1);
      }
    }
  };

  visit(directory, 0);
  return found;
}

function existingSourceEntrypoints(targetRoot, stems) {
  const found = [];
  for (const stem of stems) {
    for (const extension of sourceExtensions) {
      const path = join(targetRoot, `${stem}.${extension}`);
      if (existsSync(path)) {
        found.push(relativePath(targetRoot, path));
      }
    }
  }
  return found;
}

function packageSignals(targetRoot) {
  const packageJson = readJsonObject(join(targetRoot, "package.json"));
  if (packageJson === null) {
    return {
      cli: [],
      cloudflareDependencies: [],
      cloudflareScripts: [],
    };
  }

  const cli = [];
  if (
    (typeof packageJson.bin === "string" && packageJson.bin.length > 0) ||
    (isRecord(packageJson.bin) && Object.keys(packageJson.bin).length > 0)
  ) {
    cli.push("package.json#bin");
  }

  const scripts = isRecord(packageJson.scripts) ? packageJson.scripts : {};
  const cloudflareScripts = [];
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== "string") {
      continue;
    }

    if (
      /^cli(?::|$)/i.test(name) ||
      /(?:^|[\s;&|])(?:node|bun|tsx|ts-node|deno\s+run)\s+(?:\.\/)?(?:src\/)?(?:cli\.[cm]?[jt]s|bin\/|cmd\/)/i.test(
        command,
      )
    ) {
      cli.push(`package.json#scripts.${name}`);
    }

    if (
      /\bwrangler(?:@[\w.-]+)?\s+(?:dev|deploy|tail|versions)\b/i.test(command)
    ) {
      cloudflareScripts.push(`package.json#scripts.${name}`);
    }
  }

  const runtimeDependencies = {
    ...(isRecord(packageJson.dependencies) ? packageJson.dependencies : {}),
    ...(isRecord(packageJson.optionalDependencies)
      ? packageJson.optionalDependencies
      : {}),
  };
  for (const framework of cliFrameworkPackages) {
    if (Object.hasOwn(runtimeDependencies, framework)) {
      cli.push(`package.json#dependencies.${framework}`);
    }
  }

  const allDependencies = {
    ...runtimeDependencies,
    ...(isRecord(packageJson.devDependencies)
      ? packageJson.devDependencies
      : {}),
  };
  const cloudflareDependencies = [
    "wrangler",
    "@cloudflare/workers-types",
    "@cloudflare/vitest-pool-workers",
  ]
    .filter((dependency) => Object.hasOwn(allDependencies, dependency))
    .map((dependency) => `package.json#dependencies.${dependency}`);

  return {
    cli,
    cloudflareDependencies,
    cloudflareScripts,
  };
}

function nonNodeCliSignals(targetRoot) {
  const signals = [];
  const pyproject = readText(join(targetRoot, "pyproject.toml"));
  if (
    pyproject !== null &&
    /^\[(?:project\.scripts|tool\.poetry\.scripts)\]\s*$/m.test(pyproject)
  ) {
    signals.push("pyproject.toml#scripts");
  }

  const setupPy = readText(join(targetRoot, "setup.py"));
  if (setupPy !== null && /console_scripts\s*[=:]/.test(setupPy)) {
    signals.push("setup.py#console_scripts");
  }

  const cargoToml = readText(join(targetRoot, "Cargo.toml"));
  if (cargoToml !== null && /^\[\[bin\]\]\s*$/m.test(cargoToml)) {
    signals.push("Cargo.toml#[[bin]]");
  }

  return signals;
}

function cliFrameworkImportSignals(targetRoot) {
  const candidates = existingSourceEntrypoints(targetRoot, [
    "index",
    "src/index",
    "main",
    "src/main",
  ]);
  const signals = [];

  for (const candidate of candidates) {
    const content = readText(join(targetRoot, candidate));
    if (content === null) {
      continue;
    }

    for (const framework of cliFrameworkPackages) {
      const escapedFramework = framework.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const importPattern = new RegExp(
        `(?:from\\s+|require\\(\\s*)["']${escapedFramework}(?:["'/])`,
      );
      if (importPattern.test(content)) {
        signals.push(`${candidate}#imports.${framework}`);
      }
    }
  }

  return signals;
}

function wranglerConfigSignals(targetRoot) {
  const configNames = ["wrangler.toml", "wrangler.json", "wrangler.jsonc"];
  const configs = configNames.filter((name) =>
    existsSync(join(targetRoot, name)),
  );
  const entrypoints = [];

  for (const config of configs) {
    const content = readText(join(targetRoot, config));
    if (content === null) {
      continue;
    }

    let main = null;
    if (config === "wrangler.toml") {
      main = content.match(/^\s*main\s*=\s*["']([^"']+)["']/m)?.[1] ?? null;
    } else if (config === "wrangler.json") {
      const parsed = readJsonObject(join(targetRoot, config));
      main = typeof parsed?.main === "string" ? parsed.main : null;
    }

    if (main !== null && existsSync(resolve(targetRoot, main))) {
      entrypoints.push(`${config}#main`);
    }
  }

  return { configs, entrypoints };
}

export function buildScannerCommands(
  targetRoot,
  { runner = resolveNpxRunner() } = {},
) {
  if (runner === null) {
    throw new Error(
      "Unable to locate npm's npx-cli.js for safe Windows execution.",
    );
  }

  return {
    version: {
      command: runner.command,
      args: [...runner.prefixArgs, "-y", SCANNER_SPECIFIER, "--version"],
    },
    scan: {
      command: runner.command,
      args: [
        ...runner.prefixArgs,
        "-y",
        SCANNER_SPECIFIER,
        "--json",
        targetRoot,
      ],
    },
  };
}

export function inspectRepositorySignals(targetRoot) {
  const packageResult = packageSignals(targetRoot);
  const directoryCliEntrypoints = [
    ...directoryEntrypoints(targetRoot, "bin"),
    ...directoryEntrypoints(targetRoot, "cmd"),
  ];
  const sourceCliEntrypoints = existingSourceEntrypoints(targetRoot, [
    "cli",
    "src/cli",
  ]);
  const nonNodeSignals = nonNodeCliSignals(targetRoot);
  const frameworkImports = cliFrameworkImportSignals(targetRoot);
  const cliEntrypoints = uniqueSorted([
    ...packageResult.cli,
    ...directoryCliEntrypoints,
    ...sourceCliEntrypoints,
    ...nonNodeSignals,
    ...frameworkImports,
  ]);

  const wrangler = wranglerConfigSignals(targetRoot);
  const conventionalWorkerEntrypoints = existingSourceEntrypoints(targetRoot, [
    "worker",
    "src/worker",
  ]);
  const cloudflareWorker = uniqueSorted([
    ...wrangler.configs,
    ...wrangler.entrypoints,
    ...packageResult.cloudflareDependencies,
    ...packageResult.cloudflareScripts,
    ...conventionalWorkerEntrypoints,
  ]);
  const cloudflareSignalGroups = [
    wrangler.configs,
    [...wrangler.entrypoints, ...conventionalWorkerEntrypoints],
    packageResult.cloudflareDependencies,
    packageResult.cloudflareScripts,
  ].filter((group) => group.length > 0).length;

  return {
    targetRoot,
    isCloudflareWorker: cloudflareSignalGroups >= 2,
    hasCliEntrypoint:
      packageResult.cli.length > 0 ||
      directoryCliEntrypoints.length > 0 ||
      sourceCliEntrypoints.length > 0 ||
      nonNodeSignals.length > 0,
    hasCliSignal: cliEntrypoints.length > 0,
    cloudflareWorker,
    cli: cliEntrypoints,
  };
}

function classificationKind(classification) {
  if (typeof classification === "string") {
    return classification.trim().toLowerCase();
  }
  if (isRecord(classification) && typeof classification.kind === "string") {
    return classification.kind.trim().toLowerCase();
  }
  return null;
}

export function assessClassification(classification, signals) {
  const kind = classificationKind(classification);
  if (kind === null) {
    return {
      reliable: false,
      reason: "The scanner did not report a repository classification.",
      evidence: [],
    };
  }

  if (
    kind === "cli" &&
    signals.isCloudflareWorker === true &&
    signals.hasCliSignal !== true
  ) {
    return {
      reliable: false,
      reason:
        'The scanner reported "cli", but strong repository signals identify a Cloudflare Worker and no package bin, bin/cmd entrypoint, CLI script, or CLI framework signal was found.',
      evidence: [...signals.cloudflareWorker],
    };
  }

  return {
    reliable: true,
    reason: null,
    evidence: [],
  };
}

export function validateScannedPath(targetRoot, scannedPath) {
  return (
    typeof targetRoot === "string" &&
    typeof scannedPath === "string" &&
    isAbsolute(targetRoot) &&
    isAbsolute(scannedPath) &&
    resolve(targetRoot) === resolve(scannedPath)
  );
}

function scannerProblems(recommendations) {
  if (!Array.isArray(recommendations)) {
    return [];
  }

  return recommendations.filter(isRecord).map((recommendation) => ({
    title:
      typeof recommendation.title === "string"
        ? recommendation.title
        : typeof recommendation.checkId === "string"
          ? recommendation.checkId
          : "Scanner recommendation",
    evidence: Array.isArray(recommendation.evidence)
      ? recommendation.evidence.filter((value) => typeof value === "string")
      : [],
    remediation:
      typeof recommendation.remediation === "string"
        ? recommendation.remediation
        : "Review the scanner evidence and add the missing repository signal.",
  }));
}

function unavailableResult({
  targetRoot,
  scannerVersion = null,
  summary,
  commands = [],
}) {
  return {
    status: "unavailable",
    scoreName: SCORE_NAME,
    score: null,
    scannerVersion,
    targetRoot,
    scannedPath: null,
    classification: null,
    classificationReliable: false,
    classificationEvidence: [],
    summary,
    evidence: [summary],
    problems: [],
    commands,
  };
}

export function evaluateScannerOutput({
  targetRoot,
  scannerVersion,
  scanOutput,
  signals,
}) {
  if (!isRecord(scanOutput)) {
    return unavailableResult({
      targetRoot,
      scannerVersion,
      summary: "Pinned scanner returned JSON with an invalid top-level value.",
    });
  }

  const score = scanOutput.overallScore;
  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100
  ) {
    return unavailableResult({
      targetRoot,
      scannerVersion,
      summary: "Pinned scanner JSON did not contain a valid overallScore.",
    });
  }

  const kind = classificationKind(scanOutput.classification);
  const classificationAssessment = assessClassification(
    scanOutput.classification,
    signals,
  );
  const pathMatches = validateScannedPath(targetRoot, scanOutput.scannedPath);
  const reliabilityProblems = [];
  if (!pathMatches) {
    reliabilityProblems.push(
      `Scanner scannedPath ${JSON.stringify(scanOutput.scannedPath ?? null)} does not match target root ${JSON.stringify(targetRoot)}.`,
    );
  }
  if (!classificationAssessment.reliable) {
    reliabilityProblems.push(classificationAssessment.reason);
  }

  const reliable = reliabilityProblems.length === 0;
  const maturity =
    typeof scanOutput.maturity === "string" ? ` (${scanOutput.maturity})` : "";
  const summary = reliable
    ? `Scanner ${scannerVersion} classified the repository as ${kind} and scored it ${score}/100${maturity}.`
    : `Deterministic scan is unreliable: ${reliabilityProblems.join(" ")}`;

  return {
    status: reliable ? "complete" : "unreliable",
    scoreName: SCORE_NAME,
    score,
    scannerVersion,
    targetRoot,
    scannedPath:
      typeof scanOutput.scannedPath === "string"
        ? scanOutput.scannedPath
        : null,
    classification: kind,
    classificationReliable: reliable,
    classificationEvidence: classificationAssessment.evidence,
    summary,
    evidence: [
      `scannerVersion: ${scannerVersion}`,
      `scannedPath: ${scanOutput.scannedPath}`,
      `classification: ${kind}`,
      ...classificationAssessment.evidence,
    ],
    problems: scannerProblems(scanOutput.recommendations),
    commands: [],
  };
}

function canonicalTargetRoot(targetRoot) {
  if (typeof targetRoot !== "string" || targetRoot.trim() === "") {
    throw new Error("A target root argument is required.");
  }

  const absolutePath = resolve(targetRoot);
  const stats = statSync(absolutePath);
  if (!stats.isDirectory()) {
    throw new Error(`Target root is not a directory: ${absolutePath}`);
  }
  return realpathSync(absolutePath);
}

function compactFailure(value) {
  if (typeof value !== "string") {
    return null;
  }
  const compact = value.trim().replace(/\s+/g, " ");
  return compact.length > 0 ? compact.slice(0, 1_000) : null;
}

function commandFailure(result) {
  return (
    compactFailure(result?.error) ??
    compactFailure(result?.stderr) ??
    (Number.isInteger(result?.exitCode)
      ? `command exited with code ${result.exitCode}`
      : "command could not be executed")
  );
}

function shellDisplay(command) {
  const safeArgument = (argument) =>
    /^[A-Za-z0-9@%_+=:,./-]+$/.test(argument)
      ? argument
      : JSON.stringify(argument);
  return [command.command, ...command.args.map(safeArgument)].join(" ");
}

async function executeScannerCommand(command) {
  try {
    const { stdout, stderr } = await execFileAsync(
      command.command,
      command.args,
      {
        cwd: tmpdir(),
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        timeout: 180_000,
        windowsHide: true,
      },
    );
    return { ok: true, stdout, stderr, exitCode: 0 };
  } catch (error) {
    return {
      ok: false,
      stdout: typeof error?.stdout === "string" ? error.stdout : "",
      stderr: typeof error?.stderr === "string" ? error.stderr : "",
      exitCode: Number.isInteger(error?.code) ? error.code : null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function safelyExecute(executeCommand, command) {
  try {
    const result = await executeCommand(command);
    if (!isRecord(result) || typeof result.ok !== "boolean") {
      return {
        ok: false,
        stdout: "",
        stderr: "",
        exitCode: null,
        error: "command runner returned an invalid result",
      };
    }
    return result;
  } catch (error) {
    return {
      ok: false,
      stdout: "",
      stderr: "",
      exitCode: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function reportedVersion(stdout) {
  if (typeof stdout !== "string") {
    return null;
  }
  return stdout.match(/\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b/)?.[0] ?? null;
}

export async function runDeterministicScan(
  targetRootArgument,
  { executeCommand = executeScannerCommand } = {},
) {
  let targetRoot;
  try {
    targetRoot = canonicalTargetRoot(targetRootArgument);
  } catch (error) {
    return unavailableResult({
      targetRoot:
        typeof targetRootArgument === "string"
          ? resolve(targetRootArgument)
          : null,
      summary: `Target root validation failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  let scannerCommands;
  try {
    scannerCommands = buildScannerCommands(targetRoot);
  } catch (error) {
    return unavailableResult({
      targetRoot,
      summary: error instanceof Error ? error.message : String(error),
    });
  }
  const commands = [];
  const versionRun = await safelyExecute(
    executeCommand,
    scannerCommands.version,
  );
  if (!versionRun.ok) {
    const detail = commandFailure(versionRun);
    commands.push({
      command: shellDisplay(scannerCommands.version),
      outcome: "failed",
      detail,
    });
    return unavailableResult({
      targetRoot,
      summary: `Pinned scanner version check failed: ${detail}`,
      commands,
    });
  }

  const scannerVersion = reportedVersion(versionRun.stdout);
  if (scannerVersion !== SCANNER_VERSION) {
    const detail = `expected ${SCANNER_VERSION}, received ${scannerVersion ?? "no version"}`;
    commands.push({
      command: shellDisplay(scannerCommands.version),
      outcome: "failed",
      detail,
    });
    return unavailableResult({
      targetRoot,
      scannerVersion,
      summary: `Pinned scanner version check failed: ${detail}`,
      commands,
    });
  }
  commands.push({
    command: shellDisplay(scannerCommands.version),
    outcome: "passed",
  });

  const scanRun = await safelyExecute(executeCommand, scannerCommands.scan);
  if (!scanRun.ok) {
    const detail = commandFailure(scanRun);
    commands.push({
      command: shellDisplay(scannerCommands.scan),
      outcome: "failed",
      detail,
    });
    return unavailableResult({
      targetRoot,
      scannerVersion,
      summary: `Pinned scanner execution failed: ${detail}`,
      commands,
    });
  }

  let scanOutput;
  try {
    scanOutput = JSON.parse(scanRun.stdout);
  } catch {
    const detail = "scanner stdout was not valid JSON";
    commands.push({
      command: shellDisplay(scannerCommands.scan),
      outcome: "failed",
      detail,
    });
    return unavailableResult({
      targetRoot,
      scannerVersion,
      summary: `Pinned scanner execution failed: ${detail}`,
      commands,
    });
  }

  const result = evaluateScannerOutput({
    targetRoot,
    scannerVersion,
    scanOutput,
    signals: inspectRepositorySignals(targetRoot),
  });
  if (result.status === "unavailable") {
    commands.push({
      command: shellDisplay(scannerCommands.scan),
      outcome: "failed",
      detail: result.summary,
    });
  } else {
    commands.push({
      command: shellDisplay(scannerCommands.scan),
      outcome: "passed",
    });
  }

  return { ...result, commands };
}

function isDirectExecution() {
  if (typeof process.argv[1] !== "string") {
    return false;
  }

  try {
    return (
      pathToFileURL(realpathSync(resolve(process.argv[1]))).href ===
      pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href
    );
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  const result = await runDeterministicScan(process.argv[2]);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === "unavailable") {
    process.exitCode = 1;
  }
}
