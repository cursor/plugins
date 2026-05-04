import type { Command } from "commander";
import { appendAgentFooter } from "../core/agent-manager.ts";
import {
  assertOperatorModeOrBail,
  errorMessage,
  loadAndonTargetOrBail,
} from "./util.ts";

const ANDON_RAISED_PREFIX = "🚨 ANDON RAISED";
const ANDON_CLEARED_PREFIX = "✅ ANDON CLEARED";

/**
 * Children gate on `:rotating_light:` via `reactions.get`, which is cheap
 * and text-free. The reason/note posts as a separate thread message so
 * humans can see *why* orchestration paused without children reading
 * message bodies. The prefixes above let `attention.log` sweeps grep
 * reasons back out of history.
 */
export function registerAndonCommands(program: Command): void {
  const andonProgram = program
    .command("andon")
    .description("Raise or clear the tree-wide Andon spawn pause.");

  andonProgram
    .command("raise")
    .requiredOption(
      "--reason <text>",
      "Posted to the run thread so the tree sees why orchestration paused."
    )
    .option(
      "--workspace <path>",
      "Workspace containing plan.json with slackKickoffRef"
    )
    .option(
      "--sender <name>",
      "Label for the reason message (defaults to $USER, else 'operator')",
      defaultSender()
    )
    .option(
      "--agent-id <id>",
      "Cloud agent id for the footer link back to cursor.com (omit for operator-issued raises)."
    )
    .description(
      "Post the reason in the run thread and add :rotating_light: to the kickoff message."
    )
    .action(
      async (opts: {
        reason: string;
        workspace?: string;
        sender: string;
        agentId?: string;
      }) => {
        try {
          const { slack, ref } = loadAndonTargetOrBail(opts);
          const head = `${ANDON_RAISED_PREFIX} by ${opts.sender}: ${opts.reason}`;
          await slack.postCommentInThread({
            threadTs: ref.ts,
            text: appendAgentFooter(head, opts.agentId),
            username: "orchestrate",
          });
          await slack.addReaction({ ...ref, name: "rotating_light" });
        } catch (err) {
          console.error(`andon raise failed: ${errorMessage(err)}`);
          process.exit(1);
        }
      }
    );

  andonProgram
    .command("clear")
    .option(
      "--workspace <path>",
      "Workspace containing plan.json with slackKickoffRef"
    )
    .option(
      "--note <text>",
      "Optional note posted to the run thread alongside the clear."
    )
    .option(
      "--sender <name>",
      "Label for the clear message (defaults to $USER, else 'operator')",
      defaultSender()
    )
    .option(
      "--agent-id <id>",
      "Cloud agent id for the footer link back to cursor.com (omit for operator-issued clears)."
    )
    .description(
      "Remove :rotating_light: from the kickoff message and note the clear in the run thread."
    )
    .action(
      async (opts: {
        workspace?: string;
        note?: string;
        sender: string;
        agentId?: string;
      }) => {
        try {
          assertOperatorModeOrBail(
            "andon clear (workers must not clear an active Andon)"
          );
          const { slack, ref } = loadAndonTargetOrBail(opts);
          const note = opts.note?.trim();
          const head = note
            ? `${ANDON_CLEARED_PREFIX} by ${opts.sender}: ${note}`
            : `${ANDON_CLEARED_PREFIX} by ${opts.sender}`;
          await slack.postCommentInThread({
            threadTs: ref.ts,
            text: appendAgentFooter(head, opts.agentId),
            username: "orchestrate",
          });
          await slack.removeReaction({ ...ref, name: "rotating_light" });
        } catch (err) {
          console.error(`andon clear failed: ${errorMessage(err)}`);
          process.exit(1);
        }
      }
    );
}

function defaultSender(): string {
  return process.env.USER?.trim() || "operator";
}
