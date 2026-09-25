---
name: usmail-mcp
description: >-
  Prepare USMail.ai print-to-mail on https://app.usmail.ai/mcp. Use when the
  user wants letters or postcards printed and mailed: upload a PDF, set
  recipients, choose print options, generate a proof, and share the job link.
  The agent prepares only. A human registers and funds the meter. The human
  approves on the app, or explicitly grants capped postage and then sends
  Looks good after the proof. Do not use for EDDM, card deposits, or invented
  tools or hostnames.
---

# USMail.ai MCP

Slogan: **You upload. You approve. We produce.**

Live MCP: OAuth on `https://app.usmail.ai/mcp`.

Before you prepare or hand off a job, re-read https://www.usmail.ai/skills.md. Match the file’s **Version:** (shipped as **ea2e4f3a**) to `serverInfo.version` from the MCP initialize handshake. That same `serverInfo.version` is on the unauthenticated error payload. If the two versions differ, re-read https://www.usmail.ai/skills.md and follow the file. This plugin is production-only; ignore those parts, use https://app.usmail.ai, the usmail server, and serverInfo.version. Do not add a connector. Cite the skills version you read on status cards. `get_account_status` returns only `success`, `account`, `org`, `meter`, and `message`. It is not the skills version.

Docs: https://www.usmail.ai/docs/mcp
Cite: https://www.usmail.ai/llms.txt

## Connection

This plugin has one server, `usmail`, at `https://app.usmail.ai/mcp`. Auth is OAuth. The plugin has no API key.

If the server needs auth, the first beat of the turn is a normal tool call (`get_account_status`) so the host raises **Connect / Authorize** on the existing `usmail` server. Do not wait for the human to ask. Do not skip the card.

**Never `AuthenticateMcpServer`.** That name is a Cursor host action, not a USMail tool. It surfaces **Added**, not Authorize. **Added is not Authorize.** Tell them to Connect on the existing server. Do not add a second server. Do not sign out. A skills bump means re-read https://www.usmail.ai/skills.md.

Host **Auto-review** means the host allowed a tool. It is not mill approval. It is not the postage grant.

## Prepare. These are not skills

You prepare the job. You do not:

- Approve production mail on your own. The human approves on the app, or explicitly grants capped postage and then sends Looks good after the proof.
- Fund the meter or run card deposits. A human registers and funds the prepaid meter.
- Do EDDM.
- Invent hostnames, add-commands, or tool names. Do not invent mill tool names. The job link is only `https://app.usmail.ai/?job={id}`, with `{id}` the job id the tools return.

Public tools, and no others: `get_account_status`, `list_mail_products`, `create_mail_job`, `upload_document`, `get_document_upload_params`, `detect_zone`, `configure_zone`, `configure_mail_job`, `add_recipients`, `generate_proof`, `get_mail_job`, `list_mail_jobs`, `submit_mail_job`, `cancel_mail_job`, `unapprove_mail_job`, `list_address_quality`, plus `get_agent_spend_grant` / `set_agent_spend_grant`.

## Sequence

1. **Hold the PDF.** `fileBase64` is the PDF bytes from the chat attachment (never `@/path`). Do not upload it yet.
2. **`detect_zone` `{ pdfBase64 }`.** This can run before a job exists. It returns `mailingType` and `paperSize`. Do not title this Pick an address.
3. **Recipients, every product.** Ask whether to find the address on the document or upload a CSV. Wait. Document: use live `sampleText`, then **Pick an address**, and hold the zone. CSV or typed rows: hold the rows. Do not call `add_recipients` yet. Finding candidates is not choosing the path.
4. **`create_mail_job` `{ mailingType, paperSize }`.** This is the first call that returns a `jobId`. No earlier step takes a `jobId`.
5. **Attach to that job.** `get_document_upload_params` and `upload_document` need the `jobId` from step 4. Small files: `upload_document` with `fileBase64`. Large files: `get_document_upload_params` `{ jobId, fileName }`, POST the chat-attachment binary to S3 (`file=@<that.pdf>`), then `upload_document` `{ jobId, uploadedFileName }` with no `fileBase64`. Do not copy the file aside. Do not invent a base64 helper. If you cannot POST to S3, the human drops the PDF on **Open job**. Do not `generate_proof` on a stub. Document path: upload, then `configure_zone` `{ jobId, filename: uploadedFiles[0], zone }`. CSV path: `add_recipients` first, then `upload_document` for the artwork. Do not upload the PDF before the recipient digest on a list job.
6. **Spend grant, asked early, default off.** Before chips, if the grant is off, ask **Postage grant?** Capped dollars, uncapped, or Pay & Approve on the app. Wait. Turn a grant on only when the human explicitly asks, at the cap they choose. Read it with `get_agent_spend_grant`. Set it with `set_agent_spend_grant` only after they say so.
7. **Chips, one field at a time.** Ask `setup.next.prompt`. Wait. `configure_mail_job` for that field only. Letters: class, then color, then quality, then duplex, then inserts. Postcards: paper stock, then First-Class or Priority. Mill defaults are not consent.
8. **`generate_proof`.** The PDF and recipients are already on the job from step 5. That is not Approve.
9. **Building.** After `generate_proof`, the human card is only **Building your proof** (you will send the proof when it is ready). No **Open job** while it is building. You coarse-poll `get_mail_job`. Stay silent until the proof is ready or the job is hung. When it is ready, send the Proof ready card. Never reuse a stored `proofUrl`. Job Start at 0% and 0 pieces after two polls means hung; an **Open job** link is OK then.
10. **Proof, then address quality.** Paste the Proof ready card, including address-quality counts. They can Still mail, Ignore, or Fix on the app. Do not auto-fix addresses. After they send **Looks good**, continue as below.

