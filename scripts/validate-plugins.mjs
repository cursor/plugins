#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative, extname } from "path";
import { fileURLToPath } from "url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const marketplaceSchema = loadJSON(
  resolve(root, "schemas/marketplace.schema.json")
);
const pluginSchema = loadJSON(resolve(root, "schemas/plugin.schema.json"));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validateMarketplace = ajv.compile(marketplaceSchema);
const validatePlugin = ajv.compile(pluginSchema);

let errors = 0;
let warnings = 0;

function fail(message) {
  console.error(`ERROR: ${message}`);
  errors++;
}

function warn(message) {
  console.error(`WARN: ${message}`);
  warnings++;
}

// 1. Validate marketplace.json
const marketplacePath = resolve(root, ".cursor-plugin/marketplace.json");

if (!existsSync(marketplacePath)) {
  fail(".cursor-plugin/marketplace.json not found");
  process.exit(1);
}

const marketplace = loadJSON(marketplacePath);

if (!validateMarketplace(marketplace)) {
  fail("marketplace.json schema validation failed:");
  for (const err of validateMarketplace.errors) {
    console.error(`  ${err.instancePath || "/"}: ${err.message}`);
  }
}

// 2. Validate each plugin
for (const entry of marketplace.plugins ?? []) {
  const pluginDir = resolve(root, entry.source);
  const pluginJsonPath = resolve(pluginDir, ".cursor-plugin/plugin.json");

  // Check source directory exists
  if (!existsSync(pluginDir)) {
    fail(
      `Plugin "${entry.name}": source directory "${entry.source}" does not exist`
    );
    continue;
  }

  // Check plugin.json exists
  if (!existsSync(pluginJsonPath)) {
    fail(
      `Plugin "${entry.name}": missing .cursor-plugin/plugin.json in "${entry.source}"`
    );
    continue;
  }

  const pluginJson = loadJSON(pluginJsonPath);

  if (!validatePlugin(pluginJson)) {
    fail(
      `Plugin "${entry.name}": plugin.json schema validation failed (${entry.source}/.cursor-plugin/plugin.json):`
    );
    for (const err of validatePlugin.errors) {
      const detail =
        err.keyword === "additionalProperties"
          ? `${err.message}: "${err.params.additionalProperty}"`
          : err.message;
      console.error(`  ${err.instancePath || "/"}: ${detail}`);
    }
  }

  // Check that marketplace name matches plugin name
  if (pluginJson.name && pluginJson.name !== entry.name) {
    fail(
      `Plugin "${entry.name}": marketplace name does not match plugin.json name "${pluginJson.name}"`
    );
  }
}

// 3. Content audit — heuristic security scan of plugin payloads.
//    Structural validation cannot see inside commands/skills/agents/rules.
//    Critical findings fail the build; advisory findings are printed for review.

const CODE_FILE = /\.(cjs|js|mjs|ts|tsx|sh|bash|zsh|py|go|rb|pl|php|ex|exs)$/;
const TEXT_FILE = /\.(md|txt|yaml|yml|toml)$/;
const BAD_BINARY_EXT = /\.(exe|dylib|so|bin|class|jar|pyc|o)$/;

