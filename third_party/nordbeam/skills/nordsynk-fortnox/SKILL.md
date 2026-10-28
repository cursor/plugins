---
name: nordsynk-fortnox
description: Use when the user asks about their Fortnox bookkeeping or wants accounting work done in Fortnox (the Swedish accounting system) through Nordsynk, for example customer or supplier invoices, vouchers (verifikationer), the general ledger, reports, customers, suppliers or articles.
---

# Fortnox through Nordsynk

Nordsynk is a hosted MCP server (`nordsynk`, `https://mcp.nordsynk.se/mcp`) that gives the agent
access to the Fortnox companies the user has approved. It is made by Nordbeam AB and is not a
Fortnox product.

## Connect

- The first call shows an authorization link. The user signs in to Nordsynk with their own
  account and chooses which Fortnox companies the agent may use. Never ask for passwords, API keys
  or tokens in the chat.
- Check the connection with a read of the company information and confirm the company name with
  the user.
- If the user has several companies, ask which one they mean and pass its `tenantId`. Do not guess
  or fall back to another company.

## Work

- Nordsynk exposes one `code` tool. Inside it, `skills.grep(...)` and `skills.read(...)` return
  Nordsynk's guidance for Fortnox workflows, and `codemode.grep(...)`, `codemode.describe(...)` and
  `codemode.request(...)` reach the Fortnox API. Look up the guidance before an unfamiliar
  workflow.
- State which company and period an answer is based on, and say so when a result covers only part
  of the data.
- When `code` returns a document descriptor, call `read_document` with its `resourceUri` to get the
  file.

## Changes need the user's approval

- By default, every change in Fortnox (for example a voucher or an invoice) becomes an approval
  request with a link to Nordsynk's approval page. Give the user the link and ask them to check
  the company, the action and the data before approving.
- A pending approval means nothing has changed in Fortnox yet. Do not describe the change as done.
  After approval, read the result back from Fortnox and report what was saved.
- A company admin can turn on automatic approval for a company in Nordsynk's settings. Fortnox
  permissions and Nordsynk access policies still apply.

## When something blocks the work

- If Fortnox sign-in for a company has expired, pass on the reconnect link from the tool result.
- If Nordsynk reports a missing licence, explain that Nordsynk is licensed per Fortnox company and
  user (bought in Fortnox Marketplace), so the user needs a seat in each company they use.
  Accounting firms can use a direct agreement instead: https://nordsynk.se/redovisningsbyra-ai
- Support: https://nordsynk.se/support or hello@nordbeam.io
