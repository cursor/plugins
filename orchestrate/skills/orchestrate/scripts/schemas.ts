import type { Run, SDKAgent } from "@cursor/sdk";
import { z } from "zod/v3";

import { PlanValidationError } from "./errors.ts";

export const TASK_NAME_RE = /^[a-z0-9-]+$/;

const taskNameSchema = z
  .string()
  .regex(TASK_NAME_RE, "must be kebab-case ascii");
const nonEmptyStringSchema = z.string().min(1);
const dateTimeSchema = z.string().datetime();
const nullableDateTimeSchema = dateTimeSchema.nullable().default(null);
const nullableStringSchema = z.string().nullable().default(null);
const nonVerifierVerifiesSchema = z
  .undefined({
    invalid_type_error: "is only valid when type is verifier",
  })
  .optional();
const deletedTrackerFields = new Set([
  "tracker",
  "linearTeam",
  "trackerRef",
  "parentTrackerRef",
  "controlRef",
  "slack",
]);

const TaskTypeSchema = z.enum(["worker", "subplanner", "verifier"]);
const TaskStatusSchema = z.enum([
  "pending",
  "running",
  "handed-off",
  "error",
  "cancelled",
  "pruned",
]);

// Ordered strongest claim first, then the two failure modes, then explicit
// absence. The verifier prompt has the canonical definitions; this list is
// the wire enum. Legacy `pass`/`fail`/`inconclusive` handoffs are migrated
// on read in `parseHandoffVerification` (scripts/core/handoff.ts).
const VerificationSchema = z.enum([
  "live-ui-verified",
  "unit-test-verified",
  "type-check-only",
  "verifier-blocked",
  "verifier-failed",
  "not-verified",
]);
const FailureModeSchema = z.enum([
  "cap-hit",
  "oom",
  "tool-error",
  "network-drop",
  "unknown",
]);

const wcLineParserSchema = z
  .object({
    kind: z.literal("wc-l"),
  })
  .strict();
const regexParserSchema = z
  .object({
    kind: z.literal("regex"),
    pattern: nonEmptyStringSchema.describe(
      "JavaScript regex applied to stdout. Capture group 1 is the value; if the regex has no capture group, the full match is used."
    ),
    flags: z
      .string()
      .regex(/^[gimsuy]*$/, "must be a subset of gimsuy")
      .optional()
      .describe("RegExp flags (default: empty)."),
  })
  .strict();

const MeasurementParserSchema = z.discriminatedUnion("kind", [
  wcLineParserSchema,
  regexParserSchema,
]);

const MeasurementSpecSchema = z
  .object({
    name: nonEmptyStringSchema.describe(
      "Identifier matched against the worker's `## Measurements` block, e.g. `LOC(packages/ui/src/Settings.tsx)` or `bundle size`. Must match the line prefix verbatim."
    ),
    command: nonEmptyStringSchema.describe(
      "Shell command executed under `bash -c` in a fresh checkout of the worker's branch."
    ),
    parser: MeasurementParserSchema.optional().describe(
      "How to extract a value from the command's stdout. Defaults to `wc-l` (count non-empty lines)."
    ),
    toleranceFraction: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        "Fractional drift tolerated for numeric comparisons (e.g. 0.10 = 10%). Defaults to 0.10. String values must match exactly."
      ),
  })
  .strict();

const planTaskBaseShape = {
  name: taskNameSchema.describe(
    "Kebab-case ASCII. Used in branch and agent-title."
  ),
  scopedGoal: nonEmptyStringSchema.describe(
    "Outcome for this task; write it as the only steering signal."
  ),
  brief: z
    .string()
    .optional()
    .describe("Markdown spec inlined into the spawn prompt."),
  pathsAllowed: z
    .array(z.string())
    .optional()
    .describe("Glob patterns the task may touch."),
  pathsForbidden: z
    .array(z.string())
    .optional()
    .describe("Glob patterns owned by siblings."),
  acceptance: z
    .array(z.string())
    .optional()
    .describe("Per-task acceptance checklist."),
  verify: z
    .string()
    .optional()
    .describe("Optional markdown verification plan."),
  startingRef: z
    .string()
    .optional()
    .describe("Branch the spawned cloud agent clones from."),
  dependsOn: z
    .array(taskNameSchema)
    .optional()
    .describe("Task names to wait on before spawning."),
  model: z
    .string()
    .optional()
    .describe("Model id for the spawned cloud agent."),
  maxAttempts: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Max logical spawn attempts."),
  openPR: z.boolean().optional().describe("Open a PR when the task completes."),
  measurements: z
    .array(MeasurementSpecSchema)
    .optional()
    .describe(
      "Quantitative checks the script re-runs against the worker's branch after handoff to catch drift between the worker's `## Measurements` self-report and the actual artifact."
    ),
  slackTs: z
    .string()
    .optional()
    .describe("Slack thread message ts for this task, set by the script."),
};

