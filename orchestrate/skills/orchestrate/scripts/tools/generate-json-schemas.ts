#!/usr/bin/env bun

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod/v3";
import { zodToJsonSchema } from "zod-to-json-schema";

import { PlanSchema, StateSchema } from "../schemas.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = resolve(SCRIPT_DIR, "../../schemas");

writeSchema({
  path: "plan.schema.json",
  schema: PlanSchema,
  id: "https://cursor/orchestrate/plan.schema.json",
  title: "orchestrate plan.json",
  description:
    "Input to scripts/orchestrate.ts: planner-authored JSON consumed by the loop script.",
});

writeSchema({
  path: "state.schema.json",
  schema: StateSchema,
  id: "https://cursor/orchestrate/state.schema.json",
  title: "orchestrate state.json",
  description:
    "Written by scripts/orchestrate.ts. Live task rows; read-only unless you must edit by hand to unstick state.",
});

function writeSchema(args: {
  path: string;
  schema: z.ZodTypeAny;
  id: string;
  title: string;
  description: string;
}): void {
  const generated = zodToJsonSchema(args.schema, {
    $refStrategy: "none",
  });
  const generatedWithoutSchema = Object.fromEntries(
    Object.entries(generated).filter(([key]) => key !== "$schema")
  );
  const json = {
    $schema: generated.$schema,
    $id: args.id,
    title: args.title,
    description: args.description,
    ...generatedWithoutSchema,
  };
  writeFileSync(
    resolve(SCHEMA_DIR, args.path),
    `${JSON.stringify(json, null, 2)}\n`
  );
}
