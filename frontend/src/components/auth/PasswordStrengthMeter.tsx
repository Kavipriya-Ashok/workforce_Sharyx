import React from 'react';
import { Check, X } from 'lucide-react';
import { evaluatePassword } from '@/lib/passwordRules';

const BAR = ['bg-slate-700', 'bg-rose-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500'];
const TEXT = ['text-slate-500', 'text-rose-400', 'text-amber-400', 'text-lime-400', 'text-emerald-400'];

/** 4-segment strength bar + live checklist of the five password rules. */
export const PasswordStrengthMeter: React.FC<{ password: string; className?: string }> = ({ password, className = '' }) => {
  const s = evaluatePassword(password);
  return (
    <div className={`space-y-2 ${className}`} data-testid="password-strength" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={s.level} aria-label="Password strength">
          {[1, 2, 3, 4].map((seg) => (
            <div
              key={seg}
              data-seg={seg}
              className={`h-1.5 flex-1 rounded-full transition-colors ${s.level >= seg ? BAR[s.level] : 'bg-slate-800'}`}
            />
          ))}
        </div>
        <span data-testid="strength-label" className={`w-16 text-right text-[11px] font-semibold ${TEXT[s.level]}`}>
          {password ? s.label : ''}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-x-3 gap-y-0.5 sm:grid-cols-2">
        {s.checks.map((c) => (
          <li key={c.id} data-rule={c.id} data-ok={c.ok} className={`flex items-center gap-1.5 text-[11px] ${c.ok ? 'text-emerald-400' : 'text-slate-500'}`}>
            {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
};
