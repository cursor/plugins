import { mock } from "bun:test";

const ErrorCode = {
  PlatformError: "slack_webapi_platform_error",
} as const;

type Call = {
  method: string;
  args: Record<string, unknown>;
};

type Handler = (
  method: string,
  args: Record<string, unknown>
) => Promise<unknown> | unknown;
type PlatformError = Error & {
  code: string;
  data: { ok: false; error: string };
};

const calls: Call[] = [];
let handler: Handler = defaultHandler;

export function installSlackWebApiMock(): void {
  mock.module("@slack/web-api", () => ({ ErrorCode, WebClient }));
}

export function resetSlackWebApiMock(
  nextHandler: Handler = defaultHandler
): void {
  calls.length = 0;
  handler = nextHandler;
}

export function slackWebApiCalls(): Call[] {
  return calls;
}

export function slackPlatformError(error: string): PlatformError {
  const err = new Error(`An API error occurred: ${error}`) as PlatformError;
  err.code = ErrorCode.PlatformError;
  err.data = { ok: false, error };
  return err;
}

class WebClient {
  readonly chat = {
    postMessage: call.bind(undefined, "chat.postMessage"),
    update: call.bind(undefined, "chat.update"),
  };

  readonly conversations = {
    replies: call.bind(undefined, "conversations.replies"),
  };

  readonly files = {
    uploadV2: call.bind(undefined, "files.uploadV2"),
  };

  readonly reactions = {
    add: call.bind(undefined, "reactions.add"),
    get: call.bind(undefined, "reactions.get"),
    remove: call.bind(undefined, "reactions.remove"),
  };

  readonly users = {
    lookupByEmail: call.bind(undefined, "users.lookupByEmail"),
  };
}

async function call(
  method: string,
  args: Record<string, unknown>
): Promise<unknown> {
  calls.push({ method, args });
  return handler(method, args);
}

function defaultHandler(
  method: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  if (method === "files.uploadV2") {
    return {
      ok: true,
      files: [
        {
          ok: true,
          files: [{ id: "F123", permalink: "https://slack.test/file" }],
        },
      ],
    };
  }
  return {
    ok: true,
    channel: args.channel,
    ts: method === "chat.update" ? args.ts : "111.222",
  };
}