const WorkerTaskSchema = z
  .object({
    ...planTaskBaseShape,
    type: z.literal("worker"),
    verifies: nonVerifierVerifiesSchema,
  })
  .strict();

const SubplannerTaskSchema = z
  .object({
    ...planTaskBaseShape,
    type: z.literal("subplanner"),
    verifies: nonVerifierVerifiesSchema,
  })
  .strict();

const VerifierTaskSchema = z
  .object({
    ...planTaskBaseShape,
    type: z.literal("verifier"),
    verifies: z
      .string({ required_error: "is required" })
      .regex(TASK_NAME_RE, "must be kebab-case ascii")
      .describe("Name of the task this verifier checks."),
  })
  .strict();

const PlanTaskSchema = z.discriminatedUnion("type", [
  WorkerTaskSchema,
  SubplannerTaskSchema,
  VerifierTaskSchema,
]);

const PlanObjectSchema = z
  .object({
    $schema: z
      .string()
      .optional()
      .describe("Optional editor validation schema path."),
    goal: nonEmptyStringSchema.describe(
      "User goal, verbatim at every planner depth. Agent-facing full context."
    ),
    summary: z
      .string()
      .min(1)
      .optional()
      .describe(
        "One-line orientation for the human reading the Slack run thread. Kickoff falls back to a truncated `goal` when unset."
      ),
    dispatcher: z
      .object({
        firstName: nonEmptyStringSchema.describe(
          "Kickoff bot username (`<firstName>'s bot`). Resolved by the dispatcher CLI from --dispatcher-name or Slack lookupByEmail; planners don't author it."
        ),
      })
      .strict()
      .optional()
      .describe("Who launched this run. Set by the dispatcher CLI."),
    rootSlug: taskNameSchema.describe(
      "Kebab-case ASCII slug used in branch names."
    ),
    baseBranch: nonEmptyStringSchema.describe(
      "Default startingRef for tasks that don't specify their own."
    ),
    prBase: nonEmptyStringSchema
      .optional()
      .describe("PR base for tasks with openPR (defaults to baseBranch)."),
    repoUrl: z
      .string()
      .url()
      .describe("GitHub URL of the repo cloud agents should operate on."),
    acceptanceCriteria: z
      .array(z.string())
      .optional()
      .describe("Planner-level acceptance checklist."),
    syncStateToGit: z
      .boolean()
      .default(true)
      .describe("Commit and push plan/state/handoffs on status transitions."),
    slackChannel: nonEmptyStringSchema
      .optional()
      .describe(
        "Slack channel id for run visibility. Set from --slack-channel or SLACK_CHANNEL_ID by kickoff or the first root run."
      ),
    slackKickoffRef: z
      .object({
        channel: nonEmptyStringSchema,
        ts: nonEmptyStringSchema,
      })
      .strict()
      .optional()
      .describe(
        "Root Slack message for the run thread. Set by the script after the first kickoff post; planners do not author it."
      ),
    andonStateRef: z
      .string()
      .optional()
      .describe(
        "Git ref whose state.json carries the root-polled Andon state."
      ),
    andonStatePath: z
      .string()
      .optional()
      .describe(
        "Repo-relative path to the root state.json carrying Andon state."
      ),
    selfAgentId: z
      .string()
      .optional()
      .describe("This planner's cloud agent id."),
    tasks: z
      .array(PlanTaskSchema)
      .optional()
      .describe("Planner-authored task definitions."),
  })
  .strict();

