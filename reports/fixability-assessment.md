# Fixability Assessment: Auth / Tenant Isolation / Onboarding / WhatsApp

Input: `reports/auth-tenant-onboarding-audit.md` (20 issues: 6 Critical, 6 High, 5 Medium, 3 Low).
Method for this pass: read-only. I re-opened the referenced code **as it is in the working tree today** and checked each claim with grep/reads. I did **not** start the server or re-run live tests in this pass. "Verified live" below means the 88/89 live run recorded in `reports/fixes-applied-report.md` (fresh DB `audit_verify_fixes2`); "verified by code" means I re-read it just now.
No source, schema or data was changed in this pass.

> **Important context:** the audit describes the repo at commit `6d5dd8c3`. A large fix pass (this session plus the parallel session `workforce-sharyx-00`) is already in the **uncommitted working tree** of branch `04/11/2026-signup-testing`. So for each issue I give two things: (a) was the original finding real, and (b) what is left to do **now**.

---

## 1. Verdict summary

| Question | Count |
|---|---|
| Original issues | 20 |
| Confirmed real when audited | 20 (L-02 "partly": `.env` is tracked, but I cannot tell from the repo whether the secrets in it are live) |
| Original issues now fully closed in the working tree (needs only commit + deploy steps) | 14: C-01, C-02, C-03, C-04, C-05, C-06, H-01, H-04, H-06, M-01, M-02, M-03, M-04, M-05 |
| Original issues closed in code but with an **operational/residual gap** | 5: H-02 and H-03 (state is in process memory), H-05 (Customer controller lacks the tenant guard; public webhooks), L-01 (flag duplication, cosmetic), L-03 (done; kept for completeness) |
| Still open | 1: L-02 (secrets tracked in git, needs rotation by you) |
| **New residual issues found in this pass** (not in the original audit) | 6 (R-01 to R-06 below), two of them real cross-tenant holes |
| Fixable in the current architecture, easy | 21 of 26 |
| Fixable but needs refactor | 4 (central tenant enforcement, OTP/lockout store, DB migrations replacing `synchronize`, webhook signature) |
| Needs redesign | 0 |
| Not possible without a stack change | 0 |

**Bottom line:** nothing here requires a stack change or a rewrite. The two things that are "fundamentally wrong" in the original design (hardcoded tenant id, and tenant scoping done query-by-query with `'default'` fallbacks) have already been replaced. What remains is one real hole (R-01: public Omnichannel webhooks trust a client-supplied tenant), one leftover leak (R-02), secret rotation, and hardening.

---

## 2. Summary table

Status column = state of the **working tree today**.

