#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  mkdtempSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { join } from "node:path";

const usage = "Usage: node verify-plan.mjs <plan.md> [--status | --next | --final]";
const taskLine = /^- \[([ xX])\] ([A-Za-z0-9][A-Za-z0-9_-]*): (\S.*)$/;
const verifyLine = /^ {2,}Verify: `([^`]+)`\s*$/;

function parsePlan(source) {
  const lines = source.split(/(?<=\n)/);
  const text = lines.map((line) => line.replace(/\r?\n$/, ""));
  const starts = text.flatMap((line, index) => line.trimEnd() === "## Tasks" ? [index] : []);
  if (starts.length !== 1) throw new Error("Expected exactly one ## Tasks heading.");

  const tasks = new Map();
  for (let index = starts[0] + 1; index < lines.length && !/^#{1,2} /.test(text[index]); index++) {
    if (!text[index].trim()) continue;
    const task = text[index].match(taskLine);
    if (!task) throw new Error(`Line ${index + 1}: expected a task checkbox with an ID and title.`);
    const [, mark, id, title] = task;
    if (tasks.has(id)) throw new Error(`Duplicate task ID: ${id}.`);
    const command = text[index + 1]?.match(verifyLine)?.[1].trim();
    if (!command) throw new Error(`Task ${id} needs a Verify command on the next line.`);
    tasks.set(id, { id, title, command, index, done: mark !== " " });
    index++;
  }
  if (!tasks.size) throw new Error("The Tasks section has no tasks.");
  return { lines, tasks: [...tasks.values()] };
}

function runCheck({ id, command }) {
  console.log(`[${id}] ${command}`);
  const result = spawnSync(command, { shell: true, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`[${id}] FAIL (${result.signal ?? `exit ${result.status}`}).`);
  console.log(`[${id}] PASS`);
}

function recordPass(path, source, lines, task) {
  const lock = `${path}.verify-lock`;
  try {
    writeFileSync(lock, "", { flag: "wx" });
  } catch (error) {
    if (error.code === "EEXIST") throw new Error(`Another process is recording a check: ${lock}`);
    throw error;
  }

  try {
    if (readFileSync(path, "utf8") !== source) {
      throw new Error("Plan changed during verification. Review the current plan and rerun.");
    }
    lines[task.index] = lines[task.index].replace("- [ ] ", "- [x] ");
    const temporary = mkdtempSync(`${path}.verify-`);
    try {
      const updated = join(temporary, "plan.md");
      writeFileSync(updated, lines.join(""), { mode: statSync(path).mode & 0o777 });
      renameSync(updated, path);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
  } finally {
    rmSync(lock, { force: true });
  }
}

function main(args) {
  if (args.length === 1 && args[0] === "--help") {
    console.log(usage);
    return;
  }
  const [file, mode = "--status"] = args;
  if (!file || file.startsWith("-") || args.length > 2 || !["--status", "--next", "--final"].includes(mode)) {
    throw new Error(usage);
  }

  const path = realpathSync(file);
  const source = readFileSync(path, "utf8");
  const { lines, tasks } = parsePlan(source);
  const next = tasks.find((task) => !task.done);
  if (mode === "--status") {
    for (const task of tasks) {
      console.log(`[${task.done ? "x" : " "}] ${task.id}: ${task.title}${task === next ? " (next)" : ""}`);
    }
    return;
  }

  if (mode === "--final") {
    if (next) throw new Error(`Task ${next.id} is pending. Finish the plan before the final recheck.`);
    for (const task of tasks) runCheck(task);
    if (readFileSync(path, "utf8") !== source) throw new Error("Plan changed during the final recheck.");
    console.log(`Final recheck passed for ${tasks.length} tasks.`);
    return;
  }

  if (!next) {
    console.log("All tasks are checked. Run --final to recheck them.");
    return;
  }
  runCheck(next);
  recordPass(path, source, lines, next);
  console.log(`[${next.id}] Recorded in ${file}`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
