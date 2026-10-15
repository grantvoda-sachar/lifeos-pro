---
name: exchange-unreplied
description: Check Grant's Exchange (Microsoft 365 / Outlook) Sent Items for important emails that have had no reply, flag them, and prepare a follow-up draft. Use when asked to check sent items, find emails awaiting a reply, chase unanswered emails, or check whether someone (e.g. a supplier) has responded. Searches Exchange only (never Gmail); emails the draft to Grant if Outlook drafts are blocked.
---

# Exchange unreplied-email checker

Mailbox: `grants@sacharmobile.co.za` (Microsoft 365 connector, `mcp__Microsoft_365__*`). Only ever search/read the Exchange mailbox — never search Gmail. Gmail is used for one thing only: delivering the draft to Grant when Exchange can't save it (Step 5).

Run end-to-end without asking for confirmation: find → confirm no reply → flag → draft → deliver.

## Inputs
- Optional target: a person, domain, or topic (e.g. "Zeroslack debit order"). If none, scan all of Sent Items.
- Lookback window: default 30 days. Minimum wait before flagging: 3 business days (2 for anything with money at stake).

## Step 1 — Collect candidate sent emails
- Targeted: `outlook_email_search` with `query` = topic keywords (no `folderName`, no `order`). Keep hits whose `sender` is `grants@sacharmobile.co.za` or starts with `/O=`.
- Untargeted: `outlook_email_search` with `folderName: "Sent Items"`, `order: "newest"`, page with `offset` until past the lookback window.

## Step 2 — Decide which are "important"
Important if ANY of:
- Asks for action or an answer (question, "please confirm", "arrange", "refund", "ASAP", deadline).
- Involves money: refunds, debit orders, invoices, payments, contracts, cancellations, quotes.
- Sent to an external party (supplier, bank, landlord, client, government) rather than internal staff.
- Importance flag high.
Skip: FYIs, thank-yous, "noted", newsletters, auto-replies, emails where Grant only forwarded info with no ask, and replies that close a thread.

## Step 3 — Confirm no reply (the part that matters — don't guess)
For each candidate, `read_resource` the message to get `toRecipients`, `ccRecipients`, `sentDateTime`, `conversationId`. Then check BOTH:
1. Each recipient: `outlook_email_search` with `sender` = recipient address and `afterDateTime` = sentDateTime. Domain-only `sender` values (e.g. `zeroslack.co.za`) often return nothing even when mail exists, so ALSO run `query` = the company/domain name (e.g. `zeroslack`) with `afterDateTime`, and check every hit's sender.
2. Topic: `outlook_email_search` with `query` = subject keywords (strip RE:/FW:) and `afterDateTime` = sentDateTime.
A reply = any message after sentDateTime from a recipient (or recipient's domain) on that subject/conversation. Auto-replies / out-of-office do NOT count — but mention them.
Internal recipients replying (e.g. Anneke) do not count as the external party replying.

## Step 4 — Flag
Report in chat, most urgent first, one block each:
- Subject, recipients, date sent, days waiting
- What was asked (one line)
- Why it matters (amount / deadline)
- Evidence checked ("no mail from @zeroslack.co.za since 6 Oct")

Also try `outlook_modify_labels` to add category `Awaiting Reply` to the sent message. If it fails with missing `Mail.ReadWrite`, say so once and continue.

## Step 5 — Draft the follow-up
Write a short, firm chaser that:
- References the original date and that no response was received.
- Restates the specific asks as a numbered list, with amounts and dates.
- Sets a concrete deadline (next business day for money issues) and a consequence where appropriate (e.g. bank reversal of a debit order).
- Signs off "Regards, Grant Sacharowitz".

Deliver it, in this order:
1. `outlook_create_reply_all_draft` on the original sent message (HTML body). Success → give Grant the draft's webLink. Done.
2. If that fails with missing `Mail.ReadWrite`: email the draft to Grant with `mcp__Gmail__send_message`
   - to: `grants@sacharmobile.co.za` only (never to the third party)
   - subject: `DRAFT to send: <short subject>`
   - plain-text body: one instruction line ("Reply All on your <date> '<subject>' email, add <cc> in Cc"), then To/Cc/Subject lines, a divider, then the draft text.
   - Tell Grant it was sent from his Gmail and may land in Mimecast quarantine/junk.
3. Always also show the draft in chat and save it to the scratchpad as `followup-<slug>.md`.

Never send anything to the other party — Grant sends the real reply himself.

## Permissions note
Reading works with `Mail.Read`. Saving drafts and categories needs `Mail.ReadWrite` granted to the connector (client id 07c030f6-5743-41b7-ba00-0a6e85f37c17) in Microsoft Entra admin center → Enterprise applications → Permissions → Grant admin consent.
