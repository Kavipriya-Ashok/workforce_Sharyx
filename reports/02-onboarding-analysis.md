# Module 2: Tenant Onboarding, Integration Connection Status & Profile Page — Deep Audit & QA Analysis

**Date:** November 5, 2026  
**Module Audited:** Module 2: Tenant Onboarding, Integration Connection Status and Profile Page  
**Pages Evaluated:** `/onboarding` (`OnboardingWizard.tsx`), `/admin/api` (`SettingsPage.tsx`), `/profile` (**NOT FOUND** in codebase)  
**Backend Endpoints:**  
- `GET /api/v1/Onboarding/State`  
- `PUT /api/v1/Onboarding/Step`  
- `POST /api/v1/Onboarding/Complete`  
- `GET /api/v1/WhatsApp/Config`, `POST /api/v1/WhatsApp/Config`, `POST /api/v1/WhatsApp/Test-Connection`, `POST /api/v1/WhatsApp/Disconnect`  
- `GET /api/v1/Email/Config`, `POST /api/v1/Email/Config`, `POST /api/v1/Email/Test-Connection`, `GET /api/v1/Email/OAuth/Status`, `POST /api/v1/Email/OAuth/Connect`, `POST /api/v1/Email/OAuth/Disconnect`  
**Tables Examined:** `company`, `user`, `whatsapp_config`, `email_account_config`  

> ## ✅ STATUS UPDATE 2026-11-05 — Module 2 remediation done (see **Section 12**)
> Bugs 1, 2, 3, 5 **fixed**; bug 4 (dead data) **partly fixed, waiting for your decision**. Requirements R1–R6 are all met.
> Re-test on the fixed code: **56/56 backend checks pass** (was 12 of the 17 original checks), **20/20 real-Chrome checks pass**, 9/9 checks on a database with *no migration applied*, 5/5 brain-prompt checks.
> The sections below are the **original audit, unchanged, for history**.

---

## 1. Five-Line Plain English Summary

Module 2 is **NOT production-ready**. While multi-tenant step saving and step validation function correctly, the application has no unified Integration Status model, meaning connection test results, timestamps, and failure error reasons are never saved to the backend database. A dedicated Profile page does not exist in the application, and the existing Settings page lacks company profile management and connection health checklists. Furthermore, `GET /api/v1/Email/Config` leaks raw `client_secret` and `smtp_password` in API responses, and several onboarding wizard answers (goals, apps, tech comfort) remain completely dead data that are never used by any AI agent or automation engine.

---

## 2. Real vs Mocked Breakdown

| Component / Subsystem | Execution Mode | Details & Evidence |
| :--- | :--- | :--- |
| **Backend API Server** | **REAL** | Running NestJS on `http://localhost:8000`. All 12 automated API audit scenarios executed live via HTTP. |
| **Frontend UI Pages** | **REAL** | Running Vite React on `http://localhost:8070`. Examined `/onboarding` (`OnboardingWizard.tsx`) and `/admin/api` (`SettingsPage.tsx`). |
| **PostgreSQL Database** | **REAL** | Remote PostgreSQL database on `158.220.99.156`. Verified actual rows in `company`, `whatsapp_config`, and `email_account_config`. |
| **Tenant Context Isolation** | **REAL** | Cryptographic verification of JWT tenant claims for Tenant A (`646b4abe-e6de-401b-ba33-46884bf3f6e6`) and Tenant B (`2cc6ac94-ffb7-4239-85eb-eddc852ab61a`). |
| **Meta WhatsApp API** | **MOCKED / SIMULATED** | Real calls to Meta Graph API reject when credentials are dummy strings; handshake error mapping tested. |
| **SMTP / Mailbox Handshake** | **MOCKED / LOCAL** | Nodemailer verify tested against local/remote socket; simulated timeout and handshake failure paths evaluated. |

---

## 3. Requirement Coverage Table (R1 to R6)

