/// <reference types="bun-types-no-globals/lib/index.d.ts" />

import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { stdin } from "bun";

const PROJECT_DIR = resolve(process.env.CURSOR_PROJECT_DIR ?? ".");
const STATE_DIR = resolve(PROJECT_DIR, ".cursor/hooks/state");
const STATE_PATH = resolve(STATE_DIR, "continual-learning.json");
const INCREMENTAL_INDEX_PATH = resolve(STATE_DIR, "continual-learning-index.json");
const AGENT_LOG_PATH = resolve(STATE_DIR, "continual-learning-agent.log");
const DEFAULT_MIN_TURNS = 10;
const DEFAULT_MIN_MINUTES = 120;
const TRIAL_DEFAULT_MIN_TURNS = 3;
const TRIAL_DEFAULT_MIN_MINUTES = 15;
const TRIAL_DEFAULT_DURATION_MINUTES = 24 * 60;

const FOLLOWUP_MESSAGE =
  `Run the \`continual-learning\` skill now. Use the \`agents-memory-updater\` subagent for the full memory update flow. Use incremental transcript processing with index file \`${INCREMENTAL_INDEX_PATH}\`: only consider transcripts not in the index or transcripts whose mtime is newer than indexed mtime. Have the subagent refresh index mtimes, remove entries for deleted transcripts, and update \`AGENTS.md\` only for high-signal recurring user corrections and durable workspace facts. Exclude one-off/transient details and secrets. If no meaningful updates exist, respond exactly: No high-signal memory updates.`;

interface StopHookInput {
  conversation_id: string;
  generation_id?: string;
  status: "completed" | "aborted" | "error" | string;
  loop_count: number;
  transcript_path?: string | null;
}

