import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

import type { CommentCriticality, SlackAdapter } from "../adapters/types.ts";

const COMMENT_RETRY_BACKOFF_MS = [1_000, 5_000, 30_000, 300_000, 1_800_000];

interface CommentRetryEntry {
  id: string;
  destination: string;
  body: string;
  sender: string;
  attempts: number;
  createdAt: string;
  nextAttemptAt: string;
  lastError?: string;
  exhaustedAt?: string;
}

export interface CommentDestinations {
  slack?: SlackAdapter;
}

export function commentRetryQueuePath(workspace: string): string {
  return join(resolve(workspace), "comment-retry-queue.json");
}

/** Post an external comment, or enqueue + drain when `criticality` is `required`. */
export async function postOrQueueComment(args: {
  destinations: CommentDestinations;
  workspace?: string;
  destination: string;
  body: string;
  sender: string;
  criticality: CommentCriticality;
  /**
   * When set, Slack destinations must use the run thread. Callers running
   * inside an orchestrate workspace pass `plan.slackKickoffRef` so workers
   * cannot redirect bot-token messages to DMs, the channel root, or a
   * sibling run's thread.
   */
  allowedSlackThread?: { channel: string; threadTs: string };
  logAttention?: (line: string) => void;
}): Promise<"posted" | "queued"> {
  assertSlackDestinationAllowed(args.destination, args.allowedSlackThread);
  if (args.criticality === "best_effort") {
    await postComment({
      destinations: args.destinations,
      destination: args.destination,
      body: args.body,
      sender: args.sender,
      criticality: args.criticality,
    });
    return "posted";
  }
  if (!args.workspace) {
    throw new Error("--criticality required needs --workspace for retry state");
  }
  const entryId = enqueueComment({
    workspace: args.workspace,
    destination: args.destination,
    body: args.body,
    sender: args.sender,
  });
  await drainCommentRetryQueue({
    workspace: args.workspace,
    destinations: args.destinations,
    logAttention: args.logAttention,
    maxAttemptsThisDrain: 1,
    allowedSlackThread: args.allowedSlackThread,
  });
  // Drain processes FIFO with maxAttemptsThisDrain=1, so an older queued
  // entry can consume the single attempt and leave ours pending. A successful
  // post removes the entry from the file, so absence means we landed.
  // Exhausted-on-disk counts as "queued"; the comment never delivered, so
  // claiming "posted" would be a worse lie.
  const stillQueued = readQueue(commentRetryQueuePath(args.workspace)).some(
    entry => entry.id === entryId
  );
  return stillQueued ? "queued" : "posted";
}

export async function drainCommentRetryQueue(args: {
  workspace: string;
  destinations?: CommentDestinations;
  logAttention?: (line: string) => void;
  maxAttemptsThisDrain?: number;
  /**
   * Same guard as `postOrQueueComment.allowedSlackThread`. Re-checking here
   * catches destinations written directly into `comment-retry-queue.json`.
   */
  allowedSlackThread?: { channel: string; threadTs: string };
}): Promise<{ posted: number; queued: number }> {
  if (!args.destinations) return { posted: 0, queued: 0 };
  const path = commentRetryQueuePath(args.workspace);
  const queue = readQueue(path);
  if (queue.length === 0) return { posted: 0, queued: 0 };

  let posted = 0;
  let attemptsThisDrain = 0;
  const now = Date.now();
  const remaining: CommentRetryEntry[] = [];
  for (const [index, entry] of queue.entries()) {
    if (entry.exhaustedAt) {
      remaining.push(entry);
      continue;
    }
    if (Date.parse(entry.nextAttemptAt) > now) {
      remaining.push(entry);
      continue;
    }
    if (
      args.maxAttemptsThisDrain !== undefined &&
      attemptsThisDrain >= args.maxAttemptsThisDrain
    ) {
      remaining.push(entry);
      continue;
    }
    attemptsThisDrain++;
    try {
      assertSlackDestinationAllowed(entry.destination, args.allowedSlackThread);
      await postComment({
        destinations: args.destinations,
        destination: entry.destination,
        body: entry.body,
        sender: entry.sender,
        criticality: "required",
        clientMsgId: entry.id,
      });
      posted++;
    } catch (err) {
      const attempts = entry.attempts + 1;
      const lastError = errorMessage(err);
      const exhausted = attempts >= COMMENT_RETRY_BACKOFF_MS.length;
      const backoffIndex = Math.min(
        attempts - 1,
        COMMENT_RETRY_BACKOFF_MS.length - 1
      );
      const nextAttemptAt = new Date(
        now + COMMENT_RETRY_BACKOFF_MS[backoffIndex]
      ).toISOString();
      const next = {
        ...entry,
        attempts,
        nextAttemptAt,
        lastError,
        ...(exhausted ? { exhaustedAt: new Date(now).toISOString() } : {}),
      };
      remaining.push(next);
      args.logAttention?.(
        exhausted
          ? `required comment exhausted retries for ${entry.destination}: ${truncate(lastError, 200)}`
          : `required comment retry queued for ${entry.destination}: ${truncate(lastError, 200)}`
      );
    }
    writeQueue(path, [...remaining, ...queue.slice(index + 1)]);
  }
  writeQueue(path, remaining);
  return { posted, queued: remaining.length };
}

