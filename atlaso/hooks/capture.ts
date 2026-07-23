#!/usr/bin/env bun
/**
 * capture hook — save the just-finished exchange. Event-routed, because no single
 * Cursor hook payload carries a whole turn (see lib/pending.ts):
 *   • beforeSubmitPrompt → stash the USER prompt (the confirmed source of user text)
 *   • afterAgentResponse → stash the ASSISTANT reply (best-effort enrichment)
 *   • stop / sessionEnd  → assemble the stash (+ payload/transcript fallback), run
 *                          the worth-keeping gate ON THE USER MESSAGE, SCRUB secrets
 *                          client-side, tag scope + project, and deposit with a
 *                          content-derived client_id so stop + sessionEnd of the same
 *                          turn DEDUPE server-side.
 * ZERO model involvement. Online-first: with no token / not cloud-linked we skip.
 * Never breaks the session (always exits 0).
 */
import { deposit, loadAuth, type DepositItem } from "../lib/atlaso";
import {
  buildContent, classifyScope, heuristicPolarity, messageKey, scrub, shouldDeposit, turnKey,
} from "../lib/capture";
import { resolveCredential } from "../lib/credential";
import { online } from "../lib/entitlement";
import { log } from "../lib/log";
import {
  clearPending, peekPending, stashCompleted, stashPrompt, stashResponse, takeCompleted,
} from "../lib/pending";
import { projectKey, workspaceRoot } from "../lib/project";
import { parsePayload, readStdin } from "../lib/stdin";
import { exchangeFromPayload, lastExchangeFromFile } from "../lib/transcript";

const TOOL = "cursor";

const convId = (payload: Record<string, any>): string =>
  String(payload?.conversation_id || payload?.conversationId || "default");