interface ContinuousLearningState {
  version: 1;
  lastRunAtMs: number;
  turnsSinceLastRun: number;
  lastTranscriptMtimeMs: number | null;
  lastProcessedGenerationId: string | null;
  trialStartedAtMs: number | null;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function readEnvValue(primary: string, legacy: string): string | undefined {
  return process.env[primary] ?? process.env[legacy];
}

function loadState(): ContinuousLearningState {
  const fallback: ContinuousLearningState = {
    version: 1,
    lastRunAtMs: 0,
    turnsSinceLastRun: 0,
    lastTranscriptMtimeMs: null,
    lastProcessedGenerationId: null,
    trialStartedAtMs: null,
  };

  if (!existsSync(STATE_PATH)) {
    return fallback;
  }

  try {
    const raw = readFileSync(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ContinuousLearningState>;
    if (parsed.version !== 1) {
      return fallback;
    }
    return {
      version: 1,
      lastRunAtMs:
        typeof parsed.lastRunAtMs === "number" && Number.isFinite(parsed.lastRunAtMs)
          ? parsed.lastRunAtMs
          : 0,
      turnsSinceLastRun:
        typeof parsed.turnsSinceLastRun === "number" &&
        Number.isFinite(parsed.turnsSinceLastRun) &&
        parsed.turnsSinceLastRun >= 0
          ? parsed.turnsSinceLastRun
          : 0,
      lastTranscriptMtimeMs:
        typeof parsed.lastTranscriptMtimeMs === "number" &&
        Number.isFinite(parsed.lastTranscriptMtimeMs)
          ? parsed.lastTranscriptMtimeMs
          : null,
      lastProcessedGenerationId:
        typeof parsed.lastProcessedGenerationId === "string"
          ? parsed.lastProcessedGenerationId
          : null,
      trialStartedAtMs:
        typeof parsed.trialStartedAtMs === "number" &&
        Number.isFinite(parsed.trialStartedAtMs)
          ? parsed.trialStartedAtMs
          : null,
    };
  } catch {
    return fallback;
  }
}

function saveState(state: ContinuousLearningState): void {
  const directory = dirname(STATE_PATH);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

function getTranscriptMtimeMs(transcriptPath: string | null | undefined): number | null {
  if (!transcriptPath) {
    return null;
  }

  try {
    return statSync(transcriptPath).mtimeMs;
  } catch {
    return null;
  }
}

function shouldCountTurn(input: StopHookInput): boolean {
  return input.status === "completed" && input.loop_count === 0;
}

function canSpawnAgentCli(): boolean {
  const result = spawnSync("agent", ["--version"], {
    stdio: "ignore",
    cwd: PROJECT_DIR,
    env: process.env,
  });
  return result.error === undefined;
}

function triggerAgentCli(): boolean {
  if (!canSpawnAgentCli()) {
    return false;
  }

  let logFd: number | null = null;

  try {
    if (!existsSync(STATE_DIR)) {
      mkdirSync(STATE_DIR, { recursive: true });
    }

    logFd = openSync(AGENT_LOG_PATH, "a");
    const child = spawn(
      "agent",
      ["-p", "--force", "--workspace", PROJECT_DIR, "--", FOLLOWUP_MESSAGE],
      {
        cwd: PROJECT_DIR,
        detached: true,
        stdio: ["ignore", logFd, logFd],
        env: process.env,
      }
    );
    child.unref();
    return true;
  } catch (error) {
    console.error("[continual-learning-stop] failed to spawn agent CLI", error);
    return false;
  } finally {
    if (logFd !== null) {
      closeSync(logFd);
    }
  }
}

async function parseHookInput<T>(): Promise<T> {
  const text = await stdin.text();
  return JSON.parse(text) as T;
}

async function main(): Promise<number> {
  try {
    const input = await parseHookInput<StopHookInput>();
    const state = loadState();

    if (input.generation_id && input.generation_id === state.lastProcessedGenerationId) {
      console.log(JSON.stringify({}));
      return 0;
    }
    state.lastProcessedGenerationId = input.generation_id ?? null;

    const countedTurn = shouldCountTurn(input);
    const turnIncrement = countedTurn ? 1 : 0;
    const turnsSinceLastRun = state.turnsSinceLastRun + turnIncrement;
    const now = Date.now();

    const trialEnabled = parseBoolean(
      readEnvValue("CONTINUAL_LEARNING_TRIAL_MODE", "CONTINUOUS_LEARNING_TRIAL_MODE")
    );
    if (trialEnabled && countedTurn && state.trialStartedAtMs === null) {
      state.trialStartedAtMs = now;
    }

    const trialDurationMinutes = parsePositiveInt(
      readEnvValue(
        "CONTINUAL_LEARNING_TRIAL_DURATION_MINUTES",
        "CONTINUOUS_LEARNING_TRIAL_DURATION_MINUTES"
      ),
      TRIAL_DEFAULT_DURATION_MINUTES
    );
    const trialMinTurns = parsePositiveInt(
      readEnvValue(
        "CONTINUAL_LEARNING_TRIAL_MIN_TURNS",
        "CONTINUOUS_LEARNING_TRIAL_MIN_TURNS"
      ),
      TRIAL_DEFAULT_MIN_TURNS
    );
    const trialMinMinutes = parsePositiveInt(
      readEnvValue(
        "CONTINUAL_LEARNING_TRIAL_MIN_MINUTES",
        "CONTINUOUS_LEARNING_TRIAL_MIN_MINUTES"
      ),
      TRIAL_DEFAULT_MIN_MINUTES
    );
    const inTrialWindow =
      trialEnabled &&
      state.trialStartedAtMs !== null &&
      now - state.trialStartedAtMs < trialDurationMinutes * 60_000;

    const minTurns = parsePositiveInt(
      readEnvValue("CONTINUAL_LEARNING_MIN_TURNS", "CONTINUOUS_LEARNING_MIN_TURNS"),
      DEFAULT_MIN_TURNS
    );
    const minMinutes = parsePositiveInt(
      readEnvValue("CONTINUAL_LEARNING_MIN_MINUTES", "CONTINUOUS_LEARNING_MIN_MINUTES"),
      DEFAULT_MIN_MINUTES
    );

    const effectiveMinTurns = inTrialWindow ? trialMinTurns : minTurns;
    const effectiveMinMinutes = inTrialWindow ? trialMinMinutes : minMinutes;
    const minutesSinceLastRun =
      state.lastRunAtMs > 0
        ? Math.floor((now - state.lastRunAtMs) / 60000)
        : Number.POSITIVE_INFINITY;
    const transcriptMtimeMs = getTranscriptMtimeMs(input.transcript_path);
    const hasTranscriptAdvanced =
      transcriptMtimeMs !== null &&
      (state.lastTranscriptMtimeMs === null || transcriptMtimeMs > state.lastTranscriptMtimeMs);

    const shouldTrigger =
      countedTurn &&
      turnsSinceLastRun >= effectiveMinTurns &&
      minutesSinceLastRun >= effectiveMinMinutes &&
      hasTranscriptAdvanced;

    if (shouldTrigger) {
      state.lastRunAtMs = now;
      state.turnsSinceLastRun = 0;
      state.lastTranscriptMtimeMs = transcriptMtimeMs;
      saveState(state);

      if (triggerAgentCli()) {
        console.log(JSON.stringify({}));
        return 0;
      }

      console.log(
        JSON.stringify({
          followup_message: FOLLOWUP_MESSAGE,
        })
      );
      return 0;
    }

    state.turnsSinceLastRun = turnsSinceLastRun;
    saveState(state);
    console.log(JSON.stringify({}));
    return 0;
  } catch (error) {
    console.error("[continual-learning-stop] failed", error);
    console.log(JSON.stringify({}));
    return 0;
  }
}

const exitCode = await main();
process.exit(exitCode);
