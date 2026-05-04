import { randomUUID } from "node:crypto";
import {
  type ChatPostMessageResponse,
  type ChatUpdateResponse,
  type ConversationsRepliesResponse,
  ErrorCode,
  type FilesCompleteUploadExternalResponse,
  type ReactionsGetResponse,
  type UsersLookupByEmailResponse,
  type WebAPICallResult,
  type WebClient,
} from "@slack/web-api";

import type { SlackAdapter, SlackMessageRef } from "../types.ts";

export type SlackWebClient = Pick<
  WebClient,
  "chat" | "conversations" | "files" | "reactions" | "users"
>;

type FilesUploadV2Response = WebAPICallResult & {
  files?: FilesCompleteUploadExternalResponse[];
};

export class SlackApiAdapter implements SlackAdapter {
  constructor(
    private readonly client: SlackWebClient,
    private readonly channelId: string
  ) {}

  async postRunKickoff(args: {
    text: string;
    username: string;
    iconUrl?: string;
    iconEmoji?: string;
  }): Promise<SlackMessageRef> {
    return this.postChannelRootMessage({
      text: args.text,
      username: args.username,
      iconUrl: args.iconUrl,
      iconEmoji: args.iconEmoji,
      clientMsgId: randomUUID(),
    });
  }

  async lookupFirstNameByEmail(email: string): Promise<string | undefined> {
    try {
      const payload = (await this.client.users.lookupByEmail({
        email,
      })) as UsersLookupByEmailResponse;
      const profile = payload.user?.profile;
      const candidate =
        profile?.first_name ||
        profile?.real_name ||
        profile?.display_name ||
        payload.user?.real_name ||
        payload.user?.name;
      const first = candidate?.trim().split(/\s+/)[0];
      return first && first.length > 0 ? first : undefined;
    } catch {
      return undefined;
    }
  }

  async postInThread(args: {
    threadTs: string;
    username: string;
    iconUrl?: string;
    iconEmoji?: string;
    text: string;
  }): Promise<SlackMessageRef> {
    return this.postMessageInThread({
      threadTs: args.threadTs,
      text: args.text,
      username: args.username,
      iconUrl: args.iconUrl,
      iconEmoji: args.iconEmoji,
      clientMsgId: randomUUID(),
    });
  }

  async editThreadMessage(args: {
    threadTs: string;
    ts: string;
    text: string;
  }): Promise<SlackMessageRef> {
    // Keep edits on the same thread-only adapter shape as posts and uploads.
    void args.threadTs;
    const updated = await this.client.chat.update({
      channel: this.channelId,
      ts: args.ts,
      text: args.text,
    });
    return messageRefFromResponse(updated, {
      method: "chat.update",
      fallback: { channel: this.channelId, ts: args.ts },
    });
  }

  async uploadFileToThread(args: {
    threadTs: string;
    filename: string;
    content: Buffer | Uint8Array;
    initialComment?: string;
  }): Promise<{ fileId: string; permalink: string }> {
    const uploaded = (await this.client.files.uploadV2({
      channel_id: this.channelId,
      thread_ts: args.threadTs,
      filename: args.filename,
      title: args.filename,
      file: Buffer.from(args.content),
      ...(args.initialComment ? { initial_comment: args.initialComment } : {}),
    })) as FilesUploadV2Response;
    const file = uploaded.files
      ?.flatMap(completion => completion.files ?? [])
      .find(candidate => candidate.id && candidate.permalink);
    if (!file?.id || !file.permalink) {
      throw new Error("Slack files.uploadV2 did not return a permalink");
    }
    return {
      fileId: file.id,
      permalink: file.permalink,
    };
  }

  async getReactions(args: SlackMessageRef): Promise<{
    reactions: { name: string; users: string[] }[];
  }> {
    const payload = (await this.client.reactions.get({
      channel: args.channel,
      timestamp: args.ts,
      full: true,
    })) as ReactionsGetResponse;
    return {
      reactions: (payload.message?.reactions ?? []).flatMap(reaction =>
        reaction.name
          ? [{ name: reaction.name, users: reaction.users ?? [] }]
          : []
      ),
    };
  }

