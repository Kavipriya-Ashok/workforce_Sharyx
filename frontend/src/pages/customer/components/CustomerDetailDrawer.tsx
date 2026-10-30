import React, { useState } from 'react';
import { Customer } from '@/types/customer';
import {
  X,
  Building2,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  Calendar,
  Sparkles,
  ExternalLink,
  Award,
  Clock,
  MessageSquare,
  PhoneCall,
  Send,
  UserCheck,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CustomerDetailDrawerProps {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  onOpenLead?: (leadId: string) => void;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customer,
  open,
  onClose,
  onOpenLead,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'deals' | 'timeline'>('overview');

  if (!open || !customer) return null;

  const initials = customer.name
    ? customer.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'CU';

  const tierColor =
    customer.tier === 'ENTERPRISE'
      ? 'bg-purple-100 text-purple-800 border-purple-300'
      : customer.tier === 'PROFESSIONAL'
      ? 'bg-blue-100 text-blue-800 border-blue-300'
      : 'bg-slate-100 text-slate-800 border-slate-300';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end transition-opacity duration-300">
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 bg-gradient-to-r from-[#0c1427] to-[#15223e] text-white flex items-start justify-between border-b border-[#1a2846]">
          <div className="flex items-start gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-blue-500/20 shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">{customer.name}</h2>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${tierColor}`}>
                  {customer.tier}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {customer.customer_status}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                {customer.company_name || 'Individual Client'}
                {customer.job_title && <span>· {customer.job_title}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Quickbar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-slate-200 hover:border-blue-500 hover:text-blue-600 gap-1.5"
              onClick={() => {
                if (customer.phone) {
                  window.open(`tel:${customer.phone}`);
                } else {
                  toast.error('No phone number recorded');
                }
              }}
            >
              <PhoneCall className="h-3.5 w-3.5 text-cyan-600" /> Call
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-slate-200 hover:border-emerald-500 hover:text-emerald-600 gap-1.5"
              onClick={() => {
                if (customer.phone) {
                  window.open(`https://wa.me/${customer.phone.replace(/\D/g, '')}`);
                } else {
                  toast.error('No phone number recorded');
                }
              }}
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 border-slate-200 hover:border-indigo-500 hover:text-indigo-600 gap-1.5"
              onClick={() => {
                if (customer.email) {
                  window.open(`mailto:${customer.email}`);
                } else {
                  toast.error('No email recorded');
                }
              }}
            >
              <Send className="h-3.5 w-3.5 text-indigo-600" /> Email
            </Button>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spend</span>
            <span className="text-sm font-extrabold text-emerald-700">
              ₹{Number(customer.total_spend || 0).toLocaleString()} {customer.currency}
            </span>
          </div>
        </div>

        {/* Conversion Attribution Banner */}
        {customer.converted_from_lead_id && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Auto-Converted from CRM Lead
                </p>
                <p className="text-[11px] text-slate-500">
                  Origin Lead ID: #{customer.converted_from_lead_id.slice(0, 8)} · Converted:{' '}
                  {customer.conversion_date
                    ? new Date(customer.conversion_date).toLocaleDateString()
                    : 'Recently'}
                </p>
              </div>
            </div>
            {onOpenLead && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenLead(customer.converted_from_lead_id!)}
                className="text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100/50 gap-1 h-7 px-2"
              >
                View Lead <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 border-b border-slate-200 flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Profile
          </button>
          <button
            onClick={() => setActiveTab('deals')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'deals'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Linked Deals</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
              {customer.deals?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Interaction Timeline</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
              {customer.interactions?.length || 0}
            </span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              {/* Contact Information */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-blue-600" /> Contact Coordinates
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Email</span>
                    <span className="font-medium text-slate-800">{customer.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Phone</span>
                    <span className="font-medium text-slate-800">{customer.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Company</span>
                    <span className="font-medium text-slate-800">{customer.company_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Job Title</span>
                    <span className="font-medium text-slate-800">{customer.job_title || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {customer.tags && customer.tags.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-blue-600" /> Customer Tags
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {customer.tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {customer.notes && (
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-1.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">System & Conversion Notes</span>
                  <p className="text-slate-700 text-xs whitespace-pre-wrap">{customer.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'deals' && (
            <div className="space-y-3">
              {customer.deals && customer.deals.length > 0 ? (
                customer.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{deal.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Pipeline: {deal.pipeline || 'Standard'} · Stage: {deal.stage}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {deal.stage}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <span className="text-slate-500">Deal Value:</span>
                      <span className="font-extrabold text-emerald-700">
                        ₹{Number(deal.deal_value || 0).toLocaleString()} {deal.currency}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No CRM deals currently linked to this customer.
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {customer.interactions && customer.interactions.length > 0 ? (
                customer.interactions.map((act) => (
                  <div
                    key={act.id}
                    className="flex gap-3 p-3 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 font-bold">
                      {act.interaction_type === 'CONVERSION' ? '🏆' : '📝'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{act.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {act.created_on ? new Date(act.created_on).toLocaleString() : ''}
                        </span>
                      </div>
                      {act.description && (
                        <p className="text-[11px] text-slate-600 mt-1">{act.description}</p>
                      )}
                      {act.performer_name && (
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          By: {act.performer_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No interactions recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
