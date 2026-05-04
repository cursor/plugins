#!/usr/bin/env bun
// Nudge a running cloud agent with a follow-up message.
//
// Usage:
//   bun nudge-root.ts <agent-id> --message "text"
//   bun nudge-root.ts <agent-id> --message-file path/to/msg.md
//   bun nudge-root.ts <agent-id> --stdin
//   bun nudge-root.ts <agent-id> --message "..." --wait-idle
//   bun nudge-root.ts <agent-id> --message "..." --max-wait 600
//
// By default, send retries on agent_busy. Use --wait-idle to poll until the
// latest run is not "running".
import { Agent } from "@cursor/sdk";

const DEFAULT_POLL_MS = 15_000;
const DEFAULT_MAX_WAIT_S = 600;

function now(): string {
  return new Date().toISOString();
}

function log(msg: string): void {
  console.log(`[${now()}] ${msg}`);
}

function usage(): never {
  console.error(
    "usage: bun nudge-root.ts <agent-id>\n" +
      "         (--message <text> | --message-file <path> | --stdin)\n" +
      "         [--wait-idle] [--max-wait <seconds>] [--poll-ms <ms>]"
  );
  process.exit(2);
}

interface Args {
  agentId: string;
  message: string;
  waitIdle: boolean;
  maxWaitMs: number;
  pollMs: number;
}

type MessageSource =
  | { kind: "inline"; text: string }
  | { kind: "file"; path: string }
  | { kind: "stdin" };

async function parseArgs(argv: readonly string[]): Promise<Args> {
  let agentId: string | undefined;
  let messageSource: MessageSource | undefined;
  let waitIdle = false;
  let maxWaitSeconds = DEFAULT_MAX_WAIT_S;
  let pollMs = DEFAULT_POLL_MS;

  const requireValue = (flag: string, value: string | undefined): string => {
    if (value === undefined) {
      console.error(`flag ${flag} requires a value`);
      usage();
    }
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--message":
        messageSource = setMessageSource(messageSource, {
          kind: "inline",
          text: requireValue("--message", argv[++i]),
        });
        break;
      case "--message-file":
        messageSource = setMessageSource(messageSource, {
          kind: "file",
          path: requireValue("--message-file", argv[++i]),
        });
        break;
      case "--stdin":
        messageSource = setMessageSource(messageSource, { kind: "stdin" });
        break;
      case "--wait-idle":
        waitIdle = true;
        break;
      case "--max-wait": {
        const n = Number(requireValue("--max-wait", argv[++i]));
        if (!Number.isFinite(n) || n <= 0) {
          console.error("--max-wait must be a positive number of seconds");
          usage();
        }
        maxWaitSeconds = n;
        break;
      }
      case "--poll-ms": {
        const n = Number(requireValue("--poll-ms", argv[++i]));
        if (!Number.isFinite(n) || n <= 0) {
          console.error("--poll-ms must be a positive number of milliseconds");
          usage();
        }
        pollMs = n;
        break;
      }
      case "-h":
      case "--help":
        return usage();
      default:
        if (a.startsWith("--")) {
          console.error(`unknown flag: ${a}`);
          usage();
        }
        if (agentId !== undefined) {
          console.error(`unexpected positional arg: ${a}`);
          usage();
        }
        agentId = a;
    }
  }

  if (agentId === undefined) {
    console.error("missing <agent-id>");
    usage();
  }

  if (messageSource === undefined) {
    console.error("provide exactly one of --message, --message-file, --stdin");
    usage();
  }

  const message = (await readMessageSource(messageSource)).trim();
  if (message.length === 0) {
    console.error("message is empty");
    process.exit(2);
  }

  return {
    agentId,
    message,
    waitIdle,
    maxWaitMs: maxWaitSeconds * 1000,
    pollMs,
  };
}

function setMessageSource(
  current: MessageSource | undefined,
  next: MessageSource
): MessageSource {
  if (current !== undefined) {
    console.error("provide exactly one of --message, --message-file, --stdin");
    usage();
  }
  return next;
}

async function readMessageSource(source: MessageSource): Promise<string> {
  switch (source.kind) {
    case "inline":
      return source.text;
    case "file":
      return Bun.file(source.path).text();
    case "stdin":
      return Bun.stdin.text();
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

function isBusy(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.toLowerCase().includes("busy");
}

async function sleep(ms: number): Promise<void> {
  await new Promise(r => setTimeout(r, ms));
}

async function waitUntilIdle(args: Args, deadline: number): Promise<void> {
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    try {
      const runs = await Agent.listRuns(args.agentId, {
        runtime: "cloud",
        limit: 1,
      });
      const status = runs.items[0]?.status;
      log(`idle-check ${attempt}: status=${status ?? "(no runs)"}`);
      if (status !== "running") return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`idle-check ${attempt}: Agent.listRuns failed: ${msg}`);
    }
    await sleep(args.pollMs);
  }
  log(`idle-wait exhausted after ${args.maxWaitMs / 1000}s; giving up`);
  process.exit(4);
}

async function sendWithBusyRetry(args: Args, deadline: number): Promise<void> {
  let attempt = 0;
  do {
    attempt++;
    try {
      const agent = await Agent.resume(args.agentId);
      const run = await agent.send({ text: args.message });
      log(
        "sent: runId=" +
          run.id +
          " url=https://cursor.com/agents/" +
          args.agentId
      );
      return;
    } catch (err) {
      if (isBusy(err)) {
        log(
          "attempt " +
            attempt +
            ": agent_busy; retrying in " +
            args.pollMs / 1000 +
            "s"
        );
        await sleep(args.pollMs);
        continue;
      }
      const msg = err instanceof Error ? err.message : String(err);
      log(`send failed: ${msg}`);
      process.exit(3);
    }
  } while (Date.now() < deadline);
  log(
    "max-wait exhausted after " +
      args.maxWaitMs / 1000 +
      "s with agent still busy; giving up"
  );
  process.exit(4);
}

const args = await parseArgs(process.argv.slice(2));
const deadline = Date.now() + args.maxWaitMs;
log(
  "nudging " +
    args.agentId +
    " (mode=" +
    (args.waitIdle ? "wait-idle" : "send-now") +
    ", max-wait=" +
    args.maxWaitMs / 1000 +
    "s, poll=" +
    args.pollMs / 1000 +
    "s, message=" +
    args.message.length +
    "ch)"
);

if (args.waitIdle) {
  await waitUntilIdle(args, deadline);
}
await sendWithBusyRetry(args, deadline);
process.exit(0);
