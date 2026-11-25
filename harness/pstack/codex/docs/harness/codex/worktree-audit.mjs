#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { realpath } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { readSessions, rolloutLines } from "./sessions.mjs";

const within = (cwd, root) => cwd === root || cwd.startsWith(join(root, sep));
const recent = (modifiedAt, now) =>
  Math.trunc((Math.floor(now / 1000) - Math.floor(modifiedAt / 1000)) / 86400) <= 4;

async function canonical(path) {
  const absolute = resolve(path);
  try {
    return await realpath(absolute);
  } catch (error) {
    if (error.code === "ENOENT") return absolute;
    throw error;
  }
}

function mentionsWorktree(value, paths) {
  if (typeof value === "string") {
    for (const path of paths) {
      for (let index = value.indexOf(path); index !== -1; index = value.indexOf(path, index + 1)) {
        const end = index + path.length;
        const next = value[end];
        if (next === undefined || /[\s/"'`;|&<>)\\]/.test(next)) return true;
      }
    }
    return false;
  }
  return value !== null && typeof value === "object" &&
    Object.values(value).some((child) => mentionsWorktree(child, paths));
}

export async function includeCodexActivity(output, sessions, now = Date.now(), repository) {
  const newestFirst = (await Promise.all(sessions.map(async (session) => ({
    ...session, cwd: await canonical(session.cwd),
  })))).sort((a, b) => b.modifiedAt - a.modifiedAt);
  const lines = output.split("\n");
  const rows = [];
  for (const [index, line] of lines.entries()) {
    if (!line || line.startsWith("#") || line.startsWith("SIZE\t")) continue;
    const fields = line.split("\t");
    if (fields.length !== 9) throw new Error("Unexpected worktree audit row; cleanup is unverified");
    const worktree = await canonical(fields[8]);
    const paths = [...new Set([resolve(fields[8]), worktree].flatMap((path) =>
      [path, JSON.stringify(path).slice(1, -1)]))];
    rows.push({ fields, worktree, paths, index, session: newestFirst.find(({ cwd }) => within(cwd, worktree)) });
  }
  const roots = rows.map(({ worktree }) => worktree);
  if (repository) roots.push(await canonical(repository));
  const scoped = new Set(newestFirst.filter(({ cwd }) => roots.some((root) => within(cwd, root))));
  const children = new Map();
  for (const session of newestFirst) {
    if (!session.parentId) continue;
    if (!children.has(session.parentId)) children.set(session.parentId, []);
    children.get(session.parentId).push(session);
  }
  for (const session of scoped) {
    for (const child of children.get(session.id) || []) scoped.add(child);
  }
  for (const session of newestFirst) {
    if (!scoped.has(session) || !recent(session.modifiedAt, now)) continue;
    const candidates = rows.filter((row) => !row.session || row.session.modifiedAt < session.modifiedAt);
    if (!candidates.length) continue;
    for await (const line of rolloutLines(session.path)) {
      let entry;
      try { entry = JSON.parse(line); } catch {
        throw new Error(`Invalid Codex rollout during worktree audit: ${session.path}`);
      }
      for (let i = candidates.length - 1; i >= 0; i--) {
        if (mentionsWorktree(entry, candidates[i].paths)) {
          candidates[i].session = session;
          candidates.splice(i, 1);
        }
      }
      if (!candidates.length) break;
    }
  }
  for (const { fields, index, session } of rows) {
    if (!session) continue;
    const date = new Date(session.modifiedAt);
    const day = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")].join("-");
    if (fields[6] === "-" || day > fields[6]) fields[6] = day;
    if (recent(session.modifiedAt, now) && ["safe", "review"].includes(fields[7])) {
      fields[7] = "verify-recent-chat";
    }
    lines[index] = fields.join("\t");
  }
  return lines.join("\n");
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values, positionals } = parseArgs({ allowPositionals: true, options: {
      home: { type: "string" }, base: { type: "string", short: "b" },
      help: { type: "boolean", short: "h" },
    } });
    if (positionals.length > 1) throw new Error("Expected at most one repository path");
    const script = fileURLToPath(new URL("../../../skills/poteto-mode/scripts/worktree-audit.sh", import.meta.url));
    const args = values.help ? ["--help"] : [
      ...(values.base ? ["-b", values.base] : []), ...positionals,
    ];
    const output = execFileSync("bash", [script, ...args], {
      encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], maxBuffer: 16 * 1024 * 1024,
    });
    if (values.help) {
      process.stdout.write(output + "\nCodex history: --home <codex-home> overrides CODEX_HOME.\n");
    } else {
      const worktrees = execFileSync("git", ["-C", positionals[0] || process.cwd(), "worktree", "list", "--porcelain"], { encoding: "utf8" });
      const main = worktrees.split("\n").find((line) => line.startsWith("worktree ")).slice("worktree ".length);
      process.stdout.write(await includeCodexActivity(output, await readSessions(values.home), Date.now(), main));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
