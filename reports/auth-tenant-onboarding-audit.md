# Auth / Multi-Tenant / Onboarding / WhatsApp Automation Audit

**Scope:** `workforce_Sharyx` monorepo (NestJS 11 + TypeORM/Postgres backend in `backend/`, React/Vite frontend in `frontend/`).
**Method:** Static code review of every file in the auth, tenant-resolution, onboarding and WhatsApp paths, plus live dynamic testing against an **isolated scratch database** (`audit_scratch`, dropped/recreated for this audit, running on port 8099 — the real dev DB `ai_workforce` was never touched). No source files were modified. Tests used two freshly-signed-up tenants ("Tenant A" / "Tenant B") created through the real signup API.
**Repo state tested:** branch `02/11/ui_corrections` @ `6d5dd8c3`.

---

## 1. Summary

| Area | Status | Why |
|---|---|---|
| Sign Up (email + OTP) | **Partial** | Flow works and OTP is real, but OTP store is in-memory (lost on restart/multi-instance), and OTP is leaked back in the API response (`debugOtp`) whenever the Ethereal fallback path fires. |
| Sign In (email) | **Partial** | Login works, bcrypt-less reversible encryption is used for passwords, and a **hardcoded backdoor password** (`Login123!!` / `Password123!`) authenticates as Super Admin for specific emails regardless of the real password. |
| Onboarding (logic) | **Fail** | The 10-step wizard never creates a tenant/company record and never persists almost any of the data the user enters (industry, goals, address, company size, etc. all vanish). Only WhatsApp config and Email config are persisted, and both are saved to a **shared "default" tenant bucket**, not the signed-up user's own tenant. |
| Onboarding (UI & stored data) | **Fail** | Every field in the wizard is pre-filled with realistic-looking **hardcoded dummy data** (`Sharyx Client Corp`, `100 Innovation Way…`, `+1 555 019 2831`, a fake WhatsApp access token, a fake Gmail app password) rather than being empty or loaded from the DB. A careless user can submit the wizard without touching anything and it "succeeds" with fabricated data. |
| WhatsApp connection | **Fail** | `WhatsAppConfig` is effectively a **single global row** in practice: the controller never threads a tenant id to the service, so every tenant's "Connect WhatsApp" reads/writes the same `tenant_id` bucket. Tenant B's save silently overwrote Tenant A's live credentials (phone, WABA ID, access token). |
| Tenant isolation | **Fail** | Confirmed cross-tenant read, cross-tenant write, and cross-tenant delete across Leads, Customers, and WhatsApp config in a live test with two real signed-up tenants. The JWT issued at signup and at login does **not** vary per tenant — every normal user receives the one hardcoded company UUID `646b4abe-e6de-401b-ba33-46884bf3f6e6` baked into `AuthService`. |

---

## 2. Test Results

All tests run live against the app on `localhost:8099` with `DB_NAME=audit_scratch` (fresh DB, migrations/sync applied, seed run). Two tenants created via the real `/Auth/SendSignupOtp` → `/Auth/VerifySignupOtp` flow:

- Tenant A: `tenant.a@example.test`, password `a`, company name "Alpha Corp"
- Tenant B: `tenant.b@example.test`, password `BobPass#12345`, company name "Beta Inc"

