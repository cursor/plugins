# headless — Contact Form 7 cookbook (contact form on headless WordPress)

A companion recipe to `SKILL.md` (WordPress content model). Use it whenever the brief's **Must-haves**
include a contact form (`site.json → contact_form.enabled: true`). The goal: a contact page whose form,
submitted from the **decoupled frontend**, sends the enquiry to the site owner by email using
WordPress's built-in `wp_mail()` — no third-party form service, no API keys, no secret on the client.

**Contact Form 7 is not a separate backend.** It is the `contact-form-7` plugin on the same headless
WordPress install at `/cms` (installed in the provision step). This cookbook is the authoritative home for
the contact-form data layer: how to **resolve the form** (content-model push), **deploy a spam guard**,
what the **frontend submits** (Step 6), and how **validate** proves mail actually leaves.

---

## 1 — Why CF7, and why it works headlessly

You **could** deploy a custom plugin into the headless `/cms` and write a bespoke mailer (see
[`custom-plugins.md`](custom-plugins.md)), but a contact form is exactly the kind of maintained,
spam-hardened functionality you should **reuse rather than reinvent**. CF7 is the right choice because:

- It is a **wordpress.org-slug plugin** → installs through the same management MCP (`wordpress_plugins_install`)
  as Yoast and WooCommerce. No custom code to deploy.
- It ships a **public, unauthenticated submit endpoint**:
  `POST {urls.cms}/wp-json/contact-form-7/v1/contact-forms/<form_id>/feedback`. Submissions don't need
  the JWT or any key.
- The frontend (apex domain) and `/cms` are **same-origin**, so the browser posts straight to that
  endpoint — **no proxy route, no CORS, no credentials client-side.**
- On submit CF7 runs its mail template through `wp_mail()`, which on Hostinger routes through the
  server's mailer. The default form's `To` is `[_site_admin_email]` — the admin address set at install —
  so **basic email delivery works out of the box.**

**Spam protection comes from a tiny deployed plugin, not the Honeypot add-on.** CF7's own
`contact-form-7-honeypot` add-on only acts when a `[honeypot]` form-tag is present in the form — a wp-admin
edit the headless agent can't make — so on the default form it does **nothing**. Instead, deploy a
~15-line `wpcf7_spam` guard into `/cms` (the capability from [`custom-plugins.md`](custom-plugins.md)): it
rejects a submission whose decoy field is filled, with no owner step and no keys. See *§2b — Spam
protection* below. (reCAPTCHA is the alternative but needs owner-provided Google keys set in wp-admin —
out of reach for the headless agent.)

---

## 2 — Content-model push: resolve the form and record it

A fresh CF7 install ships one form, **"Contact form 1"**, with the default fields `your-name`,
`your-email`, `your-subject`, `your-message` and a submit, and mails `[_site_admin_email]`. You need
its **numeric form id** (and, if you tailored the form, its field names) to build `feedback_url`.

> **Reality check — how to read the id.** The per-site WP MCP (Hostinger AI Assistant, discovery mode)
> exposes **no generic REST/`RestEndpointTool` ability**, and `wpcf7_contact_form` is **not a public CPT**
> (it is absent from `cpt-list-types` and from `wp/v2/types`), so the MCP cannot read the form, and CF7's
> own `GET /contact-form-7/v1/contact-forms` is capability-gated (no public read). The reliable,
> tool-free way is to **probe the public feedback endpoint**, which needs no auth.

1. **Find the form id by probing the feedback endpoint (idempotent).** For `id` in a small range
   (`1`‒`30` covers a fresh install — the default form lands a few ids after the sample content), send a
   **`multipart/form-data`** `POST {urls.cms}/wp-json/contact-form-7/v1/contact-forms/<id>/feedback` with
   a single field `_wpcf7_unit_tag=wpcf7-f<id>-o1`. **The content type matters:** CF7 checks it *before*
   it looks up the id and answers **415** to any non-multipart body, so a bare POST returns non-404 for
   *every* id and would wrongly pick id 1.
   - **Hit** → `200` whose JSON body carries `"contact_form_id": <id>` (matching the id you probed) and a
     CF7 `"status"` (e.g. `validation_failed`). **This id is the form.** On a fresh single-form install
     that is the only hit; reuse it on a re-run.
   - **Miss** → `404` with `"code": "wpcf7_not_found"`. Keep going.
   - **Inconclusive** → anything else (`415` from a wrong content type, `403`, `429`, `5xx`) is **not** a
     hit — never select such an id. Fix the request or retry, widen the range, and fall back to the owner
     handoff (step 2) if nothing resolves.

   The default field names are `your-name`, `your-email`, `your-subject`, `your-message`. (A full test
   submission that confirms both the id and the field names — and that mail actually sends — belongs to
   **validate**, so you send just one real email; see §4.)

