# Fixes Applied: Auth / Tenant Isolation / Onboarding / WhatsApp

Follow-up to `reports/auth-tenant-onboarding-audit.md`.

**Branch at time of writing:** `04/11/2026-signup-testing` (another session switched to it; all changes are **uncommitted**).
**Backup branch with my first-pass work:** `backup/audit-fixes-wip` (a8b29c89).
**Builds:** `npm run build` in `backend/` and `frontend/` both succeed. Backend `tsc --noEmit` is clean.
**Live verification:** 88 of 89 checks passed against a fresh scratch database. The one failure is explained in section 3.

## Who changed what

| Owner | Files |
|---|---|
| Other session (`workforce-sharyx-00`) | `Service/Auth/Auth.service.ts`, `Service/Admin/User.service.ts`; also, before the split: guards on the Lead/Customer/Email*/WhatsApp*/AiAgent/Automation/JobOpenings/Dashboard controllers, `Customer.service.ts`, `Exception.helper.ts` |
| This session | Everything else listed below |

---

## 1. Issues fixed

| Audit ID | Issue | Fix |
|---|---|---|
| C-01 | Hardcoded tenant UUID; signup never created a company | Signup Yes. I wrote reports/fixes-applied-report.md just now. It's a new file, and it only describes what was changed. It doesn't change any app behaviour.

If you meant the code, I did change it. Here is what I did and didn't touch:

Changed by me: about 60 source files under backend/src and frontend/src. These are the controllers, the Lead, WhatsApp and Voice services, the Company controller, the webhook, the onboarding pages and the seeder. The report lists each one.
New files I added:
GoogleAuth.service.ts
TenantContext.guard.ts
Onboarding.service.ts and Onboarding.controller.ts
SecretTransformer.ts
the backfill SQL in backend/migrations/, which I have not run
Not touched by me: Auth.service.ts and User.service.ts. The other session (workforce-sharyx-00) owns those, as you decided.
Nothing is committed. Everything is a working-tree change on branch 04/11/2026-signup-testing. My first-pass work is also saved on the backup/audit-fixes-wip branch.
You can review it yourself with git status and git diff. Use git diff <file> for a single file, or the Source Control panel in VS Code. If any change looks wrong, tell me the file and I'll explain or undo that part.creates a company per tenant and links the user via `user.company_id`. The JWT tenant comes from that row. No hardcoded UUID remains in `backend/src`. (`Auth.service.ts` by the other session, plus `company.ts`/`user.ts`.) |
| C-02 | Leads/Customers readable, editable and deletable across tenants | Removed every `OR tenant_id='default' OR NULL` clause; exact match only. Update/delete/status/bulk/activity/approve/trigger-call all verify ownership. `tenant_id` and `id` in a client body are ignored. (`Lead.service.ts`, `Lead.controller.ts`; `Customer.*` by the other session.) |
| C-03 | WhatsApp credentials shared by all tenants; token readable by anyone | One connection per tenant (unique index on `tenant_id`). A phone number can belong to only one tenant (409 otherwise). `GET /WhatsApp/Config` never returns the token (only `has_access_token` and a `••••1234` hint). The token is encrypted at rest (`enc:v1:` prefix in the DB). Added `POST /WhatsApp/Disconnect`. |
| C-04 | Webhook ignored `phone_number_id`; everything went to `"default"` | The inbound event is routed to the tenant that owns the `phone_number_id`. Unknown numbers are dropped. Leads, conversations and messages are created under that tenant. Replies are sent with that tenant's own credentials only. |
| C-05 | Google sign-in forgeable (account takeover) | New `GoogleAuth.service.ts`. Accepts only a server-side code exchange or a signature-verified Google ID token. The caller-supplied `email` field is ignored. Client id/secret come only from the environment. Requires a verified email. A new Google user gets their own company. (`Auth.service.ts` was left untouched; the controller now calls the new service.) |
| C-06 | Hardcoded backdoor passwords | Removed (other session). Verified: `Password123!` now returns 401. |
| H-01 | Reversible AES password storage | `HashPassword`/`VerifyPassword` (scrypt, per-user salt) in `Encryption.service.ts`. New passwords are hashed. Old ones upgrade on next login. Verified: new rows start with `scrypt$`. |
| H-02 | No login/OTP rate limiting | Login lockout (429) and OTP attempt limit (other session). Verified. |
| H-03 | OTP leaked in the API response | `debugOtp` is returned only if `AUTH_EXPOSE_DEBUG_OTP=true` and not production (other session). |
| H-04 | Tenant taken from client headers/query/body | `CurrentTenant` reads only the signed JWT. New `TenantContextGuard` overwrites `x-tenant-id`, `?tenantId`/`?tenant_id` and body `tenantId`/`tenant_id` with the JWT tenant on Voice, Omnichannel, Email, Automation, JobOpenings, Dashboard and AiAgent. Only a Super Admin can pick a tenant. Verified: sending another tenant's id changes nothing. |
| H-05 | Almost no controller required login | All business controllers now require a JWT. Webhooks (WhatsApp, Voice, Omnichannel) stay public. Verified: 13 endpoints return 401 without a token. |
| H-06 | Client errors returned HTTP 500 | `Exception.helper.ts` honours the real HTTP status (other session). Verified 400/401/404/409/429 now come back correctly. |
| M-01 | Wizard prefilled with dummy data; most answers never saved | All dummy defaults removed (fake token, address, phone, app password). Fields start empty or from the session. Each step is saved to the database on Continue. |
| M-02 | Wizard did not resume | `GET /Onboarding/State`; the wizard hydrates saved values and resumes at the furthest step. Verified through logout/login. |
| M-03 | User not linked to a company | `user.company_id`; login resolves the tenant through it. |
| M-04 | Shared default webhook verify token | Per-tenant random `verify_token` generated on connect; the hardcoded default is removed from code and entity. See the config caveat in section 3. |
| M-05 | WhatsApp secrets plaintext / sent to frontend | See C-03. Wizard secrets are not stored in `onboarding_data`. |
| L-03 | Different messages for unknown email vs wrong password | Same "Invalid email or password" message (other session). |
| New | Onboarding "completed" was a browser-only flag | `POST /Onboarding/Complete` validates required steps server-side and sets the flag on the company row. The frontend takes the server's value, not the login payload. |
| New | Frontend fake login when the API is unreachable, and client-side Super Admin by email | Removed. Role comes from the server only. |
| New | Frontend `DEFAULT_REAL_TENANTS` (two fabricated tenants) | Removed. The tenant list comes from `/Company/List`. |
| New | `/Company/List` returned every tenant; `/Company/Update` could edit any company | Normal users see and edit only their own company. Super Admin sees all. Verified. |
| New | Voice call-audio proxy looked calls up by id only and used any tenant's Vapi key | Scoped to the caller's tenant; the provider call id comes from our own record. |
| New | Omnichannel live stream (SSE) sent every tenant's events to every client | Clients are bound to a tenant; events are delivered only to the owning tenant. If the owner is unknown, only a Super Admin gets it. |
| New | `OutcomeTrigger` fell back to another tenant's WhatsApp credentials | Removed. |
| New | Sandbox bypass: any token containing "dummy"/"test" faked a successful connection (backend and frontend) | Removed from both. A failed test never overwrites saved credentials. |
| New | Fake demo conversations, templates, campaigns and AI config shown when the API failed | Replaced with empty results. |
| New | Seeded Super Admin had no tenant, so the strict login would lock it out on a fresh install | Seeder now links it to the seeded company and hashes its password. `SEED_ADMIN_PASSWORD` env var can override the default. |
| New | Fallback JWT signing secret committed in source | Removed. The app refuses to start without `TOKEN_SECRET`. |
| New | OTP email was sent through whichever tenant's mailbox was active | The other session's version sends OTPs via the platform SMTP only. |

