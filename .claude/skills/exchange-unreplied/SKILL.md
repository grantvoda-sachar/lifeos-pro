---
name: exchange-unreplied
description: Check Grant's Exchange (Microsoft 365 / Outlook) Sent Items for important emails that have had no reply, draft follow-up replies in Outlook Drafts, and email Grant a summary. Use when asked to check sent items, find emails awaiting a reply, chase unanswered emails, or check whether someone (e.g. a supplier) has responded. Exchange only — never Gmail. Runs daily at ~17:00 SAST as a scheduled task.
---

# Exchange unreplied-email checker

Mailbox: `grants@sacharmobile.co.za` via the Microsoft 365 connector (`mcp__Microsoft_365__*`). Never use Gmail.
Grant's own addresses: `grants@sacharmobile.co.za`, `grantsachar@gmail.com`, `grant.voda@gmail.com`.

Run end-to-end without asking for confirmation: collect → filter → confirm no reply → draft → summary email.
Hard rules:
- **Never send anything to a third party.** Follow-ups are saved as drafts only. The only email you send is the summary to Grant.
- **Never create a duplicate draft** (see Step 4).

## Inputs
- Optional target (person, domain or topic). If none: scan everything.
- Lookback: 21 days. Minimum wait before flagging: 2 business days for money/legal/contract items, 3 business days for everything else.

## Step 1 — Collect sent emails
- Untargeted: `outlook_email_search` with `folderName: "Sent Items"`, `order: "newest"`, `limit: 25`; keep paging with `offset` until `sentDateTime` is older than the lookback.
- Targeted: `outlook_email_search` with `query` = topic keywords (no `folderName`, no `order`); keep hits whose `sender` is Grant or starts with `/O=`.

## Step 2 — Throw out noise (most of Sent Items is automated)
Skip when ANY is true:
- Every recipient is one of Grant's own addresses.
- System/automated mail: "Your quote from Sachar Mobile …", Daily Proof, GRV status, CashOS, Heartbeat, Pulse, Harry, Sachar Orders, "Money Hour"/OVERDUE pushes, any report or notification layout.
- Reply-closers with no ask: "thanks", "perfect", "noted", "will do", "I'll send it this morning", FYIs, forwards with no question.
- Grant is the one who owes the action (he promised to send something). List these separately as "You promised" — do not draft a chase.

Keep (important) when it asks someone else for an answer or action AND at least one is true:
- Money: refund, debit order, invoice, payment, incentive, rebate, quote, contract, cancellation, severance.
- External party (any domain other than sacharmobile.co.za / vodadealers.co.za).
- Explicit deadline, "urgent", "ASAP", or high importance.
- Internal staff asked for something specific with a deadline (e.g. a missing report).

## Step 3 — Confirm there's been no reply (don't guess)
For each kept email, `read_resource` it to get `toRecipients`, `ccRecipients`, `sentDateTime`, `conversationId`, `subject`. Then:
1. **Collapse threads.** If Grant sent a later message in the same thread (same subject stem after stripping RE:/FW:), evaluate only the latest one. The waiting clock starts from Grant's latest message. (Lesson: on 15 Oct Grant had already chased Zeroslack himself; a new draft would have been a duplicate.)
2. Search for replies after `sentDateTime`:
   - `outlook_email_search` `query` = subject stem, `afterDateTime` = sentDateTime.
   - For each external recipient domain: `query` = company name (e.g. `zeroslack`), `afterDateTime` = sentDateTime. Domain-only `sender` searches are unreliable — don't rely on them.
   - `sender` = each recipient's full address, `afterDateTime` = sentDateTime.
3. A reply = a message after sentDateTime, from any recipient (or their domain), on that thread/topic. Auto-replies / out-of-office don't count (mention them). Replies from internal staff don't count when the ask was to an external party.

## Step 4 — Draft the follow-up (Outlook Drafts)
Before drafting, check for an existing draft: `outlook_email_search` with `folderName: "Drafts"` and `query` = subject stem. If one exists, don't create another — list it in the summary as "Draft already waiting".

Otherwise `outlook_create_reply_all_draft` on Grant's latest message in the thread, `bodyType: "html"`. Draft style:
- "Good day," opener; refer to the date of the last email and that no response has been received.
- Restate the asks as a numbered list with amounts (R x,xxx.xx) and dates.
- A concrete deadline: next business day for money issues, 2 business days otherwise.
- A consequence only where it's real (e.g. a debit order → "I will instruct our bank to reverse and block it").
- Sign off "Regards,<br>Grant Sacharowitz". Short. No fluff.
- Second chase or later (an earlier chase has also gone unanswered): firmer, and add a more senior contact in Cc with `outlook_update_draft` when one is in the thread history.

Then `outlook_modify_labels` → add category `Awaiting Reply` to Grant's latest sent message in the thread.

Fallback (only if a draft call fails with missing `Mail.ReadWrite`): put the full draft text in the summary email instead.

## Step 5 — Summary email to Grant
Always send one, even when there's nothing to chase. `outlook_send_mail`:
- to: `grants@sacharmobile.co.za` only
- subject: `Unreplied emails · <Day DD Mon> · <N> to chase` (or `· nothing to chase`)
- bodyType `html`, short:
  1. One line: how many sent emails were checked and how many are waiting.
  2. **To chase** (most urgent first: money, then oldest), for each: subject, who, days waiting, what was asked, amount/deadline, "Draft ready in Outlook" + the draft's webLink.
  3. **Draft already waiting**: drafts made earlier that Grant hasn't sent yet, with days since the original email.
  4. **You promised**: things Grant said he'd do and hasn't sent yet (one line each).
  5. **Replied since last run**: threads that were Awaiting Reply and now have a reply. Remove the `Awaiting Reply` category from those with `outlook_modify_labels`.

Interactive runs: also show the summary in chat.