export const PlanSchema = PlanObjectSchema.superRefine((plan, ctx) => {
  const tasks = plan.tasks ?? [];
  if (tasks.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["tasks"],
      message: "must be a non-empty array",
    });
  }

  const names = new Set<string>();
  for (const [index, task] of tasks.entries()) {
    if (names.has(task.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tasks", index, "name"],
        message: `duplicate task name: ${task.name}`,
      });
    }
    names.add(task.name);
  }

  const byName = new Map(tasks.map(task => [task.name, task]));
  for (const [index, task] of tasks.entries()) {
    if (task.type === "verifier") {
      if (task.verifies === task.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tasks", index, "verifies"],
          message: "verifier task cannot verify itself",
        });
      }
      if (!byName.has(task.verifies)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tasks", index, "verifies"],
          message: `verifies unknown task: ${task.verifies}`,
        });
      }
    }

    for (const dep of normalizedDependsOn(task)) {
      if (!names.has(dep)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tasks", index, "dependsOn"],
          message: `dependsOn unknown task: ${dep}`,
        });
      }
      if (dep === task.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tasks", index, "dependsOn"],
          message: "task dependsOn itself",
        });
      }
    }
  }

  const color = new Map<string, "white" | "gray" | "black">(
    tasks.map(task => [task.name, "white"])
  );
  const visit = (name: string, path: string[]): void => {
    const current = color.get(name);
    if (current === "gray") {
      const cycle = [...path.slice(path.indexOf(name)), name];
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tasks"],
        message: `dependsOn cycle: ${cycle.join(" -> ")}`,
      });
      return;
    }
    if (current === "black") return;
    color.set(name, "gray");
    const task = byName.get(name);
    if (task) {
      for (const dep of normalizedDependsOn(task)) {
        if (byName.has(dep)) visit(dep, [...path, name]);
      }
    }
    color.set(name, "black");
  };
  for (const task of tasks) visit(task.name, []);
});

export const AndonSchema = z
  .object({
    raisedAt: dateTimeSchema.optional(),
    raisedBy: z.string().optional(),
    reason: z.string().optional(),
    cleared: z.boolean().optional(),
    clearedAt: dateTimeSchema.optional(),
    clearedBy: z.string().optional(),
    clearNote: z.string().optional(),
    lastCheckedAt: dateTimeSchema,
  })
  .strict()
  .describe("Current state of the Andon cord.");

const TaskStateSchema = z
  .object({
    name: taskNameSchema,
    type: TaskTypeSchema,
    branch: z.string(),
    startingRef: z.string(),
    dependsOn: z.array(taskNameSchema),
    agentId: nullableStringSchema,
    runId: nullableStringSchema,
    parentAgentId: nullableStringSchema.describe(
      "Planner agent id that spawned this row."
    ),
    status: TaskStatusSchema.describe(
      "pending -> running -> handed-off; error on hard failure; cancelled by operator; pruned if removed from plan.json."
    ),
    resultStatus: nullableStringSchema.describe(
      "The cloud run's RunResult.status."
    ),
    handoffPath: nullableStringSchema.describe(
      "Relative path to the collected handoff markdown."
    ),
    startedAt: nullableDateTimeSchema,
    finishedAt: nullableDateTimeSchema,
    lastUpdate: nullableDateTimeSchema,
    note: nullableStringSchema,
    adHoc: z
      .boolean()
      .optional()
      .describe("True if this task was added outside plan.json."),
    attempts: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Count of logical spawn attempts."),
    slackTs: nullableStringSchema.describe("Slack task message ts."),
    slackRendered: z
      .object({
        emoji: z.string(),
        summary: z.string(),
      })
      .strict()
      .optional()
      .describe("Last rendered Slack status tuple for no-op update guards."),
    prNumber: z
      .number()
      .int()
      .positive()
      .nullable()
      .default(null)
      .describe("Pull request number opened by this task, when known."),
    failureMode: FailureModeSchema.nullable()
      .default(null)
      .describe("Parsed terminal failure class for Slack and triage."),
    verification: VerificationSchema.nullable()
      .default(null)
      .describe(
        "Verification quality claimed for this task's deliverable. Parsed from the handoff body's `## Verification` line on handoff (verifiers set this for their target's deliverable; workers and subplanners may self-report). Null until set."
      ),
  })
  .strict();

