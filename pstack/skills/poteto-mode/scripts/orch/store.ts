import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Dirent } from "node:fs";
import {
  access,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const UNIT_HEADER = "id\ttrack\tstate\tbranch\tpr\tsha\tbrief";
const LEDGER_HEADER = "pr\tsha\tverdict\tevidence\tverifier\tts";
const LOCK_FILE = ".orch.lock";

export type Verdict =
  | "live-ui-verified"
  | "unit-test-verified"
  | "type-check-only"
  | "verifier-blocked"
  | "verifier-failed";

export interface Unit {
  readonly id: string;
  readonly track: string;
  readonly state: string;
  readonly branch: string;
  readonly pr: string;
  readonly sha: string;
  readonly brief: string;
}

export interface LedgerEntry {
  readonly pr: string;
  readonly sha: string;
  readonly verdict: Verdict;
  readonly evidence: string;
  readonly verifier: string;
  readonly ts: string;
}

export interface InboxPointer {
  readonly ts: string;
  readonly agent: string;
  readonly unit: string;
  readonly status: string;
  readonly report: string;
}

export interface InboxPushResult {
  readonly pointer: InboxPointer;
  readonly filename: string;
}

export interface OpenGate {
  readonly kind: "open";
  readonly id: string;
  readonly question: string;
  readonly options: string;
  readonly defaultAnswer: string;
}

export interface ResolvedGate {
  readonly kind: "resolved";
  readonly id: string;
  readonly question: string;
  readonly options: string;
  readonly defaultAnswer: string;
  readonly answer: string;
}

export type Gate = OpenGate | ResolvedGate;

export type FrontierPrState = "OPEN" | "MERGED" | "CLOSED";

export interface FrontierPr {
  readonly pr: number;
  readonly branches: string;
  readonly sha: string;
  readonly state: FrontierPrState;
}

export interface Frontier {
  readonly generation: number;
  readonly prs: readonly FrontierPr[];
  readonly lowestUnmerged: number | null;
}

export interface StandingLine {
  readonly number: number;
  readonly line: string;
}

export type Counts = Readonly<Record<string, number>>;

export interface StatusSummary {
  readonly unitStates: Counts;
  readonly ledgerVerdicts: Counts;
  readonly frontierGeneration: number;
  readonly openGateIds: readonly string[];
}

export interface StatusReport {
  readonly units: readonly Unit[];
  readonly ledger: readonly LedgerEntry[];
  readonly frontier: Frontier;
  readonly gates: readonly Gate[];
  readonly summary: StatusSummary;
  readonly changed: string;
}

export interface AddUnitParams {
  readonly id: string;
  readonly track: string;
  readonly brief?: string;
}

export interface SetUnitParams {
  readonly id: string;
  readonly state: string;
  readonly branch?: string;
  readonly pr?: number;
  readonly sha?: string;
}

export interface ListUnitsParams {
  readonly state?: string;
  readonly track?: string;
}

export interface RecordLedgerParams {
  readonly pr: number;
  readonly sha: string;
  readonly verdict: Verdict;
  readonly evidence: string;
  readonly verifier?: string;
}

export interface CheckLedgerParams {
  readonly pr: number;
  readonly sha: string;
}

export interface PushInboxParams {
  readonly agent: string;
  readonly unit: string;
  readonly status: string;
  readonly report?: string;
}

export interface ParkGateParams {
  readonly id: string;
  readonly question: string;
  readonly options: string;
  readonly defaultAnswer: string;
}

export interface ResolveGateParams {
  readonly id: string;
  readonly answer: string;
}

export interface SetFrontierParams {
  readonly repo: string;
  readonly prs?: readonly number[];
}

export interface AddStandingParams {
  readonly line: string;
}

export interface OpenStoreOptions {
  readonly force?: boolean;
  readonly onLockStolen?: (holder: string) => void;
  readonly onStaleLock?: (holder: string) => void;
}

export interface Store {
  readonly units: {
    readonly add: (params: AddUnitParams) => Promise<Unit>;
    readonly set: (params: SetUnitParams) => Promise<Unit>;
    readonly get: (id: string) => Promise<Unit>;
    readonly list: (params?: ListUnitsParams) => Promise<readonly Unit[]>;
    readonly counts: () => Promise<Counts>;
  };
  readonly ledger: {
    readonly record: (params: RecordLedgerParams) => Promise<LedgerEntry>;
    readonly check: (params: CheckLedgerParams) => Promise<LedgerEntry>;
    readonly summary: () => Promise<Counts>;
  };
  readonly inbox: {
    readonly push: (params: PushInboxParams) => Promise<InboxPushResult>;
    readonly drain: () => Promise<readonly InboxPointer[]>;
    readonly peek: () => Promise<readonly InboxPointer[]>;
    readonly count: () => Promise<number>;
  };
  readonly gates: {
    readonly park: (params: ParkGateParams) => Promise<OpenGate>;
    readonly list: () => Promise<readonly OpenGate[]>;
    readonly resolve: (params: ResolveGateParams) => Promise<ResolvedGate>;
  };
  readonly frontier: {
    readonly set: (params: SetFrontierParams) => Promise<Frontier>;
    readonly show: () => Promise<Frontier>;
  };
  readonly standing: {
    readonly show: () => Promise<readonly StandingLine[]>;
    readonly add: (params: AddStandingParams) => Promise<StandingLine>;
  };
  readonly status: {
    readonly render: () => Promise<StatusReport>;
  };
  readonly init: () => Promise<{ readonly store: string }>;
  readonly close: () => Promise<void>;
}

export interface NotFoundOutput {
  readonly compact: string;
  readonly json: unknown;
}

export class UserError extends Error {}
export class UsageError extends UserError {}
export class NotFoundError extends UserError {
  public constructor(
    message: string,
    public readonly output?: NotFoundOutput
  ) {
    super(message);
  }
}

function errorCode(error: unknown): string | null {
  if (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function verdictOrNull(value: string): Verdict | null {
  switch (value) {
    case "live-ui-verified":
    case "unit-test-verified":
    case "type-check-only":
    case "verifier-blocked":
    case "verifier-failed":
      return value;
    default:
      return null;
  }
}

function frontierPrStateOrNull(value: unknown): FrontierPrState | null {
  switch (value) {
    case "OPEN":
    case "MERGED":
    case "CLOSED":
      return value;
    default:
      return null;
  }
}

export function parseVerdict(value: string): Verdict {
  const verdict = verdictOrNull(value);
  if (verdict === null) {
    throw new UserError(
      "verdict must be live-ui-verified, unit-test-verified, type-check-only, verifier-blocked, or verifier-failed"
    );
  }
  return verdict;
}

function cleanCell(value: string): string {
  const cleaned = value.replace(/[\t\n\r]/g, " ");
  return /^[=+\-@]/.test(cleaned) ? `'${cleaned}` : cleaned;
}

function requiredCell(value: string, label: string): string {
  const cleaned = cleanCell(value);
  if (cleaned.trim().length === 0) {
    throw new UserError(`${label} must not be empty`);
  }
  return cleaned;
}

function requiredLine(value: string, label: string): string {
  const cleaned = value.replace(/[\n\r]/g, " ").trim();
  if (cleaned.length === 0) {
    throw new UserError(`${label} must not be empty`);
  }
  return cleaned;
}

function positiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new UserError(`${label} must be a positive integer`);
  }
  return value;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (errorCode(error) === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function atomicWrite(path: string, contents: string): Promise<void> {
  const temporary = join(
    dirname(path),
    `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`
  );
  try {
    await writeFile(temporary, contents, { flag: "wx" });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function writeIfMissing(path: string, contents: string): Promise<void> {
  if (!(await exists(path))) {
    await atomicWrite(path, contents);
  }
}

async function requiredFile(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") {
      throw new UserError(
        `store is not initialized at ${dirname(path)}; run orch init`
      );
    }
    throw error;
  }
}

function holderIsDead(holder: string): boolean {
  const pid = Number.parseInt(holder, 10);
  if (!Number.isSafeInteger(pid) || pid <= 0 || String(pid) !== holder) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return errorCode(error) === "ESRCH";
  }
}

async function acquireLock(
  store: string,
  options: OpenStoreOptions
): Promise<() => Promise<void>> {
  const path = join(store, LOCK_FILE);
  const pid = String(process.pid);
  const create = async (): Promise<void> => {
    const handle = await open(path, "wx");
    await handle.writeFile(`${pid}\n`);
    await handle.close();
  };

  const takeOver = async (): Promise<void> => {
    await unlink(path);
    try {
      await create();
    } catch (retryError) {
      if (errorCode(retryError) === "EEXIST") {
        const retryHolder =
          (await readFile(path, "utf8")).trim() || "unknown";
        throw new UserError(`store lock held by pid ${retryHolder}`);
      }
      throw retryError;
    }
  };

  try {
    await create();
  } catch (error) {
    if (errorCode(error) !== "EEXIST") {
      throw error;
    }
    let holder = "unknown";
    try {
      holder = (await readFile(path, "utf8")).trim() || "unknown";
    } catch {
      holder = "unknown";
    }
    if (holderIsDead(holder)) {
      options.onStaleLock?.(holder);
      await takeOver();
    } else if (options.force) {
      options.onLockStolen?.(holder);
      await takeOver();
    } else {
      throw new UserError(`store lock held by pid ${holder}`);
    }
  }

  return async (): Promise<void> => {
    try {
      if ((await readFile(path, "utf8")).trim() === pid) {
        await unlink(path);
      }
    } catch (error) {
      if (errorCode(error) !== "ENOENT") {
        throw error;
      }
    }
  };
}

async function readTsv(
  path: string,
  header: string,
  width: number
): Promise<readonly (readonly string[])[]> {
  const lines = (await requiredFile(path)).replace(/\r/g, "").split("\n");
  if (lines.shift() !== header) {
    throw new UserError(`${basename(path)} has an invalid header`);
  }
  return lines
    .filter((value) => value.length > 0)
    .map((value) => {
      const cells = value.split("\t");
      if (cells.length !== width) {
        throw new UserError(`${basename(path)} has a malformed row`);
      }
      return cells;
    });
}

async function writeTsv(
  path: string,
  header: string,
  rows: readonly (readonly string[])[]
): Promise<void> {
  const body = rows.map((row) => row.map(cleanCell).join("\t")).join("\n");
  await atomicWrite(path, `${header}\n${body}${body.length > 0 ? "\n" : ""}`);
}

async function readUnits(store: string): Promise<readonly Unit[]> {
  return (await readTsv(join(store, "units.tsv"), UNIT_HEADER, 7)).map(
    (row) => ({
      id: row[0] ?? "",
      track: row[1] ?? "",
      state: row[2] ?? "",
      branch: row[3] ?? "",
      pr: row[4] ?? "",
      sha: row[5] ?? "",
      brief: row[6] ?? "",
    })
  );
}

function unitCells(unit: Unit): readonly string[] {
  return [
    unit.id,
    unit.track,
    unit.state,
    unit.branch,
    unit.pr,
    unit.sha,
    unit.brief,
  ];
}

async function saveUnits(store: string, rows: readonly Unit[]): Promise<void> {
  await writeTsv(
    join(store, "units.tsv"),
    UNIT_HEADER,
    rows.map(unitCells)
  );
}

async function readLedger(store: string): Promise<readonly LedgerEntry[]> {
  return (await readTsv(join(store, "ledger.tsv"), LEDGER_HEADER, 6)).map(
    (row) => {
      const rawVerdict = row[2] ?? "";
      const verdict = verdictOrNull(rawVerdict);
      if (verdict === null) {
        throw new UserError(`ledger.tsv has invalid verdict ${rawVerdict}`);
      }
      return {
        pr: row[0] ?? "",
        sha: row[1] ?? "",
        verdict,
        evidence: row[3] ?? "",
        verifier: row[4] ?? "",
        ts: row[5] ?? "",
      };
    }
  );
}

function ledgerCells(row: LedgerEntry): readonly string[] {
  return [
    row.pr,
    row.sha,
    row.verdict,
    row.evidence,
    row.verifier,
    row.ts,
  ];
}

async function saveLedger(
  store: string,
  rows: readonly LedgerEntry[]
): Promise<void> {
  await writeTsv(
    join(store, "ledger.tsv"),
    LEDGER_HEADER,
    rows.map(ledgerCells)
  );
}

function pointerCells(pointer: InboxPointer): readonly string[] {
  return [
    pointer.ts,
    pointer.agent,
    pointer.unit,
    pointer.status,
    pointer.report,
  ];
}

async function readPointers(
  directory: string
): Promise<readonly InboxPointer[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (errorCode(error) === "ENOENT") {
      throw new UserError(
        `store is not initialized at ${dirname(directory)}; run orch init`
      );
    }
    throw error;
  }
  const result: InboxPointer[] = [];
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".tsv"))
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of files) {
    const raw = (await readFile(join(directory, entry.name), "utf8")).replace(
      /\r?\n$/,
      ""
    );
    const row = raw.split("\t");
    if (/[\r\n]/.test(raw) || row.length !== 5) {
      throw new UserError(`inbox pointer ${entry.name} is malformed`);
    }
    result.push({
      ts: row[0] ?? "",
      agent: row[1] ?? "",
      unit: row[2] ?? "",
      status: row[3] ?? "",
      report: row[4] ?? "",
    });
  }
  return result;
}

