import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import type { Command } from "commander";

import { createSlackAdapter } from "../adapters/index.ts";
import { appendAgentFooter } from "../core/agent-manager.ts";
import { postOrQueueComment } from "../core/comment-retry-queue.ts";
import { redactBody } from "../core/redact-body.ts";
import { type Plan, parsePlanJson, parseStateJson } from "../schemas.ts";
import {
  type CommentOptions,
  errorMessage,
  loadAllowedSlackThreadOrBail,
  loadCommentDestinations,
  parseCommentCriticalityOrBail,
  resolveTaskBody,
} from "./util.ts";

type CommentCommandOptions = CommentOptions & {
  sender: string;
  criticality: string;
  file?: string;
  comment?: string;
  task?: string;
  threadTs?: string;
  agentId?: string;
};

const COMMENTS_PLAN_SLACK_CHANNEL_MESSAGE =
  "comments require a workspace with a plan that has plan.slackChannel set; run kickoff or run --root with --slack-channel first";

export function registerCommentCommands(program: Command): void {
  program
    .command("comment")
    .argument(
      "[body...]",
      "Comment body (or '-' to read stdin). Required unless --file is set."
    )
    .option(
      "--workspace <path>",
      "Workspace whose plan.slackKickoffRef scopes the bot to the run thread (mandatory outside operator mode)."
    )
    .option("--sender <name>", "Sender name stored with the comment", "agent")
    .option(
      "--task <name>",
      "Task name used to validate context; posts still go to the run thread."
    )
    .option("--thread-ts <ts>", "Slack thread_ts for the existing run thread.")
    .option(
      "--criticality <level>",
      "best_effort | required (required uses comment-retry-queue.json under --workspace)",
      "best_effort"
    )
    .option(
      "--file <path>",
      "Upload a local file to the target thread instead of posting text. Path must resolve under --workspace outside operator mode."
    )
    .option(
      "--comment <text>",
      "Initial comment shown alongside the uploaded file (only with --file)."
    )
    .option(
      "--agent-id <id>",
      "Cloud agent id for the footer link back to cursor.com (omit for operator-issued posts)."
    )
    .description(
      "Post a Slack comment, or upload a file with --file, inside the run thread. Use MCPs directly for Linear, GitHub, and other external systems."
    )
    .action(async (bodyParts: string[], opts: CommentCommandOptions) => {
      try {
        if (!opts.task?.trim() && !opts.threadTs?.trim()) {
          throw new Error(
            "comment requires --task <name> or --thread-ts <ts>; kickoff messages are created by run"
          );
        }
        const allowedSlackThread = loadAllowedSlackThreadOrBail(opts.workspace);
        const target = resolveCommentTarget({
          workspace: opts.workspace,
          task: opts.task,
          threadTs: opts.threadTs,
          allowedSlackThread,
        });
        const destination = slackDestinationForThread(target);
        if (opts.file) {
          await uploadFileToThread({
            channel: target.channel,
            threadTs: target.threadTs,
            filePath: opts.file,
            initialComment: opts.comment,
            sender: opts.sender,
            agentId: opts.agentId,
            workspace: opts.workspace,
          });
          console.log(`uploaded ${opts.file} to ${destination}`);
          return;
        }
        if (bodyParts.length === 0) {
          throw new Error("comment body is required when --file is not set");
        }
        const body = resolveTaskBody(bodyParts);
        const safeBody = requireSafeCommentBody(body);
        const result = await postOrQueueComment({
          destinations: loadCommentDestinations(target.channel),
          workspace: opts.workspace,
          destination,
          body: appendAgentFooter(safeBody, opts.agentId),
          sender: opts.sender,
          criticality: parseCommentCriticalityOrBail(opts.criticality),
          allowedSlackThread,
        });
        console.log(
          result === "posted"
            ? `posted comment on ${destination}`
            : `queued required comment on ${destination}`
        );
      } catch (err) {
        console.error(errorMessage(err));
        process.exit(1);
      }
    });
}

async function uploadFileToThread(args: {
  channel: string;
  threadTs: string;
  filePath: string;
  initialComment: string | undefined;
  sender: string;
  agentId: string | undefined;
  workspace: string | undefined;
}): Promise<void> {
  const allowedThread = loadAllowedSlackThreadOrBail(args.workspace);
  if (!existsSync(args.filePath) || !statSync(args.filePath).isFile()) {
    throw new Error(
      `--file path is missing or not a regular file: ${args.filePath}`
    );
  }
  // Non-operators can only upload files from the run workspace.
  if (allowedThread !== undefined) {
    assertThreadAllowed(args.threadTs, allowedThread);
    if (!args.workspace) {
      throw new Error(
        "--file requires --workspace so uploads stay confined to the run's workspace"
      );
    }
    assertFileInsideWorkspace(args.filePath, args.workspace);
  }
  const slack = createSlackAdapter(args.channel);
  if (!slack) {
    throw new Error(
      "SLACK_BOT_TOKEN not set; cannot upload Slack file"
    );
  }
  const content = readFileSync(args.filePath);
  const initial =
    args.initialComment ?? `${args.sender} attached ${basename(args.filePath)}`;
  const safeInitial = requireSafeCommentBody(initial);
  await slack.uploadFileToThread({
    threadTs: args.threadTs,
    filename: basename(args.filePath),
    content,
    initialComment: appendAgentFooter(safeInitial, args.agentId),
  });
}