export const StateSchema = z
  .object({
    rootSlug: taskNameSchema,
    tasks: z.array(TaskStateSchema),
    attention: z.array(
      z
        .object({
          at: dateTimeSchema,
          message: z.string(),
        })
        .strict()
    ),
    andon: AndonSchema.optional(),
  })
  .strict();

const sdkAgentSchema = z.custom<SDKAgent>(() => true);
const runSchema = z.custom<Run>(() => true);

const SpawnResultSchema = z
  .object({
    kind: z.literal("spawned"),
    agent: sdkAgentSchema,
    run: runSchema,
    s: TaskStateSchema,
  })
  .strict();

const RecoverResultSchema = z
  .object({
    kind: z.literal("recovered"),
    run: runSchema,
    s: TaskStateSchema,
  })
  .strict();

const CancelledStopResultSchema = z
  .object({
    name: taskNameSchema,
    action: z.literal("cancelled"),
  })
  .strict();
const PrunedStopResultSchema = z
  .object({
    name: taskNameSchema,
    action: z.literal("pruned"),
  })
  .strict();
const NoopStopResultSchema = z
  .object({
    name: taskNameSchema,
    action: z.literal("noop"),
    previousStatus: TaskStatusSchema,
  })
  .strict();
export const StopResultSchema = z.discriminatedUnion("action", [
  CancelledStopResultSchema,
  PrunedStopResultSchema,
  NoopStopResultSchema,
]);

const TreeTaskSchema = z
  .object({
    name: taskNameSchema,
    type: TaskTypeSchema,
    status: TaskStatusSchema,
    agentId: nullableStringSchema,
    runId: nullableStringSchema,
    parentAgentId: nullableStringSchema,
  })
  .passthrough();
const TreeStateSchema = z
  .object({
    rootSlug: z.unknown().optional(),
    tasks: z.array(z.unknown()).default([]),
  })
  .passthrough();

export type TaskType = z.infer<typeof TaskTypeSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type FailureMode = z.infer<typeof FailureModeSchema>;
export type Verification = z.infer<typeof VerificationSchema>;
export const FAILURE_MODE_VALUES = FailureModeSchema.options;
export const VERIFICATION_VALUES = VerificationSchema.options;
export type MeasurementParser = z.infer<typeof MeasurementParserSchema>;
export type MeasurementSpec = z.infer<typeof MeasurementSpecSchema>;
export type PlanTask = z.infer<typeof PlanTaskSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type TaskState = z.infer<typeof TaskStateSchema>;
export type Andon = z.infer<typeof AndonSchema>;
export type State = z.infer<typeof StateSchema>;
export type SpawnResult = z.infer<typeof SpawnResultSchema>;
export type RecoverResult = z.infer<typeof RecoverResultSchema>;
export type StopResult = z.infer<typeof StopResultSchema>;
export type TreeTask = z.infer<typeof TreeTaskSchema>;
export interface TreeState {
  rootSlug: string | null;
  tasks: TreeTask[];
}

export function parsePlanJson(text: string, source: string): Plan {
  return parseJsonWithSchema({
    schema: PlanSchema,
    text,
    source,
    recoveryHint: "Fix the offending fields before running orchestrate again.",
    rejectDeletedTrackerFields: true,
  });
}

export function parsePlanValue(value: unknown, source: string): Plan {
  return parseUnknownWithSchema({
    schema: PlanSchema,
    value,
    source,
    recoveryHint: "Fix the offending fields before running orchestrate again.",
    rejectDeletedTrackerFields: true,
  });
}

export function parsePlanTaskJson(text: string, source: string): PlanTask {
  return parseJsonWithSchema({
    schema: PlanTaskSchema,
    text,
    source,
    recoveryHint: "Fix the task definition before spawning.",
  });
}

export function parsePlanTaskValue(value: unknown, source: string): PlanTask {
  return parseUnknownWithSchema({
    schema: PlanTaskSchema,
    value,
    source,
    recoveryHint: "Fix the task definition before spawning.",
  });
}