  async getThreadReplies(
    args: SlackMessageRef & {
      limit: number;
      cursor?: string;
      latest?: string;
    }
  ): Promise<{
    messages: { ts: string; text: string }[];
    nextCursor?: string;
  }> {
    const payload = (await this.client.conversations.replies({
      channel: args.channel,
      ts: args.ts,
      limit: args.limit,
      cursor: args.cursor,
      inclusive: true,
      latest: args.latest,
    })) as ConversationsRepliesResponse;
    return {
      messages: (payload.messages ?? []).flatMap(message =>
        message.ts && typeof message.text === "string"
          ? [{ ts: message.ts, text: message.text }]
          : []
      ),
      nextCursor: payload.response_metadata?.next_cursor || undefined,
    };
  }

  async postCommentInThread(args: {
    threadTs: string;
    text: string;
    username?: string;
    clientMsgId?: string;
  }): Promise<SlackMessageRef> {
    return this.postMessageInThread(args);
  }

  async addReaction(args: SlackMessageRef & { name: string }): Promise<void> {
    await this.callIgnoringSlackError(
      () =>
        this.client.reactions.add({
          channel: args.channel,
          timestamp: args.ts,
          name: args.name,
        }),
      "already_reacted"
    );
  }

  async removeReaction(
    args: SlackMessageRef & { name: string }
  ): Promise<void> {
    await this.callIgnoringSlackError(
      () =>
        this.client.reactions.remove({
          channel: args.channel,
          timestamp: args.ts,
          name: args.name,
        }),
      "no_reaction"
    );
  }

  private async callIgnoringSlackError(
    call: () => Promise<unknown>,
    benignError: string
  ): Promise<void> {
    try {
      await call();
    } catch (err) {
      if (slackErrorCode(err) === benignError) return;
      if (err instanceof Error && err.message.includes(`: ${benignError}`)) {
        return;
      }
      throw err;
    }
  }

  private async postChannelRootMessage(args: {
    text: string;
    username?: string;
    iconUrl?: string;
    iconEmoji?: string;
    clientMsgId?: string;
  }): Promise<SlackMessageRef> {
    const payload = await this.client.chat.postMessage({
      channel: this.channelId,
      text: args.text,
      ...(args.username ? { username: args.username } : {}),
      ...iconOverride(args),
      ...(args.clientMsgId ? { client_msg_id: args.clientMsgId } : {}),
    });
    return messageRefFromResponse(payload, { method: "chat.postMessage" });
  }

  private async postMessageInThread(args: {
    threadTs: string;
    text: string;
    username?: string;
    iconUrl?: string;
    iconEmoji?: string;
    clientMsgId?: string;
  }): Promise<SlackMessageRef> {
    const payload = await this.client.chat.postMessage({
      channel: this.channelId,
      text: args.text,
      thread_ts: args.threadTs,
      ...(args.username ? { username: args.username } : {}),
      ...iconOverride(args),
      ...(args.clientMsgId ? { client_msg_id: args.clientMsgId } : {}),
    });
    return messageRefFromResponse(payload, { method: "chat.postMessage" });
  }
}

// Slack's `Icon` is `IconURL | IconEmoji` (each variant `never`s the other),
// so the spread must emit at most one key. `icon_url` wins when both are set,
// matching Slack's server-side precedence.
function iconOverride(args: {
  iconUrl?: string;
  iconEmoji?: string;
}): { icon_url: string } | { icon_emoji: string } | Record<string, never> {
  if (args.iconUrl) return { icon_url: args.iconUrl };
  if (args.iconEmoji) return { icon_emoji: args.iconEmoji };
  return {};
}

function messageRefFromResponse(
  payload: ChatPostMessageResponse | ChatUpdateResponse,
  args: { method: string; fallback?: SlackMessageRef }
): SlackMessageRef {
  const channel = payload.channel ?? args.fallback?.channel;
  const ts = payload.ts ?? args.fallback?.ts;
  if (!channel || !ts) {
    throw new Error(`Slack ${args.method} did not return a message reference`);
  }
  return { channel, ts };
}

function slackErrorCode(err: unknown): string | undefined {
  if (
    !(err instanceof Error) ||
    !("code" in err) ||
    err.code !== ErrorCode.PlatformError ||
    !("data" in err)
  ) {
    return undefined;
  }
  const { data } = err;
  if (typeof data !== "object" || data === null || !("error" in data)) {
    return undefined;
  }
  return typeof data.error === "string" ? data.error : undefined;
}