| # | Test | Steps | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1 | Unauthenticated access to business data | `GET /api/v1/WhatsApp/Config`, `/WhatsApp/Conversations`, `/Lead/List`, `/Customer/List`, `/Email/Config`, `/AiAgents` with **no Authorization header** | 401 Unauthorized | **200 OK**, full data returned for every one of these endpoints, including the live WhatsApp `access_token` and `verify_token` in `/WhatsApp/Config` | **Fail** |
| 2 | Signup A | SendSignupOtp → OTP from server log/`debugOtp` → VerifySignupOtp with `company_name: "Alpha Corp"` | New company "Alpha Corp" created, user linked to it, tenant-scoped JWT issued | User row created correctly, but JWT's `tenant_id` = `646b4abe-e6de-401b-ba33-46884bf3f6e6` (hardcoded), and **no company row for "Alpha Corp" was ever created** — `company` table still has exactly the 1 seeded row | **Fail** |
| 3 | Signup B | Same as above with "Beta Inc" | New, distinct company created | Same hardcoded tenant id as Tenant A; no "Beta Inc" row created | **Fail** |
| 4 | Duplicate signup | `SendSignupOtp` again for Tenant A's email | Clear "already exists" error | Correctly rejected: `"An account with this email already exists. Please log in."` | **Pass** |
| 5 | Invalid email format | `SendSignupOtp({email:"not-an-email"})` | 400-class validation error | Rejected with `"Please provide a valid email address"` (returned as HTTP 500, not 400 — see Issue I-07) | **Partial** |
| 6 | Correct login | `Login(tenant.a, "a")` | 200/201, valid JWT, correct user profile | Returned correct profile **but** `company_name: "BoilerPlate"` (the one seeded company, not "Alpha Corp" entered at signup) and `tenant_id` = that seeded company's real UUID (`ValidateUser` looks up a *real* company row, ignoring the tenant actually created at signup — because none was) | **Fail** |
| 7 | Wrong password | `Login(tenant.a, "wrong")` | 401 "Invalid password" | `"Invalid password"` returned, but as **HTTP 500** instead of 401 | **Partial** |
| 8 | Unknown email | `Login(nobody@example.test, x)` | 401/404 generic error | `"Invalid email id"` as HTTP 500 — also an **email-enumeration oracle** (different message than wrong-password case) | **Partial/Fail (enumeration)** |
| 9 | Brute force login | 30 consecutive wrong passwords for Tenant A, then 1 correct | Lockout/rate-limit kicks in after N attempts | **No lockout whatsoever.** All 30 attempts processed immediately; correct login succeeded right after | **Fail** |
| 10 | Create Lead as Tenant A | `POST /Lead/Insert` as A | Lead saved with Tenant A's unique tenant_id | Lead saved with `tenant_id: "default"` (not even Tenant A's JWT tenant id) | **Fail** |
| 11 | **Cross-tenant read** | `GET /Lead/List` as Tenant B | Tenant B should not see Tenant A's lead | Tenant B's list **returned Tenant A's lead** (`"Lead of A"`) | **Fail — confirmed leak** |
| 12 | **Cross-tenant read, no token** | `GET /Lead/List` with no Authorization header at all | 401 | Returned the same lead list, **no auth required** | **Fail — confirmed leak** |
| 13 | **Cross-tenant direct-ID read** | `GET /Lead/ById/<A's lead id>` as Tenant B | 403/404 | 200, full lead returned | **Fail — confirmed leak** |
| 14 | **Cross-tenant write** | `PUT /Lead/Update/<A's lead id>` as Tenant B, body `{name:"HACKED by B"}` | 403 | 200, lead renamed; verified visible to unauthenticated `GET` immediately after | **Fail — confirmed cross-tenant tamper** |
| 15 | **Cross-tenant delete** | `DELETE /Lead/Delete/<A's lead id>` as Tenant B | 403 | 200, deleted | **Fail — confirmed cross-tenant destructive action** |
| 16 | Cross-tenant customer list | `POST /Customer/Insert` as A, then `GET /Customer/List` as B | B sees 0 | B sees 1 (A's customer) | **Fail — confirmed leak** |
| 17 | **WhatsApp config cross-tenant overwrite** | A saves WA config (`PNID_TENANT_A`, token `EAAG_SECRET_TOKEN_OF_A`); B then saves WA config (`PNID_TENANT_B`, token `EAAG_SECRET_TOKEN_OF_B`); A re-reads | A should still see its own config | A's `GET /WhatsApp/Config` now returns **Tenant B's** `phone_number_id` and plaintext `access_token` | **Fail — confirmed credential leak + overwrite** |
| 18 | WhatsApp config, unauthenticated | `GET /WhatsApp/Config` with no token | 401 | 200, including the **live plaintext access token** and `verify_token` for whichever tenant last saved | **Fail — critical leak** |
| 19 | WhatsApp webhook → tenant mapping | Sent inbound messages for `phone_number_id` = `PNID_TENANT_A`, `PNID_TENANT_B`, and an unrecognized id | Each message should be attributed to the matching tenant; unknown id rejected | All three messages were stored with `tenant_id = "default"`; the unrecognized `phone_number_id` was **accepted and processed identically**, including triggering an AI auto-reply attempt | **Fail** |
| 20 | WhatsApp webhook handshake | `GET /WhatsApp/Webhook?hub.verify_token=sharyx_verify_token_secure` | Should only verify for the tenant that owns that specific token | Succeeded using the **default/shared verify token** baked into the entity's `@Column` default, independent of which tenant's number was targeted | **Fail** |
| 21 | Outbound send after cred overwrite | Webhook triggers auto-reply send | Uses the tenant's own token | Used whichever token was last saved globally (confirmed via server log: "Meta Access Token has expired" fired identically for all three conversations, i.e. one shared config object is used for all sends) | **Fail** |
| 22 | Google OAuth — forged credential (no real Google proof) | `POST /Auth/GoogleAuth({email: "tenant.a@example.test"})` with no `code`/`credential` | Rejected — no identity proof supplied | **201, valid JWT issued for Tenant A** — the endpoint trusts a caller-supplied `email` field with zero verification when `code`/`credential` are absent | **Fail — critical account takeover** |
| 23 | Google OAuth — forged unsigned JWT-shaped credential | `POST /Auth/GoogleAuth({credential: "x.<base64 email B>.y"})` | Rejected — signature not verified | **201, valid JWT issued for Tenant B** — `googleAuth()` base64-decodes the middle segment of `credential` and trusts the `email` field **without verifying the JWT signature or issuer** | **Fail — critical account takeover** |
| 24 | `x-tenant-id` header spoof (Email module) | `GET /Email/Config` as Tenant B with `x-tenant-id: anything` | Header should be ignored for a non-super-admin, or rejected | Accepted silently (empty result because no config existed yet, but the controller reads this header from any caller — see Issue I-04) | **Fail (by design flaw, not by observed data leak in this case)** |
| 25 | Seeded/backdoor password | `Login(admin@user.com, "Login123!!")` | Should fail — this is not the real password on record | **201, logs in as "Super Admin"** | **Fail — confirmed hardcoded backdoor credential** |
| 26 | Admin-only endpoint via normal user token | `GET /User/List` as Tenant A (non-admin-provisioned, just a normal signup user) | 403 Forbidden | Returned HTTP 500 (`invalid input syntax for type uuid: "0"`) rather than a clean 403 — endpoint is reachable, just happens to error on a `Not('0')` id filter bug, not on a real authorization check | **Fail (authorization gap masked by a bug)** |

---

## 3. Issues

### Critical

**C-01. Hardcoded tenant ID baked into auth — every tenant is really one tenant.**
`backend/src/Service/Auth/Auth.service.ts:36-39, 69-71` (login) and `:241-247` (signup) and `:388-394` (Google auth):
```ts
const primaryCompany =
  allCompanies.find((c) => c.id === '646b4abe-e6de-401b-ba33-46884bf3f6e6') ||
  allCompanies.find((c) => (c.name || '').toLowerCase().includes('sharyx')) ||
  allCompanies[0] ||
  ({ id: '646b4abe-e6de-401b-ba33-46884bf3f6e6', name: 'Sharyx Enterprise Inc' } as any);
...
const tenantId = '646b4abe-e6de-401b-ba33-46884bf3f6e6';
```
Every signed-up user — regardless of the "company_name" they entered during onboarding — is issued a JWT with the same hardcoded `tenant_id`/`company_id`. Signup never creates a `company` row at all. This is the root cause of essentially every tenant-isolation failure below. **Why it matters:** multi-tenancy does not exist; there is functionally one shared tenant for every signup.
**Fix (describe only):** On signup, create a real `company` row scoped to the new user's entered company name/industry, persist `user.company_id`, and derive `tenant_id` in the JWT strictly from that new row — never from a constant.

**C-02. Cross-tenant data leak/tamper/delete confirmed live (Leads, Customers).**
`backend/src/Service/Lead/Lead.service.ts:29,73` (`getAll`, `getById`) and `backend/src/Service/Customer/Customer.service.ts:29-35`:
```ts
const tenantId = userContext?.active_tenant_id || userContext?.tenant_id || "default";
...
if (tenantId && tenantId !== "default") {
  query.andWhere("(l.tenant_id = :tenantId OR l.tenant_id = 'default' OR l.tenant_id IS NULL)", { tenantId });
}
```
Because every record is actually saved with `tenant_id: "default"` (see C-03), and the filter explicitly OR's in `'default'`/`NULL` rows regardless of the caller's tenant, **every tenant sees every other tenant's leads and customers.** Confirmed: Tenant B read, edited (`PUT /Lead/Update/:id` → renamed to "HACKED by B"), and deleted Tenant A's lead; unauthenticated requests (no JWT at all) could also list and read the same data. **Fix:** stop defaulting to `"default"`; require a real tenant id resolved server-side from the JWT, make the WHERE clause an exact match only, and require authentication (`JWTAuthController`) on these controllers — they currently extend the unauthenticated `AuthBaseController`.

**C-03. WhatsApp credentials are shared across tenants, not per-tenant — and leak unauthenticated.**
`backend/src/WhatsApp/Controllers/WhatsApp.controller.ts:17-37` never passes a tenant id to the service at all:
```ts
@Get("Config")
async getConfig() {
  const config = await this.whatsAppService.getConfig();   // no tenant arg → defaults to "default"
  return this.SendResponseData(config);
}
@Post("Config")
async saveConfig(@Body() body: WhatsAppConfigModel, @CurrentUser() userId: string) {
  const result = await this.whatsAppService.saveConfig(body, userId);  // tenant_id taken only from body or "default"
```
`WhatsAppService.saveConfig` (`backend/src/WhatsApp/Services/WhatsApp.service.ts:29-45`) upserts a single row keyed by `tenant_id` (default `"default"`), and the controller never supplies one. Live test: Tenant A saved real-looking credentials (phone, WABA ID, access token); Tenant B then saved its own; Tenant A's subsequent `GET /WhatsApp/Config` returned **Tenant B's** phone number ID and **plaintext access token**. The endpoint also requires **no authentication at all** (`AuthBaseController`, not `JWTAuthController`), so any unauthenticated caller can read the live access token (`GET /WhatsApp/Config` → 200 with `access_token` in cleartext). **Why it matters:** this is a full WhatsApp Business account takeover vector — anyone can read another tenant's Meta access token and use it directly against the Graph API, and any tenant can clobber another's live connection. **Fix:** require auth, resolve tenant id server-side from the JWT, add a real `UNIQUE(tenant_id)` per-tenant row, encrypt `access_token` at rest (currently stored as plain `text`), and never return `access_token`/`verify_token`/`api_key` to the frontend in the config GET response.

**C-04. WhatsApp webhook cannot actually route by tenant.**
`backend/src/WhatsApp/Services/WhatsAppWebhookService.processIncomingWebhook` (`backend/src/WhatsApp/Services/WhatsAppWebhook.service.ts:60-90`) reads `metadata.phone_number_id` from the inbound Meta payload but **never looks up which tenant owns that `phone_number_id`** — it hardcodes `tenant_id: "default"` on every created lead/conversation/message (see lines ~71, 82, 149, 164, 183 confirmed via grep). Live test: three different `phone_number_id`s — two "real" tenant ones and one completely unregistered/unknown — all produced identical processing (stored with `tenant_id: "default"`, triggered an identical AI auto-reply attempt). **Why it matters:** inbound WhatsApp traffic for any phone number (even ones not configured in the system) is accepted and processed; there is no per-tenant routing at all, so the "per tenant WhatsApp connection" feature does not function as multi-tenant — it's a single global inbox. **Fix:** `WhatsAppConfig.findOne({ where: { phone_number_id: metadata.phone_number_id } })` to resolve the owning tenant before processing; reject/queue-for-review unknown `phone_number_id`s instead of processing them.

**C-05. Google OAuth "Sign in/up with Google" can be fully forged — account takeover.**
`backend/src/Service/Auth/Auth.service.ts:343-355` (`googleAuth`):
```ts
} else if (dto.credential) {
  try {
    const parts = dto.credential.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      googleEmail = payload.email || '';
      ...
```
and (`:290-293`):
```ts
let googleEmail = dto.email || '';
```
Two independent forgery paths were confirmed live:
1. Calling `POST /Auth/GoogleAuth` with just `{ "email": "tenant.a@example.test" }` — no `code`, no `credential` — returns a valid, signed API JWT for Tenant A's existing account with zero proof of Google identity.
2. Calling it with `{ "credential": "x.<base64url(JSON with target email)>.y" }` — an unsigned, fabricated JWT shape — decodes the payload and trusts the `email` field without ever verifying the signature against Google's public keys or checking `aud`/`iss`/`exp`. This logged in as Tenant B.

**Why it matters:** this is a complete authentication bypass for any existing account where the attacker knows (or guesses) the email address — full account takeover, no password needed. **Fix:** remove the `dto.email` trust path entirely; for `credential`, verify the Google ID token signature/audience/issuer using `google-auth-library`'s `verifyIdToken` (never hand-decode the JWT) before trusting any claim in it.

**C-06. Hardcoded backdoor password bypasses real authentication.**
`backend/src/Service/Auth/Auth.service.ts:48-56`:
```ts
const isSuperEmail =
  cleanEmail === 'admin@user.com' ||
  cleanEmail === 'admin@sharyx.com' ||
  cleanEmail.includes('priyashok');

const decryptedPassword = this._EncryptionService.Decrypt(UserData.password);
const isPasswordValid =
  decryptedPassword === password ||
  (isSuperEmail && (password === 'Login123!!' || password === 'Password123!'));
```
Confirmed live: `Login(admin@user.com, "Login123!!")` succeeds and returns a Super Admin JWT, regardless of whatever the real seeded password actually is. **Why it matters:** this is a universal master password for a whole class of accounts (anything matching `priyashok`, plus the two literal admin emails), shipped in source control. **Fix:** delete this branch entirely; there is no legitimate reason for a literal backdoor password in auth code.

### High

**H-01. Passwords stored with reversible symmetric encryption, not hashed.**
`backend/src/Service/Encryption.service.ts` + usage in `Auth.service.ts` / `User.service.ts`: user passwords are `AES`-encrypted (via `crypto-js`, key = `SECERT_KEY` env var) and decrypted for comparison on login, instead of being hashed with bcrypt/argon2 and compared with a constant-time hash check. **Why it matters:** anyone with DB access or the `SECERT_KEY` (which also lives in `.env`/`.env.local`, both present on disk, `.env` is **not** gitignored — see I-09) can recover every user's plaintext password instantly; a hash cannot be reversed even with key compromise. **Fix:** migrate to bcrypt/argon2 hashing with per-user salt; this likely requires a password-reset-on-next-login migration since existing values can't be converted.

**H-02. No rate limiting / lockout on login or OTP verification.**
Confirmed live: 30 consecutive wrong-password attempts against the same account were processed with no delay, no lockout, no CAPTCHA, and the correct password still worked immediately after. Likewise OTP verification (`verifySignupOtp`) has no attempt counter or escalating backoff — only a 30-second *resend* cooldown exists, which does nothing to stop brute-forcing the current OTP (6 digits = 1,000,000 possibilities, no per-attempt delay observed). **Fix:** add attempt counting + lockout/backoff per email+IP on both `/Auth/Login` and `/Auth/VerifySignupOtp`; a WAF/rate-limiter (e.g. `@nestjs/throttler`) at the gateway level.

**H-03. Signup OTP store is in-process memory — breaks under restart/scale and leaks via API response.**
`backend/src/Service/Auth/Auth.service.ts:24` — `private signupOtps = new Map<string, OtpRecord>();`. This is per-process, in-memory state: a second instance behind a load balancer, or any process restart, silently invalidates pending signups. Additionally, `sendOtpEmail`'s Ethereal fallback path (`:586-588`, reached whenever no real SMTP config is active — which was the case in this test environment and will be the case for any fresh/self-hosted deploy without SMTP configured) causes `debugOtp` to be returned directly in the `/Auth/SendSignupOtp` HTTP response body. **Fix:** persist OTPs in Redis/DB with TTL; never include `debugOtp`/`previewUrl` in any response outside an explicit non-production flag gated server-side (not just "whether Ethereal happened to be used").

**H-04. `x-tenant-id` request header is trusted from the client in several controllers.**
`backend/src/Controller/Admin/DashboardTelemetry.controller.ts:14,32`, `backend/src/Email/Controllers/Email.controller.ts:24,33,60,68,77,128`, and the shared decorator `backend/src/Helper/Common.helper.ts:14-30` (`CurrentTenant`):
```ts
export const CurrentTenant = createParamDecorator((data, req) => {
  ...
  if (isSuperAdmin) {
    const requestedTenantId = request?.headers?.['x-tenant-id'];
    if (requestedTenantId && requestedTenantId !== 'all') {
      return requestedTenantId;   // trusted directly from the header, no ownership check
    }
```
Even gated to "super admin" callers, this pattern — and the ungated versions in `Email.controller.ts` that read `@Headers("x-tenant-id")` directly with no role check at all — means tenant scoping for a chunk of the app is driven by a value the client fully controls. The frontend's own Axios interceptor (`frontend/src/context/TenantContext.tsx:29-39`) sets this header from `localStorage`, which is trivially editable in the browser console. **Fix:** never resolve the tenant from a request header; resolve exclusively from the verified JWT claims. If an explicit "super-admin viewing tenant X" feature is wanted, it must look up and validate that the super admin actually has access, not simply echo the header back.

**H-05. `WhatsAppConfig.access_token` and `WhatsAppWebhookController` endpoints are reachable without authentication.**
`WhatsAppController` (`WhatsApp/Controllers/WhatsApp.controller.ts:12`) extends `AuthBaseController`, not `JWTAuthController` — so `Config`, `Conversations`, `Messages/:id`, `Send`, and `Test-Connection` all work with **no Authorization header whatsoever** (confirmed: `GET /WhatsApp/Config` returned 200 with the live plaintext `access_token`). The same pattern repeats for `Email.controller.ts`, `AiAgent.controller.ts`, `Lead.controller.ts`, `Customer.controller.ts`, `Automation.controller.ts`, `JobOpenings.controller.ts`, `Omnichannel.controller.ts`, `VoiceAgent/Call/Config.controller.ts` — **none of the feature controllers in the codebase extend the authenticated `JWTAuthController`.** Only the `Admin/*` CRUD controllers (`User`, `UserRole`, `Company`, `Country`, `Currency`, `EmailConfig`, `ErrorLog`, `AuditLog`, `AutoNumber`) and are actually guarded. **Fix:** every controller that touches tenant business data must extend `JWTAuthController` (or apply `@UseGuards(JwtAuthGuard)` directly); this is the single highest-leverage fix in the codebase.

**H-06. Error responses leak internal error details and use HTTP 500 for client errors.**
Confirmed throughout (`Login`, `SendSignupOtp`, `VerifySignupOtp`, etc.): expected validation/business errors ("Invalid password", "Invalid email id", rate-limit messages) are all thrown as plain `Error` and surfaced as **HTTP 500** by the global `ExceptionHelper` filter, rather than 400/401/404/429. One endpoint (`/User/List` reached with a non-admin JWT) surfaced a raw Postgres driver error (`invalid input syntax for type uuid: "0"`) directly in the response body. **Why it matters:** 500 for client errors breaks normal frontend error handling/monitoring conventions, and raw DB errors can leak schema/implementation details. **Fix:** throw NestJS `HttpException` subclasses (`UnauthorizedException`, `BadRequestException`, `NotFoundException`) with intent-matched status codes; sanitize DB errors before they reach the client.

### Medium

**M-01. Onboarding wizard is pre-filled with hardcoded placeholder data for every field, across all 10 steps, and most of it is never saved.**
`frontend/src/pages/onboarding/OnboardingWizard.tsx:51-85` initializes `onboardingData` with concrete fake values (`'Sharyx Client Corp'`, `'100 Innovation Way, Suite 400'`, `'San Francisco'`, `'+1 555 019 2831'`, `wa_access_token: 'EAAG_dummy_token_sharyx_live'`, `email_app_pass: 'abcd efgh ijkl mnop'`, etc.). `handleFinalSubmit` (`:420-466`) only ever persists `wa_*` fields (via `whatsappService.saveConfig`) and `email_*` fields (via `emailService.saveConfig`) — `completeOnboarding(onboardingData)` (`frontend/src/lib/auth.tsx:214-228`) is **entirely client-side**, writing the whole object into `localStorage` only. Company name, address, industry, goals, company size, discovery source are never sent to any backend endpoint at all. **Why it matters:** per the requested audit goal, "whatever the user enters in each step" is largely not saved to the DB at all, and what *is* prefilled looks like real data, inviting a careless user to submit fabricated company/contact info and a fake WhatsApp token by accident. **Fix:** clear all fields to empty/placeholder-only defaults; add a real `POST /Onboarding/Step` (or similar) backend endpoint that persists every step to the tenant's company/profile row.

**M-02. Onboarding does not resume at the saved step; resume relies entirely on client memory.**
There is no server round-trip for step progress; `currentStep` is local React state (`OnboardingWizard.tsx:40`) with no persistence. A refresh mid-wizard loses all progress and restarts at step 1 with the same hardcoded defaults. **Fix:** persist `current_step` + entered values server-side keyed by user id, and hydrate the wizard from that on mount.

**M-03. Signup creates a user with no company_id/tenant linkage; login later attaches an unrelated pre-existing company.**
Confirmed live: `verifySignupOtp` creates the `user` row with no reference to any company at all (there's no `company_id` column on `user` in the first place — `backend/src/Database/Table/Admin/user.ts` has no such field). `ValidateUser` on the next login then attaches whatever company happens to satisfy the hardcoded-id-or-"sharyx"-or-first fallback (C-01), which in this test was the one seeded "BoilerPlate" company — **not** "Alpha Corp"/"Beta Inc" that the user typed at signup. **Fix:** add `user.company_id`, populate it at signup from a newly created company, and have `ValidateUser` join through it instead of searching `company.find()` for a hardcoded/name match.

**M-04. `WhatsAppConfig.verify_token` has an insecure, well-known, sitewide default.**
`backend/src/Database/Table/WhatsApp/WhatsAppConfig.entity.ts:21` — `@Column({ length: 100, default: "sharyx_verify_token_secure" })`; also used as the final fallback in `WhatsAppWebhookService.verifyHandshake` (`:26`) and mirrored in `.env`'s `META_WA_VERIFY_TOKEN`. Confirmed live: the Meta webhook handshake succeeded with this exact string. **Why it matters:** this token is meant to prove to Meta's servers that the webhook endpoint belongs to the right app; shipping a guessable, codebase-visible default undermines that for any tenant who doesn't override it (and the per-tenant override is moot anyway per C-03/C-04). **Fix:** require every tenant to set a unique random verify token at connect time; never ship a code-level default string.

**M-05. `whatsapp_config.access_token`, `api_key`, and email `smtp_password`/`refresh_token` are stored as plain or (for refresh_token) app-level AES text, not via a vault/KMS, and some are logged.**
`EncryptionService.Encrypt`/`Decrypt` wraps `access_token`... actually **`WhatsAppConfig.access_token` is stored with no encryption call anywhere** (grep confirms `config.access_token = data.access_token;` directly in `WhatsApp.service.ts:38`, no `Encrypt()` wrapper) — it's plain `text` in the DB and returned verbatim in API responses (see C-03). Only `EmailAccountConfig.refresh_token`/`smtp_password` go through `EncryptionService` (itself weak per H-01's symmetric-key concerns). **Fix:** encrypt `access_token`/`api_key` at rest the same way email credentials are, and never include secrets in a GET response — return only a masked indicator (`is_connected: true`, last 4 digits) to the frontend.

### Low

**L-01. Two different onboarding-completion flags with inconsistent casing drift (`onboarding_completed` vs `onboardingCompleted`).** `frontend/src/lib/auth.tsx:14-15, 42-50` supports both; `checkUserOnboarded` checks both, but this duplication is a maintenance hazard and a likely source of "shows onboarding again after refresh" bugs reported in `wa_bugs.csv`.

**L-02. `.env` (not `.env.local`) is committed/present with live-looking SMTP/Google secrets and is not in `.gitignore`** (only `.env.local` is ignored per `.gitignore:6`). Verify `.env` is not actually tracked in git (`git log -- backend/.env` showed commit history touching it) and rotate any real credentials that were ever committed.

**L-03. Login/Signup error messages differ for "unknown email" vs "wrong password" (`'Invalid email id'` vs `'Invalid password'`)** — a textbook user-enumeration oracle. Use one generic message ("Invalid email or password") for both.

---

## 4. Tenant Isolation Matrix

| Table / Endpoint | Has tenant scope? | Notes |
|---|---|---|
| `lead` | Nominally (`tenant_id` column) | **Not enforced** — every insert defaults to `"default"`; read/update/delete confirmed cross-tenant in live test (C-02). |
| `customer`, `crm_deal`, `customer_interaction` | Nominally | Same `"default"`-fallback pattern (`Customer.service.ts`), cross-tenant read confirmed live. |
| `whatsapp_config` | Column exists | **Not enforced at controller level at all** — controller never resolves/passes tenant id (C-03). Effectively one global row per deployment. |
| `wa_conversation`, `wa_message` | Column exists | Populated with `tenant_id: "default"` unconditionally by the webhook service (C-04) — webhook never resolves the owning tenant. |
| `wa_ai_config`, `wa_campaign`, `wa_template` | Column exists | Not directly tested, but shares the same service-layer `"default"` fallback pattern seen elsewhere (code inspection only — not independently verified live). |
| `email_account_config`, `email_campaign`, `email_log`, `email_template` | Column exists | `Email.controller.ts` reads tenant from the **client-controlled `x-tenant-id` header** with no ownership verification (H-04), and falls back to the hardcoded company UUID when absent (`Email.controller.ts:62`). |
| `ai_agent`, `conversation_agent_state`, `agent_handoff_log` | Column exists | Confirmed via code inspection the "default"/hardcoded-UUID fallback pattern is used (`VoiceAgent.service.ts`); `GET /AiAgents` is reachable **unauthenticated** and returned data tagged `tenant_id: "default"`. |
| `voice_agent`, `voice_call_log`, `voice_provider_config` | Column exists | Same `In([tenantId, "default", "646b4abe…"])` pattern confirmed via code grep in `VoiceAgent.service.ts:16-55`; effectively merges every tenant's rows into the shared bucket whenever the caller's tenant equals the hardcoded default. |
| `omnichannel_*` (6 tables) | Column exists | Not independently live-tested; code inspection shows the column is present and used in queries, but given the shared-tenant-id root cause (C-01), the same isolation failure almost certainly applies. **Flagging as unverified rather than asserting pass.** |
| `job_openings`, `lead_activity` | Column exists | Default-`"default"` fallback pattern again (grep-confirmed column defaults in schema: `'default'::character varying`). |
| `company` | N/A (this *is* the tenant table) | Only 1 row ever exists across the whole test — signup never creates a new one (C-01/M-03). |
| `user` | No tenant_id column at all | A user is never explicitly linked to a company/tenant in the schema; linkage is reconstructed ad-hoc at login time via the hardcoded-UUID search in `ValidateUser` (C-01). **This is arguably the most important missing tenant scope in the whole schema.** |
| `user_role`, `country`, `currency`, `audit_log`, `error_log`, `email_config` (legacy), `processed_messages` | No tenant_id | Reference/global tables — **justified** to be global (roles, countries, currencies are reference data; `processed_messages`/`audit_log`/`error_log` are operational logs where a tenant scope would be a reasonable *addition* for security/compliance auditing per tenant, but their absence is not a functional isolation bug today). |
| Postgres Row-Level Security | **Not used anywhere** | `select rowsecurity, count(*) from pg_tables` → all 40 tables `rowsecurity = false`; `select count(*) from pg_policies` → `0`. All isolation is (supposed to be) enforced in application code only, and as shown above, it mostly isn't. |

---

## 5. Hardcoded / Non-Dynamic Items Found

- `'646b4abe-e6de-401b-ba33-46884bf3f6e6'` (the one "Sharyx Enterprise Inc" company UUID) — hardcoded in: `backend/src/Service/Auth/Auth.service.ts` (×5), `backend/src/Email/Controllers/Email.controller.ts`, `backend/src/Email/Services/Email.service.ts`, `backend/src/Email/Services/EmailImap.service.ts`, `backend/src/Voice/Services/VoiceAgent.service.ts`, `backend/src/Voice/Services/VoiceCall.service.ts`, `backend/src/WhatsApp/Services/WhatsApp.service.ts`, and mirrored on the frontend in `frontend/src/context/TenantContext.tsx` (`DEFAULT_REAL_TENANTS`) and `frontend/src/lib/auth.tsx` (multiple `|| '646b4abe-...'` fallbacks) and `frontend/src/service/voiceService.ts`.
- Hardcoded backdoor passwords `'Login123!!'` / `'Password123!'` and email allowlist (`admin@user.com`, `admin@sharyx.com`, any email containing `priyashok`) — `Auth.service.ts:48-56`; mirrored in frontend `lib/auth.tsx:76-80` and `TenantContext.tsx:72-78` for super-admin detection.
- Hardcoded Google OAuth client id/secret fallbacks in source — `Auth.service.ts:282-286`: `clientId = process.env.GOOGLE_CLIENT_ID || '11874827859-h7b1l07qs1pi1ie1489ijdj4u7jvbuqg.apps.googleusercontent.com'`, `clientSecret = process.env.GOOGLE_CLIENT_SECRET || 'GOCSPX-<redacted - rotate this secret>'`. Same literal client id duplicated in `OnboardingWizard.tsx:398`. **These look like real, usable OAuth credentials committed to source** — rotate immediately regardless of any other finding here.
- Hardcoded JWT signing secret fallback: `'sharyx_jwt_secret_token_secure_key_2026'` in both `app.module.ts:95` and `JwtStrategy.service.ts:12` — if `TOKEN_SECRET` env var is ever unset in any environment, tokens are signed/verified with a secret that is sitting in the public source tree.
- Hardcoded WhatsApp verify token default `'sharyx_verify_token_secure'` — entity default + service fallback (M-04).
- Entire onboarding wizard pre-filled with fictitious but plausible business data (M-01) — company name, address, city/state/zip, industry, goals, company size, discovery source, and (most sensitive) a fake WhatsApp access token and a fake Gmail app password, all as literal defaults in `OnboardingWizard.tsx:52-85`.
- `DEFAULT_REAL_TENANTS` array in `frontend/src/context/TenantContext.tsx:48-61` hardcodes two tenant names/emails/UUIDs directly in frontend source as a fallback whenever `/Company/List` fails or returns empty — a real company list from the DB can silently fall back to this fabricated list.
- Root `test_*.js`, `check_*.js`, `inspect_*.js`, `fix_lead.js`, `remove_phone_db.js`, `clean_whatsapp_user.js`, `sync_wa_token.js` scripts at the repo root and under `backend/` are ad-hoc one-off scripts (not part of any test suite), several containing direct DB manipulation logic — not a security bug per se, but they indicate manual, undocumented data-fixing has been a repeated operational pattern, consistent with the "nothing is reliably dynamic/tenant-scoped" theme throughout this audit.

---

## 6. Prioritized Fix List

1. **C-01** Stop hardcoding the tenant UUID in `AuthService`; make signup create a real per-signup `company` row and derive every JWT's `tenant_id` from it. This single fix unblocks correctly fixing almost everything else.
2. **H-05** Put every feature controller behind `JWTAuthController`/`JwtAuthGuard`. Right now most of the app (Leads, Customers, WhatsApp, Email, Voice, AiAgents, Omnichannel) requires **no authentication at all**.
3. **C-02 / C-03 / C-04** Once (1) and (2) land, fix the tenant-filtering logic itself: remove every `"default"`/`'default' OR tenant_id IS NULL` OR-clause and `In([tenantId, "default", "646b4abe…"])` pattern; require an exact-match tenant id resolved only from the verified JWT; make the webhook resolve the owning tenant from `phone_number_id` before doing anything else.
4. **C-05** Fix Google OAuth to cryptographically verify ID tokens (`google-auth-library`); remove the client-supplied-`email` trust path entirely. This is a live account-takeover bug.
5. **C-06** Delete the hardcoded backdoor password branch.
6. **H-01** Migrate passwords from reversible AES to bcrypt/argon2 hashing.
7. **H-02** Add login/OTP rate limiting and lockout.
8. Rotate the Google OAuth client secret and any other secret found committed in source/`.env` (C-01 list / Section 5), since they've been sitting in a readable source tree.
9. **M-01 / M-02 / M-03** Build real backend persistence for onboarding steps (company profile, step progress) instead of the current localStorage-only `completeOnboarding`.
10. **M-04 / M-05** Encrypt WhatsApp `access_token`/`api_key` at rest, stop returning raw secrets in config GET responses, and require tenant-unique webhook verify tokens.
11. Lower-priority cleanup: fix HTTP status codes (H-06), generic auth error messages (L-03), add Postgres RLS as defense-in-depth once application-level scoping above is fixed, `.gitignore` the real `.env`.

---

*This report documents findings only; per the audit's scope, no source files were modified. All live tests ran against an isolated scratch database (`audit_scratch`) created and dropped for this audit — the project's real development database (`ai_workforce`) was not touched. The background test server process on port 8099 is still running from this session; stop it (and drop `audit_scratch`) once this report has been reviewed.*
