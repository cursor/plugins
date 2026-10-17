#!/usr/bin/env node

import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PSTACK = join(ROOT, "pstack");
const SKILLS = join(PSTACK, "skills");
const OUT = join(ROOT, "harness", "pstack", "codex");
const ADAPTER = "docs/harness/codex.md";
const COMMAND = "node scripts/generate-pstack-codex.mjs";
const GITHUB = "https://github.com/cursor/plugins";
const LINK = /\]\(([^)\s]+)\)/g;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
// The `description:` line plus any indented continuation lines, so folded and block scalars survive.
const DESCRIPTION = /^description:.*(?:\n[ \t]+.*)*/m;
const SKILL_LINE =
  `Before following this workflow, read [the Codex adapter](../../${ADAPTER}). ` +
  "Its host mappings replace the Cursor-specific steps below, including model setup and agent discovery.";
const AGENT_LINE =
  `Read [the Codex adapter](../${ADAPTER}) first. This is a portable delegate brief, not a registered agent type. ` +
  "Use the skill path supplied by the parent; never search Cursor plugin storage.";
const README = `# pstack for Codex

Generated from \`pstack/\` by \`${COMMAND}\`. Do not edit this package directly.

Invoke \`$poteto-mode\` for a substantial task. Read [the adapter](${ADAPTER}) for capability mappings and limitations. Models inherit the parent; no hooks, profiles, or automations are installed.
`;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === ".DS_Store" || name === "node_modules") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function file(path) {
  return { bytes: readFileSync(path), executable: (statSync(path).mode & 0o111) !== 0 };
}

function text(value) {
  return { bytes: Buffer.from(value), executable: false };
}

// The pstack-relative path that a relative link in `from` points at, if that path exists.
function resolve(from, href) {
  const target = href.replace(/[#?].*/, "");
  if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return undefined;
  const path = posix.join(posix.dirname(from), target).replace(/\/$/, "");
  return existsSync(join(PSTACK, path)) ? path : undefined;
}

// Grok Bot skills need host tools Codex lacks. The package drops them and any line that links to them.
const GROK_BOT_ONLY = ["make-bot-ui"];
const skills = readdirSync(SKILLS).filter((name) => !GROK_BOT_ONLY.includes(name) && existsSync(join(SKILLS, name, "SKILL.md")));
const copies = [...skills.flatMap((skill) => walk(join(SKILLS, skill))), ...walk(join(PSTACK, "agents")), join(PSTACK, ADAPTER)];
const files = new Map(copies.map((path) => [relative(PSTACK, path), file(path)]));
const problems = [];

// Codex registers a skill as `pstack:<name>`, so the name is the directory, not the upstream display name.
for (const skill of skills) {
  const path = `skills/${skill}/SKILL.md`;
  const source = files.get(path).bytes.toString("utf8");
  const frontmatter = source.match(FRONTMATTER);
  const description = frontmatter?.[1].match(DESCRIPTION)?.[0];
  if (!/^[a-z0-9-]+$/.test(skill) || `pstack:${skill}`.length > 64) problems.push(`${path} has an invalid Codex skill name`);
  if (!description) {
    problems.push(`${path} has no description`);
    continue;
  }
  const body = source.slice(frontmatter[0].length);
  files.set(path, text(`---\nname: ${skill}\n${description}\n---\n\n${SKILL_LINE}\n\n${body}`));
  const implicit = !/^disable-model-invocation:\s*true\s*$/m.test(frontmatter[1]);
  files.set(`skills/${skill}/agents/openai.yaml`, text(`policy:\n  allow_implicit_invocation: ${implicit}\n`));
}
for (const problem of problems) console.log(`FAIL ${problem}`);
if (problems.length > 0) process.exit(1);

for (const [path, entry] of files) {
  if (path.startsWith("agents/") && path.endsWith(".md")) {
    entry.bytes = Buffer.from(entry.bytes.toString("utf8").replace(/^(# .*)\n+/m, `$1\n\n${AGENT_LINE}\n\n`));
  }
}

// A relative link to a pstack file the package leaves out points at that file on GitHub `main` instead.
for (const [path, entry] of files) {
  if (!path.endsWith(".md")) continue;
  const linksToDropped = (line) =>
    [...line.matchAll(LINK)].some(([, href]) => GROK_BOT_ONLY.includes(resolve(path, href)?.match(/^skills\/([^/]+)/)?.[1]));
  const kept = entry.bytes.toString("utf8").split("\n").filter((line) => !linksToDropped(line)).join("\n");
  entry.bytes = Buffer.from(
    kept.replace(LINK, (link, href) => {
      const target = resolve(path, href);
      if (!target || target.split("/")[0] === ".." || files.has(target) || [...files.keys()].some((key) => key.startsWith(`${target}/`))) return link;
      const kind = statSync(join(PSTACK, target)).isDirectory() ? "tree" : "blob";
      return `](${GITHUB}/${kind}/main/pstack/${target}${href.slice(href.search(/[#?]|$/))})`;
    }),
  );
}

const { version } = JSON.parse(readFileSync(join(PSTACK, "plugin.json"), "utf8"));
const manifest = {
  name: "pstack",
  version,
  description: "Shared pstack workflows adapted for Codex tools and delegation.",
  author: { name: "Kevin Tram; upstream pstack by Lauren Tan" },
  repository: "https://github.com/kevintram/plugins",
  license: "MIT",
  skills: "./skills/",
};
files.set(".codex-plugin/plugin.json", text(`${JSON.stringify(manifest, null, 2)}\n`));
files.set("LICENSE", file(join(PSTACK, "LICENSE")));
files.set("README.md", text(README));

if (process.argv.includes("--check")) {
  const onDisk = new Map(existsSync(OUT) ? walk(OUT).map((path) => [relative(OUT, path), file(path)]) : []);
  const drifted = [...new Set([...files.keys(), ...onDisk.keys()])].sort().filter((path) => {
    const [want, have] = [files.get(path), onDisk.get(path)];
    return !want || !have || !want.bytes.equals(have.bytes) || want.executable !== have.executable;
  });
  for (const path of drifted.slice(0, 20)) console.log(`harness/pstack/codex/${path}`);
  if (drifted.length > 0) {
    console.log(`harness/pstack/codex is out of date. Run \`${COMMAND}\` and commit the result.`);
    process.exit(1);
  }
  console.log("harness/pstack/codex is up to date.");
} else {
  rmSync(OUT, { recursive: true, force: true });
  for (const [path, { bytes, executable }] of files) {
    mkdirSync(dirname(join(OUT, path)), { recursive: true });
    writeFileSync(join(OUT, path), bytes);
    chmodSync(join(OUT, path), executable ? 0o755 : 0o644);
  }
  console.log(`${skills.length} Codex skills`);
}
