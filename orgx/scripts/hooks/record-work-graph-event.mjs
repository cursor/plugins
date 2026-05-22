#!/usr/bin/env node

import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const SENSITIVE_PAYLOAD_KEYS = new Set([
  'api_key',
  'apiKey',
  'authorization',
  'cookie',
  'password',
  'storage_state',
  'storageState',
  'token',
  'transcript_path',
  'transcriptPath',
]);

export function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...rest] = arg.slice(2).split('=');
    const key = rawKey.trim();
    if (!key) continue;
    args[key] = rest.length > 0 ? rest.join('=') : 'true';
  }
  return args;
}

export function pickString(...values) {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function parseJsonRecord(value) {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

export function visiblePayloadKeys(payload) {
  return Object.keys(payload)
    .filter((key) => !SENSITIVE_PAYLOAD_KEYS.has(key))
    .slice(0, 40);
}

export function buildWorkGraphHookRecord({
  args,
  payload,
  sourceClient,
  event,
  cwd = process.cwd(),
  timestamp = new Date().toISOString(),
}) {
  const toolName = pickString(
    payload.tool_name,
    payload.toolName,
    payload.tool?.name,
    payload.name
  );
  const prompt = pickString(payload.prompt, payload.user_prompt, payload.userPrompt);

  return {
    schema_version: '2026-05-07',
    source: 'orgx_cursor_plugin_runtime_hook',
    source_client: sourceClient,
    event,
    session_id: pickString(
      payload.session_id,
      payload.sessionId,
      payload.conversation_id,
      payload.conversationId,
      args.session_id,
      args.sessionId
    ),
    turn_id: pickString(payload.turn_id, payload.turnId, args.turn_id, args.turnId),
    cwd: pickString(
      payload.cwd,
      payload.working_directory,
      payload.workspace,
      args.cwd,
      cwd
    ),
    timestamp,
    summary: {
      tool_name: toolName,
      prompt_chars: prompt ? prompt.length : undefined,
      payload_keys: visiblePayloadKeys(payload),
      transcript_path_present: Boolean(
        pickString(payload.transcript_path, payload.transcriptPath)
      ),
    },
  };
}

export function appendWorkGraphHookRecord(record, outbox) {
  try {
    mkdirSync(dirname(outbox), { recursive: true, mode: 0o700 });
    appendFileSync(outbox, `${JSON.stringify(record)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    return true;
  } catch {
    return false;
  }
}

export function exitCodeForResult(result) {
  return result?.work_graph_spooled ? 0 : 1;
}

export async function main({
  argv = process.argv.slice(2),
  env = process.env,
  stdinText = '',
  cwd = process.cwd(),
  timestamp = new Date().toISOString(),
} = {}) {
  const args = parseArgs(argv);
  const payload = parseJsonRecord(stdinText);
  const sourceClient = pickString(args.source_client, args['source-client'], 'cursor');
  const event = pickString(
    args.event,
    payload.hook_event_name,
    payload.hookEventName,
    payload.event,
    payload.eventName,
    'unknown'
  );
  const outbox = pickString(
    args.outbox,
    env.ORGX_WIZARD_HOOK_OUTBOX,
    join(homedir(), '.config', 'useorgx', 'wizard', 'hooks', 'events.jsonl')
  );
  const record = buildWorkGraphHookRecord({
    args,
    payload,
    sourceClient,
    event,
    cwd,
    timestamp,
  });

  const workGraphSpooled = appendWorkGraphHookRecord(record, outbox);

  return {
    ok: workGraphSpooled,
    work_graph_spooled: workGraphSpooled,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  readStdin()
    .then((stdinText) => main({ stdinText }))
    .then((result) => {
      if (!result.work_graph_spooled) {
        process.stderr.write('OrgX Cursor hook failed to spool Work Graph event.\n');
      }
      process.exit(exitCodeForResult(result));
    })
    .catch((error) => {
      process.stderr.write(`OrgX Cursor hook failed: ${error.message}\n`);
      process.exit(1);
    });
}
