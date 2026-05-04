import { createSlackWebClient } from "./slack/client.ts";
import { SlackApiAdapter } from "./slack/index.ts";
import type { SlackAdapter } from "./types.ts";

export function createSlackAdapter(channelId: string): SlackAdapter | undefined {
  const client = createSlackWebClient();
  if (!client) return undefined;
  return new SlackApiAdapter(client, channelId);
}
