#!/usr/bin/env node
// Gate 3 of pstack/PORTABILITY.md: all skill references still resolve.
// For every markdown file under pstack/skills (excluding node_modules):
//   1. relative markdown links  [..](path)  -> resolves against the containing file
//   2. backtick paths like `playbooks/x.md`, `references/y.md`, `scripts/z.sh`
//      -> resolve against the skill root OR the containing file's directory
// Exit 1 if any reference is unresolved.
// Known limits (documented, none bite today): Windows-style separators in link
// targets, reference-style link definitions ([a]: path), and targets inside
// code fences are not checked.
// Guards: fails loudly when fewer than 44 skills (SKILL.md each) or zero markdown
// files are found — an emptied tree must not pass as "0 files, all resolve".
// CRLF line endings are normalized before matching, so Windows checkouts neither
// false-fail on frontmatter fences nor slip past link detection.

import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, dirname, join, relative, sep } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = resolve(root, "pstack/skills");

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules") return [];
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function skillRootOf(file) {
  const rel = relative(skillsDir, file).split(sep);
  return join(skillsDir, rel[0]);
}

const mdFiles = walk(skillsDir).filter((f) => f.endsWith(".md"));
let errors = 0;

// Vacuous-green guard: the portability gate asserts exactly 44 portable skills;
// mirror that floor here so a lost or emptied skills tree fails this gate too.
const skillDirs = readdirSync(skillsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(skillsDir, d.name, "SKILL.md")))
  .map((d) => d.name);

if (skillDirs.length < 44 || mdFiles.length === 0) {
  console.error(
    `FLOOR: expected >=44 skills (SKILL.md each) and >0 markdown files; ` +
      `found ${skillDirs.length} skills, ${mdFiles.length} markdown files.`
  );
  process.exit(1);
}

function fail(from, target) {
  console.error(`UNRESOLVED: ${relative(root, from)} -> ${target}`);
  errors++;
}

for (const file of mdFiles) {
  const base = dirname(file);
  const sroot = skillRootOf(file);
  const text = readFileSync(file, "utf-8").replaceAll("\r\n", "\n");

  // 1. Relative markdown links
  for (const m of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^[a-z]+:/i.test(target) || target.startsWith("/")) continue;
    // Bare words and hyphenated words ("url", "feature-name") are prompt-template slots, not paths.
    if (/^[A-Za-z][A-Za-z0-9-]*$/.test(target)) continue;
    let decoded = target;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      fail(file, `${target} (malformed percent-encoding)`);
      continue;
    }
    if (!existsSync(resolve(base, decoded))) {
      fail(file, target);
    }
  }

  // 2. Backtick conventional paths
  for (const m of text.matchAll(/`(references|playbooks|scripts)\/[A-Za-z0-9._/-]+`/g)) {
    const ref = m[0].slice(1, -1);
    if (!existsSync(resolve(sroot, ref)) && !existsSync(resolve(base, ref))) {
      fail(file, `${ref} (backtick)`);
    }
  }
}

console.log(`Checked ${mdFiles.length} markdown files under pstack/skills.`);
if (errors > 0) {
  console.error(`Reference check failed with ${errors} unresolved reference(s).`);
  process.exit(1);
}
console.log("All skill references resolve.");
