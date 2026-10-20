import React from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { AdminRoute, PublicOnlyRoute } from '@/components/routing/RouteGuards';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { OnboardingWizard } from '@/pages/onboarding/OnboardingWizard';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { OAuthCallback } from '@/pages/auth/OAuthCallback';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function RedirectToLogin() {
  const [, setLocation] = useLocation();
  React.useEffect(() => {
    setLocation('/login');
  }, [setLocation]);
  return null;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">
          <Switch>
            {/* Public Auth Routes */}
            <Route path="/login">
              <PublicOnlyRoute component={LoginPage} />
            </Route>
            <Route path="/signup">
              <PublicOnlyRoute component={SignupPage} />
            </Route>

            {/* 10-Step Onboarding Wizard */}
            <Route path="/onboarding" component={OnboardingWizard} />

            {/* Google OAuth Callback */}
            <Route path="/oauth/callback" component={OAuthCallback} />

            {/* Protected Admin Command Center Routes */}
            <Route path="/admin">
              <AdminRoute component={AdminLayout} />
            </Route>
            <Route path="/dashboard">
              <AdminRoute component={AdminLayout} />
            </Route>

            {/* Root Redirection */}
            <Route path="/">
              {() => <RedirectToLogin />}
            </Route>

            {/* Fallback 404 */}
            <Route>
              {() => <RedirectToLogin />}
            </Route>
          </Switch>

          {/* Global Toast Provider */}
          <Toaster richColors position="top-right" theme="dark" />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
