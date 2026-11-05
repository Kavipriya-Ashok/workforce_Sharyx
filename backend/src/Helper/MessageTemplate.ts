/**
 * Tenant-written WhatsApp texts (first message, follow-up, ...) with {name} / {company} variables.
 * Nothing here contains any product or brand text: what the customer reads is exactly what the tenant typed
 * in the UI, with the variables filled in from that tenant's own data.
 */
export const MESSAGE_MAX = 1000; // WhatsApp allows 4096, we keep UI messages short on purpose
export const MESSAGE_VARIABLES = ['name', 'company'] as const;

/** the greeting the old code saved for every tenant that opened the Brain page; it is NOT a tenant's own choice */
export const LEGACY_DEFAULT_WELCOME = 'Hello! How can I help you today?';

const looksLikePhone = (s: string) => /^\+?[\d\s()-]{6,}$/.test(s.trim());

/** Fills {name} / {{name}} / {company}. Unknown variables disappear instead of being sent literally. */
export function renderMessage(template: string | null | undefined, vars: { name?: string | null; company?: string | null }): string {
  const t = (template || '').trim();
  if (!t) return '';
  const name = vars.name && !looksLikePhone(vars.name) ? vars.name.trim() : ''; // a phone number is not a name
  const company = (vars.company || '').trim();
  let out = t
    .replace(/\{\{?\s*name\s*\}?\}/gi, name)
    .replace(/\{\{?\s*company\s*\}?\}/gi, company)
    .replace(/\{\{?\s*[a-z_]+\s*\}?\}/gi, ''); // unknown variable -> nothing
  // tidy the gaps an empty variable leaves: "Hi , welcome" -> "Hi, welcome"
  out = out.replace(/[ \t]+([,.!?;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return out.slice(0, MESSAGE_MAX);
}

/** A bare greeting ("hi", "hello", "vanakkam") carries no question: the first message alone is the right answer. */
export function isBareGreeting(text: string | null | undefined): boolean {
  const t = (text || '').trim().toLowerCase().replace(/[!.\s]+$/g, '');
  if (!t || t.length > 24) return false;
  return /^(hi+|hello+|hey+|hai+|hlo|helo|vanakkam|vanakam|namaste|namaskar|good\s*(morning|afternoon|evening)|gm|start)$/.test(t);
}

/** Exact whole-message keyword match (so "bus stop" or "I will not stop" never unsubscribes anybody). */
export function matchesKeyword(text: string | null | undefined, words: string[] | null | undefined): boolean {
  const t = (text || '').trim().toLowerCase().replace(/^[\s"'*_`]+|[\s"'*_`.!?]+$/g, '');
  if (!t || !words?.length) return false;
  return words.some((w) => (w || '').trim().toLowerCase() === t);
}

export const DEFAULT_STOP_WORDS = ['STOP', 'UNSUBSCRIBE'];
export const START_WORDS = ['START', 'UNSTOP', 'SUBSCRIBE'];