function renderGates(rows: readonly Gate[]): string {
  if (rows.length === 0) {
    return "";
  }
  const blocks = rows.map((gate) => {
    const answer =
      gate.kind === "resolved" ? `\n- Answer: ${gate.answer}` : "";
    return `## ${gate.id}

- Status: ${gate.kind}
- Question: ${gate.question}
- Options: ${gate.options}
- Default: ${gate.defaultAnswer}${answer}`;
  });
  return `# Gates\n\n${blocks.join("\n\n")}\n`;
}

async function readGates(store: string): Promise<readonly Gate[]> {
  const raw = (await requiredFile(join(store, "gates.md")))
    .replace(/\r/g, "")
    .trim();
  if (raw.length === 0) {
    return [];
  }
  const prefix = "# Gates\n\n## ";
  if (!raw.startsWith(prefix)) {
    throw new UserError("gates.md has an invalid heading");
  }
  const result: Gate[] = [];
  for (const block of raw.slice(prefix.length).split("\n\n## ")) {
    const lines = block.split("\n").filter((value) => value.length > 0);
    const id = lines.shift() ?? "";
    const fields = new Map<string, string>();
    for (const value of lines) {
      const match = /^- ([^:]+): (.*)$/.exec(value);
      if (match === null) {
        throw new UserError(`gates.md has a malformed gate ${id}`);
      }
      fields.set(match[1] ?? "", match[2] ?? "");
    }
    const status = fields.get("Status");
    const question = fields.get("Question");
    const options = fields.get("Options");
    const defaultAnswer = fields.get("Default");
    if (
      id.length === 0 ||
      question === undefined ||
      options === undefined ||
      defaultAnswer === undefined
    ) {
      throw new UserError(`gates.md has a malformed gate ${id}`);
    }
    if (status === "open") {
      result.push({ kind: "open", id, question, options, defaultAnswer });
    } else if (status === "resolved" && fields.has("Answer")) {
      result.push({
        kind: "resolved",
        id,
        question,
        options,
        defaultAnswer,
        answer: fields.get("Answer") ?? "",
      });
    } else {
      throw new UserError(`gates.md has invalid status ${status ?? ""}`);
    }
  }
  if (new Set(result.map((gate) => gate.id)).size !== result.length) {
    throw new UserError("gates.md has duplicate gate ids");
  }
  return result;
}

