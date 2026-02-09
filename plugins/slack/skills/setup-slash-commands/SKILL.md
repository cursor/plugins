# Skill: Set Up Slash Commands

## When to Use

Use this skill when the user wants to:

- Add slash commands to an existing Slack app
- Build a command-driven bot with argument parsing and subcommands
- Implement slash commands that open modals for data entry
- Create commands with deferred responses for long-running operations

## Prerequisites

- An existing Slack app with the `commands` scope (see **create-slack-bot** skill for initial setup)
- `@slack/bolt` installed in the project
- The Slack App dashboard configured with Interactivity enabled

## Step 1 — Register the Command in the Slack Dashboard

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and select your app.
2. Navigate to **Slash Commands** → **Create New Command**.
3. Fill in the details:
   - **Command**: `/deploy` (example)
   - **Request URL**: `https://your-app.example.com/slack/events` (or leave blank for Socket Mode)
   - **Short Description**: "Deploy a service to an environment"
   - **Usage Hint**: `[service] [environment]`
4. Save the command.
5. Reinstall the app to your workspace so the new command is registered.

## Step 2 — Implement a Basic Slash Command

```typescript
// src/commands/deploy.ts
import { App } from "@slack/bolt";

export function registerDeployCommand(app: App): void {
  app.command("/deploy", async ({ ack, command, say, client, logger }) => {
    await ack(); // Always ack first

    const args = command.text.trim().split(/\s+/);
    const service = args[0];
    const environment = args[1] || "staging";

    // Validate input
    if (!service) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: "Usage: `/deploy <service> [environment]`\nExample: `/deploy api production`",
      });
      return;
    }

    const validEnvironments = ["staging", "production", "development"];
    if (!validEnvironments.includes(environment)) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: `Invalid environment \`${environment}\`. Must be one of: ${validEnvironments.join(", ")}`,
      });
      return;
    }

    // Post a visible message to the channel
    await say({
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "🚀 Deployment Started" },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Service:*\n\`${service}\`` },
            { type: "mrkdwn", text: `*Environment:*\n\`${environment}\`` },
            { type: "mrkdwn", text: `*Triggered by:*\n<@${command.user_id}>` },
            { type: "mrkdwn", text: `*Status:*\n⏳ In progress…` },
          ],
        },
      ],
      text: `Deployment of ${service} to ${environment} started by <@${command.user_id}>`,
    });
  });
}
```

## Step 3 — Add Subcommand Routing

For commands with multiple subcommands, use a router pattern:

```typescript
// src/commands/ticket.ts
import { App, SlashCommand } from "@slack/bolt";

type SubcommandHandler = (params: {
  command: SlashCommand;
  args: string[];
  client: any;
  say: any;
}) => Promise<void>;

const subcommands: Record<string, SubcommandHandler> = {
  create: async ({ command, client }) => {
    // Open a modal for ticket creation
    await client.views.open({
      trigger_id: command.trigger_id,
      view: {
        type: "modal",
        callback_id: "create_ticket_modal",
        title: { type: "plain_text", text: "Create Ticket" },
        submit: { type: "plain_text", text: "Create" },
        blocks: [
          {
            type: "input",
            block_id: "title_block",
            label: { type: "plain_text", text: "Title" },
            element: {
              type: "plain_text_input",
              action_id: "title_input",
              placeholder: { type: "plain_text", text: "Brief description of the issue" },
            },
          },
          {
            type: "input",
            block_id: "priority_block",
            label: { type: "plain_text", text: "Priority" },
            element: {
              type: "static_select",
              action_id: "priority_select",
              options: [
                { text: { type: "plain_text", text: "🔴 Critical" }, value: "critical" },
                { text: { type: "plain_text", text: "🟠 High" }, value: "high" },
                { text: { type: "plain_text", text: "🟡 Medium" }, value: "medium" },
                { text: { type: "plain_text", text: "🟢 Low" }, value: "low" },
              ],
            },
          },
          {
            type: "input",
            block_id: "description_block",
            label: { type: "plain_text", text: "Description" },
            element: {
              type: "plain_text_input",
              action_id: "description_input",
              multiline: true,
              placeholder: { type: "plain_text", text: "Detailed description…" },
            },
            optional: true,
          },
        ],
      },
    });
  },

  list: async ({ args, say }) => {
    const status = args[0] || "open";
    const tickets = await fetchTickets({ status });

    if (tickets.length === 0) {
      await say(`No ${status} tickets found.`);
      return;
    }

    const ticketBlocks = tickets.slice(0, 10).map((ticket) => ({
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: `*<${ticket.url}|${ticket.id}>*: ${ticket.title}\n_${ticket.priority} · ${ticket.status} · assigned to <@${ticket.assignee}>_`,
      },
    }));

    await say({
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `📋 ${status.charAt(0).toUpperCase() + status.slice(1)} Tickets` },
        },
        ...ticketBlocks,
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Showing ${Math.min(tickets.length, 10)} of ${tickets.length} tickets`,
            },
          ],
        },
      ],
      text: `${tickets.length} ${status} tickets`,
    });
  },

  assign: async ({ args, say }) => {
    const ticketId = args[0];
    const userId = args[1]?.replace(/[<@>]/g, "");

    if (!ticketId || !userId) {
      await say("Usage: `/ticket assign <ticket-id> @user`");
      return;
    }

    await assignTicket(ticketId, userId);
    await say(`Ticket \`${ticketId}\` assigned to <@${userId}> ✓`);
  },
};

