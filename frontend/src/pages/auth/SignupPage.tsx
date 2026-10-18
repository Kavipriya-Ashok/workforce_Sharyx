import React, { useState } from 'react';
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
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export const SignupPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { signup } = useAuth();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedTerms) {
      toast.error('Please agree to the Terms of Service & Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      await signup(formData);
      toast.success('Account created! Welcome to Sharyx.');
      // 🛡️ Route directly to 10-Step Onboarding Wizard
      setLocation('/onboarding');
    } catch {
      toast.error('Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    toast.info('Google OAuth initiating...');
    // Simulated Google OAuth login
    setTimeout(async () => {
      await signup({
        first_name: 'Alex',
        last_name: 'Morgan',
        username: 'alex.morgan',
        email: 'alex@company.com',
        company_name: 'Morgan Technologies',
        mobile: '+1 555 432 1098',
        password: 'OAuth_Secure_Password_123',
      });
      toast.success('Google authentication successful!');
      setLocation('/onboarding');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] grid grid-cols-1 lg:grid-cols-12 selection:bg-emerald-500 selection:text-black">
      {/* LEFT: 8 AI Workforce Hero Panel */}
      <div className="lg:col-span-5 xl:col-span-6">
        <AIAgentsHeroPanel />
      </div>

      {/* RIGHT: Modern Glassmorphic Registration Form */}
      <div className="lg:col-span-7 xl:col-span-6 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-lg space-y-6">
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
            className="w-full h-11 border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 flex items-center justify-center gap-3 rounded-xl transition-all"
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
              Or continue with work email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300">First Name</label>
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
                <label className="text-xs font-medium text-slate-300">Last Name</label>
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
                <label className="text-xs font-medium text-slate-300">Username</label>
                <Input
                  placeholder="manojk"
                  className="mt-1 h-10 text-xs"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Work Email</label>
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
                <label className="text-xs font-medium text-slate-300">Company Name</label>
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
                <label className="text-xs font-medium text-slate-300">Mobile Phone</label>
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
              <label className="text-xs font-medium text-slate-300">Password</label>
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
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="terms" className="text-[11px] text-slate-400 leading-snug">
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
                  Creating Account...
                </>
              ) : (
                <>
                  Get Started Free
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
        </div>
      </div>
    </div>
  );
};