function parseFrontier(raw: string): Frontier {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new UserError("frontier.json is not valid JSON");
  }
  if (!isRecord(value)) {
    throw new UserError("frontier.json must contain an object");
  }
  if (Object.keys(value).length === 0) {
    return { generation: 0, prs: [], lowestUnmerged: null };
  }
  if (
    typeof value.generation !== "number" ||
    !Number.isSafeInteger(value.generation) ||
    value.generation < 0 ||
    !isUnknownArray(value.prs) ||
    !(
      value.lowestUnmerged === null ||
      (typeof value.lowestUnmerged === "number" &&
        Number.isSafeInteger(value.lowestUnmerged))
    )
  ) {
    throw new UserError("frontier.json has an invalid shape");
  }
  const prs: FrontierPr[] = [];
  for (const row of value.prs) {
    const state = isRecord(row)
      ? frontierPrStateOrNull(row.state)
      : null;
    if (
      !isRecord(row) ||
      typeof row.pr !== "number" ||
      !Number.isSafeInteger(row.pr) ||
      row.pr < 1 ||
      typeof row.branches !== "string" ||
      row.branches.length === 0 ||
      typeof row.sha !== "string" ||
      state === null
    ) {
      throw new UserError("frontier.json has an invalid PR row");
    }
    prs.push({
      pr: row.pr,
      branches: row.branches,
      sha: row.sha,
      state,
    });
  }
  return {
    generation: value.generation,
    prs,
    lowestUnmerged: value.lowestUnmerged,
  };
}

