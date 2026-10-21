---
name: dma-order-status
description: Check DirectMailAmerica order status, tracking, recent jobs and credit balance. Use when the user asks where a letter or postcard is, or what they have sent or spent. Read-only.
---

# Order status

All of these are free and read-only.

- `list_jobs` (limit up to 100): recent jobs with ids, status and price.
- `get_letter_status` with a job id (e.g. `job_...`): stored status and USPS tracking. It does not poll the carrier live, so mention when the last update was.
- `get_credits`: prepaid balance in cents. `get_payment_status` with a paymentId checks a Square top-up.
- For Email to Letter items, `list_email_letters` / `get_email_letter` show draft, approved and mailed state.

Report times in the user's time zone. If a job looks stuck or failed, say so and suggest support@directmailamerica.com; do not resend without explicit approval of a new preview and price (see dma-send-mail).
