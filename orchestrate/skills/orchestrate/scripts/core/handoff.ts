import { renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RunResult } from "@cursor/sdk";

import type { FailureMode, TaskState, Verification } from "../schemas.ts";
import { FAILURE_MODE_VALUES, VERIFICATION_VALUES } from "../schemas.ts";

/**
 * Extract the worker's `## Branch` value. The SDK leaves
 * `RunResult.git.branches[i].branch` empty for worker runs, so the handoff
 * body is authoritative. Returns null on missing, empty, or `(no branch)`.
 * Callers fall back to `Run.git.branches[]` then `s.branch`.
 */
export function parseHandoffBranch(handoff: string): string | null {
  const match = /^##\s+Branch\s*\r?\n([^\r\n]*)/m.exec(handoff);
  if (!match) return null;
  const raw = match[1].trim();
  if (raw.length === 0) return null;
  if (raw.startsWith("##")) return null;
  // Worker template wraps the value in backticks (`agent/foo-abc1`); the
  // operator-facing hint also tolerates a bare branch name.
  const unwrapped = raw.replace(/^`([^`]+)`$/, "$1").trim();
  if (unwrapped.length === 0) return null;
  if (/^\(no branch\)$/i.test(unwrapped)) return null;
  return unwrapped;
}

/**
 * Precedence used by `waitAndHandoff`: `## Branch` line wins (SDK leaves
 * `Run.git.branches[].branch` empty for worker runs), then any non-empty
 * `Run.git.branches[].branch`, then `fallback` (still the placeholder
 * before the first successful handoff).
 */
export function resolveRunBranch(args: {
  handoffBody: string;
  runBranches: ReadonlyArray<{ branch?: string | null }>;
  fallback: string;
}): string {
  const fromBody = parseHandoffBranch(args.handoffBody);
  if (fromBody) return fromBody;
  for (const b of args.runBranches) {
    const trimmed = b.branch?.trim();
    if (trimmed) return trimmed;
  }
  return args.fallback;
}

/**
 * Extract a verification verdict from a handoff body. Reads the canonical
 * `## Verification` section first, then falls back to the legacy
 * `## Verdict pass | fail | inconclusive` shape. Legacy values map to the
 * most conservative new enum value:
 *
 *   pass         -> type-check-only  (verifier may not have run live UI)
 *   fail         -> verifier-failed
 *   inconclusive -> verifier-blocked
 *
 * Returns null when neither section is present, the value is empty, or it
 * isn't a recognized enum member. Tolerates backticks and CRLF the same
 * way `parseHandoffBranch` does.
 */
export function parseHandoffVerification(handoff: string): Verification | null {
  const fromCanonical = readSectionValue({ handoff, heading: "Verification" });
  if (fromCanonical) {
    const normalized = normalizeEnumValue(fromCanonical);
    if (isVerification(normalized)) return normalized;
    return null;
  }
  const fromLegacy = readSectionValue({ handoff, heading: "Verdict" });
  if (!fromLegacy) return null;
  return mapLegacyVerdict(fromLegacy);
}

export function parseHandoffFailureMode(handoff: string): FailureMode | null {
  const fromSection =
    readSectionValue({ handoff, heading: "Failure Mode" }) ??
    readSectionValue({ handoff, heading: "FailureMode" });
  const raw = fromSection ?? readKeyValue({ handoff, key: "failureMode" });
  if (!raw) return null;
  const normalized = normalizeEnumValue(raw);
  return isFailureMode(normalized) ? normalized : null;
}

