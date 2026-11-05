# WhatsApp Brain: audit and test report

## Fix status (updated after Phase 1)

| Bug | Status | Notes |
|---|---|---|
| 1. Cross-tenant mix-up | **Fixed (Phase 1)** | Company loaded by tenant id; every lead/conversation lookup in PromptEngine, AgentOrchestrator and AgentTools filtered by `tenant_id`; the orchestrator's process-wide "first company" cache is now per tenant; the outcome de-dup key now includes the tenant (two tenants with the same customer phone no longer suppress each other's email). Tests P1-1 to P1-3. |
| 2. Confirmation email never sends | **Fixed (Phase 1)** | Tenant passed to every send; each tenant uses its own mailbox and sender name; skip + log when the contact has no email or the tenant has no mailbox; 3 attempts with backoff; failures stored in `email_delivery_log` with `tenant_id`; the IMAP-triggered WhatsApp send now uses the injected service with the tenant. Tests P1-4 to P1-6. |
| 3. No webhook signature check | **Fixed (Phase 1)** | `X-Hub-Signature-256` checked against the raw body. Secret: the tenant's own encrypted `app_secret`, else `META_APP_SECRET`. `WA_SIGNATURE_MODE=log` (default) or `enforce`. Tests P1-7. |
| 4 to 10, Medium, Low | Open | Phases 2 to 5. |

