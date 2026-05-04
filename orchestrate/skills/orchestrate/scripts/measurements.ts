import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { MeasurementParser, MeasurementSpec } from "./schemas.ts";

export const MEASUREMENT_DEFAULT_TOLERANCE = 0.1;
export const MEASUREMENT_COMMAND_TIMEOUT_MS = 5 * 60_000;
export const MEASUREMENT_CLONE_TIMEOUT_MS = 10 * 60_000;

export type MeasurementOp = "→" | "<=" | "<" | ">=" | ">" | "==";

const MEASUREMENT_OPS: readonly MeasurementOp[] = [
  "→",
  "<=",
  ">=",
  "==",
  "<",
  ">",
];

export interface MeasurementClaim {
  name: string;
  before: string;
  op: MeasurementOp;
  after: string;
}

export interface ParsedMeasurementsSection {
  /** True iff the worker explicitly wrote `(none)` for this section. */
  none: boolean;
  claims: MeasurementClaim[];
  unparsed: string[];
}

/**
 * Extract the `## Measurements` block from a worker handoff. Returns null when
 * the section is absent so callers can distinguish "worker omitted the
 * required section" from "(none) declared".
 */
export function parseHandoffMeasurements(
  handoff: string
): ParsedMeasurementsSection | null {
  const sectionRe =
    /^##\s+Measurements\s*\r?\n([\s\S]*?)(?=^##\s+|$(?![\r\n]))/m;
  const match = handoff.match(sectionRe);
  if (!match) return null;
  const body = match[1];
  const claims: MeasurementClaim[] = [];
  const unparsed: string[] = [];
  let sawNone = false;
  for (const raw of body.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    const stripped = trimmed.replace(/^[-*]\s*/, "").trim();
    if (/^\(none\)$/i.test(stripped)) {
      sawNone = true;
      continue;
    }
    const claim = parseMeasurementLine(stripped);
    if (claim) claims.push(claim);
    else unparsed.push(stripped);
  }
  return { none: sawNone && claims.length === 0, claims, unparsed };
}

export function parseMeasurementLine(line: string): MeasurementClaim | null {
  for (const op of MEASUREMENT_OPS) {
    const idx = findOperatorIndex(line, op);
    if (idx < 0) continue;
    const left = line.slice(0, idx).trim();
    const right = line.slice(idx + op.length).trim();
    const colon = left.lastIndexOf(":");
    if (colon < 0) continue;
    const name = left.slice(0, colon).trim();
    const before = left.slice(colon + 1).trim();
    if (!name || !before || !right) continue;
    return { name, before, op, after: right };
  }
  return null;
}

export function findOperatorIndex(line: string, op: MeasurementOp): number {
  // Match the operator only when surrounded by whitespace so that `<=` does
  // not collide with `<` and a name like `lines<10` is not split.
  let from = 0;
  while (true) {
    const idx = line.indexOf(op, from);
    if (idx < 0) return -1;
    const before = idx > 0 ? line[idx - 1] : " ";
    const after = idx + op.length < line.length ? line[idx + op.length] : " ";
    if (/\s/.test(before) && /\s/.test(after)) return idx;
    from = idx + op.length;
  }
}

export interface MeasurementCheck {
  name: string;
  command: string;
  measured: string;
  /** Numeric form of `measured`, when it parses as a finite number. */
  measuredNumeric: number | null;
  claim: MeasurementClaim | null;
  outcome:
    | "match"
    | "claim-missing"
    | "value-mismatch"
    | "command-failed"
    | "parse-failed";
  driftFraction: number | null;
  detail: string;
}

export interface MeasurementComparisonInput {
  spec: MeasurementSpec;
  measured: string;
  claim: MeasurementClaim | null;
}

/**
 * Compare a single re-measurement against the worker's claim. Numeric
 * comparisons use a fractional tolerance (default 10%) and require matching
 * unit suffixes ("2.41 MB" → "2.39 MB" passes; "2.41 MB" vs "2.39 KB" or
 * unit-only-on-one-side fails). String comparisons require exact match
 * after whitespace collapse.
 */
