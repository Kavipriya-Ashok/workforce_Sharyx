# SHARYX — Existing Database & Omnichannel Architecture Analysis
**Document ID:** `docs/omnichannel/01-existing-database-analysis.md`  
**Generated Date:** November 4, 2026  
**Status:** Complete Architectural Inspection (Read-Only Ground Truth)  
**Database:** PostgreSQL (`assistant_sharyx` on `158.220.99.156:5432`)

---

## 1. Executive Summary & Verification Methodology

A direct inspection of the live PostgreSQL database (`assistant_sharyx`), TypeORM entity schemas, NestJS backend controllers/services, and React frontend components was executed. 

### Key Findings
1. **Total Database Tables:** 44 tables exist in the `public` schema.
2. **Real Historical Communications Exist:**
   - **WhatsApp:** `wa_message` contains **1,461 real messages** across **32 conversations** (`wa_conversation`).
   - **Email:** `email_log` contains **62 actual emails** (inbound & outbound).
   - **Voice AI Calls:** `voice_call_log` contains **53 call recordings and transcripts** with Vapi telephony.
   - **Normalized Communications Table:** `communications` contains **1,468 indexed entries** linked to `lead.id`.
   - **Omnichannel Unified Events:** `omnichannel_event` contains **51 multi-channel events** (Calls, WhatsApp, Meetings, Emails, Interviews).
   - **Leads & Contacts:** `lead` contains **86 leads/candidates**.
   - **Converted Customers:** `customer` contains **8 converted accounts**.
   - **Identity Mapping:** `customer_identity_mapping` contains **13 verified phone/email mappings**.

---

## 2. Table-by-Table Schema Inspection (Actual Database Ground Truth)

### A. Core Entity: `lead`
- **TypeORM Entity:** `backend/src/Database/Table/Lead/lead.ts`
- **Table Name:** `lead`
- **Row Count:** 86 rows
- **Primary Key:** `id` (`uuid`, default `uuid_generate_v4()`)
- **Key Columns & Types:**
  | Column Name | Data Type | Nullable | Description / Business Purpose |
  |---|---|---|---|
  | `id` | `uuid` | NO | Primary Key |
  | `name` | `varchar` | YES | Full lead name |
  | `first_name` | `varchar` | YES | First name |
  | `last_name` | `varchar` | YES | Last name |
  | `email` | `varchar` | YES | Contact email address |
  | `phone` | `varchar` | YES | Contact phone number |
  | `company_name` | `varchar` | YES | Organization |
  | `job_title` | `varchar` | YES | Candidate or client job title |
  | `lead_status` | `varchar` | NO | Lead status (`NEW`, `QUALIFIED`, `CONTACTED`, `INTERVIEW_SCHEDULED`, etc.) |
  | `score` | `integer` | NO | Lead engagement score (0–100) |
  | `deal_value` | `numeric` | NO | Pipeline deal value |
  | `assigned_to_id` | `uuid` | YES | Assigned sales/recruitment agent |
  | `tenant_id` | `varchar` | NO | Multi-tenant isolation ID (`default`) |
  | `last_contacted_at` | `timestamptz` | YES | Timestamp of last engagement |
  | `is_candidate` | `boolean` | NO | Distinguishes HR candidate from Sales lead |
  | `candidate_stage` | `varchar` | YES | Stage (`screening`, `interview_scheduled`, `offered`, etc.) |
  | `interview_date` | `timestamptz` | YES | **Scheduled interview date/time** |
  | `interview_link` | `text` | YES | **Google Meet / Zoom interview link** |
  | `preferred_interview_slot` | `varchar` | YES | Candidate preferred slot |
  | `resume_url` | `text` | YES | Candidate CV document link |
  | `notes` | `text` | YES | Internal team remarks |
  | `tags` | `json` | YES | Category tags |
  | `created_on` | `timestamp` | YES | Creation timestamp |

---