Phase 1 results: 27 of 27 two-tenant checks pass. The earlier 34-check suite was re-run: T2c (email) and T11b (company name) now pass; nothing that passed before now fails. T11c still shows FAIL only because the test reads an old row written before the fix (A's `meeting_info` is timestamped before the fix; the fresh two-tenant test P1-2c proves A is no longer touched).

The sections below are the original audit, kept as written for reference.

Scope: `/admin/whatsapp/brain` (frontend `WhatsAppAIBrainPage.tsx`) plus the WhatsApp webhook, prompt engine, templates, campaigns, and email confirmation path.
No application code was changed in this step. Only test files were added (under the session scratchpad: mock server layer, SMTP sink, test runner).

## 1. Summary

**Overall status: NOT production-ready.** The core plumbing works (a saved prompt does reach the LLM, per tenant). Most of what the Brain is supposed to do around that plumbing is missing or broken.

| Result | Count |
|---|---|
| Pass | 11 |
| Fail | 18 |
| Not judged / not tested | 5 |

(34 recorded checks. One check, A1, reported PASS in the runner because my text search matched the words "interview"/"demo" inside another template's text; the page has no Interview or Product Demo template, so I count it as a FAIL here.)

**What was real and what was mocked**

| Part | Real or mock |
|---|---|
| NestJS backend, Postgres database (scratch DB `audit_verify_fixes2`), JWT auth, two tenants, webhook route, prompt building, tool-call handling, CRM/lead/conversation writes, email code path | **Real** |
| LLM (OpenAI/Gemini) | **Mock.** A fake returns an "echo" or a scripted tool call. Every request (system prompt, history, model) was recorded. So I can prove *what is sent to the LLM*, not *how well a real LLM answers*. |
| Meta Graph API (send, templates) | **Mock.** Every outbound payload was recorded. No real WhatsApp message was sent. |
| SMTP | **Mock** (local sink on 127.0.0.1:2525). |
| Meta webhook payloads | Hand-made, in Meta's format. |
| Browser UI (T13) | **Not tested in a browser.** Code review only. |

The app was driven through its real HTTP API on port 8098 (not 8070; 8070 is the Vite dev server, which proxies to the backend).

## 2. Architecture flow found in the code

```
Meta -> POST /api/v1/WhatsApp/Webhook                (WhatsAppWebhook.controller.ts:41, no signature check)
  -> WhatsAppWebhookService.processIncomingWebhook   (WhatsAppWebhook.service.ts:35)
       tenant = whatsapp_config.phone_number_id lookup (unknown number: dropped)
       statuses[] -> update wa_message.delivery_status
       dedupe by wamid (memory + processed_messages table), per-phone serial queue
  -> processSingleCandidateMessage                    (:145)
       find/create lead (regex-extracts email, CTC, notice period, role...), lead_activity
       find/create wa_conversation, save inbound wa_message
       if conversation_status == human_takeover -> stop
       text / document / image only -> WhatsAppAIService.generateResponse
  -> WhatsAppAIService.generateResponse               (WhatsAppAI.service.ts:76)
       load wa_ai_config (per tenant); is_ai_enabled; stop-word check (substring)
       PromptEngineService.buildAutoContext + generateReply
  -> PromptEngineService                              (PromptEngine.service.ts)
       buildSystemPrompt: master prompt (the Brain text) + company + CRM + "last call" + appointment
                          + HR job openings + KB + tool list + tool-calling rule
       LLM call: Gemini or OpenAI, last 8-10 turns, temperature 0.3
       if reply is {"action":"execute_tool"} -> getToolConfirmation (book_appointment, capture_contact,
          dispatch_voice_call, send_brochure, transfer_to_human)  -> fixed reply strings in code
  -> WhatsAppService.sendMessage                      (WhatsApp.service.ts:181)  Meta Graph POST, then save outbound wa_message
  -> book_appointment also: save meeting_info on conversation, update lead, emit "agent.outcome"
  -> AgentOutcomeListener -> OutcomeTriggerService.executeTrigger("email", ...) -> EmailService.sendEmail
```

**Where each requirement stands**

| Req | Exists | Missing / wrong |
|---|---|---|
| A. Prompt templates | One system-prompt text area saved per tenant (`wa_ai_config.system_prompt`). Four one-line quick prompts in the page (Sales, E-Commerce, Appointment, Support). | No Interview or Product Demo template. No selector. No "Custom". No stored defaults, so no "Reset to default" (no endpoint, no button). |
| B. LLM messaging | Saved prompt + history go to the LLM. | Prompt is polluted with fixed Sharyx/HR text. Several replies are fixed strings from code, not the LLM. No injection guard. |
| C. Storage | Inbound/outbound messages stored with tenant, phones, direction, text, template name, delivery status. | No campaign id, no channel column, no outcome field or extraction. |
| D. Meta templates | Create/sync/list, body variables re-indexed to {{1}}. | Sending ignores variables, language, approval status. No 24h window logic. |
| E. Campaigns | A campaign record with a template name and recipients. | No audience selection, dedupe, opt-out, invalid-number handling, rate limit, per-contact status, or reply-to-campaign linking. |
| F. Email | A confirmation email path exists (`agent.outcome`). | It fails for every tenant (see Bug 2). Content is fixed Sharyx-branded HTML. |

## 3. Test table

Mode shown as: R = real app/DB, M = mocked LLM/Meta/SMTP.

| ID | Scenario | Steps | Expected | Actual | Result | Mode |
|---|---|---|---|---|---|---|
| A1 | Interview and Product Demo default templates | Read the page's template buttons | Both exist | Only Sales, E-Commerce, Appointment, Support. Each is 1-3 sentences, not a full prompt. | **Fail** | R (code) |
| A4 | Reset to default | `POST /WhatsApp/AI/Reset` | Defaults restored | 404. No endpoint, no UI button. | **Fail** | R |
| T1 | Save prompt V1, then edit to V2, send inbound | Save via API, post webhook, read the system prompt actually sent to the LLM | V1 used, then V2 (V1 gone) | V1 present in call 1. V2 present and V1 absent in call 2. | **Pass** | R + M-LLM |
| T1b | Conversation history sent to LLM | Second message | Earlier turns included | Yes (user and assistant turns). | **Pass** | R + M-LLM |
| B-ctx | Prompt contains no invented facts | Inspect the sent prompt | None | Contains a fixed "Last Phone Call Summary: Inquired about autonomous WhatsApp co-pilot (QUALIFIED_PROSPECT)" for every contact, a fixed services list, and an HR "open roles" block. | **Fail** | R + M-LLM |
| T3 | Custom clinic prompt | Save clinic prompt, inbound | Clinic prompt is the master prompt | Yes, but the HR job-openings block is still appended (see Bug 4). | **Pass (plumbing)** | R + M-LLM |
| T2a | Demo booking: WhatsApp reply | Scripted LLM tool call `book_appointment` | Reply written by the LLM from the prompt | Fixed string from code: "🎉 Perfect! I have scheduled your consultation for ..." with emoji, always English. | **Fail** | R + M |
| T2b | Demo booking: outcome stored | Read lead and conversation | "demo booked" outcome stored | `conversation.meeting_info` saved. `lead.lead_status` stays `NEW` for demos (only interviews set a status). No outcome field. | **Fail** | R |
| T2c | Confirmation email after booking | Contact had given an email earlier; capture SMTP | One email, same date/time/link | **0 emails.** Log: "Default meeting email failed: No active email configuration found." | **Fail** | R + M-SMTP |
| T5 | Send a Meta template, with and without variables | `POST /WhatsApp/Send` `message_type=template` | Language from the template record, variables filled | Payload is only `{name, language:"en_US"}`. The request model has no variables field. | **Fail** | R + M-Meta |
| D4 | Unknown / rejected template is blocked | Send `does_not_exist_or_rejected` | Clear error | HTTP 201; sent to Meta anyway. | **Fail** | R + M-Meta |
| D1 | Template stored in Meta format, status tracked | Create template (Meta mock returns PENDING) | Status PENDING | `PENDING`, body re-indexed to `{{1}} {{2}}`. | **Pass** | R + M-Meta |
| T6 | Broadcast to 5 (1 invalid, 1 opted-out, 1 duplicate) | Contact sent STOP first; campaign with 5 numbers | Invalid rejected, opted-out and duplicate skipped | All 5 sent, including `"12"`, the duplicate (twice) and the opted-out number. Campaign shows `sent_count=5`. | **Fail** | R + M-Meta |
| E-track | Per-contact status and campaign id stored | Inspect `wa_message` columns | `campaign_id` present | Column does not exist. | **Fail** | R |
| T7 | "price enna?" reply is answered from the campaign template and linked to it | Reply after campaign | Campaign content used, link stored | Generic LLM call only. No campaign content, no link. | **Fail** | R + M-LLM |
| T8 | Reply after 25 hours falls back to a template | Age conversation by 25h, send text | Template (or blocked) | Free text sent. No window check anywhere. | **Fail** | R + M-Meta |
| T9a | Edge inputs do not crash | Empty, 6000 chars, image, audio, emoji, abusive, STOP | HTTP 200 each | HTTP 200 for all. | **Pass** | R + M |
| T9b | Voice note handled | Send audio | Transcribed or "please type" | No LLM call, no reply. The customer gets silence. | **Fail** | R |
| T9c | STOP opts the contact out and stays out | STOP, then "hello again" | One confirmation, then silence | Confirmation sent, but the next message was answered normally. No opt-out is stored. | **Fail** | R |
| T9d | "bus stop" is not treated as STOP | "Where is the bus stop near your office?" | Normal reply | Answered with "You have successfully unsubscribed." | **Fail** | R |
| T9e | Repeated identical messages | 3 x same text | Sensible handling | One reply each. No throttling. | **Not judged** | R |
| T10a | LLM outage | Mock returns 503 | No crash, fallback sent | HTTP 200, tenant's fallback text sent. | **Pass** | R + M-LLM |
| T10b | Meta send error | Mock returns error 131026 | No crash, logged | HTTP 200, server alive, error logged. | **Pass** | R + M-Meta |
| T10c | Email failure | SMTP refuses | Clean error, retry, log | Clean 500 error. No retry logic found. | **Not judged** | R + M-SMTP |
| T10d | DB error | not simulated | - | Not tested. | **Not tested** | - |
| T11a | Tenant B uses B's prompt, not A's | Webhook to B's number | B prompt only | Correct. | **Pass** | R + M-LLM |
| T11b | B's bot represents B's company | Inspect "You represent ..." | "Beta Inc" | "BoilerPlate" (the first company in the table). | **Fail** | R + M-LLM |
| T11c | B's booking must not touch A's data | Same customer phone messages both tenants; B books | Only B's conversation changes | **A's conversation got B's `meeting_info`.** | **Fail** | R |
| T12a | Webhook signature verified | Unsigned forged POST | 401/403 | 200, processed. | **Fail** | R |
| T12b | No keys/tokens in server log | grep log | None | None found. | **Pass** | R |
| T12c | LLM key not sent to browser | GET AI/Config | Not present | Not present. | **Pass** | R |
| T12d | WhatsApp token not sent to browser | GET Config | Not present | Not present. | **Pass** | R |
| T12e | Prompt-injection refusal | needs a real LLM | Refused | Not testable with a mock. The prompt has no anti-injection text. | **Not tested** | - |
| T12f | Input sanitisation | code review | Length cap / cleaning | None found. A 6000-character message went to the LLM unchanged. | **Not judged** | R (code) |
| T13 | UI: console errors, states, mobile | - | - | **Not run in a browser.** See section 5. | **Not tested** | - |

## 4. Bugs found

Line numbers are for the current working tree.

### Critical

**Bug 1: Cross-tenant data mix-up in the Brain.**
- `PromptEngine.service.ts:219` `company.findOne({ where: {} })` takes the first company in the table, not the tenant's. Tenant B's bot said "You represent BoilerPlate" (T11b).
- `:257`, `:275`, `:522`, `:534`, `:592`, `:614`, `:663` look up leads and conversations by phone only, with no tenant filter. When the same customer phone exists in two tenants, B's booking overwrote A's conversation (T11c). `transfer_to_human` and `capture_contact` have the same flaw.
- Repro: message both tenants from one phone; send a booking in B; read A's `wa_conversation.meeting_info`.
- Fix: add `tenant_id` to every one of those queries; load the company by `tenantId`.

**Bug 2: The confirmation email never sends.**
- `OutcomeTrigger.service.ts:678, 724, 789, 880` call `emailService.sendEmail(dto, "system")` with no tenant, so it defaults to `"default"`, and no mailbox exists for it. Result: "No active email configuration found" (T2c).
- This used to be hidden by the shared "default" mailbox. My earlier security pass removed that shared fallback, which exposed the missing tenant argument. The defect is the missing argument; I should have caught it then.
- Also broken in the same way: `EmailImap.service.ts:534` builds `new WhatsAppService()` by hand and sends with no tenant, so the WhatsApp confirmation from the email flow fails too.
- Fix: pass `ctx.tenantId` to every `sendEmail` call; inject the WhatsApp service properly.

**Bug 3: No webhook signature check.** `WhatsAppWebhook.controller.ts:41` accepts any POST (T12a). Anyone who knows a tenant's `phone_number_id` can inject messages, trigger AI replies and cost, and create leads. Fix: verify `X-Hub-Signature-256` against the raw body with the Meta app secret.

**Bug 4: The Brain is not fully prompt-controlled.** The user's prompt is only one layer. The code adds, for every tenant and every use case:
- a fixed persona "Sharyx AI" when the prompt is empty (`:124`);
- a fixed services list "AI Autonomous Workforce, WhatsApp Cloud Automation ..." (`:223`, `:316`);
- an invented call history "Last Phone Call Summary: Inquired about autonomous WhatsApp co-pilot" with outcome QUALIFIED_PROSPECT (`:321`);
- the HR job-openings block with "STRICTLY ONLY OFFER THESE 4 ROLES" (it lists 3) and recruitment rules (`:294`, `:176-184`), even for a clinic or demo tenant;
- a hardcoded instant reply with emoji when a message contains "link" (`:332-345`);
- fixed tool replies (see Bug 5).
A clinic bot therefore receives instructions about hiring and invented facts about a call that never happened. This breaks the rule that behaviour must come only from the prompt, and it is a hallucination source.

### High

**Bug 5: Fixed replies that claim actions that did not happen.**
- `send_brochure` (`:657`) replies "I've shared our official Sharyx 2026 product guide and brochure". Nothing is sent.
- `dispatch_voice_call` (`:640`) says "Our AI Sales Specialist is calling you right now" even when no call provider is configured.
- `book_appointment` (`:510`) defaults the slot to "Tomorrow at 11:00 AM" if the LLM gives none, and uses a **made-up Google Meet link** (random letters, `CalendarHelper.ts` fallback, and `https://meet.google.com/shx-demo-room` at `EmailAI.service.ts:61` and `OutcomeTrigger.service.ts:695`) when Google credentials are missing. Customers get a link that does not exist.
- `:558` defaults the applied role to "Backend Developer".
- All of these replies are English-only with emoji, ignoring the Tamil/Tanglish rule.

**Bug 6: Meta templates are sent wrong.**
- `WhatsApp.service.ts:196-201` and `WhatsAppTemplate.service.ts:269` hardcode `en_US`, never look up the template, never send header, button or body variables from the call path (campaigns send none at all).
- `WhatsAppTemplate.service.ts:60,118,177` default an unknown status to `APPROVED`.
- Unknown or unapproved templates are sent to Meta anyway (D4).

**Bug 7: Campaigns.** `WhatsAppCampaign.service.ts:87-112`: no phone validation, dedupe, opt-out check, rate limit or per-contact result; `sent_count` is just the number of calls that did not throw. No `campaign_id` on messages, so replies cannot be linked and the dashboard cannot count replied/interested/booked.

**Bug 8: Opt-out is broken in both directions.** `WhatsAppAI.service.ts:90` uses `includes()` on the whole message, so "bus stop" unsubscribes the user (T9d). And nothing is stored, so after STOP the bot keeps replying and campaigns keep sending (T9c, T6).

**Bug 9: No 24-hour window.** Free text is always sent (T8); nothing falls back to a template.

**Bug 10: Dead settings.** `ai_mode` (including "Manual Mode (Human Only)"), `auto_followup_enabled`, `followup_delay_minutes` and `followup_message` are saved but never read by any backend code (grep found only the save code). Choosing "Manual" does not stop the bot.

### Medium

- **Voice notes and other media** (`audio`, `video`, `sticker`, `location`) produce no reply (T9b). Images are turned into "[Candidate uploaded an image instead of a PDF resume]", which is HR wording for every tenant.
- **Hardcoded HR logic in the webhook** (`WhatsAppWebhook.service.ts:180-270`): regexes for "interview/placement/CTC/notice period" and role names "backend developer ... ai solutions engineer" decide who is a "candidate". This is the kind of hardcoded interview logic the requirements forbid.
- **Empty and very long messages** are passed to the LLM unchanged (no cap or cleaning).
- **No outcome extraction.** Nothing writes interview scheduled / demo booked / interested / not interested / needs human. Only `INTERVIEW_SCHEDULED` is set, and only for interviews.
- **No email retry**; the confirmation email's wording is fixed Sharyx-branded HTML ("Sharyx AI Team", "Meeting Confirmed 🚀").
- **Brain page: saved API key looks empty.** Since my earlier change the server never returns the key, but the page's key box then shows blank, so a user cannot tell a key is saved. The page should show "key saved" using `has_api_key` (a small side effect of my earlier fix).
- **Brain page default model is `gpt-4o-mini` while the server default is Gemini** (`WhatsAppAI.service.ts:32`), so a new tenant can show one provider and run another.

### Low

- The page has hardcoded light-theme classes (`bg-white`, `text-slate-900`) and will look wrong in dark mode.
- Loading state exists only for Save; there is no load-error state if `GET AI/Config` fails (the call swallows errors and returns null).

## 5. Missing features compared to requirements A to F

- **A:** Interview and Product Demo templates (full prompts), template selector, Custom mode, per-tenant default store, Reset to default, protection of defaults when editing.
- **B:** Anti-injection and scope rules in the prompt; language rule is only in the fallback persona, not enforced; no tone rules.
- **C:** `campaign_id`, `channel`, outcome field and extraction.
- **D:** Variable filling, per-template language, header/footer/buttons on send, approval-status gate, 24-hour window logic.
- **E:** Audience selection, scheduling worker, rate limiting, opt-out and duplicate handling, per-contact status, reply linking, campaign dashboard.
- **F:** Working per-tenant email (Bug 2), content built from what the WhatsApp reply actually said, graceful skip when no email, retry and logging.

UI (T13), from code only: the page uses `grid-cols-1 md:grid-cols-2` so it stacks on mobile; there is no validation (empty prompt, over-long prompt); success and failure toasts exist; the console was not checked.

## 6. Samples of what the bot actually sent

These came from the mocked Meta layer. Lines starting "ECHO" are the fake LLM and only prove which prompt was used; the real wording of LLM answers could not be judged here.

**Fixed booking reply (this is real code output, not the LLM):**
```
🎉 Perfect! I have scheduled your consultation for *Friday 11 Nov 2026 at 3:00 PM IST*.

🎥 *Google Meet Link*: https://meet.google.com/c5w-7xo4-dc1

Please click the link to join at the scheduled time. Looking forward to speaking with you! 👍
```
The link is a random fake code (no Google credentials in the test).

**Opt-out reply (also sent for "bus stop"):**
```
You have successfully unsubscribed. Reply START anytime to re-enable messages.
```

**Fallback when the LLM was down:** `FALLBACK_TEXT` (the tenant's own configured fallback, as intended).

**Template send:** `{"type":"template","template":{"name":"welcome_a","language":{"code":"en_US"}}}` with no variables.

**Confirmation email:** none was sent (Bug 2), so I have no live sample. From the code (`OutcomeTrigger.service.ts:690-720`) it would be: subject "Google Meet Invitation: Sharyx Session with <name>", a purple banner "Meeting Confirmed 🚀", "Hi <name>", the details line (the call summary text), "Host: Sharyx AI Specialist", a Join button, and "Best regards, Sharyx AI Team". It has no timezone line, and a tenant that is not Sharyx would be sending Sharyx-branded mail.

## 7. To be tested later (and why not now)

- Real LLM behaviour: tone, short replies, grammar, no invented prices/dates/links, Tamil/Tanglish/English matching, off-topic refusal, prompt-injection refusal. Needs a real model and key.
- Real Meta: template approval, real delivery/read receipts, the 24-hour window as enforced by Meta, number-quality limits, real rate limits. Needs a live WhatsApp Business account.
- Real email deliverability (SPF/DKIM, spam placement). Needs a real domain and mailbox.
- Real Google Calendar/Meet link creation. Needs Google credentials.
- Browser UI: console errors, validation, mobile layout, dark mode, port 8070 session. I did not drive a browser.
- Load and concurrency (many tenants and messages).
- DB failure handling.

## 8. Prioritised fix plan

| # | Fix | Effort |
|---|---|---|
| 1 | Bug 1: tenant-scope every lead/conversation/company lookup in PromptEngine and webhook | S (2-3 h) |
| 2 | Bug 2: pass tenant into all `sendEmail` calls; fix IMAP-triggered WhatsApp send; add retry and "no email, skip and log" | S-M (3-4 h) |
| 3 | Bug 3: Meta webhook signature check (raw body, app secret, log-only mode first) | M (3 h) |
| 4 | Bug 4: strip fixed Sharyx/HR/"last call" text; add the HR block only when the tenant has open roles; keep tool rules generic | M (3-4 h) |
| 5 | Bug 5: let the LLM write the booking confirmation from the tool result; stop claiming brochure/call actions that did not run; no fake Meet links (say "link to follow" instead) | M (4 h) |
| 6 | A: add Interview and Product Demo templates, selector, Custom, per-tenant save, Reset to default (defaults stored read-only on the server) | M-L (1 day) |
| 7 | Bug 8 and 9: real opt-out table (exact-word STOP/START, checked before every send and in campaigns), 24-hour window with template fallback | M (4-6 h) |
| 8 | Bug 6 and 7: template lookup/status gate, variables, language; campaign rewrite (validation, dedupe, opt-out, rate limit, per-contact status, `campaign_id`, reply linking, counts) | L (1.5-2 days) |
| 9 | Bug 10 and outcomes: honour `ai_mode`, build follow-ups, extract and store outcomes | M-L (1 day) |
| 10 | Media handling, input length cap, anti-injection prompt block, remove hardcoded HR regexes | M (4-6 h) |
| 11 | Brain page: key-saved indicator, load-error state, validation, dark theme | S-M (3 h) |

Rough total: 7-9 working days. The first four (about 1.5 days) remove the data-leak and the broken-email problems and should go first.
