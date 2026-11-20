#!/usr/bin/env node

import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, posix, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const PSTACK = join(ROOT, "pstack");
export const SKILLS = join(PSTACK, "skills");
export const OUT = join(ROOT, "harness", "pstack");
export const AGY_OUT = join(OUT, "antigravity");
export const GITHUB = "https://github.com/cursor/plugins";

export const TERMS = [
  { key: "`Task`", re: /`Task`|\bTask (tool|subagent|call)/ },
  { key: "`AskQuestion`", re: /AskQuestion/ },
  { key: "todolist", re: /\btodo ?list\b/i },
  { key: "generalPurpose", re: /generalPurpose/ },
  { key: "poteto-agent", re: /poteto-agent/ },
  { key: "comment-sicko", re: /comment-sicko/ },
  { key: "`readonly: true`", re: /readonly: (true|false)|readonly\/Ask/ },
  { key: "`environment: \"cloud\"`", re: /environment: "(cloud|local)"/ },
  { key: "cloud_base_branch", re: /cloud_base_branch/ },
  { key: "`run_in_background: true`", re: /run_in_background/ },
  { key: "`resume`", re: /`resume`/ },
  { key: "`file_attachments`", re: /file_attachments/ },
  { key: "claude-", re: /\bclaude-[a-z]+-\d/ },
  { key: "grok-", re: /\bgrok-\d/ },
  { key: "gpt-", re: /\bgpt-\d/ },
  { key: "inherit-parent", re: /inherit-parent/ },
  { key: "pstack-models.mdc", re: /pstack-models\.mdc/ },
  { key: ".cursor/skills/", re: /\.cursor\/skills/ },
  { key: "~/.cursor/plugins/", re: /\.cursor\/plugins|\.cursor-plugin/ },
  { key: ".cursor/rules/", re: /\.cursor\/rules|always-applied rule/ },
  { key: "agent-transcripts", re: /agent-transcripts|\.cursor\/projects/ },
  { key: "Cursor-only features", re: /Bugbot|Cursor [Aa]utomation|cursor\.(sh|com)\/automations|[Cc]loud [Aa]gent|built-in PR tool/ },
];
export const ROUTE_KEY = "Run another pstack skill";
export const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const LINK_RE = /\]\(([^)\s]+)\)/g;

const AGY_ADAPTER = "docs/harness/antigravity.md";
const AGY_RUNNER = "docs/harness/run-external-agent.mjs";
const GUIDE = "docs/guide";

export function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === ".DS_Store" || name === "node_modules" || name === "__pycache__") return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export function file(path) {
  return { bytes: readFileSync(path), executable: (statSync(path).mode & 0o111) !== 0 };
}

