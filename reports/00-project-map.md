# Project Map: AI Workforce Sharyx Omnichannel Platform

**Generated:** 2026-11-05
**Role:** Senior Full-Stack Engineer & QA Lead
**Audit Version:** 1.0 (Comprehensive Architecture & Feature Mapping)

---

## 1. System Overview & Technology Stack

AI Workforce Sharyx is an enterprise multi-tenant omnichannel communication, AI agent orchestration, and CRM platform. It provides autonomous AI agents across WhatsApp, Email, and Voice (phone calls) with unified lead and customer 360° management.

### Tech Stack Details
- **Backend Framework:** NestJS 11.1.5 (Node.js 22, TypeScript 5.8)
- **Database & ORM:** PostgreSQL 16+, TypeORM 0.3.25 (Entities in `backend/src/Database/Table/`)
- **Authentication & Security:** Passport.js, JWT (`@nestjs/jwt`), Scrypt password hashing (`Encryption.service.ts`), AES-256-GCM secret encryption at rest for external API keys/tokens (`SecretTransformer.ts`).
- **Caching & Event Queue:** Redis / ioredis (optional with in-memory fallback), EventEmitter2 (`@nestjs/event-emitter`), NestJS Schedule (Cron jobs).
- **Frontend Framework:** React 19.2 + TypeScript, Vite 8.3
- **Routing:** Wouter 3.13 (Lightweight declarative router with `AdminRoute` and `PublicOnlyRoute` guards)
- **UI & State:** Tailwind CSS 4, Radix UI primitives, Lucide icons, TanStack React Query 5, Sonner (Toasts), Recharts.

### Network Ports & Running Instructions
| Service | Port | Configuration File | Command |
|---|---|---|---|
| **Frontend UI** | `8070` | `frontend/vite.config.ts` | `cd frontend && npm run dev` |
| **Backend API** | `8000` | `backend/src/main.ts`, `backend/.env` | `cd backend && npm run start:dev` |
| **Database** | `5432` | `backend/.env` (`localhost` / `158.220.99.156`) | PostgreSQL server |
| **Frontend Proxy** | `/api` -> `http://localhost:8000` | `frontend/vite.config.ts` | Handled automatically by Vite dev server |
| **Swagger Docs** | `/swagger` | `backend/src/main.ts` | `http://localhost:8000/swagger` |

---

## 2. External Services & Third-Party Integrations

1. **LLM & Generative AI:**
   - **Google Gemini** (`GEMINI_API_KEY`): Used for PromptEngine replies, document summarization, draft generation.
   - **OpenAI** (`OPENAI_API_KEY`): Used for AI Copilot Brain, intent classification, tool-calling and autonomous agent workflows.
2. **Meta / WhatsApp Cloud API:**
   - Meta Graph API (`v21.0`), Phone Number ID, WABA ID, System User Access Tokens.
   - Inbound Webhook (`/api/v1/WhatsApp/Webhook`) with HMAC-SHA256 (`X-Hub-Signature-256`) verification.
3. **Voice AI (Phone Calls):**
   - **Vapi AI** (`VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID`): Inbound/outbound call dispatch, realtime voice streaming, call summaries, audio recordings and transcripts.
4. **Email Services:**
   - **SMTP:** Nodemailer with per-tenant SMTP configurations (Google App Passwords, Custom SMTP) and platform fallback.
   - **IMAP:** `imap-simple` and `mailparser` for real-time two-way inbox message polling and synchronization.
   - **Google OAuth 2.0:** (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) for Gmail single sign-on and Gmail API access.
5. **Storage & Assets:**
   - Local disk storage (`/uploads` or `STORAGE_PATH`), Multer multipart handling, PDF generator (PDFKit / custom generator).

---

## 3. Multi-Tenancy Architecture & Security

### Tenant Creation (Sign Up)
- When a user signs up (`POST /api/v1/Auth/VerifySignupOtp`), the system validates OTP, verifies password length, and creates a new `company` (tenant) record in `backend/src/Database/Table/Admin/company.ts`.
- The user record (`user`) is linked directly to the newly created company via `user.company_id = company.id`.
- Every tenant receives a unique UUID (`company.id`).

### Tenant Carrying (JWT)
- After authentication, the server signs a JWT bearer token containing:
  ```json
  {
    "user_id": "...",
    "email": "user@company.com",
    "user_role_id": 1,
    "user_role_name": "Admin",
    "is_super_admin": false,
    "company_id": "tenant-uuid-1234",
    "tenant_id": "tenant-uuid-1234"
  }
  ```
- The frontend stores this token in localStorage and attaches it via Axios request interceptors (`Authorization: Bearer <token>`).