export function compareMeasurement(
  args: MeasurementComparisonInput
): MeasurementCheck {
  const tolerance =
    args.spec.toleranceFraction ?? MEASUREMENT_DEFAULT_TOLERANCE;
  const measured = args.measured.trim();
  const measuredNumeric = parseFiniteNumber(measured);
  const base = {
    name: args.spec.name,
    command: args.spec.command,
    measured,
    measuredNumeric,
  };
  if (!args.claim) {
    return {
      ...base,
      claim: null,
      outcome: "claim-missing",
      driftFraction: null,
      detail: `worker did not report a claim line named ${JSON.stringify(args.spec.name)}`,
    };
  }
  const measuredParsed = parseNumericWithUnit(measured);
  const claimParsed = parseNumericWithUnit(args.claim.after);
  if (measuredParsed && claimParsed) {
    if (measuredParsed.unit !== claimParsed.unit) {
      const detail =
        measuredParsed.unit !== null && claimParsed.unit !== null
          ? `unit mismatch; claimed ${claimParsed.unit}, measured ${measuredParsed.unit}`
          : `unit inconsistency; claimed ${args.claim.after}, measured ${measured}`;
      return {
        ...base,
        claim: args.claim,
        outcome: "value-mismatch",
        driftFraction: null,
        detail,
      };
    }
    const denom = Math.max(Math.abs(claimParsed.numeric), 1);
    const drift =
      Math.abs(measuredParsed.numeric - claimParsed.numeric) / denom;
    const outcome: MeasurementCheck["outcome"] =
      drift > tolerance ? "value-mismatch" : "match";
    return {
      ...base,
      claim: args.claim,
      outcome,
      driftFraction: drift,
      detail:
        outcome === "match"
          ? `numeric within tolerance (drift ${formatFraction(drift)} ≤ ${formatFraction(tolerance)})`
          : `numeric drift ${formatFraction(drift)} > tolerance ${formatFraction(tolerance)}; claimed ${args.claim.after}, measured ${measured}`,
    };
  }
  const matches =
    collapseWhitespace(measured) === collapseWhitespace(args.claim.after);
  return {
    ...base,
    claim: args.claim,
    outcome: matches ? "match" : "value-mismatch",
    driftFraction: null,
    detail: matches
      ? "string equality"
      : `string mismatch; claimed ${JSON.stringify(args.claim.after)}, measured ${JSON.stringify(measured)}`,
  };
}

interface NumericWithUnit {
  numeric: number;
  /** Trailing unit token (`MB`, `passing`, `%`, …) or null when absent. */
  unit: string | null;
}

/**
 * Parse a value like `2.41 MB`, `84 passing`, or `100` as a numeric +
 * optional unit pair. End-anchored: "1.2 MB extra" returns null so callers
 * fall through to string comparison instead of pretending it's numeric.
 */
function parseNumericWithUnit(value: string): NumericWithUnit | null {
  const match = /^([-+]?\d+(?:\.\d+)?)\s*([a-zA-Z%]+)?$/.exec(value.trim());
  if (!match) return null;
  const numeric = Number.parseFloat(match[1]);
  if (!Number.isFinite(numeric)) return null;
  return { numeric, unit: match[2] ?? null };
}

function parseFiniteNumber(value: string): number | null {
  // Used for the `measuredNumeric` display field: lenient leading-numeric
  // strip, separate from the end-anchored unit-aware comparison.
  const match = /^[-+]?\d+(?:\.\d+)?/.exec(value.trim());
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatFraction(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Shallow-clone the worker's branch into a fresh tmpdir so re-measurement
 * commands run against the actual artifact, not the planner's checkout.
 * Returns a `cleanup` to remove the dir; throws on clone failure.
 */
export function checkoutBranchForMeasurement(args: {
  branch: string;
  repoUrl: string;
}): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "orch-measure-"));
  try {
    execFileSync(
      "git",
      ["clone", "--depth", "1", "--branch", args.branch, args.repoUrl, dir],
      { stdio: "pipe", timeout: MEASUREMENT_CLONE_TIMEOUT_MS }
    );
  } catch (err) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failure on the failing-clone path
    }
    throw err;
  }
  return {
    dir,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort; leftovers in tmpdir are acceptable
      }
    },
  };
}