async function readFrontier(store: string): Promise<Frontier> {
  return parseFrontier(await requiredFile(join(store, "frontier.json")));
}

async function readStanding(
  store: string
): Promise<readonly StandingLine[]> {
  const raw = (await requiredFile(join(store, "preferences.md"))).replace(
    /\r/g,
    ""
  );
  if (raw.trim().length === 0) {
    return [];
  }
  const result: StandingLine[] = [];
  for (const value of raw.split("\n").filter((item) => item.length > 0)) {
    const match = /^([1-9]\d*)\. (.+)$/.exec(value);
    const number = Number(match?.[1] ?? 0);
    if (match === null || number !== result.length + 1) {
      throw new UserError("preferences.md has malformed numbering");
    }
    result.push({ number, line: match[2] ?? "" });
  }
  return result;
}

function countValues(values: readonly string[]): Counts {
  const result: Record<string, number> = {};
  for (const value of values) {
    result[value] = (result[value] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(result).sort(([left], [right]) =>
      left.localeCompare(right)
    )
  );
}

function summarize(
  unitRows: readonly Unit[],
  ledgerRows: readonly LedgerEntry[],
  currentFrontier: Frontier,
  gateRows: readonly Gate[]
): StatusSummary {
  return {
    unitStates: countValues(unitRows.map((unit) => unit.state)),
    ledgerVerdicts: countValues(ledgerRows.map((row) => row.verdict)),
    frontierGeneration: currentFrontier.generation,
    openGateIds: gateRows
      .filter((gate): gate is OpenGate => gate.kind === "open")
      .map((gate) => gate.id)
      .sort(),
  };
}

function countRecord(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) {
    return null;
  }
  const result: Record<string, number> = {};
  for (const [name, count] of Object.entries(value)) {
    if (
      typeof count !== "number" ||
      !Number.isSafeInteger(count) ||
      count < 0
    ) {
      return null;
    }
    result[name] = count;
  }
  return result;
}

function previousSummary(raw: string): StatusSummary | null {
  const match = /<!-- orch-summary (.+) -->/.exec(raw);
  if (match === null) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(match[1] ?? "");
  } catch {
    return null;
  }
  if (
    !isRecord(value) ||
    typeof value.frontierGeneration !== "number" ||
    !isUnknownArray(value.openGateIds)
  ) {
    return null;
  }
  const unitStates = countRecord(value.unitStates);
  const ledgerVerdicts = countRecord(value.ledgerVerdicts);
  const openGateIds = value.openGateIds.filter(
    (item): item is string => typeof item === "string"
  );
  if (
    unitStates === null ||
    ledgerVerdicts === null ||
    openGateIds.length !== value.openGateIds.length
  ) {
    return null;
  }
  return {
    unitStates,
    ledgerVerdicts,
    frontierGeneration: value.frontierGeneration,
    openGateIds,
  };
}

