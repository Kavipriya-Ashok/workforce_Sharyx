/**
 * Removes anything that looks like a credential from free text before it is logged, stored in
 * `tenant_integration_status.error_message`, or returned to a browser. Error texts coming from Meta,
 * Google, SMTP/IMAP servers and HTTP clients can echo tokens, so every such text goes through here.
 */
const PATTERNS: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer ***'],
  [/(access_token|refresh_token|client_secret|api[_-]?key|apikey|password|passwd|pwd|secret|token)(["'\s]*[:=]["'\s]*)[^\s"'&,;)}]{4,}/gi, '$1$2***'],
  [/GOCSPX-[A-Za-z0-9_-]+/g, 'GOCSPX-***'],
  [/ya29\.[A-Za-z0-9._-]+/g, 'ya29.***'],
  [/\b1\/\/[A-Za-z0-9._-]{20,}/g, '1//***'],
  [/\bEAA[A-Za-z0-9]{20,}/g, 'EAA***'],
  [/\bsk-[A-Za-z0-9_-]{16,}/g, 'sk-***'],
  [/\bAIza[A-Za-z0-9_-]{20,}/g, 'AIza***'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, 'eyJ***'],
  [/\b[A-Fa-f0-9]{40,}\b/g, '***'],
];

export function redactSecrets(input: unknown): string {
  let s = typeof input === 'string' ? input : input instanceof Error ? input.message : safeJson(input);
  for (const [re, rep] of PATTERNS) s = s.replace(re, rep);
  return s;
}

/** Masks `?access_token=...` style query parameters in a URL that is about to be logged. */
export function redactUrl(url: string | undefined | null): string {
  return String(url || '').replace(/([?&](?:access_token|token|api_key|apikey|secret|password|code)=)[^&#]*/gi, '$1***');
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}
