import { WebClient } from "@slack/web-api";

export function createSlackWebClient(): WebClient | undefined {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error(
      "[orchestrate] SLACK_BOT_TOKEN not set; Slack visibility disabled"
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