function changed(before: StatusSummary | null, after: StatusSummary): string {
  if (before === null) {
    return "first render";
  }
  const result: string[] = [];
  const groups: readonly {
    readonly label: string;
    readonly oldCounts: Counts;
    readonly newCounts: Counts;
  }[] = [
    {
      label: "units",
      oldCounts: before.unitStates,
      newCounts: after.unitStates,
    },
    {
      label: "ledger",
      oldCounts: before.ledgerVerdicts,
      newCounts: after.ledgerVerdicts,
    },
  ];
  for (const { label, oldCounts, newCounts } of groups) {
    const names = [
      ...new Set([...Object.keys(oldCounts), ...Object.keys(newCounts)]),
    ].sort();
    for (const name of names) {
      const oldCount = oldCounts[name] ?? 0;
      const newCount = newCounts[name] ?? 0;
      if (oldCount !== newCount) {
        result.push(`${label} ${name} ${oldCount}->${newCount}`);
      }
    }
  }
  if (before.frontierGeneration !== after.frontierGeneration) {
    result.push(
      `frontier generation ${before.frontierGeneration}->${after.frontierGeneration}`
    );
  }
  if (before.openGateIds.join("\0") !== after.openGateIds.join("\0")) {
    result.push(
      `open gates ${before.openGateIds.length}->${after.openGateIds.length}`
    );
  }
  return result.length === 0 ? "no derived changes" : result.join("; ");
}