| Req ID | Requirement Statement | Status | Evidence & File Location |
| :---: | :--- | :---: | :--- |
| **R1** | Connection test results (status, timestamp, error reason) must be tested and **saved in the backend per tenant**. | **PARTLY / MISSING** | In [`WhatsApp.service.ts` line 122](file:///c:/Users/hp/workforce_Sharyx/backend/src/WhatsApp/Services/WhatsApp.service.ts#L122), success saves `is_connected: true`, but failure throws an exception without writing `error_message` or `last_checked_at` to the DB. In [`Email.service.ts` line 178](file:///c:/Users/hp/workforce_Sharyx/backend/src/Email/Services/Email.service.ts#L178), `testConnection` doesn't even receive a `tenantId` and saves **nothing** to `email_account_config`. Table schemas lack `last_checked_at` and `error_message` columns entirely. |
| **R2** | After signup/onboarding, UI must show clear "Connected" or "Not connected" status loaded from the backend. | **PARTLY** | Backend returns `is_connected` (WhatsApp) and `is_active` (Email). However, in [`OnboardingWizard.tsx`](file:///c:/Users/hp/workforce_Sharyx/frontend/src/pages/onboarding/OnboardingWizard.tsx), status was previously tracked in local memory state without fetching server status on mount. |
| **R3** | UI must provide a step-by-step checklist / progress view showing Done, Pending, or Failed with action buttons. | **MISSING** | Neither the dashboard (`/admin/dashboard`) nor settings (`/admin/api`) contains an integration health checklist or setup tracker. Once onboarding is finished or skipped, no checklist exists. |
| **R4** | A Profile / Settings page must show company profile, WhatsApp, Email (SMTP & IMAP), and API keys as "saved", plus Reconnect, Test, and Disconnect actions. | **MISSING** | **Dedicated Profile page NOT FOUND** in codebase. Settings page (`SettingsPage.tsx`) shows API forms but has **no Company Profile section** (name, address, industry, postal code), no IMAP health status, and no `last_checked_at` timestamps. |
| **R5** | Status must stay correct over time: token expiry or revocation must change status to Failed with user-friendly error reasons. | **MISSING** | No background health check cron exists. If an access token expires or is revoked, `is_connected` remains `true` in the database until a manual test or send is attempted. Outbound send failures log errors but do not update the connection status to Failed in the database. |
| **R6** | Strictly tenant-isolated and must never expose secrets in API responses, logs, or browser storage. | **PARTLY** | Multi-tenant filtering via `TenantContextGuard` is strictly enforced. However, [`EmailController.getConfig()`](file:///c:/Users/hp/workforce_Sharyx/backend/src/Email/Controllers/Email.controller.ts#L28) leaks raw `client_secret` and `smtp_password` in the response body. |

---

## 4. Comprehensive Test Results Table

| ID | Area | Scenario | Steps Executed | Expected Result | Actual Result | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **M2-01** | A. Progress & Guard | Unauthenticated State Access | `GET /api/v1/Onboarding/State` without JWT token. | HTTP 401 Unauthorized. | HTTP 401 returned. | **PASS** |
| **M2-02** | A. Progress & Guard | Tenant A State Isolation | `GET /api/v1/Onboarding/State` with Tenant A token. | Returns Tenant A company ID and saved data. | Returned `company.id: 646b4abe-...` (Sharyx Enterprise Inc). | **PASS** |
| **M2-03** | A. Progress & Guard | Tenant B State Isolation | `GET /api/v1/Onboarding/State` with Tenant B token. | Returns Tenant B company ID and saved data. | Returned `company.id: 2cc6ac94-...` (ZOHO). | **PASS** |
| **M2-04** | A. Progress & Guard | IDOR Header Spoofing | Tenant A calls `/Onboarding/State` with `x-tenant-id: <Tenant B ID>`. | Server ignores header and forces Tenant A context. | Server returned Tenant A data (`company.id: 646b4abe-...`). Spoof blocked. | **PASS** |
| **M2-05** | A. Progress & Guard | Invalid Step Number (0) | `PUT /api/v1/Onboarding/Step` with `step: 0`. | HTTP 400 Bad Request. | HTTP 400 returned: `Step must be a number between 1 and 10.` | **PASS** |
| **M2-06** | A. Progress & Guard | Invalid Step Number (11) | `PUT /api/v1/Onboarding/Step` with `step: 11`. | HTTP 400 Bad Request. | HTTP 400 returned: `Step must be a number between 1 and 10.` | **PASS** |
| **M2-07** | A. Progress & Guard | Non-Numeric Step ("abc") | `PUT /api/v1/Onboarding/Step` with `step: "abc"`. | HTTP 400 Bad Request. | HTTP 400 returned: `Step must be a number between 1 and 10.` | **PASS** |
| **M2-08** | A. Progress & Guard | Missing Required Steps on Complete | Call `POST /api/v1/Onboarding/Complete` with empty company name. | HTTP 400 Bad Request listing missing required steps. | HTTP 400 returned: `Onboarding is incomplete: Company name must be at least 2 characters.` | **PASS** |
| **M2-09** | E. Secrets | WhatsApp Config Secret Masking | `GET /api/v1/WhatsApp/Config` for Tenant A. | Access token and app secret masked/hidden. | Verified: `access_token` omitted; `has_access_token: true` and `access_token_hint: '••••0147'` returned. | **PASS** |
| **M2-10** | E. Secrets | Email Config Secret Leakage | `GET /api/v1/Email/Config` for Tenant A. | Client secret and SMTP password omitted/masked. | **FAILED: LEAKS SECRETS**. Response contains `client_secret: GOCSPX-...` and `smtp_password` hash. | **FAIL** |
| **M2-11** | B. Email Status | Email OAuth Status Endpoint | `GET /api/v1/Email/OAuth/Status` for Tenant A. | HTTP 200 with `isConnected`, `provider`, `email_address`. | HTTP 200 returned with connection status object. | **PASS** |
| **M2-12** | C. WhatsApp Status | WhatsApp Test Connection Validation | `POST /api/v1/WhatsApp/Test-Connection` with empty credentials. | HTTP 400 Bad Request. | HTTP 400 returned: `Phone Number ID and Access Token are required to test Meta connection.` | **PASS** |
| **M2-13** | B. Email Status | Email Test Connection Validation | `POST /api/v1/Email/Test-Connection` with invalid SMTP password. | HTTP 400 Bad Request with descriptive handshake error. | HTTP 400 returned with SMTP handshake failure message. | **PASS** |
| **M2-14** | B. Email Status | Connection Failure DB Persistence | Send failing credentials to `Email/Test-Connection`. | Database updates `is_active: false`, `error_message`, `last_checked_at`. | **FAILED**: Nothing is written to the database. Entity remains unchanged. | **FAIL** |
| **M2-15** | C. WhatsApp Status | WhatsApp Failure DB Persistence | Send failing credentials to `WhatsApp/Test-Connection`. | Database updates `is_connected: false`, `error_message`, `last_checked_at`. | **FAILED**: Service throws `BadRequestException` and aborts without saving error to DB. | **FAIL** |
| **M2-16** | D. Post-Signup UI | Profile Page Existence | Inspect frontend routes for `/profile` or Profile page component. | Dedicated tenant profile component loaded at `/profile` or `/admin/profile`. | **FAILED: NOT FOUND**. No profile page exists in frontend routes. | **FAIL** |
| **M2-17** | G. Dead Data | Onboarding Wizard Data Consumption | Trace backend usage of `goals`, `apps`, `selected_services`, `technical_level`. | Data utilized by AI Agent Orchestrator or Rule Engine. | **FAILED: DEAD DATA**. Stored only in `company.onboarding_data` JSON; never read by any backend service. | **FAIL** |

---

## 5. Errors & Vulnerabilities Found

### Bug 1: [CRITICAL] Secret Exposure in `EmailController.getConfig`
- **Status after remediation:** ✅ **Fixed**
- **File & Line:** [Email.controller.ts (Line 27-31)](file:///c:/Users/hp/workforce_Sharyx/backend/src/Email/Controllers/Email.controller.ts#L27-L31)
- **Repro Steps:**
  1. Authenticate as any tenant admin.
  2. Send `GET /api/v1/Email/Config`.
  3. Inspect JSON response.
- **Root Cause:** The controller returns the raw TypeORM `EmailAccountConfig` database entity without stripping sensitive columns.
- **Impact:** Leaks plaintext `client_secret` (Google OAuth) and encrypted `smtp_password` to any user browser inspectable via dev tools.
- **Recommended Fix:** Implement a `toSafeConfig()` helper method in `Email.service.ts` (identical to `WhatsApp.service.ts`) that masks `client_secret`, `smtp_password`, and `refresh_token`, returning only boolean flags (`has_client_secret: true`, `has_password: true`).

### Bug 2: [HIGH] Connection Test Results & Errors are Never Persisted to Database (R1 Defect)
- **Status after remediation:** ✅ **Fixed**
- **File & Line:** [Email.service.ts (Line 178)](file:///c:/Users/hp/workforce_Sharyx/backend/src/Email/Services/Email.service.ts#L178) and [WhatsApp.service.ts (Line 105)](file:///c:/Users/hp/workforce_Sharyx/backend/src/WhatsApp/Services/WhatsApp.service.ts#L105)
- **Repro Steps:**
  1. Submit invalid credentials to `/WhatsApp/Test-Connection` or `/Email/Test-Connection`.
  2. Inspect `whatsapp_config` and `email_account_config` tables.
- **Root Cause:**
  - `Email.service.ts:testConnection` does not receive or query `tenant_id` and performs no database updates.
  - `WhatsApp.service.ts:testConnection` throws a `BadRequestException` immediately on Meta API rejection, bypassing any database update.
- **Impact:** System has zero historical record of whether an integration test succeeded or failed, what error code was returned, or when the connection was last tested.
- **Recommended Fix:** Add `last_checked_at`, `last_success_at`, `status` ('connected', 'failed', 'not_configured'), and `error_message` columns to `whatsapp_config` and `email_account_config`. Update these columns in `testConnection` whether the test passes or fails.

### Bug 3: [HIGH] Missing Dedicated Profile Page in Application
- **Status after remediation:** ✅ **Fixed**
- **File & Line:** [AdminLayout.tsx (Line 119-142)](file:///c:/Users/hp/workforce_Sharyx/frontend/src/pages/admin/AdminLayout.tsx#L119-L142) and [App.tsx (Line 58-67)](file:///c:/Users/hp/workforce_Sharyx/frontend/src/App.tsx#L58-L67)
- **Repro Steps:**
  1. Attempt to navigate to `http://localhost:8070/admin/profile` or `http://localhost:8070/profile`.
- **Root Cause:** No route or page component exists for the tenant profile. Company details saved during Onboarding Step 1 & 2 (`company.name`, `company.address`, `company.industry`, `company.website`, `company.postal_code`) have no view or edit screen in the UI.
- **Impact:** Users cannot review or edit their company details, address, or branding after completing onboarding.
- **Recommended Fix:** Create a dedicated `/admin/profile` page component and link it in the admin sidebar navigation.

### Bug 4: [MEDIUM] Dead Data in Onboarding Wizard (Unconsumed Fields)
- **Status after remediation:** 🟡 **Partly fixed** — goals, industry, workflows and software now shape the AI prompt; Tech comfort / discovery source / logo remain unused → **needs your decision (13)**
- **File & Line:** [Onboarding.service.ts (Line 11-17)](file:///c:/Users/hp/workforce_Sharyx/backend/src/Service/Onboarding/Onboarding.service.ts#L11-L17)
- **Repro Steps:**
  1. Complete onboarding specifying goals (e.g. "24/7 Phone Receptionist"), apps ("HubSpot"), and technical comfort ("Intermediate").
  2. Search entire codebase for `onboarding_data.goals` or `onboarding_data.apps`.
- **Root Cause:** `company.onboarding_data` is saved as an isolated JSON column and never passed to the AI Prompt Engine, Default Agents, or CRM Lead pipelines.
- **Impact:** Wasteful 10-step onboarding fatigue that delivers zero personalization to the tenant's actual experience.
- **Recommended Fix:** Wire `onboarding_data.goals` and `onboarding_data.industry` into `PromptEngine.service.ts` to dynamically customize the AI agents' greeting and behavior per tenant.

### Bug 5: [MEDIUM] Step 9 (WhatsApp) and Step 10 (Email) Omitted from Server Completion Check
- **Status after remediation:** ✅ **Fixed**
- **File & Line:** [Onboarding.service.ts (Line 131)](file:///c:/Users/hp/workforce_Sharyx/backend/src/Service/Onboarding/Onboarding.service.ts#L131)
- **Repro Steps:**
  1. Call `POST /api/v1/Onboarding/Complete` with only steps 1, 2, 3, 4, 6 filled out.
- **Root Cause:** `complete()` strictly iterates over `[1, 2, 3, 4, 6]`. Steps 7, 8, 9, 10 are completely skipped.
- **Impact:** While skipping WhatsApp/Email is good for usability, the backend should explicitly record `whatsapp_skipped: true` and `email_skipped: true` so the post-onboarding dashboard can prompt the user to connect them.

---

## 6. What Has to Change (Prioritized Plan & Proposed Design)

### Priority Task List

| Change | Priority | Files to Touch | Effort | Risk |
| :--- | :---: | :--- | :---: | :---: |
| **1. Sanitize Email Config API** | **P0** | `Email.controller.ts`, `Email.service.ts` | **S** | Low |
| **2. Persist Connection Test Status & Error Logs** | **P0** | `WhatsApp.service.ts`, `Email.service.ts`, Entity files | **M** | Medium |
| **3. Unified Integration Health API** | **P1** | `IntegrationStatus.controller.ts` (New), Services | **M** | Low |
| **4. Build Dedicated Profile & Integrations Page** | **P1** | `ProfilePage.tsx` (New), `AdminLayout.tsx` | **M** | Low |
| **5. Post-Onboarding Integration Checklist on Dashboard** | **P2** | `DashboardPage.tsx` / `AdminDashboard.tsx` | **S** | Low |

---

### Proposed Design: Integration Status Model & Architecture

#### 1. Unified Integration Health Entity (`integration_status` or columns)
Add the following audit columns to both `whatsapp_config` and `email_account_config` (or a unified `tenant_integration_status` table):

```typescript
@Column({ length: 30, default: 'not_configured' })
status: 'not_configured' | 'connected' | 'failed' | 'degraded';

@Column({ type: 'timestamp', nullable: true })
last_checked_at: Date;

@Column({ type: 'timestamp', nullable: true })
last_success_at: Date;

@Column({ length: 50, nullable: true })
error_code: string;

@Column({ type: 'text', nullable: true })
error_message: string;
```

#### 2. Proposed API Endpoints
- `GET /api/v1/Integrations/Status`: Returns a unified summary of all integrations for the tenant:
  ```json
  {
    "whatsapp": {
      "status": "connected",
      "display_phone": "+1 555 019 2831",
      "business_name": "Sharyx AI",
      "last_checked_at": "2026-11-05T14:20:00Z",
      "error_message": null
    },
    "email": {
      "status": "connected",
      "provider": "google-email",
      "email_address": "riyakavi6083@gmail.com",
      "last_checked_at": "2026-11-05T14:20:00Z",
      "smtp_status": "ok",
      "imap_status": "ok"
    },
    "voice": {
      "status": "not_configured"
    }
  }
  ```
- `POST /api/v1/Integrations/:type/Test`: Live trigger that runs handshake, saves status and timestamp to DB, and returns updated status.
- `POST /api/v1/Integrations/:type/Disconnect`: Revokes tokens, clears config, sets status to `not_configured`.

#### 3. Automatic Status Refresh Mechanism
- On loading `/admin/dashboard` or `/admin/settings`, the frontend queries `GET /api/v1/Integrations/Status`.
- If `last_checked_at` is older than 6 hours, the backend automatically queues a background health probe.
- Whenever an outbound message or email dispatch returns an authentication error (e.g. Meta Error 190 or SMTP 535 Auth Failed), the dispatch service immediately updates `status = 'failed'` with the exact error message.

---

## 7. Missing Features (Gaps Against Requirements R1 to R6)

1. **Dedicated Tenant Profile Page:** Missing completely from frontend. No UI to view or update company details, logo, address, or primary business contacts.
2. **Integration Setup Checklist on Dashboard:** No widget showing new users their onboarding completion status (WhatsApp: Pending, Email: Connected, AI Voice: Not Configured).
3. **IMAP Health Verification:** Email testing only tests SMTP outbound. It never tests IMAP inbound mailbox reading.
4. **Integration Audit History:** No event log of when connections were enabled, revoked, or tested.
5. **Periodic Token Health Polling:** No automated cron to detect expired OAuth access tokens before a campaign failure occurs.

---

## 8. UX Review & Step-by-Step Scores

| Step / Page | UX Score (1-5) | UX Analysis, Strengths & Flaws |
| :--- | :---: | :--- |
| **Step 1: Company Profile** | **4 / 5** | Clean layout, pre-fills email from signup, validates length. Lacks instant company logo upload preview. |
| **Step 2: Location** | **3.5 / 5** | Clear address fields. Lacks auto-lookup by postal code / ZIP. |
| **Step 3: Industry & Workflows** | **4 / 5** | Multi-select pills with nice badges. High visual clarity. |
| **Step 4: Goals** | **3.5 / 5** | Easy checkboxes, but user has no indication of what selecting them actually accomplishes. |
| **Step 5: Tech Comfort** | **3 / 5** | Basic radio buttons. Feels unnecessary given the data is never used. |
| **Step 6: Software Stack** | **3.5 / 5** | Good logo icons (Slack, HubSpot, Gmail), but does not initiate OAuth for any of them. |
| **Step 7: Company Size** | **4 / 5** | Standard tiered buttons; responsive and quick. |
| **Step 8: Discovery Source** | **2.5 / 5** | Marketing survey field placed inside product onboarding; creates user friction. |
| **Step 9: WhatsApp Setup** | **3 / 5** | Excellent Meta Cloud fields. Flaw: Blocks user if they don't have tokens (Skip button needed). |
| **Step 10: Email Mailbox** | **3.5 / 5** | 1-Click Google OAuth is excellent. Flaw: Had redirect loop and failed to show connected email. |
| **Settings Page (`/admin/api`)** | **3 / 5** | Functional for typing API keys. Flaw: No Company Profile section, no unified connection checklist. |
| **Profile Page** | **0 / 5** | **NOT FOUND**. Does not exist in the application. |

---

## 9. Complete Field Audit Table

| Page / Step | Field Name | DB Column & Type | Frontend Validation | Backend Validation | Used at Runtime? | Gaps & Defects |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| Step 1 | `company_name` | `company.name` (varchar 255) | minLength(2), required | minLength(2) | **YES** | Matches. |
| Step 1 | `business_email` | `company.email` (varchar 255) | RFC email regex | RFC email regex | **YES** | Matches. |
| Step 1 | `website` | `company.website` (varchar 255) | URL validation | contains('.') | **YES** | Matches. |
| Step 1 | `logo_url` | `company.onboarding_data` | None | None | **NO** | Dead setting. |
| Step 2 | `address` | `company.address` (text) | required | minLength(3) | **YES** | Merged into address string. |
| Step 2 | `city` | `company.address` (text) | required | minLength(2) | **YES** | Merged into address string. |
| Step 2 | `state` | `company.address` (text) | required | minLength(2) | **YES** | Merged into address string. |
| Step 2 | `pincode` | `company.postal_code` (varchar 20)| required | minLength(3) | **YES** | Matches. |
| Step 3 | `industry` | `company.industry` (varchar 100)| required | None | **YES** | Matches. |
| Step 3 | `selected_services` | `company.onboarding_data` | min(1) | min(1) | **NO** | Dead setting. |
| Step 4 | `goals` | `company.onboarding_data` | min(1) | min(1) | **NO** | Dead setting. |
| Step 5 | `technical_level` | `company.onboarding_data` | None | None | **NO** | Dead setting. |
| Step 6 | `apps` | `company.onboarding_data` | min(1) | min(1) | **NO** | Dead setting. |
| Step 7 | `company_size` | `company.company_size` (varchar 50)| None | None | **YES** | Matches. |
| Step 8 | `discovery_source` | `company.onboarding_data` | None | None | **NO** | Dead setting. |
| Step 9 | `wa_phone` | `whatsapp_config.phone_number` | required | None | **YES** | Matches. |
| Step 9 | `wa_phone_id` | `whatsapp_config.phone_number_id`| required | Unique check | **YES** | Matches. |
| Step 9 | `wa_access_token`| `whatsapp_config.access_token` | required | Encrypted | **YES** | Masked on read. |
| Step 10 | `email_user` | `email_account_config.email_address`| required | None | **YES** | Matches. |
| Step 10 | `email_app_pass`| `email_account_config.smtp_password`| minLength(6) | Encrypted | **YES** | Leaked in `Email/Config`. |

---

## 10. Untestable Items & Prerequisites

| Item | Reason Untestable | Prerequisites to Validate |
| :--- | :--- | :--- |
| **Real Meta Cloud API Token Revocation** | Requires access to Meta App Dashboard to forcibly revoke active system user tokens. | Access Meta Business Suite -> System Users -> Revoke Token -> observe app error state. |
| **Real IMAP Inbound Connection** | Port 993 IMAP TLS testing requires live external mailbox credentials with IMAP enabled. | Provision a dedicated test Google Workspace mailbox with IMAP access enabled. |
| **7-Day Google Refresh Token Expiry** | Google OAuth refresh tokens only expire after 6 months or manual user revocation. | Manually revoke app permissions under Google Account Security settings. |

---

## 11. Suggested Fix Order & Ready-to-Use Next Prompt

### Suggested Fix Order
1. **Fix 1 (Security):** Sanitize `EmailController.getConfig` using `toSafeConfig()` so `client_secret` and `smtp_password` are never leaked.
2. **Fix 2 (Data Integrity):** Add `status`, `last_checked_at`, `last_success_at`, and `error_message` to `whatsapp_config` and `email_account_config`, updating them on every test connection.
3. **Fix 3 (UI / Profile):** Create a dedicated `/admin/profile` component showing Company Profile, Integration Status badges, and configuration actions.
4. **Fix 4 (Dashboard):** Add an Integration Health Checklist widget on `/admin/dashboard` showing pending setup items.

---

### Ready-to-Use Fix Prompt for Module 2
```text
Please fix all Critical, High, and Medium bugs identified in Module 2 (Tenant Onboarding, Connection Status & Profile Page) as detailed in reports/02-onboarding-analysis.md:

1. In Email.controller.ts and Email.service.ts, sanitize getConfig() using a toSafeConfig() method so that client_secret, access_token, and smtp_password are never exposed in API responses.
2. In whatsapp_config and email_account_config entities, add columns for last_checked_at, last_success_at, status ('not_configured' | 'connected' | 'failed'), and error_message. Update testConnection() in both WhatsApp.service.ts and Email.service.ts to save the test outcome and timestamp to the database whether the test succeeds or fails.
3. Build a dedicated Profile & Integrations page component at /admin/profile that displays company details (name, email, website, address, industry) with an edit modal, plus a unified Integrations Status table with live Reconnect, Test, and Disconnect actions.
4. Add an Integration Checklist card to the main Dashboard showing WhatsApp, Email, and Voice connection statuses (Done, Pending, Failed) with direct links to configure them.
```

---

## 12. Remediation Report — Module 2 fixes, before/after proof

### 12.1 Result at a glance

| Suite | Result |
| :-- | :-: |
| Backend API suite — the 17 original checks + 32 new (Tenant A and B, real handshakes against local fakes of Meta / SMTP / IMAP) | **49/49** |
| Background re-check / rate-limit suite (own server with short timers) | **6/6** |
| Saved status survives a real server restart | **1/1** |
| **New code on a database with NO migration applied** (what `nest start --watch` against your remote DB looks like) | **9/9** |
| Wizard answers reach the AI Brain prompt (real `PromptEngineService` + real tenant row) | **5/5** |
| Real-browser suite (Chrome): wizard, profile, dashboard, route guards, mobile drawer | **20/20** |
| Audit matrix: 4 views × desktop/mobile × light/dark = 16 captures | no overflow, no unlabeled input, 0 uncaught JS errors, text ≥ AA in every capture |
| Frontend `tsc` strict + production `vite build`, backend `tsc --noEmit` | clean |

**How "before" was obtained — please read.** For Module 1 I re-ran the untouched code first. For Module 2 I started editing before capturing a baseline of the *new* tests, so that was my process mistake. "Before" in the tables therefore comes from: the original audit's own measurements (`M2-01…17`, marked plainly), the **real data** in your backup (secret inventory, below), a **simulation of the old algorithm** where the bug is an algorithm (`N2-30`), and otherwise a **code-read of the old source** (marked `*`). Nothing in "before" is a guess dressed up as a measurement; nothing marked `*` was re-executed.

### 12.2 How it was verified (and what was NOT touched)

- **Backup first:** `backups/assistant_sharyx_2026-11-05_pre-module2.sql` (read-only `pg_dump`, 45 tables). `backups/` is git-ignored because it holds secrets.
- **Throw-away databases only:** a private local Postgres cluster (port 5433, own data directory) restored from that backup; every non-auth table was emptied before any server started, so no job could act on copied mailboxes/WhatsApp numbers. Test servers :8001/:8002/:8003, test frontend :8071, fakes on :9101–9104. The harnesses refuse to run on anything but loopback + `sharyx_m2*`.
- **Remote database: zero writes.** Only the read-only `pg_dump`.
- The statuses are driven by **real handshakes** against local fakes: a fake Meta Graph API (token name decides 200 / 190 / 503 / hang), a real SMTP server (`smtp-server`) that answers 535 on a wrong password, a fake IMAP server that answers `AUTHENTICATIONFAILED`, and a TCP port that never answers (timeout).
- Reproduce: `node backend/test/module2/module2-regression.cjs main|recheck|restart-pre|restart-post|cleanup` · `compat-premigration.cjs` · `brain-context-check.cjs` · `ui-e2e.cjs` · `before-lost-update-sim.cjs` · `node backend/scripts/encrypt-stored-secrets.cjs status|apply|rollback`.

### 12.3 Item 3 first: the exact list of secrets that were exposed (what to rotate)

**What leaked and to whom.** `GET /Email/Config` (and the response of `POST /Email/Config`) returned the *whole* `email_account_config` row of the caller's tenant. Tenant isolation held (no cross-tenant leak was found), so the exposure is: *any logged-in user of that tenant, plus anything that can see their browser/dev-tools/proxy logs.* The inventory below is from the real rows in your 2026-11-05 backup (types and forms only; no values were printed anywhere).

| Tenant (company) | Mailbox | Secret returned by the API | Form it was in | Rotate? |
| :-- | :-- | :-- | :-- | :-- |
| 646b4abe… Sharyx Enterprise Inc | riyakavi6083@gmail.com (SMTP) | **Google OAuth client secret** (`GOCSPX-…`) | **plain text** | **YES — rotate `GOOGLE_CLIENT_SECRET`** |
| | | **Gmail App Password** | AES-hex (readable with `SECERT_KEY`) | Yes, as a precaution: revoke and re-create the App Password |
| 2cc6ac94… ZOHO | kavipriyaashok12@gmail.com (Google) | **Google OAuth client secret** (`GOCSPX-…`) | **plain text** | **YES — same secret** |
| | | **Google refresh token** | AES-hex | Yes, as a precaution: revoke the app at myaccount.google.com → Security → Third-party access, then reconnect |
| | | **Google access token** (`ya29.…`) | plain text, 1-hour life | No — expired long ago |

Also at rest in the same table but **not served** to any real tenant (the `default` legacy row is excluded by the API): the same kinds of secrets for `riyakavi6083@gmail.com` — treat them as the same credentials.

**Priority:** (1) rotate the **Google OAuth client secret** in Google Cloud Console and update `GOOGLE_CLIENT_SECRET` in `backend/.env.local` (this one was in plain text and is shared by all tenants), (2) the Gmail App Password, (3) the two Google tokens (revoke + reconnect). `SECERT_KEY` itself showed no sign of exposure; **do not rotate it** without re-encrypting stored values first (it protects the AES-hex layer too).

**Not leaked through this bug, but found in plain text at rest** (now encrypted by the code; run the migration script to convert existing rows): WhatsApp access tokens (2 rows), LLM API keys (`wa_ai_config` 1 row, `email_ai_config` 2 rows), voice provider keys (4 rows). They were readable by anyone with database or backup access, so the **backup files in `backups/` are sensitive; delete them when no longer needed.**

**Hardcoded credentials found in source (not fixed here — outside this module, but rotate):** a fallback e-mail + password for the voice SaaS login in `Voice/Providers/SaasFallback.provider.ts` (lines 145–146) and `Voice/Services/VoiceConfig.service.ts` (lines 228–229), and a default seed-admin password in `Database/Seeds/CommonSeeder.service.ts` (line 96). Anyone who read the repository has them.

**Logs checked:** `error_log` (2,606 real rows) — 0 rows contain a token/secret/`access_token=` URL; backend log statements were swept (all secret-bearing ones now go through `redactSecrets`); tests N2-06/N2-07 assert it.

### 12.4 Item by item: what changed, with before/after proof

**P0 — security**

**1. `toSafeConfig()` for email.** `Email.service.ts` `toSafeConfig` is the only shape that leaves the server: ids, provider, host/ports, `has_client_secret`, `has_password`, `has_refresh_token`, `has_access_token`, and `password_hint` (`••••` + last 2 chars, only for long passwords). Used by `GET /Email/Config`, `POST /Email/Config`, and everything under `/Integrations/*`. Test-connection and OAuth responses never contained secrets.
- Before (real data + original audit M2-10): response carried `client_secret` (plain `GOCSPX-…`), the AES-hex `smtp_password`, `refresh_token`, `access_token`.
- After — M2-10: `HTTP 200; secret keys present=false; planted values in body=0; raw DB values in body=0; flags: has_client_secret=true, has_password=true, hint=••••rd`
- After — N2-02: `7 responses scanned, with secrets: 0`

**2. Encryption at rest + safe migration + rollback.** `client_secret`, `smtp_password`, `refresh_token`, `access_token` (and, because they were also plain, the LLM/voice `api_key` columns) use the existing `EncryptedColumn` transformer (`enc:v1:` AES): new writes are encrypted, old plain values stay readable, so the app works **before, during and after** conversion. `backend/scripts/encrypt-stored-secrets.cjs`: dry run by default; `apply --commit` copies originals to `secrets_migration_backup`, encrypts, **decrypts every value again and compares it before COMMIT**; `rollback --commit` restores; `drop-shared-google-secret` removes the platform secret that was copied into each tenant row (the app falls back to `GOOGLE_CLIENT_SECRET`). The code also **stopped copying that shared secret into tenant rows** on Google connect.
- Before (real data): every secret column was plain or only AES-hex; the shared Google secret sat in plain text in all 3 rows.
- After — N2-03: `email smtp_password prefix=enc:v1:; whatsapp access_token prefix=enc:v1:`
- After — N2-04: `plaintext row -> connected; old-AES row -> connected`
- After — N2-05: `dry run left DB untouched=true; after --commit client_secret/access_token encrypted=true/true; SMTP test still connected; rollback restored originals=true; secrets printed by script=0`

**3.** The exposed-secrets list is in 12.3.

**P0 — connection status (R1, R5)**

**4. Unified status.** Table `tenant_integration_status` (migration `1731100000000-IntegrationStatus.sql` + `.down.sql`): `tenant_id, type (whatsapp, whatsapp_webhook, email_smtp, email_imap, llm, voice), status (not_configured|connected|failed|degraded), display_name, last_checked_at, last_success_at, error_code, error_message`. Error texts are plain words and pass through `redactSecrets`. **Works before the table exists** (in-memory fallback, flagged `durable:false`), so `nest --watch` never breaks.
- After — N2-24 (restart): `before restart: connected @2026-11-05T10:17:46.636Z; after: connected @2026-11-05T10:17:46.636Z`

**5. Tenant-scoped Test saves the result on success AND failure; email SMTP and IMAP separate; WhatsApp API and webhook separate.**
- Before (original audit): M2-14 and M2-15 FAILED — nothing was written on failure; email test had no tenant.
- After — M2-14: `row=failed/SMTP_AUTH: "The mail server rejected the username or password. Check them (for Gma" checked=true`
- After — M2-15: `HTTP 400; row=failed/META_TOKEN_INVALID: "WhatsApp rejected the access token (it expired or was revoked). Create a new token in Meta"`
- After — N2-10: `api=connected; db=connected, last_checked_at=true, last_success_at=true, display=+1 555 010 0100`
- After — N2-14: `smtp=connected; imap=failed/IMAP_AUTH: "The inbox (IMAP) rejected the username or password. Check them, and make sure IM"`
- After — N2-18 (webhook): `handshake HTTP 200 -> connected; bad signature -> failed/WEBHOOK_SIGNATURE; valid signature -> connected`
- Also fixed: the email test accepted any password containing "dummy"/"test" as a **fake success** (a made-up "connected" would now be saved as truth) — removed.

**6. Status changes on its own.**
- After — N2-13 (WhatsApp, Meta 190): `send(revoked)=HTTP 400 -> status failed; send(restored)=HTTP 201 -> status connected`
- After — N2-15 (SMTP 535): `send(535)=HTTP 502 -> failed/SMTP_AUTH; send(ok)=HTTP 201 -> connected`
- After — N2-16 (IMAP login failure found by the inbox poll): `after failing poll: failed/IMAP_AUTH; after good poll: connected`
- After — N2-12 (timeout → **Degraded**, not Failed): `status=degraded/META_UNREACHABLE: "We could not reach WhatsApp just now (timeout or Meta outage). It will be checke"`
- After — N2-17 (mail server never answers → Degraded): `HTTP 400; smtp=degraded/SMTP_UNREACHABLE`
- Found and fixed: the inbox poller only ever polled **the first active mailbox of all tenants**, so other tenants' IMAP status could never update. Polling every mailbox is now available but **opt-in** (`EMAIL_POLL_ALL_MAILBOXES=true`), because turning it on makes your dev server read and auto-reply on every connected mailbox; default behaviour is unchanged.

**7. Safe background re-check.** On `GET /Integrations/Status`, integrations whose `last_checked_at` is older than **6 hours** (`INTEGRATIONS_STALE_MS`) are queued as **one** background run per tenant, on a single global lane, at most once per cooldown (default 10 min, `INTEGRATIONS_RECHECK_COOLDOWN_MS`), 50 tenants max in the queue; the response never waits for it.
- After — RC-01: `Meta calls +1, SMTP logins +1 (expected +1 each); IMAP check time advanced=true (IMAP logins +1 incl. the 15 s poller); 'checking' flag shown=true`
- After — RC-03: `Meta calls +0 (expected +0)`
- After — RC-06: `status=failed/META_TOKEN_INVALID: "WhatsApp rejected the access token (it expired or was revoked). Create"`
- (Tested with a 4 s window so it can be observed; the 6 h default is the code constant.)

**8. Disconnect.** Erases the credentials (WhatsApp token/app-secret/api-key; email password/tokens/secrets), switches the mailbox off, sets `not_configured`, and sending is refused; Reconnect works.
- Before: old WhatsApp disconnect only flipped `is_connected`, kept the token, and `sendMessage` never checked it; email disconnect kept the SMTP password and the mailbox active (code-read).
- After — N2-20: `token erased=true; status=not_configured; send after disconnect=HTTP 400 (Meta sends unchanged=true); reconnect -> connected`
- After — N2-21: `secrets erased=true, active=false; status=not_configured/not_configured; send after disconnect=HTTP 500; reconnect -> connected`

**P1 — API and UI**

**9. API.** `GET /Integrations/Status`, `POST /Integrations/:type/Test`, `POST /Integrations/:type/Disconnect` (+ `GET/PUT /Profile`). Tenant from the token only (spoofed header/query ignored); unknown `:type` → 400; no secrets in any response.
- After — N2-22: `B sees A's data=false; spoofed header answered for tenant B (ignored spoof); A's mailbox still active after B's disconnect=true`
- After — N2-40: `statuses=[401,401,401,401,401,401,401,401,401]`

**10. `/admin/profile`** (sidebar: "Company Profile & Integrations"). Company details with edit (name, email, website, address, postal code, industry, size, logo link) + WhatsApp (API and webhook), Email (SMTP and IMAP), AI key, Voice: status badge (colour **+ icon + text**), number/mailbox, last-checked time, plain reason, **Test again / Edit / Reconnect / Disconnect (with confirmation)**; keys show **"saved"**, never a value. AI key and Voice "Edit" open the existing AI Brain / Voice pages (not re-implemented here).
- After — UI-M2-10…16 (browser): see 12.6. Screenshots: `reports/assets/module2-ui/`.

**11. Dashboard Setup Checklist.** Done / Pending / Failed per item with a button to the exact fix (`/onboarding?step=9`, `/admin/profile#whatsapp`, …). It follows the saved status live: polling (faster while a check runs) + updates pushed from other pages and other browser tabs (BroadcastChannel).
- After — UI-M2-09: `email=pending ("Email (sending + inbox)Pending Skipped during setup. Connect a mailbox to send and read em"), whatsapp=done`
- After — UI-M2-11: `dashboard tab now shows WhatsApp = failed`

**12. Wizard steps 9 and 10.** Skip on both existed; they now **record** `whatsapp_skipped` / `email_skipped` (and the server re-derives them from reality at Complete). After a connect (pass or fail) the wizard shows the **saved backend status** (badge, number/mailbox, last checked, reason), loaded on mount so it survives reload, re-login and another browser. Non-secret fields are restored after reload; a saved token is kept when the box is left empty.
- Google redirect: the wizard/profile remember where the connection was started (`sessionStorage`) and the callback returns there (step 10 shows the connected address; the old behaviour — silently completing onboarding and jumping to the dashboard — is kept only when the origin is unknown). A real Google round-trip cannot be run without Google; its error paths and the "connected address is shown" state (from a stored connection) were tested.
- After — UI-M2-03/04/04b/05/06/08: `panel: "WhatsApp · +15550100100 Failed Saved status · last checked just now WhatsApp rejected the access token (it expired or was revoked)" | db row: ` · `phone="+15550100100", phone id restored=true, token box="", placeholder="•••••••• saved - leave empty to keep it"`
- After — UI-M2-06 (double-click): `shows: Step 10 of 10`

**P2 — wizard data**

**13. Dead data — option (a) implemented for the safe part, decision requested for the rest.** `industry`, the selected workflows (`selected_services`), `goals` and `apps` are now fed into the AI Brain prompt (real-code proof 5/5 in `brain-context-check.cjs`; the hard-coded "Sharyx" service list is used only when a tenant has no answers). **I did not change which wizard steps are required** (you asked me to ask first). Still unused after this change: **Step 5 "Tech comfort"** (`technical_level`), **Step 8 "How did you hear about us"** (`discovery_source`) and the logo link in Step 1. My recommendation: **remove Step 5; make Step 8 optional or move it to a post-signup survey; keep the rest.**
- After — M2-17: `PromptEngine reads industry/selected_services/goals/apps (runtime proof: brain-context-check.cjs)`

**14. DTO validation** on every onboarding/integration/profile endpoint, plus the Email/WhatsApp config save/test routes (the global pipe is not strict, and 84 of 212 DTO properties elsewhere would be stripped by a global `whitelist`, so the strict pipe is opted in per route): lengths, formats, enums, `step` 1–10, `onboarding_data` ≤ 32 KB, ≤ 30 list items, NUL bytes, unknown fields dropped.
- After — N2-36: `160 hostile requests, 5xx=0`
- After — N2-37: `{"name300":400,"goals100":400,"provider":400,"authMode":400,"boolFlag":400,"big":400,"port":400,"host":400,"waProv":400,"type":400,"web":400,"logo":400}`
- After — N2-38: `keys stored: website,company_name,business_email`

**Concurrency / re-entry (the tests you asked for that the first audit skipped)**
- Two tabs at once — Before (simulating the old read-merge-write): **an answer was lost in 14 of 20 trials.** After — N2-30: `30 parallel saves (3 steps x 10 tabs): statuses ok=true; step1/2/3 answers all present=true; furthest step=4`
- Double-click Next — API: N2-31 `10 parallel: all 200=true; step=2`; browser: UI-M2-06 (exactly one step).
- Complete twice — N2-32: `4 parallel + 1 later: statuses=[201,201,201,201,201]`
- Edit after Complete — N2-33: `save=200; completed=true; profile name=Acme Renamed`
- Route guards (browser) — UI-M2-17: `logged-out profile -> /login; logged-out dashboard -> /login; finished tenant /onboarding -> /admin; unfinished /admin/profile -> /onboarding`
- Status after reload / re-login / another browser — UI-M2-04, N2-23, N2-24, UI-M2-11; Tenant A never visible to Tenant B — N2-22, UI-M2-18.

### 12.5 Full before / after table (backend)

Legend — **Before:** `PASS`/`FAIL` = measured by the original audit; `FAIL*`/`PASS*` = from reading the old source (not re-run); `(real data)` = from your backup; `(sim)` = simulation of the old algorithm; `n/a` = the feature did not exist.

| ID | Test | Before | After |
| :-- | :-- | :-- | :-: |
| M2-01 | Onboarding State without JWT -> 401 | PASS | ✅ PASS |
| M2-02 | Tenant A sees its own state | PASS | ✅ PASS |
| M2-03 | Tenant B sees its own state | PASS | ✅ PASS |
| M2-04 | x-tenant-id / ?tenantId spoof ignored | PASS | ✅ PASS |
| M2-05 | Invalid step 0 -> 400 | PASS | ✅ PASS |
| M2-06 | Invalid step 11 -> 400 | PASS | ✅ PASS |
| M2-07 | Invalid step "abc" -> 400 | PASS | ✅ PASS |
| M2-08 | Complete with missing required steps -> 400 | PASS | ✅ PASS |
| M2-09 | WhatsApp config never returns the token | PASS | ✅ PASS |
| M2-10 | GET /Email/Config returns no secrets (planted legacy secrets in the DB row) | FAIL | ✅ PASS |
| M2-11 | OAuth Status endpoint answers | PASS | ✅ PASS |
| M2-12 | WhatsApp Test-Connection with empty credentials -> 400 | PASS | ✅ PASS |
| M2-13 | Email Test-Connection with a wrong password -> 400 with a clear reason | PASS | ✅ PASS |
| M2-14 | Failed email test is SAVED (status, reason, timestamp) | FAIL | ✅ PASS |
| M2-15 | Failed WhatsApp test is SAVED (status, reason, timestamp) | FAIL | ✅ PASS |
| M2-16 | Profile page exists (route + sidebar link + page) | FAIL | ✅ PASS |
| M2-17 | Wizard answers are consumed by the AI Brain prompt | FAIL | ✅ PASS |
| N2-01 | POST /Email/Config response contains no secrets | FAIL* | ✅ PASS |
| N2-02 | Every integration API response is secret-free (Status, Test, Disconnect-safe shapes) | FAIL* | ✅ PASS |
| N2-03 | Secrets are encrypted at rest after a save through the API | FAIL (real data) | ✅ PASS |
| N2-04 | Legacy PLAINTEXT / old-AES rows still work (read tolerance) - app works before migration | PASS* | ✅ PASS |
| N2-05 | Migration script: dry run changes nothing; --commit encrypts; app still works; rollback restores | n/a | ✅ PASS |
| N2-06 | Server log and error_log contain none of the planted secrets | PASS (real data) | ✅ PASS |
| N2-07 | Access token in a URL is redacted in error_log | FAIL* | ✅ PASS |
| N2-10 | WhatsApp test OK -> Connected is saved with timestamps | FAIL* | ✅ PASS |
| N2-11 | Revoked token on re-test -> Failed + plain reason (no token in it) | FAIL* | ✅ PASS |
| N2-12 | Timeout -> Degraded (temporary), not Failed | FAIL* | ✅ PASS |
| N2-13 | Real SEND with a revoked token flips to Failed; the next send that works flips back to Connected | FAIL* | ✅ PASS |
| N2-14 | SMTP and IMAP are tested and saved SEPARATELY | FAIL* | ✅ PASS |
| N2-15 | SMTP 535 on a real send -> Failed; later send works -> Connected | FAIL* | ✅ PASS |
| N2-16 | Inbox poll failing to log in (IMAP) -> Failed automatically; works again -> Connected | FAIL* | ✅ PASS |
| N2-17 | Mail server that never answers -> Degraded (not Failed) | FAIL* | ✅ PASS |
| N2-18 | WhatsApp webhook is its own status (handshake -> Connected, bad signature -> Failed, good -> Connected) | n/a | ✅ PASS |
| N2-19 | LLM key: good -> Connected, wrong key -> Failed (separate integration) | n/a | ✅ PASS |
| N2-20 | WhatsApp Disconnect: credentials erased, not_configured, sending refused; Reconnect works | FAIL* | ✅ PASS |
| N2-21 | Email Disconnect: credentials erased, mailbox off, not_configured, sending refused; Reconnect works | FAIL* | ✅ PASS |
| N2-22 | Tenant A status/errors never visible to tenant B; B cannot test or disconnect A | n/a | ✅ PASS |
| N2-23 | Status identical after re-login (new token) | n/a | ✅ PASS |
| N2-24 | Saved status survives a server restart | n/a | ✅ PASS |
| N2-30 | Two tabs saving at once do not lose each other's answers | FAIL (sim: 14/20 lost) | ✅ PASS |
| N2-31 | Double-click Next (same step 10x in parallel) is harmless | PASS* | ✅ PASS |
| N2-32 | Complete twice in parallel -> one completion, no error | PASS* | ✅ PASS |
| N2-33 | Editing after Complete keeps it completed and updates the profile | PASS* | ✅ PASS |
| N2-34 | Skipped steps are recorded on the server and show as Pending (not Done) on the checklist | FAIL* | ✅ PASS |
| N2-35 | Checklist reflects reality: done / failed / pending, each with an action | n/a | ✅ PASS |
| N2-36 | Hostile input never gives a 500 (onboarding, integrations, email/WhatsApp config, profile) | not measured | ✅ PASS |
| N2-37 | Length / format / enum / size limits are enforced with a 400 | FAIL* | ✅ PASS |
| N2-38 | Unknown body fields are dropped (whitelist) and secrets never reach onboarding_data | PASS* | ✅ PASS |
| N2-39 | Profile GET/PUT works, validates, and only ever touches the caller's own company | FAIL* | ✅ PASS |
| N2-40 | Unauthenticated calls to every new endpoint -> 401 | PASS* | ✅ PASS |
| RC-01 | Stale status (>window) + 8 rapid page loads => ONE background check per tenant | n/a | ✅ PASS |
| RC-02 | The background run refreshed last_checked_at | n/a | ✅ PASS |
| RC-03 | Rate limit: asked again inside the cooldown => no extra Meta call | n/a | ✅ PASS |
| RC-04 | After the cooldown the next stale load is checked again (once) | n/a | ✅ PASS |
| RC-05 | Status newer than the window is not re-checked | n/a | ✅ PASS |
| RC-06 | Credentials revoked behind our back => the automatic re-check flips WhatsApp to Failed | n/a | ✅ PASS |

### 12.6 Real-browser results (Chrome, headless) and UX scores

| ID | Browser check (Chrome) | After |
| :-- | :-- | :-: |
| UI-M2-01 | Wizard resumes at the saved step (server state, not browser state) | ✅ PASS |
| UI-M2-02 | ?step=9 deep link (used by the dashboard checklist) opens WhatsApp step | ✅ PASS |
| UI-M2-03 | Failed connect shows the SAVED backend status + simple reason (not a local guess) | ✅ PASS |
| UI-M2-04b | After reload the non-secret WhatsApp fields are restored and the saved token is NOT shown | ✅ PASS |
| UI-M2-04 | After a page reload the Failed status and reason are still shown (loaded from the server) | ✅ PASS |
| UI-M2-05 | Fixing the token and testing again flips the saved status to Connected | ✅ PASS |
| UI-M2-06 | Double-clicking Continue advances exactly ONE step | ✅ PASS |
| UI-M2-07 | Step 10 has a Skip button (and Step 9 had one) | ✅ PASS |
| UI-M2-08 | Skipping Step 10 records email_skipped on the server and completes onboarding | ✅ PASS |
| UI-M2-09 | Dashboard checklist: skipped Email = Pending (not Done); connected WhatsApp = Done | ✅ PASS |
| UI-M2-10 | Profile page is linked in the sidebar and opens at /admin/profile | ✅ PASS |
| UI-M2-11 | Dashboard checklist updates by itself after a test in another tab (no manual refresh) | ✅ PASS |
| UI-M2-12 | Profile page shows the failed WhatsApp card with a simple reason, last-checked time and Reconnect | ✅ PASS |
| UI-M2-13 | Saved keys are never shown: the token box is empty with "saved" placeholder, type=password | ✅ PASS |
| UI-M2-14 | Reconnect: new token -> card turns Connected | ✅ PASS |
| UI-M2-15 | Disconnect (with confirmation) erases the saved token and the card shows Not connected | ✅ PASS |
| UI-M2-16 | Company profile edit: invalid website is refused with a message; valid save shows the new values | ✅ PASS |
| UI-M2-17 | Route guards: logged-out /admin/profile and /admin/dashboard -> /login; finished tenant on /onboarding -> /admin; unfinished tenant on /admin/profile -> /onboarding | ✅ PASS |
| UI-M2-18 | Tenant B's profile/integrations page never shows Tenant A's company or mailbox | ✅ PASS |
| UI-M2-19 | Mobile: sidebar is a drawer (hidden, opens from the menu button, closes after choosing a page) | ✅ PASS |

**Audit matrix** (automated: overflow, WCAG contrast of the *new* UI only, labels, JS errors):

| View | Viewport | Theme | Horizontal overflow | Lowest text contrast in NEW UI (AA = 4.5) | Unlabeled inputs | Uncaught JS errors |
| :-- | :-- | :-: | :-: | :-: | :-: | :-: |
| Wizard step 9 (WhatsApp) | desktop | light | none | None:1 ✅ | 0 | 0 |
| Wizard step 9 (WhatsApp) | desktop | dark | none | None:1 ✅ | 0 | 0 |
| Wizard step 9 (WhatsApp) | mobile | light | none | None:1 ✅ | 0 | 0 |
| Wizard step 9 (WhatsApp) | mobile | dark | none | None:1 ✅ | 0 | 0 |
| Wizard step 10 (Email) | desktop | light | none | None:1 ✅ | 0 | 0 |
| Wizard step 10 (Email) | desktop | dark | none | None:1 ✅ | 0 | 0 |
| Wizard step 10 (Email) | mobile | light | none | None:1 ✅ | 0 | 0 |
| Wizard step 10 (Email) | mobile | dark | none | None:1 ✅ | 0 | 0 |
| Profile page | desktop | light | none | 4.8:1 ✅ | 0 | 0 |
| Profile page | desktop | dark | none | 5.2:1 ✅ | 0 | 0 |
| Profile page | mobile | light | none | 4.8:1 ✅ | 0 | 0 |
| Profile page | mobile | dark | none | 5.2:1 ✅ | 0 | 0 |
| Dashboard checklist | desktop | light | none | 4.8:1 ✅ | 0 | 0 |
| Dashboard checklist | desktop | dark | none | 5.2:1 ✅ | 0 | 0 |
| Dashboard checklist | mobile | light | none | 4.8:1 ✅ | 0 | 0 |
| Dashboard checklist | mobile | dark | none | 5.2:1 ✅ | 0 | 0 |

**UX scores** — my judgement from the measured numbers above plus looking at the screenshots (not user research). Rubric (5 points): clarity of status and next action (1), loading/error/success/empty states (1), responsive layout without overflow and with usable tap targets (1), contrast in light and dark (1), accessibility labels and keyboard/dialog behaviour (0.5), recovery path from an error (0.5).

| Screen | Desktop light | Desktop dark | Mobile light | Mobile dark | Overall | Why not 5 |
| :-- | :-: | :-: | :-: | :-: | :-: | :-- |
| **Wizard, steps 9–10** | 4.0 | 3.8 | 3.8 | 3.6 | **3.8 / 5** | Pre-existing: green button text 2.5:1 and grey helper text 3.8–4.0:1 (below AA), a 10-step flow with a marketing question (Step 8), toasts cover the step counter. Fixed this round: button text spilled out of its button on phones, phone fields collided on phones, form came back empty after reload. |
| **Profile & integrations** | 4.6 | 4.6 | 4.4 | 4.4 | **4.5 / 5** | AI key and Voice "Edit" leave the page instead of editing inline; long scroll on a phone. |
| **Dashboard checklist** | 4.5 | 4.5 | 4.4 | 4.4 | **4.5 / 5** | Takes a screen of height on a phone (it collapses with one tap); the dashboard below it still has pre-existing low-contrast labels. |

Mobile also needed a real fix outside this module's pages: the admin sidebar was a fixed 256 px column with no phone mode, leaving ~130 px for content. It is now an off-canvas drawer below `md` (test UI-M2-19).

### 12.7 Status per original bug and per request item

| # | Item / bug | Status |
| :-- | :-- | :-- |
| Bug 1 | Secret exposure in `GET /Email/Config` | **Fixed** |
| Bug 2 | Connection results never persisted | **Fixed** |
| Bug 3 | No Profile page | **Fixed** |
| Bug 4 | Dead wizard data | **Partly fixed** (goals / industry / workflows / apps now used) — **Open: your decision on Steps 5 and 8** |
| Bug 5 | Skips not recorded | **Fixed** |
| R1–R6 | Requirements | **All met** (R1 status saved · R2 saved status shown after reload/re-login · R3 checklist · R4 profile · R5 automatic status · R6 no secrets) |
| 1–12, 14 | Request items | **Fixed** (12: real Google round-trip untestable here; 10: AI/Voice edit is a link-out) |
| 13 | Dead data | **Deferred** — implemented (a) for the safe fields; required steps untouched until you choose |
| 3 | Exposed secrets list | **Delivered** (12.3) — rotation is yours |

**Open / found along the way (not fixed here):** hardcoded fallback credentials in voice code and the seeder (12.3) · other pre-existing contrast problems (green button 2.5:1, sidebar micro-badges 1.5–2.6:1, dashboard muted labels) · voice key mask shows the first and last 4 characters · IMAP reuses the SMTP username/password (there are no separate IMAP credential columns) · other admin pages' mobile layouts were not audited (only the four views above) · polling all tenants' mailboxes is opt-in (decision needed) · the Voice test and LLM test call vendor URLs that I could only fake for OpenAI/Gemini.

### 12.8 Deployment checklist (nothing below was run on the remote DB)

1. **Nothing is required first** — the new backend works on your current schema (proven, 9/9). When convenient: `psql -f backend/migrations/1731100000000-IntegrationStatus.sql` (idempotent; makes statuses durable).
2. **Encrypt existing secrets:** `cd backend && node scripts/encrypt-stored-secrets.cjs status`, then `apply` (dry run), then `apply --commit`. Keep the backup table until you have run the app once. Optionally `drop-shared-google-secret --commit` **after** rotating `GOOGLE_CLIENT_SECRET`.
3. **Rotate** the items in 12.3.
4. Decide `EMAIL_POLL_ALL_MAILBOXES` (off by default).
5. `INTEGRATIONS_STALE_MS` (default 6 h) and `INTEGRATIONS_RECHECK_COOLDOWN_MS` (default 10 min) are tunables; `WHATSAPP_GRAPH_URL`, `LLM_OPENAI_BASE_URL`, `LLM_GEMINI_BASE_URL` exist only so tests can point at fakes.
6. Note: because your dev backend runs `nest start --watch`, it already runs this code. **Opening the dashboard there will now run real, read-only handshakes** (WhatsApp Graph lookup, SMTP verify, IMAP login) for your tenants' saved credentials, at most once per 10 minutes per tenant.

### 12.9 Files changed / added

**Backend new:** `Service/Integrations/{IntegrationStatus,Integrations.service}.ts`, `Controller/Integrations/Integrations.controller.ts`, `Module/Integrations.module.ts`, `Service/Onboarding/Profile.service.ts`, `Model/Integrations/Integrations.model.ts`, `Model/Onboarding/Onboarding.model.ts`, `Helper/{Redact,StrictValidation}.ts`, `migrations/1731100000000-IntegrationStatus{,.down}.sql`, `scripts/encrypt-stored-secrets.cjs`, `test/module2/*`.
**Backend modified:** `Email/Services/{Email,EmailImap}.service.ts`, `Email/Controllers/Email.controller.ts`, `Email/Models/EmailAccountConfig.model.ts`, `WhatsApp/Services/{WhatsApp,WhatsAppWebhook,PromptEngine}.service.ts`, `WhatsApp/Controllers/WhatsApp.controller.ts`, `WhatsApp/Models/WhatsAppConfig.model.ts`, `Service/Onboarding/Onboarding.service.ts`, `Controller/Onboarding/Onboarding.controller.ts`, `Database/Table/{Email/EmailAccountConfig,Email/EmailAIConfig,WhatsApp/WhatsAppAIConfig,Voice/VoiceProviderConfig}` (encrypted columns), `Helper/{Exception.helper,Logging.interceptor}.ts` (redaction), `app.module.ts`.
**Frontend new:** `service/integrationsService.ts`, `components/integrations/{StatusBadge,SetupChecklist}.tsx`, `pages/profile/ProfilePage.tsx`. **Modified:** `pages/onboarding/OnboardingWizard.tsx`, `pages/admin/{AdminLayout,AdminDashboard}.tsx`, `pages/auth/OAuthCallback.tsx`.
Nothing was committed — your working tree also holds a lot of your own uncommitted work.

### 12.10 Cleanup

Test users, companies, statuses, configs and the scratch databases live only in the throw-away local cluster; they are removed and the cluster is deleted (see the hand-off message for the final counts). The remote database received no test data.
