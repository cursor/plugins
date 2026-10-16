---
name: dma-send-mail
description: Send a physical USPS letter, Certified Mail piece or postcard through DirectMailAmerica. Use when the user wants something printed and mailed. Always quotes and previews first and mails only after explicit approval.
---

# Send a letter or postcard

## Approval rule (always)
Mailing is real, costs money and cannot be undone. Never call `send_letter`, `send_product_quote` or `approve_email_letter` until the user has explicitly approved, in this conversation, the exact preview (PDF/artwork), the sender and recipient addresses, and the exact price. A general instruction like "send me a letter" is not approval of a specific preview and price. If anything changes after approval (text, address, price, options), get approval again. Never retry a failed send without checking `list_jobs` first, and always pass an `idempotencyKey`.

## Steps
1. `get_connection_status` to confirm the workspace key works; `get_credits` to see the balance.
2. Collect the sender and recipient (name, street, city, state, ZIP). Ask for anything missing; never invent addresses.
3. Draft the content:
   - Letter: plain body text, or a print-ready 8.5x11 PDF.
   - Postcard: one landscape 396x306 pt (5.5x4.25 in) artwork page; the address side is added by the printer. Set `color` explicitly.
   - Anything else (custom sizes, Pro postcards): `get_product_catalog`, then `quote_product` (36-hour exact quote).
4. Quote: `get_pricing` with mailClass, pageCount, recipientCount and options (certified, electronicReturnReceipt, color). List prices: First-Class $1.49 + $0.25/extra page; Certified $12.99 + $0.25/page; postcard $1.99; e-return receipt +$2.40.
5. Show the user the preview (render the PDF to an image when possible), both addresses, the mail class and options, and the exact total. Ask: "Mail this for $X.XX?"
6. Only after a clear yes: `send_letter` (or `send_product_quote` with `confirmed: true` for a saved quote) with an `idempotencyKey`. Never pay with x402 or create a credit checkout unless the user separately asks for it.
7. Report the job id and price, and offer to track it with the dma-order-status skill.