function enqueueComment(args: {
  workspace: string;
  destination: string;
  body: string;
  sender: string;
}): string {
  const path = commentRetryQueuePath(args.workspace);
  const queue = readQueue(path);
  const existing = queue.find(
    entry =>
      entry.destination === args.destination &&
      entry.body === args.body &&
      entry.sender === args.sender &&
      !entry.exhaustedAt
  );
  if (existing) return existing.id;
  const now = new Date().toISOString();
  const id = randomUUID();
  queue.push({
    id,
    destination: args.destination,
    body: args.body,
    sender: args.sender,
    attempts: 0,
    createdAt: now,
    nextAttemptAt: now,
  });
  writeQueue(path, queue);
  return id;
}

function readQueue(path: string): CommentRetryEntry[] {
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(raw)) return [];
    return raw.flatMap(entry => {
      const parsed = parseEntry(entry);
      return parsed ? [parsed] : [];
    });
  } catch {
    return [];
  }
}

function writeQueue(path: string, queue: CommentRetryEntry[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(queue, null, 2));
  renameSync(tmp, path);
}

function parseEntry(value: unknown): CommentRetryEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const entry = value as Partial<CommentRetryEntry>;
  if (
    !(
      typeof entry.destination === "string" &&
      typeof entry.id === "string" &&
      typeof entry.body === "string" &&
      typeof entry.sender === "string" &&
      typeof entry.attempts === "number" &&
      typeof entry.createdAt === "string" &&
      typeof entry.nextAttemptAt === "string"
    )
  ) {
    return null;
  }
  return {
    id: entry.id,
    destination: entry.destination,
    body: entry.body,
    sender: entry.sender,
    attempts: entry.attempts,
    createdAt: entry.createdAt,
    nextAttemptAt: entry.nextAttemptAt,
    ...(typeof entry.lastError === "string"
      ? { lastError: entry.lastError }
      : {}),
    ...(typeof entry.exhaustedAt === "string"
      ? { exhaustedAt: entry.exhaustedAt }
      : {}),
  };
}

async function postComment(args: {
  destinations: CommentDestinations;
  destination: string;
  body: string;
  sender: string;
  criticality: CommentCriticality;
  clientMsgId?: string;
}): Promise<void> {
  if (!args.destination.startsWith("slack:")) {
    throw new Error(
      `unsupported comment destination "${args.destination}"; only slack:<channel>:<thread_ts> is supported`
    );
  }
  if (!args.destinations.slack) {
    throw new Error(
      "Slack destination requested but SLACK_BOT_TOKEN is not set"
    );
  }
  const target = parseSlackDestination(args.destination);
  await args.destinations.slack.postCommentInThread({
    threadTs: target.threadTs,
    text: args.body,
    username: args.sender,
    clientMsgId: args.clientMsgId,
  });
}

function assertSlackDestinationAllowed(
  destination: string,
  allowedThread: { channel: string; threadTs: string } | undefined
): void {
  if (allowedThread === undefined) return;
  if (!destination.startsWith("slack:")) return;
  const target = parseSlackDestination(destination);
  if (
    target.channel === allowedThread.channel &&
    target.threadTs === allowedThread.threadTs
  ) {
    return;
  }
  throw new Error(
    `slack destination ${destination} is outside this workspace's run thread ` +
      `(${allowedThread.channel}:${allowedThread.threadTs}); the bot may only ` +
      `post inside the run thread, not other channels, DMs, the channel root, ` +
      `or sibling run threads`
  );
}

function parseSlackDestination(destination: string): {
  channel: string;
  threadTs: string;
} {
  const body = destination.slice("slack:".length);
  if (body.startsWith("DM:")) {
    throw new Error("slack comments must target the run thread, not DMs");
  }
  const [channelPart, threadPart] = body.split(":", 2);
  const channel = channelPart.trim();
  if (channel.length === 0)
    throw new Error("slack destination needs a channel");
  const threadTs = threadPart?.trim();
  if (!threadTs) {
    throw new Error("slack comments must include a thread_ts");
  }
  return { channel, threadTs };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}...` : s;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