| Issue | Severity | Confirmed | Status now | Fixable? | Effort left | Risk | Depends on |
|---|---|---|---|---|---|---|---|
| C-01 hardcoded tenant id | Critical | Yes | Fixed (by code) | Yes, easy | S (commit + backfill run) | Existing users without `company_id` are locked out until backfill | none |
| C-02 lead/customer cross-tenant | Critical | Yes | Fixed for Lead; Customer fixed but see R-07 | Yes, easy | S | low | C-01 |
| C-03 WA creds shared/leaked | Critical | Yes | Fixed | Yes, easy | S (re-save to encrypt old tokens) | existing plaintext tokens keep working until re-saved | C-01 |
| C-04 webhook not tenant-routed | Critical | Yes | Fixed (WhatsApp). Omnichannel webhook is **still open**, see R-01 | Yes, easy | M | low | C-03 |
| C-05 Google auth forgeable | Critical | Yes | Fixed | Yes, easy | S | needs `GOOGLE_CLIENT_ID/SECRET` in env | none |
| C-06 backdoor password | Critical | Yes | Fixed | Yes, easy | none | none | none |
| H-01 reversible passwords | High | Yes | Fixed for new/next-login users | Yes, easy | S | old rows stay AES until each user logs in | none |
| H-02 no rate limit | High | Yes | Fixed, in-memory | Yes, needs refactor for multi-instance | M | none | none |
| H-03 in-memory OTP / debug OTP | High | Yes | `debugOtp` gated; store still in memory | Yes, needs refactor | M | pending signups lost on restart until moved | none |
| H-04 client-controlled tenant | High | Yes | Fixed (JWT-only + guard) | Yes, easy | S | none | C-01 |
| H-05 controllers unauthenticated | High | Yes | Fixed; Customer lacks tenant guard; webhooks public by design | Yes, easy | S | low | none |
| H-06 500 for client errors | High | Yes | Fixed (other session) | Yes, easy | none | none | none |
| M-01 prefilled wizard | Medium | Yes | Fixed; one stray hardcoded Google id remains (R-03) | Yes, easy | S | none | none |
| M-02 no resume | Medium | Yes | Fixed | Yes, easy | none | none | M-03 |
| M-03 user not linked to company | Medium | Yes | Fixed | Yes, easy | S (backfill) | legacy users | C-01 |
| M-04 default verify token | Medium | Yes | Code fixed; `.env` still sets the old value | Yes, easy | S (change env) | none | none |
| M-05 secrets plaintext / returned | Medium | Yes | Fixed | Yes, easy | S | none | C-03 |
| L-01 duplicate onboarding flags | Low | Yes | Mostly cleaned; login payload still hardcodes `onboarding_completed: true` | Yes, easy | S | none | none |
| L-02 `.env` tracked | Low (should be High) | Partly | **Open** | Yes, easy but needs you | S + rotation | history rewrite is intrusive | none |
| L-03 enumeration oracle | Low | Yes | Fixed | Yes, easy | none | none | none |
| R-01 Omnichannel webhooks trust client tenant | **High** | Yes (new) | **Open** | Yes, easy | M | external senders must be reconfigured | none |
| R-02 Omnichannel `getLeads` still ORs `'default'`/NULL | **High** | Yes (new) | **Open** | Yes, easy | S | none | C-01 |
| R-03 Google client id hardcoded in 3 frontend files | Low | Yes (new) | Partly open | Yes, easy | S | none | none |
| R-04 Meta webhook has no signature check | High | Yes (new) | Open | Yes, needs refactor | M | needs Meta app secret | C-04 |
| R-05 `synchronize` on by default; no real migrations | Medium | Yes (new) | Open | Yes, needs refactor | L | prod schema changes | none |
| R-06 voice webhook public, no secret | Medium | Yes (new) | Open | Yes, easy | S-M | provider must send secret | none |
| R-07 service fallbacks `tenantId ? scoped : unscoped` | Medium | Yes (new) | Open (defence in depth) | Yes, needs refactor | M | low | central enforcement |

---

## 3. Detailed sections

Format per issue: **Confirmed / Fixable / Root cause / Fix plan / Effort / Risk / Depends / Verify**. Issues already closed get a short "what is left" version.

### C-01. Hardcoded tenant id; signup never created a company
- **Confirmed:** Yes (the original code and the live test agree). **Now:** `grep 646b4abe` in `backend/src` returns **zero** hits; in `frontend/src` zero hits.
- **Fixable:** Yes, easy. Already done.
- **Root cause:** `user` had no `company_id`; `Auth.service.ts` papered over this with a constant. The real cause was a missing data link, not just the constant.
- **Fix (done):** `company.ts`/`user.ts` (+`company_id`), signup creates a company, JWT tenant read from `user.company_id` (Auth.service.ts, other session).
- **Left:** (1) run the backfill SQL for existing databases; (2) the seeder links the seeded admin (done).
- **Effort:** S. **Risk:** any existing `user` row with `company_id IS NULL` is rejected at login ("Account is not linked to a tenant"). Backfill first.
- **Depends:** none. **Verify:** sign up two users with different company names; decode both JWTs; the `tenant_id`/`company_id` claims must differ and each must match a `company` row; `SELECT count(*) FROM "user" WHERE company_id IS NULL` = 0.

