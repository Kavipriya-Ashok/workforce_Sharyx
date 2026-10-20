import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { emailService } from '@/service/emailService';
import { Loader2, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OAuthCallback: React.FC = () => {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Exchanging authorization code with Google...');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Google Authorization Error: ${error}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No authorization code was found in the callback URL.');
      return;
    }

    const currentRedirectUri = `${window.location.origin}/oauth/callback`;

    emailService
      .connectGoogle(code, currentRedirectUri)
      .then((res: any) => {
        setStatus('success');
        const email = res?.email || 'your Google account';
        setUserEmail(email);
        setMessage(`Successfully connected ${email}! Your emails can now be dispatched securely.`);
        setTimeout(() => {
          setLocation('/admin');
        }, 2200);
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(
          err.response?.data?.message ||
            err.message ||
            'Failed to exchange authorization code. Please try again.'
        );
      });
  }, [setLocation]);

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
            {status === 'error' && 'Connection Failed'}
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
              onClick={() => setLocation('/admin')}
              className="w-full border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-xs h-10 rounded-xl"
            >
              Back to Command Center
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
