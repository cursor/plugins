#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const skillsRoot = join(root, "pstack", "skills");
const allowedFrontmatterFields = new Set([
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
]);
const activationBoundary =
  "**Activation boundary:** execute this skill only when the user or another active pstack skill explicitly routes here.";
const forbidden = [
  [/\b(?:grok|xai|x\.ai|claude|openai|anthropic|gemini|chatgpt|codex)\b|\bgpt-\d/iu, "named model or provider"],
  [/(?:~\/\.cursor|\.cursor\/)/u, "Cursor filesystem path"],
  [/\bCursor\b/iu, "Cursor runtime dependency"],
  [/\b(?:Task tool|Task call|Task response|AskQuestion)\b/u, "Cursor tool schema"],
  [/\b(?:subagent_type|run_in_background|readonly:)\b/u, "Cursor subagent field"],
  [/\b(?:ask|launch|run|spawn) several models\b|\bdifferent models catch\b/iu, "unconditional distinct-model requirement"],
];

function markdownFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    else if (entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

const errors = [];
const skillDirectories = readdirSync(skillsRoot, { withFileTypes: true }).filter(
  (entry) => entry.isDirectory(),
);

for (const directory of skillDirectories) {
  const skillPath = join(skillsRoot, directory.name, "SKILL.md");
  let source;
  try {
    source = readFileSync(skillPath, "utf8");
  } catch {
    errors.push(`${directory.name}: missing SKILL.md`);
    continue;
  }

  const declaredName = source.match(/^name:\s*["']?([^\n"']+)/mu)?.[1]?.trim();
  if (declaredName !== basename(directory.name)) {
    errors.push(`${directory.name}: frontmatter name is ${JSON.stringify(declaredName)}`);
  }

  const frontmatter = source.match(/^---\n([\s\S]*?)\n---(?:\n|$)/u)?.[1];
  if (!frontmatter) {
    errors.push(`${directory.name}: missing YAML frontmatter`);
    continue;
  }
  for (const line of frontmatter.split("\n")) {
    const field = line.match(/^([a-z][a-z0-9-]*):/u)?.[1];
    if (field && !allowedFrontmatterFields.has(field)) {
      errors.push(`${directory.name}: non-standard frontmatter field: ${field}`);
    }
  }
  if (
    frontmatter.includes('pstack-explicit-invocation: "true"') &&
    !source.includes(activationBoundary)
  ) {
    errors.push(`${directory.name}: explicit-invocation metadata lacks activation boundary`);
  }
}

if (skillDirectories.length !== 44) {
  errors.push(`expected 44 skills, found ${skillDirectories.length}`);
}

for (const path of markdownFiles(skillsRoot)) {
  const source = readFileSync(path, "utf8");
  for (const [pattern, label] of forbidden) {
    for (const match of source.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))) {
      const line = source.slice(0, match.index).split("\n").length;
      errors.push(`${relative(root, path)}:${line}: ${label}: ${match[0]}`);
    }
  }

  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)) {
    const target = match[1].split("#", 1)[0].split("?", 1)[0];
    if (!target || target === "url" || /^[a-z][a-z0-9+.-]*:/iu.test(target)) continue;
    const resolved = resolve(dirname(path), decodeURIComponent(target));
    if (!existsSync(resolved)) {
      const line = source.slice(0, match.index).split("\n").length;
      errors.push(`${relative(root, path)}:${line}: missing local link: ${target}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("pstack portable core: 44 skills, no host or model coupling detected");