### C-02. Lead/Customer cross-tenant read/update/delete
- **Confirmed:** Yes. **Now (by code):** `Lead.service.ts` no longer has the `OR 'default' OR NULL` filter; the only `"default"` left is a display fallback at `Lead.service.ts:521` (`tenantId: l.tenant_id || "default"`), harmless. `Customer.service.ts` uses exact `c.tenant_id = :tenantId`.
- **Fixable:** Yes, easy. **Root cause:** the data was all written as `'default'` (C-01/C-03) and the filter explicitly merged `'default'` into every tenant's view.
- **Left:** Customer.service has `tenantId ? {id, tenant_id} : {id}` at lines 88, 127, 137. If `tenantId` is ever falsy the query is unscoped. It is only falsy for a Super Admin "all" request today, but it is a footgun (see R-07). `Customer.controller.ts:18` uses `@UseGuards(JwtAuthGuard)` only, **without** `TenantContextGuard`, so header/query tenant overrides are not stripped there (the `CurrentTenant` decorator itself is JWT-only, so this is defence in depth, not an open hole). These are in the other session's files.
- **Effort:** S. **Risk:** low. **Depends:** C-01. **Verify:** as tenant B, `GET/PUT/DELETE /Lead/*/<A's id>` all 404; `GET /Customer/List` shows 0 of A's rows. (Passed live.)

### C-03. WhatsApp credentials shared across tenants and readable unauthenticated
- **Confirmed:** Yes. **Now (by code):** `WhatsApp.controller.ts:16` extends `JWTAuthController`; service is tenant-scoped; entity has unique `tenant_id`; `access_token`/`api_key` use `EncryptedColumn`.
- **Fixable:** Yes, easy. **Root cause:** controller never passed a tenant; entity had a default-tenant column; secrets stored raw.
- **Left:** existing plaintext tokens in an existing DB are encrypted only when re-saved. Optional one-off script to re-encrypt all rows (not written). Duplicate `tenant_id` rows must be removed **before** the unique index is created (see migrations).
- **Credentials question (answered below):** encrypted-column approach is correct for this stack.
- **Effort:** S. **Risk:** if `SECERT_KEY` is lost/rotated, stored tokens become unreadable. **Depends:** C-01. **Verify:** `SELECT access_token FROM whatsapp_config` starts with `enc:v1:`; `GET /WhatsApp/Config` has no token field; unauthenticated call is 401.

### C-04. Webhook cannot route by tenant
- **Confirmed:** Yes. **Now:** `WhatsAppWebhook.service.ts` resolves the tenant by `phone_number_id` and drops unknown numbers (verified live).
- **Not fixed (R-01):** the **Omnichannel** webhooks are a separate public path. `OmnichannelWebhook.controller.ts:32,70,96`:
  ```ts
  const tenantId = tenantHeader || body.tenant_id || "default";
  ```
  Any unauthenticated caller can post messages/emails/call events into **any** tenant by setting `x-tenant-id` or `tenant_id`, or into the `"default"` bucket.
- **Fixable:** Yes, easy. **Root cause:** a public endpoint taking a tenant from the request, which is the same class of bug as H-04, in a controller the guard work skipped because it must stay public.
- **Fix plan:** (1) WhatsApp payloads: resolve tenant via `WhatsAppConfig.phone_number_id` exactly like `WhatsAppWebhook.service.ts`, ignore header/body. (2) Email payloads: resolve tenant from the receiving mailbox address via `EmailAccountConfig.email_address`. (3) Call events: resolve from the voice provider's number/assistant id in `VoiceAgent`/`VoiceProviderConfig`. (4) If no tenant maps, return 200 and store nothing. (5) Remove the `"default"` fallback. Files: `OmnichannelWebhook.controller.ts`, `OmnichannelIngestion.service.ts`.
- **Effort:** M. **Risk:** anything currently posting to these URLs with `x-tenant-id` (n8n, Zapier, internal scripts) will stop landing. Confirm who calls them first.
- **Depends:** C-03. **Verify:** POST a WhatsApp webhook with `x-tenant-id: <B>` but A's `phone_number_id`: record lands in A. POST with unknown id: nothing stored. POST with `x-tenant-id` only: nothing stored.

### C-05. Google sign-in forgeable
- **Confirmed:** Yes. **Now:** `GoogleAuth.service.ts` verifies via code exchange or `verifyIdToken`; `dto.email` ignored; live: `{email}` only gives 400, forged credential gives 401.
- **Fixable:** Yes, easy. **Root cause:** hand-decoded JWT, and trusting a caller field.
- **Left:** the `Auth.service.ts` (other session) still contains the old `googleAuth` method body (dead code now that the controller calls `GoogleAuthService`). Delete it so nobody re-wires it. Rotate the Google client secret that was hardcoded in git history.
- **Effort:** S. **Risk:** `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` must be set or Google login fails closed. **Verify:** forged credential 401; real Google login works end to end (not tested in a browser).