### Tenant Enforcement & Isolation
- **`TenantContextGuard`**: Runs on all business controllers. It reads the trusted `tenant_id` from the signed token and forcibly overwrites any client-supplied `x-tenant-id` header, query parameters (`?tenantId=`), and request body fields (`tenantId`, `tenant_id`).
- **`CurrentTenant()` Decorator**: Extracts the validated tenant ID directly from the authenticated request object.
- **Super Admin Exception**: Only users whose token has `is_super_admin: true` can pass `x-tenant-id: <uuid>` to impersonate a tenant or `x-tenant-id: all` to view cross-tenant aggregated telemetry.
- **Webhook Routing**:
  - Unauthenticated inbound webhooks (e.g. Meta WhatsApp) resolve the tenant strictly by looking up the incoming `phone_number_id` against `whatsapp_config.phone_number_id`. If the phone number does not belong to any tenant, the event is immediately discarded.

---

## 4. Frontend Route Inventory

All frontend routes are mapped in `frontend/src/App.tsx` and `frontend/src/pages/admin/AdminLayout.tsx`:

| URL Route | Guard / Layout | Component | Purpose |
|---|---|---|---|
| `/login` | `PublicOnlyRoute` | `LoginPage.tsx` | User login (email/password & Google OAuth) |
| `/signup` | `PublicOnlyRoute` | `SignupPage.tsx` | Registration with OTP verification |
| `/oauth/callback` | Public | `OAuthCallback.tsx` | Handles Google OAuth redirect & token exchange |
| `/onboarding` | Authenticated | `OnboardingWizard.tsx` | 10-step tenant setup wizard |
| `/admin` or `/admin/dashboard` | `AdminRoute` / `AdminLayout` | `AdminDashboard.tsx` | Global KPIs, channel metrics, activity streams |
| `/admin/omnichannel` | `AdminRoute` / `AdminLayout` | `OmnichannelInboxPage.tsx` | Unified 360° workstation for WhatsApp, Email, Voice |
| `/admin/whatsapp` | `AdminRoute` / `AdminLayout` | `WhatsAppAutomation.tsx` | WhatsApp two-way live chat & inbox |
| `/admin/whatsapp/sync` | `AdminRoute` / `AdminLayout` | `WhatsAppSyncSection.tsx` | Diagnostics, Meta connection sync, connection health |
| `/admin/whatsapp/templates` | `AdminRoute` / `AdminLayout` | `WhatsAppTemplatesTab.tsx` | Meta approved WhatsApp template management |
| `/admin/whatsapp/campaigns` | `AdminRoute` / `AdminLayout` | `WhatsAppAutomation.tsx` | WhatsApp broadcast campaigns & bulk messaging |
| `/admin/whatsapp/brain` | `AdminRoute` / `AdminLayout` | `WhatsAppAIBrainPage.tsx` | AI Copilot system prompt, defaults, LLM behavior |
| `/admin/whatsapp/analytics` | `AdminRoute` / `AdminLayout` | `WhatsAppAnalyticsPage.tsx` | Telemetry, SLA tracking, message delivery rates |
| `/admin/email` | `AdminRoute` / `AdminLayout` | `EmailAutomation.tsx` | Two-way email inbox, IMAP reader, compose modal |
| `/admin/email/templates` | `AdminRoute` / `AdminLayout` | `EmailTemplatesTab.tsx` | Email template builder, variables & attachments |
| `/admin/email/ai` | `AdminRoute` / `AdminLayout` | `EmailAISettingsView.tsx` | Email AI Copilot & auto-reply prompt configuration |
| `/admin/email/campaigns` | `AdminRoute` / `AdminLayout` | `CreateCampaignView.tsx` | Email sequence automation & campaigns |
| `/admin/email/settings` | `AdminRoute` / `AdminLayout` | `EmailSettingsDialog.tsx` | Mailbox connection, SMTP & IMAP credentials |
| `/admin/voice` | `AdminRoute` / `AdminLayout` | `VoiceAutomation.tsx` | Voice AI agents sandbox, prompt builder, test call |
| `/admin/voice/logs` | `AdminRoute` / `AdminLayout` | `CallLogsPage.tsx` | Phone call logs, recordings, audio player, transcripts |
| `/admin/agents` | `AdminRoute` / `AdminLayout` | `AiAgentsPage.tsx` | Specialized multi-agent hub (Receptionist, Sales, etc.) |
| `/admin/leads` | `AdminRoute` / `AdminLayout` | `Leads.tsx` | CRM Leads & Contacts table, drawer, import/export |
| `/admin/candidates` | `AdminRoute` / `AdminLayout` | `Leads.tsx` (Candidates Tab) | Candidate pipeline, job openings, interview approval |
| `/admin/customers` | `AdminRoute` / `AdminLayout` | `Customers.tsx` | Customers 360°, deals pipeline, conversion simulator |
| `/admin/api` / `/admin/settings` | `AdminRoute` / `AdminLayout` | `SettingsPage.tsx` | API credentials, Meta, Vapi, SMTP setup & tokens |