export function parseHandoffPrNumber(handoff: string): number | null {
  for (const rawUrl of handoff.match(/https?:\/\/[^\s<>|)]+/g) ?? []) {
    const number = prNumberFromUrl(rawUrl);
    if (number !== null) return number;
  }
  const fromSection =
    readSectionValue({ handoff, heading: "PR" }) ??
    readSectionValue({ handoff, heading: "Pull Request" });
  if (!fromSection) return null;
  const number = Number.parseInt(fromSection.replace(/^#/, ""), 10);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function prNumberFromUrl(rawUrl: string): number | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  const pullIndex = parts.indexOf("pull");
  if (pullIndex < 0 || pullIndex + 1 >= parts.length) return null;
  if (url.hostname === "review.cursor.com") {
    if (parts[0] !== "github" || pullIndex !== 3) return null;
  } else if (url.hostname === "github.com") {
    if (pullIndex !== 2) return null;
  } else {
    return null;
  }
  const number = Number.parseInt(parts[pullIndex + 1], 10);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function readSectionValue(args: {
  handoff: string;
  heading: string;
}): string | null {
  const re = new RegExp(`^##\\s+${args.heading}\\s*\\r?\\n([^\\r\\n]*)`, "m");
  const match = re.exec(args.handoff);
  if (!match) return null;
  const raw = match[1].trim();
  if (raw.length === 0) return null;
  if (raw.startsWith("##")) return null;
  return raw.replace(/^`([^`]+)`$/, "$1").trim();
}

function readKeyValue(args: { handoff: string; key: string }): string | null {
  const re = new RegExp(`^${args.key}\\s*:\\s*([^\\r\\n]+)`, "im");
  const match = re.exec(args.handoff);
  if (!match) return null;
  const raw = match[1].trim();
  if (raw.length === 0) return null;
  return raw.replace(/^`([^`]+)`$/, "$1").trim();
}

function normalizeEnumValue(raw: string): string {
  return raw.toLowerCase().replace(/[\s_]+/g, "-");
}

function isFailureMode(value: string): value is FailureMode {
  return (FAILURE_MODE_VALUES as readonly string[]).includes(value);
}

function isVerification(value: string): value is Verification {
  return (VERIFICATION_VALUES as readonly string[]).includes(value);
}

function mapLegacyVerdict(raw: string): Verification | null {
  const normalized = normalizeEnumValue(raw);
  switch (normalized) {
    case "pass":
      return "type-check-only";
    case "fail":
      return "verifier-failed";
    case "inconclusive":
      return "verifier-blocked";
    default:
      return null;
  }
}

export function writeHandoff(args: {
  handoffsDir: string;
  task: TaskState;
  body: string;
  resultStatus: string;
  finishedAt: string;
}): string {
  const s = args.task;
  const path = join(args.handoffsDir, `${s.name}.md`);
  const header = `<!-- orchestrate handoff
task: ${s.name}
branch: ${s.branch}
agentId: ${s.agentId}
runId: ${s.runId}
resultStatus: ${args.resultStatus}
finishedAt: ${args.finishedAt}
-->\n\n`;
  // Non-"finished" runs don't produce the structured template; flag it so
  // downstream readers don't mis-parse the raw narrative.
  const banner =
    args.resultStatus === "finished"
      ? ""
      : `> ⚠️ Run ended with \`status=${args.resultStatus}\`. No structured handoff produced — the content below is the worker's raw output up to the point of failure.\n\n`;
  const tmp = `${path}.tmp`;
  writeFileSync(
    tmp,
    header + banner + (args.body || "_(empty final message)_\n")
  );
  renameSync(tmp, path);
  return path;
}

export function emptyErrorHandoffBody(args: {
  task: TaskState;
  result: RunResult;
  renderTemplate: (name: string, vars: Record<string, string>) => string;
}): string {
  const s = args.task;
  const rr = args.result;
  const agentId = s.agentId ?? "(unknown)";
  const runId = s.runId ?? rr.id;
  const resultData = {
    id: rr.id,
    status: rr.status,
    result: rr.result ?? null,
    durationMs: rr.durationMs ?? null,
    git: rr.git ?? null,
    model: rr.model ?? null,
  };
  return args.renderTemplate("empty-error-handoff", {
    agentId,
    runId,
    resultStatus: rr.status,
    resultDataJson: JSON.stringify(resultData, null, 2),
  });
}
