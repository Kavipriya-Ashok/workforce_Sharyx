import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { emailService } from '@/service/emailService';
import { useAuth, checkUserOnboarded } from '@/lib/auth';
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OAuthCallback: React.FC = () => {
  const [, setLocation] = useLocation();
  const { googleAuth, completeOnboarding } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Exchanging authorization code with Google...');
  const [userEmail, setUserEmail] = useState<string>('');
  const hasExecuted = React.useRef(false);
  // Where the error button goes: sign-in flows go back to /login, the e-mail-connect flow back to the app.
  const [backTo, setBackTo] = useState<'login' | 'admin'>('login');

  useEffect(() => {
    if (hasExecuted.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    setBackTo(state === 'auth_google' || !code ? 'login' : 'admin');

    if (error) {
      setStatus('error');
      setMessage(
        error === 'access_denied'
          ? 'You cancelled the Google sign-in, so nothing was changed. You can try again, or sign in with your email and password.'
          : `Google could not complete the sign-in (${error}). Please try again or use your email and password.`
      );
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Google did not return an authorization code, so we could not sign you in. Please go back and try again.');
      return;
    }

    hasExecuted.current = true;
    const currentRedirectUri = `${window.location.origin}/oauth/callback`;

    // 1. Check if this is User Login / Sign-up with Google
    if (state === 'auth_google') {
      setMessage('Authenticating your Google account with Sharyx...');
      // Never leave the spinner hanging: give up after 30s with a clear message.
      Promise.race([
        googleAuth({ code, redirect_uri: currentRedirectUri }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Google sign-in is taking too long. Please go back and try again.')), 30000)
        ),
      ])
        .then(() => {
          setStatus('success');
          setMessage('Google Authentication Successful! Redirecting to command center...');
          setTimeout(() => {
            try {
              const saved = localStorage.getItem('sharyx_user');
              const currentUser = saved ? JSON.parse(saved) : null;
              if (!checkUserOnboarded(currentUser)) {
                setLocation('/onboarding');
              } else {
                setLocation('/admin');
              }
            } catch {
              setLocation('/admin');
            }
          }, 1500);
        })
        .catch((err: any) => {
          setStatus('error');
          const status = err?.response?.status;
          setMessage(
            status === 401
              ? 'Google could not verify your account, so you were not signed in. Please try again or use your email and password.'
              : status === 503
                ? 'Google sign-in is not configured on this server yet. Please use your email and password.'
                : status === 429
                  ? 'Too many attempts. Please wait a minute and try again.'
                  : status === 403
                    ? err.response?.data?.message || 'This account is not allowed to sign in.'
                    : err?.response
                      ? 'Google sign-in failed. Please try again or use your email and password.'
                      : err.message || 'Cannot reach the server. Check your connection and try again.'
          );
        });
      return;
    }

    // 2. Otherwise, this is Email Account SMTP/OAuth connection
    // emailService
    //   .connectGoogle(code, currentRedirectUri)
    //   .then((res: any) => {
    //     setStatus('success');
    //     const email = res?.email || 'your Google account';
    //     setUserEmail(email);
    //     setMessage(`Successfully connected ${email}! Your emails can now be dispatched securely.`);
    //     setTimeout(() => {
    //       setLocation('/admin');
    //     }, 2200);
    //   })
    emailService
      .connectGoogle(code, currentRedirectUri)
      .then(async (res: any) => {
        setStatus('success');
        const email = res?.email || 'your Google account';
        setUserEmail(email);
        // Go back to where the connection was started (wizard step 10 shows the connected address and its saved status;
        // the Profile page shows the card). Only when we do not know the origin do we keep the old behaviour.
        let back: string | null = null;
        try {
          back = sessionStorage.getItem('sharyx_oauth_return');
          sessionStorage.removeItem('sharyx_oauth_return');
        } catch {
          /* ignore */
        }
        if (back && back.startsWith('/')) {
          setMessage(`Successfully connected ${email}! Taking you back...`);
          setTimeout(() => setLocation(back as string), 1200);
          return;
        }
        setMessage(`Successfully connected ${email}! Entering dashboard...`);
        try {
          await completeOnboarding(); // Marks onboarding completed so you don't get redirected back!
        } catch (e) {
          console.error(e);
        }
        setTimeout(() => {
          setLocation('/admin'); // Enters the dashboard directly
        }, 1500);
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(
          err.response?.data?.message ||
          err.message ||
          'Failed to exchange authorization code. Please try again.'
        );
      });
  }, [setLocation, googleAuth]);

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
          <div className="h-full w-full rounded-2xl bg-slate-950 flex items-center justify-center">
            {status === 'loading' && <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-8 w-8 text-emerald-400 animate-pulse" />}
            {status === 'error' && <AlertTriangle className="h-8 w-8 text-rose-400" />}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">
            {status === 'loading' && 'Connecting Google Account'}
            {status === 'success' && 'Google Account Connected!'}
            {status === 'error' && (backTo === 'login' ? 'Google sign-in failed' : 'Connection Failed')}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
          {userEmail && (
            <div className="inline-block mt-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-mono">
              {userEmail}
            </div>
          )}
        </div>

        {status === 'success' && (
          <div className="pt-2">
            <Button
              onClick={() => setLocation('/admin')}
              className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-medium text-xs h-10 rounded-xl"
            >
              Continue to Dashboard <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => {
                let back = '/admin';
                if (backTo === 'admin') {
                  try {
                    back = sessionStorage.getItem('sharyx_oauth_return') || '/admin';
                    sessionStorage.removeItem('sharyx_oauth_return');
                  } catch {
                    /* ignore */
                  }
                }
                setLocation(backTo === 'login' ? '/login' : back);
              }}
              className="w-full border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs h-10 rounded-xl"
            >
              {backTo === 'login' ? 'Back to login' : 'Back to Command Center'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