---

## 5. Database Schema & Feature Usage Table

| Table Name | Entity Class | Module / Feature | Key Tenant Field | Purpose |
|---|---|---|---|---|
| `company` | `company` | Tenant / Auth | `id` (PK) | Stores company profile, settings, onboarding state & JSON data |
| `user` | `user` | Auth / Admin | `company_id` | User accounts, credentials (scrypt hash), roles, status |
| `user_role` | `user_role` | Auth / Admin | - (Platform-wide) | Role definitions (Admin, Super Admin, Agent) |
| `audit_log` | `audit_log` | Audit / Admin | `tenant_id` | System audit trail of operations |
| `error_log` | `error_log` | Diagnostics / Admin | `tenant_id` | Application runtime error logs |
| `country` | `country` | Reference / Admin | - | Country codes and currency definitions |
| `currency` | `currency` | Reference / Admin | - | Currency master records |
| `email_config` | `email_config` | Platform Admin | `tenant_id` | Legacy platform email settings |
| `lead` | `lead` | Lead Management | `tenant_id` | Leads & candidate profiles, contact info, interview info |
| `lead_activity` | `lead_activity` | Lead Management | `tenant_id` | Audit trail and activity logs for leads |
| `job_openings` | `JobOpening` | Recruitment / Leads | `tenant_id` | Open positions, hiring criteria, interview guidelines |
| `customer` | `Customer` | CRM / Customers | `tenant_id` | 360° customer records, lifetime value, health score |
| `customer_interaction`| `CustomerInteraction` | CRM / Customers | `tenant_id` | Touchpoints across WhatsApp, Email, Voice |
| `crm_deal` | `CrmDeal` | CRM / Sales | `tenant_id` | Sales deals, pipeline stages, expected revenue |
| `LeadConversionRule`| `LeadConversionRule` | Automation | `tenant_id` | Criteria to auto-promote qualified leads to customers |
| `whatsapp_config` | `WhatsAppConfig` | WhatsApp | `tenant_id` (Unique) | Meta API credentials (token, phone_number_id, app_secret) |
| `wa_ai_config` | `WhatsAppAIConfig` | WhatsApp Brain | `tenant_id` | Copilot system prompt, LLM parameters, stop words |
| `wa_conversation` | `WhatsAppConversation` | WhatsApp Live Chat | `tenant_id` | Conversation threads, status, takeover flag |
| `wa_message` | `WhatsAppMessage` | WhatsApp Live Chat | `tenant_id` | Inbound & outbound messages, delivery statuses |
| `wa_template` | `WhatsAppTemplate` | WhatsApp Templates | `tenant_id` | Meta message templates, categories, approval statuses |
| `wa_campaign` | `WhatsAppCampaign` | WhatsApp Campaigns | `tenant_id` | Broadcast campaigns, scheduling, metrics |
| `processed_messages`| `ProcessedMessage` | WhatsApp Ingestion | - (Global dedup) | Inbound Meta `wamid` deduplication table |
| `email_account_config`| `EmailAccountConfig`| Email Settings | `tenant_id` | Per-tenant SMTP, IMAP & Google OAuth mail credentials |
| `email_ai_config` | `EmailAIConfig` | Email AI Copilot | `tenant_id` | Email AI prompt, auto-reply rules, tone settings |
| `email_template` | `EmailTemplate` | Email Templates | `tenant_id` | Rich HTML templates, dynamic tags, PDF attachments |
| `email_campaign` | `EmailCampaign` | Email Campaigns | `tenant_id` | Outbound email campaigns and scheduled blasts |
| `email_log` | `EmailLog` | Email Two-Way Inbox| `tenant_id` | Synchronized email messages and thread histories |
| `email_delivery_log`| `EmailDeliveryLog` | Email Reliability | `tenant_id` | Delivery attempts, retries, and failure reasons |
| `voice_provider_config`| `VoiceProviderConfig`| Voice Settings | `tenant_id` | Vapi API credentials, phone IDs, assistant IDs |
| `voice_agent` | `VoiceAgent` | Voice AI | `tenant_id` | Configured voice assistants, system prompts, voices |
| `voice_call_log` | `VoiceCallLog` | Voice Call Logs | `tenant_id` | Call records, duration, transcripts, recording URLs |
| `ai_agent` | `AiAgent` | Agent Orchestrator | `tenant_id` | Multi-agent personas (Receptionist, Sales, Support...) |
| `conversation_agent_state`| `ConversationAgentState`| Agent Orchestrator | `tenant_id` | Current assigned agent per conversation thread |
| `agent_handoff_log` | `AgentHandoffLog` | Agent Orchestrator | `tenant_id` | Routing & handoff decisions between AI and human |
| `OmnichannelConversation`| `OmnichannelConversation`| Omnichannel 360 | `tenant_id` | Unified omnichannel conversations |
| `OmnichannelMessage`| `OmnichannelMessage`| Omnichannel 360 | `tenant_id` | Unified cross-channel message stream |
| `OmnichannelCall` | `OmnichannelCall` | Omnichannel 360 | `tenant_id` | Cross-channel voice call linkage |
| `OmnichannelCommunication`| `OmnichannelCommunication`| Omnichannel 360 | `tenant_id` | Unified customer interactions stream |
| `OmnichannelEvent` | `OmnichannelEvent` | Omnichannel 360 | `tenant_id` | Real-time SSE communication events |
| `OmnichannelActivityLog`| `OmnichannelActivityLog`| Omnichannel 360 | `tenant_id` | Real-time omnichannel audit trail |
| `CustomerIdentityMapping`| `CustomerIdentityMapping`| Omnichannel 360 | `tenant_id` | Cross-channel identity resolution (phone <-> email) |

