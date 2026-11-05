import { CountryCode, parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * The ONE place that turns a phone number into E.164 ("+919876543210"). Everything that stores, compares, sends to or
 * keys on a phone number must go through here.
 *
 * - There is NO built-in country. A number written without a country code ("98765 43210") is resolved with the
 *   tenant's default country (`defaultCountry`, an ISO code like "IN"); without one it is rejected (null) instead of
 *   being guessed.
 * - A number that already carries its country ("+91 98765 43210", "0091...", or digits stored as "919876543210") is
 *   accepted as it is.
 * - Returns null for anything that is not a real, valid number.
 */
export function toE164(raw: string | null | undefined, defaultCountry?: string | null): string | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/[\s().\-]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);

  const country = normaliseCountry(defaultCountry);
  const tries: Array<() => ReturnType<typeof parsePhoneNumberFromString>> = [];
  if (s.startsWith("+")) {
    tries.push(() => parsePhoneNumberFromString(s));
  } else {
    if (!/^\d+$/.test(s)) return null;
    // digits that already include a country code (this is how WhatsApp / Meta and our old rows store numbers)
    tries.push(() => parsePhoneNumberFromString("+" + s));
    if (country) tries.push(() => parsePhoneNumberFromString(s, country));
  }
  // With a default country, a national number must win over an accidental "+<digits>" match
  const order = country && !s.startsWith("+") ? [tries[1], tries[0]] : tries;
  for (const t of order) {
    const p = t && t();
    if (p && p.isValid()) return p.number as string;
  }
  return null;
}

/** Same real-world number? (compares the E.164 forms) */
export function samePhone(a: string | null | undefined, b: string | null | undefined, defaultCountry?: string | null): boolean {
  const x = toE164(a, defaultCountry);
  const y = toE164(b, defaultCountry);
  return !!x && x === y;
}

/** The digits-only form Meta's API wants ("919876543210"), or null when the number is not valid. */
export function toMetaDigits(raw: string | null | undefined, defaultCountry?: string | null): string | null {
  const e = toE164(raw, defaultCountry);
  return e ? e.slice(1) : null;
}

/**
 * Every spelling an existing row might use for this number, for lookups against data written BEFORE E.164 existed
 * (digits only, with / without "+", national last-10). Always combine with tenant_id.
 */
export function phoneLookupVariants(raw: string | null | undefined, defaultCountry?: string | null): string[] {
  const e = toE164(raw, defaultCountry);
  if (!e) return [];
  const digits = e.slice(1);
  const out = new Set<string>([e, digits]);
  const p = parsePhoneNumberFromString(e);
  if (p?.nationalNumber) out.add(String(p.nationalNumber));
  return [...out];
}

function normaliseCountry(c?: string | null): CountryCode | undefined {
  const v = (c || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? (v as CountryCode) : undefined;
}