const CONTENT_AUDIT = [
  {
    id: "dynamic-exec",
    label: "dynamic code execution (eval/Function)",
    severity: "critical",
    files: CODE_FILE,
    re: /\beval\s*\(|\bnew\s+Function\s*\(/,
  },
  {
    id: "obfuscated-code",
    label: "obfuscated/encoded payload (atob/hex/charCode)",
    severity: "critical",
    files: CODE_FILE,
    re: /\batob\s*\(|Buffer\.from\s*\([^)]*"hex"|String\.fromCharCode\s*\(/,
  },
  {
    id: "subprocess",
    label: "subprocess/exec usage (review)",
    severity: "advisory",
    files: CODE_FILE,
    re: /\bchild_process\b|\bexecSync\s*\(|\bspawnSync\s*\(|\bspawn\s*\(|\bfork\s*\(/,
  },
  {
    id: "exfil",
    label: "outbound curl/wget in code",
    severity: "critical",
    files: CODE_FILE,
    re: /\bcurl\b|\bwget\b/,
  },
  {
    id: "reverse-obfusc",
    label: "string-reversal obfuscation",
    severity: "critical",
    files: CODE_FILE,
    re: /\.split\s*\(\s*["']{2}\s*\)\s*\.reverse\s*\(\s*\)\s*\.join\s*\(/,
  },
  {
    id: "reverse-shell",
    label: "reverse-shell indicators",
    severity: "critical",
    files: CODE_FILE,
    re: /bash\s+-i|(?:\/dev\/tcp\/|nc\s+-e|netcat\s+-e|mkfifo)/,
  },
  {
    id: "ssh-key-read",
    label: "reads ~/.ssh credentials",
    severity: "critical",
    files: CODE_FILE,
    re: /(?:~|\$HOME|\/Users\/[\w.-]+)\/\.ssh|\b\.ssh\//,
  },
  {
    id: "ssh-key-read-md",
    label: "references ~/.ssh credentials (review)",
    severity: "advisory",
    files: TEXT_FILE,
    re: /(?:~|\$HOME|\/Users\/[\w.-]+)\/\.ssh|\b\.ssh\//,
  },
  {
    id: "prompt-injection",
    label: "prompt-injection / instruction-override language",
    severity: "critical",
    files: TEXT_FILE,
    re: /ignore\s+(?:all\s+)?(?:previous|prior|earlier)\s+(?:instructions|rules|guardrails|safety|system)|disregard\s+(?:previous|prior)|override\s+(?:all\s+)?(?:your\s+)?(?:instructions|rules|guardrails|safety)/i,
  },
  {
    id: "secret-env",
    label: "reads secrets from environment (review)",
    severity: "advisory",
    files: CODE_FILE,
    re: /process\.env\.[A-Z_0-9]*(TOKEN|SECRET|KEY|PASSWORD)|AWS_SECRET|GITHUB_TOKEN|OPENAI_API_KEY|ANTHROPIC_API_KEY/,
  },
];

function walkFiles(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = resolve(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (["node_modules", ".git", ".cursor-plugin"].includes(entry)) continue;
      walkFiles(full, out);
    } else {
      out.push(full);
    }
  }
}

function auditContent(filePath) {
  const rel = relative(root, filePath);
  const ext = extname(filePath).toLowerCase();

  if (BAD_BINARY_EXT.test(ext)) {
    fail(`content audit [binary executable extension]: ${rel}`);
    return;
  }

  let buf;
  try {
    buf = readFileSync(filePath);
  } catch {
    return;
  }

  const magic = buf.subarray(0, 4);
  const isELF = magic.length === 4 && magic[0] === 0x7f && magic[1] === 0x45 && magic[2] === 0x4c && magic[3] === 0x46;
  const isPE = magic.length >= 2 && magic[0] === 0x4d && magic[1] === 0x5a;
  if (isELF || isPE) {
    fail(`content audit [binary executable blob]: ${rel}`);
    return;
  }

  if (buf.length > 2 * 1024 * 1024) return; // too large to text-scan

  if (!CODE_FILE.test(ext) && !TEXT_FILE.test(ext)) return;

  const lines = buf.toString("utf8").split("\n");
  for (const rule of CONTENT_AUDIT) {
    if (!rule.files.test(ext)) continue;
    const cap = rule.severity === "critical" ? 3 : 1; // advisory: one heads-up per file
    let hits = 0;
    for (let i = 0; i < lines.length && hits < cap; i++) {
      if (rule.re.test(lines[i])) {
        hits++;
        const msg = `content audit [${rule.label}]: ${rel}:${i + 1}`;
        if (rule.severity === "critical") fail(msg);
        else warn(msg);
      }
    }
  }
}

for (const entry of marketplace.plugins ?? []) {
  const pluginDir = resolve(root, entry.source);
  if (!existsSync(pluginDir)) continue;
  const files = [];
  walkFiles(pluginDir, files);
  for (const file of files) auditContent(file);
}

// 4. Report results
if (errors > 0) {
  console.error(`\nValidation failed with ${errors} error(s).`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(
    `\nAll plugins validated successfully (${warnings} advisory warning(s) — review flagged lines before merging).`
  );
  process.exit(0);
} else {
  console.log("All plugins validated successfully.");
  process.exit(0);
}
