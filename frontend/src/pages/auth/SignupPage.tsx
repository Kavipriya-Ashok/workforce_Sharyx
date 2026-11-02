import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { AIAgentsHeroPanel } from './AIAgentsHeroPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Building2,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export const SignupPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { sendSignupOtp, resendSignupOtp, verifySignupOtp } = useAuth();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    company_name: '',
    mobile: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: any;
    if (step === 'otp' && resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [step, resendCooldown]);

  // Step 1: Submit Registration Details and Send OTP
  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedTerms) {
      toast.error('Please agree to the Terms of Service & Privacy Policy');
      return;
    }

    if (!formData.email || !formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await sendSignupOtp(formData.email, formData.first_name);
      toast.success(res.message || `Verification code sent to ${formData.email}!`);
      if (res.previewUrl) {
        setPreviewUrl(res.previewUrl);
        toast.info('Test Mailbox Ready! Click link below to view delivered email.');
      }
      setResendCooldown(60);
      setStep('otp');
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.Message ||
          err.message ||
          'Failed to send verification code. Please check your email.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      const res = await resendSignupOtp(formData.email);
      toast.success(res.message || `New verification code dispatched to ${formData.email}`);
      if (res.previewUrl) {
        setPreviewUrl(res.previewUrl);
      }
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.Message ||
          err.message ||
          'Could not resend code. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Verify OTP & Activate Account
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await verifySignupOtp({
        ...formData,
        otp: otpCode.trim(),
      });
      toast.success('Account successfully verified! Welcome to Sharyx.');
      setLocation('/onboarding');
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          'Invalid or expired verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Google OAuth 1-Click Sign-Up
  const handleGoogleSignup = () => {
    toast.info('Connecting to Google...');
    const clientId = '11874827859-h7b1l07qs1pi1ie1489ijdj4u7jvbuqg.apps.googleusercontent.com';
    const redirectUri = encodeURIComponent(`${window.location.origin}/oauth/callback`);
    const scope = encodeURIComponent('openid email profile');
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account&state=auth_google`;
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] grid grid-cols-1 lg:grid-cols-12 selection:bg-emerald-500 selection:text-black">
      {/* LEFT: 8 AI Workforce Hero Panel */}
      <div className="lg:col-span-5 xl:col-span-6">
        <AIAgentsHeroPanel />
      </div>

      {/* RIGHT: Modern Glassmorphic Registration / OTP Form */}
      <div className="lg:col-span-7 xl:col-span-6 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-lg space-y-6">
          {step === 'form' ? (
            <>
              {/* Header */}
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Create your account
                </h1>
                <p className="text-xs sm:text-sm text-slate-400">
                  Start building your autonomous digital workforce in minutes.
                </p>
              </div>

              {/* Google OAuth Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignup}
                className="w-full h-11 border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 flex items-center justify-center gap-3 rounded-xl transition-all shadow-sm hover:border-slate-600"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Sign up with Google
              </Button>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#0b0f19] px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold absolute">
                  Or register with work email & OTP
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleInitiateSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">
                      First Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="Manoj"
                        className="pl-9 h-10 text-xs"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">
                      Last Name <span className="text-rose-400">*</span>
                    </label>
                    <Input
                      placeholder="Krishnan"
                      className="mt-1 h-10 text-xs"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">
                      Username <span className="text-rose-400">*</span>
                    </label>
                    <Input
                      placeholder="manojk"
                      className="mt-1 h-10 text-xs"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">
                      Work Email <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        type="email"
                        placeholder="manoj@company.com"
                        className="pl-9 h-10 text-xs"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300">
                      Company Name <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative mt-1">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="Acme Corp"
                        className="pl-9 h-10 text-xs"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">
                      Mobile Phone <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="+91 98765 43210"
                        className="pl-9 h-10 text-xs"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      className="pl-9 pr-10 h-10 text-xs"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms checkbox */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-[11px] text-slate-400 leading-snug cursor-pointer">
                    I agree to the{' '}
                    <a href="#terms" className="text-emerald-400 hover:underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#privacy" className="text-emerald-400 hover:underline">
                      Privacy Policy
                    </a>
                    .
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="emerald"
                  disabled={loading}
                  className="w-full h-11 text-sm font-semibold rounded-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Verification Code...
                    </>
                  ) : (
                    <>
                      Verify Email & Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Footer link to Login */}
              <p className="text-center text-xs text-slate-400">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-emerald-400 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            /* STEP 2: Dedicated OTP Verification Screen */
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Edit Details
              </button>

              <div className="text-center space-y-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Verify your email
                </h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  We've sent a 6-digit confirmation code to{' '}
                  <span className="font-medium text-emerald-400 underline">{formData.email}</span>.
                  Please enter it below to activate your account.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-center text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                    Enter 6-Digit OTP Code
                  </label>
                  <div className="relative max-w-xs mx-auto">
                    <KeyRound className="absolute left-3 top-3 h-5 w-5 text-emerald-400/80" />
                    <Input
                      type="text"
                      maxLength={6}
                      autoFocus
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="pl-11 h-12 text-center text-xl font-mono tracking-[0.5em] font-bold bg-slate-950/70 border-emerald-500/40 text-emerald-300 focus:border-emerald-400 focus:ring-emerald-500/30 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="emerald"
                  disabled={loading || otpCode.length < 6}
                  className="w-full h-11 text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Verify & Activate Account
                    </>
                  )}
                </Button>
              </form>

              {previewUrl && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-center">
                  <p className="text-[11px] text-emerald-300 mb-1">Delivered via Test Mailbox (Sandbox)</p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Click here to open received verification email
                  </a>
                </div>
              )}

              {/* Resend OTP Section */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-col items-center justify-center gap-2">
                <p className="text-xs text-slate-400">
                  Didn't receive the email? Check spam folder or
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={handleResendOtp}
                  className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 px-3"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Resending...
                    </>
                  ) : resendCooldown > 0 ? (
                    <>Resend Code in ({resendCooldown}s)</>
                  ) : (
                    <>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Resend Code Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};