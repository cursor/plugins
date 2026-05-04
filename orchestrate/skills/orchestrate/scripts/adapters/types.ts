import type { TaskStatus, TaskType } from "../schemas.ts";

export type { TaskStatus, TaskType };

export type CommentCriticality = "best_effort" | "required";

export type SlackMessageRef = { channel: string; ts: string };

export interface SlackAdapter {
  postRunKickoff(args: {
    text: string;
    username: string;
    iconUrl?: string;
    iconEmoji?: string;
  }): Promise<SlackMessageRef>;
  /**
   * Best-effort first-name lookup for `<firstName>'s bot` kickoff bot
   * username. Returns undefined when the lookup fails (missing scope, no
   * match, network error). The dispatcher CLI uses this to default
   * `plan.dispatcher.firstName` from the operator's git email.
   */
  lookupFirstNameByEmail(email: string): Promise<string | undefined>;
  postInThread(args: {
    threadTs: string;
    username: string;
    iconUrl?: string;
    iconEmoji?: string;
    text: string;
  }): Promise<SlackMessageRef>;
  editThreadMessage(args: {
    threadTs: string;
    ts: string;
    text: string;
  }): Promise<SlackMessageRef>;
  uploadFileToThread(args: {
    threadTs: string;
    filename: string;
    content: Buffer | Uint8Array;
    initialComment?: string;
  }): Promise<{ fileId: string; permalink: string }>;
  getReactions(args: SlackMessageRef): Promise<{
    reactions: { name: string; users: string[] }[];
  }>;
  getThreadReplies(
    args: SlackMessageRef & {
      limit: number;
      cursor?: string;
      latest?: string;
    }
  ): Promise<{
    messages: { ts: string; text: string }[];
    nextCursor?: string;
  }>;
  postCommentInThread(args: {
    threadTs: string;
    text: string;
    username?: string;
    clientMsgId?: string;
  }): Promise<SlackMessageRef>;
  addReaction(args: SlackMessageRef & { name: string }): Promise<void>;
  removeReaction(args: SlackMessageRef & { name: string }): Promise<void>;
}
