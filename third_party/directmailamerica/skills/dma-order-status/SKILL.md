---
name: dma-order-status
description: Check DirectMailAmerica order status, tracking, job documents, recent jobs, billing history and credit balance. Use when the user asks where a letter or postcard is, or what they have sent or spent. Read-only.
---

# Order status

All of these are free and read-only.

- `list_jobs` (`limit` up to 100, page with `before`): recent jobs with ids, status and price.
- `get_job_details` / `get_letter_status` with a job id (e.g. `job_...`): stored status and USPS tracking. Status is not polled live from the carrier, so mention when the last update was.
- `download_job_document`: the mailed PDF for a job; keep it private.
- `get_product_quote`: state of a saved product or postcard quote.
- `get_credits`, `get_billing_history`: prepaid balance and past charges/top-ups. `get_payment_status` with a paymentId checks a Square top-up.
- Email to Letter / Postcard items: `list_email_letters` / `get_email_letter`, `list_email_postcards` / `get_email_postcard`.

Report times in the user's time zone. If a job looks stuck or failed, say so and suggest support@directmailamerica.com; do not resend without explicit approval of a new preview and price (see dma-send-mail).