### B. Core Entity: `customer`
- **TypeORM Entity:** `backend/src/Database/Table/Customer/customer.ts`
- **Table Name:** `customer`
- **Row Count:** 8 rows
- **Primary Key:** `id` (`uuid`, default `uuid_generate_v4()`)
- **Key Columns & Types:**
  | Column Name | Data Type | Nullable | Description / Business Purpose |
  |---|---|---|---|
  | `id` | `uuid` | NO | Primary Key |
  | `name` | `varchar` | NO | Customer organization or individual name |
  | `email` | `varchar` | YES | Primary verified email |
  | `phone` | `varchar` | YES | Primary verified phone |
  | `company_name` | `varchar` | YES | Company |
  | `customer_status` | `varchar` | NO | `ACTIVE`, `CHURNED`, `PENDING` |
  | `tier` | `varchar` | NO | Tier (`Free`, `Growth`, `Enterprise`, `Pro Plan`) |
  | `total_spend` | `numeric` | NO | Cumulative revenue |
  | `converted_from_lead_id` | `uuid` | YES | **Foreign Key to `lead.id`** (Tracks conversion) |
  | `conversion_date` | `timestamptz` | YES | Timestamp when lead became customer |
  | `tenant_id` | `varchar` | NO | Tenant isolation identifier |

---

### C. Identity Mapping: `customer_identity_mapping`
- **TypeORM Entity:** `backend/src/Database/Table/Omnichannel/CustomerIdentityMapping.entity.ts`
- **Table Name:** `customer_identity_mapping`
- **Row Count:** 13 rows
- **Primary Key:** `id` (`uuid`)
- **Key Columns & Types:**
  | Column Name | Data Type | Nullable | Description |
  |---|---|---|---|
  | `id` | `uuid` | NO | Primary Key |
  | `customer_id` | `uuid` | NO | **Foreign Key to `customer.id`** |
  | `identity_type` | `varchar` | NO | `'phone'` or `'email'` |
  | `identity_value` | `varchar` | NO | Normalized E.164 phone or lowercase email |
  | `raw_value` | `varchar` | YES | Original user input format |
  | `country_code` | `varchar` | YES | ISO country code (`IN`, `US`, etc.) |
  | `is_primary` | `boolean` | NO | Is primary contact point |
  | `is_verified` | `boolean` | NO | Verified identity flag |
  | `source` | `varchar` | YES | `'customer_table'`, `'lead_table'`, `'whatsapp'`, etc. |
  | `tenant_id` | `varchar` | NO | Multi-tenant isolation |

---

### D. WhatsApp Channel: `wa_conversation` & `wa_message`
- **TypeORM Entities:**
  - `backend/src/Database/Table/WhatsApp/WhatsAppConversation.entity.ts`
  - `backend/src/Database/Table/WhatsApp/WhatsAppMessage.entity.ts`
- **Row Counts:**
  - `wa_conversation`: 32 rows
  - `wa_message`: 1,461 rows
- **`wa_conversation` Columns:**
  | Column Name | Data Type | Nullable | Description |
  |---|---|---|---|
  | `id` | `uuid` | NO | Primary Key |
  | `tenant_id` | `varchar` | NO | Tenant ID |
  | `customer_phone` | `varchar` | NO | Client WhatsApp number (`918015779116`) |
  | `customer_name` | `varchar` | YES | WhatsApp profile display name |
  | `lead_id` | `uuid` | YES | Explicit link to `lead.id` (can be null for organic chats) |
  | `unread_count` | `integer` | NO | Unread badge counter |
  | `last_message_text`| `text` | YES | Snippet of last message |
  | `last_message_at` | `timestamptz` | NO | Timestamp of last interaction |
  | `meeting_info` | `jsonb` | YES | **Demo Meeting Booking Data** (`slot`, `meet_url`, `scheduled_at`) |
- **`wa_message` Columns:**
  | Column Name | Data Type | Nullable | Description |
  |---|---|---|---|
  | `id` | `uuid` | NO | Primary Key |
  | `conversation_id`| `uuid` | YES | **FK to `wa_conversation.id`** |
  | `sender_phone` | `varchar` | NO | Sender number |
  | `recipient_phone`| `varchar` | NO | Recipient number |
  | `direction` | `varchar` | NO | `'inbound'` or `'outbound'` |
  | `message_type` | `varchar` | NO | `'text'`, `'template'`, `'image'`, `'document'`, `'audio'` |
  | `message_text` | `text` | YES | Complete dialogue body |
  | `meta_message_id`| `varchar` | YES | Meta Cloud API message ID (`wamid.HBgM...`) |
  | `delivery_status`| `varchar` | NO | `'sent'`, `'delivered'`, `'read'`, `'failed'` |
  | `is_ai_generated`| `boolean` | NO | Autonomous agent flag |
  | `created_on` | `timestamp` | YES | Event occurrence timestamp |

---

