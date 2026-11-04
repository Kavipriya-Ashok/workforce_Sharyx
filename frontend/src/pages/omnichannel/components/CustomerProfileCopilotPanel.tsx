import React from 'react';
import {
  OmnichannelCustomer,
  TimelineJourneyItem,
} from '@/types/omnichannel';
import {
  User,
  Building,
  Mail,
  Phone,
  Sparkles,
  Calendar,
  CreditCard,
  Briefcase,
  Flame,
  CheckCircle2,
  Clock,
  X,
  ExternalLink,
  Tag,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CustomerProfileCopilotPanelProps {
  customer?: OmnichannelCustomer | null;
  journeyItems?: TimelineJourneyItem[];
  onApplyAiDraft?: (text: string) => void;
  onClose?: () => void;
}

export const CustomerProfileCopilotPanel: React.FC<CustomerProfileCopilotPanelProps> = ({
  customer,
  journeyItems = [],
  onApplyAiDraft,
  onClose,
}) => {
  if (!customer) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-slate-400 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-center">
        <User className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No customer selected</p>
      </div>
    );
  }

  const aiDraftText = `Hi ${customer.name || 'there'}! Yes, 5 seats are included in the Pro tier with full omnichannel sync. Would you like me to share the checkout link or schedule an onboarding session?`;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto [scrollbar-width:thin]">
      {/* ── HEADER ── */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Customer 360 & Copilot
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-5">
        {/* ── CUSTOMER PROFILE CARD ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
              {customer.name?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {customer.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {customer.company_name || 'Individual Client'}
              </p>
            </div>
          </div>

          {/* Quick Contact Info */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 text-xs">
            {customer.phone && (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="font-mono">{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate">
                <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}
          </div>

          {/* Deal & Sentiment Indicators */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Deal Stage</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Negotiation ($12k)</span>
            </div>

            <div className="p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold uppercase block flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-500" />
                Sentiment
              </span>
              <span className="font-bold text-rose-700 dark:text-rose-300">High Intent 🔥</span>
            </div>
          </div>
        </div>

        {/* ── OMNICHANNEL JOURNEY MAP (Visual Stepper) ── */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Omnichannel Journey Map</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">
              {journeyItems.length} Touchpoints
            </span>
          </div>

          {journeyItems.length === 0 ? (
            <div className="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              No previous touchpoints recorded.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-2.5 space-y-3.5 py-1">
              {journeyItems.slice(0, 5).map((step, idx) => {
                const isWA = step.channel === 'whatsapp';
                const isEmail = step.channel === 'email';
                const isCall = step.channel === 'call';

                return (
                  <div key={step.id || idx} className="relative pl-5 text-xs">
                    <div
                      className={`absolute -left-2 top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                        isWA
                          ? 'bg-emerald-500'
                          : isEmail
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {isCall
                        ? `1. Voice Call Received (${step.duration || 184}s)`
                        : isEmail
                        ? '2. AI Email Dispatched'
                        : '3. WhatsApp Inbound'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {step.title || step.body || step.subject}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {step.timestamp ? format(new Date(step.timestamp), 'h:mm a') : 'Recent'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── AI COPILOT SUGGESTED ACTIONS ── */}
        <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Suggested Quick Actions</span>
          </h4>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                onApplyAiDraft?.(aiDraftText);
                toast.success('AI WhatsApp draft loaded into composer');
              }}
              className="w-full text-left p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/60 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Approve AI WhatsApp Draft
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 group-hover:underline">Insert ➔</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
                "{aiDraftText}"
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                onApplyAiDraft?.(`Hi ${customer.name}, here is your secure checkout link for the Pro Plan: https://pay.sharyx.ai/checkout/inv_8829`);
                toast.success('Payment link template applied');
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                <span>Send Payment Link</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">$12,000</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onApplyAiDraft?.(`Hi ${customer.name}, please choose a convenient 30-minute slot for our product walkthrough here: https://cal.sharyx.ai/demo`);
                toast.success('Calendar booking link applied');
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Schedule Demo Meeting</span>
              </div>
              <span className="text-[10px] text-slate-400">30 min</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

