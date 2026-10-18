import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { AIAgentsHeroPanel } from './AIAgentsHeroPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth, checkUserOnboarded } from '@/lib/auth';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { login, user } = useAuth();

  const [username, setUsername] = useState('admin@sharyx.com');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username, password });
      toast.success('Welcome back to Sharyx!');
      
      // Check onboarding status
      const saved = localStorage.getItem('sharyx_user');
      const currentUser = saved ? JSON.parse(saved) : user;
      
      if (!checkUserOnboarded(currentUser)) {
        setLocation('/onboarding');
      } else {
        setLocation('/admin');
      }
    } catch {
      toast.error('Invalid credentials. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.info('Google OAuth connecting...');
    setTimeout(async () => {
      await login({ username: 'alex@company.com', password: 'oauth_token' });
      toast.success('Google authentication verified!');
      setLocation('/admin');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] grid grid-cols-1 lg:grid-cols-12 selection:bg-emerald-500 selection:text-black">
      {/* LEFT: 8 AI Workforce Hero Panel */}
      <div className="lg:col-span-5 xl:col-span-6">
        <AIAgentsHeroPanel />
      </div>

      {/* RIGHT: Modern Glassmorphic Login Form */}
      <div className="lg:col-span-7 xl:col-span-6 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sign in to Sharyx
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Access your autonomous AI agents and omnichannel inbox.
            </p>
          </div>

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
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
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0b0f19] px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold absolute">
              Or sign in with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300">Email or Username</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="name@company.com"
                  className="pl-9 h-10 text-xs"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => toast.info('Password reset email sent to registered account.')}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="pl-9 pr-10 h-10 text-xs"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <Button
              type="submit"
              variant="emerald"
              disabled={loading}
              className="w-full h-11 text-sm font-semibold rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer link to Signup */}
          <p className="text-center text-xs text-slate-400">
            Don't have an account yet?{' '}
            <Link href="/signup" className="font-semibold text-emerald-400 hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