### E. Email Channel: `email_log`
- **TypeORM Entity:** `backend/src/Database/Table/Email/EmailLog.entity.ts`
- **Table Name:** `email_log`
- **Row Count:** 62 rows
- **Primary Key:** `id` (`uuid`)
- **Key Columns & Types:**
  | Column Name | Data Type | Nullable | Description |
  |---|---|---|---|
  | `id` | `uuid` | NO | Primary Key |
  | `tenant_id` | `varchar` | NO | Tenant ID |
  | `lead_id` | `uuid` | YES | Link to `lead.id` (sometimes null for incoming emails) |
  | `from_email` | `varchar` | NO | Sender email |
  | `to_email` | `varchar` | NO | Recipient email |
  | `subject` | `text` | YES | Subject line |
  | `body_text` | `text` | YES | Plain-text content |
  | `body_html` | `text` | YES | Rendered HTML email body |
  | `direction` | `varchar` | NO | `'inbound'` or `'outbound'` |
  | `delivery_status`| `varchar` | NO | `'sent'`, `'delivered'`, `'opened'`, `'failed'` |
  | `is_ai_drafted` | `boolean` | NO | AI generation flag |
  | `message_id` | `varchar` | YES | RFC 2822 / Gmail Message ID for threading |
  | `created_on` | `timestamp` | YES | Original email timestamp |

---

### F. Voice AI Telephony: `voice_call_log`
- **TypeORM Entity:** `backend/src/Database/Table/Voice/VoiceCallLog.entity.ts`
- **Table Name:** `voice_call_log`
- **Row Count:** 53 rows
- **Primary Key:** `id` (`uuid`)
- **Key Columns & Types:**
  | Column Name | Data Type | Nullable | Description |
  |---|---|---|---|
  | `id` | `uuid` | NO | Primary Key |
  | `tenant_id` | `varchar` | NO | Tenant ID |
  | `lead_id` | `uuid` | YES | Link to `lead.id` |
  | `agent_id` | `uuid` | YES | Associated AI voice agent |
  | `agent_name` | `varchar` | YES | Agent title (e.g. `Kaviya HR Specialist`) |
  | `provider` | `varchar` | NO | Provider (`'vapi'`, `'twilio'`) |
  | `provider_call_id` | `varchar` | YES | External provider call ID |
  | `customer_phone` | `varchar` | NO | Contact telephone number |
  | `customer_name` | `varchar` | YES | Caller name |
  | `direction` | `varchar` | NO | `'inbound'` or `'outbound'` |
  | `call_status` | `varchar` | NO | `'completed'`, `'no-answer'`, `'failed'` |
  | `duration_seconds` | `integer` | NO | Total duration in seconds |
  | `transcript` | `text` | YES | **Complete Speech-to-Text transcript** |
  | `recording_url` | `text` | YES | **Playable audio recording URL (MP3/WAV)** |
  | `summary` | `text` | YES | AI-generated executive call summary |
  | `call_outcome` | `varchar` | YES | Outcome (`'qualified'`, `'followup_needed'`, `'callback'`) |
  | `extracted_slots` | `jsonb` | YES | Extracted entities (dates, budget, requirements) |
  | `created_on` | `timestamp` | YES | Call timestamp |

---

### G. Normalized Communication Layer: `communications`
- **TypeORM Entity:** `backend/src/Database/Table/Omnichannel/OmnichannelCommunication.entity.ts`
- **Table Name:** `communications`
- **Row Count:** 1,468 rows
- **Primary Key:** `id` (`uuid`)
- **Key Columns & Types:**
  | Column Name | Data Type | Nullable | Description |
  |---|---|---|---|
  | `id` | `uuid` | NO | Primary Key |
  | `lead_id` | `uuid` | NO | **Foreign Key to `lead.id`** |
  | `channel` | `varchar` | NO | `'whatsapp'`, `'email'`, `'call'`, `'meeting'`, `'interview'` |
  | `direction` | `varchar` | NO | `'inbound'` or `'outbound'` |
  | `description` | `text` | NO | Event summary or message excerpt |
  | `content` | `jsonb` | NO | Complete payload (`body`, `thread_replies`, `transcript`, etc.) |
  | `duration` | `integer` | YES | Duration in seconds (for calls/meetings) |
  | `recording_url` | `text` | YES | Recording media URL |
  | `occurred_at` | `timestamptz` | NO | **Exact event occurrence timestamp** |
  | `status` | `varchar` | NO | `'read'`, `'delivered'`, `'sent'`, `'completed'` |

---

