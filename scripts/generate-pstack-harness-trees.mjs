#!/usr/bin/env node

import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  analyzePstack,
  buildAntigravityFiles,
  file,
  GITHUB,
  hasEntry,
  LINK_RE as LINK,
  OUT,
  PSTACK,
  resolvePstackPath,
  SKILLS,
  walk,
} from "./generate-pstack-agy.mjs";

// Outside pstack/ so Cursor, which copies the whole plugin folder, does not install this tree too.
const CLAUDE_ADAPTER = "docs/harness/claude-code.md";
const CODEX_ADAPTER = "docs/harness/codex.md";
const GUIDE = "docs/guide";
const COMMAND = "node scripts/generate-pstack-harness-trees.mjs";
const README = `# pstack harness tree

This folder is generated from \`pstack/skills\`, \`pstack/agents\`, \`pstack/${GUIDE}\`, \`pstack/docs/harness\`, \`pstack/README.md\`, \`pstack/LICENSE\`, and \`pstack/plugin.json\`. Do not edit it by hand.

Cursor uses \`pstack/\` directly. Claude Code, Antigravity, and Codex install from \`claude-code/\`, \`antigravity/\`, and \`codex/\`. The generated trees omit files such as \`pstack/automations\`. Links to omitted pstack files point to GitHub.

After editing those sources, run \`${COMMAND}\` from the repository root and commit the result.
`;

const { skills, classes, problems, users } = analyzePstack(PSTACK);
const adapter = readFileSync(join(PSTACK, CLAUDE_ADAPTER), "utf8");
for (const [key, using] of users) {
  if (!adapter.includes(key)) problems.push(`Claude Code adapter has no row for ${key}, used by ${using.join(", ")}`);
}
for (const problem of problems) console.log(`FAIL ${problem}`);
if (problems.length > 0) process.exit(1);

// The pstack-relative path that a relative link in `from` points at, if that path exists.
function resolve(from, href) {
  return resolvePstackPath(from, href, PSTACK);
}

function has(files, path) {
  return hasEntry(files, path);
}

function packageFiles(adapter, extras = []) {
  const copies = [
    ...walk(SKILLS),
    ...walk(join(PSTACK, "agents")),
    ...walk(join(PSTACK, GUIDE)),
    join(PSTACK, adapter),
    join(PSTACK, "README.md"),
    join(PSTACK, "LICENSE"),
    ...extras.map((path) => join(PSTACK, path)),
  ];
  return new Map(copies.map((path) => [relative(PSTACK, path), file(path)]));
}

function renderClaude() {
  const files = packageFiles(CLAUDE_ADAPTER);
  const line =
    `In Claude Code, read [the Claude Code adapter](../../${CLAUDE_ADAPTER}) once per session before you follow this skill. ` +
    "It maps the Cursor names in pstack skills to Claude Code.";
  for (const [skill, { wrap }] of classes) {
    if (!wrap) continue;
    const entry = files.get(`skills/${skill}/SKILL.md`);
    entry.bytes = Buffer.from(entry.bytes.toString("utf8").replace(/^(# .*)\n+/m, `$1\n\n${line}\n\n`));
  }
  for (const manifest of ["plugin.json", ".claude-plugin/plugin.json"]) {
    files.set(manifest, file(join(PSTACK, "plugin.json")));
  }
  return files;
}

function renderCodex() {
  const files = packageFiles(CODEX_ADAPTER, ["docs/harness/run-external-agent.mjs"]);
  files.set("skills/setup-pstack/SKILL.md", file(join(PSTACK, "docs/harness/codex/setup-pstack.md")));
  const line =
    `For Codex, read [the Codex adapter](../../${CODEX_ADAPTER}) before following this skill. ` +
    "Its host mappings also apply to linked playbooks.";
  for (const skill of skills) {
    const path = `skills/${skill}/SKILL.md`;
    const entry = files.get(path);
    const text = entry.bytes.toString("utf8");
    const frontmatter = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    if (!frontmatter) throw new Error(`${path}: missing skill frontmatter`);
    entry.bytes = Buffer.from(`${frontmatter[0]}\n${line}\n\n${text.slice(frontmatter[0].length).trimStart()}`);
  }
  const { name, version, description } = JSON.parse(readFileSync(join(PSTACK, "plugin.json"), "utf8"));
  if (!name || !version || !description) throw new Error("pstack/plugin.json requires name, version, and description");
  const manifest = {
    name,
    version,
    description,
    skills: "./skills/",
    interface: { displayName: "pstack (Poteto Stack)" },
  };
  files.set(".codex-plugin/plugin.json", {
    bytes: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`),
    executable: false,
  });
  return files;
}

function rewriteLinks(files) {
  for (const [path, entry] of files) {
    if (!path.endsWith(".md")) continue;
    const text = entry.bytes.toString("utf8").replace(LINK, (link, href) => {
      const target = resolve(path, href);
      if (!target || target.split("/")[0] === ".." || has(files, target)) return link;
      const kind = statSync(join(PSTACK, target)).isDirectory() ? "tree" : "blob";
      return `](${GITHUB}/${kind}/main/pstack/${target}${href.slice(href.search(/[#?]|$/))})`;
    });
    entry.bytes = Buffer.from(text);
  }
}

const rendered = new Map([["README.md", { bytes: Buffer.from(README), executable: false }]]);
const dangling = [];
for (const [tree, files] of [["claude-code", renderClaude()], ["codex", renderCodex()]]) {
  rewriteLinks(files);
  for (const [path, entry] of files) {
    rendered.set(`${tree}/${path}`, entry);
    if (!path.endsWith(".md")) continue;
    for (const [, href] of entry.bytes.toString("utf8").matchAll(LINK)) {
      const target = resolve(path, href);
      if (target && !has(files, target)) dangling.push(`harness/pstack/${tree}/${path} links to ${href}, which is not in the tree`);
    }
  }
}
for (const link of dangling) console.log(`FAIL ${link}`);
if (dangling.length > 0) process.exit(1);

const agyFiles = buildAntigravityFiles({ pstack: PSTACK, skills, classes, users, github: GITHUB });
for (const [path, entry] of agyFiles) {
  rendered.set(`antigravity/${path}`, entry);
}

if (process.argv.includes("--check")) {
  const onDisk = new Map(existsSync(OUT) ? walk(OUT).map((path) => [relative(OUT, path), file(path)]) : []);
  const drifted = [...new Set([...rendered.keys(), ...onDisk.keys()])].sort().filter((path) => {
    const [want, have] = [rendered.get(path), onDisk.get(path)];
    return !want || !have || !want.bytes.equals(have.bytes) || want.executable !== have.executable;
  });
  for (const path of drifted.slice(0, 20)) console.log(`harness/pstack/${path}`);
  if (drifted.length > 0) {
    console.log(`harness/pstack is out of date. Run \`${COMMAND}\` and commit the result.`);
    process.exit(1);
  }
  console.log("harness/pstack is up to date.");
} else {
  rmSync(OUT, { recursive: true, force: true });
  for (const [path, { bytes, executable }] of rendered) {
    mkdirSync(dirname(join(OUT, path)), { recursive: true });
    writeFileSync(join(OUT, path), bytes);
    chmodSync(join(OUT, path), executable ? 0o755 : 0o644);
  }
  const wrapped = [...classes.values()].filter(({ wrap }) => wrap).length;
  console.log(`Generated pstack for Claude Code, Antigravity, and Codex. Adapter added to ${wrapped} Claude Code skills and ${skills.length} Codex skills.`);
}
