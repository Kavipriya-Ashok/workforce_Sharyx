import React from 'react';
import { useLocation, useRoute } from 'wouter';
import { AIAgentsHeroPanel } from './AIAgentsHeroPanel';
import { ForgotPasswordFlow } from './ForgotPasswordFlow';

/** Target of the link in the reset e-mail: /ResetPassword/<encrypted user id>. */
export const ResetPasswordLinkPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>('/ResetPassword/:id');
  const id = params?.id ? decodeURIComponent(params.id) : '';

  return (
    <div className="min-h-screen bg-[#0b0f19] grid grid-cols-1 lg:grid-cols-12 selection:bg-blue-600 selection:text-white">
      <div className="lg:col-span-5 xl:col-span-6">
        <AIAgentsHeroPanel />
      </div>
      <div className="lg:col-span-7 xl:col-span-6 flex items-center justify-center p-6 sm:p-12">
        {/* a malformed link simply fails with the generic "invalid or expired" message from the server */}
        <ForgotPasswordFlow userId={id || undefined} onBack={() => setLocation('/login')} />
      </div>
    </div>
  );
};
