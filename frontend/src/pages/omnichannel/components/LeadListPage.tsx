import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  MessageSquare,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Filter,
  Clock,
  Building2,
  PhoneCall,
  User,
  PlusCircle,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import { omnichannelService, LeadFilterParams } from '@/service/omnichannelService';
import { OmnichannelLeadItem, OmnichannelChannel } from '@/types/omnichannel';

interface LeadListPageProps {
  onSelectLead: (leadId: string) => void;
}

export const LeadListPage: React.FC<LeadListPageProps> = ({ onSelectLead }) => {
  const [leads, setLeads] = useState<OmnichannelLeadItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'email' | 'call'>('all');
  const [seeding, setSeeding] = useState<boolean>(false);

  const fetchLeads = useCallback(
    async (quiet = false) => {
      try {
        if (!quiet) setLoading(true);
        const params: LeadFilterParams = {
          search: search.trim() || undefined,
          channel: channelFilter,
          limit: 50,
        };
        const res = await omnichannelService.getLeads(params);
        setLeads(res.items || []);
        setTotal(res.total || 0);
      } catch (err: any) {
        toast.error('Failed to load omnichannel leads: ' + (err.message || 'Error'));
      } finally {
        setLoading(false);
      }
    },
    [search, channelFilter]
  );

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleSeedRam = async () => {
    try {
      setSeeding(true);
      const res = await omnichannelService.seedRam();
      toast.success('Sample data seeded successfully for Ram (WhatsApp, Email & Call)!');
      await fetchLeads(true);
      if (res.ramLeadId) {
        onSelectLead(res.ramLeadId);
      }
    } catch {
      toast.error('Failed to seed sample data');
    } finally {
      setSeeding(false);
    }
  };

  const getChannelBadge = (channel: OmnichannelChannel | null) => {
    switch (channel) {
      case 'whatsapp':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <MessageSquare className="h-3 w-3" />
            WhatsApp
          </span>
        );
      case 'email':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300/60 dark:border-sky-800">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <Mail className="h-3 w-3" />
            Email
          </span>
        );
      case 'call':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <PhoneCall className="h-3 w-3" />
            Voice Call
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            No Activity
          </span>
        );
    }
  };

  const formatActivityTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      if (isToday(d)) {
        return format(d, 'h:mm a');
      }
      if (isYesterday(d)) {
        return 'Yesterday';
      }
      return format(d, 'd MMM');
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Omnichannel Inbox
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    {total} Leads
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Unified communication timeline across WhatsApp, Email, and Voice Phone Calls
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchLeads()}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
              title="Refresh leads"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={handleSeedRam}
              disabled={seeding}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-sm shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{seeding ? 'Seeding...' : 'Seed Sample Lead (Ram)'}</span>
            </button>
          </div>
        </div>

        {/* Search & Channel Filter Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads by name, phone, or email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Channel Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Channel:
            </span>
            <button
              onClick={() => setChannelFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                channelFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              All Channels
            </button>
            <button
              onClick={() => setChannelFilter('whatsapp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                channelFilter === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              WhatsApp
            </button>
            <button
              onClick={() => setChannelFilter('email')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                channelFilter === 'email'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </button>
            <button
              onClick={() => setChannelFilter('call')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                channelFilter === 'call'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              Voice Call
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table Container */}
      <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:thin]">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 w-1/3">
                  <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-2.5 w-40 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  </div>
                </div>
                <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800/60 rounded" />
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
              <User className="h-8 w-8 opacity-80" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No Leads Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              {search
                ? `No lead matched your query "${search}". Try clearing filters or searching for another contact.`
                : 'No leads currently match this channel filter. Seed sample data to see the multi-channel journey in action!'}
            </p>
            <button
              onClick={handleSeedRam}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Seed Sample Client (Ram)</span>
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Lead / Client</th>
                    <th className="py-3.5 px-4">Contact Info</th>
                    <th className="py-3.5 px-4">Last Channel</th>
                    <th className="py-3.5 px-4 min-w-[280px]">Latest Activity / Description</th>
                    <th className="py-3.5 px-4">Last Active</th>
                    <th className="py-3.5 px-4 text-center">Channels</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {leads.map((lead) => {
                    const isRam = lead.name.toLowerCase().includes('ram');
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => onSelectLead(lead.id)}
                        className={`group cursor-pointer transition-colors ${
                          isRam
                            ? 'bg-blue-50/30 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        {/* Lead Name & Company */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                isRam
                                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {lead.name.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {lead.name}
                                {isRam && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                    Sample Demo
                                  </span>
                                )}
                              </div>
                              {lead.company_name ? (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Building2 className="h-3 w-3 opacity-70" />
                                  <span>{lead.company_name}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 capitalize">
                                  {lead.status.toLowerCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact Info (Phone & Email) */}
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {lead.phone && (
                              <div className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono text-[11px]">
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span>{lead.phone}</span>
                              </div>
                            )}
                            {lead.email && (
                              <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px] truncate max-w-[180px]">
                                <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Last Channel Badge */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {getChannelBadge(lead.last_channel)}
                        </td>

                        {/* Last Message Preview / Description */}
                        <td className="py-4 px-4">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                              {lead.last_description}
                            </p>
                          </div>
                        </td>

                        {/* Last Activity Time */}
                        <td className="py-4 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{formatActivityTime(lead.last_activity_at)}</span>
                          </div>
                        </td>

                        {/* Channel Communication Counts */}
                        <td className="py-4 px-4 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                            <span
                              className={`flex items-center gap-0.5 text-[10px] font-bold ${
                                lead.communication_counts.whatsapp > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-400'
                              }`}
                              title={`${lead.communication_counts.whatsapp} WhatsApp messages`}
                            >
                              <MessageSquare className="h-2.5 w-2.5" />
                              {lead.communication_counts.whatsapp}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span
                              className={`flex items-center gap-0.5 text-[10px] font-bold ${
                                lead.communication_counts.email > 0
                                  ? 'text-sky-600 dark:text-sky-400'
                                  : 'text-slate-400'
                              }`}
                              title={`${lead.communication_counts.email} Emails`}
                            >
                              <Mail className="h-2.5 w-2.5" />
                              {lead.communication_counts.email}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span
                              className={`flex items-center gap-0.5 text-[10px] font-bold ${
                                lead.communication_counts.call > 0
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-400'
                              }`}
                              title={`${lead.communication_counts.call} Calls`}
                            >
                              <PhoneCall className="h-2.5 w-2.5" />
                              {lead.communication_counts.call}
                            </span>
                          </div>
                        </td>

                        {/* Action Link */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                            View Timeline
                            <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