export function registerTicketCommand(app: App): void {
  app.command("/ticket", async ({ ack, command, say, client, logger }) => {
    await ack();

    const [subcommand, ...args] = command.text.trim().split(/\s+/);

    if (!subcommand || !subcommands[subcommand]) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: [
          "*Available subcommands:*",
          "• `/ticket create` — Create a new ticket (opens a form)",
          "• `/ticket list [status]` — List tickets (default: open)",
          "• `/ticket assign <id> @user` — Assign a ticket",
        ].join("\n"),
      });
      return;
    }

    try {
      await subcommands[subcommand]({ command, args, client, say });
    } catch (error) {
      logger.error(`Error in /ticket ${subcommand}`, error);
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: `Something went wrong with \`/ticket ${subcommand}\`. Please try again.`,
      });
    }
  });
}

// Placeholder functions — replace with your actual implementation
async function fetchTickets(filter: { status: string }): Promise<any[]> {
  return [];
}

async function assignTicket(ticketId: string, userId: string): Promise<void> {
  // Implementation
}
```

## Step 4 — Handle Modal Submissions

When a slash command opens a modal, handle the submission in a separate view listener:

```typescript
// src/views/create-ticket.ts
import { App } from "@slack/bolt";

export function registerTicketViews(app: App): void {
  app.view("create_ticket_modal", async ({ ack, view, body, client, logger }) => {
    const values = view.state.values;
    const title = values.title_block.title_input.value!;
    const priority = values.priority_block.priority_select.selected_option!.value;
    const description = values.description_block?.description_input?.value || "";

    // Validate
    const errors: Record<string, string> = {};
    if (title.length < 5) {
      errors.title_block = "Title must be at least 5 characters";
    }
    if (title.length > 200) {
      errors.title_block = "Title must be under 200 characters";
    }

    if (Object.keys(errors).length > 0) {
      await ack({ response_action: "errors", errors });
      return;
    }

    await ack();

    try {
      const ticket = await createTicket({ title, priority, description, createdBy: body.user.id });

      // Notify the user in DM
      await client.chat.postMessage({
        channel: body.user.id,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `✅ Ticket *<${ticket.url}|${ticket.id}>* created successfully!\n*Title:* ${title}\n*Priority:* ${priority}`,
            },
          },
        ],
        text: `Ticket ${ticket.id} created: ${title}`,
      });
    } catch (error) {
      logger.error("Error creating ticket", error);
      await client.chat.postMessage({
        channel: body.user.id,
        text: "Sorry, there was an error creating your ticket. Please try again.",
      });
    }
  });
}

// Placeholder — replace with your actual implementation
async function createTicket(data: {
  title: string;
  priority: string;
  description: string;
  createdBy: string;
}): Promise<{ id: string; url: string }> {
  return { id: "TICK-001", url: "https://example.com/tickets/TICK-001" };
}
```

## Step 5 — Handle Deferred Responses for Long Operations

When a command triggers a long-running operation (> 3 seconds), acknowledge immediately and send follow-up updates using `response_url` or `chat.postMessage`.

```typescript
// src/commands/report.ts
import { App } from "@slack/bolt";

