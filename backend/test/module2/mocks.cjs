/* eslint-disable */
/**
 * Local fakes used by the Module 2 tests so connection statuses are driven by REAL network handshakes:
 *   - fake Meta Graph + fake OpenAI/Gemini  (HTTP, :9101)   token names decide the answer
 *         GOODTOKEN*  -> ok      REVOKED* / anything else -> 401 {error:{code:190}}
 *         SLOW*       -> hangs 12 s (client timeout => degraded)      DOWN* -> 503
 *   - fake SMTP server (:9102) and fake IMAP server (:9103): accept only passwords in `mail.goodPasswords`
 *   - a "black hole" TCP port (:9104) that accepts a connection and never speaks (=> timeout)
 * Needs `npm i --no-save smtp-server`.  Control everything through the returned object.
 */
const http = require('http');
const net = require('net');
const path = require('path');

function loadSmtpServer() {
  for (const p of [process.env.SMTP_SERVER_PATH, 'smtp-server', path.join(__dirname, '..', '..', 'node_modules', 'smtp-server')].filter(Boolean)) {
    try { return require(p).SMTPServer; } catch { /* try next */ }
  }
  throw new Error('smtp-server is not installed (npm i --no-save smtp-server, or set SMTP_SERVER_PATH)');
}

exports.start = async function start() {
  const state = {
    meta: { hits: 0, sends: 0, revoked: new Set(), log: [] },
    mail: { goodPasswords: new Set(['good-app-password']), smtpAuthHits: 0, smtpSent: 0, imapLogins: 0, imapAccept: true },
    llm: { hits: 0, goodKeys: new Set(['sk-test-good-key']) },
  };

  // ---- fake Meta Graph / LLM
  const web = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.pathname.startsWith('/__')) { // control
      const t = url.searchParams.get('token');
      if (url.pathname === '/__revoke') state.meta.revoked.add(t);
      if (url.pathname === '/__restore') state.meta.revoked.delete(t);
      return send(200, { ok: true });
    }
    if (url.pathname.startsWith('/openai') || url.pathname.startsWith('/gemini')) {
      state.llm.hits++;
      const key = url.pathname.startsWith('/gemini') ? url.searchParams.get('key') : auth;
      return state.llm.goodKeys.has(key) ? send(200, { data: [] }) : send(401, { error: { message: 'Incorrect API key provided' } });
    }
    if (url.pathname.startsWith('/graph/')) {
      state.meta.hits++;
      const isSend = url.pathname.endsWith('/messages');
      if (isSend) state.meta.sends++;
      if (/^SLOW/.test(auth)) return setTimeout(() => send(200, {}), 12000);
      if (/^DOWN/.test(auth)) return send(503, { error: { message: 'Service Unavailable', code: 2 } });
      if (!/^GOODTOKEN/.test(auth) || state.meta.revoked.has(auth)) {
        return send(401, { error: { message: 'Invalid OAuth access token - Cannot parse access token', type: 'OAuthException', code: 190 } });
      }
      if (isSend) return send(200, { messaging_product: 'whatsapp', messages: [{ id: 'wamid.TEST' + Date.now() }] });
      return send(200, { display_phone_number: '+1 555 010 0100', verified_name: 'Mock Business', quality_rating: 'GREEN', code_verification_status: 'VERIFIED' });
    }
    send(404, {});
  });
  await new Promise((r) => web.listen(9101, '127.0.0.1', r));

  // ---- fake SMTP
  const SMTPServer = loadSmtpServer();
  const smtp = new SMTPServer({
    secure: false, authOptional: false, allowInsecureAuth: true, disabledCommands: ['STARTTLS'],
    onAuth(auth, _s, cb) {
      state.mail.smtpAuthHits++;
      if (state.mail.goodPasswords.has(auth.password)) return cb(null, { user: auth.username });
      const err = new Error('Invalid login: 535 5.7.8 Username and Password not accepted'); err.responseCode = 535; return cb(err);
    },
    onData(stream, _s, cb) { stream.on('data', () => {}); stream.on('end', () => { state.mail.smtpSent++; cb(); }); },
  });
  await new Promise((r) => smtp.listen(9102, '127.0.0.1', r));

  // ---- fake IMAP (just enough for node-imap: greeting, CAPABILITY, LOGIN, LIST, SELECT, SEARCH, LOGOUT)
  const imap = net.createServer((sock) => {
    sock.write('* OK [CAPABILITY IMAP4rev1] fake imap ready\r\n');
    let buf = '';
    sock.on('data', (d) => {
      buf += d.toString();
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        const m = line.match(/^(\S+)\s+(\S+)\s*(.*)$/); if (!m) continue;
        const [, tag, cmd, rest] = m; const c = cmd.toUpperCase();
        if (c === 'CAPABILITY') sock.write(`* CAPABILITY IMAP4rev1\r\n${tag} OK done\r\n`);
        else if (c === 'LOGIN') {
          state.mail.imapLogins++;
          const pass = (rest.match(/"((?:[^"\\]|\\.)*)"\s*$/) || rest.match(/(\S+)\s*$/) || [])[1];
          if (state.mail.imapAccept && state.mail.goodPasswords.has(pass)) sock.write(`${tag} OK [CAPABILITY IMAP4rev1] logged in\r\n`);
          else sock.write(`${tag} NO [AUTHENTICATIONFAILED] Invalid credentials (Failure)\r\n`);
        } else if (c === 'LIST' || c === 'XLIST') sock.write(`* LIST (\\Noselect) "/" ""\r\n${tag} OK done\r\n`);
        else if (c === 'NAMESPACE') sock.write(`* NAMESPACE (("" "/")) NIL NIL\r\n${tag} OK done\r\n`);
        else if (c === 'SELECT' || c === 'EXAMINE') sock.write(`* 0 EXISTS\r\n* 0 RECENT\r\n* FLAGS (\\Seen)\r\n* OK [UIDVALIDITY 1] ok\r\n* OK [UIDNEXT 1] ok\r\n${tag} OK [READ-WRITE] done\r\n`);
        else if (c === 'SEARCH' || (c === 'UID' && /^SEARCH/i.test(rest))) sock.write(`* SEARCH\r\n${tag} OK done\r\n`);
        else if (c === 'LOGOUT') { sock.write(`* BYE bye\r\n${tag} OK done\r\n`); sock.end(); }
        else sock.write(`${tag} OK done\r\n`);
      }
    });
    sock.on('error', () => {});
  });
  await new Promise((r) => imap.listen(9103, '127.0.0.1', r));

  // ---- black hole
  const hole = net.createServer((s) => { s.on('error', () => {}); /* never answer */ });
  await new Promise((r) => hole.listen(9104, '127.0.0.1', r));

  state.stop = async () => { for (const s of [web, smtp, imap, hole]) await new Promise((r) => s.close(() => r())).catch(() => {}); };
  return state;
};