### C-06. Hardcoded backdoor password
- **Confirmed:** Yes. **Now:** no `isSuperEmail`/`Password123!` logic in `backend/src`; live: `Password123!` returns 401.
- **Left:** `Login123!!` still appears as a **default** in three places: `CommonSeeder.service.ts:96` (admin seed, overridable by `SEED_ADMIN_PASSWORD`), `VoiceConfig.service.ts:229` and `SaasFallback.provider.ts:146` (fallback for `SHARYX_PASSWORD`). These are not login backdoors but a known default admin password. **Fix:** remove the literal default in all three; fail seeding if `SEED_ADMIN_PASSWORD` is unset in production.
- **Effort:** S. **Risk:** a fresh install needs the env var set. **Verify:** `grep -rn "Login123" backend/src` returns nothing.

### H-01. Reversible password storage
- **Confirmed:** Yes. **Now:** scrypt with per-user salt (`Encryption.service.ts`), legacy AES verified then upgraded on next successful login.
- **Fixable:** Yes, easy. **Root cause:** crypto-js AES used as a password store.
- **Left:** until each user logs in, their row is still reversible AES. If you want to force the cutover, a one-off "force password reset" for users still on the old format is the only way (hashes cannot be derived from ciphertext without the key; with the key you could re-hash, but only if you decide to run that deliberately).
- **Effort:** S. **Risk:** none for users. **Verify:** `SELECT count(*) FROM "user" WHERE password NOT LIKE 'scrypt$%'` trends to 0.

### H-02. No rate limiting
- **Confirmed:** Yes. **Now:** lockout and OTP attempt limit exist (Auth.service.ts:37, in a `Map`).
- **Fixable:** Yes, needs refactor for more than one instance. **Root cause:** state held in process memory, per-email only.
- **Fix plan:** add `@nestjs/throttler` per-IP on `/Auth/*` (needs a Redis or DB store if more than one instance); move `loginAttempts` to the shared store. **Effort:** M. **Risk:** shared-NAT users could lock each other out if keyed by IP alone; key by email + IP. **Verify:** 6 bad logins gives 429 even after a restart of one instance.

### H-03. OTP in memory; OTP leaked in response
- **Confirmed:** Yes. **Now:** `debugOtp` only when `AUTH_EXPOSE_DEBUG_OTP=true` and not production. `signupOtps` is still `new Map` (Auth.service.ts:36).
- **Fixable:** Yes, needs refactor. **Root cause:** no shared store was available/used.
- **Fix plan:** table `auth_otp(email, purpose, code_hash, expires_at, attempts, created_at)` or Redis with TTL; store only a hash of the code; atomic attempt counter. Also fix the ordering bug I reported: `verifySignupOtp` deletes the OTP **before** validating the password length (lines ~249-264), so a short password burns the code. **Effort:** M. **Risk:** low. **Verify:** request OTP, restart the app, verify succeeds.

### H-04. Tenant taken from client header/query/body
- **Confirmed:** Yes. **Now:** `CurrentTenant` reads only the verified JWT; `TenantContextGuard` forces header/query/body tenant to the JWT tenant on Voice, Omnichannel, Email, Automation, JobOpenings, Dashboard, AiAgent; only a Super Admin may impersonate. Verified live.
- **Gap:** Customer controller lacks `TenantContextGuard` (see C-02). **Fix:** add it. **Effort:** S.
- **Verify:** send `x-tenant-id: <other>` as a normal user; result is still your own tenant.

### H-05. Controllers unauthenticated
- **Confirmed:** Yes. **Now (verified by grep):** all business controllers extend `JWTAuthController` or use `JwtAuthGuard`. The only unguarded ones are `LoginController` (correct) and the webhook controllers (intentionally public, see R-01, R-04, R-06).
- **Left:** none beyond R-01/R-04/R-06. **Effort:** S. **Verify:** unauthenticated sweep of every route; the list of 200s must be exactly: Login routes, webhook GET/POST, health.
- **Recommended extra:** make auth **default-on globally** (see central enforcement below), so a new controller cannot ship open by accident.

