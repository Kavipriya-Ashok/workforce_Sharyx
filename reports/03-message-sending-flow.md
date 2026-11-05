# How WhatsApp messages are sent today (read from the code, 2026-11-05)

Read-only analysis. Nothing was changed. Line numbers are for the branch `module3-whatsapp-phase0`.

## 1. The six places that send a WhatsApp message

| # | Trigger | Code | Who writes the text | Credentials used | Saved in `wa_message`? |
|---|---|---|---|---|---|
| 1 | Customer writes -> AI reply (also the tenant's first message) | `WhatsAppWebhook.service.ts:425` -> `WhatsApp.service.sendMessage` | LLM (tenant prompt) + tenant's first message text | tenant's own | Yes (`is_ai_generated`) |
| 2 | Agent types in Live Chat | `WhatsApp.controller.ts:50` -> `sendMessage` | human | tenant from JWT | Yes |
| 3 | Campaign | `WhatsAppCampaign.service.ts:97` -> `sendMessage` (template) | template name only | tenant's own | Yes, but text is the literal `Template: <name>`; no `campaign_id` |
| 4 | Follow-up after silence | `WhatsAppFollowup.service.ts:106` -> `sendMessage` | tenant's follow-up text | tenant's own | Yes (marker `ai_followup`) |
| 5 | Outcome (call / WhatsApp / email / deal won) | `OutcomeTrigger.service.ts:382` (own direct Graph call, **bypasses `sendMessage`**) | LLM text, else **hard-coded fallback** | tenant's own | Yes (written separately) |
| 6 | Interview confirmed by email | `EmailImap.service.ts:540` -> `sendMessage` | **hard-coded English text** with the Meet link | tenant's own | Yes |

Also: `WhatsAppTemplate.service.ts:247 sendTemplateMessage` sends a template with a hard-coded `en_US` language. `RuleEngine` (deal won) goes through path 5.

## 2. Path 1 in detail (customer message -> reply)

1. Meta calls `POST /WhatsApp/Webhook`. Signature is checked but only logged unless `WA_SIGNATURE_MODE=enforce`.
2. Tenant = the `whatsapp_config` row whose `phone_number_id` matches. This is the only place the tenant is decided.
3. Duplicate guard on the Meta message id, then a queue keyed by tenant + phone (fixed in Phase 0).
4. Lead and conversation are found or created for that tenant + phone. STOP words and human takeover are checked.
5. If it is a brand-new conversation, the tenant's first message (`welcome_message`, `{name}`/`{company}` filled in) is prepared. A bare "hi" is answered with just the first message and no LLM call.
6. Otherwise `generateResponse` builds the prompt (company, knowledge, lead, last messages) and calls the LLM.
7. The LLM returns plain text, or `{"action":"execute_tool","toolName":"book_appointment"}`, which writes the booking and fires `agent.outcome` and `voice.call.requested`.
8. Exactly one outbound message per inbound message (first message and answer are joined).
9. `sendMessage` posts to `graph/{phone_number_id}/messages` with the tenant's own token, then saves the row.
10. If the send fails the error is only logged: no retry, no marker on the conversation, and the customer simply gets no reply.

## 3. What `sendMessage` (the shared sender) does and does not do

Does: uses only the given tenant's token and phone_number_id; updates the integration health (failed token code 190 or degraded); creates the conversation if missing; saves the outbound row.

Does not:
- **No 24-hour window check.** Free text is always tried.
- **No opt-out check.** STOP is honoured only on inbound handling, so campaigns, outcomes and follow-ups can still message an opted-out number (follow-up does skip opted-out conversations).
- **No dedupe.** The same event can send twice.
- **Templates are always `en_US` with no variables and no media**, and approval status is not checked.
- Phone is `digits only`. There is no E.164 normalisation, so a 10-digit number goes out without a country code (path 5 adds `91` only when there are exactly 10 digits).
- Saves no `campaign_id`, `outcome`, `channel` or topic (the columns do not exist yet: Phase 1).
- `metaMessageId` falls back to `mock_<time>` if Meta returns no id.

## 4. Path 5 (outcomes) in detail: the weakest path

`OutcomeTrigger.executeTrigger` -> decides "pricing/details" or "meeting booked" with **keyword checks** (`outLower.includes("pric")`, `"detail"`, `"info"`, `"demo"`, ...) -> tries to send **free text**; if Meta rejects it (for example outside 24 h) it falls back to a **template with 3 fixed variables** (name, outcome, Meet link or "Sharyx AI") -> if that fails it sends Meta's **`hello_world`** template -> only then marks failed.

Problems:
- Hard-coded **"Sharyx AI"** (lines 138, 183, 197, 267, 402, 536-572) and **fixed prices ₹15,000 / ₹18,000** (lines 189, 539) can reach any tenant's customer.
- Fake Meet link: `meet.google.com/<random slug>` when none exists (line 370).
- The `hello_world` fallback sends a meaningless message to a real customer and can be recorded as success.
- It bypasses `sendMessage`, so health tracking, the shared saving code and any future 24 h/opt-out guard do not apply.
- Credentials are the tenant's own (checked in Phase 0), so this is a content and compliance problem, not a leak.

## 5. Correction to my Phase 0 report

I wrote that no scheduler reads the follow-up settings. **That was wrong.** `WhatsAppFollowup.service.ts` exists (registered in `whatsapp.module.ts`), and `renderFirstMessage` / `renderFollowup` exist in `WhatsAppAI.service.ts`. It was already in the snapshot commit `a97579a9`, so it is part of your pending work, not Phase 0. It is **off unless `WA_FOLLOWUP_SCHEDULER=true`**; when on, it sends one follow-up per silence, only inside 24 h, only if AI is on and not manual, not human takeover, not opted out, max 20 per tenant per minute. I have not run it yet; I will test it in Phase 4.

## 6. Status updates after sending

Meta's `statuses` webhook updates `wa_message.delivery_status` (`WhatsAppWebhook.service.ts:85-94`). Status is stored as the latest value only (no history), and there is no campaign or topic attached, so analytics cannot be real yet.

## 7. Risks, ranked

1. **Outcome path content** (hard-coded brand, price, fake link, `hello_world`) -> wrong promises to real customers. Phase 2.
2. **No opt-out and no 24 h guard in the shared sender** -> Meta quality and number-ban risk. Phase 5.
3. **Silent failure on AI reply** -> customer left unanswered, nothing to retry. Phase 4/5.
4. **Fixed `en_US` template, no variables/media** -> Tamil customers get English; blocks the PDF "details pack" in your 5B/5C spec. Phases 5B/5C.
5. **No `campaign_id`/topic on messages** -> no attribution or analytics. Phase 1.
6. **Three send implementations** (sendMessage, OutcomeTrigger, sendTemplateMessage) -> one fix must be made three times. Suggested: route all through one sender in Phase 1/2.

## 8. What your Phase 5B / 5C block needs from this

- 5B (details packs) and 5C (media templates) both need **one central sender** that handles: window check, opt-out, dedupe key `(tenant, phone, campaign, topic)`, E.164, template language and variables, document header, and saving `campaign_id/outcome/channel/topic`. That is the Phase 1-2 refactor; 5B/5C should come **after** it, not before.
- Per your rules, 5B/5C are added to the phase list after Phase 5. Channel matrix for them today: call = Not tested, WhatsApp = Not tested, email = Not tested (nothing built).
