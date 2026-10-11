import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { pathToFileURL } from "node:url";

const API_ORIGIN = "https://api.acedata.cloud";
const MODELS = ["qwen-image-3.0", "qwen-image-3.0-pro"];
const TASK_PATH = "/qwen-image/tasks";

export const tools = [
  {
    name: "qwen_image_generate",
    description: "Submit one Qwen Image generation or edit through Ace Data Cloud. This is a paid operation. Save the returned task_id and query that same task; do not call generate again to poll.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", minLength: 1, maxLength: 18000, description: "Describe the desired image or edit." },
        model: { type: "string", enum: MODELS, default: "qwen-image-3.0" },
        size: { type: "string", pattern: "^[0-9]+\\*[0-9]+$", default: "1024*1024" },
        n: { type: "integer", minimum: 1, maximum: 6, default: 1 },
        watermark: { type: "boolean", default: false },
        image_urls: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: { type: "string", format: "uri" },
          description: "Optional reference image URLs for editing."
        }
      },
      required: ["prompt"]
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true }
  },
  {
    name: "qwen_image_get_task",
    description: "Query an existing Qwen Image task by the original task_id. This does not submit another generation.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string", minLength: 1, description: "The ID returned by qwen_image_generate." }
      },
      required: ["task_id"]
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true }
  }
];

function textResult(value, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(value) }], isError };
}

function requireToken() {
  const token = process.env.ACEDATACLOUD_API_TOKEN;
  if (!token) throw new Error("Configure ACEDATACLOUD_API_TOKEN in the Cursor plugin.");
  return token;
}

async function post(path, payload, timeoutMs) {
  const token = requireToken();
  let response;
  try {
    response = await fetch(API_ORIGIN + path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch {
    throw new Error("Network request failed or timed out. Check task and usage history before any new paid submission.");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Ace Data Cloud returned a non-JSON response (HTTP " + response.status + ").");
  }
  if (!response.ok) {
    const traceId = typeof data?.trace_id === "string" ? data.trace_id : "";
    throw new Error("Ace Data Cloud request failed (HTTP " + response.status + ")" + (traceId ? "; trace_id " + traceId : "") + ".");
  }
  return data;
}

export function normalizeTask(body, requestedId = "") {
  const taskId = String(body?.id || body?.task_id || body?.response?.task_id || requestedId);
  const response = body?.response && typeof body.response === "object" ? body.response : {};
  const data = Array.isArray(response.data) ? response.data : [];
  const mediaUrls = data
    .map((item) => item && (item.image_url || item.url))
    .filter((url) => typeof url === "string" && /^https:\/\//.test(url));
  const unfinished = body?.finished_at === null;
  const succeeded = !unfinished && response.success === true;
  const failed = !unfinished && response.success === false;
  return {
    status: succeeded ? "succeeded" : failed ? "failed" : "pending",
    success: succeeded,
    task_id: taskId,
    trace_id: typeof body?.trace_id === "string" ? body.trace_id : "",
    media_urls: succeeded ? mediaUrls : []
  };
}

function generationPayload(args) {
  if (!args || typeof args.prompt !== "string" || !args.prompt.trim() || args.prompt.length > 18000) {
    throw new Error("prompt must contain 1 to 18000 characters.");
  }
  const model = args.model ?? "qwen-image-3.0";
  if (!MODELS.includes(model)) throw new Error("Unsupported Qwen Image model.");
  const size = args.size ?? "1024*1024";
  if (typeof size !== "string" || !/^[0-9]+\*[0-9]+$/.test(size)) {
    throw new Error("size must be WIDTH*HEIGHT, for example 1024*1024.");
  }
  const n = args.n ?? 1;
  if (!Number.isInteger(n) || n < 1 || n > 6) throw new Error("n must be an integer from 1 to 6.");
  const watermark = args.watermark ?? false;
  if (typeof watermark !== "boolean") throw new Error("watermark must be a boolean.");
  const payload = { model, prompt: args.prompt, size, n, watermark, async: true };
  if (args.image_urls !== undefined) {
    if (!Array.isArray(args.image_urls) || args.image_urls.length < 1 || args.image_urls.length > 3 ||
        args.image_urls.some((url) => typeof url !== "string" || !/^https:\/\//.test(url))) {
      throw new Error("image_urls must contain one to three HTTPS URLs.");
    }
    payload.image_urls = args.image_urls;
  }
  return payload;
}

export async function callTool(name, args) {
  try {
    if (name === "qwen_image_generate") {
      const body = await post("/qwen-image/images", generationPayload(args), 90000);
      const taskId = body?.task_id || body?.task?.id || body?.response?.task_id;
      if (!taskId) {
        return textResult({ status: "unknown", message: "Generation response had no task ID. Check usage history before resubmitting." }, true);
      }
      return textResult({ status: "pending", task_id: String(taskId), trace_id: String(body?.trace_id || "") });
    }
    if (name === "qwen_image_get_task") {
      const taskId = args?.task_id;
      if (typeof taskId !== "string" || !taskId.trim()) throw new Error("task_id is required.");
      const body = await post(TASK_PATH, { action: "retrieve", id: taskId }, 30000);
      return textResult(normalizeTask(body, taskId));
    }
    return textResult({ error: "Unknown tool." }, true);
  } catch (error) {
    return textResult({ error: error instanceof Error ? error.message : "Tool failed." }, true);
  }
}

export async function handle(message) {
  if (!message || typeof message !== "object" || !("id" in message)) return null;
  let result;
  switch (message.method) {
    case "initialize":
      result = {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "qwen-image-acedatacloud", version: "1.0.0" }
      };
      break;
    case "ping":
      result = {};
      break;
    case "tools/list":
      result = { tools };
      break;
    case "tools/call":
      result = await callTool(message.params?.name, message.params?.arguments || {});
      break;
    default:
      return { jsonrpc: "2.0", id: message.id, error: { code: -32601, message: "Method not found" } };
  }
  return { jsonrpc: "2.0", id: message.id, result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const reader = createInterface({ input: stdin, crlfDelay: Infinity });
  let queue = Promise.resolve();
  reader.on("line", (line) => {
    queue = queue.then(async () => {
      let message;
      try { message = JSON.parse(line); } catch { return; }
      const response = await handle(message);
      if (response) stdout.write(JSON.stringify(response) + "\n");
    }).catch(() => {});
  });
}
