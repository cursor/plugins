---
name: dma-email-to-letter
description: Manage DirectMailAmerica Email to Letter - the workspace inbox, mailing rules, budgets, incoming email drafts and their approval. Use when the user asks about the letter inbox, rules, or pending email letters.
---

# Email to Letter inbox and rules

## Approval rule (always)
Mailing is real, costs money and cannot be undone. Never call `send_letter`, `send_product_quote` or `approve_email_letter` until the user has explicitly approved, in this conversation, the exact preview (PDF/artwork), the sender and recipient addresses, and the exact price. A general instruction like "send me a letter" is not approval of a specific preview and price. If anything changes after approval (text, address, price, options), get approval again. Never retry a failed send without checking `list_jobs` first, and always pass an `idempotencyKey`.

## Look around (no charge)
- `get_email_to_letter`: inbox address, rules, budgets, usage, balance, letterheads and defaults.
- `list_email_letters` (page with `before`): recent emails and their letter state.
- `get_email_letter` / `download_email_letter` (format pdf or eml): full text, price and the PDF preview.
- `check_email_box`: checks the inbox now (about 60 s cooldown; new mail can take several minutes to appear).

## Rules
- `save_email_letter_rule` creates or replaces a rule (sender, recipient, optional subject match, address, formatting). Default to approval mode. Switching a rule to automatic sending needs the user's explicit consent to autosend and to the Terms of Use, passed in `consent`; never assume it.
- `preview_email_letter` renders a sample before saving. `delete_email_letter_rule` removes a rule only when the user asks.
- `update_email_letter_settings` changes budgets and limits only when the user asks; enabling may resume paused sending, so say so.

## Pending letters
1. Show the user the PDF preview, recipient and quoted cents from `get_email_letter`.
2. Edit with `edit_email_letter` or `reapply_email_letter` if asked, then show the new preview and price again.
3. Only after explicit approval: `approve_email_letter` with id, exact version, exact cents and `confirmMail: true`. Otherwise `reject_email_letter` if the user declines.
- `delete_email_letters` is permanent; use only on request with `confirmDelete: true`.