/** The stop/sessionEnd path: assemble the turn and deposit it. */
async function depositTurn(payload: Record<string, any>, event: string): Promise<void> {
  const conversation = convId(payload);
  // Completion receipts are separate from the pending-turn path, so a next prompt
  // can never overwrite one and then be mistaken for the earlier stopped turn.
  const completed = event === "sessionEnd" ? takeCompleted(conversation) : null;
  // Peek first. A stop consumes the prompt only after its content-free completion
  // receipt is durable, so an early failure leaves sessionEnd a recovery path.
  const pending = peekPending(conversation);

  // Resolve the event's own turn independently from the pending stash. When both a
  // prior stop receipt and a newer pending prompt exist, hashes tell us whether this
  // sessionEnd is retrying the stopped turn or closing the newer one.
  let [eventUser, eventAsst] = exchangeFromPayload(payload);
  if (!eventUser && !eventAsst) {
    [eventUser, eventAsst] = lastExchangeFromFile(payload.transcript_path || "");
  }
  let user = "";
  let asst = "";
  let pendingSelected = false;
  let completedSelected = false;
  if (completed) {
    const eventHash = eventUser ? messageKey(scrub(eventUser)[0]) : "";
    const pendingHash = pending?.user ? messageKey(scrub(pending.user)[0]) : "";
    if (eventHash && eventHash === completed.user_hash) {
      user = eventUser;
      asst = eventAsst;
      completedSelected = true;
    } else if (pending && eventHash && eventHash === pendingHash) {
      user = pending.user;
      asst = pending.asst || eventAsst;
      pendingSelected = true;
    } else {
      // A receipt makes this a retry path. Fail closed unless the event identifies
      // either that stopped turn or a newer prompt we actually observed locally.
      log("capture", "skip (ambiguous sessionEnd turn)");
      return;
    }
  } else if (pending) {
    user = pending.user;
    asst = pending.asst || eventAsst;
    pendingSelected = true;
  } else {
    user = eventUser;
    asst = eventAsst;
  }

  // worth-keeping gate on the USER message only (matches the Python client).
  if (!shouldDeposit(user)[0]) {
    // A stop deliberately leaves the stash for sessionEnd until a receipt exists.
    // sessionEnd is the final gate decision and can discard a non-durable turn.
    if (event !== "stop" && pendingSelected) clearPending(conversation);
    log("capture", "skip (gate)");
    return;
  }

  // scrub BOTH sides client-side so secrets never leave the machine.
  const scrubbedUser = scrub(user)[0];
  const content = buildContent(scrubbedUser, scrub(asst)[0]);
  if (!content) return;

  // Project resolution prefers the workspace captured at prompt time (stashed),
  // falling back to this payload's workspace_roots — both scope to the same repo.
  const ws = pending?.ws || workspaceRoot(payload);
  let scope = classifyScope(user);
  let pk = projectKey(ws ?? undefined); // for the project tag AND the idempotency key
  let clientId = turnKey(scrubbedUser, scope, scope === "project" ? pk : null);
  // sessionEnd may reconstruct the same turn from a transcript whose workspace
  // differs from the prompt-time root. Its matching receipt preserves the stop
  // attribution and idempotency key.
  if (completedSelected && completed) {
    scope = completed.scope;
    pk = completed.project;
    clientId = completed.client_id;
  }
  const tags = ["cursor", "auto", `pol-hint:${heuristicPolarity(user)}`, `scope:${scope}`];
  if (scope === "project" && pk) tags.push(`project:${pk}`);

  const item: DepositItem = {
    client_id: clientId,
    text: content,
    polarity: "open",
    evidence_grade: "anecdotal",
    scope_note: null,
    tags,
  };
  if (event === "stop") {
    // Write before the network call so sessionEnd can safely retry a timed-out or
    // interrupted stop with the same idempotency key and project attribution.
    const receiptSaved = stashCompleted(conversation, {
      user_hash: messageKey(scrubbedUser),
      client_id: clientId,
      scope,
      project: scope === "project" ? pk : null,
      ts: Date.now(),
    });
    if (!receiptSaved) {
      log("capture", "skip (completion receipt unavailable)");
      return;
    }
    if (pendingSelected) clearPending(conversation);
  } else if (pendingSelected) {
    clearPending(conversation);
  }

  const auth = loadAuth();
  if (!auth) {
    log("capture", "skip (no auth — online-first)");
    return;
  }
  // entitlement gate: don't deposit to the cloud unless this tool is cloud-linked
  // (free plan = 1 active tool/device; enforced client-side).
  if (!(await online(auth, TOOL, auth.device_id ?? null))) {
    log("capture", "skip (not cloud-linked — local-only)");
    return;
  }
  // Deposit with THIS tool's own credential (minted on first run) so the memory is
  // attributed to Cursor. Null = local-only this run (tombstoned/not-entitled) → skip.
  const cred = await resolveCredential(TOOL);
  if (!cred) {
    log("capture", "skip (local-only — no tool credential)");
    return;
  }
  try {
    const saved = await deposit(cred, [item]);
    log("capture", `saved=${saved} scope=${scope}`);
  } catch (e) {
    log("capture", `error ${e}`);
  }
}

async function main(): Promise<void> {
  if (process.env.ATLASO_EXTRACTING) return; // never capture our own enrichment
  const payload = parsePayload(await readStdin());
  const event = String(payload?.hook_event_name || "");

  // Route by event. beforeSubmitPrompt / afterAgentResponse only STASH (fast, no
  // network); the deposit happens once, on stop/sessionEnd.
  if (event === "beforeSubmitPrompt") {
    const [user] = exchangeFromPayload(payload); // reads payload.prompt
    if (user) stashPrompt(convId(payload), user, workspaceRoot(payload));
    log("capture", `stash prompt (${user.length} chars)`);
    return;
  }
  if (event === "afterAgentResponse") {
    const asst = String(payload?.text || "").trim();
    if (asst) stashResponse(convId(payload), asst);
    log("capture", `stash response (${asst.length} chars)`);
    return;
  }
  // stop / sessionEnd (or any other end-of-turn trigger) → deposit.
  await depositTurn(payload, event);
}

main().catch(() => {}).finally(() => process.exit(0));
