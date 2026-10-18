import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth, checkUserOnboarded } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export const AdminRoute: React.FC<{ component: React.ComponentType<any> }> = ({
  component: Component,
}) => {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation('/login');
      } else if (!checkUserOnboarded(user)) {
        setLocation('/onboarding');
      }
    }
  }, [user, isLoading, setLocation]);

  if (isLoading || !user || !checkUserOnboarded(user)) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
        <span className="text-xs text-slate-400 tracking-wide font-medium">
          Verifying security clearance & session...
        </span>
      </div>
    );
  }

  return <Component />;
};

export const PublicOnlyRoute: React.FC<{ component: React.ComponentType<any> }> = ({
  component: Component,
}) => {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      if (!checkUserOnboarded(user)) {
        setLocation('/onboarding');
      } else {
        setLocation('/admin');
      }
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return <Component />;
};