export function analyzePstack(pstackDir = PSTACK) {
  const skillsDir = join(pstackDir, "skills");
  const skills = readdirSync(skillsDir).filter((name) => existsSync(join(skillsDir, name, "SKILL.md")));

  function classify(skill) {
    const dir = join(skillsDir, skill);
    const others = skills.filter((name) => name !== skill).join("|");
    const route = new RegExp(`the \\*\\*(?<bold>${others})\\*\\* skill|\`/(?<command>${others})\``, "g");
    const linksToSkill = (line, name) => line.includes(`(../${name}/`);
    const namesBareSkill = (line) =>
      [...line.matchAll(route)].some(({ groups }) => !linksToSkill(line, groups.bold ?? groups.command));
    const usesCursorNames = new Set();
    for (const path of walk(dir).filter((p) => p.endsWith(".md"))) {
      const text = readFileSync(path, "utf8");
      for (const term of TERMS) if (term.re.test(text)) usesCursorNames.add(term.key);
      if (text.split("\n").some(namesBareSkill)) usesCursorNames.add(ROUTE_KEY);
    }
    const text = readFileSync(join(dir, "SKILL.md"), "utf8");
    const wrap = usesCursorNames.size > 0 && /^# /m.test(text);
    return { usesCursorNames, wrap };
  }

  const classes = new Map(skills.map((skill) => [skill, classify(skill)]));
  const problems = [];
  const users = new Map();
  for (const [skill, { usesCursorNames, wrap }] of classes) {
    if (usesCursorNames.size > 0 && !wrap) problems.push(`skills/${skill}/SKILL.md uses Cursor names but has no H1`);
    for (const key of usesCursorNames) users.set(key, [...(users.get(key) ?? []), skill]);
    const frontmatter = readFileSync(join(skillsDir, skill, "SKILL.md"), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const name = frontmatter.match(/^name:(.*)$/m)?.[1].trim().replace(/^(["'])(.*)\1$/, "$2");
    if (name !== skill) problems.push(`skills/${skill}/SKILL.md has name ${JSON.stringify(name ?? "")}, not its folder name ${skill}`);
    if (!SKILL_NAME.test(skill) || skill.length > 64) {
      problems.push(`skills/${skill} is not lowercase words joined by hyphens, at most 64 characters`);
    }
  }
  return { skills, classes, problems, users };
}

export function resolvePstackPath(from, href, pstackDir = PSTACK) {
  const target = href.replace(/[#?].*/, "");
  if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return undefined;
  const path = posix.join(posix.dirname(from), target).replace(/\/$/, "");
  if (existsSync(join(pstackDir, path))) return path;
  const unmapped = path.replace(/^skills\/pstack-swarm(?=\/|$)/, "skills/swarm");
  return existsSync(join(pstackDir, unmapped)) ? path : undefined;
}

export function hasEntry(files, path) {
  return files.has(path) || [...files.keys()].some((key) => key.startsWith(`${path}/`));
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const [, rawFm, body] = match;
  const lines = rawFm.split("\n");
  const fields = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = line.match(/^([A-Za-z0-9_-]+):(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2].trim();
    if (value === ">-" || value === ">" || value === "|" || value === "|-") {
      const folded = [];
      while (i + 1 < lines.length && /^[ \t]+/.test(lines[i + 1])) {
        folded.push(lines[++i].trim());
      }
      value = folded.join(" ");
    } else if (value.startsWith('"') && value.endsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1).replace(/\\"/g, '"');
      }
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1).replace(/''/g, "'");
    }
    fields.push({ key, value, rawLine: line });
  }
  return { fields, body };
}

function transformSkillMarkdown(text, srcSkill, finalSkillName, wrap) {
  const parsed = parseFrontmatter(text);
  if (!parsed) {
    throw new Error(`skills/${srcSkill}/SKILL.md is missing valid YAML frontmatter`);
  }

  const dropped = new Set(["disable-model-invocation", "icon", "color"]);
  const hasDisableModelInvocation = parsed.fields.some(
    (f) => f.key === "disable-model-invocation" && f.value === "true",
  );

  const outLines = [];
  for (const field of parsed.fields) {
    if (dropped.has(field.key)) continue;
    if (field.key === "name") {
      outLines.push(`name: ${finalSkillName}`);
    } else if (field.key === "description") {
      let desc = field.value;
      if (srcSkill === "swarm") {
        desc = desc.replace(/\/swarm\b/g, "/pstack-swarm").replace(/'swarm this'/g, "'pstack-swarm this'");
      }
      if (hasDisableModelInvocation) {
        const guard =
          `Explicitly invoked skill: activate ONLY when the user explicitly writes /${finalSkillName} ` +
          `(or names '${finalSkillName}') in their message, or when another pstack skill routes to it; ` +
          `never auto-activate on ordinary prompts.`;
        desc = `${guard} ${desc}`;
      }
      outLines.push(`description: ${JSON.stringify(desc)}`);
    } else {
      outLines.push(field.rawLine);
    }
  }

  let body = parsed.body;
  if (wrap) {
    const adapterLine =
      `In Antigravity (agy), read [the Antigravity adapter](../../${AGY_ADAPTER}) once per session before you follow this skill. ` +
      "It maps the Cursor names, tools, models, and Plan/Execute phases in pstack skills to Antigravity.";
    body = body.replace(/^(# .*)\n+/m, `$1\n\n${adapterLine}\n\n`);
  }

  return `---\n${outLines.join("\n")}\n---\n${body}`;
}

function rewriteSwarmRefs(text) {
  return text
    .replace(/(\.\.?\/|(?:(?:\.\/)?skills\/))swarm(?=[\/)#?]|$)/g, "$1pstack-swarm")
    .replace(/(?<=^|[\s`(|"'>])\/swarm(?![\w/-])/gm, "/pstack-swarm")
    .replace(/'swarm this'/g, "'pstack-swarm this'")
    .replace(/the \*\*swarm\*\* skill/g, "the **pstack-swarm** skill")
    .replace(/\*\*swarm\*\*\./g, "**pstack-swarm**.")
    .replace(/`swarm`/g, "`pstack-swarm`");
}

function buildManifest(pstackDir) {
  const src = JSON.parse(readFileSync(join(pstackDir, "plugin.json"), "utf8"));
  return {
    name: src.name,
    displayName: "pstack (Poteto Stack)",
    version: src.version,
    description: src.description,
    logo: "assets/logo.png",
    suggestedPrompts: [
      "/poteto-mode investigate why this bug happens before fixing anything",
      "/poteto-mode build a small feature with a verification test",
      "/pstack-swarm check every package or test target in parallel and summarize",
    ],
    author: src.author,
    homepage: src.homepage,
    repository: src.repository,
  };
}

function buildPotetoAgent() {
  return `---
name: poteto-agent
description: Delegate subagent for code-writing and helper tasks spawned during a \`/poteto-mode\` run. Use for delegates, not as the runner for \`/poteto-mode\` itself. Spawn a fresh \`poteto-agent\` for each new task, and resume one only in the strict cases that poteto-mode's Subagents section names. Reads the \`poteto-mode\` skill's \`SKILL.md\` in full before any work, including its inline Principles index.
subagent: true
commandExecutionPolicy: auto
---

# Poteto subagent

You are operating as poteto-mode's full agent style. The chat that receives \`/poteto-mode\` owns the playbook, the todo list, and every \`invoke_subagent\` / \`run_workflow\` dispatch. You are one of its delegates.

Before doing any work:
1. Read [the Antigravity adapter](../docs/harness/antigravity.md) (or \`~/.gemini/config/plugins/pstack/docs/harness/antigravity.md\`) once per session.
2. Read the \`poteto-mode\` skill's \`SKILL.md\` in full, including its inline Principles index. Use the absolute path your parent gave you; with no path, check \`~/.gemini/config/plugins/pstack/skills/poteto-mode/SKILL.md\` or search \`~/.gemini/config/plugins/\` for a file whose path ends in \`skills/poteto-mode/SKILL.md\` (if multiple match, pick the highest \`version\` in \`plugin.json\`). If none exists, stop and tell your parent.
3. Navigate to a leaf \`principle-*\` skill whenever you apply that principle.
`;
}

function buildCommentSicko(pstackDir) {
  const src = readFileSync(join(pstackDir, "agents", "comment-sicko.md"), "utf8");
  const parsed = parseFrontmatter(src);
  if (!parsed) {
    throw new Error("agents/comment-sicko.md is missing valid YAML frontmatter");
  }
  const desc = parsed.fields.find((f) => f.key === "description")?.value ?? "";
  return `---\nname: comment-sicko\ndescription: ${JSON.stringify(desc)}\nsubagent: true\ncommandExecutionPolicy: auto\n---\n${parsed.body}`;
}

function buildDefaultRules() {
  return `# pstack model configuration (Antigravity)
# One line per role. Delete a line or set \`inherit\` to run on the parent conversation model.
# Built-in subagents (\`invoke_subagent\` / \`run_workflow\`) only accept: \`inherit\`, \`pro\`, \`flash\`, \`flash_lite\`.
# Cross-vendor specs (used when you ask for cross-vendor review/arena, or configured here):
#   - \`cli:codex\` or \`cli:codex:<model>\` (OpenAI Codex CLI)
#   - \`cli:claude\` or \`cli:claude:<model>[:<effort>]\` (Claude Code CLI, e.g. \`cli:claude:opus:xhigh\`, \`cli:claude:fable:high\`)
#   - \`swarm:<agy-model-slug>\` (Antigravity \`swarm\` tool, e.g. \`swarm:claude-opus-4-6-thinking\`)
#
# defaults: 3
# budget: large (inherit)
feature, refactoring: inherit
bug-fix: inherit
perf-issue: inherit
hillclimb: inherit
judgment and prose: inherit
arena runners: inherit, inherit, inherit
arena cross-judge pool: inherit
swarm workers: inherit
interrogate reviewers: inherit, inherit, inherit
`;
}

export function buildAntigravityFiles({
  pstack = PSTACK,
  skills,
  classes,
  users,
  github = GITHUB,
}) {
  const adapterPath = join(pstack, AGY_ADAPTER);
  if (!existsSync(adapterPath)) {
    throw new Error(`Missing Antigravity adapter: ${adapterPath}`);
  }
  const adapterText = readFileSync(adapterPath, "utf8");
  const missingTerms = [];
  for (const [key, using] of users) {
    if (!adapterText.includes(key)) {
      missingTerms.push(`Antigravity adapter has no row for ${key}, used by ${using.join(", ")}`);
    }
  }
  if (missingTerms.length > 0) {
    throw new Error(missingTerms.join("\n"));
  }

  const files = new Map();
  const skillsDir = join(pstack, "skills");

  for (const skill of skills) {
    const finalSkillName = skill === "swarm" ? "pstack-swarm" : skill;
    const { wrap } = classes.get(skill);
    for (const absPath of walk(join(skillsDir, skill))) {
      const relInsideSkill = relative(join(skillsDir, skill), absPath);
      const outPath = `skills/${finalSkillName}/${relInsideSkill}`;
      if (relInsideSkill === "SKILL.md") {
        const raw = readFileSync(absPath, "utf8");
        const transformed = transformSkillMarkdown(raw, skill, finalSkillName, wrap);
        files.set(outPath, { bytes: Buffer.from(transformed, "utf8"), executable: false });
      } else {
        files.set(outPath, file(absPath));
      }
    }
  }

  for (const absPath of walk(join(pstack, GUIDE))) {
    files.set(relative(pstack, absPath), file(absPath));
  }

  files.set(AGY_ADAPTER, file(adapterPath));
  files.set(AGY_RUNNER, { bytes: readFileSync(join(pstack, AGY_RUNNER)), executable: true });
  files.set("README.md", file(join(pstack, "README.md")));
  files.set("LICENSE", file(join(pstack, "LICENSE")));
  files.set("assets/logo.png", file(join(pstack, "assets", "logo.png")));
  files.set("plugin.json", {
    bytes: Buffer.from(`${JSON.stringify(buildManifest(pstack), null, 2)}\n`, "utf8"),
    executable: false,
  });
  files.set("agents/poteto-agent.md", {
    bytes: Buffer.from(buildPotetoAgent(), "utf8"),
    executable: false,
  });
  files.set("agents/comment-sicko.md", {
    bytes: Buffer.from(buildCommentSicko(pstack), "utf8"),
    executable: false,
  });
  files.set("rules/AGENTS.md", {
    bytes: Buffer.from(buildDefaultRules(), "utf8"),
    executable: false,
  });

  for (const [path, entry] of files) {
    if (!path.endsWith(".md")) continue;
    let text = entry.bytes.toString("utf8");
    if (path !== AGY_ADAPTER && path !== "rules/AGENTS.md") {
      text = rewriteSwarmRefs(text);
    }
    text = text.replace(LINK_RE, (link, href) => {
      const target = resolvePstackPath(path, href, pstack);
      if (!target || target.split("/")[0] === ".." || hasEntry(files, target)) return link;
      const srcTarget = target.replace(/^skills\/pstack-swarm(?=\/|$)/, "skills/swarm");
      const kind = statSync(join(pstack, srcTarget)).isDirectory() ? "tree" : "blob";
      return `](${github}/${kind}/main/pstack/${srcTarget}${href.slice(href.search(/[#?]|$/))})`;
    });
    entry.bytes = Buffer.from(text, "utf8");
  }

  const dangling = [];
  for (const [path, entry] of files) {
    if (!path.endsWith(".md")) continue;
    for (const [, href] of entry.bytes.toString("utf8").matchAll(LINK_RE)) {
      const target = resolvePstackPath(path, href, pstack);
      if (target && !hasEntry(files, target)) {
        dangling.push(`harness/pstack/antigravity/${path} links to ${href}, which is not in the tree`);
      }
    }
  }
  if (dangling.length > 0) {
    throw new Error(dangling.join("\n"));
  }

  return files;
}

function writeTree(dir, files) {
  rmSync(dir, { recursive: true, force: true });
  for (const [path, { bytes, executable }] of files) {
    const outPath = join(dir, path);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, bytes);
    chmodSync(outPath, executable ? 0o755 : 0o644);
  }
}

function checkTree(dir, files) {
  const onDisk = new Map(existsSync(dir) ? walk(dir).map((p) => [relative(dir, p), file(p)]) : []);
  return [...new Set([...files.keys(), ...onDisk.keys()])].sort().filter((path) => {
    const [want, have] = [files.get(path), onDisk.get(path)];
    return !want || !have || !want.bytes.equals(have.bytes) || want.executable !== have.executable;
  });
}

function readPreservedUserRules(targetDir, defaultRules = "") {
  const rulesPath = join(targetDir, "rules", "AGENTS.md");
  try {
    const currentRules = readFileSync(rulesPath, "utf8");
    if (currentRules.includes("# user-configured: true")) {
      return currentRules;
    }
    return defaultRules && currentRules !== defaultRules ? currentRules : null;
  } catch {
    return null;
  }
}

function pathExistsOrSymlink(targetPath) {
  try {
    lstatSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function installTree({ targetDir, preservedRules, useSymlink = false }) {
  mkdirSync(dirname(targetDir), { recursive: true });

  if (useSymlink && preservedRules !== null) {
    console.log(
      "Detected # user-configured: true in rules/AGENTS.md; installing as an isolated directory copy instead of a symlink to keep the generated tree clean.",
    );
    useSymlink = false;
  }

  if (useSymlink) {
    let needsLink = true;
    try {
      const stat = lstatSync(targetDir);
      if (stat.isSymbolicLink() && readlinkSync(targetDir) === AGY_OUT) {
        needsLink = false;
      } else {
        rmSync(targetDir, { recursive: true, force: true });
      }
    } catch {
      needsLink = true;
    }
    if (needsLink) {
      symlinkSync(AGY_OUT, targetDir, "dir");
    }
    console.log(`Installed symlink ${targetDir} -> ${AGY_OUT}`);
    return;
  }

  if (pathExistsOrSymlink(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  cpSync(AGY_OUT, targetDir, { recursive: true });
  console.log(`Installed copy to ${targetDir}`);

  if (preservedRules !== null) {
    const destRules = join(targetDir, "rules", "AGENTS.md");
    mkdirSync(dirname(destRules), { recursive: true });
    writeFileSync(destRules, preservedRules, "utf8");
    console.log("Preserved user-configured rules/AGENTS.md");
  }
}

function resolveInstallDirArg(argv) {
  const idx = argv.indexOf("--install-dir");
  if (idx !== -1 && idx + 1 < argv.length && argv[idx + 1]) {
    return resolve(argv[idx + 1]);
  }
  return join(homedir(), ".gemini", "config", "plugins", "pstack");
}

function main() {
  const analysis = analyzePstack(PSTACK);
  if (analysis.problems.length > 0) {
    for (const p of analysis.problems) console.log(`FAIL ${p}`);
    process.exit(1);
  }

  const files = buildAntigravityFiles({
    pstack: PSTACK,
    skills: analysis.skills,
    classes: analysis.classes,
    users: analysis.users,
    github: GITHUB,
  });

  const isCheck = process.argv.includes("--check");
  const isInstall = process.argv.includes("--install");
  const useSymlink = process.argv.includes("--symlink");
  const targetDir = resolveInstallDirArg(process.argv.slice(2));
  const defaultRules = files.get("rules/AGENTS.md")?.bytes.toString("utf8") ?? "";
  const preservedRules = isInstall ? readPreservedUserRules(targetDir, defaultRules) : null;

  if (isCheck) {
    const drifted = checkTree(AGY_OUT, files);
    for (const p of drifted.slice(0, 20)) console.log(`harness/pstack/antigravity/${p}`);
    if (drifted.length > 0) {
      console.log("harness/pstack/antigravity is out of date. Run `node scripts/generate-pstack-agy.mjs` and commit the result.");
      process.exit(1);
    }
    console.log("harness/pstack/antigravity is up to date.");
  } else {
    writeTree(AGY_OUT, files);
    console.log(`${analysis.skills.length} skills generated in harness/pstack/antigravity`);
  }

  if (isInstall) {
    installTree({ targetDir, preservedRules, useSymlink });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