### H. Universal Customer Event Stream: `omnichannel_event`
- **TypeORM Entity:** `backend/src/Database/Table/Omnichannel/OmnichannelEvent.entity.ts`
- **Table Name:** `omnichannel_event`
- **Row Count:** 51 rows
- **Primary Key:** `id` (`uuid`)
- **Key Columns & Types:**
  | Column Name | Data Type | Nullable | Description |
  |---|---|---|---|
  | `id` | `uuid` | NO | Primary Key |
  | `customer_id` | `uuid` | NO | **Foreign Key to `customer.id`** |
  | `event_type` | `varchar` | NO | `'WHATSAPP'`, `'EMAIL'`, `'CALL'`, `'MEETING'`, `'INTERVIEW'` |
  | `direction` | `varchar` | NO | `'inbound'` or `'outbound'` |
  | `source_module` | `varchar` | NO | `'whatsapp_service'`, `'email_service'`, `'voice_service'`, etc. |
  | `source_record_id` | `varchar` | NO | Unique ID from source table (prevents duplication) |
  | `event_timestamp` | `timestamptz` | NO | **Actual event occurrence timestamp** |
  | `title` | `varchar` | NO | Event title |
  | `description` | `text` | YES | Full content / dialogue |
  | `summary` | `text` | YES | AI event summary |
  | `metadata` | `jsonb` | YES | Rich context (`meet_url`, `stage`, `feedback`, `score`) |

---

## 3. Where Historical Meetings & Interviews Are Located

A common question is whether separate `meeting` and `interview` tables exist:
1. **Meetings:** 
   - Not in an isolated table.
   - Demo bookings made over WhatsApp are stored directly in `wa_conversation.meeting_info` (`slot`, `meet_url`, `scheduled_at`).
   - Logged meeting events are stored in `omnichannel_event` where `event_type = 'MEETING'` (with Google Meet URLs and notes).
2. **Interviews:**
   - The recruitment/interview pipeline is embedded directly in the `lead` entity:
     - `candidate_stage`: `'screening'`, `'interview_scheduled'`, `'technical_round'`, `'offered'`
     - `interview_date`: Timestamp of scheduled interview
     - `interview_link`: Google Meet URL (`https://meet.google.com/rm5-iyw5-q94`)
     - `preferred_interview_slot`: Candidate choice
     - `job_title` / `resume_url`: Candidate profile
   - Interview interactions are also tracked in `omnichannel_event` where `event_type = 'INTERVIEW'`.

---

## 4. Missing Relationships & Technical Limitations Identified

| Limitation | Root Cause | Architectural Solution |
|---|---|---|
| **Orphaned Source Records** | In `wa_message`, records reference `conversation_id`, which may have `lead_id = NULL`. In `email_log` and `voice_call_log`, `lead_id` is frequently null because external webhooks only supply `from_email` or `customer_phone`. | **Phone/Email Identity Linking Layer**: Query by verified phone E.164 and normalized email. When looking up a Lead or Customer, match records where phone matches or email matches. |
| **Phone Format Inconsistencies** | In `lead`, phones exist as `+918015779116`, `918015779116`, or `8015779116`. | **Country-Aware Normalization (libphonenumber-js)**: Standardize all phone numbers to E.164. Match via `customer_identity_mapping` table rather than raw unindexed regex. |
| **Duplicate Lead Entities** | A person (e.g. Kavi) can have multiple rows in `lead` (`a7b3d7fa-...`, `374c8108-...`) created at different points. | **Primary Identity Canonicalization**: The identity resolution engine merges interactions across duplicate records belonging to the same verified contact. |
| **Data Split Between `lead` and `customer`** | Some tables (`communications`) link to `lead_id`. Others (`omnichannel_event`, `customer_identity_mapping`) link to `customer_id`. | **Lead $\leftrightarrow$ Customer Cross-Resolution**: If a Lead has converted to a Customer (`customer.converted_from_lead_id = lead.id`), union both timelines under one profile. |

---

## 5. Existing Backend APIs & Modules

### Omnichannel Endpoints:
- `GET /api/omnichannel/leads` — Returns paginated directory of leads with real-time last activity, channel badges, and interaction counts.
- `GET /api/omnichannel/leads/:id` — Returns single lead summary.
- `GET /api/omnichannel/leads/:id/timeline` — Returns combined, deduplicated chronological timeline across all 5 channels.
- `GET /api/omnichannel/leads/:id/statistics` — Returns exact counts: Total, WhatsApp, Email, Calls, Meetings, Interviews.
- `GET /api/omnichannel/leads/:id/intelligence` — Returns AI journey summary, conversation conclusions, intent, and next best actions.
- `POST /api/omnichannel/sync` — Synchronizes unlinked source records into timeline cache.
- `GET /api/omnichannel/stream` — Server-Sent Events (SSE) live updates.