export function parseStateJson(text: string, source: string): State {
  return parseJsonWithSchema({
    schema: StateSchema,
    text,
    source,
    recoveryHint: `Fix the offending fields or delete ${source} to start fresh.`,
    normalize: normalizeLegacyStateValue,
  });
}

export function parseTreeStateJson(text: string, source: string): TreeState {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new PlanValidationError(`${source} is not valid JSON: ${message}`);
  }
  const state = parseUnknownWithSchema({
    schema: TreeStateSchema,
    value: normalizeLegacyStateValue(value),
    source,
    recoveryHint: `Fix rootSlug/tasks enough to traverse ${source}.`,
  });
  const rootSlug = taskNameSchema.safeParse(state.rootSlug);
  return {
    rootSlug: rootSlug.success ? rootSlug.data : null,
    tasks: state.tasks.flatMap(task => {
      const parsed = TreeTaskSchema.safeParse(task);
      return parsed.success ? [parsed.data] : [];
    }),
  };
}

export function formatZodIssues(issues: z.ZodIssue[]): string {
  return issues
    .map(issue => `  ${formatIssuePath(issue.path)}: ${issue.message}`)
    .join("\n");
}

function parseJsonWithSchema<Schema extends z.ZodTypeAny>(args: {
  schema: Schema;
  text: string;
  source: string;
  recoveryHint: string;
  rejectDeletedTrackerFields?: boolean;
  normalize?: (value: unknown) => unknown;
}): z.output<Schema> {
  let value: unknown;
  try {
    value = JSON.parse(args.text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new PlanValidationError(
      `${args.source} is not valid JSON: ${message}`
    );
  }
  return parseUnknownWithSchema({
    ...args,
    value: args.normalize?.(value) ?? value,
  });
}

function parseUnknownWithSchema<Schema extends z.ZodTypeAny>(args: {
  schema: Schema;
  value: unknown;
  source: string;
  recoveryHint: string;
  rejectDeletedTrackerFields?: boolean;
}): z.output<Schema> {
  if (args.rejectDeletedTrackerFields) {
    rejectDeletedTrackerFields(args.value, args.source);
  }
  const parsed = args.schema.safeParse(args.value);
  if (parsed.success) return parsed.data;
  throw new PlanValidationError(
    `${args.source} failed zod validation:\n${formatZodIssues(parsed.error.issues)}\n\n${args.recoveryHint}`
  );
}

function rejectDeletedTrackerFields(value: unknown, source: string): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return;
  }
  const plan = value as Record<string, unknown>;
  const present = Object.keys(plan).filter(key =>
    deletedTrackerFields.has(key)
  );
  const taskHasTrackerRef =
    Array.isArray(plan.tasks) &&
    plan.tasks.some(
      task => typeof task === "object" && task !== null && "trackerRef" in task
    );
  if (taskHasTrackerRef) present.push("tasks[].trackerRef");
  if (present.length === 0) return;
  throw new PlanValidationError(
    `${source} uses removed plan field(s): ${[...new Set(present)].join(", ")}.\n\nDrop plan.slack. Use plan.slackChannel for run visibility; the script writes plan.slackKickoffRef after the first kickoff. For external trackers, agents call MCPs directly at runtime.`
  );
}

function normalizeLegacyStateValue(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  const state = value as Record<string, unknown>;
  if (!Array.isArray(state.tasks)) return value;
  return {
    ...state,
    tasks: state.tasks.map(task => {
      if (typeof task !== "object" || task === null || Array.isArray(task)) {
        return task;
      }
      const { trackerRef: _trackerRef, ...rest } = task as Record<
        string,
        unknown
      >;
      return rest;
    }),
  };
}

function normalizedDependsOn(task: PlanTask): string[] {
  const deps = [...(task.dependsOn ?? [])];
  if (task.type === "verifier" && !deps.includes(task.verifies)) {
    deps.unshift(task.verifies);
  }
  return deps;
}

function formatIssuePath(path: (string | number)[]): string {
  if (path.length === 0) return "(root)";
  return path.reduce<string>((out, part) => {
    if (typeof part === "number") return `${out}[${part}]`;
    return out ? `${out}.${part}` : part;
  }, "");
}