### New files
- `Service/Auth/GoogleAuth.service.ts`, `Service/Auth/TenantContext.guard.ts`
- `Service/Onboarding/Onboarding.service.ts`, `Controller/Onboarding/Onboarding.controller.ts`
- `Helper/SecretTransformer.ts` (at-rest encryption)
- `backend/migrations/1730800000000-BackfillLegacyTenants.sql` (**not run**; see section 4)

---

## 2. Live verification (88/89)

Fresh database `audit_verify_fixes2`, two real tenants signed up through the API. Highlights:

| Area | Result |
|---|---|
| Unauthenticated access to 13 business endpoints | all 401 |
| Signup A and B | distinct tenant ids; "Alpha Corp" and "Beta Inc" rows created; users linked; scrypt hashes |
| Duplicate signup / invalid email / wrong OTP | 409 / 400 / 400 |
| Login | tenant matches signup; company name is the user's own; unknown email and wrong password give the same 401; 429 after repeated failures |
| Lead cross-tenant read, edit, delete, bulk-delete | 404 / 404 / 404 / unaffected |
| Header and query tenant spoofing | ignored |
| Customer cross-tenant list and by-id | empty / 404 |
| WhatsApp | separate rows per tenant; A cannot claim B's number (409); token never returned; encrypted at rest; unique verify tokens; "dummy" token no longer fakes success |
| Webhook | A's number lands in A, B's in B, unknown number stores nothing; leads carry the correct tenant; inbox and messages cannot be read across tenants; token rejected by Meta shows `is_connected=false` |
| Google auth | `{email}` only gives 400; forged credential gives 401 |
| Onboarding | validation 400s; step saved to the company row; secrets not persisted; resumes at step 3 after re-login; B's state independent of A's; completes only after required steps |
| Company endpoints | normal user sees only own company; cannot rename another tenant's company; Super Admin sees all and can impersonate via header |
| SSE and audio | 401 without token; `?access_token` works only on those two endpoints |