### Channel Webhooks:
- `POST /api/omnichannel/webhooks/whatsapp` — Incoming Meta WhatsApp webhook handler.
- `POST /api/omnichannel/webhooks/email` — Incoming Email delivery and reply handler.
- `POST /api/omnichannel/webhooks/call` — Incoming Vapi/Twilio voice call completion handler.

---

## 6. Recommended Lead-Centric Omnichannel 360° Architecture

```
                                  ┌────────────────────────┐
                                  │   INCOMING WEBHOOKS    │
                                  │ WhatsApp / Email / Call│
                                  └───────────┬────────────┘
                                              │
                                              ▼
                           ┌─────────────────────────────────────┐
                           │   OMNICHANNEL IDENTITY RESOLUTION   │
                           │  - Country-aware Phone (E.164)      │
                           │  - Lowercase Email Normalization    │
                           │  - Match lead.id / customer.id      │
                           └──────────────────┬──────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         │                                    │                                    │
         ▼                                    ▼                                    ▼
┌──────────────────┐               ┌───────────────────────┐              ┌──────────────────┐
│   wa_message     │               │       email_log       │              │  voice_call_log  │
│ 1,461 real msgs  │               │     62 real emails    │              │ 53 call audios   │
└────────┬─────────┘               └──────────┬────────────┘              └────────┬─────────┘
         │                                    │                                    │
         └────────────────────────────────────┼────────────────────────────────────┘
                                              │
                                              ▼
                           ┌─────────────────────────────────────┐
                           │    UNIFIED TIMELINE ENGINE (CORE)   │
                           │  - Deterministic Timestamp Sorting  │
                           │  - Strict Second-Level Deduplication│
                           │  - Channel Filters (All/WA/Mail/Call│
                           │  - Direction Filters (In/Out)       │
                           │  - Date Range Filtering             │
                           └──────────────────┬──────────────────┘
                                              │
         ┌────────────────────────────────────┴────────────────────────────────────┐
         ▼                                                                         ▼
┌─────────────────────────────────┐                               ┌─────────────────────────────────┐
│     BACKEND REST & SSE APIS     │                               │      FRONTEND WORKSTATION       │
│ - /api/omnichannel/leads        │ ◄───────────────────────────► │  Panel 1: Directory & Search    │
│ - /api/omnichannel/leads/:id    │                               │  Panel 2: 360 Header & Timeline │
│ - /api/omnichannel/timeline     │                               │  Panel 3: AI Copilot & Journey  │
│ - /api/omnichannel/intelligence │                               │  Detail: Full Chat / Audio / STT│
└─────────────────────────────────┘                               └─────────────────────────────────┘
```

---

## 7. Next Steps & Implementation Roadmap (Awaiting User Approval)

1. **Phase 1 (Backend Identity & Ingestion):**
   - Ensure the identity resolver links all historical `wa_message`, `email_log`, and `voice_call_log` records to their respective `lead_id` using verified E.164 phone and email normalization.
2. **Phase 2 (Timeline Deduplication & Sorting):**
   - Enforce exact database timestamp ordering (`occurred_at DESC` or `ASC`).
   - Implement channel-specific drill-down payloads:
     - **WhatsApp:** Returns full conversation message array with statuses (`sent`, `delivered`, `read`).
     - **Email:** Returns full body HTML, sender/receiver headers, and thread replies.
     - **Voice Call:** Returns audio player URL, complete timestamped STT transcript, and AI outcome.
     - **Meetings:** Returns slot, Google Meet URL, and discussion notes.
     - **Interviews:** Returns candidate stage, Google Meet link, and evaluation feedback.
3. **Phase 3 (Frontend Workstation Polish):**
   - Ensure clicking any timeline event opens its full channel drawer/modal without modifying existing Lead management features.
   - Maintain exact database times (`10:24 AM`, `Yesterday`, `22 Jan`) with zero relative placeholder text.
4. **Phase 4 (Controlled Verification):**
   - Verify on test contacts (e.g., Ram Kumar, Kavi, Keerthana) that all historical touchpoints load accurately from PostgreSQL.

*No code changes will be made until your explicit approval.*

