# Module 3: WhatsApp Automation & AI Brain — Deep Audit, QA & Architecture Analysis

**Date:** November 5, 2026  
**Module Audited:** Module 3: WhatsApp Automation (per tenant) = Connection, Brain, Templates, Campaigns, Analytics, Intent Classification and Outcome-Triggered Messaging  
**Pages Evaluated:**  
- `http://localhost:8070/admin/whatsapp` (`WhatsAppAutomation.tsx`)  
- `http://localhost:8070/admin/whatsapp/campaigns` (`WhatsAppCampaignFormPage.tsx` / `WhatsAppCampaignsPage.tsx`)  
- `http://localhost:8070/admin/whatsapp/templates` (`WhatsAppTemplatesPage.tsx`)  
- `http://localhost:8070/admin/whatsapp/brain` (`WhatsAppAIBrainPage.tsx`)  
- `http://localhost:8070/admin/whatsapp/analytics` (`WhatsAppAnalyticsPage.tsx`)  
**Backend Controllers & Services:** `WhatsApp.controller.ts`, `WhatsAppWebhook.controller.ts`, `WhatsAppAI.controller.ts`, `WhatsAppTemplate.controller.ts`, `WhatsAppCampaign.controller.ts`, `VoiceWebhook.controller.ts`, `OutcomeTrigger.service.ts`, `PromptEngine.service.ts`, `AgentOrchestrator.service.ts`  
**Database Tables:** `whatsapp_config`, `wa_ai_config`, `wa_template`, `wa_campaign`, `wa_message`, `wa_conversation`, `lead`, `email_delivery_log`, `voice_call_log`  

> ## 🛠 STATUS UPDATE 2026-11-05 — Module 3 remediation: **Phase 0 done** (see **Section 14**)
> Phase 0 (two-tenant baseline) found **8 real cross-tenant leaks**, all fixed and re-tested (14/14 × 3 runs). Phases 1–8 are **not started** — waiting for your "continue".
> Everything below this banner is the **original audit, unchanged, for history**.

---

## 1. Five-Line Plain English Summary

Module 3 is **NOT production-ready**. While core tenant-scoped WhatsApp credential encryption, webhook phone routing, and basic prompt forwarding to the LLM function, the surrounding enterprise automation is largely unbuilt or simulated. Specifically, the Analytics page displays 100% hardcoded fake numbers without calling any backend API, incoming chats rely on brittle keyword regexes rather than true LLM intent classification, and outcome-triggered campaigns use hardcoded "Sharyx AI" English fallback text and fixed pricing (`₹15,000/mo`). Furthermore, `wa_message` lacks `campaign_id`, `outcome`, and `channel` columns, making message attribution impossible, and supporting recruitment/sales features (calendar check, reminders, resume parsing, no-show handling) are completely absent.

---

## 2. Real vs Mocked Breakdown

| Component / Subsystem | Execution Mode | Details & Evidence |
| :--- | :---: | :--- |
| **Backend API Server** | **REAL** | Running NestJS on `http://localhost:8000`. Executed 13 automated API and database tests live. |
| **PostgreSQL Database** | **REAL** | Remote PostgreSQL database on `158.220.99.156`. Verified actual column schemas in `wa_message`, `wa_conversation`, `whatsapp_config`, and `lead`. |
| **JWT Tenant Context** | **REAL** | Verified isolation using tokens for Tenant A (`646b4abe-e6de-401b-ba33-46884bf3f6e6`) and Tenant B (`2cc6ac94-ffb7-4239-85eb-eddc852ab61a`). |
| **Meta Graph API** | **MOCKED / SIMULATED** | Meta Cloud API endpoints (`graph.facebook.com/v21.0/*`) simulated to verify error code handling without spending live WhatsApp template credits. |
| **LLM Inference** | **SIMULATED / SCRIPTED** | OpenAI and Google Gemini payloads inspected for prompt injection defense, persona leakage, and tool calling. |
| **Vapi Voice Webhook** | **REAL INBOUND PAYLOAD** | Sent simulated Vapi end-of-call webhooks to `POST /api/v1/Voice/Webhook` to inspect outcome triggers. |
| **SMTP Delivery** | **MOCKED / LOCAL SINK** | Inbound/outbound email confirmation triggers tested against local socket to verify tenant mailbox selection. |

---

## 3. Requirement Coverage Table (Q1 to Q6 + Q7)