---

## 6. Complete Backend API Endpoint Directory

The backend exposes 255 API endpoints across 34 controllers under the `/api/v1` namespace:

### Auth & Onboarding
- `POST /api/v1/Auth/Login` - Password authentication with brute-force lockout
- `POST /api/v1/Auth/SendSignupOtp` - Generates 6-digit verification code & sends email
- `POST /api/v1/Auth/ResendSignupOtp` - Resends OTP with rate-limiting cooldown
- `POST /api/v1/Auth/VerifySignupOtp` - Verifies OTP, hashes password, creates tenant & user
- `POST /api/v1/Auth/GoogleAuth` - Google OAuth code or ID token verification
- `POST /api/v1/Auth/SendResetOtp` - Password reset code generation
- `POST /api/v1/Auth/VerifyResetOtp` - Verifies reset code and updates password
- `GET /api/v1/Onboarding/State` - Retrieves saved onboarding step & tenant data
- `PUT /api/v1/Onboarding/Step` - Validates and saves individual wizard step
- `POST /api/v1/Onboarding/Complete` - Validates full completion and marks tenant ready

### Company & User Administration
- `GET /api/v1/Company/Get` - Fetches authenticated company details
- `GET /api/v1/Company/List` - Lists companies (Super Admin sees all, normal user sees self)
- `PATCH /api/v1/Company/Update` - Updates tenant profile
- `GET /api/v1/User/Get` / `GET /api/v1/User/List` - User management
- `POST /api/v1/User/Insert` / `PUT /api/v1/User/Update/:Id` / `DELETE /api/v1/User/Delete/:Id` - CRUD operations
- `GET /api/v1/UserRole/List` - System role lookup
- `GET /api/v1/AuditLog/LazyLoadList` / `POST /api/v1/AuditLog/DetailList` - Audit logging
- `GET /api/v1/DashboardTelemetry/telemetry` / `GET /api/v1/DashboardTelemetry/sync` - Telemetry

### Leads & Recruitment
- `GET /api/v1/Lead/List` - Paginated leads filtered strictly by tenant
- `GET /api/v1/Lead/Stats` - Lead status statistics
- `GET /api/v1/Lead/ById/:id` - Lead details with verification
- `POST /api/v1/Lead/Insert` - Creates new lead/candidate
- `PUT /api/v1/Lead/Update/:id` - Updates lead profile
- `PATCH /api/v1/Lead/UpdateStatus/:id` - Status transitions
- `DELETE /api/v1/Lead/Delete/:id` - Removes lead
- `POST /api/v1/Lead/BulkDelete` / `POST /api/v1/Lead/BulkUpdateStatus` - Batch operations
- `POST /api/v1/Lead/ApproveInterview/:id` - Approves interview schedule
- `POST /api/v1/Lead/TriggerVoiceCall/:id` - Dispatches automated Vapi phone call
- `GET /api/v1/JobOpenings` / `POST /api/v1/JobOpenings` / `PUT /api/v1/JobOpenings/:id` - Job positions