### H-06. HTTP 500 for client errors / raw DB errors
- **Confirmed:** Yes. **Now:** `Exception.helper.ts` honours the HttpException status (other session); verified 400/401/404/409/429.
- **Left:** raw Postgres messages can still pass through for non-Http errors. **Fix:** in `Exception.helper.ts`, map `QueryFailedError` to a generic 400/500 message and log the detail server-side. **Effort:** S. **Verify:** hit an endpoint with a malformed uuid; body has no SQL text.

### M-01. Wizard prefilled with fake data; not saved
- **Confirmed:** Yes. **Now:** defaults empty; steps saved to `company.onboarding_data`; secrets not persisted there.
- **Left (R-03):** `OnboardingWizard.tsx:1370` still has the hardcoded Google client id (`LoginPage.tsx:52` and `SignupPage.tsx:149` too). My earlier report said it was removed from the wizard; that was only true for line 459, not the second occurrence at 1370. A client id is public, not a secret, but the audit item and the earlier claim should be accurate. **Fix:** read `import.meta.env.VITE_GOOGLE_CLIENT_ID` in all three. **Effort:** S.
- **Verify:** `grep -rn "11874827859" frontend/src` returns nothing; wizard loads with empty fields for a new tenant.

### M-02. Wizard does not resume
- **Confirmed:** Yes. **Now:** `GET /Onboarding/State` hydrates `currentStep` and values (verified live through logout/login). **Fixable with the current schema:** yes, it is done with 5 columns on `company`, no new table.

### M-03. User not linked to company
- **Confirmed:** Yes. **Now:** `user.company_id` exists. **Left:** backfill legacy rows (see migrations).

### M-04. Default verify token
- **Confirmed:** Yes. **Now:** no default in entity/code; random per-tenant token generated on connect. **Left:** `META_WA_VERIFY_TOKEN=sharyx_verify_token_secure` is still set in `backend/.env` and `.env.local`, and the code honours it as a platform-wide token, so the well-known value still verifies. **Fix:** set it to a long random value (or unset it if each tenant has its own Meta app). **Effort:** S. **Verify:** old token gets 403.

### M-05. Secrets stored plain / returned to the browser
- **Confirmed:** Yes. **Now:** encrypted at rest; GET returns `has_access_token` and a masked hint. **Left:** email `smtp_password`/`refresh_token` still use app-level AES with the same key (acceptable; same key-management caveat as C-03).

