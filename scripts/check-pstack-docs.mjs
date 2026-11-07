#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const roots = ["skills", "docs", "automations", "agents", "com.github.copilot", "dist/cursor", "dist/claude-code"];
const problems = [];
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.name === "node_modules" ? [] : entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
}
const files = [join(ROOT, "README.md"), ...roots.flatMap(dir => walk(join(ROOT, dir)))].filter(path => path.endsWith(".md"));
for (const path of files) {
  const text = readFileSync(path, "utf8");
  const reportFixture = /\/skills\/statechart\/scripts\/test\/corpus\/[^/]+\/report\.md$/.test(path);
  if (!reportFixture && !text.startsWith("---\n")) problems.push(`${path}: missing frontmatter`);
  for (const [, href] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^[a-z][a-z0-9+.-]*:|^#|[<>]/i.test(href)) continue;
    const target = resolve(dirname(path), decodeURI(href.split(/[?#]/)[0]));
    if (!existsSync(target)) problems.push(`${path}: missing link ${href}`);
    if (path.includes(`${join(ROOT, "dist")}/`)) {
      const clientRoot = join(ROOT, "dist", path.split("/dist/")[1].split("/")[0]);
      if (target !== clientRoot && !target.startsWith(clientRoot + "/")) problems.push(`${path}: link escapes distribution ${href}`);
    }
  }
  if (/harness\/pstack|pstack\/skills\/|pstack\/docs\//.test(text)) problems.push(`${path}: obsolete source path`);
}
for (const skill of readdirSync(join(ROOT, "skills"))) {
  const file = join(ROOT, "skills", skill, "SKILL.md");
  if (!existsSync(file) || !statSync(file).isFile()) continue;
  const text = readFileSync(file, "utf8");
  const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!frontmatter?.includes("description:")) problems.push(`${file}: missing description`);
  if (!text.includes("../../docs/core.md")) problems.push(`${file}: missing portable policy`);
}
if (problems.length) {
  console.error(problems.slice(0, 60).join("\n"));
  console.error(`${problems.length} documentation problems`);
  process.exitCode = 1;
} else console.log(`Checked ${files.length} Markdown files and packaged links.`);