function markdown(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function table(
  headers: readonly string[],
  rows: readonly (readonly string[])[]
): string {
  if (rows.length === 0) {
    return "(none)";
  }
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(markdown).join(" | ")} |`),
  ].join("\n");
}

function statusMarkdown(
  unitRows: readonly Unit[],
  ledgerRows: readonly LedgerEntry[],
  currentFrontier: Frontier,
  gateRows: readonly Gate[],
  currentSummary: StatusSummary
): string {
  return `# Orchestrate status

Generated: ${new Date().toISOString()}

## Units

States: ${countLine(currentSummary.unitStates)}

${table(
  ["ID", "Track", "State", "Branch", "PR", "SHA", "Brief"],
  unitRows.map(unitCells)
)}

## Verification ledger

Verdicts: ${countLine(currentSummary.ledgerVerdicts)}

${table(
  ["PR", "SHA", "Verdict", "Evidence", "Verifier", "Timestamp"],
  ledgerRows.map(ledgerCells)
)}

## Frontier

Generation: ${currentFrontier.generation}
Lowest unmerged: ${currentFrontier.lowestUnmerged ?? "none"}

${table(
  ["Branch", "PR", "SHA", "State"],
  currentFrontier.prs.map((row) => [
    row.branches,
    String(row.pr),
    row.sha,
    row.state,
  ])
)}

## Gates

${table(
  ["ID", "Status", "Question", "Options", "Default", "Answer"],
  gateRows.map((gate) => [
    gate.id,
    gate.kind,
    gate.question,
    gate.options,
    gate.defaultAnswer,
    gate.kind === "resolved" ? gate.answer : "",
  ])
)}

<!-- orch-summary ${JSON.stringify(currentSummary)} -->
`;
}

function countLine(value: Counts): string {
  const entries = Object.entries(value);
  return entries.length === 0
    ? "none"
    : entries.map(([name, count]) => `${name}=${count}`).join(", ");
}

const OPEN_GT_PR_STATUSES = new Set([
  "Trunk branch locked",
  "Changes requested",
  "Waiting on PRs in this stack to merge",
  "Waiting on downstack merge state",
  "Draft",
  "Required checks failed",
  "Undergoing failure detection",
  "Merge queue failed on current head commit",
  "Handed off to merge queue...",
  "Waiting on downstack",
  "Merge conflicts",
  "Needs reviewers",
  "Needs approvals",
  "Needs restack",
  "Queued to merge...",
  "Ready to merge",
  "Ready to merge as stack",
  "Rebasing...",
  "Waiting on CI...",
  "Stale, needs rebase onto trunk",
  "Unresolved comments",
  "Waiting on required CI",
  "Waiting to merge...",
]);

interface GtPullRequest {
  readonly pr: number;
  readonly state: FrontierPrState;
}

interface GtFrontierEntry extends GtPullRequest {
  readonly branches: string;
}

function parseGtPullRequest({
  branch,
  detail,
}: {
  branch: string;
  detail: string;
}): GtPullRequest {
  const match =
    /^(?:\[origin\] )?PR #([1-9]\d*)(?: \(([^)\r\n]+)\))?(?: .+)?$/.exec(
      detail
    );
  const pr = Number(match?.[1] ?? 0);
  if (match === null || !Number.isSafeInteger(pr)) {
    throw new UserError(
      `gt info output has an invalid PR row for branch ${branch}: ${detail}`
    );
  }
  const status = match[2];
  if (status === "Merged") {
    return { pr, state: "MERGED" };
  }
  if (status === "Closed") {
    return { pr, state: "CLOSED" };
  }
  if (status === undefined || OPEN_GT_PR_STATUSES.has(status)) {
    return { pr, state: "OPEN" };
  }
  throw new UserError(
    `gt info output has an unknown PR state for branch ${branch}: ${status}`
  );
}

function parseGtBranches(raw: string): readonly string[] {
  const branches: string[] = [];
  const lines = raw.replace(/\r/g, "").split("\n");
  for (const [index, line] of lines.entries()) {
    if (line.length === 0) {
      continue;
    }
    const branchMatch =
      /^(?:│ )*[◯◉] +([^\s]+)((?: \([^()\r\n]*\))*)$/.exec(line);
    if (branchMatch === null) {
      throw new UserError(
        `gt log short output has an unparseable line ${index + 1}: ${JSON.stringify(line)}`
      );
    }
    const branch = branchMatch[1] ?? "";
    if (branches.includes(branch)) {
      throw new UserError(
        `gt log short output contains duplicate branch ${branch}`
      );
    }
    branches.push(branch);
  }
  const trunk = branches[0];
  if (trunk === undefined) {
    throw new UserError("gt log short output did not contain a stack");
  }
  return branches.slice(1);
}

function graphitePullRequest({
  branch,
  repo,
}: {
  branch: string;
  repo: string;
}): GtPullRequest {
  let raw: string;
  try {
    raw = execFileSync("gt", ["--no-interactive", "info", branch], {
      cwd: repo,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new UserError(
      `gt info ${branch} failed: ${errorMessage(error)}`
    );
  }
  const rows = raw
    .replace(/\r/g, "")
    .split("\n")
    .filter(
      (line) =>
        line.startsWith("PR #") || line.startsWith("[origin] PR #")
    );
  if (rows.length === 0) {
    throw new UserError(
      `gt info output branch ${branch} has no pull request; this clone's gt metadata may predate the submit, so resolve the frontier from the stacker's clone or after gt sync`
    );
  }
  if (rows.length > 1) {
    throw new UserError(
      `gt info output contains multiple PRs for branch ${branch}`
    );
  }
  return parseGtPullRequest({ branch, detail: rows[0] ?? "" });
}

function graphiteFrontier(repo: string): readonly GtFrontierEntry[] {
  let raw: string;
  try {
    raw = execFileSync(
      "gt",
      ["--no-interactive", "log", "short", "--stack", "--reverse"],
      {
        cwd: repo,
        encoding: "utf8",
        env: { ...process.env, NO_COLOR: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch (error) {
    throw new UserError(
      `gt log short --stack --reverse failed: ${errorMessage(error)}`
    );
  }
  const result = parseGtBranches(raw).map((branch) => ({
    branches: branch,
    ...graphitePullRequest({ branch, repo }),
  }));
  if (new Set(result.map((row) => row.pr)).size !== result.length) {
    throw new UserError("gt info output contains duplicate pull requests");
  }
  return result;
}

function branchSha({
  branch,
  repo,
}: {
  branch: string;
  repo: string;
}): string {
  let raw: string;
  try {
    raw = execFileSync("git", ["rev-parse", branch], {
      cwd: repo,
      encoding: "utf8",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    throw new UserError(
      `git rev-parse ${branch} failed: ${errorMessage(error)}`
    );
  }
  const sha = raw.trim();
  if (!/^[0-9a-f]{40,64}$/i.test(sha)) {
    throw new UserError(`git rev-parse ${branch} returned an invalid SHA`);
  }
  return sha;
}

function resolveFrontier(repo: string): readonly FrontierPr[] {
  return graphiteFrontier(repo).map((row) => ({
    ...row,
    sha: branchSha({ branch: row.branches, repo }),
  }));
}

function validateFrontierPin({
  actual,
  expected,
}: {
  actual: readonly number[];
  expected: readonly number[];
}): void {
  if (
    actual.length === expected.length &&
    actual.every((pr, index) => pr === expected[index])
  ) {
    return;
  }
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((pr) => !actualSet.has(pr));
  const extra = actual.filter((pr) => !expectedSet.has(pr));
  const drift: string[] = [];
  if (missing.length > 0) {
    drift.push(`missing from gt: ${missing.join(",")}`);
  }
  if (extra.length > 0) {
    drift.push(`extra in gt: ${extra.join(",")}`);
  }
  if (missing.length === 0 && extra.length === 0) {
    drift.push(
      `order differs: expected ${expected.join(",")}; gt ${actual.join(",")}`
    );
  }
  throw new UserError(`frontier pin mismatch: ${drift.join("; ")}`);
}

export function openStore(
  directory: string,
  options: OpenStoreOptions = {}
): Store {
  const store = resolve(directory);
  let closed = false;
  let releaseLock: (() => Promise<void>) | null = null;
  let lockRequest: Promise<void> | null = null;

  const ensureOpen = (): void => {
    if (closed) {
      throw new UserError("store is closed");
    }
  };

  const ensureLock = async (): Promise<void> => {
    ensureOpen();
    if (releaseLock !== null) {
      return;
    }
    if (lockRequest === null) {
      lockRequest = acquireLock(store, options).then((release) => {
        releaseLock = release;
      });
    }
    try {
      await lockRequest;
    } catch (error) {
      lockRequest = null;
      throw error;
    }
  };

  const beginWrite = async (): Promise<void> => {
    ensureOpen();
    if (!(await exists(store))) {
      throw new UserError(
        `store is not initialized at ${store}; run orch init`
      );
    }
    await ensureLock();
  };

  return {
    units: {
      add: async (params) => {
        await beginWrite();
        const row: Unit = {
          id: requiredCell(params.id, "unit id"),
          track: requiredCell(params.track, "track"),
          state: "pending",
          branch: "",
          pr: "",
          sha: "",
          brief:
            params.brief === undefined
              ? ""
              : requiredCell(params.brief, "brief"),
        };
        const rows = [...(await readUnits(store))];
        if (rows.some((unit) => unit.id === row.id)) {
          throw new UserError(`unit ${row.id} already exists`);
        }
        rows.push(row);
        await saveUnits(store, rows);
        return row;
      },
      set: async (params) => {
        await beginWrite();
        const id = requiredCell(params.id, "unit id");
        const state = requiredCell(params.state, "state");
        const rows = [...(await readUnits(store))];
        const index = rows.findIndex((unit) => unit.id === id);
        const old = rows[index];
        if (index < 0 || old === undefined) {
          throw new NotFoundError(`unit ${id} not found`);
        }
        const row: Unit = {
          ...old,
          state,
          branch:
            params.branch === undefined
              ? old.branch
              : requiredCell(params.branch, "branch"),
          pr:
            params.pr === undefined
              ? old.pr
              : String(positiveInteger(params.pr, "PR")),
          sha:
            params.sha === undefined
              ? old.sha
              : requiredCell(params.sha, "SHA"),
        };
        rows[index] = row;
        await saveUnits(store, rows);
        return row;
      },
      get: async (id) => {
        ensureOpen();
        const cleanId = requiredCell(id, "unit id");
        const row = (await readUnits(store)).find(
          (unit) => unit.id === cleanId
        );
        if (row === undefined) {
          throw new NotFoundError(`unit ${cleanId} not found`);
        }
        return row;
      },
      list: async (params = {}) => {
        ensureOpen();
        const state =
          params.state === undefined
            ? undefined
            : requiredCell(params.state, "state");
        const track =
          params.track === undefined
            ? undefined
            : requiredCell(params.track, "track");
        return (await readUnits(store)).filter(
          (unit) =>
            (state === undefined || unit.state === state) &&
            (track === undefined || unit.track === track)
        );
      },
      counts: async () => {
        ensureOpen();
        return countValues(
          (await readUnits(store)).map((unit) => unit.state)
        );
      },
    },
    ledger: {
      record: async (params) => {
        await beginWrite();
        const verdict = parseVerdict(params.verdict);
        const row: LedgerEntry = {
          pr: String(positiveInteger(params.pr, "PR")),
          sha: requiredCell(params.sha, "SHA"),
          verdict,
          evidence: requiredCell(params.evidence, "evidence"),
          verifier:
            params.verifier === undefined
              ? ""
              : requiredCell(params.verifier, "verifier"),
          ts: new Date().toISOString(),
        };
        const rows = [...(await readLedger(store))];
        const index = rows.findIndex(
          (old) => old.pr === row.pr && old.sha === row.sha
        );
        if (index < 0) {
          rows.push(row);
        } else {
          rows[index] = row;
        }
        await saveLedger(store, rows);
        return row;
      },
      check: async (params) => {
        ensureOpen();
        const pr = String(positiveInteger(params.pr, "PR"));
        const sha = requiredCell(params.sha, "SHA");
        const row = (await readLedger(store)).find(
          (value) => value.pr === pr && value.sha === sha
        );
        if (row === undefined) {
          throw new NotFoundError("NOT-VERIFIED", {
            compact: "NOT-VERIFIED",
            json: { pr, sha, verdict: "NOT-VERIFIED" },
          });
        }
        return row;
      },
      summary: async () => {
        ensureOpen();
        return countValues(
          (await readLedger(store)).map((row) => row.verdict)
        );
      },
    },
    inbox: {
      push: async (params) => {
        await beginWrite();
        const pointer: InboxPointer = {
          ts: new Date().toISOString(),
          agent: requiredCell(params.agent, "agent"),
          unit: requiredCell(params.unit, "unit"),
          status: requiredCell(params.status, "status"),
          report:
            params.report === undefined
              ? ""
              : requiredCell(params.report, "report"),
        };
        const inbox = join(store, "inbox");
        if (!(await exists(inbox))) {
          throw new UserError(
            `store is not initialized at ${store}; run orch init`
          );
        }
        const timestamp = pointer.ts.replace(/[:.]/g, "-");
        const filename = `${timestamp}-${process.pid}-${randomUUID()}.tsv`;
        const contents = `${pointerCells(pointer).map(cleanCell).join("\t")}\n`;
        await atomicWrite(join(inbox, filename), contents);
        return { pointer, filename };
      },
      drain: async () => {
        await beginWrite();
        const inbox = join(store, "inbox");
        const rows = await readPointers(inbox);
        const drained = join(
          store,
          `.inbox-drain-${process.pid}-${randomUUID()}`
        );
        await rename(inbox, drained);
        try {
          await mkdir(inbox);
        } catch (error) {
          await rename(drained, inbox);
          throw error;
        }
        await rm(drained, { recursive: true, force: true });
        return rows;
      },
      peek: async () => {
        ensureOpen();
        return readPointers(join(store, "inbox"));
      },
      count: async () => {
        ensureOpen();
        return (await readPointers(join(store, "inbox"))).length;
      },
    },
    gates: {
      park: async (params) => {
        await beginWrite();
        const gate: OpenGate = {
          kind: "open",
          id: requiredLine(params.id, "gate id"),
          question: requiredLine(params.question, "question"),
          options: requiredLine(params.options, "options"),
          defaultAnswer: requiredLine(
            params.defaultAnswer,
            "default"
          ),
        };
        const rows = [...(await readGates(store))];
        const index = rows.findIndex((old) => old.id === gate.id);
        if (index < 0) {
          rows.push(gate);
        } else {
          rows[index] = gate;
        }
        await atomicWrite(join(store, "gates.md"), renderGates(rows));
        return gate;
      },
      list: async () => {
        ensureOpen();
        return (await readGates(store)).filter(
          (gate): gate is OpenGate => gate.kind === "open"
        );
      },
      resolve: async (params) => {
        await beginWrite();
        const id = requiredLine(params.id, "gate id");
        const rows = [...(await readGates(store))];
        const index = rows.findIndex((gate) => gate.id === id);
        const old = rows[index];
        if (index < 0 || old === undefined) {
          throw new NotFoundError(`gate ${id} not found`);
        }
        const gate: ResolvedGate = {
          kind: "resolved",
          id: old.id,
          question: old.question,
          options: old.options,
          defaultAnswer: old.defaultAnswer,
          answer: requiredLine(params.answer, "answer"),
        };
        rows[index] = gate;
        await atomicWrite(join(store, "gates.md"), renderGates(rows));
        return gate;
      },
    },
    frontier: {
      set: async (params) => {
        await beginWrite();
        const repo = resolve(requiredLine(params.repo, "repo directory"));
        const pin =
          params.prs === undefined
            ? undefined
            : params.prs.map((pr) => positiveInteger(pr, "PR"));
        if (pin !== undefined && new Set(pin).size !== pin.length) {
          throw new UserError("--prs must not contain duplicates");
        }
        const old = await readFrontier(store);
        const prs = resolveFrontier(repo);
        if (pin !== undefined) {
          validateFrontierPin({
            actual: prs.map((row) => row.pr),
            expected: pin,
          });
        }
        const value: Frontier = {
          generation: old.generation + 1,
          prs,
          lowestUnmerged: prs.find((row) => row.state === "OPEN")?.pr ?? null,
        };
        await atomicWrite(
          join(store, "frontier.json"),
          `${JSON.stringify(value, null, 2)}\n`
        );
        return value;
      },
      show: async () => {
        ensureOpen();
        return readFrontier(store);
      },
    },
    standing: {
      show: async () => {
        ensureOpen();
        return readStanding(store);
      },
      add: async (params) => {
        await beginWrite();
        const rows = [...(await readStanding(store))];
        const item: StandingLine = {
          number: rows.length + 1,
          line: requiredLine(params.line, "standing order"),
        };
        rows.push(item);
        await atomicWrite(
          join(store, "preferences.md"),
          `${rows.map((row) => `${row.number}. ${row.line}`).join("\n")}\n`
        );
        return item;
      },
    },
    status: {
      render: async () => {
        await beginWrite();
        const unitRows = await readUnits(store);
        const ledgerRows = await readLedger(store);
        const currentFrontier = await readFrontier(store);
        const gateRows = await readGates(store);
        const currentSummary = summarize(
          unitRows,
          ledgerRows,
          currentFrontier,
          gateRows
        );
        const path = join(store, "status.md");
        const before = (await exists(path))
          ? previousSummary(await readFile(path, "utf8"))
          : null;
        const change = changed(before, currentSummary);
        await atomicWrite(
          path,
          statusMarkdown(
            unitRows,
            ledgerRows,
            currentFrontier,
            gateRows,
            currentSummary
          )
        );
        return {
          units: unitRows,
          ledger: ledgerRows,
          frontier: currentFrontier,
          gates: gateRows,
          summary: currentSummary,
          changed: change,
        };
      },
    },
    init: async () => {
      ensureOpen();
      await mkdir(store, { recursive: true });
      await ensureLock();
      await writeIfMissing(join(store, "units.tsv"), `${UNIT_HEADER}\n`);
      await writeIfMissing(join(store, "ledger.tsv"), `${LEDGER_HEADER}\n`);
      await mkdir(join(store, "inbox"), { recursive: true });
      await writeIfMissing(join(store, "gates.md"), "");
      await writeIfMissing(join(store, "preferences.md"), "");
      await writeIfMissing(join(store, "frontier.json"), "{}\n");
      return { store };
    },
    close: async () => {
      if (closed) {
        return;
      }
      if (lockRequest !== null) {
        try {
          await lockRequest;
        } catch {
          // A failed acquisition has no lock to release.
        }
      }
      const release = releaseLock;
      releaseLock = null;
      closed = true;
      if (release !== null) {
        await release();
      }
    },
  };
}
