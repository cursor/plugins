import { renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { FailureMode, TaskState } from "../schemas.ts";
import { renderPromptTemplate } from "./prompts.ts";

// Cloud workers are capped around ~75 min wall time. The SDK doesn't
// surface the cap and the backend has drifted the exact ceiling before,
// so bound the window loosely.
const CAP_HIT_MIN_MS = 70 * 60 * 1000;
const CAP_HIT_MAX_MS = 80 * 60 * 1000;

const SDK_ERROR_MAX_CHARS = 500;
const RAW_SNIPPET_MAX_CHARS = 2_000;

export interface ClassifyFailureArgs {
  sdkError?: string | null;
  durationMs?: number | null;
  lastOutput?: string | null;
}

// OOM wins over cap-hit: an OOMKilled signal in the stream tail is a
// harder diagnostic than a terminal error that happened to land in the
// 70-80 min cap-hit window.
export function classifyFailureMode(args: ClassifyFailureArgs): FailureMode {
  const err = args.sdkError?.toLowerCase() ?? "";
  const tail = args.lastOutput?.toLowerCase() ?? "";
  const duration = args.durationMs ?? null;

  if (/out of memory|oomkilled|exit code 137/.test(tail)) return "oom";
  if (/out of memory|oomkilled|exit code 137/.test(err)) return "oom";

  if (
    duration != null &&
    duration >= CAP_HIT_MIN_MS &&
    duration <= CAP_HIT_MAX_MS
  ) {
    return "cap-hit";
  }

  if (err.length > 0) {
    if (/tool[_\s-]?use[_\s-]?failed|\btool[_\s-]?error\b/.test(err)) {
      return "tool-error";
    }
    if (
      /network|econn|etimedout|socket|dns|fetch failed|disconnect/.test(err)
    ) {
      return "network-drop";
    }
  }

  return "unknown";
}

export interface WriteFailureHandoffArgs {
  handoffsDir: string;
  task: TaskState;
  failureMode: FailureMode;
  sdkError?: string | null;
  lastActivityAt?: string | null;
  lastActivityNote?: string | null;
  lastToolCall?: string | null;
  terminatedAt: string;
}

export function writeFailureHandoff(args: WriteFailureHandoffArgs): string {
  const { task, failureMode, terminatedAt } = args;
  const path = join(args.handoffsDir, `${task.name}-failure.md`);
  const durationMs = computeDurationMs(task.startedAt, terminatedAt);
  const lastActivityAt = args.lastActivityAt ?? task.lastUpdate ?? null;
  const lastActivityNote = args.lastActivityNote ?? task.note ?? null;
  const body = renderPromptTemplate("failure-handoff", {
    taskName: task.name,
    branch: task.branch,
    agentId: task.agentId ?? "(unknown)",
    runId: task.runId ?? "(unknown)",
    failureMode,
    startedAt: task.startedAt ?? "(unknown)",
    terminatedAt,
    duration: durationMs != null ? `${durationMs}ms` : "(unknown)",
    lastActivityLine: formatLastActivityLine({
      at: lastActivityAt,
      note: lastActivityNote,
    }),
    lastToolCall: args.lastToolCall ?? "(unknown)",
    sdkError: truncate(args.sdkError ?? "(none recorded)", SDK_ERROR_MAX_CHARS),
    suggestions: failureModeSuggestions(failureMode)
      .map(s => `- ${s}`)
      .join("\n"),
  });
  atomicWrite(path, body);
  return path;
}

export interface WriteFinishedNoHandoffArgs {
  handoffsDir: string;
  task: TaskState;
  resultStatus: string;
  terminatedAt: string;
  rawBodySnippet?: string | null;
}

export function writeFinishedNoHandoff(
  args: WriteFinishedNoHandoffArgs
): string {
  const { task, resultStatus, terminatedAt } = args;
  const path = join(args.handoffsDir, `${task.name}-finished-no-handoff.md`);
  const snippet = (args.rawBodySnippet ?? "").trim();
  const rawSnippetBlock = snippet
    ? `\n\n## Raw final output (truncated)\n\n${truncate(snippet, RAW_SNIPPET_MAX_CHARS)}\n`
    : "";
  const body = renderPromptTemplate("finished-no-handoff", {
    taskName: task.name,
    branch: task.branch,
    agentId: task.agentId ?? "(unknown)",
    runId: task.runId ?? "(unknown)",
    resultStatus,
    terminatedAt,
    rawSnippetBlock,
  });
  atomicWrite(path, body);
  return path;
}

// Worker / subplanner templates use `## Status`; verifier templates use
// `## Verification`. Either heading proves the cloud agent emitted a
// structured handoff the planner can parse.
export function hasStructuredHandoff(body: string | null | undefined): boolean {
  if (!body) return false;
  return /^##\s+(Status|Verification)\s*$/m.test(body);
}

function failureModeSuggestions(mode: FailureMode): string[] {
  switch (mode) {
    case "cap-hit":
      return [
        "Retry with smaller scope (likely fix for cap-hit)",
        "Split the task into two workers with narrower pathsAllowed",
        "Abandon: skip task, replan around it",
      ];
    case "oom":
      return [
        "Retry with smaller scope (likely fix for oom)",
        "Retry with a leaner model if the current one is memory-heavy",
        "Abandon: skip task, replan around it",
      ];
    case "network-drop":
      return [
        "Retry as-is (treat as transient)",
        "Abandon: skip task, replan around it if retries keep dropping",
      ];
    case "tool-error":
      return [
        "Retry with different model (likely fix for tool-error)",
        "Retry as-is if the tool call looks recoverable",
        "Abandon: skip task, replan around it",
      ];
    case "unknown":
      return [
        "Retry as-is (treat as transient)",
        "Retry with smaller scope if this repeats",
        "Retry with different model if the same tool keeps failing",
        "Abandon: skip task, replan around it",
      ];
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

// Named-field arg so callers can't silently swap timestamp and note
// (both are `string | null`, identical from TS's POV).
function formatLastActivityLine(args: {
  at: string | null;
  note: string | null;
}): string {
  if (!args.at) return "(no activity recorded)";
  return args.note ? `${args.at} - ${args.note}` : args.at;
}

function computeDurationMs(
  startedAt: string | null | undefined,
  terminatedAt: string
): number | null {
  if (!startedAt) return null;
  const start = Date.parse(startedAt);
  const end = Date.parse(terminatedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const delta = end - start;
  return delta >= 0 ? delta : null;
}

// Atomic write so a crash mid-flush can't leave a truncated sidecar for
// the planner's next turn.
function atomicWrite(path: string, body: string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, body);
  renameSync(tmp, path);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
