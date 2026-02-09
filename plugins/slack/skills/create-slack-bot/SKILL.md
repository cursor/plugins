# Skill: Create a Slack Bot

## When to Use

Use this skill when the user wants to:

- Create a new Slack bot from scratch using the Bolt framework
- Set up a bot that responds to messages, mentions, or reactions
- Build a conversational bot with interactive components
- Add a bot to an existing project with proper project structure

## Prerequisites

- A Slack workspace where you have permission to install apps
- Node.js 18+ installed
- A Slack App created at https://api.slack.com/apps (or willingness to create one)

## Step 1 — Create the Slack App in the Dashboard

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) and click **Create New App**.
2. Choose **From scratch**. Enter a name and select the workspace.
3. Navigate to **OAuth & Permissions** and add these Bot Token Scopes:
   - `app_mentions:read` — receive `@bot` mentions
   - `chat:write` — send messages
   - `commands` — handle slash commands (optional)
   - `im:history` — read DM history (for DM bots)
   - `reactions:read` — track emoji reactions (optional)
4. Navigate to **Socket Mode** and enable it. Create an App-Level Token with the `connections:write` scope. Save the token (`xapp-1-...`).
5. Navigate to **Event Subscriptions**, enable events, and subscribe to:
   - `app_mention` — bot is @mentioned
   - `message.im` — direct messages to the bot (optional)
6. Install the app to your workspace. Copy the **Bot User OAuth Token** (`xoxb-...`).

## Step 2 — Scaffold the Project

```bash
mkdir my-slack-bot && cd my-slack-bot
npm init -y
npm install @slack/bolt dotenv
npm install -D typescript @types/node ts-node nodemon
```

Create the TypeScript configuration:

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

Set up environment variables:

```bash
# .env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-1-your-app-level-token
```

Add `.env` to `.gitignore`:

```
# .gitignore
node_modules/
dist/
.env
```

## Step 3 — Write the Bot

```typescript
// src/app.ts
import { App, LogLevel } from "@slack/bolt";
import "dotenv/config";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  appToken: process.env.SLACK_APP_TOKEN!,
  socketMode: true,
  logLevel: LogLevel.INFO,
});

// ─── Respond to @mentions ──────────────────────────────────────────────────────

app.event("app_mention", async ({ event, say, logger }) => {
  try {
    const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();

    if (!text) {
      await say({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Hey <@${event.user}>! 👋 Here's what I can do:`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "• Mention me with `help` for available commands\n• Mention me with `status` for a system check\n• Send me a DM to chat privately",
            },
          },
        ],
        text: `Hey <@${event.user}>! Here's what I can do.`,
      });
      return;
    }

    if (text.toLowerCase() === "help") {
      await say({
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "📖 Help" },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Available commands:*\n• `@bot help` — Show this message\n• `@bot status` — Check system status\n• `@bot greet <name>` — Send a greeting",
            },
          },
        ],
        text: "Help — Available commands",
      });
    } else if (text.toLowerCase() === "status") {
      await say({
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "🟢 System Status" },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Uptime:*\n${formatUptime(process.uptime())}` },
              { type: "mrkdwn", text: `*Memory:*\n${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB` },
              { type: "mrkdwn", text: `*Node:*\n${process.version}` },
              { type: "mrkdwn", text: `*Platform:*\n${process.platform}` },
            ],
          },
        ],
        text: "System Status — All systems operational",
      });
    } else if (text.toLowerCase().startsWith("greet ")) {
      const name = text.slice(6).trim();
      await say(`Hello, ${name}! 👋 Welcome to the channel.`);
    } else {
      await say(`I didn't understand that. Try mentioning me with \`help\` for available commands.`);
    }
  } catch (error) {
    logger.error("Error handling app_mention", error);
    await say("Sorry, something went wrong. Please try again.");
  }
});

// ─── Handle Direct Messages ────────────────────────────────────────────────────