## Proof gate

Do not send a job to production before a proof is ready and the human has reviewed it. `generate_proof` is not approval.

- Grant off (the default), or they declined a grant: do not approve. Hand them **Pay & Approve on the app** plus `approvalMarkdown` (or `approval_url`). The human approves on the app.
- They set a spend grant, and after the proof they send **Looks good**: `submit_mail_job` is the handoff. The mill is the lock, not you. If the mill refuses, paste `mill_error` verbatim, and the mill `message` if it is present. Do not invent a second gate. Do not hide those words.
- They said submit and you never asked about the grant: ask first. Never silent postage.

## Address quality

Use `list_address_quality`. On the Proof ready card, show how many addresses are good and how many need a look. If all are clean, omit that line. Fix, Still mail, and Ignore stay on the app. You do not rewrite addresses.

## Job links

**Open job** is `https://app.usmail.ai/?job={id}`, where `{id}` is the job id for that job. Do not use another host. The proof link is the `proofUrl` from the current tool result. Do not reuse an older `proofUrl`.

**Open job** only on Proof ready, Production queued, or Paused. Not while the mill is still building.

## Cards

Emoji plus a bold title. Never a flat "Done." Facts first. Blank line. Actions last. Only the title and the actions are emphasized. Setup, pieces, grant, meter, and address-quality counts stay plain text.

| Beat | Title |
|---|---|
| PDF on the job | 📎 **PDF attached** |
| Recipients | 📬 **Recipients?** Find address on the document, or upload a CSV? |
| Document chosen and live `sampleText` is back | 📍 **Pick an address** |
| Zone set | ✅ **Address locked** |
| Grant | 💳 **Postage grant?** / **Grant on** / **No grant** |
| Last chip | 🖨️ **Print options set** |
| Building | ⚙️ **Building your proof** — I’ll send the proof when it’s ready. No Open job. |
| Proof ready | 📄 **Proof ready — please review** |
| Mill accepted the granted job | 🎉 **Production queued** |
| Grant off | 🔗 **Pay & Approve on the app** plus `approvalMarkdown` |
| Next chip | ✏️ **Next:** `{setup.next.prompt}` |
| Approved, and they want a change | 🔓 **Unapprove to edit** — wait for yes, then `unapprove_mail_job` |
| Stall | ⚠️ **Paused** — one next step |

Proof ready card: pieces, estimate, stock, and class; grant remaining if a grant is on; the address-quality line when any address needs a look; then **Open proof** and **Review addresses on the app** with the links the tools returned; then ***Send Looks good when finished to continue***.

Production queued card: app job-setup labels, `mailPieceCount`, postage, grant remaining just above the prepaid meter from `get_account_status`, a blank line, then **Open job** last: `https://app.usmail.ai/?job={id}`.

## CSV

"Upload a CSV" means `add_recipients`. Rows: `name, company1, address1, address2, city, state, zip`. Empty `company1` is valid. Max 100 per call. No spreadsheet through `upload_document`. No `configure_zone` on a CSV job.

Order: `create_mail_job`, then `add_recipients`, then `upload_document` for artwork, then chips, then `generate_proof`.

## Edit after approval

Approved or queued: do not change chips, the zone, or the PDF. Tell them they must unapprove. Wait. Then `unapprove_mail_job`. Not `cancel_mail_job`. Then `get_agent_spend_grant` and cite the new remaining on the next Proof ready card. Do not reuse the old remaining. Then one change and `generate_proof`.

## What they say

| They say | You do |
|---|---|
| ok / looks good / approved, after the proof | Proof viewed. Show address quality. Reconfirm the grant. |
| submit | Grant on: `submit_mail_job`. Grant declined: `approval_url`. Grant never asked: ask. |
| approve grant | `set_agent_spend_grant`. Later, after proof review, `submit_mail_job` is the mill handoff. |
| no grant | Grant stays off. After the proof, Pay & Approve on the app. |

## Failures to avoid

- Silent postage, or mill approval with no grant
- Hiding `mill_error` or the mill `message`
- A grant they did not ask for; mill defaults treated as chip answers; chips batched
- A stub proof, or a queued card that only shows postage
- `AuthenticateMcpServer` (a Cursor host action, not a USMail tool), a forced re-auth, or a new server for needsAuth or a skills bump
- Recipients before the PDF on the document path; artwork before `add_recipients` on the CSV path; a substitute PDF; `@/path` as `fileBase64`; a CSV via `upload_document`; `configure_zone` on a CSV
- Pick an address before they chose document vs CSV
- Polling a hung Job Start (0% and 0 pieces) as if it were healthy, or telling them to ping you because you will not check
- Dumping mill percent on every poll
- Pasting a `proofUrl` from an earlier turn
- Invented hostnames, add-commands, or tool names
