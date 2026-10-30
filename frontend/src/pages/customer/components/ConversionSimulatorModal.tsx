import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { customerService } from '@/service/customerService';
import { DryRunTestResponse } from '@/types/customer';
import { Play, Sparkles, CheckCircle2, XCircle, ArrowRight, Bot, Zap } from 'lucide-react';

interface ConversionSimulatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ConversionSimulatorModal: React.FC<ConversionSimulatorModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [outcome, setOutcome] = useState('Customer agreed to proceed with purchase and appointment scheduled for Friday');
  const [duration, setDuration] = useState('60');
  const [score, setScore] = useState('9');
  const [goalAchieved, setGoalAchieved] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DryRunTestResponse | null>(null);

  const presets = [
    {
      title: '📅 Appointment Scheduled',
      outcome: 'Customer agreed to proceed with purchase and appointment scheduled for Friday',
      duration: '60',
    },
    {
      title: '🏆 Sale Completed',
      outcome: 'Customer signed enterprise proposal and sale completed with credit card authorization',
      duration: '90',
    },
    {
      title: '💳 Purchase Confirmed',
      outcome: 'Client confirmed order for 5 licenses and purchase confirmed on call',
      duration: '45',
    },
    {
      title: '❌ Unqualified / Not Interested',
      outcome: 'Lead is not interested at this moment, requested not to call back',
      duration: '20',
    },
  ];

  const handleRunSimulation = async () => {
    if (!outcome.trim()) {
      toast.error('Please enter an outcome text to evaluate');
      return;
    }

    setLoading(true);
    try {
      const res = await customerService.dryRunTest({
        outcome,
        duration_seconds: parseInt(duration, 10) || 60,
        score: parseInt(score, 10) || 8,
        goal_achieved: goalAchieved,
      });
      setResult(res);
      if (res.matched) {
        toast.success(`Rule matched: ${res.matchedRule?.name || 'Conversion Rule'}`);
      } else {
        toast.info('No rule matched this outcome string.');
      }
    } catch (err: any) {
      toast.error(`Dry-run failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-200 p-0 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 p-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded bg-white/20 text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
              Voice AI Post-Call Rule Engine
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-white">
            Lead ➔ Customer Conversion Simulator
          </DialogTitle>
          <DialogDescription className="text-blue-100 text-xs mt-1">
            Simulate how the RuleEngine evaluates call outcomes and automatically converts Leads to active Customers.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Presets */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-2">
              Quick Test Scenarios
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setOutcome(p.outcome);
                    setDuration(p.duration);
                    setResult(null);
                  }}
                  className="text-left text-xs p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all text-slate-700"
                >
                  <p className="font-semibold text-slate-900">{p.title}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{p.outcome}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                AI Outcome Text / Summary *
              </label>
              <Textarea
                rows={3}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Enter call outcome text..."
                className="text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Duration (seconds)
                </label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  AI Call Score (1-10)
                </label>
                <Input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Goal Achieved?
                </label>
                <select
                  value={goalAchieved ? 'true' : 'false'}
                  onChange={(e) => setGoalAchieved(e.target.value === 'true')}
                  className="w-full text-xs h-9 rounded-md border border-slate-200 px-3 bg-white"
                >
                  <option value="true">✅ Yes (True)</option>
                  <option value="false">❌ No (False)</option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleRunSimulation}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 gap-2"
            >
              {loading ? (
                <>Evaluating rules...</>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-white" /> Run Dry-Run Test (/Automation/DryRunTest)
                </>
              )}
            </Button>
          </div>

          {/* Result Box */}
          {result && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Simulation Outcome
                </span>
                {result.matched ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    RULE MATCHED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <XCircle className="h-3.5 w-3.5 text-amber-600" />
                    NO MATCH
                  </span>
                )}
              </div>

              {result.matched ? (
                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Matched Rule:</span>
                      <span className="font-bold text-slate-900">{result.matchedRule?.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Outcome Trigger:</span>
                      <span className="font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                        {result.matchedRule?.outcome_trigger}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Lead Stage Transition:</span>
                      <span className="font-bold text-emerald-600">
                        NEW / CONTACTED ➔ {result.targetStage}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Auto-Convert to Customer:</span>
                      <span className="font-bold text-purple-700">
                        {result.willConvertToCustomer ? '✅ YES (Active Profile Created)' : 'NO'}
                      </span>
                    </div>
                  </div>

                  {result.actions && (
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 bg-blue-50/60 rounded border border-blue-200">
                        <span className="text-blue-900 font-semibold block">💎 Customer Profile</span>
                        <p className="text-slate-600 mt-0.5">
                          Status: <span className="font-bold">{result.actions.targetCustomerStatus}</span> · Tier: <span className="font-bold">{result.actions.targetCustomerTier}</span>
                        </p>
                      </div>
                      <div className="p-2 bg-emerald-50/60 rounded border border-emerald-200">
                        <span className="text-emerald-900 font-semibold block">💰 CRM Deal</span>
                        <p className="text-slate-600 mt-0.5">
                          Stage: <span className="font-bold">{result.actions.crmDealStage}</span> · Value: <span className="font-bold">₹{result.actions.dealValue.toLocaleString()}</span>
                        </p>
                      </div>
                      <div className="p-2 bg-purple-50/60 rounded border border-purple-200">
                        <span className="text-purple-900 font-semibold block">📱 WhatsApp Followup</span>
                        <p className="text-slate-600 mt-0.5">
                          Trigger: <span className="font-bold">{result.actions.sendWhatsApp ? 'deal_won sequence' : 'Disabled'}</span>
                        </p>
                      </div>
                      <div className="p-2 bg-indigo-50/60 rounded border border-indigo-200">
                        <span className="text-indigo-900 font-semibold block">✉️ Email Onboarding</span>
                        <p className="text-slate-600 mt-0.5">
                          Trigger: <span className="font-bold">{result.actions.sendEmail ? 'lead_converted sequence' : 'Disabled'}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  {result.reason}
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