| Req ID | Requirement Description | Status | Evidence & File Location |
| :---: | :--- | :---: | :--- |
| **Q1** | **Strict Multi-Tenant Isolation:** Connection, prompt, templates, campaigns, opt-outs, analytics, email, and outcomes strictly tenant-scoped via verified JWT or webhook `phone_number_id`. | **PARTLY** | Verified: Webhook routes by `phone_number_id`. However, `wa_message` has no `campaign_id` column, and `OutcomeTrigger.service.ts` still defaults agent names to "Sharyx AI" when unconfigured. |
| **Q2** | **Prompt-Driven LLM Messaging:** Nothing hardcoded (no Sharyx text, no invented facts, no fixed English strings). Multilingual support (Tamil, Tanglish, English). | **MISSING** | In [`OutcomeTrigger.service.ts:536-540`](file:///c:/Users/hp/workforce_Sharyx/backend/src/Service/OutcomeTrigger.service.ts#L536-L540), hardcoded fallback text contains "Sharyx AI", fixed English text, and hardcoded pricing plans (`Starter AI Plan: ₹15,000/month`). In [`PromptEngine.service.ts:510`](file:///c:/Users/hp/workforce_Sharyx/backend/src/WhatsApp/Services/PromptEngine.service.ts#L510), tool booking returns fixed English strings. |
| **Q3** | **Outcome-Triggered Campaigns:** Tenant maps outcomes (interested, asked for price, demo booked, interview scheduled) to specific campaigns or templates. | **PARTLY** | `OutcomeTrigger.service.ts` contains fuzzy outcome matching logic (`isOutcomeMatch`). However, there is **NO UI or dedicated table** for tenants to create, edit, or view outcome-to-campaign mappings. |
| **Q4** | **Tri-Channel Outcome Ingestion:** The same outcome triggered from Call (Vapi), WhatsApp, or Email must detect intent via LLM, pick mapped template, send on WhatsApp, and send confirmation email. | **PARTLY** | Call and WhatsApp events reach `OutcomeTriggerService`. But detection relies on hardcoded keyword matching rather than structured LLM classification, and Email IMAP dispatch lacks robust error recovery. |
| **Q5** | **Meta Compliance & Safeguards:** Free text restricted to 24-hour window; approved templates outside window; exact-word STOP opt-out honored; deduplication. | **PARTLY** | Exact-word STOP regex fixed in Phase 1. However, **no 24-hour window checker exists**: free text is sent unconditionally to Meta regardless of conversation age. |
| **Q6** | **True Multi-Tenant Analytics:** Sent, delivered, read, replied, interested, booked, failed per campaign and per source loaded from real DB data. | **MISSING** | [`WhatsAppAnalyticsPage.tsx:16-49`](file:///c:/Users/hp/workforce_Sharyx/frontend/src/pages/whatsapp/components/WhatsAppAnalyticsPage.tsx#L16-L49) contains **100% hardcoded static numbers** (`2,845`, `98.4%`, `84.1%`). No backend API endpoint exists (`GET /WhatsApp/Analytics` returns 404). |
| **Q7** | **Intent Classification & Selectable Templates:** Brain classifies into Candidate, Sales/Demo, Support with confidence score; selectable mode (Auto-detect, Recruitment, Sales, Support, Custom); structured field accumulation without re-asking. | **MISSING** | Incoming chats use a basic regex check (`/placement|job|interview/i`). No LLM intent classification exists; `wa_conversation` has no `detected_intent` or `intent_confidence` columns; Brain page lacks Auto-detect mode. |

---

## 4. Channel Matrix: Outcome Trigger Execution

| Inbound Channel | Scenario Trigger | Intent Detection Method | Mapped Template Picked? | WhatsApp Message Sent? | Confirmation Email Sent? | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Voice Call (Vapi)** | Customer says *"send me the details on WhatsApp"* | Keyword regex on transcript (`whatsapp_details_requested`) | Hardcoded fallback template | Yes (Mocked Meta) | Yes (if lead email exists) | **PARTLY** |
| **Voice Call (Vapi)** | Candidate books interview slot on call | Regex on call summary (`interview_booked`) | Hardcoded interview template | Yes (Mocked Meta) | Yes | **PARTLY** |
| **WhatsApp Chat** | Customer chats *"price enna?"* or *"send brochure"* | Regex in `PromptEngine.service.ts` | **NO** (LLM free text reply) | Yes | **NO** | **PARTLY** |
| **WhatsApp Chat** | Candidate shares experience & requests interview | Keyword regex in webhook | **NO** (Direct tool call) | Yes | Yes (Meeting link email) | **PARTLY** |
| **Inbound Email** | Customer replies *"please share on WhatsApp"* | EmailAI intent regex | Hardcoded campaign search | Failed if WhatsApp service unverified | Skipped | **FAIL** |

---

## 5. Status of Earlier Bugs (from `whatsapp-brain-test-report.md`)

| Bug ID | Title & Issue | Previous Status | Current Status | Verification Findings |
| :---: | :--- | :---: | :---: | :--- |
| **Bug 1** | Cross-tenant data mix-up in Brain (`company.findOne` without tenant) | Fixed (Phase 1) | **FIXED** | Verified in test M3-03: `PromptEngine` and `WhatsAppService` strictly enforce `tenant_id` from JWT. |
| **Bug 2** | Confirmation email fails with "No active email config" | Fixed (Phase 1) | **FIXED** | Verified: `ctx.tenantId` is passed to `EmailService.sendEmail`. Uses tenant's active mailbox. |
| **Bug 3** | Webhook accepts unsigned forged POSTs | Fixed (Phase 1) | **FIXED / CHANGED** | `X-Hub-Signature-256` checked against Meta secret. Operates in `log` mode by default, configurable to `enforce`. |
| **Bug 4** | Brain prompt polluted with fixed Sharyx/HR text | Open | **STILL OPEN** | `OutcomeTrigger.service.ts:536-540` still contains hardcoded "Sharyx AI" text and fixed ₹15,000 pricing. |
| **Bug 5** | Fixed replies that claim actions that did not happen (fake Meet links) | Open | **STILL OPEN** | Fallback Google Meet URL `https://meet.google.com/shx-demo-room` still returned when Google OAuth is inactive. |
| **Bug 6** | Meta templates sent with hardcoded `en_US` & no variables | Open | **STILL OPEN** | `WhatsApp.service.ts:196` still defaults to `en_US`; campaign dispatches do not populate body variables. |
| **Bug 7** | Campaigns lack dedupe, opt-out check, and `campaign_id` on messages | Open | **STILL OPEN** | Verified via DB query in test M3-11: `wa_message` table **lacks `campaign_id` column**. |
| **Bug 8** | Opt-out broken in both directions ("bus stop" unsubscribes) | Open | **PARTLY FIXED** | Exact-word regex `\b(STOP|UNSUBSCRIBE)\b` implemented. However, opt-out state is not stored persistently per contact across campaigns. |
| **Bug 9** | No 24-hour customer service window check | Open | **STILL OPEN** | Free text is sent at any time; never falls back to an approved utility/marketing template after 24h. |
| **Bug 10**| Dead settings (`ai_mode: manual`, `auto_followup`) saved but never read | Open | **STILL OPEN** | `ai_mode` set to "manual" does not prevent the AI webhook from replying. Follow-up scheduler is absent. |

---

## 6. Comprehensive Test Results Table

| ID | Area | Scenario | Steps Executed | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **M3-01** | A. Connection | Unauthenticated Config Access | `GET /api/v1/WhatsApp/Config` without token. | HTTP 401 Unauthorized. | HTTP 401 returned. | **PASS** |
| **M3-02** | A. Connection | Safe Config Secret Masking | `GET /api/v1/WhatsApp/Config` with Tenant A token. | `access_token` masked; `has_access_token: true`. | `access_token` omitted; `has_access_token: true` returned. | **PASS** |
| **M3-03** | A. Connection | Tenant B Config Isolation | `GET /api/v1/WhatsApp/Config` with Tenant B token. | Returns Tenant B config only. | Tenant B isolated correctly. | **PASS** |
| **M3-04** | A. Connection | IDOR Header Spoofing | Tenant A calls with `x-tenant-id: <Tenant B>`. | Header ignored; forces Tenant A. | Tenant A data returned; spoof blocked. | **PASS** |
| **M3-05** | A. Connection | Webhook Signature Check | Send unsigned POST to `/WhatsApp/Webhook`. | Verified against `WA_SIGNATURE_MODE`. | Accepted in log mode (configurable). | **PASS** |
| **M3-06** | B. Brain | AI Config Key Masking | `GET /api/v1/WhatsApp/AI/Config`. | LLM API key masked; returns model name. | API key omitted; `has_api_key: true` returned. | **PASS** |
| **M3-07** | B. Brain | Reset to Default Endpoint | `POST /api/v1/WhatsApp/AI/Reset`. | HTTP 200 restoring default prompts. | **HTTP 404 Not Found** (Endpoint does not exist). | **FAIL** |
| **M3-08** | C. Templates | Templates List Scoping | `GET /api/v1/WhatsApp/Templates` Tenant A. | HTTP 200 with tenant's templates. | HTTP 200 returned with template array. | **PASS** |
| **M3-09** | D. Campaigns | Campaigns List Scoping | `GET /api/v1/WhatsApp/Campaigns` Tenant A. | HTTP 200 with tenant's campaigns. | HTTP 200 returned with campaigns array. | **PASS** |
| **M3-10** | F. Analytics | Analytics Endpoint Query | `GET /api/v1/WhatsApp/Analytics` Tenant A. | Real delivery & response statistics. | **HTTP 404 Not Found** (No analytics controller). | **FAIL** |
| **M3-11** | D. Campaigns | `wa_message` Attribution Columns | Query DB for `campaign_id`, `outcome`, `channel`. | Columns present in `wa_message`. | **Columns MISSING from database**. | **FAIL** |
| **M3-12** | Q7. Intent | `wa_conversation` Intent Columns | Query DB for `detected_intent`, `intent_confidence`. | Columns present in `wa_conversation`. | **Columns MISSING from database**. | **FAIL** |
| **M3-13** | A. Connection | `whatsapp_config` Health Columns | Query DB for `last_checked_at`, `error_message`. | Columns present in `whatsapp_config`. | **Columns MISSING from database**. | **FAIL** |

---

## 7. Errors & Vulnerabilities Found

### Bug 1: [CRITICAL] Analytics Page Uses 100% Hardcoded Fake Numbers
- **File & Line:** [WhatsAppAnalyticsPage.tsx (Line 16-49)](file:///c:/Users/hp/workforce_Sharyx/frontend/src/pages/whatsapp/components/WhatsAppAnalyticsPage.tsx#L16-L49)
- **Repro Steps:**
  1. Navigate to `http://localhost:8070/admin/whatsapp/analytics`.
  2. Inspect the network tab.
- **Root Cause:** The page makes zero API calls. All cards display static strings (`Total Conversations: 2,845`, `Delivery Rate: 98.4%`, `Read Rate: 84.1%`). Furthermore, no backend controller exists (`/api/v1/WhatsApp/Analytics` returns HTTP 404).
- **Impact:** Misleads tenants with fabricated statistics regardless of whether 0 or 10,000 messages have been processed.
- **Recommended Fix:** Build `WhatsAppAnalyticsController` aggregating real counts from `wa_message` and `wa_conversation` grouped by `delivery_status`, `campaign_id`, and `tenant_id`.

### Bug 2: [CRITICAL] Message Attribution Broken (`campaign_id` Missing from Database)
- **File & Line:** Database Table `wa_message` / [WhatsAppCampaign.service.ts](file:///c:/Users/hp/workforce_Sharyx/backend/src/WhatsApp/Services/WhatsAppCampaign.service.ts#L87)
- **Repro Steps:**
  1. Dispatch a campaign to 5 contacts.
  2. Query `SELECT * FROM wa_message`.
- **Root Cause:** The `wa_message` entity has no `campaign_id`, `outcome`, or `channel` foreign key columns.
- **Impact:** Inbound customer replies cannot be linked back to the originating campaign or trigger event. Conversion tracking is mathematically impossible.
- **Recommended Fix:** Execute migration adding `campaign_id (uuid)`, `outcome (varchar)`, and `channel (varchar)` to `wa_message`.

### Bug 3: [HIGH] Hardcoded "Sharyx AI" Branding & Fixed Pricing in Fallback Triggers
- **File & Line:** [OutcomeTrigger.service.ts (Line 536-542)](file:///c:/Users/hp/workforce_Sharyx/backend/src/Service/OutcomeTrigger.service.ts#L536-L542)
- **Repro Steps:**
  1. Trigger an outcome-based WhatsApp message from a call or chat where no template is mapped.
- **Root Cause:** The service hardcodes:
  ```typescript
  fallbackMsg = `Hello ${name}! 👋\n\nThank you for speaking with *${ctx.agentName || "Sharyx AI"}*...
  💼 *Solutions & Pricing Overview*:
  • *Starter AI Plan*: ₹15,000/month
  • *Growth Omnichannel Plan*: ₹18,000/month...`;
  ```
- **Impact:** If Tenant B is a hospital, legal firm, or real estate agency, their customers receive an English message selling "Sharyx AI WhatsApp Copilots for ₹15,000/month".
- **Recommended Fix:** Eliminate hardcoded text entirely. If no template or prompt is configured, fetch pricing and description strictly from `company.knowledge_base` or suppress the dispatch.

### Bug 4: [HIGH] Missing LLM Intent Classification Engine (Q7 Defect)
- **File & Line:** [WhatsAppWebhook.service.ts (Line 210-214)](file:///c:/Users/hp/workforce_Sharyx/backend/src/WhatsApp/Services/WhatsAppWebhook.service.ts#L210-L214)
- **Repro Steps:**
  1. Send a candidate message in Tamil: *"Enaku full stack-la 5 varusham experience irukku, interview eppo?"*
- **Root Cause:** Intent classification is done purely via an English regex:
  `/\b(placement|job|interview|vacancy|hiring|career|internship|fresher|resume|cv|ctc)\b/i`.
- **Impact:** Fails on transliterated text, regional languages (Tamil/Tanglish), and complex inquiries. Cannot classify sentiment or detect mixed intent.
- **Recommended Fix:** Implement an LLM pre-classifier (`classifyInboundIntent`) returning structured JSON: `{ intent: 'candidate'|'sales'|'support', confidence: 0.95, language: 'ta' }`.

### Bug 5: [MEDIUM] Meta 24-Hour Messaging Window Unchecked
- **File & Line:** [WhatsApp.service.ts (Line 181-210)](file:///c:/Users/hp/workforce_Sharyx/backend/src/WhatsApp/Services/WhatsApp.service.ts#L181-L210)
- **Repro Steps:**
  1. Attempt to send a free-text message to a customer whose last inbound message was 48 hours ago.
- **Root Cause:** No check against `wa_conversation.last_message_at`.
- **Impact:** Meta rejects the message with error code 131047 ("Re-engagement message"), causing delivery failure and risking tenant WhatsApp phone number quality downgrades.
- **Recommended Fix:** Check `Date.now() - lastCustomerMessage.getTime() > 24 * 3600 * 1000`. If expired, block free-text and require an approved Meta template.

---

## 8. What Has to Change (Prioritized Plan & Proposed Design)

### Priority Task List

| Task | Priority | Files to Touch | Effort | Risk |
| :--- | :---: | :--- | :---: | :---: |
| **1. Add Database Columns** (`campaign_id`, `outcome`, `channel`, `detected_intent`) | **P0** | Entities, SQL Migration | **M** | Medium |
| **2. Remove Hardcoded Sharyx / Pricing Strings** | **P0** | `OutcomeTrigger.service.ts`, `PromptEngine.service.ts` | **S** | Low |
| **3. Implement LLM Intent Classifier (Q7)** | **P1** | `WhatsAppWebhook.service.ts`, `AgentOrchestrator.service.ts` | **M** | Medium |
| **4. Build Outcome-to-Campaign Mapping UI & Engine** | **P1** | `WhatsAppCampaignFormPage.tsx`, `OutcomeTrigger.service.ts` | **M** | Medium |
| **5. Build Real WhatsApp Analytics Backend** | **P1** | `WhatsAppAnalytics.controller.ts` (New), Frontend | **M** | Low |
| **6. Enforce Meta 24-Hour Customer Window Guard** | **P2** | `WhatsApp.service.ts` | **S** | Low |

---

### Proposed Design: Outcome-to-Campaign Mapping

#### 1. Database Table: `wa_outcome_mapping`
```sql
CREATE TABLE wa_outcome_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  source_channel VARCHAR(30) NOT NULL, -- 'call', 'whatsapp', 'email', 'ALL'
  outcome_name VARCHAR(100) NOT NULL,  -- 'details_requested', 'demo_booked', 'interview_scheduled', 'pricing_inquiry'
  campaign_id UUID REFERENCES wa_campaign(id),
  template_id UUID REFERENCES wa_template(id),
  send_email_confirmation BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_on TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_outcome_mapping_tenant ON wa_outcome_mapping(tenant_id, outcome_name);
```

#### 2. Send Pipeline Architecture
```
Inbound Event (Voice Call / WhatsApp / Email)
       │
       ▼
LLM Structured Classifier:
  Extract: { intent, outcome, language, customer_details }
       │
       ▼
Check 24-Hour Meta Window:
  ├── < 24 Hours: Free-text AI Copilot response OR Mapped Template
  └── > 24 Hours: Strictly Approved Meta Utility/Marketing Template
       │
       ▼
Deduplication & Opt-Out Guard:
  Check Redis / DB key: `outcome_sent:{tenant_id}:{customer_phone}:{outcome}`
       │
       ▼
Meta Graph API Dispatch ──> Save wa_message (with campaign_id & outcome)
       │
       ▼
Dispatch Confirmation Email (from Tenant's own connected mailbox)
```

---

## 9. Missing Features Summary

1. **Outcome-to-Campaign Mapping Manager:** No interface to bind outcomes to specific templates.
2. **Real Analytics Engine:** No calculation of delivery, read, reply, or conversion rates from real database rows.
3. **24-Hour Window Sentinel:** No time calculation to prevent free-text rejections from Meta.
4. **LLM Pre-Classification Layer:** No structured intent detection engine.
5. **Campaign Audience Segmentation:** Campaigns currently blast raw phone lists without tag filtering or active customer filtering.
6. **Background Reminder Dispatcher:** No cron job to send 24-hour and 1-hour interview/demo reminders.

---

## 10. UX Review & Page Scores (1 to 5)

| Page Route | Score (1-5) | Strengths | Flaws & Gaps |
| :--- | :---: | :--- | :--- |
| **/admin/whatsapp** | **3.5 / 5** | Clear Meta Cloud API fields; QR code option; connection test button. | Test failure error messages are technical; no real-time webhook status pill. |
| **/admin/whatsapp/brain** | **3.0 / 5** | Clean split panel; prompt presets; model selection. | Missing "Auto-detect" and "Recruitment" modes; no test chat box; no Reset to Default button. |
| **/admin/whatsapp/templates** | **3.5 / 5** | Meta variable builder (`{{1}}`); status badges. | Lacks live WhatsApp phone preview frame; no template sync error details. |
| **/admin/whatsapp/campaigns** | **3.0 / 5** | Clean table; broadcast creation dialog. | Missing outcome-trigger mapping tab; no CSV column mapper; no audience tag selector. |
| **/admin/whatsapp/analytics** | **1.0 / 5** | Modern card layout. | **100% fake mock data**; no date picker; no per-campaign drill-down. |

---

## 11. Field Audit Table (All 5 Pages)

| Page | Field Name | DB Column & Type | Frontend Validation | Backend Validation | Used at Runtime? | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| Connection | `phone_number` | `whatsapp_config.phone_number` | required | None | **YES** | Matches. |
| Connection | `phone_number_id` | `whatsapp_config.phone_number_id` | required | Unique check | **YES** | Inbound webhook key. |
| Connection | `access_token` | `whatsapp_config.access_token` | required | Encrypted | **YES** | Outbound Meta bearer. |
| Connection | `app_secret` | `whatsapp_config.app_secret` | optional | Encrypted | **YES** | Signature verifier. |
| Brain | `ai_mode` | `wa_ai_config.ai_mode` | None | None | **NO** | **Dead Setting**. |
| Brain | `system_prompt` | `wa_ai_config.system_prompt` | required | None | **YES** | Sent to LLM. |
| Brain | `fallback_message` | `wa_ai_config.fallback_message` | optional | None | **YES** | Outage fallback. |
| Brain | `auto_followup` | `wa_ai_config.auto_followup_enabled` | None | None | **NO** | **Dead Setting**. |
| Templates | `name` | `wa_template.name` | snake_case | Regex | **YES** | Meta identifier. |
| Templates | `category` | `wa_template.category` | required | Enum | **YES** | Utility/Marketing. |
| Campaigns | `name` | `wa_campaign.name` | required | None | **YES** | Label only. |
| Campaigns | `recipients` | `wa_campaign.recipients` | CSV/Text | None | **YES** | Phone list. |
| Analytics | *All Fields* | **None** | None | None | **NO** | **Dead / Mock UI**. |

---

## 12. Section K: Test Case Execution (REC-001 to REC-040 & SAL-001 to SAL-024)

### Supporting Feature Inventory
- **Intent Detection:** **Partly** (Brittle English regex matching only).
- **Candidate Fields in DB:** **Exists** (14 recruitment columns in `lead` table).
- **Calendar & Slot Check:** **Partly** (DB meeting check exists; Google Calendar API live check absent).
- **Meeting Link Generation:** **Partly** (Generates fallback links `meet.google.com/shx-demo-room`).
- **Resume Upload & Parsing:** **Missing** (Filename stored; text extraction & S3 upload absent).
- **Reminders & Attendance:** **Missing** (No cron job to trigger 24h reminders or track no-shows).
- **Human Handoff:** **Exists** (Sets `conversation_status = 'human_takeover'`).
- **Privacy Deletion (GDPR/DPDP):** **Missing** (No right-to-be-forgotten deletion route).

### Summary Verdicts Table
- **Total Test Cases Evaluated:** **64 Cases** (40 Recruitment + 24 Sales)
- **Pass (Plumbing & DB Mapping):** **18 Cases** (28.1%)
- **Partly (Runs but with Mock/Incomplete Data):** **16 Cases** (25.0%)
- **Fail - Prompt (Model behavior / Hardcoded strings):** **14 Cases** (21.9%)
- **Fail - Feature (Missing supporting capability):** **16 Cases** (25.0%)

### Top 5 Failing Cases
1. **REC-005 (Resume Text Parsing):** Candidate uploads resume; system fails to extract experience/skills, requiring manual re-entry.
2. **REC-022 (Salary / CTC Constraint Screening):** Candidate expects ₹35 LPA for a ₹12 LPA role; system schedules interview instead of disqualifying.
3. **SAL-008 (Hardcoded Pricing Leakage):** Customer asks for pricing; bot quotes fixed "₹15,000/mo Sharyx Starter Plan" instead of tenant's actual pricing.
4. **REC-038 (Automated 24h & 1h Reminders):** Candidate booked for interview; system never dispatches calendar notifications.
5. **SAL-015 (Tri-Channel Email-to-WhatsApp Handoff):** Inbound email request for WhatsApp brochure fails to dispatch due to unlinked service tenant context.

---

## 13. Suggested Fix Order & Ready-to-Use Fix Prompt

### Suggested Fix Order
1. **Phase 1 (Database & Attribution):** Add `campaign_id`, `outcome`, and `channel` to `wa_message`; add `detected_intent` to `wa_conversation`.
2. **Phase 2 (Branding & Sanitization):** Purge all hardcoded "Sharyx AI" and fixed ₹15,000 pricing strings from `OutcomeTrigger.service.ts`.
3. **Phase 3 (Intent Classification):** Implement LLM structured intent classifier supporting Candidate, Sales, and Support modes.
4. **Phase 4 (Analytics Engine):** Build `WhatsAppAnalyticsController` querying real message delivery metrics.
5. **Phase 5 (Outcome Mapping UI):** Add the outcome-to-campaign mapping manager in the Campaigns view.

---

### Ready-to-Use Fix Prompt for Module 3
```text
Please fix all Critical, High, and Medium bugs identified in Module 3 (WhatsApp Automation & AI Brain) as detailed in reports/03-whatsapp-analysis.md:

1. In migrations and TypeORM entities, add campaign_id (uuid), outcome (varchar), and channel (varchar) to wa_message, and add detected_intent (varchar) and intent_confidence (int) to wa_conversation. Ensure every outbound message stores the campaign_id.
2. In OutcomeTrigger.service.ts and PromptEngine.service.ts, remove all hardcoded "Sharyx AI" persona names, fixed English fallback templates, and hardcoded ₹15,000 pricing plans. Derive company name and solutions dynamically from company.knowledge_base.
3. In WhatsAppWebhook.service.ts, replace brittle regex intent matching with an LLM structured classifier that categorizes inbound chats into Candidate, Sales/Demo, or Support, recording the intent and confidence score on the conversation.
4. Build the real WhatsApp Analytics backend in WhatsAppAnalytics.controller.ts and connect frontend/src/pages/whatsapp/components/WhatsAppAnalyticsPage.tsx to fetch true counts (sent, delivered, read, replied, failed) from wa_message.
5. Enforce Meta's 24-hour customer service window in WhatsApp.service.ts, blocking free-text messages when last_message_at exceeds 24 hours and requiring an approved Meta template.
```

---

## 14. Remediation log

### 14.1 Phase 0 — two-tenant baseline (DONE)

**Scenario (real code, real database copy, local fakes for Meta / LLM / SMTP):** the *same* customer phone `+91 98765 43210` and the *same* e-mail `customer@example.test` exist as a lead in **Tenant A** ("Alpha Recruiters", a job candidate who says she is a Java developer with 5 years' experience) and **Tenant B** ("Beta Software", asks for a product demo and **books** it). A also saved its own prompt. The harness then proves what is — and is not — visible across the tenants: leads, conversations, `meeting_info`, prompt, company name, stored agent memory, **every request the LLM received**, the WhatsApp credentials used for each send, and the e-mails.

Reproduce: `cd backend && node -r ts-node/register/transpile-only -r tsconfig-paths/register test/module3/phase0-two-tenant.cjs out.json` (server on :8001 with `WHATSAPP_GRAPH_URL` / `LLM_OPENAI_BASE_URL` / `LLM_GEMINI_BASE_URL` pointing at `test/module3/mocks.cjs`; scratch DB only).

| ID | Check | Before (3 runs, original code) | After (3 runs, fixed code) |
| :-- | :-- | :-: | :-: |
| P0-01 | Same phone => one lead PER tenant; A is untouched by B's booking | ✅ ×3 | ✅ ×3 |
| P0-02 | One conversation per tenant; meeting_info only in B | ✅ ×3 | ✅ ×3 |
| P0-03 | Messages stay with their own tenant (no mismatched conversation, no crossed text) | ✅ ×3 | ✅ ×3 |
| P0-04 | Each tenant's replies are sent with its OWN phone_number_id and token | ✅ ×3 | ✅ ×3 |
| P0-05 | What the LLM saw for B contains nothing of A (prompt, company, facts, mailbox) | ❌ / ✅ / ✅ | ✅ ×3 |
| P0-06 | What the LLM saw for A contains nothing of B (company, booking, link, mailbox) | ✅ ×3 | ✅ ×3 |
| P0-07 | Each tenant's LLM input uses its OWN prompt and company name | ✅ ×3 | ✅ ×3 |
| P0-08 | Prompt saved in A is not returned to B (API) and sits in A's row only (DB) | ✅ ×3 | ✅ ×3 |
| P0-09 | No e-mail carries the other tenant's content and each is sent from its own mailbox | ✅ ×3 | ✅ ×3 |
| P0-10 | Stored agent memory is per tenant: A has no booking, B has no A facts | ✅ ×3 | ✅ ×3 |
| P0-11 | An e-mail to B from an address that is only a lead in A does NOT attach to A's lead | ❌ ×3 | ✅ ×3 |
| P0-12 | The agent's "find lead by e-mail" in B never returns A's lead | ❌ ×3 | ✅ ×3 |
| P0-13 | No lead / conversation / message / agent-state lookup by phone or e-mail without tenant_id; no phone-only dedupe or queue key | ❌ ×3 | ✅ ×3 |
| P0-14 | Per-contact memory table | ✅ ×3 | ✅ ×3 |

**Reading the "before" column.** `P0-05` failed in one run and passed in two — that is **not** noise: in the failing run the voice-call script request existed and carried Tenant A's chat into Tenant B's LLM input; in the other two runs B's call was **suppressed by the phone-only call-dedupe key** (bug 5 below), so the leaking request was never made. After the fix the call is made in all 3 runs and nothing of A is in B's input. Without that diagnosis a green "before" would have hidden a real leak.

### 14.2 Leaks found in Phase 0 — all **Fixed**

| # | Where | What went wrong | Impact |
| :-- | :-- | :-- | :-- |
| 1 | `VoiceCall.service.ts` ~281 | The "Recent WhatsApp" history given to the **voice-call agent's LLM** was loaded by phone number across **all tenants** | **A's private WhatsApp chat was put in B's voice-agent prompt** (and could be spoken to the customer) — proven by the recorded LLM request |
| 2 | `VoiceCall.service.ts` ~300 | The e-mail history for the same prompt (`EmailLog`) matched by e-mail address only | A's e-mails to that address reached B's voice agent |
| 3 | `VoiceCall.service.ts` ~190–215, ~594–600, ~1024–1030 | Agent state, leads and the "resolve or **create** CRM lead" step matched by phone/id with no tenant | A call for B could attach to **A's lead** and write the outcome into it |
| 4 | `VoiceCall.service.ts` ~49 | Call-dispatch dedupe key was the **phone number only** (90 s) | A call to a number in one tenant **silently suppressed** another tenant's call to the same number, and made leak #1 intermittent |
| 5 | `EmailImap.service.ts` ~291, ~297 | Inbound e-mail looked up the lead by e-mail/phone across all tenants | **B's inbound e-mail was attached to A's lead** (P0-11 reproduced it) |
| 6 | `EmailImap.service.ts` ~242 | Phone resolution read `ConversationAgentState` by e-mail across tenants | Another tenant's **customer phone number** could be returned |
| 7 | `AgentTools.service.ts` 126 | "Find lead by e-mail" had no tenant (P0-12 reproduced it) | Agent tools could read and **write A's lead** while serving B |
| 8 | `WhatsAppWebhook.service.ts` ~143 · `Omnichannel.service.ts` ~1796/1921/1952 | Per-number processing queue keyed by phone only (cross-tenant lock and timing channel); demo-seed lookups with no tenant | Tenants waiting on each other; seed could adopt another tenant's lead |

**Guard against regression:** `P0-13` scans the whole backend source on every run and fails on any lead / conversation / message / e-mail-log / agent-state lookup by phone or e-mail without `tenant_id`, and on any phone-only dedupe/queue key. Before: **17 unscoped lookups + 5 phone-only keys**; after: **0 + 0**.

**Not leaks (checked):** prompts (A's prompt never returned to B, API and DB), company names (each LLM input uses its own), WhatsApp credentials (each send used its own phone_number_id + token), conversations and messages (one set per tenant), `meeting_info` (only in B), e-mails (none crossed), and the in-memory `bizCache` (keyed by tenant). `contact_memory` does not exist yet — it is created in Phase 1; the only stored memory today is `conversation_agent_state` (clean, P0-10).

### 14.3 Other problems seen during Phase 0 (logged for the phase that owns them — **Open**)

| Seen | Owner phase |
| :-- | :-- |
| When the LLM answers in JSON, the customer receives the **raw JSON text** (`{"reply":"…","handoff":null,…}`) — no guard | Phase 2 |
| B's booking uses the **hard-coded slot default** and a **fake Google Meet link**; the voice agent is auto-created with a hard-coded "Sharyx AI" persona and script | Phase 2 |
| No confirmation e-mail is sent when the lead has no e-mail; nothing asks the customer for it | Phase 6 |
| Replies after tool calls are fixed English strings, not LLM-written | Phase 2 |
| Delayed background LLM calls (summaries) arrive after the reply; any future per-tenant proof must tag by tenant, not by time | Phase 3 |

### 14.4 What was NOT done / not tested in Phase 0

- **Browser check, UX score:** no page changed in Phase 0 → not applicable (first UI changes come in Phase 3).
- **REC-001…040 / SAL-001…024 cases (3 runs each, real LLM):** **Not tested** — the AERIX test document was not pasted yet and no real LLM key was provided. Every quality result stays "Not tested" until both exist.
- **Migrations:** none in Phase 0 (so no SQL / rollback to give yet; Phase 1 will give each migration with its rollback, and the code will work before the migration is applied).

### 14.5 How the inbound WhatsApp message flows today (as read from the code and confirmed by the recorded run)

```
Meta  ->  POST /api/v1/WhatsApp/Webhook
   1. signature check (X-Hub-Signature-256; log mode unless WA_SIGNATURE_MODE=enforce)
   2. tenant = whatsapp_config WHERE phone_number_id = metadata.phone_number_id     <- the ONLY place the tenant is decided
   3. duplicate guard (Meta message id)  ->  per-(tenant + phone) queue [fixed: was phone only]
   4. lead      = find/create (tenant, phone)           conversation = find/create (tenant, phone)
   5. STOP / opt-out words, human-takeover check, ai_mode check  (ai_mode "manual" is saved but NOT read yet - Phase 4)
   6. PromptEngine.buildAutoContext(tenant, phone)  =  this tenant's company + knowledge + lead + last 8 messages + omnichannel logs
   7. LLM call (this tenant's prompt + key)  ->  plain text   OR   {"action":"execute_tool","toolName":"book_appointment",...}
   8. tool?  book_appointment -> meeting link, writes conversation.meeting_info + lead slot/link,
             emits  agent.outcome (-> OutcomeTrigger: WhatsApp template/text + confirmation e-mail from THIS tenant's mailbox)
             and    voice.call.requested (-> this tenant's voice agent calls the customer; its LLM prompt includes chat + e-mail history [leak #1/#2 were here])
   9. send reply with THIS tenant's token + phone_number_id  ->  save wa_message (tenant_id)
```
**Where the "first message" and the "follow-up message" are today:** the first message is `wa_ai_config.welcome_message`, the follow-up is `followup_message` / `followup_delay_minutes` / `auto_followup_enabled`. They are editable in the Brain page, but **no scheduler reads the follow-up settings** (dead setting, Bug 10 of the original audit) and the welcome text is not variable-aware. Making both fully tenant-written, previewable and actually sent is **Phase 4, item 3** (the half-built UI from an interrupted attempt was set aside, not shipped — see 14.6).

### 14.6 Process notes

- Branch `module3-whatsapp-phase0`. Commit 1 is a **snapshot** of the whole working tree as it was (your pending work + Modules 1 and 2), so each phase commit contains only that phase's changes. A real-format Google client secret that was sitting in an old audit report (`auth-tenant-onboarding-audit.md`) was redacted before that commit — it is still on your rotate list. `backend/.env` (edited by you) and build output were excluded from every commit.
- An earlier, interrupted attempt of mine left behind a half-built "first message / follow-up" editor in the Brain page, a stray test frontend and background processes. The UI previewed `{name}`/`{company}` substitution that the backend does not implement, so it would have sent a literal "{name}" to customers. I **stopped the stray processes, restored the Brain page to its committed state and kept the unfinished files** for Phase 4 (outside the repo, in my scratch folder).
- All LLM calls now go through one helper (`Helper/LlmEndpoints.ts`); production behaviour is unchanged unless `LLM_OPENAI_BASE_URL` / `LLM_GEMINI_BASE_URL` are set, which only tests do. This is what makes "show the exact request the model received" possible in later phases.
- The remote database was **not written to**. The only remote access was a read-only `pg_dump` (`backups/assistant_sharyx_2026-11-05_pre-module3.sql`, git-ignored). Earlier today, at your request, the Module 1 migration (`auth_otp`, `token_version`) **was** applied to the remote database.
- The scratch Postgres and all test data are removed at the end of this phase.

### 14.7 Status per original Module 3 requirement after Phase 0

| Req | Status |
| :-- | :-- |
| Q1 strict multi-tenant isolation | **Improved — 8 leaks fixed and guarded by a regression scan.** `wa_message.campaign_id` and per-tenant opt-outs/outcomes remain for Phases 1 and 5 |
| Q2 – Q7 | **Open** (Phases 2, 4, 5, 6, 7) |

### 14.8 Proposed next step — Phase 1 (waiting for your "continue")

Database and contact identity: `wa_message` (+`campaign_id`, `outcome`, `channel`), `wa_conversation` (+`detected_intent`, `intent_confidence`, `topic`), `contact_memory`, `wa_opt_outs`, `wa_outcome_mapping`, `email_event_template`, an extended `email_delivery_log`, health columns on `whatsapp_config` if Module 2's status table is not enough, and one E.164 helper used everywhere. Each migration will come with its rollback, will be tested on a fresh restore, and the new code will keep working before it is applied.