2. **(Optional) tailor the form — owner-side.** The headless tooling can't edit the CF7 form (no REST
   ability reaches it). If the design needs different fields, keep the default form for the build and note
   it; the owner edits fields/recipient in wp-admin (Contact → Contact Forms) via the one-click login.
   The default form is enough for a name/email/subject/message enquiry, and its recipient
   (`[_site_admin_email]`) is already correct.

3. **Record into `site.json`** — fill the `contact_form` block provision started:

   ```json
   {
     "contact_form": {
       "enabled": true,
       "plugin": "contact-form-7",
       "form_id": 4,
       "feedback_url": "https://<domain>/cms/wp-json/contact-form-7/v1/contact-forms/4/feedback",
       "fields": ["your-name", "your-email", "your-subject", "your-message"],
       "cf7_version": "6.2.2",
       "honeypot_field": "your_website",
       "recipient": "site-admin-email"
     }
   }
   ```

   `cf7_version` is the installed CF7 version (from `wordpress_plugins_list-installed`) — the frontend
   sends it as `_wpcf7_version`. `honeypot_field` is the decoy the spam guard checks (§2b) — the frontend
   renders it empty and the server rejects a filled one. Also note the form id in `content-model.md`. No
   address, token or secret goes into `site.json`.

> **Fallback if the probe finds nothing** (an unusual install, or the default form was removed): mint a
> one-click wp-admin link (`wordpress_login_create-links { username, software }`) and ask the owner to
> read the form id from **Contact → Contact Forms** (the shortcode shows `id="…"`). Record it into
> `site.json` and continue — the same owner-handoff used for the WooCommerce checkout gate, not a build
> failure.

> **Aside — Hostinger's own shortcode.** The per-site MCP's `pages-create` ability suggests
> `[hostinger_contact_form]` for a contact form *inside a WordPress page*. That is server-rendered
> shortcode output, not useful to a decoupled React frontend that reads REST JSON — this flow uses CF7's
> JSON feedback endpoint instead. Mentioned only so the shortcode hint isn't mistaken for the headless path.

---

## 2b — Spam protection: deploy the honeypot guard

CF7's default form has **no spam protection**, and the `contact-form-7-honeypot` add-on can't help
headlessly (it needs a `[honeypot]` form-tag only an owner can add — see §1). Instead, deploy a tiny
plugin that enforces a honeypot **server-side**, on the same REST feedback path the frontend uses. This
reuses the custom-plugin deploy from [`custom-plugins.md`](custom-plugins.md) — the only moving part is one
~15-line file.

**Why it works.** CF7's `wpcf7_spam` filter runs inside `submit()`, which the REST feedback endpoint
calls, so returning `true` sets the submission `status` to `spam` and **suppresses the mail**. The hook can
read any posted field via `WPCF7_Submission::get_posted_data()` — including a decoy field that isn't a CF7
form-tag, **as long as its name doesn't start with `_`** (CF7 strips `_`-prefixed keys). So the frontend
sends a decoy field (empty for humans), and the guard flags the submission as spam when a bot fills it.

1. **Write the guard** to `~/.hostinger/<domain>/plugins/cf7-headless-spamguard/cf7-headless-spamguard.php`:

   ```php
   <?php
   /**
    * Plugin Name: CF7 Headless Spam Guard
    * Description: Server-side honeypot for Contact Form 7 submissions from a headless frontend.
    * Version:     1.0.0
    * Requires PHP: 7.4
    * License:     GPL-2.0-or-later
    */
   if ( ! defined( 'ABSPATH' ) ) { exit; }

   // Reject a submission whose decoy field is filled. The name is a fixed convention the frontend
   // renders empty (site.json → contact_form.honeypot_field); it must NOT start with "_".
   add_filter( 'wpcf7_spam', function ( $spam, $submission ) {
   	if ( $spam ) { return $spam; }                        // keep any earlier spam verdict
   	$decoy = $submission->get_posted_data( 'your_website' );
   	if ( is_string( $decoy ) && trim( $decoy ) !== '' ) {
   		$spam = true;                                     // bot filled it → status 'spam', no mail
   	}
   	return $spam;
   }, 10, 2 );
   ```

