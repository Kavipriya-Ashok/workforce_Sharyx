import React, { useState } from 'react';
import { Customer } from '@/types/customer';
import {
  ArrowLeft,
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
  UserCheck,
  Tag,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Receipt,
  FileText,
  Activity,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface CustomerDetailPageProps {
  customer: Customer;
  onBack: () => void;
  onOpenLead?: (leadId: string) => void;
}

export const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({
  customer,
  onBack,
  onOpenLead,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'deals' | 'timeline' | 'conversations'>('overview');

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
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : customer.tier === 'PROFESSIONAL'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-emerald-100 text-emerald-800 border-emerald-200';

  const statusColor =
    customer.customer_status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : customer.customer_status === 'CHURNED'
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : 'bg-slate-100 text-slate-800 border-slate-200';

  const cFields = customer.custom_fields || {};
  const totalRev = customer.total_spend || Number(cFields.deal_value || 0);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ── Top Navigation & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Customers 360°
          </Button>
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <span className="text-xs text-slate-500 font-medium">Customer Lifecycle & Account Intelligence</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {customer.phone && (
            <a
              href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> WhatsApp Customer
            </a>
          )}

          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              <PhoneCall className="h-3.5 w-3.5 mr-1.5" /> Phone Call
            </a>
          )}

          {customer.converted_from_lead_id && onOpenLead && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenLead(customer.converted_from_lead_id!)}
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-blue-600" /> View Original Lead
            </Button>
          )}
        </div>
      </div>

      {/* ── Customer Hero Banner ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white text-2xl font-black shadow-md border-2 border-white/20">
              {initials}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-extrabold tracking-tight">{customer.name}</h1>
                <Badge className={`${tierColor} text-xs font-bold px-2.5 py-0.5 border`}>
                  {customer.tier} TIER
                </Badge>
                <Badge className={`${statusColor} text-xs font-bold px-2.5 py-0.5 border`}>
                  {customer.customer_status}
                </Badge>
                {customer.converted_from_lead_id && (
                  <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30 text-xs">
                    <Sparkles className="h-3 w-3 mr-1 inline" /> Auto-Converted from Lead
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-300 font-medium">
                {customer.company_name || 'Individual Customer'} · {customer.job_title || 'Active Account'}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                {customer.phone && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" /> {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-blue-300" /> {customer.email}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-300" /> Customer since{' '}
                  {customer.conversion_date || customer.created_on
                    ? new Date(customer.conversion_date || customer.created_on || '').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Recently active'}
                </span>
              </div>
            </div>
          </div>

          {/* Revenue Pill */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 min-w-[200px] text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
              Total Customer Spend
            </span>
            <span className="text-2xl font-black font-mono text-white">
              ₹{Number(totalRev).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-300 block mt-0.5">
              Currency: {customer.currency || 'INR'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main 360 Information Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Profile & Financial Metrics (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Commercial & Contract Overview */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                Financial & Subscription Metrics
              </h2>
              <span className="text-xs text-slate-400">Account Health</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                <span className="text-xs text-emerald-700 font-medium">Total Spend</span>
                <p className="text-lg font-black text-emerald-950 font-mono">
                  ₹{Number(totalRev).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-1">
                <span className="text-xs text-blue-700 font-medium">Customer Tier</span>
                <p className="text-sm font-black text-blue-950 uppercase pt-1">
                  {customer.tier}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-1">
                <span className="text-xs text-purple-700 font-medium">Account Status</span>
                <p className="text-sm font-extrabold text-purple-950 uppercase pt-1">
                  {customer.customer_status || 'ACTIVE'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">Account Manager</span>
                <p className="text-sm font-bold text-slate-900">{cFields.account_owner || 'Enterprise Success Desk'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">Auto-Conversion Rule</span>
                <p className="text-sm font-bold text-slate-900">{cFields.auto_rule_matched || 'Lead Conversion'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">Converted Date</span>
                <p className="text-sm font-bold text-slate-900">
                  {customer.conversion_date
                    ? new Date(customer.conversion_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Active'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-medium">Created On</span>
                <p className="text-sm font-bold text-slate-900">
                  {customer.created_on
                    ? new Date(customer.created_on).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Recent'}
                </p>
              </div>
            </div>
          </div>

          {/* Customer Tags & Notes */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-indigo-600" />
              Segmentation Tags & Special Directives
            </h3>

            <div className="flex flex-wrap gap-2">
              {(customer.tags && customer.tags.length > 0 ? customer.tags : ['Omnichannel AI', 'High Priority', 'Vapi Voice Client']).map(
                (tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200"
                  >
                    #{tag}
                  </span>
                )
              )}
            </div>

            {customer.notes && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-900 block mb-1">Account Directives:</span>
                {customer.notes}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Omnichannel Interactions & Deals (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Deals & Contracts */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              Deals & Invoiced Agreements
            </h3>

            {customer.deals && customer.deals.length > 0 ? (
              <div className="space-y-3">
                {customer.deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{deal.title || 'Enterprise Deal'}</span>
                      <span className="font-mono font-bold text-xs text-emerald-600">
                        ₹{Number(deal.deal_value).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="capitalize">{deal.stage}</span>
                      <span>
                        {new Date(deal.closed_at || deal.created_on || new Date()).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-1">
                <p className="text-xs font-bold text-slate-800">Primary Enterprise Subscription</p>
                <p className="text-xs text-slate-500 font-mono">
                  Contract Value: ₹{Number(totalRev || 7493).toLocaleString('en-IN')}
                </p>
              </div>
            )}
          </div>

          {/* Timeline & Omnichannel Touchpoints */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-purple-600" />
              Omnichannel Touchpoints
            </h3>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-purple-950 block">Customer Account Activated</span>
                  <p className="text-slate-600">
                    Lead converted to active customer profile with full 360 CRM sync.
                  </p>
                </div>
              </div>

              {customer.phone && (
                <div className="p-3 rounded-xl bg-cyan-50/50 border border-cyan-100 flex items-start gap-3">
                  <PhoneCall className="h-4 w-4 text-cyan-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-cyan-950 block">Voice AI Telephony Connected</span>
                    <p className="text-slate-600">Vapi Voice Agent enabled for customer support & follow-ups.</p>
                  </div>
                </div>
              )}

              {customer.email && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                  <Mail className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-blue-950 block">Email Sync Active</span>
                    <p className="text-slate-600">Direct inbox correspondence synchronized with customer account.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
