import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type * as T from "./types.ts";

export interface ReviewBotAuthor {
  readonly login: string;
  readonly match: "exact" | "contains";
  readonly bodyTokens: readonly string[];
}
export interface ReviewBot {
  readonly id: string;
  readonly authors: readonly ReviewBotAuthor[];
  readonly passMarkers: readonly RegExp[];
  readonly runningChecks: readonly string[];
}
export type ReviewBots = readonly ReviewBot[];

export class ReviewBotConfigError extends Error {
  constructor(detail: string) {
    super(`invalid review-bot config: ${detail}`);
    this.name = "ReviewBotConfigError";
  }
}
const normalizeLogin = (login: string): string =>
  login.toLowerCase().replace(/\[bot\]$/, "");
function fail(detail: string): never {
  throw new ReviewBotConfigError(detail);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "")
    fail(`${path} must be a non-empty string`);
  return value;
}
function list(value: unknown, path: string): readonly unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(`${path} must be a list`);
  return value;
}
const lowercaseStrings = (value: unknown, path: string): readonly string[] =>
  list(value, path).map((item, n) =>
    nonEmptyString(item, `${path}[${n}]`).toLowerCase()
  );
function parseAuthor(value: unknown, path: string): ReviewBotAuthor {
  if (!isRecord(value)) fail(`${path} must be an object`);
  const match = value.match ?? "exact";
  if (match !== "exact" && match !== "contains")
    fail(`${path}.match must be "exact" or "contains"`);
  const login = normalizeLogin(nonEmptyString(value.login, `${path}.login`));
  if (login === "") fail(`${path}.login must name an account`);
  return {
    login,
    match,
    bodyTokens: lowercaseStrings(value.bodyTokens, `${path}.bodyTokens`),
  };
}
function parsePassMarker(value: unknown, path: string): RegExp {
  if (!isRecord(value)) fail(`${path} must be an object`);
  if (value.key !== undefined) fail(`${path}.key is not supported`);
  const source = nonEmptyString(value.pattern, `${path}.pattern`);
  let pattern: RegExp;
  try {
    pattern = new RegExp(source);
  } catch (error) {
    return fail(
      `${path}.pattern is not a regular expression: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  // The empty alternative always matches, so the array length counts groups.
  if ((new RegExp(`${source}|`).exec("")?.length ?? 0) < 2)
    fail(`${path}.pattern needs a capture group for the pass key`);
  return pattern;
}
export function parseReviewBots(value: unknown): ReviewBots {
  if (!isRecord(value) || !Array.isArray(value.bots))
    fail("expected an object with a bots list");
  const ids = new Set<string>();
  return value.bots.map((bot, index) => {
    const path = `bots[${index}]`;
    if (!isRecord(bot)) fail(`${path} must be an object`);
    const id = nonEmptyString(bot.id, `${path}.id`);
    if (/\s/.test(id)) fail(`${path}.id must not contain whitespace`);
    if (ids.has(id)) fail(`${path}.id ${id} is a duplicate`);
    ids.add(id);
    const authors = list(bot.authors, `${path}.authors`);
    if (authors.length === 0) fail(`${path}.authors must not be empty`);
    return {
      id,
      authors: authors.map((author, n) =>
        parseAuthor(author, `${path}.authors[${n}]`)
      ),
      passMarkers: list(bot.passMarkers, `${path}.passMarkers`).map(
        (marker, n) => parsePassMarker(marker, `${path}.passMarkers[${n}]`)
      ),
      runningChecks: lowercaseStrings(
        bot.runningChecks,
        `${path}.runningChecks`
      ),
    };
  });
}
export function loadReviewBots(path: string): ReviewBots {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    return fail(
      `cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return fail(
      `${path} is not JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return parseReviewBots(value);
}
export const DEFAULT_REVIEW_BOTS: ReviewBots = loadReviewBots(
  fileURLToPath(new URL("./review-bots.json", import.meta.url))
);

export const isReviewBotCheck = (name: string, bots: ReviewBots): boolean =>
  bots.some((bot) =>
    bot.runningChecks.some((token) => name.toLowerCase().includes(token))
  );
export function reviewBotFor(
  comment: T.ReviewComment | null,
  bots: ReviewBots
): ReviewBot | null {
  if (comment === null) return null;
  const login = normalizeLogin(comment.authorLogin ?? "");
  const body = comment.body.toLowerCase();
  const wrote = (author: ReviewBotAuthor): boolean =>
    (author.match === "contains"
      ? login.includes(author.login)
      : login === author.login) &&
    (author.bodyTokens.length === 0 ||
      author.bodyTokens.some((token) => body.includes(token)));
  return bots.find((bot) => bot.authors.some(wrote)) ?? null;
}
function passKey(bot: ReviewBot, comment: T.ReviewComment): string | null {
  for (const pattern of bot.passMarkers) {
    const key = pattern.exec(comment.body)?.[1];
    if (key) return key;
  }
  return null;
}
/**
 * Review passes per bot id, over every thread including resolved ones: the
 * number of distinct pass keys, or 1 when the bot commented without any.
 */
export function countReviewPasses(
  comments: readonly (T.ReviewComment | null)[],
  bots: ReviewBots
): ReadonlyMap<string, number> {
  const keys = new Map<string, Set<string>>();
  for (const comment of comments) {
    const bot = reviewBotFor(comment, bots);
    if (bot === null || comment === null) continue;
    const seen = keys.get(bot.id) ?? new Set<string>();
    keys.set(bot.id, seen);
    const key = passKey(bot, comment);
    if (key !== null) seen.add(key);
  }
  return new Map([...keys].map(([id, seen]) => [id, Math.max(seen.size, 1)]));
}