app.message(async ({ message, say, logger }) => {
  try {
    // Only handle standard user messages (not bot messages, not edits)
    if (message.subtype) return;
    if (!("text" in message) || !message.text) return;

    await say({
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Thanks for the message! You said: _${message.text}_`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "👍 Helpful" },
              action_id: "feedback_helpful",
              style: "primary",
            },
            {
              type: "button",
              text: { type: "plain_text", text: "👎 Not Helpful" },
              action_id: "feedback_not_helpful",
            },
          ],
        },
      ],
      text: `Thanks for the message! You said: ${message.text}`,
    });
  } catch (error) {
    logger.error("Error handling message", error);
  }
});

// ─── Handle Button Clicks ──────────────────────────────────────────────────────

app.action("feedback_helpful", async ({ ack, say }) => {
  await ack();
  await say("Glad I could help! 🎉");
});

app.action("feedback_not_helpful", async ({ ack, say }) => {
  await ack();
  await say("Sorry about that. I'll try to do better! 🙏");
});

// ─── Handle Reactions ──────────────────────────────────────────────────────────

app.event("reaction_added", async ({ event, client, logger }) => {
  try {
    if (event.reaction === "eyes") {
      await client.reactions.add({
        channel: event.item.channel,
        timestamp: event.item.ts,
        name: "white_check_mark",
      });
    }
  } catch (error) {
    logger.error("Error handling reaction", error);
  }
});

// ─── App Home Tab ──────────────────────────────────────────────────────────────

app.event("app_home_opened", async ({ event, client, logger }) => {
  try {
    await client.views.publish({
      user_id: event.user,
      view: {
        type: "home",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "🏠 Welcome Home" },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "I'm your friendly Slack bot. Here's a quick overview of what I can do.",
            },
          },
          { type: "divider" },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*💬 Mention me*\nMention me in any channel with a command like `help` or `status`.",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*📩 Direct Message*\nSend me a DM and I'll respond with helpful information.",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*👀 Reactions*\nAdd the :eyes: reaction to any message and I'll mark it as reviewed.",
            },
          },
        ],
      },
    });
  } catch (error) {
    logger.error("Error publishing App Home", error);
  }
});

// ─── Utilities ─────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

// ─── Start ─────────────────────────────────────────────────────────────────────

(async () => {
  await app.start();
  console.log("⚡️ Slack bot is running in Socket Mode!");
})();
```

## Step 4 — Add Development Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/app.js",
    "dev": "nodemon --exec ts-node src/app.ts --ext ts",
    "lint": "eslint src/"
  }
}
```

## Step 5 — Run and Test Locally

```bash
# Start in development mode
npm run dev
```

Test your bot:

1. Open Slack and navigate to a channel where the bot is a member.
2. Type `@YourBot help` — you should see the help message with Block Kit formatting.
3. Type `@YourBot status` — you should see system status with uptime and memory usage.
4. Send a direct message to the bot — you should receive a response with feedback buttons.
5. Click the "Helpful" or "Not Helpful" button — you should see a follow-up message.
6. Add the 👀 (`:eyes:`) reaction to any message — the bot should add a ✅ reaction.
7. Click on the bot's name and go to the **Home** tab — you should see the App Home content.

## Step 6 — Deploy to Production

### Option A: Deploy to Railway / Render / Fly.io

Switch from Socket Mode to HTTP mode for production:

```typescript
// src/app.ts — production configuration
const isProduction = process.env.NODE_ENV === "production";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  ...(isProduction
    ? { /* HTTP mode — no socketMode, no appToken */ }
    : {
        appToken: process.env.SLACK_APP_TOKEN!,
        socketMode: true,
      }),
});

(async () => {
  const port = Number(process.env.PORT) || 3000;
  await app.start(port);
  console.log(`⚡️ Slack bot is running on port ${port}`);
})();
```

Update the Slack App dashboard:
1. Go to **Event Subscriptions** → set the Request URL to `https://your-app.example.com/slack/events`.
2. Go to **Interactivity & Shortcuts** → set the Request URL to `https://your-app.example.com/slack/events`.

### Option B: Deploy to AWS Lambda

```bash
npm install @slack/bolt aws-lambda serverless-http
```

```typescript
// src/lambda.ts
import { App, AwsLambdaReceiver } from "@slack/bolt";

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  receiver: awsLambdaReceiver,
});

// Register listeners...

export const handler = async (event: any, context: any, callback: any) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
```

## Project Structure

```
my-slack-bot/
├── src/
│   └── app.ts                # Main bot application
├── dist/                     # Compiled JavaScript (gitignored)
├── .env                      # Environment variables (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Common Patterns

### Responding in a Thread

```typescript
app.event("app_mention", async ({ event, say }) => {
  await say({
    text: "Here's my response in the thread!",
    thread_ts: event.ts, // Reply in thread
  });
});
```

### Sending an Ephemeral Message

```typescript
app.command("/secret", async ({ ack, command, client }) => {
  await ack();
  await client.chat.postEphemeral({
    channel: command.channel_id,
    user: command.user_id,
    text: "This message is only visible to you.",
  });
});
```

### Scheduled Messages

```typescript
await client.chat.scheduleMessage({
  channel: "C12345678",
  text: "Reminder: standup in 5 minutes!",
  post_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
});
```

## Available Tools

- `@slack/bolt` — The official Slack framework for building apps.
- `@slack/web-api` — Low-level Slack Web API client (bundled with Bolt).
- `ngrok` — Expose local server for HTTP mode testing: `ngrok http 3000`.
- Block Kit Builder — https://app.slack.com/block-kit-builder for designing messages.
- Slack CLI — https://api.slack.com/automation/cli for next-gen platform apps.