### L-01. Duplicate onboarding flags
- **Confirmed:** Yes. **Now:** frontend reads server state. **Left:** the login response still hardcodes `onboarding_completed: true` (other session's `Auth.service.ts`). Remove it so there is one source of truth. **Effort:** S.

### L-02. `.env` tracked in git
- **Confirmed:** Partly: yes, `git ls-files` shows `backend/.env` is tracked; `.env.local` is not. I cannot tell from here which values are live.
- **Fixable:** Yes, easy technically; needs **your** action. **Fix plan:** (1) rotate every secret (DB, `TOKEN_SECRET`, `SECERT_KEY`, Google client secret, SMTP, AI keys, Meta); (2) `git rm --cached backend/.env`; add `.env` to `.gitignore`; commit a `.env.example`; (3) history rewrite (`git filter-repo`) only if the repo is or will be shared; rotation is what actually protects you. **Risk:** rewriting history breaks every clone. **Warning:** rotating `SECERT_KEY` makes encrypted WhatsApp/email credentials and legacy AES passwords unreadable. Re-encrypt first or have tenants reconnect.

### L-03. Enumeration oracle
- **Confirmed:** Yes. **Now:** one generic message (verified live). Done.

### New residual issues

**R-01 Omnichannel webhooks trust a client tenant (High).** See C-04 above. Unauthenticated cross-tenant write/injection.

**R-02 Omnichannel `getLeads` still merges `'default'`/NULL (High).**
`Omnichannel.service.ts:635`:
```ts
whereClauses.push(`(l.tenant_id = $${pIdx} OR l.tenant_id = 'default' OR l.tenant_id IS NULL)`);
```
Any tenant calling the Omnichannel lead list sees every legacy `'default'` or NULL-tenant lead. **Fix:** exact match `l.tenant_id = $1`. Same file also has `tenantId = "default"` parameter defaults at lines 46, 111, 157, 198, 313, 442, 621 and the Voice services have 11 each (`VoiceAgent.service.ts`, `VoiceCall.service.ts`); the guard forces a real tenant in front of them, but a future caller that forgets to pass one silently falls into the shared bucket. **Fix:** make `tenantId` a **required** parameter with no default and throw if empty. **Effort:** S for the SQL, M for removing all defaults (about 230 `'default'` occurrences in 70 files, most are entity column defaults, see migrations). **Risk:** low; compile errors will point to every caller. **Verify:** insert a lead with `tenant_id='default'`; tenant B's Omnichannel list must not include it.

**R-03** Google client id hardcoded in three frontend files. See M-01.

**R-04 No Meta webhook signature check (High).** `grep -i "x-hub-signature|app_secret"` in `backend/src` finds nothing. Routing by `phone_number_id` stops cross-tenant misuse but anyone who knows a tenant's `phone_number_id` can forge inbound messages for it (which also triggers AI replies and costs). **Fix plan:** enable raw-body capture in `main.ts` (`NestFactory.create(AppModule, { rawBody: true })`), compute HMAC-SHA256 of the raw body with the Meta app secret, constant-time compare to `X-Hub-Signature-256`, reject otherwise. New env `META_APP_SECRET` (or per-tenant `app_secret` column if each tenant brings their own Meta app). **Effort:** M. **Risk:** if the secret is wrong, all inbound WhatsApp stops; deploy with a log-only mode first. **Verify:** unsigned POST gives 401; correctly signed POST accepted.

**R-05 `synchronize` defaults to true; no real migrations (Medium).** `app.module.ts:84`: `synchronize: _ConfigService.get("Database.Sync") ?? true`, and `.env` sets `DB_SYNC=true`. In production this lets TypeORM alter tables at boot, including creating the new unique index (which fails the whole boot if duplicates exist). **Fix plan:** set `DB_SYNC=false` in prod, generate TypeORM migrations from the current entities, run them in CI/deploy. **Effort:** L (baseline migration plus testing on a copy of prod). **Risk:** a wrong baseline can drop data. Do it on a restored backup first.

**R-06 Voice webhook public, no shared secret (Medium).** Same pattern as R-04 for the voice provider. **Fix:** require a secret header or provider signature. **Effort:** S-M. **Risk:** provider dashboard needs the secret configured.

**R-07 Optional-tenant fallbacks in services (Medium, defence in depth).** `Customer.service.ts:88,127,137` and others use `tenantId ? scoped : unscoped`. See central enforcement below.

---

## 4. Special checks

### Tenant isolation: can it be enforced centrally?
Yes. Recommended approach for NestJS + TypeORM + Postgres, in order of value:

1. **Default-deny auth:** register `JwtAuthGuard` as a global `APP_GUARD`, with an `@Public()` decorator for login and the webhooks. This removes the "forgot to add the guard" class (H-05). Effort S-M.
2. **Scoped repository layer:** one `TenantScopedRepository<T>` (or `BaseTenantService`) that takes the tenant once from request context (`AsyncLocalStorage` set by the guard) and injects `tenant_id = :t` into every `find/update/delete/createQueryBuilder`, throwing if no tenant is in context. Services stop accepting a `tenantId` argument at all, which removes R-02 and R-07 structurally. Effort L, but can be migrated module by module.
3. **Postgres Row-Level Security as the backstop:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + a policy `tenant_id = current_setting('app.tenant_id')`, with `SET LOCAL app.tenant_id` in a per-request transaction (via a TypeORM subscriber or an interceptor that wraps requests in a transaction). Requires the app to connect as a **non-owner, non-superuser** DB role or RLS is bypassed, and webhooks/cron need an explicit system role. Effort L-XL; real but riskiest. Do it last, after backfill and after `tenant_id` is `NOT NULL`.

My honest recommendation: do (1) now, (2) for the remaining modules over time, and treat (3) as optional hardening; it is the only layer that protects against a bug in the application code, but it is the one that can break background jobs.

### Existing data: rows without a tenant?
Yes, on any database created before this work: `user.company_id` is NULL for all old users (the column is new), and business tables hold `'default'`, `'all'`, NULL, or the old UUID `646b4abe-...` in `tenant_id`. I did **not** inspect your real DB (I only used scratch DBs), so I cannot give counts.
Safe backfill: `backend/migrations/1730800000000-BackfillLegacyTenants.sql` exists, **was not run**, and ends in `ROLLBACK` by default. It attaches legacy users to the oldest company, marks that company onboarded, and re-tags legacy tenant ids across every table that has a `tenant_id` column. It assumes **all legacy data belongs to one tenant**, which was true under the old hardcoded design. If you have genuinely distinct customers in legacy data, that cannot be inferred automatically and needs a manual mapping (open question 1).

### WhatsApp credentials to per-tenant encrypted storage without breaking connections?
Yes. Approach already in place: application-level AES via `EncryptedColumn` with an `enc:v1:` prefix; reads accept legacy plaintext, so **existing connected accounts keep working** and are encrypted on their next save. For a one-off full re-encrypt, run a small script that loads and re-saves each `whatsapp_config` row. A secrets manager (AWS KMS/Vault) is the better long-term answer because the current key (`SECERT_KEY`) lives in the same `.env` as the DB password, so a compromised server yields both; but it is an infrastructure decision, not a code blocker. Envelope encryption with a KMS data key is the upgrade path with no schema change (the prefix `enc:v1:` can become `enc:v2:`).

### Onboarding: save per step and resume with the current schema?
Yes, and it is done without any new table: `company.onboarding_completed`, `onboarding_step`, `onboarding_data` (jsonb), `industry`, `company_size`, plus `GET /Onboarding/State`, `PUT /Onboarding/Step`, `POST /Onboarding/Complete`. Limitation: state is per **company**, not per user, so two admins of one tenant share one wizard. That matches the product (one onboarding per tenant) but is worth confirming.

### Is anything fundamentally wrong enough that a rewrite is cheaper than patching?
No. The original design was wrong in two specific places (tenant identity not modelled; scoping done ad hoc with a shared `'default'` bucket) and both have been replaced in place. What remains is hardening, not redesign. One caution: the **Omnichannel and Voice modules** still carry the old `tenantId = "default"` style throughout (~230 occurrences). They are protected by the guard today, but if you plan more work in those modules, converting them to the scoped-repository pattern first is cheaper than finding every remaining default one by one.

---

## 5. Recommended fix order

Estimates are for what is **left**, not the original work.

**Phase 1: close real holes (about 1 to 1.5 days)**
1. R-01 Omnichannel webhook tenant resolution (M)
2. R-02 Omnichannel `getLeads` exact match (S)
3. L-02 / M-04 rotate secrets, untrack `backend/.env`, change `META_WA_VERIFY_TOKEN` (S, **needs you**)
4. Run the legacy backfill after a backup (S, **needs your decision**)
5. R-04 Meta signature check, log-only first (M)
6. Add `TenantContextGuard` to Customer controller (S)

**Phase 2: auth and onboarding correctness (about 1 day)**
7. H-03 / H-02 move OTP and lockout to a shared store; fix OTP-consumed-before-password-check (M)
8. L-01 remove hardcoded `onboarding_completed: true` from login payload (S)
9. C-06 remove the remaining `Login123!!` defaults (S)
10. R-03 `VITE_GOOGLE_CLIENT_ID` in all three frontend files (S)
11. C-05 delete dead `googleAuth` body in `Auth.service.ts` (S)
12. H-06 sanitise DB errors (S)

**Phase 3: hardening and cleanup (about 3 to 5 days)**
13. Global default-deny auth guard (S-M)
14. R-06 voice webhook secret (S-M)
15. R-05 real migrations, `DB_SYNC=false` in prod (L)
16. R-02/R-07 required-tenant parameters, scoped repository, module by module (L)
17. Make `tenant_id` NOT NULL and drop `'default'` column defaults after backfill (S-M)
18. Optional RLS (L-XL)
19. Remove Omnichannel `seed-demo`/`seed-ram` endpoints or gate to non-production (S)
20. Commit hygiene: decide what to do with ~120 regenerated `dist/` files (S)

---

## 6. DB migrations needed (in order, with rollback notes)

| # | Migration | Notes | Rollback |
|---|---|---|---|
| 0 | **Backup** (`pg_dump`) | prerequisite for everything | n/a |
| 1 | Schema additions (currently created by `synchronize`): `user.company_id` (FK), `user.reset_otp_expires_at`, `company.onboarding_completed/onboarding_step/onboarding_data/industry/company_size`, `whatsapp_config.verify_token` nullable, `phone_number_id` index | Additive, safe | `ALTER TABLE ... DROP COLUMN` for each new column |
| 2 | **Dedupe `whatsapp_config`** by `tenant_id` (keep one row per tenant) then create `UNIQUE(tenant_id)` | Index creation fails the boot if duplicates exist. This is a data decision: pick which row to keep. | `DROP INDEX` |
| 3 | `1730800000000-BackfillLegacyTenants.sql` | In a transaction. Review target company. Replace `ROLLBACK` with `COMMIT` only after the sanity checks return 0 rows. | Restore from backup (the script re-tags data and keeps no old values; **take the backup first**) |
| 4 | Re-encrypt existing WhatsApp tokens (script, not SQL) | Loads and re-saves each row | Decrypt-and-resave script; needs `SECERT_KEY` |
| 5 | `auth_otp` / `auth_login_attempt` tables (or Redis) | Only if you choose DB over Redis (open question 3) | `DROP TABLE` |
| 6 | `ALTER COLUMN tenant_id SET NOT NULL` and remove `DEFAULT 'default'` on every business table | **Only after #3 shows zero NULL/'default' rows**; ~25 tables | `DROP NOT NULL`, restore defaults |
| 7 | Baseline TypeORM migration set + `DB_SYNC=false` | Generate against a copy of prod | Keep `DB_SYNC=true` on a copy only |
| 8 | Optional: RLS policies | needs non-owner app role | `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`, `DROP POLICY` |

---

## 7. Open questions (I need your decision before fixing)

1. **Legacy data ownership:** does all existing `'default'`/NULL data belong to your oldest company ("BoilerPlate"/Sharyx), or are there several real customers mixed in? This decides whether the backfill script is correct as written.
2. **Secrets:** will you rotate everything that was in `backend/.env`, and do you want me to `git rm --cached` it? Do you want git **history** rewritten (breaks all clones) or rotation only?
3. **Shared store:** Redis or Postgres for OTP and lockout? Is the app ever run as more than one instance?
4. **Meta app model:** one Meta app for the whole platform (then a single `META_APP_SECRET` and a platform verify token) or each tenant brings their own app (then per-tenant app secret column)?
5. **Omnichannel/Voice webhook callers:** who posts to `/Omnichannel/Webhooks/*` and `/Voice/Webhook` today (n8n, provider, internal scripts)? They will break when the client-supplied tenant is removed.
6. **Row-Level Security:** do you want it? It is the only protection against future application bugs but adds operational risk.
7. **Other session's files:** `Auth.service.ts`, `User.service.ts` and `Customer.*` are owned by `workforce-sharyx-00`. Should I fix items 7, 8, 11 and the Customer guard in those files, or should that session do it?
8. **Environments:** is `DB_SYNC=true` currently relied on in production? Moving to migrations (R-05) depends on this.
9. **Demo endpoints:** keep or remove Omnichannel `seed-demo`/`seed-ram`?
10. **Commit scope:** commit the source fixes only, or also the ~120 regenerated `dist/` files? Nothing has been committed yet (my first-pass work is on `backup/audit-fixes-wip`).

---

## 8. Caveats on this assessment

- Nothing was re-tested live in this pass. The live claims come from the earlier 88/89 run; the "by code" claims are from grep/reads performed now.
- `reports/fixes-applied-report.md` is **damaged**: lines 23-36 contain a pasted copy of my chat reply inside the C-01 table row, which also hides the C-01 fix description and breaks the table. I did not edit it (I was told it changed on disk and not to revert). Its claim that the hardcoded Google client id was removed from the wizard is only half true (R-03). Tell me if you want me to repair it.
- I did not inspect your real database, so I have no row counts for legacy data.
- I did not touch any source, schema, or data, and no commits were made.

**Stopping here, as instructed. No fixes will be started until you approve.**