function requireSafeCommentBody(body: string): string {
  const result = redactBody(body);
  if (result.reasons.length === 0) return result.text;
  throw new Error(`comment body refused: ${result.reasons.join("; ")}`);
}

// Canonicalizes both paths via realpath so symlinks can't escape the
// workspace subtree. Rejects paths outside the workspace, absolute
// `relative()` output (when the file lives on a different volume), or
// the workspace root itself.
function assertFileInsideWorkspace(filePath: string, workspace: string): void {
  const fileAbs = realpathSync(resolve(filePath));
  const workspaceAbs = realpathSync(resolve(workspace));
  const rel = relative(workspaceAbs, fileAbs);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(
      `--file ${filePath} resolves to ${fileAbs}, which is outside ` +
        `--workspace ${workspaceAbs}; uploads are confined to the workspace ` +
        `subtree unless operator mode is enabled.`
    );
  }
}

function resolveCommentTarget(args: {
  workspace: string | undefined;
  task: string | undefined;
  threadTs: string | undefined;
  allowedSlackThread: { channel: string; threadTs: string } | undefined;
}): { channel: string; threadTs: string } {
  const explicit = args.threadTs?.trim();
  if (explicit) {
    assertThreadAllowed(explicit, args.allowedSlackThread);
    return {
      channel: loadPlanSlackChannelOrBail(args.workspace),
      threadTs: explicit,
    };
  }
  const taskName = args.task?.trim();
  if (!taskName) {
    throw new Error(
      "comment requires --task <name> or --thread-ts <ts>; kickoff messages are created by run"
    );
  }
  if (!args.workspace) {
    throw new Error(
      "--task requires --workspace so the task Slack thread can be resolved"
    );
  }
  const statePath = join(resolve(args.workspace), "state.json");
  const state = parseStateJson(readFileSync(statePath, "utf8"), statePath);
  const task = state.tasks.find(candidate => candidate.name === taskName);
  if (!task) {
    throw new Error(`task ${taskName} not found in ${statePath}`);
  }
  // Operator mode: load the kickoff thread root directly. task.slackTs is the
  // reply's ts (the per-task status mirror) and would start a sub-thread off
  // the task message instead of posting in the run thread.
  return loadKickoffRefOrBail({ workspace: args.workspace, taskName });
}

export function loadKickoffThreadTsOrBail(args: {
  workspace: string;
  taskName: string;
}): string {
  return loadKickoffRefOrBail(args).threadTs;
}

function loadKickoffRefOrBail(args: {
  workspace: string;
  taskName: string;
}): { channel: string; threadTs: string } {
  const planPath = join(resolve(args.workspace), "plan.json");
  if (!existsSync(planPath)) {
    throw new Error(
      `--task ${args.taskName} requires plan.json with slackKickoffRef in ${args.workspace}; ` +
        `pass --thread-ts explicitly to override`
    );
  }
  const plan = parsePlanJson(readFileSync(planPath, "utf8"), planPath);
  const kickoffRef = plan.slackKickoffRef;
  if (!kickoffRef?.channel || !kickoffRef.ts) {
    throw new Error(
      `${planPath} has no slackKickoffRef; pass --thread-ts explicitly`
    );
  }
  return { channel: requirePlanSlackChannel(plan), threadTs: kickoffRef.ts };
}

function loadPlanSlackChannelOrBail(workspace: string | undefined): string {
  if (!workspace) {
    throw new Error(COMMENTS_PLAN_SLACK_CHANNEL_MESSAGE);
  }
  const planPath = join(resolve(workspace), "plan.json");
  if (!existsSync(planPath)) {
    throw new Error(COMMENTS_PLAN_SLACK_CHANNEL_MESSAGE);
  }
  return requirePlanSlackChannel(
    parsePlanJson(readFileSync(planPath, "utf8"), planPath)
  );
}

function requirePlanSlackChannel(plan: Plan): string {
  const channel = plan.slackChannel?.trim();
  if (!channel) {
    throw new Error(COMMENTS_PLAN_SLACK_CHANNEL_MESSAGE);
  }
  return channel;
}

function slackDestinationForThread(target: {
  channel: string;
  threadTs: string;
}): string {
  return `slack:${target.channel}:${target.threadTs}`;
}

function assertThreadAllowed(
  threadTs: string,
  allowedThread: { channel: string; threadTs: string } | undefined
): void {
  if (!allowedThread || threadTs === allowedThread.threadTs) return;
  throw new Error(
    `thread_ts ${threadTs} is outside this workspace's run thread (${allowedThread.channel}:${allowedThread.threadTs})`
  );
}
