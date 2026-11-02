import React, { useState, useEffect } from 'react';
import { Customer, CustomerMetrics, LeadConversionRule } from '@/types/customer';
import { customerService } from '@/service/customerService';
import { CustomerDetailPage } from './components/CustomerDetailPage';
import { ConversionSimulatorModal } from './components/ConversionSimulatorModal';
import {
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Sparkles,
  Play,
  Building2,
  Phone,
  Mail,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  PhoneCall,
  MessageSquare,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [metrics, setMetrics] = useState<CustomerMetrics>({
    totalCustomers: 0,
    activeCustomers: 0,
    totalRevenue: 0,
    convertedFromLeads: 0,
    autoConversionRate: 0,
  });
  const [rules, setRules] = useState<LeadConversionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await customerService.getCustomers({
        search,
        tier: tierFilter,
        customer_status: statusFilter,
      });
      setCustomers(data.items || []);
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err: any) {
      toast.error(`Could not load customers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const rulesData = await customerService.getConversionRules();
      setRules(rulesData || []);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchRules();
  }, [tierFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleRowClick = async (customer: Customer) => {
    try {
      const full = await customerService.getCustomerById(customer.id);
      setSelectedCustomer(full);
    } catch {
      setSelectedCustomer(customer);
    }
  };

  if (selectedCustomer) {
    return (
      <CustomerDetailPage
        customer={selectedCustomer}
        onBack={() => setSelectedCustomer(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-300 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1 rounded-md bg-blue-50 text-blue-700">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              Autonomous Conversion Engine
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Customer 360° & Automated Conversions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Accounts converted automatically from high-intent Voice AI calls (Appointment Scheduled, Sale Completed) and WON stage transitions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setSimulatorOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 gap-1.5 h-9"
          >
            <Play className="h-3.5 w-3.5 fill-white" /> Test Conversion Rules (/Automation/DryRunTest)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchCustomers();
              fetchRules();
            }}
            className="h-9 text-xs border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 gap-1.5 rounded-lg"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-300 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{metrics.totalCustomers}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Active client profiles</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Active Customers */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-300 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Accounts</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{metrics.activeCustomers}</h3>
            <p className="text-[11px] text-emerald-600/80 mt-0.5 font-medium">In good standing</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Total Spend */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-300 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-extrabold text-indigo-700 mt-1">
              ₹{Number(metrics.totalRevenue || 0).toLocaleString()}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">From converted deals</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Auto Conversion Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-300 dark:border-slate-800 shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Auto-Conversion</p>
            <h3 className="text-2xl font-extrabold text-purple-700 mt-1">
              {metrics.autoConversionRate}%
            </h3>
            <p className="text-[11px] text-purple-600 font-medium mt-0.5">
              {metrics.convertedFromLeads} converted from Leads
            </p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Active Rules Banner */}
      {rules.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-[#121c35] text-white flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-white/10 text-white shrink-0">
              <Award className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-white">Active Lead-to-Customer Conversion Rules ({rules.length})</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {rules.slice(0, 3).map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30"
                  >
                    <span>🎯 {r.outcome_trigger}</span>
                    <span className="text-slate-400">➔</span>
                    <span className="text-emerald-300">WON ({r.action_deal_value ? `₹${r.action_deal_value}` : 'Customer'})</span>
                  </span>
                ))}
                {rules.length > 3 && (
                  <span className="text-[11px] text-slate-400">+{rules.length - 3} more</span>
                )}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSimulatorOpen(true)}
            className="text-xs text-blue-300 hover:text-white hover:bg-white/10 shrink-0 self-start md:self-center"
          >
            Simulate Rules <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-300 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, email, phone..."
            className="pl-9 text-xs h-9"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="h-9 text-xs rounded-lg border border-slate-300 dark:border-slate-800 px-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">All Tiers</option>
            <option value="PROFESSIONAL">Professional Tier</option>
            <option value="ENTERPRISE">Enterprise Tier</option>
            <option value="STARTER">Starter Tier</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 text-xs rounded-lg border border-slate-300 dark:border-slate-800 px-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive</option>
            <option value="CHURNED">Churned</option>
          </select>
        </div>
      </div>

      {/* Customer Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-300 dark:border-slate-800 overflow-hidden shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Company & Role</th>
                <th className="py-3.5 px-4">Status & Tier</th>
                <th className="py-3.5 px-4">Total Spend</th>
                <th className="py-3.5 px-4">Origin Attribution</th>
                <th className="py-3.5 px-4 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading customers and pipeline accounts...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    No customers found matching your criteria.
                    <p className="text-[11px] text-slate-400 mt-1">
                      Convert leads by transitioning them to <span className="font-bold text-slate-600">WON</span> or testing a Voice AI call outcome!
                    </p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const initials = c.name
                    ? c.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'C';

                  const tierBadgeColor =
                    c.tier === 'ENTERPRISE'
                      ? 'bg-purple-100 text-purple-800 border-purple-200'
                      : c.tier === 'PROFESSIONAL'
                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                      : 'bg-slate-100 text-slate-800 border-slate-300';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleRowClick(c)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-[0_1px_3px_0_rgba(15,23,42,0.06),0_1px_2px_-1px_rgba(15,23,42,0.04)] shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" /> {c.email || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Company & Role */}
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          {c.company_name || 'Individual'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{c.job_title || 'Client'}</p>
                      </td>

                      {/* Status & Tier */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${tierBadgeColor}`}
                          >
                            {c.tier}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            {c.customer_status}
                          </span>
                        </div>
                      </td>

                      {/* Total Spend */}
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-slate-900 text-xs">
                          ₹{Number(c.total_spend || 0).toLocaleString()} {c.currency}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">Lifetime value</p>
                      </td>

                      {/* Origin Attribution */}
                      <td className="py-3.5 px-4">
                        {c.converted_from_lead_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Sparkles className="h-3 w-3 text-blue-600" /> Lead #{c.converted_from_lead_id.slice(0, 6)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Direct Account</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {c.phone && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`tel:${c.phone}`)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-cyan-600"
                              title="Voice Call"
                            >
                              <PhoneCall className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {c.phone && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(`https://wa.me/${c.phone?.replace(/\D/g, '')}`)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-600"
                              title="WhatsApp"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRowClick(c)}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-7 px-2"
                          >
                            Profile <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dry Run Simulator Modal */}
      <ConversionSimulatorModal
        open={simulatorOpen}
        onOpenChange={setSimulatorOpen}
      />
    </div>
  );
};
