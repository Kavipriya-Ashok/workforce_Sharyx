import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { evaluatePassword, PASSWORD_MAX } from '@/lib/passwordRules';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

type Step = 'email' | 'reset' | 'done';

interface Props {
  /** Called when the user wants to go back to the sign-in form. */
  onBack: () => void;
  /** Pre-fills the e-mail field (e.g. what they already typed on the sign-in form). */
  initialEmail?: string;
  /**
   * Reset-link mode: the encrypted id from the e-mail link (/ResetPassword/:id). The e-mail step is
   * skipped; the user only enters the 6-digit code from the same e-mail and a new password.
   */
  userId?: string;
}

const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Turns an axios failure into a message that is safe and useful to show. */
function messageFrom(err: any, fallback: string): string {
  const status = err?.response?.status;
  if (status === 429) return 'Too many attempts. Please wait a minute before trying again.';
  if (!err?.response) return 'Cannot reach the server. Check your connection and try again.';
  if (status && status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  const m = err.response?.data?.message || err.response?.data?.Message;
  return typeof m === 'string' && m.trim() ? m.split('\n')[0] : fallback;
}

/**
 * Forgot-password screen: e-mail -> 6-digit code + new password -> done.
 * Uses the backend's Auth/ForgotPassword and Auth/ResetPassword endpoints. The first step ALWAYS shows the
 * same confirmation whether or not the address has an account, so it cannot be used to discover accounts.
 */
export const ForgotPasswordFlow: React.FC<Props> = ({ onBack, initialEmail = '', userId }) => {
  const [step, setStep] = useState<Step>(userId ? 'reset' : 'email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const strength = evaluatePassword(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean) || clean.length > 255) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await axios.post('/api/v1/Auth/ForgotPassword', { email: clean });
      // Deliberately generic: identical whether or not an account exists.
      setInfo(`If an account exists for ${clean}, we’ve sent a 6-digit code. It expires in 10 minutes.`);
      setCooldown(RESEND_SECONDS);
      setStep('reset');
    } catch (err) {
      setError(messageFrom(err, 'Could not send the reset code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || loading || userId) return;
    setError(null);
    setLoading(true);
    try {
      await axios.post('/api/v1/Auth/ForgotPassword', { email: email.trim().toLowerCase() });
      setInfo('If that account exists, a new code is on its way.');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(messageFrom(err, 'Could not resend the code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your email.');
    if (!strength.valid) return setError('Your new password does not meet all the requirements below.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setLoading(true);
    try {
      await axios.post('/api/v1/Auth/ResetPassword', {
        ...(userId ? { user_id: userId } : { email: email.trim().toLowerCase() }),
        reset_otp: Number(code),
        password,
        confirm_password: confirm,
      });
      setPassword('');
      setConfirm('');
      setStep('done');
    } catch (err) {
      setError(messageFrom(err, 'That code is invalid or has expired. Please request a new one.'));
    } finally {
      setLoading(false);
    }
  };

  const card = 'w-full max-w-md space-y-6';

  if (step === 'done') {
    return (
      <div className={card} data-testid="forgot-done">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-white">Password updated</h2>
          <p className="text-xs text-slate-400">
            Your password has been changed and you’ve been signed out of every other device. Sign in with your new password.
          </p>
        </div>
        <Button type="button" variant="blue" onClick={onBack} className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500">
          Back to sign in <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={card} data-testid={step === 'email' ? 'forgot-email-step' : 'forgot-reset-step'}>
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-white">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
      </button>

      <div className="space-y-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {step === 'email' ? 'Reset your password' : 'Enter your code'}
        </h1>
        <p className="text-xs text-slate-400 sm:text-sm">
          {step === 'email'
            ? 'Enter the email you signed up with and we’ll send you a 6-digit reset code.'
            : userId
              ? 'Enter the 6-digit code from the reset email and choose a new password.'
              : 'Enter the 6-digit code we emailed you and choose a new password.'}
        </p>
      </div>

      {error && (
        <div role="alert" data-testid="forgot-error" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {info && !error && (
        <div role="status" data-testid="forgot-info" className="flex items-start gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{info}</span>
        </div>
      )}

      {step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-4" noValidate>
          <div>
            <label htmlFor="fp-email" className="text-xs font-medium text-slate-300">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="fp-email"
                type="email"
                autoFocus
                autoComplete="email"
                maxLength={255}
                placeholder="name@company.com"
                className="h-10 pl-9 text-xs"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <Button type="submit" variant="blue" disabled={loading} className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500">
            {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending code...</>) : (<>Send reset code <ArrowRight className="ml-2 h-4 w-4" /></>)}
          </Button>
        </form>
      ) : (
        <form onSubmit={submitReset} className="space-y-4" noValidate>
          <div>
            <label htmlFor="fp-code" className="text-xs font-medium text-slate-300">6-digit code</label>
            <div className="relative mt-1">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-blue-400/80" />
              <Input
                id="fp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                placeholder="• • • • • •"
                className="h-11 pl-9 text-center font-mono text-lg font-bold tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="fp-password" className="text-xs font-medium text-slate-300">New password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="fp-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                maxLength={PASSWORD_MAX}
                placeholder="••••••••••••"
                className="h-10 pl-9 pr-10 text-xs"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'} className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrengthMeter password={password} className="mt-2" />
          </div>

          <div>
            <label htmlFor="fp-confirm" className="text-xs font-medium text-slate-300">Confirm new password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="fp-confirm"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                maxLength={PASSWORD_MAX}
                placeholder="••••••••••••"
                className={`h-10 pl-9 text-xs ${mismatch ? 'border-rose-500/60' : ''}`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
              />
            </div>
            {mismatch && <p data-testid="confirm-mismatch" className="mt-1 text-[11px] text-rose-400">Passwords do not match.</p>}
          </div>

          <Button
            type="submit"
            variant="blue"
            disabled={loading || code.length !== 6 || !strength.valid || password !== confirm}
            className="h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating password...</>) : (<>Update password <ArrowRight className="ml-2 h-4 w-4" /></>)}
          </Button>

          {!userId && (
            <div className="flex items-center justify-center gap-1 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
              Didn’t get it?
              <Button type="button" variant="ghost" size="sm" disabled={cooldown > 0 || loading} onClick={resend} className="h-8 px-2 text-xs text-blue-400 hover:bg-blue-500/10 hover:text-blue-300">
                {cooldown > 0 ? `Resend in ${cooldown}s` : (<><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Resend code</>)}
              </Button>
              <button type="button" onClick={() => { setStep('email'); setError(null); setInfo(null); setCode(''); }} className="ml-1 text-blue-400 hover:underline">
                Change email
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
