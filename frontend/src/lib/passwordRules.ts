/**
 * Password policy. MUST stay identical to the backend rule (IsStrongPassword in
 * backend/src/Model/Auth/Auth.model.ts): 8-128 chars with an uppercase letter, a lowercase letter,
 * a number and a symbol. The server is the authority; this only gives instant feedback.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export interface PasswordCheck {
  id: 'length' | 'upper' | 'lower' | 'number' | 'symbol';
  label: string;
  ok: boolean;
}

export interface PasswordStrength {
  checks: PasswordCheck[];
  /** how many of the 5 rules pass (0-5) */
  passed: number;
  /** every rule passes and the length is within bounds */
  valid: boolean;
  label: 'Too weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  /** 0-4, drives the bar colour */
  level: 0 | 1 | 2 | 3 | 4;
}

export function evaluatePassword(pw: string): PasswordStrength {
  const v = pw || '';
  const checks: PasswordCheck[] = [
    { id: 'length', label: `${PASSWORD_MIN}-${PASSWORD_MAX} characters`, ok: v.length >= PASSWORD_MIN && v.length <= PASSWORD_MAX },
    { id: 'upper', label: 'An uppercase letter (A-Z)', ok: /[A-Z]/.test(v) },
    { id: 'lower', label: 'A lowercase letter (a-z)', ok: /[a-z]/.test(v) },
    { id: 'number', label: 'A number (0-9)', ok: /\d/.test(v) },
    { id: 'symbol', label: 'A symbol (e.g. ! @ # $ %)', ok: /[^A-Za-z0-9\s]/.test(v) },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const valid = passed === checks.length;
  let level: PasswordStrength['level'] = 0;
  // A password that still breaks a rule is rejected by the server, so it never rates above "Fair".
  // Only a password meeting every rule can be Good (8-11 chars) or Strong (12+).
  if (v.length > 0) level = valid ? (v.length >= 12 ? 4 : 3) : passed <= 2 ? 1 : 2;
  const label = (['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const)[level];
  return { checks, passed, valid, label: v.length === 0 ? 'Too weak' : label, level };
}
