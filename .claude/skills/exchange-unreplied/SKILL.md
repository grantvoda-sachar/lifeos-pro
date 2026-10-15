---
name: exchange-unreplied
description: Check Grant's Exchange (Microsoft 365 / Outlook) Sent Items for important emails that have had no reply, flag them, and prepare a follow-up draft. Use when asked to check sent items, find emails awaiting a reply, chase unanswered emails, or check whether someone (e.g. a supplier) has responded. Exchange only — never Gmail.
---

# Exchange unreplied-email checker

Mailbox: `grants@sacharmobile.co.za` (Microsoft 365 connector, `mcp__Microsoft_365__*`). Do NOT use Gmail tools.

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
1. Each recipient: `outlook_email_search` with `sender` = recipient address and `afterDateTime` = sentDateTime. Also try the domain alone (e.g. `zeroslack.co.za`) and the person's display name — sender-address matching is unreliable.
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

Save it: try `outlook_create_reply_all_draft` on the original sent message (HTML body). If that fails with missing `Mail.ReadWrite`, write the draft to the scratchpad as `followup-<slug>.md` (To/Cc/Subject/Body), show it in chat, and tell Grant it needs to be pasted into Outlook. Never send — drafts only.

## Permissions note
Reading works with `Mail.Read`. Saving drafts and categories needs `Mail.ReadWrite` granted to the connector (client id 07c030f6-5743-41b7-ba00-0a6e85f37c17) in Microsoft Entra admin center → Enterprise applications → Permissions → Grant admin consent.
