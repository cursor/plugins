#!/usr/bin/env node

// Lists pstack's skills, playbooks, and agents from the tree and checks what pstack/README.md and pstack/docs/guide
// say about them: slash commands, relative links and anchors, the README tables, counts, and model names.
// Exits 1 when the docs drift from the tree.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PSTACK = join(ROOT, "pstack");
const GUIDE = "docs/guide";
const SETUP = join(PSTACK, "skills", "setup-pstack", "SKILL.md");

// Commands that ship with Cursor or Claude Code, not in this repository. Nothing here can verify them, so add a name
// only after a public Cursor or Claude Code doc shows it.
const EXTERNAL = new Set(["add-plugin", "autopilot", "create-skill", "in-cloud", "loop", "plugin"]);
const RENAMED = new Map([["babysit", "autopilot"]]);

const SMALL = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split(" ");
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
// "The twenty-three playbooks" claims the whole set. "Three playbooks scale it up" names a subset, so it is not checked.
const CLAIM = /\b(?:(all|has|of|ships|the|with) )?(\d+|[a-z]+(?:-[a-z]+)?) (short )?(skills|principles|playbooks|agents)\b/gi;
const SLASH = /(?<=^|[\s`(|"'>])\/(?:pstack:)?([a-z][a-z0-9-]*)(?![\w/<-])/gm;
const LINK = /\]\(([^)\s]+)\)/g;
const AGENT = /subagent_type: "([^"]+)"/g;
const MODEL_ID = /\b(?:claude-[a-z]+|grok|gpt)-\d(?:[\w.-]*\w)?/g;
const MODEL_PROSE = /\b(opus|sonnet|grok) (\d+(?:\.\d+)?)\b/gi;

function names(dir, keep) {
  return existsSync(dir) ? readdirSync(dir).filter((name) => keep(join(dir, name))).sort() : [];
}
const isSkill = (path) => existsSync(join(path, "SKILL.md"));
const isMarkdown = (path) => path.endsWith(".md") && statSync(path).isFile();

const skills = names(join(PSTACK, "skills"), isSkill);
const principles = skills.filter((name) => name.startsWith("principle-"));
const commands = skills.filter((name) => !name.startsWith("principle-"));
const playbooks = names(join(PSTACK, "skills", "poteto-mode", "playbooks"), isMarkdown).map((name) => name.slice(0, -3));
const agents = names(join(PSTACK, "agents"), isMarkdown).map((name) => name.slice(0, -3));
const teamKit = names(join(ROOT, "cursor-team-kit", "skills"), isSkill);
const docs = ["README.md", ...names(join(PSTACK, GUIDE), isMarkdown).map((name) => `${GUIDE}/${name}`)];
const text = new Map(docs.map((doc) => [doc, readFileSync(join(PSTACK, doc), "utf8")]));
const setup = readFileSync(SETUP, "utf8");

const problems = [];
const lineOf = (doc, index) => text.get(doc).slice(0, index).split("\n").length;
const fail = (doc, index, message) => problems.push(`${doc}:${lineOf(doc, index)} ${message}`);

function toNumber(word) {
  if (/^\d+$/.test(word)) return Number(word);
  const [tens, unit] = word.toLowerCase().split("-");
  if (unit === undefined && SMALL.includes(tens)) return SMALL.indexOf(tens);
  const ones = unit === undefined ? 0 : SMALL.indexOf(unit);
  return TENS.indexOf(tens) > 1 && ones >= 0 && ones < 10 ? TENS.indexOf(tens) * 10 + ones : undefined;
}

function anchors(path) {
  const seen = new Map();
  const found = new Set();
  let fenced = false;
  for (const line of readFileSync(join(PSTACK, path), "utf8").split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const heading = !fenced && line.match(/^#{1,6}\s+(.*?)\s*$/);
    if (!heading) continue;
    const plain = heading[1].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "");
    const slug = plain.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
    const repeat = seen.get(slug) ?? 0;
    seen.set(slug, repeat + 1);
    found.add(repeat ? `${slug}-${repeat}` : slug);
  }
  return found;
}

const expected = {
  skills: [skills.length, commands.length],
  principles: [principles.length],
  playbooks: [playbooks.length],
  agents: [agents.length],
};
const named = new Map(docs.map((doc) => [doc, new Set()]));
let slashes = 0;
let links = 0;

for (const [doc, body] of text) {
  for (const { 0: match, 1: whole, 2: word, 3: short, 4: noun, index } of body.matchAll(CLAIM)) {
    const claimed = toNumber(word);
    const kind = short ? "principles" : noun.toLowerCase();
    if ((whole || short) && claimed !== undefined && !expected[kind].includes(claimed)) {
      fail(doc, index, `says "${match}", but the tree has ${expected[kind].join(" or ")}`);
    }
  }
  for (const { 1: name, index } of body.matchAll(SLASH)) {
    slashes++;
    if (skills.includes(name)) named.get(doc).add(name);
    else if (RENAMED.has(name)) fail(doc, index, `names /${name}, which Cursor now ships as /${RENAMED.get(name)}`);
    else if (!teamKit.includes(name) && !EXTERNAL.has(name)) {
      fail(doc, index, `names /${name}, which no pstack skill, cursor-team-kit skill, or listed built-in provides`);
    }
  }
  for (const { 1: href, index } of body.matchAll(LINK)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
    links++;
    const [target, anchor] = href.split("#");
    const path = target ? posix.normalize(posix.join(posix.dirname(doc), target)).replace(/\/$/, "") : doc;
    const skill = path.match(/^skills\/([^/]+)\/SKILL\.md$/);
    if (skill) named.get(doc).add(skill[1]);
    if (!existsSync(join(PSTACK, path))) fail(doc, index, `links to ${href}, which does not exist`);
    else if (anchor && path.endsWith(".md") && !anchors(path).has(anchor)) {
      fail(doc, index, `links to ${href}, but ${path} has no heading with that anchor`);
    }
  }
  for (const { 1: name, index } of body.matchAll(AGENT)) {
    if (!agents.includes(name)) fail(doc, index, `names subagent_type "${name}", which pstack/agents does not ship`);
  }
  for (const { 0: id, index } of body.matchAll(MODEL_ID)) {
    if (!setup.includes(id)) fail(doc, index, `names model ${id}, which setup-pstack does not use`);
  }
  for (const { 0: match, 1: family, 2: version, index } of body.matchAll(MODEL_PROSE)) {
    const prefix = family.toLowerCase() === "grok" ? `grok-${version}` : `claude-${family.toLowerCase()}-${version.replace(".", "-")}`;
    if (!setup.includes(prefix)) fail(doc, index, `says "${match}", but setup-pstack has no ${prefix} default`);
  }
}

const readme = text.get("README.md");
for (const skill of skills) {
  if (!readme.includes(`(./skills/${skill}/SKILL.md)`)) problems.push(`README.md does not list skill ${skill}`);
}
for (const playbook of playbooks) {
  if (!readme.includes(`(./skills/poteto-mode/playbooks/${playbook}.md)`)) problems.push(`README.md does not list playbook ${playbook}`);
}
for (const agent of agents) {
  if (!readme.includes(`(./agents/${agent}.md)`)) problems.push(`README.md does not link agent ${agent}`);
}

const inDocs = new Set([...named.values()].flatMap((set) => [...set]));
const inGuide = new Set(docs.filter((doc) => doc !== "README.md").flatMap((doc) => [...named.get(doc)]));
const unnamed = commands.filter((name) => !inGuide.has(name));
console.log(
  `tree: ${skills.length} skills (${commands.length} commands, ${principles.length} principles), ` +
    `${playbooks.length} playbooks, ${agents.length} agents`,
);
console.log(
  `docs: ${docs.length} files, ${slashes} slash mentions, ${links} relative links, ` +
    `${commands.filter((name) => inDocs.has(name)).length} of ${commands.length} commands named, ` +
    `${commands.length - unnamed.length} of ${commands.length} in the guide`,
);
if (unnamed.length > 0) console.log(`note: the guide never names ${unnamed.map((name) => `/${name}`).join(", ")}`);
for (const problem of problems) console.log(`FAIL ${problem}`);
console.log(`${problems.length} problems`);
if (problems.length > 0) process.exit(1);
