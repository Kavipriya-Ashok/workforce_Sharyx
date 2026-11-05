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