// Allowlist of env names carried into a measurement command. Worker-pushed
// code (`bun run …`, test scripts) executes in the cloned checkout, so a
// denylist by name leaks `HOME`, `AWS_PROFILE`, `NPM_CONFIG_*`, and other
// non-secret-named carriers that grant access to the operator's
// `~/.npmrc`, `~/.gitconfig`, `~/.aws/credentials`, etc. Allowlist instead,
// and inject a fresh scratch `HOME` so dotfile reads land on an empty dir.
const MEASUREMENT_ENV_ALLOW: ReadonlyArray<string> = [
  "PATH",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TZ",
  "TERM",
  "USER",
  "LOGNAME",
  "SHELL",
];

export function buildMeasurementEnv(args: {
  source: NodeJS.ProcessEnv;
  homeDir: string;
}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { HOME: args.homeDir };
  for (const key of MEASUREMENT_ENV_ALLOW) {
    const value = args.source[key];
    if (typeof value === "string") env[key] = value;
  }
  return env;
}

/**
 * Run a planner-authored measurement command via `bash -c` so the planner can
 * use pipes, redirects, and shell builtins. The planner is the trust boundary
 * for the *command string*, but the command executes against the worker's
 * branch, so its environment is reduced to a hardcoded allowlist plus a
 * fresh scratch `HOME`. `-c` (not `-lc`) skips `~/.bash_profile`/`~/.bashrc`
 * sourcing, which would otherwise re-export operator credentials the
 * allowlist just dropped. The scratch HOME is removed in `finally`.
 */
export function runMeasurementCommand(args: {
  command: string;
  cwd: string;
}): { ok: true; stdout: string } | { ok: false; reason: string } {
  const homeDir = mkdtempSync(join(tmpdir(), "orch-measure-home-"));
  try {
    const result = spawnSync("bash", ["-c", args.command], {
      cwd: args.cwd,
      timeout: MEASUREMENT_COMMAND_TIMEOUT_MS,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      shell: false,
      env: buildMeasurementEnv({ source: process.env, homeDir }),
    });
    if (result.error) {
      return { ok: false, reason: `spawn: ${result.error.message}` };
    }
    if (result.signal) {
      return { ok: false, reason: `killed by signal ${result.signal}` };
    }
    if (typeof result.status === "number" && result.status !== 0) {
      const stderr = truncate((result.stderr ?? "").trim(), 300);
      return {
        ok: false,
        reason: `exit=${result.status}${stderr.length > 0 ? `; stderr: ${stderr}` : ""}`,
      };
    }
    return { ok: true, stdout: result.stdout ?? "" };
  } finally {
    try {
      rmSync(homeDir, { recursive: true, force: true });
    } catch {
      // best-effort; leftover scratch dirs in tmpdir are acceptable
    }
  }
}

/**
 * Apply a measurement parser to command stdout. `wc-l` counts non-empty lines
 * (more robust than `wc -l`'s newline count when commands omit a trailing
 * newline). `regex` extracts capture group 1 (or the whole match when the
 * regex has no group). Returns the parsed value as a string so the comparison
 * stage owns numeric/string semantics uniformly.
 */
export function applyMeasurementParser(
  parser: MeasurementParser | undefined,
  stdout: string
): { ok: true; value: string } | { ok: false; reason: string } {
  const kind = parser?.kind ?? "wc-l";
  switch (kind) {
    case "wc-l": {
      const count = stdout
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0).length;
      return { ok: true, value: String(count) };
    }
    case "regex": {
      if (!parser || parser.kind !== "regex") {
        return { ok: false, reason: "regex parser missing pattern" };
      }
      let re: RegExp;
      try {
        re = new RegExp(parser.pattern, parser.flags ?? "");
      } catch (err) {
        return {
          ok: false,
          reason: `invalid regex: ${errorMessage(err)}`,
        };
      }
      const match = stdout.match(re);
      if (!match) {
        return { ok: false, reason: "regex did not match command stdout" };
      }
      const captured = match[1] ?? match[0];
      return { ok: true, value: captured };
    }
    default: {
      const _exhaustive: never = kind;
      return { ok: false, reason: `unsupported parser: ${_exhaustive}` };
    }
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
