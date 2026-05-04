#!/usr/bin/env bun
import { Command } from "commander";

import { registerAndonCommands } from "./andon.ts";
import { registerCommentCommands } from "./comments.ts";
import { registerForensicsCommands } from "./forensics.ts";
import { registerInspectCommands } from "./inspect.ts";
import { registerTaskCommands } from "./task.ts";

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = new Command();

  program
    .name("orchestrate")
    .description(
      "Operate a single /orchestrate workspace: run the reconcile loop, inspect the task tree, spawn ad-hoc tasks, read handoffs, cancel/kill/respawn, or tail running agents."
    )
    .version("0.0.0");

  registerTaskCommands(program);
  registerInspectCommands(program);
  registerCommentCommands(program);
  registerAndonCommands(program);
  registerForensicsCommands(program);

  await program.parseAsync(argv);
}

if (import.meta.main) {
  await main();
}
