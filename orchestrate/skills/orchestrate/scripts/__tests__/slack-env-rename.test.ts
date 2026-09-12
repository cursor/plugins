import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  createSlackWebClient,
  SLACK_TOKEN_ENV,
  slackTokenConfigured,
} from "../adapters/slack/client.ts";

const LEGACY_TOKEN_ENV = "SLACK_BOT_TOKEN";
const KEYS = [SLACK_TOKEN_ENV, LEGACY_TOKEN_ENV] as const;

const saved: Record<string, string | undefined> = {};
let errors: string[] = [];
let originalConsoleError: typeof console.error;

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  errors = [];
  originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  };
});

afterEach(() => {
  console.error = originalConsoleError;
  for (const key of KEYS) {
    const prior = saved[key];
    if (prior === undefined) delete process.env[key];
    else process.env[key] = prior;
  }
});

describe("Slack token env var", () => {
  test("the prefixed variable enables Slack", () => {
    process.env[SLACK_TOKEN_ENV] = "xoxb-test";
    expect(slackTokenConfigured()).toBe(true);
    expect(createSlackWebClient()).toBeDefined();
    expect(errors).toEqual([]);
  });

  test("neither variable set disables Slack with one line", () => {
    expect(slackTokenConfigured()).toBe(false);
    expect(createSlackWebClient()).toBeUndefined();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(`${SLACK_TOKEN_ENV} not set`);
  });

  // The rename would otherwise look like a Slack outage: the token is present,
  // but under the old name, so the run goes quiet with no explanation.
  test("the unprefixed variable is ignored and named in the notice", () => {
    process.env[LEGACY_TOKEN_ENV] = "xoxb-test";
    expect(slackTokenConfigured()).toBe(false);
    expect(createSlackWebClient()).toBeUndefined();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(
      `${LEGACY_TOKEN_ENV} is no longer read; rename it to ${SLACK_TOKEN_ENV}`
    );
  });

  test("the prefixed variable wins when both are set", () => {
    process.env[LEGACY_TOKEN_ENV] = "xoxb-legacy";
    process.env[SLACK_TOKEN_ENV] = "xoxb-test";
    expect(slackTokenConfigured()).toBe(true);
    expect(createSlackWebClient()).toBeDefined();
    expect(errors).toEqual([]);
  });
});
