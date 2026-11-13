import { WebClient } from "@slack/web-api";

/** Bot token env var. Prefixed so it can't collide with another tool's Slack app. */
export const SLACK_TOKEN_ENV = "ORCHESTRATE_SLACK_BOT_TOKEN";

const LEGACY_SLACK_TOKEN_ENV = "SLACK_BOT_TOKEN";

export function slackTokenConfigured(): boolean {
  return Boolean(process.env[SLACK_TOKEN_ENV]?.trim());
}

export function createSlackWebClient(): WebClient | undefined {
  const token = process.env[SLACK_TOKEN_ENV];
  if (!token) {
    // Losing Slack silently after the rename would look like an outage, so
    // name the old variable when it's the only one set.
    console.error(
      process.env[LEGACY_SLACK_TOKEN_ENV]
        ? `[orchestrate] ${LEGACY_SLACK_TOKEN_ENV} is no longer read; rename it to ${SLACK_TOKEN_ENV}. Slack visibility disabled`
        : `[orchestrate] ${SLACK_TOKEN_ENV} not set; Slack visibility disabled`
    );
    return undefined;
  }
  return new WebClient(token, {
    retryConfig: {
      retries: 5,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 60_000,
    },
  });
}
