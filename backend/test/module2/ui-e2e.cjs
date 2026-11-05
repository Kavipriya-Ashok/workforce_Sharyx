/* eslint-disable */
/**
 * Module 2 real-browser tests (headless Chrome via puppeteer-core). SCRATCH STACK ONLY.
 *   backend :8001 (DB sharyx_m2, mocks on :9101-9104)   frontend: VITE_API_TARGET=http://localhost:8001 npx vite --port 8071
 *   node test/module2/ui-e2e.cjs <out.json>      env: UI, SERVER_LOG, SMTP_SERVER_PATH, PUPPETEER_PATH, CHROME_PATH
 * Part A = functional flows (desktop, light). Part B = the view x viewport x theme audit matrix (screens + automated checks).
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const mocks = require('./mocks.cjs');
const puppeteer = require(process.env.PUPPETEER_PATH || 'puppeteer-core');

const UI = process.env.UI || 'http://localhost:8071';
const API = 'http://127.0.0.1:8001/api/v1';
const SERVER_LOG = process.env.SERVER_LOG || '';
const OUT = process.argv[2] || path.join(__dirname, 'ui-results.json');
const SHOTS = process.env.SHOTS || path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const PG = { host: '127.0.0.1', port: 5433, user: 'scratch', password: 'scratch', database: process.env.DB_NAME || 'sharyx_m2' };
const STRONG = 'Str0ng!Passw0rd';
const RUN = Date.now().toString(36);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ipc = 0; const ip = () => `10.5.${(ipc >> 8) & 255}.${(ipc++ % 250) + 1}`;
const results = []; const audits = [];
const check = (id, title, pass, actual) => { results.push({ id, title, pass: !!pass, actual }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${title}\n      -> ${actual}`); };

async function api(method, p, { token, body } = {}) {
  const r = await fetch(API + p, { method, headers: { 'content-type': 'application/json', 'x-forwarded-for': ip(), ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {} return { status: r.status, json: j };
}
async function signup(email, company) {
  const a = ip(); await api('POST', '/Auth/SendSignupOtp', { body: { email } });
  let otp = null; const re = new RegExp(`Email: ${email.replace(/[.+]/g, '\\$&')} \\| (?:New )?OTP Code: (\\d{6})`, 'g');
  for (let i = 0; i < 40 && !otp; i++) { const all = [...fs.readFileSync(SERVER_LOG, 'utf8').matchAll(re)]; if (all.length) otp = all[all.length - 1][1]; else await sleep(150); }
  const r = await fetch(API + '/Auth/VerifySignupOtp', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': a }, body: JSON.stringify({ email, otp, password: STRONG, confirm_password: STRONG, company_name: company, first_name: 'UI', last_name: 'Tester' }) });
  const j = await r.json(); return { token: j.result.api_token, user: j.result.user, tenant: j.result.user.tenant_id, email };
}
const WIZ = { 1: { company_name: 'Acme Test', business_email: 'owner@acme.test', website: 'acme.test' }, 2: { address: '1 Test Street', city: 'Chennai', state: 'TN', pincode: '600001' }, 3: { industry: 'IT & Software', selected_services: ['AI Lead Qualification'] }, 4: { goals: ['Answer customers 24/7'] }, 6: { apps: ['HubSpot'] }, 7: { company_size: '2 - 10 employees' } };
async function wiz(token, steps = [1, 2, 3, 4, 6, 7], complete = false) { for (const s of steps) await api('PUT', '/Onboarding/Step', { token, body: { step: s, data: WIZ[s] } }); if (complete) await api('POST', '/Onboarding/Complete', { token }); }

(async () => {
  const db = new Client(PG); await db.connect(); const M = await mocks.start();
  const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
  const consoleErrors = [];
  const newPage = async ({ w = 1280, h = 860, theme = 'light', mobile = false, session = null } = {}) => {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    page.on('pageerror', (e) => consoleErrors.push(String(e.message).slice(0, 160)));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource.*(400|401|404|422|429)|net::ERR/.test(m.text())) consoleErrors.push(m.text().slice(0, 160)); });
    page.on('dialog', (d) => d.dismiss());
    await page.evaluateOnNewDocument((t, s) => { try { localStorage.setItem('sharyx-theme', t); if (s) localStorage.setItem('sharyx_user', JSON.stringify(s)); } catch {} }, theme, session);
    return page;
  };
  const sess = (u, token, completed) => ({ ...u.user, api_token: token, onboarding_completed: completed, tenant_id: u.tenant, tenantId: u.tenant, role: 'Admin', first_name: 'UI' });
  const text = (page, sel) => page.$eval(sel, (e) => e.innerText).catch(() => null);
  const clickText = async (page, txt, tag = 'button') => { const ok = await page.evaluate((t, tg) => { const el = [...document.querySelectorAll(tg)].find((b) => b.innerText && b.innerText.trim().includes(t) && !b.disabled); if (el) { el.click(); return true; } return false; }, txt, tag); if (!ok) throw new Error('no clickable: ' + txt); };
  const setVal = async (page, sel, v) => { await page.click(sel, { clickCount: 3 }); await page.keyboard.press('Backspace'); if (v) await page.type(sel, v); };
  const stableGoto = async (page, url) => { await page.goto(UI + url, { waitUntil: 'networkidle0' }); await sleep(300); };

  /** automated per-view audit */
  async function audit(page, name) {
    const a = await page.evaluate(() => {
      const ratio = (fg, bg) => { const lum = (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }; const l1 = lum(fg), l2 = lum(bg); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
      const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true });
      const parse = (css) => { if (!css || css === 'transparent') return null; cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = css; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return { rgb: [d[0], d[1], d[2]], a: d[3] / 255 }; };
      const bgOf = (el) => { let e = el; while (e) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c.rgb; e = e.parentElement; } return getComputedStyle(document.body).colorScheme === 'dark' ? [2, 6, 23] : [255, 255, 255]; };
      const sample = [...document.querySelectorAll('h1,h2,label,p,dt,dd,button,[data-testid=status-badge],a,li,span')].filter((e) => e.innerText && e.innerText.trim().length > 2 && e.offsetParent !== null && e.getBoundingClientRect().width > 0).slice(0, 220);
      const bad = []; let min = 21; const NEW = '[data-testid=profile-page],[data-testid=setup-checklist],[data-testid=wizard-saved-status]'; let nMin = 21, nBad = 0, nCount = 0; const nBadList = [];
      for (const el of sample) { const c = parse(getComputedStyle(el).color); if (!c) continue; const r = ratio(c.rgb, bgOf(el)); const fs = parseFloat(getComputedStyle(el).fontSize); const need = fs >= 18 ? 3 : 4.5; if (r < min) min = r; const isNew = !!el.closest(NEW); if (isNew) { nCount++; if (r < nMin) nMin = r; } if (r < need) { bad.push(`${el.tagName.toLowerCase()}("${el.innerText.trim().slice(0, 24)}") ${r.toFixed(1)}:1`); if (isNew) { nBad++; nBadList.push(`${el.tagName.toLowerCase()}("${el.innerText.trim().slice(0, 24)}") ${r.toFixed(1)}:1`); } } }
      const inputs = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox])')].filter((i) => i.offsetParent !== null);
      const unlabeled = inputs.filter((i) => !i.labels?.length && !i.getAttribute('aria-label') && !i.getAttribute('placeholder')).length;
      const btnNoName = [...document.querySelectorAll('button')].filter((b) => b.offsetParent !== null && !b.innerText.trim() && !b.getAttribute('aria-label') && !b.title).length;
      const small = [...document.querySelectorAll('button,a,input')].filter((e) => e.offsetParent !== null).filter((e) => { const r = e.getBoundingClientRect(); return r.height < 28 && r.width > 0; }).length;
      return { newUiSampled: nCount, newUiMinContrast: nCount ? Number(nMin.toFixed(1)) : null, newUiLowContrast: nBad, newUiLowList: nBadList.slice(0, 4), overflowX: document.documentElement.scrollWidth - window.innerWidth, minContrast: Number(min.toFixed(1)), lowContrast: bad.slice(0, 5), lowContrastCount: bad.length, unlabeledInputs: unlabeled, buttonsWithoutName: btnNoName, smallTargets: small };
    });
    audits.push({ name, ...a }); return a;
  }

  try {
    // ============================================================ PART A: functional flows (desktop, light)
    if (!process.env.AUDIT_ONLY) {
    const tenantA = await signup(`authtest.m2ui.${RUN}.a@example.test`, 'UI Tenant A');
    await wiz(tenantA.token); // steps 1,2,3,4,6,7 saved; sitting at step 8
    let page = await newPage({ session: sess(tenantA, tenantA.token, false) });

    // A1 wizard resumes where the server says; ?step=9 deep link
    await stableGoto(page, '/onboarding'); const step1 = await text(page, 'body');
    check('UI-M2-01', 'Wizard resumes at the saved step (server state, not browser state)', /Step\s*8\s*of 10/.test(step1.replace(/\s+/g, ' ')), `shows: ${(step1.match(/Step\s*\d+\s*of 10/) || ['?'])[0]}`);
    await stableGoto(page, '/onboarding?step=9'); const t9 = await text(page, 'body');
    check('UI-M2-02', '?step=9 deep link (used by the dashboard checklist) opens WhatsApp step', /WhatsApp Automation/.test(t9) && /Step\s*9\s*of 10/.test(t9.replace(/\s+/g, ' ')), `shows: ${(t9.match(/Step\s*\d+\s*of 10/) || ['?'])[0]}`);
    await page.screenshot({ path: path.join(SHOTS, 'a-wizard-step9-initial.png') });

    // A2 step 9: failing connect -> SAVED Failed + reason shown from the backend
    await setVal(page, 'input[placeholder="+1 555 019 2831"]', '+15550100100'); await setVal(page, 'input[placeholder="10928371928371"]', `PNID-UI-${RUN}`); await setVal(page, 'input[placeholder="98127391823719"]', 'WABA-UI-1'); await setVal(page, '[data-testid=wa-token]', 'REVOKEDTOKEN-UI');
    await clickText(page, 'Test WhatsApp Connection'); await page.waitForSelector('[data-testid=wizard-saved-status][data-state=failed]', { timeout: 20000 });
    const failTxt = await text(page, '[data-testid=wizard-saved-status][data-state=failed]');
    const dbRow = (await db.query(`select status, error_message from tenant_integration_status where tenant_id=$1 and type='whatsapp'`, [tenantA.tenant])).rows[0];
    check('UI-M2-03', 'Failed connect shows the SAVED backend status + simple reason (not a local guess)', /Failed/i.test(failTxt) && /token/i.test(failTxt) && dbRow && dbRow.status === 'failed', `panel: "${failTxt.replace(/\s+/g, ' ').slice(0, 130)}" | db row: ${dbRow && dbRow.status}`);
    await page.screenshot({ path: path.join(SHOTS, 'a-wizard-step9-failed.png') });
    await page.reload({ waitUntil: 'networkidle0' }); await sleep(300); await stableGoto(page, '/onboarding?step=9');
    const afterReload = await text(page, '[data-testid=wizard-saved-status]');
    const restored = await page.evaluate(() => ({ phone: document.querySelector('input[placeholder="+1 555 019 2831"]').value, pid: document.querySelector('input[placeholder="10928371928371"]').value, token: document.querySelector('[data-testid=wa-token]').value, ph: document.querySelector('[data-testid=wa-token]').placeholder }));
    check('UI-M2-04b', 'After reload the non-secret WhatsApp fields are restored and the saved token is NOT shown', restored.phone === '+15550100100' && restored.pid.startsWith('PNID-UI-') && restored.token === '' && /saved/i.test(restored.ph), `phone="${restored.phone}", phone id restored=${restored.pid.startsWith('PNID-UI-')}, token box="${restored.token}", placeholder="${restored.ph}"`);
    check('UI-M2-04', 'After a page reload the Failed status and reason are still shown (loaded from the server)', /Failed/i.test(afterReload || ''), `after reload: "${(afterReload || '').replace(/\s+/g, ' ').slice(0, 110)}"`);

    // A3 fix the token -> Connected
    await setVal(page, '[data-testid=wa-token]', 'GOODTOKEN-UI'); await clickText(page, 'Test WhatsApp Connection'); await page.waitForSelector('[data-testid=wizard-saved-status][data-state=connected]', { timeout: 20000 });
    const okTxt = await text(page, '[data-testid=wizard-saved-status][data-state=connected]');
    check('UI-M2-05', 'Fixing the token and testing again flips the saved status to Connected', /Connected/i.test(okTxt), `panel: "${okTxt.replace(/\s+/g, ' ').slice(0, 100)}"`);
    await page.screenshot({ path: path.join(SHOTS, 'a-wizard-step9-connected.png') });

    // A4 double click Continue must advance exactly one step
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Continue'); b && b.click(); b && b.click(); });
    await sleep(1800); const afterDbl = await text(page, 'body');
    check('UI-M2-06', 'Double-clicking Continue advances exactly ONE step', /Step\s*10\s*of 10/.test(afterDbl.replace(/\s+/g, ' ')), `shows: ${(afterDbl.match(/Step\s*\d+\s*of 10/) || ['?'])[0]}`);

    // A5 step 10: email failing then skip -> flags + dashboard Pending
    await page.screenshot({ path: path.join(SHOTS, 'a-wizard-step10.png') });
    await clickText(page, 'SMTP / App Password'); await sleep(300);
    const skipBtn = await page.evaluate(() => !![...document.querySelectorAll('button')].find((b) => b.innerText.includes('Skip & Enter Dashboard')));
    check('UI-M2-07', 'Step 10 has a Skip button (and Step 9 had one)', skipBtn, `skip on step 10: ${skipBtn}`);
    await clickText(page, 'Skip & Enter Dashboard'); await page.waitForFunction(() => location.pathname.startsWith('/admin'), { timeout: 15000 });
    const st = (await api('GET', '/Onboarding/State', { token: tenantA.token })).json;
    check('UI-M2-08', 'Skipping Step 10 records email_skipped on the server and completes onboarding', st.onboarding_completed === true && st.data.email_skipped === true, `completed=${st.onboarding_completed}, email_skipped=${st.data.email_skipped}, whatsapp_skipped=${st.data.whatsapp_skipped}`);
    await sleep(1500);
    const emailItem = await page.$eval('[data-testid=check-email]', (e) => ({ state: e.dataset.state, text: e.innerText })).catch(() => null);
    const waItem = await page.$eval('[data-testid=check-whatsapp]', (e) => ({ state: e.dataset.state, text: e.innerText })).catch(() => null);
    check('UI-M2-09', 'Dashboard checklist: skipped Email = Pending (not Done); connected WhatsApp = Done', emailItem && emailItem.state === 'pending' && /Skipped/i.test(emailItem.text) && waItem && waItem.state === 'done', `email=${emailItem && emailItem.state} ("${(emailItem && emailItem.text.replace(/\s+/g, ' ').slice(0, 90))}"), whatsapp=${waItem && waItem.state}`);
    await page.screenshot({ path: path.join(SHOTS, 'a-dashboard-checklist.png') });

    // A6 live update across tabs: revoke token behind the scenes, press test on the profile page in tab 2, tab 1 (dashboard) updates itself
    const tab2 = await newPage({ session: sess(tenantA, tenantA.token, true) });
    await stableGoto(tab2, '/admin/profile');
    check('UI-M2-10', 'Profile page is linked in the sidebar and opens at /admin/profile', /Company profile/i.test((await text(tab2, 'h1')) || '') && await tab2.$('[data-testid=nav-profile]') !== null, `h1="${await text(tab2, 'h1')}"`);
    M.meta.revoked.add('GOODTOKEN-UI');
    await tab2.waitForSelector('[data-testid=test-whatsapp]'); await tab2.click('[data-testid=test-whatsapp]');
    await tab2.waitForSelector('[data-testid=int-whatsapp][data-state=failed]', { timeout: 20000 });
    await page.waitForFunction(() => document.querySelector('[data-testid=check-whatsapp]')?.getAttribute('data-state') === 'failed', { timeout: 15000 }).catch(() => {});
    const live = await page.$eval('[data-testid=check-whatsapp]', (e) => e.dataset.state).catch(() => null);
    check('UI-M2-11', 'Dashboard checklist updates by itself after a test in another tab (no manual refresh)', live === 'failed', `dashboard tab now shows WhatsApp = ${live}`);
    await page.screenshot({ path: path.join(SHOTS, 'a-dashboard-failed.png') });
    const errText = await text(tab2, '[data-testid=int-whatsapp] [data-testid=int-error]');
    check('UI-M2-12', 'Profile page shows the failed WhatsApp card with a simple reason, last-checked time and Reconnect', /token/i.test(errText || '') && await tab2.$('[data-testid=reconnect-whatsapp]') !== null && /Last checked/i.test((await text(tab2, '[data-testid=int-whatsapp]')) || ''), `reason: "${(errText || '').slice(0, 90)}"`);
    await tab2.screenshot({ path: path.join(SHOTS, 'a-profile-failed.png'), fullPage: true });

    // A7 reconnect through the dialog (token stays hidden)
    M.meta.revoked.delete('GOODTOKEN-UI');
    await tab2.click('[data-testid=reconnect-whatsapp]'); await tab2.waitForSelector('[data-testid=wa-dialog]');
    const tokenField = await tab2.$eval('#wa-token', (e) => ({ value: e.value, ph: e.placeholder, type: e.type }));
    check('UI-M2-13', 'Saved keys are never shown: the token box is empty with "saved" placeholder, type=password', tokenField.value === '' && /saved/i.test(tokenField.ph) && tokenField.type === 'password', `value="${tokenField.value}", placeholder="${tokenField.ph}", type=${tokenField.type}`);
    await tab2.screenshot({ path: path.join(SHOTS, 'a-profile-dialog.png') });
    await tab2.type('#wa-token', 'GOODTOKEN-UI'); await clickText(tab2, 'Save & test'); await tab2.waitForSelector('[data-testid=int-whatsapp][data-state=connected]', { timeout: 20000 });
    check('UI-M2-14', 'Reconnect: new token -> card turns Connected', true, 'card shows Connected');

    // A8 disconnect with confirmation, then status
    await tab2.click('[data-testid=disconnect-whatsapp]'); await tab2.waitForSelector('[data-testid=disconnect-dialog]'); await clickText(tab2, 'Yes, disconnect');
    await tab2.waitForSelector('[data-testid=int-whatsapp][data-state=not_configured]', { timeout: 15000 });
    const waRow = (await db.query(`select access_token from whatsapp_config where tenant_id=$1`, [tenantA.tenant])).rows[0];
    check('UI-M2-15', 'Disconnect (with confirmation) erases the saved token and the card shows Not connected', waRow.access_token === '', `token in DB erased=${waRow.access_token === ''}`);
    await tab2.screenshot({ path: path.join(SHOTS, 'a-profile-disconnected.png'), fullPage: true });

    // A9 company profile edit
    await clickText(tab2, 'Edit', 'button'); await tab2.waitForSelector('[data-testid=profile-form]');
    await setVal(tab2, '#pf-name', 'Acme UI Renamed'); await setVal(tab2, '#pf-web', 'not a website'); await clickText(tab2, 'Save changes');
    await tab2.waitForSelector('[data-testid=profile-error]', { timeout: 8000 }); const pe = await text(tab2, '[data-testid=profile-error]');
    await setVal(tab2, '#pf-web', 'https://acme.test'); await clickText(tab2, 'Save changes'); await tab2.waitForSelector('[data-testid=profile-view]', { timeout: 8000 });
    const nm = await text(tab2, '[data-testid=profile-view]');
    check('UI-M2-16', 'Company profile edit: invalid website is refused with a message; valid save shows the new values', /valid website/i.test(pe || '') && /Acme UI Renamed/.test(nm || ''), `error: "${(pe || '').slice(0, 60)}"; saved name shown=${/Acme UI Renamed/.test(nm || '')}`);

    // A10 route guards
    // an isolated browser context = a genuinely logged-out visitor (pages of one context share localStorage)
    const ctx = await browser.createBrowserContext(); const anon = await ctx.newPage(); await anon.setViewport({ width: 1280, height: 860 }); await stableGoto(anon, '/admin/profile'); const p1 = new URL(anon.url()).pathname;
    await stableGoto(anon, '/admin/dashboard'); const p2 = new URL(anon.url()).pathname;
    const done = await newPage({ session: sess(tenantA, tenantA.token, true) }); await stableGoto(done, '/onboarding'); await sleep(800); const p3 = new URL(done.url()).pathname;
    const tenantB = await signup(`authtest.m2ui.${RUN}.b@example.test`, 'UI Tenant B'); await wiz(tenantB.token);
    const mid = await newPage({ session: sess(tenantB, tenantB.token, false) }); await stableGoto(mid, '/admin/profile'); await sleep(1000); const p4 = new URL(mid.url()).pathname;
    check('UI-M2-17', 'Route guards: logged-out /admin/profile and /admin/dashboard -> /login; finished tenant on /onboarding -> /admin; unfinished tenant on /admin/profile -> /onboarding', p1 === '/login' && p2 === '/login' && p3.startsWith('/admin') && p4 === '/onboarding', `logged-out profile -> ${p1}; logged-out dashboard -> ${p2}; finished tenant /onboarding -> ${p3}; unfinished /admin/profile -> ${p4}`);

    // A11 tenant isolation in the UI: B's profile page never shows A's data
    const bProf = await newPage({ session: sess(tenantB, tenantB.token, true) }); await api('POST', '/Onboarding/Complete', { token: tenantB.token }); await stableGoto(bProf, '/admin/profile');
    const bTxt = await text(bProf, 'body');
    check('UI-M2-18', 'Tenant B\'s profile/integrations page never shows Tenant A\'s company or mailbox', !/Acme UI Renamed|UI Tenant A/.test(bTxt) && !new RegExp(`PNID-UI-${RUN}`).test(bTxt), `A's name on B's page=${/Acme UI Renamed/.test(bTxt)}`);

    }
    // ============================================================ PART B: audit matrix
    // a tenant with a rich mixed state: WhatsApp failed, SMTP connected, IMAP failed, LLM connected, voice not connected
    const rich = await signup(`authtest.m2ui.${RUN}.rich@example.test`, 'Rich Co'); await wiz(rich.token, [1, 2, 3, 4, 6, 7], true);
    await api('POST', '/WhatsApp/Test-Connection', { token: rich.token, body: { phone_number: '+15550100100', phone_number_id: `PNID-RICH-${RUN}`, access_token: 'GOODTOKEN-RICH', provider: 'meta_cloud' } });
    M.meta.revoked.add('GOODTOKEN-RICH'); await api('POST', '/Integrations/whatsapp/Test', { token: rich.token });
    M.mail.imapAccept = false; await api('POST', '/Email/Test-Connection', { token: rich.token, body: { email_address: 'rich@mock.test', smtp_host: '127.0.0.1', smtp_port: 9102, smtp_user: 'rich@mock.test', smtp_password: 'good-app-password', imap_host: '127.0.0.1', imap_port: 9103, use_ssl: false } }); M.mail.imapAccept = true;
    await db.query(`INSERT INTO wa_ai_config(tenant_id, llm_provider, llm_model, api_key, status, is_ai_enabled, ai_mode, auto_followup_enabled, followup_delay_minutes) VALUES ($1,'openai','gpt-4o-mini','sk-test-good-key',true,true,'hybrid',true,60)`, [rich.tenant]).catch(() => {});
    await api('POST', '/Integrations/llm/Test', { token: rich.token });
    const wizUser = await signup(`authtest.m2ui.${RUN}.w@example.test`, 'Wizard Co'); await wiz(wizUser.token, [1, 2, 3, 4, 6, 7]);

    const views = [
      { name: 'wizard-step9', user: wizUser, completed: false, url: '/onboarding?step=9', ready: '[data-testid=wa-token]' },
      { name: 'wizard-step10', user: wizUser, completed: false, url: '/onboarding?step=10', ready: 'h3, [class*=CardTitle], body' },
      { name: 'profile', user: rich, completed: true, url: '/admin/profile', ready: '[data-testid=int-whatsapp]' },
      { name: 'dashboard-checklist', user: rich, completed: true, url: '/admin/dashboard', ready: '[data-testid=setup-checklist] [data-testid=check-whatsapp]' },
    ];
    const viewports = [{ n: 'desktop', w: 1280, h: 860, mobile: false }, { n: 'mobile', w: 390, h: 844, mobile: true }];
    for (const v of views) for (const vp of viewports) for (const theme of ['light', 'dark']) {
      const pg = await newPage({ w: vp.w, h: vp.h, theme, mobile: vp.mobile, session: sess(v.user, v.user.token, v.completed) });
      const before = consoleErrors.length;
      await stableGoto(pg, v.url); await pg.waitForSelector(v.ready, { timeout: 20000 }).catch(() => {}); await sleep(1500);
      const name = `${v.name}|${vp.n}|${theme}`; const a = await audit(pg, name);
      a.consoleErrors = consoleErrors.length - before; audits[audits.length - 1].consoleErrors = a.consoleErrors;
      await pg.screenshot({ path: path.join(SHOTS, `m-${v.name}-${vp.n}-${theme}.png`), fullPage: v.name === 'profile' });
      await pg.close();
    }
    // mobile navigation drawer
    const mp = await newPage({ w: 390, h: 844, mobile: true, session: sess(rich, rich.token, true) }); await stableGoto(mp, '/admin/dashboard');
    const hiddenAtStart = await mp.$eval('[data-testid=sidebar]', (e) => e.getBoundingClientRect().right <= 0);
    await mp.click('[data-testid=mobile-menu]'); await sleep(500); const openNow = await mp.$eval('[data-testid=sidebar]', (e) => e.getBoundingClientRect().left >= 0);
    await mp.click('[data-testid=nav-profile]'); await sleep(900); const closedAfter = await mp.$eval('[data-testid=sidebar]', (e) => e.getBoundingClientRect().right <= 0); const onProfile = new URL(mp.url()).pathname;
    check('UI-M2-19', 'Mobile: sidebar is a drawer (hidden, opens from the menu button, closes after choosing a page)', hiddenAtStart && openNow && closedAfter && onProfile === '/admin/profile', `hidden at start=${hiddenAtStart}, opens=${openNow}, closes after navigating=${closedAfter}, landed on ${onProfile}`);
  } catch (e) {
    check('UI-ERR', 'test script error', false, String((e && e.stack) || e).slice(0, 500));
  } finally {
    fs.writeFileSync(OUT, JSON.stringify({ results, audits, consoleErrors: consoleErrors.slice(0, 20) }, null, 2));
    await db.query(`delete from tenant_integration_status where tenant_id in (select company_id::text from "user" where email like 'authtest.m2ui.%')`).catch(() => {});
    await browser.close(); await M.stop(); await db.end();
  }
  const failed = results.filter((r) => !r.pass).length; console.log(`\n${results.length - failed}/${results.length} functional UI checks passed; ${audits.length} audit views captured; console errors: ${consoleErrors.length}`);
  process.exit(failed ? 1 : 0);
})();