export function registerReportCommand(app: App): void {
  app.command("/report", async ({ ack, command, client, respond, logger }) => {
    // Acknowledge immediately with a loading message
    await ack({
      response_type: "ephemeral",
      text: "⏳ Generating your report… This may take a moment.",
    });

    try {
      // Long-running operation
      const report = await generateReport(command.text);

      // Send the result using respond() (uses response_url)
      await respond({
        response_type: "in_channel",
        replace_original: false,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "📊 Report Generated" },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Period:* ${report.period}\n*Total:* ${report.total}\n*Average:* ${report.average}`,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Download CSV" },
                url: report.csvUrl,
                action_id: "download_report",
              },
            ],
          },
        ],
        text: `Report generated: ${report.period}`,
      });
    } catch (error) {
      logger.error("Error generating report", error);
      await respond({
        response_type: "ephemeral",
        replace_original: true,
        text: "❌ Failed to generate the report. Please try again.",
      });
    }
  });
}

// Placeholder — replace with your actual implementation
async function generateReport(query: string): Promise<{
  period: string;
  total: number;
  average: number;
  csvUrl: string;
}> {
  await new Promise((r) => setTimeout(r, 5000)); // Simulate long operation
  return {
    period: "Last 30 days",
    total: 1234,
    average: 41.1,
    csvUrl: "https://example.com/reports/latest.csv",
  };
}
```

## Step 6 — Wire Everything Together

```typescript
// src/app.ts
import { App, LogLevel } from "@slack/bolt";
import "dotenv/config";
import { registerDeployCommand } from "./commands/deploy";
import { registerTicketCommand } from "./commands/ticket";
import { registerReportCommand } from "./commands/report";
import { registerTicketViews } from "./views/create-ticket";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  appToken: process.env.SLACK_APP_TOKEN!,
  socketMode: true,
  logLevel: LogLevel.INFO,
});

// Register commands
registerDeployCommand(app);
registerTicketCommand(app);
registerReportCommand(app);

// Register view handlers
registerTicketViews(app);

(async () => {
  await app.start();
  console.log("⚡️ Slack app with slash commands is running!");
})();
```

## Step 7 — Test Locally

1. Start the app: `npm run dev`
2. In Slack, type `/deploy api production` — you should see a deployment message.
3. Type `/deploy` with no arguments — you should see an ephemeral usage hint.
4. Type `/ticket create` — a modal should open for ticket creation.
5. Type `/ticket list` — you should see a list of tickets (or "no tickets" message).
6. Type `/report monthly` — you should see a loading message, then the report.

## Project Structure

```
my-slack-bot/
├── src/
│   ├── app.ts                    # Entry point — registers all handlers
│   ├── commands/
│   │   ├── deploy.ts             # /deploy command handler
│   │   ├── ticket.ts             # /ticket command with subcommands
│   │   └── report.ts             # /report command with deferred response
│   └── views/
│       └── create-ticket.ts      # Modal submission handler
├── dist/
├── .env
├── package.json
└── tsconfig.json
```

## Best Practices Summary

- **Always `await ack()`** before any other work in a command handler.
- **Use ephemeral messages** for errors, validation feedback, and help text so they don't clutter the channel.
- **Open modals** for multi-field input instead of parsing complex command text.
- **Use `respond()`** (via `response_url`) for deferred follow-ups to slash commands.
- **Validate early** — check arguments before doing any work.
- **Route subcommands** with a map/object pattern for clean separation of concerns.
- **Handle errors gracefully** — always catch and notify the user.
- **Use Block Kit** for rich, structured responses instead of plain text.

## Available Tools

- `@slack/bolt` — Slash command handling, modal triggers, and response management.
- Block Kit Builder — https://app.slack.com/block-kit-builder for designing responses.
- `ngrok` — Expose local server for HTTP mode testing: `ngrok http 3000`.
- Slack CLI — https://api.slack.com/automation/cli for next-gen slash commands.