2. **Deploy it** into the headless `/cms` (activates on install; idempotent — re-deploy to update):

   ```json
   { "operation": "hosting_deploy",
     "params": {
       "domain": "<domain>",
       "type": "wordpress-plugin",
       "path": "~/.hostinger/<domain>/plugins/cf7-headless-spamguard",
       "slug": "cf7-headless-spamguard",
       "headless": true } }
   ```

3. **Record** `contact_form.honeypot_field: "your_website"` in `site.json` (done in §2 step 3) so the
   frontend knows which decoy to render. Keep the plugin **generic** (no site-specific values) — it's one
   reusable artifact, not per-site code.

> **Nonce note.** CF7's built-in spam check also flags nonce failure, but nonce verification is **inactive
> for logged-out visitors by default** — which is why a plain headless submission returns `mail_sent`, not
> `spam`. The guard adds the honeypot on top. Confirm end-to-end in validate (§4).

---

## 3 — What the frontend submits (Step 6 reference)

The feedback endpoint expects `multipart/form-data` with the form's own fields **plus** CF7's hidden
control fields. The frontend builds this in a `submitContactForm(data)` helper in the one data module:

| Field | Value |
|---|---|
| each name in `contact_form.fields` | the user's input (`your-name`, `your-email`, …) |
| `_wpcf7` | `contact_form.form_id` (number) |
| `_wpcf7_version` | CF7 version string, e.g. `"5.9.8"` (not strictly validated) |
| `_wpcf7_locale` | e.g. `"en_US"` |
| `_wpcf7_unit_tag` | any stable string, e.g. `"wpcf7-f<form_id>-o1"` |
| `_wpcf7_container_post` | `"0"` |
| `contact_form.honeypot_field` (the decoy, e.g. `your_website`) | **empty** — rendered hidden/off-screen, `autocomplete="off"`, `tabindex="-1"`; the §2b guard rejects it as spam if filled |

`POST` to `contact_form.feedback_url` and **do not set `Content-Type`** — let the browser add the
multipart boundary. Same-origin, so no CORS and no secret.

**Response** is JSON:

```json
{ "contact_form_id": 42, "status": "mail_sent", "message": "Thank you for your message. It has been sent.",
  "invalid_fields": [], "posted_data_hash": "…" }
```

Branch on `status`:

- `mail_sent` → success state (clear the form, show the thank-you message).
- `validation_failed` → map each `invalid_fields[].field` to its input and show the message inline.
- `spam` / `aborted` / `mail_failed` / `acceptance_missing` → a generic "couldn't send, try again" error.

A user validation error is a **normal UI state, not a build error**. When `contact_form.enabled` is
`false` or absent, the frontend renders the contact page with plain contact details and **no form**.

---

## 4 — Email delivery & the `wp_mail` caveat (what to tell the owner)

CF7's default form mails `[_site_admin_email]` via `wp_mail()`, so **Hostinger does "set up" basic email
by default** — nothing else to configure for the form to send. Two caveats worth surfacing:

- **Deliverability.** `wp_mail` from a shared host can land in spam for external recipients without
  SPF/DKIM. The most reliable recipient is a **Hostinger mailbox on the same domain**. Keep CF7's admin
  recipient; if the owner wants a different inbox, point them to a same-domain mailbox.
- **Prove it, don't assume it.** Validate (Step 7) POSTs a throwaway test submission and asserts
  `status == "mail_sent"`. A `mail_failed` is a real finding — report it (CF7 is wired, but the mailer
  needs attention), don't pass silently.
- **Check the honeypot too.** Send one more throwaway submission with the decoy
  (`contact_form.honeypot_field`) **filled** — it must come back `status: "spam"` with **no** mail. If it
  returns `mail_sent`, the §2b guard plugin isn't active (re-check its deploy). The normal empty-decoy
  submission still returns `mail_sent`, so this costs one extra throwaway email at most.

Don't install an SMTP plugin or ask for mail credentials as part of this flow — the default `wp_mail`
path is the intended behaviour; SMTP is an owner decision in wp-admin if deliverability needs hardening.
