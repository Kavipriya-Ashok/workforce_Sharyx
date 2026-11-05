/* eslint-disable */
/**
 * Module 3 test doubles (all local, nothing leaves the machine). Needs `npm i --no-save smtp-server`.
 *   :9101  fake Meta Graph (+ fake OpenAI chat)      every send is LOGGED with the token and phone_number_id it used
 *   :9102  fake SMTP sink                            every e-mail is KEPT (which mailbox sent it, to whom, subject, body)
 * The fake LLM RECORDS every request (full system prompt + messages) tagged with `state.phase`, so a test can prove
 * exactly what the model was shown for each tenant. Its answers are scripted from markers in the customer's message:
 *   CANDIDATE -> plain-text reply      BOOKME -> {"action":"execute_tool","toolName":"book_appointment"}      anything else -> short reply
 */
const http = require('http');
const path = require('path');

function loadSmtpServer() {
  for (const p of [process.env.SMTP_SERVER_PATH, 'smtp-server', path.join(__dirname, '..', '..', 'node_modules', 'smtp-server')].filter(Boolean)) {
    try { return require(p).SMTPServer; } catch { /* next */ }
  }
  throw new Error('smtp-server is not installed (npm i --no-save smtp-server, or set SMTP_SERVER_PATH)');
}

exports.start = async function start() {
  const state = {
    phase: 'setup',
    meta: { sends: [], hits: 0 },
    llm: { requests: [] },
    mail: { goodPasswords: new Set(['good-app-password']), inbox: [] },
  };

  const web = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    let raw = '';
    req.on('data', (d) => (raw += d));
    req.on('end', () => {
      let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch { /* not json */ }

      // ---- fake OpenAI
      if (url.pathname.startsWith('/openai/chat/completions')) {
        const msgs = body.messages || [];
        const system = (msgs.find((m) => m.role === 'system') || {}).content || '';
        const last = [...msgs].reverse().find((m) => m.role === 'user');
        const lastText = String((last && last.content) || '');
        state.llm.requests.push({ phase: state.phase, system, messages: msgs, lastText, at: Date.now() });
        // This webhook path (PromptEngine) wants PLAIN TEXT, or {"action":"execute_tool",...} for a tool call.
        let content = 'Thanks, noted.';
        if (/CANDIDATE/.test(lastText)) content = 'Thanks for your interest. Could you share your latest CV?';
        if (/BOOKME/.test(lastText)) content = JSON.stringify({ action: 'execute_tool', toolName: 'book_appointment', inputs: { slot: 'Monday 11:00 AM', type: 'demo' } });
        return send(200, { choices: [{ message: { role: 'assistant', content } }] });
      }
      // ---- fake Gemini (the default AI config of a new tenant uses it)
      if (/^\/gemini\/models\/.+:generateContent/.test(url.pathname)) {
        const system = (body.systemInstruction && body.systemInstruction.parts && body.systemInstruction.parts[0] && body.systemInstruction.parts[0].text) || '';
        const msgs = (body.contents || []).map((c) => ({ role: c.role === 'model' ? 'assistant' : 'user', content: (c.parts || []).map((x) => x.text).join('') }));
        const lastText = String((msgs[msgs.length - 1] || {}).content || '');
        state.llm.requests.push({ phase: state.phase, system, messages: msgs, lastText, at: Date.now() });
        let content = 'Thanks, noted.';
        if (/CANDIDATE/.test(lastText)) content = 'Thanks for your interest. Could you share your latest CV?';
        if (/BOOKME/.test(lastText)) content = JSON.stringify({ action: 'execute_tool', toolName: 'book_appointment', inputs: { slot: 'Monday 11:00 AM', type: 'demo' } });
        return send(200, { candidates: [{ content: { parts: [{ text: content }] } }] });
      }
      if (url.pathname.startsWith('/openai') || url.pathname.startsWith('/gemini')) return send(200, { data: [] });

      // ---- fake Meta Graph
      if (url.pathname.startsWith('/graph/')) {
        state.meta.hits++;
        const isSend = url.pathname.endsWith('/messages');
        if (!/^GOODTOKEN/.test(auth)) return send(401, { error: { message: 'Invalid OAuth access token', type: 'OAuthException', code: 190 } });
        if (isSend) {
          const phoneId = url.pathname.split('/')[2];
          state.meta.sends.push({ phase: state.phase, phoneId, token: auth, to: body.to, type: body.type, text: body.text && body.text.body, template: body.template, at: Date.now() });
          return send(200, { messaging_product: 'whatsapp', messages: [{ id: 'wamid.TEST' + Date.now() + Math.random().toString(36).slice(2, 6) }] });
        }
        return send(200, { display_phone_number: '+1 555 010 0100', verified_name: 'Mock Business', quality_rating: 'GREEN', code_verification_status: 'VERIFIED' });
      }
      send(404, {});
    });
  });
  await new Promise((r) => web.listen(9101, '127.0.0.1', r));

  const SMTPServer = loadSmtpServer();
  const smtp = new SMTPServer({
    secure: false, authOptional: false, allowInsecureAuth: true, disabledCommands: ['STARTTLS'],
    onAuth(auth, _s, cb) {
      if (state.mail.goodPasswords.has(auth.password)) return cb(null, { user: auth.username });
      const err = new Error('535 5.7.8 Username and Password not accepted'); err.responseCode = 535; return cb(err);
    },
    onData(stream, session, cb) {
      let buf = ''; stream.on('data', (d) => (buf += d.toString()));
      stream.on('end', () => {
        const hdr = (n) => ((buf.match(new RegExp(`^${n}:\\s*(.*)$`, 'im')) || [])[1] || '').trim();
        state.mail.inbox.push({ phase: state.phase, sentBy: session.user, to: hdr('To'), subject: hdr('Subject'), text: buf, at: Date.now() });
        cb();
      });
    },
  });
  await new Promise((r) => smtp.listen(9102, '127.0.0.1', r));

  state.stop = async () => { for (const s of [web, smtp]) await new Promise((r) => s.close(() => r())).catch(() => {}); };
  return state;
};
