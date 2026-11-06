import { readFileSync } from "node:fs";
import defaults from "./review-bots.json" with { type: "json" };
import type * as T from "./types.ts";

export interface ReviewBotAuthor {
  readonly login: string;
  readonly match: "exact" | "contains";
  readonly bodyTokens: readonly string[];
}
/**
 * Where a finding's review-pass key comes from. `capture` takes the pattern's
 * first capture group (a run ID in the body). `reviewed-commit` takes the
 * commit the finding's review covered, for bots whose findings carry no run
 * ID; its optional pattern must match the body for the finding to count.
 */
export type PassMarker =
  | { readonly key: "capture"; readonly pattern: RegExp }
  | { readonly key: "reviewed-commit"; readonly pattern: RegExp | null };
export interface ReviewBot {
  readonly id: string;
  readonly authors: readonly ReviewBotAuthor[];
  readonly passMarkers: readonly PassMarker[];
  /** Lowercase substrings of the check or status name the bot reports while reviewing. */
  readonly runningChecks: readonly string[];
}
export type ReviewBots = readonly ReviewBot[];

export class ReviewBotConfigError extends Error {
  constructor(detail: string) {
    super(`invalid review-bot config: ${detail}`);
    this.name = "ReviewBotConfigError";
  }
}
// GraphQL reports app logins bare ("coderabbitai"); REST appends "[bot]".
const normalizeLogin = (login: string | null): string =>
  (login ?? "").toLowerCase().replace(/\[bot\]$/, "");
function fail(detail: string): never {
  throw new ReviewBotConfigError(detail);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function strings(value: unknown, path: string): readonly string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim() === "")
  )
    fail(`${path} must be a list of non-empty strings`);
  return value;
}
function list(value: unknown, path: string): readonly unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(`${path} must be a list`);
  return value;
}
function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "")
    fail(`${path} must be a non-empty string`);
  return value;
}
function parseAuthor(value: unknown, path: string): ReviewBotAuthor {
  if (!isRecord(value)) fail(`${path} must be an object`);
  const match = value.match ?? "exact";
  if (match !== "exact" && match !== "contains")
    fail(`${path}.match must be "exact" or "contains"`);
  const login = normalizeLogin(nonEmptyString(value.login, `${path}.login`));
  if (login.trim() === "") fail(`${path}.login must name an account`);
  return {
    login,
    match,
    bodyTokens: strings(value.bodyTokens, `${path}.bodyTokens`).map((token) =>
      token.toLowerCase()
    ),
  };
}
function regex(value: unknown, path: string): RegExp {
  const source = nonEmptyString(value, path);
  try {
    return new RegExp(source);
  } catch (error) {
    return fail(
      `${path} is not a regular expression: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
function parsePassMarker(value: unknown, path: string): PassMarker {
  if (!isRecord(value)) fail(`${path} must be an object`);
  const key = value.key ?? "capture";
  if (key === "reviewed-commit")
    return {
      key,
      pattern:
        value.pattern === undefined
          ? null
          : regex(value.pattern, `${path}.pattern`),
    };
  if (key !== "capture")
    fail(`${path}.key must be "capture" or "reviewed-commit"`);
  const pattern = regex(value.pattern, `${path}.pattern`);
  const groups = new RegExp(`${pattern.source}|`).exec("")?.length ?? 0;
  if (groups < 2) fail(`${path}.pattern needs a capture group for the run ID`);
  return { key, pattern };
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
    if (!Array.isArray(bot.authors) || bot.authors.length === 0)
      fail(`${path}.authors must be a non-empty list`);
    return {
      id,
      authors: bot.authors.map((author, n) =>
        parseAuthor(author, `${path}.authors[${n}]`)
      ),
      passMarkers: list(bot.passMarkers, `${path}.passMarkers`).map(
        (marker, n) => parsePassMarker(marker, `${path}.passMarkers[${n}]`)
      ),
      runningChecks: strings(bot.runningChecks, `${path}.runningChecks`).map(
        (token) => token.toLowerCase()
      ),
    };
  });
}
export const DEFAULT_REVIEW_BOTS: ReviewBots = parseReviewBots(defaults);
export function loadReviewBots(path: string): ReviewBots {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    return fail(
      `cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  try {
    return parseReviewBots(JSON.parse(text));
  } catch (error) {
    if (error instanceof ReviewBotConfigError) throw error;
    return fail(
      `${path} is not JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
export const isReviewBotCheck = (name: string, bots: ReviewBots): boolean =>
  bots.some((bot) =>
    bot.runningChecks.some((token) => name.toLowerCase().includes(token))
  );

function authorMatches(
  author: ReviewBotAuthor,
  login: string,
  body: string
): boolean {
  const loginMatches =
    author.match === "contains"
      ? login.includes(author.login)
      : login === author.login;
  return (
    loginMatches &&
    (author.bodyTokens.length === 0 ||
      author.bodyTokens.some((token) => body.includes(token)))
  );
}
export function reviewBotFor(
  comment: T.ReviewComment | null,
  bots: ReviewBots
): ReviewBot | null {
  if (comment === null) return null;
  const login = normalizeLogin(comment.authorLogin);
  const body = comment.body.toLowerCase();
  return (
    bots.find((bot) =>
      bot.authors.some((author) => authorMatches(author, login, body))
    ) ?? null
  );
}
function markerKey(marker: PassMarker, comment: T.ReviewComment): string | null {
  switch (marker.key) {
    case "capture":
      return marker.pattern.exec(comment.body)?.[1] || null;
    case "reviewed-commit":
      if (marker.pattern !== null && !marker.pattern.test(comment.body))
        return null;
      return comment.reviewedCommit === null
        ? null
        : `commit:${comment.reviewedCommit}`;
    default: {
      const unreachable: never = marker;
      return unreachable;
    }
  }
}
function passKey(bot: ReviewBot, comment: T.ReviewComment): string | null {
  for (const marker of bot.passMarkers) {
    const key = markerKey(marker, comment);
    if (key !== null) return key;
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
  return new Map(
    [...keys].map(([id, seen]) => [id, Math.max(seen.size, 1)])
  );
}