---

## 3. Known issues and things NOT fixed

### Found in the other session's file (not edited, per your instruction)
1. **Signup consumes the OTP before validating the password** (`Auth.service.ts`, `verifySignupOtp`). A password under 8 characters returns 400 but the code is already deleted, so the user must request a new code. Fix: move the password check above the OTP delete.
2. **Existing users with no `company_id` are rejected at login** ("Account is not linked to a tenant"). Run the backfill migration below before using this on an existing database.
3. The login payload still hardcodes `onboarding_completed: true`. The frontend now ignores it and reads `/Onboarding/State`, but it should be removed.

### The one failing check
Webhook handshake with the old public token `sharyx_verify_token_secure` still returns 200. Cause: `META_WA_VERIFY_TOKEN=sharyx_verify_token_secure` is set in `backend/.env` and `.env.local`, and the code accepts an optional platform-wide env token (needed when one Meta app serves all tenants). **Action: replace that value with a long random string.**

### Not done
- **Secrets are still in git.** `backend/.env` is tracked (history includes the DB password, API keys, SMTP password, Google client secret, and the hardcoded Google client secret that was in `Auth.service.ts`). I did not untrack it, because you asked for no deletions. **Rotate all of them**, then `git rm --cached backend/.env` and add it to `.gitignore`.
- **Webhook signature (`X-Hub-Signature-256`) is not verified.** Routing by `phone_number_id` stops cross-tenant misuse, but anyone who knows a tenant's `phone_number_id` can still post fake messages to it. Needs the Meta app secret plus raw-body capture.
- **Voice and Omnichannel webhooks** (`/Voice/Webhook`, `/Omnichannel/Webhooks/*`) are public and unauthenticated; I did not add signature or secret checks.
- **Postgres Row-Level Security** not added (defence in depth).
- **Legacy `"default"` data** is not migrated automatically (see section 4).
- Email (`Email.service.ts`) and Voice services still carry some `"default"` string defaults in places I did not need to change; the guard forces a real tenant in front of them, but I did not rewrite every internal call.
- Omnichannel `seed-demo` / `seed-ram` endpoints still exist (now tenant-scoped and login-required) but still create demo data on demand.
- The frontend has no automated tests; the UI flows (wizard, login redirects) were verified by type-check and build plus API-level tests, **not by driving a browser**.
- OTPs and login lockouts are in process memory (reset on restart; not shared across instances). Moving them to Redis/DB is recommended before running more than one instance.

---

## 4. What you need to do before deploying

1. **Rotate** every secret that was ever in `backend/.env`/source (DB, JWT `TOKEN_SECRET`, `SECERT_KEY`, Google client secret, SMTP, OpenAI/Gemini keys). Change `META_WA_VERIFY_TOKEN`.
2. **Back up the database**, then review and run `backend/migrations/1730800000000-BackfillLegacyTenants.sql` (ends in `ROLLBACK` by default so nothing is applied until you change it to `COMMIT`). It attaches legacy users to your oldest company, marks it onboarded, and re-tags legacy `'default'` rows.
3. **Existing WhatsApp token(s)** are stored as plain text today. They are encrypted automatically the next time each connection is saved; until then they still work.
4. **Everyone must log in again.** The JWT shape changed and old tokens lack the new claims.
5. `SECERT_KEY` must be set (token encryption fails without it).
6. Set `VITE_GOOGLE_CLIENT_ID` for the frontend (the hardcoded id was removed from the wizard).
7. `DB_SYNC=true` is on in `.env`: the new columns and the unique index on `whatsapp_config.tenant_id` will be created at startup. If you already have two rows with the same `tenant_id`, resolve them first.

---

## 5. Side effects of this work

- **`npm run build` regenerated tracked build output** (`backend/dist`, `frontend/dist`). That is why `git status` shows about 120 changed `dist/` files. Do not commit them unless you intend to.
- During testing the backend made real outbound calls with **fake tokens** to `graph.facebook.com` (rejected as expected) and to Ethereal (dev mail inbox). No real emails were sent: SMTP and AI keys were blanked for the test server.
- **`backend/.env.local` points at a remote database** (158.220.99.156) and overrides `.env`. My first start attempt would have used it; it failed to connect (the scratch DB name does not exist there), so nothing was written. All later runs pinned `DB_HOST=localhost`. Your real databases were never touched.
- Scratch databases `audit_scratch`, `audit_verify_fixes` and `audit_verify_fixes2` remain in your local Postgres (I ran no delete or drop commands, per your instruction). You can drop them yourself.
- A test server from the earlier session may still be listening on port 8099; the ones I started this session were stopped.
