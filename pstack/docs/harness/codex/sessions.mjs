#!/usr/bin/env node

import { createReadStream, existsSync, realpathSync } from "node:fs";
import { once } from "node:events";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import * as zlib from "node:zlib";

async function* rollouts(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* rollouts(path);
    else if (entry.isFile() && /\.jsonl(?:\.zst)?$/.test(entry.name)) yield path;
  }
}

export async function* readRollout(path) {
  const compressed = path.endsWith(".zst");
  const [major, minor] = process.versions.node.split(".").map(Number);
  const safeZstd = (major === 24 && minor >= 22) || (major === 26 && minor >= 10) || major > 26;
  if (compressed && (!safeZstd || typeof zlib.createZstdDecompress !== "function")) {
    throw new Error(`Compressed Codex history requires Node.js 24.22+ (24.x) or 26.10+; ${process.versions.node} may silently omit Zstd frames or accept truncated data`);
  }
  const source = createReadStream(path);
  const decoded = compressed ? zlib.createZstdDecompress({ rejectGarbageAfterEnd: true }) : source;
  if (compressed) {
    source.on("error", (error) => decoded.destroy(error));
    source.pipe(decoded);
  }
  decoded.setEncoding("utf8");
  try {
    for await (const chunk of decoded) yield chunk;
  } catch (error) {
    throw new Error(`Cannot read Codex rollout ${path}: ${error.message}`);
  } finally {
    source.destroy();
    if (decoded !== source) decoded.destroy();
  }
}

export async function* rolloutLines(path) {
  let pending = "";
  for await (const chunk of readRollout(path)) {
    pending += chunk;
    let newline;
    while ((newline = pending.indexOf("\n")) !== -1) {
      yield pending.slice(0, newline);
      pending = pending.slice(newline + 1);
    }
  }
  if (pending) yield pending;
}

async function sessionMetadata(path) {
  for await (const line of rolloutLines(path)) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      throw new Error(`Invalid Codex session metadata: ${path}`);
    }
    const payload = entry?.payload;
    if (entry?.type !== "session_meta" || typeof payload?.id !== "string" ||
        typeof payload?.cwd !== "string" || !isAbsolute(payload.cwd)) {
      throw new Error(`Invalid Codex session metadata: ${path}`);
    }
    const subagent = payload.source?.subagent;
    const parentId = payload.parent_thread_id ?? subagent?.thread_spawn?.parent_thread_id;
    const { mtimeMs } = await stat(path);
    return {
      id: payload.id, cwd: resolve(payload.cwd), path, modifiedAt: mtimeMs,
      isSubagent: payload.source === "subagent" || subagent !== undefined,
      parentId: typeof parentId === "string" ? parentId : null,
    };
  }
  throw new Error(`Empty Codex rollout: ${path}`);
}

export async function readSessions(home = process.env.CODEX_HOME || join(homedir(), ".codex")) {
  const sessions = [];
  for (const directory of ["sessions", "archived_sessions"]) {
    for await (const path of rollouts(join(home, directory))) sessions.push(await sessionMetadata(path));
  }
  return sessions.sort((a, b) => b.modifiedAt - a.modifiedAt || a.path.localeCompare(b.path));
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: {
      cwd: { type: "string" }, id: { type: "string" }, home: { type: "string" },
      read: { type: "boolean" }, "include-subagents": { type: "boolean" },
    } });
    if (!values.cwd || !isAbsolute(values.cwd)) throw new Error("--cwd requires an absolute workspace path");
    if (values.read && !values.id) throw new Error("--read requires --id and --cwd");
    const sessions = await readSessions(values.home);
    const matching = sessions.filter((session) => session.cwd === resolve(values.cwd) &&
      (!values.id || session.id === values.id) &&
      (values.id || values["include-subagents"] || !session.isSubagent));
    if (values.read) {
      if (!matching.length) throw new Error("No matching Codex session in the requested workspace");
      for await (const chunk of readRollout(matching[0].path)) {
        if (!process.stdout.write(chunk)) await once(process.stdout, "drain");
      }
    } else {
      console.log(JSON.stringify(matching, null, 2));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
