/* eslint-disable */
/**
 * Real-browser (headless Chrome) proof of the Module 1 UI: forgot-password flow, password strength meter,
 * Google client-id handling, /oauth/callback errors, server-side logout.
 *
 * Needs:  npm i --no-save puppeteer-core      and Google Chrome installed (CHROME_PATH to override).
 * Run against a SCRATCH stack only:
 *   1) backend on :8001 with DB sharyx_scratch (see test/auth/auth-regression.cjs header)
 *   2) cd frontend && VITE_API_TARGET=http://localhost:8001 npx vite --port 8071 --strictPort
 *   3) node test/auth/ui-e2e.cjs                      (MODE=google-on UI=http://localhost:8072 for the env-client-id check,
 *                                                       started with VITE_GOOGLE_CLIENT_ID=env-test-client.apps.googleusercontent.com)
 * Screenshots land in test/auth/shots/.
 */
const puppeteer = require('puppeteer-core');
const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..');
const CryptoJS = require(path.join(ROOT, 'backend', 'node_modules', 'crypto-js'));

const UI = process.env.UI || 'http://localhost:8071';
const MODE = process.env.MODE || 'main'; // main | google-on
const OUT = process.env.OUT || path.join(__dirname, 'ui-results.json');
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const PG = { host: '127.0.0.1', port: 5433, user: 'scratch', password: 'scratch', database: 'sharyx_scratch' };
const KEY = (fs.readFileSync(path.join(ROOT, 'backend', '.env.local'), 'utf8').match(/^SECERT_KEY=(.*)$/m) || [])[1].trim();
const encId = (id) => CryptoJS.enc.Base64.parse(CryptoJS.AES.encrypt(id, KEY).toString()).toString();
const hash = (pw) => { const s = crypto.randomBytes(16); return `scrypt$${s.toString('hex')}$${crypto.scryptSync(pw, s, 64).toString('hex')}`; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (id, title, pass, actual) => { results.push({ id, title, pass: !!pass, actual }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${title}\n      -> ${actual}`); };

(async () => {
  const db = new Client(PG); await db.connect();
  const [role] = (await db.query(`select id from user_role where code='ADMIN'`)).rows;
  const co = (await db.query(`insert into company(name,email,address,postal_code,country_id,currency_id,onboarding_completed,onboarding_step,status) select 'UI Test Co','authtest.ui@example.test','','',(select id from country limit 1),(select id from currency limit 1),true,5,true returning id`)).rows[0];
  const email = `authtest.ui.${Date.now().toString(36)}@example.test`;
  const OLD = 'Old!Passw0rd1', NEW = 'Str0ng!Passw0rd';
  const uid = (await db.query(`insert into "user"(email,first_name,last_name,password,user_role_id,company_id,status) values($1,'UI','Tester',$2,$3,$4,true) returning id`, [email, hash(OLD), role.id, co.id])).rows[0].id;
  const otpOf = async () => Number((await db.query(`select reset_otp from "user" where id=$1`, [uid])).rows[0].reset_otp);

  const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1280, height: 860 } });
  const page = await browser.newPage();
  page.on('dialog', (d) => d.dismiss());
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, `${MODE}-${n}.png`) });
  const text = (sel) => page.$eval(sel, (e) => e.innerText).catch(() => null);
  const clickText = async (txt) => { const ok = await page.evaluate((t) => { const el = [...document.querySelectorAll('button,a')].find((b) => b.innerText && b.innerText.trim().includes(t)); if (el) { el.click(); return true; } return false; }, txt); if (!ok) throw new Error('no clickable with text: ' + txt); };
  const setVal = async (sel, v) => { await page.click(sel, { clickCount: 3 }); await page.keyboard.press('Backspace'); await page.type(sel, v); };

  try {
    if (MODE === 'google-on') {
      // client id configured -> clicking the button must head to Google with that id (no hard-coded one)
      await page.setRequestInterception(true);
      let googleUrl = null;
      page.on('request', (req) => { if (req.url().startsWith('https://accounts.google.com/')) { googleUrl = req.url(); req.abort(); } else req.continue(); });
      await page.goto(UI + '/login', { waitUntil: 'networkidle0' });
      const hint = await page.$('[data-testid=google-not-configured]');
      await clickText('Continue with Google'); await sleep(1200);
      check('UI-10', 'Google configured: no warning shown, button goes to Google with the env client id', !hint && googleUrl && googleUrl.includes('client_id=env-test-client.apps.googleusercontent.com'), `warning shown=${!!hint}; navigated to=${googleUrl && googleUrl.slice(0, 110)}`);
      await shot('google-on');
      fs.writeFileSync(OUT, JSON.stringify(results, null, 2)); await browser.close(); await db.end(); return;
    }

    // ------------------------------------------------ UI-01 forgot password: dead toast is gone, real screen opens
    await page.goto(UI + '/login', { waitUntil: 'networkidle0' });
    await shot('01-login');
    await clickText('Forgot password?');
    await page.waitForSelector('[data-testid=forgot-email-step]', { timeout: 5000 });
    check('UI-01', '"Forgot password?" opens a real screen (not a fake toast)', true, `heading="${await text('h1')}"`);
    await shot('02-forgot-email');

    // loading state: delay the API call and look at the button while it is in flight
    await page.setRequestInterception(true);
    let delayForgot = true, abortReset = false; let forgotCalls = 0;
    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('/Auth/ForgotPassword')) { forgotCalls++; return delayForgot ? setTimeout(() => req.continue(), 1500) : req.continue(); }
      if (u.includes('/Auth/ResetPassword') && abortReset) return req.abort('failed');
      req.continue();
    });

    // client-side validation error
    await setVal('#fp-email', 'not-an-email');
    await page.click('button[type=submit]');
    await page.waitForSelector('[data-testid=forgot-error]', { timeout: 3000 });
    check('UI-02', 'Error state: invalid email shows an inline error and sends no request', (await text('[data-testid=forgot-error]')).includes('valid email') && forgotCalls === 0, `error="${await text('[data-testid=forgot-error]')}", API calls=${forgotCalls}`);
    await shot('03-forgot-error');

    // unknown email -> same generic message as a real one
    await setVal('#fp-email', 'authtest.nobody.' + Date.now().toString(36) + '@example.test');
    const clickP = page.click('button[type=submit]');
    await sleep(500);
    const loadingText = await page.$eval('button[type=submit]', (b) => b.innerText);
    const disabledWhileLoading = await page.$eval('button[type=submit]', (b) => b.disabled);
    await clickP;
    await shot('04-forgot-loading');
    await page.waitForSelector('[data-testid=forgot-reset-step]', { timeout: 8000 });
    const infoUnknown = (await text('[data-testid=forgot-info]')).replace(/authtest\.[^\s,]+/, '<EMAIL>');
    check('UI-03', 'Loading state: button shows progress and is disabled while the request runs', /Sending code/i.test(loadingText) && disabledWhileLoading, `button text during request="${loadingText.trim()}", disabled=${disabledWhileLoading}`);

    // go back, repeat with the REAL email
    await clickText('Change email');
    await page.waitForSelector('[data-testid=forgot-email-step]');
    delayForgot = false;
    await setVal('#fp-email', email);
    await page.click('button[type=submit]');
    await page.waitForSelector('[data-testid=forgot-reset-step]', { timeout: 8000 });
    const infoKnown = (await text('[data-testid=forgot-info]')).replace(/authtest\.[^\s,]+/, '<EMAIL>');
    check('UI-04', 'Same generic message whether or not the email has an account', infoKnown === infoUnknown && infoKnown.length > 20, `unknown: "${infoUnknown}" | known: "${infoKnown}"`);
    await shot('05-forgot-code-step');

    // strength meter behaviour
    const meter = async (pw) => { await setVal('#fp-password', pw); await sleep(80); return { label: await text('[data-testid=strength-label]'), ok: await page.$$eval('[data-rule]', (els) => els.filter((e) => e.dataset.ok === 'true').length), segs: await page.$$eval('[data-seg]', (els) => els.filter((e) => /bg-(rose|amber|lime|emerald)-/.test(e.className)).length) }; };
    const m1 = await meter('abc'), m2 = await meter('Abcdefg1'), m3 = await meter('Str0ng!Pw'), m4 = await meter(NEW);
    check('UI-05', 'Strength meter: Weak -> Fair -> Good -> Strong as rules are met', m1.label === 'Weak' && m2.label === 'Fair' && m3.label === 'Good' && m4.label === 'Strong' && m4.ok === 5, `"abc"=${m1.label}(${m1.ok}/5), "Abcdefg1"=${m2.label}(${m2.ok}/5), "Str0ng!Pw"=${m3.label}(${m3.ok}/5), strong=${m4.label}(${m4.ok}/5), filled bars: ${m1.segs}/${m2.segs}/${m3.segs}/${m4.segs}`);
    await setVal('#fp-password', 'Abcdefg1'); await shot('06-meter-fair');
    await setVal('#fp-password', NEW);

    // confirm mismatch + submit disabled
    await setVal('#fp-code', String(await otpOf()));
    await setVal('#fp-confirm', NEW + 'x');
    const mism = await text('[data-testid=confirm-mismatch]');
    const btnDisabled = await page.$eval('button[type=submit]', (b) => b.disabled);
    check('UI-06', 'Confirm password mismatch is flagged and submit stays disabled', !!mism && btnDisabled, `message="${mism}", submit disabled=${btnDisabled}`);
    await shot('07-mismatch');

    // wrong code -> server error shown inline
    await setVal('#fp-confirm', NEW);
    const real = await otpOf(); const wrong = real === 123456 ? '123457' : '123456';
    await setVal('#fp-code', wrong);
    await page.click('button[type=submit]');
    await page.waitForSelector('[data-testid=forgot-error]', { timeout: 6000 });
    const wrongMsg = await text('[data-testid=forgot-error]');
    check('UI-07', 'Error state: wrong code shows the server message, no crash', /invalid or expired/i.test(wrongMsg), `error="${wrongMsg}"`);
    await shot('08-wrong-code');

    // network failure -> friendly error
    abortReset = true;
    await setVal('#fp-code', String(real));
    await page.click('button[type=submit]');
    await page.waitForSelector('[data-testid=forgot-error]', { timeout: 6000 });
    const netMsg = await text('[data-testid=forgot-error]');
    check('UI-08', 'Error state: server unreachable shows a friendly message', /Cannot reach the server/i.test(netMsg), `error="${netMsg}"`);
    abortReset = false;

    // success
    await setVal('#fp-code', String(real));
    await page.click('button[type=submit]');
    await page.waitForSelector('[data-testid=forgot-done]', { timeout: 8000 });
    check('UI-09', 'Success state: password updated screen with a way back to sign in', /Password updated/i.test(await text('[data-testid=forgot-done]')), `heading="${(await text('[data-testid=forgot-done] h2'))}"`);
    await shot('09-success');
    await clickText('Back to sign in');
    await page.waitForSelector('input[placeholder="name@company.com"]');

    // the new password really works, the old one does not
    await setVal('input[placeholder="name@company.com"]', email);
    await setVal('input[type=password]', OLD);
    await page.click('button[type=submit]'); await sleep(1500);
    const stillLogin = page.url().includes('/login');
    const keptEmail = await page.$eval('input[placeholder="name@company.com"]', (e) => e.value);
    check('UI-21', 'Wrong password keeps what the user typed (form is not wiped)', keptEmail === email && stillLogin, `email field after the failed attempt = "${keptEmail}"`);
    await setVal('input[type=password]', NEW);
    await page.click('button[type=submit]');
    await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 15000 });
    check('UI-11', 'After reset: old password is refused, new password signs in', stillLogin && !page.url().includes('/login'), `old password stayed on /login=${stillLogin}; new password landed on ${new URL(page.url()).pathname}`);
    await sleep(1200);
    const tokenBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('sharyx_user') || '{}').api_token);

    // UI logout revokes the token on the SERVER
    const preStatus = (await (await fetch('http://127.0.0.1:8001/api/v1/Company/Get', { headers: { authorization: 'Bearer ' + tokenBefore } })).status);
    await page.waitForSelector('button[title=Logout]', { timeout: 15000 });
    await page.click('button[title=Logout]');
    await page.waitForFunction(() => location.pathname.startsWith('/login'), { timeout: 10000 });
    await sleep(800);
    const postStatus = (await (await fetch('http://127.0.0.1:8001/api/v1/Company/Get', { headers: { authorization: 'Bearer ' + tokenBefore } })).status);
    check('UI-12', 'Logout button revokes the JWT on the server (replayed token is rejected)', preStatus === 200 && postStatus === 401, `token before logout -> HTTP ${preStatus}; same token after clicking Logout -> HTTP ${postStatus}`);

    // reset-link route
    await page.goto(`${UI}/ResetPassword/${encId(uid)}`, { waitUntil: 'networkidle0' });
    const linkHasEmail = await page.$('#fp-email');
    const linkHasCode = await page.$('#fp-code');
    check('UI-13', 'Reset-link page (/ResetPassword/:id) skips the email step and asks for code + new password', !linkHasEmail && !!linkHasCode, `email field present=${!!linkHasEmail}, code field present=${!!linkHasCode}`);
    await shot('10-reset-link');

    // signup page: meter + confirm
    await page.goto(UI + '/signup', { waitUntil: 'networkidle0' });
    await page.type('input[placeholder="••••••••••••"]', 'abc');
    await sleep(100);
    const sLabel = await text('[data-testid=strength-label]');
    const confirmInput = (await page.$$('input[placeholder="••••••••••••"]'))[1];
    await confirmInput.type('abd');
    await sleep(100);
    const sMism = await text('[data-testid=confirm-mismatch]');
    check('UI-14', 'Signup page: strength meter and confirm-password field with mismatch warning', sLabel === 'Weak' && !!sMism, `meter="${sLabel}", mismatch warning="${sMism}"`);
    await shot('11-signup');

    // google not configured -> friendly message, no navigation
    await page.goto(UI + '/login', { waitUntil: 'networkidle0' });
    const hint = await text('[data-testid=google-not-configured]');
    await clickText('Continue with Google'); await sleep(900);
    check('UI-15', 'Google client id missing: friendly message, stays on /login (no broken redirect)', /isn.t set up/i.test(hint || '') && page.url().includes('/login') && !page.url().includes('google'), `hint="${hint}", url=${new URL(page.url()).pathname}`);
    await shot('12-google-missing');
    const hintS = await (async () => { await page.goto(UI + '/signup', { waitUntil: 'networkidle0' }); return text('[data-testid=google-not-configured]'); })();
    check('UI-16', 'Same friendly message on the signup page', /isn.t set up/i.test(hintS || ''), `hint="${hintS}"`);

    // oauth callback: denied consent
    await page.goto(UI + '/oauth/callback?error=access_denied&state=auth_google', { waitUntil: 'networkidle0' });
    const denied = await text('p.text-xs');
    const hasBack = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Back to login'));
    check('UI-17', 'OAuth callback, consent denied: clear message + "Back to login" button', /cancelled/i.test(denied || '') && hasBack, `message="${denied}", Back to login button=${hasBack}`);
    await shot('13-oauth-denied');
    await clickText('Back to login'); await sleep(700);
    check('UI-18', '"Back to login" actually goes to /login', new URL(page.url()).pathname === '/login', `landed on ${new URL(page.url()).pathname}`);

    // oauth callback: backend rejects the credential
    await page.goto(UI + '/oauth/callback?code=forged-code&state=auth_google', { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.body.innerText.includes('Back to login'), { timeout: 15000 });
    const rej = await text('p.text-xs');
    check('UI-19', 'OAuth callback, backend rejects the credential: clear message + Back to login', /could not verify|not configured|failed/i.test(rej || ''), `message="${rej}"`);
    await shot('14-oauth-rejected');

    // oauth callback: no params at all
    await page.goto(UI + '/oauth/callback', { waitUntil: 'networkidle0' });
    const hasBack2 = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Back to login'));
    check('UI-20', 'OAuth callback with no code: error + Back to login (no endless spinner)', hasBack2, `Back to login button=${hasBack2}`);
  } catch (e) {
    check('UI-ERR', 'test script error', false, String(e && e.stack || e).slice(0, 400));
    await shot('error').catch(() => {});
  } finally {
    fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
    await db.query(`delete from "user" where email like 'authtest.ui.%@example.test'`).catch(() => {});
    await db.query(`delete from company where email='authtest.ui@example.test'`).catch(() => {});
    await db.end(); await browser.close();
  }
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} UI checks passed`);
  process.exitCode = failed ? 1 : 0;
})();
