#!/usr/bin/env node

import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(ROOT, "plugin.json"), "utf8"));
const agents = JSON.parse(readFileSync(join(ROOT, "config/agents.json"), "utf8"));
const expected = new Map();
const json = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (["node_modules", ".DS_Store"].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Package symlink not allowed: ${path}`);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function file(path) {
  return { bytes: readFileSync(path), executable: (statSync(path).mode & 0o111) !== 0 };
}

function agentFile(name, agent, client, prefix) {
  const tools = client === "copilot"
    ? agent.tools
    : agent.tools.flatMap(tool => ({
      read: ["Read"], search: ["Grep", "Glob"], edit: ["Edit", "Write"], execute: ["Bash"],
    })[tool]);
  const strict = client === "copilot" ? "strict-tools-list: true\ninclude-custom-instructions: true\n" : "";
  return {
    bytes: Buffer.from(`---\nname: ${name}\ndescription: ${JSON.stringify(agent.description)}\ntools: ${JSON.stringify(tools)}\n${strict}---\n\n# ${name}\n\nRead [the shared policy](${prefix}docs/core.md) and the active client adapter.\n\n${agent.body}\n`),
    executable: false,
  };
}

const { $schema, extensions, ...native } = manifest;
const cursor = {
  ...native, displayName: "pstack", logo: "assets/logo.png",
  skills: "./skills/", agents: "./agents/",
};
expected.set(".cursor-plugin/plugin.json", { bytes: json(cursor), executable: false });
expected.set(".claude-plugin/plugin.json", { bytes: json(native), executable: false });
expected.set(".claude-plugin/marketplace.json", {
  bytes: json({
    name: "pstack-standalone",
    owner: { name: manifest.author.name },
    metadata: { description: manifest.description },
    plugins: [{ name: "pstack", source: "./", version: manifest.version, description: manifest.description }],
  }),
  executable: false,
});
for (const [name, agent] of Object.entries(agents)) {
  expected.set(`agents/${name}.md`, agentFile(name, agent, "claude", "../"));
  expected.set(`com.github.copilot/agents/${name}.agent.md`, agentFile(name, agent, "copilot", "../../"));
}

const source = [
  ...["skills", "docs", "assets", "automations", "config"].flatMap(dir => walk(join(ROOT, dir))),
  ...["README.md", "LICENSE", "plugin.json", "scripts/pstack-config.mjs", "scripts/lib/pstack-config.mjs", "scripts/lib/model-agents.mjs"].map(path => join(ROOT, path)),
];
const copies = new Map(source.map(path => [relative(ROOT, path), file(path)]));
for (const path of [...copies.keys()]) {
  if (/^skills\/[^/]+\/SKILL\.md$/.test(path)) {
    const folder = path.split("/")[1];
    const text = copies.get(path).bytes.toString("utf8");
    const name = text.match(/^name:\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, "");
    if (name !== folder) throw new Error(`Skill name ${name} does not match ${folder}`);
    if (!text.includes("../../docs/core.md")) throw new Error(`Missing shared policy in ${path}`);
  }
}

for (const client of ["cursor", "claude-code"]) {
  const files = new Map(copies);
  files.delete("plugin.json");
  for (const [path, entry] of expected) {
    if (path.startsWith("agents/") || path === `${client === "cursor" ? ".cursor-plugin" : ".claude-plugin"}/plugin.json`) files.set(path, entry);
  }
  for (const [path, entry] of files) {
    let bytes = entry.bytes;
    if (path.endsWith(".md")) {
      let text = bytes.toString("utf8");
      if (/^skills\/[^/]+\/SKILL\.md$/.test(path)) {
        const adapter = client === "cursor" ? "cursor" : "claude-code";
        text = text.replace(/^(# .*)\n/m, `$1\n\nRead [the ${client} adapter](../../docs/harness/${adapter}.md) before this skill.\n`);
      }
      text = text.replace(/\]\(([^)\s]+)\)/g, (link, href) => {
        if (/^[a-z][a-z0-9+.-]*:|^#/i.test(href)) return link;
        const target = posix.normalize(posix.join(posix.dirname(path), href.split(/[?#]/)[0])).replace(/\/$/, "");
        const packaged = files.has(target) || [...files.keys()].some(key => key.startsWith(`${target}/`));
        if (packaged) return link;
        const outputLink = /^dist\/(cursor|claude-code)(\/|$)/.test(target);
        if (!outputLink && !existsSync(join(ROOT, target))) return link;
        const outputSource = target.replace(/^dist\/(cursor|claude-code)\/?/, "");
        const kind = outputLink
          ? (copies.has(outputSource) ? "blob" : "tree")
          : (statSync(join(ROOT, target)).isDirectory() ? "tree" : "blob");
        return `](${manifest.repository}/${kind}/main/${target}${href.slice(href.search(/[?#]|$/))})`;
      });
      bytes = Buffer.from(text);
    }
    expected.set(`dist/${client}/${path}`, { bytes, executable: entry.executable });
  }
}

const locations = ["agents", "com.github.copilot/agents", "dist/cursor", "dist/claude-code"];
const actualPaths = locations.flatMap(dir => existsSync(join(ROOT, dir)) ? walk(join(ROOT, dir)).map(path => relative(ROOT, path)) : []);
const all = new Set([...expected.keys(), ...actualPaths]);
const drift = [...all].filter(path => {
  const target = join(ROOT, path);
  const wanted = expected.get(path);
  if (!wanted) return true;
  if (!existsSync(target)) return true;
  const actual = file(target);
  return !wanted.bytes.equals(actual.bytes) || wanted.executable !== actual.executable;
});
if (process.argv.includes("--check")) {
  if (drift.length) {
    console.error(`Generated output drift (${drift.length} files):\n${drift.slice(0, 20).join("\n")}\nRun node scripts/generate-pstack-harness-trees.mjs`);
    process.exitCode = 1;
  } else console.log("All client distributions and agent definitions are up to date.");
} else {
  for (const path of drift) {
    const target = join(ROOT, path);
    const entry = expected.get(path);
    if (!entry) {
      unlinkSync(target);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, entry.bytes);
    chmodSync(target, entry.executable ? 0o755 : 0o644);
  }
  console.log(`Generated ${expected.size} files for root, Cursor, and Claude Code (${drift.length} changed).`);
}