### Customers & CRM Automation
- `GET /api/v1/Customer/List` - Customer 360° directory
- `GET /api/v1/Customer/:id` - Deep customer profile, LTV, touchpoint history
- `PUT /api/v1/Customer/Update/:id` / `DELETE /api/v1/Customer/Delete/:id` - CRUD
- `GET /api/v1/Customer/Deals` / `POST /api/v1/Customer/Deals` - Deals & sales pipeline
- `GET /api/v1/Automation` - Conversion rules list
- `POST /api/v1/Automation/ConvertLead/:leadId` - Converts qualified lead to customer
- `POST /api/v1/Automation/DryRunTest` - Evaluates rules without state change

### WhatsApp Automation
- `GET /api/v1/WhatsApp/Config` - Returns safe credentials (tokens masked)
- `POST /api/v1/WhatsApp/Config` - Saves Meta credentials (encrypted at rest)
- `POST /api/v1/WhatsApp/Test-Connection` - Verifies credentials against Meta Graph API
- `POST /api/v1/WhatsApp/Disconnect` - Unlinks WhatsApp number from tenant
- `GET /api/v1/WhatsApp/Conversations` - Lists live chat conversations
- `GET /api/v1/WhatsApp/Messages/:conversationId` - Inbound/outbound message thread
- `POST /api/v1/WhatsApp/Send` - Sends text or template message via Meta Graph API
- `PATCH /api/v1/WhatsApp/Conversations/:id/status` - Takeover & status updates
- `GET /api/v1/WhatsApp/AI/Config` / `POST /api/v1/WhatsApp/AI/Config` - Brain settings & prompt
- `GET /api/v1/WhatsApp/Templates` - Lists Meta templates
- `POST /api/v1/WhatsApp/Templates/SyncMeta` - Syncs approved templates from Meta
- `POST /api/v1/WhatsApp/Templates/Create` - Submits new template to Meta
- `GET /api/v1/WhatsApp/Campaigns` / `POST /api/v1/WhatsApp/Campaigns/Create` - Campaigns
- `GET /api/v1/WhatsApp/Webhook` - Meta webhook handshake (`hub.challenge`)
- `POST /api/v1/WhatsApp/Webhook` - Meta inbound webhook handler (signature verified)

### Email Automation
- `GET /api/v1/Email/Config` / `POST /api/v1/Email/Config` - Mailbox SMTP/IMAP configuration
- `POST /api/v1/Email/Test-Connection` - Verifies SMTP & IMAP credentials
- `GET /api/v1/Email/Inbox` / `GET /api/v1/Email/Thread/:identifier` - Inbound email threads
- `POST /api/v1/Email/Send` - Outbound email dispatch
- `POST /api/v1/Email/Sync` - Triggers IMAP sync with remote mailbox
- `GET /api/v1/Email/AI/Config` / `POST /api/v1/Email/AI/Config` - Email AI Copilot prompt
- `POST /api/v1/Email/AI/Draft` - AI-generated draft response
- `GET /api/v1/Email/Templates` / `POST /api/v1/Email/Templates/Create` - Email templates
- `GET /api/v1/Email/Campaign` / `POST /api/v1/Email/Campaign` - Sequences & campaigns

### Voice AI Automation
- `GET /api/v1/Voice/Config` / `POST /api/v1/Voice/Config` - Vapi provider API keys
- `POST /api/v1/Voice/Config/test` - Validates Vapi connection
- `GET /api/v1/Voice/Agents` / `POST /api/v1/Voice/Agents` - Voice agent personas
- `POST /api/v1/Voice/Calls/dispatch` - Dispatches outbound phone call
- `GET /api/v1/Voice/Calls/logs` - Call recordings, durations, transcripts
- `POST /api/v1/Voice/Webhook` - Vapi inbound call status & transcript webhook

### Agent Orchestrator & Omnichannel
- `GET /api/v1/AiAgents` / `PUT /api/v1/AiAgents/:id` - Multi-agent personas configuration
- `POST /api/v1/AiAgents/:id/Reset` - Resets agent prompt to system default
- `GET /api/v1/AiAgents/Conversations` - Cross-channel conversation states
- `POST /api/v1/AiAgents/Conversations/:id/Takeover` - Human takeover
- `GET /api/v1/Omnichannel/leads` / `GET /api/v1/Omnichannel/customers` - Unified directory
- `GET /api/v1/Omnichannel/conversations/:id` - Unified cross-channel conversation
- `POST /api/v1/Omnichannel/conversations/:id/reply` - Omnichannel unified reply
- `POST /api/v1/Omnichannel/customers/:id/link-identity` - Links phone and email identities

